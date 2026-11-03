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
 roomCode=(await ok('teacher.create',{title:'第八讲联调（虚拟学生）',lectureId:'l08'})).code;
 const marker=Date.now().toString(36).toUpperCase(),pupil=await ok('student.login',{name:'第八讲联调',studentNumber:'TEST08'+marker},undefined);
 assert.equal((await ok('room.public',{},undefined)).question.id,'l08-q1');
 assert.equal((await request('teacher.open',{questionId:'l07-q1'},teacher)).error.code,'QUESTION');
 for(let i=1;i<=5;i++){
  const id='l08-q'+i;await ok('teacher.open',{questionId:id});
  let state=await ok('student.state',{},pupil.token),roundId=state.round.id;
  assert.equal(state.question.id,id);assert.deepEqual(state.question,require('../functions/classroom/questions.json').find(r=>r.question.id===id).question);assert.equal(state.round.correct,undefined);
  if(i<3)assert.equal((await request('student.submit',{roundId,choice:'D'},pupil.token)).error.code,'INPUT');
  await ok('student.submit',{roundId,choice:'A'},pupil.token);await ok('student.submit',{roundId,choice:i===4?'A':'B'},pupil.token);
  assert.equal((await ok('teacher.state',{questionId:id})).round.total,1);
  await ok('teacher.reveal',{questionId:id,roundId});state=await ok('student.state',{},pupil.token);
  assert.equal(state.round.correct,i===4?'A':'B');
  assert.equal((await request('student.submit',{roundId,choice:'A'},pupil.token)).error.code,'CLOSED');
  const comparison=await ok('teacher.comparison',{questionId:id,roundId});assert.equal(comparison.options.length,i<3?3:4);
  checks.push({id,options:comparison.options,answer:state.round.correct,total:state.round.total});
 }
 const history=await ok('student.history',{},pupil.token);assert.equal(history.questions.length,5);assert(history.questions.every(q=>q.question.id.startsWith('l08-')));
 const report={status:'passed',qaRoom:roomCode,checks,finishedAt:new Date().toISOString(),realPhoneNetwork:'not tested',tokensSaved:false};
 await fs.writeFile(path.join(root,'.local/cloud-smoke-lecture08.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify(report));process.exit(0);
})().catch(error=>{console.error('Lecture 8 cloud smoke failed at '+stage+':',error.code||error.message);process.exit(1);});
