(async () => {
'use strict';

// ─── License Config ───────────────────────────────────────────────
const SCRIPT_URL  = 'https://script.google.com/macros/s/AKfycbyJJZOEEo3mLdmIU7VLKqhrDmECwTSupCLLt0JAbwcXtbOIzxwyF9DMX8E_Boqas0Q3tA/exec';
const KEY_LICENSE = 'cip_license_key';

async function checkLicense(key) {
  try {
    const res = await fetch(`${SCRIPT_URL}?key=${encodeURIComponent(key)}`);
    const txt = await res.text();
    return txt.trim() === 'active';
  } catch {
    return false;
  }
}

function showLicensePopup() {
  if (document.getElementById('_license_popup')) return;
  const overlay = document.createElement('div');
  overlay.id = '_license_popup';
  overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;z-index:99999999;backdrop-filter:blur(10px);font-family:sans-serif;`;
  overlay.innerHTML = `
    <div style="background:#1c1c2e;padding:32px;border-radius:18px;width:320px;color:#fff;border:1px solid #0faf59;text-align:center;">
      <div style="font-size:32px;margin-bottom:10px;">🔐</div>
      <h3 style="color:#0faf59;margin:0 0 6px;">Dubai Live Trade</h3>
      <p style="color:#888;font-size:12px;margin:0 0 20px;">Enter your license key to continue</p>
      <input id="_lic_inp" type="text" placeholder="License Key"
        style="width:100%;padding:12px;background:#25253d;border:1px solid #444;color:#fff;border-radius:8px;box-sizing:border-box;font-size:14px;outline:none;text-align:center;letter-spacing:1px;">
      <div id="_lic_msg" style="height:20px;margin-top:8px;font-size:12px;color:#ff3e3e;"></div>
      <button id="_lic_btn"
        style="width:100%;padding:13px;background:#0faf59;border:none;color:#fff;font-weight:bold;font-size:14px;cursor:pointer;border-radius:8px;margin-top:8px;">
        VERIFY KEY
      </button>
    </div>`;
  document.body.appendChild(overlay);

  const inp = document.getElementById('_lic_inp');
  const btn = document.getElementById('_lic_btn');
  const msg = document.getElementById('_lic_msg');

  btn.onclick = async () => {
    const key = inp.value.trim();
    if (!key) { msg.textContent = 'Please enter a key!'; return; }
    btn.textContent = 'Checking...';
    btn.style.background = '#555';
    btn.disabled = true;
    const valid = await checkLicense(key);
    if (valid) {
      localStorage.setItem(KEY_LICENSE, key);
      overlay.remove();
      init();
    } else {
      msg.textContent = '❌ Invalid key! Contact admin.';
      btn.textContent = 'VERIFY KEY';
      btn.style.background = '#0faf59';
      btn.disabled = false;
      inp.style.borderColor = '#ff3e3e';
    }
  };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });
}


// ─── Storage Keys ────────────────────────────────────────────────
const KEY_LB       = 'leaderboard';
const KEY_INIT     = 'initBalance';
const KEY_POSITION = 'lb_position';
const KEY_PNL      = 'manual_pnl';
const KEY_PNL_ON   = 'manual_pnl_on';
const KEY_PROGRESS = 'lb_progress'; // 0-100 percentage for the bar

// ─── Load saved state ─────────────────────────────────────────────
let initialBal    = Number(localStorage.getItem(KEY_INIT) || 0);
let manualPnl     = localStorage.getItem(KEY_PNL) !== null ? Number(localStorage.getItem(KEY_PNL)) : null;
let manualPnlOn   = localStorage.getItem(KEY_PNL_ON) === 'true';
let savedPosition = localStorage.getItem(KEY_POSITION) || null;
let savedProgress = localStorage.getItem(KEY_PROGRESS) !== null ? Number(localStorage.getItem(KEY_PROGRESS)) : null;

// ─── Selectors (same as original) ─────────────────────────────────
const selectors = {
  userName:            ".SfrTV.TmWTp",
  userBalance:         ".pVBHU",
  levelIcon:           ".ePf8T svg use, .lmj_k svg use",
  lbNameHeader:        '.xN5cX p',
  lbMoney:             '.BwWCZ',
  lbPosition:          '.footer__position-value, .position-value, [class*="position"] span, [class*="footer"] [class*="position"]',
  footer:              '.iKtL6',
  usermenuListItems:   "li.CWnO_",
  positionHeaderMoney: ".position__header-money.--green, .position__header-money.--red",
};

const $    = (s, c = document) => c.querySelector(s);
const $$   = (s, c = document) => Array.from(c.querySelectorAll(s));
const safeNum      = v => parseFloat((v || '0').toString().replace(/[^0-9.-]+/g, "")) || 0;
const formatAmount = v => '$' + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Hide Bonus Banner ───────────────────────────────────────────
// Inject a permanent CSS rule first — fastest & most reliable
(function injectBannerCSS() {
  const style = document.createElement('style');
  style.id = '_hide_bonus_banner_style';
  style.textContent = `
    /* Hide rocket bonus banner by known classes */
    .ylLrz { display: none !important; }
    [class*="bonus"] { display: none !important; }
    [class*="promo"] { display: none !important; }
    [class*="notification-bar"] { display: none !important; }
    [class*="top-bar"] { display: none !important; }
    [class*="alert-bar"] { display: none !important; }
  `;
  (document.head || document.documentElement).appendChild(style);
})();

function hideBonusBanner() {
  // 1. Direct class selector (most specific, fastest)
  document.querySelectorAll('.ylLrz').forEach(el => {
    el.style.setProperty('display', 'none', 'important');
  });

  // 2. Fallback: scan for elements with "bonus" + "50%" text
  document.querySelectorAll('*').forEach(el => {
    if (
      el.childElementCount < 8 &&
      el.offsetHeight > 0 &&
      el.offsetHeight < 120 &&
      (
        (/bonus/i.test(el.innerText) && /50%/i.test(el.innerText)) ||
        (/deposit/i.test(el.innerText) && /50%/i.test(el.innerText)) ||
        (/rocket/i.test(el.innerText) && /bonus/i.test(el.innerText))
      )
    ) {
      const target = el.closest('a, [class]') || el;
      target.style.setProperty('display', 'none', 'important');
    }
  });

  // 3. Extra: hide green top notification bars by background color
  document.querySelectorAll('*').forEach(el => {
    try {
      const style = window.getComputedStyle(el);
      const bg = style.backgroundColor;
      if (
        el.offsetHeight > 0 && el.offsetHeight < 60 &&
        el.offsetWidth > window.innerWidth * 0.7 &&
        bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' &&
        /bonus|deposit|50%/i.test(el.innerText || '')
      ) {
        el.style.setProperty('display', 'none', 'important');
      }
    } catch(e) {}
  });
}


// ─── URL: demo-trade → live-trade ────────────────────────────────
function fixUrl() {
  if (location.href.includes('/demo-trade')) {
    history.replaceState(null, '', location.href.replace('/demo-trade', '/live-trade'));
  }
}

// ─── Main UI Update (based on original logic) ─────────────────────
function updateUI() {
  fixUrl();
  hideBonusBanner(); // ← call on every UI update so banner never survives

  const balEl = $(selectors.userBalance);
  if (!balEl) return;

  const bal      = safeNum(balEl.textContent);
  const realDiff = bal - initialBal;
  const diff     = (manualPnlOn && manualPnl !== null) ? manualPnl : realDiff;

  // No +/- sign, just amount. Color shows profit/loss.
  const formattedDiff = formatAmount(Math.abs(diff));
  const pnlColor      = diff >= 0 ? "#0faf59" : "#ff3e3e";

  // Username → "Live"
  const nameEl = $(selectors.userName);
  if (nameEl && nameEl.textContent !== "Live") {
    nameEl.textContent      = "Live";
    nameEl.style.color      = "#0faf59";
    nameEl.style.fontWeight = "bold";
  }

  // Level icon
  const level = bal > 9999 ? 'vip' : (bal > 4999 ? 'pro' : 'standart');
  const icon  = $(selectors.levelIcon);
  if (icon) {
    const href = `/profile/images/spritemap.svg#icon-profile-level-${level}`;
    if (icon.getAttribute("xlink:href") !== href) icon.setAttribute("xlink:href", href);
  }

  // Demo / Live menu items
  const listItems = $$(selectors.usermenuListItems);
  const demoLi = listItems.find(li => /demo/i.test(li.innerText));
  const liveLi = listItems.find(li => /\blive\b/i.test(li.innerText));
  if (demoLi && liveLi) {
    if (demoLi.querySelector("b")) demoLi.querySelector("b").textContent = "$10,000.00";
    if (liveLi.querySelector("b")) liveLi.querySelector("b").textContent = formatAmount(bal);
    if (!liveLi.classList.contains('P5n2A')) {
      demoLi.classList.remove('P5n2A');
      liveLi.classList.add('P5n2A');
    }
  }

  // Position header profit/loss
  const profitEl = $(selectors.positionHeaderMoney);
  if (profitEl) {
    profitEl.innerText   = formattedDiff;
    profitEl.style.color = pnlColor;
  }

  // Leaderboard name
  const lbData = JSON.parse(localStorage.getItem(KEY_LB) || '{"name":"Live"}');
  $$(selectors.lbNameHeader).forEach(el => {
    if (el.textContent !== lbData.name) el.textContent = lbData.name;
  });

  // Leaderboard money
  $$(selectors.lbMoney).forEach(el => {
    el.textContent = formattedDiff;
    el.style.color = pnlColor;
  });

  // ─── Your position: display ───────────────────────────────────────
  if (savedPosition) {
    updatePositionDisplay(savedPosition);
  }

  // ─── Progress bar (h38TV track, KBHoM fill) ───────────────────────
  if (savedProgress !== null) {
    updateProgressBar(savedProgress, diff);
  }
}


// ─── Position Display ("Your position:") ─────────────────────────
// DOM structure: <div class="iKtL6"><div class="ocuJC">Your position:</div>-</div>
// The "-" is a direct text node inside .iKtL6, after the .ocuJC child div
function updatePositionDisplay(posValue) {
  if (!posValue) return;

  document.querySelectorAll('.iKtL6').forEach(wrapper => {
    // Confirm this is the "Your position:" container
    const label = wrapper.querySelector('.ocuJC');
    if (!label || !/your\s+position/i.test(label.textContent)) return;

    // Find the direct text node (the "-" or previous value) and replace it
    wrapper.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent = posValue;
      }
    });
  });
}

// ─── Progress Bar (.h38TV track → .KBHoM fill) ───────────────────
// <div class="h38TV"><span class="KBHoM" style="width: 0%;"></span></div>
function updateProgressBar(pct, diff) {
  const clampedPct = Math.min(100, Math.max(0, pct));
  const barColor   = diff >= 0 ? '#0faf59' : '#ff3e3e';

  document.querySelectorAll('.KBHoM').forEach(fill => {
    fill.style.setProperty('width', clampedPct + '%', 'important');
    fill.style.setProperty('background-color', barColor, 'important');
    fill.style.setProperty('background',       barColor, 'important');
  });
}

// ─── MutationObserver ─────────────────────────────────────────────
let uiTimeout;
const observer = new MutationObserver(() => {
  clearTimeout(uiTimeout);
  uiTimeout = setTimeout(updateUI, 50);
});
observer.observe(document.body, { childList: true, subtree: true, characterData: true });

// ─── Floating 🎯 Button — auto-hides after 10s ────────────────────
let hideTimer = null;

function showFloatingBtn() {
  let btn = document.getElementById('_lb_float_btn');
  if (!btn) {
    btn = document.createElement('div');
    btn.id = '_lb_float_btn';
    btn.title = 'Leaderboard Settings';
    btn.textContent = '🎯';
    btn.style.cssText = `
      position:fixed;bottom:130px;right:16px;
      width:42px;height:42px;
      background:#1c1c2e;border:2px solid #0faf59;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:20px;cursor:pointer;z-index:99999;
      box-shadow:0 2px 14px rgba(15,175,89,0.4);
      transition:opacity 0.5s ease;
      opacity:1;
    `;
    btn.addEventListener('click', openPositionPopup);
    document.body.appendChild(btn);
  }
  btn.style.opacity       = '1';
  btn.style.display       = 'flex';
  btn.style.pointerEvents = 'auto';

  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    btn.style.opacity = '0';
    setTimeout(() => {
      btn.style.display       = 'none';
      btn.style.pointerEvents = 'none';
    }, 500);
  }, 10000);
}

// ─── Extension icon click → show button again ─────────────────────
// window event use kar rahe hain kyunki MAIN world mein chrome.runtime nahi hota
window.addEventListener('_ext_showBtn', () => showFloatingBtn());

// ─── Leaderboard Settings Popup ───────────────────────────────────
function openPositionPopup() {
  if (document.getElementById('_pos_popup')) return;

  const lbData     = JSON.parse(localStorage.getItem(KEY_LB) || '{"name":"Live"}');
  const currentPnl = (manualPnlOn && manualPnl !== null) ? Math.abs(manualPnl) : '';
  const isLoss     = manualPnlOn && manualPnl !== null && manualPnl < 0;

  const overlay = document.createElement('div');
  overlay.id = '_pos_popup';
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.88);display:flex;
    align-items:center;justify-content:center;
    z-index:9999999;backdrop-filter:blur(7px);
  `;

  overlay.innerHTML = `
    <div style="background:#1c1c2e;padding:26px;border-radius:16px;width:330px;
                color:#fff;border:1px solid #0faf59;font-family:sans-serif;">

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
        <span style="color:#0faf59;font-size:15px;font-weight:bold;">⚙️ Leaderboard Settings</span>
        <span id="_pos_close" style="cursor:pointer;font-size:20px;color:#aaa;line-height:1;">✕</span>
      </div>

      <label style="font-size:11px;color:#888;display:block;margin-bottom:3px;">Display Name</label>
      <input id="_inp_name" value="${lbData.name}" placeholder="Name"
        style="width:100%;padding:10px;margin-bottom:12px;background:#25253d;
               border:1px solid #444;color:#fff;border-radius:8px;
               box-sizing:border-box;font-size:13px;outline:none;">

      <label style="font-size:11px;color:#888;display:block;margin-bottom:3px;">Leaderboard Position #</label>
      <input id="_inp_pos" type="number" min="1" value="${savedPosition || ''}" placeholder="e.g. 3"
        style="width:100%;padding:10px;margin-bottom:12px;background:#25253d;
               border:1px solid #444;color:#fff;border-radius:8px;
               box-sizing:border-box;font-size:13px;outline:none;">

      <label style="font-size:11px;color:#888;display:block;margin-bottom:3px;">Progress Bar % (0-100)</label>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <input id="_inp_progress" type="range" min="0" max="100"
          value="${savedProgress !== null ? savedProgress : 0}"
          style="flex:1;accent-color:#0faf59;cursor:pointer;">
        <span id="_progress_val" style="min-width:38px;text-align:right;font-size:13px;color:#0faf59;font-weight:bold;">
          ${savedProgress !== null ? savedProgress : 0}%
        </span>
      </div>
      <!-- Mini bar preview -->
      <div style="width:100%;height:4px;background:#333;border-radius:2px;margin-bottom:14px;">
        <div id="_progress_preview" style="height:4px;border-radius:2px;background:#0faf59;
          width:${savedProgress !== null ? savedProgress : 0}%;transition:width 0.2s;"></div>
      </div>

      <label style="font-size:11px;color:#888;display:block;margin-bottom:3px;">Amount</label>
      <input id="_inp_pnl" type="number" min="0" value="${currentPnl}" placeholder="e.g. 250"
        style="width:100%;padding:10px;margin-bottom:10px;background:#25253d;
               border:1px solid ${isLoss ? '#ff3e3e' : '#0faf59'};color:#fff;border-radius:8px;
               box-sizing:border-box;font-size:13px;outline:none;">

      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <button id="_btn_profit"
          style="flex:1;padding:10px;
                 border:2px solid ${!isLoss ? '#0faf59' : '#444'};
                 background:${!isLoss ? '#0faf59' : 'transparent'};
                 color:#fff;border-radius:8px;cursor:pointer;font-size:13px;font-weight:bold;">
          Profit
        </button>
        <button id="_btn_loss"
          style="flex:1;padding:10px;
                 border:2px solid ${isLoss ? '#ff3e3e' : '#444'};
                 background:${isLoss ? '#ff3e3e' : 'transparent'};
                 color:#fff;border-radius:8px;cursor:pointer;font-size:13px;font-weight:bold;">
          Loss
        </button>
      </div>

      <div id="_pnl_preview"
        style="text-align:center;font-size:22px;font-weight:bold;
               margin-bottom:12px;padding:10px;background:#25253d;border-radius:8px;
               color:${isLoss ? '#ff3e3e' : '#0faf59'}">
        ${currentPnl !== '' ? formatAmount(Number(currentPnl)) : '—'}
      </div>

      <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
        <div id="_toggle_bg" style="width:42px;height:24px;border-radius:24px;
             background:${manualPnlOn ? '#0faf59' : '#444'};
             position:relative;cursor:pointer;transition:background .3s;flex-shrink:0;">
          <div id="_toggle_dot" style="width:18px;height:18px;background:#fff;border-radius:50%;
               position:absolute;top:3px;left:${manualPnlOn ? '21px' : '3px'};
               transition:left .3s;"></div>
        </div>
        <span style="font-size:12px;color:#ccc;">Override with manual amount</span>
      </div>

      <button id="_btn_apply"
        style="width:100%;padding:13px;background:#0faf59;border:none;
               color:#fff;font-weight:bold;font-size:14px;
               cursor:pointer;border-radius:8px;letter-spacing:.5px;">
        ✅ Apply & Save
      </button>
    </div>`;

  document.body.appendChild(overlay);

  let isLossSelected = isLoss;
  const pnlInp     = document.getElementById('_inp_pnl');
  const pnlPreview = document.getElementById('_pnl_preview');
  const btnProfit  = document.getElementById('_btn_profit');
  const btnLoss    = document.getElementById('_btn_loss');

  function setMode(loss) {
    isLossSelected = loss;
    btnProfit.style.background  = loss ? 'transparent' : '#0faf59';
    btnProfit.style.borderColor = loss ? '#444' : '#0faf59';
    btnLoss.style.background    = loss ? '#ff3e3e' : 'transparent';
    btnLoss.style.borderColor   = loss ? '#ff3e3e' : '#444';
    pnlInp.style.borderColor    = loss ? '#ff3e3e' : '#0faf59';
    refreshPreview();
  }

  function refreshPreview() {
    const v = Math.abs(Number(pnlInp.value) || 0);
    pnlPreview.textContent = formatAmount(v);
    pnlPreview.style.color = isLossSelected ? '#ff3e3e' : '#0faf59';
  }

  pnlInp.addEventListener('input', refreshPreview);
  btnProfit.onclick = () => setMode(false);
  btnLoss.onclick   = () => setMode(true);

  // Progress bar slider live update
  const progressInp     = document.getElementById('_inp_progress');
  const progressVal     = document.getElementById('_progress_val');
  const progressPreview = document.getElementById('_progress_preview');
  progressInp.addEventListener('input', () => {
    const pct = progressInp.value;
    progressVal.textContent     = pct + '%';
    progressPreview.style.width = pct + '%';
    progressPreview.style.background = isLossSelected ? '#ff3e3e' : '#0faf59';
  });

  let toggleOn = manualPnlOn;
  const toggleBg  = document.getElementById('_toggle_bg');
  const toggleDot = document.getElementById('_toggle_dot');
  toggleBg.onclick = () => {
    toggleOn = !toggleOn;
    toggleBg.style.background = toggleOn ? '#0faf59' : '#444';
    toggleDot.style.left      = toggleOn ? '21px' : '3px';
  };

  document.getElementById('_pos_close').onclick = () => overlay.remove();
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

  document.getElementById('_btn_apply').onclick = () => {
    const nameVal     = document.getElementById('_inp_name').value.trim() || 'Live';
    const posVal      = document.getElementById('_inp_pos').value.trim();
    const absVal      = Math.abs(Number(pnlInp.value) || 0);
    const pnlVal      = isLossSelected ? -absVal : absVal;
    const progressPct = Number(progressInp.value);

    localStorage.setItem(KEY_LB, JSON.stringify({ name: nameVal }));
    if (posVal) {
      savedPosition = posVal;
      localStorage.setItem(KEY_POSITION, posVal);
    }
    savedProgress = progressPct;
    localStorage.setItem(KEY_PROGRESS, progressPct);
    manualPnl   = pnlVal;
    manualPnlOn = toggleOn;
    localStorage.setItem(KEY_PNL,    pnlVal);
    localStorage.setItem(KEY_PNL_ON, toggleOn ? 'true' : 'false');
    overlay.remove();
    updateUI();
  };
}

// ─── Main Settings Popup (Deposit button — same as original) ──────
function openSettings() {
  if (document.getElementById('live-settings-popup')) return;
  const ub = safeNum($(selectors.userBalance)?.textContent) || 0;
  const modal = document.createElement('div');
  modal.id = 'live-settings-popup';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:999999;backdrop-filter:blur(8px);';
  modal.innerHTML = `
    <div style="background:#1c1c2e;padding:30px;border-radius:15px;width:320px;color:#fff;border:1px solid #0faf59;text-align:center;font-family:sans-serif;">
      <h3 style="color:#0faf59;margin-bottom:20px;">Dubai Live Trade</h3>
      <input id="inp-name" placeholder="Display Name" value="Live"
        style="width:100%;padding:12px;margin-bottom:10px;background:#25253d;border:1px solid #444;color:#fff;border-radius:8px;box-sizing:border-box;">
      <input id="inp-init" type="number" placeholder="Initial Balance"
        style="width:100%;padding:12px;margin-bottom:20px;background:#25253d;border:1px solid #444;color:#fff;border-radius:8px;box-sizing:border-box;">
      <button id="btn-save"
        style="width:100%;padding:14px;background:#0faf59;border:none;color:#fff;font-weight:bold;cursor:pointer;border-radius:8px;">
        ACTIVATE NOW
      </button>
    </div>`;
  document.body.appendChild(modal);

  document.getElementById('btn-save').onclick = () => {
    initialBal = ub - (Number(document.getElementById('inp-init').value) || 0);
    localStorage.setItem(KEY_INIT, initialBal);
    localStorage.setItem(KEY_LB, JSON.stringify({ name: document.getElementById('inp-name').value || 'Live' }));
    modal.remove();
    updateUI();
  };
}

// ─── Deposit button click ─────────────────────────────────────────
document.addEventListener('click', e => {
  if (e.target.closest('a, button') && /deposit/i.test(e.target.textContent)) {
    e.preventDefault();
    openSettings();
  }
}, true);


// ─── Init ─────────────────────────────────────────────────────────
function init() {
  hideBonusBanner();
  setTimeout(() => {
    fixUrl();
    hideBonusBanner();
    showFloatingBtn();
    updateUI();
  }, 1200);
}

// ─── Startup: Check License ───────────────────────────────────────
(async () => {
  const savedKey = localStorage.getItem(KEY_LICENSE);
  if (savedKey) {
    const valid = await checkLicense(savedKey);
    if (valid) {
      init();
    } else {
      localStorage.removeItem(KEY_LICENSE);
      showLicensePopup();
    }
  } else {
    showLicensePopup();
  }
})();

})();
