// Optional DevKit entry. The manifest uses main.js without any observation feed.
// This compact status uses only the documented p0.hud API (400 characters).
import start from './main.js';
export default p0=>start(p0,{observe:values=>{
  const text='STARBOX_QA '+JSON.stringify(values,(_key,value)=>
    typeof value==='number'?Math.round(value*10000)/10000:value);
  if(text.length>400)throw new Error('Preview status exceeds the documented HUD limit');
  p0.hud(text);
}});
