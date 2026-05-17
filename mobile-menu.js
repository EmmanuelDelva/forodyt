/**
 * Forodyt — Mobile editorial menu
 *
 * Lee los .nav-links existentes en la pagina e inyecta:
 *   - boton .mm-trigger ("MENU") en el .nav-cta
 *   - overlay .mm-overlay con copia de los links + numerales romanos + lang switcher
 *
 * Se sincroniza con window.foroI18n (definido en i18n.js).
 * Cerrar: boton CERRAR, click en link, tecla ESC.
 */

(function () {
  'use strict';

  var ROMANS = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];

  function init() {
    var navLinks = document.querySelector('.nav .nav-links');
    if (!navLinks) return;

    var links = Array.prototype.slice.call(navLinks.querySelectorAll('li a'));
    if (!links.length) return;

    var navCta  = document.querySelector('.nav .nav-cta');
    var navInner = document.querySelector('.nav .nav-inner') || document.querySelector('.nav');
    if (!navCta && !navInner) return;

    var backLink = document.querySelector('.nav .nav-back');

    // ===== trigger =====
    var trigger = document.createElement('button');
    trigger.className = 'mm-trigger';
    trigger.type = 'button';
    trigger.setAttribute('aria-label', 'Abrir menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.textContent = 'MENÚ';
    (navCta || navInner).appendChild(trigger);

    // ===== overlay =====
    var overlay = document.createElement('div');
    overlay.className = 'mm-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('aria-label', 'Menu principal');

    var html = ''
      + '<div class="mm-header">'
      +   '<div class="mm-brand">IV Foro <em>· 2026</em></div>'
      +   '<button class="mm-close" type="button" aria-label="Cerrar menu">CERRAR</button>'
      + '</div>'
      + '<ul class="mm-links" role="list">';

    links.forEach(function (link, i) {
      var href = link.getAttribute('href') || '#';
      var text = link.textContent.trim();
      var num  = ROMANS[i] || (i + 1);
      // No usamos data-i18n aqui: el restore-to-ES de i18n.js depende del
      // ORIGINAL map capturado al cargar la pagina, y nuestros elementos
      // se inyectan despues. Mejor: source of truth = el desktop nav-link,
      // que SI esta en ORIGINAL. Sincronizamos en cada cambio de idioma.
      html += '<li>'
           +   '<a href="' + escapeHtml(href) + '">'
           +     '<span class="mm-num">' + num + '</span>'
           +     '<span class="mm-label">' + escapeHtml(text) + '</span>'
           +   '</a>'
           + '</li>';
    });

    html += '</ul>'
         + '<div class="mm-footer">'
         +   '<div class="mm-lang" data-mm-lang>'
         +     '<span data-lang="es">ES</span>·<span data-lang="en">EN</span>·<span data-lang="fr">FR</span>'
         +   '</div>';

    if (backLink) {
      var backText = backLink.textContent.trim() || 'Volver al sitio';
      var backHref = backLink.getAttribute('href') || 'index.html';
      // Mismo motivo que arriba: no data-i18n directo. Sincronizamos despues.
      html += '<a class="mm-volver" href="' + escapeHtml(backHref) + '">'
           +    '<span class="mm-volver-label">' + escapeHtml(backText) + '</span>'
           +  '</a>';
    }

    html += '</div>';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    // ===== state =====
    var isOpen = false;
    function open() {
      if (isOpen) return;
      isOpen = true;
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      trigger.setAttribute('aria-expanded', 'true');
      document.body.classList.add('mm-locked');
      syncLangActive();
    }
    function close() {
      if (!isOpen) return;
      isOpen = false;
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      trigger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('mm-locked');
    }
    function syncLangActive() {
      var lang = (window.foroI18n && typeof window.foroI18n.getLang === 'function')
        ? window.foroI18n.getLang() : 'es';
      overlay.querySelectorAll('[data-mm-lang] [data-lang]').forEach(function (s) {
        s.classList.toggle('active', s.getAttribute('data-lang') === lang);
      });
    }
    // Mirror text of desktop nav-links into mm-labels. i18n.js solo conoce
    // los elementos que existian al cargar, asi que dejamos que i18n.js
    // traduzca el desktop nav y copiamos su resultado al overlay.
    function syncMmLabels() {
      var navAnchors = document.querySelectorAll('.nav .nav-links li a');
      var labels     = overlay.querySelectorAll('.mm-links .mm-label');
      navAnchors.forEach(function (a, i) {
        if (labels[i]) labels[i].textContent = a.textContent.trim();
      });
      if (backLink) {
        var volverLabel = overlay.querySelector('.mm-volver-label');
        if (volverLabel) volverLabel.textContent = backLink.textContent.trim();
      }
    }

    // ===== events =====
    trigger.addEventListener('click', open);
    overlay.querySelector('.mm-close').addEventListener('click', close);

    overlay.querySelectorAll('.mm-links a, .mm-volver').forEach(function (a) {
      a.addEventListener('click', function () {
        // pequeño delay para que la navegacion arranque antes de cerrar
        setTimeout(close, 120);
      });
    });

    overlay.querySelectorAll('[data-mm-lang] [data-lang]').forEach(function (s) {
      s.addEventListener('click', function () {
        var lang = s.getAttribute('data-lang');
        if (window.foroI18n && typeof window.foroI18n.setLang === 'function') {
          window.foroI18n.setLang(lang);
          syncLangActive();
          syncMmLabels();
        }
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) close();
    });

    // re-sincroniza si el idioma cambia desde el switcher de desktop
    var desktopLang = document.querySelector('.nav .lang');
    if (desktopLang) {
      desktopLang.addEventListener('click', function () {
        setTimeout(function () {
          syncLangActive();
          syncMmLabels();
        }, 0);
      });
    }

    // Sincronizacion inicial: si i18n.js ya aplico EN/FR antes de inyectar,
    // los mm-labels reflejan el texto actual del desktop nav (que ya esta traducido).
    syncMmLabels();
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
