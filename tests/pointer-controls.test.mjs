import assert from 'node:assert/strict';
import test from 'node:test';
import {createPointerControls} from '../experience/pointer-controls.js';

function fixture() {
  const actions = new Set(), calls = [];
  const input = createPointerControls((x, y) => y < 80 ? null : x < 50 ? 'left' : x < 100 ? 'right' : 'jump',
    (id, down) => { calls.push({id, down}); if (down) actions.add(id); else actions.delete(id); });
  const touch = (x, y, dx = 0, dy = 0) => ({x, y, dx, dy, button: 0, touch: true});
  return {input, actions, calls, touch};
}

test('release over another button releases the originating action, preserving jump', () => {
  const {input, actions, touch} = fixture();
  input.down(touch(25, 100)); input.down(touch(150, 100));
  input.move(touch(75, 100, 50));
  input.up(touch(150, 100, 75)); // final release delta identifies the moved left finger
  assert.deepEqual([...actions], ['jump']);
  input.up(touch(150, 100)); assert.equal(actions.size, 0);
});

test('off-button jump release preserves steering; blank contacts cannot cancel it', () => {
  const {input, actions, touch} = fixture();
  input.down(touch(75, 100)); input.down(touch(150, 100)); input.down(touch(200, 50));
  input.move(touch(160, 50, 10, -50)); input.up(touch(160, 50));
  assert.deepEqual([...actions], ['right']);
  input.up(touch(200, 50)); assert.deepEqual([...actions], ['right']);
  input.up(touch(75, 100)); assert.equal(actions.size, 0);
});

test('crossing fingers retain their actions and duplicate contacts use reference counts', () => {
  const {input, actions, calls, touch} = fixture();
  input.down(touch(25, 100)); input.down(touch(150, 100));
  input.move(touch(100, 110, 75, 10)); input.move(touch(40, 90, -110, -10));
  input.up(touch(40, 90)); assert.deepEqual([...actions], ['left']);
  input.down(touch(30, 100)); input.up(touch(100, 110));
  assert.deepEqual([...actions], ['left']);
  assert.equal(calls.filter(c => c.id === 'left' && !c.down).length, 0);
  input.up(touch(30, 100)); assert.equal(actions.size, 0);
});

test('mouse release ignores release coordinates; clearing a screen releases every held action', () => {
  const {input, actions, touch} = fixture();
  input.down({x: 25, y: 100, button: 0});
  input.up({x: 150, y: 50, button: 0}); assert.equal(actions.size, 0);
  input.down(touch(25, 100)); input.down(touch(150, 100)); input.clear();
  assert.equal(actions.size, 0);
  input.up(touch(25, 100)); input.up(touch(150, 100));
  assert.equal(actions.size, 0);
});

test('steering contact slides both ways while a second thumb holds jump', () => {
  const {input, actions, touch} = fixture();
  input.down(touch(25, 100));input.down(touch(150, 100));
  input.move(touch(75, 100, 50));assert.deepEqual([...actions].sort(), ['jump','right']);
  input.move(touch(25, 100, -50));assert.deepEqual([...actions].sort(), ['jump','left']);
  input.up(touch(25, 30, 0, -70));assert.deepEqual([...actions], ['jump']);
  input.up(touch(150, 100));assert.equal(actions.size, 0);
});

test('jump and blank origins keep identity when crossing steering contacts', () => {
  const {input, actions, touch} = fixture();
  input.down(touch(150, 100));input.down(touch(75, 30));input.down(touch(25, 100));
  input.move(touch(75, 100, -75)); // jump thumb passes onto right
  input.move(touch(25, 105, -50, 75)); // blank contact crosses onto left
  input.move(touch(75, 90, 50, -10)); // steering thumb becomes right
  assert.deepEqual([...actions].sort(), ['jump','right']);
  input.up(touch(25, 105));assert.deepEqual([...actions].sort(), ['jump','right']);
  input.up(touch(75, 100));assert.deepEqual([...actions], ['right']);
  input.up(touch(75, 90));assert.equal(actions.size,0);
});

test('sliding duplicate steering contacts updates counts without releasing the other contact', () => {
  const {input, actions, calls, touch} = fixture();
  input.down(touch(20,100));input.down(touch(30,100));input.down(touch(150,100));
  input.move(touch(70,100,50));assert.deepEqual([...actions].sort(),['jump','left','right']);
  assert.equal(calls.filter(c=>c.id==='left'&&!c.down).length,0);
  input.move(touch(80,100,50));assert.deepEqual([...actions].sort(),['jump','right']);
  input.up(touch(70,100));assert.deepEqual([...actions].sort(),['jump','right']);
  input.clear();assert.equal(actions.size,0);
  input.up(touch(80,100));input.up(touch(150,100));assert.equal(actions.size,0);
});

test('menu actions may synchronously clear contacts before a new round', () => {
  const calls=[];let input;
  input=createPointerControls(()=> 'restart',(id,down)=>{calls.push([id,down]);input.clear();});
  input.down({x:150,y:100,touch:true});input.up({x:150,y:100,touch:true});
  assert.deepEqual(calls,[['restart',true]]);
});
