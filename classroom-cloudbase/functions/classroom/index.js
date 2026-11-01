'use strict';
const cloudbase = require('@cloudbase/node-sdk');
const {createService} = require('./service');
const {cloudRepository} = require('./repository');
const {decodeRequest} = require('./transport');
const {analyzer} = require('./ai');
const app = cloudbase.init({env:cloudbase.SYMBOL_CURRENT_ENV});
const aiApp=cloudbase.init({env:cloudbase.SYMBOL_CURRENT_ENV,timeout:45000});
const provider=process.env.QO_AI_PROVIDER||'cloudbase',model=process.env.QO_AI_MODEL||(provider==='deepseek'?'deepseek-flash':'hy3');
const service = createService(cloudRepository(app.database()), {teacherPasswordHash:process.env.QO_TEACHER_PASSWORD_HASH,
 analysisNamespace:provider==='cloudbase'&&model==='hy3'?'':provider+':'+model,
 analyze:analyzer(aiApp,{provider,model,apiKey:process.env.DEEPSEEK_API_KEY||''})});
exports.main = async (event,context) => {
  // Identity comes from the trusted SDK context, never from event data.
  const auth = app.auth().getUserInfo();
  const caller = auth.uid || auth.openId;
  if(!caller)return {ok:false,error:{code:'AUTH',message:'请刷新页面，重新建立连接。'},serverTime:Date.now()};
  let request;
  try { request = decodeRequest(event); }
  catch { return {ok:false,error:{code:'INPUT',message:'请求格式错误。'},serverTime:Date.now()}; }
  return service.handle(request,caller);
};
