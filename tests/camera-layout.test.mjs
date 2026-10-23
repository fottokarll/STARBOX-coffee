import assert from 'node:assert/strict';
import test from 'node:test';
import {cameraFrame,CAFE_ROOF,CAMERA_OVERHEAD_CLEARANCE} from '../experience/camera-layout.js';
import {makeCourse,PHYSICS} from '../experience/rules.js';

const sizes=[[390,844],[320,740],[430,932],[844,390],[640,360],[960,640],[720,900]];

test('the old Espresso portrait view crosses its real solid oak ceiling near the finish',()=>{
  const espresso=makeCourse('espresso'),latte=makeCourse('latte');
  const oldHeight=top=>Math.min((12-.85)/.24-.8,top*.97+5.8);
  assert.ok(oldHeight(espresso.top)>espresso.top+CAFE_ROOF.ceilingY+CAFE_ROOF.ceilingThickness/2);
  assert.ok(oldHeight(latte.top)<latte.top+CAFE_ROOF.ceilingY-CAFE_ROOF.ceilingThickness/2,
    'the lot-height cap explains why Latte did not show the same obstruction');
});

test('final views remain below the actual overhead geometry through upper jumps in every viewport and direction',()=>{
  const apex=PHYSICS.jumpSpeed**2/(2*PHYSICS.gravity);
  for(const recipe of ['espresso','latte']) {
    const course=makeCourse(recipe);
    for(const [width,height] of sizes)for(let degrees=0;degrees<360;degrees+=5)
      for(const direction of [-1,-.5,0,.5,1])for(let progress=.85;progress<=1.051;progress+=.01) {
        const frame=cameraFrame({top:course.top,theta:degrees*Math.PI/180,
          y:Math.min(course.top+apex,course.top*progress),direction,width,height});
        assert.ok(frame.position.y<=frame.overheadBottom-CAMERA_OVERHEAD_CLEARANCE+1e-10);
        assert.ok(.85+frame.position.y*.24<12);
        assert.ok(Object.values(frame.position).every(Number.isFinite));
        assert.ok(Object.values(frame.target).every(Number.isFinite));
      }
  }
});

test('lower-course framing, orbit distance and portrait look-ahead remain unchanged',()=>{
  for(const [width,height] of sizes)for(const attract of [false,true]) {
    const theta=1.4,y=12,direction=-.7,phone=width/height<.8;
    const frame=cameraFrame({top:35.38,theta,y,direction,width,height,attract});
    assert.equal(frame.fov,phone?70:54);
    assert.ok(Math.abs(Math.hypot(frame.position.x,frame.position.z)-(attract?17:phone?18.6:13.5))<1e-12);
    assert.equal(frame.position.y,attract?y+7.1:y+(phone?5.8:4.6));
    assert.equal(frame.target.y,y+1.22);
    assert.equal(frame.target.x,Math.sin(theta+direction*(phone?.23:.07))*2.65);
    assert.equal(frame.target.z,Math.cos(theta+direction*(phone?.23:.07))*2.65);
  }
});
