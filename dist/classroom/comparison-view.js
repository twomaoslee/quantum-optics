(function(){
 'use strict';
 function element(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
 function draw(container,data){
  container.replaceChildren();const charts=element('div','round-charts');charts.setAttribute('aria-label','本题各轮答案分布，统一百分比尺度');
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
  container.append(charts,element('p','comparison-note','各轮按本轮实际提交人数计算；柱长统一使用 0–100% 尺度。'+(data.rounds.length>4?' 轮次较多时可左右滚动查看。':'')));
 }
 function summary(node,analysis){
  node.replaceChildren();node.append(element('h3','','AI小结'));
  if(analysis?.status==='ready'){node.append(element('p','',analysis.summary),element('p','ai-source','模型：'+analysis.model));}
  else node.append(element('p','',analysis?.status==='pending'?'正在分析，图表可先查看…':analysis?.message||'点击展示结果后生成小结。'));
 }
 window.QOComparison={draw,summary};
})();
