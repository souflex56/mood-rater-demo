import { ZodError } from 'zod';
import { ApiError, bootstrap, identity, requireAdmin, sameOrigin } from '@/lib/server/core';
import { audioUploadStatus, changeStudy, completeAudio, createStudy, listStudies, participate, publicStudy, putAudioChunk, removeAudio, startAudioUpload, streamAudio, studyView } from '@/lib/server/studies';
import { completeSubmission, exportAll, exportSubmission, initializeSubmission, listSubmissions, putSubmissionChunk, submissionStatus } from '@/lib/server/submissions';

export const dynamic = 'force-dynamic';
async function route(request:Request):Promise<Response> {
  const url=new URL(request.url);const path=url.pathname.replace(/^\/api\/?/,'').split('/').filter(Boolean);const method=request.method;
  if(!['GET','HEAD'].includes(method))sameOrigin(request);
  if(path[0]==='identity'&&method==='GET')return Response.json(await identity(request));
  if(path[0]==='admin') {
    if(path[1]==='bootstrap'&&method==='POST')return Response.json(await bootstrap(request));
    await requireAdmin(request);
    if(path[1]==='studies'&&path.length===2){
      if(method==='GET')return Response.json(await listStudies());
      if(method==='POST')return Response.json(await createStudy(request),{status:201});
    }
    if(path[1]==='studies'&&path[2]){
      if(path.length===3&&method==='PATCH')return Response.json(await changeStudy(request,path[2]));
      if(path[3]==='uploads'&&path.length===4&&method==='POST')return Response.json(await startAudioUpload(request,path[2]),{status:201});
    }
    if(path[1]==='uploads'&&path[2]){
      if(path.length===3&&method==='GET')return Response.json(await audioUploadStatus(path[2]));
      if(path[3]==='chunks'&&path.length===5&&method==='PUT')return Response.json(await putAudioChunk(request,path[2],Number(path[4])));
      if(path[3]==='complete'&&path.length===4&&method==='POST')return Response.json(await completeAudio(path[2]));
    }
    if(path[1]==='assets'&&path.length===3&&method==='DELETE')return Response.json(await removeAudio(path[2]));
    if(path[1]==='submissions'&&path.length===2&&method==='GET')return Response.json(await listSubmissions(url));
    if(path[1]==='submissions'&&path[3]==='export'&&path.length===4&&method==='GET')return exportSubmission(path[2],url);
    if(path[1]==='export'&&path.length===2&&method==='GET')return exportAll(url);
  }
  if(path[0]==='study'&&path[1]){
    if(path.length===2&&method==='GET')return Response.json({study:await studyView(await publicStudy(path[1]))});
    if(path[2]==='participate'&&path.length===3&&method==='POST')return Response.json(await participate(request,path[1]),{status:201});
    if(path[2]==='audio'&&path.length===4&&['GET','HEAD'].includes(method))return streamAudio(request,path[1],path[3]);
  }
  if(path[0]==='submissions'){
    if(path[1]==='init'&&path.length===2&&method==='POST')return Response.json(await initializeSubmission(request));
    if(path[1]&&path.length===2&&method==='GET')return Response.json(await submissionStatus(request,path[1]));
    if(path[2]==='chunks'&&path.length===4&&method==='PUT')return Response.json(await putSubmissionChunk(request,path[1],Number(path[3])));
    if(path[2]==='complete'&&path.length===3&&method==='POST')return Response.json(await completeSubmission(request,path[1]));
  }
  throw new ApiError(404,'Endpoint not found');
}
async function handle(request:Request) {
  let response:Response;
  try {response=await route(request);} catch(error) {
    if(error instanceof ZodError)response=Response.json({error:'Invalid request',details:error.issues.slice(0,5).map(issue=>({path:issue.path,message:issue.message}))},{status:400});
    else if(error instanceof ApiError)response=Response.json({error:error.message},{status:error.status});
    else {console.error('Research API failure',error instanceof Error?error.message:'Unknown error');response=Response.json({error:'The server could not complete this request. Retry without changing the upload or submission ID.'},{status:503});}
  }
  response.headers.set('X-Content-Type-Options','nosniff');response.headers.set('Referrer-Policy','no-referrer');
  if(!response.headers.has('Cache-Control'))response.headers.set('Cache-Control','no-store');
  return response;
}
export {handle as GET,handle as POST,handle as PUT,handle as PATCH,handle as DELETE,handle as HEAD};
