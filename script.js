(async () => {
'use strict';
console.log('%c[CIP] 🔥 Script loaded — ' + new Date().toLocaleTimeString(), 'color:#0faf59;font-weight:bold;font-size:14px');

// ─── Error listener ───────────────────────────────────────────────
window.addEventListener('error', e => {
  console.error('[CIP Error]', e.message, 'at', e.filename + ':' + e.lineno);
});

// ─── Smart Element Finder ────────────────────────────────────────
// Finds elements by CONTENT and RELATIONSHIPS, not just class names.
// Works even when class names change on every site deployment.
// ──────────────────────────────────────────────────────────────────

const $ = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));
const safeNum = v => parseFloat((v||'0').toString().replace(/[^0-9.-]+/g,''))||0;
const fmtAmt = v => '$' + Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});

function log(...args) { console.log('[CIP]', ...args); }

// ─── Debug: Dump all candidate elements ──────────────────────────
function debugDumpCandidates() {
  log('=== ELEMENT SCAN ===');
  // All <b> elements (balances are usually <b>)
  const bEls = $$('b');
  log('All <b> elements:', bEls.length);
  bEls.forEach((el, i) => {
    if (/\$[\d,]+\.\d{2}/.test(el.textContent)) {
      log(`  <b>#${i}: "${el.textContent.trim()}" class="${el.className}"`);
    }
  });
  // All <a> elements with "Account" in text or "trade" in href
  const aEls = $$('a');
  log('All <a> elements:', aEls.length);
  aEls.forEach((el, i) => {
    if (/account/i.test(el.textContent) || /trade/i.test(el.href)) {
      log(`  <a>#${i}: text="${el.textContent.trim()}" href="${el.href}" class="${el.className}" active=${el.classList.contains('active')}`);
    }
  });
  log('=== END SCAN ===');
}

// ─── Smart Balance Finder ────────────────────────────────────────
// Strategy 1: Try known class selectors
// Strategy 2: Find by content pattern ($X,XXX.XX)
// Strategy 3: Find by DOM position near account links

function smartFindBalances() {
  // Try class selector first (fast path for known classes)
  let byClass = $$('.YnoT0');
  if (byClass.length >= 2) {
    log('SmartBalance: Found 2+ via .YnoT0 class');
    return byClass;
  }

  // Try to find by dollar amount pattern
  // Look for <b> or <span> elements with $X,XXX.XX format, not too deep
  const all = $$('b, span');
  const candidates = all.filter(el => {
    const text = el.textContent.trim();
    return /\$[\d,]+\.\d{2}/.test(text) && el.children.length < 3 && el.offsetHeight > 0;
  });

  // Filter for likely balance elements (shorter text, specific tag patterns)
  const balances = candidates.filter(el => {
    const text = el.textContent.trim();
    // Balance text is usually just "$10,000.00" - short and only contains the amount
    return text.length < 20 && /^\$[\d,]+\.\d{2}$/.test(text);
  });

  if (balances.length >= 2) {
    log('SmartBalance: Found ' + balances.length + ' via $ pattern');
    return balances;
  }

  // If we found some, return them
  if (balances.length > 0) {
    log('SmartBalance: Found ' + balances.length + ' via $ pattern (partial)');
    return balances;
  }

  // Last resort: return what we got from class
  return byClass;
}

// ─── Smart Link Finder ───────────────────────────────────────────
// Strategy 1: Try known class selector (a.yBslY)
// Strategy 2: Find by href pattern
// Strategy 3: Find by text content

function smartFindLinks() {
  // Try class selector first
  let byClass = $$('a.yBslY');
  if (byClass.length >= 2) {
    log('SmartLinks: Found 2+ via a.yBslY class');
    return byClass;
  }

  // Try by href
  const allLinks = $$('a');
  const demoLinks = allLinks.filter(a => a.href.includes('demo-trade') || /demo/i.test(a.textContent));
  const liveLinks = allLinks.filter(a => a.href.includes('/trade') && !a.href.includes('demo') && !a.href.includes('sign'));
  const combined = [...new Set([...demoLinks, ...liveLinks])];

  if (combined.length >= 2) {
    log('SmartLinks: Found via href/text patterns');
    combined.forEach(a => log(`  href="${a.href}" text="${a.textContent.trim()}" class="${a.className}"`));
    return combined;
  }

  // Try by text content specifically
  const byText = allLinks.filter(a => /demo\s*account/i.test(a.textContent) || /live\s*account/i.test(a.textContent));
  if (byText.length >= 2) {
    log('SmartLinks: Found via text content');
    return byText;
  }

  return byClass;
}

// ─── Get Balance Element Near Link ───────────────────────────────
function findBalanceNearLink(linkEl) {
  if (!linkEl) return null;

  // Next sibling
  let sib = linkEl.nextElementSibling;
  if (sib && (sib.matches('.YnoT0') || /\$[\d,]+\.\d{2}/.test(sib.textContent))) return sib;
  sib = linkEl.previousElementSibling;
  if (sib && (sib.matches('.YnoT0') || /\$[\d,]+\.\d{2}/.test(sib.textContent))) return sib;

  // Inside parent
  const parent = linkEl.parentElement;
  if (parent) {
    const found = parent.querySelector('.YnoT0') || smartFindInEl(parent);
    if (found) return found;
  }

  // Inside grandparent
  const gp = linkEl.parentElement?.parentElement;
  if (gp) {
    const found = gp.querySelector('.YnoT0') || smartFindInEl(gp);
    if (found) return found;
  }

  return null;
}

function smartFindInEl(root) {
  const all = root.querySelectorAll('b, span');
  for (const el of all) {
    if (/^\$[\d,]+\.\d{2}$/.test(el.textContent.trim())) return el;
  }
  return null;
}

// ─── Get Demo & Live Elements ────────────────────────────────────
function getAccountElements() {
  const links = smartFindLinks();
  const balances = smartFindBalances();

  log('getAccountElements: links=' + links.length + ' balances=' + balances.length);

  let demoLink = links.find(a => a.href.includes('demo') || /demo/i.test(a.textContent));
  let liveLink = links.find(a => !a.href.includes('demo') && (a.href.includes('/trade') || /live/i.test(a.textContent)));

  // If links not found by content, use position
  if (!demoLink && links.length > 0) demoLink = links[0];
  if (!liveLink && links.length > 1) liveLink = links[1];

  // Find balance elements
  let demoBal = null, liveBal = null;

  if (demoLink) {
    demoBal = findBalanceNearLink(demoLink);
  }
  if (liveLink) {
    liveBal = findBalanceNearLink(liveLink);
  }

  // Fallback: if we have 2 balances and haven't matched both
  if ((!demoBal || !liveBal) && balances.length >= 2) {
    if (!demoBal) demoBal = balances[0];
    if (!liveBal) liveBal = balances[1];
  }

  // Tag found elements for consistent reference
  if (demoBal) demoBal.setAttribute('data-cip-balance', 'demo');
  if (liveBal) liveBal.setAttribute('data-cip-balance', 'live');
  if (demoLink) demoLink.setAttribute('data-cip-link', 'demo');
  if (liveLink) liveLink.setAttribute('data-cip-link', 'live');

  return { demoLink, liveLink, demoBal, liveBal };
}

// ─── License ──────────────────────────────────────────────────────
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwoIA8hV6rJrxwxrONV7obD0TN88kM4fJCA9TIFMtPiX6lUlSyE8SxxQAWgjZHn1Bp_/exec';
const KEY_LICENSE = 'cip_license_key';

function getDeviceId() {
const nav = window.navigator;
const raw = [
nav.userAgent, nav.language,
screen.width + 'x' + screen.height,
screen.colorDepth, nav.hardwareConcurrency || '',
nav.platform || '',
Intl.DateTimeFormat().resolvedOptions().timeZone || ''
].join('|');
let hash = 0;
for (let i = 0; i < raw.length; i++) { hash = ((hash << 5) - hash) + raw.charCodeAt(i); hash |= 0; }
return 'D' + Math.abs(hash).toString(36).toUpperCase();
}
function getDeviceName() {
const ua = navigator.userAgent;
let os = 'PC';
if (/Windows NT 10/.test(ua)) os = 'Win10';
else if (/Windows NT 11/.test(ua)) os = 'Win11';
else if (/Windows/.test(ua)) os = 'Win';
else if (/Android/.test(ua)) os = 'Android';
else if (/iPhone/.test(ua)) os = 'iPhone';
else if (/iPad/.test(ua)) os = 'iPad';
else if (/Mac/.test(ua)) os = 'Mac';
else if (/Linux/.test(ua)) os = 'Linux';
let br = 'Browser';
if (/Edg\//.test(ua)) br = 'Edge';
else if (/OPR\/|Opera/.test(ua)) br = 'Opera';
else if (/Chrome\//.test(ua)) br = 'Chrome';
else if (/Firefox\//.test(ua)) br = 'Firefox';
else if (/Safari\//.test(ua)) br = 'Safari';
return br + '-' + os;
}
async function checkLicense(key) {
try {
const deviceId = getDeviceId();
const deviceName = getDeviceName();
const url = SCRIPT_URL + '?key=' + encodeURIComponent(key) + '&device=' + encodeURIComponent(deviceId) + '&dname=' + encodeURIComponent(deviceName);
const res = await fetch(url);
return (await res.text()).trim() === 'active';
} catch { return false; }
}
function showLicensePopup() {
if (document.getElementById('_license_popup')) return;
const overlay = document.createElement('div');
overlay.id = '_license_popup';
overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;z-index:99999999;backdrop-filter:blur(10px);font-family:sans-serif;';
overlay.innerHTML = '<div style="background:#1c1c2e;padding:32px;border-radius:18px;width:320px;color:#fff;border:1px solid #0faf59;text-align:center;"><div style="font-size:32px;margin-bottom:10px;">🔐</div><h3 style="color:#0faf59;margin:0 0 6px;">Dubai Live Trade</h3><p style="color:#888;font-size:12px;margin:0 0 20px;">Enter your license key to continue</p><input id="_lic_inp" type="text" placeholder="License Key" style="width:100%;padding:12px;background:#25253d;border:1px solid #444;color:#fff;border-radius:8px;box-sizing:border-box;font-size:14px;outline:none;text-align:center;letter-spacing:1px;"><div id="_lic_msg" style="height:20px;margin-top:8px;font-size:12px;color:#ff3e3e;"></div><button id="_lic_btn" style="width:100%;padding:13px;background:#0faf59;border:none;color:#fff;font-weight:bold;font-size:14px;cursor:pointer;border-radius:8px;margin-top:8px;">VERIFY KEY</button></div>';
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
msg.textContent = '❌ Invalid or blocked key! Contact admin.';
btn.textContent = 'VERIFY KEY'; btn.style.background = '#0faf59'; btn.disabled = false;
inp.style.borderColor = '#ff3e3e';
}
};
inp.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });
}
// ─── Storage Keys ────────────────────────────────────────────────
const KEY_LB = 'leaderboard';
const KEY_INIT = 'initBalance';
const KEY_POSITION = 'lb_position';
const KEY_PNL = 'manual_pnl';
const KEY_PNL_MODE = 'pnl_mode';
const KEY_PROGRESS = 'lb_progress';
const KEY_FS593 = 'fs593_value';
const KEY_AUTO_PATTI = 'auto_patti_on';
// ─── State ───────────────────────────────────────────────────────
let initialBal = Number(localStorage.getItem(KEY_INIT) || 0);
let manualPnl = localStorage.getItem(KEY_PNL) !== null ? Number(localStorage.getItem(KEY_PNL)) : null;
let pnlMode = localStorage.getItem(KEY_PNL_MODE) || 'auto';
let savedPosition = localStorage.getItem(KEY_POSITION) || null;
let savedProgress = localStorage.getItem(KEY_PROGRESS) !== null ? Number(localStorage.getItem(KEY_PROGRESS)) : null;
let savedFs593 = localStorage.getItem(KEY_FS593) || null;
let autoPatti = localStorage.getItem(KEY_AUTO_PATTI) === 'true';
let _cipApplied = false; // Guard: only apply once after init

// ─── Old Selectors (fast path) ───────────────────────────────────
const SEL_NAME = '.SfrTV.TmWTp';
const SEL_ICON = '.ePf8T svg use, .lmj_k svg use';
const SEL_LBNAME = '.xN5cX p';
const SEL_LBMONY = '.BwWCZ';
const SEL_ITEMS = 'li.CWnO_';
const SEL_PROFIT = '.position__header-money.--green, .position__header-money.--red';

// ─── Banner Hide ─────────────────────────────────────────────────
(function(){
const s = document.createElement('style');
s.textContent = '.ylLrz,.lcyZD,.ryS8w,.r7UKG,.P86XK,.VRCVp,[class*="deposit-bonus"],[class*="depositBonus"],[class*="bonus-notification"],[class*="bonusNotification"],[class*="promo-notification"],[class*="promoNotification"]{display:none!important}';
(document.head||document.documentElement).appendChild(s);
})();
function hideBonusBanner() {
document.querySelectorAll('.ylLrz,.lcyZD,.ryS8w,.rGMix,.s3s3P,.r7UKG').forEach(el=>el.style.setProperty('display','none','important'));
document.querySelectorAll('*').forEach(el=>{
if(el.children.length<12&&el.offsetHeight>0&&el.offsetHeight<150&&/bonus/i.test(el.innerText||'')&&/50%/i.test(el.innerText||'')){
(el.closest('a[href],[class*="banner"],[class*="promo"],[class*="bonus"],[class*="notification"]')||el).style.setProperty('display','none','important');
}
});
// Smart: hide any element with "bonus" in a banner-like container
document.querySelectorAll('[class*="banner"], [class*="promo"], [class*="bonus"]').forEach(el => {
if (/50%/i.test(el.textContent) || /bonus/i.test(el.textContent)) {
el.style.setProperty('display', 'none', 'important');
}
});
}
function fixUrl() {
if(location.href.includes('/demo-trade'))
history.replaceState(null, '', location.href.replace('/demo-trade', '/trade'));
}
function updateFs593() {
if(!savedFs593) return;
document.querySelectorAll('.fs593').forEach(el=>{ if(el.textContent!==savedFs593) el.textContent=savedFs593; });
}
// ─── Progress Bar ────────────────────────────────────────────────
function updateProgressBar(pct, isLoss) {
const p = Math.min(100, Math.max(0, pct));
const c = isLoss ? '#ff3e3e' : '#0faf59';
document.querySelectorAll('.KBHoM').forEach(el=>{
el.style.setProperty('width', p+'%', 'important');
el.style.setProperty('background', c, 'important');
el.style.setProperty('background-color', c, 'important');
el.style.setProperty('margin-left', '0%', 'important');
el.style.setProperty('transition', 'all 0.6s ease', 'important');
});
}
// ─── Auto Patti ───────────────────────────────────────────────────
function applyPatti(isLoss) {
const c = isLoss ? '#ff3e3e' : '#0faf59';
document.querySelectorAll('.KBHoM').forEach(el=>{
el.style.setProperty('background', c, 'important');
el.style.setProperty('background-color', c, 'important');
el.style.setProperty('height', '4px','important');
});
document.querySelectorAll('.h38TV').forEach(el=>el.style.setProperty('height','4px','important'));
}
function startAutoPatti() {
autoPatti = true;
localStorage.setItem(KEY_AUTO_PATTI,'true');
const bal = getActiveBalance();
applyPatti((bal - initialBal) < 0);
}
function stopAutoPatti() {
autoPatti = false;
localStorage.setItem(KEY_AUTO_PATTI,'false');
document.querySelectorAll('.KBHoM').forEach(el=>el.style.setProperty('height','4px','important'));
}

// ─── Get active balance ──────────────────────────────────────────
function getActiveBalance() {
  // Try tagged elements first
  const taggedDemo = document.querySelector('[data-cip-balance="demo"]');
  const taggedLive = document.querySelector('[data-cip-balance="live"]');

  // If we're on demo page, the demo balance is active
  if (location.href.includes('demo')) {
    if (taggedDemo) return safeNum(taggedDemo.textContent);
  }

  // Try active link's balance
  const links = smartFindLinks();
  const activeLink = links.find(a => a.classList.contains('active') || a.hasAttribute('aria-current'));
  if (activeLink) {
    const bal = findBalanceNearLink(activeLink);
    if (bal) return safeNum(bal.textContent);
  }

  // First $ amount element
  const all = $$('b, span');
  for (const el of all) {
    if (/^\$[\d,]+\.\d{2}$/.test(el.textContent.trim())) {
      return safeNum(el.textContent);
    }
  }
  return 0;
}

// ─── Main UI Update ──────────────────────────────────────────────
function updateUI(force) {
if (!force && _cipApplied) {
  // Still run maintenance tasks but skip balance swap
  hideBonusBanner();
  updateFs593();
  return;
}

log('updateUI() — URL:', location.href);

fixUrl();
hideBonusBanner();
updateFs593();

const bal = getActiveBalance();
log('Active balance:', bal);

const realDiff = bal - initialBal;
const diff = (pnlMode === 'manual' && manualPnl !== null) ? manualPnl : realDiff;
const isLoss = diff < 0;
const color = isLoss ? '#ff3e3e' : '#0faf59';
const shown = fmtAmt(Math.abs(diff));

// ─── Step 1: Find ALL the elements ───────────────────────────────
const { demoLink, liveLink, demoBal, liveBal } = getAccountElements();

log('Elements found:');
log('  demoLink:', demoLink ? demoLink.textContent.trim() : 'NO');
log('  liveLink:', liveLink ? liveLink.textContent.trim() : 'NO');
log('  demoBal:', demoBal ? demoBal.textContent.trim() : 'NO');
log('  liveBal:', liveBal ? liveBal.textContent.trim() : 'NO');

if (demoBal && liveBal) {
  // ── Set demo balance to fixed $10,000 ──────────────────────────
  if (demoBal.textContent !== '$10,000.00') {
    demoBal.textContent = '$10,000.00';
    log('✅ Set demo balance to $10,000.00');
  }

  // ── Copy demo balance to live balance ─────────────────────────
  const liveBalStr = fmtAmt(bal);
  if (liveBal.textContent !== liveBalStr) {
    liveBal.textContent = liveBalStr;
    log('✅ Set live balance to:', liveBalStr);
  }

  // ── Switch active state to Live ──────────────────────────────
  if (liveLink && demoLink) {
    if (!liveLink.classList.contains('active') && !liveLink.hasAttribute('aria-current')) {
      demoLink.classList.remove('active');
      demoLink.removeAttribute('aria-current');
      liveLink.classList.add('active');
      liveLink.setAttribute('aria-current', 'page');
      log('✅ Switched active tab to Live');
    }

    // Also force the visual
    liveLink.style.color = '#0faf59';
    if (demoLink) demoLink.style.color = '';
  }

  _cipApplied = true;
} else {
  log('❌ Could not find both balance elements!');
  log('  Available <b> with $:');
  $$('b').forEach((el, i) => {
    if (/\$/.test(el.textContent)) log('    <b>#' + i + ': "' + el.textContent.trim() + '" class="' + el.className + '"');
  });
}

// ─── Step 2: Update name to "Live" ──────────────────────────────
const nameEl = $(SEL_NAME);
if (nameEl && nameEl.textContent !== 'Live') {
nameEl.textContent = 'Live';
nameEl.style.color = '#0faf59';
nameEl.style.fontWeight = 'bold';
log('✅ Updated name to Live');
}

// ─── Step 3: Update level icon ──────────────────────────────────
const level = bal>9999?'vip':(bal>4999?'pro':'standart');
const icon = $(SEL_ICON);
if (icon) {
const href = '/profile/images/spritemap.svg#icon-profile-level-' + level;
if (icon.getAttribute('xlink:href') !== href) icon.setAttribute('xlink:href', href);
}

// ─── Step 4: Fallback old method ────────────────────────────────
const items = $$(SEL_ITEMS);
const demoLi = items.find(li=>/demo/i.test(li.innerText));
const liveLi = items.find(li=>/\blive\b/i.test(li.innerText));
if (demoLi && liveLi) {
log('Fallback: using li.CWnO_ method');
const bDemo = demoLi.querySelector('b') || demoLi.querySelector('[data-cip-balance="demo"]') || demoLi.querySelector('.YnoT0');
const bLive = liveLi.querySelector('b') || liveLi.querySelector('[data-cip-balance="live"]') || liveLi.querySelector('.YnoT0');
if (bDemo) bDemo.textContent = '$10,000.00';
if (bLive) bLive.textContent = shown;
const activeClass = demoLi.classList[0] && liveLi.classList.contains(demoLi.classList[0])
? (c=>{const r=[...demoLi.classList].filter(x=>x!=='active');return r.length?r[0]:'P5n2A';})()
: 'P5n2A';
if (!liveLi.classList.contains(activeClass)) {
demoLi.classList.remove(activeClass);
liveLi.classList.add(activeClass);
}
}

// ─── Step 5: Update profit display ──────────────────────────────
const profitEl = $(SEL_PROFIT);
if (profitEl) { profitEl.innerText = shown; profitEl.style.color = color; }

// ─── Step 6: Update leaderboard ─────────────────────────────────
const lbData = JSON.parse(localStorage.getItem(KEY_LB)||'{"name":"Live"}');
$$(SEL_LBNAME).forEach(el=>{ if(el.textContent!==lbData.name) el.textContent=lbData.name; });
$$(SEL_LBMONY).forEach(el=>{ el.textContent=shown; el.style.color=color; });

if (savedPosition) updatePositionDisplay(savedPosition);
if (savedProgress !== null) updateProgressBar(savedProgress, isLoss);
if (autoPatti) applyPatti(isLoss);
}
// ─── Line Animation ───────────────────────────────────────────────
let _laf=null, _llt=0;
function tickLine(ts) {
if(ts-_llt>=800){ _llt=ts;
document.querySelectorAll('.chart-line,[class*="chartLine"],[class*="trade-line"],[class*="tradeLine"],path[stroke],polyline,line[x1]').forEach(el=>{
el.style.transform=el.style.transform.includes('translateZ')?'':'translateZ(0)';
});
document.querySelectorAll('canvas').forEach(c=>{
if(c.getContext&&c.getContext('2d')) c.dispatchEvent(new Event('resize',{bubbles:true}));
});
}
_laf=requestAnimationFrame(tickLine);
}
function startLineAnimation(){ if(!_laf) _laf=requestAnimationFrame(tickLine); }
// ─── Position Text ────────────────────────────────────────────────
function updatePositionDisplay(v) {
document.querySelectorAll('.iKtL6').forEach(w=>{
const lbl=w.querySelector('.ocuJC');
if(!lbl||!/your\s+position/i.test(lbl.textContent)) return;
w.childNodes.forEach(n=>{ if(n.nodeType===Node.TEXT_NODE) n.textContent=v; });
});
}
// ─── MutationObserver - resets _cipApplied if tab switches ────────
let _uiT;
new MutationObserver(()=>{ 
  clearTimeout(_uiT); 
  _uiT=setTimeout(() => {
    // Check if active tab changed — if so, reset and re-apply
    const links = smartFindLinks();
    const wasDemoActive = links.some(a => a.classList.contains('active') && a.href.includes('demo'));
    if (wasDemoActive && _cipApplied) {
      log('Tab switched back to demo — reapplying...');
      _cipApplied = false;
      updateUI(true);
    } else {
      updateUI(false);
    }
  }, 100); 
})
.observe(document.body,{childList:true,subtree:true,characterData:true});
// ─── Floating Button ──────────────────────────────────────────────
let _hideT=null;
function showFloatingBtn() {
let btn=document.getElementById('_lb_float_btn');
if(!btn){
btn=document.createElement('div');
btn.id='_lb_float_btn'; btn.textContent='🎯';
btn.style.cssText='position:fixed;bottom:130px;right:16px;width:42px;height:42px;background:#1c1c2e;border:2px solid #0faf59;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;z-index:99999;box-shadow:0 2px 14px rgba(15,175,89,0.4);transition:opacity 0.4s ease;opacity:1;-webkit-tap-highlight-color:transparent;touch-action:manipulation;';
btn.addEventListener('click', openSettingsPopup);
document.body.appendChild(btn);
}
btn.style.opacity='1'; btn.style.display='flex'; btn.style.pointerEvents='auto';
clearTimeout(_hideT);
_hideT=setTimeout(()=>{
btn.style.opacity='0';
setTimeout(()=>{ btn.style.display='none'; btn.style.pointerEvents='none'; },400);
},10000);
}
window.addEventListener('_ext_showBtn', showFloatingBtn);
// ═══════════════════════════════════════════════════════════════════
// Settings Popup (unchanged)
// ═══════════════════════════════════════════════════════════════════
function openSettingsPopup() {
if(document.getElementById('_pos_popup')) return;
const lbData = JSON.parse(localStorage.getItem(KEY_LB)||'{"name":"Live"}');
const isManual = pnlMode === 'manual';
const curPnl = (isManual && manualPnl !== null) ? Math.abs(manualPnl) : '';
const isLoss = isManual && manualPnl !== null && manualPnl < 0;
const prog = savedProgress !== null ? savedProgress : 0;
const overlay = document.createElement('div');
overlay.id = '_pos_popup';
overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;z-index:9999999;backdrop-filter:blur(7px);overflow-y:auto;-webkit-overflow-scrolling:touch;';
overlay.innerHTML = '<div style="background:#1c1c2e;padding:14px 16px;border-radius:14px;width:310px;max-width:95vw;color:#fff;border:1px solid #0faf59;font-family:sans-serif;margin:10px auto;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><span style="color:#0faf59;font-size:13px;font-weight:bold;">⚙️ Leaderboard Settings</span><span id="_pos_close" style="cursor:pointer;font-size:18px;color:#aaa;padding:2px 7px;border-radius:4px;background:#333;">✕</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;"><div><label style="font-size:10px;color:#888;display:block;margin-bottom:2px;">Trader Name</label><input id="_inp_name" value="' + lbData.name + '" style="width:100%;padding:7px 8px;background:#25253d;border:1px solid #444;color:#fff;border-radius:6px;box-sizing:border-box;font-size:12px;outline:none;"></div><div><label style="font-size:10px;color:#888;display:block;margin-bottom:2px;">Position #</label><input id="_inp_pos" value="' + (savedPosition||'') + '" placeholder="+3" style="width:100%;padding:7px 8px;background:#25253d;border:1px solid #444;color:#fff;border-radius:6px;box-sizing:border-box;font-size:12px;outline:none;"></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;"><div><label style="font-size:10px;color:#888;display:block;margin-bottom:2px;">Trade History</label><input id="_inp_fs593" value="' + (savedFs593||'') + '" placeholder="e.g. 47" style="width:100%;padding:7px 8px;background:#25253d;border:1px solid #444;color:#fff;border-radius:6px;box-sizing:border-box;font-size:12px;outline:none;"></div><div><label style="font-size:10px;color:#888;display:block;margin-bottom:2px;">Starting Balance $</label><input id="_inp_init" type="number" value="' + (initialBal>0?initialBal:'') + '" placeholder="e.g. 5000" style="width:100%;padding:7px 8px;background:#25253d;border:1px solid #0faf59;color:#fff;border-radius:6px;box-sizing:border-box;font-size:12px;outline:none;"></div></div><label style="font-size:10px;color:#888;display:block;margin-bottom:4px;">Profit/Loss Mode</label><div style="display:flex;gap:6px;margin-bottom:8px;"><button id="_btn_auto" style="flex:1;padding:8px;border-radius:6px;font-size:11px;font-weight:bold;cursor:pointer;border:2px solid ' + (!isManual?'#0faf59':'#444') + ';background:' + (!isManual?'#0faf59':'transparent') + ';color:#fff;">⚡ Auto</button><button id="_btn_manual" style="flex:1;padding:8px;border-radius:6px;font-size:11px;font-weight:bold;cursor:pointer;border:2px solid ' + (isManual?'#0faf59':'#444') + ';background:' + (isManual?'#0faf59':'transparent') + ';color:#fff;">✏️ Manual</button></div><div id="_auto_info" style="display:' + (!isManual?'flex':'none') + ';align-items:center;gap:8px;margin-bottom:8px;padding:8px 10px;background:#0a2010;border:1px solid #0faf5944;border-radius:8px;"><span style="font-size:16px;">⚡</span><span style="font-size:11px;color:#0faf59;line-height:1.4;">Starting Balance se real-time profit/loss auto show hoga</span></div><div id="_manual_box" style="display:' + (isManual?'block':'none') + ';margin-bottom:8px;padding:8px;background:#0d0d1a;border-radius:8px;border:1px solid #333;"><label style="font-size:10px;color:#888;display:block;margin-bottom:4px;">Manual Amount</label><div style="display:flex;gap:6px;margin-bottom:6px;"><button id="_btn_profit" style="flex:1;padding:7px;border:2px solid ' + (!isLoss?'#0faf59':'#444') + ';background:' + (!isLoss?'#0faf59':'transparent') + ';color:#fff;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;">✅ Profit</button><button id="_btn_loss" style="flex:1;padding:7px;border:2px solid ' + (isLoss?'#ff3e3e':'#444') + ';background:' + (isLoss?'#ff3e3e':'transparent') + ';color:#fff;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;">❌ Loss</button></div><div style="display:flex;gap:6px;align-items:center;"><input id="_inp_pnl" type="number" min="0" value="' + curPnl + '" placeholder="e.g. 400" style="flex:1;padding:7px 8px;background:#25253d;color:#fff;border-radius:6px;border:1px solid ' + (isLoss?'#ff3e3e':'#0faf59') + ';box-sizing:border-box;font-size:12px;outline:none;"><div id="_pnl_prev" style="min-width:72px;text-align:center;font-size:13px;font-weight:bold;padding:7px 4px;background:#25253d;border-radius:6px;color:' + (isLoss?'#ff3e3e':'#0faf59') + '">' + (curPnl!==''?fmtAmt(Number(curPnl)):'—') + '</div></div></div><label style="font-size:10px;color:#888;display:block;margin-bottom:2px;">Progress Bar %</label><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;"><input id="_inp_prog" type="range" min="0" max="100" value="' + prog + '" style="flex:1;accent-color:#0faf59;cursor:pointer;"><span id="_prog_val" style="min-width:34px;text-align:right;font-size:12px;color:#0faf59;font-weight:bold;">' + prog + '%</span></div><div style="width:100%;height:4px;background:#333;border-radius:2px;margin-bottom:10px;overflow:hidden;"><div id="_prog_prev" style="height:4px;border-radius:2px;transition:all 0.2s;background:' + (isLoss?'#ff3e3e':'#0faf59') + ';width:' + prog + '%;margin-left:0%;"></div></div><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding:7px 10px;background:#25253d;border-radius:7px;"><span style="font-size:11px;color:#ccc;">📊 Auto Patti (profit=green / loss=red)</span><div id="_patti_bg" style="width:36px;height:20px;border-radius:20px;background:' + (autoPatti?'#0faf59':'#444') + ';position:relative;cursor:pointer;transition:background .3s;flex-shrink:0;"><div id="_patti_dot" style="width:14px;height:14px;background:#fff;border-radius:50%;position:absolute;top:3px;left:' + (autoPatti?'19px':'3px') + ';transition:left .3s;"></div></div></div><button id="_btn_apply" style="width:100%;padding:10px;background:#0faf59;border:none;color:#fff;font-weight:bold;font-size:13px;cursor:pointer;border-radius:8px;">✅ Apply & Save</button></div>';
document.body.appendChild(overlay);
document.getElementById('_pos_close').onclick = () => overlay.remove();
let mode = pnlMode;
const btnAuto = document.getElementById('_btn_auto');
const btnManual = document.getElementById('_btn_manual');
const autoInfo = document.getElementById('_auto_info');
const manualBox = document.getElementById('_manual_box');
function setMode(m) { mode = m; btnAuto.style.background = m==='auto' ? '#0faf59' : 'transparent'; btnAuto.style.borderColor = m==='auto' ? '#0faf59' : '#444'; btnManual.style.background = m==='manual' ? '#0faf59' : 'transparent'; btnManual.style.borderColor= m==='manual' ? '#0faf59' : '#444'; autoInfo.style.display = m==='auto' ? 'flex' : 'none'; manualBox.style.display = m==='manual' ? 'block' : 'none'; }
btnAuto.onclick = () => setMode('auto');
btnManual.onclick = () => setMode('manual');
let lossMode = isLoss;
const pnlInp = document.getElementById('_inp_pnl');
const pnlPrev = document.getElementById('_pnl_prev');
const bProfit = document.getElementById('_btn_profit');
const bLoss = document.getElementById('_btn_loss');
const progPrev= document.getElementById('_prog_prev');
const progInp = document.getElementById('_inp_prog');
const progVal = document.getElementById('_prog_val');
function setLoss(l) { lossMode = l; bProfit.style.background = l ? 'transparent' : '#0faf59'; bProfit.style.borderColor = l ? '#444' : '#0faf59'; bLoss.style.background = l ? '#ff3e3e' : 'transparent'; bLoss.style.borderColor = l ? '#ff3e3e' : '#444'; pnlInp.style.borderColor = l ? '#ff3e3e' : '#0faf59'; pnlPrev.style.color = l ? '#ff3e3e' : '#0faf59'; progPrev.style.background = l ? '#ff3e3e' : '#0faf59'; progPrev.style.marginLeft = '0%'; }
bProfit.onclick = () => setLoss(false);
bLoss.onclick = () => setLoss(true);
pnlInp.addEventListener('input', () => { pnlPrev.textContent = fmtAmt(Math.abs(Number(pnlInp.value)||0)); });
progInp.addEventListener('input', () => { const pct = Number(progInp.value); progVal.textContent = pct+'%'; progPrev.style.width = pct+'%'; progPrev.style.background = lossMode ? '#ff3e3e' : '#0faf59'; progPrev.style.marginLeft = '0%'; });
let pattiOn = autoPatti;
const pattiBg = document.getElementById('_patti_bg');
const pattiDot = document.getElementById('_patti_dot');
pattiBg.onclick = () => { pattiOn = !pattiOn; pattiBg.style.background = pattiOn ? '#0faf59' : '#444'; pattiDot.style.left = pattiOn ? '19px' : '3px'; };
document.getElementById('_btn_apply').onclick = () => {
const nameVal = document.getElementById('_inp_name').value.trim() || 'Live';
const posVal = document.getElementById('_inp_pos').value.trim();
const fs593Val = document.getElementById('_inp_fs593').value.trim();
const initVal = Number(document.getElementById('_inp_init').value);
const progPct = Number(progInp.value);
if (initVal > 0) { initialBal = initVal; localStorage.setItem(KEY_INIT, initVal); }
localStorage.setItem(KEY_LB, JSON.stringify({name: nameVal}));
if (posVal) { savedPosition=posVal; localStorage.setItem(KEY_POSITION, posVal); }
if (fs593Val) { savedFs593=fs593Val; localStorage.setItem(KEY_FS593, fs593Val); }
savedProgress = progPct; localStorage.setItem(KEY_PROGRESS, progPct);
pnlMode = mode; localStorage.setItem(KEY_PNL_MODE, mode);
if (mode === 'manual') { const absVal = Math.abs(Number(pnlInp.value)||0); manualPnl = lossMode ? -absVal : absVal; localStorage.setItem(KEY_PNL, manualPnl); }
if (pattiOn && !autoPatti) startAutoPatti();
else if (!pattiOn && autoPatti) stopAutoPatti();
overlay.remove(); _cipApplied = false; updateUI(true);
};
}
// ─── Deposit button ───────────────────────────────────────────────
document.addEventListener('click', e=>{
if(e.target.closest('a,button')&&/deposit/i.test(e.target.textContent)){
e.preventDefault(); openSettingsPopup();
}
}, true);
// ─── Init ─────────────────────────────────────────────────────────
function init() {
log('init() called');
debugDumpCandidates();
hideBonusBanner();
startLineAnimation();
setTimeout(()=>{
log('Running delayed init tasks');
fixUrl(); hideBonusBanner(); updateFs593();
showFloatingBtn(); updateUI(true);
if(autoPatti) startAutoPatti();
let n=0;
const t=setInterval(()=>{ hideBonusBanner(); if(++n>20) clearInterval(t); },500);
}, 1500);
// Also try again after 3 seconds in case the page is still loading
setTimeout(() => {
log('2nd init attempt');
if (!_cipApplied) {
  debugDumpCandidates();
  updateUI(true);
}
}, 4000);
// And again after 6 seconds
setTimeout(() => {
log('3rd init attempt');
if (!_cipApplied) {
  debugDumpCandidates();
  updateUI(true);
}
}, 7000);
}
// ─── License Check ────────────────────────────────────────────────
(async()=>{
const key = localStorage.getItem(KEY_LICENSE);
if(!key){ log('No license key found, showing popup'); showLicensePopup(); return; }
log('License key found, verifying...');
try {
const ctrl = new AbortController();
const tm = setTimeout(()=>ctrl.abort(), 10000);
const deviceId = getDeviceId();
const deviceName = getDeviceName();
const url = SCRIPT_URL + '?key=' + encodeURIComponent(key) + '&device=' + encodeURIComponent(deviceId) + '&dname=' + encodeURIComponent(deviceName);
const res = await fetch(url, {signal: ctrl.signal});
clearTimeout(tm);
const result = (await res.text()).trim();
log('License check result:', result);
if(result==='active'){ log('License active, initializing'); init(); }
else { log('License invalid'); localStorage.removeItem(KEY_LICENSE); showLicensePopup(); }
} catch(e) {
log('License check error:', e.message);
localStorage.removeItem(KEY_LICENSE); showLicensePopup();
}
})();
})();
