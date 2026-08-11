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
    }

    var theme = beats[active] ? beats[active].getAttribute('data-theme') : 'dark';
    body.classList.toggle('is-light', theme === 'light');
    scrollHint.classList.toggle('is-hidden', y > vh * 0.35);

    state.globalP = globalP;
    state.beat = active + 1;
    state.beatP = activeP;
    state.theme = theme;
    if (window.VessarStage) window.VessarStage.update(state);

    // rótulos das 6 dimensões acompanham os vértices do hexágono (beat 6)
    if (hexLabels) {
      if (state.beat === 6 && window.VessarStage && window.VessarStage.hexVertices) {
        hexLabels.classList.add('show');
        var vs = window.VessarStage.hexVertices();
        var hcx = window.innerWidth / 2, hcy = vh * 0.63;
        for (var li = 0; li < hexlabs.length; li++) {
          var vtx = vs[li]; if (!vtx) continue;
          var dx = vtx.x - hcx, dy = vtx.y - hcy, len = Math.sqrt(dx * dx + dy * dy) || 1;
          hexlabs[li].style.left = (vtx.x + dx / len * 30) + 'px';
          hexlabs[li].style.top = (vtx.y + dy / len * 24) + 'px';
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
