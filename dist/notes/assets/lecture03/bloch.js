(() => {
  'use strict';
  const NS='http://www.w3.org/2000/svg', blue='#0070c0',gray='#657a8d',rule='#d9e4ec';
  const kind=document.body.dataset.kind,slide=document.getElementById('slide'),svg=document.getElementById('sphere');
  const pi=Math.PI,rad=pi/180,defaults=kind==='state'?{polar:60,azimuth:90}:{initial:'plus',time:.25};
  let state={...defaults},raf=0,lastTime=0;
  const $=id=>document.getElementById(id);
  function math(node,tex){katex.render(tex,node,{throwOnError:true,output:'html'});}
  function el(parent,tag,attrs={},content){const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(content!==undefined)n.textContent=content;parent.append(n);return n;}
  function line(parent,a,b,color=rule,width=1.5,dash=''){return el(parent,'line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:color,'stroke-width':width,'stroke-dasharray':dash});}
  function label(parent,x,y,tex,width=90,size=24){const f=el(parent,'foreignObject',{x:x-width/2,y:y-20,width,height:52});const d=document.createElement('div');d.style.cssText='text-align:center;color:'+gray+';font-size:'+size+'px;';math(d,tex);f.append(d);return f;}
  function path(parent,points,color,width=2,dash=''){return el(parent,'path',{d:points.map((p,i)=>(i?'L':'M')+p.map(v=>v.toFixed(3)).join(',')).join(' '),fill:'none',stroke:color,'stroke-width':width,'stroke-dasharray':dash,'stroke-linejoin':'round','stroke-linecap':'round'});}
  function arrow(parent,a,b,color=blue,width=3){line(parent,a,b,color,width);const l=Math.hypot(b[0]-a[0],b[1]-a[1]);if(l<1)return;const ux=(b[0]-a[0])/l,uy=(b[1]-a[1])/l;el(parent,'polygon',{points:[b,[b[0]-12*ux+5*uy,b[1]-12*uy-5*ux],[b[0]-12*ux-5*uy,b[1]-12*uy+5*ux]].map(p=>p.join(',')).join(' '),fill:color});}
  function fit(){const s=Math.min(innerWidth/1280,innerHeight/720);slide.style.transform='scale('+s+')';slide.style.left=(innerWidth-s*1280)/2+'px';slide.style.top=(innerHeight-s*720)/2+'px';}
  // Right-handed coordinates, orthographic view from azimuth 35°, elevation 20°.
  const az=35*rad,elev=20*rad,R=205,C=[323,253];
  const project=v=>[C[0]+R*(-Math.sin(az)*v[0]+Math.cos(az)*v[1]),C[1]-R*(-Math.sin(elev)*Math.cos(az)*v[0]-Math.sin(elev)*Math.sin(az)*v[1]+Math.cos(elev)*v[2])];
  const depth=v=>Math.cos(elev)*(Math.cos(az)*v[0]+Math.sin(az)*v[1])+Math.sin(elev)*v[2];
  const vec=(theta,phi)=>[Math.sin(theta)*Math.cos(phi),Math.sin(theta)*Math.sin(phi),Math.cos(theta)];
  function spatialCurve(fn,from,to,color,width=2,plane=''){for(let k=0;k<100;k++){const a=fn(from+(to-from)*k/100),b=fn(from+(to-from)*(k+1)/100);const segment=line(svg,project(a),project(b),color,width,depth(a)<0?'3 4':'');if(plane)segment.setAttribute('data-coordinate-plane',plane);}}
  function cardinalPoints(){
    for(const [name,v,offset] of [
      ['+x',[1,0,0],[-16,30]],['-x',[-1,0,0],[8,-26]],
      ['+y',[0,1,0],[25,30]],['-y',[0,-1,0],[-16,-24]]
    ]){
      const p=project(v);
      el(svg,'circle',{class:'bloch-axis-point','data-axis-point':name,cx:p[0],cy:p[1],r:5,fill:gray,stroke:'white','stroke-width':1.5});
      label(svg,p[0]+offset[0],p[1]+offset[1],name,65,25).setAttribute('data-axis-label',name);
    }
  }
  function point(p,color=blue,r=6){el(svg,'circle',{cx:p[0],cy:p[1],r,fill:color,stroke:'white','stroke-width':2});}
  function sphere(theta,phi){
    svg.replaceChildren();
    el(svg,'circle',{cx:C[0],cy:C[1],r:R,fill:'#fafcfe',stroke:rule,'stroke-width':1.5});
    spatialCurve(t=>[Math.cos(t),0,Math.sin(t)],0,2*pi,'#e4ecf2',1,'xz');
    spatialCurve(t=>[0,Math.cos(t),Math.sin(t)],0,2*pi,'#e4ecf2',1,'yz');
    spatialCurve(t=>[Math.cos(t),Math.sin(t),0],0,2*pi,'#a7baca',1.7,'xy');
    for(const [v,name] of [[[1,0,0],'x'],[[0,1,0],'y'],[[0,0,1],'z']]){
      line(svg,project(v.map(x=>-1.05*x)),C,'#bdcbd6',1.2,'5 5');
      arrow(svg,C,project(v.map(x=>1.13*x)),'#91a5b6',1.6);
      if(name==='z'){const a=project(v.map(x=>1.24*x));label(svg,a[0],a[1],name,42,24);}
    }
    const north=project([0,0,1]),south=project([0,0,-1]);
    point(north,gray,4);point(south,gray,4);label(svg,north[0]+45,north[1]-4,'|0\\rangle',65,25);label(svg,south[0]+45,south[1]+5,'|1\\rangle',65,25);
    const v=vec(theta,phi),p=project(v);
    if(kind==='state'&&Math.sin(theta)>1e-7){
      spatialCurve(t=>vec(theta,t),0,2*pi,'#a5c5df',1.4);
      const ground=[v[0],v[1],0];
      line(svg,p,project(ground),gray,1.5,'5 5');line(svg,C,project(ground),'#91a5b6',1.5,'5 5');
      path(svg,Array.from({length:61},(_,k)=>project(vec(theta*k/60,phi).map(x=>.42*x))),blue,2.6);
      const ta=project(vec(theta*.52,phi).map(x=>.54*x));
      if(Math.abs(ta[0]-C[0])<24)ta[0]+=35;
      label(svg,ta[0],ta[1],'\\theta',45,27);
      const ph=((phi%(2*pi))+2*pi)%(2*pi);
      if(ph>1e-5){path(svg,Array.from({length:81},(_,k)=>project([.43*Math.cos(ph*k/80),.43*Math.sin(ph*k/80),0])),gray,2.4);const pa=project([.59*Math.cos(ph/2),.59*Math.sin(ph/2),0]);label(svg,pa[0],pa[1]+18,'\\varphi',45,27);}
    }
    if(kind==='free'&&state.initial==='plus'){
      const start=project([1,0,0]);point(start,gray,5);label(svg,start[0]-3,start[1]+52,'t=0',85,21);
      if(state.time>0){
        const points=Array.from({length:151},(_,k)=>project(vec(pi/2,-2*pi*state.time*k/150)));
        path(svg,points,blue,4);
        const fraction=Math.min(state.time*.55,.85),a=project(vec(pi/2,-2*pi*fraction)),b=project(vec(pi/2,-2*pi*(fraction+.017)));
        arrow(svg,a,b,blue,3);
      }
    }
    cardinalPoints();
    arrow(svg,C,p,blue,4);el(svg,'circle',{class:'bloch-state-point',cx:p[0],cy:p[1],r:6,fill:blue,stroke:'white','stroke-width':2});
    return v;
  }
  function stateTex(theta,phi){
    const a=Math.cos(theta/2),b=Math.sin(theta/2);
    if(b<1e-8)return '|0\\rangle';
    if(a<1e-8)return '|1\\rangle';
    let phase=((phi/rad)%360+360)%360;
    phase=Math.round(phase);
    if(phase===360)phase=0;
    const suffix=phase===0?'+':phase===90?'+i':phase===180?'-':phase===270?'-i':'+e^{i\\,'+(phi/pi).toFixed(3)+'\\pi}';
    if(Math.abs(theta-pi/2)<1e-8)return '\\frac{|0\\rangle'+suffix+'|1\\rangle}{\\sqrt2}';
    if(Math.abs(theta-pi/3)<1e-8&&phase===90)return '\\frac{\\sqrt3}{2}|0\\rangle+\\frac{i}{2}|1\\rangle';
    return a.toFixed(3)+'|0\\rangle'+suffix+'\\,'+b.toFixed(3)+'|1\\rangle';
  }
  function graph(theta){
    const chart=$('prob-chart');chart.replaceChildren();
    const left=53,right=489,yp=[182,420],height=125,x=t=>left+(right-left)*t;
    const p0=Math.cos(theta/2)**2,p1=1-p0,plus=t=>(1+Math.sin(theta)*Math.cos(2*pi*t))/2;
    const title=(y,tex)=>label(chart,125,y,tex,240,25);
    line(chart,[53,20],[89,20],gray,4,'7 5');label(chart,115,24,'P_0',46,23);
    line(chart,[190,20],[226,20],blue,2.5);label(chart,252,24,'P_1',46,23);
    title(264,'P_+=|\\langle+|\\psi\\rangle|^2');
    yp.forEach((base,row)=>{
      for(const p of [0,.5,1]){const y=base-height*p;line(chart,[left,y],[right,y]);el(chart,'text',{x:left-15,y:y+7,'text-anchor':'end'},String(p));}
      line(chart,[left,base-height],[left,base],gray,1.3);line(chart,[left,base],[right,base],gray,1.3);
      for(const t of [0,.25,.5,.75,1]){line(chart,[x(t),base],[x(t),base+5],gray);el(chart,'text',{x:x(t),y:base+28,'text-anchor':'middle',style:'font-size:19px'},String(t));}
      label(chart,right-9,base+61,'t/T',66,23);
      line(chart,[x(state.time),base-height],[x(state.time),base],blue,1.5,'4 4');
      if(row===0){line(chart,[left,base-height*p0],[right,base-height*p0],gray,4,'7 5');line(chart,[left,base-height*p1],[right,base-height*p1],blue,2.5);el(chart,'rect',{x:x(state.time)-5,y:base-height*p0-5,width:10,height:10,fill:gray});el(chart,'circle',{cx:x(state.time),cy:base-height*p1,r:4,fill:blue});}
      else{path(chart,Array.from({length:201},(_,i)=>[x(i/200),base-height*plus(i/200)]),blue,3.5);el(chart,'circle',{cx:x(state.time),cy:base-height*plus(state.time),r:6,fill:blue,stroke:'white','stroke-width':1.5});}
    });
  }
  const presets={0:[0,0],1:[180,0],plus:[90,0],minus:[90,180]};
  function render(){
    let theta,phi;
    if(kind==='state'){
      theta=state.polar*rad;phi=state.azimuth*rad;
      $('polar').value=state.polar;$('azimuth').value=state.azimuth;
      $('polar-value').value=state.polar+'°';$('azimuth-value').value=state.azimuth+'°';
      math($('state-formula'),stateTex(theta,phi));
      const p0=Math.cos(theta/2)**2,p1=1-p0;
      for(const [name,p] of [['p0',p0],['p1',p1]]){$(name+'-value').value=(100*p).toFixed(1)+'%';$(name+'-bar').style.width=100*p+'%';}
      document.querySelectorAll('[data-state]').forEach(b=>{const [t,p]=presets[b.dataset.state];b.setAttribute('aria-pressed',String(t===state.polar&&(t===0||t===180||p===state.azimuth%360)));});
      document.querySelectorAll('[data-phase]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.phase===state.azimuth%360)));
    }else{
      theta=state.initial==='plus'?pi/2:0;phi=-2*pi*state.time;
      $('time').value=state.time;$('time-value').value=state.time.toFixed(3);
      document.querySelectorAll('[data-initial]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.initial===state.initial)));
      graph(theta);
    }
    const vector=sphere(theta,phi);
    window.blochLabState={kind,...state,theta,phi,vector,p0:Math.cos(theta/2)**2,p1:Math.sin(theta/2)**2,pPlus:(1+vector[0])/2};
  }
  function stop(){if(raf)cancelAnimationFrame(raf);raf=0;lastTime=0;if($('play')){$('play').textContent='播放';$('play').setAttribute('aria-label','播放自由演化');}}
  function tick(now){if(!lastTime)lastTime=now;state.time=Math.min(1,state.time+(now-lastTime)/8000);lastTime=now;render();if(state.time>=1)stop();else raf=requestAnimationFrame(tick);}
  function setState(s){stop();state={...s};render();}
  document.querySelectorAll('[data-math]').forEach(n=>math(n,n.dataset.math));
  if(kind==='state'){
    $('polar').addEventListener('input',()=>{state.polar=+$('polar').value;render();});
    $('azimuth').addEventListener('input',()=>{state.azimuth=+$('azimuth').value;render();});
    document.querySelectorAll('[data-state]').forEach(b=>b.addEventListener('click',()=>{const [polar,azimuth]=presets[b.dataset.state];setState({polar,azimuth});}));
    document.querySelectorAll('[data-phase]').forEach(b=>b.addEventListener('click',()=>setState({...state,azimuth:+b.dataset.phase})));
  }else{
    $('time').addEventListener('input',()=>{stop();state.time=+$('time').value;render();});
    document.querySelectorAll('[data-initial]').forEach(b=>b.addEventListener('click',()=>setState({...state,initial:b.dataset.initial})));
    $('play').addEventListener('click',()=>{if(raf){stop();return;}if(state.time>=1)state.time=0;$('play').textContent='暂停';$('play').setAttribute('aria-label','暂停自由演化');raf=requestAnimationFrame(tick);});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
    addEventListener('pagehide',stop);
  }
  $('reset').addEventListener('click',()=>setState(defaults));
  $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('fullscreen').textContent='请用浏览器全屏';}});
  document.addEventListener('fullscreenchange',()=>{fit();$('fullscreen').textContent=document.fullscreenElement?'退出全屏':'全屏';if(!document.fullscreenElement)stop();});
  render();fit();addEventListener('resize',fit);
  installFigurePrint({getState:()=>({...state}),setState,defaults,fit});
  document.fonts.ready.then(()=>{window.figureReady=true;});
})();
