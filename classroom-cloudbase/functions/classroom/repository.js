'use strict';
function cloudRepository(db) {
  const collection = 'qo_classroom';
  const check = result => { if (result.code) throw new Error('Database operation failed'); return result; };
  const adapter = source => ({
    async get(id) {
      const result = check(await source.collection(collection).doc(id).get());
      // The SDK returns an array for doc.get outside transactions and an object
      // in some transaction versions. Normalize both without treating [] as data.
      const row=Array.isArray(result.data) ? result.data[0] || null : result.data || null;
      if(!row)return null;const {_id,_openid,...data}=row;return data;
    },
    async set(id,data) { check(await source.collection(collection).doc(id).set(data)); },
    async remove(id) { check(await source.collection(collection).doc(id).remove()); }
  });
  return {...adapter(db),
    async transaction(fn) {
      const result = await db.runTransaction(async tx => fn(adapter(tx)), 5);
      if(result?.errMsg==='runTransaction:ok')return result.result;
      // node-sdk 3.18.7 returns the callback value directly.
      return result;
    },
    async count(filter) { return check(await db.collection(collection).where(filter).count()).total; },
    async list(filter) {
      const rows = [];
      for (let skip=0;;skip+=100) {
        const page = check(await db.collection(collection).where(filter).orderBy('_id','asc').skip(skip).limit(100).get());
        rows.push(...page.data); if(page.data.length<100)break;
      }
      return rows;
    }
  };
}
module.exports = {cloudRepository};
