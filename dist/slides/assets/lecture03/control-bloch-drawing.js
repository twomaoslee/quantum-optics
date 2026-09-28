// Shared geometry for the local illustrations in section 6.
(() => {
  const NS='http://www.w3.org/2000/svg',blue='#0070c0',gray='#657a8d',rule='#d9e4ec';
  const math=(node,tex)=>katex.render(tex,node,{throwOnError:true,output:'html'});
  function el(parent,tag,attrs={},content){const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(content!==undefined)n.textContent=content;parent.append(n);return n;}
  function line(parent,a,b,color=rule,width=1.5,dash=''){return el(parent,'line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:color,'stroke-width':width,'stroke-dasharray':dash});}
  function label(parent,x,y,tex,width=90,size=24){const f=el(parent,'foreignObject',{x:x-width/2,y:y-20,width,height:56});const d=document.createElement('div');d.style.cssText='text-align:center;color:'+gray+';font-size:'+size+'px;';math(d,tex);f.append(d);return f;}
  function path(parent,points,color=blue,width=3,dash=''){return el(parent,'path',{d:points.map((p,i)=>(i?'L':'M')+p.map(v=>v.toFixed(4)).join(',')).join(' '),fill:'none',stroke:color,'stroke-width':width,'stroke-dasharray':dash,'stroke-linejoin':'round','stroke-linecap':'round'});}

  function stateArrow(parent,a,b){
    const shaft=line(parent,a,b,blue,8);
    shaft.setAttribute('class','bloch-state-vector');
    shaft.setAttribute('stroke-linecap','round');
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(length>1){
      const ux=(b[0]-a[0])/length,uy=(b[1]-a[1])/length;
      // Foreshortened vectors must not acquire a head longer than the shaft.
      const h=Math.min(29,length*.55),w=h*12/29;
      el(parent,'polygon',{class:'bloch-state-arrowhead',points:[b,
        [b[0]-h*ux+w*uy,b[1]-h*uy-w*ux],
        [b[0]-h*ux-w*uy,b[1]-h*uy+w*ux]
      ].map(p=>p.join(',')).join(' '),fill:blue});
    }
    el(parent,'circle',{class:'bloch-state-point',cx:b[0],cy:b[1],r:10,
      fill:blue,stroke:'white','stroke-width':2.5});
  }


  function cardinalPoints(svg,suffix=''){
    // Unit-sphere intersections, not the tips of the extended coordinate axes.
    for(const [name,v,offset] of [
      ['+x',[1,0,0],[-16,30]],['-x',[-1,0,0],[8,-26]],
      ['+y',[0,1,0],[25,30]],['-y',[0,-1,0],[-16,-24]]
    ]){
      const p=project(v);
      el(svg,'circle',{class:'bloch-axis-point','data-axis-point':name,
        cx:p[0],cy:p[1],r:5,fill:gray,stroke:'white','stroke-width':1.5});
      const text=label(svg,p[0]+offset[0],p[1]+offset[1],name+suffix,65,25);
      text.setAttribute('data-axis-label',name);
    }
  }

  function arrow(parent,a,b,color=blue,width=3){line(parent,a,b,color,width);const len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len<.01)return;const ux=(b[0]-a[0])/len,uy=(b[1]-a[1])/len;el(parent,'polygon',{points:[b,[b[0]-11*ux+4.5*uy,b[1]-11*uy-4.5*ux],[b[0]-11*ux-4.5*uy,b[1]-11*uy+4.5*ux]].map(p=>p.join(',')).join(' '),fill:color});}
  const az=35*Math.PI/180,elev=20*Math.PI/180,R=205,C=[323,253];
  const project=v=>[C[0]+R*(-Math.sin(az)*v[0]+Math.cos(az)*v[1]),C[1]-R*(-Math.sin(elev)*Math.cos(az)*v[0]-Math.sin(elev)*Math.sin(az)*v[1]+Math.cos(elev)*v[2])];
  const depth=v=>Math.cos(elev)*(Math.cos(az)*v[0]+Math.sin(az)*v[1])+Math.sin(elev)*v[2];
  function drawSphere(svg,{vector,trace=[],suffix='',rotationAxis=null}){
    svg.replaceChildren();
    el(svg,'circle',{cx:C[0],cy:C[1],r:R,fill:'#fafcfe',stroke:rule,'stroke-width':1.5});
    for(const [plane,fn] of [['xz',t=>[Math.cos(t),0,Math.sin(t)]],['yz',t=>[0,Math.cos(t),Math.sin(t)]],['xy',t=>[Math.cos(t),Math.sin(t),0]]]){
      let points=[],back=null;
      for(let k=0;k<=240;k++){
        const t=2*Math.PI*k/240,v=fn(t),isBack=depth(v)<0,p=project(v);
        if(back!==null&&isBack!==back){points.push(p);path(svg,points,'#bdcedb',1.3,back?'4 5':'').setAttribute('data-coordinate-plane',plane);points=[p];}else points.push(p);
        back=isBack;
      }
      if(points.length>1)path(svg,points,'#bdcedb',1.3,back?'4 5':'').setAttribute('data-coordinate-plane',plane);
    }
    for(const [v,name] of [[[1,0,0],'x'],[[0,1,0],'y'],[[0,0,1],'z']]){
      const color=name===rotationAxis?gray:'#91a5b6',w=name===rotationAxis?2.8:1.5;
      line(svg,project(v.map(x=>-1.05*x)),C,color,w,'5 5');
      arrow(svg,C,project(v.map(x=>1.13*x)),color,w);
      if(name==='z'){const p=project(v.map(x=>1.27*x));label(svg,p[0],p[1],name+suffix,65,25);}
    }
    for(const [v,tex] of [[[0,0,1],'|0\\rangle'],[[0,0,-1],'|1\\rangle']]){
      const p=project(v);el(svg,'circle',{cx:p[0],cy:p[1],r:4,fill:gray});label(svg,p[0]+46,p[1],tex,65,25);
    }
    if(trace.length>1){
      const projected=trace.map(project);path(svg,projected,blue,4);
      const j=Math.floor((projected.length-1)*.55);
      if(j+2<projected.length)arrow(svg,projected[j],projected[j+2],blue,3);
    }
    const p=project(vector);cardinalPoints(svg,suffix);stateArrow(svg,C,p);
  }
  function fit(){const slide=document.getElementById('slide'),s=Math.min(innerWidth/1280,innerHeight/720);slide.style.transform='scale('+s+')';slide.style.left=(innerWidth-s*1280)/2+'px';slide.style.top=(innerHeight-s*720)/2+'px';}
  function controls(){document.querySelectorAll('[data-math]').forEach(e=>math(e,e.dataset.math));document.getElementById('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{document.getElementById('fullscreen').textContent='请用浏览器全屏';}});document.addEventListener('fullscreenchange',()=>{fit();document.getElementById('fullscreen').textContent=document.fullscreenElement?'退出全屏':'全屏';});addEventListener('resize',fit);fit();}
  window.ControlBloch={math,el,line,label,path,arrow,project,drawSphere,fit,controls,blue,gray,rule};
})();
