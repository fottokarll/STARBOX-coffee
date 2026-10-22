import test from 'node:test';
import assert from 'node:assert/strict';
import {readRecords,keepRecord} from '../experience/records.js';
test('personal records keep the highest climb and fastest legitimate finish per recipe',()=>{
  let r=readRecords(null);
  r=keepRecord(r,{recipe:'espresso',progress:.6,bestHeight:20,time:10,success:false});
  r=keepRecord(r,{recipe:'espresso',progress:.2,bestHeight:7,time:3,success:false});
  assert.equal(r.espresso.progress,.6);assert.equal(r.espresso.time,null);
  for(const time of [30,32,28])r=keepRecord(r,{recipe:'espresso',progress:1,bestHeight:35,time,success:true});
  assert.equal(r.espresso.time,28);assert.equal(r.espresso.progress,1);assert.equal(r.latte.progress,0);
  assert.deepEqual(readRecords({starbox:{bests:r}}),r);
  assert.equal(readRecords({starbox:{bests:{latte:{progress:99,time:-1}}}}).latte.progress,1);
});
