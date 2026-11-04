const cfg = Object.create(null);
for (const it of $('Read Config').all()) { const k = String(it.json.key == null ? '' : it.json.key).trim(); if (k) cfg[k] = it.json.value; }
const tz = 'Asia/Karachi';
const LABEL = new Map([['went well', 'It went well'], ['work quality', 'Work quality'], ['lateness', 'Lateness'], ['price/billing', 'Price or billing'], ['communication', 'Communication'], ['damage/safety', 'Damage or safety'], ['other', 'Something else']]);
const lab = c => { const v = String(c == null ? '' : c); const k = v.trim().toLowerCase(); return LABEL.has(k) ? LABEL.get(k) : v; };
const when = v => { const d = DateTime.fromFormat(String(v == null ? '' : v).trim(), 'yyyy-MM-dd HH:mm', { zone: tz }); return d.isValid ? d.toFormat('ccc d LLL, h:mm a') : String(v == null ? '' : v); };
const now = DateTime.now().setZone(tz);
let start = now.day <= 3 ? now.minus({ months: 1 }).startOf('month') : now.startOf('month');
const ov = String(cfg.report_month || '').trim();
if (/^[0-9]{4}-[0-9]{2}$/.test(ov)) { const o = DateTime.fromFormat(ov, 'yyyy-MM', { zone: tz }); if (o.isValid) start = o.startOf('month'); }
const end = start.endOf('month');
const toDate = v => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) && Math.abs(v) < 2e6 ? DateTime.fromISO('1899-12-30', { zone: tz }).plus({ days: v }) : null;
  const s = String(v).trim();
  for (const f of ['yyyy-MM-dd HH:mm', 'yyyy-MM-dd', 'M/d/yyyy', 'M/d/yyyy H:mm:ss']) { const d = DateTime.fromFormat(s, f, { zone: tz }); if (d.isValid) return d; }
  const d = DateTime.fromISO(s, { zone: tz }); return d.isValid ? d : null;
};
const inP = d => d && d >= start && d <= end;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const rows = n => $(n).all().map(i => i.json);
const jobs = rows('Read Jobs').filter(j => String(j.job_id || '').trim());
const cases = rows('Read Cases').filter(c => String(c.case_id || '').trim() && !String(c.case_id).startsWith('C-TEST'));
const fb = rows('Read Feedback').filter(f => String(f.timestamp || '').trim());
const completed = jobs.filter(j => String(j.job_status).toLowerCase() === 'completed' && inP(toDate(j.completed_date))).length;
const invites = jobs.filter(j => String(j.invite_status) === 'sent' && inP(toDate(j.invited_at))).length;
const notes = fb.filter(f => inP(toDate(f.timestamp))).length;
const opened = cases.filter(c => inP(toDate(c.created_at)));
const urgent = opened.filter(c => String(c.severity) === 'urgent').length;
const resolved = cases.filter(c => inP(toDate(c.resolved_at)));
const hours = resolved.map(c => { const a = toDate(c.created_at), b = toDate(c.resolved_at); return a && b ? b.diff(a, 'hours').hours : null; }).filter(h => h !== null && h >= 0);
const onTime = resolved.filter(c => { const r = toDate(c.resolved_at), d = toDate(c.due_at); return r && d && r <= d; }).length;
const open = cases.filter(c => String(c.status).toLowerCase() !== 'resolved');
const overdue = open.filter(c => { const d = toDate(c.due_at); return d && d < now; });
const avg = hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : null;
const fmtH = h => h === null ? '&ndash;' : (h < 48 ? Math.round(h) + ' h' : (h / 24).toFixed(1) + ' d');
const byCat = {};
for (const c of opened) byCat[c.category || 'other'] = (byCat[c.category || 'other'] || 0) + 1;
const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
const maxC = cats.length ? cats[0][1] : 1;
const label = start.toFormat('LLLL yyyy');
const quiet = !invites && !notes && !opened.length;
const headline = quiet ? 'A quiet month.' : invites + ' invite' + (invites === 1 ? '' : 's') + ' sent,<br>' + opened.length + ' case' + (opened.length === 1 ? '' : 's') + ' opened.';
const tile = (num, lab, sub) => '<div class="col" style="display:inline-block;width:100%;max-width:138px;vertical-align:top;font-size:16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:4px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F7F9;border:1px solid #DCE1E6;border-radius:8px;"><tr><td style="padding:14px;font-family:Arial,Helvetica,sans-serif;">' +
  '<div style="font-size:28px;font-weight:bold;color:#1C2023;letter-spacing:-0.5px;">' + num + '</div><div style="font-size:12px;font-weight:bold;color:#2E4555;padding-top:4px;">' + lab + '</div><div style="font-size:11px;color:#5B6670;padding-top:2px;">' + sub + '</div></td></tr></table></td></tr></table></div>';
const sect = t => '<div style="font-size:12px;font-weight:bold;letter-spacing:1.2px;color:#2E4555;padding-bottom:10px;">' + t + '</div>';
const catRows = cats.length ? cats.map(([k, v]) => '<tr><td style="padding:6px 0;font-size:14px;color:#1C2023;width:130px;">' + esc(lab(k)) + '</td><td style="padding:6px 0;"><div style="background:#2E4555;height:10px;border-radius:5px;width:' + Math.max(6, Math.round(v / maxC * 100)) + '%;"></div></td><td style="padding:6px 0 6px 10px;font-size:14px;font-weight:bold;width:30px;text-align:right;">' + v + '</td></tr>').join('') : '<tr><td style="font-size:14px;color:#5B6670;padding:6px 0;">No cases opened this month.</td></tr>';
const oldest = overdue.sort((a, b) => toDate(a.due_at) - toDate(b.due_at)).slice(0, 5);
const odRows = oldest.length ? oldest.map(c => '<tr><td style="padding:10px 0;border-top:1px solid #DCE1E6;font-family:Arial,Helvetica,sans-serif;"><div style="font-size:15px;font-weight:bold;color:#1C2023;">' + esc(c.summary) + '</div><div style="font-size:12px;color:#5B6670;padding-top:3px;">' + esc(c.case_id) + ' &middot; ' + esc(lab(c.category)) + ' &middot; due ' + esc(when(c.due_at)) + '</div></td></tr>').join('') : '<tr><td style="font-size:14px;color:#5B6670;padding:6px 0;">Nothing overdue. Every open case is inside its deadline.</td></tr>';
const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>@media (max-width:620px){.col{max-width:50% !important;}}</style></head><body style="margin:0;padding:0;background:#EEF1F4;">' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EEF1F4;"><tr><td align="center" style="padding:24px 12px;">' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#FFFFFF;border-radius:6px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#1C2023;">' +
  '<tr><td style="padding:20px 28px;background:#263845;border-bottom:3px solid #D4B26A;"><span style="font-size:17px;font-weight:bold;color:#FFFFFF;">NORTHGATE</span> <span style="font-size:11px;letter-spacing:0.5px;color:#C9D4DD;">MONTHLY REPORT</span></td></tr>' +
  '<tr><td style="padding:28px 28px 8px;"><div style="font-size:12px;font-weight:bold;letter-spacing:1.2px;color:#2E4555;padding-bottom:10px;">' + esc(label.toUpperCase()) + '</div><div style="font-size:34px;font-weight:bold;line-height:1.08;letter-spacing:-0.5px;">' + headline + '</div>' +
  '<div style="font-size:15px;line-height:1.55;color:#5B6670;padding-top:12px;">' + completed + ' jobs completed. ' + (overdue.length ? overdue.length + ' open case' + (overdue.length === 1 ? ' is' : 's are') + ' past deadline right now.' : 'No open case is past its deadline.') + '</div></td></tr>' +
  '<tr><td style="padding:16px 24px 8px;font-size:0;" align="center">' +
  tile(invites, 'Invites sent', 'same email to all') + tile(urgent, 'Urgent cases', 'of ' + opened.length + ' opened') + tile(resolved.length, 'Resolved', resolved.length ? onTime + ' on time' : 'none yet') + tile(fmtH(avg), 'Avg to resolve', 'opened to resolved') +
  '</td></tr>' +
  '<tr><td style="padding:20px 28px 8px;">' + sect('CASES BY CATEGORY') + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + catRows + '</table></td></tr>' +
  '<tr><td style="padding:20px 28px 24px;">' + sect('OLDEST OVERDUE') + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + odRows + '</table></td></tr>' +
  '<tr><td style="padding:16px 28px;background:#EEF1F4;font-size:12px;line-height:1.6;color:#5B6670;">Public reviews are not counted: Google does not tell this system who posted. Every invite offers the public review and the private note equally.</td></tr>' +
  '</table></td></tr></table></body></html>';
const to = String(cfg.report_to || cfg.alert_email || '').trim();
return [{ json: { to, from: 'Northgate Home Services <' + String(cfg.from_email || '').trim() + '>', subject: 'Northgate report: ' + label, html, period: label, invites, notes, opened: opened.length, resolved: resolved.length } }];
