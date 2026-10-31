const test=require('node:test'),assert=require('node:assert/strict');
const {cloudRepository}=require('../functions/classroom/repository');
test('SDK adapter handles direct transaction returns, array doc results and transaction objects',async()=>{
 let written;
 const document={get:async()=>({data:[{_id:'x',value:1}]}),set:async data=>{written=data;return {updated:1};},remove:async()=>({deleted:1})};
 const txdoc={...document,get:async()=>({data:{_id:'x',value:2}})};
 const db={collection:()=>({doc:()=>document}),runTransaction:async fn=>fn({collection:()=>({doc:()=>txdoc})})};
 const repo=cloudRepository(db);assert.deepEqual(await repo.get('x'),{value:1});
 const result=await repo.transaction(async tx=>{assert.deepEqual(await tx.get('x'),{value:2});await tx.set('x',{value:3});return {ok:true};});
 assert.deepEqual(result,{ok:true});assert.deepEqual(written,{value:3});
});
test('SDK adapter treats empty results as missing; errors do not become data',async()=>{
 const db={collection:()=>({doc:()=>({get:async()=>({data:[]})})})};
 assert.equal(await cloudRepository(db).get('x'),null);
 db.collection=()=>({doc:()=>({get:async()=>({code:'DENIED',message:'secret'})})});await assert.rejects(()=>cloudRepository(db).get('x'));
});
