/**
 * Forodyt — Mobile editorial menu
 *
 * Lee los .nav-links existentes en la pagina e inyecta:
 *   - boton .mm-trigger ("MENU") en el .nav-cta
 *   - overlay .mm-overlay con copia de los links + lang switcher
 *
 * Se sincroniza con window.foroI18n (definido en i18n.js).
 * Cerrar: boton CERRAR, click en link, tecla ESC.
 */

(function () {
  'use strict';

  // Sin numeración en los enlaces: los numerales romanos del sitio son de las
  // ediciones (I–V) y un «IV Trayectoria» se leería como la IV edición.

  function init() {
    var navLinks = document.querySelector('.nav .nav-links');
    if (!navLinks) return;

    var links = Array.prototype.slice.call(navLinks.querySelectorAll('li a'));
    if (!links.length) return;

    var navCta  = document.querySelector('.nav .nav-cta');
    var navInner = document.querySelector('.nav .nav-inner') || document.querySelector('.nav');
    if (!navCta && !navInner) return;

    var backLink = document.querySelector('.nav .nav-back');

    // Marca del overlay: la de la propia pagina (V Foro · 2027 en la V,
    // IV Foro · 2026 en el archivo de la IV). El año sale de .brand-sub.
    var markEl = document.querySelector('.nav .brand-mark');
    var subEl  = document.querySelector('.nav .brand-sub');
    var brandMark = (markEl && markEl.textContent.trim()) || 'V Foro';
    var brandYear = ((subEl && subEl.textContent) || '').match(/\b(19|20)\d{2}\b/);
    brandYear = brandYear ? brandYear[0] : ((brandMark.match(/\b(19|20)\d{2}\b/) || [])[0] || '');
    if (brandYear) brandMark = brandMark.replace(brandYear, '').replace(/[\s·]+$/, '');
    if (!brandYear && /^V\b/.test(brandMark)) brandYear = '2027';

    // ===== trigger =====
    var trigger = document.createElement('button');
    trigger.className = 'mm-trigger';
    trigger.type = 'button';
    trigger.setAttribute('aria-expanded', 'false');
    (navCta || navInner).appendChild(trigger);

    // ===== overlay =====
    var overlay = document.createElement('div');
    overlay.className = 'mm-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-hidden', 'true');

    var html = ''
      + '<div class="mm-header">'
      +   '<div class="mm-brand">' + escapeHtml(brandMark) + (brandYear ? ' <em>· ' + escapeHtml(brandYear) + '</em>' : '') + '</div>'
      +   '<button class="mm-close" type="button"></button>'
      + '</div>'
      + '<ul class="mm-links" role="list">';

    var paginaActual = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    links.forEach(function (link, i) {
      var href = link.getAttribute('href') || '#';
      var text = link.textContent.trim();
      var destino = href.split('#')[0].split('?')[0].toLowerCase();
      var actual = destino && destino === paginaActual && href.indexOf('#') === -1;
      // No usamos data-i18n aqui: el restore-to-ES de i18n.js depende del
      // ORIGINAL map capturado al cargar la pagina, y nuestros elementos
      // se inyectan despues. Mejor: source of truth = el desktop nav-link,
      // que SI esta en ORIGINAL. Sincronizamos en cada cambio de idioma.
      html += '<li>'
           +   '<a href="' + escapeHtml(href) + '"' + (actual ? ' aria-current="page"' : '') + '>'
           +     '<span class="mm-label">' + escapeHtml(text) + '</span>'
           +   '</a>'
           + '</li>';
    });

    html += '</ul>';

    // CTA del encabezado (Avísame en la V, «V edición →» en el archivo de la IV):
    // se repite dentro del menú porque en pantallas angostas el encabezado lo oculta.
    var ctaNav = navCta ? navCta.querySelector('.btn-primary') : null;
    if (ctaNav) {
      html += '<a class="mm-cta" href="' + escapeHtml(ctaNav.getAttribute('href') || 'index.html') + '">'
           +    '<span class="mm-cta-label">' + escapeHtml(ctaNav.textContent.replace(/\s+/g, ' ').trim()) + '</span>'
           +  '</a>';
    }

    html += '<div class="mm-footer">'
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

    // Paleta: las páginas de la V definen --cobre en :root; el archivo de la IV no.
    try {
      if (getComputedStyle(document.documentElement).getPropertyValue('--cobre').trim()) {
        overlay.classList.add('mm-v'); trigger.classList.add('mm-v');
      }
    } catch (e) {}

    // ===== state =====
    // Dialogo modal: al abrir, el foco entra al overlay (boton CERRAR) y el
    // tabulador circula solo dentro de el; al cerrar vuelve al boton MENU.
    var isOpen = false;
    function focusables() {
      return Array.prototype.filter.call(
        overlay.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
        function (el) { return el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement; }
      );
    }
    function open() {
      if (isOpen) return;
      isOpen = true;
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      trigger.setAttribute('aria-expanded', 'true');
      document.body.classList.add('mm-locked');
      syncLangActive();
      var cb = overlay.querySelector('.mm-close');
      if (cb) { try { cb.focus({ preventScroll: true }); } catch (e) { cb.focus(); } }
    }
    function close(devolverFoco) {
      if (!isOpen) return;
      isOpen = false;
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      trigger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('mm-locked');
      if (devolverFoco) { try { trigger.focus({ preventScroll: true }); } catch (e) { trigger.focus(); } }
    }
    overlay.addEventListener('keydown', function (e) {
      if (!isOpen || e.key !== 'Tab') return;
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1], act = document.activeElement;
      if (e.shiftKey && (act === first || !overlay.contains(act))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (act === last || !overlay.contains(act))) { e.preventDefault(); first.focus(); }
    });
    // Si el foco se escapa (clic fuera, lector de pantalla), se devuelve al overlay.
    document.addEventListener('focusin', function (e) {
      if (isOpen && !overlay.contains(e.target)) {
        var f = focusables();
        if (f.length) f[0].focus();
      }
    });
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
      if (ctaNav) {
        var ctaLabel = overlay.querySelector('.mm-cta-label');
        if (ctaLabel) ctaLabel.textContent = ctaNav.textContent.replace(/\s+/g, ' ').trim();
      }
      if (backLink) {
        var volverLabel = overlay.querySelector('.mm-volver-label');
        if (volverLabel) volverLabel.textContent = backLink.textContent.trim();
      }
      syncChrome();
    }
    // Rotulos propios del menu (MENÚ / CERRAR y sus aria-label) en el idioma activo.
    var CHROME = {
      es: { menu: 'MENÚ', abrir: 'Abrir menú', cerrar: 'CERRAR', cerrarAria: 'Cerrar menú', dialogo: 'Menú principal' },
      en: { menu: 'MENU', abrir: 'Open menu', cerrar: 'CLOSE', cerrarAria: 'Close menu', dialogo: 'Main menu' },
      fr: { menu: 'MENU', abrir: 'Ouvrir le menu', cerrar: 'FERMER', cerrarAria: 'Fermer le menu', dialogo: 'Menu principal' }
    };
    function langActual() {
      var l = (document.documentElement.getAttribute('lang') || 'es').slice(0, 2).toLowerCase();
      return CHROME[l] ? l : 'es';
    }
    function syncChrome() {
      var c = CHROME[langActual()];
      trigger.textContent = c.menu;
      trigger.setAttribute('aria-label', c.abrir);
      var cb = overlay.querySelector('.mm-close');
      if (cb) { cb.textContent = c.cerrar; cb.setAttribute('aria-label', c.cerrarAria); }
      overlay.setAttribute('aria-label', c.dialogo);
    }

    // ===== events =====
    trigger.addEventListener('click', open);
    overlay.querySelector('.mm-close').addEventListener('click', function () { close(true); });

    overlay.querySelectorAll('.mm-links a, .mm-volver, .mm-cta').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var href = a.getAttribute('href') || '';
        var hashIdx = href.indexOf('#');
        // Anchor a la pagina actual: cerrar overlay PRIMERO (quita mm-locked /
        // overflow:hidden) y luego hacer scroll manual. Si no, el scroll nativo
        // ocurre con el body bloqueado y el anchor "no funciona".
        if (hashIdx !== -1) {
          var beforeHash = href.substring(0, hashIdx);
          var currentPage = location.pathname.split('/').pop();
          var isSamePage = beforeHash === '' || beforeHash === currentPage || beforeHash === './' + currentPage;
          if (isSamePage) {
            var target = document.getElementById(href.substring(hashIdx + 1));
            e.preventDefault();
            close();
            if (target) {
              requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
              });
            }
            return;
          }
        }
        // Link a otra pagina: cerrar con un leve delay y dejar que navegue.
        setTimeout(close, 120);
      });
    });

    overlay.querySelectorAll('[data-mm-lang] [data-lang]').forEach(function (s) {
      var mmLabels = { es: 'Espanol', en: 'English', fr: 'Francais' };
      var mmLang = s.getAttribute('data-lang');
      // Accesibilidad: mismos atributos que el switcher del header (i18n.js).
      s.setAttribute('role', 'button');
      s.setAttribute('tabindex', '0');
      s.setAttribute('aria-label', mmLabels[mmLang] || mmLang);
      function activarIdioma() {
        if (window.foroI18n && typeof window.foroI18n.setLang === 'function') {
          window.foroI18n.setLang(mmLang);
          syncLangActive();
          syncMmLabels();
        }
      }
      s.addEventListener('click', activarIdioma);
      s.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
          ev.preventDefault();
          activarIdioma();
        }
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) close(true);
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

    // Cualquier cambio de idioma (switcher del header, del overlay o de la
    // pagina) termina en <html lang>: lo observamos para no perder ninguno.
    if ('MutationObserver' in window) {
      new MutationObserver(function () {
        setTimeout(function () { syncLangActive(); syncMmLabels(); }, 0);
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
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
