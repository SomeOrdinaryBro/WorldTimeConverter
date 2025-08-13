const Z_LK  = 'Asia/Colombo';
const Z_ATL = 'America/New_York';
const fmtClock = (tz) => new Intl.DateTimeFormat('en-GB', {
  timeZone: tz,
  hour12: false,
  hour: '2-digit', minute: '2-digit', second: '2-digit'
});

const fmtFull = (tz) => new Intl.DateTimeFormat('en-GB', {
  timeZone: tz,
  hour12: false,
  year: 'numeric', month: 'short', day: '2-digit',
  weekday: 'short',
  hour: '2-digit', minute: '2-digit'
});
function getOffsetMinutes(timeZone, utcDate){
  try {
    const f = new Intl.DateTimeFormat('en', {
      timeZone,
      timeZoneName: 'shortOffset',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
    const tzn = f.formatToParts(utcDate).find(p => p.type === 'timeZoneName')?.value || '';
    const m = tzn.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
    if (m) {
      const sign = m[1] === '-' ? -1 : 1;
      const hh = parseInt(m[2], 10);
      const mm = parseInt(m[3] || '0', 10);
      return sign * (hh * 60 + mm);
    }
  } catch(_) {/* fall through */}
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour12: false,
    year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', second:'2-digit'
  }).formatToParts(utcDate);

  const q = new Intl.DateTimeFormat('en-GB', {
    timeZone:'UTC',
    hour12: false,
    year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', second:'2-digit'
  }).formatToParts(utcDate);

  const toHM = parts => {
    const H = parseInt(parts.find(x=>x.type==='hour').value,10);
    const M = parseInt(parts.find(x=>x.type==='minute').value,10);
    const S = parseInt(parts.find(x=>x.type==='second').value,10);
    return H*60 + M + S/60;
  };

  const tzMin  = toHM(p);
  const utcMin = toHM(q);
  // Difference in minutes, normalized to [-720, +840]
  let diff = Math.round(tzMin - utcMin);
  if (diff > 720) diff -= 1440;
  if (diff < -720) diff += 1440;
  return diff;
}
function timestampFromWall(timeZone, year, month, day, hour, minute){
  const pretendUTC = new Date(Date.UTC(year, month-1, day, hour, minute, 0));
  const offMin = getOffsetMinutes(timeZone, pretendUTC);
  return pretendUTC.getTime() - offMin * 60_000;
}
function formatStampForTZ(ms, tz){
  const d = new Date(ms);
  return fmtFull(tz).format(d);
}
function tick(){
  const now = new Date();
  document.getElementById('now-lk').textContent  = fmtClock(Z_LK).format(now);
  document.getElementById('now-atl').textContent = fmtClock(Z_ATL).format(now);
}
tick();
setInterval(tick, 1000);
const lkDate = document.getElementById('lk-date');
const lkTime = document.getElementById('lk-time');
const atlDate = document.getElementById('atl-date');
const atlTime = document.getElementById('atl-time');
function defaultTodayInputs(){
  const now = new Date();
  const ymdInTZ = (tz) => new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year:'numeric', month:'2-digit', day:'2-digit'
  }).format(now);

  lkDate.value  = ymdInTZ(Z_LK);
  atlDate.value = ymdInTZ(Z_ATL);
}
defaultTodayInputs();

document.getElementById('lk-now').addEventListener('click', () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: Z_LK, hour12: false, hour:'2-digit', minute:'2-digit'
  }).format(now).split(':');
  lkTime.value = `${parts[0]}:${parts[1]}`;
  lkDate.value = new Intl.DateTimeFormat('en-CA', { timeZone: Z_LK, year:'numeric', month:'2-digit', day:'2-digit' }).format(now);
});

document.getElementById('atl-now').addEventListener('click', () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: Z_ATL, hour12: false, hour:'2-digit', minute:'2-digit'
  }).format(now).split(':');
  atlTime.value = `${parts[0]}:${parts[1]}`;
  atlDate.value = new Intl.DateTimeFormat('en-CA', { timeZone: Z_ATL, year:'numeric', month:'2-digit', day:'2-digit' }).format(now);
});
document.getElementById('lk-convert').addEventListener('click', () => {
  const out = document.getElementById('lk-to-atl');
  const help = document.getElementById('lk-help');

  if(!lkDate.value || !lkTime.value){
    out.textContent = '—';
    help.textContent = 'Missing date or time.';
    return;
  }

  const [y, m, d] = lkDate.value.split('-').map(Number);
  const [H, M]    = lkTime.value.split(':').map(Number);
  const ms = timestampFromWall(Z_LK, y, m, d, H, M);
  out.textContent = formatStampForTZ(ms, Z_ATL);
  help.textContent = 'Converted from Sri Lanka to Atlanta.';
});
document.getElementById('atl-convert').addEventListener('click', () => {
  const out = document.getElementById('atl-to-lk');
  const help = document.getElementById('atl-help');

  if(!atlDate.value || !atlTime.value){
    out.textContent = '—';
    help.textContent = 'Missing date or time.';
    return;
  }

  const [y, m, d] = atlDate.value.split('-').map(Number);
  const [H, M]    = atlTime.value.split(':').map(Number);
  const ms = timestampFromWall(Z_ATL, y, m, d, H, M);
  out.textContent = formatStampForTZ(ms, Z_LK);
  help.textContent = 'Converted from Atlanta to Sri Lanka.';
});
lkTime.addEventListener('keydown', (e) => { if(e.key === 'Enter') document.getElementById('lk-convert').click(); });
atlTime.addEventListener('keydown', (e) => { if(e.key === 'Enter') document.getElementById('atl-convert').click(); });
