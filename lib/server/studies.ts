import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db';
import { assets, audioParts, audioUploads, participants, studies } from '@/db/schema';
import type { AudioAsset, Study } from '@/lib/types';
import { ApiError, bodyBytes, bucket, id, jsonBody, requireAdmin, sha256, token } from './core';
import { AUDIO_CHUNK_BYTES, audioInput, expectedChunkLength, studyInput } from './validation';

type StudyRow = typeof studies.$inferSelect;
type AssetRow = typeof assets.$inferSelect;
export function publicAsset(asset: AssetRow, studyToken: string): AudioAsset {
  return { id: asset.id, studyId: asset.studyId, name: asset.name, size: asset.size, mimeType: asset.mimeType,
    duration: asset.duration, status: asset.status, url: `/api/study/${studyToken}/audio/${asset.id}` };
}
export async function studyView(row: StudyRow): Promise<Study> {
  const audio = await getDb().select().from(assets).where(eq(assets.studyId, row.id)).orderBy(asc(assets.position));
  return { id:row.id,token:row.token,version:row.version,title:row.title,titleZh:row.titleZh,description:row.description,
    descriptionZh:row.descriptionZh,consent:row.consent,consentZh:row.consentZh,emotionTarget:row.emotionTarget,status:row.status,
    createdAt:row.createdAt,assets:audio.map(asset => publicAsset(asset,row.token)) };
}
export async function getStudy(studyId: string) {
  const row = await getDb().select().from(studies).where(eq(studies.id, studyId)).get();
  if (!row) throw new ApiError(404, 'Study not found'); return row;
}
export async function publicStudy(studyToken: string) {
  const row = await getDb().select().from(studies).where(eq(studies.token, studyToken)).get();
  if (!row || row.status === 'draft') throw new ApiError(404, 'Study not found');
  return row;
}
export async function listStudies() {
  const rows = await getDb().select().from(studies).orderBy(desc(studies.createdAt)).limit(200);
  return { studies: await Promise.all(rows.map(studyView)) };
}
export async function createStudy(request: Request) {
  const input = studyInput.parse(await jsonBody(request)); const studyId = id();
  const row: StudyRow = { ...input, id:studyId,familyId:studyId,token:token(),version:1,status:'draft',createdAt:new Date().toISOString() };
  await getDb().insert(studies).values(row); return { study:await studyView(row) };
}
export async function changeStudy(request: Request, studyId: string) {
  const row = await getStudy(studyId); const body = z.object({action:z.enum(['update','publish','close','clone']),config:studyInput.optional(),assetIds:z.array(z.string()).max(100).optional()}).strict().parse(await jsonBody(request));
  if (body.action === 'clone') {
    const highest = await getDb().select({v:sql<number>`max(${studies.version})`}).from(studies).where(eq(studies.familyId,row.familyId)).get();
    const clone: StudyRow = {...row,...body.config,id:id(),token:token(),version:(highest?.v ?? row.version)+1,status:'draft',createdAt:new Date().toISOString()};
    const ready = await getDb().select().from(assets).where(and(eq(assets.studyId,row.id),eq(assets.status,'ready')));
    const insertStudy = getDb().insert(studies).values(clone);
    if (ready.length) await getDb().batch([insertStudy,getDb().insert(assets).values(ready.map(asset=>({...asset,id:id(),studyId:clone.id}))) ]);
    else await insertStudy;
    return {study:await studyView(clone)};
  }
  if (body.action === 'close') {
    if (row.status !== 'published') throw new ApiError(409,'Only a published study can be closed');
    await getDb().update(studies).set({status:'closed'}).where(and(eq(studies.id,row.id),eq(studies.status,'published')));
  } else {
    if (row.status !== 'draft') throw new ApiError(409,'Published study settings are immutable; clone a new version to edit');
    if (body.action === 'publish') {
      const audio = await getDb().select().from(assets).where(eq(assets.studyId,row.id));
      if (!audio.length || audio.some(asset => asset.status !== 'ready')) throw new ApiError(409,'Add and finish uploading all audio before publishing');
      await getDb().update(studies).set({status:'published'}).where(and(eq(studies.id,row.id),eq(studies.status,'draft')));
    } else {
      if (!body.config && !body.assetIds) throw new ApiError(400,'Provide config or ordered assetIds');
      if (body.config) await getDb().update(studies).set(body.config).where(and(eq(studies.id,row.id),eq(studies.status,'draft')));
      if (body.assetIds) {
        const audio = await getDb().select().from(assets).where(eq(assets.studyId,row.id));
        if (new Set(body.assetIds).size !== audio.length || audio.some(a=>!body.assetIds!.includes(a.id))) throw new ApiError(400,'assetIds must contain every study asset exactly once');
        const updates = body.assetIds.map((assetId, position)=>getDb().update(assets).set({position}).where(and(eq(assets.id,assetId),eq(assets.studyId,row.id))));
        if (updates.length) await getDb().batch(updates as [typeof updates[number], ...typeof updates[number][]]);
      }
    }
  }
  return {study:await studyView(await getStudy(row.id))};
}
export async function participate(request: Request, studyToken: string) {
  const study = await publicStudy(studyToken);
  if (study.status !== 'published') throw new ApiError(409,'This study is closed');
  const input = z.object({consent:z.literal(true),researchCode:z.string().trim().max(100).default('')}).strict().parse(await jsonBody(request));
  const participationToken = token(); const participantId = id();
  await getDb().insert(participants).values({id:participantId,studyId:study.id,tokenHash:await sha256(participationToken),researchCode:input.researchCode,createdAt:new Date().toISOString()});
  return {participantId,participationToken};
}
export async function startAudioUpload(request: Request, studyId: string) {
  const study = await getStudy(studyId);
  if (study.status !== 'draft') throw new ApiError(409,'Only draft studies can accept audio');
  const input = audioInput.parse(await jsonBody(request));
  const count = (await getDb().select({n:sql<number>`count(*)`}).from(assets).where(eq(assets.studyId,studyId)).get())?.n ?? 0;
  if (count >= 100) throw new ApiError(409,'A study supports up to 100 audio assets');
  const assetId = id(); const uploadId = id(); const objectKey = `audio/${assetId}`;
  const upload = await bucket().createMultipartUpload(objectKey,{httpMetadata:{contentType:input.mimeType,cacheControl:'private, max-age=3600'}});
  const now = new Date().toISOString();
  try {
    await getDb().batch([
      getDb().insert(assets).values({...input,id:assetId,studyId,position:count,objectKey,status:'pending',createdAt:now}),
      getDb().insert(audioUploads).values({id:uploadId,assetId,multipartId:upload.uploadId,objectKey,size:input.size,chunkSize:AUDIO_CHUNK_BYTES,createdAt:now}),
    ]);
  } catch(error) { await upload.abort(); throw error; }
  return {uploadId,assetId,chunkSize:AUDIO_CHUNK_BYTES,chunkCount:Math.ceil(input.size/AUDIO_CHUNK_BYTES)};
}
async function uploadRow(uploadId: string) {
  const upload = await getDb().select().from(audioUploads).where(eq(audioUploads.id,uploadId)).get();
  if (!upload) throw new ApiError(404,'Upload not found'); return upload;
}
export async function audioUploadStatus(uploadId: string) {
  const upload = await uploadRow(uploadId);
  const parts = await getDb().select().from(audioParts).where(eq(audioParts.uploadId,uploadId)).orderBy(asc(audioParts.partIndex));
  const asset = await getDb().select().from(assets).where(eq(assets.id,upload.assetId)).get();
  return {uploadId,assetId:upload.assetId,chunkSize:upload.chunkSize,chunkCount:Math.ceil(upload.size/upload.chunkSize),uploadedParts:parts.map(p=>p.partIndex),status:asset?.status};
}
export async function putAudioChunk(request: Request, uploadId: string, index: number) {
  const upload = await uploadRow(uploadId); const asset = await getDb().select().from(assets).where(eq(assets.id,upload.assetId)).get();
  if (!asset || (await getStudy(asset.studyId)).status !== 'draft' || asset.status !== 'pending') throw new ApiError(409,'This upload is no longer editable');
  const length = expectedChunkLength(upload.size,upload.chunkSize,index);
  if (length === null) throw new ApiError(400,'Invalid chunk index');
  const bytes = await bodyBytes(request,length); if (bytes.byteLength !== length) throw new ApiError(400,'Incorrect chunk length');
  const part = await bucket().resumeMultipartUpload(upload.objectKey,upload.multipartId).uploadPart(index+1,bytes);
  await getDb().insert(audioParts).values({id:`${uploadId}_${index}`,uploadId,partIndex:index,etag:part.etag,size:length})
    .onConflictDoUpdate({target:audioParts.id,set:{etag:part.etag,size:length}});
  return {index,received:true};
}
export async function completeAudio(uploadId: string) {
  const upload = await uploadRow(uploadId); const asset = await getDb().select().from(assets).where(eq(assets.id,upload.assetId)).get();
  if (!asset) throw new ApiError(404,'Asset not found'); const study = await getStudy(asset.studyId);
  if (asset.status === 'ready') return {asset:publicAsset(asset,study.token)};
  if (study.status !== 'draft') throw new ApiError(409,'Study is not editable');
  let object = await bucket().head(upload.objectKey);
  if (!object) {
    const parts = await getDb().select().from(audioParts).where(eq(audioParts.uploadId,uploadId)).orderBy(asc(audioParts.partIndex));
    if (parts.length !== Math.ceil(upload.size/upload.chunkSize) || parts.some((part,index)=>part.partIndex!==index || part.size!==expectedChunkLength(upload.size,upload.chunkSize,index))) throw new ApiError(409,'Upload is incomplete');
    await bucket().resumeMultipartUpload(upload.objectKey,upload.multipartId).complete(parts.map(p=>({partNumber:p.partIndex+1,etag:p.etag})));
    object = await bucket().head(upload.objectKey);
  }
  if (!object || object.size !== upload.size) throw new ApiError(503,'Uploaded audio could not be verified');
  await getDb().update(assets).set({status:'ready'}).where(eq(assets.id,asset.id));
  return {asset:publicAsset({...asset,status:'ready'},study.token)};
}
export async function removeAudio(assetId: string) {
  const asset = await getDb().select().from(assets).where(eq(assets.id,assetId)).get();
  if (!asset) throw new ApiError(404,'Asset not found');
  if ((await getStudy(asset.studyId)).status !== 'draft') throw new ApiError(409,'Only draft assets can be removed');
  const uploads = await getDb().select().from(audioUploads).where(eq(audioUploads.assetId,assetId));
  for (const upload of uploads) {
    if (asset.status === 'pending') { try { await bucket().resumeMultipartUpload(upload.objectKey,upload.multipartId).abort(); } catch { /* Already completed or expired. */ } }
    await getDb().delete(audioParts).where(eq(audioParts.uploadId,upload.id));
  }
  await getDb().delete(audioUploads).where(eq(audioUploads.assetId,assetId)); await getDb().delete(assets).where(eq(assets.id,assetId));
  const other = await getDb().select({id:assets.id}).from(assets).where(eq(assets.objectKey,asset.objectKey)).get();
  if (!other) await bucket().delete(asset.objectKey);
  return {removed:true};
}
export async function streamAudio(request: Request, studyToken: string, assetId: string) {
  const study = await getDb().select().from(studies).where(eq(studies.token,studyToken)).get();
  if (!study) throw new ApiError(404,'Study not found');
  if (study.status === 'draft') await requireAdmin(request);
  const asset = await getDb().select().from(assets).where(and(eq(assets.id,assetId),eq(assets.studyId,study.id),eq(assets.status,'ready'))).get();
  if (!asset) throw new ApiError(404,'Audio not found');
  let range: {offset:number;length:number}|undefined; const header = request.headers.get('range');
  if (header) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(header);
    if (!match || (!match[1] && !match[2])) return new Response(null,{status:416,headers:{'Content-Range':`bytes */${asset.size}`}});
    const start = match[1] ? Number(match[1]) : Math.max(0,asset.size-Number(match[2]));
    const end = match[1] ? (match[2] ? Math.min(Number(match[2]),asset.size-1) : asset.size-1) : asset.size-1;
    if (start>=asset.size || start>end) return new Response(null,{status:416,headers:{'Content-Range':`bytes */${asset.size}`}});
    range={offset:start,length:end-start+1};
  }
  const object = await bucket().get(asset.objectKey,range ? {range} : undefined);
  if (!object) throw new ApiError(404,'Audio unavailable');
  const headers = new Headers({'Content-Type':asset.mimeType,'Accept-Ranges':'bytes','Content-Length':String(range?.length ?? object.size),'Cache-Control':'private, max-age=3600','ETag':object.httpEtag});
  if (range) headers.set('Content-Range',`bytes ${range.offset}-${range.offset+range.length-1}/${asset.size}`);
  return new Response(request.method==='HEAD'?null:object.body,{status:range?206:200,headers});
}
