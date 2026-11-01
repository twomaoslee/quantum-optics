const test=require('node:test'),assert=require('node:assert/strict');
const {analyzer}=require('../functions/classroom/ai');
const {snapshot}=require('../functions/classroom/comparison');
const record=require('../functions/classroom/questions.json')[2];
const snap=snapshot(record,[{id:'private',number:1}],[]);
const valid={summary:'仍需核对运算步骤。建议逐步检查系数。',observations:[{text:'应核对操作系数，并通过补问确认推理。',evidence:['round-1']}],nextStep:'请学生口述操作步骤。'};
test('direct DeepSeek uses only the official server endpoint, validates output and bypasses CloudBase model SDK',async()=>{
 let calls=0;const analyze=analyzer(null,{provider:'deepseek',apiKey:'test-only-secret',fetchImpl:async(url,args)=>{
  calls++;assert.equal(url,'https://api.deepseek.com/chat/completions');assert.equal(args.headers.Authorization,'Bearer test-only-secret');assert.equal(args.redirect,'error');
  const p=JSON.parse(args.body);assert.equal(p.model,'deepseek-flash');assert.equal(p.stream,false);assert.equal(p.response_format.type,'json_object');assert.equal(p.thinking.type,'disabled');
  assert(!args.body.includes('test-only-secret'));return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(valid)}}]})};
 }});
 const out=await analyze(snap.input);assert.equal(out.provider,'deepseek');assert.equal(out.summary,valid.summary);assert.equal(calls,1);
 assert.notEqual(snapshot(record,[{id:'private',number:1}],[],'deepseek:deepseek-flash').fingerprint,snap.fingerprint);
});
test('DeepSeek fails closed on missing keys, HTTP errors, truncation or invalid output without a paid fallback or secret diagnostics',async()=>{
 await assert.rejects(analyzer(null,{provider:'deepseek'})(snap.input),{code:'AI_CONFIG'});
 for(const response of [{ok:false,status:401,json:async()=>({error:{message:'test-only-secret'}})},
  {ok:true,json:async()=>({choices:[{finish_reason:'length',message:{content:JSON.stringify(valid)}}]})},
  {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:' '}}]})}]){
  let calls=0;const run=analyzer(null,{provider:'deepseek',apiKey:'test-only-secret',fetchImpl:async()=>{calls++;return response;}});
  await assert.rejects(run(snap.input),e=>!String(e.message).includes('test-only-secret'));assert.equal(calls,1);
 }
});
