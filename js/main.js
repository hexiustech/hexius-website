/**
 * Hexius Technology - Main JavaScript
 * Handles hash-based routing, section switching, logo animation, and navbar visibility
 */

(function() {
  'use strict';

  // Mark JS as enabled for CSS fallback
  document.documentElement.classList.add('js-enabled');

  // State
  const state = {
    currentSection: null,
    isNavbarVisible: false
  };

  // DOM Elements
  const navbar = document.getElementById('navbar');
  const hero = document.getElementById('hero');
  const heroLogo = document.querySelector('.logo-hero');
  const mainContent = document.getElementById('main-content');
  const serviceTiles = document.querySelectorAll('.service-tile');
  const heroServiceCards = document.querySelectorAll('.hero-service-card');
  const servicesTilesSection = document.getElementById('services');
  const contentSections = document.querySelectorAll('.content-section');
  const navLinks = document.querySelectorAll('.nav-link');
  const backToTopButtons = document.querySelectorAll('.back-to-top');
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const navLinksContainer = document.getElementById('nav-links');
  const seeServicesBtn = document.getElementById('see-services-btn');
  const contactForm = document.getElementById('contact-form');
  const navbarLogoLink = document.getElementById('navbar-logo-link');
  const serviceButtons = document.querySelectorAll('.service-btn');
  const langSwitcher = document.querySelector('.lang-switcher');

  /**
   * Show a specific section and hide others
   */
  function showSection(sectionId) {
    // Hide hero (service cards are in hero, so hide entire hero)
    if (hero) {
      hero.setAttribute('aria-hidden', 'true');
      hero.classList.add('hidden');
    }
    // Hide services tiles section if it exists (for backward compatibility)
    if (servicesTilesSection) {
      servicesTilesSection.setAttribute('aria-hidden', 'true');
      servicesTilesSection.classList.add('hidden');
    }
    
    // Hide all sections
    contentSections.forEach(section => {
      section.setAttribute('aria-hidden', 'true');
      section.classList.add('hidden');
    });

    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
      targetSection.setAttribute('aria-hidden', 'false');
      targetSection.classList.remove('hidden');
      
      // Wait for layout to update, then scroll to show eyebrow text above the heading
      setTimeout(() => {
        const eyebrow = targetSection.querySelector('.eyebrow');
        const heading = targetSection.querySelector('h2');
        
        // Use eyebrow if available, otherwise use heading
        const scrollTarget = eyebrow || heading;
        if (scrollTarget) {
          // Calculate offset to account for navbar (72px) and add extra padding for visibility
          const navbarHeight = 72;
          const offset = navbarHeight + 60; // Increased padding to show eyebrow fully
          
          // Get the position of the element
          const elementPosition = scrollTarget.getBoundingClientRect().top + window.pageYOffset;
          const offsetPosition = elementPosition - offset;
          
          // Scroll to the calculated position
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
          
          // Focus the heading for accessibility
          if (heading) {
            heading.focus();
          }
        }
      }, 10);
    }

    // Update state
    state.currentSection = sectionId;

    // Update active nav link
    updateActiveNavLink(sectionId);

    // Update navbar visibility
    updateNavbarVisibility();
  }

  /**
   * Show hero and hide all content sections
   */
  function showHero() {
    // Hide all content sections
    contentSections.forEach(section => {
      section.setAttribute('aria-hidden', 'true');
      section.classList.add('hidden');
    });

    // Show hero (service cards are included in hero)
    if (hero) {
      hero.setAttribute('aria-hidden', 'false');
      hero.classList.remove('hidden');
    }
    // Show services tiles section if it exists (for backward compatibility)
    if (servicesTilesSection) {
      servicesTilesSection.setAttribute('aria-hidden', 'false');
      servicesTilesSection.classList.remove('hidden');
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Remove hash
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname);
    }

    state.currentSection = null;
    
    // Remove active state from all nav links when showing hero
    updateActiveNavLink(null);
    
    updateNavbarVisibility();
  }

  /**
   * Update active nav link based on current section
   */
  function updateActiveNavLink(sectionId) {
    // Remove active class from all nav links
    navLinks.forEach(link => {
      link.classList.remove('active');
    });
    
    // Add active class to the matching nav link
    if (sectionId) {
      const activeLink = Array.from(navLinks).find(link => {
        const href = link.getAttribute('href');
        return href === `#${sectionId}`;
      });
      
      if (activeLink) {
        activeLink.classList.add('active');
      }
    }
  }

  /**
   * Update navbar visibility based on current state
   */
  function updateNavbarVisibility() {
    const shouldShow = state.currentSection !== null || window.scrollY > 100;
    
    if (shouldShow && !state.isNavbarVisible) {
      navbar.classList.add('visible');
      state.isNavbarVisible = true;
      
      // Animate logo to compact size
      if (heroLogo) {
        heroLogo.style.maxWidth = '180px';
        heroLogo.style.maxHeight = '40px';
      }
    } else if (!shouldShow && state.isNavbarVisible) {
      navbar.classList.remove('visible');
      state.isNavbarVisible = false;
      
      // Reset logo to hero size
      if (heroLogo) {
        heroLogo.style.maxWidth = '400px';
        heroLogo.style.maxHeight = '120px';
      }
    }
  }

  /**
   * Handle hash changes
   */
  function handleHashChange() {
    const hash = window.location.hash.slice(1); // Remove #
    
    // Get all service IDs dynamically from service sections
    const serviceIds = Array.from(contentSections)
      .map(section => section.id)
      .filter(id => id && id !== 'why' && id !== 'contact');
    
    const validSections = [...serviceIds, 'why', 'contact'];
    
    if (hash && validSections.includes(hash)) {
      showSection(hash);
    } else {
      showHero();
    }
  }

  /**
   * Handle service tile clicks
   */
  function handleTileClick(event) {
    const tile = event.currentTarget;
    const sectionId = tile.getAttribute('data-section');
    
    if (sectionId) {
      window.location.hash = sectionId;
      handleHashChange();
    }
  }

  /**
   * Handle navigation link clicks
   */
  function handleNavClick(event) {
    event.preventDefault();
    const href = event.currentTarget.getAttribute('href');
    const sectionId = href.slice(1); // Remove #
    
    // Get all service IDs dynamically
    const serviceIds = Array.from(contentSections)
      .map(section => section.id)
      .filter(id => id && id !== 'why' && id !== 'contact');
    const validSections = [...serviceIds, 'why', 'contact'];
    
    if (sectionId && validSections.includes(sectionId)) {
      window.location.hash = sectionId;
      handleHashChange();
    } else if (href === '#contact') {
      window.location.hash = 'contact';
      handleHashChange();
    }
    
    // Close mobile menu if open
    if (mobileMenuToggle && mobileMenuToggle.getAttribute('aria-expanded') === 'true') {
      toggleMobileMenu();
    }
  }

  /**
   * Handle back to top button clicks
   */
  function handleBackToTop(event) {
    event.preventDefault();
    showHero();
  }

  /**
   * Handle "See services" button click
   */
  function handleSeeServices(event) {
    event.preventDefault();
    const servicesSection = document.getElementById('services');
    if (servicesSection) {
      servicesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /**
   * Toggle mobile menu
   */
  function toggleMobileMenu() {
    const isExpanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true';
    mobileMenuToggle.setAttribute('aria-expanded', !isExpanded);
    navLinksContainer.classList.toggle('open');
  }

  /**
   * Handle service selection change to show requirements
   */
  function handleServiceSelection() {
    const serviceSelect = document.querySelector('select[name="service"]');
    const requirementsDiv = document.getElementById('service-requirements');
    const requirementsContent = document.getElementById('requirements-content');
    const requirementsDataEl = document.getElementById('service-requirements-data');
    
    if (!serviceSelect || !requirementsDiv || !requirementsContent || !requirementsDataEl) return;
    
    // Build requirements map from data attributes
    const serviceRequirements = {};
    const requirementElements = requirementsDataEl.querySelectorAll('[data-service-id]');
    requirementElements.forEach(el => {
      const serviceId = el.getAttribute('data-service-id');
      const requirements = el.getAttribute('data-requirements');
      if (serviceId && requirements) {
        serviceRequirements[serviceId] = requirements;
      }
    });
    
    serviceSelect.addEventListener('change', (e) => {
      const selectedService = e.target.value;
      
      if (selectedService && serviceRequirements[selectedService]) {
        const requirementsText = serviceRequirements[selectedService];
        
        // Parse requirements into bullet points
        // Split by periods followed by space and capital letter, or by "Required:" pattern
        const bullets = requirementsText
          .split(/\.(?=\s+[A-Z]|$)/)
          .map(item => item.trim())
          .filter(item => item.length > 0)
          .map(item => {
            // Remove trailing period if present
            return item.replace(/\.$/, '').trim();
          });
        
        // Create bullet list
        if (bullets.length > 0) {
          const ul = document.createElement('ul');
          ul.className = 'requirements-bullets';
          bullets.forEach(bullet => {
            const li = document.createElement('li');
            li.textContent = bullet;
            ul.appendChild(li);
          });
          requirementsContent.innerHTML = '';
          requirementsContent.appendChild(ul);
        } else {
          // Fallback to plain text if parsing doesn't work
          requirementsContent.textContent = requirementsText;
        }
        
        requirementsDiv.style.display = 'block';
      } else {
        requirementsDiv.style.display = 'none';
      }
    });
  }

  /**
   * Google Forms Configuration
   * Form URL: https://forms.gle/dwJghzcih1kL8xCu6
   * Form ID: 1FAIpQLScn-Sr6Ibc2z4MgFDctcvkW_aCvRVnmZnWBKCh7qB1_hY7ONA
   * 
   * To verify/update entry IDs:
   * 1. Open the Google Form in edit mode
   * 2. Right-click on a field and "Inspect Element"
   * 3. Look for the input's name attribute (e.g., name="entry.123456789")
   * 4. Update the entryIds object below with the correct values
   */
  const GOOGLE_FORM_CONFIG = {
    formId: '1FAIpQLScn-Sr6Ibc2z4MgFDctcvkW_aCvRVnmZnWBKCh7qB1_hY7ONA',
    formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLScn-Sr6Ibc2z4MgFDctcvkW_aCvRVnmZnWBKCh7qB1_hY7ONA/formResponse',
    entryIds: {
      name: 'entry.327635613',      // "Your name" / "Votre nom"
      email: 'entry.966433351',      // "Professionnal Email" / "Email Professionnel"
      company: 'entry.46439575',    // "Entreprise" / "Company" (first field)
      company2: 'entry.1960370376', // "Entreprise" / "Company" (second field - required)
      service: 'entry.610128610',    // "Service of Interest" / "Service d'Intérêt"
      message: 'entry.835111868'     // "Message"
    }
  };

  /**
   * Map service values to Google Form option values
   * These must match EXACTLY what's in the Google Form dropdown
   * 
   * To verify/update service values:
   * 1. Open the Google Form in edit mode
   * 2. Click on the "Service of Interest" dropdown field
   * 3. Check the exact text of each option (including capitalization, punctuation, etc.)
   * 4. Update the SERVICE_VALUE_MAP below to match exactly
   * 
   * Note: The keys (left side) are the values from our form's select options.
   *       The values (right side) must match the Google Form dropdown options exactly.
   */
  const SERVICE_VALUE_MAP = {
    '': 'General inquiry / Demande Générale',
    'ttx': 'Tabletop Exercices / Exercises de table (TTX)',
    'pentest': 'Application & Product Peentest / Pentest d\'application et de produit',
    'training': 'Secure development training / Formation Développement Sécuritaire'
  };

  /**
   * Encode form data for URL encoding
   */
  function encodeFormData(data) {
    return Object.keys(data)
      .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
      .join('&');
  }

  /**
   * Extract hidden field values and entry IDs from Google Form HTML
   */
  function extractFormData(html) {
    const result = {
      hiddenFields: {},
      entryIds: {}
    };
    
    // Extract fbzx (form session token)
    const fbzxMatch = html.match(/name="fbzx"\s+value="([^"]+)"/);
    if (fbzxMatch) {
      result.hiddenFields.fbzx = fbzxMatch[1];
    }
    
    // Extract partialResponse
    const partialResponseMatch = html.match(/name="partialResponse"\s+value="([^"]+)"/);
    if (partialResponseMatch) {
      result.hiddenFields.partialResponse = partialResponseMatch[1];
    }
    
    // Extract pageHistory
    const pageHistoryMatch = html.match(/name="pageHistory"\s+value="([^"]+)"/);
    if (pageHistoryMatch) {
      result.hiddenFields.pageHistory = pageHistoryMatch[1];
    }
    
    // Extract fvv (form version)
    const fvvMatch = html.match(/name="fvv"\s+value="([^"]+)"/);
    if (fvvMatch) {
      result.hiddenFields.fvv = fvvMatch[1];
    } else {
      result.hiddenFields.fvv = '1'; // Default value
    }
    
    // Extract all entry IDs from the form
    const entryIdMatches = html.matchAll(/name="(entry\.\d+)"/g);
    const entryIds = Array.from(entryIdMatches, m => m[1]);
    if (entryIds.length > 0) {
      console.log('Found entry IDs in form:', entryIds);
      // Store for potential debugging/verification
      result.entryIds = entryIds;
    }
    
    return result;
  }

  /**
   * Handle contact form submission to Google Forms
   */
  function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    
    // Get form values
    const name = (formData.get('name') || '').trim();
    const email = (formData.get('email') || '').trim();
    const company = (formData.get('company') || '').trim();
    const service = formData.get('service') || '';
    const message = (formData.get('message') || '').trim();
    
    // Validate required fields
    if (!name || !email || !company || !message) {
      const errorMsg = document.documentElement.lang === 'fr' 
        ? 'Veuillez remplir tous les champs obligatoires.'
        : 'Please fill in all required fields.';
      showFormFeedback('error', errorMsg);
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const errorMsg = document.documentElement.lang === 'fr'
        ? 'Veuillez entrer une adresse e-mail valide.'
        : 'Please enter a valid email address.';
      showFormFeedback('error', errorMsg);
      return;
    }
    
    // Map service value to Google Form option (exact match required)
    const serviceValue = SERVICE_VALUE_MAP[service] || SERVICE_VALUE_MAP[''];
    
    // Disable submit button and show loading state
    if (submitButton) {
      submitButton.disabled = true;
      const originalText = submitButton.textContent;
      const loadingText = document.documentElement.lang === 'fr' ? 'Envoi en cours...' : 'Submitting...';
      submitButton.textContent = loadingText;
      
      // Build form data object - Google Forms often works without hidden fields
      // The 400 error is usually due to wrong entry IDs or service values
      // Note: There are TWO company fields in the Google Form, both need the same value
      const submissionData = {
        [GOOGLE_FORM_CONFIG.entryIds.name]: name,
        [GOOGLE_FORM_CONFIG.entryIds.email]: email,
        [GOOGLE_FORM_CONFIG.entryIds.company]: company,      // First company field
        [GOOGLE_FORM_CONFIG.entryIds.company2]: company,    // Second company field (required)
        [GOOGLE_FORM_CONFIG.entryIds.service]: serviceValue,
        [GOOGLE_FORM_CONFIG.entryIds.message]: message
      };
      
      // Log submission for debugging - check console to verify entry IDs and values
      console.log('Submitting to Google Forms:', {
        url: GOOGLE_FORM_CONFIG.formUrl,
        entryIds: GOOGLE_FORM_CONFIG.entryIds,
        serviceValue: serviceValue,
        serviceKey: service,
        data: submissionData
      });
      
      // Debug helper: If you get a 400 error, check these:
      console.log('%cDEBUGGING INFO (if you get 400 error):', 'color: orange; font-weight: bold;');
      console.log('1. Verify entry IDs match your Google Form:');
      console.log('   - Open your Google Form in edit mode');
      console.log('   - Right-click each field → Inspect Element');
      console.log('   - Look for name="entry.XXXXX" in the input element');
      console.log('   - Update GOOGLE_FORM_CONFIG.entryIds in js/main.js');
      console.log('2. Verify service dropdown values match EXACTLY:');
      console.log('   - Check the exact text in your Google Form dropdown');
      console.log('   - Update SERVICE_VALUE_MAP in js/main.js to match');
      console.log('   Current service value being sent:', serviceValue);
      
      // Use iframe submission method (most reliable for Google Forms)
      submitViaIframe(submissionData, form, submitButton, originalText);
    }
  }

  /**
   * Submit form data via hidden iframe (primary method for Google Forms)
   */
  function submitViaIframe(data, form, submitButton, originalText) {
    // Remove any existing iframe to ensure clean submission
    const existingIframe = document.getElementById('google-forms-iframe');
    if (existingIframe) {
      existingIframe.remove();
    }
    
    // Create new hidden iframe for form submission
    const iframe = document.createElement('iframe');
    iframe.id = 'google-forms-iframe';
    iframe.name = 'google-forms-iframe';
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
    
    // Create a temporary form for submission
    const tempForm = document.createElement('form');
    tempForm.method = 'POST';
    tempForm.action = GOOGLE_FORM_CONFIG.formUrl;
    tempForm.target = 'google-forms-iframe';
    tempForm.style.display = 'none';
    tempForm.acceptCharset = 'UTF-8';
    tempForm.enctype = 'application/x-www-form-urlencoded';
    tempForm.noValidate = true; // Disable HTML5 validation
    
    // Add all form fields as hidden inputs
    // Important: Order and exact field names matter for Google Forms
    Object.keys(data).forEach(key => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = String(data[key] || ''); // Ensure value is a string
      tempForm.appendChild(input);
    });
    
    // Append form to body (required for submission)
    document.body.appendChild(tempForm);
    
    // Set up success handler
    let submissionHandled = false;
    const handleSuccess = () => {
      if (submissionHandled) return;
      submissionHandled = true;
      
      const successMsg = document.documentElement.lang === 'fr'
        ? 'Merci ! Votre message a été envoyé avec succès.'
        : 'Thank you! Your message has been submitted successfully.';
      showFormFeedback('success', successMsg);
      
      // Reset form
      form.reset();
      
      // Hide service requirements if visible
      const requirementsDiv = document.getElementById('service-requirements');
      if (requirementsDiv) {
        requirementsDiv.style.display = 'none';
      }
      
      // Reset service select to default
      const serviceSelect = form.querySelector('select[name="service"]');
      if (serviceSelect) {
        serviceSelect.value = '';
      }
      
      // Clean up temporary form and iframe after a delay
      setTimeout(() => {
        if (document.body.contains(tempForm)) {
          document.body.removeChild(tempForm);
        }
        if (document.body.contains(iframe)) {
          iframe.remove();
        }
      }, 2000);
      
      // Re-enable submit button
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    };
    
    // Set up error handler
    const handleError = (errorMessage) => {
      if (submissionHandled) return;
      submissionHandled = true;
      
      const errorMsg = document.documentElement.lang === 'fr'
        ? errorMessage || 'Une erreur s\'est produite lors de l\'envoi de votre message. Veuillez réessayer ou nous contacter directement.'
        : errorMessage || 'There was an error submitting your message. Please try again or contact us directly.';
      showFormFeedback('error', errorMsg);
      
      // Re-enable submit button
      submitButton.disabled = false;
      submitButton.textContent = originalText;
      
      // Clean up
      if (document.body.contains(tempForm)) {
        document.body.removeChild(tempForm);
      }
      if (document.body.contains(iframe)) {
        iframe.remove();
      }
    };
    
    // Fallback timeout - if iframe doesn't load within 5 seconds, assume success
    // (Google Forms may not always trigger onload reliably)
    let timeoutId;
    
    // Try to detect when iframe loads (indicates submission completed)
    // Note: Due to CORS, we can't read iframe content, but onload fires when submission completes
    let loadCount = 0;
    iframe.onload = () => {
      loadCount++;
      console.log(`Iframe loaded (${loadCount}) - submission may have completed`);
      
      // Check if this might be an error page (400/500)
      // We can't read the content due to CORS, but we can check the URL
      try {
        // If iframe has a URL, check if it's an error page
        // Note: This won't work due to CORS, but we try anyway
        if (iframe.contentWindow && iframe.contentWindow.location) {
          const iframeUrl = iframe.contentWindow.location.href;
          if (iframeUrl.includes('error') || iframeUrl.includes('400')) {
            console.error('Possible error detected in iframe:', iframeUrl);
            handleError('Form submission failed. Please check the console for details and verify entry IDs match your Google Form.');
            return;
          }
        }
      } catch (e) {
        // CORS will block this, which is expected
      }
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Give Google Forms a moment to process
      setTimeout(handleSuccess, 1000);
    };
    
    // Set up timeout as fallback
    timeoutId = setTimeout(() => {
      console.log('Submission timeout - assuming success');
      handleSuccess();
    }, 5000);
    
    // Also listen for errors
    iframe.onerror = () => {
      console.error('Iframe error detected');
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      handleError('Form submission failed. Please verify entry IDs and service values match your Google Form exactly.');
    };
    
    // Submit the form
    try {
      console.log('Submitting form via iframe:', {
        action: tempForm.action,
        fields: Object.keys(data).map(key => ({ name: key, value: data[key] }))
      });
      
      tempForm.submit();
      
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      console.error('Form submission error:', error);
      handleError('Failed to submit form. Please check your connection and try again.');
    }
  }

  /**
   * Show form feedback message (success or error)
   */
  function showFormFeedback(type, message) {
    // Remove existing feedback if any
    const existingFeedback = document.getElementById('form-feedback');
    if (existingFeedback) {
      existingFeedback.remove();
    }
    
    // Create feedback element
    const feedback = document.createElement('div');
    feedback.id = 'form-feedback';
    feedback.className = `form-feedback form-feedback-${type}`;
    feedback.setAttribute('role', 'alert');
    feedback.textContent = message;
    
    // Insert after form
    const form = document.getElementById('contact-form');
    if (form) {
      form.parentNode.insertBefore(feedback, form.nextSibling);
      
      // Scroll to feedback
      feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
      // Auto-remove success messages after 5 seconds
      if (type === 'success') {
        setTimeout(() => {
          if (feedback.parentNode) {
            feedback.style.opacity = '0';
            feedback.style.transition = 'opacity 0.3s ease';
            setTimeout(() => feedback.remove(), 300);
          }
        }, 5000);
      }
    }
  }

  /**
   * Handle scroll events for navbar visibility
   */
  function handleScroll() {
    // Only update navbar if we're on hero view
    if (state.currentSection === null) {
      updateNavbarVisibility();
    }
  }

  /**
   * Initialize event listeners
   */
  function init() {
    // Service tiles (if they exist - for backward compatibility)
    serviceTiles.forEach(tile => {
      tile.addEventListener('click', handleTileClick);
      tile.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleTileClick(e);
        }
      });
    });

    // Hero service cards (new primary service cards)
    heroServiceCards.forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = card.getAttribute('data-section');
        if (sectionId) {
          window.location.hash = sectionId;
          handleHashChange();
        }
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const sectionId = card.getAttribute('data-section');
          if (sectionId) {
            window.location.hash = sectionId;
            handleHashChange();
          }
        }
      });
    });

    // Navigation links (excluding language switcher)
    navLinks.forEach(link => {
      if (!link.classList.contains('lang-switcher')) {
        link.addEventListener('click', handleNavClick);
      }
    });

    // Language switcher - preserve hash when switching
    if (langSwitcher) {
      langSwitcher.addEventListener('click', (e) => {
        const currentHash = window.location.hash;
        const baseUrl = window.SITE_BASEURL || '';
        const newUrl = langSwitcher.getAttribute('href') + currentHash;
        window.location.href = newUrl;
      });
    }

    // Back to top buttons
    backToTopButtons.forEach(btn => {
      btn.addEventListener('click', handleBackToTop);
    });

    // See services button (legacy, may not exist)
    if (seeServicesBtn) {
      seeServicesBtn.addEventListener('click', handleSeeServices);
    }

    // Service buttons in hero
    serviceButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = btn.getAttribute('data-section');
        if (sectionId) {
          window.location.hash = sectionId;
          handleHashChange();
        }
      });
    });

    // Navbar logo link
    if (navbarLogoLink) {
      navbarLogoLink.addEventListener('click', (e) => {
        e.preventDefault();
        showHero();
      });
    }

    // Mobile menu toggle
    if (mobileMenuToggle) {
      mobileMenuToggle.addEventListener('click', toggleMobileMenu);
    }

    // Contact form
    if (contactForm) {
      contactForm.addEventListener('submit', handleFormSubmit);
      handleServiceSelection();
    }

    // Hash change events
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Initial load - check hash
    handleHashChange();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

