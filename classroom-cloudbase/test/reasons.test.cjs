const test=require('node:test'),assert=require('node:assert/strict');
const {createService,passwordHash,questions}=require('../functions/classroom/service');
const {memoryRepository}=require('../scripts/memory.cjs');
const bank=require('../functions/classroom/reasons.json');
const csv=require('../../classroom/export-csv');
async function fixture(lectureId='l07'){
 let time=Date.UTC(2026,10,1,4);
 const repo=memoryRepository(),service=createService(repo,{teacherPasswordHash:await passwordHash('reason-test-password'),now:()=>time});
 let room;const request=(action,data={},token,code=room)=>service.handle({action,data,token,roomCode:code},'reason-test');
 const teacher=(await request('teacher.login',{password:'reason-test-password'})).data.token;
 const ok=async(action,data={},token=teacher,code=room)=>{const r=await request(action,data,token,code);assert(r.ok,JSON.stringify(r.error));return r.data;};
 room=(await ok('teacher.create',{lectureId})).code;
 const student=(await ok('student.login',{name:'原因测试甲',studentNumber:'reason001'},null)).token;
 const two=(await ok('student.login',{name:'原因测试乙',studentNumber:'reason002'},null)).token;
 return {repo,ok,request,teacher,student,two,room,tick:n=>time+=n};
}
test('all 24 branches become available only after own answer; optional reason updates preserve answer timestamps and counts',async()=>{
 const f=await fixture();let total=0;
 for(const [questionId,{question}]of [...questions].filter(([id])=>id.startsWith('l07-'))){
  assert.deepEqual(Object.keys(bank.questions[questionId]),['A','B','C','D']);
  await f.ok('teacher.open',{questionId});const r=(await f.ok('student.state',{},f.student)).round;
  for(const choice of ['A','B','C','D']){
   await f.ok('student.submit',{roundId:r.id,choice},f.student);
   const before=await f.ok('student.state',{},f.student);assert.equal(before.own.reason,null);
   assert.deepEqual(before.own.reasonOptions,bank.questions[questionId][choice]);
   assert.equal(before.question.correct,undefined);assert.equal(before.own.isCorrect,undefined);assert(!('reasons' in before.question));
   const options=before.own.reasonOptions;assert(options.length>=4&&options.length<=5);assert.equal(new Set(options.map(o=>o.id)).size,options.length);
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
test('Lecture 8 gives each answer two or three distinct reasons and keeps optional free text and legacy snapshots',async()=>{
 const f=await fixture('l08'),version=bank.lectureVersions.l08;
 let branches=0;
 for(const [questionId,{question}]of [...questions].filter(([id])=>id.startsWith('l08-'))){
  const choices=question.options.map(([letter])=>letter);
  assert.deepEqual(Object.keys(bank.questions[questionId]),choices);
  await f.ok('teacher.open',{questionId});
  const {round}=await f.ok('student.state',{},f.student);
  for(const choice of choices){
   await f.ok('student.submit',{roundId:round.id,choice},f.student);
   const {own}=await f.ok('student.state',{},f.student),options=own.reasonOptions;
   assert.deepEqual(options,bank.questions[questionId][choice]);
   assert.equal(own.reasonOptionsVersion,version);
   assert.deepEqual(options.slice(-2).map(option=>option.id),['unsure','other']);
   assert(options.length===4||options.length===5);
   assert.equal(new Set(options.map(option=>option.text)).size,options.length);
   const {reason}=await f.ok('student.reason',{roundId:round.id,choice,reasonId:options[0].id,comment:'自定义补充'},f.student);
   assert.equal(reason.version,version);assert.equal(reason.text,options[0].text);assert.equal(reason.comment,'自定义补充');
   branches++;
  }
  const choice=choices.at(-1);
  await f.ok('student.reason',{roundId:round.id,choice,reasonId:'other',comment:'只写自己的想法'},f.student);
  assert.equal((await f.ok('student.state',{},f.student)).own.reason.comment,'只写自己的想法');
  const [row]=await f.repo.list({kind:'answer',roomCode:f.room,roundId:round.id});
  const old={...row.reason,version:bank.version};
  await f.repo.set('answer_'+round.id+'_'+row.userId,{...row,reason:old});
  await f.ok('teacher.close',{questionId,roundId:round.id});
  const history=await f.ok('student.history',{},f.student);
  assert.deepEqual(history.questions.find(item=>item.question.id===questionId).rounds[0].own.reason,old);
 }
 assert.equal(branches,18);
});
test('reasons cannot create an answer, select another choice, overwrite another student, or cross classrooms; omission is neutral',async()=>{
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
 const newRoom=(await f.ok('teacher.create')).code;
 const edit={roundId:r.id,choice:'B',reasonId:'B1'};
 assert.equal((await f.request('student.reason',edit,f.student,newRoom)).error.code,'ROUND');
 assert.equal((await f.request('student.state',{reasonRound:r.id},f.student,newRoom)).error.code,'ROUND');
 assert.equal((await f.ok('student.state',{},f.student)).own,null);
 const exported=await f.ok('teacher.export');assert(exported.rows.every(row=>row.reason===null));assert(csv.create(exported).includes('未填写'));
});
test('reasons remain editable after deadline, reveal and question change without reopening answers',async()=>{
 const f=await fixture();await f.ok('teacher.open',{questionId:'l07-q3'});const r=(await f.ok('teacher.state')).round;
 await f.ok('student.submit',{roundId:r.id,choice:'A'},f.student);
 const submittedAt=(await f.ok('student.state',{},f.student)).own.updatedAt;
 f.tick(60001);
 assert.equal((await f.request('student.submit',{roundId:r.id,choice:'B'},f.student)).error.code,'CLOSED');
 const reason={roundId:r.id,choice:'A',reasonId:'A1'};
 const late=await f.ok('student.reason',reason,f.student);
 assert.equal(late.reason.afterClose,true);
 await f.ok('teacher.reveal',{roundId:r.id});
 await f.ok('teacher.open',{questionId:'l07-q4'});
 const {round,own:record,question}=await f.ok('student.state',{reasonRound:r.id},f.student);
 assert.equal(question.id,'l07-q3');assert.equal(round.correct,undefined);assert.deepEqual(record.reason,late.reason);
 assert.equal((await f.request('student.state',{reasonRound:r.id},f.two)).error.code,'ANSWER');
 assert.equal((await f.request('student.reason',reason,f.two)).error.code,'ANSWER');
 const {reason:saved}=await f.ok('student.reason',{...reason,reasonId:'other',comment:'换题以后补写'},f.student);
 const stats=await f.ok('teacher.reasonStats',{questionId:'l07-q3',roundId:r.id});
 assert.equal(stats.total,1);assert.equal(stats.choices[0].reasons.find(item=>item.id==='other').count,1);
 const own=await f.ok('student.history',{},f.student),other=await f.ok('student.history',{},f.two);
 assert.deepEqual(own.questions[2].rounds[0].own,{choice:'A',submittedAt,reason:saved,isCorrect:false});
 assert.equal(other.questions[2].rounds[0].own,null);
 const row=(await f.ok('teacher.export')).rows.find(row=>row.roundId===r.id);
 assert.equal(row.submittedAt,submittedAt);assert.deepEqual(row.reason,saved);
});
