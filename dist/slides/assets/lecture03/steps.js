/* Teaching units, not isolated sentences: top to bottom, then left to right. */
window.prepareLecture03Steps=()=>{
  // Only reviewed premises may accompany a lead on entry. A lab/iframe is
  // not automatically a premise: it can already contain the answer.
  const entryContext={
    'l03-phase-limit':'编码、元件作用式是判断能否翻转的条件；算例和结论仍后揭示。',
    'l03-same-prob':'陈述式导入；两个时刻的态是后续测量比较的对象。',
    'l03-levels':'陈述式导入；电路与频谱用于观察已介绍的频率选择。',
    'l03-sphere':'陈述式导入；调参验证上一页已定义的球面坐标。',
    'l03-rabi-sphere':'陈述式导入；将已求出的概率与几何旋转对照。',
    'l03-pulse':'陈述式导入；观察已定义的脉冲时长与关断末态。',
    'l03-phase-question':'陈述式导入；并列展示已知脉冲结果与指定目标。',
    'l03-target':'初态和目标点是任务条件；选时长、选相位的办法随后揭示。',
    'l03-analysis':'陈述式导入；初始画面是分析脉冲作用前的两态。',
    'l03-measurement':'陈述式导入；比较两种已说明的测量参照。',
    'l03-order':'问题明确指向线路；初始画面只运行到输入态，不展示末态。'
  };
  const children=e=>[...e.children];
  const blocks=e=>children(e).flatMap(n=>{
    if(n.matches('.page-content,.step-wrapper,.balanced-content,.free-derivation,.rabi-derivation'))return blocks(n);
    if(n.matches('.columns'))return children(n).map(col=>[col]);
    if(n.matches('.recap-grid'))return children(n).map(panel=>[panel]);
    if(n.matches('.sequence')){
      const c=children(n);return [[c[0]],[c[1],c[2]],[c[3],c[4]]];
    }
    if(n.matches('table')){
      n.classList.add('staged-table');
      const rows=[...n.querySelectorAll('tbody>tr')];
      return rows.map((row,i)=>i? [row]:[n.querySelector('thead'),row].filter(Boolean));
    }
    return [[n]];
  });
  for(const slide of document.querySelectorAll('section.l03')){
    if(slide.matches('.cover,.closing-slide,.section-index'))continue;
    const body=slide.querySelector('.s-body');
    // The older authoring marks revealed only selected conclusions. Preserve
    // their layout boxes, but replace that incomplete order with one full plan.
    for(const n of body.querySelectorAll('.fragment')){
      n.classList.remove('fragment','visible','current-fragment');
      n.removeAttribute('data-fragment-index');
      n.classList.add('step-wrapper');
    }
    let units;
    const readingRoot=body.querySelector(':scope>.balanced-content')||body;
    const question=readingRoot.querySelector(':scope>.page-question');
    const content=readingRoot.querySelector(':scope>.page-content')||readingRoot;
    if(slide.classList.contains('focus-slide')){
      const frame=body.querySelector('iframe'),panel=body.querySelector('.focus-reading');
      const reading=blocks(panel);
      units=[[frame,...reading.shift()],...reading];
      // Probability text, bar, and status are one readout, not three clicks.
      if(slide.id==='l03-repair'&&units.length===4)units=[units[0],units[1],[...units[2],...units[3]]];
    }else units=blocks(content).filter(u=>!u.includes(question));
    // Keep an explanation with the equation it introduces or interprets.
    const merge=(start,count)=>units.splice(start,count,units.slice(start,start+count).flat());
    if(slide.id==='l03-phase-limit')merge(0,2);
    if(slide.id==='l03-operation'){
      const table=content.querySelector('.operation-comparison'),rows=[...table.querySelectorAll('tbody>tr')];
      units=[[table.querySelector('thead'),rows[0]],[rows[1]],
        [rows[2],content.querySelector('.operation-counterexample')],
        [content.querySelector('.operation-conclusion')]];
    }
    if(slide.id==='l03-check'){
      units=[...children(content.querySelector('.check-solutions')).map(n=>[n]),
        [content.querySelector('.check-followup')],[content.querySelector('.check-detuning .answer')],
        [content.querySelector('.check-extension')]];
    }
    // One complete procedure is the first answer step, AFTER the question.
    if(slide.id==='l03-sampling')merge(0,3);
    if(slide.id==='l03-resonance'){
      const columns=content.querySelector('.columns');
      units=[[content.querySelector('.rwa-decomposition')],[columns],...units.slice(3)];
    }
    if(slide.id==='l03-same-prob'){
      const table=content.querySelector('table'),rows=[...table.querySelectorAll('tbody>tr')];
      units=[[content.querySelector('.state-time-comparison')],
        [content.querySelector('.measurement-procedure'),table.querySelector('thead'),rows[0]],
        [rows[1]],[content.querySelector('.conclusion')]];
    }
    if(slide.id.startsWith('b-')){
      // A formula and its immediate explanatory sentence form one unit.
      units=units.reduce((result,u)=>{
        const previous=result.at(-1);
        if(u.length===1&&u[0].matches('p')&&previous?.some(e=>e.matches('.equation')))previous.push(...u);
        else result.push(u);
        return result;
      },[]);
    }
    if(slide.id==='b-target'){
      const paragraphs=content.querySelectorAll('p'),equations=content.querySelectorAll('.equation');
      units=[[paragraphs[0],equations[0]],[equations[1]],[paragraphs[1],equations[2]]];
    }
    if(slide.id==='b-unitary')units=[[...units[0],units[1][0]],[...units[1].slice(1),...units[2]]];
    const hasEntryContext=!!entryContext[slide.id];
    slide.dataset.entryPolicy=question?(hasEntryContext?'context':'prompt'):'first-unit';
    let index=question&&!hasEntryContext?0:-1;
    for(const unit of units){
      for(const n of unit){
        n.dataset.teachingStep=String(index);
        if(index>=0){n.classList.add('fragment');n.dataset.fragmentIndex=String(index);}
      }
      index++;
    }
    slide.dataset.stepCount=String(index);
  }
};
