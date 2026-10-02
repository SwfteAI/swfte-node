import assert from 'node:assert/strict';
import http from 'node:http';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {createRequire} from 'node:module';
import {it} from 'vitest';
import * as SDK from '../../src/index';

async function exercise(SDK: typeof import('../../src/index')) {
 const seen: Array<{method?: string;path?: string;header?: string;auth?: string;body: unknown}>=[]; const forwarded: typeof seen=[]; let redirect=0;
 const id='cs_'+'a'.repeat(24), explicit='cs_'+'c'.repeat(24);
 const receive=async(req: http.IncomingMessage,res: http.ServerResponse,rows: typeof seen)=>{
  let raw='';for await(const part of req)raw+=part;
  rows.push({method:req.method,path:req.url,header:req.headers['x-swfte-callsite'] as string|undefined,auth:req.headers.authorization,body:raw?JSON.parse(raw):null});
  res.setHeader('Content-Type','application/json');
  if(redirect && rows===seen){res.writeHead(redirect,{Location:canaryBase+'/capture'});res.end();return;}
  if(req.url!.includes('missing') || req.headers['x-workspace-id']==='B'){res.writeHead(404);res.end('{}');return;}
  if(req.url!.includes('native-unavailable')){res.writeHead(501);res.end('{}');return;}
  res.end(JSON.stringify({response:'ok',sessionId:'cfs_'+'a'.repeat(32),runId:'fixture-only'}));
 };
 const server=http.createServer((q,s)=>void receive(q,s,seen));
 const canary=http.createServer((q,s)=>void receive(q,s,forwarded));
 await new Promise<void>(resolve=>canary.listen(0,'127.0.0.1',resolve));
 const canaryBase='http://127.0.0.1:'+(canary.address() as import('node:net').AddressInfo).port;
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+(server.address() as import('node:net').AddressInfo).port;
 const c=new SDK.SwfteClient({apiKey:'unit-only-key',apiBaseUrl:base,baseUrl:base,workspaceId:'A',maxRetries:1});
 const saved: Record<string,string|undefined>={};for(const key of ['SWFTE_CALLSITE_STACK','SWFTE_CODEMAP_CALLERS','NODE_ENV'])saved[key]=process.env[key];
 const dir=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'nonworkflow-callers-')));
 const entries=(value: unknown,options?: {callsite?: string})=>[
  ()=>c.agents.chat(value as string,'hello',{userId:'legacy user',conversationId:'conversation',...options}),
  ()=>c.chatflows.startSession(value as string,{channel:'WEB',metadata:{key:'value'}},options),
  ()=>c.chatflows.builder.test(value as string,{input:'value'},options)];
 const readers=(value: unknown)=>[()=>c.chatflows.getSession(value as string),()=>c.chatflows.listSessions(value as string),()=>c.chatflows.stats(value as string)];
 try {
  process.env.SWFTE_CALLSITE_STACK='';
  for(const value of ['', '.', '..','a\n','a\r','a\0','a\u007f','\ud800','\udc00',null,42,{}]) {
   for(const run of [...entries(value,{callsite:id}),...readers(value)])await assert.rejects(async()=>run());
   assert.equal(seen.length,0);
  }
  for(const value of ['legacy /\\?#%2e: @é😀','...','@:-','system-agent','avima-runtime-agent','a'.repeat(256)]) {
   for(const options of [undefined,{callsite:id},{callsite:'invalid'}]){
    const first=seen.length;for(const run of entries(value,options))await run();
    const component=encodeURIComponent(value as string),header=options?.callsite===id?id:undefined;
    assert.deepEqual(seen.slice(first).map(r=>[r.method,r.path,r.header]),[
     ['POST','/v1/agents/'+component+'/chat/legacy%20user',header],
     ['POST','/v2/chatflows/'+component+'/sessions',header],['POST','/v2/chatflows/builder/'+component+'/test',header]]);
    assert.deepEqual(seen[first].body,{message:'hello',conversationId:'conversation'});
    assert.deepEqual(seen[first+1].body,{channel:'WEB',metadata:{key:'value'}});
    assert.deepEqual(seen[first+2].body,{input:'value'});
   }
  }
  for(const userId of [undefined,null,'',false,0]) {await c.agents.chat('agent','hello',{userId: userId as string});assert.equal(seen.at(-1)!.path,'/v1/agents/agent/chat/sdk-user');}
  for(const userId of ['.','..','a\n','\ud800',42,{}]){const count=seen.length;await assert.rejects(async()=>c.agents.chat('agent','hello',{userId: userId as string}));assert.equal(seen.length,count);}
  await c.agents.chat('agent','hello',{userId:'opaque /\\?#%é😀'});assert.equal(seen.at(-1)!.path,'/v1/agents/agent/chat/'+encodeURIComponent('opaque /\\?#%é😀'));
  for(const value of ['cfs_'+'a'.repeat(32),'avima-session-cfs_'+'b'.repeat(32),'legacy session /%é']){
   const first=seen.length;for(const run of readers(value))await run();assert(seen.slice(first).every(r=>r.header===undefined && r.method==='GET'));
   assert.deepEqual(seen.slice(first).map(r=>[r.method,r.path,r.header,r.body]),[
    ['GET','/v2/chatflows/sessions/'+encodeURIComponent(value),undefined,null],
    ['GET','/v2/chatflows/'+encodeURIComponent(value)+'/sessions',undefined,null],
    ['GET','/v2/chatflows/'+encodeURIComponent(value)+'/stats',undefined,null]]);
   const paged=seen.length;await c.chatflows.listSessions(value as string,{page:2,size:7,status:'IN PROGRESS'});
   assert.deepEqual(seen.slice(paged).map(r=>[r.method,r.path,r.header,r.body]),[['GET','/v2/chatflows/'+encodeURIComponent(value)+'/sessions?page=2&size=7&status=IN+PROGRESS',undefined,null]]);
  }
  for(const params of [undefined,null,{}]){const fallback=seen.length;await c.chatflows.startSession('flow',params as never);await c.chatflows.builder.test('flow',params as never);assert.deepEqual(seen.slice(fallback).map(r=>r.body),[{},{}]);}
  for(const filename of ['callerA.cjs','callerB.cjs'])fs.writeFileSync(path.join(dir,filename),[
   'exports.run=async function(c,options){',
   " await c.agents.chat('agent','hello',options);",
   " await c.chatflows.startSession('flow',{},options);",
   " await c.chatflows.builder.test('flow',{},options);",'};'].join('\n'));
  const entriesMap: Record<string,string>={};for(const [filename,value] of [['callerA.cjs',id],['callerB.cjs','cs_'+'b'.repeat(24)]])for(const line of [2,3,4])entriesMap[filename+':'+line]=value;
  const map=path.join(dir,'callers.json');fs.writeFileSync(map,JSON.stringify({version:1,root:dir,entries:entriesMap}));
  process.env.SWFTE_CODEMAP_CALLERS=map;
  const localRequire=createRequire(path.join(dir,'loader.cjs'));
  const a=localRequire(path.join(dir,'callerA.cjs')),b=localRequire(path.join(dir,'callerB.cjs'));
  const callers=async(options?: {callsite?: string})=>{await a.run(c,options);await b.run(c,options);};
  let first=seen.length;await callers();assert(seen.slice(first).every(r=>r.header===undefined));
  process.env.SWFTE_CALLSITE_STACK='1';process.env.NODE_ENV='development';first=seen.length;await callers();
  assert.deepEqual(seen.slice(first).map(r=>r.header),[id,id,id,'cs_'+'b'.repeat(24),'cs_'+'b'.repeat(24),'cs_'+'b'.repeat(24)]);
  first=seen.length;await callers({callsite:explicit});assert(seen.slice(first).every(r=>r.header===explicit));
  first=seen.length;await callers({callsite:'invalid'});assert(seen.slice(first).every(r=>r.header===undefined));
  process.env.NODE_ENV='production';first=seen.length;await callers();assert(seen.slice(first).every(r=>r.header===undefined));
  first=seen.length;await callers({callsite:explicit});assert(seen.slice(first).every(r=>r.header===explicit));
  first=seen.length;for(const run of readers('cfs_read'))await run();assert(seen.slice(first).every(r=>r.header===undefined));
  for(const status of [301,302,303,307,308]){
   redirect=status;for(const run of [...entries('flow',{callsite:id}),...readers('cfs_read')])await assert.rejects(async()=>run());
   assert.equal(forwarded.length,0);
  }
  redirect=0;for(const run of entries('missing',{callsite:id}))await assert.rejects(async()=>run());
  await assert.rejects(async()=>c.chatflows.builder.test('native-unavailable',{}));
  const foreign=new SDK.SwfteClient({apiKey:'unit-only-key',apiBaseUrl:base,workspaceId:'B',maxRetries:1});
  await assert.rejects(async()=>foreign.agents.chat('agent','hello'));
  await assert.rejects(async()=>foreign.chatflows.startSession('flow'));
  await assert.rejects(async()=>foreign.chatflows.builder.test('flow',{}));
  assert(seen.length>0);return seen.length;
 } finally {
  for(const key of Object.keys(saved))if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];
  await new Promise<void>(resolve=>server.close(()=>resolve()));await new Promise<void>(resolve=>canary.close(()=>resolve()));fs.rmSync(dir,{recursive:true,force:true});
 }
}

it('nonworkflow identifiers, bodies, stack capture and redirect effects',async()=>{assert(await exercise(SDK)>0);},30000);
