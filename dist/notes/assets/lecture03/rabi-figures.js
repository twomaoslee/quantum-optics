(() => {
  'use strict';
  const NS='http://www.w3.org/2000/svg',blue='#0070c0',gray='#758899',ink='#20384c',rule='#d9e4ec';
  const kind=document.body.dataset.figure,slide=document.getElementById('slide');
  function fit(){const s=Math.min(innerWidth/1280,innerHeight/720);slide.style.transform=`scale(${s})`;slide.style.left=`${(innerWidth-1280*s)/2}px`;slide.style.top=`${(innerHeight-720*s)/2}px`;}
  function math(el,tex){katex.render(tex,el,{throwOnError:true,output:'html'});}
  function el(svg,tag,attrs={},text){const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;svg.append(e);return e;}
  function line(svg,x1,y1,x2,y2,color=rule,width=1,dash=''){return el(svg,'line',{x1,y1,x2,y2,stroke:color,'stroke-width':width,...(dash?{'stroke-dasharray':dash}:{})});}
  function text(svg,x,y,t,attrs={}){return el(svg,'text',{x,y,...attrs},t);}
  function arrow(svg,x,y,dx,dy,color=blue,w=3){line(svg,x,y,x+dx,y+dy,color,w);const len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len;el(svg,'polygon',{points:`${x+dx},${y+dy} ${x+dx-8*ux+4*uy},${y+dy-8*uy-4*ux} ${x+dx-8*ux-4*uy},${y+dy-8*uy+4*ux}`,fill:color});}
  function phase(){
    const svg=document.getElementById('phase-chart');line(svg,714,172,714,651);line(svg,36,398,1244,398);
    for(let row=0;row<2;row++){
      const cy=row?533:292;
      for(let k=0;k<8;k++){
        const cx=72+k*84,theta=row?2*Math.PI*k/8:0;
        el(svg,'circle',{cx,cy,r:31,fill:'none',stroke:rule,'stroke-width':1.4});
        line(svg,cx-34,cy,cx+34,cy,rule);line(svg,cx,cy-34,cx,cy+34,rule);
        arrow(svg,cx,cy,30*Math.cos(theta),-30*Math.sin(theta),row?gray:blue,3);
        text(svg,cx,cy+55,String(k+1),{'text-anchor':'middle',style:'font-size:19px;fill:#657a8d'});
      }
    }
    text(svg,366,375,'同向不变',{'text-anchor':'middle',style:'font-size:22px;fill:#0070c0'});
    let x=760,y=292;for(let k=0;k<8;k++){arrow(svg,x,y,60,0,blue,3);el(svg,'circle',{cx:x,cy:y,r:3,fill:ink});x+=60;}
    let px=916,py=603;const start=[px,py],points=[[px,py]];
    for(let k=0;k<8;k++){const a=2*Math.PI*k/8,dx=60*Math.cos(a),dy=-60*Math.sin(a);arrow(svg,px,py,dx,dy,gray,3);px+=dx;py+=dy;points.push([px,py]);}
    el(svg,'circle',{cx:start[0],cy:start[1],r:5,fill:ink});
    text(svg,988,539,'闭合',{'text-anchor':'middle',style:'font-size:25px;fill:#657a8d'});
    window.phaseState={samples:8,slowSum:[8,0],fastSum:points.at(-1).map((v,i)=>(v-start[i])/60),fastPhases:Array.from({length:8},(_,k)=>2*Math.PI*k/8)};
  }
  const x0=130,x1=1170,tmax=250,omega=2*Math.PI*.005;
  const xp=t=>x0+(x1-x0)*t/tmax,prob=t=>Math.sin(omega*t/2)**2;
  function curve(svg,fn,ybase,height,color,width=3,dash=''){
    let d='';for(let t=0;t<=tmax;t+=.5)d+=`${t?'L':'M'}${xp(t).toFixed(2)},${(ybase-height*fn(t)).toFixed(2)} `;
    return el(svg,'path',{d,fill:'none',stroke:color,'stroke-width':width,...(dash?{'stroke-dasharray':dash}:{})});
  }
  function envelope(svg,tau,y,color=blue){
    if(tau===0){line(svg,x0,y,x1,y,color,2.6);return;}
    el(svg,'rect',{x:x0,y:y-20,width:xp(tau)-x0,height:20,fill:'#eef6fc'});
    el(svg,'path',{d:`M${x0},${y} V${y-20} H${xp(tau)} V${y} H${x1}`,fill:'none',stroke:color,'stroke-width':2.6});
  }
  function axes(svg,ybase,height){
    for(const p of [0,.5,1]){const y=ybase-height*p;line(svg,x0,y,x1,y);text(svg,x0-19,y+7,String(p),{'text-anchor':'end'});}
    line(svg,x0,ybase-height,x0,ybase,gray,1.5);line(svg,x0,ybase,x1,ybase,gray,1.5);
    for(const t of [0,50,100,150,200,250]){const x=xp(t);line(svg,x,ybase,x,ybase+6,gray);text(svg,x,ybase+30,String(t),{'text-anchor':'middle'});}
    text(svg,1204,ybase+30,'ns',{style:'font-size:18px;fill:#657a8d'});
    text(svg,48,ybase-height/2,'测得1的概率',{transform:`rotate(-90 48 ${ybase-height/2})`,'text-anchor':'middle',style:'font-size:21px'});
  }
  function comparison(){
    const svg=document.getElementById('rabi-chart');
    [50,100,200].forEach((t,i)=>{const y=165+i*34;envelope(svg,t,y,i===1?blue:gray);text(svg,xp(t)+10,y-7,t+' ns',{style:'font-size:18px;fill:#657a8d'});});
    axes(svg,445,150);curve(svg,prob,445,150,blue,3.5);
    text(svg,925,282,'持续驱动的参考曲线',{style:'font-size:20px;fill:#0070c0'});
    [50,100,200].forEach(t=>{const x=xp(t),y=445-150*prob(t);line(svg,x,245,x,483,gray,1,'5 5');el(svg,'circle',{cx:x,cy:y,r:6,fill:blue,stroke:'white','stroke-width':2});});
    window.rabiFigureState={omegaPerNs:omega,times:[50,100,200],probabilities:[50,100,200].map(prob)};
  }
  function stateTex(tau){
    const a=Math.cos(omega*tau/2),s=Math.sin(omega*tau/2);
    if(Math.abs(s)<1e-10)return a<0?String.raw`-\,|0\rangle`:String.raw`|0\rangle`;
    if(Math.abs(a)<1e-10)return String.raw`-i\,|1\rangle`;
    if(tau===50)return String.raw`\dfrac{|0\rangle-i|1\rangle}{\sqrt2}`;
    return `${a.toFixed(3)}\\,|0\\rangle ${s<0?'+':'-'} ${Math.abs(s).toFixed(3)}i\\,|1\\rangle`;
  }
  function interactive(){
    const slider=document.getElementById('duration'),svg=document.getElementById('rabi-chart');
    const draw=()=>{
      const tau=+slider.value,p=prob(tau);svg.replaceChildren();
      text(svg,36,205,'脉冲包络',{style:'font-size:23px'});envelope(svg,tau,238);
      line(svg,xp(tau),183,xp(tau),551,blue,1.6,'5 5');
      text(svg,Math.min(xp(tau)+10,1100),194,'关断',{style:'font-size:21px;fill:#0070c0'});
      axes(svg,546,270);curve(svg,prob,546,270,gray,2.5,'7 6');
      curve(svg,t=>prob(Math.min(t,tau)),546,270,blue,4);
      el(svg,'circle',{cx:xp(tau),cy:546-270*p,r:7,fill:blue,stroke:'white','stroke-width':2});
      document.getElementById('duration-value').value=`${tau} ns`;
      math(document.getElementById('state-output'),stateTex(tau));
      math(document.getElementById('prob-output'),`P_1=${(100*p).toFixed(1)}\\%`);
      slider.setAttribute('aria-valuetext',`${tau}纳秒，测得1的概率${(100*p).toFixed(1)}%`);
      document.querySelectorAll('[data-time]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.time===tau)));
      window.rabiLabState={tauNs:tau,omegaPerNs:omega,aReal:Math.cos(omega*tau/2),bImag:-Math.sin(omega*tau/2),p1:p,p0:1-p,afterOffP1:p};
    };
    slider.addEventListener('input',draw);
    document.querySelectorAll('[data-time]').forEach(b=>b.addEventListener('click',()=>{slider.value=b.dataset.time;draw();}));
    const full=document.getElementById('fullscreen');
    full.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(e){full.textContent='请用浏览器全屏';}});
    document.addEventListener('fullscreenchange',()=>{full.textContent=document.fullscreenElement?'退出全屏':'全屏';fit();});draw();
    installFigurePrint({
      getState:()=>({tauNs:Number(slider.value)}),
      setState:state=>{slider.value=state.tauNs;draw();},
      defaults:{tauNs:100},fit
    });
  }
  document.querySelectorAll('[data-math]').forEach(e=>math(e,e.dataset.math));
  if(kind==='phase')phase();else if(kind==='comparison')comparison();else interactive();
  window.addEventListener('resize',fit);fit();
  document.fonts.ready.then(()=>{window.figureReady=true;});
})();
