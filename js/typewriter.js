/**
 * Hexius — Typewriter Terminal Effect
 * Targets elements with [data-typewriter] attribute.
 * Text is typed character-by-character when element enters viewport.
 * Usage: <span data-typewriter="$ nmap -sV target.hexius.com --open" data-typewriter-speed="40"></span>
 */
(function () {
  'use strict';

  var DEFAULT_SPEED = 38; // ms per character

  function typeWrite(el, text, speed, onDone) {
    el.textContent = '';
    el.classList.add('typewriter-cursor');

    var i = 0;
    var interval = setInterval(function () {
      if (i < text.length) {
        el.textContent += text[i];
        i++;
      } else {
        clearInterval(interval);
        if (typeof onDone === 'function') onDone();
      }
    }, speed);
  }

  function initTypewriters() {
    var elements = document.querySelectorAll('[data-typewriter]');
    if (!elements.length) return;

    // Only trigger once per element
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        var el = entry.target;
        if (el.dataset.typewriterDone) return;
        el.dataset.typewriterDone = 'true';

        var text  = el.getAttribute('data-typewriter');
        var speed = parseInt(el.getAttribute('data-typewriter-speed'), 10) || DEFAULT_SPEED;

        // Optional delay before typing starts
        var delay = parseInt(el.getAttribute('data-typewriter-delay'), 10) || 0;

        setTimeout(function () {
          typeWrite(el, text, speed);
        }, delay);

        observer.unobserve(el);
      });
    }, { threshold: 0.5 });

    elements.forEach(function (el) {
      observer.observe(el);
    });
  }

  // Init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTypewriters);
  } else {
    initTypewriters();
  }
})();
