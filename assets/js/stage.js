/* VESSAR — o palco. Pó dourado que se comporta diferente em cada beat:
   poeira ambiente, fluxo ascendente, bifurcação, pulso em conjunto,
   nuvem instável, convergência. A assinatura da marca é consolidar. */
(function () {
  'use strict';

  var canvas = document.getElementById('stageCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d', { alpha: true });

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 0, H = 0, DPR = 1;
  var N = 0;
  var P = [];                 // partículas
  var st = { globalP: 0, beat: 1, beatP: 0, theme: 'dark' };
  var themeMix = 0;           // 0 = dark, 1 = light (interpolado)
  var t = 0;

  // hash determinístico -> posição estável por partícula
  function h1(i) { var s = Math.sin(i * 12.9898) * 43758.5453; return s - Math.floor(s); }
  function h2(i) { var s = Math.sin(i * 78.233) * 12543.331; return s - Math.floor(s); }
  var lerp = function (a, b, k) { return a + (b - a) * k; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var target = W < 720 ? 70 : 130;
    if (N !== target) build(target);
  }

  function build(n) {
    N = n; P = [];
    for (var i = 0; i < N; i++) {
      P.push({ x: h1(i) * W, y: h2(i) * H, tx: 0, ty: 0, ta: 0, a: 0, r: 0.6 + h1(i + 5) * 1.8, ph: h2(i) * 6.28 });
    }
  }

  // alvo de cada partícula segundo o modo do beat
  function target(i, mode) {
    var cx = W / 2, cy = H / 2;
    var u = i / N;
    var rx = h1(i), ry = h2(i);
    switch (mode) {
      case 'rising': {                     // fluxo diagonal ascendente
        var along = (u + t * 0.03) % 1;
        return { x: along * W, y: H * 0.9 - along * H * 0.72 + (ry - 0.5) * 60, a: 0.5 };
      }
      case 'diverge': {                    // dois feixes em V a partir do centro
        var side = i % 2 === 0 ? -1 : 1;
        var d = ((u + t * 0.02) % 1);
        return { x: cx + side * d * W * 0.55, y: cy + (side < 0 ? 1 : -1) * d * H * 0.4 + (ry - 0.5) * 40, a: 0.5 };
      }
      case 'pulseGrid': {                  // grade regular, pulsa junto (no draw)
        var cols = Math.ceil(Math.sqrt(N * (W / H)));
        var rows = Math.ceil(N / cols);
        var gx = (i % cols) / (cols - 1 || 1);
        var gy = Math.floor(i / cols) / (rows - 1 || 1);
        return { x: gx * W * 0.86 + W * 0.07, y: gy * H * 0.78 + H * 0.11, a: 0.55 };
      }
      case 'unstable': {                   // nuvem instável, tremor
        var ang = rx * 6.28, rad = (0.12 + ry * 0.26) * Math.min(W, H);
        return { x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad, a: 0.5 };
      }
      case 'converge': {                   // anel que consolida no centro
        var a2 = u * 6.28 * 3;
        var rad2 = lerp(0.30, 0.12, st.beatP) * Math.min(W, H);
        return { x: cx + Math.cos(a2) * rad2, y: cy + Math.sin(a2) * rad2 * 0.9, a: 0.6 };
      }
      case 'calm':                         // esparso e quieto
        return { x: rx * W, y: ry * H, a: 0.24 };
      default:                             // scatter / poeira ambiente
        return { x: rx * W, y: ry * H, a: 0.4 };
    }
  }

  var MODES = { 1: 'scatter', 2: 'rising', 3: 'diverge', 4: 'pulseGrid', 5: 'unstable', 6: 'converge', 7: 'calm', 8: 'calm', 9: 'scatter', 10: 'calm', 11: 'calm' };

  function frame() {
    t += reduced ? 0 : 0.016;
    // tema interpola suave (dark<->light)
    var wantLight = st.theme === 'light' ? 1 : 0;
    themeMix = lerp(themeMix, wantLight, 0.08);

    var mode = MODES[st.beat] || 'scatter';
    ctx.clearRect(0, 0, W, H);

    // vinheta sutil das bordas (só no escuro)
    if (themeMix < 0.9) {
      var g = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, 'rgba(226,190,117,' + (0.045 * (1 - themeMix)) + ')');
      g.addColorStop(1, 'rgba(4,6,10,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    var pulse = mode === 'pulseGrid' ? (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2.4))) : 1;
    var globalAlpha = lerp(1, 0.28, themeMix);   // no claro o pó recua

    for (var i = 0; i < N; i++) {
      var p = P[i];
      var tg = target(i, mode);
      var drift = reduced ? 0 : Math.sin(t * 0.7 + p.ph) * 3;
      p.tx = tg.x; p.ty = tg.y + drift;
      p.ta = tg.a;
      var k = reduced ? 1 : 0.055;
      p.x = lerp(p.x, p.tx, k);
      p.y = lerp(p.y, p.ty, k);
      p.a = lerp(p.a, p.ta, 0.06);

      var alpha = p.a * pulse * globalAlpha;
      if (alpha < 0.01) continue;
      ctx.fillStyle = 'rgba(226,190,117,' + alpha.toFixed(3) + ')';
      var s = p.r;
      ctx.fillRect(p.x, p.y, s, s);
    }

    requestAnimationFrame(frame);
  }

  window.VessarStage = {
    update: function (s) { st.globalP = s.globalP; st.beat = s.beat; st.beatP = s.beatP; st.theme = s.theme; }
  };

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
})();
