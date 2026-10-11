/* Lecture 04: self-contained teaching interactions, shared by four local pages. */
(() => {
'use strict';
const $=id=>document.getElementById(id), kind=document.body.dataset.lab;
document.documentElement.classList.toggle('classroom',new URLSearchParams(location.search).get('classroom')==='1');
const state={step:0,theta:0,phi:0,viewAngle:30,basis:'z',view:'probabilities',samples:[[],[]]};
const tex=s=>`\\(${s}\\)`, display=s=>`<div class="math">\\[${s}\\]</div>`;
const ket=s=>`\\lvert ${s}\\rangle`, zero=ket('0'), one=ket('1');
const plus=ket('+'), minus=ket('-'), bell=`\\frac{${ket('00')}+${ket('11')}}{\\sqrt2}`;
function resize(){const frameHeight=document.documentElement.classList.contains('classroom')?490:675;const scale=Math.min(innerWidth/1200,innerHeight/frameHeight);const el=$('stage');el.style.transform=`scale(${scale})`;el.style.left=`${(innerWidth-1200*scale)/2}px`;el.style.top=`${(innerHeight-frameHeight*scale)/2}px`;}
addEventListener('resize',resize);
function math(){if(window.MathJax?.typesetPromise) window.MathJax.typesetPromise([$ ('stage')]).catch(()=>{});}
const button=(id,title,primary=false,extra='')=>`<button id="${id}" class="${primary?'primary':''}" ${extra}>${title}</button>`;
function controls(html){$('toolbar').innerHTML=html+'<span class="spacer"></span>'+button('fullscreen','全屏 ↗');$('fullscreen').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();}
function project(v){const a=(kind==='local'?state.viewAngle:30)*Math.PI/180;return [160+104*(Math.cos(a)*v[0]-Math.sin(a)*v[1]),135+104*(.5*Math.sin(a)*v[0]+.5*Math.cos(a)*v[1]-Math.sqrt(3)/2*v[2])];}
// Every geometric element uses the same orthographic projection as the vector.
const direction=(theta,phi)=>[Math.sin(theta)*Math.cos(phi),Math.sin(theta)*Math.sin(phi),Math.cos(theta)];
const path3=points=>points.map((v,i)=>(i?'L':'M')+project(v).join(',')).join(' ');
const arc3=(fn,end)=>{const n=Math.max(2,Math.ceil(Math.abs(end)*40)+1);return Array.from({length:n},(_,i)=>fn(end*i/(n-1)));};
function sphere(v,axis=false,id='sphere',angles=null){
 const p=project(v),q=project(v.map(x=>-x));
 const line=(a,b,attrs='')=>{const u=project(a),w=project(b);return `<line x1="${u[0]}" y1="${u[1]}" x2="${w[0]}" y2="${w[1]}" ${attrs}/>`;};
 const label=(point,name,dx=0,dy=0,cls='')=>{const [x,y]=project(point);return `<text x="${x+dx}" y="${y+dy}" class="${cls}" text-anchor="middle" dominant-baseline="middle">${name}</text>`;};
 const grid=[0,1,2].map(i=>{const e=[0,0,0];e[i]=1.13;return line(e.map(x=>-x),e)+label(e,'xyz'[i],i===0?10:i===1?-10:10,i===2?-4:6);}).join('');
 let guides='',angleMarks='';
 if(angles){
  const {theta:t,phi:f}=angles,radial=[Math.cos(f),Math.sin(f),0],foot=[v[0],v[1],0];
  // The meridian and the perpendicular drop locate the 3D vector on the sphere.
  guides=`<path d="${path3(arc3(a=>direction(a,f),Math.PI*2))}" class="meridian"/>`;
  if(Math.abs(Math.sin(t))>1e-8)guides+=line([0,0,0],radial,'class="projection-guide"')+line(v,foot,'class="projection-guide"');
  const polar=arc3(a=>direction(a,f).map(x=>.43*x),t);
  const azimuth=arc3(a=>[.67*Math.cos(a),.67*Math.sin(a),0],f);
  if(t>1e-8)angleMarks+=`<path data-angle="theta" d="${path3(polar)}" class="angle-polar"/>`;
  if(f>1e-8&&Math.abs(Math.sin(t))>1e-8)angleMarks+=`<path data-angle="phi" d="${path3(azimuth)}" class="angle-azimuth"/>`;
  const thetaLabel=direction(t/2,f).map(x=>.59*x);
  angleMarks+=label(thetaLabel,'θ',13,-2,'angle-label polar-label');
  if(Math.abs(Math.sin(t))>1e-8)angleMarks+=label([.86*Math.cos(f/2),.86*Math.sin(f/2),0],'φ',0,14,'angle-label azimuth-label');
 }
 const arrow=(end,name)=>{
  const tip=project(end),dx=tip[0]-160,dy=tip[1]-135,n=Math.hypot(dx,dy);
  if(n<1e-6)return `<circle cx="160" cy="135" r="5" fill="#0872b8"/>${label([0,0,0],name,name==='u'?18:-18,name==='u'?-12:12)}`;
  const ux=dx/n,uy=dy/n,bx=tip[0]-10*ux,by=tip[1]-10*uy;
  return `<line data-vector="${name}" x1="160" y1="135" x2="${tip[0]}" y2="${tip[1]}" stroke="#0872b8" stroke-width="3.5"/><polygon points="${tip[0]},${tip[1]} ${bx-4.5*uy},${by+4.5*ux} ${bx+4.5*uy},${by-4.5*ux}" fill="#0872b8"/>${label(end,name,-20*uy,20*ux,'vector-label')}`;
 };
 return `<svg class="sphere" viewBox="0 0 320 275" role="img" aria-label="${axis?'A的测量轴；u为正方向，v为反方向；极角从正z轴量起，方位角在赤道平面内从正x轴量起':'当前量子态的布洛赫向量'}" id="${id}"><circle cx="160" cy="135" r="104" fill="#f8fbfe" stroke="#a6c5db"/><path d="${path3(arc3(a=>[Math.cos(a),Math.sin(a),0],Math.PI*2))}" fill="none" stroke="#a6c5db"/><g class="sphere-grid" stroke="#c4d9e8" fill="#587287">${grid}</g>${guides}${angleMarks}${axis?arrow(v,'u')+arrow(v.map(x=>-x),'v'):line([0,0,0],v,'stroke="#0872b8" stroke-width="4"')+`<circle cx="${p[0]}" cy="${p[1]}" r="7" fill="#0872b8"/>`}<circle cx="160" cy="135" r="2.5" fill="#587287"/></svg>`;
}
const fmt=x=>Math.abs(x)<1e-12?'0':Math.abs(x-1)<1e-12?'1':x.toFixed(3);
function probTable(probs,labels=['00','01','10','11'],amps=null){return `<table id="probability-table"><thead><tr><th>联合结果</th>${amps?'<th>概率幅</th>':''}<th>概率</th></tr></thead><tbody>${probs.map((p,i)=>`<tr><td>${labels[i]}</td>${amps?`<td>${tex(amps[i])}</td>`:''}<td data-prob="${i}">${fmt(p)}</td></tr>`).join('')}</tbody></table>`;}
function bar(label,p){return `<div class="barrow"><span>${label}</span><div class="bartrack"><div class="barfill" style="width:${100*p}%"></div></div><span>${fmt(p)}</span></div>`;}
function gates(){const s=state.step;
controls(button('next-step',s===0?'施加第一次 H':s===1?'施加第二次 H':'两步已完成',true,s===2?'disabled':'')+button('reset','重置')+`<span class="step-note">${['初态','第一次操作后','第二次操作后'][s]}</span>`);
$('content').innerHTML=`<div class="columns" style="grid-template-columns:340px 290px 1fr"><section class="column"><h3>本页使用的规则</h3><div class="rule">${display(`U_{\\mathrm H}${zero}=${plus}`)}${display(`U_{\\mathrm H}${one}=${minus}`)}${display(`${plus}=\\frac{${zero}+${one}}{\\sqrt2}`)}${display(`${minus}=\\frac{${zero}-${one}}{\\sqrt2}`)}</div></section><section class="column"><h3 style="text-align:center">${s===0?'输入态':'当前输出态'}</h3>${sphere(s===1?[1,0,0]:[0,0,1])}<div class="center-label current">${tex(s===1?plus:zero)}</div></section><section class="column"><h3>${s===0?'先预测，再进行门操作':s===1?'第一次：得到叠加态':'第二次：概率幅相加'}</h3>${s===0?`<p class="prompt">连续施加两次 H，<br>最后会得到哪个态？</p>`:s===1?`${display(`U_{\\mathrm H}${zero}=\\frac{${zero}+${one}}{\\sqrt2}`)}<p class="prompt">再施加一次 H，<br>两个输出怎样相加？</p>`:`${display(`U_{\\mathrm H}${plus}=\\frac{${plus}+${minus}}{\\sqrt2}`)}${display(`=\\frac{(1+1)${zero}+(1-1)${one}}{2}`)}${display(`=${zero}`)}<p class="quiet">零态的概率幅相加，<br>一态的概率幅相消。</p>`}</section></div>`;
$('next-step').onclick=()=>{state.step=Math.min(2,state.step+1);render();};$('reset').onclick=()=>{state.step=0;render();};}
function prepare(){const s=state.step,states=[ket('00'),`\\frac{${ket('00')}+${ket('10')}}{\\sqrt2}`,bell], probs=s===0?[1,0,0,0]:s===1?[.5,0,.5,0]:[.5,0,0,.5],amps=s===0?['1','0','0','0']:s===1?['1/\\sqrt2','0','1/\\sqrt2','0']:['1/\\sqrt2','0','0','1/\\sqrt2'];
controls(button('next-step',s===0?'对 A 施加 H':s===1?'施加 CNOT':'两步已完成',true,s===2?'disabled':'')+button('reset','重置')+'<span class="step-note">A 为控制比特，B 为目标比特</span>');
$('content').innerHTML=`<div class="chain">${['初态','H 作用于 A 后','CNOT 作用后'].map((t,i)=>`${i?`<div class="arrow" style="visibility:${i<=s?'visible':'hidden'}">${i===1?'H<sub>A</sub>':'CNOT'}<br>→</div>`:''}<div class="phase ${i===s?'active':''} ${i>s?'future':''}"><div class="caption">${t}</div>${i<=s?display(states[i]):'<div class="math">?</div>'}</div>`).join('')}</div><div class="result-row"><section class="state-result"><h3>${s===0?'第一步：制备叠加态':s===1?'第二步：受控翻转':'制备完成：得到 Bell 态'}</h3>${s===0?`${display(`U_{\\mathrm H}${zero}=\\frac{${zero}+${one}}{\\sqrt2}`)}<p class="quiet">B 保持 ${tex(zero)}，写出此时的联合态。</p>`:s===1?`${display(`${ket('00')}\\mapsto${ket('00')},\\quad${ket('01')}\\mapsto${ket('01')}`)}${display(`${ket('10')}\\mapsto${ket('11')},\\quad${ket('11')}\\mapsto${ket('10')}`)}<p class="quiet">逐项变换，保留概率幅后相加。</p>`:`${display(`${ket('\\Phi^+')}=${bell}`)}<p class="quiet">测量得到 00 或 11，各占一半。</p>`}</section><section>${probTable(probs,undefined,amps)}</section></div>`;
$('next-step').onclick=()=>{state.step=Math.min(2,state.step+1);render();};$('reset').onclick=()=>{state.step=0;render();};}
function localProb(theta){const c=Math.cos(theta*Math.PI/360)**2;return [c/2,(1-c)/2,(1-c)/2,c/2];}
function local(){
controls('');
const axisKeys=button('axis-z','z',false,'aria-label="沿 z 测量"')+button('axis-x','x',false,'aria-label="沿 x 测量"')+button('axis-y','y',false,'aria-label="沿 y 测量"');
const slider=(id,title,symbol,max,value)=>`<label class="axis-slider" for="${id}"><span>${title} ${tex(symbol)}</span><input id="${id}" type="range" min="0" max="${max}" value="${value}" aria-label="A测量轴${title}"><output id="${id}-value">${value}°</output></label>`;
const jointCell=(label,index)=>`<div class="joint-cell"><div class="prob-value"><span>${tex(`P(${label})`)}</span><output data-prob="${index}"></output></div><div class="bartrack"><div class="barfill" data-joint-bar="${index}"></div></div></div>`;
const resultRow=(outcome,start)=>`<div class="prob-merge-row">${jointCell(outcome+'0',start)}<span class="merge-plus" aria-hidden="true">+</span>${jointCell(outcome+'1',start+1)}<span class="merge-arrow" aria-hidden="true">=</span><div class="marginal-cell"><div class="prob-value"><span>${tex(`P(${outcome})`)}</span><output>0.500</output></div><div class="bartrack"><div class="barfill" style="width:50%"></div></div></div></div>`;
$('content').innerHTML=`<div class="measurement-layout">
<section class="axis-panel"><div class="axis-panel-heading"><h3>A 的测量轴</h3><div class="axis-presets" aria-label="选择测量方向">${axisKeys}</div></div>
<div class="axis-view"><div id="axis-plot"></div>${button('rotate-view','转动视角',false,'title="转动观察视角，测量方向保持不变"')}</div>
<div class="axis-sliders">${slider('theta','极角','\\theta',180,state.theta)}${slider('phi','方位角','\\varphi',360,state.phi)}</div></section>
<section class="probability-panel"><div class="fixed-state"><div class="math">${tex(`${ket('\\Phi^+')}=${bell}`)}</div><p>B 沿 z 方向测量</p></div>
<div class="probability-headings"><h3>联合概率</h3><h3>A 的局部概率</h3></div>
<div id="joint-probs" class="probability-rows" aria-label="联合概率按A的结果相加">${resultRow('u',0)}${resultRow('v',2)}</div>
<div class="marginal-explanation"><div class="local-location"><svg class="local-center" viewBox="35 10 150 145" role="img" aria-label="A的局部布洛赫点位于球心"><circle cx="110" cy="81" r="63" fill="#f8fbfe" stroke="#a6c5db"/><ellipse cx="110" cy="81" rx="63" ry="31.5" fill="none" stroke="#c4d9e8"/><path d="M110 18V144M47 81H173" stroke="#c4d9e8"/><circle cx="110" cy="81" r="5" fill="#0872b8"/></svg><div class="local-state-copy"><h3>A 的局部状态</h3><p>完全混合态，对应球心。</p></div></div></div>
</section></div>`;
function update(){
const t=state.theta*Math.PI/180,p=state.phi*Math.PI/180;
$('axis-plot').innerHTML=sphere(direction(t,p),true,'measurement-axis',{theta:t,phi:p});
localProb(state.theta).forEach((prob,i)=>{document.querySelector(`[data-prob="${i}"]`).textContent=fmt(prob);document.querySelector(`[data-joint-bar="${i}"]`).style.width=100*prob+'%';});
$('theta-value').textContent=state.theta+'°';$('phi-value').textContent=state.phi+'°';
[['axis-z',0,0],['axis-x',90,0],['axis-y',90,90]].forEach(([id,t,p])=>$(id).setAttribute('aria-pressed',String(state.theta===t&&(t===0||state.phi%360===p))));
}
$('rotate-view').onclick=()=>{state.viewAngle=(state.viewAngle+90)%360;update();};
$('theta').oninput=e=>{state.theta=+e.target.value;update();};$('phi').oninput=e=>{state.phi=+e.target.value;update();};
[['axis-z',0,0],['axis-x',90,0],['axis-y',90,90]].forEach(([id,t,p])=>{$(id).onclick=()=>{state.theta=t;state.phi=p;$('theta').value=t;$('phi').value=p;update();};});update();}

function theoretical(basis,which){return which===0||basis==='z'?[.5,0,0,.5]:[.25,.25,.25,.25];}
function sampleIndex(probs,r=Math.random()){let total=0;for(let i=0;i<4;i++){total+=probs[i];if(r<total)return i;}return 3;}
function compare(){const x=state.basis==='x',records=state.view==='records',labels=x?['++','+−','−+','−−']:['00','01','10','11'];
controls(button('basis-z','两者都沿 z',false,`aria-pressed="${!x}"`)+button('basis-x','两者都沿 x',false,`aria-pressed="${x}"`)+button('sample','模拟 12 对',true)+button('reset','清空')+button('toggle-view',records?'查看统计':'查看配对记录')+`<span class="step-note">各 ${state.samples[0].length} 对</span>`);
$('content').innerHTML=`<div class="comparison">${[0,1].map(which=>{const samples=state.samples[which],counts=[0,0,0,0];samples.forEach(i=>counts[i]++);const probs=theoretical(state.basis,which);const recent=samples.slice(-4);return `<section><h3>${which===0?'Bell 纯态':'随机混合'}</h3><div class="compare-state">${which===0?tex(`${ket('\\Phi^+')}=${bell}`):tex(`\\tfrac12:${ket('00')},\\quad\\tfrac12:${ket('11')}`)}</div>${records?`<table class="sample-table" id="records-${which}"><thead><tr><th>对号</th><th>A</th><th>B</th></tr></thead><tbody>${Array.from({length:4},(_,j)=>{const i=recent[j],str=i===undefined?'':labels[i];return `<tr><td>${i===undefined?'—':samples.length-recent.length+j+1}</td><td>${str[0]||'—'}</td><td>${str[1]||'—'}</td></tr>`;}).join('')}</tbody></table><p class="compare-foot">最近 4 对记录；每行是一对。</p>`:`<table class="compare-table"><thead><tr><th>结果</th><th>理论概率</th><th>次数</th><th>频率</th></tr></thead><tbody>${probs.map((p,i)=>`<tr><td>${labels[i]}</td><td data-theory="${which}-${i}">${fmt(p)}</td><td>${counts[i]}</td><td>${samples.length?fmt(counts[i]/samples.length):'—'}</td></tr>`).join('')}</tbody></table><p class="compare-foot">${x?'＋':'0'}频率：A ${samples.length?fmt((counts[0]+counts[1])/samples.length):'—'} / B ${samples.length?fmt((counts[0]+counts[2])/samples.length):'—'}</p>`}</section>`;}).join('')}</div>`;
$('basis-z').onclick=()=>{state.basis='z';state.samples=[[],[]];render();};$('basis-x').onclick=()=>{state.basis='x';state.samples=[[],[]];render();};$('sample').onclick=()=>{[0,1].forEach(w=>{for(let j=0;j<12;j++)state.samples[w].push(sampleIndex(theoretical(state.basis,w)));});render();};$('toggle-view').onclick=()=>{state.view=records?'probabilities':'records';render();};$('reset').onclick=()=>{state.samples=[[],[]];render();};}
function render(){window.MathJax?.typesetClear?.([$ ('stage')]);({gates,prepare,local,compare}[kind])();math();resize();}
window.L04Lab={kind,getReaderState:()=>({kind,state:JSON.parse(JSON.stringify(state)),text:$('stage').innerText}),getState:()=>JSON.parse(JSON.stringify(state)),localProb,theoretical,sampleIndex,geometry:{project,direction,arc3},reset:()=>{state.step=0;state.theta=0;state.phi=0;state.viewAngle=30;state.basis='z';state.samples=[[],[]];render();}};
addEventListener('keydown',event=>{if(event.target.closest?.('input,select,textarea,button,[contenteditable]'))return;if(['ArrowLeft','ArrowRight','PageDown','PageUp',' '].includes(event.key)&&parent!==window){event.preventDefault();parent.postMessage({type:'lecture04-navigation',key:event.key},'*');}});
render();
})();
