import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import http from 'node:http';

const root=process.cwd(); const temp=mkdtempSync(join(tmpdir(),'swfte-node-packed-'));
const run=(args,cwd=root)=>execFileSync('npm',args,{cwd,stdio:['ignore','pipe','pipe'],timeout:120000}).toString();
let server;
try {
  run(['run','build']);
  const [{filename}]=JSON.parse(run(['pack','--ignore-scripts','--json','--pack-destination',temp]));
  const tarballSha256=createHash('sha256').update(readFileSync(join(temp,filename))).digest('hex');
  const consumer=join(temp,'consumer'); mkdirSync(consumer); writeFileSync(join(consumer,'package.json'),'{"private":true}');
  run(['install','--ignore-scripts','--no-audit','--no-fund','--offline',join(temp,filename)],consumer);
  assert(!lstatSync(join(consumer,'node_modules')).isSymbolicLink());
  const require=createRequire(join(consumer,'check.cjs')); const cjs=require('@swfte/sdk');
  assert(realpathSync(require.resolve('@swfte/sdk')).startsWith(realpathSync(consumer) + '/'));
  const esm=await import(pathToFileURL(join(consumer,'node_modules/@swfte/sdk/dist/index.mjs')).href);
  const INPUT={label:'workflow-wire',nested:{enabled:true,values:[1,'two',null]}};
  const bodies=new Map(); const seen=[]; const executions=new Map();
  const published=new Map(['3','1.0.7','1.0.7-rc.2+build.09'].map(label=>[label,'PUBLISHED']));
  process.env.SWFTE_CALLSITE_STACK='';
  server=http.createServer(async(req,res)=>{
    const chunks=[];for await(const part of req) chunks.push(Buffer.from(part));
    const raw=Buffer.concat(chunks).toString('utf8');bodies.set(seen.length,raw?JSON.parse(raw):undefined);
    const path=req.url; seen.push([req.method,path,req.headers['x-swfte-callsite']]);
    res.setHeader('Content-Type','application/json');
    const segment=/\/versions\/([^/]+)\/invoke/u.exec(path)?.[1];
    const version=segment===undefined?'live':decodeURIComponent(segment);
    if(req.headers['x-workspace-id']==='B' || (segment!==undefined && !['PUBLISHED','DEPRECATED'].includes(published.get(version)))) {
      res.writeHead(404); res.end(JSON.stringify({error:'VERSION_NOT_PUBLISHED'})); return;
    }
    if(path.endsWith('/status')) {
      const eid=path.split('/').at(-2);
      res.end(JSON.stringify({execution:{executionId:eid,status:'SUCCEEDED',outputData:{marker:'snapshot-'+executions.get(eid)}}}));
    } else {
      const eid='packed_'+executions.size; executions.set(eid,version);
      res.end(JSON.stringify({executionId:eid,status:'PENDING',workflowVersion:version,sessionId:'session',response:'ok',runId:'run'}));
    }
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve)); const base='http://127.0.0.1:'+server.address().port;
  const id='cs_'+'a'.repeat(24);
  let routeRequests=0;
  for(const sdk of [cjs,esm]) {
    const client=new sdk.SwfteClient({apiKey:'packed-unit-key',apiBaseUrl:base,workspaceId:'A',maxRetries:1});
    const integer=await client.workflows.invokeVersionAndWait('wf_packed',3,{}, {callsite:id,pollIntervalMs:1});
    assert.deepEqual(integer.outputs,{marker:'snapshot-3'});
    assert.deepEqual(seen.at(-2),['POST','/v2/workflows/wf_packed/versions/3/invoke',id]);
    assert.equal(seen.at(-1)[2],undefined);
    await client.workflows.invokeVersion('wf_packed','1.0.7');
    assert.deepEqual(seen.at(-1),['POST','/v2/workflows/wf_packed/versions/1.0.7/invoke',undefined]);
    const semantic=await client.workflows.invokeVersionAndWait('wf_packed','1.0.7',{}, {callsite:id,pollIntervalMs:1});
    assert.deepEqual(semantic.outputs,{marker:'snapshot-1.0.7'});
    const build='1.0.7-rc.2+build.09';
    const built=await client.workflows.invokeVersionAndWait('wf_packed',build,{}, {callsite:id,pollIntervalMs:1});
    assert.deepEqual(built.outputs,{marker:'snapshot-'+build});
    assert.deepEqual(seen.at(-2),['POST','/v2/workflows/wf_packed/versions/1.0.7-rc.2%2Bbuild.09/invoke',id]);
    const labels=['v3','v4','custom@v3:release','latest','5','01.0.7','1.0','1.0.7+','1.0.7-','3'];
    for(const label of labels) published.delete(label);
    for(const label of labels) {
      const route='/v2/workflows/wf_packed/versions/'+encodeURIComponent(label)+'/invoke';
      const before=seen.length,oldExecutions=executions.size;
      await assert.rejects(client.workflows.invokeVersion('wf_packed',label,{}, {callsite:id}),error=>error.status===404);
      await assert.rejects(client.workflows.invokeVersionAndWait('wf_packed',label,{}, {callsite:id,pollIntervalMs:1}),error=>error.status===404);
      assert.equal(executions.size,oldExecutions);
      assert.deepEqual(seen.slice(before),[['POST',route,id],['POST',route,id]]);
      published.set(label,'PUBLISHED');
      const direct=await client.workflows.invokeVersion('wf_packed',label);
      assert.equal(direct.workflowVersion,label);
      assert.deepEqual(seen.at(-1),['POST',route,undefined]);
      await client.workflows.invokeVersion('wf_packed',label,{}, {callsite:id});
      assert.deepEqual(seen.at(-1),['POST',route,id]);
      assert.deepEqual((await client.workflows.invokeVersionAndWait('wf_packed',label)).outputs,{marker:'snapshot-'+label});
      assert.deepEqual(seen.at(-2),['POST',route,undefined]);
      assert.deepEqual((await client.workflows.invokeVersionAndWait('wf_packed',label,{}, {callsite:id,pollIntervalMs:1})).outputs,{marker:'snapshot-'+label});
      assert.deepEqual(seen.at(-2),['POST',route,id]);
    }
    published.set('draft-v3','DRAFT');
    const oldExecutions=executions.size;
    for(const label of ['draft-v3','unknown-v3']) await assert.rejects(client.workflows.invokeVersionAndWait('wf_packed',label),error=>error.status===404);
    const foreign=new sdk.SwfteClient({apiKey:'packed-unit-key',apiBaseUrl:base,workspaceId:'B',maxRetries:1});
    await assert.rejects(foreign.workflows.invokeVersion('wf_packed','v3'),error=>error.status===404);
    assert.equal(executions.size,oldExecutions);
    published.set('retired@v3:release','DEPRECATED');
    assert.deepEqual((await client.workflows.invokeVersionAndWait('wf_packed','retired@v3:release',{}, {pollIntervalMs:1})).outputs,{marker:'snapshot-retired@v3:release'});
    for(const options of [{callsite:id},undefined]) {
      const attribution=options?.callsite;
      const first=seen.length;
      await client.workflows.execute('wf_packed',{},options);
      await client.workflows.invoke('wf_packed',{},options);
      assert.deepEqual((await client.workflows.invokeAndWait('wf_packed',{},options)).outputs,{marker:'snapshot-live'});
      await client.agents.chat('ag_packed','hello',options);
      await client.chatflows.startSession('cf_packed',{},options);
      await client.chatflows.builder.test('cf_packed',{},options);
      const requests=seen.slice(first);
      assert.equal(requests.length,7);
      assert(requests.filter(row=>row[0]==='POST').every(row=>row[2]===attribution));
      assert(requests.filter(row=>row[0]==='GET').every(row=>row[2]===undefined));
    }
    const boundaryStart=seen.length; const boundaryExecutions=executions.size; const c=client;

    const entries=(wf)=>[
      ()=>c.workflows.execute(wf,INPUT),()=>c.workflows.execute(wf,INPUT,true),
      ()=>c.workflows.execute(wf,INPUT, {skipValidation:true,callsite:id}),
      ()=>c.workflows.invoke(wf,INPUT),()=>c.workflows.invoke(wf,INPUT, {callsite:id}),
      ()=>c.workflows.invokeAndWait(wf,INPUT, {pollIntervalMs:1,callsite:id}),
      ()=>c.workflows.invokeVersion(wf,3,INPUT),()=>c.workflows.invokeVersion(wf,'1.0.7',INPUT, {callsite:id}),
      ()=>c.workflows.invokeVersionAndWait(wf,3,INPUT, {pollIntervalMs:1}),
      ()=>c.workflows.invokeVersionAndWait(wf,'1.0.7',INPUT, {pollIntervalMs:1,callsite:id})];
    for(const wf of ['', '.', '..','../other','a/b','a\\b','a?x=1','a#x','a%2fother',' a','a ','a\n','a\r','a\0','é','a+b','a'.repeat(129),null,42,{}]) {
      for(const run of entries(wf)) await assert.rejects(run());
      assert.equal(seen.length,boundaryStart); assert.equal(executions.size,boundaryExecutions);
    }
    for(const wf of ['wf_shared','@:-','...','wf@release:v1','a'.repeat(128)]) {
      const first=seen.length;
      for(const run of entries(wf)) await run();
      const rows=seen.slice(first); const prefix='/v2/workflows/'+encodeURIComponent(wf);
      rows.forEach((row,index)=>assert.deepEqual(bodies.get(first+index),row[0]==='POST'?INPUT:undefined));
      assert.deepEqual(rows.filter(r=>r[0]==='POST').map(r=>r[1]),[
        prefix+'/execute',prefix+'/execute?skipValidation=true',prefix+'/execute?skipValidation=true',
        prefix+'/invoke',prefix+'/invoke',prefix+'/invoke',prefix+'/versions/3/invoke',
        prefix+'/versions/1.0.7/invoke',prefix+'/versions/3/invoke',prefix+'/versions/1.0.7/invoke']);
      assert.deepEqual(rows.filter(r=>r[0]==='POST').map(r=>r[2]),[undefined,undefined,id,undefined,id,id,undefined,id,undefined,id]);
      assert(rows.filter(r=>r[0]==='GET').every(r=>r[2]===undefined));
    }

    routeRequests+=seen.length-boundaryStart;
    const count=seen.length;
    for(const bad of ['','---._+:@','.','..','1.0.7/','1.0.7?x=1','1.0.7#x','../1.0.7','1.0.7%2Fextra','1.0.7\n','1.0.7\r','1.0.7\0',' v3','v3 ','v3\\extra','١.0.7','1.0.7+'+'a'.repeat(123)]) {
      await assert.rejects(client.workflows.invokeVersion('wf_packed',bad),sdk.InvalidRequestError);
      await assert.rejects(client.workflows.invokeVersionAndWait('wf_packed',bad),sdk.InvalidRequestError);
      assert.equal(seen.length,count);
    }
  }
  assert(seen.filter(row=>row[1].endsWith('/status')).every(row=>row[2]===undefined));
  assert.equal(seen.length-routeRequests,212);
  console.log('SDK_NODE_PACKED_OK '+JSON.stringify({tarball:filename,tarballSha256,formats:['cjs','esm'],realIsolatedInstall:true,wireRequests:seen.length,semanticStrings:'exact',legacyStrings:'exact-published-records',unsafeStringTransportRequests:0}));
} finally {if(server) await new Promise(resolve=>server.close(resolve));rmSync(temp,{recursive:true,force:true});}
