// Exercise the real browser touch event path, rather than modifying game state.
export async function exerciseTouch(page) {
  const client=await page.context().newCDPSession(page);
  await client.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  const box=await page.locator('#device').boundingBox();
  const point=(x,y,id)=>({x:box.x+x*box.width,y:box.y+y*box.height,id,radiusX:2,radiusY:2});
  async function dispatch(type,touchPoints) {
    await client.send('Input.dispatchTouchEvent',{type,touchPoints});
  }
  async function tap(x,y) {
    await dispatch('touchStart',[point(x,y,1)]);
    await page.waitForTimeout(150);
    await dispatch('touchEnd',[]);
    await page.waitForTimeout(200);
  }
  const before=await page.evaluate(()=>devkit.console.length);
  // The tall phone layout has a centered order panel: select Espresso, then Start.
  await tap(.31,.573);
  await tap(.5,.662);
  await page.waitForFunction(start=>devkit.console.slice(start).some(line=>String(line).includes('Coffee Rising: GO')),
    before,{timeout:90000});
  const initial=await page.evaluate(()=>devkit.room.position);
  // The devkit itself still draws a city stick, so use the unobstructed right edge
  // of our RIGHT button. The published manifest sets stick:false.
  const right=point(.389,.930,1),jump=point(.811,.930,2);
  await dispatch('touchStart',[right]);
  await dispatch('touchStart',[jump]);
  await page.waitForTimeout(500);
  const bothHeld=await page.evaluate(()=>devkit.room.position);
  // Chromium's legacy CDP touch path accepts the changed point to end just one
  // contact. The probe disables SyntheticPointerActions for this capability.
  await dispatch('touchEnd',[jump]);
  await page.waitForTimeout(500);
  const afterJumpRelease=await page.evaluate(()=>devkit.room.position);
  await dispatch('touchEnd',[]);
  await page.waitForTimeout(300);
  const final=await page.evaluate(()=>devkit.room.position);
  await client.detach();
  return {
    initial,bothHeld,afterJumpRelease,final,
    movedAfterJumpRelease:Math.abs(afterJumpRelease.yaw-bothHeld.yaw)>.015,
    jumped:Math.max(bothHeld.y,afterJumpRelease.y)>initial.y+.08,
    selectedByTouch:await page.evaluate(start=>devkit.console.slice(start).filter(line=>
      String(line).includes('round started')),before),
  };
}
