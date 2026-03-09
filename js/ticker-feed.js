/**
 * Hexius Technology — Live Intel Ticker Feed
 * Fetches live threat intelligence from n8n webhook and populates the ticker.
 * Falls back to hardcoded items if the fetch fails or times out.
 */

const WEBHOOK_URL = 'https://YOUR_N8N_INSTANCE/webhook/hexius-threat-feed';
const FETCH_TIMEOUT_MS = 4000;

const FALLBACK_ITEMS = [
  { icon: 'warn',   text: 'CVE-2025-0145 | CVSS 9.8 | ', highlight: 'CRITICAL' },
  { icon: 'accent', text: '83% of breaches involve human error' },
  { icon: 'sim',    text: 'Phishing attacks up 61% YoY' },
  { icon: 'ok',     text: 'Avg TTX exercise reduces IR time by 40%' },
  { icon: 'warn',   text: '68% of SMBs lack an incident response plan' },
  { icon: 'accent', text: 'Mean time to detect: 194 days (industry avg)' },
  { icon: 'ok',     text: 'OWASP Top 10 covers 90% of web app vulns' },
  { icon: 'sim',    text: 'Supply chain attacks up 742% since 2019' },
];

const ICON_MAP = {
  warn:   { symbol: '●', cls: 'tick-warn'   },
  accent: { symbol: '■', cls: 'tick-accent' },
  sim:    { symbol: '▲', cls: 'tick-sim'    },
  ok:     { symbol: '✓', cls: 'tick-ok'     },
};

/**
 * Build a single ticker item span from a data item object.
 */
function buildItem(item) {
  const span = document.createElement('span');
  span.className = 'threat-ticker-item';

  const icon = ICON_MAP[item.icon] || ICON_MAP.accent;
  const iconSpan = document.createElement('span');
  iconSpan.className = icon.cls;
  iconSpan.textContent = icon.symbol;
  span.appendChild(iconSpan);

  span.appendChild(document.createTextNode(' ' + item.text));

  if (item.highlight) {
    const strong = document.createElement('strong');
    strong.className = icon.cls;
    strong.textContent = item.highlight;
    span.appendChild(strong);
  }

  return span;
}

/**
 * Render items into #ticker-track, duplicating them for the seamless loop.
 * Builds content in a DocumentFragment before touching the live DOM so that
 * a mid-render error never leaves the track empty.
 */
function renderItems(items, track) {
  const fragment = document.createDocumentFragment();

  // Two copies — existing CSS animation relies on this for seamless loop
  for (let pass = 0; pass < 2; pass++) {
    items.forEach(item => fragment.appendChild(buildItem(item)));
  }

  // Atomic swap — only clears the live track once we have content ready
  track.innerHTML = '';
  track.appendChild(fragment);

  // Reset animation so the newly populated track restarts cleanly
  track.style.animation = 'none';
  void track.offsetWidth; // force reflow
  track.style.animation = '';
}

/**
 * Fetch live items from the webhook with a timeout.
 * Returns the parsed response or throws on failure/timeout.
 */
async function fetchLiveItems() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(WEBHOOK_URL, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Main: fetch → render, or fall back to static items.
 * Wrapped in a top-level try/catch so no failure path can produce an
 * unhandled rejection — the static Jekyll-rendered content always remains
 * visible if anything goes wrong before renderItems completes.
 */
async function loadTicker() {
  try {
    const wrapper = document.getElementById('live-intel-ticker');
    const track   = document.getElementById('ticker-track');
    if (!wrapper || !track) return;

    let items = FALLBACK_ITEMS;
    let generatedAt = null;

    try {
      const data = await fetchLiveItems();
      if (Array.isArray(data.items) && data.items.length > 0) {
        items = data.items;
        generatedAt = data.generated_at || null;
        console.log(
          `Hexius ticker: ${data.live_count || 0} live items, ${data.static_count || 0} static items`
        );
      }
    } catch {
      // Network error, timeout, non-OK status, bad JSON — use FALLBACK_ITEMS
    }

    renderItems(items, track);

    if (generatedAt) {
      wrapper.setAttribute('data-generated-at', generatedAt);
    }
  } catch {
    // Unexpected error in renderItems or DOM access — leave static content intact
  }
}

// Run once DOM is ready (module scripts are deferred, but guard anyway)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadTicker);
} else {
  loadTicker();
}

// Public API
window.hexiusTicker = {
  refresh: loadTicker,
};
