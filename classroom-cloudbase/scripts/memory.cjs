const fs=require('node:fs/promises'),path=require('node:path');
function memoryRepository(file) {
  let data={},tail=Promise.resolve();
  const ready=file ? fs.readFile(file,'utf8').then(s=>{data=JSON.parse(s);}).catch(e=>{if(e.code!=='ENOENT')throw e;}) : Promise.resolve();
  const copy=x=>x===undefined?null:structuredClone(x);
  const adapter=target=>({get:async id=>copy(target[id]),set:async(id,value)=>{target[id]=copy(value);},remove:async id=>{delete target[id];}});
  async function transaction(fn) {
    const next=tail.then(async()=>{
      await ready;const draft=copy(data),result=await fn(adapter(draft));
      if(file){await fs.mkdir(path.dirname(file),{recursive:true,mode:0o700});await fs.writeFile(file+'.tmp',JSON.stringify(draft),{mode:0o600});await fs.rename(file+'.tmp',file);}
      data=draft;return result;
    });tail=next.catch(()=>{});return next;
  }
  return {transaction,get:async id=>{await ready;await tail;return copy(data[id]);},
    set:(id,value)=>transaction(tx=>tx.set(id,value)),remove:id=>transaction(tx=>tx.remove(id)),
    count:async filter=>{await ready;await tail;return Object.values(data).filter(row=>Object.entries(filter).every(([k,v])=>row[k]===v)).length;},
    list:async filter=>{await ready;await tail;return Object.values(data).filter(row=>Object.entries(filter).every(([k,v])=>row[k]===v)).map(copy);}};
}
module.exports={memoryRepository};
