import test from 'node:test';
import assert from 'node:assert/strict';
import {BODY,overlapsBody,platformThickness,sweepBody} from '../experience/collision.js';
import {createRun,step,makeCourse} from '../experience/rules.js';

function fixture(y=8) {
  const r=createRun('espresso');r.state='play';r.platforms=[{...r.platforms[0],y,kind:'solid',halfWidth:.3}];
  r.coyote=0;r.y=y;r.grounded=true;r.onPlatform=0;r.ingredients=[];return r;
}
for(const dt of [1/240,1/120,1/60,1/30,1/15,1/10]) {
  test(`solid tops, sides and undersides at ${1/dt} FPS`,()=>{
    const standing=fixture();
    for(let t=0;t<1;t+=dt)step(standing,{},dt);
    assert.equal(standing.y,8);assert.equal(standing.grounded,true);
    const falling=fixture();falling.y=11;falling.grounded=false;falling.onPlatform=-1;falling.vY=-15;
    for(let t=0;t<.5;t+=dt)step(falling,{},dt);
    assert.equal(falling.y,8);assert.equal(falling.grounded,true);
    const side=fixture();side.theta=-.5;side.y=7.7;side.vTheta=1.55;side.grounded=false;side.onPlatform=-1;
    for(let t=0;t<.22;t+=dt)step(side,{move:1,jump:true},dt);
    assert.ok(side.theta<=-.3-BODY.halfAngle+1e-8);assert.equal(overlapsBody(side.theta,side.y,side.platforms[0]),false);
    const below=fixture();below.y=6.1;below.grounded=false;below.onPlatform=-1;below.vY=8.2;
    let blocked=false;
    for(let t=0;t<.1;t+=dt) {step(below,{jump:true},dt);blocked ||= below.events.some(e=>e.type==='contact'&&e.axis===1&&e.normal===-1);}
    assert.equal(blocked,true);assert.ok(below.y+BODY.height<=8-platformThickness(below.platforms[0])+1e-8);assert.ok(below.vY<=0);
  });
}

test('continuous collision cannot tunnel through thin slabs or across the angular seam',()=>{
  const p=fixture().platforms[0];
  for(const theta of [-1,Math.PI*2-1]) {
    const hit=sweepBody(theta,7.8,3,0,[p]);
    assert.ok(hit.contacts.some(c=>c.axis===0));assert.equal(overlapsBody(hit.theta,hit.y,p),false);
  }
  const fall=sweepBody(0,20,0,-30,[p]);assert.equal(fall.y,8);assert.equal(fall.landing.id,0);
  const empty=sweepBody(0,20,0,-30,[{...p,collapsed:true}]);assert.equal(empty.y,-10);
});

test('every authored pad has body headroom and slabs do not intersect',()=>{
  for(const recipe of ['espresso','latte']) {
    const {platforms}=makeCourse(recipe);
    for(const a of platforms)for(const b of platforms)if(a!==b) {
      assert.equal(overlapsBody(a.angle,a.y,b),false,`${recipe}: body on ${a.id} intersects ${b.id}`);
      const d=Math.abs(Math.atan2(Math.sin(a.angle-b.angle),Math.cos(a.angle-b.angle)));
      const vertical=a.y>b.y-platformThickness(b)+1e-6&&a.y-platformThickness(a)<b.y-1e-6;
      assert.ok(!(d<a.halfWidth+b.halfWidth && vertical),`${recipe}: intersecting slabs ${a.id}/${b.id}`);
    }
  }
});

test('reforming biscuits wait until the player body clears their slab',()=>{
  const r=fixture();const p=r.platforms[0];p.kind='biscuit';p.collapsed=true;p.regenerateTimer=.001;
  r.y=7.7;r.grounded=false;r.onPlatform=-1;
  step(r,{},1/120);assert.equal(p.collapsed,true);
  r.theta=1;step(r,{},1/120);assert.equal(p.collapsed,false);assert.ok(r.events.some(e=>e.type==='reform'));
});

test('solid contacts preserve coyote jumps and a press buffered before landing',()=>{
  const edge=fixture();edge.theta=.32;edge.vTheta=1.55;
  step(edge,{move:1},.05);assert.equal(edge.grounded,false);assert.ok(edge.coyote>0);
  step(edge,{move:1,jumpPressed:true},1/120);assert.ok(edge.vY>7);
  const buffer=fixture();buffer.y=8.12;buffer.vY=-2;buffer.grounded=false;buffer.onPlatform=-1;
  step(buffer,{jumpPressed:true},1/120);
  let bounced=false;
  for(let t=0;t<.12;t+=1/120){step(buffer,{},1/120);bounced ||= buffer.events.some(e=>e.type==='jump');}
  assert.equal(bounced,true);assert.ok(buffer.vY>0);
});
