/**
 * Hexius — Landing page form handler (/test/, /fr/test/)
 * Submits to the same Google Form as the main site, via hidden iframe.
 *
 * SOURCE OF TRUTH for entry IDs and service values: js/main.js
 * (GOOGLE_FORM_CONFIG / SERVICE_VALUE_MAP). Keep these in sync if the
 * Google Form changes. Duplicated here so the landing page need not load main.js.
 *
 * Binds to:
 *   #contact-form  — full lead form (name/email/company/service/message/consent)
 *   #notify-form   — email-only product waitlist (email/consent)
 */
(function () {
  'use strict';

  var GOOGLE_FORM_CONFIG = {
    formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLScn-Sr6Ibc2z4MgFDctcvkW_aCvRVnmZnWBKCh7qB1_hY7ONA/formResponse',
    entryIds: {
      name: 'entry.327635613',
      email: 'entry.966433351',
      company: 'entry.46439575',
      company2: 'entry.1960370376',
      service: 'entry.610128610',
      message: 'entry.835111868',
      consent: 'entry.2115631709'
    }
  };

  var SERVICE_VALUE_MAP = {
    '': 'General inquiry / Demande Générale',
    'ttx': 'Tabletop Exercices / Exercises de table (TTX)',
    'pentest': 'Application & Product Peentest / Pentest d\'application et de produit',
    'training': 'Secure development training / Formation Développement Sécuritaire'
  };

  function isFr() { return document.documentElement.lang === 'fr'; }

  function showFormFeedback(form, type, message) {
    var existing = form.parentNode.querySelector('.form-feedback');
    if (existing) existing.remove();

    var feedback = document.createElement('div');
    feedback.className = 'form-feedback form-feedback-' + type;
    feedback.setAttribute('role', 'alert');
    feedback.textContent = message;
    form.parentNode.insertBefore(feedback, form.nextSibling);
    feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    if (type === 'success') {
      setTimeout(function () {
        if (feedback.parentNode) {
          feedback.style.transition = 'opacity 0.3s ease';
          feedback.style.opacity = '0';
          setTimeout(function () { feedback.remove(); }, 300);
        }
      }, 6000);
    }
  }

  function submitViaIframe(data, form, submitButton, originalText, successMsg) {
    var existingIframe = document.getElementById('google-forms-iframe');
    if (existingIframe) existingIframe.remove();

    var iframe = document.createElement('iframe');
    iframe.id = 'google-forms-iframe';
    iframe.name = 'google-forms-iframe';
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;visibility:hidden;pointer-events:none;';
    document.body.appendChild(iframe);

    var tempForm = document.createElement('form');
    tempForm.method = 'POST';
    tempForm.action = GOOGLE_FORM_CONFIG.formUrl;
    tempForm.target = 'google-forms-iframe';
    tempForm.style.display = 'none';
    tempForm.acceptCharset = 'UTF-8';
    tempForm.enctype = 'application/x-www-form-urlencoded';
    tempForm.noValidate = true;

    Object.keys(data).forEach(function (key) {
      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = String(data[key] || '');
      tempForm.appendChild(input);
    });
    document.body.appendChild(tempForm);

    var handled = false;
    var timeoutId;

    function cleanup() {
      setTimeout(function () {
        if (document.body.contains(tempForm)) document.body.removeChild(tempForm);
        if (document.body.contains(iframe)) iframe.remove();
      }, 2000);
    }

    function handleSuccess() {
      if (handled) return;
      handled = true;
      if (window.umami) window.umami.track(form.id === 'notify-form' ? 'notify-submit' : 'contact-submit');
      showFormFeedback(form, 'success', successMsg);
      form.reset();
      submitButton.disabled = false;
      submitButton.textContent = originalText;
      cleanup();
    }

    function handleError() {
      if (handled) return;
      handled = true;
      var msg = isFr()
        ? 'Une erreur s\'est produite. Veuillez réessayer ou nous écrire directement.'
        : 'There was an error submitting. Please try again or email us directly.';
      showFormFeedback(form, 'error', msg);
      submitButton.disabled = false;
      submitButton.textContent = originalText;
      cleanup();
    }

    iframe.onload = function () {
      if (timeoutId) clearTimeout(timeoutId);
      setTimeout(handleSuccess, 800);
    };
    iframe.onerror = function () {
      if (timeoutId) clearTimeout(timeoutId);
      handleError();
    };
    timeoutId = setTimeout(handleSuccess, 5000);

    try {
      tempForm.submit();
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      handleError();
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    var form = event.target;
    var isNotify = form.id === 'notify-form';
    var submitButton = form.querySelector('button[type="submit"]');
    var formData = new FormData(form);

    var email = (formData.get('email') || '').trim();
    var consentChecked = formData.get('consent') ? 'yes' : 'no';

    // Email is required on both forms.
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      showFormFeedback(form, 'error', isFr()
        ? 'Veuillez entrer une adresse courriel valide.'
        : 'Please enter a valid email address.');
      return;
    }

    var name, company, service, message, successMsg;

    if (isNotify) {
      // Email-only waitlist: tag the lead so it is recognizable in the Google Sheet.
      name = isFr() ? '(Liste d\'attente produits)' : '(Product waitlist)';
      company = '—';
      service = '';
      message = isFr()
        ? 'Souhaite être notifié au lancement des produits de sécurité.'
        : 'Wants to be notified when security products launch.';
      var successTpl = form.querySelector('[data-success-message]');
      successMsg = successTpl ? successTpl.textContent.trim()
        : (isFr() ? 'Merci ! Vous êtes sur la liste.' : 'Thanks! You\'re on the list.');
    } else {
      name = (formData.get('name') || '').trim();
      company = (formData.get('company') || '').trim();
      service = formData.get('service') || '';
      message = (formData.get('message') || '').trim();
      if (!name || !company || !message) {
        showFormFeedback(form, 'error', isFr()
          ? 'Veuillez remplir tous les champs obligatoires.'
          : 'Please fill in all required fields.');
        return;
      }
      successMsg = isFr()
        ? 'Merci ! Votre message a été envoyé avec succès.'
        : 'Thank you! Your message has been submitted successfully.';
    }

    var serviceValue = SERVICE_VALUE_MAP[service] || SERVICE_VALUE_MAP[''];

    if (!submitButton) return;
    submitButton.disabled = true;
    var originalText = submitButton.textContent;
    submitButton.textContent = isFr() ? 'Envoi en cours...' : 'Submitting...';

    var submissionData = {};
    submissionData[GOOGLE_FORM_CONFIG.entryIds.name] = name;
    submissionData[GOOGLE_FORM_CONFIG.entryIds.email] = email;
    submissionData[GOOGLE_FORM_CONFIG.entryIds.company] = company;
    submissionData[GOOGLE_FORM_CONFIG.entryIds.company2] = company;
    submissionData[GOOGLE_FORM_CONFIG.entryIds.service] = serviceValue;
    submissionData[GOOGLE_FORM_CONFIG.entryIds.message] = message;
    submissionData[GOOGLE_FORM_CONFIG.entryIds.consent] = consentChecked;

    submitViaIframe(submissionData, form, submitButton, originalText, successMsg);
  }

  function init() {
    ['contact-form', 'notify-form'].forEach(function (id) {
      var form = document.getElementById(id);
      if (form) form.addEventListener('submit', handleSubmit);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
