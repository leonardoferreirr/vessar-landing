/* VESSAR — o palco. UM sistema de pontos que atravessa a página inteira e
   nunca reseta: o V do logo se materializa, dispersa no universo e daí em
   diante cada seção CONSTRÓI uma forma, sempre em transição contínua pelo
   scroll (pontos e linhas fazem cross-fade, nada aparece nem some). */
(function () {
  'use strict';
  var canvas = document.getElementById('stageCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 0, H = 0, DPR = 1, COLS = 30, ROWS = 16, N = 0, desktop = true;
  var pts = [];
  var st = { beat: 1, beatP: 0, theme: 'dark' };
  var themeMix = 0, t = 0, introT = 0, logoTargets = [];
  var mx = 0, my = 0, tmx = 0, tmy = 0;
  var FOCAL = 720;
  var LOGO_PATH = 'M519.713 770.039L297.282 433.841L500.156 702.649L726.216 348.344H682.012L495.084 625.847L272.641 309.953H372.629L529.132 538.9L682.012 309.953H807.359L519.713 770.039Z';

  function lerp(a, b, k) { return a + (b - a) * k; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(e0, e1, x) { x = clamp((x - e0) / (e1 - e0), 0, 1); return x * x * (3 - 2 * x); }
  function h1(i) { var s = Math.sin(i * 12.9898) * 43758.5453; return s - Math.floor(s); }
  function h2(i) { var s = Math.sin(i * 78.233) * 12543.331; return s - Math.floor(s); }

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth; H = canvas.clientHeight; desktop = W >= 720;
    canvas.width = Math.floor(W * DPR); canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var wc = desktop ? 30 : 20, wr = desktop ? 16 : 12;
    if (wc !== COLS || wr !== ROWS || !N) { COLS = wc; ROWS = wr; build_pts(); sampleLogo(); }
  }
  function build_pts() {
    N = COLS * ROWS; pts = [];
    for (var i = 0; i < N; i++) pts.push({
      x: (h1(i) - .5) * 1600, y: (h2(i) - .5) * 900, z: h1(i + 3) * 1600,
      sx: 0, sy: 0, sc: 0, star: Math.pow(h1(i + 11), 2.0), tw: h2(i + 11) * 6.28
    });
  }
  // amostra o V do logo em N posições (pontos onde há tinta)
  function sampleLogo() {
    logoTargets = [];
    var vx = 250, vy = 290, vw = 580, vh = 500, S = 2;
    var cw = Math.round(vw / S), ch = Math.round(vh / S);
    var filled = [];
    try {
      var off = document.createElement('canvas'); off.width = cw; off.height = ch;
      var o = off.getContext('2d');
      o.setTransform(1 / S, 0, 0, 1 / S, -vx / S, -vy / S);
      o.fillStyle = '#fff'; o.fill(new Path2D(LOGO_PATH));
      var d = o.getImageData(0, 0, cw, ch).data;
      var fa = function (x, y) { return x >= 0 && y >= 0 && x < cw && y < ch && d[(y * cw + x) * 4 + 3] > 120; };
      // contorno do V: pixel com tinta que tem algum vizinho vazio (fica nítido com poucos pontos)
      for (var y = 0; y < ch; y++) for (var x = 0; x < cw; x++) if (fa(x, y) && (!fa(x - 1, y) || !fa(x + 1, y) || !fa(x, y - 1) || !fa(x, y + 1))) filled.push([x / cw - 0.5, y / ch - 0.5]);
    } catch (e) { filled = []; }
    var sy = 460, sx = 460 * (vw / vh);
    for (var i = 0; i < N; i++) {
      if (filled.length) { var f = filled[(i * 269 + 7) % filled.length]; logoTargets.push({ x: f[0] * sx, y: f[1] * sy - 20, z: 170 + (h1(i) - .5) * 70 }); }
      else logoTargets.push(shape('cloud', i));
    }
  }

  function shape(name, i) {
    var col = i % COLS, row = (i / COLS) | 0;
    var u = COLS > 1 ? col / (COLS - 1) : .5, v = ROWS > 1 ? row / (ROWS - 1) : .5, lin = i / (N - 1);
    switch (name) {
      case 'floor': return { x: (u - .5) * 1500, y: 280, z: v * 1700 };
      case 'curve': return { x: (u - .5) * 1400, y: 280 - v * 200, z: v * 1700 };                 // um caminho reto que sobe
      case 'fork': { var gx = u - 0.5, sg = gx < 0 ? -1 : 1, spread = smooth(0.12, 1, v); return { x: gx * (620 + v * 360) + sg * spread * 330, y: 280 - v * 180, z: v * 1700 }; }  // começa junto (perto) e se abre em dois (longe)
      case 'funnel': { var k = Math.pow(v, 1.12), ang = u * Math.PI * 2 + v * 3.0, rad = (1 - k) * 560; return { x: Math.cos(ang) * rad, y: Math.sin(ang) * rad * 0.55 + 30, z: 220 + k * 1500 }; }  // vórtice: tudo gira e converge pro mesmo ponto (concentração)
      case 'journey': { var s = lin; return { x: Math.sin(s * Math.PI * 3) * 400, y: (s - .5) * 940, z: 300 + Math.cos(s * Math.PI * 3) * 110 }; }
      case 'hexagon': { var s6 = Math.floor(lin * 6) % 6, f = (lin * 6) % 1, R = 205, a0 = (Math.PI / 3) * s6 - Math.PI / 2, a1 = (Math.PI / 3) * (s6 + 1) - Math.PI / 2, jz = (h1(i) - .5) * 14; return { x: lerp(Math.cos(a0) * R, Math.cos(a1) * R, f), y: lerp(Math.sin(a0) * R, Math.sin(a1) * R, f) + 30, z: 260 + jz }; }
      case 'isonet': return { x: (u - .5) * 1100, y: (v - .5) * 640 + 20, z: 320 };
      default: return { x: (h1(i) - .5) * 1700, y: (h2(i) - .5) * 1000, z: 120 + h1(i + 7) * 1900 };
    }
  }
  // forma do beat, com a intro do logo dissolvendo no universo (só no beat 1)
  function beatShape(beat, i) {
    if (beat === 1 && introT < 1 && logoTargets.length) {
      var lv = logoTargets[i], cl = shape('cloud', i), it = smooth(0, 1, introT);
      return { x: lerp(lv.x, cl.x, it), y: lerp(lv.y, cl.y, it), z: lerp(lv.z, cl.z, it) };
    }
    return shape(MODES[beat] || 'cloud', i);
  }

  var MODES = { 1: 'cloud', 2: 'curve', 3: 'fork', 4: 'funnel', 5: 'journey', 6: 'hexagon', 7: 'isonet', 8: 'cloud', 9: 'floor', 10: 'cloud', 11: 'cloud' };
  var GRID_WIRE = { floor: 1, curve: 1, fork: 1, funnel: 1, isonet: 1 };
  var SEQ_WIRE = { hexagon: 1, journey: 1 };
  function cyOf(m) { return H * (m === 'floor' || m === 'fork' || m === 'curve' ? 0.40 : m === 'hexagon' ? 0.63 : 0.52); }
  function isCloudMode(beat) { return (MODES[beat] || 'cloud') === 'cloud'; }

  function drawGridWire(alpha, gold, splitMid) {
    if (alpha < 0.012) return;
    var mid = Math.floor((COLS - 1) * 0.5), splitRow = (ROWS * 0.34) | 0;   // separa os dois caminhos só no fundo; perto ficam unidos
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(' + gold + ',' + alpha.toFixed(3) + ')';
    ctx.beginPath();
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var idx = r * COLS + c, pa = pts[idx];
      if (c < COLS - 1 && !(splitMid && c === mid && r > splitRow)) { var pr = pts[idx + 1]; ctx.moveTo(pa.sx, pa.sy); ctx.lineTo(pr.sx, pr.sy); }
      if (r < ROWS - 1) { var pd = pts[idx + COLS]; ctx.moveTo(pa.sx, pa.sy); ctx.lineTo(pd.sx, pd.sy); }
    }
    ctx.stroke();
  }
  function drawSeqWire(alpha, gold) {
    if (alpha < 0.012) return;
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(' + gold + ',' + alpha.toFixed(3) + ')';
    ctx.beginPath();
    for (var j = 0; j < N - 1; j++) { ctx.moveTo(pts[j].sx, pts[j].sy); ctx.lineTo(pts[j + 1].sx, pts[j + 1].sy); }
    ctx.stroke();
  }

  function frame() {
    t += reduced ? 0 : 0.016;
    if (st.beat === 1 && introT < 1 && (reduced || t > 1.0)) introT += reduced ? 1 : 0.0075;  // segura o V um instante, depois dispersa
    mx = lerp(mx, tmx, 0.05); my = lerp(my, tmy, 0.05);

    var A = st.beat, B = Math.min(11, st.beat + 1);
    var modeA = MODES[A] || 'cloud', modeB = MODES[B] || 'cloud';
    var morphT = smooth(0.55, 1.0, st.beatP);           // estável e legível a maior parte; só transiciona na saída (sem spoiler)
    themeMix = lerp(themeMix, st.theme === 'light' ? 1 : 0, 0.07);

    var cx = W / 2, cy = lerp(cyOf(modeA), cyOf(modeB), morphT);
    var camX = reduced ? 0 : Math.sin(t * 0.22) * 12;
    // ao sair da bifurcação, a câmera segue o caminho da DIREITA (o escolhido) e volta ao centro
    var floatBeat = A + st.beatP, focusX = 0, zoom = 1;
    if (floatBeat > 3.0 && floatBeat < 4.0) {   // percorre uma via LONGA pelo caminho da DIREITA; toda a viagem termina ANTES do beat 4 (não o quebra)
      var travel = smooth(3.05, 3.98, floatBeat);
      focusX = travel * W * 0.3 * (1 - morphT);       // segue o caminho direito; volta ao centro quando vira vórtice
      zoom = 1 + Math.sin(travel * Math.PI) * 0.7;    // avança e volta; em 4.0 zoom=1 e o vórtice já está centrado
    }
    // quanto do estado atual é "universo" (controla tamanho/brilho, suave)
    var cloudMix = lerp(isCloudMode(A) ? 1 : 0, isCloudMode(B) ? 1 : 0, morphT);
    if (A === 1 && introT < 1) cloudMix = Math.max(cloudMix, smooth(0, 1, introT) * 0.6 + 0.4);

    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < N; i++) {
      var p = pts[i];
      var a = beatShape(A, i), b = shape(modeB, i);
      var tx = lerp(a.x, b.x, morphT), ty = lerp(a.y, b.y, morphT), tz = lerp(a.z, b.z, morphT);
      var drift = reduced ? 0 : Math.sin(t * 0.6 + p.tw) * cloudMix * 10;   // deriva só no universo; as malhas ficam retas
      var k = reduced ? 1 : 0.09;
      p.x = lerp(p.x, tx, k); p.y = lerp(p.y, ty + drift, k); p.z = lerp(p.z, tz, k);
      var zz = Math.max(60, p.z + 520), s = FOCAL / zz * zoom;
      var par = desktop ? s * 90 * cloudMix : 0;   // ímã de mouse só no universo (hero); não entorta as formas
      p.sx = cx + camX - focusX + p.x * s + mx * par * (1 + p.star);
      p.sy = cy + p.y * s + my * par * (1 + p.star);
      p.sc = s;
    }

    var gold = themeMix > .5 ? '201,154,75' : '226,190,117';
    var wireBase = lerp(0.14, 0.10, themeMix);
    // cross-fade das linhas: grade e sequencial coexistem durante a transição
    var gridAlpha = ((GRID_WIRE[modeA] ? 1 - morphT : 0) + (GRID_WIRE[modeB] ? morphT : 0)) * wireBase;
    var seqAlpha = ((SEQ_WIRE[modeA] ? 1 - morphT : 0) + (SEQ_WIRE[modeB] ? morphT : 0)) * (wireBase + 0.05);
    drawGridWire(gridAlpha, gold, (modeA === 'fork' || modeB === 'fork') ? 1 : 0);
    drawSeqWire(seqAlpha, gold);

    var dotBase = lerp(0.85, 0.76, themeMix);
    for (var m = 0; m < N; m++) {
      var q = pts[m];
      var depth = clamp(q.sc * 1.05, .22, 1);                 // piso: nenhum ponto some
      var twk = cloudMix > 0.05 && !reduced ? (1 - cloudMix * 0.18 * (0.5 + 0.5 * Math.sin(t * 1.4 + q.tw))) : 1;
      var alpha = clamp(dotBase * depth * twk, 0.08, 1);
      ctx.fillStyle = 'rgba(' + gold + ',' + alpha.toFixed(3) + ')';
      var sz = clamp(q.sc * (1.7 + cloudMix * q.star * 1.7), .7, 3.2);  // variação suave, sem inflar
      ctx.fillRect(q.sx - sz / 2, q.sy - sz / 2, sz, sz);
    }
    requestAnimationFrame(frame);
  }

  window.VessarStage = {
    update: function (s) { st.beat = s.beat; st.beatP = s.beatP; st.theme = s.theme; },
    hexVertices: function () {
      var cx = W / 2, cy = H * 0.60, R = 240, out = [], s = FOCAL / (260 + 520);
      for (var k = 0; k < 6; k++) { var a = (Math.PI / 3) * k - Math.PI / 2; out.push({ x: cx + Math.cos(a) * R * s + mx * s * 90, y: cy + (Math.sin(a) * R + 40) * s + my * s * 90 }); }
      return out;
    }
  };

  if (window.matchMedia && !window.matchMedia('(pointer: coarse)').matches) {
    window.addEventListener('mousemove', function (e) { tmx = (e.clientX / window.innerWidth - .5) * 2; tmy = (e.clientY / window.innerHeight - .5) * 2; }, { passive: true });
  }
  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
})();
