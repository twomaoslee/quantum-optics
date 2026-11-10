const test=require('node:test'),assert=require('node:assert/strict');
const {createService,passwordHash}=require('../functions/classroom/service');
// Snapshot-isolation model: conflicts are detected only for documents written,
// not every document read. This deliberately exercises the close/submission race.
function snapshotRepo(){
 const rows=new Map(),versions=new Map();let pause,release,reached;
 const clone=x=>x===undefined?null:structuredClone(x);
 const write=(id,data)=>{rows.set(id,clone(data));versions.set(id,(versions.get(id)||0)+1);};
 const repo={get:async id=>clone(rows.get(id)),set:async(id,data)=>write(id,data),remove:async id=>{rows.delete(id);versions.set(id,(versions.get(id)||0)+1);},
  list:async filter=>[...rows.values()].filter(r=>Object.entries(filter).every(([k,v])=>r[k]===v)).map(clone),
  count:async filter=>(await repo.list(filter)).length,
  async transaction(fn){
   for(let attempt=0;attempt<8;attempt++){
    const snapshot=new Map([...rows].map(([id,row])=>[id,clone(row)])),base=new Map(versions),writes=new Map();
    const result=await fn({get:async id=>{const row=clone(snapshot.get(id));if(pause&&id.startsWith('answer_')){pause=false;reached();await new Promise(r=>{release=r;});}return row;},set:async(id,data)=>{writes.set(id,clone(data));}});
    if([...writes.keys()].some(id=>(versions.get(id)||0)!==(base.get(id)||0)))continue;
    for(const [id,row]of writes)write(id,row);return result;
   }throw new Error('Transaction conflict');
  },
  pauseNextAnswerRead(){pause=true;return new Promise(r=>{reached=r;});},resume(){release();}
 };return repo;
}
test('close and publication cannot omit an in-flight accepted answer under snapshot isolation',async()=>{
 const repo=snapshotRepo(),service=createService(repo,{teacherPasswordHash:await passwordHash('test-password')});
 const call=(action,data={},token,roomCode)=>service.handle({action,data,token,roomCode},'race');
 const teacher=(await call('teacher.login',{password:'test-password'})).data.token,room=(await call('teacher.create',{},teacher)).data.code;
 const pupil=(await call('student.login',{name:'测试同学',studentNumber:'race001'},null,room)).data.token;
 await call('teacher.open',{},teacher,room);const roundId=(await call('teacher.state',{},teacher,room)).data.round.id;
 const reached=repo.pauseNextAnswerRead(),inflight=call('student.submit',{roundId,choice:'C'},pupil,room);await reached;
 assert((await call('teacher.reveal',{roundId},teacher,room)).ok);repo.resume();
 const submitted=await inflight;assert.equal(submitted.error.code,'CLOSED');
 const published=(await call('room.public',{},null,room)).data;assert.equal(published.round.total,0);assert.equal((await repo.list({kind:'answer'})).length,0);
});

test('after-class answer release closes expired gates against an in-flight submission',async()=>{
 let time=1900000000000;const repo=snapshotRepo(),service=createService(repo,{teacherPasswordHash:await passwordHash('test-password'),now:()=>time});
 const call=(action,data={},token,roomCode)=>service.handle({action,data,token,roomCode},'release-race');
 const teacher=(await call('teacher.login',{password:'test-password'})).data.token,room=(await call('teacher.create',{},teacher)).data.code;
 const pupil=(await call('student.login',{name:'发布测试',studentNumber:'release001'},null,room)).data.token;
 await call('teacher.open',{},teacher,room);const roundId=(await call('teacher.state',{},teacher,room)).data.round.id;
 const reached=repo.pauseNextAnswerRead(),inflight=call('student.submit',{roundId,choice:'C'},pupil,room);await reached;time+=60001;
 assert((await call('teacher.releaseAnswers',{released:true},teacher,room)).ok);repo.resume();
 assert.equal((await inflight).error.code,'CLOSED');const h=(await call('student.history',{},pupil,room)).data;assert.equal(h.questions[0].rounds[0].own,null);
});

test('reason writes can cross reveal without changing counts but cannot attach to a stale choice',async()=>{
 const repo=snapshotRepo(),service=createService(repo,{teacherPasswordHash:await passwordHash('reason-race-password')});
 const call=(action,data={},token,roomCode)=>service.handle({action,data,token,roomCode},'reason-race');
 const teacher=(await call('teacher.login',{password:'reason-race-password'})).data.token,room=(await call('teacher.create',{},teacher)).data.code;
 const pupil=(await call('student.login',{name:'原因并发测试',studentNumber:'reasonrace001'},null,room)).data.token;
 for(const mode of ['choice','reveal']){
  await call('teacher.open',{questionId:'l07-q3'},teacher,room);const roundId=(await call('teacher.state',{},teacher,room)).data.round.id;
  await call('student.submit',{roundId,choice:'A'},pupil,room);
  const reached=repo.pauseNextAnswerRead(),inflight=call('student.reason',{roundId,choice:'A',reasonId:'A1'},pupil,room);await reached;
  if(mode==='choice')await call('student.submit',{roundId,choice:'B'},pupil,room);else await call('teacher.reveal',{roundId},teacher,room);
  repo.resume();const saved=await inflight;
  const {round,own}=(await call('student.state',{},pupil,room)).data;
  if(mode==='choice'){
   assert.equal(saved.error.code,'CHOICE');assert.equal(own.choice,'B');assert.equal(own.reason,null);
   await call('teacher.close',{roundId},teacher,room);
  }else{
   assert(saved.ok);assert.equal(own.reason.id,'A1');assert.equal(own.choice,'A');
   assert.equal(round.total,1);assert.equal(round.counts.A,1);
  }
 }
});
