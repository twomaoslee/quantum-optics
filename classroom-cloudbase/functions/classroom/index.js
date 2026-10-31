'use strict';
const cloudbase = require('@cloudbase/node-sdk');
const {createService} = require('./service');
const {cloudRepository} = require('./repository');
const app = cloudbase.init({env:cloudbase.SYMBOL_CURRENT_ENV});
const service = createService(cloudRepository(app.database()), {teacherPasswordHash:process.env.QO_TEACHER_PASSWORD_HASH});
exports.main = async (event,context) => {
  // Identity comes from the trusted SDK context, never from event data.
  const auth = app.auth().getUserInfo();
  const caller = auth.uid || auth.openId;
  if(!caller)return {ok:false,error:{code:'AUTH',message:'请刷新页面，重新建立连接。'},serverTime:Date.now()};
  return service.handle(event,caller);
};
