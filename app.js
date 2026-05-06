'use strict';

window.onerror = (msg, url, line, col, error) => {
  console.error('[ATL-LK Error]', { msg, url, line, error });
  return false;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const TZ = { ATL: 'America/New_York', LK: 'Asia/Colombo' };
const CITIES = { ATL: 'Atlanta', LK: 'Sri Lanka' };
const WORK   = { ATL: { start: 9, end: 17 }, LK: { start: 9, end: 18 } };
const LK_OFFSET_MIN = 330; // UTC+5:30, no DST

// ── Holiday Helpers ───────────────────────────────────────────────────────────
function nthWeekday(year, month, weekday, nth) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const first = ((weekday - start.getUTCDay() + 7) % 7) + 1;
  return new Date(Date.UTC(year, month - 1, first + (nth - 1) * 7)).toISOString().slice(0, 10);
}
function lastWeekday(year, month, weekday) {
  const last = new Date(Date.UTC(year, month, 0));
  last.setUTCDate(last.getUTCDate() - ((last.getUTCDay() - weekday + 7) % 7));
  return last.toISOString().slice(0, 10);
}
function formatDiffHours(atlOffMin) {
  const abs = Math.abs(LK_OFFSET_MIN - atlOffMin);
  return (abs % 60) ? `${Math.floor(abs / 60)}.5` : `${Math.floor(abs / 60)}`;
}

// ── Holiday Data ──────────────────────────────────────────────────────────────
// Poya days are full-moon public holidays in Sri Lanka.
// 2026 dates marked with * are approximate — verify with official LK calendar.
const LK_VARIABLE = {
  '2025-01-13': 'Duruthu Poya',   '2025-02-12': 'Navam Poya',
  '2025-03-13': 'Medin Poya',     '2025-04-12': 'Bak Poya',
  '2025-04-18': 'Good Friday',    '2025-05-12': 'Vesak Poya',
  '2025-06-11': 'Poson Poya',     '2025-07-10': 'Esala Poya',
  '2025-08-09': 'Nikini Poya',    '2025-09-05': 'Milad-un-Nabi',
  '2025-09-07': 'Binara Poya',    '2025-10-07': 'Vap Poya',
  '2025-10-20': 'Deepavali',      '2025-11-05': 'Ill Poya',
  '2025-12-04': 'Unduvap Poya',
  '2026-01-03': 'Duruthu Poya',   '2026-02-01': 'Navam Poya',
  '2026-03-03': 'Medin Poya',     '2026-04-02': 'Bak Poya',
  '2026-04-03': 'Good Friday',    '2026-05-01': 'Vesak Poya',
  '2026-05-31': 'Poson Poya',     '2026-06-30': 'Esala Poya',
  '2026-07-29': 'Nikini Poya',    '2026-08-28': 'Binara Poya',
  '2026-09-21': 'Milad-un-Nabi',  '2026-09-26': 'Vap Poya',
  '2026-10-18': 'Deepavali',      '2026-10-25': 'Ill Poya',
  '2026-11-24': 'Unduvap Poya',   '2026-12-23': 'Duruthu Poya',
};

function getUSHolidays(year) {
  return {
    [`${year}-01-01`]: "New Year's Day",
    [`${year}-06-19`]: 'Juneteenth',
    [`${year}-07-04`]: 'Independence Day',
    [`${year}-11-11`]: 'Veterans Day',
    [`${year}-12-25`]: 'Christmas',
    [nthWeekday(year,  1, 1, 3)]: 'MLK Day',
    [nthWeekday(year,  2, 1, 3)]: "Presidents' Day",
    [lastWeekday(year, 5, 1)]:    'Memorial Day',
    [nthWeekday(year,  9, 1, 1)]: 'Labor Day',
    [nthWeekday(year, 11, 4, 4)]: 'Thanksgiving',
  };
}
function getLKHolidays(year) {
  return {
    [`${year}-01-01`]: "New Year's Day",
    [`${year}-01-14`]: 'Thai Pongal Day',
    [`${year}-02-04`]: 'National Day',
    [`${year}-04-13`]: 'Sinhala & Tamil New Year Eve',
    [`${year}-04-14`]: 'Sinhala & Tamil New Year',
    [`${year}-05-01`]: 'May Day',
    [`${year}-12-25`]: 'Christmas Day',
    ...LK_VARIABLE,
  };
}
function getHolidayName(dateStr, key) {
  const year = parseInt(dateStr.slice(0, 4), 10);
  return (key === 'ATL' ? getUSHolidays(year) : getLKHolidays(year))[dateStr] || null;
}
function isWeekend(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow === 0 || dow === 6;
}

// ── State ─────────────────────────────────────────────────────────────────────
let state = { direction: 'atl-to-lk', date: '', time: '', format: '12' };

// ── DOM ───────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const els = {
  nowAtlTime:     $('now-atl-time'),
  nowAtlDate:     $('now-atl-date'),
  nowAtlZone:     $('now-atl-zone'),
  nowLkTime:      $('now-lk-time'),
  nowLkDate:      $('now-lk-date'),
  nowLkZone:      $('now-lk-zone'),
  timeDiff:       $('time-diff'),
  dstBanner:      $('dst-banner'),
  fromCity:       $('from-city'),
  fromTz:         $('from-tz'),
  toCity:         $('to-city'),
  toTz:           $('to-tz'),
  dateIn:         $('date-in'),
  timeIn:         $('time-in'),
  swapBtn:        $('swap-btn'),
  useNowBtn:      $('use-now'),
  resTime:        $('result-time'),
  resDate:        $('result-date'),
  resDayTag:      $('result-day-tag'),
  resultWarnings: $('result-warnings'),
  copyResult:     $('copy-result'),
  copyLink:       $('copy-link'),
  copyTeams:      $('copy-teams'),
  fmtInputs:      document.querySelectorAll('input[name="fmt"]'),
  meetingGrid:    $('meeting-grid'),
  bestWindows:    $('best-windows'),
  mpTodayNote:    $('mp-today-note'),
};

// ── Timezone Helpers ──────────────────────────────────────────────────────────
function getOffsetMinutes(timeZone, utcDate) {
  try {
    const f = new Intl.DateTimeFormat('en', {
      timeZone, timeZoneName: 'shortOffset', year: 'numeric', hour12: false,
    });
    const tzn = f.formatToParts(utcDate).find(p => p.type === 'timeZoneName')?.value || '';
    const m = tzn.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
    if (m) return (m[1] === '-' ? -1 : 1) * (parseInt(m[2], 10) * 60 + parseInt(m[3] || '0', 10));
  } catch (_) {}
  const str = utcDate.toLocaleString('en-US', { timeZone, hour12: false });
  return Math.round((new Date(str).getTime() - utcDate.getTime()) / 60000);
}
function timestampFromWall(timeZone, year, month, day, hour, minute) {
  const p = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  return p.getTime() - getOffsetMinutes(timeZone, p) * 60_000;
}
function getTzAbbr(timeZone, dateObj) {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
      .formatToParts(dateObj).find(p => p.type === 'timeZoneName')?.value || '';
  } catch { return ''; }
}
function getWallHour(timeZone, dateObj) {
  return parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', hour12: false }).format(dateObj), 10
  );
}
function getWallDay(timeZone, dateObj) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(dateObj);
}
function fmtTime(timeZone, dateObj, hour12) {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', hour12 }).format(dateObj);
}
function fmtDate(timeZone, dateObj) {
  return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric' }).format(dateObj);
}
function fmtDateLong(timeZone, dateObj) {
  return new Intl.DateTimeFormat('en-US', { timeZone, month: 'long', day: 'numeric' }).format(dateObj);
}
function addDaysToDateStr(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
function getNextMondayFromDateStr(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const days = date.getUTCDay() === 1 ? 7 : (8 - date.getUTCDay()) % 7;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// ── Time Diff Badge ───────────────────────────────────────────────────────────
function computeTimeDiff(dateObj) {
  const atlOff = getOffsetMinutes(TZ.ATL, dateObj);
  const diffMin = LK_OFFSET_MIN - atlOff;
  const abs = Math.abs(diffMin);
  const label = (abs % 60) ? `${Math.floor(abs / 60)}.5` : `${Math.floor(abs / 60)}`;
  return `Sri Lanka is ${label}h ${diffMin > 0 ? 'ahead of' : 'behind'} Atlanta`;
}

// ── DST Banner ────────────────────────────────────────────────────────────────
function getUpcomingDstChange(from) {
  const baseOff = getOffsetMinutes(TZ.ATL, from);
  for (let days = 1; days <= 14; days++) {
    const future = new Date(from.getTime() + days * 86_400_000);
    const futureOff = getOffsetMinutes(TZ.ATL, future);
    if (futureOff !== baseOff) return { days, date: future, fromOff: baseOff, toOff: futureOff };
  }
  return null;
}
function updateDstBanner(now) {
  const change = getUpcomingDstChange(now);
  if (!change) { els.dstBanner.hidden = true; return; }
  const { days, date: t, fromOff, toOff } = change;
  const verb     = toOff > fromOff ? 'spring forward' : 'fall back';
  const daysText = days === 1 ? 'tomorrow' : `in ${days} days`;
  const dateStr  = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(t);
  els.dstBanner.innerHTML =
    `⏰ Atlanta clocks <strong>${verb}</strong> ${daysText} (${dateStr}) — ` +
    `time difference changes from ${formatDiffHours(fromOff)}h to ${formatDiffHours(toOff)}h`;
  els.dstBanner.hidden = false;
}

// ── Live Clocks ───────────────────────────────────────────────────────────────
function tick() {
  const now    = new Date();
  const hour12 = state.format === '12';
  els.nowAtlTime.textContent = fmtTime(TZ.ATL, now, hour12);
  els.nowAtlDate.textContent = fmtDate(TZ.ATL, now);
  els.nowAtlZone.textContent = `America/New_York · ${getTzAbbr(TZ.ATL, now)}`;
  els.nowLkTime.textContent  = fmtTime(TZ.LK,  now, hour12);
  els.nowLkDate.textContent  = fmtDate(TZ.LK,  now);
  els.timeDiff.textContent   = computeTimeDiff(now);
  const min = Math.floor(now / 60000);
  if (tick._min !== min) { tick._min = min; updateDstBanner(now); renderMeetingPlanner(); }
}
setInterval(tick, 1000);

// ── Warnings ──────────────────────────────────────────────────────────────────
function updateWarnings(fromKey, toKey, fromDay, toDay) {
  const items = [];
  if (isWeekend(fromDay))                  items.push(`📅 Weekend in ${CITIES[fromKey]}`);
  const fHol = getHolidayName(fromDay, fromKey);
  if (fHol)                                items.push(`🎉 ${fHol} — ${CITIES[fromKey]}`);
  if (isWeekend(toDay))                    items.push(`📅 Weekend in ${CITIES[toKey]}`);
  const tHol = getHolidayName(toDay, toKey);
  if (tHol)                                items.push(`🎉 ${tHol} — ${CITIES[toKey]}`);
  const el = els.resultWarnings;
  if (!items.length) { el.hidden = true; el.innerHTML = ''; return; }
  el.innerHTML = items.map(t => `<span class="warn-badge">${t}</span>`).join('');
  el.hidden = false;
}

// ── Converter Render ──────────────────────────────────────────────────────────
function render() {
  const isAtoL  = state.direction === 'atl-to-lk';
  const fromKey = isAtoL ? 'ATL' : 'LK';
  const toKey   = isAtoL ? 'LK'  : 'ATL';
  const fromTZ  = TZ[fromKey];
  const toTZ    = TZ[toKey];

  let dateObj = new Date();
  if (state.date && state.time) {
    const [y, m, d] = state.date.split('-').map(Number);
    const [H, M]    = state.time.split(':').map(Number);
    dateObj = new Date(timestampFromWall(fromTZ, y, m, d, H, M));
  }

  els.fromCity.textContent = CITIES[fromKey];
  els.fromTz.textContent   = `${fromTZ} · ${getTzAbbr(fromTZ, dateObj)}`;
  els.toCity.textContent   = CITIES[toKey];
  els.toTz.textContent     = `${toTZ} · ${getTzAbbr(toTZ, dateObj)}`;

  if (document.activeElement !== els.dateIn && document.activeElement !== els.timeIn) {
    els.dateIn.value = state.date;
    els.timeIn.value = state.time;
  }

  const hasInput = !!(state.date && state.time);
  els.copyResult.disabled = !hasInput;
  els.copyTeams.disabled  = !hasInput;

  if (!hasInput) {
    els.resTime.textContent   = '--:--';
    els.resDate.textContent   = '';
    els.resDayTag.className   = 'day-tag';
    els.resultWarnings.hidden = true;
    return;
  }

  els.resTime.textContent = fmtTime(toTZ, dateObj, state.format === '12');
  els.resDate.textContent = fmtDateLong(toTZ, dateObj);

  const fromDay = getWallDay(fromTZ, dateObj);
  const toDay   = getWallDay(toTZ,   dateObj);

  if (fromDay !== toDay) {
    const diff = Math.round((new Date(toDay) - new Date(fromDay)) / 86400000);
    if (diff === 1)       { els.resDayTag.textContent = 'next day'; els.resDayTag.className = 'day-tag visible next'; }
    else if (diff === -1) { els.resDayTag.textContent = 'prev day'; els.resDayTag.className = 'day-tag visible prev'; }
    else                  { els.resDayTag.className = 'day-tag'; }
  } else {
    els.resDayTag.className = 'day-tag';
  }

  updateWarnings(fromKey, toKey, fromDay, toDay);
  updateURL();
}

// ── setToNow ──────────────────────────────────────────────────────────────────
function setToNow() {
  const now = new Date();
  const tz  = state.direction === 'atl-to-lk' ? TZ.ATL : TZ.LK;
  state.date = getWallDay(tz, now);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit',
  }).format(now).split(':');
  state.time = `${parts[0]}:${parts[1]}`;
  render();
}

// ── Quick Presets ─────────────────────────────────────────────────────────────
function applyPreset(type) {
  if (type === 'now') { setToNow(); return; }
  const now = new Date();
  switch (type) {
    case 'tomorrow-atl': state.direction = 'atl-to-lk'; state.date = addDaysToDateStr(getWallDay(TZ.ATL, now), 1); state.time = '09:00'; break;
    case 'tomorrow-lk':  state.direction = 'lk-to-atl'; state.date = addDaysToDateStr(getWallDay(TZ.LK,  now), 1); state.time = '09:00'; break;
    case 'monday-atl':   state.direction = 'atl-to-lk'; state.date = getNextMondayFromDateStr(getWallDay(TZ.ATL, now)); state.time = '09:00'; break;
    case 'monday-lk':    state.direction = 'lk-to-atl'; state.date = getNextMondayFromDateStr(getWallDay(TZ.LK,  now)); state.time = '09:00'; break;
  }
  render();
}

// ── Meeting Planner ───────────────────────────────────────────────────────────
function renderMeetingPlanner() {
  if (!els.meetingGrid || !els.bestWindows) return;
  const now      = new Date();
  const todayAtl = getWallDay(TZ.ATL, now);
  const todayLk  = getWallDay(TZ.LK,  now);
  const [y, m, d] = todayAtl.split('-').map(Number);

  // Today holiday / weekend note
  if (els.mpTodayNote) {
    const notes = [];
    if (isWeekend(todayAtl))                         notes.push('Atlanta: weekend');
    const aHol = getHolidayName(todayAtl, 'ATL');
    if (aHol)                                         notes.push(`Atlanta: ${aHol}`);
    if (isWeekend(todayLk))                          notes.push('Sri Lanka: weekend');
    const lHol = getHolidayName(todayLk, 'LK');
    if (lHol)                                         notes.push(`Sri Lanka: ${lHol}`);
    els.mpTodayNote.textContent = notes.length ? `⚠ Today — ${notes.join(' · ')}` : '';
    els.mpTodayNote.hidden = !notes.length;
  }

  const slots = [];
  for (let atlH = 0; atlH < 24; atlH++) {
    const utcDate = new Date(timestampFromWall(TZ.ATL, y, m, d, atlH, 0));
    const lkH     = getWallHour(TZ.LK, utcDate);
    const atlWork = atlH >= WORK.ATL.start && atlH < WORK.ATL.end;
    const lkWork  = lkH  >= WORK.LK.start  && lkH  < WORK.LK.end;
    const atlLbl  = new Intl.DateTimeFormat('en-US', { timeZone: TZ.ATL, hour: 'numeric', minute: '2-digit', hour12: true }).format(utcDate);
    const lkLbl   = new Intl.DateTimeFormat('en-US', { timeZone: TZ.LK,  hour: 'numeric', minute: '2-digit', hour12: true }).format(utcDate);
    let status = 'bad';
    if      (atlWork && lkWork)                 status = 'good';
    else if (atlWork && lkH >= 7 && lkH < 21)  status = 'ok';
    else if (lkWork  && atlH >= 7 && atlH < 9) status = 'ok';
    slots.push({ atlH, lkH, atlLbl, lkLbl, atlWork, lkWork, status });
  }

  const goodSlots = slots.filter(s => s.status === 'good');
  const okSlots   = slots.filter(s => s.status === 'ok' && s.lkWork);

  els.bestWindows.innerHTML = goodSlots.length
    ? goodSlots.map(s => `<div class="overlap-row"><span class="overlap-dot dot-good"></span><span class="overlap-label">${s.atlLbl} Atlanta = ${s.lkLbl} Sri Lanka</span></div>`).join('')
    : `<div class="overlap-row"><span class="overlap-dot dot-warn"></span><span class="overlap-label">No overlap in standard work hours today</span></div>` +
      (okSlots.length ? `<div class="overlap-hint">Best compromise: ${okSlots[0].atlLbl} Atlanta = ${okSlots[0].lkLbl} Sri Lanka</div>` : '');

  const statusLabel = { good: '✓ Good', ok: '~ Possible', bad: 'Poor' };
  els.meetingGrid.innerHTML =
    `<div class="mp-head"><span>Atlanta</span><span>Sri Lanka</span><span>Status</span></div>` +
    slots.filter(s => s.atlH >= 6 && s.atlH <= 22).map(s =>
      `<div class="mp-row${s.status === 'good' ? ' good' : ''}">` +
      `<span class="mp-time">${s.atlLbl}</span><span class="mp-time">${s.lkLbl}</span>` +
      `<span class="mp-status ${s.status}">${statusLabel[s.status]}</span></div>`
    ).join('');
}

// ── Copy Helpers ──────────────────────────────────────────────────────────────
function getConverterCtx() {
  const isAtoL = state.direction === 'atl-to-lk';
  const fromTZ = isAtoL ? TZ.ATL : TZ.LK;
  const [y, m, d] = state.date.split('-').map(Number);
  const [H, M]    = state.time.split(':').map(Number);
  return {
    dateObj:  new Date(timestampFromWall(fromTZ, y, m, d, H, M)),
    fromTZ,
    toTZ:     isAtoL ? TZ.LK  : TZ.ATL,
    fromCity: isAtoL ? CITIES.ATL : CITIES.LK,
    toCity:   isAtoL ? CITIES.LK  : CITIES.ATL,
  };
}
function buildCopyText() {
  const { dateObj, fromTZ, toTZ, fromCity, toCity } = getConverterCtx();
  const fromTime = fmtTime(fromTZ, dateObj, true);
  const fromDate = fmtDateLong(fromTZ, dateObj);
  const toTime   = fmtTime(toTZ, dateObj, true);
  const toDate   = fmtDateLong(toTZ, dateObj);
  return `${fromTime} ${fromCity} time on ${fromDate} is ${toTime} ${toCity} time${fromDate !== toDate ? ` on ${toDate}` : ''}.`;
}
function buildTeamsText() {
  const { dateObj, fromTZ, toTZ, fromCity, toCity } = getConverterCtx();
  const fromAbbr = getTzAbbr(fromTZ, dateObj);
  const toAbbr   = getTzAbbr(toTZ,   dateObj);
  return `📅 Meeting Time\n` +
    `• ${fromCity}: ${fmtDate(fromTZ, dateObj)} · ${fmtTime(fromTZ, dateObj, true)} ${fromAbbr}\n` +
    `• ${toCity}: ${fmtDate(toTZ, dateObj)} · ${fmtTime(toTZ, dateObj, true)} ${toAbbr}\n` +
    `🔗 ${window.location.href}`;
}

// ── URL Sync ──────────────────────────────────────────────────────────────────
function updateURL() {
  const p = new URLSearchParams();
  p.set('dir', state.direction);
  if (state.date) p.set('date', state.date);
  if (state.time) p.set('time', state.time);
  if (state.format !== '12') p.set('fmt', state.format);
  history.replaceState({}, '', `${location.pathname}?${p}`);
}
function readURL() {
  const p = new URLSearchParams(location.search);
  const dir = p.get('dir');
  if (dir === 'atl-to-lk' || dir === 'lk-to-atl') state.direction = dir;
  if (p.get('date')) state.date = p.get('date');
  if (p.get('time')) state.time = p.get('time');
  if (p.get('fmt') === '24') state.format = '24';
  els.fmtInputs.forEach(inp => { inp.checked = inp.value === state.format; });
  if (!state.date || !state.time) setToNow(); else render();
}

// ── Copy Button Helper ────────────────────────────────────────────────────────
async function copyWithFeedback(btn, labelId, getText) {
  try {
    await navigator.clipboard.writeText(getText());
    const label = $(labelId);
    const orig  = label.textContent;
    label.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { label.textContent = orig; btn.classList.remove('copied'); }, 2000);
  } catch {}
}

// ── Event Listeners ───────────────────────────────────────────────────────────
els.swapBtn.addEventListener('click', () => {
  state.direction = state.direction === 'atl-to-lk' ? 'lk-to-atl' : 'atl-to-lk';
  setToNow();
});
els.useNowBtn.addEventListener('click', setToNow);
els.dateIn.addEventListener('input', e => { state.date = e.target.value; render(); });
els.timeIn.addEventListener('input', e => { state.time = e.target.value; render(); });
els.fmtInputs.forEach(inp => {
  inp.addEventListener('change', e => { state.format = e.target.value; render(); tick(); });
});
els.copyResult.addEventListener('click', () => {
  if (state.date && state.time) copyWithFeedback(els.copyResult, 'copy-result-label', buildCopyText);
});
els.copyLink.addEventListener('click', () => {
  copyWithFeedback(els.copyLink, 'copy-link-label', () => window.location.href);
});
els.copyTeams.addEventListener('click', () => {
  if (state.date && state.time) copyWithFeedback(els.copyTeams, 'copy-teams-label', buildTeamsText);
});
document.querySelectorAll('[data-preset]').forEach(btn => {
  btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
});

// ── Init ──────────────────────────────────────────────────────────────────────
tick();
readURL();
