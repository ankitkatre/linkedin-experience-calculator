// LinkedIn Experience Calculator - Content Script

const MONTH_MAP = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

let presentCounter = 0;

function parseDate(dateStr) {
  if (!dateStr) return null;
  const lower = dateStr.toLowerCase().trim();
  if (lower === 'present' || lower === 'now') {
    const d = new Date();
    d.setMilliseconds(d.getMilliseconds() + (++presentCounter));
    return d;
  }
  const monthYearMatch = lower.match(/([a-z]+)\s+(\d{4})/);
  if (monthYearMatch) {
    const monthKey = monthYearMatch[1].substring(0, 3);
    const year = parseInt(monthYearMatch[2]);
    const month = MONTH_MAP[monthKey];
    if (month !== undefined && !isNaN(year)) return new Date(year, month, 1);
  }
  const yearOnly = lower.match(/^(\d{4})$/);
  if (yearOnly) return new Date(parseInt(yearOnly[1]), 0, 1);
  return null;
}

function isPresent(dateObj) {
  return Math.abs(dateObj - new Date()) < 1000 * 60 * 60 * 24 * 2;
}

function formatDuration(totalMonths) {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts = [];
  if (years > 0) parts.push(`${years} yr${years !== 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} mo${months !== 1 ? 's' : ''}`);
  return parts.length > 0 ? parts.join(' ') : '< 1 mo';
}

function monthDiff(startDate, endDate) {
  const years = endDate.getFullYear() - startDate.getFullYear();
  const months = endDate.getMonth() - startDate.getMonth();
  return Math.max(0, years * 12 + months);
}

// Known section headings that mark END of Experience block
const NON_EXP_SECTIONS = [
  'education', 'skills', 'licenses & certifications', 'licenses',
  'certifications', 'volunteering', 'publications', 'courses',
  'projects', 'honors & awards', 'honors', 'awards', 'languages',
  'organizations', 'causes', 'recommendations', 'interests',
  'people also viewed', 'you might like', 'about', 'activity',
  'pages for you'
];

function isNonExpSection(line) {
  const l = line.trim().toLowerCase();
  return NON_EXP_SECTIONS.includes(l);
}

function isJunkLine(t) {
  if (t.length <= 2) return true;
  if (/^\d{4}$/.test(t)) return true;
  if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i.test(t)) return true;
  if (/\d+\s*(mos?|yrs?)\s*\d*\s*(mos?|yrs?)?$/i.test(t)) return true;
  if (/^(present|now)$/i.test(t)) return true;
  if (/^(full.time|part.time|contract|internship|freelance|hybrid|remote|on.site|self.employed)/i.test(t)) return true;
  if (/·/.test(t)) return true;
  if (/^(linkedin|http|www\.|connect|follow|message|more)/i.test(t)) return true;
  if (/followers/i.test(t)) return true;
  if (/\d+\s*(connection|follower)/i.test(t)) return true;
  return false;
}

// ── Primary extraction: parse page innerText, slice Experience section only ──
function extractFromText() {
  presentCounter = 0;
  const experiences = [];
  const DATE_RANGE_RE = /([A-Za-z]+\s+\d{4}|\d{4})\s*[–\-—]\s*([A-Za-z]+\s+\d{4}|[Pp]resent|[Nn]ow|\d{4})/g;

  const fullText = document.body.innerText || '';
  const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);

  // Find the "Experience" heading line
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === 'Experience') { startIdx = i; break; }
  }
  if (startIdx === -1) return experiences;

  // Find the end: next known non-experience section heading
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (isNonExpSection(lines[i])) { endIdx = i; break; }
  }

  const expLines = lines.slice(startIdx + 1, endIdx);

  // Walk line by line — track last seen job title, extract date ranges
  let currentTitle = 'Position';
  for (const line of expLines) {
    // Update title if this line looks like a job title
    if (!isJunkLine(line) && line.length > 3 && line.length < 100) {
      currentTitle = line;
    }

    // Look for date range on this line
    const matches = [...line.matchAll(DATE_RANGE_RE)];
    for (const m of matches) {
      const startDate = parseDate(m[1]);
      const endDate = parseDate(m[2]);
      if (!startDate || !endDate) continue;
      experiences.push({
        title: currentTitle,
        startDate,
        endDate,
        isPresent: isPresent(endDate)
      });
    }
  }

  // De-duplicate: keep all present roles (unique timestamps), dedup past roles by start date
  const seen = new Set();
  return experiences.filter(e => {
    if (e.isPresent) return true;
    const key = `${e.startDate.getTime()}-${e.endDate.getTime()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const DEAD_THRESHOLD_MONTHS = 39 * 12 + 9;

function getStatus(experiences, totalMonths) {
  const presentRoles = experiences.filter(e => e.isPresent);
  if (presentRoles.length === 0) return 'dead';
  if (presentRoles.length >= 2) return 'dual';
  if (totalMonths > DEAD_THRESHOLD_MONTHS) return 'dead';
  return 'active';
}

function createWidget(experiences) {
  const existing = document.getElementById('li-exp-calc-widget');
  if (existing) existing.remove();
  if (experiences.length === 0) return;

  // Total = earliest start → today
  const earliest = experiences.reduce((min, e) =>
    e.startDate < min ? e.startDate : min, experiences[0].startDate);
  const today = new Date();
  const totalMonths = monthDiff(earliest, today);
  const formattedTotal = formatDuration(totalMonths);
  const status = getStatus(experiences, totalMonths);

  const widget = document.createElement('div');
  widget.id = 'li-exp-calc-widget';
  widget.setAttribute('data-status', status);

  if (status === 'dead') {
    widget.innerHTML = `
      <div class="lec-header">
        <span class="lec-icon">⚡</span>
        <span class="lec-title">Experience Calculator</span>
        <button class="lec-close" title="Close">✕</button>
      </div>
      <div class="lec-alert dead">
        <div class="lec-alert-icon">💀</div>
        <div class="lec-alert-label">DEAD CONTACT</div>
        <div class="lec-alert-reason">${totalMonths > DEAD_THRESHOLD_MONTHS
          ? 'Experience exceeds 39 yrs 9 mos'
          : 'No current active role found'
        }</div>
        <div class="lec-alert-exp">${formattedTotal} total experience</div>
      </div>`;
  } else if (status === 'dual') {
    const presentRoles = experiences.filter(e => e.isPresent);
    widget.innerHTML = `
      <div class="lec-header">
        <span class="lec-icon">⚡</span>
        <span class="lec-title">Experience Calculator</span>
        <button class="lec-close" title="Close">✕</button>
      </div>
      <div class="lec-alert dual">
        <div class="lec-alert-icon">⚡⚡</div>
        <div class="lec-alert-label">DUAL CONTACT</div>
        <div class="lec-alert-reason">2 active roles simultaneously</div>
        <div class="lec-dual-roles">
          ${presentRoles.slice(0, 2).map(r => `<div class="lec-dual-role">● ${r.title.length > 26 ? r.title.substring(0,26)+'…' : r.title}</div>`).join('')}
        </div>
        <div class="lec-alert-exp">${formattedTotal} total experience</div>
      </div>`;
  } else {
    widget.innerHTML = `
      <div class="lec-header">
        <span class="lec-icon">⚡</span>
        <span class="lec-title">Experience Calculator</span>
        <button class="lec-close" title="Close">✕</button>
      </div>
      <div class="lec-body">
        <div class="lec-stat primary">
          <div class="lec-stat-value">${formattedTotal}</div>
          <div class="lec-stat-label">Total Experience</div>
        </div>
        <div class="lec-divider"></div>
        <div class="lec-stat secondary">
          <div class="lec-stat-value">${earliest.toLocaleString('default', { month: 'short', year: 'numeric' })}</div>
          <div class="lec-stat-label">Career Started</div>
        </div>
        <div class="lec-divider"></div>
        <div class="lec-stat secondary">
          <div class="lec-stat-value">${experiences.length}</div>
          <div class="lec-stat-label">Roles</div>
        </div>
      </div>
      <div class="lec-timeline">
        ${experiences.slice(0, 5).map(exp => `
          <div class="lec-job">
            <div class="lec-job-dot ${exp.isPresent ? 'active' : ''}"></div>
            <div class="lec-job-info">
              <span class="lec-job-title">${exp.title.length > 28 ? exp.title.substring(0, 28) + '…' : exp.title}</span>
              <span class="lec-job-duration">${exp.isPresent ? 'Present' : formatDuration(monthDiff(exp.startDate, exp.endDate))}</span>
            </div>
          </div>`).join('')}
        ${experiences.length > 5 ? `<div class="lec-more">+${experiences.length - 5} more roles</div>` : ''}
      </div>`;
  }

  widget.querySelector('.lec-close').addEventListener('click', () => widget.remove());
  document.body.appendChild(widget);
  requestAnimationFrame(() => widget.classList.add('lec-visible'));
}

function showError(message) {
  const existing = document.getElementById('li-exp-calc-widget');
  if (existing) existing.remove();
  const widget = document.createElement('div');
  widget.id = 'li-exp-calc-widget';
  widget.innerHTML = `
    <div class="lec-header">
      <span class="lec-icon">⚡</span>
      <span class="lec-title">Experience Calculator</span>
      <button class="lec-close" title="Close">✕</button>
    </div>
    <div class="lec-error">
      <span>⚠️</span>
      <p>${message}</p>
      <button class="lec-retry">Retry</button>
    </div>`;
  widget.querySelector('.lec-close').addEventListener('click', () => widget.remove());
  widget.querySelector('.lec-retry').addEventListener('click', () => { widget.remove(); init(); });
  document.body.appendChild(widget);
  requestAnimationFrame(() => widget.classList.add('lec-visible'));
}

function init() {
  let attempts = 0;
  const maxAttempts = 35;
  const check = setInterval(() => {
    attempts++;
    const experiences = extractFromText();
    if (experiences.length > 0) {
      clearInterval(check);
      createWidget(experiences);
    } else if (attempts >= maxAttempts) {
      clearInterval(check);
      if (window.location.pathname.startsWith('/in/')) {
        showError('Could not detect experience section.<br>Please scroll down to load the full profile, then click Retry.');
      }
    }
  }, 1000);
}

init();

let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    if (url.includes('/in/')) setTimeout(init, 1500);
  }
}).observe(document, { subtree: true, childList: true });
