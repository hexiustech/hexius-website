(function () {
  'use strict';
  var container = document.getElementById('breach-rehearsal');
  if (!container) return;

  var steps         = container.querySelectorAll('.br-step');
  var progressSteps = container.querySelectorAll('.br-progress-step');
  var plans         = JSON.parse(document.getElementById('br-plans-data').textContent);
  var riskScores    = JSON.parse(document.getElementById('br-risk-scores').textContent);
  var ctaLabels     = JSON.parse(document.getElementById('br-cta-labels').textContent);
  var emailGate     = JSON.parse(document.getElementById('br-email-gate').textContent);
  var briefLabels   = JSON.parse(document.getElementById('br-brief-labels').textContent);

  var GF_URL      = 'https://docs.google.com/forms/d/e/1FAIpQLScn-Sr6Ibc2z4MgFDctcvkW_aCvRVnmZnWBKCh7qB1_hY7ONA/formResponse';
  var GF_EMAIL    = 'entry.966433351';
  var GF_NAME     = 'entry.327635613';
  var GF_COMPANY  = 'entry.46439575';
  var GF_COMPANY2 = 'entry.1960370376';
  var GF_SERVICE  = 'entry.610128610';
  var GF_MESSAGE  = 'entry.835111868';
  var GF_TTX_VAL  = 'Tabletop Exercices / Exercises de table (TTX)';
  var GF_CONSENT  = 'entry.2115631709';

  var state = { sector: null, scenario: null, team: null };

  function showStep(n) {
    steps.forEach(function (s, i) { s.classList.toggle('active', i === n - 1); });
    progressSteps.forEach(function (s) {
      s.classList.toggle('active', parseInt(s.dataset.step, 10) <= n);
    });
  }

  function renderBriefCard(plan) {
    if (!plan) return '<p class="br-result-line">-</p>';
    var blastItems = (plan.blast_radius || []).map(function (item) {
      return '<li>' + item + '</li>';
    }).join('');
    return [
      '<div class="br-brief-card">',
      '  <p class="br-brief-header">&#9888; ' + briefLabels.header + '</p>',
      '  <dl class="br-brief-body">',
      '    <dt>' + briefLabels.threat + '</dt><dd>' + (plan.threat || '') + '</dd>',
      '    <dt>' + briefLabels.dwell_time + '</dt><dd>' + (plan.dwell_time || '') + '</dd>',
      '    <dt>' + briefLabels.blast_radius + '</dt><dd><ul>' + blastItems + '</ul></dd>',
      '    <dt>' + briefLabels.response + '</dt><dd>' + (plan.response || '') + '</dd>',
      '    <dt>' + briefLabels.deliverable + '</dt><dd>' + (plan.deliverable || '') + '</dd>',
      '  </dl>',
      '</div>'
    ].join('');
  }

  function submitBriefForm(email, message, consent, ctaEl) {
    var statusEl = container.querySelector('.br-form-status');
    if (statusEl) { statusEl.style.display = 'none'; statusEl.textContent = ''; }

    // Always recreate iframe for a clean submission (matches main.js approach)
    var existing = document.getElementById('br-forms-iframe');
    if (existing) existing.remove();

    var iframe = document.createElement('iframe');
    iframe.id = 'br-forms-iframe';
    iframe.name = 'br-forms-iframe';
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    var form = document.createElement('form');
    form.method = 'POST';
    form.action = GF_URL;
    form.target = 'br-forms-iframe';
    form.style.display = 'none';
    form.acceptCharset = 'UTF-8';
    form.enctype = 'application/x-www-form-urlencoded';
    form.noValidate = true;

    var fields = {};
    fields[GF_EMAIL]    = email;
    fields[GF_NAME]     = 'Breach Rehearsal';
    fields[GF_COMPANY]  = 'Breach Rehearsal';
    fields[GF_COMPANY2] = 'Breach Rehearsal';
    fields[GF_SERVICE]  = GF_TTX_VAL;
    fields[GF_MESSAGE]  = message;
    fields[GF_CONSENT]  = consent ? 'yes' : 'no';

    Object.keys(fields).forEach(function (name) {
      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = String(fields[name] || '');
      form.appendChild(input);
    });

    document.body.appendChild(form);

    var handled = false;
    var timeoutId;

    function onSuccess() {
      if (handled) return;
      handled = true;
      clearTimeout(timeoutId);
      if (form.parentNode) form.parentNode.removeChild(form);
      setTimeout(function () {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 2000);
      window.umami && window.umami.track('rehearsal-email', { consent: true });
      window.umami && window.umami.track('rehearsal-book');
      var gate = container.querySelector('.br-email-gate');
      if (gate) gate.style.display = 'none';
      if (ctaEl) {
        ctaEl.textContent = emailGate.sent_cta_text;
        ctaEl.disabled = true;
      }
    }

    function onError() {
      if (handled) return;
      handled = true;
      clearTimeout(timeoutId);
      if (form.parentNode) form.parentNode.removeChild(form);
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      if (statusEl) { statusEl.textContent = emailGate.form_error; statusEl.style.display = ''; }
      if (ctaEl) ctaEl.disabled = false;
    }

    iframe.onload = function () {
      if (handled) return;
      clearTimeout(timeoutId);
      // Give Google Forms 1s to process (matches main.js)
      setTimeout(onSuccess, 1000);
    };

    iframe.onerror = onError;

    // 5s timeout fallback — assume success (Google Forms may not reliably trigger onload)
    timeoutId = setTimeout(function () {
      onSuccess();
    }, 5000);

    try {
      form.submit();
    } catch (err) {
      onError();
    }
  }

  function resetEmailGate() {
    var gate       = container.querySelector('.br-email-gate');
    var emailInput = container.querySelector('.br-email-input');
    var consent    = container.querySelector('.br-consent-checkbox');
    var status     = container.querySelector('.br-form-status');
    var ctaEl      = container.querySelector('.br-cta');
    if (gate)       gate.style.display = '';
    if (emailInput) emailInput.value = '';
    if (consent)    consent.checked = false;
    if (status)     { status.style.display = 'none'; status.textContent = ''; }
    if (ctaEl)      { ctaEl.disabled = false; ctaEl.textContent = emailGate.sent_cta_text; }
  }

  container.addEventListener('click', function (e) {
    // Restart
    if (e.target.closest('.br-restart')) {
      state = { sector: null, scenario: null, team: null };
      var riskAlert = container.querySelector('.br-risk-alert');
      if (riskAlert) riskAlert.textContent = '';
      var ctaEl = container.querySelector('.br-cta');
      if (ctaEl) ctaEl.textContent = emailGate.sent_cta_text;
      resetEmailGate();
      showStep(1);
      return;
    }

    // CTA — validate, submit to Google Forms
    if (e.target.closest('.br-cta')) {
      var ctaEl   = e.target.closest('.br-cta');
      var email   = container.querySelector('.br-email-input').value.trim();
      var consentEl = container.querySelector('.br-consent-checkbox');
      var consent = consentEl ? consentEl.checked : false;
      if (!email) return;
      ctaEl.disabled = true;
      var message = 'Breach Rehearsal: Sector: ' + state.sector
                  + ', Scenario: ' + state.scenario
                  + ', Team: ' + state.team;
      submitBriefForm(email, message, consent, ctaEl);
      return;
    }

    // Option buttons
    var opt  = e.target.closest('.br-option');
    var step = opt && opt.closest('.br-step');
    if (!step) return;

    var stepNum = parseInt(step.dataset.step, 10);

    if (stepNum === 1) {
      state.sector = opt.dataset.value;
      window.umami && window.umami.track('rehearsal-sector', { value: state.sector });
      showStep(2);

    } else if (stepNum === 2) {
      state.scenario = opt.dataset.value;
      window.umami && window.umami.track('rehearsal-scenario', { value: state.scenario });
      // Populate risk alert in step 3
      var riskAlert = container.querySelector('.br-risk-alert');
      if (riskAlert) {
        var score = riskScores[state.scenario] || '';
        riskAlert.textContent = score ? '\u26a0 ' + score : '';
        riskAlert.classList.toggle('br-risk-alert--visible', !!score);
      }
      showStep(3);

    } else if (stepNum === 3) {
      state.team = opt.dataset.value;
      window.umami && window.umami.track('rehearsal-team', { value: state.team });
      var key = state.sector + '_' + state.scenario + '_' + state.team;
      var plan = plans[key];
      var resultEl = container.querySelector('.br-result');
      if (resultEl) resultEl.innerHTML = renderBriefCard(plan);
      resetEmailGate();
      // Update CTA label to team-specific action
      var ctaEl = container.querySelector('.br-cta');
      if (ctaEl && ctaLabels[state.team]) ctaEl.textContent = ctaLabels[state.team];
      showStep(4);
    }
  });

  // Headline glitch — fires once when section scrolls into view
  var headline = container.querySelector('.br-headline');
  if (headline && window.IntersectionObserver) {
    var glitchObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        glitchObs.disconnect();
        headline.classList.add('glitch-play');
      });
    }, { threshold: 0.5 });
    glitchObs.observe(headline);
  }
})();
