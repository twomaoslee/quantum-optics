const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createService,passwordHash,questions}=require('../functions/classroom/service');
const {memoryRepository}=require('../scripts/memory.cjs');
test('lecture eight preserves QMD questions, three-option constraints, timing, reveal, retry and history',async()=>{
 const qmd=fs.readFileSync(path.resolve(__dirname,'../../../quantum-slides/lectures/lecture08/lecture08.qmd'),'utf8').replace(/ {2,}\n[ \t]*/g,'');
 const service=createService(memoryRepository(),{teacherPasswordHash:await passwordHash('lecture-eight-test'),now:()=>Date.UTC(2026,10,3,4)});let room,teacher;
 const call=(action,data={},token=teacher)=>service.handle({action,data,token,roomCode:room},'lecture-eight');
 const ok=async(...args)=>{const r=await call(...args);assert(r.ok,JSON.stringify(r.error));return r.data;};
 teacher=(await ok('teacher.login',{password:'lecture-eight-test'},null)).token;
 room=(await ok('teacher.create',{title:'第八讲课堂',lectureId:'l08'})).code;
 const student=(await ok('student.login',{name:'第八讲测试',studentNumber:'L08TEST001'},null)).token;
 assert.equal((await ok('room.public',{},null)).question.id,'l08-q1');
 assert.equal((await ok('student.state',{},student)).question.id,'l08-q1');
 assert.equal((await ok('teacher.state')).question.id,'l08-q1');
 assert.equal((await call('teacher.open',{questionId:'l07-q1'})).error.code,'QUESTION');
 const ids=[...questions.keys()].filter(id=>id.startsWith('l08-'));assert.equal(ids.length,5);
 for(const id of ids){
  const {question:q,answer:a}=questions.get(id),part=qmd.split(/(?=^## )/m).find(p=>p.split('\n')[0].includes('#'+id+' '));
  assert(part);assert(part.includes(q.stem));for(const [,choice]of q.options)assert(part.includes('- '+choice));assert(part.includes('correct="'+a.correct+'"'));assert(part.includes(a.explanation));
  await ok('teacher.open',{questionId:id});let s=await ok('student.state',{},student);assert.equal(s.question.id,id);assert.equal(s.round.deadline-s.round.openedAt,60000);assert.equal(s.round.correct,undefined);
  if(q.options.length===3)assert.equal((await call('student.submit',{roundId:s.round.id,choice:'D'},student)).error.code,'INPUT');
  await ok('student.submit',{roundId:s.round.id,choice:q.options[0][0]},student);
  await ok('student.submit',{roundId:s.round.id,choice:a.correct},student);
  await ok('student.reason',{roundId:s.round.id,choice:a.correct,reasonId:'other',comment:'虚拟学生验证原因保存'},student);
  assert.equal((await ok('teacher.state',{questionId:id})).round.total,1);
  assert.equal((await ok('student.state',{},student)).round.correct,undefined);
  await ok('teacher.reveal',{questionId:id,roundId:s.round.id});s=await ok('student.state',{},student);assert.equal(s.round.correct,a.correct);assert.equal(s.round.total,1);
  assert.deepEqual((await ok('teacher.comparison',{questionId:id,roundId:s.round.id})).options,q.options.map(([c])=>c));
  assert.equal((await call('student.submit',{roundId:s.round.id,choice:a.correct},student)).error.code,'CLOSED');
 }
 const history=await ok('student.history',{},student);assert.equal(history.questions.length,5);assert(history.questions.every(q=>q.question.id.startsWith('l08-')&&q.feedbackAvailable));
 const exported=await ok('teacher.export');assert.equal(exported.rows.length,5);assert(exported.rows.every(r=>r.questionId.startsWith('l08-')&&r.reason.comment));
 await ok('teacher.open',{questionId:'l08-q1'});assert.equal((await ok('student.state',{},student)).own,null);
 assert.equal((await ok('teacher.export')).rows.length,5);
});
test('the grouped fourth-question reference retains both distributions and the calculation rule',()=>{
 const ref=questions.get('l08-q4').question.reference;
 for(const expected of ['相干态','e^{-1}/n!','单模热态','1/2^{n+1}','P(n\\ge4)','\\sum_{n=0}^{3}','0!=1'])assert(ref.includes(expected),expected);
 assert(!ref.includes(':::'));assert(!ref.includes('distribution-entry'));
});
