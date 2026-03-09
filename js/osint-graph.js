(function () {
  'use strict';

  var CANVAS_ID  = 'osint-graph-canvas';
  var NODE_SPEED = 0.35;
  var EDGE_DIST  = 750;
  var NODE_MIN_SEP = 180;
  var COLOR      = '#00D4FF';
  var COLOR_RGB  = [0, 212, 255];

  var LABELS = ['DNS', 'SUBDOMAINS', 'EMAILS', 'CREDENTIALS', 'LINKEDIN', 'DARK WEB', 'GITHUB'];

  var canvas, ctx, nodes, RAF, running;

  function init() {
    canvas = document.getElementById(CANVAS_ID);
    if (!canvas) return false;
    ctx = canvas.getContext('2d');
    return true;
  }

  function resize() {
    canvas.width  = canvas.offsetWidth  || 600;
    canvas.height = canvas.offsetHeight || 300;
  }

  function createNodes() {
    var margin = 60;
    nodes = [];
    LABELS.forEach(function (label) {
      var x, y, attempts = 0, tooClose;
      do {
        x = margin + Math.random() * (canvas.width  - margin * 2);
        y = margin + Math.random() * (canvas.height - margin * 2);
        tooClose = nodes.some(function (n) {
          var dx = n.x - x, dy = n.y - y;
          return Math.sqrt(dx * dx + dy * dy) < NODE_MIN_SEP;
        });
        attempts++;
      } while (tooClose && attempts < 50);
      nodes.push({
        label: label,
        x: x, y: y,
        vx: (Math.random() - 0.5) * NODE_SPEED,
        vy: (Math.random() - 0.5) * NODE_SPEED,
        r:  8 + Math.random() * 4
      });
    });
  }

  function update() {
    nodes.forEach(function (n) {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < n.r || n.x > canvas.width  - n.r) n.vx *= -1;
      if (n.y < n.r || n.y > canvas.height - n.r) n.vy *= -1;
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Edges
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var dx   = nodes[i].x - nodes[j].x;
        var dy   = nodes[i].y - nodes[j].y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < EDGE_DIST) {
          var alpha = (1 - dist / EDGE_DIST) * 0.45;
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(' + COLOR_RGB + ',' + alpha + ')';
          ctx.lineWidth   = 0.8;
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // Nodes + labels
    nodes.forEach(function (n) {
      // Glow ring
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r + 8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(' + COLOR_RGB + ',0.15)';
      ctx.lineWidth   = 1;
      ctx.stroke();

      // Fill
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = COLOR;
      ctx.fill();

      // Label
      ctx.font      = '11px "IBM Plex Mono", monospace';
      ctx.fillStyle = 'rgba(' + COLOR_RGB + ',0.6)';
      ctx.textAlign = 'center';
      ctx.fillText(n.label, n.x, n.y - n.r - 7);
    });
  }

  function loop() {
    if (!running) return;
    update();
    draw();
    RAF = requestAnimationFrame(loop);
  }

  function start() {
    if (!canvas) { if (!init()) return; }
    stop();
    requestAnimationFrame(function () {
      if (window.location.hash !== '#osint') return;
      resize();
      createNodes();
      running = true;
      loop();
    });
  }

  function stop() {
    running = false;
    if (RAF) cancelAnimationFrame(RAF);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else { if (window.location.hash === '#osint') start(); }
  });

  window.addEventListener('hexius:section', function (e) {
    if (e.detail && e.detail.id === 'osint') start(); else stop();
  });

  window.addEventListener('resize', function () {
    if (!canvas || !running) return;
    resize();
    createNodes();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (window.location.hash === '#osint') start();
    });
  } else {
    if (window.location.hash === '#osint') start();
  }
})();
