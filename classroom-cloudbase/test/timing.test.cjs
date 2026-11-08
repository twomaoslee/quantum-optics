const test=require('node:test'),assert=require('node:assert/strict');
const {createService,passwordHash}=require('../functions/classroom/service');
const {memoryRepository}=require('../scripts/memory.cjs');
async function fixture(){
 let time=Date.UTC(2026,10,2,2);const repo=memoryRepository(),s=createService(repo,{teacherPasswordHash:await passwordHash('timing-test'),now:()=>time});let room;
 const call=(action,data={},token)=>s.handle({action,data,token,roomCode:room},'timing-test');
 const teacher=(await call('teacher.login',{password:'timing-test'})).data.token;
 const ok=async(action,data={},token=teacher)=>{const r=await call(action,data,token);assert(r.ok,JSON.stringify(r.error));return r.data;};
 room=(await ok('teacher.create')).code;const student=(await ok('student.login',{name:'计时验证',studentNumber:'TIMING001'},null)).token;
 return {ok,call,teacher,student,tick:ms=>time+=ms};
}
test('each Lecture 7 question has 60 seconds and the student shares its authoritative deadline',async()=>{
 const f=await fixture();
 for(let i=1;i<=6;i++){
  const questionId='l07-q'+i;await f.ok('teacher.open',{questionId});const state=await f.ok('teacher.state',{questionId});
  assert.equal(state.defaultSeconds,60);assert.equal(state.round.deadline-state.round.openedAt,60000);
  assert.equal((await f.ok('student.state',{},f.student)).round.deadline,state.round.deadline);
 }
 const first=(await f.ok('teacher.state')).round;f.tick(59000);await f.ok('student.submit',{roundId:first.id,choice:'D'},f.student);
 f.tick(1000);assert.equal((await f.call('student.submit',{roundId:first.id,choice:'A'},f.student)).error.code,'CLOSED');
 await f.ok('teacher.open',{roundId:first.id});const repeat=(await f.ok('teacher.state')).round;assert.equal(repeat.deadline-repeat.openedAt,60000);
 await f.ok('teacher.extend',{roundId:repeat.id});assert.equal((await f.ok('teacher.state')).round.deadline-repeat.openedAt,90000);
});
test('explicit teacher duration overrides remain valid, with the existing server limits enforced',async()=>{
 const f=await fixture();await f.ok('teacher.open',{questionId:'l07-q6',seconds:90});const r=(await f.ok('teacher.state')).round;assert.equal(r.deadline-r.openedAt,90000);await f.ok('teacher.close',{roundId:r.id});
 for(const seconds of [0,14,301,60.5,'120'])assert.equal((await f.call('teacher.open',{questionId:'l07-q6',seconds},f.teacher)).error.code,'INPUT');
});
