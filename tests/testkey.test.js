// Checks Decide invites against the TestKey tab of data/fair-ask-sheet.xlsx (all 40 fake jobs).
const {run,cfg,DateTime}=require('./harness');const XLSX=require('xlsx');const path=require('path');
const wb=XLSX.readFile(path.join(__dirname,'..','data','fair-ask-sheet.xlsx'),{cellFormula:true,sheetStubs:true});
const today=DateTime.now().setZone('Asia/Karachi');
const val=c=>{if(!c)return '';if(c.f&&/^TODAY\(\)-\d+$/.test(c.f))return today.minus({days:Number(c.f.split('-')[1])}).toISODate();return c.v==null?'':c.v;};
const rows=n=>{const ws=wb.Sheets[n];const r=XLSX.utils.decode_range(ws['!ref']);const h=[];for(let c=r.s.c;c<=r.e.c;c++)h.push(ws[XLSX.utils.encode_cell({r:0,c})].v);
 const out=[];for(let i=1;i<=r.e.r;i++){const o={};h.forEach((k,c)=>o[k]=val(ws[XLSX.utils.encode_cell({r:i,c})]));out.push(o);}return out;};
const res=run('decide.js',{'Read Config':cfg,'Read Jobs':rows('Jobs')}).map(o=>o.json);
const got={};for(const o of res)got[o.job_id]=o.action==='send'?'invite':'skip '+o.skip_reason;
let bad=0;for(const k of rows('TestKey')){const g=got[k.job_id]||'no action';if(g!==k.expected){bad++;console.log('MISMATCH',k.job_id,k.expected,'got',g);}}
console.log('TestKey: '+rows('TestKey').length+' jobs, '+bad+' mismatches');process.exit(bad?1:0);
