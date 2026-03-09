/**
 * Hexius — Network Topology Animation
 * Canvas-based nodes + edges for the home hero background.
 * Nodes use the 6 signal colors; one node "fires" every 3–4s with a
 * glow-ring pulse and its connected edges briefly brighten.
 * Vanilla JS, no dependencies.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('network-canvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var nodes = [];
  var RAF = null;
  var running = false;

  // Config
  var NODE_COUNT    = 32;
  var MAX_EDGE_DIST = 160;
  var NODE_SPEED    = 0.22;
  var FIRE_INTERVAL_MIN = 3000; // ms
  var FIRE_INTERVAL_MAX = 4500; // ms

  var SIGNAL_COLORS = [
    '#FF4757', // threat  — pentest
    '#FFA502', // sim     — ttx
    '#FF6B9D', // social  — social-eng
    '#00D4FF', // scan    — osint
    '#2ED573', // build   — training
    '#9B59B6'  // lead    — vciso
  ];

  // Parse a hex color to [r, g, b]
  function hexToRgb(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  }

  // Pre-parse colors for fast access
  var SIGNAL_RGB = SIGNAL_COLORS.map(hexToRgb);

  function resize() {
    canvas.width  = canvas.offsetWidth  || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;
  }

  function createNodes() {
    nodes = [];
    for (var i = 0; i < NODE_COUNT; i++) {
      var colorIdx = i % SIGNAL_COLORS.length;
      nodes.push({
        x:        Math.random() * canvas.width,
        y:        Math.random() * canvas.height,
        vx:       (Math.random() - 0.5) * NODE_SPEED,
        vy:       (Math.random() - 0.5) * NODE_SPEED,
        r:        1.2 + Math.random() * 2,
        colorIdx: colorIdx,
        // fire state: 0 = idle, >0 = active (countdown in frames)
        fireTTL:  0,
        fireMax:  60 // frames the glow lasts
      });
    }
  }

  // Fire a random node every 3–4 seconds
  function scheduleNextFire() {
    var delay = FIRE_INTERVAL_MIN +
                Math.random() * (FIRE_INTERVAL_MAX - FIRE_INTERVAL_MIN);
    setTimeout(function () {
      if (!running) return;
      var idx = Math.floor(Math.random() * nodes.length);
      nodes[idx].fireTTL = nodes[idx].fireMax;
      scheduleNextFire();
    }, delay);
  }

  function update() {
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > canvas.width)  n.vx *= -1;
      if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      if (n.fireTTL > 0) n.fireTTL--;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw edges
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var dx   = nodes[i].x - nodes[j].x;
        var dy   = nodes[i].y - nodes[j].y;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MAX_EDGE_DIST) {
          var baseFade = (1 - dist / MAX_EDGE_DIST);

          // Brighten edge if either endpoint is firing
          var iFire = nodes[i].fireTTL / nodes[i].fireMax;
          var jFire = nodes[j].fireTTL / nodes[j].fireMax;
          var fireBoost = Math.max(iFire, jFire);

          var alpha = baseFade * (0.30 + fireBoost * 0.35);

          // Use the color of the firing node (or node i if neither fires)
          var rgb;
          if (iFire > jFire) {
            rgb = SIGNAL_RGB[nodes[i].colorIdx];
          } else if (jFire > 0) {
            rgb = SIGNAL_RGB[nodes[j].colorIdx];
          } else {
            rgb = SIGNAL_RGB[nodes[i].colorIdx];
          }

          ctx.beginPath();
          ctx.strokeStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + alpha + ')';
          ctx.lineWidth = 0.8;
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    for (var k = 0; k < nodes.length; k++) {
      var node = nodes[k];
      var rgb  = SIGNAL_RGB[node.colorIdx];
      var fire = node.fireTTL / node.fireMax; // 0..1

      // Base fill
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + (0.70 + fire * 0.30) + ')';
      ctx.fill();

      // Soft glow ring (always)
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r + 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Firing pulse ring (expands and fades)
      if (fire > 0) {
        var pulseR = node.r + 4 + (1 - fire) * 18;
        ctx.beginPath();
        ctx.arc(node.x, node.y, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + (fire * 0.55) + ')';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
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

  // Pause when tab is hidden to save CPU
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { stop(); } else { start(); }
  });

  // Resize — debounced
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      createNodes();
    }, 200);
  });

  // Init
  resize();
  createNodes();
  scheduleNextFire();
  start();
})();
