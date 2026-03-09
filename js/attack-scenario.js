(function () {
  'use strict';

  var CONTAINER_SEL = '.attack-scenario';
  var HASH          = '#social-engineering';
  var CHAR_DELAY    = 28;   // ms per character
  var LINE_PAUSE    = 300;  // pause between lines within a panel
  var PANEL_PAUSE   = 600;  // pause before next panel appears

  // Selectors for text elements to type, per panel index (in DOM order)
  var TEXT_SELECTORS = [
    '.phone-panel .call-transcript p',   // call-line p + call-annotation p, in DOM order
    '.sms-panel .sms-bubble p',
    '.page-panel .page-url-bar, .page-panel .page-form p, .page-panel .page-form .page-submit-btn'
  ];

  var container, panels, observer, running, originals, initialized;

  // ── Init: find DOM nodes, store original HTML once ──────────────────────────

  function init() {
    container = document.querySelector(CONTAINER_SEL);
    if (!container) return false;
    panels = Array.prototype.slice.call(container.querySelectorAll('.attack-panel'));

    if (!initialized) {
      originals = TEXT_SELECTORS.map(function (sel) {
        return Array.prototype.slice.call(container.querySelectorAll(sel)).map(function (el) {
          return { el: el, html: el.innerHTML };
        });
      });
      initialized = true;
    }
    return true;
  }

  // ── Typewriter: types the given html string into el char-by-char ─────────────
  // html is passed explicitly because el.innerHTML is cleared before calling this

  function typeHTML(el, html, done) {
    var full = html;
    el.innerHTML = '';
    var i = 0;

    function step() {
      if (!running) { el.innerHTML = full; return; }
      if (i >= full.length) { el.innerHTML = full; done(); return; }

      var ch = full[i];

      // HTML entity (e.g. &amp;) — emit atomically
      if (ch === '&') {
        var end = full.indexOf(';', i);
        if (end !== -1) { i = end + 1; el.innerHTML = full.substring(0, i); setTimeout(step, 0); return; }
      }

      // HTML tag — emit atomically, no delay
      if (ch === '<') {
        var end = full.indexOf('>', i);
        if (end !== -1) { i = end + 1; el.innerHTML = full.substring(0, i); setTimeout(step, 0); return; }
      }

      i++;
      el.innerHTML = full.substring(0, i);
      setTimeout(step, CHAR_DELAY);
    }

    step();
  }

  // ── Type a list of elements sequentially ────────────────────────────────────

  function typeSequential(elements, onDone) {
    if (!elements.length) { onDone(); return; }
    var i = 0;
    function next() {
      if (!running || i >= elements.length) { onDone(); return; }
      typeHTML(elements[i].el, elements[i].html, function () {
        i++;
        setTimeout(next, LINE_PAUSE);
      });
    }
    next();
  }

  // ── Reveal panels one after another ─────────────────────────────────────────

  function revealPanelsSequentially() {
    running = true;
    var i = 0;

    function nextPanel() {
      if (!running || i >= panels.length) return;
      var panel   = panels[i];
      var textEls = originals[i] || [];

      // Clear text content so typing starts from empty
      textEls.forEach(function (item) { item.el.innerHTML = ''; });

      // Slide panel in
      panel.classList.add('visible');

      // Wait for CSS transition then start typing
      setTimeout(function () {
        if (!running) return;
        typeSequential(textEls, function () {
          i++;
          setTimeout(nextPanel, PANEL_PAUSE);
        });
      }, 650);
    }

    nextPanel();
  }

  // ── Reset: hide panels, restore original HTML ────────────────────────────────

  function reset() {
    running = false;
    if (!panels) return;
    panels.forEach(function (panel) { panel.classList.remove('visible'); });
    if (originals) {
      originals.forEach(function (group) {
        group.forEach(function (item) { item.el.innerHTML = item.html; });
      });
    }
  }

  // ── Observer lifecycle ───────────────────────────────────────────────────────

  function startObserving() {
    if (!container) { if (!init()) return; }
    reset();
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          observer.disconnect();
          observer = null;
          revealPanelsSequentially();
        }
      });
    }, { threshold: 0.1 });
    observer.observe(container);
  }

  function stopObserving() {
    if (observer) { observer.disconnect(); observer = null; }
    reset();
  }

  // ── Hash routing ─────────────────────────────────────────────────────────────

  window.addEventListener('hexius:section', function (e) {
    if (e.detail && e.detail.id === 'social-engineering') startObserving();
    else stopObserving();
  });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && window.location.hash === HASH) startObserving();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (window.location.hash === HASH) startObserving();
    });
  } else {
    if (window.location.hash === HASH) startObserving();
  }
})();
