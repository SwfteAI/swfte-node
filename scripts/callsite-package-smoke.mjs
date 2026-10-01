import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, lstatSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
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
  const consumer=join(temp,'consumer'); mkdirSync(consumer); writeFileSync(join(consumer,'package.json'),'{"private":true}');
  run(['install','--ignore-scripts','--no-audit','--no-fund','--offline',join(temp,filename)],consumer);
  assert(!lstatSync(join(consumer,'node_modules')).isSymbolicLink());
  const require=createRequire(join(consumer,'check.cjs')); const cjs=require('@swfte/sdk');
  assert(realpathSync(require.resolve('@swfte/sdk')).startsWith(realpathSync(consumer) + '/'));
  const esm=await import(pathToFileURL(join(consumer,'node_modules/@swfte/sdk/dist/index.mjs')).href);
  const seen=[];
  server=http.createServer(async(req,res)=>{for await(const _part of req){} seen.push([req.url,req.headers['x-swfte-callsite']]);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(req.url.endsWith('/status')?{execution:{executionId:'packed',status:'SUCCEEDED',outputData:{marker:'snapshot-3'}}}:{executionId:'packed',status:'PENDING'}));});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  for(const sdk of [cjs,esm]) {
    const client=new sdk.SwfteClient({apiKey:'packed-unit-key',apiBaseUrl:base,maxRetries:1});
    const result=await client.workflows.invokeVersionAndWait('wf_packed',3,{}, {callsite:'cs_'+'a'.repeat(24),pollIntervalMs:1});
    assert.deepEqual(result.outputs,{marker:'snapshot-3'});assert.deepEqual(seen.at(-2),['/v2/workflows/wf_packed/versions/3/invoke','cs_'+'a'.repeat(24)]);assert.equal(seen.at(-1)[1],undefined);
  }
  console.log('SDK_NODE_PACKED_OK '+JSON.stringify({tarball:filename,formats:['cjs','esm'],realIsolatedInstall:true,wireRequests:seen.length}));
} finally {if(server) await new Promise(resolve=>server.close(resolve));rmSync(temp,{recursive:true,force:true});}
