const test=require('node:test'),assert=require('node:assert/strict');
const {createService,passwordHash}=require('../functions/classroom/service');
const {memoryRepository}=require('../scripts/memory.cjs');
const {snapshot,validateAnalysis}=require('../functions/classroom/comparison');
async function fixture(){
 let time=Date.UTC(2026,10,1,8),calls=0,release;
 const repo=memoryRepository(),service=createService(repo,{teacherPasswordHash:await passwordHash('comparison-test'),now:()=>time,
  analyze:async input=>{calls++;if(release)await release;return {summary:'仍需核对运算中系数的保留。可用一个简短例子再检查。',observations:[{text:'应核对两次操作时各自的系数，并用补问确认理由。',evidence:[input.rounds[0].id]}],nextStep:'请学生逐步说明各次操作的系数。',limitations:'参与者可能不同，分布变化不能证明学习提升。',model:'test-stub-not-real-AI'};}});
 let room;const request=(action,data={},token,code=room)=>service.handle({action,data,token,roomCode:code},'comparison-test');
 const teacher=(await request('teacher.login',{password:'comparison-test'})).data.token;
 const ok=async(action,data={},token=teacher,code=room)=>{const r=await request(action,data,token,code);assert(r.ok,JSON.stringify(r.error));return r.data;};
 room=(await ok('teacher.create')).code;
 const a=(await ok('student.login',{name:'对比测试甲',studentNumber:'compare001'},null)).token,b=(await ok('student.login',{name:'对比测试乙',studentNumber:'compare002'},null)).token;
 return {repo,ok,request,teacher,a,b,room,tick:n=>time+=n,calls:()=>calls,hold:p=>release=p};
}
test('any number of hidden rounds survives, uses per-round denominators and matched participants; public results remain gated',async()=>{
 const f=await fixture();let previous=null;
 for(let i=0;i<5;i++){
  await f.ok('teacher.open',{questionId:'l07-q3',roundId:previous});const r=(await f.ok('teacher.state')).round;
  if(previous)assert.equal((await f.request('student.submit',{roundId:previous,choice:'C'},f.a)).error.code,'ROUND');
  assert.equal((await f.ok('student.state',{},f.a)).own,null);
  await f.ok('student.submit',{roundId:r.id,choice:i%2?'C':'A'},f.a);
  if(i%2===0)await f.ok('student.submit',{roundId:r.id,choice:'B'},f.b);
  assert.equal((await f.request('teacher.comparison',{questionId:'l07-q3',roundId:r.id},f.teacher)).error.code,'HIDDEN');
  assert.equal((await f.ok('room.public',{},null)).round.counts,undefined);previous=r.id;
 }
 await f.ok('teacher.reveal',{questionId:'l07-q3',roundId:previous});
 const compare=await f.ok('teacher.comparison',{questionId:'l07-q3',roundId:previous});
 assert.equal(compare.rounds.length,5);assert.deepEqual(compare.rounds.map(r=>r.total),[2,1,2,1,2]);assert(compare.transitions.every(t=>t.paired===1&&t.changed===1));
 assert(!JSON.stringify(compare).includes('compare001'));assert.equal(compare.reasonRounds,undefined);assert.equal(compare.analysis.status,'idle');
 for(const token of [null,f.a])assert.equal((await f.request('teacher.comparison',{questionId:'l07-q3',roundId:previous},token)).error.code,token?'FORBIDDEN':'AUTH');
 assert.equal((await f.ok('student.history',{},f.a)).questions[2].answer.correct,'C');
 const records=await f.repo.list({kind:'round',roomCode:f.room});assert(records.every(r=>r.closedAt));
});
test('AI cache is single-flight, private details never enter projection, and a new round invalidates old analysis',async()=>{
 const f=await fixture();await f.ok('teacher.open',{questionId:'l07-q3'});let r=(await f.ok('teacher.state')).round;
 await f.ok('student.submit',{roundId:r.id,choice:'A'},f.a);
 await f.ok('student.reason',{roundId:r.id,choice:'A',reasonId:'other',comment:'我算出的系数没有保留'},f.a);await f.ok('teacher.reveal',{roundId:r.id});
 let unblock;f.hold(new Promise(resolve=>unblock=resolve));
 const data={questionId:'l07-q3',roundId:r.id},first=f.ok('teacher.analyze',data);
 // Let the first transaction acquire its lease without making timing assumptions.
 while(!f.calls())await new Promise(resolve=>setImmediate(resolve));
 const second=await f.ok('teacher.analyze',data);assert.equal(second.analysis.status,'pending');unblock();
 const ready=await first;assert.equal(ready.analysis.status,'ready');assert.equal(f.calls(),1);assert.equal(ready.details,undefined);assert(!JSON.stringify(ready).includes('我算出的系数没有保留'));
 await f.ok('teacher.analyze',data);assert.equal(f.calls(),1);
 const detail=await f.ok('teacher.analysisDetails',data);assert(detail.details.observations[0].evidence.length);assert.equal(detail.reasonRounds[0].choices[0].comments[0].text,'我算出的系数没有保留');
 await f.ok('teacher.open',{questionId:'l07-q3',roundId:r.id});const next=(await f.ok('teacher.state')).round;await f.ok('teacher.reveal',{roundId:next.id});
 assert.equal((await f.ok('teacher.comparison',{questionId:'l07-q3',roundId:next.id})).analysis.status,'idle');
 assert.equal((await f.request('teacher.analysisStatus',{...data,fingerprint:ready.fingerprint},f.teacher)).error.code,'ROUND');
});
test('other reason text is optional, validated and stored independently; changing choices removes it',async()=>{
 const f=await fixture();await f.ok('teacher.open',{questionId:'l07-q3'});const r=(await f.ok('teacher.state')).round;
 await f.ok('student.submit',{roundId:r.id,choice:'A'},f.a);
 const data={roundId:r.id,choice:'A',reasonId:'other'};
 await f.ok('student.reason',data,f.a);assert.equal((await f.ok('student.state',{},f.a)).own.reason.comment,undefined);
 f.tick(1000);await f.ok('student.reason',{...data,comment:'  我想把结果归一化  '},f.a);assert.equal((await f.ok('student.state',{},f.a)).own.reason.comment,'我想把结果归一化');
 for(const invalid of [{comment:'字'.repeat(301)},{comment:[]},{comment:'abc',reasonId:null}])assert.equal((await f.request('student.reason',{...data,...invalid},f.a)).error.code,'INPUT');
 assert.equal((await f.ok('teacher.export')).rows[0].reason.comment,'我想把结果归一化');
 await f.ok('student.reason',{...data,reasonId:'A1',comment:'我按这个理由选，但不理解为什么不能再归一化。'},f.a);
 const own=await f.ok('student.state',{},f.a);assert.equal(own.own.reason.comment,'我按这个理由选，但不理解为什么不能再归一化。'.normalize('NFKC'));
 assert(own.own.reasonOptionsVersion);assert(own.own.reasonOptions.length>=4);
 const stats=await f.ok('teacher.reasonStats',{roundId:r.id,questionId:'l07-q3'});assert.equal(stats.choices[0].comments.length,1);
 await f.ok('teacher.reveal',{roundId:r.id,questionId:'l07-q3'});
 const detail=await f.ok('teacher.analysisDetails',{roundId:r.id,questionId:'l07-q3'});assert.equal(detail.reasonRounds[0].choices[0].comments.length,1);
 assert.equal((await f.ok('teacher.export')).rows[0].reason.comment,own.own.reason.comment);
 await f.ok('teacher.open',{questionId:'l07-q3',roundId:r.id});const next=(await f.ok('teacher.state')).round;
 await f.ok('student.submit',{roundId:next.id,choice:'C'},f.a);assert.equal((await f.ok('student.state',{},f.a)).own.reason,null);
});
test('an analysis finishing after a newer round cannot overwrite the newer analysis cache',async()=>{
 const f=await fixture();await f.ok('teacher.open',{questionId:'l07-q3'});const firstRound=(await f.ok('teacher.state')).round;
 await f.ok('student.submit',{roundId:firstRound.id,choice:'A'},f.a);await f.ok('teacher.reveal',{roundId:firstRound.id});
 let unblock;f.hold(new Promise(resolve=>unblock=resolve));
 const first=f.ok('teacher.analyze',{questionId:'l07-q3',roundId:firstRound.id});
 while(f.calls()<1)await new Promise(resolve=>setImmediate(resolve));
 await f.ok('teacher.open',{questionId:'l07-q3',roundId:firstRound.id});const secondRound=(await f.ok('teacher.state')).round;
 await f.ok('student.submit',{roundId:secondRound.id,choice:'C'},f.a);await f.ok('teacher.reveal',{roundId:secondRound.id});
 const second=f.ok('teacher.analyze',{questionId:'l07-q3',roundId:secondRound.id});
 while(f.calls()<2)await new Promise(resolve=>setImmediate(resolve));unblock();
 const [old,current]=await Promise.all([first,second]);assert.equal(old.analysis.status,'idle');assert.equal(current.analysis.status,'ready');
 assert.equal((await f.ok('teacher.comparison',{questionId:'l07-q3',roundId:secondRound.id})).fingerprint,current.fingerprint);
});
test('analysis validation rejects ungrounded references, overlong summaries, answer disclosure and verbatim student text',()=>{
 const input={rounds:[{id:'round-1'}],reasonRounds:[{choices:[{comments:[{text:'把这句话直接放到课件中'}]}]}]};
 const valid={summary:'还需要核对运算步骤。',observations:[{text:'只对已填写者归纳。',evidence:['round-1']}],nextStep:'核对一次操作。',limitations:'原因可选。'};
 assert(validateAnalysis(valid,input));
 for(const summary of ['正确答案为 C','A、B渐减','讨论提高了掌握程度','把这句话直接放到课件中','字'.repeat(161)])assert.throws(()=>validateAnalysis({...valid,summary},input));
 assert.throws(()=>validateAnalysis({...valid,observations:[{text:'无依据',evidence:['round-9']}]},input));
 const result=snapshot(require('../functions/classroom/questions.json')[2],[{id:'x',number:1}],[]);assert.equal(result.public.rounds[0].total,0);assert(result.fingerprint);assert.equal(result.input.rounds[0].id,'round-1');assert.equal(result.public.rounds[0].id,'x');
});
