/**
 * Hexius — Event page (/bonjour/)
 * Forwards utm_* params from the page URL (QR code) to each Calendly inline
 * widget, then loads Calendly's widget.js which initialises them.
 */
(function () {
  'use strict';

  var CALENDLY_WIDGET_SRC = 'https://assets.calendly.com/assets/external/widget.js';

  function utmParams() {
    var params = new URLSearchParams(window.location.search);
    var utm = [];
    params.forEach(function (value, key) {
      if (key.indexOf('utm_') === 0) utm.push([key, value]);
    });
    return utm;
  }

  function initCalendly() {
    var widgets = document.querySelectorAll('.calendly-inline-widget[data-url]');
    if (!widgets.length) return;

    var utm = utmParams();
    widgets.forEach(function (el) {
      if (!utm.length) return;
      var url = new URL(el.getAttribute('data-url'));
      utm.forEach(function (pair) { url.searchParams.set(pair[0], pair[1]); });
      el.setAttribute('data-url', url.toString());
    });

    var script = document.createElement('script');
    script.src = CALENDLY_WIDGET_SRC;
    script.async = true;
    document.body.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCalendly);
  } else {
    initCalendly();
  }
})();
