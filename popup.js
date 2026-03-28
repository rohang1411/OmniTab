/**
 * OmniTab — popup.js
 * Zero dependencies | Vanilla JS | Cross-browser (MV3 + Firefox WebExtensions)
 *
 * Cross-browser API bridge:
 *   Chrome/Edge/Arc/Brave use `chrome.*`
 *   Firefox exposes both `browser.*` (Promises) and `chrome.*` (callbacks)
 *   We normalise to `chrome.*` with callback style — works in all targets.
 */

'use strict';

// ─── Cross-browser shim ────────────────────────────────────────────────────
const ext = (typeof browser !== 'undefined') ? browser : chrome;

// ─── DOM refs ──────────────────────────────────────────────────────────────
const btnPack          = document.getElementById('btn-pack');
const btnRaw           = document.getElementById('btn-raw');
const btnUnpack        = document.getElementById('btn-unpack');
const btnUnpackNewWin  = document.getElementById('btn-unpack-new-window');
const b64Input         = document.getElementById('base64-input');
const tabLabel         = document.getElementById('tab-count-label');
const toastEl          = document.getElementById('toast');

// ─── Toast ─────────────────────────────────────────────────────────────────
let toastTimer = null;

function showToast(message, type = 'success', duration = 2200) {
  clearTimeout(toastTimer);
  toastEl.textContent  = message;
  toastEl.className    = `toast ${type} show`;
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, duration);
}

// ─── Ripple effect ─────────────────────────────────────────────────────────
function attachRipple(btn) {
  btn.addEventListener('pointerdown', (e) => {
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.cssText = `
      width: ${size}px; height: ${size}px;
      left: ${e.clientX - rect.left - size / 2}px;
      top:  ${e.clientY - rect.top  - size / 2}px;
    `;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
}

[btnPack, btnRaw, btnUnpack, btnUnpackNewWin].forEach(attachRipple);

// ─── Unicode-safe Base64 encoding ──────────────────────────────────────────
/**
 * btoa() only handles Latin-1. URLs can contain Unicode (e.g. international
 * domain names, path segments). We use encodeURIComponent + unescape trick
 * which is universally supported and requires zero deps.
 */
function toBase64(str) {
  return btoa(
    encodeURIComponent(str).replace(
      /%([0-9A-F]{2})/g,
      (_, p1) => String.fromCharCode(parseInt(p1, 16))
    )
  );
}

function fromBase64(b64) {
  return decodeURIComponent(
    Array.from(atob(b64))
      .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('')
  );
}

// ─── Clipboard helper ──────────────────────────────────────────────────────
/**
 * Prefer navigator.clipboard (async, MV3-friendly).
 * Fall back to document.execCommand for older contexts / Firefox MV2.
 */
async function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
}

// ─── Get tabs in current window ────────────────────────────────────────────
function getCurrentWindowTabs() {
  return new Promise((resolve, reject) => {
    ext.tabs.query({ currentWindow: true }, (tabs) => {
      if (ext.runtime.lastError) return reject(ext.runtime.lastError);
      resolve(tabs);
    });
  });
}

// ─── Initialise: show tab count ────────────────────────────────────────────
(async () => {
  try {
    const tabs = await getCurrentWindowTabs();
    const count = tabs.length;
    tabLabel.textContent = `${count} tab${count !== 1 ? 's' : ''} in this window`;
  } catch {
    tabLabel.textContent = 'Could not read tabs';
  }
})();

// ─── Feature 1: Pack → Base64 ──────────────────────────────────────────────
btnPack.addEventListener('click', async () => {
  btnPack.disabled = true;
  try {
    const tabs = await getCurrentWindowTabs();
    const urls = tabs
      .map(t => t.url)
      .filter(u => u && !u.startsWith('about:') && !u.startsWith('chrome:') && !u.startsWith('edge:'));

    if (urls.length === 0) {
      showToast('No packable tabs found', 'error');
      return;
    }

    const json   = JSON.stringify(urls);
    const b64    = toBase64(json);

    await copyToClipboard(b64);
    showToast(`✓ Packed ${urls.length} tab${urls.length !== 1 ? 's' : ''} — copied!`, 'success');
  } catch (err) {
    console.error('[OmniTab] Pack error:', err);
    showToast('Error packing tabs', 'error');
  } finally {
    btnPack.disabled = false;
  }
});

// ─── Feature 3: Raw Export ─────────────────────────────────────────────────
btnRaw.addEventListener('click', async () => {
  btnRaw.disabled = true;
  try {
    const tabs = await getCurrentWindowTabs();
    const urls = tabs
      .map(t => t.url)
      .filter(u => u && !u.startsWith('about:') && !u.startsWith('chrome:') && !u.startsWith('edge:'));

    if (urls.length === 0) {
      showToast('No exportable tabs found', 'error');
      return;
    }

    await copyToClipboard(urls.join('\n'));
    showToast(`✓ ${urls.length} raw URL${urls.length !== 1 ? 's' : ''} copied!`, 'success');
  } catch (err) {
    console.error('[OmniTab] Raw export error:', err);
    showToast('Error exporting tabs', 'error');
  } finally {
    btnRaw.disabled = false;
  }
});

// ─── Shared: parse + validate a Base64 payload ────────────────────────────
function parsePayload() {
  const raw = b64Input.value.trim();
  if (!raw) return null;

  let urls;
  try {
    urls = JSON.parse(fromBase64(raw));
  } catch {
    return 'invalid';
  }

  if (!Array.isArray(urls) || urls.length === 0) return 'empty';

  const validUrls = urls.filter(u => {
    try { return Boolean(new URL(u)); } catch { return false; }
  });

  return validUrls.length > 0 ? validUrls : 'empty';
}

// ─── Feature 2a: Unpack → Open in current window ───────────────────────────
btnUnpack.addEventListener('click', async () => {
  const raw = b64Input.value.trim();
  if (!raw) {
    showToast('Paste a Base64 string first', 'error');
    b64Input.focus();
    return;
  }

  btnUnpack.disabled = true;

  const result = parsePayload();

  if (result === null) {
    showToast('Paste a Base64 string first', 'error');
    b64Input.focus();
    btnUnpack.disabled = false;
    return;
  }
  if (result === 'invalid') {
    showToast('Invalid Base64 or format', 'error');
    btnUnpack.disabled = false;
    return;
  }
  if (result === 'empty') {
    showToast('No valid URLs found in payload', 'error');
    btnUnpack.disabled = false;
    return;
  }

  const validUrls = result;

  try {
    // Open tabs with a 50 ms micro-delay to prevent browser throttling/blocking
    let opened = 0;
    for (const url of validUrls) {
      await new Promise((resolve) => {
        ext.tabs.create({ url, active: false }, () => {
          if (ext.runtime.lastError) {
            console.warn('[OmniTab] Could not open:', url, ext.runtime.lastError.message);
          } else {
            opened++;
          }
          setTimeout(resolve, 50);
        });
      });
    }
    showToast(`✓ Opened ${opened} tab${opened !== 1 ? 's' : ''} in this window`, 'success');
    b64Input.value = '';
  } catch (err) {
    console.error('[OmniTab] Unpack error:', err);
    showToast('Unexpected error during unpack', 'error');
  } finally {
    btnUnpack.disabled = false;
  }
});

// ─── Feature 2b: Unpack → Open in NEW window ───────────────────────────────
/**
 * windows.create({ url: [...] }) opens all URLs simultaneously as separate
 * tabs inside a brand-new browser window — one API call, no per-tab loop.
 * This is the ideal path for the cross-browser workflow:
 *   Pack in Chrome → share Base64 → Unpack in Firefox (or any other browser)
 * Both browsers handle windows.create identically (Chrome, Firefox, Edge, Arc).
 */
btnUnpackNewWin.addEventListener('click', async () => {
  const raw = b64Input.value.trim();
  if (!raw) {
    showToast('Paste a Base64 string first', 'error');
    b64Input.focus();
    return;
  }

  btnUnpackNewWin.disabled = true;

  const result = parsePayload();

  if (result === null) {
    showToast('Paste a Base64 string first', 'error');
    b64Input.focus();
    btnUnpackNewWin.disabled = false;
    return;
  }
  if (result === 'invalid') {
    showToast('Invalid Base64 or format', 'error');
    btnUnpackNewWin.disabled = false;
    return;
  }
  if (result === 'empty') {
    showToast('No valid URLs found in payload', 'error');
    btnUnpackNewWin.disabled = false;
    return;
  }

  const validUrls = result;

  try {
    await new Promise((resolve, reject) => {
      ext.windows.create({ url: validUrls, focused: true }, (win) => {
        if (ext.runtime.lastError) return reject(ext.runtime.lastError);
        resolve(win);
      });
    });
    showToast(`✓ Opened ${validUrls.length} tab${validUrls.length !== 1 ? 's' : ''} in a new window`, 'success');
    b64Input.value = '';
  } catch (err) {
    console.error('[OmniTab] New-window unpack error:', err);
    showToast('Could not open new window', 'error');
  } finally {
    btnUnpackNewWin.disabled = false;
  }
});
