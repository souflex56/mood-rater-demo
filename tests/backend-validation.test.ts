import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveSamples } from '../lib/annotation.ts';
import { audioInput, csvCell, expectedChunkLength, sessionInput, studyInput, submissionInput } from '../lib/server/validation.ts';
const fixture=()=>({schemaVersion:2,id:'s',createdAt:'2026-10-22T00:00:00.000Z',updatedAt:'2026-10-22T00:00:00.000Z',mode:'research',locale:'en',emotionTarget:'perceived',asset:{id:'a',name:'Clip',size:10,mimeType:'audio/wav',duration:10},studyId:'study',studyVersion:1,participantId:'p',researchCode:'',notes:'',revision:1,protocol:{scale:[0,1],sampleRateHz:10,resampling:'zero_order_hold',version:1},passes:[{id:'pass',order:0,start:1,end:4,revoked:false,events:[{id:'event',sequence:0,mediaTime:2,monotonicTime:10,valence:0.3,arousal:0.7,input:'pointer'}]}]});
test('partial and empty sessions are valid; open intervals and fabricated protocol are not',()=>{
  assert.equal(sessionInput.safeParse(fixture()).success,true);
  assert.equal(sessionInput.safeParse({...fixture(),passes:[]}).success,true);
  assert.equal(sessionInput.safeParse({...fixture(),passes:[{...fixture().passes[0],end:null}]}).success,false);
  assert.equal(sessionInput.safeParse({...fixture(),protocol:{...fixture().protocol,scale:[-1,1]}}).success,false);
});
test('reject events outside audio, duplicate events and reversed event order',()=>{
  const s=fixture();s.passes[0].events[0].mediaTime=11;assert.equal(sessionInput.safeParse(s).success,false);
  const duplicate=fixture();duplicate.passes[0].events.push({...duplicate.passes[0].events[0]});assert.equal(sessionInput.safeParse(duplicate).success,false);
  const reversed=fixture();reversed.passes[0].events.push({...reversed.passes[0].events[0],id:'next',sequence:1,mediaTime:1.5});assert.equal(sessionInput.safeParse(reversed).success,false);
});
test('audio, submission and draft limits are enforced',()=>{
  assert.equal(audioInput.safeParse({name:'a',size:100*1024*1024,mimeType:'audio/wav',duration:1800}).success,true);
  assert.equal(audioInput.safeParse({name:'a',size:1,mimeType:'text/html',duration:1801}).success,false);
  assert.equal(studyInput.safeParse({title:'t',consent:'consent'}).success,true);
  assert.equal(submissionInput.safeParse({participationToken:'x'.repeat(64),submissionId:'s',sessionId:'s',assetId:'a',revision:0,size:33*1024*1024,sha256:'a'.repeat(64)}).success,false);
});
test('chunk length boundaries and invalid indices',()=>{
  assert.equal(expectedChunkLength(11,5,0),5);assert.equal(expectedChunkLength(11,5,2),1);
  for(const index of [-1,0.5,3,NaN])assert.equal(expectedChunkLength(11,5,index),null);
});
test('CSV escapes quotes, multiline text, and spreadsheet formulas',()=>{
  assert.equal(csvCell('=HYPERLINK("bad")'),'"\'=HYPERLINK(""bad"")"');assert.equal(csvCell('a,b'),'"a,b"');assert.equal(csvCell(null),'');assert.equal(csvCell(0.7),'0.7');
});

test('retain late raw input after an interruption boundary without extending the effective interval',()=>{
  const session=fixture();session.passes[0].start=0;session.passes[0].end=1;session.passes[0].events[0].mediaTime=1.01;
  const parsed=sessionInput.parse(session);
  assert.equal(parsed.passes[0].events[0].mediaTime,1.01);
  assert.equal(deriveSamples(parsed).every(sample=>sample.valence===null),true);
});

test('retain bounded imported session provenance without treating it as an authorization identifier',()=>{
  const importedFromSessionId='source session / old export';
  assert.equal(sessionInput.parse({...fixture(),importedFromSessionId}).importedFromSessionId,importedFromSessionId);
  for(const importedFromSessionId of ['', '   ', 'x'.repeat(201), 123]) assert.equal(sessionInput.safeParse({...fixture(),importedFromSessionId}).success,false);
});
test('CSV neutralizes whitespace-hidden formulas and preserves finite numeric values',()=>{
  for(const value of ['  =1+1',' \t+SUM(1)','\u00a0@SUM(1)','\u0000-1','\tplain','\rplain','\nplain']) {
    assert.equal(csvCell(value).replace(/^"/,'').startsWith("'"),true);
  }
  assert.equal(csvCell('  plain text'),'  plain text');
  assert.equal(csvCell(-1),'-1');assert.equal(csvCell(Number.NaN),'');assert.equal(csvCell(Infinity),'');
});
