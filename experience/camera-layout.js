// Shared with the rendered room so its solid overhead geometry constrains the
// final camera position, including on short courses that never hit the lot cap.
export const CAFE_ROOF=Object.freeze({
  ceilingY:3.94,ceilingThickness:.08,
  beamY:3.78,beamThickness:.24,
  corniceY:3.53,corniceHeight:.75
});

// Logical metres. This exceeds the .025m world near plane at the .24 scale,
// leaving clearance even when a camera sits directly underneath an oak beam.
export const CAMERA_OVERHEAD_CLEARANCE=.32;

export function cameraFrame({top,theta,y,direction=1,attract=false,width,height}) {
  const phone=width/height<.8;
  const radius=attract?17:phone?18.6:13.5;
  const overheadBottom=top+Math.min(
    CAFE_ROOF.ceilingY-CAFE_ROOF.ceilingThickness/2,
    CAFE_ROOF.beamY-CAFE_ROOF.beamThickness/2
  );
  const maximumHeight=Math.min((12-.85)/.24-.8,overheadBottom-CAMERA_OVERHEAD_CLEARANCE);
  const cameraY=Math.min(maximumHeight,attract?y+7.1:Math.max(3.25,y+(phone?5.8:4.6)));
  const lookAngle=theta+direction*(phone?.23:.07);
  return {
    fov:phone?70:54,
    position:{x:Math.sin(theta)*radius,y:cameraY,z:Math.cos(theta)*radius},
    target:{x:Math.sin(lookAngle)*2.65,y:y+1.22,z:Math.cos(lookAngle)*2.65},
    overheadBottom
  };
}
