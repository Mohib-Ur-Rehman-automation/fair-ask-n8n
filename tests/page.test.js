// Checks the custom feedback page (Render page, Feedback form, Thanks page) and that its output feeds Triage.
const { run, cfg, d } = require('./harness');
let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.log('FAIL', m); } };
const jobs = [{ job_id: 'NG-1003', service_type: 'Heating', completed_date: d(3) }, { job_id: 'NG-1004', service_type: '<b>Evil</b>', completed_date: 'nope' }];
const page = (req, conf = cfg) => run('render-page.js', { 'Page config': conf, 'Page jobs': jobs, 'Page request': [req] })[0].json.html;
const form = body => run('feedback-form.js', {}, { $input: { first: () => ({ json: { body, query: {} } }) } })[0].json;

// page
let h = page({ query: { job_id: 'NG-1003' } });
ok(h.includes('<dd>NG-1003</dd>') && h.includes('<dd>Heating</dd>'), 'job facts shown');
ok(/<form method="post" action="http:\/\/localhost:5678\/webhook\/northgate-feedback">/.test(h), 'absolute form action from Config');
ok(page({ query: {}, webhookUrl: 'https://n8n.example.com/webhook/northgate-feedback' }).includes('action="https://n8n.example.com/webhook/northgate-feedback"'), 'webhookUrl wins');
h = page({ query: { job_id: '"><script>alert(1)</script>' } });
ok(!h.includes('<script>alert') && h.includes('could not match'), 'hostile job_id escaped, shown as unmatched');
ok(!page({ query: { job_id: 'NG-1004' } }).includes('Evil'), 'unknown service type hidden');
h = page({ query: {} }, cfg.map(c => c.key === 'public_review_url' ? { key: c.key, value: 'javascript:alert(1)' } : c));
ok(h.includes('href="#"') && !h.includes('javascript:alert'), 'bad review link replaced');
ok(page({ query: {} }, [{ key: 'feedback_form_url', value: 'javascript:x' }]).includes('action=""'), 'bad form url dropped');
ok(page({ query: {} }, []).includes('Tell us what happened.'), 'page still renders with no Config');
ok((h.match(/<script>/g) || []).length === 1, 'only the theme script');

// form normaliser
let f = form({ job_id: 'NG-1003', category: 'Lateness', message: 'late', contact: 'N', website: '' });
ok(f['What is it about?'] === 'Lateness' && f['Can we contact you about this?'] === 'No reply needed' && !f.spam, 'fields mapped');
ok(form({ website: 'x' }).spam === true, 'honeypot caught');
ok(form({ category: 'Made up' })['What is it about?'] === '', 'unknown category dropped');
ok(form({ category: ['Lateness', 'x'], message: ['a', 'b'] })['What happened?'] === 'a', 'repeated fields: first only');
ok(form({ message: 'x'.repeat(9000) })['What happened?'].length === 2000, 'message capped');
ok(form({ contact: 'maybe' }).contact === 'Y', 'contact defaults to yes');
ok(form(undefined)['What is it about?'] === '', 'empty post survives');

// thanks page + triage on the same item
f = form({ job_id: 'NG-1003', category: 'Damage or safety', message: 'gas smell', contact: 'Y' });
const t = run('thanks-page.js', { 'Read Config': cfg, 'Read Jobs': jobs, 'Feedback form': [f] })[0].json.html;
ok(t.includes('Thank you.') && t.includes('within 1 day') && !t.includes('<form'), 'thanks page: safety note promises 1 day, no form');
const t3 = run('thanks-page.js', { 'Read Config': cfg, 'Read Jobs': jobs, 'Feedback form': [form({ job_id: 'NG-1003', category: 'Lateness', contact: 'Y' })] })[0].json.html;
ok(t3.includes('within 3 days') && !t3.includes('1 day'), 'thanks page: normal note promises 3 days');
const tn = run('thanks-page.js', { 'Read Config': cfg, 'Read Jobs': jobs, 'Feedback form': [form({ job_id: 'NG-1003', category: 'Damage or safety', contact: 'N' })] })[0].json.html;
const tk = run('thanks-page.js', { 'Read Config': cfg, 'Read Jobs': jobs, 'Feedback form': [form({ job_id: 'NG-1003', category: 'Work quality', message: 'there is a gas smell', contact: 'Y' })] })[0].json.html;
ok(tk.includes('within 1 day'), 'thanks page: urgent keyword promises 1 day, same as Triage');
ok(tn.includes('No reply, as you asked') && !tn.includes('Expect a reply'), 'thanks page: no-reply note promises nothing');
const gw = form({ job_id: 'NG-1003', category: 'It went well', message: 'great job', contact: 'N' });
const tg = run('triage.js', { 'Read Config': cfg, 'Read Jobs': jobs, 'Read Cases': [], 'Feedback form': [gw] })[0].json;
ok(gw['What is it about?'] === 'It went well' && tg.category === 'went well' && tg.severity === 'normal' && !tg.flags.includes('no category'), 'It went well chip reaches Triage');
ok(page({ query: { job_id: 'NG-1003' } }).indexOf('Post one on Google') < page({ query: { job_id: 'NG-1003' } }).indexOf('<i>01</i>'), 'public review link sits above Q01 (R2)');
const tr = run('triage.js', { 'Read Config': cfg, 'Read Jobs': jobs, 'Read Cases': [], 'Feedback form': [f] })[0].json;
ok(tr.category === 'damage/safety' && tr.severity === 'urgent' && tr.contact_ok === 'Y' && tr.job_id === 'NG-1003', 'Triage reads the page post');

console.log(`page: ${n - fail}/${n} passed`);
process.exit(fail ? 1 : 0);
