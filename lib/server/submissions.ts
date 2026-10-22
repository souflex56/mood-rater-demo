import { and, asc, desc, eq, gt, lt, or, type SQL } from 'drizzle-orm';
import { getDb } from '@/db';
import { assets, participants, studies, submissionParts, submissions } from '@/db/schema';
import { deriveSamples, sessionStats } from '@/lib/annotation';
import type { AnnotationSessionV2, DerivedSample, SubmissionSummary } from '@/lib/types';
import { ApiError, bodyBytes, bucket, jsonBody, sha256 } from './core';
import { csvCell, expectedChunkLength, SESSION_CHUNK_BYTES, sessionInput, submissionInput } from './validation';

type SubmissionRow = typeof submissions.$inferSelect;
type StoredPackage = { schemaVersion:2; submittedAt:string; inputSha256:string; session:AnnotationSessionV2; samples:DerivedSample[]; stats:ReturnType<typeof sessionStats> };
const encoder = new TextEncoder();
export function summary(row: SubmissionRow): SubmissionSummary {
  return {id:row.id,studyId:row.studyId,assetId:row.assetId,participantId:row.participantId,researchCode:row.researchCode,revision:row.revision,
    status:row.status,createdAt:row.createdAt,coverage:row.coverage,eventCount:row.eventCount,passCount:row.passCount,size:row.packageSize??row.size};
}
async function participant(bearer: string) {
  if (!bearer || bearer.length>200) throw new ApiError(401,'A valid participation credential is required');
  const row = await getDb().select().from(participants).where(eq(participants.tokenHash,await sha256(bearer))).get();
  if (!row) throw new ApiError(401,'Invalid participation credential'); return row;
}
async function authorizedSubmission(request: Request, submissionId: string) {
  const who = await participant(request.headers.get('authorization')?.replace(/^Bearer /,'') ?? '');
  const row = await getDb().select().from(submissions).where(and(eq(submissions.id,submissionId),eq(submissions.participantId,who.id),eq(submissions.studyId,who.studyId))).get();
  if (!row) throw new ApiError(404,'Submission not found'); return row;
}
async function uploadProgress(row: SubmissionRow) {
  const parts = await getDb().select({index:submissionParts.partIndex}).from(submissionParts).where(eq(submissionParts.submissionId,row.id)).orderBy(asc(submissionParts.partIndex));
  return {submissionId:row.id,status:row.status,chunkSize:SESSION_CHUNK_BYTES,chunkCount:Math.ceil(row.size/SESSION_CHUNK_BYTES),uploadedParts:parts.map(p=>p.index)};
}
export async function initializeSubmission(request: Request) {
  const input = submissionInput.parse(await jsonBody(request)); const who = await participant(input.participationToken);
  const existing = await getDb().select().from(submissions).where(eq(submissions.id,input.submissionId)).get();
  if (existing) {
    if (existing.participantId!==who.id || existing.studyId!==who.studyId) throw new ApiError(404,'Submission not found');
    if (existing.inputSha256!==input.sha256 || existing.size!==input.size || existing.sessionId!==input.sessionId || existing.revision!==input.revision || existing.assetId!==input.assetId) throw new ApiError(409,'Submission ID already binds a different immutable payload');
    return uploadProgress(existing);
  }
  const study = await getDb().select().from(studies).where(and(eq(studies.id,who.studyId),eq(studies.status,'published'))).get();
  if (!study) throw new ApiError(409,'The study no longer accepts new submissions');
  const asset = await getDb().select().from(assets).where(and(eq(assets.id,input.assetId),eq(assets.studyId,who.studyId),eq(assets.status,'ready'))).get();
  if (!asset) throw new ApiError(400,'Audio does not belong to this study');
  await getDb().insert(submissions).values({id:input.submissionId,studyId:who.studyId,assetId:input.assetId,participantId:who.id,sessionId:input.sessionId,
    researchCode:who.researchCode,revision:input.revision,status:'pending',createdAt:new Date().toISOString(),inputSha256:input.sha256,size:input.size,objectKey:`submissions/${who.studyId}/${input.submissionId}.json`}).onConflictDoNothing();
  const row = await getDb().select().from(submissions).where(eq(submissions.id,input.submissionId)).get();
  if (!row || row.participantId!==who.id || row.inputSha256!==input.sha256 || row.size!==input.size || row.sessionId!==input.sessionId || row.revision!==input.revision || row.assetId!==input.assetId) throw new ApiError(409,'Submission ID conflict');
  return uploadProgress(row);
}
export async function submissionStatus(request: Request, submissionId: string) { return uploadProgress(await authorizedSubmission(request,submissionId)); }
export async function putSubmissionChunk(request: Request, submissionId: string, index: number) {
  const row = await authorizedSubmission(request,submissionId);
  if (row.status==='ready') return {index,received:true,status:'ready'};
  const length = expectedChunkLength(row.size,SESSION_CHUNK_BYTES,index);
  if (length===null) throw new ApiError(400,'Invalid chunk index');
  const bytes = await bodyBytes(request,length); if(bytes.length!==length) throw new ApiError(400,'Incorrect chunk length');
  const hash = await sha256(bytes); const objectKey = `submission-parts/${row.id}/${index}-${hash}`;
  const existing = await getDb().select().from(submissionParts).where(eq(submissionParts.id,`${row.id}_${index}`)).get();
  if (existing && existing.sha256!==hash) throw new ApiError(409,'This chunk already binds different data');
  await bucket().put(objectKey,bytes,{sha256:hash,httpMetadata:{contentType:'application/octet-stream'}});
  await getDb().insert(submissionParts).values({id:`${row.id}_${index}`,submissionId:row.id,partIndex:index,sha256:hash,size:length,objectKey}).onConflictDoNothing();
  const saved = await getDb().select().from(submissionParts).where(eq(submissionParts.id,`${row.id}_${index}`)).get();
  if (saved?.sha256!==hash) throw new ApiError(409,'Concurrent chunk payload conflict');
  return {index,received:true};
}
async function cleanupSubmissionParts(submissionId: string) {
  try {
    const parts = await getDb().select().from(submissionParts).where(eq(submissionParts.submissionId,submissionId));
    if (parts.length) { await bucket().delete(parts.map(p=>p.objectKey)); await getDb().delete(submissionParts).where(eq(submissionParts.submissionId,submissionId)); }
  } catch { console.warn('Deferred cleanup of completed submission upload parts'); }
}
export async function completeSubmission(request: Request, submissionId: string) {
  const row = await authorizedSubmission(request,submissionId);
  if(row.status==='ready') { await cleanupSubmissionParts(row.id); return {submission:summary(row)}; }
  // R2 is committed first. If the D1 update failed, retry reconciles this immutable object.
  const committed = await bucket().head(row.objectKey);
  if(committed) {
    const metadata=committed.customMetadata;
    if(metadata?.inputSha256!==row.inputSha256 || !metadata.packageSha256) throw new ApiError(409,'Stored package identity conflict');
    const values={status:'ready' as const,packageSha256:metadata.packageSha256,packageSize:committed.size,coverage:Number(metadata.coverage),eventCount:Number(metadata.eventCount),passCount:Number(metadata.passCount)};
    if([values.coverage,values.eventCount,values.passCount].some(n=>!Number.isFinite(n))) throw new ApiError(503,'Stored package metadata is invalid');
    await getDb().update(submissions).set(values).where(eq(submissions.id,row.id));
    await cleanupSubmissionParts(row.id);
    return {submission:summary({...row,...values})};
  }
  const parts=await getDb().select().from(submissionParts).where(eq(submissionParts.submissionId,row.id)).orderBy(asc(submissionParts.partIndex));
  if(parts.length!==Math.ceil(row.size/SESSION_CHUNK_BYTES) || parts.some((p,i)=>p.partIndex!==i || p.size!==expectedChunkLength(row.size,SESSION_CHUNK_BYTES,i))) throw new ApiError(409,'Submission upload is incomplete');
  let bytes: Uint8Array<ArrayBuffer> | null = new Uint8Array(row.size); let offset=0;
  for(const part of parts) {
    const object=await bucket().get(part.objectKey); if(!object) throw new ApiError(409,'Submission chunk is missing; retry its upload');
    const chunk=await object.arrayBuffer(); if(chunk.byteLength!==part.size || await sha256(chunk)!==part.sha256) throw new ApiError(409,'Submission chunk checksum mismatch');
    bytes.set(new Uint8Array(chunk),offset);offset+=chunk.byteLength;
  }
  if(await sha256(bytes)!==row.inputSha256) throw new ApiError(400,'Submission SHA-256 mismatch');
  let parsed: unknown; try {parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));} catch {throw new ApiError(400,'Invalid annotation JSON');}
  bytes=null;
  const session=sessionInput.parse(parsed) as AnnotationSessionV2; parsed=null;
  const study=await getDb().select().from(studies).where(eq(studies.id,row.studyId)).get();
  const asset=await getDb().select().from(assets).where(eq(assets.id,row.assetId)).get();
  if(!study || !asset || session.id!==row.sessionId || session.studyId!==study.id || session.studyVersion!==study.version || session.participantId!==row.participantId || session.revision!==row.revision ||
    session.emotionTarget!==study.emotionTarget || session.asset.id!==asset.id || Math.abs(session.asset.duration-asset.duration)>0.05 || session.asset.size!==asset.size || session.asset.mimeType!==asset.mimeType || (session.researchCode??'')!==row.researchCode) throw new ApiError(400,'Annotation identity or protocol does not match the assigned study');
  session.asset={id:asset.id,name:asset.name,size:asset.size,mimeType:asset.mimeType,duration:asset.duration,studyId:asset.studyId,status:'ready'};
  const stats=sessionStats(session); const samples=deriveSamples(session);
  const envelope:StoredPackage={schemaVersion:2,submittedAt:row.createdAt,inputSha256:row.inputSha256,session,samples,stats};
  const packageBytes=encoder.encode(JSON.stringify(envelope)); const packageSha256=await sha256(packageBytes);
  const stored=await bucket().put(row.objectKey,packageBytes,{sha256:packageSha256,onlyIf:{etagDoesNotMatch:'*'},
    httpMetadata:{contentType:'application/json'},customMetadata:{inputSha256:row.inputSha256,packageSha256,coverage:String(stats.coverage),eventCount:String(stats.eventCount),passCount:String(stats.passCount)}});
  if(!stored) return completeSubmission(request,submissionId);
  const verified=await bucket().head(row.objectKey);
  if(!verified || verified.size!==packageBytes.length || verified.customMetadata?.packageSha256!==packageSha256) throw new ApiError(503,'Submission storage verification failed; retry to reconcile');
  const values={status:'ready' as const,packageSha256,packageSize:packageBytes.length,...stats};
  await getDb().update(submissions).set(values).where(eq(submissions.id,row.id));
  // Retaining upload parts until the ready index is durable makes retries safe.
  await cleanupSubmissionParts(row.id);
  return {submission:summary({...row,...values})};
}
function filters(url: URL): SQL[] {
  const result:SQL[]=[];
  for(const key of ['studyId','assetId','participantId'] as const) {const value=url.searchParams.get(key); if(value) result.push(eq(submissions[key],value));}
  return result;
}
function cursorFilter(value:string|null) {
  if(!value) return undefined;
  try {const [time,id]=JSON.parse(atob(value)); if(typeof time!=='string'||typeof id!=='string') throw 0;
    return or(lt(submissions.createdAt,time),and(eq(submissions.createdAt,time),lt(submissions.id,id)));}
  catch {throw new ApiError(400,'Invalid cursor');}
}
export async function listSubmissions(url:URL) {
  const conditions=filters(url); const cursor=cursorFilter(url.searchParams.get('cursor')); if(cursor)conditions.push(cursor);
  const rows=await getDb().select().from(submissions).where(and(...conditions)).orderBy(desc(submissions.createdAt),desc(submissions.id)).limit(51);
  const page=rows.slice(0,50);const last=page.at(-1);
  return {submissions:page.map(summary),nextCursor:rows.length>50&&last?btoa(JSON.stringify([last.createdAt,last.id])):null};
}
const CSV_HEADER=['submission_id','study_id','asset_id','participant_id','research_code','revision','emotion_target','media_time','valence','arousal','value_origin','source_event_id','pass_id'];
function csvLines(pack:StoredPackage,submissionId:string) {
  return pack.samples.map(s=>[submissionId,pack.session.studyId,pack.session.asset.id,pack.session.participantId,pack.session.researchCode??'',pack.session.revision,pack.session.emotionTarget,s.mediaTime,s.valence,s.arousal,s.valueOrigin,s.sourceEventId,s.passId].map(csvCell).join(',')+'\r\n').join('');
}
export async function exportSubmission(submissionId:string,url:URL) {
  const row=await getDb().select().from(submissions).where(and(eq(submissions.id,submissionId),eq(submissions.status,'ready'))).get();
  if(!row)throw new ApiError(404,'Completed submission not found');
  const object=await bucket().get(row.objectKey);if(!object)throw new ApiError(503,'Stored submission unavailable');
  const format=url.searchParams.get('format')??'json';
  if(format!=='json'&&format!=='csv')throw new ApiError(400,'Expected json or csv');
  const headers={'Content-Disposition':`attachment; filename="mood-rater-${row.id}.${format}"`,'Cache-Control':'no-store','X-Package-SHA256':row.packageSha256??''};
  if(format==='json')return new Response(object.body,{headers:{...headers,'Content-Type':'application/json; charset=utf-8'}});
  const pack=await object.json<StoredPackage>();
  return new Response('\uFEFF'+CSV_HEADER.join(',')+'\r\n'+csvLines(pack,row.id),{headers:{...headers,'Content-Type':'text/csv; charset=utf-8'}});
}
export async function exportAll(url:URL) {
  const format=url.searchParams.get('format')??'ndjson';
  if(format!=='ndjson'&&format!=='csv')throw new ApiError(400,'Expected ndjson or csv');
  // One R2 package at a time; the stream pulls the next row only as the receiver consumes it.
  let cursor: {time:string;id:string}|undefined;let page:SubmissionRow[]=[];let finished=false;let header=false;
  const stream=new ReadableStream<Uint8Array>({async pull(controller){
    try {
      if(format==='csv'&&!header){header=true;controller.enqueue(encoder.encode('\uFEFF'+CSV_HEADER.join(',')+'\r\n'));return;}
      if(!page.length&&!finished){
        const conditions=[...filters(url),eq(submissions.status,'ready')];if(cursor)conditions.push(or(gt(submissions.createdAt,cursor.time),and(eq(submissions.createdAt,cursor.time),gt(submissions.id,cursor.id)))!);
        page=await getDb().select().from(submissions).where(and(...conditions)).orderBy(asc(submissions.createdAt),asc(submissions.id)).limit(10);finished=page.length<10;
      }
      const row=page.shift();if(!row){controller.close();return;}cursor={time:row.createdAt,id:row.id};
      const object=await bucket().get(row.objectKey);if(!object)throw new Error(`Submission ${row.id} could not be read; export stopped`);
      if(format==='ndjson'){controller.enqueue(encoder.encode(JSON.stringify({submission:summary(row),package:await object.json()})+'\n'));}
      else {controller.enqueue(encoder.encode(csvLines(await object.json<StoredPackage>(),row.id)));}
    }catch(error){controller.error(error);}
  }});
  return new Response(stream,{headers:{'Content-Type':format==='csv'?'text/csv; charset=utf-8':'application/x-ndjson','Content-Disposition':`attachment; filename="mood-rater-results.${format}"`,'Cache-Control':'no-store'}});
}
