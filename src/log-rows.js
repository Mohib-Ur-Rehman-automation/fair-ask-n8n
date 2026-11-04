const out = [];
const ts = DateTime.now().setZone('Asia/Karachi').toFormat('yyyy-MM-dd HH:mm');
$input.all().forEach((it, i) => {
  const src = $('Kind?').itemMatching(i).json;
  const ok = !it.json.error;
  for (const id of String(src.case_ids || '').split(',').filter(Boolean))
    out.push({ json: { timestamp: ts, module: 'M4 reminder', event: ok ? 'reminded' : 'reminder_failed', detail: id } });
});
return out;
