// Feedback form: turns the posted page fields into the shape Triage reads.
const b = $input.first().json.body || {};
const q = $input.first().json.query || {};
const one = v => Array.isArray(v) ? v[0] : v;
const s = (v, max) => String(one(v) == null ? '' : one(v)).slice(0, max);
const CATS = ['It went well', 'Work quality', 'Lateness', 'Price or billing', 'Communication', 'Damage or safety', 'Something else'];
const cat = s(b.category, 40).trim();
const contact = s(b.contact, 2).trim().toUpperCase() === 'N' ? 'N' : 'Y';
const job_id = (s(b.job_id, 40) || s(q.job_id, 40)).trim();
return [{ json: {
  job_id,
  'What is it about?': CATS.includes(cat) ? cat : '',
  'What happened?': s(b.message, 2000),
  'Can we contact you about this?': contact === 'Y' ? 'Yes, contact me' : 'No reply needed',
  mode: 'thanks', contact,
  spam: s(b.website, 200).trim() !== ''
} }];
