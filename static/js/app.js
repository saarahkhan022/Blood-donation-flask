// ── Tab Navigation ────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + target).classList.add('active');
    if (target === 'history') loadHistory();
  });
});

// ── Toast Notification ─────────────────────────────────────────
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.classList.remove('show'), 3200);
}

// ── Alert Box ──────────────────────────────────────────────────
function showAlert(el, msg, type) {
  el.textContent = msg;
  el.className = 'alert show ' + type;
  setTimeout(() => el.className = 'alert', 4000);
}

// ── Register Donor ─────────────────────────────────────────────
document.getElementById('btn-register').addEventListener('click', async () => {
  const alertEl = document.getElementById('reg-alert');
  const payload = {
    name:         document.getElementById('reg-name').value,
    age:          document.getElementById('reg-age').value,
    phone:        document.getElementById('reg-phone').value,
    city:         document.getElementById('reg-city').value,
    blood_group:  document.getElementById('reg-bg').value,
    last_donated: document.getElementById('reg-last').value,
    available:    document.getElementById('reg-available').checked
  };

  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (data.success) {
    showAlert(alertEl, '🎉 ' + data.message, 'success');
    showToast('Donor registered successfully!', 'success');
    ['reg-name','reg-age','reg-phone','reg-city','reg-last'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('reg-last').value = 'Never';
    document.getElementById('reg-available').checked = true;
  } else {
    showAlert(alertEl, '⚠ ' + data.message, 'error');
  }
});

// ── Search Donors ──────────────────────────────────────────────
document.getElementById('btn-search').addEventListener('click', searchDonors);
document.getElementById('s-city').addEventListener('keydown', e => { if(e.key==='Enter') searchDonors(); });

async function searchDonors() {
  const bg   = document.getElementById('s-bg').value;
  const city = document.getElementById('s-city').value;
  const res = await fetch(`/api/search?blood_group=${encodeURIComponent(bg)}&city=${encodeURIComponent(city)}`);
  const data = await res.json();
  renderSearchResults(data.donors);
}

function renderSearchResults(donors) {
  const area = document.getElementById('search-results');
  if (!donors.length) {
    area.innerHTML = `<div class="empty-state"><div class="empty-icon">😔</div><p>No donors found matching your criteria.</p></div>`;
    return;
  }
  const grid = donors.map(d => `
    <div class="donor-card ${d.available ? '' : 'unavailable'}">
      <div class="donor-bg-badge">${d.blood_group}</div>
      <div class="donor-name">${escHtml(d.name)}</div>
      <div class="donor-detail">📍 ${escHtml(d.city)}</div>
      <div class="donor-detail">📞 ${escHtml(d.phone)}</div>
      <div class="donor-detail">🗓 Last donated: ${escHtml(d.last_donated || 'Never')}</div>
      <span class="avail-badge ${d.available ? 'yes' : 'no'}">${d.available ? '✅ Available' : '❌ Unavailable'}</span>
      ${d.available ? `<button class="mark-btn" onclick="markDonation('${escHtml(d.name)}','${escHtml(d.phone)}')">🩸 Mark Donation Done</button>` : ''}
    </div>
  `).join('');
  area.innerHTML = `<div class="results-count">${donors.length} donor${donors.length > 1 ? 's' : ''} found</div><div class="donor-grid">${grid}</div>`;
}

async function markDonation(name, phone) {
  const res = await fetch('/api/mark_donation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone })
  });
  const data = await res.json();
  if (data.success) {
    showToast('🩸 ' + data.message, 'success');
    searchDonors();
  } else {
    showToast('Error: ' + data.message, 'error');
  }
}

// ── Emergency Request ──────────────────────────────────────────
document.getElementById('btn-emergency').addEventListener('click', async () => {
  const payload = {
    patient_name: document.getElementById('em-name').value,
    hospital:     document.getElementById('em-hospital').value,
    city:         document.getElementById('em-city').value,
    contact:      document.getElementById('em-contact').value,
    blood_group:  document.getElementById('em-bg').value
  };

  const res = await fetch('/api/emergency', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  renderEmergencyResults(data.donors, payload.blood_group, payload.city);
});

function renderEmergencyResults(donors, bg, city) {
  const area = document.getElementById('em-results');
  area.style.display = 'block';

  if (!donors.length) {
    area.innerHTML = `
      <div class="em-match-header not-found">
        ❌ No available ${escHtml(bg)} donors found in "${escHtml(city || 'any city')}". 
        Please try broadening your search or registering more donors.
      </div>`;
    return;
  }

  const rows = donors.map(d => `
    <div class="em-donor-row">
      <div class="em-avatar">${d.blood_group}</div>
      <div class="em-info">
        <strong>${escHtml(d.name)}</strong>
        <span>📍 ${escHtml(d.city)}</span>
      </div>
      <div class="em-phone">📞 ${escHtml(d.phone)}</div>
    </div>
  `).join('');

  area.innerHTML = `
    <div class="em-match-header found">✅ Found ${donors.length} matching donor${donors.length > 1 ? 's' : ''} for blood group ${escHtml(bg)}</div>
    ${rows}`;
  showToast(`Found ${donors.length} donor(s)! Contact them immediately.`, 'success');
}

// ── History ────────────────────────────────────────────────────
document.getElementById('btn-refresh-history').addEventListener('click', loadHistory);
document.getElementById('btn-clear-history').addEventListener('click', async () => {
  if (!confirm('Clear all history records? This cannot be undone.')) return;
  const res = await fetch('/api/history/clear', { method: 'DELETE' });
  const data = await res.json();
  if (data.success) { showToast('History cleared.', 'info'); loadHistory(); }
});

async function loadHistory() {
  const res = await fetch('/api/history');
  const data = await res.json();
  renderHistory(data.history);
}

function renderHistory(history) {
  const area = document.getElementById('history-area');
  if (!history.length) {
    area.innerHTML = `<div class="empty-state"><div class="empty-icon">📜</div><p>No history records yet.</p></div>`;
    return;
  }

  const rows = history.map(h => {
    const isDonation = h.type === 'Donation';
    return `<tr>
      <td style="font-family:var(--font-mono);font-size:0.8rem;color:var(--muted)">${escHtml(h.date || '—')}</td>
      <td><span class="type-tag ${isDonation ? 'donation' : 'emergency'}">${isDonation ? '🩸 Donation' : '🚨 Emergency'}</span></td>
      <td>${escHtml(h.donor || '—')}</td>
      <td style="font-weight:700;color:var(--accent)">${escHtml(h.blood_group || '—')}</td>
      <td>${escHtml(h.city || '—')}</td>
    </tr>`;
  }).join('');

  area.innerHTML = `
    <table class="history-table">
      <thead>
        <tr>
          <th>Date & Time</th>
          <th>Type</th>
          <th>Donor / Patient</th>
          <th>Blood Group</th>
          <th>City</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ── Utility ────────────────────────────────────────────────────
function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
