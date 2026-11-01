const test=require('node:test'),assert=require('node:assert/strict');
const {decodeRequest}=require('../functions/classroom/transport');
test('gateway JSON and base64 envelopes reach the same RPC; query parameters cannot override it',()=>{
 const rpc={action:'student.submit',roomCode:'123456',data:{roundId:'r',choice:'C'},token:'example'};
 for(const encoded of [false,true]){
  const body=encoded?Buffer.from(JSON.stringify(rpc)).toString('base64'):JSON.stringify(rpc);
  assert.deepEqual(decodeRequest({httpMethod:'POST',body,isBase64Encoded:encoded,queryStringParameters:{action:'teacher.export'}}),rpc);
 }
 assert.equal(decodeRequest(rpc),rpc);
});
test('gateway rejects unsafe methods, malformed/oversized JSON and non-object bodies',()=>{
 for(const event of [{httpMethod:'GET',body:'{}'},{httpMethod:'POST',body:'{'},{httpMethod:'POST',body:'[]'},{httpMethod:'POST',body:'null'},{httpMethod:'POST',body:' '.repeat(16385)}])assert.throws(()=>decodeRequest(event));
});
