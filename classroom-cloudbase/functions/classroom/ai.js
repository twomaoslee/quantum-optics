'use strict';
const {SYSTEM,validateAnalysis}=require('./comparison');
function analyzer(app,{provider='cloudbase',model=provider==='deepseek'?'deepseek-flash':'hy3',apiKey='',fetchImpl=globalThis.fetch}={}){
 return async input=>{
  const payload={model,messages:[{role:'system',content:SYSTEM},{role:'user',content:JSON.stringify(input)}],
   temperature:0.2,max_tokens:1600,thinking:{type:'disabled'},response_format:{type:'json_object'}};
  let result;
  if(provider==='deepseek'){
   if(!apiKey.trim())throw Object.assign(new Error('DeepSeek API key is not configured.'),{code:'AI_CONFIG'});
   // Fixed official endpoint; no browser exposure, arbitrary proxy, or paid fallback.
   let response;
   try{response=await fetchImpl('https://api.deepseek.com/chat/completions',{method:'POST',redirect:'error',
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+apiKey.trim()},body:JSON.stringify({...payload,stream:false}),signal:AbortSignal.timeout(45000)});}
   catch{throw Object.assign(new Error('DeepSeek request failed or timed out.'),{code:'AI_PROVIDER'});}
   if(!response.ok)throw Object.assign(new Error('DeepSeek HTTP '+response.status),{code:'AI_HTTP_'+response.status});
   let data;try{data=await response.json();}catch{throw new Error('AI_FORMAT');}
   if(data.choices?.[0]?.finish_reason!=='stop')throw new Error('AI_INCOMPLETE');
   result={text:data.choices[0].message?.content};
  }else result=await app.ai().createModel(provider).generateText(payload);
  if(result.error){const detail=result.error.response?.data||result.error.data||result.error.message||'AI_PROVIDER';const error=new Error((typeof detail==='string'?detail:JSON.stringify(detail)).slice(0,200));error.code=result.error.code||'AI_PROVIDER';throw error;}
  try{return {...validateAnalysis(result.text,input),model,provider};}
  catch(error){error.candidate=String(result.text||'').slice(0,6000);throw error;}
 };
}
module.exports={analyzer};
