const cfg = Object.create(null);
for (const it of $('Read Config').all()) { const k = String(it.json.key == null ? '' : it.json.key).trim(); if (k) cfg[k] = it.json.value; }
const f = $('Feedback form').first().json;
const tz = 'Asia/Karachi';
const now = DateTime.now().setZone(tz);
const clean = (v, max) => String(v == null ? '' : v).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim().slice(0, max);
const CAT = new Map([['it went well', 'went well'], ['work quality', 'work quality'], ['lateness', 'lateness'], ['price or billing', 'price/billing'], ['communication', 'communication'], ['damage or safety', 'damage/safety'], ['something else', 'other']]);
const rawCat = clean(f['What is it about?'], 40).toLowerCase();
const category = CAT.get(rawCat) || 'other';
const message = clean(f['What happened?'], 2000);
const contactRaw = clean(f['Can we contact you about this?'], 40).toLowerCase();
const contact_ok = contactRaw.startsWith('yes') ? 'Y' : 'N';
const flags = [];
const jobRaw = clean(f.job_id, 40);
const jobs = $('Read Jobs').all().map(i => String(i.json.job_id || '').trim());
let job_id = jobRaw;
if (!jobRaw) { flags.push('missing job_id'); job_id = 'UNKNOWN'; }
else if (!/^NG-[0-9]{4}$/.test(jobRaw) || !jobs.includes(jobRaw)) { flags.push('unknown job_id'); job_id = 'UNKNOWN'; }
if (!message) flags.push('blank message');
if (!CAT.has(rawCat)) flags.push('no category chosen');
const kw = String(cfg.urgent_keywords || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const low = message.toLowerCase();
const hits = kw.filter(k => new RegExp('(^|[^a-z])' + k.replace(/[.*+?^${}()|[\]]/g, '') + '([^a-z]|$)').test(low));
const severity = (category === 'damage/safety' || hits.length) ? 'urgent' : 'normal';
const owner = String(cfg['owner:' + category] || cfg['owner:other'] || '').trim();
// flood limits: count recent cases from the Cases tab
const parseT = v => { const d = DateTime.fromFormat(String(v || ''), 'yyyy-MM-dd HH:mm', { zone: tz }); return d.isValid ? d : null; };
const recent = $('Read Cases').all().map(i => i.json);
const sameJobToday = job_id !== 'UNKNOWN' ? recent.filter(c => String(c.job_id) === job_id && String(c.created_at || '').startsWith(now.toISODate())).length : 0;
const urgentLastHour = recent.filter(c => String(c.severity) === 'urgent' && (parseT(c.created_at) || now.minus({ days: 1 })) > now.minus({ hours: 1 })).length;
const alertCap = Number(cfg.alert_cap_per_hour) > 0 ? Number(cfg.alert_cap_per_hour) : 5;
if (sameJobToday >= 3) flags.push('repeat submission (' + (sameJobToday + 1) + ' today for this job)');
const days = Number(severity === 'urgent' ? cfg.deadline_urgent_days : cfg.deadline_normal_days) || (severity === 'urgent' ? 1 : 3);
const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
const fallback = message ? (message.replace(/\s+/g, ' ').slice(0, 140) + (message.length > 140 ? '...' : '')) : '(no message)';
return [{ json: {
  case_id: 'C-' + now.toFormat('yyMMdd') + '-' + rnd,
  job_id, job_raw: jobRaw, category, severity, message, contact_ok, owner,
  created_at: now.toFormat('yyyy-MM-dd HH:mm'),
  due_at: now.plus({ days }).toFormat('yyyy-MM-dd HH:mm'),
  status: 'open', flags: flags.join('; '), keyword_hits: hits.join(', '),
  fallback_summary: fallback, from: 'Northgate Home Services <' + String(cfg.from_email || '').trim() + '>',
  send_alert: severity === 'urgent' && urgentLastHour < alertCap && sameJobToday < 3,
  alert_held: severity === 'urgent' && !(urgentLastHour < alertCap && sameJobToday < 3),
  ai_on: !!message && String(cfg.ai_summary || 'on').trim().toLowerCase() !== 'off'
} }];
