/* Run explicitly after npm run dev. Uses installed Edge and the host QA runtime. */
const {chromium}=require(process.env.QO_PLAYWRIGHT || require('node:os').homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),jsqr=require('jsqr');
const out=path.resolve(__dirname,'../../qa/cloudbase');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',headless:true});
 const errors=[],contexts=[];const context=await browser.newContext({viewport:{width:1280,height:800},acceptDownloads:true});contexts.push(context);
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8765/classroom/teacher.html');await page.locator('#dev-login').click();await page.locator('#create').click();
 await page.waitForFunction(()=>!document.getElementById('classroom').hidden);
 const studentURL=await page.locator('#student-link').getAttribute('href'),room=new URL(studentURL).searchParams.get('room');assert.match(room,/^[A-F0-9]{12}$/);
 const pixels=await page.locator('#qr').evaluate(canvas=>({width:canvas.width,height:canvas.height,data:Array.from(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data)}));
 assert.equal(jsqr(new Uint8ClampedArray(pixels.data),pixels.width,pixels.height).data,studentURL);
 const pupils=[];
 for(let i=0;i<2;i++){
  const c=await browser.newContext({viewport:{width:390,height:844}});contexts.push(c);const s=await c.newPage();s.on('pageerror',e=>errors.push(e.message));
  await s.goto(studentURL);await s.locator('[name=name]').fill(i?'测试乙':'测试甲');await s.locator('[name=studentNumber]').fill(i?'000902':'000901');await s.locator('#login-form button').click();await s.locator('#workspace').waitFor({state:'visible'});pupils.push(s);
 }
 await page.locator('#open').click();
 for(const [i,s] of pupils.entries()){
  await s.evaluate(()=>QOApi.call('student.state',{},new URL(location.href).searchParams.get('room')));
  await s.reload();await s.locator('input[value='+ (i?'A':'C') +']').check();await s.locator('#submit').click();await s.locator('#receipt').filter({hasText:'已收到'}).waitFor();
 }
 await pupils[0].reload();await pupils[0].locator('#workspace').waitFor({state:'visible'});assert.match(await pupils[0].locator('#profile').innerText(),/测试甲/);assert.match(await pupils[0].locator('#receipt').innerText(),/答案 C/);
 await pupils[0].screenshot({path:path.join(out,'student-submitted.png'),fullPage:true});
 assert.equal(await pupils[0].locator('#result').isVisible(),false);
 await page.reload();await page.locator('#classroom').waitFor({state:'visible'});await page.waitForFunction(()=>document.getElementById('status').textContent.includes('2 人'));
 assert.equal(await page.locator('#stats').isVisible(),false);
 // Use the actual lecture slide, with the already authenticated teacher iframe.
 await page.goto('http://localhost:8765/lecture07.html#/l07-q1');await page.waitForFunction(()=>window.lecture07ClassroomReady);
 await page.locator('.qo-classroom-launch').waitFor({state:'visible'});await page.screenshot({path:path.join(out,'lecture-question.png')});await page.locator('.qo-classroom-launch').click();
 const frame=page.frameLocator('.qo-classroom-dialog iframe');await frame.locator('#classroom').waitFor({state:'visible'});await frame.locator('#reveal').click();
 await frame.locator('#stats').waitFor({state:'visible'});assert.match(await frame.locator('#counts').innerText(),/1人 50%/);
 await frame.locator('#analysis').click();await frame.locator('#explanation').filter({hasText:'答案 C'}).waitFor();
 await page.screenshot({path:path.join(out,'lecture-results.png')});
 await pupils[0].reload();await pupils[0].locator('#result').waitFor({state:'visible'});assert.equal(await pupils[0].locator('#submit').isEnabled(),false);
 // Named export stays behind the teacher token.
 const downloadEvent=page.waitForEvent('download');await frame.locator('#export').click();const download=await downloadEvent;const downloaded=await download.path();
 const csv=fs.readFileSync(downloaded,'utf8');assert.match(csv,/000901/);assert.match(csv,/000902/);assert.match(csv,/测试甲/);
 await frame.locator('#open').click();await pupils[0].reload();await pupils[0].waitForFunction(()=>!document.getElementById('choices').disabled);assert.equal(await pupils[0].locator('#receipt').innerText(),'');
 await page.locator('.qo-classroom-dialog header button').click();assert.equal(await page.locator('.qo-classroom-dialog').isVisible(),false);
 await page.evaluate(()=>Reveal.next());assert.equal(await page.locator('.qo-classroom-launch').isVisible(),true); // existing answer fragment
 await page.evaluate(()=>Reveal.next());assert.equal(await page.locator('.qo-classroom-launch').isVisible(),false);
 assert.equal(await pupils[0].evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 // A new browser's localStorage cannot read either pupil's server-side answer.
 const stranger=await browser.newContext();contexts.push(stranger);const p=await stranger.newPage();await p.goto(studentURL);assert.equal(await p.locator('#login').isVisible(),true);
 const forbidden=await pupils[0].evaluate(async()=>QOApi.call('teacher.export',{},new URL(location.href).searchParams.get('room')).catch(e=>e.code));assert.equal(forbidden,'FORBIDDEN');
 // Verify the bundled SDK's actual browser interface without cloud credentials.
 await p.addScriptTag({url:'http://localhost:8765/classroom/vendor/cloudbase.js'});
 const sdkShape=await p.evaluate(()=>{const app=QOCloudbase.init({env:'test-not-connected',region:'ap-shanghai',accessKey:'test-publishable-key'});return [typeof app.auth.getSession,typeof app.auth.signInAnonymously,typeof app.callFunction];});
 assert.deepEqual(sdkShape,['function','function','function']);
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify({passed:true,browser:'Microsoft Edge (headless)',viewport:'1280×800; student 390×844',checks:['actual lecture first question and original answer fragment','QR decoded to student URL','independent student storage contexts','server-stored answer restore after refresh','live count hidden before reveal','manual reveal and explanation','teacher CSV export across named users','new round with cleared current answer','unauthorized export rejected','student mobile no horizontal overflow'],cloudDeployment:'pending account/environment',pageErrors:errors},null,2));
 await browser.close();console.log('PASS: real deck, QR, independent students, login restore, manual reveal, export and access controls.');
})().catch(e=>{console.error(e);process.exit(1);});
