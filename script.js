// script.js
let employees = [];
let stations = [];
let prefs = { shiftHours: 8, peoplePerStation: 1, days: 7 };
let unavailabilities = {}; // { "Alice": ["2025-02-03", "2025-02-10"] }
let currentEmp = null;

const db = window.db;

// Populate employee select & textarea on load
function updateUI() {
  document.getElementById('employees').value = employees.join('\n');
  document.getElementById('stations').value = stations.join(', ');
  document.getElementById('shiftHours').value = prefs.shiftHours;
  document.getElementById('peoplePerStation').value = prefs.peoplePerStation;
  document.getElementById('days').value = prefs.days;

  const select = document.getElementById('empSelect');
  select.innerHTML = '';
  employees.forEach(emp => {
    const opt = document.createElement('option');
    opt.value = emp;
    opt.textContent = emp;
    select.appendChild(opt);
  });
  if (employees.length > 0) {
    currentEmp = employees[0];
    updateUnavailList();
  }
}

// Unavailability as ranges: [{from: Date, to: Date}]
// Start date & time picker
const startDatePicker = flatpickr("#startDate", {
  dateFormat: "d/m/Y",              // force dd/mm/yyyy
  defaultDate: new Date(),           // today
  locale: "he",
  minDate: "today",
  onChange: function(selectedDates, dateStr) {
    // Optional: log to console if needed
    console.log("Selected start date:", dateStr);
  }
});

// Init pickers with time
const fromPicker = flatpickr("#fromPicker", {
  enableTime: true,
  dateFormat: "Y-m-d H:i",
  time_24hr: true,
  locale: "he"
});

const toPicker = flatpickr("#toPicker", {
  enableTime: true,
  dateFormat: "Y-m-d H:i",
  time_24hr: true,
  locale: "he"
});

document.getElementById('addUnavail').addEventListener('click', () => {
  if (!currentEmp) return;
  const fromDate = fromPicker.selectedDates[0];
  const toDate = toPicker.selectedDates[0];
  if (!fromDate || !toDate || fromDate >= toDate) {
    alert('בחר טווח תקין: התחלה לפני סיום');
    return;
  }

  if (!unavailabilities[currentEmp]) unavailabilities[currentEmp] = [];
  unavailabilities[currentEmp].push({ from: fromDate.toISOString(), to: toDate.toISOString() });

  updateUnavailList();
  fromPicker.clear();
  toPicker.clear();
});

function updateUnavailList() {
  const list = document.getElementById('unavailList');
  list.innerHTML = '';
  const ranges = unavailabilities[currentEmp] || [];
  if (ranges.length === 0) {
    list.innerHTML = '<li class="text-gray-400">אין טווחים</li>';
  } else {
    ranges.forEach((r, idx) => {
      const li = document.createElement('li');
      li.textContent = `${new Date(r.from).toLocaleString('he')} עד ${new Date(r.to).toLocaleString('he')}`;
      const delBtn = document.createElement('button');
      delBtn.textContent = 'מחק';
      delBtn.className = 'text-red-600 text-xs mr-2';
      delBtn.onclick = () => {
        unavailabilities[currentEmp].splice(idx, 1);
        updateUnavailList();
      };
      li.appendChild(delBtn);
      list.appendChild(li);
    });
  }
}

document.getElementById('empSelect').addEventListener('change', e => {
  currentEmp = e.target.value;
  updateUnavailList();
});

// Load from Firestore
document.getElementById('loadSaved').addEventListener('click', async () => {
  try {
    const docSnap = await getDoc(doc(db, 'config', 'main'));
    if (docSnap.exists()) {
      const data = docSnap.data();
      employees = data.employees || [];
      stations = data.stations || [];
      prefs = data.prefs || prefs;
      unavailabilities = data.unavailabilities || {};
      updateUI();
      alert('Loaded from Firestore');
    } else {
      alert('No saved data found');
    }
  } catch (err) {
    console.error(err);
    alert('Load failed: ' + err.message);
  }
});
//save import for firebase
document.getElementById('savePermanent').addEventListener('click', async () => {
  employees = document.getElementById('employees').value.split('\n').map(n => n.trim()).filter(Boolean);
  if (employees.length === 0) return alert('הוסף שמות קודם');
  try {
    await setDoc(doc(db, 'config', 'permanent_names'), { list: employees });
    alert('רשימה קבועה נשמרה');
  } catch (err) {
    console.error(err);
    alert('שגיאה בשמירה: ' + err.message);
  }
});

document.getElementById('loadPermanent').addEventListener('click', async () => {
  try {
    const docSnap = await getDoc(doc(db, 'config', 'permanent_names'));
    if (docSnap.exists()) {
      employees = docSnap.data().list || [];
      updateUI();
      alert('רשימה קבועה טעונה');
    } else {
      alert('אין רשימה קבועה');
    }
  } catch (err) {
    console.error(err);
    alert('שגיאה בטעינה: ' + err.message);
  }
});

// Save on generate (for now)
async function saveToFirestore() {
  if (!window.setDoc || !window.doc) {
    console.log('Firebase not loaded - skipping save');
    return; // Don't fail if Firebase isn't ready
  }
  
  try {
    await setDoc(doc(window.db, 'config', 'main'), {
      employees,
      stations,
      prefs,
      unavailabilities,
      updated: new Date().toISOString()
    });
    console.log('Saved to Firestore');
  } catch (err) {
    console.error('Save failed', err);
    // Don't alert - just log for now
  }
}

// Basic generate (placeholder logic - improve later)
document.getElementById('generateBtn').addEventListener('click', () => {
  employees = document.getElementById('employees').value.split('\n').map(n => n.trim()).filter(Boolean);
  stations = document.getElementById('stations').value.split(',').map(s => s.trim()).filter(Boolean);
  prefs.shiftHours = Number(document.getElementById('shiftHours').value);
  prefs.peoplePerStation = Number(document.getElementById('peoplePerStation').value);
  prefs.days = Number(document.getElementById('days').value);

  if (employees.length === 0 || stations.length === 0) {
    alert('Add employees and stations first');
    return;
  }

  saveToFirestore();

 // Real basic greedy scheduler
employees = document.getElementById('employees').value.split('\n').map(n => n.trim()).filter(Boolean);
stations = document.getElementById('stations').value.split(',').map(s => s.trim()).filter(Boolean);
prefs.shiftHours = Number(document.getElementById('shiftHours').value);
prefs.peoplePerStation = Number(document.getElementById('peoplePerStation').value);
prefs.days = Number(document.getElementById('days').value);

if (employees.length === 0 || stations.length === 0 || prefs.days < 1) {
  alert('Add employees, stations, and at least 1 day');
  return;
}

saveToFirestore();

// ────────────────────────────────────────────────
// Scheduling logic – with custom start date & time
// ────────────────────────────────────────────────

employees = document.getElementById('employees').value.split('\n').map(n => n.trim()).filter(Boolean);
stations = document.getElementById('stations').value.split(',').map(s => s.trim()).filter(Boolean);

prefs.shiftHours = Number(document.getElementById('shiftHours').value);
prefs.peoplePerStation = Number(document.getElementById('peoplePerStation').value);
prefs.days = Number(document.getElementById('days').value);

const startDateInput = document.getElementById('startDate').value;
const startTimeInput = document.getElementById('startTime').value || "08:00";

let scheduleStart = new Date();
if (startDateInput) {
  scheduleStart = new Date(startDateInput);
}
if (startTimeInput) {
  const [hours, minutes] = startTimeInput.split(':').map(Number);
  scheduleStart.setHours(hours, minutes, 0, 0);
} else {
  // fallback - start at 08:00 if no time given
  scheduleStart.setHours(8, 0, 0, 0);
}

// Make sure we start at midnight for clean day calculation if needed
// but keep the exact hour for first shift
scheduleStart.setSeconds(0, 0);

if (employees.length === 0 || stations.length === 0 || prefs.days < 1) {
  alert('הוסף עובדים, עמדות ומספר ימים תקין');
  return;
}

saveToFirestore();

// Reset tracking
const shiftCounts = {};
const restedUntil = {};
const violations = new Set();

employees.forEach(emp => {
  shiftCounts[emp] = 0;
  restedUntil[emp] = new Date(0); // far past
});

const schedule = {};

// Calculate slots dynamically based on 24h cycle starting from given hour
const shiftDurationMin = prefs.shiftHours * 60;
const minutesInDay = 24 * 60;
const startMinOfDay = scheduleStart.getHours() * 60 + scheduleStart.getMinutes();

const slotStartsMin = [];
let currentMin = startMinOfDay;
for (let i = 0; i < slotsPerDay; i++) {
  slotStartsMin.push(currentMin % minutesInDay);
  currentMin += shiftDurationMin;
}

// Then in the loop, use minutes instead of hours for accuracy:
for (let day = 0; day < prefs.days; day++) {
  const dayStart = new Date(scheduleStart);
  dayStart.setDate(dayStart.getDate() + day);
  dayStart.setHours(0, 0, 0, 0); // reset to midnight for clean day base

  for (const minOfDay of slotStartsMin) {
    const slotStartTime = new Date(dayStart);
    slotStartTime.setMinutes(minOfDay);

    const slotEndTime = new Date(slotStartTime);
    slotEndTime.setMinutes(slotStartTime.getMinutes() + shiftDurationMin);

    // slotKey uses full time (HHMM)
    const sh = slotStartTime.getHours().toString().padStart(2, '0');
    const sm = slotStartTime.getMinutes().toString().padStart(2, '0');
    const slotKey = `${dayStart.toISOString().split('T')[0]}_${sh}${sm}`;

    schedule[slotKey] = {};

    // ... rest of station loop ...
  }
}   // ← Initialize the object for this slot/time

    // Optional safety (prevents rare edge-case crashes)
    if (!schedule[slotKey]) {
      schedule[slotKey] = {};
    }

    for (const station of stations) {
      const assigned = [];

      let candidates = employees.filter(emp => {
        // Not unavailable in this slot
        const unavailableRanges = unavailabilities[emp] || [];
        const overlaps = unavailableRanges.some(r => {
          const rFrom = new Date(r.from);
          const rTo = new Date(r.to);
          return !(slotEndTime <= rFrom || slotStartTime >= rTo);
        });
        if (overlaps) return false;

        // Rested enough
        return slotStartTime >= restedUntil[emp];
      });

      candidates.sort((a, b) => shiftCounts[a] - shiftCounts[b]);

      for (let i = 0; i < prefs.peoplePerStation; i++) {
        if (candidates.length === 0) {
          violations.add(`${slotKey}_${station}`);
          assigned.push("?");
          continue;
        }

        const chosen = candidates.shift();
        assigned.push(chosen);
        shiftCounts[chosen]++;
        restedUntil[chosen] = new Date(slotEndTime);
      }

      schedule[slotKey][station] = assigned;   // ← now safe
    }
  }
}

// ────────────────────────────────────────────────
// Render one table per day
// ────────────────────────────────────────────────

const resultDiv = document.getElementById('result');
resultDiv.innerHTML = '<h2 class="text-xl font-semibold mb-4">לוח משמרות</h2>';
resultDiv.classList.remove('hidden');

const allSlotKeys = Object.keys(schedule).sort();

// Group by date
const days = {};
allSlotKeys.forEach(key => {
  const date = key.split('_')[0];
  if (!days[date]) days[date] = [];
  days[date].push(key);
});

Object.keys(days).sort().forEach(date => {
  const slotKeysForDay = days[date];

  const table = document.createElement('table');
  table.className = 'min-w-full border-collapse mb-12';

  const dateParts = date.split('-');
  const dateObj = new Date(date);
  const dayName = dateObj.toLocaleDateString('he-IL', {weekday: 'long'});
  const dateHeb = `${dateParts[2].padStart(2,'0')}/${dateParts[1].padStart(2,'0')}/${dateParts[0]}`;
  caption.textContent = `${dayName} ${dateHeb}`;
  table.appendChild(caption);

  // Header row
  const headerRow = document.createElement('tr');
  headerRow.className = 'bg-gray-100';
  const timeHeader = document.createElement('th');
  timeHeader.className = 'border border-gray-300 p-4 text-right font-bold sticky left-0 bg-gray-100';
  timeHeader.textContent = 'שעה';
  headerRow.appendChild(timeHeader);

  stations.forEach(station => {
    const th = document.createElement('th');
    th.className = 'border border-gray-300 p-4 text-right font-bold';
    th.textContent = station;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  // Rows per slot
  slotKeysForDay.forEach(slotKey => {
    const [datePart, timePart] = slotKey.split('_');
    const hour = parseInt(timePart.substring(0,2), 10);
    const min  = parseInt(timePart.substring(2,4), 10) || 0;

    // Re-create start time from slotKey
    const slotStartTime = new Date(`${datePart}T${timePart.substring(0,2)}:${timePart.substring(2,4)}:00`);

    const slotEndTime = new Date(slotStartTime);
    slotEndTime.setHours(slotStartTime.getHours() + prefs.shiftHours);

    const startFormatted = slotStartTime.toLocaleTimeString('he-IL', {hour: '2-digit', minute: '2-digit', hour12: false});
    const endFormatted   = slotEndTime.toLocaleTimeString('he-IL', {hour: '2-digit', minute: '2-digit', hour12: false});
    const timeStr = `${startFormatted} – ${endFormatted}`;

    const row = document.createElement('tr');

    const timeCell = document.createElement('td');
    timeCell.className = 'border border-gray-300 p-4 font-medium sticky left-0 bg-white';
    timeCell.dir = 'ltr';                     // force LTR for time
    timeCell.style.textAlign = 'center';      // better visual
    timeCell.textContent = `${startFormatted} – ${endFormatted}`;
    row.appendChild(timeCell);

    stations.forEach(station => {
      const people = schedule[slotKey][station] || [];
      const cell = document.createElement('td');
      cell.className = 'border border-gray-300 p-4 text-right';

      if (people.includes("?")) {
        cell.textContent = 'חסר כוח אדם';
        cell.className += ' bg-red-100 text-red-800 font-bold';
      } else {
        cell.textContent = people.join(' ו-');
        if (violations.has(`${slotKey}_${station}`)) {
          cell.className += ' bg-orange-100 text-orange-800 font-bold';
          cell.textContent += ' ⚠';
        }
      }
      row.appendChild(cell);
    });

    table.appendChild(row);
  });

  resultDiv.appendChild(table);
});

document.getElementById('exportBtn').classList.remove('hidden');
});

//Export CSV
document.getElementById('exportBtn').addEventListener('click', () => {
  const lines = ['Date,Time,Station,Assigned,Note'];

  Object.keys(schedule).sort().forEach(slotKey => {
    const [date, hourStr] = slotKey.split('_');
    const hour = parseInt(hourStr, 10);
    const start = new Date(`${date}T${hourStr.padStart(2,'0')}:00:00`);
    const end = new Date(start);
    end.setHours(start.getHours() + prefs.shiftHours);
    const timeStr = `${start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}–${end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;

    Object.entries(schedule[slotKey]).forEach(([station, people]) => {
      const note = violations.has(`${slotKey}_${station}`) ? 'Violation / Missing' : '';
      lines.push(`${date},${timeStr},${station},"${people.join(' & ')}",${note}`);
    });
  });

  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `shift-schedule_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
});

// Initial load attempt
updateUI();
