// Decode copied status from the QA entry's documented p0.hud feed.
// No worker transport or game-state setter is used.
export function previewObserver() {
  Object.defineProperty(window,'starboxObserved',{get(){
    const values=window.devkit?.hud;
    const line=Array.isArray(values)?values.findLast(v=>String(v).startsWith('STARBOX_QA ')):values;
    if(!String(line).startsWith('STARBOX_QA '))return null;
    let a;try{a=JSON.parse(line.slice(11));}catch{return null;}
    const course=window.starboxQaCourse||{platforms:[],ingredients:[]};
    const required={bean:a[0]==='latte'?8:6,milk:a[0]==='latte'?5:0};
    const collected={bean:a[10],milk:a[11]},perfect=a[19]&&collected.bean===required.bean&&collected.milk===required.milk;
    const result=a[19]===null?null:{recipe:a[0],time:a[2],success:a[19],perfect,score:a[20],quality:a[24],
      collected,required,bonusStars:a[12],bonusScore:a[12]*5000,bestHeight:a[14],top:course.top,progress:Math.min(1,a[14]/course.top)};
    const platforms=course.platforms.map(p=>({...p,collapsed:a[16].includes(p.id),
      ...(p.id===6?{crumbleTimer:a[17],regenerateTimer:a[18]}:{})}));
    return {frameTime:a[2]*1000,qualityScale:a[15],rewardPending:a[21],reward:a[22],
      bests:{[a[0]]:{progress:a[23][0],height:a[23][1],time:a[23][2]}},
      run:{...course,recipe:a[0],state:a[1],elapsed:a[2],theta:a[3],y:a[4],vTheta:a[5],vY:a[6],
        grounded:a[7],onPlatform:a[8],collected,required,bonusStars:a[12],coffeeY:a[13],bestHeight:a[14],result,
        ingredients:course.ingredients.map((i,n)=>({...i,collected:Boolean(a[9]&(1<<n))})),platforms}};
  }});
}
