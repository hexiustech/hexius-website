/**
 * Hexius — About Page Floating Data Particles
 * Canvas-based dots drifting slowly upward on the right column.
 * 10–12 particles, colors #9B59B6, #2A3D55, #1A2433.
 * Pauses when #about section is hidden.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('about-particles-canvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var particles = [];
  var RAF = null;
  var running = false;

  var PARTICLE_COLORS = [
    '#9B59B6',
    '#2A3D55',
    '#1A2433'
  ];

  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function resize() {
    var parent = canvas.parentElement;
    if (!parent) return;
    canvas.width = parent.offsetWidth;
    canvas.height = parent.offsetHeight;
  }

  function createParticles() {
    particles = [];
    var count = 10 + Math.floor(Math.random() * 3);
    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vy: -0.15 - Math.random() * 0.15,
        r: 2 + Math.random(),
        colorIdx: Math.floor(Math.random() * PARTICLE_COLORS.length),
        opacity: 0.3 + Math.random() * 0.3
      });
    }
  }

  function update() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.y += p.vy;
      if (p.y < -p.r) {
        p.y = canvas.height + p.r;
        p.x = Math.random() * canvas.width;
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(PARTICLE_COLORS[p.colorIdx], p.opacity);
      ctx.fill();
    }
  }

  function loop() {
    if (!running) return;
    update();
    draw();
    RAF = requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true;
    loop();
  }

  function stop() {
    running = false;
    if (RAF) cancelAnimationFrame(RAF);
  }

  function checkVisibility() {
    var aboutSection = document.getElementById('about');
    if (!aboutSection) return;
    if (aboutSection.classList.contains('hidden')) {
      stop();
    } else {
      start();
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else checkVisibility();
  });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      createParticles();
    }, 200);
  });

  var observer = new MutationObserver(function () {
    checkVisibility();
  });
  var aboutSection = document.getElementById('about');
  if (aboutSection) {
    observer.observe(aboutSection, { attributes: true, attributeFilter: ['class'] });
  }

  resize();
  createParticles();
  checkVisibility();
})();
