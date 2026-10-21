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
