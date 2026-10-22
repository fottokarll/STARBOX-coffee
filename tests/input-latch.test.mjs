import test from 'node:test';
import assert from 'node:assert/strict';
import {createInputLatch} from '../experience/input-latch.js';

test('a held retry key and held steering cannot carry into a fresh round',()=>{
  const latch=createInputLatch(),keys=new Set(['Space','KeyD']);latch.capture(keys);
  assert.equal(latch.read(keys).down('Space'),false);
  assert.equal(latch.read(keys).down('KeyD'),false);
  keys.delete('Space');latch.release('Space');keys.add('Space');
  assert.equal(latch.read(keys).down('Space'),true,'a fresh press works even between two rendered frames');
  assert.equal(latch.read(keys).down('KeyD'),false,'releasing one action does not arm another held action');
  keys.clear();latch.read(keys);keys.add('KeyD');
  assert.equal(latch.read(keys).down('KeyD'),true);
});
test('controller retry and interrupted inputs also require release before jump',()=>{
  const latch=createInputLatch(),keys=new Set(['ArrowUp']);latch.capture(keys,true);
  assert.equal(latch.read(keys,true).padJump,false);
  keys.clear();assert.equal(latch.read(keys,false).down('ArrowUp'),false);
  keys.add('ArrowUp');assert.equal(latch.read(keys,true).padJump,true);
  assert.equal(latch.read(keys).down('ArrowUp'),true,'SDK focus reset arms a future real press');
});
