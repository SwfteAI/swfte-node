import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { SwfteClient } from '../../src/client';

const ID = 'cs_' + 'a'.repeat(24);
let server: http.Server; let base: string; let live: number; let redirect: string | undefined;
let seen: Array<{path:string; method:string; callsite:string|undefined; workspace:string|undefined}>;
let executions: Map<string,number>;
beforeEach(async () => {
  vi.stubEnv('SWFTE_CALLSITE_STACK',''); live=3; redirect=undefined; seen=[]; executions=new Map();
  server=http.createServer(async (req,res) => {
    for await (const _part of req) { /* consume only; never log source or payload */ }
    const path=req.url ?? ''; seen.push({path,method:req.method ?? '',callsite:req.headers['x-swfte-callsite'] as string|undefined,workspace:req.headers['x-workspace-id'] as string|undefined});
    if (redirect) { res.writeHead(302,{Location:redirect}); res.end(); return; }
    res.setHeader('Content-Type','application/json');
    if(req.headers['x-workspace-id']==='B' || path.includes('/versions/9/')) { res.writeHead(404); res.end(JSON.stringify({error:'VERSION_NOT_PUBLISHED'})); return; }
    if(path.endsWith('/status')) {
      const executionId=path.split('/').at(-2)!; const version=executions.get(executionId)!;
      res.end(JSON.stringify({execution:{executionId,status:'SUCCEEDED',workflowVersion:version,outputData:{marker:`snapshot-${version}`}}})); return;
    }
    const version=Number(/\/versions\/(\d+)\/invoke/u.exec(path)?.[1] ?? live);
    const executionId=`execution_${executions.size}`; executions.set(executionId,version);
    res.end(JSON.stringify({executionId,workflowId:'wf_shared',status:'PENDING',workflowVersion:version,sessionId:'session',response:'ok',runId:'run'}));
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve)); base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(async()=>{ vi.unstubAllEnvs(); await new Promise<void>(resolve=>server.close(()=>resolve())); });
const client=(workspaceId='A')=>new SwfteClient({apiKey:'unit-test-key',apiBaseUrl:base,baseUrl:base,workspaceId,maxRetries:1});

describe('actual version-pinned runtime and attribution',()=>{
  it('keeps version3 after promotion, live follows4, unpublished and foreign versions refuse',async()=>{
    const c=client(); live=4;
    const pinned=await c.workflows.invokeVersionAndWait('wf_shared',3,{}, {callsite:ID,pollIntervalMs:1});
    const current=await c.workflows.invokeAndWait('wf_shared',{}, {pollIntervalMs:1});
    expect(pinned.outputs).toEqual({marker:'snapshot-3'}); expect(current.outputs).toEqual({marker:'snapshot-4'});
    expect(seen[0].path).toBe('/v2/workflows/wf_shared/versions/3/invoke'); expect(seen[0].callsite).toBe(ID);
    expect(seen.filter(x=>x.path.endsWith('/status')).every(x=>x.callsite===undefined)).toBe(true);
    await expect(c.workflows.invokeVersion('wf_shared',9)).rejects.toMatchObject({status:404});
    await expect(client('B').workflows.invokeVersion('wf_shared',3)).rejects.toMatchObject({status:404});
    expect(seen.filter(x=>x.path==='/v2/workflows/wf_shared/invoke')).toHaveLength(1);
  });
  it('defaults off, encodes artifact IDs, omits invalid explicit attribution and rejects bad pins before I/O',async()=>{
    const c=client(); await c.workflows.invokeVersion('wf /shared',3); expect(seen[0].path).toContain('wf%20%2Fshared'); expect(seen[0].callsite).toBeUndefined();
    await c.workflows.invokeVersion('wf_shared',3,{}, {callsite:ID+'\n'}); expect(seen.at(-1)!.callsite).toBeUndefined();
    const count=seen.length;
    for(const bad of [0,-1,1.5,NaN,Infinity,2147483648]) await expect(c.workflows.invokeVersion('wf_shared',bad)).rejects.toThrow();
    expect(seen).toHaveLength(count);
  });
  it('all artifact invocation branches carry explicit IDs while reads and polls do not',async()=>{
    const c=client();
    await c.workflows.execute('wf_shared',{}, {callsite:ID}); await c.workflows.invoke('wf_shared',{}, {callsite:ID});
    await c.workflows.invokeVersion('wf_shared',3,{}, {callsite:ID});
    await c.agents.chat('ag_shared','hello',{callsite:ID}); await c.chatflows.startSession('cf_shared',{}, {callsite:ID});
    await c.chatflows.builder.test('cf_shared',{}, {callsite:ID});
    expect(seen).toHaveLength(6); expect(seen.every(x=>x.callsite===ID)).toBe(true);
    await c.chatflows.getSession('session'); expect(seen.at(-1)!.callsite).toBeUndefined();
    await c.chatflows.builder.test('cf_shared',{}, {callsite:'invalid'}); expect(seen.at(-1)!.callsite).toBeUndefined();
  });
  it('refuses a real302 before credentials or callsite can reach another listener',async()=>{
    let forwarded=0; const canary=http.createServer((_req,res)=>{forwarded++;res.end('{}');});
    await new Promise<void>(resolve=>canary.listen(0,'127.0.0.1',resolve));
    try { redirect=`http://127.0.0.1:${(canary.address() as AddressInfo).port}/canary`;
      await expect(client().workflows.invokeVersion('wf_shared',3,{}, {callsite:ID})).rejects.toThrow();
      expect(seen[0].callsite).toBe(ID); expect(forwarded).toBe(0);
    } finally { await new Promise<void>(resolve=>canary.close(()=>resolve())); }
  });
});
