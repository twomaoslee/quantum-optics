(function(){
 'use strict';
 function element(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
 function draw(container,data,{compact=false}={}){
  container.replaceChildren();const charts=element('div','round-charts');charts.setAttribute('aria-label','本题各轮答案分布，统一百分比尺度');
  charts.classList.toggle('single-round',data.rounds.length===1);
  for(const round of data.rounds){
   const chart=element('section','round-chart');chart.style.setProperty('--round-color',['#0070c0','#5796bd','#235578','#7e9cb1'][(round.ordinal-1)%4]);
   chart.append(element('h3','','第 '+round.ordinal+' 轮'),element('p','round-total',round.total+' 人提交'));
   for(const letter of 'ABCD'){
    const n=round.counts[letter],percent=round.total?Math.round(100*n/round.total):0,row=element('div','comparison-bar');
    const label=element('div','comparison-label');label.append(element('strong','',letter),element('span','',n+' 人 · '+percent+'%'));
    const track=element('div','comparison-track'),fill=element('div','comparison-fill');fill.style.width=percent+'%';track.append(fill);row.append(label,track);chart.append(row);
   }
   charts.append(chart);
  }
  charts.tabIndex=0;
  const note=compact?'仅选择分布；按本轮提交人数计算。'+(data.rounds.length>2?' 共'+data.rounds.length+'轮，左右滑动查看。':''):'各轮按本轮实际提交人数计算；柱长统一使用 0–100% 尺度。'+(data.rounds.length>4?' 轮次较多时可左右滚动查看。':'');
  container.append(charts,element('p','comparison-note',note));
 }
 function summary(node,analysis){
  node.replaceChildren();const heading=element('h3','','AI小结');node.append(heading);
  if(analysis?.status==='ready'){const source=element('span','ai-source',analysis.model);if(analysis.model==='deepseek-flash')source.title='官方型号表（2026-11-02核对）：DeepSeek-V4.1-Flash-1017；API型号：deepseek-flash';heading.append(source);node.append(element('p','',analysis.summary));}
  else node.append(element('p','',analysis?.status==='pending'?'正在分析，图表可先查看…':analysis?.message||'点击展示结果后生成小结。'));
 }
 const roundColors=['#2674ae','#d98232','#33877b','#8466a9','#8b6a4b'];
 const percent=(round,letter)=>round.total?Math.round(100*round.counts[letter]/round.total):0;
 function swatch(text,color){const item=element('span','series-key'),dot=element('i','series-dot');dot.style.background=color;item.append(dot,document.createTextNode(text));return item;}
 function drawCompact(container,data,{mode='bars'}={}){
  container.replaceChildren();const rounds=data.rounds,legend=element('div','series-legend');
  if(mode==='profile'){
   for(const [i,r]of rounds.entries())legend.append(swatch('第'+r.ordinal+'轮 · '+r.total+'人'+(!r.total?' · 无提交':''),roundColors[i%roundColors.length]));
   container.append(legend);const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
   const add=(tag,attrs,text)=>{const node=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,v);if(text!==undefined)node.textContent=text;svg.append(node);return node;};
   svg.setAttribute('viewBox','0 0 264 188');svg.setAttribute('class','answer-profile');svg.setAttribute('role','img');svg.setAttribute('aria-label','每条曲线代表一轮：横轴A至D选项，纵轴本轮提交人数中的比例；无提交轮次不绘线。');
   const left=34,right=250,top=15,bottom=150,x=i=>left+(right-left)*i/3,y=p=>bottom-(bottom-top)*p/100;
   for(const p of [0,50,100]){add('line',{x1:left,y1:y(p),x2:right,y2:y(p),class:'profile-grid'});add('text',{x:left-5,y:y(p)+4,'text-anchor':'end',class:'profile-tick'},p+'%');}
   for(const [i,letter]of [...'ABCD'].entries())add('text',{x:x(i),y:170,'text-anchor':'middle',class:'profile-tick'},letter);
   for(const [index,r]of rounds.entries()){
    if(!r.total)continue;const color=roundColors[index%roundColors.length],points=[...'ABCD'].map((letter,i)=>x(i)+','+y(percent(r,letter)));
    add('polyline',{points:points.join(' '),fill:'none',stroke:color,'stroke-width':2.2,'data-round':r.ordinal});
    for(const [i,letter]of [...'ABCD'].entries()){
     const p=percent(r,letter),dot=add('circle',{cx:x(i),cy:y(p),r:3,fill:color,'data-round':r.ordinal,'data-choice':letter,'data-percent':p});
     const title=document.createElementNS(ns,'title');title.textContent='第'+r.ordinal+'轮 · '+letter+'：'+r.counts[letter]+'人 · '+p+'%';dot.append(title);
    }
   }
   container.append(svg,element('p','profile-caption','每条线代表一轮；横轴为选项，纵轴为该轮选择比例。'));
  }else{
   for(const [i,r]of rounds.entries())legend.append(swatch('第'+r.ordinal+'轮 · '+r.total+'人'+(!r.total?' · 无提交':''),roundColors[i%roundColors.length]));
   container.append(legend);const groups=element('div','option-groups');groups.setAttribute('aria-label','按选项分组的各轮柱状图，统一百分比尺度');
   for(const letter of 'ABCD'){
    const group=element('section','option-group'),rows=element('div','choice-rounds');group.append(element('strong','option-letter',letter),rows);
    for(const [i,r]of rounds.entries()){
     const row=element('div','choice-round'),track=element('div','grouped-track'),fill=element('div','grouped-fill'),p=percent(r,letter);
     row.title='第'+r.ordinal+'轮 · '+letter;fill.style.width=p+'%';fill.style.background=roundColors[i%roundColors.length];track.append(fill);
     row.append(element('span','round-index',String(r.ordinal)),track,element('span','grouped-value',r.counts[letter]+'人 · '+(r.total?p+'%':'—')));rows.append(row);
    }groups.append(group);
   }container.append(groups);
  }
  container.append(element('p','comparison-note','仅选择分布；比例按本轮提交人数计算。'+(rounds.some(r=>!r.total)?' 无提交轮次留空。':'')));
 }
 window.QOComparison={draw,drawCompact,summary};
})();
