// Leave the top 54px to Project 0's own toolbar at every viewport size.
export function headerLayout(width,height,inGame) {
  const short=height<450;
  const y=short?height-62:61;
  return {short,brand:!short,stacked:inGame&&width<720,
    timer:inGame&&!short?{x:width/2-(width<500?69:88),y:54,w:width<500?138:176,h:46}:null,
    mute:short&&!inGame?null:{x:short?width/2-36:width-(inGame?87:49),y,w:31,h:31},
    pause:!inGame?null:{x:short?width/2+5:width-49,y,w:31,h:31}};
}
