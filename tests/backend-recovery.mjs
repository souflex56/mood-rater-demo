// Injects one local SQLite failure at the D1 ready transition, then verifies retry.
// Never run against production. R2 is committed before this injected index failure.
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
const base=process.env.MOOD_API_BASE;
if(!base||!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw new Error('MOOD_API_BASE must be localhost');
const directory=resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const files=readdirSync(directory).filter(p=>p.endsWith('.sqlite')&&p!=='metadata.sqlite');
assert.equal(files.length,1,'Expected one local D1 database');const db=resolve(directory,files[0]);
function sql(statement){execFileSync('python3',['-c','import sqlite3,sys\nc=sqlite3.connect(sys.argv[1]);c.executescript(sys.argv[2]);c.commit()',db,statement]);}
const owner={Cookie:'__sites_local_auth=1'};const json={'Content-Type':'application/json'};
async function api(path,body,headers={},method='POST',status=200){const r=await fetch(base+path,{method,headers:{...headers,...(body instanceof Uint8Array?{}:json)},...(body===undefined?{}:{body:body instanceof Uint8Array?body:JSON.stringify(body)})});const result=await r.json();assert.equal(r.status,status,JSON.stringify(result));return result;}
const {study}=await api('/api/admin/studies',{title:'Recovery fixture '+Date.now(),consent:'Local automated test'},owner,'POST',201);
const audio=new Uint8Array(100);const upload=await api(`/api/admin/studies/${study.id}/uploads`,{name:'recovery.wav',size:100,mimeType:'audio/wav',duration:2},owner,'POST',201);
await api(`/api/admin/uploads/${upload.uploadId}/chunks/0`,audio,owner,'PUT');const {asset}=await api(`/api/admin/uploads/${upload.uploadId}/complete`,{},owner);await api(`/api/admin/studies/${study.id}`,{action:'publish'},owner,'PATCH');
const participant=await api(`/api/study/${study.token}/participate`,{consent:true},{},'POST',201);const auth={Authorization:`Bearer ${participant.participationToken}`};const now=new Date().toISOString();
const session={schemaVersion:2,id:randomUUID(),createdAt:now,updatedAt:now,mode:'research',locale:'en',emotionTarget:'perceived',asset,studyId:study.id,studyVersion:1,participantId:participant.participantId,researchCode:'',notes:'',revision:0,protocol:{scale:[0,1],sampleRateHz:10,resampling:'zero_order_hold',version:1},passes:[]};
const bytes=Buffer.from(JSON.stringify(session));const submissionId=randomUUID();
await api('/api/submissions/init',{participationToken:participant.participationToken,submissionId,sessionId:session.id,assetId:asset.id,revision:0,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});await api(`/api/submissions/${submissionId}/chunks/0`,bytes,auth,'PUT');
const trigger='smoke_reject_ready_'+submissionId.replaceAll('-','');
try{
  sql(`CREATE TRIGGER ${trigger} BEFORE UPDATE OF status ON submissions WHEN NEW.id='${submissionId}' AND NEW.status='ready' BEGIN SELECT RAISE(ABORT,'injected ready-index failure'); END;`);
  await api(`/api/submissions/${submissionId}/complete`,{},auth,'POST',503);
  assert.equal((await api(`/api/submissions/${submissionId}`,undefined,auth,'GET')).status,'pending');
}finally{sql(`DROP TRIGGER IF EXISTS ${trigger};`);}
const result=await api(`/api/submissions/${submissionId}/complete`,{},auth);assert.equal(result.submission.status,'ready');assert.equal(result.submission.coverage,0);
const output=await api(`/api/admin/submissions/${submissionId}/export?format=json`,undefined,owner,'GET');assert.equal(output.session.id,session.id);
await api(`/api/admin/studies/${study.id}`,{action:'close'},owner,'PATCH');
console.log(JSON.stringify({ok:true,studyId:study.id,submissionId,checks:'R2 commit followed by injected D1 failure returns503; identical retry restores ready from verified stored object; empty annotation remains valid'},null,2));
