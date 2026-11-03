/*
 * Navegação por controle remoto para qualquer site (injetado pelo TizenBrew, modo B).
 * Setas: movem um foco visível entre links, botões, campos e vídeos (o mais próximo na direção).
 * OK: clica (ou abre o teclado num campo). Voltar: sai da tela cheia ou volta a página.
 * Play/Pause, avançar e voltar: controlam o vídeo da página.
 * Pop-ups e abas novas: os do mesmo site abrem na mesma tela, os de outros sites são bloqueados.
 */
(function () {
  if (window.__tvNav) return;
  window.__tvNav = true;

  var K = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, OK: 13, BACK: 10009, PLAY: 415, PAUSE: 19,
            PLAYPAUSE: 10252, FF: 417, RW: 412, STOP: 413 };
  var SELECTOR = 'a[href], button, input:not([type=hidden]), select, textarea, video, summary, ' +
                 '[tabindex]:not([tabindex="-1"]), [role=button], [role=link], [role=tab], [role=menuitem], ' +
                 '[role=option], [onclick], [contenteditable=true]';
  var current = null;

  var style = document.createElement('style');
  style.textContent = '.tvnav-foco { outline: 5px solid #ffc400 !important; outline-offset: 3px !important; ' +
    'box-shadow: 0 0 0 10px rgba(0, 0, 0, .6) !important; border-radius: 6px; }' +
    '#tvnav-aviso { position: fixed; left: 50%; bottom: 60px; z-index: 2147483647; padding: 14px 28px; ' +
    'border-radius: 30px; background: rgba(20, 20, 24, .92); color: #fff; font: 600 26px sans-serif; ' +
    '-webkit-transform: translateX(-50%); transform: translateX(-50%); pointer-events: none; }';
  (document.head || document.documentElement).appendChild(style);

  // MARK: Bloqueio de pop-ups. Na TV não há abas: uma aba nova (quase sempre propaganda) trava o app.

  var avisoTimer = 0;
  function aviso(texto) {
    var a = document.getElementById('tvnav-aviso');
    if (!a) { a = document.createElement('div'); a.id = 'tvnav-aviso'; (document.body || document.documentElement).appendChild(a); }
    a.textContent = texto;
    a.style.display = 'block';
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(function () { a.style.display = 'none'; }, 1800);
  }

  /** Mesmo site (ou subdomínio dele): abre na mesma tela. Outro site: é bloqueado. */
  function mesmoSite(url) {
    try {
      var h = new URL(url, location.href).hostname.replace(/^www\./, '');
      var aqui = location.hostname.replace(/^www\./, '');
      return h === aqui || h.slice(-(aqui.length + 1)) === '.' + aqui || aqui.slice(-(h.length + 1)) === '.' + h;
    } catch (e) { return false; }
  }

  function abrir(url) {
    if (url && mesmoSite(url)) { location.href = new URL(url, location.href).href; return true; }
    aviso('Pop-up bloqueado');
    return false;
  }

  // Um objeto que finge ser a janela aberta, para o site não quebrar quando chama .close() ou .focus() nela.
  var falsa = { closed: true, close: function () {}, focus: function () {}, blur: function () {}, postMessage: function () {},
                document: { write: function () {}, close: function () {} }, location: { href: '' } };
  try {
    Object.defineProperty(window, 'open', { configurable: false, writable: false,
      value: function (url) { abrir(url && String(url)); return falsa; } });
  } catch (e) {
    window.open = function (url) { abrir(url && String(url)); return falsa; };
  }

  // Links e formulários com target="_blank" (ou outra janela): mesma regra.
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var alvo = (a.getAttribute('target') || '').toLowerCase();
    if (!alvo || alvo === '_self' || alvo === '_top' || alvo === '_parent') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    abrir(a.href);
  }, true);
  document.addEventListener('submit', function (e) {
    var f = e.target, alvo = (f.getAttribute && f.getAttribute('target') || '').toLowerCase();
    if (alvo && alvo !== '_self' && alvo !== '_top' && alvo !== '_parent') f.setAttribute('target', '_self');
  }, true);

  function visible(el) {
    var r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    var s = window.getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0' && !el.disabled;
  }

  function candidates() {
    var all = document.querySelectorAll(SELECTOR), out = [];
    for (var i = 0; i < all.length; i++) {
      // Um link dentro de outro focável conta uma vez só (o de fora).
      if (visible(all[i]) && !(all[i].parentElement && all[i].parentElement.closest(SELECTOR))) out.push(all[i]);
    }
    return out;
  }

  function center(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

  function setFocus(el) {
    if (current) current.classList.remove('tvnav-foco');
    current = el;
    if (!el) return;
    el.classList.add('tvnav-foco');
    try { el.focus({ preventScroll: true }); } catch (e) {}
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  }

  /** O focável mais próximo na direção: distância na direção + 3x o desvio para o lado. */
  function next(dir) {
    var list = candidates();
    if (!current || !document.contains(current) || !visible(current)) {
      var top = list.filter(function (el) { var r = el.getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight; });
      return top[0] || list[0] || null;
    }
    var from = current.getBoundingClientRect(), c = center(from), best = null, bestScore = Infinity;
    list.forEach(function (el) {
      if (el === current) return;
      var r = el.getBoundingClientRect(), p = center(r), main, side;
      if (dir === K.RIGHT) { if (r.left < from.right - 4) return; main = r.left - from.right; side = Math.abs(p.y - c.y); }
      else if (dir === K.LEFT) { if (r.right > from.left + 4) return; main = from.left - r.right; side = Math.abs(p.y - c.y); }
      else if (dir === K.DOWN) { if (r.top < from.bottom - 4) return; main = r.top - from.bottom; side = Math.abs(p.x - c.x); }
      else { if (r.bottom > from.top + 4) return; main = from.top - r.bottom; side = Math.abs(p.x - c.x); }
      var score = main + side * 3;
      if (score < bestScore) { bestScore = score; best = el; }
    });
    return best;
  }

  function typing() {
    var a = document.activeElement;
    return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable) && a === current && a.__tvEditando;
  }

  function video() {
    var v = document.querySelectorAll('video');
    for (var i = 0; i < v.length; i++) if (v[i].currentSrc || v[i].src) return v[i];
    return null;
  }

  document.addEventListener('keydown', function (e) {
    var k = e.keyCode, v = video();
    if (typing()) {
      if (k === K.BACK || k === K.UP || k === K.DOWN) { current.__tvEditando = false; current.blur(); }
      else return;   // as setas ← → e as letras ficam com o campo
      if (k === K.BACK) { e.preventDefault(); e.stopPropagation(); return; }
    }
    if (k === K.PLAYPAUSE || k === K.PLAY || k === K.PAUSE) {
      if (v) { if (k === K.PAUSE || (k === K.PLAYPAUSE && !v.paused)) v.pause(); else v.play(); }
    } else if (k === K.FF || k === K.RW) {
      if (v) v.currentTime = Math.max(0, v.currentTime + (k === K.FF ? 30 : -10));
    } else if (k === K.STOP) {
      if (v) v.pause();
    } else if (k === K.LEFT || k === K.RIGHT || k === K.UP || k === K.DOWN) {
      var el = next(k);
      if (el) setFocus(el);
      else window.scrollBy({ top: k === K.DOWN ? innerHeight * 0.4 : k === K.UP ? -innerHeight * 0.4 : 0,
                             left: k === K.RIGHT ? innerWidth * 0.4 : k === K.LEFT ? -innerWidth * 0.4 : 0, behavior: 'smooth' });
    } else if (k === K.OK) {
      if (!current) { setFocus(next(K.DOWN)); }
      else if (current.tagName === 'INPUT' || current.tagName === 'TEXTAREA' || current.isContentEditable) {
        current.__tvEditando = true;
        current.focus();
        return;   // a TV abre o teclado na tela
      } else if (current.tagName === 'VIDEO') {
        if (current.paused) current.play(); else current.pause();
      } else {
        current.click();
      }
    } else if (k === K.BACK) {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else if (history.length > 1) {
        history.back();
      } else {
        try { tizen.application.getCurrentApplication().exit(); } catch (err) {}
      }
    } else {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
  }, true);

  // Primeiro foco quando a página termina de carregar.
  function start() { if (!current) setFocus(next(K.DOWN)); }
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
})();
