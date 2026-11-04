const {run,cfg,d}=require('./harness');const R=[];
const t=(id,desc,fn)=>{let v;try{v=fn()}catch(e){v='CRASH: '+e.message}R.push([id,desc,v]);};
// M2
const job=(o)=>Object.assign({job_id:'NG-1001',customer_name:'Ann Lee',customer_email:'ann@x.com',service_type:'Plumbing',completed_date:d(3),job_status:'completed',opted_out:'',invited_at:'',invite_status:'',skip_reason:''},o);
const m2=jobs=>run('decide.js',{'Read Config':cfg,'Read Jobs':jobs});
t('A1','M2 service_type "constructor" (built-in name)',()=>{const o=m2([job({service_type:'constructor'})])[0].json;return /function|native code/.test(o.html+o.text)?'BROKE: leaks JS function text into email':'held'});
t('A2','M2 service_type with CRLF header injection',()=>{const o=m2([job({service_type:'plumbing\r\nBcc: evil@x.com'})])[0].json;return /[\r\n]/.test(o.subject)?'BROKE: newline in subject':'held'});
t('A3','M2 email with newline + Bcc',()=>{const o=m2([job({customer_email:'ann@x.com\nBcc: e@x.com'})])[0].json;return o.action==='send'?'BROKE':'held ('+o.skip_reason+')'});
t('A4','M2 5,000 eligible jobs (mail bomb / quota)',()=>{const js=Array.from({length:5000},(_,i)=>job({job_id:'NG-'+(10000+i),customer_email:'c'+i+'@x.com'}));const n=m2(js).filter(o=>o.json.action==='send').length;return n>100?'BROKE: would send '+n+' in one run':'held ('+n+')'});
t('A5','M2 object posing as text in name/email',()=>{const o=m2([job({customer_name:{a:1},customer_email:['ann@x.com']})]);return 'no crash: '+o[0].json.action});
t('A6','M2 review URL is javascript:',()=>{try{run('decide.js',{'Read Config':cfg.map(c=>c.key==='public_review_url'?{key:c.key,value:'javascript:alert(1)'}:c),'Read Jobs':[job({})]});return 'BROKE'}catch(e){return 'held (refused)'}});
t('A7','M2 name "__proto__"',()=>{const o=m2([job({customer_name:'__proto__ x'})])[0].json;return o.html.includes('__proto__,')?'greets as __proto__ (cosmetic)':'held'});
// M3
const form=(o,cases=[])=>({'Read Config':cfg,'Read Jobs':[{job_id:'NG-1001'}],'Read Cases':cases,'Feedback form':[Object.assign({job_id:'NG-1001','What is it about?':'Lateness','What happened?':'late','Can we contact you about this?':'Yes, contact me'},o)]});
const m3=o=>run('triage.js',form(o))[0].json;
t('B1','M3 tampered category "constructor"',()=>{const o=m3({'What is it about?':'constructor'});return typeof o.category!=='string'?'BROKE: category becomes a function':'held ('+o.category+')'});
t('B2','M3 tampered category "__proto__"',()=>{const o=m3({'What is it about?':'__proto__'});return typeof o.category!=='string'||o.category==='[object Object]'?'BROKE':'held ('+o.category+')'});
t('B3','M3 object posing as message',()=>{const o=m3({'What happened?':{x:'<script>'}});return 'no crash: msg="'+o.message+'"'});
t('B4','M3 100 KB message',()=>{const o=m3({'What happened?':'a'.repeat(100000)});return o.message.length<=2000?'held (clamped)':'BROKE'});
t('B5','M3 job_id of another real customer',()=>{const o=m3({job_id:'NG-1001'});return 'accepted (no proof the sender owns the job)'});
t('B6','M3 keyword spaced out "g a s"',()=>{const o=m3({'What happened?':'g a s smell'});return o.severity});

t('B8','M3 regex-hostile keyword in Config "(.*"',()=>{const o=run('triage.js',Object.assign(form({}),{'Read Config':cfg.concat([{key:'urgent_keywords',value:'(.*,[a-'}])}))[0].json;return 'no crash: '+o.severity});
// M4
const cs=o=>Object.assign({case_id:'C-1',job_id:'NG-1',category:'other',severity:'normal',summary:'x',owner:'o@x.com',status:'open',due_at:'2020-01-01 00:00',resolved_at:''},o);
t('C1','M4 owner cell edited to an outside address',()=>{const o=run('find.js',{'Read Config':cfg,'Read Cases':[cs({owner:'attacker@evil.test'})],'Read Log':[]})[0].json;return o.to==='attacker@evil.test'?'BROKE: case details mailed to any address in the cell':'held'});
t('C2','M4 summary with HTML',()=>{const o=run('find.js',{'Read Config':cfg,'Read Cases':[cs({summary:'<img src=x onerror=1>'})],'Read Log':[]})[0].json;return /<img/.test(o.html)?'BROKE':'held'});
t('C3','M4 500 overdue cases',()=>{const o=run('find.js',{'Read Config':cfg,'Read Cases':Array.from({length:500},(_,i)=>cs({case_id:'C-'+i})),'Read Log':[]});return o.length+' email(s), '+Math.round(o[0].json.html.length/1024)+' KB'});
t('C4','M4 due_at garbage',()=>{const o=run('find.js',{'Read Config':cfg,'Read Cases':[cs({due_at:{x:1}})],'Read Log':[]});return 'no crash ('+o.length+')'});
// M5
t('D1','M5 summary with HTML in overdue list',()=>{const o=run('report.js',{'Read Config':cfg,'Read Jobs':[],'Read Cases':[cs({summary:'<script>x</script>'})],'Read Feedback':[]})[0].json;return /<script>x/.test(o.html)?'BROKE':'held'});
t('D2','M5 report_month "2026-13"',()=>{const o=run('report.js',{'Read Config':cfg.concat([{key:'report_month',value:'2026-13'}]),'Read Jobs':[],'Read Cases':[],'Read Feedback':[]})[0].json;return 'period: '+o.period});
for(const r of R)console.log(r.join(' | '));
const {DateTime}=require('./harness');const nowS=DateTime.now().setZone('Asia/Karachi').toFormat('yyyy-MM-dd HH:mm');
const flood=Array.from({length:6},(_,i)=>({case_id:'C'+i,job_id:'NG-1001',severity:'urgent',created_at:nowS}));
const o=run('triage.js',form({'What happened?':'gas leak'},flood))[0].json;
console.log('B7 retest | urgent after 6 urgent this hour | send_alert='+o.send_alert+' flags='+o.flags);
const o2=run('triage.js',form({'What happened?':'gas leak'},[]))[0].json;console.log('B7 normal | first urgent | send_alert='+o2.send_alert);
