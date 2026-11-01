const test=require('node:test'),assert=require('node:assert/strict');
const {createService,passwordHash,questions}=require('../functions/classroom/service');
const {memoryRepository}=require('../scripts/memory.cjs');
const bank=require('../functions/classroom/reasons.json');
const csv=require('../../classroom/export-csv');
async function fixture(){
 let time=Date.UTC(2026,10,1,4);
 const repo=memoryRepository(),service=createService(repo,{teacherPasswordHash:await passwordHash('reason-test-password'),now:()=>time});
 let room;const request=(action,data={},token,code=room)=>service.handle({action,data,token,roomCode:code},'reason-test');
 const teacher=(await request('teacher.login',{password:'reason-test-password'})).data.token;
 const ok=async(action,data={},token=teacher,code=room)=>{const r=await request(action,data,token,code);assert(r.ok,JSON.stringify(r.error));return r.data;};
 room=(await ok('teacher.create')).code;
 const student=(await ok('student.login',{name:'原因测试甲',studentNumber:'reason001'},null)).token;
 const two=(await ok('student.login',{name:'原因测试乙',studentNumber:'reason002'},null)).token;
 return {repo,ok,request,teacher,student,two,room,tick:n=>time+=n};
}
test('all 24 branches become available only after own answer; optional reason updates preserve answer timestamps and counts',async()=>{
 const f=await fixture();let total=0;
 for(const [questionId,{question}]of questions){
  assert.deepEqual(Object.keys(bank.questions[questionId]),['A','B','C','D']);
  await f.ok('teacher.open',{questionId});const r=(await f.ok('student.state',{},f.student)).round;
  for(const choice of ['A','B','C','D']){
   await f.ok('student.submit',{roundId:r.id,choice},f.student);
   const before=await f.ok('student.state',{},f.student);assert.equal(before.own.reason,null);
   assert.deepEqual(before.own.reasonOptions,bank.questions[questionId][choice]);
   assert.equal(before.question.correct,undefined);assert.equal(before.own.isCorrect,undefined);assert(!('reasons' in before.question));
   const options=before.own.reasonOptions;assert(options.length>=3&&options.length<=4);assert.equal(new Set(options.map(o=>o.id)).size,options.length);
   assert(options.every(o=>typeof o.text==='string'&&o.text.length>5));
   f.tick(100);const saved=await f.ok('student.reason',{roundId:r.id,choice,reasonId:options[0].id,text:'injected text'},f.student);
   const after=await f.ok('student.state',{},f.student);assert.deepEqual(after.own.reason,saved.reason);
   assert.equal(after.own.reason.text,options[0].text);assert.equal(after.own.reason.version,bank.version);assert.equal(after.own.updatedAt,before.own.updatedAt);
   assert.equal((await f.ok('teacher.state')).round.total,1);
   const repeat=await f.ok('student.submit',{roundId:r.id,choice},f.student);assert(repeat.ok);
   assert.deepEqual((await f.ok('student.state',{},f.student)).own.reason,saved.reason);total++;
  }
  const published=await f.ok('room.public',{},null);assert.equal(published.question.id,question.id);assert.equal(published.question.reasonOptions,undefined);assert.equal(published.round.reasons,undefined);
  await f.ok('teacher.close',{roundId:r.id});
 }
 assert.equal(total,24);
 const exported=await f.ok('teacher.export');assert.equal(exported.rows.length,6);assert(exported.rows.every(r=>r.reason.text&&r.reason.version===bank.version));
 const output=csv.create(exported);assert(output.includes('选择原因编号'));assert(output.includes('原因提交时间（北京时间）'));assert(output.includes(exported.rows[0].reason.text));
});
test('reasons cannot create an answer, select another choice, overwrite another student, or cross rounds; omission is neutral',async()=>{
 const f=await fixture();await f.ok('teacher.open');let r=(await f.ok('teacher.state')).round;
 assert.equal((await f.ok('student.state',{},f.student)).own,null);
 assert.equal((await f.request('student.reason',{roundId:r.id,choice:'C',reasonId:'C1'},f.student)).error.code,'ANSWER');
 await f.ok('student.submit',{roundId:r.id,choice:'A'},f.student);await f.ok('student.submit',{roundId:r.id,choice:'C'},f.two);
 for(const [choice,reasonId,code]of [['C','C1','CHOICE'],['A','C1','INPUT'],['A','__proto__','INPUT']])assert.equal((await f.request('student.reason',{roundId:r.id,choice,reasonId},f.student)).error.code,code);
 await f.ok('student.reason',{roundId:r.id,choice:'A',reasonId:'A1',studentNumber:'reason002'},f.student);
 assert.equal((await f.ok('student.state',{},f.two)).own.reason,null);
 await f.ok('student.submit',{roundId:r.id,choice:'B'},f.student);assert.equal((await f.ok('student.state',{},f.student)).own.reason,null);
 assert.equal((await f.request('student.reason',{roundId:r.id,choice:'A',reasonId:'A1'},f.student)).error.code,'CHOICE');
 await f.ok('student.reason',{roundId:r.id,choice:'B',reasonId:'unsure'},f.student);
 await f.ok('student.reason',{roundId:r.id,choice:'B',reasonId:null},f.student);assert.equal((await f.ok('student.state',{},f.student)).own.reason,null);
 const stats=await f.ok('teacher.reasonStats',{roundId:r.id});assert.equal(stats.total,2);assert.equal(stats.choices.find(c=>c.choice==='B').missing,1);
 assert.equal(stats.choices.find(c=>c.choice==='C').missing,1);assert(!JSON.stringify(stats).includes('reason002'));
 for(const token of [null,f.student])assert.equal((await f.request('teacher.reasonStats',{roundId:r.id},token)).error.code,token?'FORBIDDEN':'AUTH');
 const history=await f.ok('student.history',{},f.student);assert.equal(history.questions[0].rounds[0].own.isCorrect,undefined);
 await f.ok('teacher.open',{questionId:'l07-q2'});
 assert.equal((await f.request('student.reason',{roundId:r.id,choice:'B',reasonId:'B1'},f.student)).error.code,'ROUND');
 assert.equal((await f.ok('student.state',{},f.student)).own,null);
 const exported=await f.ok('teacher.export');assert(exported.rows.every(row=>row.reason===null));assert(csv.create(exported).includes('未填写'));
});
test('server deadline and teacher reveal reject late reasons while own history and teacher statistics keep saved reasons private',async()=>{
 const f=await fixture();await f.ok('teacher.open',{questionId:'l07-q3'});let r=(await f.ok('teacher.state')).round;
 await f.ok('student.submit',{roundId:r.id,choice:'A'},f.student);f.tick(1000);
 await f.ok('student.reason',{roundId:r.id,choice:'A',reasonId:'A1'},f.student);
 const saved=(await f.ok('student.state',{},f.student)).own.reason;
 f.tick(60001);assert.equal((await f.request('student.reason',{roundId:r.id,choice:'A',reasonId:'A2'},f.student)).error.code,'CLOSED');
 await f.ok('teacher.reveal',{roundId:r.id});
 const stats=await f.ok('teacher.reasonStats',{roundId:r.id}),a=stats.choices.find(c=>c.choice==='A');assert.equal(a.submitted,1);assert.equal(a.reasons.find(reason=>reason.id==='A1').count,1);
 const own=await f.ok('student.history',{},f.student),other=await f.ok('student.history',{},f.two);
 assert.deepEqual(own.questions[2].rounds[0].own.reason,saved);assert.equal(own.questions[2].rounds[0].own.isCorrect,undefined);assert.equal(other.questions[2].rounds[0].own,null);
 for(const action of ['student.state','room.public']){const data=await f.ok(action,{},f.two);assert(!JSON.stringify(data).includes(saved.text));}
 await f.ok('teacher.open',{questionId:'l07-q4'});r=(await f.ok('teacher.state')).round;
 await f.ok('student.submit',{roundId:r.id,choice:'B'},f.student);await f.ok('teacher.reveal',{roundId:r.id});
 assert.equal((await f.request('student.reason',{roundId:r.id,choice:'B',reasonId:'B1'},f.student)).error.code,'CLOSED');
});
