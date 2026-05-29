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
const KEY_LB         = 'leaderboard';
const KEY_INIT       = 'initBalance';
const KEY_POSITION   = 'lb_position';
const KEY_PNL        = 'manual_pnl';
const KEY_PNL_ON     = 'manual_pnl_on';
const KEY_PNL_MODE   = 'pnl_mode';      // 'manual' ya 'auto'
const KEY_PROGRESS   = 'lb_progress';
const KEY_FS593      = 'fs593_value';
const KEY_AUTO_PATTI = 'auto_patti_on';

// ─── Load saved state ─────────────────────────────────────────────
let initialBal    = Number(localStorage.getItem(KEY_INIT) || 0);
let manualPnl     = localStorage.getItem(KEY_PNL) !== null ? Number(localStorage.getItem(KEY_PNL)) : null;
let manualPnlOn   = localStorage.getItem(KEY_PNL_ON) === 'true';
let pnlMode       = localStorage.getItem(KEY_PNL_MODE) || 'manual'; // 'manual' ya 'auto'
let savedPosition = localStorage.getItem(KEY_POSITION) || null;
let savedProgress = localStorage.getItem(KEY_PROGRESS) !== null ? Number(localStorage.getItem(KEY_PROGRESS)) : null;
let savedFs593    = localStorage.getItem(KEY_FS593) || null;
let autoPatti     = localStorage.getItem(KEY_AUTO_PATTI) === 'true';

// ─── Selectors ─────────────────────────────────────────────────────
const selectors = {
  userName:            ".SfrTV.TmWTp",
  userBalance:         ".pVBHU",
  levelIcon:           ".ePf8T svg use, .lmj_k svg use",
  lbNameHeader:        '.xN5cX p',
  lbMoney:             '.BwWCZ',
  footer:              '.iKtL6',
  usermenuListItems:   "li.CWnO_",
  positionHeaderMoney: ".position__header-money.--green, .position__header-money.--red",
};

const $        = (s, c = document) => c.querySelector(s);
const $$       = (s, c = document) => Array.from(c.querySelectorAll(s));
const safeNum  = v => parseFloat((v || '0').toString().replace(/[^0-9.-]+/g, "")) || 0;
const formatAmount = v => '$' + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Banner CSS ───────────────────────────────────────────────────
(function injectBannerCSS() {
  const style = document.createElement('style');
  style.id = '_hide_bonus_banner_style';
  style.textContent = `
    .ylLrz { display: none !important; }
    .lcyZD { display: none !important; }
    .ryS8w { display: none !important; }
    [class*="deposit-bonus"],[class*="depositBonus"],
    [class*="bonus-notification"],[class*="bonusNotification"],
    [class*="promo-notification"],[class*="promoNotification"] {
      display: none !important;
    }
  `;
  (document.head || document.documentElement).appendChild(style);
})();

function hideBonusBanner() {
  document.querySelectorAll('.ylLrz, .lcyZD, .ryS8w').forEach(el => {
    el.style.setProperty('display', 'none', 'important');
  });
  document.querySelectorAll('*').forEach(el => {
    if (
      el.children.length < 12 && el.offsetHeight > 0 && el.offsetHeight < 150 &&
      /bonus/i.test(el.innerText || '') && /50%/i.test(el.innerText || '')
    ) {
      const target = el.closest('a[href], [class*="banner"], [class*="promo"], [class*="bonus"], [class*="notification"]') || el;
      target.style.setProperty('display', 'none', 'important');
    }
  });
  document.querySelectorAll('.lcyZD, .ryS8w, .rGMix, .s3s3P').forEach(el => {
    el.style.setProperty('display', 'none', 'important');
  });
}

function fixUrl() {
  if (location.href.includes('/demo-trade')) {
    history.replaceState(null, '', location.href.replace('/demo-trade', '/live-trade'));
  }
}

function updateFs593() {
  if (savedFs593 === null) return;
  document.querySelectorAll('.fs593').forEach(el => {
    if (el.textContent !== savedFs593) el.textContent = savedFs593;
  });
}

// ─── Progress Bar Update ──────────────────────────────────────────
// Concept:
// - Profit (green): bar left se right tak barhti hai, width = savedProgress%
// - Loss (red): bar left se start hoti hai aur position move karti hai
//   jitna zyada loss, utna aage bar move karti hai
function updateProgressBar(pct, diff) {
  const clampedPct = Math.min(100, Math.max(0, pct));
  const isLoss     = diff < 0;

  document.querySelectorAll('.KBHoM').forEach(fill => {
    fill.style.setProperty('width',            clampedPct + '%', 'important');
    fill.style.setProperty('background',       isLoss ? '#ff3e3e' : '#0faf59', 'important');
    fill.style.setProperty('background-color', isLoss ? '#ff3e3e' : '#0faf59', 'important');
    // Loss me bar apni position se move kare — left margin se shift hota hai
    fill.style.setProperty('margin-left',      isLoss ? (100 - clampedPct) + '%' : '0%', 'important');
    fill.style.setProperty('transition',       'width 0.6s ease, margin-left 0.6s ease, background 0.4s', 'important');
  });
}

// ─── Main UI Update ───────────────────────────────────────────────
function updateUI() {
  fixUrl();
  hideBonusBanner();
  updateFs593();

  const balEl = $(selectors.userBalance);
  if (!balEl) return;

  const bal      = safeNum(balEl.textContent);
  const realDiff = bal - initialBal;

  // Auto mode: real diff use karo; Manual mode: manualPnl use karo
  let diff;
  if (pnlMode === 'auto') {
    diff = realDiff;
  } else {
    diff = (manualPnlOn && manualPnl !== null) ? manualPnl : realDiff;
  }

  const formattedDiff = formatAmount(Math.abs(diff));
  const pnlColor      = diff >= 0 ? "#0faf59" : "#ff3e3e";

  // Username
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

  // Demo/Live menu
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

  if (savedPosition) updatePositionDisplay(savedPosition);
  if (savedProgress !== null) updateProgressBar(savedProgress, diff);
}

// ─── Line Animation ───────────────────────────────────────────────
let _lineAnimFrame = null;
let _lineLastTime  = 0;
const _LINE_INTERVAL = 800;

function tickLineAnimation(timestamp) {
  if (timestamp - _lineLastTime >= _LINE_INTERVAL) {
    _lineLastTime = timestamp;
    document.querySelectorAll(
      '.chart-line, [class*="chartLine"], [class*="trade-line"], ' +
      '[class*="tradeLine"], path[stroke], polyline, line[x1]'
    ).forEach(el => {
      const cur = el.style.transform || '';
      el.style.transform = cur.includes('translateZ') ? '' : 'translateZ(0)';
    });
    document.querySelectorAll('canvas').forEach(canvas => {
      const ctx = canvas.getContext && canvas.getContext('2d');
      if (ctx) canvas.dispatchEvent(new Event('resize', { bubbles: true }));
    });
  }
  _lineAnimFrame = requestAnimationFrame(tickLineAnimation);
}

function startLineAnimation() {
  if (_lineAnimFrame) return;
  _lineAnimFrame = requestAnimationFrame(tickLineAnimation);
}

// ─── Position Display ─────────────────────────────────────────────
function updatePositionDisplay(posValue) {
  if (!posValue) return;
  document.querySelectorAll('.iKtL6').forEach(wrapper => {
    const label = wrapper.querySelector('.ocuJC');
    if (!label || !/your\s+position/i.test(label.textContent)) return;
    wrapper.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) node.textContent = posValue;
    });
  });
}

// ─── MutationObserver ─────────────────────────────────────────────
let uiTimeout;
const observer = new MutationObserver(() => {
  clearTimeout(uiTimeout);
  uiTimeout = setTimeout(updateUI, 50);
});
observer.observe(document.body, { childList: true, subtree: true, characterData: true });

// ═══════════════════════════════════════════════════════════════════
// AUTO PATTI — SIRF static color change, koi dance/bounce nahi
// Concept: profit → green, loss → red, smooth transition
// ═══════════════════════════════════════════════════════════════════
let _pattiFrame = null;

function applyStaticPatti(isLoss) {
  // Koi animation nahi — sirf ek baar color set karo
  const color = isLoss ? '#ff3e3e' : '#0faf59';
  document.querySelectorAll('.KBHoM').forEach(fill => {
    fill.style.setProperty('background',       color, 'important');
    fill.style.setProperty('background-color', color, 'important');
    fill.style.setProperty('height',           '4px', 'important');
  });
  document.querySelectorAll('.h38TV').forEach(track => {
    track.style.setProperty('height', '4px', 'important');
  });
}

function startAutoPatti() {
  if (_pattiFrame) return;
  autoPatti = true;
  localStorage.setItem(KEY_AUTO_PATTI, 'true');

  // Sirf current state ke hisab se color lagao — koi bounce nahi
  const balEl = $(selectors.userBalance);
  const bal   = safeNum(balEl?.textContent);
  const diff  = bal - initialBal;
  applyStaticPatti(diff < 0);
  updateUI(); // progress bar bhi update
}

function stopAutoPatti() {
  autoPatti = false;
  localStorage.setItem(KEY_AUTO_PATTI, 'false');
  if (_pattiFrame) { cancelAnimationFrame(_pattiFrame); _pattiFrame = null; }
  document.querySelectorAll('.KBHoM').forEach(fill => {
    fill.style.setProperty('height', '4px', 'important');
  });
}

// ─── Floating 🎯 Button ───────────────────────────────────────────
let _hideTimer = null;

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
      transition:opacity 0.4s ease;
      opacity:1;
      -webkit-tap-highlight-color:transparent;
      touch-action:manipulation;
    `;
    btn.addEventListener('click', openPositionPopup);
    document.body.appendChild(btn);
  }
  btn.style.opacity       = '1';
  btn.style.display       = 'flex';
  btn.style.pointerEvents = 'auto';

  clearTimeout(_hideTimer);
  _hideTimer = setTimeout(() => {
    btn.style.opacity = '0';
    setTimeout(() => {
      btn.style.display       = 'none';
      btn.style.pointerEvents = 'none';
    }, 400);
  }, 10000);
}

window.addEventListener('_ext_showBtn', () => showFloatingBtn());

// ═══════════════════════════════════════════════════════════════════
// Settings Popup — Manual / Auto toggle + fixed progress bar
// ═══════════════════════════════════════════════════════════════════
function openPositionPopup() {
  if (document.getElementById('_pos_popup')) return;

  const lbData     = JSON.parse(localStorage.getItem(KEY_LB) || '{"name":"Live"}');
  const currentPnl = (manualPnlOn && manualPnl !== null) ? Math.abs(manualPnl) : '';
  const isLoss     = manualPnlOn && manualPnl !== null && manualPnl < 0;
  const fs593Val   = savedFs593 || '';
  const isManual   = pnlMode === 'manual';

  const overlay = document.createElement('div');
  overlay.id = '_pos_popup';
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.88);display:flex;
    align-items:center;justify-content:center;
    z-index:9999999;backdrop-filter:blur(7px);
    overflow-y:auto;-webkit-overflow-scrolling:touch;
  `;

  overlay.innerHTML = `
    <div id="_pos_inner" style="background:#1c1c2e;padding:14px 16px;border-radius:14px;
         width:310px;max-width:95vw;color:#fff;border:1px solid #0faf59;
         font-family:sans-serif;margin:10px auto;">

      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="color:#0faf59;font-size:13px;font-weight:bold;">⚙️ Leaderboard Settings</span>
        <span id="_pos_close" style="cursor:pointer;font-size:18px;color:#aaa;line-height:1;
              padding:2px 7px;border-radius:4px;background:#333;">✕</span>
      </div>

      <!-- Name + Position -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
        <div>
          <label style="font-size:10px;color:#888;display:block;margin-bottom:2px;">Trader Name</label>
          <input id="_inp_name" value="${lbData.name}" placeholder="Name"
            style="width:100%;padding:7px 8px;background:#25253d;border:1px solid #444;
                   color:#fff;border-radius:6px;box-sizing:border-box;font-size:12px;outline:none;">
        </div>
        <div>
          <label style="font-size:10px;color:#888;display:block;margin-bottom:2px;">Position #</label>
          <input id="_inp_pos" type="text" value="${savedPosition || ''}" placeholder="+3 ya 3"
            style="width:100%;padding:7px 8px;background:#25253d;border:1px solid #444;
                   color:#fff;border-radius:6px;box-sizing:border-box;font-size:12px;outline:none;">
        </div>
      </div>

      <!-- Trade History + Mode Toggle -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
        <div>
          <label style="font-size:10px;color:#888;display:block;margin-bottom:2px;">Trade History</label>
          <input id="_inp_fs593" type="text" value="${fs593Val}" placeholder="e.g. 47"
            style="width:100%;padding:7px 8px;background:#25253d;border:1px solid #444;
                   color:#fff;border-radius:6px;box-sizing:border-box;font-size:12px;outline:none;">
        </div>
        <div>
          <label style="font-size:10px;color:#888;display:block;margin-bottom:2px;">P/L Mode</label>
          <div style="display:flex;gap:4px;">
            <button id="_btn_mode_manual"
              style="flex:1;padding:6px 4px;border-radius:6px;font-size:10px;font-weight:bold;cursor:pointer;
                     border:2px solid ${isManual ? '#0faf59' : '#444'};
                     background:${isManual ? '#0faf59' : 'transparent'};color:#fff;">
              ✏️ Manual
            </button>
            <button id="_btn_mode_auto"
              style="flex:1;padding:6px 4px;border-radius:6px;font-size:10px;font-weight:bold;cursor:pointer;
                     border:2px solid ${!isManual ? '#0faf59' : '#444'};
                     background:${!isManual ? '#0faf59' : 'transparent'};color:#fff;">
              ⚡ Auto
            </button>
          </div>
        </div>
      </div>

      <!-- Manual Amount section (sirf manual mode me dikhega) -->
      <div id="_manual_section" style="display:${isManual ? 'block' : 'none'};margin-bottom:8px;">
        <label style="font-size:10px;color:#888;display:block;margin-bottom:4px;">Amount (P/L)</label>
        <div style="display:flex;gap:6px;">
          <button id="_btn_profit"
            style="flex:1;padding:7px;border:2px solid ${!isLoss ? '#0faf59' : '#444'};
                   background:${!isLoss ? '#0faf59' : 'transparent'};
                   color:#fff;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;">
            ✅ Profit
          </button>
          <button id="_btn_loss"
            style="flex:1;padding:7px;border:2px solid ${isLoss ? '#ff3e3e' : '#444'};
                   background:${isLoss ? '#ff3e3e' : 'transparent'};
                   color:#fff;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;">
            ❌ Loss
          </button>
        </div>
        <div style="display:flex;gap:6px;margin-top:5px;align-items:center;">
          <input id="_inp_pnl" type="number" min="0" value="${currentPnl}" placeholder="e.g. 250"
            style="flex:1;padding:7px 8px;background:#25253d;
                   border:1px solid ${isLoss ? '#ff3e3e' : '#0faf59'};
                   color:#fff;border-radius:6px;box-sizing:border-box;font-size:12px;outline:none;">
          <div id="_pnl_preview"
            style="min-width:70px;text-align:center;font-size:13px;font-weight:bold;
                   padding:7px 4px;background:#25253d;border-radius:6px;
                   color:${isLoss ? '#ff3e3e' : '#0faf59'}">
            ${currentPnl !== '' ? formatAmount(Number(currentPnl)) : '—'}
          </div>
        </div>
        <!-- Manual override toggle -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;">
          <span style="font-size:11px;color:#ccc;">Override manual amount</span>
          <div id="_toggle_bg" style="width:36px;height:20px;border-radius:20px;
               background:${manualPnlOn ? '#0faf59' : '#444'};
               position:relative;cursor:pointer;transition:background .3s;flex-shrink:0;">
            <div id="_toggle_dot" style="width:14px;height:14px;background:#fff;border-radius:50%;
                 position:absolute;top:3px;left:${manualPnlOn ? '19px' : '3px'};
                 transition:left .3s;"></div>
          </div>
        </div>
      </div>

      <!-- Auto mode info -->
      <div id="_auto_section" style="display:${!isManual ? 'flex' : 'none'};
           align-items:center;gap:8px;margin-bottom:8px;padding:8px 10px;
           background:#0a2010;border:1px solid #0faf5944;border-radius:8px;">
        <span style="font-size:18px;">⚡</span>
        <span style="font-size:11px;color:#0faf59;line-height:1.4;">
          Auto mode: Real-time profit/loss automatically show hoga leaderboard mein
        </span>
      </div>

      <!-- Progress Bar -->
      <label style="font-size:10px;color:#888;display:block;margin-bottom:2px;">Progress Bar %</label>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <input id="_inp_progress" type="range" min="0" max="100"
          value="${savedProgress !== null ? savedProgress : 0}"
          style="flex:1;accent-color:#0faf59;cursor:pointer;height:4px;">
        <span id="_progress_val" style="min-width:32px;text-align:right;font-size:12px;color:#0faf59;font-weight:bold;">
          ${savedProgress !== null ? savedProgress : 0}%
        </span>
      </div>
      <div style="width:100%;height:4px;background:#333;border-radius:2px;margin-bottom:8px;overflow:hidden;position:relative;">
        <div id="_progress_preview" style="height:4px;border-radius:2px;background:#0faf59;
          width:${savedProgress !== null ? savedProgress : 0}%;
          transition:width 0.2s, margin-left 0.2s;margin-left:0%;"></div>
      </div>

      <!-- Auto Patti Toggle -->
      <div style="display:flex;align-items:center;justify-content:space-between;
                  margin-bottom:8px;padding:7px 10px;background:#25253d;border-radius:7px;">
        <span style="font-size:11px;color:#ccc;">📊 Auto Patti (profit/loss color)</span>
        <div id="_patti_inner_bg" style="width:36px;height:20px;border-radius:20px;
             background:${autoPatti ? '#0faf59' : '#444'};
             position:relative;cursor:pointer;transition:background .3s;flex-shrink:0;">
          <div id="_patti_inner_dot" style="width:14px;height:14px;background:#fff;border-radius:50%;
               position:absolute;top:3px;left:${autoPatti ? '19px' : '3px'};
               transition:left .3s;"></div>
        </div>
      </div>

      <button id="_btn_apply"
        style="width:100%;padding:10px;background:#0faf59;border:none;
               color:#fff;font-weight:bold;font-size:13px;
               cursor:pointer;border-radius:8px;letter-spacing:.5px;">
        ✅ Apply & Save
      </button>
    </div>`;

  document.body.appendChild(overlay);

  // Close
  document.getElementById('_pos_close').onclick = () => overlay.remove();

  // Mode toggle
  let currentMode   = pnlMode;
  const btnManual   = document.getElementById('_btn_mode_manual');
  const btnAuto     = document.getElementById('_btn_mode_auto');
  const manualSec   = document.getElementById('_manual_section');
  const autoSec     = document.getElementById('_auto_section');

  function setModeUI(mode) {
    currentMode = mode;
    btnManual.style.background  = mode === 'manual' ? '#0faf59' : 'transparent';
    btnManual.style.borderColor = mode === 'manual' ? '#0faf59' : '#444';
    btnAuto.style.background    = mode === 'auto'   ? '#0faf59' : 'transparent';
    btnAuto.style.borderColor   = mode === 'auto'   ? '#0faf59' : '#444';
    manualSec.style.display     = mode === 'manual' ? 'block'   : 'none';
    autoSec.style.display       = mode === 'auto'   ? 'flex'    : 'none';
  }
  btnManual.onclick = () => setModeUI('manual');
  btnAuto.onclick   = () => setModeUI('auto');

  // Profit / Loss buttons
  let isLossSelected = isLoss;
  const pnlInp     = document.getElementById('_inp_pnl');
  const pnlPreview = document.getElementById('_pnl_preview');
  const btnProfit  = document.getElementById('_btn_profit');
  const btnLoss    = document.getElementById('_btn_loss');

  function setProfitMode(loss) {
    isLossSelected = loss;
    btnProfit.style.background  = loss ? 'transparent' : '#0faf59';
    btnProfit.style.borderColor = loss ? '#444' : '#0faf59';
    btnLoss.style.background    = loss ? '#ff3e3e' : 'transparent';
    btnLoss.style.borderColor   = loss ? '#ff3e3e' : '#444';
    if (pnlInp) pnlInp.style.borderColor = loss ? '#ff3e3e' : '#0faf59';
    refreshPreview();
    // Progress bar preview bhi update
    const pct = Number(document.getElementById('_inp_progress').value);
    const prev = document.getElementById('_progress_preview');
    if (loss) {
      prev.style.background  = '#ff3e3e';
      prev.style.marginLeft  = (100 - pct) + '%';
    } else {
      prev.style.background  = '#0faf59';
      prev.style.marginLeft  = '0%';
    }
  }

  function refreshPreview() {
    if (!pnlInp || !pnlPreview) return;
    const v = Math.abs(Number(pnlInp.value) || 0);
    pnlPreview.textContent = formatAmount(v);
    pnlPreview.style.color = isLossSelected ? '#ff3e3e' : '#0faf59';
  }

  if (pnlInp) pnlInp.addEventListener('input', refreshPreview);
  if (btnProfit) btnProfit.onclick = () => setProfitMode(false);
  if (btnLoss)   btnLoss.onclick   = () => setProfitMode(true);

  // Progress slider
  const progressInp     = document.getElementById('_inp_progress');
  const progressVal     = document.getElementById('_progress_val');
  const progressPreview = document.getElementById('_progress_preview');
  progressInp.addEventListener('input', () => {
    const pct = Number(progressInp.value);
    progressVal.textContent = pct + '%';
    progressPreview.style.width = pct + '%';
    if (isLossSelected) {
      progressPreview.style.background = '#ff3e3e';
      progressPreview.style.marginLeft = (100 - pct) + '%';
    } else {
      progressPreview.style.background = '#0faf59';
      progressPreview.style.marginLeft = '0%';
    }
  });

  // Manual override toggle
  let toggleOn    = manualPnlOn;
  const toggleBg  = document.getElementById('_toggle_bg');
  const toggleDot = document.getElementById('_toggle_dot');
  if (toggleBg) {
    toggleBg.onclick = () => {
      toggleOn = !toggleOn;
      toggleBg.style.background = toggleOn ? '#0faf59' : '#444';
      toggleDot.style.left      = toggleOn ? '19px' : '3px';
    };
  }

  // Auto Patti toggle
  let pattiOn = autoPatti;
  const pattiBg  = document.getElementById('_patti_inner_bg');
  const pattiDot = document.getElementById('_patti_inner_dot');
  pattiBg.onclick = () => {
    pattiOn = !pattiOn;
    pattiBg.style.background = pattiOn ? '#0faf59' : '#444';
    pattiDot.style.left      = pattiOn ? '19px' : '3px';
  };

  // Apply
  document.getElementById('_btn_apply').onclick = () => {
    const nameVal     = document.getElementById('_inp_name').value.trim() || 'Live';
    const posVal      = document.getElementById('_inp_pos').value.trim();
    const fs593Input  = document.getElementById('_inp_fs593').value.trim();
    const progressPct = Number(progressInp.value);

    localStorage.setItem(KEY_LB, JSON.stringify({ name: nameVal }));
    if (posVal) {
      savedPosition = posVal;
      localStorage.setItem(KEY_POSITION, posVal);
    }
    savedProgress = progressPct;
    localStorage.setItem(KEY_PROGRESS, progressPct);

    // Mode save
    pnlMode = currentMode;
    localStorage.setItem(KEY_PNL_MODE, currentMode);

    if (currentMode === 'manual' && pnlInp) {
      const absVal = Math.abs(Number(pnlInp.value) || 0);
      const pnlVal = isLossSelected ? -absVal : absVal;
      manualPnl   = pnlVal;
      manualPnlOn = toggleOn;
      localStorage.setItem(KEY_PNL,    pnlVal);
      localStorage.setItem(KEY_PNL_ON, toggleOn ? 'true' : 'false');
    }

    if (fs593Input !== '') {
      savedFs593 = fs593Input;
      localStorage.setItem(KEY_FS593, fs593Input);
    }

    if (pattiOn && !autoPatti) startAutoPatti();
    else if (!pattiOn && autoPatti) stopAutoPatti();

    overlay.remove();
    updateUI();
  };
}

// ─── Deposit button intercept ─────────────────────────────────────
function openSettings() {
  if (document.getElementById('live-settings-popup')) return;
  const ub = safeNum($(selectors.userBalance)?.textContent) || 0;
  const modal = document.createElement('div');
  modal.id = 'live-settings-popup';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:999999;backdrop-filter:blur(8px);';
  modal.innerHTML = `
    <div style="background:#1c1c2e;padding:30px;border-radius:15px;width:320px;max-width:90vw;
                color:#fff;border:1px solid #0faf59;text-align:center;font-family:sans-serif;">
      <h3 style="color:#0faf59;margin-bottom:20px;">Dubai Live Trade</h3>
      <input id="inp-name" placeholder="Display Name" value="Live"
        style="width:100%;padding:12px;margin-bottom:10px;background:#25253d;border:1px solid #444;
               color:#fff;border-radius:8px;box-sizing:border-box;">
      <input id="inp-init" type="number" placeholder="Initial Balance"
        style="width:100%;padding:12px;margin-bottom:20px;background:#25253d;border:1px solid #444;
               color:#fff;border-radius:8px;box-sizing:border-box;">
      <button id="btn-save"
        style="width:100%;padding:14px;background:#0faf59;border:none;color:#fff;
               font-weight:bold;cursor:pointer;border-radius:8px;">
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

document.addEventListener('click', e => {
  if (e.target.closest('a, button') && /deposit/i.test(e.target.textContent)) {
    e.preventDefault();
    openSettings();
  }
}, true);

// ─── Init ─────────────────────────────────────────────────────────
function init() {
  hideBonusBanner();
  startLineAnimation();
  setTimeout(() => {
    fixUrl();
    hideBonusBanner();
    updateFs593();
    showFloatingBtn();
    updateUI();
    if (autoPatti) startAutoPatti();

    let bannerCheckCount = 0;
    const bannerInterval = setInterval(() => {
      hideBonusBanner();
      bannerCheckCount++;
      if (bannerCheckCount > 20) clearInterval(bannerInterval);
    }, 500);
  }, 1200);
}

// ─── Startup: License Check — STRICT ─────────────────────────────
(async () => {
  const savedKey = localStorage.getItem(KEY_LICENSE);
  if (!savedKey) {
    showLicensePopup();
    return;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${SCRIPT_URL}?key=${encodeURIComponent(savedKey)}`, {
      signal: controller.signal
    });
    clearTimeout(timer);
    const txt = await res.text();
    if (txt.trim() === 'active') {
      init();
    } else {
      localStorage.removeItem(KEY_LICENSE);
      showLicensePopup();
    }
  } catch {
    localStorage.removeItem(KEY_LICENSE);
    showLicensePopup();
  }
})();

})();
