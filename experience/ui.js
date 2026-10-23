import * as THREE from 'three';
import {headerLayout, touchLayout, resultsLayout} from './ui-layout.js';
import {RECIPES} from './rules.js';
export const GAME_TITLE = 'COFFEE PANIC!';

const C = Object.freeze({
  green: '#187454', forest: '#143C30', cream: '#FFF3DB', gold: '#C8AA73',
  brown: '#6F4E37', ink: '#10281F', muted: '#C4D0C5', milk: '#E7F1E5', white: '#FFFFFF'
});

/** Native-resolution canvas UI. Lettering is rasterised from licensed DejaVu fonts. */
export async function createUI(p0) {
  const loader = new THREE.ImageBitmapLoader();
  const [fontBitmap, fontData, characterBitmap, characterData, espressoCard, latteCard, coverBitmap,
    primaryBitmap, primaryData] = await Promise.all([
    loader.loadAsync(p0.asset('assets/v2/lettering.png')),
    new THREE.FileLoader().setResponseType('json').loadAsync(p0.asset('assets/v2/lettering.json')),
    loader.loadAsync(p0.asset('assets/v2/baristas.webp')),
    new THREE.FileLoader().setResponseType('json').loadAsync(p0.asset('assets/v2/characters.json')),
    loader.loadAsync(p0.asset('assets/v2/card-espresso.jpg')),
    loader.loadAsync(p0.asset('assets/v2/card-latte.jpg')),
    loader.loadAsync(p0.asset('assets/v2/cover-v2.jpg')),
    loader.loadAsync(p0.asset('assets/polish/milo.webp')),
    new THREE.FileLoader().setResponseType('json').loadAsync(p0.asset('assets/polish/milo.json'))
  ]);
  const canvas = new OffscreenCanvas(640, 360);
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 5);
  mesh.position.z = -1;
  mesh.frustumCulled = false;
  mesh.renderOrder = 1000;
  scene.add(mesh);
  const tintCache = new Map();
  let W = 640, H = 360, buttons = [], pressed = {};

  function fontAtlas(color) {
    if (!tintCache.has(color)) {
      const tinted = new OffscreenCanvas(fontBitmap.width, fontBitmap.height);
      const t = tinted.getContext('2d');
      t.drawImage(fontBitmap, 0, 0);
      t.globalCompositeOperation = 'source-in';
      t.fillStyle = color;
      t.fillRect(0, 0, tinted.width, tinted.height);
      tintCache.set(color, tinted);
    }
    return tintCache.get(color);
  }
  function width(value, size = 14, style = 'body', spacing = 0) {
    const data = fontData.styles[style];
    return [...String(value)].reduce((sum, ch, index) =>
      sum + (data.glyphs[ch] || data.glyphs['?']).advance * size / data.size + (index ? spacing : 0), 0);
  }
  function text(value, x, y, size = 14, color = C.cream, align = 'left', style = 'body', spacing = 0, maxWidth = 0) {
    const string = String(value);
    let lineWidth = width(string, size, style, spacing);
    if (maxWidth && lineWidth > maxWidth) {
      const factor = maxWidth / lineWidth;
      size *= factor;
      spacing *= factor;
      lineWidth = maxWidth;
    }
    if (align === 'center') x -= lineWidth / 2;
    if (align === 'right') x -= lineWidth;
    const data = fontData.styles[style], scale = size / data.size, source = fontAtlas(color);
    for (const ch of string) {
      const g = data.glyphs[ch] || data.glyphs['?'];
      if (g.w && g.h && ch !== ' ') {
        ctx.drawImage(source, g.x, g.y, g.w, g.h,
          x + g.ox * scale, y + g.oy * scale, g.w * scale, g.h * scale);
      }
      x += g.advance * scale + spacing;
    }
  }
  function label(value, x, y, size = 10, color = C.gold, align = 'left', maxWidth = 0) {
    text(String(value).toUpperCase(), x, y, size, color, align, 'mono', 0.9, maxWidth);
  }
  function roundRect(x, y, w, h, radius = 8) {
    const r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function panel(x, y, w, h, fill = 'rgba(18,43,34,0.96)', border = 'rgba(200,166,106,0.4)', radius = 12) {
    ctx.save();ctx.shadowColor='rgba(0,0,0,.23)';ctx.shadowBlur=0;ctx.shadowOffsetY=3;
    roundRect(x, y, w, h, radius); ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = border; ctx.lineWidth = 1; ctx.stroke();ctx.restore();
  }
  function line(x1, y1, x2, y2, color = 'rgba(200,166,106,0.25)', thickness = 1) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = color; ctx.lineWidth = thickness; ctx.stroke();
  }
  function star(x, y, r, color = C.gold) {
    ctx.beginPath();
    for (let n = 0; n < 10; n++) {
      const angle = -Math.PI / 2 + n * Math.PI / 5, radius = n % 2 ? r * 0.45 : r;
      const px = x + Math.cos(angle) * radius, py = y + Math.sin(angle) * radius;
      if (n) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  }
  function bean(x, y, size = 12, color = C.gold) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(0.45);
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 0, size * 0.31, size * 0.46, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(1, size / 11);
    ctx.beginPath(); ctx.moveTo(0, -size * 0.3); ctx.bezierCurveTo(-size * 0.2, -size * 0.1,
      size * 0.2, size * 0.1, 0, size * 0.3); ctx.stroke(); ctx.restore();
  }
  function drop(x, y, size = 12) {
    ctx.fillStyle = C.milk; ctx.beginPath(); ctx.moveTo(x, y - size * 0.5);
    ctx.bezierCurveTo(x + size * 0.58, y + size * 0.1, x + size * 0.34, y + size * 0.49, x, y + size * 0.49);
    ctx.bezierCurveTo(x - size * 0.34, y + size * 0.49, x - size * 0.58, y + size * 0.1, x, y - size * 0.5); ctx.fill();
  }
  function logo(x, y, size = 27) {
    ctx.strokeStyle = C.gold; ctx.lineWidth = Math.max(1.2, size / 22);
    ctx.beginPath(); ctx.moveTo(x - size * 0.36, y - size * 0.28);
    ctx.lineTo(x + size * 0.26, y - size * 0.28); ctx.lineTo(x + size * 0.18, y + size * 0.3);
    ctx.lineTo(x - size * 0.27, y + size * 0.3); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + size * 0.31, y - size * 0.02, size * 0.18, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    star(x - size * 0.035, y - size * 0.005, size * 0.16);
    line(x - size * 0.43, y + size * 0.43, x + size * 0.36, y + size * 0.43, C.gold, size / 22);
  }
  function icon(kind, x, y, size = 16) {
    ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = C.cream; ctx.fillStyle = C.cream; ctx.lineWidth = 1.6;
    if (kind === 'pause') {
      roundRect(-size * 0.29, -size * 0.4, size * 0.17, size * 0.8, 1); ctx.fill();
      roundRect(size * 0.12, -size * 0.4, size * 0.17, size * 0.8, 1); ctx.fill();
    } else if (kind === 'sound' || kind === 'muted') {
      ctx.beginPath(); ctx.moveTo(-7, -3); ctx.lineTo(-3, -3); ctx.lineTo(2, -7);
      ctx.lineTo(2, 7); ctx.lineTo(-3, 3); ctx.lineTo(-7, 3); ctx.closePath(); ctx.stroke();
      if (kind === 'sound') {
        ctx.beginPath(); ctx.arc(3, 0, 5, -0.9, 0.9); ctx.stroke();
      } else {
        line(5, -4, 10, 4, C.cream, 1.6); line(10, -4, 5, 4, C.cream, 1.6);
      }
    } else if (kind === 'left' || kind === 'right') {
      const d = kind === 'left' ? -1 : 1;
      ctx.beginPath(); ctx.moveTo(-d * 3, -6); ctx.lineTo(d * 3, 0); ctx.lineTo(-d * 3, 6); ctx.stroke();
    } else if (kind === 'back') {
      ctx.beginPath(); ctx.moveTo(2, -5); ctx.lineTo(-3, 0); ctx.lineTo(2, 5); ctx.stroke();
    }
    ctx.restore();
  }
  function button(id, title, x, y, w, h = 44, primary = false, options = {}) {
    const down = Boolean(pressed[id]), gradient = ctx.createLinearGradient(0, y, 0, y + h);
    gradient.addColorStop(0, primary ? '#FFF2D5' : options.selected ? '#315B43' : '#214737');
    gradient.addColorStop(1, primary ? '#E7C896' : '#102F23');
    panel(x, y + (down ? 2 : 0), w, h - (down ? 2 : 0), gradient,
      primary ? '#F5D9A7' : options.selected ? C.gold : 'rgba(200,166,106,0.4)', 8);
    if (h > 35) {ctx.strokeStyle = primary ? 'rgba(255,255,255,.42)' : 'rgba(255,235,187,.09)';
      roundRect(x+3,y+3,w-6,h-7,6);ctx.stroke();}
    if (options.icon) icon(options.icon, x + w / 2, y + h / 2, 15);
    else {
      text(title, x + w / 2, y + (h - 13) / 2, options.fontSize || 14,
        primary ? C.forest : C.cream, 'center', 'bold', 0.4, w - 18);
      if (primary && w > 190) {
        line(x + w - 29, y + h / 2, x + w - 19, y + h / 2, C.green, 1.5);
        line(x + w - 23, y + h / 2 - 4, x + w - 19, y + h / 2, C.green, 1.5);
        line(x + w - 23, y + h / 2 + 4, x + w - 19, y + h / 2, C.green, 1.5);
      }
    }
    buttons.push({ id, x, y, w, h });
  }
  function menuBackdrop() {
    ctx.fillStyle = 'rgba(5,23,17,0.70)'; ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * 0.75, H * 0.36, 10, W * 0.75, H * 0.36, Math.max(W, H) * 0.75);
    glow.addColorStop(0, 'rgba(200,166,106,0.1)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(200,166,106,0.15)'; ctx.lineWidth = 1;
    roundRect(10.5, 10.5, W - 21, H - 21, 10); ctx.stroke();
  }
  function header(model,inGame=false) {
    const l=headerLayout(W,H,inGame),phone=W<500;
    if(l.brand) {
      const shade=ctx.createLinearGradient(0,52,0,105);
      shade.addColorStop(0,'rgba(6,25,18,.63)');shade.addColorStop(1,'rgba(6,25,18,0)');
      ctx.fillStyle=shade;ctx.fillRect(0,52,W,53);
      logo(28,77,30);
      if(l.stacked) {
        if(W>=360){text('COFFEE',49,63,11,C.cream,'left','display');text('PANIC!',49,80,12,C.gold,'left','display');}
      } else {
        text(GAME_TITLE,51,67,phone?13:15,C.cream,'left','display',.2);
        if(!phone)label('THE CLIMBING CAFE',52,88,8,C.gold);
      }
    }
    if(l.mute)button('mute','',l.mute.x,l.mute.y,l.mute.w,l.mute.h,false,{icon:model.muted?'muted':'sound'});
    if(l.pause)button('pause','',l.pause.x,l.pause.y,l.pause.w,l.pause.h,false,{icon:'pause'});
    if(l.timer&&model.run) {
      const t=l.timer;
      panel(t.x,t.y,t.w,t.h,'rgba(13,43,32,.94)','rgba(200,170,115,.45)',12);
      symbol('timer',t.x+20,t.y+t.h/2,17,C.gold);
      text(formatTime(model.run.elapsed||0),t.x+t.w/2+10,t.y+(t.h-21)/2,21,C.cream,'center','mono',0,t.w-44);
    }
  }
  // Matching line icons, shared by the HUD and the results receipt.
  function symbol(kind,x,y,size=20,color=C.gold) {
    ctx.save();ctx.translate(x,y);ctx.scale(size/20,size/20);
    ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1.6;ctx.lineCap='round';ctx.lineJoin='round';
    if(kind==='timer') {
      ctx.beginPath();ctx.arc(0,1,7,0,Math.PI*2);ctx.moveTo(0,1);ctx.lineTo(0,-3);ctx.lineTo(3,1);ctx.stroke();
      line(-3,-10,3,-10,color,1.6);line(0,-10,0,-7,color,1.6);
    } else if(kind==='climb') {
      ctx.beginPath();ctx.moveTo(-10,7);ctx.lineTo(-2,-7);ctx.lineTo(3,1);ctx.lineTo(6,-3);ctx.lineTo(11,7);ctx.closePath();ctx.stroke();
      line(-5,-1,-2,0,color);line(-2,0,0,-2,color);
    } else if(kind==='steam') {
      for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(i*6,7);ctx.bezierCurveTo(i*6-5,1,i*6+5,-1,i*6,-8);ctx.stroke();}
    } else if(kind==='collect') {bean(-4,0,18,color);drop(7,2,12);}
    else if(kind==='best')star(0,0,9,color);
    else logo(0,0,23);
    ctx.restore();
  }
  function footer() {
    label('CLIMB. COLLECT. BREW.', W / 2, H - 28, 10, C.muted, 'center');
  }
  function title(value, subtitle, y, small = false) {
    text(value, W / 2, y, small ? 25 : W < 500 ? 29 : 35, C.cream, 'center', 'display', 0, W - 40);
    if (subtitle) text(subtitle, W / 2, y + (small ? 35 : 45), 14, C.muted, 'center', 'body', 0, W - 36);
  }
  function steps(active, y) {
    label('01  YOUR COFFEE', W / 2 - 15, y, 9, active === 1 ? C.gold : C.muted, 'right');
    label('02  YOUR BARISTA', W / 2 + 15, y, 9, active === 2 ? C.gold : C.muted);
  }
  function drink(cx, cy, size, recipe = 'latte', ornate = false) {
    ctx.save(); ctx.translate(cx, cy);
    const glow = ctx.createRadialGradient(0, 0, size * 0.05, 0, 0, size * 0.8);
    glow.addColorStop(0, 'rgba(200,166,106,0.2)'); glow.addColorStop(1, 'rgba(200,166,106,0)');
    ctx.fillStyle = glow; ctx.fillRect(-size, -size, size * 2, size * 2);
    ctx.save(); ctx.scale(1, 0.2); ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, size * 2.6, size * 0.57, size * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    // Original tapered café cup, with a gold rim and a star-cup emblem.
    const body = ctx.createLinearGradient(-size * 0.4, 0, size * 0.4, 0);
    body.addColorStop(0, '#DAD4BE'); body.addColorStop(0.35, C.cream); body.addColorStop(1, '#C5C5AD');
    ctx.beginPath(); ctx.moveTo(-size * 0.4, -size * 0.35); ctx.lineTo(size * 0.4, -size * 0.35);
    ctx.lineTo(size * 0.29, size * 0.44); ctx.quadraticCurveTo(0, size * 0.51, -size * 0.29, size * 0.44);
    ctx.closePath(); ctx.fillStyle = body; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-size * 0.365, -size * 0.09); ctx.lineTo(size * 0.365, -size * 0.09);
    ctx.lineTo(size * 0.323, size * 0.24); ctx.lineTo(-size * 0.323, size * 0.24); ctx.closePath();
    ctx.fillStyle = C.green; ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = Math.max(1, size / 90); ctx.stroke();
    ctx.save(); ctx.translate(0, size * 0.065); logo(0, 0, size * 0.29); ctx.restore();
    ctx.beginPath(); ctx.ellipse(0, -size * 0.35, size * 0.4, size * 0.085, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#C8A66A'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -size * 0.365, size * 0.35, size * 0.061, 0, 0, Math.PI * 2);
    ctx.fillStyle = recipe === 'espresso' ? '#633D27' : '#D8B682'; ctx.fill();
    if (recipe === 'latte') {
      ctx.strokeStyle = '#F2E6CB'; ctx.lineWidth = size * 0.017;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.ellipse(0, -size * 0.365, size * (0.06 + i * 0.052), size * (0.011 + i * 0.008),
          -0.06, 0.2, Math.PI * 2 - 0.2); ctx.stroke();
      }
    }
    ctx.strokeStyle = 'rgba(242,240,232,0.38)'; ctx.lineWidth = Math.max(1.3, size * 0.012);
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(i * size * 0.14, -size * 0.51);
      ctx.bezierCurveTo((i * 0.14 + 0.09) * size, -size * 0.68, (i * 0.14 - 0.1) * size,
        -size * 0.7, i * size * 0.14, -size * 0.86); ctx.stroke();
    }
    if (ornate) {
      bean(-size * 0.48, size * 0.45, size * 0.19);
      bean(-size * 0.35, size * 0.54, size * 0.15, '#9B734D');
      star(size * 0.52, -size * 0.36, size * 0.048);
      star(-size * 0.5, -size * 0.62, size * 0.035);
    }
    ctx.restore();
  }
  function titleScreen(model) {
    ctx.save();
    const imageScale = Math.max(W / coverBitmap.width, H / coverBitmap.height);
    ctx.globalAlpha = W<620 ? .96 : .82;
    ctx.drawImage(coverBitmap, W*.5 - coverBitmap.width * imageScale * (W<620?.64:.5),
      (H - coverBitmap.height * imageScale) / 2, coverBitmap.width * imageScale, coverBitmap.height * imageScale);
    ctx.globalAlpha = 1;
    const grade = ctx.createLinearGradient(0, 0, W<620?0:W, W<620?H:0);
    if(W<620){grade.addColorStop(0,'rgba(5,23,17,.95)');grade.addColorStop(.28,'rgba(5,23,17,.54)');
      grade.addColorStop(.48,'rgba(5,23,17,.08)');grade.addColorStop(.71,'rgba(5,23,17,.64)');grade.addColorStop(1,'rgba(5,23,17,.96)');}
    else {grade.addColorStop(0, 'rgba(5,23,17,0.96)'); grade.addColorStop(0.52, 'rgba(5,23,17,0.72)');
      grade.addColorStop(1, 'rgba(5,23,17,0.14)');}
    ctx.fillStyle = grade; ctx.fillRect(0, 0, W, H); ctx.restore();
    const short = H < 460, narrow = W < 620;
    if (short) {
      const left = Math.max(28, W * 0.08);
      label('THE VERTICAL COFFEE ARCADE', left, 79, 9);
      text(GAME_TITLE, left, 106, Math.min(36, W * 0.061), C.cream, 'left', 'display', 0, W * 0.80);
      text('Climb the cup. Craft the perfect coffee.', left, 165, 14, C.muted, 'left', 'body', 0, W * 0.66);
      label('CLIMB. COLLECT. BREW.', left, 198, 11);
      button('titleStart', 'ORDER A COFFEE', left, H - 96, Math.min(278, W * 0.47), 46, true);
      label('CLIMB TO THE LAST DROP', W * 0.81, H - 67, 8, C.gold, 'center');
    } else if (narrow && H<650) {
      label('THE VERTICAL COFFEE ARCADE',W/2,110,8,C.gold,'center');
      text(GAME_TITLE,W/2,136,28,C.cream,'center','display',0,W-36);
      text('Climb the cup. Craft your perfect coffee.',W/2,H-164,13,C.muted,'center','body',0,W-34);
      button('titleStart','ORDER A COFFEE',28,H-108,W-56,46,true);
      label('FREE PLAY  ·  INSTANT RETRIES',W/2,H-48,8,C.gold,'center');
    } else if (narrow) {
      label('THE VERTICAL COFFEE ARCADE', W / 2, H * 0.15, 9, C.gold, 'center');
      text('COFFEE', W / 2, H * 0.19, Math.min(44, W * 0.115), C.cream, 'center', 'display');
      text('PANIC!', W / 2, H * 0.19 + 54, Math.min(48, W * 0.13), C.cream, 'center', 'display');
      text('A little barista. An enormous adventure.', W / 2, H * 0.68, 14, C.muted, 'center', 'body', 0, W - 40);
      text('Outrun the rising coffee. Brew your best.', W / 2, H * 0.68 + 23, 14, C.muted, 'center', 'body', 0, W - 40);
      button('titleStart', 'ORDER A COFFEE', 28, H - 126, W - 56, 49, true);
      label('FREE PLAY  ·  INSTANT RETRIES', W / 2, H - 60, 9, C.gold, 'center');
    } else {
      const left = W * 0.12, top = H * 0.26;
      label('THE VERTICAL COFFEE ARCADE', left, top - 30, 11);
      text('COFFEE', left, top, Math.min(60, W * 0.063), C.cream, 'left', 'display');
      text('PANIC!', left, top + 74, Math.min(72, W * 0.075), C.cream, 'left', 'display');
      text('Climb the cup. Collect your recipe.', left, top + 180, 17, C.muted);
      text('Escape with the perfect coffee.', left, top + 207, 17, C.muted);
      button('titleStart', 'ORDER A COFFEE', left, Math.min(H - 105, top + 260), 290, 49, true);
      label('CLIMB TO THE LAST DROP', W * 0.77, H - 69, 10, C.gold, 'center');
    }
    if (!narrow || short) footer();
  }
  function selectionLayout() {
    const short=H<460,phone=W<500,gap=phone?12:20;
    const cardW=Math.min(phone?(W-44)/2:(W-92)/2,short?235:266);
    const y=short?110:Math.max(188,H*(phone?.25:.23));
    const cardH=short?Math.max(70,H-210):Math.min(phone?310:302,H-y-160);
    return {short,phone,cardW,cardH,gap,x:(W-cardW*2-gap)/2,y};
  }
  function selectFrame(id, selected, x, y, w, h) {
    panel(x, y, w, h, selected ? 'rgba(40,79,57,0.98)' : 'rgba(15,46,34,0.95)',
      selected ? C.gold : 'rgba(200,166,106,0.22)', 10);
    if (selected) {
      ctx.strokeStyle = 'rgba(200,166,106,0.18)'; roundRect(x + 4, y + 4, w - 8, h - 8, 7); ctx.stroke();
      ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(x + w - 18, y + 18, 7, 0, Math.PI * 2); ctx.fill();
      line(x + w - 21, y + 18, x + w - 18, y + 21, C.ink, 1.4);
      line(x + w - 18, y + 21, x + w - 14, y + 15, C.ink, 1.4);
    }
    buttons.push({ id, x, y, w, h });
  }
  function orderScreen(model) {
    const l = selectionLayout(), selected = model.selected || model.selectedRecipe || 'latte';
    steps(1, l.short ? 64 : 91);
    title('Choose your coffee', l.short ? '' : 'Two orders. One way up.', l.short ? 81 : 112, l.short);
    for (let i = 0; i < 2; i++) {
      const id = i ? 'latte' : 'espresso', x = l.x + i * (l.cardW + l.gap), cx = x + l.cardW / 2;
      selectFrame(id, selected === id, x, l.y, l.cardW, l.cardH);
      if (l.short && (l.cardH<110||l.cardW<180)) {
        text(i?'Latte':'Espresso',cx,l.y+17,20,C.cream,'center','display',0,l.cardW-14);
        label(i?'ADVANCED':'PROGRESSIVE',cx,l.y+49,8,C.gold,'center',l.cardW-12);
      } else if (l.short) {
        drink(x + 46, l.y + l.cardH * 0.48, 66, id);
        text(i ? 'Latte' : 'Espresso', x + 86, l.y + 25, 21, C.cream, 'left', 'display', 0, l.cardW - 98);
        text(i ? 'Beans + milk' : 'Pure coffee', x + 86, l.y + 59, 12, C.muted, 'left', 'body', 0, l.cardW - 98);
        label(i ? 'ADVANCED' : 'INTRODUCTION', x + 86, l.y + 86, 8, C.gold, 'left', l.cardW - 95);
      } else {
        drink(cx, l.y + l.cardH * 0.36, Math.min(l.cardW * 0.7, l.cardH * 0.53), id, true);
        text(i ? 'Latte' : 'Espresso', cx, l.y + l.cardH * 0.65, l.phone ? 24 : 29, C.cream, 'center', 'display');
        text(i ? 'Beans + milk' : 'Pure coffee', cx, l.y + l.cardH * 0.79, 14, C.muted, 'center');
        label(i ? 'ADVANCED SWITCHBACKS' : 'PROGRESSIVE CLIMB', cx, l.y + l.cardH * 0.90, l.phone ? 8 : 9, C.gold, 'center');
      }
    }
    const bottom = l.y + l.cardH + (l.short ? 13 : 24), bw = Math.min(380, W - 56);
    button('characterNext', 'CHOOSE YOUR BARISTA', (W - bw) / 2, bottom, bw, l.short ? 40 : 48, true);
    if (!l.short) {
      text('Collect every ingredient for Perfect Coffee.', W / 2, bottom + 68, 14, C.muted, 'center', 'body', 0, W - 34);
      footer();
    }
    button('back', '', 18, l.short ? H - 44 : H - 51, 32, 30, false, { icon: 'back' });
  }
  function portrait(id, x, y, size, model) {
    const bitmap = id === 'boy' ? primaryBitmap : model.characterBitmap || characterBitmap;
    const data = id === 'boy' ? primaryData : model.characterData || model.characterMeta || characterData;
    if (bitmap) {
      const frame = data?.characters?.[id]?.frames?.[0];
      const rect = frame?.rect || [0, 0, 64, 64];
      const [sx, sy, sw, sh] = rect;
      const nominal = id === 'boy' ? primaryData.nominalBodyHeight : sh;
      const scale = size / nominal;
      ctx.save(); ctx.imageSmoothingEnabled = false;
      const anchor = frame?.anchor || [.5,1];
      ctx.drawImage(bitmap, sx, sy, sw, sh, x - sw * scale * anchor[0],
        y + size / 2 - sh * scale * anchor[1], sw * scale, sh * scale);
      ctx.restore();
    } else {
      // An original icon remains readable during a short asset download.
      logo(x, y, size * 0.45);
    }
  }
  function characterScreen(model) {
    const l = selectionLayout(), selected = model.selectedCharacter || 'boy';
    steps(2, l.short ? 64 : 91);
    title('Meet your barista', l.short ? '' : 'Small heroes. Legendary coffee.', l.short ? 81 : 112, l.short);
    for (let i = 0; i < 2; i++) {
      const id = i ? 'girl' : 'boy', x = l.x + i * (l.cardW + l.gap), cx = x + l.cardW / 2;
      selectFrame(id, selected === id, x, l.y, l.cardW, l.cardH);
      const py = l.short ? l.y + l.cardH * 0.48 : l.y + l.cardH * 0.38;
      const size = l.short ? Math.min(110, l.cardH * 0.88) : Math.min(188, l.cardH * 0.73);
      const glow = ctx.createRadialGradient(cx, py, 0, cx, py, size * 0.65);
      glow.addColorStop(0, 'rgba(200,166,106,0.16)'); glow.addColorStop(1, 'rgba(200,166,106,0)');
      ctx.fillStyle = glow; ctx.fillRect(x + 2, l.y + 2, l.cardW - 4, l.cardH - 4);
      if(l.short&&(l.cardH<110||l.cardW<180)) {
        portrait(id,x+l.cardW*.28,py,Math.min(65,l.cardH*.85),model);
        text(i?'Mira':'Milo',x+l.cardW*.57,l.y+25,20,C.cream,'left','display',0,l.cardW*.40);
      } else if (l.short) {
        portrait(id, x + l.cardW * 0.30, py, size, model);
        text(i ? 'Mira' : 'Milo', x + l.cardW * 0.56, l.y + 30, 23, C.cream, 'left', 'display');
        text(i ? 'Bright & bold' : 'Ready to rise', x + l.cardW * 0.56, l.y + 66, 12, C.muted,
          'left', 'body', 0, l.cardW * 0.40);
      } else {
        portrait(id, cx, py, size, model);
        text(i ? 'Mira' : 'Milo', cx, l.y + l.cardH * 0.72, l.phone ? 26 : 29, C.cream, 'center', 'display');
        label(i ? 'BRIGHT & BOLD' : 'READY TO RISE', cx, l.y + l.cardH * 0.88,
          l.phone ? 8 : 9, C.gold, 'center');
      }
    }
    const bottom = l.y + l.cardH + (l.short ? 13 : 24), bw = Math.min(380, W - 56);
    button('start', 'LET\'S BREW', (W - bw) / 2, bottom, bw, l.short ? 40 : 48, true);
    if (!l.short) {
      text('Move with A/D. Hold Space to jump higher.', W / 2, bottom + 68, 14, C.muted, 'center', 'body', 0, W - 30);
      text('Touch: steer left. Hold the up arrow to jump.', W / 2, bottom + 90, 13, C.muted, 'center', 'body', 0, W - 30);
      footer();
    }
    button('back', '', 18, l.short ? H - 44 : H - 51, 32, 30, false, { icon: 'back' });
  }
  function meter(x, y, w, value, color, h = 4) {
    roundRect(x, y, w, h, h / 2); ctx.fillStyle = 'rgba(242,240,232,0.1)'; ctx.fill();
    const v = Math.max(0, Math.min(1, value));
    if (v > 0) { roundRect(x, y, Math.max(h, w * v), h, h / 2); ctx.fillStyle = color; ctx.fill(); }
  }
  function hud(model) {
    const r=model.run;if(!r)return;
    const l=headerLayout(W,H,true),{x,y,w,h}=l.hud,phone=l.mobile;
    const gap=r.y-r.coffeeY,grace=r.elapsed<RECIPES[r.recipe].grace;
    const danger=!grace&&gap<2.7,alarm=danger?'#F4A07A':C.gold;
    panel(x,y,w,h,'rgba(12,38,28,.96)','rgba(200,170,115,.58)',12);
    const a=x+w*.36,b=x+w*.65,pad=phone?10:18;
    line(a,y+11,a,y+h-11,'rgba(200,170,115,.23)');
    line(b,y+11,b,y+h-11,'rgba(200,170,115,.23)');
    // Recipe is supporting information; ingredients stay individually legible.
    label(r.recipe==='latte'?'LATTE ORDER':'ESPRESSO ORDER',x+pad,y+10,phone?8:10,C.gold,'left',w*.36-pad*2);
    const ingredientY=y+(h<70?29:33), available=w*.36-pad*2;
    bean(x+pad+5,ingredientY+8,phone?12:16);
    text(`${r.collected.bean}/${r.required.bean}`,x+pad+(phone?14:20),ingredientY,phone?16:24,C.cream,'left','bold',0,r.required.milk?available*.40:available-20);
    if(r.required.milk) {
      const mx=x+pad+available*.56;drop(mx,ingredientY+8,phone?11:14);
      text(`${r.collected.milk}/${r.required.milk}`,mx+(phone?9:12),ingredientY,phone?16:24,C.cream,'left','bold',0,available*.44-(phone?9:12));
    }
    if(h>=78)text('Recipe ingredients',x+pad,y+h-18,10,C.muted,'left','body',0,available);
    const cx=(a+b)/2;
    label('CLIMB',cx,y+8,phone?9:10,C.gold,'center');
    text(`${Math.round(r.progress*100)}%`,cx,y+(h<70?23:26),phone?29:33,C.cream,'center','bold',0,b-a-14);
    meter(a+12,y+h-12,b-a-24,r.progress,C.gold,5);
    const status=r.state==='countdown'?'Ready':r.state==='paused'?'Paused':grace?`In ${Math.ceil(RECIPES[r.recipe].grace-r.elapsed)}s`:danger?'Close!':'Rising';
    const dangerW=x+w-b;
    if(danger){const glow=ctx.createLinearGradient(b,0,x+w,0);glow.addColorStop(0,'rgba(125,43,23,.1)');glow.addColorStop(1,'rgba(125,43,23,.42)');
      ctx.save();roundRect(b+3,y+3,dangerW-6,h-6,9);ctx.fillStyle=glow;ctx.fill();ctx.restore();}
    label('COFFEE',b+dangerW/2,y+10,phone?8:10,alarm,'center');
    text(status,b+dangerW/2,y+(h<70?28:32),phone?22:26,danger?'#FFC29B':C.cream,'center','display',0,dangerW-18);
    meter(b+12,y+h-12,dangerW-24,grace?0:1-gap/10,alarm,5);
  }
  function controlKey(id, box) {
    const {x,y,w,h}=box,down=Boolean(pressed[id]),sink=down?5:0,radius=Math.min(24,w*.24);
    // A raised chocolate key: dark underside, warm bevel and cream inlay.
    ctx.save();ctx.shadowColor='rgba(0,0,0,.38)';ctx.shadowBlur=10;ctx.shadowOffsetY=4;
    roundRect(x,y+6,w,h,radius);ctx.fillStyle='#2E180F';ctx.fill();ctx.restore();
    const face=ctx.createLinearGradient(x,y,x+w,y+h);
    face.addColorStop(0,down?'#71432C':'#A56D47');face.addColorStop(.44,down?'#633822':'#805034');face.addColorStop(1,'#56301F');
    roundRect(x,y+sink,w,h-2,radius);ctx.fillStyle=face;ctx.fill();ctx.strokeStyle=down?'#F4D3A0':'#C39669';ctx.lineWidth=down?2.5:1.5;ctx.stroke();
    roundRect(x+4,y+4+sink,w-8,h-10,radius-3);ctx.strokeStyle='rgba(255,225,181,.16)';ctx.lineWidth=1;ctx.stroke();
    ctx.save();ctx.translate(x+w/2,y+h/2+sink-2);
    {
      const s=Math.min(w,h)*(id==='jump'?.30:.26);
      ctx.beginPath();
      if(id==='jump') {
        ctx.moveTo(0,-s);ctx.lineTo(s,-s*.06);ctx.quadraticCurveTo(s*1.12,s*.12,s*.8,s*.12);
        ctx.lineTo(s*.36,s*.12);ctx.lineTo(s*.36,s*.85);ctx.quadraticCurveTo(s*.36,s,s*.17,s);
        ctx.lineTo(-s*.17,s);ctx.quadraticCurveTo(-s*.36,s,-s*.36,s*.85);ctx.lineTo(-s*.36,s*.12);
        ctx.lineTo(-s*.8,s*.12);ctx.quadraticCurveTo(-s*1.12,s*.12,-s,-s*.06);
      } else {
        const d=id==='left'?-1:1;ctx.moveTo(d*s,0);ctx.lineTo(-d*s*.65,-s);ctx.quadraticCurveTo(-d*s,-s*1.15,-d*s,-s*.75);
        ctx.lineTo(-d*s,s*.75);ctx.quadraticCurveTo(-d*s,s*1.15,-d*s*.65,s);
      }
      ctx.closePath();ctx.shadowColor='#382012';ctx.shadowBlur=1;ctx.shadowOffsetY=3;
      const inlay=ctx.createLinearGradient(0,-s,0,s);inlay.addColorStop(0,'#FFF4D8');inlay.addColorStop(1,'#E5BC7D');
      ctx.fillStyle=inlay;ctx.fill();ctx.shadowColor='transparent';ctx.strokeStyle='#FFDEAA';ctx.lineWidth=1;ctx.stroke();
    }
    ctx.restore();buttons.push({id,...box.hit});
  }
  function touchControls(model) {
    const l=touchLayout(W,H);
    controlKey('left',l.left);controlKey('right',l.right);controlKey('jump',l.jump);
    if(W>700)label('A / D MOVE   ·   HOLD SPACE JUMP   ·   R RETRY',W/2,H-28,9,C.muted,'center');
  }
  function countdown(r) {
    const cy = Math.min(H * 0.49, H - 160);
    ctx.fillStyle = 'rgba(8,28,19,0.42)'; ctx.beginPath(); ctx.arc(W / 2, cy + 16, 61, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(200,166,106,0.68)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(W / 2, cy + 16, 61, -Math.PI / 2, Math.PI * 1.5); ctx.stroke();
    text(String(Math.max(1, Math.ceil(r.countdown))), W / 2, cy - 14, 63, C.cream, 'center', 'display');
    label('REACH THE GOLDEN RIM', W / 2, cy + 99, W < 500 ? 10 : 12, C.gold, 'center');
  }
  function pauseScreen() {
    ctx.fillStyle = 'rgba(5,23,17,0.79)'; ctx.fillRect(0, 0, W, H);
    const short = H < 450, w = Math.min(W - 42, 390), x = (W - w) / 2;
    const h = short ? 248 : 330, y = Math.max(55, (H - h) / 2);
    panel(x, y, w, h, '#173B2B', 'rgba(200,166,106,0.55)', 12);
    logo(W / 2, y + (short ? 32 : 43), 32);
    text('Coffee break', W / 2, y + (short ? 61 : 89), short ? 27 : 33, C.cream, 'center', 'display');
    if (!short) text('Take a moment. The coffee can wait.', W / 2, y + 139, 14, C.muted, 'center');
    button('pause', 'KEEP CLIMBING', x + 22, y + (short ? 111 : 184), w - 44, 43, true);
    button('restart', 'START A FRESH BREW', x + 22, y + (short ? 164 : 237), w - 44, 39);
    button('order', 'CHANGE ORDER', x + 22, y + (short ? 210 : 285), w - 44, 29, false, { fontSize: 11 });
  }
  function rewardCard(x, y, w, h, recipe) {
    const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
    gradient.addColorStop(0, '#386B4B'); gradient.addColorStop(0.48, '#153C2A'); gradient.addColorStop(1, '#0C2B1E');
    panel(x, y, w, h, gradient, C.gold, 9);
    ctx.strokeStyle = 'rgba(200,166,106,0.45)'; roundRect(x + 6, y + 6, w - 12, h - 12, 5); ctx.stroke();
    const illustration = recipe === 'espresso' ? espressoCard : latteCard;
    ctx.save(); roundRect(x + 10, y + 10, w - 20, h - 20, 4); ctx.clip();
    ctx.drawImage(illustration, x + 10, y + 10, w - 20, h - 20); ctx.restore();
  }

  function resultsScreen(model) {
    const r=model.run,result=r?.result;if(!result)return;
    menuBackdrop();
    const l=resultsLayout(W,H),{x,y,w,h,short,dense}=l;
    panel(x,y,w,h,'rgba(16,48,36,.98)','rgba(200,170,115,.7)',18);
    ctx.strokeStyle='rgba(200,170,115,.18)';roundRect(x+6,y+6,w-12,h-12,13);ctx.stroke();
    const heading=result.success?(result.perfect?'Perfect Coffee':'Beautifully brewed'):'One more brew?';
    text(heading,x+24,y+(dense?12:25),dense?22:short?28:36,C.cream,'left','display',0,w-48);
    const progress=Math.round(result.progress*100),taken=result.collected.bean+result.collected.milk,total=result.required.bean+result.required.milk;
    text(result.success?'You reached the golden rim.':`Reached ${progress}% of the cup. Keep the next jump in sight.`,x+24,y+(dense?41:short?61:77),dense?10:short?12:14,C.muted,'left','body',0,w-48);
    const best=model.bests?.[r.recipe];
    const rows=[['timer','TIME',formatTime(result.time)],['climb','HIGHEST CLIMB',`${progress}%  ·  ${result.bestHeight.toFixed(1)}m`],
      ['collect','COLLECTED',`${taken} / ${total}`],['best','BEST CLIMB',`${Math.round((best?.progress||result.progress)*100)}%`]];
    if(short) {
      rows.forEach(([ico,labelText,value],i)=>{
        const cx=x+24+(i%2)*(w/2),cy=y+(dense?61:94)+Math.floor(i/2)*(dense?30:45);
        symbol(ico,cx+10,cy+10,18);label(labelText,cx+30,cy,8,C.gold);
        text(value,cx+30,cy+(dense?12:16),dense?15:18,C.cream,'left','bold',0,w/2-70);
      });
      const retry=l.restart,order=l.order;
      button('restart','BREW AGAIN',retry.x,retry.y,retry.w,retry.h,true);
      button('order','CHANGE ORDER',order.x,order.y,order.w,order.h,false,{fontSize:11});
    } else {
      meter(x+24,y+106,w-48,result.progress,C.gold,4);
      rows.forEach(([ico,labelText,value],i)=>{
        const cy=y+125+i*Math.min(44,(h-270)/4);
        symbol(ico,x+35,cy+10,19);label(labelText,x+59,cy+5,10,C.muted);
        text(value,x+w-26,cy,21,i===3?C.gold:C.cream,'right','bold',0,w*.44);
        if(i===2 && h>=470)text(`${result.collected.bean}/${result.required.bean} beans${result.required.milk?' · '+result.collected.milk+'/'+result.required.milk+' milk':''}`,x+59,cy+24,10,C.muted,'left','body',0,w*.53);
        if(i<3)line(x+24,cy+33,x+w-24,cy+33,'rgba(200,170,115,.15)');
      });
      const by=l.restart.y;
      if(result.success)text(`SCORE  ${result.score.toLocaleString('en-US')}`,x+w/2,by-30,12,C.gold,'center','mono');
      else if(best?.time)text(`Best finish  ${formatTime(best.time)}`,x+w/2,by-30,12,C.gold,'center','mono');
      button('restart','BREW AGAIN',l.restart.x,l.restart.y,l.restart.w,l.restart.h,true);
      button('order','CHANGE ORDER',l.order.x,l.order.y,l.order.w,l.order.h,false,{fontSize:11});
      button('exit','LEAVE CAFE',l.exit.x,l.exit.y,l.exit.w,l.exit.h,false,{fontSize:10});
      if(W>930 && result.perfect)rewardCard(x+w+18,y+130,130,182,r.recipe);
    }
  }
  function drawRewardMessage(model, x, y, maxWidth) {
    const perfect = model.run?.result?.perfect;
    let message = !model.run?.result?.success ? 'Keep moving. Brake early on white ceramic.' : model.reward || (model.rewardPending ? 'Preparing your collectible...' : perfect
      ? 'Perfect recipe complete.' : 'Collect every ingredient for Perfect Coffee.');
    if (message.toLowerCase().includes('sign in')) message = 'Sign in to keep your card and score.';
    text(message, x, y, 12, C.muted, 'center', 'body', 0, maxWidth);
  }
  function draw(model) {
    pressed = model.pressed || {};
    const nextW = Math.max(320, Math.round(p0.width || 640)), nextH = Math.max(260, Math.round(p0.height || 360));
    W = nextW; H = nextH;
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    ctx.clearRect(0, 0, W, H); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; buttons = [];
    const r = model.run;
    if (model.screen === 'game' && r) {
      if (r.state === 'results') {
        resultsScreen(model); header(model, false); texture.needsUpdate = true; return;
      }
      header(model, true); hud(model);
      if (r.state === 'countdown') countdown(r);
      if (r.state === 'play' || r.state === 'countdown') {
        touchControls(model);
        const notice = model.notice && (model.noticeLeft > 0 || model.noticeTime > 0);
        if (notice && r.state !== 'countdown' && H >= 450) {
          const nw = Math.min(W - 42, width(model.notice, 12, 'bold') + 34), nx = (W - nw) / 2;
          const timer=headerLayout(W,H,true).timer,ny=timer.y+timer.h+12;
          panel(nx, ny, nw, 29, 'rgba(13,37,28,0.85)', 'rgba(200,166,106,0.34)', 5);
          text(model.notice, W / 2, ny + 9, 12, C.gold, 'center', 'bold', 0, nw - 20);
        }
      }
      if (r.state === 'paused') {
        // The dimmed HUD remains visible, but only modal buttons receive taps.
        buttons = [];
        pauseScreen();
      }
    } else {
      menuBackdrop();
      if (model.screen === 'order') orderScreen(model);
      else if (model.screen === 'character') characterScreen(model);
      else titleScreen(model);
      header(model, false);
    }
    texture.needsUpdate = true;
  }
  function hit(px, py) {
    const x = px / Math.max(1, p0.width) * W, y = py / Math.max(1, p0.height) * H;
    for (let i = buttons.length - 1; i >= 0; i--) {
      const b = buttons[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.id;
    }
    return null;
  }
  return {
    draw, hit,
    characterAssets: { bitmap: characterBitmap, meta: characterData,
      primary: {bitmap: primaryBitmap, meta: primaryData} },
    render(renderer) { renderer.render(scene, camera); },
    async compile(renderer) { await renderer.compileAsync(scene, camera); },
    dispose() {
      mesh.geometry.dispose(); material.dispose(); texture.dispose();
      fontBitmap.close(); characterBitmap.close(); primaryBitmap.close(); espressoCard.close(); latteCard.close(); coverBitmap.close(); tintCache.clear();
    }
  };
}

export function formatTime(seconds = 0) {
  const finite = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(finite / 60), rest = (finite % 60).toFixed(2).padStart(5, '0');
  return `${minutes}:${rest}`;
}
