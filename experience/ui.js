import * as THREE from 'three';
import {RECIPES} from './rules.js';
export const GAME_TITLE = 'STARBOX COFFEE';

const C = Object.freeze({
  green: '#006241', forest: '#1E3932', cream: '#F2F0E8', gold: '#C8A66A',
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
  let W = 640, H = 360, buttons = [];

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
  function panel(x, y, w, h, fill = 'rgba(18,43,34,0.96)', border = 'rgba(200,166,106,0.4)', radius = 10) {
    roundRect(x, y, w, h, radius); ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = border; ctx.lineWidth = 1; ctx.stroke();
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
    panel(x, y, w, h, primary ? C.cream : options.selected ? '#245242' : 'rgba(27,61,47,0.92)',
      primary ? C.cream : options.selected ? C.gold : 'rgba(200,166,106,0.4)', 6);
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
    ctx.fillStyle = 'rgba(5,23,17,0.83)'; ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * 0.75, H * 0.36, 10, W * 0.75, H * 0.36, Math.max(W, H) * 0.75);
    glow.addColorStop(0, 'rgba(200,166,106,0.1)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(200,166,106,0.15)'; ctx.lineWidth = 1;
    roundRect(10.5, 10.5, W - 21, H - 21, 10); ctx.stroke();
  }
  function header(model, inGame = false) {
    const small = W < 500;
    logo(29, 27, 24);
    text(GAME_TITLE, 48, 15, small ? 11 : 12, C.cream, 'left', 'bold', 0.2);
    text('CLIMB. COLLECT. BREW.', 48, 31, small ? 8 : 9, C.gold, 'left', 'body');
    button('mute', '', W - (inGame ? 88 : 49), 13, 32, 30, false, { icon: model.muted ? 'muted' : 'sound' });
    if (inGame) button('pause', '', W - 49, 13, 32, 30, false, { icon: 'pause' });
    else label('LOT 696', W / 2, 24, small ? 8 : 9, C.muted, 'center');
    if (inGame && model.run) {
      panel(W / 2 - 40, 14, 80, 28, 'rgba(10,31,23,0.97)', 'rgba(200,166,106,0.35)', 5);
      text(formatTime(model.run.elapsed || 0), W / 2, 21, small ? 13 : 14, C.cream, 'center', 'mono', 0.4);
    }
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
    ctx.globalAlpha = 0.72;
    ctx.drawImage(coverBitmap, (W - coverBitmap.width * imageScale) / 2,
      (H - coverBitmap.height * imageScale) / 2, coverBitmap.width * imageScale, coverBitmap.height * imageScale);
    ctx.globalAlpha = 1;
    const grade = ctx.createLinearGradient(0, 0, W, 0);
    grade.addColorStop(0, 'rgba(5,23,17,0.96)'); grade.addColorStop(0.52, 'rgba(5,23,17,0.72)');
    grade.addColorStop(1, 'rgba(5,23,17,0.14)');
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
    } else if (narrow) {
      label('THE VERTICAL COFFEE ARCADE', W / 2, H * 0.15, 9, C.gold, 'center');
      text('STARBOX', W / 2, H * 0.19, Math.min(44, W * 0.115), C.cream, 'center', 'display');
      text('COFFEE', W / 2, H * 0.19 + 54, Math.min(48, W * 0.13), C.cream, 'center', 'display');
      drink(W / 2, H * 0.48, Math.min(W * 0.52, H * 0.25), model.selected || 'latte', true);
      text('A little barista. An enormous adventure.', W / 2, H * 0.68, 14, C.muted, 'center', 'body', 0, W - 40);
      text('Outrun the rising coffee. Brew your best.', W / 2, H * 0.68 + 23, 14, C.muted, 'center', 'body', 0, W - 40);
      button('titleStart', 'ORDER A COFFEE', 28, H - 126, W - 56, 49, true);
      label('FREE PLAY  ·  INSTANT RETRIES', W / 2, H - 60, 9, C.gold, 'center');
    } else {
      const left = W * 0.12, top = H * 0.26;
      label('THE VERTICAL COFFEE ARCADE', left, top - 30, 11);
      text('STARBOX', left, top, Math.min(60, W * 0.063), C.cream, 'left', 'display');
      text('COFFEE', left, top + 74, Math.min(72, W * 0.075), C.cream, 'left', 'display');
      text('Climb the cup. Collect your recipe.', left, top + 180, 17, C.muted);
      text('Escape with the perfect coffee.', left, top + 207, 17, C.muted);
      button('titleStart', 'ORDER A COFFEE', left, Math.min(H - 105, top + 260), 290, 49, true);
      label('CLIMB TO THE LAST DROP', W * 0.77, H - 69, 10, C.gold, 'center');
    }
    if (!narrow || short) footer();
  }
  function selectionLayout() {
    const short = H < 460, phone = W < 500;
    const cardW = Math.min(phone ? (W - 44) / 2 : (W - 92) / 2, short ? 235 : 266);
    const cardH = short ? Math.max(130, H - 207) : Math.min(phone ? 310 : 302, H - 294);
    const gap = phone ? 12 : 20;
    const x = (W - cardW * 2 - gap) / 2;
    const y = short ? 110 : Math.max(154, H * (phone ? 0.25 : 0.23));
    return { short, phone, cardW, cardH, gap, x, y };
  }
  function selectFrame(id, selected, x, y, w, h) {
    panel(x, y, w, h, selected ? 'rgba(43,83,60,0.97)' : 'rgba(19,48,36,0.94)',
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
    steps(1, l.short ? 64 : 76);
    title('Choose your coffee', l.short ? '' : 'Two orders. One way up.', l.short ? 81 : 107, l.short);
    for (let i = 0; i < 2; i++) {
      const id = i ? 'latte' : 'espresso', x = l.x + i * (l.cardW + l.gap), cx = x + l.cardW / 2;
      selectFrame(id, selected === id, x, l.y, l.cardW, l.cardH);
      if (l.short) {
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
    steps(2, l.short ? 64 : 76);
    title('Meet your barista', l.short ? '' : 'Small heroes. Legendary coffee.', l.short ? 81 : 107, l.short);
    for (let i = 0; i < 2; i++) {
      const id = i ? 'girl' : 'boy', x = l.x + i * (l.cardW + l.gap), cx = x + l.cardW / 2;
      selectFrame(id, selected === id, x, l.y, l.cardW, l.cardH);
      const py = l.short ? l.y + l.cardH * 0.48 : l.y + l.cardH * 0.38;
      const size = l.short ? Math.min(110, l.cardH * 0.88) : Math.min(188, l.cardH * 0.73);
      const glow = ctx.createRadialGradient(cx, py, 0, cx, py, size * 0.65);
      glow.addColorStop(0, 'rgba(200,166,106,0.16)'); glow.addColorStop(1, 'rgba(200,166,106,0)');
      ctx.fillStyle = glow; ctx.fillRect(x + 2, l.y + 2, l.cardW - 4, l.cardH - 4);
      if (l.short) {
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
      text('Touch: use the arrows and JUMP.', W / 2, bottom + 90, 13, C.muted, 'center', 'body', 0, W - 30);
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
    const r = model.run;
    if (!r) return;
    const phone = W < 500, hw = Math.min(W - 28, 654), x = (W - hw) / 2, y = 54, h = 59;
    panel(x, y, hw, h, 'rgba(10,31,23,0.97)', 'rgba(200,166,106,0.53)', 7);
    const proportions = phone ? [0, 0.22, 0.55, 0.73, 1] : [0, 0.23, 0.56, 0.75, 1];
    const labels = ['ORDER', 'COLLECT', 'CLIMB', 'COFFEE RISING'];
    const required = r.required || { bean: 0, milk: 0 }, collected = r.collected || { bean: 0, milk: 0 };
    const gap = r.y - r.coffeeY, graceSeconds = RECIPES[r.recipe].grace;
    const grace = r.elapsed < graceSeconds, danger = !grace && gap < 2.7;
    for (let i = 0; i < 4; i++) {
      const cx = x + hw * proportions[i], cw = hw * (proportions[i + 1] - proportions[i]);
      if (i) line(cx, y + 11, cx, y + h - 11, 'rgba(200,166,106,0.16)');
      text(labels[i], cx + 8, y + 9, phone ? 9 : 10.5, i === 3 && danger ? C.gold : C.muted,
        'left', 'bold', 0.1, cw - 14);
      if (i === 0) text(r.recipe === 'espresso' ? 'Espresso' : 'Latte', cx + 10, y + 30,
        phone ? 15 : 17, C.cream, 'left', 'bold', 0, cw - 17);
      if (i === 1) {
        bean(cx + 15, y + 38, phone ? 12 : 13);
        const first = `${collected.bean}/${required.bean}`;
        text(first, cx + 27, y + 31, phone ? 14 : 16, C.cream, 'left', 'bold');
        if (required.milk) {
          const mx = cx + (phone ? cw * 0.56 : cw * 0.54);
          drop(mx, y + 38, phone ? 11 : 12);
          text(`${collected.milk}/${required.milk}`, mx + 12, y + 31, phone ? 14 : 16, C.milk, 'left', 'bold');
        }
      }
      if (i === 2) {
        text(`${Math.round((r.progress || 0) * 100)}%`, cx + 10, y + 30, phone ? 15 : 17, C.cream, 'left', 'bold');
        meter(cx + 10, y + 52, cw - 20, r.progress || 0, C.gold, 3);
      }
      if (i === 3) {
        const status = r.state === 'countdown' ? 'Ready' : r.state === 'paused' ? 'Paused' :
          grace ? `In ${Math.ceil(graceSeconds-r.elapsed)}s` : danger ? 'CLOSE!' : 'Rising';
        text(status, cx + 10, y + 30, phone ? 14 : 16, danger ? C.gold : C.cream, 'left', 'bold', 0, cw - 17);
        meter(cx + 10, y + 52, cw - 20, grace ? 0 : 1 - gap / 12, danger ? C.gold : '#B99A70', 3);
      }
    }
    if (r.bonusStars) {
      star(x + hw - 14, y + h + 15, 4);
      text(`+${r.bonusStars}`, x + hw - 25, y + h + 10, 11, C.gold, 'right', 'mono');
    }
  }
  function touchControls() {
    const compact = H < 450, y = H - (compact ? 62 : 71), s = compact ? 42 : 47;
    button('left', '', 18, y, s, s, false, { icon: 'left' });
    button('right', '', 25 + s, y, s, s, false, { icon: 'right' });
    button('jump', 'JUMP', W - (compact ? 103 : 118), y, compact ? 85 : 100, s, false, { fontSize: 12 });
    if (W > 700) label('A / D MOVE   ·   HOLD SPACE JUMP   ·   R RETRY', W / 2, H - 29, 9, C.muted, 'center');
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
    const r = model.run, result = r?.result;
    if (!result) return;
    const short = H < 500, narrow = W < 620;
    menuBackdrop();
    const w = Math.min(W - 42, 770), x = (W - w) / 2;
    const y = short ? 65 : Math.max(85, H * (narrow ? 0.12 : 0.17));
    const headline = result.success ? result.perfect ? 'Perfect Coffee' : result.quality === 'GREAT COFFEE'
      ? 'A great coffee' : 'You made it!' : 'One more brew?';
    const subtitle = result.success ? result.perfect ? 'Every ingredient. A perfect finish.'
      : 'The rim is yours. There is more to collect.'
      : `Reached ${Math.round(result.progress * 100)}% of the cup. ${result.bestHeight.toFixed(1)} / ${result.top.toFixed(1)}m.`;
    if (short) {
      text(headline, x, y, 29, C.cream, 'left', 'display', 0, w - 175);
      text(subtitle, x, y + 41, 13, C.muted, 'left', 'body', 0, w - 170);
      const sy = y + 83;
      resultStats(result, r, x, sy, w - 175, true);
      if (result.perfect) rewardCard(x + w - 145, y, 145, Math.min(202, H - y - 46), r.recipe);
      else drink(x + w - 70, y + 92, 126, r.recipe, true);
      const by = H - 64, actionSpace = Math.max(0, w - 96), bw = Math.min(actionSpace * 0.55, 265);
      button('restart', 'BREW AGAIN', x, by, bw, 40, true);
      button('order', 'CHANGE ORDER', x + bw + 12, by, actionSpace - bw, 40, false, { fontSize: 11 });
      button('exit', 'LEAVE', x + w - 72, H - 55, 72, 30, false, { fontSize: 11 });
      return;
    }
    title(headline, subtitle, y, false);
    if (narrow) {
      const startY = y + 87;
      let artworkH = Math.min(result.perfect ? 204 : 145, Math.max(0, H - startY - 334));
      if (artworkH < 100) artworkH = 0;
      if (artworkH && result.perfect) {
        const artworkW = artworkH * 5 / 7;
        rewardCard(W / 2 - artworkW / 2, startY, artworkW, artworkH, r.recipe);
      } else if (artworkH) {
        drink(W / 2, startY + artworkH * 0.54, artworkH * 0.88, r.recipe, true);
      }
      const statsY = startY + (artworkH ? artworkH + 20 : 0);
      resultStats(result, r, x + 7, statsY, w - 14, false);
      const by = statsY + 201;
      button('restart', 'BREW AGAIN', x + 4, by, w - 8, 46, true);
      button('order', 'CHANGE ORDER', x + 4, by + 57, (w - 20) * 0.64, 36, false, { fontSize: 12 });
      button('exit', 'LEAVE CAFE', x + 16 + (w - 20) * 0.64, by + 57, (w - 20) * 0.36, 36, false, { fontSize: 11 });
      drawRewardMessage(model, x + w / 2, by - 23, w - 10);
    } else {
      const sy = y + 105, bodyH = Math.min(232, H - sy - 132);
      panel(x, sy, w * 0.6, bodyH, 'rgba(19,48,36,0.92)', 'rgba(200,166,106,0.24)', 10);
      resultStats(result, r, x + 24, sy + 24, w * 0.6 - 48, false);
      drawRewardMessage(model, x + w * 0.3, sy + bodyH - 32, w * 0.6 - 38);
      const cardH = bodyH + 20, cardW = cardH * 5 / 7;
      if (result.perfect) rewardCard(x + w - cardW - 8, sy - 9, cardW, cardH, r.recipe);
      else drink(x + w * 0.82, sy + 112, 192, r.recipe, true);
      const by = sy + bodyH + 24;
      button('restart', 'BREW AGAIN', x, by, w * 0.6, 47, true);
      button('order', 'CHANGE ORDER', x + w * 0.6 + 15, by, w * 0.4 - 15, 47, false, { fontSize: 12 });
      button('exit', 'LEAVE CAFE', W / 2 - 70, by + 61, 140, 30, false, { fontSize: 11 });
    }
  }
  function resultStats(result, run, x, y, w, short) {
    const taken = result.collected || run.collected, required = result.required || run.required;
    const name = run.recipe === 'espresso' ? 'Espresso' : 'Latte';
    if (short) {
      label('TIME', x, y, 9, C.muted);
      text(formatTime(result.time), x, y + 19, 22, C.gold, 'left', 'mono');
      label('SCORE', x + w, y, 9, C.muted, 'right');
      text(String(result.score || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ','), x + w, y + 19,
        22, C.gold, 'right', 'bold', 0, w * 0.48);
      bean(x + 6, y + 63, 13);
      text(`${taken.bean}/${required.bean} beans`, x + 19, y + 56, 14, C.cream);
      if (required.milk) {
        drop(x + w * 0.57, y + 63, 12);
        text(`${taken.milk}/${required.milk} milk`, x + w * 0.57 + 14, y + 56, 14, C.milk,
          'left', 'body', 0, w * 0.43 - 14);
      }
      return;
    }
    label('ORDER', x, y, 9, C.muted); text(name, x + w, y - 2, short ? 15 : 17, C.cream, 'right', 'bold');
    line(x, y + 27, x + w, y + 27);
    label('TIME', x, y + 42, 9, C.muted);
    text(formatTime(result.time), x + w, y + 38, short ? 21 : 25, C.gold, 'right', 'mono');
    const cy = y + (short ? 79 : 89);
    bean(x + 6, cy + 7, 13); text(`${taken.bean}/${required.bean} beans`, x + 19, cy, 14, C.cream);
    if (required.milk) {
      drop(x + w * 0.54, cy + 7, 12);
      text(`${taken.milk}/${required.milk} milk`, x + w * 0.54 + 14, cy, 14, C.milk, 'left', 'body', 0, w * 0.46 - 14);
    }
    if (!short) {
      line(x, cy + 29, x + w, cy + 29);
      label('SCORE', x, cy + 49, 9, C.muted);
      const bonusStars = result.bonusStars || run.bonusStars || 0;
      if (bonusStars) {
        star(x + 67, cy + 54, 4);
        text(`${bonusStars} bonus`, x + 78, cy + 49, 11, C.muted);
      }
      text(String(result.score || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ','), x + w, cy + 42,
        24, C.gold, 'right', 'bold');
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
        touchControls();
        const notice = model.notice && (model.noticeLeft > 0 || model.noticeTime > 0);
        if (notice && r.state !== 'countdown') {
          const nw = Math.min(W - 42, width(model.notice, 12, 'bold') + 34), nx = (W - nw) / 2;
          const ny = H - (H < 450 ? 105 : 119);
          panel(nx, ny, nw, 29, 'rgba(13,37,28,0.85)', 'rgba(200,166,106,0.34)', 5);
          text(model.notice, W / 2, ny + 9, 12, C.gold, 'center', 'bold', 0, nw - 20);
        }
      }
      if (r.state === 'paused') pauseScreen();
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
