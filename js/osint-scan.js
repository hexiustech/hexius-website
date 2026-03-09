(function () {
  'use strict';

  var CHAR_SPEED = 22;   // ms per character
  var LINE_GAP   = 160;  // ms pause between lines

  function typeLines(lines, index, onAllDone) {
    if (index >= lines.length) {
      if (typeof onAllDone === 'function') onAllDone();
      return;
    }

    var line = lines[index];
    var text = line.getAttribute('data-scan-text') || '';

    line.textContent = '';
    line.style.visibility = 'visible';
    line.classList.add('osint-scan-line--typing');

    var i = 0;
    var iv = setInterval(function () {
      if (i < text.length) {
        line.textContent += text[i++];
      } else {
        clearInterval(iv);
        line.classList.remove('osint-scan-line--typing');
        setTimeout(function () {
          typeLines(lines, index + 1, onAllDone);
        }, LINE_GAP);
      }
    }, CHAR_SPEED);
  }

  function resetTerminal(terminal) {
    var lines = Array.from(terminal.querySelectorAll('.osint-scan-line:not(.osint-scan-spacer)'));
    lines.forEach(function (l) {
      l.textContent = '';
      l.style.visibility = 'hidden';
      l.classList.remove('osint-scan-line--typing', 'osint-scan-done');
    });
    return lines;
  }

  var scanning = false;

  function runScan() {
    if (scanning) return;
    var terminal = document.querySelector('.osint-scan-terminal');
    if (!terminal) return;

    scanning = true;
    var lines = resetTerminal(terminal);
    var cursorLine = terminal.querySelector('.osint-scan-cursor');

    setTimeout(function () {
      typeLines(lines, 0, function () {
        if (cursorLine) cursorLine.classList.add('osint-scan-done');
        scanning = false;
      });
    }, 300);
  }

  window.addEventListener('hexius:section', function (e) {
    if (e.detail && e.detail.id === 'osint') runScan();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (window.location.hash === '#osint') runScan();
    });
  } else {
    if (window.location.hash === '#osint') runScan();
  }
})();
