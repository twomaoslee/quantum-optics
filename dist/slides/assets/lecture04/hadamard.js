(()=>{'use strict';
const $=id=>document.getElementById(id),classroom=new URLSearchParams(location.search).get('classroom')==='1';document.documentElement.classList.toggle('classroom',classroom);
const s={input:0,angle:0,running:false,seen:[false,false]},duration=1300;let frame=0,previous=0;
const project=([x,y,z])=>[240+164*(Math.sqrt(3)/2*x-.5*y),200+164*(.25*x+Math.sqrt(3)/4*y-Math.sqrt(3)/2*z)];
function rotated(a,input){const sign=input===0?1:-1;return [sign*(1-Math.cos(a))/2,-sign*Math.sin(a)/Math.sqrt(2),sign*(1+Math.cos(a))/2];}
function resize(){const h=classroom?496:675,k=Math.min(innerWidth/1200,innerHeight/h);$('stage').style.transform=`scale(${k})`;$('stage').style.left=`${(innerWidth-1200*k)/2}px`;$('stage').style.top=`${(innerHeight-h*k)/2}px`;}
function draw(){
 const v=rotated(s.angle,s.input),p=project(v);
 $('vector').setAttribute('x2',p[0]);$('vector').setAttribute('y2',p[1]);$('tip').setAttribute('cx',p[0]);$('tip').setAttribute('cy',p[1]);$('sphere').setAttribute('data-vector',JSON.stringify(v));
 // Sample the same rotation as the moving tip, only up to its current angle.
 // Reconstructing from the angle keeps the trail intact across pause/resume.
 const n=Math.ceil(s.angle/(Math.PI/180)),points=[];
 if(n)for(let i=0;i<=n;i++)points.push(project(rotated(s.angle*i/n,s.input)).join(','));
 $('trail').setAttribute('points',points.join(' '));
 const start=project(rotated(0,s.input));$('trail-start').setAttribute('cx',start[0]);$('trail-start').setAttribute('cy',start[1]);$('trail-start').style.display=n?'':'none';
}
function labels(){const done=s.angle>=Math.PI,key=done?(s.input?'ketminus':'ketplus'):s.angle===0?(s.input?'ket1':'ket0'):'moving';['ket0','ket1','ketplus','ketminus','moving'].forEach(id=>$(id).hidden=id!==key);$('apply').textContent=done?'已施加 H 门':s.running?'暂停':s.angle>0?'继续':'施加 H 门';$('apply').disabled=done;$('probability').hidden=!done;$('conclusion').hidden=!done;$('zero').setAttribute('aria-pressed',s.input===0);$('one').setAttribute('aria-pressed',s.input===1);$('rule0').classList.toggle('selected',s.input===0);$('rule1').classList.toggle('selected',s.input===1);}
function stop(){cancelAnimationFrame(frame);s.running=false;previous=0;labels();}
function tick(now){if(!s.running)return;if(previous)s.angle=Math.min(Math.PI,s.angle+(now-previous)*Math.PI/duration);previous=now;draw();if(s.angle>=Math.PI){s.seen[s.input]=true;stop();}else frame=requestAnimationFrame(tick);}
function start(){if(s.angle>=Math.PI)return;s.running=true;previous=0;labels();frame=requestAnimationFrame(tick);}
function reset(clear=false){stop();s.angle=0;if(clear)s.seen=[false,false];draw();labels();}
function setInput(input){s.input=input;reset();}
$('zero').onclick=()=>setInput(0);$('one').onclick=()=>setInput(1);$('apply').onclick=()=>s.running?stop():start();$('reset').onclick=()=>reset(true);$('full').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();
let grid='';for(let plane=0;plane<3;plane++){const points=[];for(let j=0;j<=120;j++){const t=j*Math.PI/60,v=plane===0?[Math.cos(t),Math.sin(t),0]:plane===1?[Math.cos(t),0,Math.sin(t)]:[0,Math.cos(t),Math.sin(t)];points.push(project(v).join(','));}grid+=`<polyline points="${points.join(' ')}"/>`;}$('grid').innerHTML=grid;
$('axes').innerHTML=[0,1,2].map(i=>{const v=[0,0,0];v[i]=1.12;const p=project(v),q=project(v.map(x=>-x));return `<line x1="${q[0]}" y1="${q[1]}" x2="${p[0]}" y2="${p[1]}"/><text x="${p[0]+8}" y="${p[1]+4}">${'xyz'[i]}</text>`;}).join('');
addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});addEventListener('message',e=>{if(e.source===parent&&e.data?.type==='lecture04-visibility'&&!e.data.active)stop();});
addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','PageDown','PageUp'].includes(e.key)&&parent!==window){e.preventDefault();stop();parent.postMessage({type:'lecture04-navigation',key:e.key},'*');}});
window.HadamardLab={getState:()=>({...s,seen:[...s.seen],vector:rotated(s.angle,s.input)}),rotated};draw();labels();resize();
})();
