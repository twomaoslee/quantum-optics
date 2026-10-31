const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
test('configuration preparation keeps teacher secrets private and preserves the existing password',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'qo-cloud-prepare-')),root=path.join(temp,'backend');
 try{
  for(const folder of ['scripts','functions/classroom'])fs.mkdirSync(path.join(root,folder),{recursive:true});fs.mkdirSync(path.join(temp,'classroom'));
  for(const file of ['scripts/prepare.cjs','functions/classroom/service.js','cloudbaserc.example.json'])fs.copyFileSync(path.resolve(__dirname,'..',file),path.join(root,file));
  const args=[path.join(root,'scripts/prepare.cjs'),'--env-id','test-env-000','--region','ap-shanghai','--publishable-key','public-test-key'];
  execFileSync(process.execPath,args);
  const privateFile=path.join(root,'.local/teacher-login.json'),login=JSON.parse(fs.readFileSync(privateFile,'utf8')),config=JSON.parse(fs.readFileSync(path.join(root,'cloudbaserc.json'),'utf8')),client=fs.readFileSync(path.join(temp,'classroom/config.js'),'utf8');
  assert.equal(fs.statSync(privateFile).mode&0o777,0o600);assert(!client.includes(login.password));assert(!client.includes(config.functions[0].envVariables.QO_TEACHER_PASSWORD_HASH));assert(client.includes('public-test-key'));
  execFileSync(process.execPath,args);assert.equal(JSON.parse(fs.readFileSync(privateFile,'utf8')).password,login.password);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
