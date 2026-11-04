// Fair Ask · Northgate sheet formatting ("Ironwork": cool mist ground, iron text, slate headers, brass accents)
// Extensions → Apps Script → paste → Save → run formatFairAsk. Safe to run again: it never edits or deletes data,
// and it replaces only the colour rules and dropdowns it adds itself.

const C = {
  iron: '#1C2023',    // text
  slate: '#44505C',   // header band
  mist: '#EEF1F4',    // banded rows
  line: '#DCE1E6',    // borders
  muted: '#5B6670',
  brass: '#9C7A3C',   // tab accent for Config
};
// Status colours: soft fills, dark text, readable in light mode
const S = {
  urgent: ['#F6E1DE', '#8A2B22'], normal: ['#EEF1F4', '#44505C'],
  open: ['#FBEFD9', '#7A5410'], contacted: ['#E1EAF4', '#24476B'], resolved: ['#E2EFE6', '#1F5A36'],
  wentWell: ['#E2EFE6', '#1F5A36'],
  sent: ['#E2EFE6', '#1F5A36'], skipped: ['#EEF1F4', '#5B6670'], failed: ['#F6E1DE', '#8A2B22'],
};
const TABS = { Jobs: C.slate, Feedback: C.slate, Cases: C.iron, Log: C.muted, Config: C.brass, TestKey: C.muted };
const CATEGORIES = ['went well', 'work quality', 'lateness', 'price/billing', 'communication', 'damage/safety', 'other'];
const HIDE = [];   // add header names here to hide internal columns, e.g. 'classified_by'

function formatFairAsk() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const done = [];
  for (const [name, colour] of Object.entries(TABS)) {
    const sh = ss.getSheetByName(name);
    if (!sh) continue;
    styleTab_(sh, colour);
    done.push(name);
  }
  rules_(ss);
  ss.toast('Formatted: ' + done.join(', '), 'Fair Ask', 6);
}

function styleTab_(sh, colour) {
  const lastCol = Math.max(sh.getLastColumn(), 1), lastRow = Math.max(sh.getLastRow(), 2);
  sh.setTabColor(colour);
  sh.setFrozenRows(1);
  sh.setHiddenGridlines(false);
  const all = sh.getRange(1, 1, lastRow, lastCol);
  all.setFontFamily('Inter').setFontSize(10).setFontColor(C.iron).setVerticalAlignment('middle')
     .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP)
     .setBorder(true, true, true, true, true, true, C.line, SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(1, 1, 1, lastCol).setBackground(colour).setFontColor('#FFFFFF').setFontWeight('bold');
  sh.setRowHeight(1, 30);
  if (lastRow > 1) sh.setRowHeightsForced(2, lastRow - 1, 24);
  // banding (remove our old banding first)
  sh.getBandings().forEach(b => b.remove());
  all.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false)
     .setHeaderRowColor(colour).setFirstRowColor('#FFFFFF').setSecondRowColor(C.mist);
  const head = headers_(sh);
  HIDE.forEach(h => { if (head[h]) sh.hideColumns(head[h]); });
  // widths: long text columns wider, the rest fitted
  for (let c = 1; c <= lastCol; c++) sh.autoResizeColumn(c);
  ['summary', 'message', 'detail', 'skip_reason', 'flags', 'value'].forEach(h => { if (head[h]) sh.setColumnWidth(head[h], 320); });
}

function rules_(ss) {
  const add = (sh, header, map) => {
    const col = headers_(sh)[header];
    if (!col) return [];
    const range = sh.getRange(2, col, Math.max(sh.getMaxRows() - 1, 1), 1);
    return Object.entries(map).map(([text, [bg, fg]]) =>
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(text).setBackground(bg).setFontColor(fg).setBold(true).setRanges([range]).build());
  };
  const cases = ss.getSheetByName('Cases');
  if (cases) {
    cases.setConditionalFormatRules([
      ...add(cases, 'severity', { urgent: S.urgent, normal: S.normal }),
      ...add(cases, 'status', { open: S.open, contacted: S.contacted, resolved: S.resolved }),
      ...add(cases, 'category', { 'went well': S.wentWell }),
    ]);
    dropdown_(cases, 'status', ['open', 'contacted', 'resolved']);
    dropdown_(cases, 'severity', ['urgent', 'normal']);
    dropdown_(cases, 'category', CATEGORIES);
  }
  const jobs = ss.getSheetByName('Jobs');
  if (jobs) jobs.setConditionalFormatRules(add(jobs, 'invite_status', { sent: S.sent, skipped: S.skipped, failed: S.failed }));
  const fb = ss.getSheetByName('Feedback');
  if (fb) fb.setConditionalFormatRules(add(fb, 'category', { 'went well': S.wentWell }));
}

// Dropdowns allow other values with a warning, so n8n's writes are never blocked
function dropdown_(sh, header, list) {
  const col = headers_(sh)[header];
  if (!col) return;
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(true).build();
  sh.getRange(2, col, Math.max(sh.getMaxRows() - 1, 1), 1).setDataValidation(rule);
}

function headers_(sh) {
  const out = {};
  const row = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0];
  row.forEach((h, i) => { const k = String(h).trim().toLowerCase(); if (k) out[k] = i + 1; });
  return out;
}
