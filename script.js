const { DateTime } = luxon;

const cities = [
  { name: 'Colombo', zone: 'Asia/Colombo' },
  { name: 'Atlanta', zone: 'America/New_York' },
  { name: 'New York', zone: 'America/New_York' },
  { name: 'Dubai', zone: 'Asia/Dubai' },
  { name: 'Tokyo', zone: 'Asia/Tokyo' },
  { name: 'London', zone: 'Europe/London' },
  { name: 'Paris', zone: 'Europe/Paris' },
  { name: 'Los Angeles', zone: 'America/Los_Angeles' },
  { name: 'Sydney', zone: 'Australia/Sydney' }
];

function populateSelect(id) {
  const select = document.getElementById(id);
  cities.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.zone;
    opt.textContent = c.name;
    select.appendChild(opt);
  });
}

['city1', 'city2', 'from-city', 'to-city'].forEach(populateSelect);

document.getElementById('city1').value = 'Asia/Colombo';
document.getElementById('city2').value = 'America/New_York';
document.getElementById('from-city').value = 'Asia/Colombo';
document.getElementById('to-city').value = 'America/New_York';

function updateLiveTimes() {
  const zone1 = document.getElementById('city1').value;
  const zone2 = document.getElementById('city2').value;

  const dt1 = DateTime.now().setZone(zone1);
  const dt2 = DateTime.now().setZone(zone2);

  document.getElementById('time1-hm').textContent = dt1.toFormat('h:mm');
  document.getElementById('time1-ampm').textContent = dt1.toFormat('a');
  document.getElementById('date1').textContent = dt1.toFormat('LLLL d, yyyy');

  document.getElementById('time2-hm').textContent = dt2.toFormat('h:mm');
  document.getElementById('time2-ampm').textContent = dt2.toFormat('a');
  document.getElementById('date2').textContent = dt2.toFormat('LLLL d, yyyy');

  const diffMinutes = dt1.offset - dt2.offset;
  const ahead = diffMinutes > 0;
  const mins = Math.abs(diffMinutes);
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  let text;
  if (mins === 0) {
    text = 'Same time';
  } else {
    text = `${hrs}hr`;
    if (hrs !== 1) text += 's';
    if (rem) text += ` ${rem}min`;
    text += ahead ? ' ahead' : ' behind';
  }
  document.getElementById('difference').textContent = text;
}

['city1', 'city2'].forEach(id => {
  document.getElementById(id).addEventListener('change', updateLiveTimes);
});

updateLiveTimes();
setInterval(updateLiveTimes, 60000);

function convertBtnHandler() {
  const fromZone = document.getElementById('from-city').value;
  const toZone = document.getElementById('to-city').value;
  const hrs = document.getElementById('from-hours').value;
  const mins = document.getElementById('from-minutes').value;
  const ampm = document.getElementById('from-ampm').value;
  if (hrs === '' || mins === '') {
    document.getElementById('convert-result').textContent = 'Please enter valid time.';
    return;
  }
  let h = parseInt(hrs, 10);
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  const dt = DateTime.now().setZone(fromZone).set({ hour: h, minute: parseInt(mins, 10), second: 0, millisecond: 0 });
  const converted = dt.setZone(toZone);
  document.getElementById('convert-result').textContent = converted.toFormat('h:mm a');
}

document.getElementById('convert-btn').addEventListener('click', convertBtnHandler);
