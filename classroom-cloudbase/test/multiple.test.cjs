const test=require('node:test'),assert=require('node:assert/strict');
const {createService,passwordHash,questions}=require('../functions/classroom/service');
const {memoryRepository}=require('../scripts/memory.cjs');
async function fixture(){
 const repo=memoryRepository(),service=createService(repo,{teacherPasswordHash:await passwordHash('test-password')});
 let room;const request=(action,data={},token)=>service.handle({action,data,token,roomCode:room},'multi-test');
 const teacher=(await request('teacher.login',{password:'test-password'})).data.token;
 room=(await request('teacher.create',{},teacher)).data.code;
 const student=(await request('student.login',{name:'多题测试',studentNumber:'multi001'})).data.token;
 const ok=async(action,data={},token=teacher)=>{const result=await request(action,data,token);assert(result.ok,JSON.stringify(result.error));return result.data;};
 return {repo,room,student,teacher,request,ok};
}
test('all six questions follow one student session and retain independent answer and revealed distributions',async()=>{
 const f=await fixture(),ids=[...questions.keys()].filter(id=>id.startsWith('l07-')),rounds=[];
 for(const [i,questionId]of ids.entries()){
  assert.equal((await f.ok('teacher.state',{questionId})).round,null);
  await f.ok('teacher.open',{questionId});
  const s=await f.ok('student.state',{},f.student);assert.equal(s.question.id,questionId);assert.equal(s.own,null);assert.equal(s.round.questionId,questionId);assert.equal(s.round.counts,undefined);assert.equal(s.round.correct,undefined);
  assert(!JSON.stringify(s.question).includes('correct'));rounds.push(s.round.id);
  await f.ok('student.submit',{roundId:s.round.id,choice:'ABCD'[i%4]},f.student);
  await f.ok('teacher.reveal',{questionId,roundId:s.round.id});
  assert.equal((await f.ok('room.public',{},undefined)).round.total,1);
 }
 for(const [i,questionId]of ids.entries()){
  const s=await f.ok('teacher.state',{questionId});assert.equal(s.question.id,questionId);assert.equal(s.round.id,rounds[i]);assert.equal(s.round.total,1);assert.equal(s.round.counts['ABCD'[i%4]],1);assert(s.round.revealed);
 }
 const exported=await f.ok('teacher.export');assert.equal(exported.rows.length,6);assert.deepEqual(new Set(exported.rows.map(r=>r.questionId)),new Set(ids));assert(exported.rows.every(r=>r.studentNumber==='multi001'));assert.deepEqual(exported.rounds.map(r=>r.questionId),ids);
});
test('switching questions closes old submissions; revealing an older question cannot switch the student back',async()=>{
 const f=await fixture();await f.ok('teacher.open',{questionId:'l07-q2'});const old=(await f.ok('teacher.state')).round;
 await f.ok('student.submit',{roundId:old.id,choice:'B'},f.student);
 await f.ok('teacher.open',{questionId:'l07-q3'});const current=(await f.ok('student.state',{},f.student)).round;
 assert.equal((await f.request('student.submit',{roundId:old.id,choice:'C'},f.student)).error.code,'ROUND');
 const previous=await f.ok('teacher.state',{questionId:'l07-q2'});assert.equal(previous.round.status,'closed');assert.equal(previous.round.revealed,false);
 await f.ok('teacher.reveal',{questionId:'l07-q2',roundId:old.id});
 const student=await f.ok('student.state',{},f.student);assert.equal(student.question.id,'l07-q3');assert.equal(student.round.id,current.id);assert.equal(student.round.revealed,false);assert.equal(student.own,null);
 assert.equal((await f.ok('teacher.state',{questionId:'l07-q2'})).round.total,1);
 assert.equal((await f.request('teacher.reveal',{questionId:'l07-q3',roundId:old.id},f.teacher)).error.code,'ROUND');
});
test('invalid question IDs fail before opening a round, student cannot select or manipulate teacher state',async()=>{
 const f=await fixture();
 for(const questionId of ['l07-q7','__proto__',{id:'l07-q2'}]){
  assert.equal((await f.request('teacher.open',{questionId},f.teacher)).error.code,'QUESTION');
  assert.equal((await f.request('teacher.state',{questionId},f.teacher)).error.code,'QUESTION');
 }
 for(const action of ['teacher.open','teacher.state','teacher.reveal'])assert.equal((await f.request(action,{questionId:'l07-q2'},f.student)).error.code,'FORBIDDEN');
 assert.equal((await f.ok('teacher.state')).round,null);
});
test('existing first-question classrooms without questionRounds migrate without losing their round or answers',async()=>{
 const f=await fixture();await f.ok('teacher.open');const old=(await f.ok('teacher.state')).round;
 await f.ok('student.submit',{roundId:old.id,choice:'C'},f.student);
 const room=await f.repo.get('room_'+f.room);delete room.questionRounds;await f.repo.set('room_'+f.room,room);
 await f.ok('teacher.open',{questionId:'l07-q4'});
 const first=await f.ok('teacher.state',{questionId:'l07-q1'});assert.equal(first.round.id,old.id);assert.equal(first.round.total,1);
 await f.ok('teacher.reveal',{questionId:'l07-q1',roundId:old.id});assert.equal((await f.ok('teacher.state',{questionId:'l07-q1'})).round.correct,'C');
 assert.equal((await f.ok('student.state',{},f.student)).question.id,'l07-q4');
});
