/* Local integration server only. Not a replacement for CloudBase deployment. */
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {createService,passwordHash}=require('../functions/classroom/service');
const {memoryRepository}=require('./memory.cjs');
const site=path.resolve(__dirname,'../..'),state=path.resolve(__dirname,'../.local');
const port=Number(process.env.QO_DEV_PORT || 8765),origin='http://localhost:'+port;
(async()=>{
 await fs.mkdir(state,{recursive:true,mode:0o700});
 const password=crypto.randomBytes(24).toString('base64url');
 const service=createService(memoryRepository(path.join(state,'records.json')),{teacherPasswordHash:await passwordHash(password)});
 const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.gif':'image/gif','.jpg':'image/jpeg','.json':'application/json'};
 http.createServer(async(req,res)=>{
  try{
   if(req.headers.host!=='localhost:'+port && req.headers.host!=='127.0.0.1:'+port){res.writeHead(403);return res.end();}
   res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
   const url=new URL(req.url,origin);
   if(url.pathname==='/__classroom_rpc' && req.method==='POST'){
    if(req.headers.origin!==origin && req.headers.origin!=='http://127.0.0.1:'+port){res.writeHead(403);return res.end();}
    let body='';for await(const chunk of req){body+=chunk;if(body.length>16000){res.writeHead(413);return res.end();}}
    let event;try{event=JSON.parse(body);}catch{res.writeHead(400);return res.end();}
    if(event.action==='dev.teacherLogin')event={action:'teacher.login',data:{password}};
    const result=await service.handle(event,'local-'+req.socket.remoteAddress);
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify(result));
   }
   let target;
   if(url.pathname==='/classroom/config.js'){
    res.writeHead(200,{'Content-Type':types['.js'],'Cache-Control':'no-store'});
    return res.end('window.QO_CLASSROOM_CONFIG={dev:true,devEndpoint:"/__classroom_rpc"};');
   }
   if(url.pathname==='/lecture07.html')target=path.join(site,'../quantum-slides/lecture07.html');
   else if(url.pathname.startsWith('/assets/classroom/'))target=path.join(site,'../quantum-slides',url.pathname);
   else if(url.pathname==='/')target=path.join(site,'classroom/teacher.html');
   else if(url.pathname.startsWith('/classroom/')){
    const candidate=path.resolve(site,'.'+decodeURIComponent(url.pathname));
    if(candidate.startsWith(path.join(site,'classroom')+path.sep))target=candidate;
   }
   // Never expose backend files, the private state, source maps, or directories.
   if(!target || !['.html','.js','.css','.svg','.png','.woff','.woff2','.gif','.jpg'].includes(path.extname(target))){res.writeHead(404);return res.end('Not found');}
   if(!(await fs.stat(target)).isFile()){res.writeHead(404);return res.end('Not found');}
   res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(await fs.readFile(target));
  }catch{res.writeHead(404);res.end('Not found');}
 }).listen(port,'127.0.0.1',()=>console.log('Local classroom integration: '+origin+'/lecture07.html#/l07-q1'));
})();
