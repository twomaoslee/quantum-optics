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

 roomCode=(await ok('teacher.create',{title:'第十讲上线测试（虚拟学生，独立场次）',lectureId:'l10'})).code;
 const qaRoom=roomCode,marker=Date.now().toString(36).toUpperCase();
 const pupil=await ok('student.login',{name:'第十讲测试甲',studentNumber:'TEST10A'+marker},null);
 const second=await ok('student.login',{name:'第十讲测试乙',studentNumber:'TEST10B'+marker},null);
 assert.equal((await ok('room.public',{},null)).question.id,'l10-q1');
 assert.equal((await request('teacher.open',{questionId:'l08-q1'},teacher)).error.code,'QUESTION');
 const bank=require('../functions/classroom/questions.json').filter(x=>x.question.id.startsWith('l10-'));
 for(const record of bank){
  const id=record.question.id;await ok('teacher.open',{questionId:id,feedbackMode:'discussion'});
  let st=await ok('student.state',{},pupil.token),roundId=st.round.id;
  assert.deepEqual(st.question,record.question);assert.equal(st.round.correct,undefined);
  await ok('student.submit',{roundId,choice:record.answer.correct},pupil.token);
  const wrong=record.question.options.find(x=>x[0]!==record.answer.correct)[0];
  await ok('student.submit',{roundId,choice:wrong},second.token);
  await ok('student.submit',{roundId,choice:record.answer.correct},pupil.token);
  st=await ok('student.state',{},pupil.token);assert.equal(st.round.correct,undefined);
  assert(st.own.reasonOptions.length>=4);await ok('student.reason',{roundId,choice:record.answer.correct,reasonId:st.own.reasonOptions[0].id,comment:''},pupil.token);
  assert.equal((await ok('teacher.state',{questionId:id})).round.total,2);
  await ok('teacher.reveal',{questionId:id,roundId});st=await ok('student.state',{},pupil.token);
  assert.equal(st.round.correct,record.answer.correct);assert.equal(st.round.total,2);
  assert.equal((await request('student.submit',{roundId,choice:wrong},pupil.token)).error.code,'CLOSED');
  const comparison=await ok('teacher.comparison',{questionId:id,roundId});assert.equal(comparison.options.length,record.question.options.length);
  checks.push({id,options:comparison.options,correct:st.round.correct,total:st.round.total,sourceMatches:true});
 }
 assert.equal((await ok('student.history',{},pupil.token)).questions.length,9);
 const exported=await ok('teacher.export');assert.equal(exported.rows.length,18);assert(exported.rows.every(r=>r.studentNumber.startsWith('TEST10')));
 // A second standalone room tests immediate self-check feedback, without changing the public classroom anchor.
 roomCode=(await ok('teacher.create',{title:'第十讲自查测试（虚拟学生，独立场次）',lectureId:'l10'})).code;
 const selfCheckRoom=roomCode,person=await ok('student.login',{name:'第十讲自查测试',studentNumber:'TEST10S'+marker},null);
 await ok('teacher.open',{questionId:'l10-q9',feedbackMode:'self-check'});
 let st=await ok('student.state',{},person.token),rid=st.round.id;
 await ok('student.submit',{roundId:rid,choice:'B'},person.token);st=await ok('student.state',{},person.token);assert.equal(st.round.correct,'B');
 assert.equal((await request('student.submit',{roundId:rid,choice:'A'},person.token)).ok,false);
 await ok('teacher.close',{questionId:'l10-q9',roundId:rid});
 const report={status:'passed',qaRoom,selfCheckRoom,checks,selfCheck:'immediate feedback and locked answer passed',exportRows:18,finishedAt:new Date().toISOString(),realPhoneNetwork:'not tested',tokensSaved:false};
 await fs.writeFile(path.join(root,'.local/cloud-smoke-lecture10.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({status:'passed',questions:checks.length,exportRows:18,selfCheck:report.selfCheck}));process.exit(0);
})().catch(error=>{console.error('Lecture 10 cloud smoke failed at '+stage+':',error.code||error.message);process.exit(1);});
