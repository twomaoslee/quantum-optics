(function(){
 'use strict';
 const config=window.QO_CLASSROOM_CONFIG||{},isTeacher=location.pathname.endsWith('teacher.html');
 const key='qo-cloud-session-v1:'+ (config.envId||'local') + ':'+(isTeacher?'teacher':'student');
 let app,initializing,offset=0;
 function stored(){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
 function save(value){if(value)localStorage.setItem(key,JSON.stringify(value));else localStorage.removeItem(key);}
 async function cloud(){
  if(!config.envId || !config.publishableKey)throw Object.assign(new Error('答题服务尚未开通，开通后此入口即可使用。'),{code:'CONFIG'});
  if(!initializing)initializing=(async()=>{
   if(!window.QOCloudbase)await load('vendor/cloudbase.js');
   app=QOCloudbase.init({env:config.envId,region:config.region,accessKey:config.publishableKey});
   const {data,error}=await app.auth.getSession();if(error)throw error;
   if(!data?.session){const signed=await app.auth.signInAnonymously();if(signed.error)throw signed.error;}
   return app;
  })().catch(e=>{initializing=null;throw e;});
  return initializing;
 }
 function load(src){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL(src,document.currentScript?.src || new URL('api.js',location.href)).href;script.onload=resolve;script.onerror=()=>reject(new Error('网络连接失败，请重试。'));document.head.append(script);});}
 async function call(action,data={},roomCode){
  const event={action,data,roomCode,token:stored()?.token};
  const started=Date.now();let result;
  try{
   if(config.dev){
    const response=await fetch(config.devEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(event),signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error('网络连接失败，请重试。');result=await response.json();
   }else result=(await (await cloud()).callFunction({name:config.functionName || 'classroom',data:event})).result;
  }catch(error){throw Object.assign(new Error(error.code==='CONFIG'?error.message:'连接失败，尚未确认操作结果。请重试或刷新检查。'),{code:error.code||'NETWORK'});}
  if(!result || typeof result.ok!=='boolean')throw new Error('服务返回异常，请稍后重试。');
  offset=result.serverTime-(started+Date.now())/2;
  if(!result.ok){if(result.error.code==='AUTH' && !action.endsWith('.login'))save(null);throw Object.assign(new Error(result.error.message),{code:result.error.code});}
  return result.data;
 }
 window.QOApi={call,save,stored,config,now:()=>Date.now()+offset};
})();
