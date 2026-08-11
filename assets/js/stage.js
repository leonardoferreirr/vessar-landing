/* VESSAR — o palco. Uma malha de pontos em perspectiva 3D que se CONSTRÓI numa
   forma diferente a cada beat: chão → curva de crescimento → bifurcação →
   vórtice (tudo reage igual) → torre (a estrutura invisível) → hexágono das
   6 dimensões → rede. Herda a mecânica do Revert (grid 3D que se deforma). */
(function () {
  'use strict';
  var canvas = document.getElementById('stageCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 0, H = 0, DPR = 1, COLS = 30, ROWS = 16, N = 0;
  var pts = [];                       // {x,y,z, tx,ty,tz, sx,sy,sc}
  var st = { beat: 1, beatP: 0, theme: 'dark' };
  var themeMix = 0, t = 0, build = 0; // build 0..1 = quanto a forma atual já "assentou"
  var lastBeat = 1;

  var FOCAL = 720;
  function lerp(a, b, k) { return a + (b - a) * k; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(e0, e1, x) { x = clamp((x - e0) / (e1 - e0), 0, 1); return x * x * (3 - 2 * x); }
  function h1(i) { var s = Math.sin(i * 12.9898) * 43758.5453; return s - Math.floor(s); }
  function h2(i) { var s = Math.sin(i * 78.233) * 12543.331; return s - Math.floor(s); }

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.floor(W * DPR); canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var wantCols = W < 720 ? 20 : 30, wantRows = W < 720 ? 12 : 16;
    if (wantCols !== COLS || wantRows !== ROWS || !N) { COLS = wantCols; ROWS = wantRows; build_pts(); }
  }
  function build_pts() {
    N = COLS * ROWS; pts = [];
    for (var i = 0; i < N; i++) pts.push({ x: (h1(i) - .5) * 1600, y: (h2(i) - .5) * 900, z: h1(i + 3) * 1600, tx: 0, ty: 0, tz: 0, sx: 0, sy: 0, sc: 0 });
  }

  // ---- formas: cada uma devolve alvo {x,y,z} para o ponto i (col,row) ----
  function shape(name, i) {
    var col = i % COLS, row = (i / COLS) | 0;
    var u = COLS > 1 ? col / (COLS - 1) : .5;
    var v = ROWS > 1 ? row / (ROWS - 1) : .5;
    var lin = i / (N - 1);
    switch (name) {
      case 'floor': {                                   // chão em perspectiva (tron)
        return { x: (u - .5) * 1500, y: 280, z: v * 1700 };
      }
      case 'curve': {                                   // superfície que sobe = crescimento
        var rise = Math.pow(v, 1.5);
        return { x: (u - .5) * 1400, y: 240 - rise * 620, z: v * 1600 };
      }
      case 'fork': {                                    // a grade se bifurca em dois caminhos
        var side = u < .5 ? -1 : 1;
        var bend = smooth(.32, 1, v);
        return { x: (u - .5) * 900 + side * bend * 620, y: 280 - bend * 40, z: v * 1700 };
      }
      case 'funnel': {                                  // vórtice: tudo converge pro mesmo ponto
        var k = Math.pow(v, 1.3);
        var ang = u * Math.PI * 2 + v * 2.4;
        var rad = (1 - k) * 640;
        return { x: Math.cos(ang) * rad, y: 40 + Math.sin(ang) * rad * .5 + k * 120, z: 200 + k * 1500 };
      }
      case 'tower': {                                   // a estrutura invisível se ergue
        var ang2 = u * Math.PI * 2;
        var rad2 = 150 * (1 - v * .25);
        return { x: Math.cos(ang2) * rad2, y: 320 - v * 780, z: 380 + Math.sin(ang2) * rad2 };
      }
      case 'hexagon': {                                 // as 6 dimensões: hexágono nítido de pontos
        var side6 = Math.floor(lin * 6) % 6;
        var f = (lin * 6) % 1;
        var R = 240;
        var a0 = (Math.PI / 3) * side6 - Math.PI / 2;
        var a1 = (Math.PI / 3) * (side6 + 1) - Math.PI / 2;
        var x0 = Math.cos(a0) * R, y0 = Math.sin(a0) * R;
        var x1 = Math.cos(a1) * R, y1 = Math.sin(a1) * R;
        var jz = (h1(i) - .5) * 16;
        return { x: lerp(x0, x1, f), y: lerp(y0, y1, f) + 40, z: 260 + jz };
      }
      case 'isonet': {                                  // rede frontal (nova camada)
        return { x: (u - .5) * 1100, y: (v - .5) * 640 + 20, z: 320 };
      }
      default: {                                        // cloud: poeira ambiente
        return { x: (h1(i) - .5) * 1500, y: (h2(i) - .5) * 900, z: 300 + h1(i + 7) * 1300 };
      }
    }
  }

  var MODES = { 1: 'cloud', 2: 'curve', 3: 'fork', 4: 'funnel', 5: 'tower', 6: 'hexagon', 7: 'isonet', 8: 'cloud', 9: 'floor', 10: 'cloud', 11: 'cloud' };
  var GRID_WIRE = { floor: 1, curve: 1, fork: 1, funnel: 1, isonet: 1 };
  var SEQ_WIRE = { hexagon: 1, tower: 1 };

  function project(p, cx, cy) {
    var zz = Math.max(60, p.z + 520);
    var s = FOCAL / zz;
    p.sx = cx + p.x * s;
    p.sy = cy + p.y * s;
    p.sc = s;
  }

  function frame() {
    t += reduced ? 0 : 0.016;
    var mode = MODES[st.beat] || 'cloud';
    if (st.beat !== lastBeat) { lastBeat = st.beat; build = 0; }
    build = lerp(build, 1, 0.05);

    var wantLight = st.theme === 'light' ? 1 : 0;
    themeMix = lerp(themeMix, wantLight, 0.07);

    var cx = W / 2, cy = H * (mode === 'floor' || mode === 'fork' ? 0.40 : mode === 'hexagon' ? 0.60 : 0.52);
    // leve deriva de câmera pra dar vida
    var camX = reduced ? 0 : Math.sin(t * 0.25) * 16;

    ctx.clearRect(0, 0, W, H);

    // atualiza alvos + interpola + projeta
    for (var i = 0; i < N; i++) {
      var p = pts[i];
      var tg = shape(mode, i);
      p.tx = tg.x; p.ty = tg.y; p.tz = tg.z;
      var k = reduced ? 1 : 0.06;
      p.x = lerp(p.x, p.tx, k);
      p.y = lerp(p.y, p.ty, k);
      p.z = lerp(p.z, p.tz, k);
      project(p, cx + camX, cy);
    }

    // cor por tema
    var gold = themeMix > .5 ? '201,154,75' : '226,190,117';
    var lineBase = lerp(0.16, 0.10, themeMix);
    var dotBase = lerp(0.85, 0.74, themeMix);

    // fio: malha (vizinhos) ou sequencial
    if (GRID_WIRE[mode]) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(' + gold + ',' + (lineBase * build).toFixed(3) + ')';
      ctx.beginPath();
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        var a = r * COLS + c, pa = pts[a];
        if (c < COLS - 1) { var pr = pts[a + 1]; ctx.moveTo(pa.sx, pa.sy); ctx.lineTo(pr.sx, pr.sy); }
        if (r < ROWS - 1) { var pd = pts[a + COLS]; ctx.moveTo(pa.sx, pa.sy); ctx.lineTo(pd.sx, pd.sy); }
      }
      ctx.stroke();
    } else if (SEQ_WIRE[mode]) {
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(' + gold + ',' + (lerp(0.22, 0.16, themeMix) * build).toFixed(3) + ')';
      ctx.beginPath();
      for (var j = 0; j < N - 1; j++) { ctx.moveTo(pts[j].sx, pts[j].sy); ctx.lineTo(pts[j + 1].sx, pts[j + 1].sy); }
      ctx.stroke();
    }

    // pontos (fade por profundidade)
    for (var m = 0; m < N; m++) {
      var q = pts[m];
      var depth = clamp(q.sc * 1.1, .12, 1);
      var alpha = dotBase * depth * (0.5 + 0.5 * build);
      if (alpha < 0.02) continue;
      ctx.fillStyle = 'rgba(' + gold + ',' + alpha.toFixed(3) + ')';
      var sz = clamp(q.sc * 1.9, .6, 2.6);
      ctx.fillRect(q.sx - sz / 2, q.sy - sz / 2, sz, sz);
    }

    requestAnimationFrame(frame);
  }

  // geometria do hexágono exposta pro HTML posicionar os rótulos das 6 dimensões
  window.VessarStage = {
    update: function (s) { st.beat = s.beat; st.beatP = s.beatP; st.theme = s.theme; },
    hexVertices: function () {
      var cx = W / 2, cy = H * 0.60, R = 240, out = [];
      var zz = Math.max(60, 260 + 520), s = FOCAL / zz;
      for (var k = 0; k < 6; k++) {
        var a = (Math.PI / 3) * k - Math.PI / 2;
        out.push({ x: cx + Math.cos(a) * R * s, y: cy + (Math.sin(a) * R + 40) * s });
      }
      return out;
    }
  };

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
})();
