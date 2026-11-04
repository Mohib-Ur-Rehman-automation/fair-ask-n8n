const cfg = Object.create(null);
for (const it of $('Read Config').all()) { const k = String(it.json.key == null ? '' : it.json.key).trim(); if (k) cfg[k] = it.json.value; }
const dryRun = String(cfg.dry_run || '').trim().toLowerCase() === 'yes';
const from = 'Northgate Home Services <' + String(cfg.from_email || '').trim() + '>';
const fallbackOwner = String(cfg.alert_email || cfg['owner:other'] || '').trim();
const allowed = new Set(Object.keys(cfg).filter(k => k.startsWith('owner:')).map(k => String(cfg[k]).trim().toLowerCase()).concat([fallbackOwner.toLowerCase()]));
const tz = 'Asia/Karachi';
const LABEL = new Map([['went well', 'It went well'], ['work quality', 'Work quality'], ['lateness', 'Lateness'], ['price/billing', 'Price or billing'], ['communication', 'Communication'], ['damage/safety', 'Damage or safety'], ['other', 'Something else']]);
const lab = c => { const v = String(c == null ? '' : c); const k = v.trim().toLowerCase(); return LABEL.has(k) ? LABEL.get(k) : v; };
const when = v => { const d = DateTime.fromFormat(String(v == null ? '' : v).trim(), 'yyyy-MM-dd HH:mm', { zone: tz }); return d.isValid ? d.toFormat('ccc d LLL, h:mm a') : String(v == null ? '' : v); };
const now = DateTime.now().setZone(tz);
const today = now.toISODate();
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const parse = v => { const s = String(v || '').trim(); let d = DateTime.fromFormat(s, 'yyyy-MM-dd HH:mm', { zone: tz }); if (!d.isValid) d = DateTime.fromISO(s, { zone: tz }); return d.isValid ? d : null; };
const reminded = new Set($('Read Log').all().map(i => i.json)
  .filter(r => String(r.module) === 'M4 reminder' && String(r.event) === 'reminded' && String(r.timestamp || '').startsWith(today))
  .map(r => String(r.detail).trim()));
const out = [], byOwner = {};
for (const c of $('Read Cases').all().map(i => i.json)) {
  const id = String(c.case_id || '').trim(); if (!id) continue;
  const status = String(c.status || '').trim().toLowerCase();
  if (status === 'resolved') {
    if (!String(c.resolved_at || '').trim()) out.push({ json: { kind: 'resolve', case_id: id, resolved_at: now.toFormat('yyyy-MM-dd HH:mm'), live: !dryRun } });
    continue;
  }
  const due = parse(c.due_at);
  if (!due || due > now || reminded.has(id)) continue;
  const ownerRaw = String(c.owner == null ? '' : c.owner).trim().toLowerCase();
  const owner = allowed.has(ownerRaw) && ownerRaw ? ownerRaw : fallbackOwner;
  const hrs = Math.floor(now.diff(due, 'hours').hours);
  const dys = Math.floor(hrs / 24);
  const late = hrs < 24 ? hrs + (hrs === 1 ? ' hour' : ' hours') + ' overdue' : dys + (dys === 1 ? ' day' : ' days') + ' overdue';
  (byOwner[owner] = byOwner[owner] || []).push({ id, job: c.job_id, cat: c.category, sev: String(c.severity).toLowerCase(), sum: c.summary, status, late, hrs });
}
for (const [owner, list] of Object.entries(byOwner)) {
  list.sort((a, b) => (a.sev === 'urgent' ? 0 : 1) - (b.sev === 'urgent' ? 0 : 1) || b.hrs - a.hrs);
  const block = c => '<tr><td style="padding:16px 0;border-top:1px solid #DCE1E6;">' +
    '<span style="display:inline-block;background:' + (c.sev === 'urgent' ? '#1C2023' : '#E4EAF0') + ';color:' + (c.sev === 'urgent' ? '#D4B26A' : '#2E4555') + ';font-size:11px;font-weight:bold;letter-spacing:1px;padding:4px 8px;border-radius:4px;">' + (c.sev === 'urgent' ? 'URGENT' : 'NORMAL') + '</span>' +
    ' <span style="font-size:13px;font-weight:bold;color:#2E4555;">' + esc(c.late) + '</span>' +
    '<div style="font-size:17px;font-weight:bold;line-height:1.35;padding:8px 0 4px;color:#1C2023;">' + esc(c.sum) + '</div>' +
    '<div style="font-size:13px;color:#5B6670;">' + esc(c.id) + ' &middot; job ' + esc(c.job) + ' &middot; ' + esc(lab(c.cat)) + ' &middot; status ' + esc(c.status) + '</div></td></tr>';
  const n = list.length;
  const waiting = list.filter(c => c.status === 'open').length;
  const head = waiting === n ? n + (n === 1 ? ' customer is' : ' customers are') + '<br>still waiting.' : n + (n === 1 ? ' case is' : ' cases are') + '<br>past deadline.';
  const sub = waiting === n ? '' : '<div style="font-size:15px;line-height:1.55;color:#5B6670;padding-top:10px;">' + (waiting ? waiting + ' still waiting for a first reply. ' : '') + (n - waiting) + ' contacted but not resolved.</div>';
  const shown = list.slice(0, 25);
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#EEF1F4;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EEF1F4;"><tr><td align="center" style="padding:24px 12px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#FFFFFF;border-radius:6px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#1C2023;">' +
    '<tr><td style="padding:20px 28px;background:#263845;border-bottom:3px solid #D4B26A;"><span style="font-size:17px;font-weight:bold;color:#FFFFFF;">NORTHGATE</span> <span style="font-size:11px;letter-spacing:0.5px;color:#C9D4DD;">MORNING CHECK</span></td></tr>' +
    '<tr><td style="padding:28px 28px 4px;"><div style="font-size:12px;font-weight:bold;letter-spacing:1.2px;color:#2E4555;">' + esc(now.toFormat('ccc d LLL').toUpperCase()) + ' &middot; FOLLOW UP TODAY</div>' +
    '<div style="font-size:34px;font-weight:bold;line-height:1.05;letter-spacing:-0.5px;padding-top:10px;">' + head + '</div>' + sub + '</td></tr>' +
    '<tr><td style="padding:16px 28px 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + shown.map(block).join('') + (n > 25 ? '<tr><td style="padding:14px 0;border-top:1px solid #DCE1E6;font-size:14px;color:#5B6670;">And ' + (n - 25) + ' more in the Cases tab.</td></tr>' : '') + '</table></td></tr>' +
    '<tr><td style="padding:16px 28px;background:#EEF1F4;font-size:12px;line-height:1.6;color:#5B6670;">Reply to the customer, then set the case to contacted or resolved in the Cases tab. You get this at most once a day per case.</td></tr>' +
    '</table></td></tr></table></body></html>';
  out.push({ json: { kind: 'digest', to: owner, from, subject: 'Northgate: ' + n + ' overdue case' + (n === 1 ? '' : 's') + ' need a reply', html, case_ids: list.map(c => c.id).join(','), live: !dryRun } });
}
return out;
