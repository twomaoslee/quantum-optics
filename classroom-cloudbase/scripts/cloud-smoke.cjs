/* Actual cloud integration checks. Uses fictional users in a labelled QA room.
 * Run only after environment, DB permissions, and classroom function are ready.
 * Never prints teacher passwords, provider keys, or session tokens.
 */
const fs=require('node:fs/promises'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const cloudbase=require('@cloudbase/js-sdk');
const root=path.resolve(__dirname,'..');
let stage='initialization';
(async()=>{
 const context={window:{}};vm.runInNewContext(await fs.readFile(path.resolve(root,'../classroom/config.js'),'utf8'),context);
 const config=context.window.QO_CLASSROOM_CONFIG;
 assert(config?.envId&&config.publishableKey,'Configure the real environment and public key first.');
 const app=cloudbase.init({env:config.envId,region:config.region,accessKey:config.publishableKey,timeout:30000});
 stage='anonymous SDK login';const signed=await app.auth.signInAnonymously();if(signed.error)throw new Error('Anonymous SDK connection failed: '+signed.error.code);
 const teacherPassword=JSON.parse(await fs.readFile(path.join(root,'.local/teacher-login.json'),'utf8')).password;
 let roomCode,teacher;const checks=[];
 async function request(action,data={},token){
  stage=action;
  let response;
  if(config.gatewayUrl){
   const {accessToken}=await app.auth.getAccessToken();
   const http=await fetch(config.gatewayUrl,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+accessToken},body:JSON.stringify({action,data,token,roomCode}),signal:AbortSignal.timeout(30000)});
   assert(http.ok,'Gateway HTTP '+http.status);response={result:await http.json()};
  }else response=await app.callFunction({name:config.functionName,data:{action,data,token,roomCode}});
  assert(response.result&&typeof response.result.ok==='boolean','Function did not return the classroom protocol.');return response.result;
 }
 async function ok(action,data={},token=teacher){const result=await request(action,data,token);assert(result.ok,action+': '+JSON.stringify(result.error));return result.data;}
 const login=await ok('teacher.login',{password:teacherPassword},undefined);teacher=login.token;
 roomCode=(await ok('teacher.create',{title:'部署联调（虚拟学生）'})).code;checks.push('SDK anonymous connection and teacher login');
 const marker=Date.now().toString(36).toUpperCase();
 const pupils=[];for(const [index,name]of ['部署测试甲','部署测试乙'].entries())pupils.push(await ok('student.login',{name,studentNumber:'TEST'+marker+index},undefined));
 assert.equal((await request('teacher.export',{},pupils[0].token)).error.code,'FORBIDDEN');checks.push('student cannot export teacher data');
 await ok('teacher.open',{seconds:60});let state=await ok('teacher.state'),roundId=state.round.id;
 assert.equal((await ok('room.public',{},undefined)).round.counts,undefined);
 await ok('student.submit',{roundId,choice:'A'},pupils[0].token);
 await ok('student.submit',{roundId,choice:'A'},pupils[1].token);
 await ok('student.submit',{roundId,choice:'C'},pupils[0].token);
 state=await ok('teacher.state');assert.equal(state.round.total,2);assert.deepEqual(state.round.counts,{A:1,B:0,C:1,D:0});
 assert.equal((await ok('student.state',{},pupils[0].token)).own.choice,'C');checks.push('two student records, updates do not double-count, own answer restore');
 await ok('teacher.reveal',{roundId});const published=await ok('room.public',{},undefined);assert.equal(published.round.total,2);
 assert.equal((await request('student.submit',{roundId,choice:'B'},pupils[0].token)).error.code,'CLOSED');
 const exported=await ok('teacher.export');assert.equal(exported.rows.length,2);assert(exported.rows.every(row=>row.studentNumber.startsWith('TEST')));checks.push('manual reveal, closed-round rejection, named export');
 await ok('teacher.open',{seconds:15});state=await ok('teacher.state');roundId=state.round.id;assert.equal(state.round.number,2);assert.equal(state.round.total,0);
 await new Promise(resolve=>setTimeout(resolve,16000));
 assert.equal((await request('student.submit',{roundId,choice:'C'},pupils[0].token)).error.code,'CLOSED');
 state=await ok('student.state',{},pupils[0].token);assert.equal(state.round.revealed,false);assert.equal(state.round.counts,undefined);
 checks.push('server deadline without presenter timer; no automatic result reveal');
 const again=await ok('student.login',pupils[0].profile,undefined);assert.deepEqual(again.profile,pupils[0].profile);
 await ok('logout',{},pupils[0].token);assert.equal((await request('me',{},pupils[0].token)).error.code,'AUTH');checks.push('identity across new sessions and server-side logout');
 // Both the SDK Document interface and any direct PG interface must stay private.
 const isDenied=error=>/EXCEED_AUTHORITY|PERMISSION|FORBIDDEN|DENIED|NO_ACCESS|UNAUTHORIZED|NOT_AUTHORIZED|42501|ACL/i.test(JSON.stringify({code:error?.code,message:error?.message,errMsg:error?.errMsg}));
 let deniedRead=false;try{const result=await app.database().collection('qo_classroom').limit(1).get();deniedRead=isDenied(result.error||result);}catch(error){deniedRead=isDenied(error);}
 assert(deniedRead,'SECURITY: anonymous Document read was not denied.');
 let deniedWrite=false;try{const result=await app.database().collection('qo_classroom').doc('security-probe-'+marker).set({kind:'probe'});deniedWrite=isDenied(result.error||result);}catch(error){deniedWrite=isDenied(error);}
 assert(deniedWrite,'SECURITY: anonymous Document write was not denied.');checks.push('anonymous direct Document read and write denied');
 const finalExport=await ok('teacher.export');assert.equal(finalExport.rounds.length,2);assert.equal(finalExport.rows.length,2);
 const report={status:'passed',environment:config.envId,region:config.region,qaRoom:roomCode,checks,finishedAt:new Date().toISOString(),realPhoneNetwork:'not yet tested',tokensSaved:false};
 await fs.writeFile(path.join(root,'.local/cloud-smoke.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({status:'passed',checks:checks.length,qaRoom:roomCode,realPhoneNetwork:report.realPhoneNetwork}));process.exit(0);
})().catch(error=>{console.error('Cloud smoke failed at '+stage+':',error.code||error.message,error.code==='ERR_ASSERTION'?error.message:'');process.exit(1);});
