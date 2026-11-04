const t = $('Triage').first().json;
const r = $input.first().json || {};
let ai = '';
try { ai = String(((r.choices || [])[0] || {}).message.content || ''); } catch (e) { ai = ''; }
ai = ai.replace(/\s+/g, ' ').trim();
const aiOk = t.ai_on && ai.length >= 8 && ai.length <= 220 && !/https?:|<|>/i.test(ai);
const summary = aiOk ? ai : t.fallback_summary;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const row = (k, v) => '<tr><td style="padding:8px 0;border-top:1px solid #DCE1E6;color:#5B6670;font-size:13px;width:120px;vertical-align:top;">' + k + '</td><td style="padding:8px 0;border-top:1px solid #DCE1E6;font-size:14px;font-weight:bold;color:#1C2023;">' + v + '</td></tr>';
const tz = 'Asia/Karachi';
const LABEL = new Map([['went well', 'It went well'], ['work quality', 'Work quality'], ['lateness', 'Lateness'], ['price/billing', 'Price or billing'], ['communication', 'Communication'], ['damage/safety', 'Damage or safety'], ['other', 'Something else']]);
const lab = c => { const v = String(c == null ? '' : c); const k = v.trim().toLowerCase(); return LABEL.has(k) ? LABEL.get(k) : v; };
const when = v => { const d = DateTime.fromFormat(String(v == null ? '' : v).trim(), 'yyyy-MM-dd HH:mm', { zone: tz }); return d.isValid ? d.toFormat('ccc d LLL, h:mm a') : String(v == null ? '' : v); };
const urgent = t.severity === 'urgent';
const job = t.job_id && t.job_id !== 'UNKNOWN' ? $('Read Jobs').all().map(i => i.json).find(j => String(j.job_id == null ? '' : j.job_id).trim() === t.job_id) : null;
const cName = job ? String(job.customer_name == null ? '' : job.customer_name).replace(/\s+/g, ' ').trim().slice(0, 60) : '';
const cMail = job ? String(job.customer_email == null ? '' : job.customer_email).trim().toLowerCase() : '';
const mailOk = /^[a-z0-9._%+-]{1,64}@[a-z0-9.-]{1,190}[.][a-z]{2,24}$/.test(cMail);
const cFirst = (cName.split(' ')[0] || '');
const firstOk = /^[A-Za-z][A-Za-z'-]{0,29}$/.test(cFirst);
const who = (cName ? esc(cName) : '') + (mailOk ? (cName ? '<br>' : '') + '<a href="mailto:' + cMail + '" style="color:#2E4555;font-weight:normal;word-break:break-all;">' + cMail + '</a>' : '');
const replyBtn = t.contact_ok === 'Y' && mailOk ? '<tr><td style="padding:0 28px 28px;"><a href="mailto:' + cMail + '?subject=' + encodeURIComponent('Your Northgate job ' + t.job_id) + '" style="display:inline-block;background:#2E4555;color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 22px;border-radius:8px;">Reply to ' + (firstOk ? esc(cFirst) : 'the customer') + '</a></td></tr>' : '';
const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>@media (max-width:620px){.h1{font-size:23px !important;line-height:1.18 !important;}}</style></head><body style="margin:0;padding:0;background:#EEF1F4;">' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EEF1F4;"><tr><td align="center" style="padding:24px 12px;">' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#FFFFFF;border-radius:6px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#1C2023;">' +
  '<tr><td style="padding:20px 28px;background:#263845;border-bottom:3px solid #D4B26A;"><span style="font-size:17px;font-weight:bold;color:#FFFFFF;">NORTHGATE</span> <span style="font-size:11px;letter-spacing:0.5px;color:#C9D4DD;">CASE ALERT</span></td></tr>' +
  '<tr><td style="padding:28px 28px 8px;">' +
  '<span style="display:inline-block;background:' + (urgent ? '#1C2023' : '#E4EAF0') + ';color:' + (urgent ? '#D4B26A' : '#2E4555') + ';font-size:12px;font-weight:bold;letter-spacing:1.2px;padding:6px 10px;border-radius:4px;">' + (urgent ? 'URGENT &middot; REPLY WITHIN 1 DAY' : 'NORMAL &middot; REPLY WITHIN 3 DAYS') + '</span>' +
  '<div class="h1" style="font-size:30px;font-weight:bold;line-height:1.1;letter-spacing:-0.5px;padding-top:16px;">' + esc(summary) + '</div></td></tr>' +
  '<tr><td style="padding:16px 28px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' +
  row('Case', esc(t.case_id)) + row('Job', esc(t.job_id)) + (who ? row('Customer', who) : '') + row('Category', esc(lab(t.category))) + row('Reply by', esc(when(t.due_at))) +
  row('Wants a reply', t.contact_ok === 'Y' ? 'Yes' : 'No') + (t.keyword_hits ? row('Matched words', esc(t.keyword_hits)) : '') + (t.flags ? row('Check by hand', esc(t.flags)) : '') +
  '</table></td></tr>' +
  '<tr><td style="padding:12px 28px 28px;"><div style="font-size:12px;font-weight:bold;letter-spacing:1.2px;color:#2E4555;padding-bottom:8px;">CUSTOMER WROTE</div>' +
  '<div style="background:#EEF1F4;border-radius:6px;padding:14px 16px;font-size:15px;line-height:1.55;white-space:pre-wrap;word-break:break-word;">' + (t.message ? esc(t.message) : '<i>(left blank)</i>') + '</div></td></tr>' + replyBtn +
  '<tr><td style="padding:16px 28px;background:#EEF1F4;font-size:12px;color:#5B6670;">Update this case in the Cases tab: set status to contacted or resolved. Summary written by ' + (aiOk ? 'AI from the message; check the original above.' : 'rules (first words of the message).') + '</td></tr>' +
  '</table></td></tr></table></body></html>';
if (t.alert_held) t.flags = (t.flags ? t.flags + '; ' : '') + 'alert held: too many alerts, see morning check';
return [{ json: { ...t, summary, classified_by: aiOk ? 'rules+ai' : 'rules', is_urgent: urgent,
  subject: (urgent ? '[Urgent] ' : '') + 'New case ' + t.case_id + ' - ' + lab(t.category) + ' - ' + t.job_id, html } }];
