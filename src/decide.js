const cfg = Object.create(null);
for (const it of $('Read Config').all()) { const k = String(it.json.key == null ? '' : it.json.key).trim(); if (k) cfg[k] = it.json.value; }
const num = (k, d) => { const n = Number(cfg[k]); return Number.isFinite(n) && n >= 0 ? n : d; };
const WAIT = num('wait_days', 2), WIN = num('window_days', 14), DEDUPE = num('dedupe_days', 30);
const reviewUrl = String(cfg.public_review_url || '').trim();
const formUrl = String(cfg.feedback_form_url || '').trim();
const okUrl = u => /^https?:\/\/[^\s"'<>]+$/i.test(u);
if (!okUrl(reviewUrl) || !okUrl(formUrl)) throw new Error('Config: public_review_url and feedback_form_url must both be http(s) links. Nothing was sent (rule R4).');
const dryRun = String(cfg.dry_run || '').trim().toLowerCase() === 'yes';
const fromEmail = String(cfg.from_email || '').trim();
const alertEmail = String(cfg.alert_email || '').trim();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
if (!dryRun && (!EMAIL_RE.test(fromEmail) || !EMAIL_RE.test(alertEmail))) throw new Error('Config: from_email and alert_email are needed for a live run.');
const tz = 'Asia/Karachi';
const today = DateTime.now().setZone(tz).startOf('day');
function toDate(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) && Math.abs(v) < 2e6 ? DateTime.fromISO('1899-12-30', { zone: tz }).plus({ days: Math.floor(v) }) : null;
  const s = String(v).trim();
  let d = DateTime.fromISO(s, { zone: tz });
  if (!d.isValid) d = DateTime.fromFormat(s, 'M/d/yyyy', { zone: tz });
  if (!d.isValid) d = DateTime.fromFormat(s, 'yyyy/MM/dd', { zone: tz });
  return d.isValid ? d.startOf('day') : null;
}
const daysAgo = d => Math.round(today.diff(d, 'days').days);
const norm = e => String(e || '').trim().toLowerCase();
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const jobs = $('Read Jobs').all().map(i => i.json).filter(j => String(j.job_id || '').trim() !== '');
const lastInvite = {};
for (const j of jobs) {
  const inv = toDate(j.invited_at);
  if (inv && String(j.invite_status || '').trim() === 'sent') { const e = norm(j.customer_email); if (!lastInvite[e] || inv > lastInvite[e]) lastInvite[e] = inv; }
}
const out = [], cands = [];
const skip = (j, id, reason) => {
  if (String(j.invite_status || '').trim() === 'skipped' && String(j.skip_reason || '').trim() === reason) return;
  out.push({ json: { job_id: id, action: 'skip', invited_at: '', invite_status: 'skipped', skip_reason: reason, live: !dryRun } });
};
for (const j of jobs) {
  if (String(j.invited_at || '').trim() !== '') continue;
  const id = String(j.job_id).trim();
  const email = norm(j.customer_email);
  const status = String(j.job_status || '').trim().toLowerCase();
  const done = toDate(j.completed_date);
  let r = '';
  if (status !== 'completed') r = 'not_completed';
  else if (!done) r = 'bad_completed_date';
  else if (daysAgo(done) < WAIT) r = 'too_soon';
  else if (daysAgo(done) > WIN) r = 'too_old';
  else if (!email) r = 'missing_email';
  else if (!EMAIL_RE.test(email)) r = 'invalid_email';
  else if (String(j.opted_out || '').trim().toUpperCase() === 'Y') r = 'opted_out';
  else if (lastInvite[email] && daysAgo(lastInvite[email]) < DEDUPE) r = 'recent_invite';
  if (r) skip(j, id, r); else cands.push({ j, id, email, done });
}
cands.sort((a, b) => (a.done.toMillis() - b.done.toMillis()) || (a.id < b.id ? -1 : 1));
const ROLE = new Map([['plumbing', 'Our plumber'], ['electrical', 'Our electrician'], ['heating', 'Our heating engineer']]);
const CAP = Math.max(1, num('max_invites_per_run', 40));
let sent = 0, held = 0;
const claimed = new Set();
for (const c of cands) {
  if (claimed.has(c.email)) { skip(c.j, c.id, 'duplicate_email'); continue; }
  if (sent >= CAP) { held++; continue; }
  claimed.add(c.email); sent++;
  const raw = String(c.j.customer_name || '').trim();
  const first = raw.split(/\s+/)[0] || '';
  const nameOk = /^[A-Za-z][A-Za-z'-]{0,29}$/.test(first);
  const svcRaw = String(c.j.service_type == null ? '' : c.j.service_type).trim().toLowerCase();
  const svc = ROLE.has(svcRaw) ? svcRaw : '';
  const role = ROLE.get(svc) || 'Our team';
  const when = c.done.toFormat('d LLL yyyy');
  const privUrl = formUrl + (formUrl.includes('?') ? '&' : '?') + 'job_id=' + encodeURIComponent(c.id);
  const headline = nameOk ? esc(first) + ',<br>how did we do?' : 'How did<br>we do?';
  const card = (n, t, d, b, href) =>
    '<div class="col" style="display:inline-block;width:100%;max-width:270px;vertical-align:top;font-size:16px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:6px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #DCE1E6;border-radius:10px;background:#F5F7F9;"><tr><td style="padding:20px;font-family:Arial,Helvetica,sans-serif;color:#1C2023;">' +
    '<div style="font-size:13px;font-weight:bold;color:#2E4555;">' + n + '</div>' +
    '<div style="font-size:20px;font-weight:bold;line-height:1.25;padding:8px 0 6px;">' + t + '</div>' +
    '<div style="font-size:14px;line-height:1.5;color:#5B6670;padding-bottom:16px;">' + d + '</div>' +
    '<a href="' + esc(href) + '" style="display:block;background:#2E4555;color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:15px;text-align:center;padding:14px 12px;border-radius:8px;">' + b + '</a>' +
    '</td></tr></table></td></tr></table></div>';
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>@media (max-width:620px){.col{max-width:100% !important;} .pad{padding-left:20px !important;padding-right:20px !important;} .h1{font-size:34px !important;} .padc{padding-left:14px !important;padding-right:14px !important;} .jobid{float:none !important;display:block !important;line-height:18px !important;padding-top:6px;}}</style></head>' +
    '<body style="margin:0;padding:0;background:#EEF1F4;">' +
    '<div style="display:none;max-height:0;overflow:hidden;">Tell us how your ' + esc(svc || 'recent') + ' job went. Public review or private note, your choice.</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EEF1F4;"><tr><td align="center" style="padding:24px 12px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#FFFFFF;border-radius:6px;overflow:hidden;">' +
    '<tr><td class="pad" style="padding:22px 36px;background:#263845;border-bottom:3px solid #D4B26A;font-family:Arial,Helvetica,sans-serif;">' +
    '<span style="font-size:19px;font-weight:bold;letter-spacing:-0.3px;color:#EEF1F4;">NORTHGATE</span> <span style="font-size:12px;letter-spacing:0.5px;color:#C9D4DD;">HOME SERVICES</span>' +
    '<span class="jobid" style="float:right;font-size:12px;color:#C9D4DD;line-height:24px;">JOB ' + esc(c.id) + '</span></td></tr>' +
    '<tr><td class="pad" style="padding:36px 36px 8px;font-family:Arial,Helvetica,sans-serif;color:#1C2023;">' +
    '<div style="font-size:12px;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase;color:#2E4555;">After your ' + esc(svc || 'recent') + ' job &middot; ' + esc(when) + '</div>' +
    '<div class="h1" style="font-size:42px;line-height:1.04;font-weight:bold;letter-spacing:-1px;padding-top:14px;">' + headline + '</div>' +
    '<div style="font-size:17px;line-height:1.55;padding-top:18px;">' + role + ' finished the work on ' + esc(when) + '. Tell us how it went, good or bad. It takes about a minute.</div>' +
    '</td></tr>' +
    '<tr><td class="padc" style="padding:22px 30px 32px;font-size:0;" align="center">' +
    card('01', 'Public review', 'Post on Google. Other customers can read it.', 'Post a public review', reviewUrl) +
    card('02', 'Private note', 'Goes to our team only. We reply within 3 days.', 'Send private feedback', privUrl) +
    '</td></tr>' +
    '<tr><td class="pad" style="padding:18px 36px;background:#EEF1F4;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#5B6670;">' +
    'Northgate Home Services is a demo business. You got this because we completed a job for you. Reply STOP and we will not email you again.' +
    '</td></tr></table></td></tr></table></body></html>';
  const text = (nameOk ? first + ', how did we do?' : 'How did we do?') + '\n\n' +
    role + ' finished the work on ' + when + ' (job ' + c.id + '). Tell us how it went, good or bad.\n\n' +
    '01 Public review (on Google, other customers can read it):\n' + reviewUrl + '\n\n' +
    '02 Private note (our team only, we reply within 3 days):\n' + privUrl + '\n\n' +
    'Northgate Home Services is a demo business. Reply STOP and we will not email you again.';
  out.push({ json: { job_id: c.id, action: 'send', to: c.email, from: 'Northgate Home Services <' + fromEmail + '>',
    subject: 'How did we do on your ' + (svc || 'recent') + ' job?', html, text, has_public_link: html.includes(esc(reviewUrl)) && text.includes(reviewUrl), live: !dryRun } });
}
if (held && out.length) out[0].json.held_for_next_run = held;
return out;
