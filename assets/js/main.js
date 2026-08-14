/* VESSAR — motor do filme de scroll: ativa beats, inverte o tema no clímax,
   dirige a barra de progresso e o palco (canvas), controla som e formulário. */
(function () {
  'use strict';

  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  var beats = Array.prototype.slice.call(document.querySelectorAll('.beat'));
  var body = document.body;
  var progressBar = document.getElementById('progressBar');
  var scrollHint = document.getElementById('scrollHint');
  var hexLabels = document.getElementById('hexLabels');
  var hexlabs = hexLabels ? Array.prototype.slice.call(hexLabels.querySelectorAll('.hexlab')) : [];

  var vh = window.innerHeight;
  var docH = 1;
  var state = { globalP: 0, beat: 1, beatP: 0, theme: 'dark' };
  var ticking = false;

  /* O texto acompanha o dedo. O .beat__inner e sticky, entao sem isso a
     mensagem aparece e congela ate a animacao do palco terminar. Aqui a caixa
     desliza de forma continua ao longo de todo o beat: comeca um pouco abaixo
     do centro e termina um pouco acima, no ritmo do scroll. */
  var caixas = beats.map(function (b) { return b.querySelector('.beat__box'); });
  var DESLIZE = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 92;

  function measure() {
    vh = window.innerHeight;
    docH = document.documentElement.scrollHeight - vh;
  }

  function onScroll() {
    var y = window.pageYOffset;
    var globalP = clamp(docH > 0 ? y / docH : 0, 0, 1);
    progressBar.style.width = (globalP * 100).toFixed(2) + '%';

    var active = 0, activeP = 0;
    for (var i = 0; i < beats.length; i++) {
      var b = beats[i];
      var top = b.offsetTop;
      var h = b.offsetHeight;
      var p = clamp((y - top) / Math.max(1, h - vh), 0, 1);
      var isActive = y >= top - vh * 0.5 && y < top + h - vh * 0.5;
      var isPast = y >= top + h - vh * 0.5;
      if (b.classList.contains('is-active') !== isActive) b.classList.toggle('is-active', isActive);
      if (b.classList.contains('is-past') !== isPast) b.classList.toggle('is-past', isPast);
      if (isActive) { active = i; activeP = p; }

      // so os beats por perto: mexer nos de fora custa layout a toa
      if (DESLIZE && caixas[i] && y > top - vh * 1.2 && y < top + h + vh * 0.2) {
        caixas[i].style.transform = 'translate3d(0,' + ((0.5 - p) * DESLIZE).toFixed(1) + 'px,0)';
      }
    }

    var theme = beats[active] ? beats[active].getAttribute('data-theme') : 'dark';
    body.classList.toggle('is-light', theme === 'light');
    scrollHint.classList.toggle('is-hidden', y > vh * 0.35);

    state.globalP = globalP;
    state.beat = active + 1;
    state.beatP = activeP;
    state.theme = theme;
    if (window.VessarStage) window.VessarStage.update(state);

    // beat 3: o texto dos dois caminhos some durante o mergulho — sobra "só o caminho" antes do vórtice
    var beat3 = beats[2];
    if (beat3) {
      var inner3 = beat3.querySelector('.beat__inner');
      if (inner3) {
        if (state.beat === 3) inner3.style.opacity = clamp(1 - (activeP - 0.24) / 0.18, 0, 1).toFixed(3);
        else if (inner3.style.opacity !== '') inner3.style.opacity = '';
      }
    }

    // rótulos das 6 dimensões acompanham os vértices do hexágono (beat 6)
    if (hexLabels) {
      if (state.beat === 6 && window.VessarStage && window.VessarStage.hexVertices) {
        hexLabels.classList.add('show');
        var vs = window.VessarStage.hexVertices();
        var hcx = window.innerWidth / 2, hcy = vh * 0.63;
        var mob = window.innerWidth < 720, pushX = mob ? 24 : 30, pushY = mob ? 16 : 24, pad = 10;
        for (var li = 0; li < hexlabs.length; li++) {
          var vtx = vs[li]; if (!vtx) continue;
          var dx = vtx.x - hcx, dy = vtx.y - hcy, len = Math.sqrt(dx * dx + dy * dy) || 1;
          var lx = vtx.x + dx / len * pushX, ly = vtx.y + dy / len * pushY;
          var half = hexlabs[li].offsetWidth / 2 + pad;   // nunca deixa o rótulo sair da tela
          lx = clamp(lx, half, window.innerWidth - half);
          hexlabs[li].style.left = lx + 'px';
          hexlabs[li].style.top = ly + 'px';
        }
      } else if (hexLabels.classList.contains('show')) {
        hexLabels.classList.remove('show');
      }
    }

    ticking = false;
  }

  function requestScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }

  window.addEventListener('scroll', requestScroll, { passive: true });
  window.addEventListener('resize', function () { measure(); requestScroll(); });

  // formulário: validação leve + estado de sucesso.
  // O envio real (Gmail SMTP / Formspree) pluga aqui depois.
  var form = document.getElementById('leadForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = form.querySelector('#nome');
      var contato = form.querySelector('#contatoInput');
      var ok = true;
      [nome, contato].forEach(function (el) {
        var bad = !el.value.trim();
        el.classList.toggle('invalid', bad);
        if (bad) ok = false;
      });
      if (!ok) return;
      var btn = document.getElementById('formSubmit');
      btn.textContent = 'Enviando…';
      btn.disabled = true;
      // TODO: enviar de verdade. Por ora confirma o recebimento visual.
      setTimeout(function () {
        form.innerHTML = '<p class="form-ok">Recebido.</p><p style="text-align:center;color:var(--on-cream-dim);font-size:.92rem">A gente entra em contato pra marcar a conversa.</p>';
      }, 700);
    });
  }

  measure();
  // recalcula depois que as fontes assentam (evita beat ativo errado)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); requestScroll(); });
  window.addEventListener('load', function () { measure(); requestScroll(); });
  onScroll();
})();
