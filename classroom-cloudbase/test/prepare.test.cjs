const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
test('configuration preparation keeps teacher secrets private and preserves the existing password',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'qo-cloud-prepare-')),root=path.join(temp,'backend');
 try{
  for(const folder of ['scripts','functions/classroom'])fs.mkdirSync(path.join(root,folder),{recursive:true});fs.mkdirSync(path.join(temp,'classroom'));
  for(const file of ['scripts/prepare.cjs','functions/classroom/service.js','functions/classroom/questions.json','functions/classroom/reasons.json','functions/classroom/comparison.js','cloudbaserc.example.json'])fs.copyFileSync(path.resolve(__dirname,'..',file),path.join(root,file));
  const args=[path.join(root,'scripts/prepare.cjs'),'--env-id','test-env-000','--region','ap-shanghai','--publishable-key','public-test-key','--gateway-url','https://test-env-000-123.ap-shanghai.app.tcloudbase.com/classroom-api'];
  execFileSync(process.execPath,args);
  const privateFile=path.join(root,'.local/teacher-login.json'),login=JSON.parse(fs.readFileSync(privateFile,'utf8')),config=JSON.parse(fs.readFileSync(path.join(root,'cloudbaserc.json'),'utf8')),client=fs.readFileSync(path.join(temp,'classroom/config.js'),'utf8');
  assert.equal(fs.statSync(privateFile).mode&0o777,0o600);assert(!client.includes(login.password));assert(!client.includes(config.functions[0].envVariables.QO_TEACHER_PASSWORD_HASH));assert(client.includes('public-test-key'));assert(client.includes('gatewayUrl'));assert(client.includes('/classroom-api'));
  config.functions[0].envVariables={...config.functions[0].envVariables,QO_AI_PROVIDER:'deepseek',QO_AI_MODEL:'deepseek-flash',DEEPSEEK_API_KEY:'test-only-private-key'};
  fs.writeFileSync(path.join(root,'cloudbaserc.json'),JSON.stringify(config));fs.chmodSync(path.join(root,'cloudbaserc.json'),0o644);
  execFileSync(process.execPath,args);assert.equal(JSON.parse(fs.readFileSync(privateFile,'utf8')).password,login.password);
  const retained=JSON.parse(fs.readFileSync(path.join(root,'cloudbaserc.json'),'utf8'));
  assert.equal(retained.functions[0].envVariables.DEEPSEEK_API_KEY,'test-only-private-key');assert.equal(retained.functions[0].envVariables.QO_AI_PROVIDER,'deepseek');
  assert.equal(fs.statSync(path.join(root,'cloudbaserc.json')).mode&0o777,0o600);assert(!fs.readFileSync(path.join(temp,'classroom/config.js'),'utf8').includes('test-only-private-key'));
  const different=[...args];different[different.indexOf('test-env-000')]='test-env-001';different[different.indexOf('https://test-env-000-123.ap-shanghai.app.tcloudbase.com/classroom-api')]='https://test-env-001-123.ap-shanghai.app.tcloudbase.com/classroom-api';execFileSync(process.execPath,different);
  const moved=JSON.parse(fs.readFileSync(path.join(root,'cloudbaserc.json'),'utf8'));assert.equal(moved.functions[0].envVariables.DEEPSEEK_API_KEY,undefined);assert.equal(moved.functions[0].envVariables.QO_AI_PROVIDER,undefined);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
