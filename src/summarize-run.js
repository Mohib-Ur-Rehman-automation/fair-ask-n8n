const rows = $('Update Jobs').all().map(i => i.json);
const count = s => rows.filter(r => String(r.invite_status) === s).length;
const failed = rows.filter(r => String(r.invite_status) === 'failed').map(r => String(r.job_id));
const d = $('Decide invites').all().map(i => i.json).find(x => x.from) || {};
return [{ json: {
  timestamp: DateTime.now().setZone('Asia/Karachi').toFormat('yyyy-MM-dd HH:mm'),
  module: 'M2 invite engine', event: failed.length ? 'run_with_failures' : 'run_ok',
  detail: 'sent ' + count('sent') + ', skipped ' + count('skipped') + ', failed ' + failed.length + (failed.length ? ' (' + failed.join(', ') + ')' : ''),
  failed_count: failed.length, failed_ids: failed.join(', '), from: d.from || ''
} }];
