(() => {
  const D=ControlBloch,$=id=>document.getElementById(id),mode=new URLSearchParams(location.search).get('mode')||'compare',q=Math.SQRT1_2;
  const inputs={zero:[1,0],one:[0,1],plus:[q,q],minus:[q,-q]},mat={X:[[0,1],[1,0]],Z:[[1,0],[0,-1]],H:[[q,q],[q,-q]],R:[[q,-q],[q,q]]};
  const names={zero:'|0\\rangle',one:'|1\\rangle',plus:'|+\\rangle',minus:'|-\\rangle'};
  const apply=(M,s)=>M.map(row=>row[0]*s[0]+row[1]*s[1]);
  const defaults={input:mode==='compare'?'zero':'plus',step:2};let state={...defaults};
  $('title').textContent=mode==='basic'?'同一个输入：翻转还是改变相位？':mode==='order'?'交换操作顺序，读出也会改变':'同样能制备叠加态，就是同一个操作吗？';
  $('step-controls').hidden=mode!=='order';$('step-controls').style.display=mode==='order'?'flex':'none';
  $('input-controls').hidden=mode==='order';$('input-controls').style.display=mode==='order'?'none':'flex';
  function tex(v){
    for(const [key,w] of Object.entries(inputs)){
      if(v.every((x,i)=>Math.abs(x-w[i])<1e-9))return names[key];
      if(v.every((x,i)=>Math.abs(x+w[i])<1e-9))return '-'+names[key];
    }
    return v[0].toFixed(3)+'|0\\rangle'+(v[1]<0?'-':'+')+Math.abs(v[1]).toFixed(3)+'|1\\rangle';
  }
  function title(side,ops){
    if(mode!=='order'){D.math($(side+'-title'),ops[0]==='R'?'R_y(\\pi/2)':ops[0]==='H'?'U_{\\mathrm H}':ops[0]);return;}
    $(side+'-title').replaceChildren();
    const init=document.createElement('span');D.math(init,'|+\\rangle');$(side+'-title').append(init);
    ops.forEach((op,j)=>{const ar=document.createElement('span');ar.className='circuit-arrow';ar.textContent='—';const box=document.createElement('span');box.className='gate-box'+(state.step>j?' passed':'')+(state.step===j+1?' stage-now':'');D.math(box,op==='H'?'U_{\\mathrm H}':op);$(side+'-title').append(ar,box);});
  }
  function draw(){
    const operations=mode==='basic'?[['X'],['Z']]:mode==='order'?[['H','X'],['X','H']]:[['R'],['H']],results=[];
    for(const [i,side] of ['left','right'].entries()){
      const ops=operations[i];title(side,ops);let v=inputs[state.input].slice();const stages=[v.slice()];
      for(const op of ops){v=apply(mat[op],v);stages.push(v.slice());}
      v=stages[mode==='order'?state.step:1];const vector=[2*v[0]*v[1],0,v[0]*v[0]-v[1]*v[1]],p0=v[0]*v[0],p1=v[1]*v[1];
      D.drawSphere($(side+'-sphere'),{vector,suffix:'_{\\mathrm I}'});
      D.math($(side+'-state'),tex(v));D.math($(side+'-prob'),'P_0='+(p0*100).toFixed(1)+'\\%\\quad P_1='+(p1*100).toFixed(1)+'\\%');
      $(side+'-bar').style.width=(p0*100)+'%';
      results.push({operations:ops,amplitudes:v,stages,vector,p0,p1});
    }
    document.querySelectorAll('[data-input]').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.input===state.input)));
    document.querySelectorAll('[data-step]').forEach(e=>e.setAttribute('aria-pressed',String(+e.dataset.step===state.step)));
    window.gatesLabState={mode,...state,results};
  }
  function setState(s){state={...s};draw();}
  document.querySelectorAll('[data-input]').forEach(e=>e.addEventListener('click',()=>setState({...state,input:e.dataset.input})));
  document.querySelectorAll('[data-step]').forEach(e=>e.addEventListener('click',()=>setState({...state,step:+e.dataset.step})));
  $('reset').addEventListener('click',()=>setState(defaults));
  D.controls();draw();installFigurePrint({getState:()=>({...state}),setState,defaults,fit:D.fit});document.fonts.ready.then(()=>window.figureReady=true);
})();
