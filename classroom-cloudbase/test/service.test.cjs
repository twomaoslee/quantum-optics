const test=require('node:test'),assert=require('node:assert/strict');
const {createService,passwordHash}=require('../functions/classroom/service');
const {memoryRepository}=require('../scripts/memory.cjs');
async function fixture(){
 let time=1900000000000;
 const repo=memoryRepository(),service=createService(repo,{teacherPasswordHash:await passwordHash('test-only-long-password'),now:()=>time});
 const request=(action,data={},token,roomCode,caller='test')=>service.handle({action,data,token,roomCode},caller);
 const login=await request('teacher.login',{password:'test-only-long-password'});assert(login.ok);const teacher=login.data.token;
 const created=await request('teacher.create',{},teacher),room=created.data.code;
 const teacherCall=(action,data={})=>request(action,data,teacher,room);
 async function student(number='000123',name='测试同学',caller=number){const result=await request('student.login',{name,studentNumber:number},null,room,caller);assert(result.ok,JSON.stringify(result));return result.data.token;}
 return {repo,service,request,teacher,room,teacherCall,student,tick:n=>{time+=n;}};
}
test('teacher rights never come from URL or submitted role; anonymous and student exports denied',async()=>{
 const f=await fixture(),token=await f.student();
 for(const action of ['teacher.create','teacher.open','teacher.close','teacher.reveal','teacher.export','teacher.rooms']){
  assert.equal((await f.request(action,{role:'teacher'},token,f.room)).error.code,'FORBIDDEN');
  assert.equal((await f.request(action,{},null,f.room)).error.code,'AUTH');
 }
 assert.equal((await f.request('teacher.login',{password:'wrong'})).error.code,'AUTH');
});
test('name and student number survive fresh sessions; mismatches rejected; leading zeros preserved',async()=>{
 const f=await fixture(),first=await f.student(),second=await f.student();assert.notEqual(first,second);
 assert.equal((await f.request('me',{},second)).data.profile.studentNumber,'000123');
 const mismatch=await f.request('student.login',{name:'另一同学',studentNumber:'000123'},null,f.room);assert.equal(mismatch.error.code,'IDENTITY');
 assert.equal((await f.request('student.login',{name:'<script>',studentNumber:'123'},null,f.room)).error.code,'INPUT');
 const docs=await f.repo.list({kind:'session'});assert(!JSON.stringify(docs).includes(first));
 await f.request('logout',{},first);assert.equal((await f.request('me',{},first)).error.code,'AUTH');
 assert((await f.request('me',{},second)).ok);
});
test('one answer per student, own answer only, statistics hidden until manual reveal',async()=>{
 const f=await fixture(),one=await f.student(),two=await f.student('000124','测试乙');await f.teacherCall('teacher.open');
 let state=(await f.teacherCall('teacher.state')).data,roundId=state.round.id;
 for(const choice of ['A','C','C'])assert((await f.request('student.submit',{roundId,choice},one,f.room)).ok);
 assert((await f.request('student.submit',{roundId,choice:'B'},two,f.room)).ok);
 state=(await f.teacherCall('teacher.state')).data;assert.deepEqual(state.round.counts,{A:0,B:1,C:1,D:0});assert.equal(state.round.total,2);
 let publicState=(await f.request('room.public',{},null,f.room)).data;assert.equal(publicState.round.total,undefined);assert.equal(publicState.round.correct,undefined);
 const own=(await f.request('student.state',{},one,f.room)).data;assert.equal(own.own.choice,'C');assert(!JSON.stringify(own).includes('测试乙'));assert.equal(own.round.counts,undefined);
 await f.teacherCall('teacher.reveal',{roundId});publicState=(await f.request('room.public',{},null,f.room)).data;
 assert.deepEqual(publicState.round.counts,{A:0,B:1,C:1,D:0});assert.equal(publicState.round.correct,undefined);
 assert.equal((await f.teacherCall('teacher.state')).data.round.correct,'C');
 assert.equal((await f.request('student.submit',{roundId,choice:'A'},one,f.room)).error.code,'CLOSED');
});
test('server enforces deadline without a presenter or timer running, never reveals automatically',async()=>{
 const f=await fixture(),token=await f.student();await f.teacherCall('teacher.open');const r=(await f.teacherCall('teacher.state')).data.round;
 f.tick(59999);assert((await f.request('student.submit',{roundId:r.id,choice:'D'},token,f.room)).ok);
 f.tick(1);assert.equal((await f.request('student.submit',{roundId:r.id,choice:'C'},token,f.room)).error.code,'CLOSED');
 const state=(await f.request('student.state',{},token,f.room)).data;assert.equal(state.round.status,'closed');assert.equal(state.round.revealed,false);assert.equal(state.round.counts,undefined);
});
test('extension, early close and new rounds keep history, reject stale actions',async()=>{
 const f=await fixture(),token=await f.student();await f.teacherCall('teacher.open');const r=(await f.teacherCall('teacher.state')).data.round;
 assert.equal((await f.teacherCall('teacher.extend',{roundId:r.id})).ok,true);
 f.tick(60000);assert((await f.request('student.submit',{roundId:r.id,choice:'B'},token,f.room)).ok);
 await f.teacherCall('teacher.close',{roundId:r.id});assert.equal((await f.teacherCall('teacher.extend',{roundId:r.id})).error.code,'CLOSED');
 await f.teacherCall('teacher.open');assert.equal((await f.request('student.submit',{roundId:r.id,choice:'C'},token,f.room)).error.code,'ROUND');
 assert.equal((await f.teacherCall('teacher.close',{roundId:r.id})).error.code,'ROUND');
 const current=(await f.teacherCall('teacher.state')).data.round;
 assert.equal(current.number,2);assert.equal(current.total,0);assert.equal((await f.request('student.state',{},token,f.room)).data.own,null);
 const exported=(await f.teacherCall('teacher.export')).data;assert.equal(exported.rounds.length,2);assert.equal(exported.rows.length,1);assert.equal(exported.rows[0].studentNumber,'000123');
});
test('150 concurrent simulated students and retries have distinct answer records',async()=>{
 const f=await fixture();await f.teacherCall('teacher.open');const roundId=(await f.teacherCall('teacher.state')).data.round.id;
 const tokens=await Promise.all(Array.from({length:150},(_,i)=>f.student('sim'+String(i).padStart(4,'0'),'测试同学')));
 const results=await Promise.all(tokens.map((token,i)=>f.request('student.submit',{roundId,choice:['A','B','C','D'][i%4]},token,f.room)));
 assert(results.every(r=>r.ok));const state=(await f.teacherCall('teacher.state')).data;
 assert.equal(state.round.total,150);assert.deepEqual(state.round.counts,{A:38,B:38,C:37,D:37});
});
test('expired credentials and missing backend configuration fail closed',async()=>{
 const f=await fixture(),token=await f.student();f.tick(121*86400000);
 assert.equal((await f.request('me',{},token)).error.code,'AUTH');
 const service=createService(memoryRepository());assert.equal((await service.handle({action:'teacher.login',data:{password:'x'}})).error.code,'CONFIG');
});
test('login throttling and generic infrastructure errors avoid leaking secrets',async()=>{
 const f=await fixture();let result;
 for(let i=0;i<9;i++)result=await f.request('teacher.login',{password:'wrong'},null,null,'attacker');
 assert.equal(result.error.code,'RATE_LIMIT');
 const broken=createService({get:async()=>{throw new Error('SECRET-STACK');}});
 result=await broken.handle({action:'me',token:'a'.repeat(43)});assert.equal(result.error.code,'SERVER');assert(!JSON.stringify(result).includes('SECRET'));
});
