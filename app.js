const STORAGE_KEY = 'edutrack_gp_students_v2';

const DEFAULT_STUDENTS = [
  { id: '1', roll: 'GP-CSE-01', name: 'Aarav Sharma', email: 'aarav.sharma@golapoly.edu', phone: '+91 98765 43210', dept: 'CSE', sem: 5, attendance: 92, internal: 36, external: 52, cgpa: 8.8, status: 'Active' },
  { id: '2', roll: 'GP-CIV-05', name: 'Rohan Gupta', email: 'rohan.gupta@golapoly.edu', phone: '+91 97654 32109', dept: 'Civil', sem: 3, attendance: 71, internal: 29, external: 43, cgpa: 7.2, status: 'Active' },
  { id: '3', roll: 'GP-ME-12', name: 'Ananya Singh', email: 'ananya.singh@golapoly.edu', phone: '+91 99123 45678', dept: 'Mechanical', sem: 4, attendance: 95, internal: 37, external: 51, cgpa: 8.8, status: 'Active' },
  { id: '4', roll: 'GP-EE-04', name: 'Kabir Mehta', email: 'kabir.mehta@golapoly.edu', phone: '+91 98222 33445', dept: 'Electrical', sem: 2, attendance: 68, internal: 26, external: 41, cgpa: 6.7, status: 'On Leave' },
  { id: '5', roll: 'GP-ECE-09', name: 'Sneha Patel', email: 'sneha.patel@golapoly.edu', phone: '+91 97333 44556', dept: 'ECE', sem: 6, attendance: 84, internal: 34, external: 47, cgpa: 8.1, status: 'Active' }
];

const ROLE_CONTENT = {
  students: {
    title: 'Student Academic Clarity',
    desc: 'Track semester-wise attendance, internal/external marks, and CGPA standing in real time so you stay eligible for every exam.',
    points: ['Instant visibility into 75% attendance threshold', 'Clear breakdown of Internal (40) + External (60) marks', 'Quick profile view with Roll No and Branch status']
  },
  faculty: {
    title: 'Fast Attendance & Grading Tools',
    desc: 'Mark daily branch-wise attendance in seconds and update semester marks with automatic CGPA calculation.',
    points: ['One-click Mark All Present for quick classroom roll call', 'Automatic CGPA & letter grade updates on mark entry', 'Low attendance alerts for early student mentoring']
  },
  admin: {
    title: 'Centralized Polytechnic Control',
    desc: 'Monitor all 5 diploma branches (CSE, Civil, Mechanical, Electrical, ECE) from a unified dashboard backed by SQLite.',
    points: ['Live branch-wise headcount and average CGPA charts', 'Search and filter students across Semesters 1 to 6', 'One-click CSV export for college records']
  }
};

let students = [];
let activeTab = 'dashboard';
let todayAttendance = {};
let deptChartInstance = null;
let cgpaChartInstance = null;
let pendingConfirmAction = null;
let toastTimer = null;
let useBackendApi = false;

function setBackendBadge(connected) {
  const badge = document.getElementById('backendBadge');
  if (!badge) return;
  if (connected) {
    badge.textContent = 'Flask + SQLite Connected';
    badge.className = 'text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200';
  } else {
    badge.textContent = 'Offline Demo Mode';
    badge.className = 'text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200';
  }
}

async function loadStudents() {
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    try {
      const res = await fetch('/api/students');
      if (res.ok) {
        students = await res.json();
        useBackendApi = true;
        setBackendBadge(true);
        return;
      }
    } catch (e) {}
  }
  useBackendApi = false;
  setBackendBadge(false);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) { students = parsed; return; }
    }
  } catch (e) {}
  students = JSON.parse(JSON.stringify(DEFAULT_STUDENTS));
}

function saveLocalStudents() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(students)); } catch (e) {}
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 2800);
}

function getInitials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'ST';
}

function getGradeLetter(total) {
  if (total >= 90) return 'A+';
  if (total >= 80) return 'A';
  if (total >= 70) return 'B+';
  if (total >= 60) return 'B';
  if (total >= 50) return 'C';
  if (total >= 40) return 'D';
  return 'F';
}

function statusBadgeClass(status) {
  if (status === 'Active') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'On Leave') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function attendanceBadgeClass(pct) {
  if (pct >= 85) return 'text-emerald-700 bg-emerald-50';
  if (pct >= 75) return 'text-indigo-700 bg-indigo-50';
  return 'text-rose-700 bg-rose-50';
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function openPortal() {
  document.getElementById('landing-page').classList.add('hidden');
  document.getElementById('portal-page').classList.remove('hidden');
  switchTab(activeTab);
}

function backToHome() {
  document.getElementById('portal-page').classList.add('hidden');
  document.getElementById('landing-page').classList.remove('hidden');
}

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  ['dashboard', 'students', 'attendance', 'grades'].forEach(name => {
    document.getElementById('view-' + name).classList.toggle('hidden', name !== tab);
  });
  if (tab === 'dashboard') renderDashboard();
  if (tab === 'students') renderStudentsTable();
  if (tab === 'attendance') renderAttendanceTable();
  if (tab === 'grades') renderGradesTable();
}

function renderDashboard() {
  const total = students.length;
  const activeCount = students.filter(s => s.status === 'Active').length;
  const depts = [...new Set(students.map(s => s.dept))];
  const avgCgpa = total ? students.reduce((a, s) => a + Number(s.cgpa || 0), 0) / total : 0;
  const avgAtt = total ? students.reduce((a, s) => a + Number(s.attendance || 0), 0) / total : 0;
  const lowAttStudents = students.filter(s => Number(s.attendance) < 75);

  document.getElementById('kpiTotal').textContent = total;
  document.getElementById('kpiDepts').textContent = `Across ${depts.length} branch${depts.length === 1 ? '' : 'es'}`;
  document.getElementById('kpiActive').textContent = activeCount;
  document.getElementById('kpiActivePct').textContent = total ? `${Math.round((activeCount / total) * 100)}% of total` : '0% of total';
  document.getElementById('kpiCgpa').textContent = avgCgpa.toFixed(2);
  document.getElementById('kpiAttendance').textContent = `${Math.round(avgAtt)}%`;
  document.getElementById('kpiLowAtt').textContent = `${lowAttStudents.length} below 75%`;

  const topList = [...students].sort((a, b) => b.cgpa - a.cgpa).slice(0, 4);
  document.getElementById('topPerformersList').innerHTML = topList.length
    ? topList.map(s => `<div class="py-2.5 flex items-center justify-between"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">${getInitials(s.name)}</div><div><p class="text-sm font-medium text-slate-900">${escapeHtml(s.name)}</p><p class="text-xs text-slate-500">${escapeHtml(s.roll)} &middot; ${escapeHtml(s.dept)}</p></div></div><span class="text-sm font-bold text-indigo-600">${Number(s.cgpa).toFixed(1)} CGPA</span></div>`).join('')
    : '<p class="text-sm text-slate-500 py-4">No student records available.</p>';

  document.getElementById('lowAttendanceList').innerHTML = lowAttStudents.length
    ? lowAttStudents.map(s => `<div class="py-2.5 flex items-center justify-between"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold">${getInitials(s.name)}</div><div><p class="text-sm font-medium text-slate-900">${escapeHtml(s.name)}</p><p class="text-xs text-slate-500">${escapeHtml(s.roll)} &middot; ${escapeHtml(s.dept)}</p></div></div><span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700">${s.attendance}%</span></div>`).join('')
    : '<p class="text-sm text-emerald-600 py-4">All students are at or above 75% attendance.</p>';

  renderCharts();
}

function renderCharts() {
  if (typeof Chart === 'undefined') return;
  const deptOrder = ['CSE', 'Civil', 'Mechanical', 'Electrical', 'ECE'];
  const deptCounts = deptOrder.map(d => students.filter(s => s.dept === d).length);
  const deptCgpa = deptOrder.map(d => {
    const list = students.filter(s => s.dept === d);
    return list.length ? Number((list.reduce((a, s) => a + Number(s.cgpa), 0) / list.length).toFixed(2)) : 0;
  });

  if (deptChartInstance) deptChartInstance.destroy();
  deptChartInstance = new Chart(document.getElementById('deptChart').getContext('2d'), {
    type: 'doughnut',
    data: { labels: deptOrder, datasets: [{ data: deptCounts, backgroundColor: ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'], borderWidth: 2, borderColor: '#ffffff' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });

  if (cgpaChartInstance) cgpaChartInstance.destroy();
  cgpaChartInstance = new Chart(document.getElementById('cgpaChart').getContext('2d'), {
    type: 'bar',
    data: { labels: deptOrder, datasets: [{ label: 'Average CGPA', data: deptCgpa, backgroundColor: '#6366f1', borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 10 } }, plugins: { legend: { display: false } } }
  });
}

function renderStudentsTable() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const dept = document.getElementById('filterDept').value;
  const sem = document.getElementById('filterSem').value;
  const status = document.getElementById('filterStatus').value;
  const filtered = students.filter(s =>
    (!q || s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)) &&
    (dept === 'All' || s.dept === dept) && (sem === 'All' || String(s.sem) === sem) && (status === 'All' || s.status === status)
  );
  document.getElementById('studentCountBadge').textContent = `${filtered.length} student${filtered.length === 1 ? '' : 's'}`;
  const tbody = document.getElementById('studentsTableBody');
  const emptyEl = document.getElementById('emptyStudentsState');
  if (!filtered.length) { tbody.innerHTML = ''; emptyEl.classList.remove('hidden'); return; }
  emptyEl.classList.add('hidden');
  tbody.innerHTML = filtered.map(s => `
    <tr class="hover:bg-slate-50">
      <td class="py-3 px-4 font-mono text-xs font-semibold text-slate-700">${escapeHtml(s.roll)}</td>
      <td class="py-3 px-4"><div class="flex items-center gap-2.5"><div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">${getInitials(s.name)}</div><div><p class="font-medium text-slate-900">${escapeHtml(s.name)}</p><p class="text-xs text-slate-500">${escapeHtml(s.email)}</p></div></div></td>
      <td class="py-3 px-4 text-slate-700">${escapeHtml(s.dept)}</td>
      <td class="py-3 px-4 text-slate-700">Sem ${s.sem}</td>
      <td class="py-3 px-4"><span class="px-2 py-0.5 rounded-md text-xs font-semibold ${attendanceBadgeClass(s.attendance)}">${s.attendance}%</span></td>
      <td class="py-3 px-4 font-semibold">${Number(s.cgpa).toFixed(1)}</td>
      <td class="py-3 px-4"><span class="px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadgeClass(s.status)}">${escapeHtml(s.status)}</span></td>
      <td class="py-3 px-4 text-right whitespace-nowrap space-x-1">
        <button type="button" data-action="view" data-id="${s.id}" class="px-2 py-1 text-xs font-medium text-slate-600 hover:text-indigo-600 rounded">View</button>
        <button type="button" data-action="edit" data-id="${s.id}" class="px-2 py-1 text-xs font-medium text-indigo-600 rounded">Edit</button>
        <button type="button" data-action="delete" data-id="${s.id}" class="px-2 py-1 text-xs font-medium text-rose-600 rounded">Delete</button>
      </td>
    </tr>`).join('');
}

function renderAttendanceTable() {
  const dept = document.getElementById('attDeptFilter').value;
  const list = students.filter(s => s.status === 'Active' && (dept === 'All' || s.dept === dept));
  const tbody = document.getElementById('attendanceTableBody');
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-slate-500 text-sm">No active students in this branch.</td></tr>'; return; }
  let present = 0, late = 0, absent = 0;
  tbody.innerHTML = list.map(s => {
    const st = todayAttendance[s.id] || 'Present';
    if (st === 'Present') present++; else if (st === 'Late') late++; else absent++;
    return `
      <tr class="hover:bg-slate-50">
        <td class="py-3 px-4 font-mono text-xs font-semibold">${escapeHtml(s.roll)}</td>
        <td class="py-3 px-4 font-medium">${escapeHtml(s.name)}</td>
        <td class="py-3 px-4 text-slate-600">${escapeHtml(s.dept)} (Sem ${s.sem})</td>
        <td class="py-3 px-4"><span class="px-2 py-0.5 rounded-md text-xs font-semibold ${attendanceBadgeClass(s.attendance)}">${s.attendance}%</span></td>
        <td class="py-3 px-4 text-right">
          <div class="inline-flex rounded-lg border border-slate-200 overflow-hidden">
            <button type="button" data-att-id="${s.id}" data-att-val="Present" class="px-2.5 py-1 text-xs font-medium ${st === 'Present' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600'}">Present</button>
            <button type="button" data-att-id="${s.id}" data-att-val="Late" class="px-2.5 py-1 text-xs font-medium border-l ${st === 'Late' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600'}">Late</button>
            <button type="button" data-att-id="${s.id}" data-att-val="Absent" class="px-2.5 py-1 text-xs font-medium border-l ${st === 'Absent' ? 'bg-rose-600 text-white' : 'bg-white text-slate-600'}">Absent</button>
          </div>
        </td>
      </tr>`;
  }).join('');
  document.getElementById('attSummaryText').textContent = `Present: ${present} | Late: ${late} | Absent: ${absent}`;
}

function renderGradesTable() {
  const dept = document.getElementById('gradesDeptFilter').value;
  const list = students.filter(s => dept === 'All' || s.dept === dept);
  document.getElementById('gradesTableBody').innerHTML = list.map(s => {
    const internal = Number(s.internal ?? Math.round((s.cgpa / 10) * 40));
    const external = Number(s.external ?? Math.round((s.cgpa / 10) * 60));
    const total = internal + external;
    return `
      <tr class="hover:bg-slate-50">
        <td class="py-3 px-4 font-mono text-xs font-semibold">${escapeHtml(s.roll)}</td>
        <td class="py-3 px-4 font-medium">${escapeHtml(s.name)}</td>
        <td class="py-3 px-4 text-slate-600">${escapeHtml(s.dept)}</td>
        <td class="py-3 px-4"><input type="number" min="0" max="40" value="${internal}" data-grade-id="${s.id}" data-field="internal" class="w-16 px-2 py-1 text-sm border rounded" /></td>
        <td class="py-3 px-4"><input type="number" min="0" max="60" value="${external}" data-grade-id="${s.id}" data-field="external" class="w-16 px-2 py-1 text-sm border rounded" /></td>
        <td class="py-3 px-4 font-semibold">${total}</td>
        <td class="py-3 px-4"><span class="px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700">${getGradeLetter(total)}</span></td>
        <td class="py-3 px-4 font-bold text-indigo-600">${Number(s.cgpa).toFixed(1)}</td>
      </tr>`;
  }).join('');
}

function openStudentModal(student = null) {
  document.getElementById('modalTitle').textContent = student ? 'Edit Student' : 'Add New Student';
  document.getElementById('editStudentId').value = student ? student.id : '';
  document.getElementById('fRoll').value = student ? student.roll : '';
  document.getElementById('fName').value = student ? student.name : '';
  document.getElementById('fEmail').value = student ? student.email : '';
  document.getElementById('fPhone').value = student ? (student.phone || '') : '';
  document.getElementById('fDept').value = student ? student.dept : 'CSE';
  document.getElementById('fSem').value = student ? String(student.sem) : '1';
  document.getElementById('fAttendance').value = student ? student.attendance : 85;
  document.getElementById('fCgpa').value = student ? student.cgpa : 8.0;
  document.getElementById('fStatus').value = student ? student.status : 'Active';
  document.getElementById('studentModal').classList.remove('hidden');
}

function openProfileModal(student) {
  document.getElementById('pAvatar').textContent = getInitials(student.name);
  document.getElementById('pName').textContent = student.name;
  document.getElementById('pRoll').textContent = student.roll;
  document.getElementById('pDept').textContent = student.dept;
  document.getElementById('pSem').textContent = `Semester ${student.sem}`;
  document.getElementById('pEmail').textContent = student.email;
  document.getElementById('pPhone').textContent = student.phone || 'Not provided';
  document.getElementById('pAtt').textContent = `${student.attendance}%`;
  document.getElementById('pCgpa').textContent = `${Number(student.cgpa).toFixed(1)} / 10`;
  document.getElementById('pStatus').textContent = student.status;
  document.getElementById('profileModal').classList.remove('hidden');
}

function openConfirmModal(title, message, onConfirm) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMessage').textContent = message;
  pendingConfirmAction = onConfirm;
  document.getElementById('confirmModal').classList.remove('hidden');
}

document.getElementById('btnNavPortal').addEventListener('click', openPortal);
document.getElementById('btnHeroPortal').addEventListener('click', openPortal);
document.getElementById('btnRolePortal').addEventListener('click', openPortal);
document.getElementById('btnBackHome').addEventListener('click', backToHome);

document.querySelectorAll('.footer-portal-link').forEach(btn => {
  btn.addEventListener('click', () => { activeTab = btn.dataset.footerTab || 'dashboard'; openPortal(); });
});

const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('newsletterEmail');
    if (!emailInput.value.trim()) return;
    showToast(`Subscribed ${emailInput.value.trim()} for Gola Polytechnic updates!`);
    emailInput.value = '';
  });
}

document.querySelectorAll('.role-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.role-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const info = ROLE_CONTENT[btn.dataset.role];
    document.getElementById('roleTitle').textContent = info.title;
    document.getElementById('roleDesc').textContent = info.desc;
    document.getElementById('rolePoints').innerHTML = info.points.map(p => `<li>&bull; ${escapeHtml(p)}</li>`).join('');
  });
});

document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
document.getElementById('btnOpenAddModal').addEventListener('click', () => openStudentModal());
document.getElementById('btnCloseModal').addEventListener('click', () => document.getElementById('studentModal').classList.add('hidden'));
document.getElementById('btnCancelModal').addEventListener('click', () => document.getElementById('studentModal').classList.add('hidden'));
document.getElementById('btnCloseProfile').addEventListener('click', () => document.getElementById('profileModal').classList.add('hidden'));
document.getElementById('btnConfirmCancel').addEventListener('click', () => document.getElementById('confirmModal').classList.add('hidden'));
document.getElementById('btnConfirmOk').addEventListener('click', () => {
  if (typeof pendingConfirmAction === 'function') pendingConfirmAction();
  document.getElementById('confirmModal').classList.add('hidden');
});

document.getElementById('btnExportCsv').addEventListener('click', () => {
  if (useBackendApi) { window.location.href = '/api/export'; showToast('Downloading CSV from server'); return; }
  const headers = ['Roll No', 'Name', 'Email', 'Phone', 'Branch', 'Semester', 'Attendance %', 'CGPA', 'Status'];
  const rows = students.map(s => [s.roll, s.name, s.email, s.phone || '', s.dept, s.sem, s.attendance, s.cgpa, s.status].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'gola_polytechnic_students.csv'; a.click();
  URL.revokeObjectURL(url);
  showToast('Exported student records to CSV');
});

document.getElementById('btnResetDemo').addEventListener('click', () => {
  openConfirmModal('Reset Demo Data', 'Restore default sample records?', async () => {
    if (useBackendApi) { await fetch('/api/reset', { method: 'POST' }); await loadStudents(); }
    else { students = JSON.parse(JSON.stringify(DEFAULT_STUDENTS)); saveLocalStudents(); }
    switchTab(activeTab);
    showToast('Demo data restored');
  });
});

document.getElementById('studentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('editStudentId').value;
  const cgpaVal = Math.min(10, Math.max(0, Number(document.getElementById('fCgpa').value)));
  const attVal = Math.min(100, Math.max(0, Math.round(Number(document.getElementById('fAttendance').value))));
  const payload = {
    roll: document.getElementById('fRoll').value.trim(), name: document.getElementById('fName').value.trim(),
    email: document.getElementById('fEmail').value.trim(), phone: document.getElementById('fPhone').value.trim(),
    dept: document.getElementById('fDept').value, sem: Number(document.getElementById('fSem').value),
    attendance: attVal, cgpa: Number(cgpaVal.toFixed(1)),
    internal: Math.round((cgpaVal / 10) * 40), external: Math.round((cgpaVal / 10) * 60),
    status: document.getElementById('fStatus').value
  };
  if (useBackendApi) {
    const res = await fetch(id ? `/api/students/${id}` : '/api/students', {
      method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    if (!res.ok) { const err = await res.json(); showToast(err.error || 'Could not save student'); return; }
    await loadStudents();
  } else {
    if (id) { const idx = students.findIndex(s => s.id === id); if (idx !== -1) students[idx] = { ...students[idx], ...payload, id }; }
    else { students.unshift({ ...payload, id: String(Date.now()) }); }
    saveLocalStudents();
  }
  showToast(id ? `Updated ${payload.name}` : `Added ${payload.name}`);
  document.getElementById('studentModal').classList.add('hidden');
  switchTab(activeTab);
});

['searchInput', 'filterDept', 'filterSem', 'filterStatus'].forEach(elId => document.getElementById(elId).addEventListener('input', renderStudentsTable));
document.getElementById('btnClearFilters').addEventListener('click', () => {
  document.getElementById('searchInput').value = ''; document.getElementById('filterDept').value = 'All';
  document.getElementById('filterSem').value = 'All'; document.getElementById('filterStatus').value = 'All';
  renderStudentsTable();
});

document.getElementById('studentsTableBody').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const student = students.find(s => s.id === btn.dataset.id);
  if (!student) return;
  if (btn.dataset.action === 'view') openProfileModal(student);
  if (btn.dataset.action === 'edit') openStudentModal(student);
  if (btn.dataset.action === 'delete') {
    openConfirmModal('Delete Student', `Remove ${student.name} (${student.roll})?`, async () => {
      if (useBackendApi) { await fetch(`/api/students/${student.id}`, { method: 'DELETE' }); await loadStudents(); }
      else { students = students.filter(s => s.id !== student.id); saveLocalStudents(); }
      renderStudentsTable();
      showToast(`Deleted ${student.name}`);
    });
  }
});

document.getElementById('attDeptFilter').addEventListener('change', renderAttendanceTable);
document.getElementById('attendanceTableBody').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-att-id]');
  if (!btn) return;
  todayAttendance[btn.dataset.attId] = btn.dataset.attVal;
  renderAttendanceTable();
});

document.getElementById('btnMarkAllPresent').addEventListener('click', () => {
  const dept = document.getElementById('attDeptFilter').value;
  students.filter(s => s.status === 'Active' && (dept === 'All' || s.dept === dept)).forEach(s => { todayAttendance[s.id] = 'Present'; });
  renderAttendanceTable();
  showToast('Marked all visible students Present');
});

document.getElementById('btnSaveAttendance').addEventListener('click', async () => {
  const dept = document.getElementById('attDeptFilter').value;
  const target = students.filter(s => s.status === 'Active' && (dept === 'All' || s.dept === dept));
  if (useBackendApi) {
    const records = target.map(s => ({ id: s.id, status: todayAttendance[s.id] || 'Present' }));
    await fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ records }) });
    await loadStudents();
  } else {
    target.forEach(s => {
      const st = todayAttendance[s.id] || 'Present';
      if (st === 'Present') s.attendance = Math.min(100, s.attendance + 1);
      else if (st === 'Absent') s.attendance = Math.max(0, s.attendance - 2);
    });
    saveLocalStudents();
  }
  renderAttendanceTable();
  showToast(`Attendance saved for ${document.getElementById('attDate').value}`);
});

document.getElementById('gradesDeptFilter').addEventListener('change', renderGradesTable);
document.getElementById('gradesTableBody').addEventListener('change', async (e) => {
  const input = e.target.closest('input[data-grade-id]');
  if (!input) return;
  const student = students.find(s => s.id === input.dataset.gradeId);
  if (!student) return;
  const maxVal = input.dataset.field === 'internal' ? 40 : 60;
  student[input.dataset.field] = Math.min(maxVal, Math.max(0, Math.round(Number(input.value) || 0)));
  if (useBackendApi) {
    await fetch(`/api/grades/${student.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ internal: student.internal, external: student.external }) });
    await loadStudents();
  } else {
    student.cgpa = Number(((Number(student.internal || 0) + Number(student.external || 0)) / 10).toFixed(1));
    saveLocalStudents();
  }
  renderGradesTable();
  showToast(`Updated grades for ${student.name}`);
});

document.getElementById('attDate').value = new Date().toISOString().split('T')[0];
loadStudents();