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
  const seen=[]; const executions=new Map();
  server=http.createServer(async(req,res)=>{
    for await(const _part of req){}
    const path=req.url; seen.push([req.method,path,req.headers['x-swfte-callsite']]);
    res.setHeader('Content-Type','application/json');
    if(path.endsWith('/status')) {
      const eid=path.split('/').at(-2);
      res.end(JSON.stringify({execution:{executionId:eid,status:'SUCCEEDED',outputData:{marker:'snapshot-'+executions.get(eid)}}}));
    } else {
      const segment=/\/versions\/([^/]+)\/invoke/u.exec(path)?.[1];
      const version=segment===undefined?'live':decodeURIComponent(segment);
      const eid='packed_'+executions.size; executions.set(eid,version);
      res.end(JSON.stringify({executionId:eid,status:'PENDING',workflowVersion:version}));
    }
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve)); const base='http://127.0.0.1:'+server.address().port;
  const id='cs_'+'a'.repeat(24);
  for(const sdk of [cjs,esm]) {
    const client=new sdk.SwfteClient({apiKey:'packed-unit-key',apiBaseUrl:base,maxRetries:1});
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
    const count=seen.length;
    for(const bad of ['5','1.0.7/','1.0.7?x=1','1.0.7#x','../1.0.7','1.0.7%2Fextra','1.0.7\n','1.0.7+'+'a'.repeat(123)]) {
      await assert.rejects(client.workflows.invokeVersion('wf_packed',bad),sdk.InvalidRequestError);
      await assert.rejects(client.workflows.invokeVersionAndWait('wf_packed',bad),sdk.InvalidRequestError);
      assert.equal(seen.length,count);
    }
  }
  assert(seen.filter(row=>row[1].endsWith('/status')).every(row=>row[2]===undefined));
  assert.equal(seen.length,14);
  console.log('SDK_NODE_PACKED_OK '+JSON.stringify({tarball:filename,tarballSha256,formats:['cjs','esm'],realIsolatedInstall:true,wireRequests:seen.length,semanticStrings:'exact',badStringTransportRequests:0}));
} finally {if(server) await new Promise(resolve=>server.close(resolve));rmSync(temp,{recursive:true,force:true});}
