(() => {
  const params=new URLSearchParams(location.search);
  if(!params.has('classroom'))return;
  const slide=document.getElementById('slide');slide.classList.add('classroom');
  if(slide.classList.contains('analysis')){
    slide.classList.add('analysis-teaching');
    slide.querySelector('.frame-note').remove();slide.querySelector('.meta').remove();
    const prescription=document.createElement('div');prescription.className='analysis-prescription';
    prescription.innerHTML=String.raw`<h3>同一个分析脉冲</h3><div>驱动开启期间：</div><div class="analysis-drive" data-math="g(t)=\hbar\Omega\cos(\omega_0t+\pi/2)"></div><div data-math="\Omega/(2\pi)=5\,\mathrm{MHz}"></div><div data-math="\tau=50\,\mathrm{ns}"></div><div>绕 <span data-math="-y_{\mathrm I}"></span> 转 <span data-math="\pi/2"></span></div><div>关断后测0、1</div>`;
    prescription.querySelectorAll('[data-math]').forEach(n=>ControlBloch.math(n,n.dataset.math));
    const layout=document.createElement('div');layout.className='analysis-layout';
    for(const key of ['plus','minus']){
      const panel=document.createElement('section');panel.className='analysis-panel';
      const figure=document.createElement('div');figure.className='analysis-figure';
      const sphere=slide.querySelector('#'+key+'-sphere');
      sphere.setAttribute('viewBox','85 -12 500 510');sphere.setAttribute('preserveAspectRatio','xMidYMid meet');
      figure.append(sphere);
      panel.append(slide.querySelector('#input-'+key),figure,slide.querySelector('#'+key+'-readout'));
      layout.append(panel);
    }
    const sidebar=document.createElement('aside');sidebar.className='analysis-sidebar';
    sidebar.append(prescription,slide.querySelector('.controls'));layout.append(sidebar);
    slide.querySelector('#content').replaceChildren(layout);
    slide.querySelector('label[for="progress"]').textContent='已作用时间';
    slide.querySelector('#progress').setAttribute('aria-label','分析脉冲已作用时间，0至50纳秒');
  }
  if(slide.querySelector('#rotating-sphere')){
    slide.classList.add('frames-reading');
    slide.querySelector('.frame-title.right').textContent='随自由演化转动的I坐标';
    const period=document.createElement('div');period.className='frame-period';
    ControlBloch.math(period,String.raw`T_0=\frac{2\pi}{\omega_0}`);
    const frameControls=slide.querySelector('.frame-controls');
    frameControls.prepend(frameControls.querySelector('.initial-text'),period);
    for(const id of ['fixed-sphere','rotating-sphere']){
      const sphere=document.getElementById(id);
      sphere.setAttribute('viewBox','85 -12 500 510');
      sphere.setAttribute('preserveAspectRatio','xMidYMid meet');
    }
  }
  // Reuse the wired reset button beside the inputs, without a separate toolbar.
  const reset=document.getElementById('reset');
  const controls=slide.querySelector('.range-labels')||slide.querySelector('.controls,.frame-controls,.rabi-controls');
  if(reset&&controls){
    reset.textContent='重置';reset.classList.add('inline-reset');
    if(controls.matches('.range-labels'))controls.insertBefore(reset,controls.lastElementChild);
    else controls.append(reset);
  }
  if(slide.querySelector('#fixed')&&slide.querySelector('#rotating')){
    slide.classList.add('measurement-reading');
    const layout=document.createElement('div');layout.className='measurement-layout';
    for(const [side,id,setting] of [
      ['left','fixed',String.raw`调整脉冲相位，分析 <span data-math="\pm x"></span>`],
      ['right','rotating',String.raw`固定脉冲相位，分析 <span data-math="\pm x_{\mathrm I}"></span>`]
    ]){
      const panel=document.createElement('section');panel.className='measurement-panel';
      const subtitle=slide.querySelector('.measurement-setting.'+side);subtitle.innerHTML=setting;
      subtitle.querySelectorAll('[data-math]').forEach(n=>ControlBloch.math(n,n.dataset.math));
      const figure=document.createElement('div');figure.className='measurement-figure';
      const sphere=slide.querySelector('#'+id);sphere.setAttribute('viewBox','85 -12 500 510');
      sphere.setAttribute('preserveAspectRatio','xMidYMid meet');figure.append(sphere);
      panel.append(slide.querySelector('.measurement-heading.'+side),subtitle,figure,slide.querySelector('#'+id+'-result'));
      layout.append(panel);
    }
    const sidebar=document.createElement('aside');sidebar.className='measurement-sidebar';
    const caption=slide.querySelector('.measurement-caption');
    caption.innerHTML=String.raw`<p>初态 <span data-math="|+\rangle"></span>，自由等待。</p><p>球上：分析前的状态。</p><p><span data-math="P_0^{\mathrm{out}}"></span>：分析脉冲后<br>测得0的概率。</p>`;
    caption.querySelectorAll('[data-math]').forEach(n=>ControlBloch.math(n,n.dataset.math));
    const tuning=slide.querySelector('.controls'),label=tuning.querySelector('label');
    label.append(tuning.querySelector('output'));
    sidebar.append(caption,tuning);layout.append(sidebar);slide.append(layout);
  }
  // The state explorer dedicates the left column to the sphere and keeps
  // every input beside the live state/probability readout on the right.
  const statePanel=slide.querySelector('.state-panel');
  // Definition and the following state explorer share one sphere viewport.
  if(slide.classList.contains('definition-slide'))
    slide.querySelector('#sphere').setAttribute('viewBox','85 -12 500 510');
  if(document.body.dataset.kind==='state'&&statePanel&&!params.has('equator')){
    slide.classList.add('state-tuning');
    slide.querySelector('#sphere').setAttribute('viewBox','85 -12 500 510');
    const presets=statePanel.querySelector('.presets');
    statePanel.insertBefore(slide.querySelector('.angle-controls'),presets);
    if(reset)presets.append(reset);
  }
  if(document.querySelector('.frequency-panel')){
    const heading=document.querySelector('.frequency-panel h2');heading.textContent='3. 跃迁频率';
    const definition=document.createElement('div');definition.className='frequency-definition';
    katex.render(String.raw`\nu_{ij}=(E_j-E_i)/h`,definition,{throwOnError:false});
    heading.after(definition);
    document.getElementById('frequencies').setAttribute('viewBox','0 15 430 215');
    const note=document.createElement('p');note.className='frequency-reading';note.textContent='弱驱动、窄频谱：减少对其他能级的激发。';
    const footer=document.createElement('div');footer.className='transmon-footer';
    footer.append(document.getElementById('fixed-parameter'),note);slide.append(footer);
  }
  // Name both comparison objects on entry, alongside the states they refer to.
  if(slide.classList.contains('compare')&&slide.querySelector('.half-prob')){
    const content=document.getElementById('content');
    content.querySelector('.frame-note').remove();
    const grid=document.createElement('div');grid.className='compare-grid';
    for(const [side,title,phase] of [
      ['left','零驱动相位 · 50 ns脉冲末态',String.raw`\varphi_{\mathrm I}=-\pi/2`],
      ['right','目标：I坐标中的',String.raw`\varphi_{\mathrm I}=0`]
    ]){
      const panel=document.createElement('section');panel.className='compare-panel';
      const heading=document.createElement('h2');heading.textContent=title;panel.append(heading);
      if(side==='right'){const ket=document.createElement('span');ControlBloch.math(ket,String.raw`|+\rangle`);heading.append(' ',ket);}
      const sphere=document.getElementById(side+'-sphere');
      sphere.setAttribute('viewBox','85 -16 500 516');
      sphere.setAttribute('preserveAspectRatio','xMidYMid meet');
      // Size the viewport from a definite grid row, not the SVG's intrinsic ratio.
      const figure=document.createElement('div');figure.className='compare-figure';
      figure.append(sphere);panel.append(figure);
      const readout=document.createElement('div');readout.className='compare-readout';
      readout.append(document.getElementById(side+'-state'));
      const stats=content.querySelector('.half-prob.'+side);stats.replaceChildren();
      for(const tex of [String.raw`P_0=P_1=1/2`,phase]){
        const line=document.createElement('div');ControlBloch.math(line,tex);stats.append(line);
      }
      readout.append(stats);panel.append(readout);grid.append(panel);
    }
    content.append(grid);
    const conclusion=document.createElement('p');conclusion.className='compare-conclusion';
    conclusion.innerHTML='零相位驱动只在 <span data-math="y_{\\mathrm I}z_{\\mathrm I}"></span> 平面内转动；要到达 <span data-math="+x_{\\mathrm I}"></span> 目标，必须改变旋转轴。';
    conclusion.querySelectorAll('[data-math]').forEach(n=>ControlBloch.math(n,n.dataset.math));
    content.append(conclusion);
  }
  if(document.querySelector('#rabi-chart')){
    const frame=slide.querySelector('.rabi-frame');
    frame.innerHTML='I坐标 · 绕 <span data-math="+x_{\\mathrm I}"></span> 轴旋转';
    frame.querySelectorAll('[data-math]').forEach(n=>ControlBloch.math(n,n.dataset.math));
  }
  if(document.querySelector('#rabi-chart')&&!params.has('mode')){
    slide.classList.add('pulse-reading');
    slide.querySelector('#rabi-sphere').setAttribute('viewBox','85 -12 500 510');
    const labels={50:'等权叠加',100:'测得1',200:'回到初态'};
    document.querySelectorAll('[data-time]').forEach(b=>{const n=document.createElement('span');n.className='preset-caption';n.textContent=labels[b.dataset.time];b.append(n);});
    const row=slide.querySelector('.rabi-controls');
    const timeControl=document.createElement('div');timeControl.className='pulse-time-control';
    timeControl.append(row.querySelector('label'),row.querySelector('input'),row.querySelector('output'));
    // Preserve the wired controls; allocate explicit columns instead of pushing
    // the presets right with an auto margin. Captions now share the math row.
    row.prepend(timeControl);
  }
  // Definitions sit beside the two sphere drawings, not in a footer gutter.
  if(slide.querySelector('#input-controls')){
    slide.classList.add('gate-teaching');
    const mode=params.get('mode')||'compare';
    const definitions=mode==='basic'?[
      ['交换两个概率幅',String.raw`|0\rangle\mapsto|1\rangle`,String.raw`|1\rangle\mapsto|0\rangle`],
      ['改变相对相位',String.raw`|0\rangle\mapsto|0\rangle`,String.raw`|1\rangle\mapsto-|1\rangle`]
    ]:mode==='order'?[
      ['先H，后X',String.raw`U=XU_{\mathrm H}`,'右侧矩阵对应先做的操作。'],
      ['先X，后H',String.raw`U=U_{\mathrm H}X`,'前一步的输出是后一步的输入。']
    ]:[
      ['绕正y轴旋转',String.raw`|0\rangle\mapsto|+\rangle`,String.raw`|1\rangle\mapsto-|-\rangle`],
      ['Hadamard门',String.raw`|0\rangle\mapsto|+\rangle`,String.raw`|1\rangle\mapsto|-\rangle`]
    ];
    definitions.forEach((items,i)=>{
      const panel=document.createElement('div');panel.className='gate-definition '+(i?'right':'left');
      items.forEach((text,j)=>{
        const line=document.createElement(j?'div':'h3');
        if(text.includes('<span data-math=')){
          line.innerHTML=text;line.querySelectorAll('[data-math]').forEach(n=>ControlBloch.math(n,n.dataset.math));
        }else if(text.includes('\\'))ControlBloch.math(line,text);else line.textContent=text;
        panel.append(line);
      });
      slide.append(panel);
    });
    for(const id of ['left-sphere','right-sphere'])document.getElementById(id).setAttribute('viewBox','80 -10 490 520');
    if(mode==='basic'||mode==='compare'){
      slide.classList.add('gate-basic');
      if(mode==='compare')slide.classList.add('gate-compare');
      const grid=document.createElement('div');grid.className='gate-basic-grid';
      for(const side of ['left','right']){
        const panel=document.createElement('section');panel.className='gate-basic-panel';
        const heading=document.createElement('div');heading.className='gate-basic-heading';
        const definition=slide.querySelector('.gate-definition.'+side);
        heading.append(document.getElementById(side+'-title'),definition.querySelector('h3'));
        const mappings=document.createElement('div');mappings.className='gate-basic-mappings';
        [...definition.children].forEach(n=>mappings.append(n));definition.remove();
        const diagram=document.createElement('div');diagram.className='gate-basic-diagram';
        const sphere=document.getElementById(side+'-sphere');sphere.setAttribute('viewBox','85 -16 500 516');
        const readout=slide.querySelector('.readout.'+side);
        const label=document.createElement('h3');label.textContent='当前输出';readout.prepend(label);
        diagram.append(sphere,readout);panel.append(heading,mappings,diagram);grid.append(panel);
      }
      slide.querySelector('.divider').remove();
      const input=slide.querySelector('#input-controls');input.firstChild.textContent='共用输入';
      // Keep the existing buttons and listeners; only change their reading order.
      slide.append(slide.querySelector('.controls'),grid);
    }
  }
  if(document.querySelector('.workspace'))slide.classList.add('transmon-classroom');
  else{
    const body=document.createElement('div');body.className='classroom-body';
    [...slide.children].filter(e=>e.tagName!=='HEADER').forEach(e=>body.append(e));slide.append(body);
  }
  // Trim the former toolbar gutter to each composition's actual lower edge.
  const canvasHeight=slide.classList.contains('frames-reading')?540:slide.classList.contains('analysis-teaching')||slide.classList.contains('measurement-reading')||slide.classList.contains('pulse-reading')||slide.classList.contains('definition-slide')||slide.classList.contains('state-tuning')||slide.classList.contains('gate-basic')||slide.querySelector('.compare-grid')?560:slide.classList.contains('transmon-classroom')?510:
    slide.querySelector('#input-controls')?620:slide.querySelector('#fixed')?616:
    slide.classList.contains('analysis')?616:600;
  slide.style.setProperty('--classroom-height',canvasHeight+'px');
  function fit(){const s=Math.min(innerWidth/1280,innerHeight/canvasHeight);slide.style.transform=`scale(${s})`;slide.style.left=(innerWidth-1280*s)/2+'px';slide.style.top=(innerHeight-canvasHeight*s)/2+'px';}
  const refit=()=>requestAnimationFrame(fit);
  for(const name of ['resize','fullscreenchange'])addEventListener(name,refit);
  // Printing captures synchronously: apply classroom dimensions after the
  // standalone figure's print handler, without waiting for an animation frame.
  for(const name of ['beforeprint','afterprint'])addEventListener(name,fit);
  matchMedia('print').addEventListener('change',fit);
  const stop=()=>{const play=document.getElementById('play');if(play?.textContent.includes('暂停'))play.click();};
  addEventListener('message',event=>{
    if(event.source!==parent||event.data?.type!=='lecture03')return;
    if(event.data.action==='reset')document.getElementById('reset')?.click();
    if(event.data.action==='pause')stop();
    refit();
  });
  // Phase-only page starts on the equator; its own reset returns to this teaching state.
  if(params.has('equator')){
    const eq=()=>{const el=document.getElementById('polar');el.value=90;el.dispatchEvent(new Event('input',{bubbles:true}));const az=document.getElementById('azimuth');az.value=0;az.dispatchEvent(new Event('input',{bubbles:true}));};
    document.getElementById('reset').addEventListener('click',eq);eq();
  }
  document.addEventListener('keydown',event=>{
    if(['INPUT','SELECT','BUTTON'].includes(event.target.tagName))return;
    if(['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','PageDown','PageUp',' '].includes(event.key)){event.preventDefault();parent.postMessage({type:'lecture03-navigation',key:event.key},'*');}
  });
  fit();document.fonts.ready.then(()=>{fit();window.classroomReady=true;});
})();
