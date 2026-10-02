import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { SwfteClient } from '../../src/client';
import { _resetCallsiteState } from '../../src/callsite';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createRequire } from 'node:module';

const INPUT = { label: 'workflow-wire', nested: { enabled: true, values: [1, 'two', null] } };
let bodies: Map<number, unknown>;
const ID = 'cs_' + 'a'.repeat(24);
let server: http.Server; let base: string; let live: number; let redirect: string | undefined;
let seen: Array<{path:string; method:string; callsite:string|undefined; workspace:string|undefined}>;
let executions: Map<string,number|string>;
let published: Map<string,'PUBLISHED'|'DEPRECATED'|'DRAFT'>;
beforeEach(async () => {
  vi.stubEnv('SWFTE_CALLSITE_STACK',''); live=3; redirect=undefined; seen=[]; bodies=new Map(); executions=new Map();
  published=new Map(['3','1.0.7','1.0.7-rc.2+build.09','1.0.7+'+'a'.repeat(122)].map(label=>[label,'PUBLISHED'] as const));
  server=http.createServer(async (req,res) => {
    const chunks: Buffer[]=[]; for await(const part of req) chunks.push(Buffer.from(part));
    const raw=Buffer.concat(chunks).toString('utf8'); bodies.set(seen.length,raw ? JSON.parse(raw) : undefined);
    const path=req.url ?? ''; seen.push({path,method:req.method ?? '',callsite:req.headers['x-swfte-callsite'] as string|undefined,workspace:req.headers['x-workspace-id'] as string|undefined});
    if (redirect) { res.writeHead(302,{Location:redirect}); res.end(); return; }
    res.setHeader('Content-Type','application/json');
    const segment=/\/versions\/([^/]+)\/invoke/u.exec(path)?.[1];
    const decoded=segment===undefined?undefined:decodeURIComponent(segment);
    if(req.headers['x-workspace-id']==='B' || (decoded!==undefined && !['PUBLISHED','DEPRECATED'].includes(published.get(decoded) ?? ''))) { res.writeHead(404); res.end(JSON.stringify({error:'VERSION_NOT_PUBLISHED'})); return; }
    if(path.endsWith('/status')) {
      const executionId=path.split('/').at(-2)!; const version=executions.get(executionId)!;
      res.end(JSON.stringify({execution:{executionId,status:'SUCCEEDED',workflowVersion:version,outputData:{marker:`snapshot-${version}`}}})); return;
    }
    const version=decoded===undefined?live:decoded;
    const executionId=`execution_${executions.size}`; executions.set(executionId,version);
    res.end(JSON.stringify({executionId,workflowId:'wf_shared',status:'PENDING',workflowVersion:version,sessionId:'session',response:'ok',runId:'run'}));
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve)); base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(async()=>{ vi.unstubAllEnvs(); await new Promise<void>(resolve=>server.close(()=>resolve())); });
const client=(workspaceId='A')=>new SwfteClient({apiKey:'unit-test-key',apiBaseUrl:base,baseUrl:base,workspaceId,maxRetries:1});

describe('actual version-pinned runtime and attribution',()=>{

  it('preserves semantic pins and encoded build identity across invoke and wait without live fallback',async()=>{
    const c=client(); live=4;
    const invocation=await c.workflows.invokeVersion('wf_shared','1.0.7');
    expect(invocation).toMatchObject({workflowVersion:'1.0.7'});
    expect(seen[0]).toMatchObject({path:'/v2/workflows/wf_shared/versions/1.0.7/invoke',callsite:undefined});
    const pinned=await c.workflows.invokeVersionAndWait('wf_shared','1.0.7',{}, {callsite:ID,pollIntervalMs:1});
    expect(pinned.outputs).toEqual({marker:'snapshot-1.0.7'});
    const build='1.0.7-rc.2+build.09';
    const prerelease=await c.workflows.invokeVersionAndWait('wf_shared',build,{}, {callsite:ID,pollIntervalMs:1});
    expect(prerelease.outputs).toEqual({marker:'snapshot-'+build});
    expect(seen.filter(row=>row.path.endsWith('/invoke')).at(-1)).toMatchObject({
      path:'/v2/workflows/wf_shared/versions/1.0.7-rc.2%2Bbuild.09/invoke',callsite:ID,
    });
    const boundary='1.0.7+'+'a'.repeat(122); expect(boundary).toHaveLength(128);
    await c.workflows.invokeVersion('wf_shared',boundary);
    expect(seen.at(-1)!.path).toBe('/v2/workflows/wf_shared/versions/1.0.7%2B'+'a'.repeat(122)+'/invoke');
    await expect(c.workflows.invokeVersion('wf_shared','9.9.9')).rejects.toMatchObject({status:404});
    await expect(client('B').workflows.invokeVersion('wf_shared','1.0.7')).rejects.toMatchObject({status:404});
    expect(seen.filter(row=>row.path.endsWith('/status')).every(row=>row.callsite===undefined)).toBe(true);
    expect(seen.filter(row=>row.path==='/v2/workflows/wf_shared/invoke')).toHaveLength(0);
  });
  it('rejects unsafe raw version segments before either invoke or wait reaches a listener',async()=>{
    const c=client();
    for(const bad of ['', '1.0.7/', '1.0.7?x=1', '1.0.7#x', '../1.0.7',
      '.', '..', '1.0.7%2Fextra', ' 1.0.7', '1.0.7 ', '1.0.7\n', '\n1.0.7', '1.0.7\r', '1.0.7\0',
      '١.0.7', '---._+:@', 'v3\\extra', '1.0.7\t', '1.0.7+'+'a'.repeat(123)]) {
      await expect(c.workflows.invokeVersion('wf_shared',bad,{}, {callsite:ID})).rejects.toThrow();
      await expect(c.workflows.invokeVersionAndWait('wf_shared',bad,{}, {callsite:ID,pollIntervalMs:1})).rejects.toThrow();
      expect(seen).toHaveLength(0);
    }
  });
  it('requires an exact published record for every path-safe legacy identity across direct and wait branches',async()=>{
    const c=client(); live=4; published.delete('3');
    const labels=['v3','v4','custom@v3:release','latest','5','01.0.7','1.0','1.0.7+','1.0.7-','3'];
    for(const label of labels) {
      const route='/v2/workflows/wf_shared/versions/'+encodeURIComponent(label)+'/invoke';
      const oldExecutions=executions.size; const before=seen.length;
      await expect(c.workflows.invokeVersion('wf_shared',label,{}, {callsite:ID})).rejects.toMatchObject({status:404});
      await expect(c.workflows.invokeVersionAndWait('wf_shared',label,{}, {callsite:ID,pollIntervalMs:1})).rejects.toMatchObject({status:404});
      expect(executions.size).toBe(oldExecutions);
      expect(seen.slice(before)).toEqual([
        {path:route,method:'POST',callsite:ID,workspace:'A'},
        {path:route,method:'POST',callsite:ID,workspace:'A'},
      ]);
      published.set(label,'PUBLISHED');
      const direct=await c.workflows.invokeVersion('wf_shared',label);
      expect(direct).toMatchObject({workflowVersion:label});
      expect(seen.at(-1)).toMatchObject({method:'POST',path:route,callsite:undefined});
      await c.workflows.invokeVersion('wf_shared',label,{}, {callsite:ID});
      expect(seen.at(-1)).toMatchObject({method:'POST',path:route,callsite:ID});
      expect((await c.workflows.invokeVersionAndWait('wf_shared',label)).outputs).toEqual({marker:'snapshot-'+label});
      expect(seen.at(-2)).toMatchObject({method:'POST',path:route,callsite:undefined});
      expect((await c.workflows.invokeVersionAndWait('wf_shared',label,{}, {callsite:ID,pollIntervalMs:1})).outputs).toEqual({marker:'snapshot-'+label});
      expect(seen.at(-2)).toMatchObject({method:'POST',path:route,callsite:ID});
    }
    published.set('draft-v3','DRAFT');
    const before=executions.size;
    for(const label of ['draft-v3','unknown-v3']) {
      await expect(c.workflows.invokeVersionAndWait('wf_shared',label,{}, {pollIntervalMs:1})).rejects.toMatchObject({status:404});
    }
    await expect(client('B').workflows.invokeVersion('wf_shared','v3')).rejects.toMatchObject({status:404});
    expect(executions.size).toBe(before);
    published.set('retired@v3:release','DEPRECATED');
    expect((await c.workflows.invokeVersionAndWait('wf_shared','retired@v3:release',{}, {pollIntervalMs:1})).outputs).toEqual({marker:'snapshot-retired@v3:release'});
    expect(seen.filter(row=>row.path.endsWith('/status')).every(row=>row.method==='GET' && row.callsite===undefined)).toBe(true);
    expect(seen.every(row=>row.path!=='/v2/workflows/wf_shared/invoke')).toBe(true);
  });
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
    const c=client(); await c.workflows.invokeVersion('wf@shared:release',3); expect(seen[0].path).toContain('wf%40shared%3Arelease'); expect(seen[0].callsite).toBeUndefined();
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
  it('captures pinned numeric and opaque caller lines plus builder only under non-production opt-in',async()=>{
    const dir=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'swfte-pin-callers-')));
    const caller=path.join(dir,'caller.cjs'),callers=path.join(dir,'callers.json');
    const idA='cs_'+'a'.repeat(24),idB='cs_'+'b'.repeat(24);
    const code=[
      'exports.directA=(c,v,o={})=>{',
      " return c.workflows.invokeVersion('wf_shared',v,{},o); // @directA",
      '};',
      'exports.directB=(c,v,o={})=>{',
      " return c.workflows.invokeVersion('wf_shared',v,{},o); // @directB",
      '};',
      'exports.waitA=(c,v,o={})=>{',
      " return c.workflows.invokeVersionAndWait('wf_shared',v,{}, {pollIntervalMs:1,...o}); // @waitA",
      '};',
      'exports.waitB=(c,v,o={})=>{',
      " return c.workflows.invokeVersionAndWait('wf_shared',v,{}, {pollIntervalMs:1,...o}); // @waitB",
      '};',
      'exports.builderA=(c,o={})=>{',
      " return c.chatflows.builder.test('cf_shared',{},o); // @builderA",
      '};',
      'exports.builderB=(c,o={})=>{',
      " return c.chatflows.builder.test('cf_shared',{},o); // @builderB",
      '};',
    ];
    const entries:Record<string,string>={};
    code.forEach((line,index)=>{const name=/\/\/ @(\w+)$/u.exec(line)?.[1];if(name) entries['caller.cjs:'+(index+1)]=name.endsWith('A')?idA:idB;});
    fs.writeFileSync(caller,code.join('\n')+'\n');
    fs.writeFileSync(callers,JSON.stringify({version:1,root:dir,entries}));
    type Caller=(c:SwfteClient,v:number|string,o?:{callsite?:string})=>Promise<unknown>;
    const nativeRequire=createRequire(__filename);
    const module=nativeRequire(caller) as Record<string,Caller>;
    const c=client();published.set('v3','PUBLISHED');_resetCallsiteState();
    vi.stubEnv('NODE_ENV','test');vi.stubEnv('SWFTE_CODEMAP_CALLERS',callers);
    const invoke=async(explicit?:string)=>{
      for(const pin of [3,'v3']) {
        const options=explicit===undefined?undefined:{callsite:explicit};
        await module.directA(c,pin,options);await module.directB(c,pin,options);
        await module.waitA(c,pin,options);await module.waitB(c,pin,options);
      }
      await (module.builderA as unknown as (c:SwfteClient,o?:{callsite?:string})=>Promise<unknown>)(c,explicit===undefined?undefined:{callsite:explicit});
      await (module.builderB as unknown as (c:SwfteClient,o?:{callsite?:string})=>Promise<unknown>)(c,explicit===undefined?undefined:{callsite:explicit});
    };
    const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
    try {
      await invoke();expect(seen.every(row=>row.callsite===undefined)).toBe(true);
      seen.length=0;vi.stubEnv('SWFTE_CALLSITE_STACK','1');
      await invoke();
      expect(seen.filter(row=>row.method==='POST').map(row=>row.callsite)).toEqual([idA,idB,idA,idB,idA,idB,idA,idB,idA,idB]);
      expect(seen.filter(row=>row.path.endsWith('/status')).every(row=>row.method==='GET' && row.callsite===undefined)).toBe(true);
      seen.length=0;vi.stubEnv('NODE_ENV','production');
      await invoke();expect(seen.every(row=>row.callsite===undefined)).toBe(true);expect(warn).toHaveBeenCalledTimes(1);
      seen.length=0;await invoke(ID);
      expect(seen.filter(row=>row.method==='POST').every(row=>row.callsite===ID)).toBe(true);
      expect(seen.filter(row=>row.method==='GET').every(row=>row.callsite===undefined)).toBe(true);
    } finally {warn.mockRestore();_resetCallsiteState();delete nativeRequire.cache[caller];fs.rmSync(dir,{recursive:true,force:true});}
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

describe('workflow ID route boundary',()=>{

  it('confines every workflow invocation identifier before transport and preserves legal punctuation',async()=>{
    const c=client();
    const entries=(wf:string)=>[
      ()=>c.workflows.execute(wf,INPUT),()=>c.workflows.execute(wf,INPUT,true),
      ()=>c.workflows.execute(wf,INPUT, {skipValidation:true,callsite:ID}),
      ()=>c.workflows.invoke(wf,INPUT),()=>c.workflows.invoke(wf,INPUT, {callsite:ID}),
      ()=>c.workflows.invokeAndWait(wf,INPUT, {pollIntervalMs:1,callsite:ID}),
      ()=>c.workflows.invokeVersion(wf,3,INPUT),()=>c.workflows.invokeVersion(wf,'1.0.7',INPUT, {callsite:ID}),
      ()=>c.workflows.invokeVersionAndWait(wf,3,INPUT, {pollIntervalMs:1}),
      ()=>c.workflows.invokeVersionAndWait(wf,'1.0.7',INPUT, {pollIntervalMs:1,callsite:ID})];
    for(const wf of ['', '.', '..','../other','a/b','a\\b','a?x=1','a#x','a%2fother',' a','a ','a\n','a\r','a\0','é','a+b','a'.repeat(129),null,42,{}]) {
      for(const run of entries(wf as string)) await expect(run()).rejects.toThrow();
      expect(seen).toHaveLength(0); expect(executions.size).toBe(0);
    }
    for(const wf of ['wf_shared','@:-','...','wf@release:v1','a'.repeat(128)]) {
      const first=seen.length;
      for(const run of entries(wf)) await run();
      const rows=seen.slice(first); const prefix='/v2/workflows/'+encodeURIComponent(wf);
      rows.forEach((row,index)=>expect(bodies.get(first+index)).toEqual(row.method==='POST'?INPUT:undefined));
      expect(rows.filter(r=>r.method==='POST').map(r=>r.path)).toEqual([
        prefix+'/execute',prefix+'/execute?skipValidation=true',prefix+'/execute?skipValidation=true',
        prefix+'/invoke',prefix+'/invoke',prefix+'/invoke',prefix+'/versions/3/invoke',
        prefix+'/versions/1.0.7/invoke',prefix+'/versions/3/invoke',prefix+'/versions/1.0.7/invoke']);
      expect(rows.filter(r=>r.method==='POST').map(r=>r.callsite)).toEqual([undefined,undefined,ID,undefined,ID,ID,undefined,ID,undefined,ID]);
      expect(rows.filter(r=>r.method==='GET').every(r=>r.callsite===undefined)).toBe(true);
    }
  });

});
