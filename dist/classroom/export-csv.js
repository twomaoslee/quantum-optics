/* Shared by the teacher download and export acceptance checks. No stored data. */
(function(root,factory){
 'use strict';
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.QOExportCSV=factory();
})(typeof window==='object'?window:this,function(){
 'use strict';
 const headers=['课堂名称','课堂编号','姓名','学号','题目编号','题目标题','题干','公式','补充说明','选项A','选项B','选项C','选项D','轮次','学生答案','学生所选内容','正确答案','正确答案内容','作答结果','解析','最后提交时间（北京时间）'];
 const timeFormat=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 function cell(value){
  // Quoting alone does not prevent spreadsheet formula execution.
  const text=String(value??'').replace(/^(?=\s*[=+@\-\t\r\n])/u,"'");
  return '"'+text.replace(/"/g,'""')+'"';
 }
 function create(result){
  const questions=new Map(result.questions.map(q=>[q.id,q])),rounds=new Map(result.rounds.map(r=>[r.id,r]));
  const rows=[...result.rows].sort((a,b)=>(rounds.get(a.roundId)?.number??0)-(rounds.get(b.roundId)?.number??0)||String(a.studentNumber).localeCompare(String(b.studentNumber),'zh-CN'));
  const lines=[headers,...rows.map(row=>{
   const q=questions.get(row.questionId),round=rounds.get(row.roundId);
   if(!q?.correct||!round||typeof row.isCorrect!=='boolean')throw new Error('导出数据版本不一致，请刷新后重试。');
   const options=new Map(q.options);
   return [result.room?.title,result.room?.code,row.name,row.studentNumber,q.id,q.title,q.stem,
    q.mathLines?.join('\n')||q.math||'',q.reference,...['A','B','C','D'].map(key=>options.get(key)),
    round.number,row.choice,options.get(row.choice),q.correct,options.get(q.correct),row.isCorrect?'答对':'答错',q.explanation,
    timeFormat.format(new Date(row.submittedAt))];
  })];
  return '\uFEFF'+lines.map(row=>row.map(cell).join(',')).join('\r\n');
 }
 return {create};
});
