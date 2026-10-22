// Integration test against the local Sites dev worker with migrations applied.
// Run: MOOD_API_BASE=http://127.0.0.1:3000 node tests/backend-smoke.mjs
// Seeds one draft and two published versions in the local DB; never targets production.
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
const base=process.env.MOOD_API_BASE;
if(!base || !['127.0.0.1','localhost'].includes(new URL(base).hostname))throw new Error('MOOD_API_BASE must be an explicit localhost URL');
const owner={Cookie:'__sites_local_auth=1'};
const json={'Content-Type':'application/json'};
async function req(path,{status=200,headers={},...init}={}){
  const response=await fetch(base+path,{...init,headers:{...headers}});
  const text=await response.text(); let body; try {body=JSON.parse(text);} catch {body={error:text};} assert.equal(response.status,status,`${path}: ${JSON.stringify(body)}`); return body;
}
const config={title:'Backend smoke '+new Date().toISOString(),titleZh:'集成测试',description:'Local fixture',descriptionZh:'本地测试',consent:'I agree',consentZh:'我同意',emotionTarget:'perceived'};
assert.equal((await req('/api/identity')).isAdmin,false);
await req('/api/admin/studies',{status:401});
await req('/api/admin/studies',{status:401,headers:{'oai-authenticated-user-id':'local_seedy','oai-authenticated-user-email':'seedy@sites.test'}});
assert.equal((await req('/api/identity',{headers:owner})).isAdmin,true);
await req('/api/admin/studies',{method:'POST',status:403,headers:{...owner,...json,Origin:'https://foreign.invalid'},body:JSON.stringify(config)});
const {study}=await req('/api/admin/studies',{method:'POST',status:201,headers:{...owner,...json},body:JSON.stringify(config)});
await req('/api/study/'+study.token,{status:404});
await req('/api/admin/studies/'+study.id,{method:'PATCH',status:409,headers:{...owner,...json},body:JSON.stringify({action:'publish'})});
const audio=new Uint8Array(44+8000);new DataView(audio.buffer).setUint32(0,0x52494646,false); // opaque fixture: server does not transcode
const up=await req(`/api/admin/studies/${study.id}/uploads`,{method:'POST',status:201,headers:{...owner,...json},body:JSON.stringify({name:'fixture.wav',size:audio.length,mimeType:'audio/wav',duration:2})});
await req(`/api/admin/uploads/${up.uploadId}/complete`,{method:'POST',headers:owner,status:409});
await req(`/api/admin/uploads/${up.uploadId}/chunks/0`,{method:'PUT',headers:owner,body:audio});
assert.deepEqual((await req(`/api/admin/uploads/${up.uploadId}`,{headers:owner})).uploadedParts,[0]);
const {asset}=await req(`/api/admin/uploads/${up.uploadId}/complete`,{method:'POST',headers:owner});
assert.equal((await req(`/api/admin/uploads/${up.uploadId}/complete`,{method:'POST',headers:owner})).asset.id,asset.id);
const draftPreview=await fetch(base+asset.url,{headers:{...owner,Range:'bytes=0-9'}});assert.equal(draftPreview.status,206);assert.equal((await draftPreview.arrayBuffer()).byteLength,10);
const published=(await req(`/api/admin/studies/${study.id}`,{method:'PATCH',headers:{...owner,...json},body:JSON.stringify({action:'publish'})})).study;
assert.equal((await req('/api/study/'+study.token)).study.status,'published');
await req(`/api/admin/studies/${study.id}`,{method:'PATCH',status:409,headers:{...owner,...json},body:JSON.stringify({action:'update',config})});
const range=await fetch(base+asset.url,{headers:{Range:'bytes=10-19'}});assert.equal(range.status,206);assert.equal(range.headers.get('content-range'),`bytes 10-19/${audio.length}`);assert.equal((await range.arrayBuffer()).byteLength,10);
assert.equal((await fetch(base+asset.url,{headers:{Range:'bytes=999999-'}})).status,416);
const p=await req(`/api/study/${study.token}/participate`,{method:'POST',status:201,headers:json,body:JSON.stringify({consent:true,researchCode:'=unsafe'})});
const bearer={Authorization:`Bearer ${p.participationToken}`};const now=new Date().toISOString();
const session={schemaVersion:2,id:randomUUID(),createdAt:now,updatedAt:now,mode:'research',locale:'en',emotionTarget:'perceived',asset,studyId:study.id,studyVersion:published.version,participantId:p.participantId,researchCode:'=unsafe',notes:'',revision:2,protocol:{scale:[0,1],sampleRateHz:10,resampling:'zero_order_hold',version:1},passes:[{id:randomUUID(),order:0,start:0.23,end:1.5,revoked:false,endReason:'stop',events:[{id:randomUUID(),sequence:0,mediaTime:0.51,monotonicTime:100,valence:0.7,arousal:0.3,input:'pointer'}]}]};
const bytes=Buffer.from(JSON.stringify(session));const submissionId=randomUUID();
const init={participationToken:p.participationToken,submissionId,sessionId:session.id,assetId:asset.id,revision:session.revision,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
assert.equal((await req('/api/submissions/init',{method:'POST',headers:json,body:JSON.stringify(init)})).status,'pending');
await req(`/api/submissions/${submissionId}/complete`,{method:'POST',headers:bearer,status:409});
await req(`/api/submissions/${submissionId}/chunks/0`,{method:'PUT',headers:bearer,body:bytes});
const ready=await req(`/api/submissions/${submissionId}/complete`,{method:'POST',headers:bearer});
assert.equal(ready.submission.status,'ready');assert.equal(ready.submission.eventCount,1);assert.equal(ready.submission.passCount,1);
assert.equal((await req(`/api/submissions/${submissionId}/complete`,{method:'POST',headers:bearer})).submission.id,submissionId);
assert.equal((await req('/api/submissions/init',{method:'POST',headers:json,body:JSON.stringify(init)})).status,'ready');
await req('/api/submissions/init',{method:'POST',status:409,headers:json,body:JSON.stringify({...init,sha256:'0'.repeat(64)})});
await req(`/api/submissions/${submissionId}`,{status:401,headers:{Authorization:'Bearer wrong'}});
await req(`/api/admin/submissions/${submissionId}/export?format=json`,{status:401});
const exported=await fetch(base+`/api/admin/submissions/${submissionId}/export?format=json`,{headers:owner});assert.equal(exported.status,200);
const exportBytes=Buffer.from(await exported.arrayBuffer());assert.equal(createHash('sha256').update(exportBytes).digest('hex'),exported.headers.get('x-package-sha256'));
const pack=JSON.parse(exportBytes);assert.equal(pack.samples.length,20);assert.equal(pack.samples[0].valueOrigin,'missing');assert.equal(pack.samples[6].valence,0.7);
const csv=await (await fetch(base+`/api/admin/submissions/${submissionId}/export?format=csv`,{headers:owner})).text();assert.match(csv,/'=unsafe/);
const list=await req('/api/admin/submissions?studyId='+study.id,{headers:owner});assert.equal(list.submissions.length,1);
const bulk=await (await fetch(base+`/api/admin/export?studyId=${study.id}&format=ndjson`,{headers:owner})).text();assert.equal(bulk.trim().split('\n').length,1);
const cloned=(await req(`/api/admin/studies/${study.id}`,{method:'PATCH',headers:{...owner,...json},body:JSON.stringify({action:'clone'})})).study;assert.equal(cloned.version,2);assert.notEqual(cloned.token,study.token);assert.equal(cloned.assets.length,1);assert.notEqual(cloned.assets[0].id,asset.id);
await req(`/api/admin/studies/${study.id}`,{method:'PATCH',headers:{...owner,...json},body:JSON.stringify({action:'close'})});
await req(`/api/study/${study.token}/participate`,{method:'POST',headers:json,status:409,body:JSON.stringify({consent:true})});
await req('/api/submissions/init',{method:'POST',headers:json,status:409,body:JSON.stringify({...init,submissionId:randomUUID()})});
console.log(JSON.stringify({ok:true,studyId:study.id,submissionId,checks:'anonymous/admin access, spoof rejection, CSRF, upload resume, range, consent, immutable studies, hashed submission, idempotency, private exports, version clone, closure'},null,2));
