const { DateTime } = luxon;

function convertTime(fromZone, toZone, hours, minutes) {
  const now = DateTime.now().setZone(fromZone);
  const dt = now.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
  const converted = dt.setZone(toZone);
  return converted.toFormat('HH:mm');
}

function setupConverter(buttonId, hourId, minuteId, resultId, fromZone, toZone) {
  const button = document.getElementById(buttonId);
  button.addEventListener('click', () => {
    const hours = parseInt(document.getElementById(hourId).value, 10);
    const minutes = parseInt(document.getElementById(minuteId).value, 10);
    if (isNaN(hours) || isNaN(minutes)) {
      document.getElementById(resultId).textContent = 'Please enter valid time.';
      return;
    }
    const formatted = convertTime(fromZone, toZone, hours, minutes);
    document.getElementById(resultId).textContent = formatted;
  });
}

setupConverter('convert-lk', 'lk-hours', 'lk-minutes', 'us-result', 'Asia/Colombo', 'America/New_York');
setupConverter('convert-us', 'us-hours', 'us-minutes', 'lk-result', 'America/New_York', 'Asia/Colombo');
