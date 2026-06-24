/**
 * Hexius — Landing page interactions (/test/, /fr/test/)
 * Standalone: does NOT load main.js / the SPA hash router.
 * Handles: smooth in-page anchor scroll (navbar-offset), scroll-spy nav,
 * scroll-fade reveal, stat count-up, mobile nav toggle.
 */
(function () {
  'use strict';

  document.documentElement.classList.add('js-enabled');

  function navOffset() {
    var nav = document.getElementById('landing-nav');
    return nav ? nav.offsetHeight : 64;
  }

  /* --- Smooth in-page anchor scrolling (one scroll per nav, navbar offset) --- */
  function scrollToId(id) {
    var el = document.getElementById(id);
    if (!el) return false;
    var top = el.getBoundingClientRect().top + window.scrollY - navOffset();
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    return true;
  }

  function initAnchorScroll() {
    document.querySelectorAll('[data-landing-anchor]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var href = link.getAttribute('href') || '';
        var hashIndex = href.indexOf('#');
        if (hashIndex === -1) return;
        var id = href.slice(hashIndex + 1);
        if (!id) return;
        if (document.getElementById(id)) {
          e.preventDefault();
          if (window.umami) window.umami.track('landing-nav', { target: id });
          scrollToId(id);
          history.replaceState(null, '', '#' + id);
          closeMobileNav();
        }
      });
    });
  }

  /* --- Scroll-spy: highlight the nav link of the section in view --- */
  function initScrollSpy() {
    var spyLinks = Array.prototype.slice.call(document.querySelectorAll('.landing-nav__link[data-spy]'));
    if (!spyLinks.length || !window.IntersectionObserver) return;

    var sections = spyLinks
      .map(function (l) { return document.getElementById(l.getAttribute('data-spy')); })
      .filter(Boolean);

    function setActive(id) {
      spyLinks.forEach(function (l) {
        l.classList.toggle('active', l.getAttribute('data-spy') === id);
      });
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, {
      rootMargin: '-45% 0px -50% 0px',
      threshold: 0
    });

    sections.forEach(function (s) { observer.observe(s); });
  }

  /* --- Scroll-fade reveal (ports main.js initScrollFade) --- */
  function initScrollFade() {
    if (!window.IntersectionObserver) {
      document.querySelectorAll('.scroll-fade').forEach(function (el) { el.classList.add('visible'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.scroll-fade').forEach(function (el) { observer.observe(el); });
  }

  /* --- Stat count-up (ports main.js initStatCountUp) --- */
  function initStatCountUp() {
    var panel = document.querySelector('[data-stats]');
    if (!panel || !window.IntersectionObserver) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        panel.querySelectorAll('.stat-number[data-count]').forEach(function (el) {
          var target = parseInt(el.dataset.count, 10);
          var unit = el.querySelector('.stat-unit');
          var unitHTML = unit ? unit.outerHTML : '';
          var duration = 1400;
          var start = performance.now();

          function tick(now) {
            var progress = Math.min((now - start) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            el.innerHTML = Math.round(eased * target) + unitHTML;
            if (progress < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        });
      });
    }, { threshold: 0.4 });

    observer.observe(panel);
  }

  /* --- Mobile nav toggle --- */
  function closeMobileNav() {
    var toggle = document.getElementById('landing-nav-toggle');
    var links = document.getElementById('landing-nav-links');
    if (toggle && links && toggle.getAttribute('aria-expanded') === 'true') {
      toggle.setAttribute('aria-expanded', 'false');
      links.classList.remove('open');
    }
  }

  function initMobileNav() {
    var toggle = document.getElementById('landing-nav-toggle');
    var links = document.getElementById('landing-nav-links');
    if (!toggle || !links) return;
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      links.classList.toggle('open', !open);
    });
  }

  /* --- Randomize typewriter text from a variants list (per page load) --- */
  function initHeroVariants() {
    document.querySelectorAll('[data-typewriter-variants]').forEach(function (el) {
      var raw = el.getAttribute('data-typewriter-variants');
      if (!raw) return;
      try {
        var list = JSON.parse(raw);
        if (Array.isArray(list) && list.length) {
          var pick = list[Math.floor(Math.random() * list.length)];
          el.setAttribute('data-typewriter', pick);
          el.textContent = '';
        }
      } catch (e) { /* keep the default data-typewriter */ }
    });
  }

  function init() {
    initHeroVariants();
    initAnchorScroll();
    initScrollSpy();
    initScrollFade();
    initStatCountUp();
    initMobileNav();

    // Honor a deep-link hash on load, offsetting for the sticky nav.
    if (window.location.hash) {
      var id = window.location.hash.slice(1);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { scrollToId(id); });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
