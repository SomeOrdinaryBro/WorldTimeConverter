const { DateTime } = luxon;

function convertTime(fromZone, toZone, hour12, minutes, ampm) {
  let hrs = parseInt(hour12, 10);
  if (ampm === 'PM' && hrs !== 12) hrs += 12;
  if (ampm === 'AM' && hrs === 12) hrs = 0;
  const now = DateTime.now().setZone(fromZone);
  const dt = now.set({ hour: hrs, minute: parseInt(minutes, 10), second: 0, millisecond: 0 });
  return dt.setZone(toZone);
}

function setupConverter(buttonId, hourId, minuteId, ampmId, resultId, fromZone, toZone, toLabel) {
  const button = document.getElementById(buttonId);
  button.addEventListener('click', () => {
    const hours = document.getElementById(hourId).value;
    const minutes = document.getElementById(minuteId).value;
    const ampm = document.getElementById(ampmId).value;
    if (hours === '' || minutes === '') {
      document.getElementById(resultId).textContent = 'Please enter valid time.';
      return;
    }
    const converted = convertTime(fromZone, toZone, hours, minutes, ampm);
    const formatted = converted.toFormat('h:mm a');
    document.getElementById(resultId).textContent = `Converted Time: ${formatted} (${toLabel})`;
  });
}

setupConverter('convert-lk', 'lk-hours', 'lk-minutes', 'lk-ampm', 'us-result', 'Asia/Colombo', 'America/New_York', 'Atlanta Time');
setupConverter('convert-us', 'us-hours', 'us-minutes', 'us-ampm', 'lk-result', 'America/New_York', 'Asia/Colombo', 'Sri Lanka Time');
