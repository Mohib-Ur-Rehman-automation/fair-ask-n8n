// Thanks page: the styled thank-you page after a POST. Same markup as Render page, always in thanks mode.
const SRC = { cfg: 'Read Config', jobs: 'Read Jobs', req: 'Feedback form' };
const GATE = '<svg class="gate" viewBox="0 0 200 220" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="10" y1="34" x2="10" y2="214"/><line x1="190" y1="34" x2="190" y2="214"/><circle cx="10" cy="27" r="6"/><circle cx="190" cy="27" r="6"/><path d="M10 70 Q100 0 190 70"/><path d="M10 84 Q100 18 190 84"/><line x1="97" y1="36" x2="97" y2="214"/><line x1="103" y1="36" x2="103" y2="214"/><line x1="10" y1="152" x2="190" y2="152"/><line x1="10" y1="204" x2="190" y2="204"/><line x1="30" y1="56.2" x2="30" y2="214"/><path d="M26 54.2 L30 44.2 L34 54.2"/><line x1="50" y1="45.8" x2="50" y2="214"/><path d="M46 43.8 L50 33.8 L54 43.8"/><line x1="70" y1="38.9" x2="70" y2="214"/><path d="M66 36.9 L70 26.9 L74 36.9"/><line x1="90" y1="35.4" x2="90" y2="214"/><path d="M86 33.4 L90 23.4 L94 33.4"/><line x1="110" y1="35.4" x2="110" y2="214"/><path d="M106 33.4 L110 23.4 L114 33.4"/><line x1="130" y1="38.9" x2="130" y2="214"/><path d="M126 36.9 L130 26.9 L134 36.9"/><line x1="150" y1="45.8" x2="150" y2="214"/><path d="M146 43.8 L150 33.8 L154 43.8"/><line x1="170" y1="56.2" x2="170" y2="214"/><path d="M166 54.2 L170 44.2 L174 54.2"/><circle cx="40" cy="178" r="7"/><circle cx="60" cy="178" r="7"/><circle cx="80" cy="178" r="7"/><circle cx="120" cy="178" r="7"/><circle cx="140" cy="178" r="7"/><circle cx="160" cy="178" r="7"/><line x1="0" y1="214" x2="200" y2="214"/></svg>';
const cfg = Object.create(null);
for (const it of $(SRC.cfg).all()) { const k = String(it.json.key == null ? '' : it.json.key).trim(); if (k) cfg[k] = it.json.value; }
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const tz = 'Asia/Karachi';
const req = $(SRC.req).first().json;
const mode = 'thanks';
const jobId = String(((req.query || {}).job_id) || req.job_id || '').trim().slice(0, 40);
const job = /^NG-[0-9]{4}$/.test(jobId) ? $(SRC.jobs).all().map(i => i.json).find(j => String(j.job_id).trim() === jobId) : null;
const svcOk = new Set(['plumbing', 'electrical', 'heating']);
const svc = job && svcOk.has(String(job.service_type).trim().toLowerCase()) ? String(job.service_type).trim() : '';
let done = '';
if (job) { const v = job.completed_date; const d = typeof v === 'number' ? DateTime.fromISO('1899-12-30', { zone: tz }).plus({ days: v }) : DateTime.fromISO(String(v).trim(), { zone: tz }); if (d.isValid) done = d.toFormat('d LLL yyyy'); }
const urlOk = u => /^https?:[/][/][^\s"'<>]+$/i.test(String(u || '').trim());
const action = urlOk(req.webhookUrl) ? String(req.webhookUrl).trim() : (urlOk(cfg.feedback_form_url) ? String(cfg.feedback_form_url).trim().split('?')[0] : '');
const review = /^https?:[/][/][^\s"'<>]+$/i.test(String(cfg.public_review_url || '').trim()) ? String(cfg.public_review_url).trim() : '#';
const facts = job
  ? '<dl class="facts"><div><dt>Job</dt><dd>' + esc(jobId) + '</dd></div>' + (svc ? '<div><dt>Service</dt><dd>' + esc(svc) + '</dd></div>' : '') + (done ? '<div><dt>Completed</dt><dd>' + esc(done) + '</dd></div>' : '') + '</dl>'
  : '<p class="nomatch">We could not match this link to a job. You can still send your note and we will find it.</p>';
const mark = '<svg class="mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 21V10a9 9 0 0 1 18 0v11"/><path d="M12 3v18M7.5 6.5V21M16.5 6.5V21M3 21h18"/></svg>';
const cats = ['It went well', 'Work quality', 'Lateness', 'Price or billing', 'Communication', 'Damage or safety', 'Something else'];
const css = `
@import url('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@700;800&family=Public+Sans:wght@400;500;600&display=swap');
:root{--bg:#EEF1F4;--card:#FFFFFF;--ink:#1C2023;--muted:#5B6670;--line:#DCE1E6;--btn:#2E4555;--btntx:#FFFFFF;--soft:#E4EAF0;--num:#2E4555;--panel:#263845;--panelTx:#FFFFFF;--panelSub:#C9D4DD;--brass:#D4B26A}
:root[data-theme=dark]{--bg:#15191C;--card:#1D2226;--ink:#E8ECEF;--muted:#A3ACB5;--line:#2E353A;--btn:#A9C0D0;--btntx:#15191C;--soft:#232A30;--num:#D2B06A}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#15191C;--card:#1D2226;--ink:#E8ECEF;--muted:#A3ACB5;--line:#2E353A;--btn:#A9C0D0;--btntx:#15191C;--soft:#232A30;--num:#D2B06A}}
*{box-sizing:border-box}html,body{margin:0;height:100%}
body{font-family:'Public Sans',Arial,sans-serif;background:var(--bg);color:var(--ink);font-size:16px;line-height:1.5}
.wrap{display:grid;grid-template-columns:minmax(320px,5fr) 7fr;min-height:100vh}
aside{position:relative;overflow:hidden;background:var(--panel);color:var(--panelTx);padding:40px 48px;display:flex;flex-direction:column;justify-content:space-between;gap:40px}
.brand{display:flex;align-items:center;gap:10px;position:relative;z-index:1}
.brand b{font-family:'Schibsted Grotesk',Arial,sans-serif;font-weight:800;font-size:19px;letter-spacing:-.02em}
.brand span{font-size:12px;letter-spacing:.04em;color:var(--panelSub)}
.mark{width:22px;height:22px;color:var(--panelTx)}
.gate{position:absolute;right:-40px;top:96px;width:300px;color:var(--brass);opacity:.22;-webkit-mask-image:linear-gradient(90deg,transparent 0,transparent 38%,#000 78%);mask-image:linear-gradient(90deg,transparent 0,transparent 38%,#000 78%)}
.intro{position:relative;z-index:1;display:flex;flex-direction:column;gap:22px}
.kicker{font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--brass)}
h1{margin:0;font-family:'Schibsted Grotesk',Arial,sans-serif;font-weight:800;font-size:64px;line-height:.98;letter-spacing:-.035em}
.intro p{margin:0;font-size:17px;color:var(--panelSub);max-width:380px}
.facts{position:relative;z-index:1;margin:0}
.facts div{display:flex;justify-content:space-between;padding:12px 0;border-top:1px solid rgba(255,255,255,.2);font-size:15px}
.facts dt{color:var(--panelSub)}.facts dd{margin:0;font-weight:600}
.nomatch{position:relative;z-index:1;margin:0;font-size:14px;color:var(--panelSub);border-top:1px solid rgba(255,255,255,.2);padding-top:12px}
main{padding:40px 64px;display:flex;flex-direction:column;gap:28px}
.top{display:flex;justify-content:flex-end}
.toggle{width:44px;height:44px;border-radius:8px;border:1px solid var(--line);background:transparent;color:var(--ink);display:flex;align-items:center;justify-content:center;cursor:pointer}
.toggle svg{width:20px;height:20px}
form{max-width:560px;display:flex;flex-direction:column;gap:30px}
fieldset{border:0;margin:0;padding:0;min-width:0}
.step{display:flex;align-items:baseline;gap:12px;margin-bottom:14px;font-family:'Schibsted Grotesk',Arial,sans-serif;font-weight:700;font-size:19px;padding:0}
.step i{font-style:normal;font-size:14px;color:var(--num)}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{position:relative}
.chip input,.seg input{position:absolute;opacity:0;width:1px;height:1px}
.chip span{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:999px;border:1.5px solid var(--line);font-size:15px;font-weight:500;cursor:pointer;background:var(--card)}
.chip input:checked+span{border-color:var(--btn);background:var(--btn);color:var(--btntx);font-weight:600}
.chip input:focus-visible+span,.seg input:focus-visible+span{outline:2px solid var(--btn);outline-offset:2px}
textarea{width:100%;min-height:150px;padding:14px;border:1.5px solid var(--line);border-radius:8px;background:var(--card);color:var(--ink);font:inherit;resize:vertical}
textarea:focus{outline:2px solid var(--btn);outline-offset:1px}
.seg{display:flex;gap:4px;padding:4px;border-radius:9px;background:var(--soft);max-width:420px}
.seg label{flex:1;position:relative}
.seg span{display:flex;align-items:center;justify-content:center;min-height:46px;border-radius:6px;font-size:15px;cursor:pointer}
.seg input:checked+span{background:var(--btn);color:var(--btntx);font-weight:600}
.hint{margin:10px 0 0;font-size:14px;color:var(--muted)}
.step small{font-family:'Public Sans',Arial,sans-serif;font-weight:400;font-size:14px;color:var(--muted)}
.public{margin:0;padding:14px 16px;border:1px solid var(--line);border-radius:8px;background:var(--card);font-size:15px}
.public a{color:var(--ink);font-weight:600;white-space:nowrap}
.send{display:flex;flex-direction:column;gap:14px;padding-top:6px;border-top:1px solid var(--line)}
button.go{min-height:52px;margin-top:16px;border:0;border-radius:8px;background:var(--btn);color:var(--btntx);font:inherit;font-weight:600;font-size:16px;cursor:pointer}
.hp{position:absolute;left:-9999px}
.thanks{max-width:520px;display:flex;flex-direction:column;gap:16px;padding-top:40px}
.thanks h2{margin:0;font-family:'Schibsted Grotesk',Arial,sans-serif;font-weight:800;font-size:44px;line-height:1.02;letter-spacing:-.03em}
.thanks p{margin:0;font-size:17px;color:var(--muted)}
@media (max-width:860px){
 .wrap{grid-template-columns:1fr}
 aside{padding:20px 20px 24px;gap:20px}
 .gate{width:150px;right:-20px;top:40px;opacity:.14}
 h1{font-size:38px;line-height:1}
 .intro{gap:12px}.intro p{font-size:15px}
 main{padding:20px}
 .top{position:absolute;top:14px;right:16px}
 .toggle{border-color:rgba(255,255,255,.3);color:#FFFFFF}
 .thanks h2{font-size:34px}
}
@media (max-width:350px){.brand span{display:none}}`;
const sun = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const js = "(function(){var r=document.documentElement;try{var s=localStorage.getItem('ng-theme');if(s)r.setAttribute('data-theme',s);}catch(e){}var b=document.getElementById('theme');if(b)b.addEventListener('click',function(){var dark=r.getAttribute('data-theme')==='dark'||(!r.getAttribute('data-theme')&&window.matchMedia('(prefers-color-scheme: dark)').matches);var n=dark?'light':'dark';r.setAttribute('data-theme',n);b.setAttribute('aria-label','Switch to '+(n==='dark'?'light':'dark')+' mode');try{localStorage.setItem('ng-theme',n);}catch(e){}});})();";
const panel = (title, sub, extra) => '<aside>' + GATE + '<div class="brand">' + mark + '<b>NORTHGATE</b><span>HOME SERVICES</span></div>' +
  '<div class="intro"><div class="kicker">Private feedback</div><h1>' + title + '</h1><p>' + sub + '</p></div>' + extra + '</aside>';
const top = '<div class="top"><button type="button" class="toggle" id="theme" aria-label="Switch theme">' + sun + '</button></div>';
let body;
if (mode === 'thanks') {
  const kw = String(cfg.urgent_keywords || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  const low = String(req['What happened?'] || '').toLowerCase();
  const safety = String(req['What is it about?'] || '') === 'Damage or safety' || kw.some(k => new RegExp('(^|[^a-z])' + k.replace(/[.*+?^${}()|[\]]/g, '') + '([^a-z]|$)').test(low));
  const reply = req.contact === 'Y'
    ? '<h2>Expect a reply within ' + (safety ? '1 day' : '3 days') + '.</h2><p>' + (safety ? 'Safety issues go to the front of the queue. ' : '') + 'It will come from Northgate, to the email on your job.</p>'
    : '<h2>No reply, as you asked.</h2><p>We read every note. Thank you for taking the time.</p>';
  body = panel('Thank you.', 'Your note is with our team. It is not posted anywhere public.', facts) +
    '<main>' + top + '<div class="thanks">' + reply + '<p>You can close this page.</p></div></main>';
} else {
  body = panel('Tell us what happened.', 'This goes to our team, never to a public site. If you want a reply, you will get one within 3 days, or 1 day for damage or safety.', facts) +
    '<main>' + top + '<form method="post" action="' + esc(action) + '">' +
    '<input type="hidden" name="job_id" value="' + esc(jobId) + '">' +
    '<p class="public">Rather post a public review? <a href="' + esc(review) + '">Post one on Google &rarr;</a></p>' +
    '<div class="hp" aria-hidden="true"><label>Leave this empty <input name="website" tabindex="-1" autocomplete="off"></label></div>' +
    '<fieldset><legend class="step"><i>01</i> What is it about?</legend><div class="chips">' +
      cats.map((c, i) => '<label class="chip"><input type="radio" name="category" value="' + esc(c) + '"' + (i === 0 ? ' required' : '') + '><span>' + esc(c) + '</span></label>').join('') + '</div></fieldset>' +
    '<div><label class="step" for="msg"><i>02</i> In your words <small>(optional)</small></label><textarea id="msg" name="message" maxlength="2000" placeholder="What went well, what did not, anything we should fix"></textarea></div>' +
    '<fieldset><legend class="step"><i>03</i> Can we contact you?</legend><div class="seg">' +
      '<label><input type="radio" name="contact" value="Y" checked><span>Yes, contact me</span></label>' +
      '<label><input type="radio" name="contact" value="N"><span>No reply needed</span></label></div><p class="hint">We reply to the email on your job.</p></fieldset>' +
    '<div class="send"><button class="go" type="submit">Send to Northgate</button></div>' +
    '</form></main>';
}
const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">' +
  '<title>' + (mode === 'thanks' ? 'Thank you' : 'Private feedback') + ' | Northgate Home Services</title><style>' + css + '</style></head><body><div class="wrap">' + body + '</div><script>' + js + '</script></body></html>';
return [{ json: { html } }];
