/* Prepare configuration after the user creates the CloudBase environment.
 * No Tencent SecretId/SecretKey is accepted or needed by this script.
 */
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {passwordHash}=require('../functions/classroom/service');
(async()=>{
 const args=process.argv.slice(2),values={};
 for(let i=0;i<args.length;i+=2){if(!['--env-id','--region','--publishable-key'].includes(args[i])||!args[i+1])throw new Error('Usage: node scripts/prepare.cjs --env-id ID --region ap-shanghai --publishable-key PUBLIC_KEY');values[args[i]]=args[i+1];}
 const envId=values['--env-id'],region=values['--region']||'ap-shanghai',publishableKey=values['--publishable-key'];
 if(!/^[A-Za-z0-9_-]{4,100}$/.test(envId||'') || !/^[a-z]{2}-[a-z]+$/.test(region) || !publishableKey || /secret/i.test(publishableKey))throw new Error('Provide the environment ID, region and Publishable Key (not SecretKey).');
 const root=path.resolve(__dirname,'..'),privateDir=path.join(root,'.local');await fs.mkdir(privateDir,{recursive:true,mode:0o700});
 const passwordFile=path.join(privateDir,'teacher-login.json');let login;
 try{login=JSON.parse(await fs.readFile(passwordFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;login={password:crypto.randomBytes(20).toString('base64url')};await fs.writeFile(passwordFile,JSON.stringify(login,null,2)+'\n',{mode:0o600,flag:'wx'});}
 const config=JSON.parse(await fs.readFile(path.join(root,'cloudbaserc.example.json'),'utf8'));config.envId=envId;
 config.functions[0].envVariables={QO_TEACHER_PASSWORD_HASH:await passwordHash(login.password)};
 await fs.writeFile(path.join(root,'cloudbaserc.json'),JSON.stringify(config,null,2)+'\n',{mode:0o600});
 await fs.writeFile(path.resolve(root,'../classroom/config.js'),'/* Public config: no teacher credential or Tencent SecretKey. */\nwindow.QO_CLASSROOM_CONFIG = Object.freeze('+JSON.stringify({envId,region,publishableKey,functionName:'classroom'},null,2)+');\n');
 console.log('Prepared public frontend configuration and private deployment configuration. Teacher login is in .local/teacher-login.json; never publish that folder.');
})().catch(error=>{console.error(error.message);process.exit(1);});
