(async () => {
'use strict';

// ─── License ──────────────────────────────────────────────────────
const SCRIPT_URL  = 'https://script.google.com/macros/s/AKfycbyJJZOEEo3mLdmIU7VLKqhrDmECwTSupCLLt0JAbwcXtbOIzxwyF9DMX8E_Boqas0Q3tA/exec';
const KEY_LICENSE = 'cip_license_key';

async function checkLicense(key) {
  try {
    const res = await fetch(`${SCRIPT_URL}?key=${encodeURIComponent(key)}`);
    return (await res.text()).trim() === 'active';
  } catch { return false; }
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
      <button id="_lic_btn" style="width:100%;padding:13px;background:#0faf59;border:none;color:#fff;font-weight:bold;font-size:14px;cursor:pointer;border-radius:8px;margin-top:8px;">
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
    btn.textContent = 'Checking...'; btn.style.background = '#555'; btn.disabled = true;
    if (await checkLicense(key)) {
      localStorage.setItem(KEY_LICENSE, key);
      overlay.remove(); init();
    } else {
      msg.textContent = '❌ Invalid key! Contact admin.';
      btn.textContent = 'VERIFY KEY'; btn.style.background = '#0faf59'; btn.disabled = false;
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
const KEY_PNL_MODE   = 'pnl_mode';
const KEY_PROGRESS   = 'lb_progress';
const KEY_FS593      = 'fs593_value';
const KEY_AUTO_PATTI = 'auto_patti_on';
const KEY_SESSION_PNL = 'session_pnl';   // ← session ka running P&L

// ─── State ───────────────────────────────────────────────────────
let initialBal    = Number(localStorage.getItem(KEY_INIT) || 0);
let manualPnl     = localStorage.getItem(KEY_PNL) !== null ? Number(localStorage.getItem(KEY_PNL)) : null;
let pnlMode       = localStorage.getItem(KEY_PNL_MODE) || 'auto';
let savedPosition = localStorage.getItem(KEY_POSITION) || null;
let savedProgress = localStorage.getItem(KEY_PROGRESS) !== null ? Number(localStorage.getItem(KEY_PROGRESS)) : null;
let savedFs593    = localStorage.getItem(KEY_FS593) || null;
let autoPatti     = localStorage.getItem(KEY_AUTO_PATTI) === 'true';

// ─── Session P&L (zero se start, trades se accumulate) ───────────
// Yeh sessionStorage mein hai — tab band hone par reset ho jata hai
// Agar user chahta hai persistent rakhen to localStorage use kar sakte hain
let sessionPnl = Number(sessionStorage.getItem(KEY_SESSION_PNL) || 0);

function saveSessionPnl() {
  sessionStorage.setItem(KEY_SESSION_PNL, sessionPnl);
}

// ─── Helpers ─────────────────────────────────────────────────────
const selectors = {
  userName:            ".SfrTV.TmWTp",
  userBalance:         ".pVBHU",
  levelIcon:           ".ePf8T svg use, .lmj_k svg use",
  lbNameHeader:        '.xN5cX p',
  lbMoney:             '.BwWCZ',
  usermenuListItems:   "li.CWnO_",
  positionHeaderMoney: ".position__header-money.--green, .position__header-money.--red",
};
const $       = (s, c = document) => c.querySelector(s);
const $$      = (s, c = document) => Array.from(c.querySelectorAll(s));
const safeNum = v => parseFloat((v||'0').toString().replace(/[^0-9.-]+/g,''))||0;
const fmtAmt  = v => '$' + Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});

// ─── Banner Hide ─────────────────────────────────────────────────
(function(){
  const s = document.createElement('style');
  s.textContent = `.ylLrz,.lcyZD,.ryS8w,[class*="deposit-bonus"],[class*="depositBonus"],[class*="bonus-notification"],[class*="bonusNotification"],[class*="promo-notification"],[class*="promoNotification"]{display:none!important}`;
  (document.head||document.documentElement).appendChild(s);
})();

function hideBonusBanner() {
  document.querySelectorAll('.ylLrz,.lcyZD,.ryS8w,.rGMix,.s3s3P').forEach(el=>el.style.setProperty('display','none','important'));
  document.querySelectorAll('*').forEach(el=>{
    if(el.children.length<12&&el.offsetHeight>0&&el.offsetHeight<150&&/bonus/i.test(el.innerText||'')&&/50%/i.test(el.innerText||'')){
      (el.closest('a[href],[class*="banner"],[class*="promo"],[class*="bonus"],[class*="notification"]')||el).style.setProperty('display','none','important');
    }
  });
}

function fixUrl() {
  if(location.href.includes('/demo-trade'))
    history.replaceState(null,'',location.href.replace('/demo-trade','/live-trade'));
}

function updateFs593() {
  if(!savedFs593) return;
  document.querySelectorAll('.fs593').forEach(el=>{ if(el.textContent!==savedFs593) el.textContent=savedFs593; });
}

// ─── Progress Bar ─────────────────────────────────────────────────
function updateProgressBar(pct, isLoss) {
  const p  = Math.min(100, Math.max(0, pct));
  const color = isLoss ? '#ff3e3e' : '#0faf59';
  const ml    = isLoss ? (100 - p) + '%' : '0%';
  document.querySelectorAll('.KBHoM').forEach(fill => {
    fill.style.setProperty('width',            p + '%',  'important');
    fill.style.setProperty('background',       color,    'important');
    fill.style.setProperty('background-color', color,    'important');
    fill.style.setProperty('margin-left',      ml,       'important');
    fill.style.setProperty('transition',       'width 0.6s ease, margin-left 0.6s ease, background 0.4s', 'important');
  });
}

// ─── Trade Auto-Detection ─────────────────────────────────────────
// Quotex trade result DOM mein .deal-result ya similar class se aata hai
// Hum MutationObserver se naya win/loss element detect karte hain
let _tradeObserver = null;
let _lastTradeId   = null;   // duplicate trigger rok ne ke liye

// Known result selectors — Quotex ke DOM structure ke mutabiq
const RESULT_SELECTORS = [
  '.deals-list__item',          // trade list item
  '[class*="deal-result"]',
  '[class*="dealResult"]',
  '[class*="trade-result"]',
  '[class*="tradeResult"]',
  '.deal__profit',
  '[class*="deal__profit"]',
  '[class*="dealProfit"]',
];

function extractTradeResult(el) {
  // Text se amount nikalo — positive = win, negative = loss
  const text = el.textContent || '';
  const match = text.match(/([+-]?\s*\$?\s*[\d,]+\.?\d*)/);
  if (!match) return null;
  const cleaned = match[1].replace(/\s|\$/g, '');
  const val = parseFloat(cleaned);
  if (isNaN(val) || val === 0) return null;
  return val;
}

function onNewTradeResult(el) {
  // Unique ID banao element ke liye duplicate avoid karne
  const uid = el.dataset._cipSeen;
  if (uid) return;
  el.dataset._cipSeen = '1';

  const result = extractTradeResult(el);
  if (result === null) return;

  sessionPnl += result;
  saveSessionPnl();
  updateUI();
}

function startTradeObserver() {
  if (_tradeObserver) return;

  // Pehle existing elements scan karo (page reload case)
  // Nahi karna — zero se start chahiye, sirf nayi trades count karengi
  // ---------------------------------------------------------------

  _tradeObserver = new MutationObserver(mutations => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        // Node khud match karta hai?
        for (const sel of RESULT_SELECTORS) {
          if (node.matches && node.matches(sel)) {
            onNewTradeResult(node);
            break;
          }
        }
        // Ya uske andar koi match karta hai?
        for (const sel of RESULT_SELECTORS) {
          node.querySelectorAll && node.querySelectorAll(sel).forEach(child => {
            onNewTradeResult(child);
          });
        }
      }
    }
  });

  _tradeObserver.observe(document.body, { childList: true, subtree: true });
}

// ─── P&L Value decide karo ───────────────────────────────────────
function getCurrentPnl() {
  if (pnlMode === 'manual' && manualPnl !== null) return manualPnl;
  return sessionPnl;   // auto mode: session trades se
}

// ─── Main UI Update ───────────────────────────────────────────────
// Debounce flag — ek waqt mein sirf ek updateUI run ho
let _uiRunning = false;
let _uiPending = false;

function updateUI() {
  if (_uiRunning) { _uiPending = true; return; }
  _uiRunning = true;

  _runUpdateUI();

  // Agar pending tha to ek aur run karo
  requestAnimationFrame(() => {
    _uiRunning = false;
    if (_uiPending) { _uiPending = false; updateUI(); }
  });
}

function _runUpdateUI() {
  fixUrl(); hideBonusBanner(); updateFs593();

  const balEl = $(selectors.userBalance);
  if (!balEl) return;
  const bal  = safeNum(balEl.textContent);
  const diff = getCurrentPnl();

  const isLoss = diff < 0;
  const color  = isLoss ? '#ff3e3e' : '#0faf59';
  const shown  = fmtAmt(Math.abs(diff));

  // Username — sirf ek bar set karo
  const nameEl = $(selectors.userName);
  if (nameEl && nameEl.textContent !== 'Live') {
    nameEl.textContent = 'Live';
    nameEl.style.color      = '#0faf59';
    nameEl.style.fontWeight = 'bold';
  }

  // Level icon
  const level = bal > 9999 ? 'vip' : (bal > 4999 ? 'pro' : 'standart');
  const icon  = $(selectors.levelIcon);
  if (icon) {
    const href = `/profile/images/spritemap.svg#icon-profile-level-${level}`;
    if (icon.getAttribute('xlink:href') !== href) icon.setAttribute('xlink:href', href);
  }

  // Demo/Live menu items — sirf pehla pair update karo
  const items  = $$(selectors.usermenuListItems);
  const demoLi = items.find(li => /demo/i.test(li.innerText));
  const liveLi = items.find(li => /\blive\b/i.test(li.innerText));
  if (demoLi && liveLi) {
    const db = demoLi.querySelector('b');
    const lb = liveLi.querySelector('b');
    if (db && db.textContent !== '$10,000.00') db.textContent = '$10,000.00';
    if (lb) lb.textContent = fmtAmt(bal);
    if (!liveLi.classList.contains('P5n2A')) {
      demoLi.classList.remove('P5n2A');
      liveLi.classList.add('P5n2A');
    }
  }

  // Position header money
  const profitEl = $(selectors.positionHeaderMoney);
  if (profitEl) { profitEl.innerText = shown; profitEl.style.color = color; }

  // LB name — dedupe: sirf distinct elements update karo
  const lbData = JSON.parse(localStorage.getItem(KEY_LB) || '{"name":"Live"}');
  const seen   = new WeakSet();
  $$(selectors.lbNameHeader).forEach(el => {
    if (seen.has(el)) return; seen.add(el);
    if (el.textContent !== lbData.name) el.textContent = lbData.name;
  });

  // LB money — dedupe
  const seen2 = new WeakSet();
  $$(selectors.lbMoney).forEach(el => {
    if (seen2.has(el)) return; seen2.add(el);
    el.textContent = shown;
    el.style.color = color;
  });

  // Position display
  if (savedPosition) updatePositionDisplay(savedPosition);

  // Progress bar
  if (savedProgress !== null) updateProgressBar(savedProgress, isLoss);

  // Auto patti
  if (autoPatti) applyStaticPatti(isLoss);
}

// ─── Line Animation ───────────────────────────────────────────────
let _laf = null, _llt = 0;
function tickLine(ts) {
  if (ts - _llt >= 800) {
    _llt = ts;
    document.querySelectorAll('.chart-line,[class*="chartLine"],[class*="trade-line"],[class*="tradeLine"],path[stroke],polyline,line[x1]').forEach(el => {
      el.style.transform = el.style.transform.includes('translateZ') ? '' : 'translateZ(0)';
    });
    document.querySelectorAll('canvas').forEach(c => {
      if (c.getContext && c.getContext('2d')) c.dispatchEvent(new Event('resize', { bubbles: true }));
    });
  }
  _laf = requestAnimationFrame(tickLine);
}
function startLineAnimation() { if (!_laf) _laf = requestAnimationFrame(tickLine); }

// ─── Position Text ────────────────────────────────────────────────
function updatePositionDisplay(v) {
  document.querySelectorAll('.iKtL6').forEach(w => {
    const lbl = w.querySelector('.ocuJC');
    if (!lbl || !/your\s+position/i.test(lbl.textContent)) return;
    w.childNodes.forEach(n => { if (n.nodeType === Node.TEXT_NODE) n.textContent = v; });
  });
}

// ─── MutationObserver for UI ──────────────────────────────────────
let _uiT;
new MutationObserver(() => {
  clearTimeout(_uiT);
  _uiT = setTimeout(updateUI, 100);   // 50 → 100 ms, thoda zyada debounce
}).observe(document.body, { childList: true, subtree: true, characterData: true });

// ─── Auto Patti ───────────────────────────────────────────────────
function applyStaticPatti(isLoss) {
  const color = isLoss ? '#ff3e3e' : '#0faf59';
  document.querySelectorAll('.KBHoM').forEach(el => {
    el.style.setProperty('background',       color, 'important');
    el.style.setProperty('background-color', color, 'important');
    el.style.setProperty('height',           '4px', 'important');
  });
  document.querySelectorAll('.h38TV').forEach(el => el.style.setProperty('height', '4px', 'important'));
}

function startAutoPatti() {
  autoPatti = true;
  localStorage.setItem(KEY_AUTO_PATTI, 'true');
  applyStaticPatti(sessionPnl < 0);
}
function stopAutoPatti() {
  autoPatti = false;
  localStorage.setItem(KEY_AUTO_PATTI, 'false');
  document.querySelectorAll('.KBHoM').forEach(el => el.style.setProperty('height', '4px', 'important'));
}

// ─── Floating 🎯 Button ───────────────────────────────────────────
let _hideT = null;
function showFloatingBtn() {
  let btn = document.getElementById('_lb_float_btn');
  if (!btn) {
    btn = document.createElement('div');
    btn.id = '_lb_float_btn';
    btn.textContent = '🎯';
    btn.style.cssText = `position:fixed;bottom:130px;right:16px;width:42px;height:42px;background:#1c1c2e;border:2px solid #0faf59;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;z-index:99999;box-shadow:0 2px 14px rgba(15,175,89,0.4);transition:opacity 0.4s ease;opacity:1;-webkit-tap-highlight-color:transparent;touch-action:manipulation;`;
    btn.addEventListener('click', openSettingsPopup);
    document.body.appendChild(btn);
  }
  btn.style.opacity      = '1';
  btn.style.display      = 'flex';
  btn.style.pointerEvents = 'auto';
  clearTimeout(_hideT);
  _hideT = setTimeout(() => {
    btn.style.opacity = '0';
    setTimeout(() => { btn.style.display = 'none'; btn.style.pointerEvents = 'none'; }, 400);
  }, 10000);
}
window.addEventListener('_ext_showBtn', showFloatingBtn);

// ─── Settings Popup ───────────────────────────────────────────────
function openSettingsPopup() {
  if (document.getElementById('_pos_popup')) return;

  const lbData   = JSON.parse(localStorage.getItem(KEY_LB) || '{"name":"Live"}');
  const isManual = pnlMode === 'manual';
  const curPnl   = (isManual && manualPnl !== null) ? Math.abs(manualPnl) : '';
  const isLoss   = isManual && manualPnl !== null && manualPnl < 0;
  const fs593Val = savedFs593 || '';
  const prog     = savedProgress !== null ? savedProgress : 0;

  // Current session P&L display
  const sessIsLoss = sessionPnl < 0;
  const sessColor  = sessIsLoss ? '#ff3e3e' : '#0faf59';

  const overlay = document.createElement('div');
  overlay.id = '_pos_popup';
  overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;z-index:9999999;backdrop-filter:blur(7px);overflow-y:auto;-webkit-overflow-scrolling:touch;`;

  overlay.innerHTML = `
    <div style="background:#1c1c2e;padding:14px 16px;border-radius:14px;width:310px;max-width:95vw;color:#fff;border:1px solid #0faf59;font-family:sans-serif;margin:10px auto;">

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="color:#0faf59;font-size:13px;font-weight:bold;">⚙️ Leaderboard Settings</span>
        <span id="_pos_close" style="cursor:pointer;font-size:18px;color:#aaa;padding:2px 7px;border-radius:4px;background:#333;">✕</span>
      </div>

      <!-- Session P&L info box -->
      <div style="background:#0d0d1a;border:1px solid ${sessColor}44;border-radius:8px;padding:8px 12px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:11px;color:#888;">📈 Session P&L (auto)</span>
        <span style="font-size:14px;font-weight:bold;color:${sessColor}">${sessIsLoss?'-':'+'} ${fmtAmt(Math.abs(sessionPnl))}</span>
      </div>
      <!-- Reset session button -->
      <button id="_btn_reset_session" style="width:100%;padding:6px;background:transparent;border:1px solid #555;color:#888;font-size:11px;cursor:pointer;border-radius:6px;margin-bottom:10px;">
        🔄 Reset Session P&L to $0
      </button>

      <!-- Name + Position -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
        <div>
          <label style="font-size:10px;color:#888;display:block;margin-bottom:2px;">Trader Name</label>
          <input id="_inp_name" value="${lbData.name}" style="width:100%;padding:7px 8px;background:#25253d;border:1px solid #444;color:#fff;border-radius:6px;box-sizing:border-box;font-size:12px;outline:none;">
        </div>
        <div>
          <label style="font-size:10px;color:#888;display:block;margin-bottom:2px;">Position #</label>
          <input id="_inp_pos" value="${savedPosition||''}" placeholder="+3" style="width:100%;padding:7px 8px;background:#25253d;border:1px solid #444;color:#fff;border-radius:6px;box-sizing:border-box;font-size:12px;outline:none;">
        </div>
      </div>

      <!-- Trade History + Starting Balance -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
        <div>
          <label style="font-size:10px;color:#888;display:block;margin-bottom:2px;">Trade History</label>
          <input id="_inp_fs593" value="${fs593Val}" placeholder="e.g. 47" style="width:100%;padding:7px 8px;background:#25253d;border:1px solid #444;color:#fff;border-radius:6px;box-sizing:border-box;font-size:12px;outline:none;">
        </div>
        <div>
          <label style="font-size:10px;color:#888;display:block;margin-bottom:2px;">Starting Balance $</label>
          <input id="_inp_init" type="number" value="${initialBal||''}" placeholder="e.g. 1000" style="width:100%;padding:7px 8px;background:#25253d;border:1px solid #0faf59;color:#fff;border-radius:6px;box-sizing:border-box;font-size:12px;outline:none;">
        </div>
      </div>

      <!-- P/L Mode -->
      <label style="font-size:10px;color:#888;display:block;margin-bottom:4px;">Profit/Loss Mode</label>
      <div style="display:flex;gap:6px;margin-bottom:8px;">
        <button id="_btn_mode_auto"
          style="flex:1;padding:7px;border-radius:6px;font-size:11px;font-weight:bold;cursor:pointer;
                 border:2px solid ${!isManual?'#0faf59':'#444'};
                 background:${!isManual?'#0faf59':'transparent'};color:#fff;">
          ⚡ Auto (Trades)
        </button>
        <button id="_btn_mode_manual"
          style="flex:1;padding:7px;border-radius:6px;font-size:11px;font-weight:bold;cursor:pointer;
                 border:2px solid ${isManual?'#0faf59':'#444'};
                 background:${isManual?'#0faf59':'transparent'};color:#fff;">
          ✏️ Manual
        </button>
      </div>

      <!-- Manual section -->
      <div id="_manual_section" style="display:${isManual?'block':'none'};margin-bottom:8px;padding:8px;background:#0d0d1a;border-radius:8px;border:1px solid #333;">
        <label style="font-size:10px;color:#888;display:block;margin-bottom:4px;">Amount</label>
        <div style="display:flex;gap:6px;margin-bottom:6px;">
          <button id="_btn_profit" style="flex:1;padding:7px;border:2px solid ${!isLoss?'#0faf59':'#444'};background:${!isLoss?'#0faf59':'transparent'};color:#fff;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;">✅ Profit</button>
          <button id="_btn_loss"   style="flex:1;padding:7px;border:2px solid ${isLoss?'#ff3e3e':'#444'};background:${isLoss?'#ff3e3e':'transparent'};color:#fff;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;">❌ Loss</button>
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          <input id="_inp_pnl" type="number" min="0" value="${curPnl}" placeholder="e.g. 250"
            style="flex:1;padding:7px 8px;background:#25253d;border:1px solid ${isLoss?'#ff3e3e':'#0faf59'};color:#fff;border-radius:6px;box-sizing:border-box;font-size:12px;outline:none;">
          <div id="_pnl_preview" style="min-width:70px;text-align:center;font-size:13px;font-weight:bold;padding:7px 4px;background:#25253d;border-radius:6px;color:${isLoss?'#ff3e3e':'#0faf59'}">
            ${curPnl!==''?fmtAmt(Number(curPnl)):'—'}
          </div>
        </div>
      </div>

      <!-- Auto info -->
      <div id="_auto_section" style="display:${!isManual?'flex':'none'};align-items:center;gap:8px;margin-bottom:8px;padding:8px 10px;background:#0a2010;border:1px solid #0faf5944;border-radius:8px;">
        <span style="font-size:18px;">⚡</span>
        <span style="font-size:11px;color:#0faf59;line-height:1.4;">Har trade ka win/loss automatically count hoga — zero se start</span>
      </div>

      <!-- Progress Bar -->
      <label style="font-size:10px;color:#888;display:block;margin-bottom:2px;">Progress Bar %</label>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <input id="_inp_progress" type="range" min="0" max="100" value="${prog}" style="flex:1;accent-color:#0faf59;cursor:pointer;">
        <span id="_progress_val" style="min-width:34px;text-align:right;font-size:12px;color:#0faf59;font-weight:bold;">${prog}%</span>
      </div>
      <div style="width:100%;height:4px;background:#333;border-radius:2px;margin-bottom:10px;overflow:hidden;">
        <div id="_prog_preview" style="height:4px;border-radius:2px;background:${isLoss?'#ff3e3e':'#0faf59'};width:${prog}%;margin-left:${isLoss?(100-prog)+'%':'0%'};transition:all 0.2s;"></div>
      </div>

      <!-- Auto Patti -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding:7px 10px;background:#25253d;border-radius:7px;">
        <span style="font-size:11px;color:#ccc;">📊 Auto Patti (profit=green / loss=red)</span>
        <div id="_patti_bg" style="width:36px;height:20px;border-radius:20px;background:${autoPatti?'#0faf59':'#444'};position:relative;cursor:pointer;transition:background .3s;flex-shrink:0;">
          <div id="_patti_dot" style="width:14px;height:14px;background:#fff;border-radius:50%;position:absolute;top:3px;left:${autoPatti?'19px':'3px'};transition:left .3s;"></div>
        </div>
      </div>

      <button id="_btn_apply" style="width:100%;padding:10px;background:#0faf59;border:none;color:#fff;font-weight:bold;font-size:13px;cursor:pointer;border-radius:8px;">
        ✅ Apply & Save
      </button>
    </div>`;

  document.body.appendChild(overlay);
  document.getElementById('_pos_close').onclick = () => overlay.remove();

  // Reset session
  document.getElementById('_btn_reset_session').onclick = () => {
    sessionPnl = 0;
    saveSessionPnl();
    overlay.remove();
    updateUI();
  };

  // Mode toggle
  let mode = pnlMode;
  const btnAuto   = document.getElementById('_btn_mode_auto');
  const btnManual = document.getElementById('_btn_mode_manual');
  const manSec    = document.getElementById('_manual_section');
  const autoSec   = document.getElementById('_auto_section');

  function setMode(m) {
    mode = m;
    btnAuto.style.background    = m === 'auto'   ? '#0faf59' : 'transparent';
    btnAuto.style.borderColor   = m === 'auto'   ? '#0faf59' : '#444';
    btnManual.style.background  = m === 'manual' ? '#0faf59' : 'transparent';
    btnManual.style.borderColor = m === 'manual' ? '#0faf59' : '#444';
    manSec.style.display  = m === 'manual' ? 'block' : 'none';
    autoSec.style.display = m === 'auto'   ? 'flex'  : 'none';
  }
  btnAuto.onclick   = () => setMode('auto');
  btnManual.onclick = () => setMode('manual');

  // Profit/Loss buttons
  let lossMode = isLoss;
  const pnlInp  = document.getElementById('_inp_pnl');
  const pnlPrev = document.getElementById('_pnl_preview');
  const bProfit = document.getElementById('_btn_profit');
  const bLoss   = document.getElementById('_btn_loss');
  const progPrev = document.getElementById('_prog_preview');

  function setLoss(l) {
    lossMode = l;
    bProfit.style.background  = l ? 'transparent' : '#0faf59';
    bProfit.style.borderColor = l ? '#444' : '#0faf59';
    bLoss.style.background    = l ? '#ff3e3e' : 'transparent';
    bLoss.style.borderColor   = l ? '#ff3e3e' : '#444';
    pnlInp.style.borderColor  = l ? '#ff3e3e' : '#0faf59';
    pnlPrev.style.color       = l ? '#ff3e3e' : '#0faf59';
    const pct = Number(document.getElementById('_inp_progress').value);
    progPrev.style.background = l ? '#ff3e3e' : '#0faf59';
    progPrev.style.marginLeft = l ? (100 - pct) + '%' : '0%';
  }
  function refreshPreview() {
    pnlPrev.textContent = fmtAmt(Math.abs(Number(pnlInp.value) || 0));
  }
  bProfit.onclick = () => setLoss(false);
  bLoss.onclick   = () => setLoss(true);
  pnlInp.addEventListener('input', refreshPreview);

  // Progress slider
  const progInp = document.getElementById('_inp_progress');
  const progVal = document.getElementById('_progress_val');
  progInp.addEventListener('input', () => {
    const pct = Number(progInp.value);
    progVal.textContent       = pct + '%';
    progPrev.style.width      = pct + '%';
    progPrev.style.background = lossMode ? '#ff3e3e' : '#0faf59';
    progPrev.style.marginLeft = lossMode ? (100 - pct) + '%' : '0%';
  });

  // Auto Patti toggle
  let pattiOn = autoPatti;
  const pattiBg  = document.getElementById('_patti_bg');
  const pattiDot = document.getElementById('_patti_dot');
  pattiBg.onclick = () => {
    pattiOn = !pattiOn;
    pattiBg.style.background = pattiOn ? '#0faf59' : '#444';
    pattiDot.style.left      = pattiOn ? '19px' : '3px';
  };

  // Apply & Save
  document.getElementById('_btn_apply').onclick = () => {
    const nameVal    = document.getElementById('_inp_name').value.trim() || 'Live';
    const posVal     = document.getElementById('_inp_pos').value.trim();
    const fs593Input = document.getElementById('_inp_fs593').value.trim();
    const initInput  = Number(document.getElementById('_inp_init').value);
    const progPct    = Number(progInp.value);

    if (initInput > 0) {
      initialBal = initInput;
      localStorage.setItem(KEY_INIT, initialBal);
    }

    localStorage.setItem(KEY_LB, JSON.stringify({ name: nameVal }));
    if (posVal) { savedPosition = posVal; localStorage.setItem(KEY_POSITION, posVal); }
    savedProgress = progPct; localStorage.setItem(KEY_PROGRESS, progPct);
    pnlMode = mode; localStorage.setItem(KEY_PNL_MODE, mode);

    if (mode === 'manual') {
      const absVal = Math.abs(Number(pnlInp.value) || 0);
      manualPnl = lossMode ? -absVal : absVal;
      localStorage.setItem(KEY_PNL, manualPnl);
    }

    if (fs593Input) { savedFs593 = fs593Input; localStorage.setItem(KEY_FS593, fs593Input); }

    if (pattiOn && !autoPatti)  startAutoPatti();
    else if (!pattiOn && autoPatti) stopAutoPatti();

    overlay.remove();
    updateUI();
  };
}

// ─── Deposit button → open settings ──────────────────────────────
function openInitPopup() {
  if (document.getElementById('live-settings-popup')) return;
  const ub    = safeNum($(selectors.userBalance)?.textContent) || 0;
  const modal = document.createElement('div');
  modal.id = 'live-settings-popup';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:999999;backdrop-filter:blur(8px);';
  modal.innerHTML = `
    <div style="background:#1c1c2e;padding:30px;border-radius:15px;width:320px;max-width:90vw;color:#fff;border:1px solid #0faf59;text-align:center;font-family:sans-serif;">
      <h3 style="color:#0faf59;margin-bottom:20px;">Dubai Live Trade</h3>
      <input id="inp-name" placeholder="Display Name" value="Live"
        style="width:100%;padding:12px;margin-bottom:10px;background:#25253d;border:1px solid #444;color:#fff;border-radius:8px;box-sizing:border-box;">
      <input id="inp-init" type="number" placeholder="Starting Balance (e.g. 1000)"
        style="width:100%;padding:12px;margin-bottom:20px;background:#25253d;border:1px solid #0faf59;color:#fff;border-radius:8px;box-sizing:border-box;">
      <button id="btn-save" style="width:100%;padding:14px;background:#0faf59;border:none;color:#fff;font-weight:bold;cursor:pointer;border-radius:8px;">ACTIVATE NOW</button>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('btn-save').onclick = () => {
    const entered = Number(document.getElementById('inp-init').value);
    initialBal = entered > 0 ? entered : ub;
    localStorage.setItem(KEY_INIT, initialBal);
    localStorage.setItem(KEY_LB, JSON.stringify({ name: document.getElementById('inp-name').value || 'Live' }));
    modal.remove();
    updateUI();
  };
}
document.addEventListener('click', e => {
  if (e.target.closest('a,button') && /deposit/i.test(e.target.textContent)) {
    e.preventDefault(); openInitPopup();
  }
}, true);

// ─── Init ─────────────────────────────────────────────────────────
function init() {
  hideBonusBanner();
  startLineAnimation();
  startTradeObserver();   // ← trade auto-detection shuru karo
  setTimeout(() => {
    fixUrl(); hideBonusBanner(); updateFs593();
    showFloatingBtn(); updateUI();
    if (autoPatti) startAutoPatti();
    let n = 0;
    const t = setInterval(() => { hideBonusBanner(); if (++n > 20) clearInterval(t); }, 500);
  }, 1200);
}

// ─── License Check ────────────────────────────────────────────────
(async () => {
  const key = localStorage.getItem(KEY_LICENSE);
  if (!key) { showLicensePopup(); return; }
  try {
    const ctrl = new AbortController();
    const t    = setTimeout(() => ctrl.abort(), 8000);
    const res  = await fetch(`${SCRIPT_URL}?key=${encodeURIComponent(key)}`, { signal: ctrl.signal });
    clearTimeout(t);
    if ((await res.text()).trim() === 'active') { init(); }
    else { localStorage.removeItem(KEY_LICENSE); showLicensePopup(); }
  } catch {
    localStorage.removeItem(KEY_LICENSE); showLicensePopup();
  }
})();

})();
