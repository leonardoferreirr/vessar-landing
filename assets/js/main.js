/* VESSAR — motor do filme de scroll: ativa beats, inverte o tema no clímax,
   dirige a barra de progresso e o palco (canvas), controla som e formulário. */
(function () {
  'use strict';

  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  var beats = Array.prototype.slice.call(document.querySelectorAll('.beat'));
  var body = document.body;
  var progressBar = document.getElementById('progressBar');
  var scrollHint = document.getElementById('scrollHint');
  var soundBtn = document.getElementById('soundBtn');

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

    ticking = false;
  }

  function requestScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }

  window.addEventListener('scroll', requestScroll, { passive: true });
  window.addEventListener('resize', function () { measure(); requestScroll(); });

  // som ambiente: toggle. A trilha real entra quando o arquivo for definido.
  var ambient = null;
  soundBtn.addEventListener('click', function () {
    var on = soundBtn.classList.toggle('is-on');
    soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    soundBtn.setAttribute('aria-label', on ? 'Desligar som ambiente' : 'Ligar som ambiente');
    // Quando houver trilha: assets/audio/ambient.mp3 (loop, volume baixo).
    if (ambient) { if (on) ambient.play().catch(function () {}); else ambient.pause(); }
  });

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
