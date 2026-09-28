'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const data = window.TRANSMON_SPECTRA;
  let mode = 'transmon';
  const blue = '#0070c0', gray = '#607487', rule = '#d7e3ec';
  const math = (tex, cls, left, top) => `<span class="${cls}" style="left:${left}px;top:${top}px" data-math="${tex}"></span>`;
  function typeset() { document.querySelectorAll('[data-math]').forEach(el => {
    if (el.dataset.rendered === el.dataset.math) return;
    katex.render(el.dataset.math, el, {throwOnError:true, strict:'error'});
    el.dataset.rendered = el.dataset.math;
  }); }
  function circuit() {
    const element = mode === 'lc'
      ? '<path d="M225 12V56q32 0 0 24q32 0 0 24q32 0 0 24q32 0 0 24V194"/>'
      : '<path d="M225 12V85M225 121V194M207 85L243 121M243 85L207 121"/>';
    $('circuit').innerHTML = '<g fill="none" stroke="#253646" stroke-width="3"><path d="M55 85V12H225M55 121V194H225M31 85H79M31 121H79"/>' + element + '</g><text x="8" y="111">C</text><text x="253" y="111">' + (mode === 'lc' ? 'L' : '结') + '</text>';
    $('circuit').setAttribute('aria-label', mode === 'lc' ? '电容与线性电感并联' : '电容与约瑟夫森结并联');
  }
  function render() {
    const c = Number($('capacitance').value);
    const row = data.rows[c - 40];
    const transmon = mode === 'transmon';
    const energies = transmon ? row.levels : [0, row.lc, 2 * row.lc];
    const f01 = transmon ? row.f01 : row.lc;
    const f12 = transmon ? row.f12 : row.lc;
    const separation = (f01 - f12) * 1000;
    $('c-value').textContent = c + ' fF';
    $('capacitance').setAttribute('aria-valuetext', c + ' 飞法');
    $('lc').setAttribute('aria-pressed', String(!transmon));
    $('transmon').setAttribute('aria-pressed', String(transmon));
    $('fixed-parameter').innerHTML = transmon
      ? '约瑟夫森结参数保持不变'
      : '固定电感：<span data-math="L=' + data.inductanceNH.toFixed(2) + '\\,\\mathrm{nH}"></span>';
    circuit();
    // Fixed scale for every mode and capacitance. Energy origin alone is shifted.
    const y = e => 385 - e / 20 * 360;
    let svg = '<path d="M50 15V385H380" fill="none" stroke="' + gray + '" stroke-width="1.5"/>';
    for (let tick=0; tick<=20; tick+=4) svg += `<path d="M45 ${y(tick)}H380" stroke="${rule}" stroke-width="1"/><text x="36" y="${y(tick)+7}" text-anchor="end">${tick}</text>`;
    let labels = '';
    energies.forEach((e, i) => {
      const color = i===2 ? gray : blue;
      svg += `<path d="M77 ${y(e)}H237" stroke="${color}" stroke-width="4"/>`;
      labels += math(`|${i}\\rangle`, 'level-label'+(i===2?' gray':''), 241, y(e));
    });
    [f01, f12].forEach((f,i) => {
      const x=292, y1=y(energies[i]), y2=y(energies[i+1]);
      svg += `<path d="M${x-5} ${y1}H${x+5}M${x} ${y1}V${y2}M${x-5} ${y2}H${x+5}" stroke="${i?gray:blue}" stroke-width="2" fill="none"/>`;
      labels += math(`\\nu_{${i}${i+1}}`, 'gap-label', 305, (y1+y2)/2);
    });
    $('levels').innerHTML=svg;
    $('level-labels').innerHTML=labels;
    $('levels').setAttribute('aria-label', `三个能级相对能量除以h，单位GHz：${energies.map(e=>e.toFixed(3)).join('，')}`);
    $('f01').textContent = f01.toFixed(3) + ' GHz';
    $('f12').textContent = f12.toFixed(3) + ' GHz';
    $('separation').textContent = separation.toFixed(1) + ' MHz';
    // The two marks use the SAME horizontal axis, separate lanes prevent overlap.
    const fx=f=>65+(f-4)/5*325;
    let freq = `<path d="M45 167H390" stroke="${gray}" stroke-width="1.5"/>`;
    for (let tick=4;tick<=9;tick++) freq+=`<path d="M${fx(tick)} 167v6" stroke="${gray}"/><text x="${fx(tick)}" y="197" text-anchor="middle">${tick}</text>`;
    freq+='<text x="390" y="226" text-anchor="end">频率（GHz）</text>';
    freq+=`<path d="M${fx(f01)} 20V167" stroke="${blue}" stroke-width="2"/><circle cx="${fx(f01)}" cy="46" r="8" fill="${blue}"/>`;
    freq+=`<path d="M${fx(f12)} 91V167" stroke="${gray}" stroke-width="2" stroke-dasharray="5 4"/><rect x="${fx(f12)-7}" y="107" width="14" height="14" fill="${gray}"/>`;
    freq+='<text x="4" y="53">0→1</text><text x="4" y="121">1→2</text>';
    $('frequencies').innerHTML=freq;
    $('frequencies').setAttribute('aria-label', `0到1跃迁${f01.toFixed(3)}GHz，1到2跃迁${f12.toFixed(3)}GHz，频率差${separation.toFixed(1)}MHz`);
    $('conclusion').textContent = transmon
      ? '电容增大时，两种跃迁的频率差减小。'
      : '改变电容会改变频率，但相邻能级仍等间隔：两种跃迁始终频率相同。';
    typeset();
    window.transmonLabState = {mode, capacitanceFF:c, energiesGHz:energies, f01GHz:f01, f12GHz:f12, separationMHz:separation};
  }
  function fit() {
    const scale=Math.min(innerWidth/1280, innerHeight/720);
    $('slide').style.transform=`scale(${scale})`;
    $('slide').style.left=(innerWidth-1280*scale)/2+'px';
    $('slide').style.top=(innerHeight-720*scale)/2+'px';
  }
  $('capacitance').addEventListener('input',render);
  ['lc','transmon'].forEach(id=>$(id).addEventListener('click',()=>{mode=id;render();}));
  $('reset').addEventListener('click',()=>{mode='transmon';$('capacitance').value=60;render();});
  let fallback=false;
  $('fullscreen').addEventListener('click',async()=>{
    if(fallback){window.open(location.href,'_blank','noopener');return;}
    try{if(document.fullscreenElement) await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
    catch{fallback=true;$('fullscreen').textContent='新窗口放大';}
  });
  document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'退出全屏':'全屏';fit();});
  window.addEventListener('resize',fit);
  render();fit();
  installFigurePrint({
    getState:()=>({mode,capacitanceFF:Number($('capacitance').value)}),
    setState:state=>{mode=state.mode;$('capacitance').value=state.capacitanceFF;render();},
    defaults:{mode:'transmon',capacitanceFF:60},fit
  });
  document.fonts.ready.then(()=>{window.figureReady=true;});
})();
