const test=require('node:test'),assert=require('node:assert/strict');
const {createService,passwordHash}=require('../functions/classroom/service');
const {memoryRepository}=require('../scripts/memory.cjs');
const bank=require('../functions/classroom/questions.json');
test('lecture 09 isolates its eight questions and preserves feedback, reasons and all rounds',async()=>{
 const service=createService(memoryRepository(),{teacherPasswordHash:await passwordHash('local-test-only-password')});
 let teacher,room,student;
 const req=(action,data={},token=teacher)=>service.handle({action,data,token,roomCode:room},'test09');
 const ok=async(a,d,t)=>{const r=await req(a,d,t);assert(r.ok,JSON.stringify(r.error));return r.data};
 teacher=(await ok('teacher.login',{password:'local-test-only-password'})).token;
 room=(await ok('teacher.create',{lectureId:'l09',title:'Lecture 09 isolated verification'})).code;
 assert.equal((await ok('room.public')).question.id,'l09-q1');
 assert.equal((await req('teacher.open',{questionId:'l08-q1'})).error.code,'QUESTION');
 student=(await ok('student.login',{name:'本地测试',studentNumber:'TEST09'})).token;
 for(const record of bank.filter(r=>r.question.id.startsWith('l09-'))){
  const id=record.question.id;
  assert(!/<br\s*\/?\s*>/i.test(JSON.stringify(record)), 'slide line breaks must not leak as HTML text to student pages');
  await ok('teacher.open',{questionId:id,feedbackMode:'discussion'});
  let st=await ok('student.state',{},student);assert.deepEqual(st.question,record.question);assert.equal(st.round.correct,undefined);
  const roundId=st.round.id;await ok('student.submit',{roundId,choice:record.answer.correct},student);
  st=await ok('student.state',{},student);assert(st.own.reasonOptions.length>=4);assert.equal(st.round.correct,undefined);
  await ok('student.reason',{roundId,choice:record.answer.correct,reasonId:st.own.reasonOptions[0].id,comment:''},student);
  await ok('teacher.reveal',{questionId:id,roundId});st=await ok('student.state',{},student);
  assert.equal(st.round.correct,record.answer.correct);assert.equal((await ok('teacher.state',{questionId:id})).round.total,1);
 }
 const history=await ok('student.history',{},student);assert.equal(history.questions.length,8);
 const entry=await ok('teacher.classroom',{lectureId:'l09'});assert(entry.code&&entry.anchor);
});
