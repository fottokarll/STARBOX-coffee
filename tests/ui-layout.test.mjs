import test from 'node:test';
import assert from 'node:assert/strict';
import {headerLayout,touchLayout} from '../experience/ui-layout.js';
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const viewports=[[320,568],[390,844],[500,600],[640,360],[960,640],[844,390],[320,260],[2560,1440]];
test('primary HUD is above timer and targets stay clear of Project 0 toolbar and each other',()=>{
  for(const [w,h]of viewports)for(const game of[true,false]) {
    const l=headerLayout(w,h,game),boxes=[l.hud,l.timer,l.mute,l.pause].filter(Boolean);
    for(const b of boxes){assert.ok(b.y>=54);assert.ok(b.x>=0&&b.x+b.w<=w&&b.y+b.h<=h);}
    for(const a of boxes)for(const b of boxes)if(a!==b)assert.equal(overlap(a,b),false,`${w}x${h} overlap`);
    if(game){assert.ok(l.hud.y+l.hud.h<l.timer.y);assert.ok(l.pause.w>=38&&l.pause.h>=38);}
  }
});
test('portrait two-thumb targets have safe edges, expanded bounds, and no overlapping actions',()=>{
  for(const [w,h]of viewports) {
    const l=touchLayout(w,h),keys=[l.left,l.right,l.jump],hits=keys.map(k=>k.hit);
    for(const k of keys){assert.ok(k.w>=64&&k.h>=64);assert.ok(k.hit.w>k.w&&k.hit.h>k.h);}
    for(const b of hits){assert.ok(b.x>=0&&b.y>=54&&b.x+b.w<=w&&b.y+b.h<=h-6,`${w}x${h} safe edge`);}
    for(const a of hits)for(const b of hits)if(a!==b)assert.equal(overlap(a,b),false,`${w}x${h} overlap`);
    assert.ok(l.jump.x>w/2);assert.ok(l.right.x+l.right.w<=w/2+.1);
    assert.ok(l.jump.w>=l.left.w&&l.jump.h>=l.left.h,'jump is the largest thumb target');
    const header=headerLayout(w,h,true);
    for(const box of [header.timer,header.mute,header.pause,header.hud])for(const hit of hits)
      assert.equal(overlap(box,hit),false,`${w}x${h} HUD clear of thumb targets`);
  }
});
