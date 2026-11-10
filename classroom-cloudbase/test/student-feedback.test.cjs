const test=require('node:test'),assert=require('node:assert/strict');
const {createService,passwordHash,questions}=require('../functions/classroom/service');
const {memoryRepository}=require('../scripts/memory.cjs');
async function fixture(){
 let time=Date.UTC(2026,10,2,2);const repo=memoryRepository(),service=createService(repo,{teacherPasswordHash:await passwordHash('feedback-test'),now:()=>time});
 let room;const request=(action,data={},token,roomCode=room)=>service.handle({action,data,token,roomCode},'feedback-test');
 const ok=async(action,data={},token=teacher)=>{const r=await request(action,data,token);assert(r.ok,JSON.stringify(r.error));return r.data;};
 const teacher=(await request('teacher.login',{password:'feedback-test'})).data.token;room=(await ok('teacher.create')).code;
 const student=(await ok('student.login',{name:'反馈测试甲',studentNumber:'feedback001'},null)).token;
 const other=(await ok('student.login',{name:'反馈测试乙',studentNumber:'feedback002'},null)).token;
 return {repo,room,request,ok,teacher,student,other,tick:n=>time+=n};
}
test('all six questions disclose personal results only after teacher display, preserve hidden retries and scope history to displayed questions',async()=>{
 const f=await fixture();
 for(const [questionId,{answer}] of [...questions].filter(([id])=>id.startsWith('l07-'))){
  await f.ok('teacher.open',{questionId});let r=(await f.ok('teacher.state',{questionId})).round;
  await f.ok('student.submit',{roundId:r.id,choice:answer.correct},f.student);
  let own=await f.ok('student.state',{},f.student);assert.equal(own.round.correct,undefined);assert.equal(own.own.isCorrect,undefined);
  await f.ok('teacher.open',{questionId,roundId:r.id});r=(await f.ok('teacher.state',{questionId})).round;
  const wrong=[...'ABCD'].find(c=>c!==answer.correct);await f.ok('student.submit',{roundId:r.id,choice:wrong},f.student);
  f.tick(61000);own=await f.ok('student.state',{},f.student);assert.equal(own.round.correct,undefined);assert.equal(own.own.isCorrect,undefined);
  await f.ok('teacher.reveal',{questionId,roundId:r.id});own=await f.ok('student.state',{},f.student);
  assert.equal(own.round.correct,answer.correct);assert.equal(own.round.explanation,answer.explanation);assert.equal(own.own.isCorrect,false);
  assert.equal((await f.ok('room.public',{},null)).round.correct,undefined);
  const missing=await f.ok('student.state',{},f.other);assert.equal(missing.own,null);assert.equal(missing.round.correct,answer.correct);
  const history=await f.ok('student.history',{},f.student),item=history.questions.find(q=>q.question.id===questionId);
  assert.equal(item.rounds[0].own.isCorrect,true);assert.equal(item.rounds[1].own.isCorrect,false);
  for(const unseen of history.questions.filter(q=>!q.rounds.length))assert.equal(unseen.answer,undefined);
  assert.equal(history.answersReleasedAt,null);
 }
});
test('new optional reasons retain old wording; any preset accepts a 300-character comment; publication permits reason edits',async()=>{
 const f=await fixture();await f.ok('teacher.open',{questionId:'l07-q4'});const r=(await f.ok('teacher.state',{questionId:'l07-q4'})).round;
 await f.ok('student.submit',{roundId:r.id,choice:'B'},f.student);
 const [record]=await f.repo.list({kind:'answer',roomCode:f.room});const old={id:'B1',text:'此前课堂的原始原因',version:'old-version',submittedAt:1,comment:'此前的补充'};
 await f.repo.set(record._id||'answer_'+r.id+'_'+record.userId,{...record,reason:old});
 let own=await f.ok('student.state',{},f.student);assert.deepEqual(own.own.reason,old);assert.notEqual(own.own.reasonOptionsVersion,old.version);
 assert.deepEqual((await f.ok('teacher.export')).rows[0].reason,old);
 const payload={roundId:r.id,choice:'B',reasonId:'B1',comment:'字'.repeat(300)};await f.ok('student.reason',payload,f.student);
 own=await f.ok('student.state',{},f.student);assert.equal(own.own.reason.comment.length,300);assert.equal(own.own.updatedAt,record.updatedAt);
 assert.equal((await f.request('student.reason',{...payload,comment:'字'.repeat(301)},f.student)).error.code,'INPUT');
 await f.ok('teacher.reveal',{questionId:'l07-q4',roundId:r.id});
 const comment='看过解析后补写';
 assert.equal((await f.ok('student.reason',{...payload,comment},f.student)).reason.afterClose,true);
 assert.equal((await f.ok('teacher.reasonStats',{questionId:'l07-q4',roundId:r.id})).choices[1].comments[0],comment);
});
