'use strict';

// Enterprise Error Boundary
window.onerror = function (msg, url, line, col, error) {
  console.error('[TimeConverter Error]', { msg, url, line, error });
  // In a real enterprise app, you'd send this to Sentry/LogRocket
  return false;
};

const Z_LK = 'Asia/Colombo';
const Z_ATL = 'America/New_York';

// State
let state = {
  direction: 'lk-to-atl', // or 'atl-to-lk'
  date: '',
  time: '',
  format: '12' // '12' or '24'
};

// DOM Elements
const els = {
  swapBtn: document.getElementById('swap-btn'),
  fromCity: document.getElementById('from-city'),
  fromTz: document.getElementById('from-tz'),
  toCity: document.getElementById('to-city'),
  toTz: document.getElementById('to-tz'),
  dateIn: document.getElementById('date-in'),
  timeIn: document.getElementById('time-in'),
  useNowBtn: document.getElementById('use-now'),
  resTime: document.getElementById('result-time'),
  resDate: document.getElementById('result-date'),
  copyBtn: document.getElementById('copy-link'),
  nowLk: document.getElementById('now-lk'),
  nowAtl: document.getElementById('now-atl'),
  fmtInputs: document.querySelectorAll('input[name="fmt"]')
};

// Helpers
const fmtClock = (tz) => new Intl.DateTimeFormat('en-GB', {
  timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
});

const fmtResultTime = (tz, fmt) => new Intl.DateTimeFormat('en-US', {
  timeZone: tz,
  hour: 'numeric',
  minute: '2-digit',
  hour12: fmt === '12'
});

const fmtResultDate = (tz) => new Intl.DateTimeFormat('en-GB', {
  timeZone: tz, year: 'numeric', month: 'short', day: '2-digit', weekday: 'short'
});

// timezone offset logic
function getOffsetMinutes(timeZone, utcDate) {
  try {
    const f = new Intl.DateTimeFormat('en', {
      timeZone, timeZoneName: 'shortOffset',
      year: 'numeric', hour12: false
    });
    const tzn = f.formatToParts(utcDate).find(p => p.type === 'timeZoneName')?.value || '';
    const m = tzn.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
    if (m) {
      const sign = m[1] === '-' ? -1 : 1;
      const hh = parseInt(m[2], 10);
      const mm = parseInt(m[3] || '0', 10);
      return sign * (hh * 60 + mm);
    }
  } catch (_) { }

  // Fallback
  const d = new Date(utcDate);
  const str = d.toLocaleString('en-US', { timeZone, hour12: false });
  const localDate = new Date(str);
  const diff = localDate.getTime() - d.getTime();
  return Math.round(diff / 60000);
}

function timestampFromWall(timeZone, year, month, day, hour, minute) {
  const pretendUTC = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offMin = getOffsetMinutes(timeZone, pretendUTC);
  return pretendUTC.getTime() - offMin * 60_000;
}

function getTzAbbr(timeZone, dateObj) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone, timeZoneName: 'short'
    }).formatToParts(dateObj).find(p => p.type === 'timeZoneName')?.value || '';
  } catch (e) { return ''; }
}

// Update Functions
function render() {
  const isLkToAtl = state.direction === 'lk-to-atl';
  const fromTZ = isLkToAtl ? Z_LK : Z_ATL;
  const toTZ = isLkToAtl ? Z_ATL : Z_LK;

  // 0. Pre-calculate date object to get correct DST abbreviations
  let dateObj = new Date();
  if (state.date && state.time) {
    const [y, m, d] = state.date.split('-').map(Number);
    const [H, M] = state.time.split(':').map(Number);
    const ms = timestampFromWall(fromTZ, y, m, d, H, M);
    dateObj = new Date(ms);
  }

  // 1. Update Labels with DST info
  const fromAbbr = getTzAbbr(fromTZ, dateObj);
  const toAbbr = getTzAbbr(toTZ, dateObj);

  if (isLkToAtl) {
    els.fromCity.textContent = 'Colombo';
    els.fromTz.textContent = `Asia/Colombo (${fromAbbr})`;

    els.toCity.textContent = 'Atlanta';
    els.toTz.textContent = `America/New_York (${toAbbr})`; // Will show EST or EDT
  } else {
    els.fromCity.textContent = 'Atlanta';
    els.fromTz.textContent = `America/New_York (${fromAbbr})`;

    els.toCity.textContent = 'Colombo';
    els.toTz.textContent = `Asia/Colombo (${toAbbr})`;
  }

  // 2. Set Inputs
  if (document.activeElement !== els.dateIn && document.activeElement !== els.timeIn) {
    els.dateIn.value = state.date;
    els.timeIn.value = state.time;
  }

  // 3. Calculate Result
  if (!state.date || !state.time) {
    els.resTime.textContent = '--:--';
    els.resDate.textContent = '-- --- ----';
    return;
  }

  els.resTime.textContent = fmtResultTime(toTZ, state.format).format(dateObj);
  els.resDate.textContent = fmtResultDate(toTZ).format(dateObj);

  // 4. Update URL
  updateURL();
}

function updateURL() {
  const params = new URLSearchParams();
  params.set('dir', state.direction);
  if (state.date) params.set('date', state.date);
  if (state.time) params.set('time', state.time);
  if (state.format !== '12') params.set('fmt', state.format); // Only add if not default

  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', newUrl);
}

function readURL() {
  const params = new URLSearchParams(window.location.search);
  const dir = params.get('dir');
  const date = params.get('date');
  const time = params.get('time');
  const format = params.get('fmt');

  if (dir === 'lk-to-atl' || dir === 'atl-to-lk') state.direction = dir;
  if (date) state.date = date;
  if (time) state.time = time;
  if (format === '24') state.format = format; // Only '24' is non-default

  // Set radio button for format
  els.fmtInputs.forEach(input => {
    if (input.value === state.format) {
      input.checked = true;
    }
  });

  // If no date/time in URL, default to now in current source TZ
  if (!state.date || !state.time) {
    setToNow();
  } else {
    render();
  }
}

function setToNow() {
  const now = new Date();
  const tz = state.direction === 'lk-to-atl' ? Z_LK : Z_ATL;

  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now);

  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit'
  }).format(now).split(':');

  state.date = ymd;
  state.time = `${p[0]}:${p[1]}`;

  render();
}

// Live Clocks
function tick() {
  const now = new Date();
  els.nowLk.textContent = fmtClock(Z_LK, state.format).format(now);
  els.nowAtl.textContent = fmtClock(Z_ATL, state.format).format(now);
}
setInterval(tick, 1000);
tick();

// Event Listeners
els.fmtInputs.forEach(input => {
  input.addEventListener('change', (e) => {
    state.format = e.target.value;
    render();
    tick(); // Update clocks immediately
  });
});

els.swapBtn.addEventListener('click', () => {
  state.direction = state.direction === 'lk-to-atl' ? 'atl-to-lk' : 'lk-to-atl';
  // Recalculate inputs to match the *result* time? 
  // No, usually better to keep the inputs as they are or reset to now.
  // Let's reset to now for the new source to avoid confusion.
  setToNow(); // Also renders
});

els.useNowBtn.addEventListener('click', setToNow);

els.dateIn.addEventListener('input', (e) => {
  state.date = e.target.value;
  render();
});

els.timeIn.addEventListener('input', (e) => {
  state.time = e.target.value;
  render();
});

els.copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    const originalText = els.copyBtn.textContent;
    els.copyBtn.textContent = 'Copied!';
    els.copyBtn.style.background = 'var(--success)';
    setTimeout(() => {
      els.copyBtn.textContent = originalText;
      els.copyBtn.style.background = ''; // reset
    }, 2000);
  } catch (err) {
    console.error('Failed to copy', err);
  }
});

// Init
readURL();
