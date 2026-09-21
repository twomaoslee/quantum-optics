'use strict';
const $=id=>document.getElementById(id);
const stage=$('slide');
const renderMath=(el,tex)=>katex.render(tex,el,{throwOnError:true,output:'htmlAndMathml',strict:'error'});
document.querySelectorAll('[data-math]').forEach(el=>renderMath(el,el.dataset.math));
function fit(){
  const scale=Math.min(window.innerWidth/1280,window.innerHeight/720);
  stage.style.transform='scale('+scale+')';
  stage.style.left=(window.innerWidth-1280*scale)/2+'px';
  stage.style.top=(window.innerHeight-720*scale)/2+'px';
}
window.addEventListener('resize',fit);
document.addEventListener('fullscreenchange',()=>{
  $('fullscreen').textContent=document.fullscreenElement?'退出全屏':'全屏';
  fit();
});
let fullscreenFallback=false;
$('fullscreen').addEventListener('click',async()=>{
  if(fullscreenFallback){window.open(location.href,'_blank','noopener');return;}
  try{
    if(document.fullscreenElement)await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  }catch{
    fullscreenFallback=true;
    $('fullscreen').textContent='新窗口放大';
  }
});
function arrow(x1,y1,x2,y2,color,id,width,dashed){
  if(Math.hypot(x2-x1,y2-y1)<.1)return '<circle cx="'+x1+'" cy="'+y1+'" r="5" fill="'+color+'"/>';
  return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+color+'" stroke-width="'+width+'"'+(dashed?' stroke-dasharray="6 3"':'')+' marker-end="url(#'+id+')"/>';
}
function phasor(svg,sign,phi){
  const clean=v=>Math.abs(v)<1e-12?0:v;
  const re=clean(.5+sign*Math.cos(phi)/2),im=clean(sign*Math.sin(phi)/2),id=svg.id;
  const S=150,xx=v=>125+S*v,yy=v=>100-S*v;
  const colors=['#748b9e','#6ca8d4','#0070c0'];
  svg.innerHTML='<defs>'+colors.map((c,i)=>'<marker id="'+id+i+'" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M1 1 L10 6 L1 11" fill="none" stroke="'+c+'" stroke-width="2"/></marker>').join('')+'</defs>'+
    '<circle cx="'+xx(.5)+'" cy="100" r="75" fill="none" stroke="#d6e3ed" stroke-dasharray="4 5"/>'+
    '<path d="M65 100H345 M125 190V10" stroke="#b7c8d5" stroke-width="1.2"/>'+
    '<text x="352" y="107">Re</text><text x="137" y="22">Im</text><text x="106" y="124">0</text><text x="192" y="124">½</text><text x="272" y="124">1</text>'+
    arrow(xx(0),yy(0),xx(re),yy(im),colors[2],id+'2',6,false)+
    arrow(xx(0),yy(0),xx(.5),yy(0),colors[0],id+'0',2.5,false)+
    arrow(xx(.5),yy(0),xx(re),yy(im),colors[1],id+'1',2.5,true);
  return {re,im};
}
function setBar(name,value){
  $(name+'-bar').style.width=(value*100)+'%';
  $(name+'-value').textContent=(100*value).toFixed(0)+'%';
}
function draw(){
  const deg=Number($('phase').value),phi=deg*Math.PI/180,mixed=$('mode').value==='mixed';
  const plus=mixed?.5:Math.max(0,Math.min(1,(1+Math.cos(phi))/2)),minus=1-plus;
  stage.classList.toggle('is-mixed',mixed);
  renderMath($('degrees'),String(deg)+'^\\circ');
  $('phase').setAttribute('aria-valuetext',deg+'度');
  document.querySelectorAll('[data-phase]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.phase)===deg)));
  const ap=mixed?null:phasor($('plus-svg'),1,phi),am=mixed?null:phasor($('minus-svg'),-1,phi);
  $('pm-note').textContent=mixed?'两类输入的概率加权':'取概率幅的模平方';
  setBar('h',.5);setBar('v',.5);setBar('plus',plus);setBar('minus',minus);
  window.labState={phase:deg,mode:mixed?'mixed':'pure',plus,minus,h:.5,v:.5,ap,am};
}
$('phase').addEventListener('input',draw);
$('mode').addEventListener('change',draw);
document.querySelectorAll('[data-phase]').forEach(b=>b.addEventListener('click',()=>{$('phase').value=b.dataset.phase;draw()}));
draw();fit();
