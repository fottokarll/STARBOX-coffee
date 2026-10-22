import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCourse,angleDistance,RECIPES} from '../experience/rules.js';
import {climb} from '../tools/route_pilot.mjs';

test('a required bean makes the opposite-side timber choice meaningful without blocking the direct route',()=>{
  for(const recipe of Object.keys(RECIPES)) {
    const course=makeCourse(recipe), route=course.biscuitAlternates.find(r=>r.requiredRewards?.length);
    assert.ok(route);
    const from=course.platforms[route.from], direct=course.platforms[route.from+1], detour=course.platforms[route.pads[0]];
    assert.ok(angleDistance(direct.angle,from.angle)*angleDistance(detour.angle,from.angle)<0,'the choices depart in opposite directions');
    assert.ok(from.nextIds.includes(direct.id)&&from.nextIds.includes(detour.id));
    for(const id of route.requiredRewards) {
      const bean=course.ingredients.find(i=>i.id===id);
      assert.equal(bean.required,true);assert.equal(bean.kind,'bean');
      assert.ok(route.pads.includes(bean.platform));
      assert.ok(course.perfectPath.includes(bean.platform));
      assert.ok(!course.mainPath.includes(bean.platform));
    }
    const directRun=climb(recipe,{collect:false}).run;
    assert.equal(directRun.result.success,true,'the direct line still completes the game');
    assert.equal(directRun.result.perfect,false,'the direct line does not silently award the detour ingredient');
  }
});

test('optional pockets have a visible reward, a permanent return and a more demanding Latte gap',()=>{
  const gaps={};
  for(const recipe of Object.keys(RECIPES)) {
    const course=makeCourse(recipe);
    assert.equal(course.returnBranches.length,1,'one separated pocket avoids a cluster of islands');
    const branch=course.returnBranches[0], from=course.platforms[branch.from], pad=course.platforms[branch.pads[0]];
    assert.equal(branch.returnTo,from.id);assert.deepEqual(pad.nextIds,[from.id]);
    assert.equal(pad.kind,'bonus');assert.notEqual(pad.surface,'biscuit');
    assert.ok(from.nextIds.includes(pad.id));
    assert.ok(angleDistance(pad.angle,from.angle)*angleDistance(course.platforms[branch.rejoin].angle,from.angle)<0);
    assert.ok(!course.perfectPath.includes(pad.id),'a Perfect recipe does not require a bonus cul-de-sac');
    assert.ok(branch.rewards.every(id=>course.ingredients.some(i=>i.id===id&&i.kind==='star'&&!i.required&&i.platform===pad.id)));
    gaps[recipe]=Math.abs(angleDistance(pad.angle,from.angle))-from.halfWidth-pad.halfWidth;
    const {run,events}=climb(recipe,{allForks:true});
    const landings=[0,...events.filter(e=>e.type==='land').map(e=>e.platform)];
    const pocketLanding=landings.indexOf(pad.id);
    assert.ok(pocketLanding>=0&&landings.indexOf(from.id,pocketLanding+1)>pocketLanding,'ordinary inputs return from the dead end');
    assert.equal(run.result.perfect,true);assert.equal(run.bonusStars,recipe==='latte'?5:3);
    assert.ok(!events.some(e=>e.type==='contact'&&e.axis===1&&e.normal<0),'neither approach nor return has a jumping obstruction');
  }
  assert.ok(gaps.latte>gaps.espresso+.2,'Latte asks for a larger exposed jump after the introductory Espresso pocket');
});

for(const recipe of Object.keys(RECIPES))for(const fps of [240,120,60,30,15,10]) {
  test(`${recipe} complete permanent route remains usable at ${fps} FPS`,()=>{
    const {run,events}=climb(recipe,{safe:true,collect:false,frameDt:1/fps});
    assert.equal(run.result.success,true);
    for(const route of run.biscuitAlternates)for(const id of route.pads) {
      assert.ok(events.some(e=>e.type==='land'&&e.platform===id),`landed on permanent pad ${id}`);
    }
    assert.ok(!events.some(e=>e.type==='contact'&&e.axis===1&&e.normal<0),'safe-route flights have clear headroom');
  });
}
