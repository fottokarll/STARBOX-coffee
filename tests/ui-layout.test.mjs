import test from 'node:test';
import assert from 'node:assert/strict';
import {headerLayout} from '../experience/ui-layout.js';
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
test('timer and pause/mute targets stay clear of the Project 0 toolbar and each other',()=>{
  for(const [w,h]of[[320,568],[390,844],[500,600],[640,360],[960,640],[844,390]])for(const game of[true,false]) {
    const l=headerLayout(w,h,game),boxes=[l.timer,l.mute,l.pause].filter(Boolean);
    for(const b of boxes){assert.ok(b.y>=54);assert.ok(b.x>=0&&b.x+b.w<=w&&b.y+b.h<=h);}
    for(const a of boxes)for(const b of boxes)if(a!==b)assert.equal(overlap(a,b),false,`${w}x${h} overlap`);
    if(l.short&&game)assert.ok(l.pause.y>=h-70,'compact controls share the bottom row, leaving jumps clear');
  }
});
