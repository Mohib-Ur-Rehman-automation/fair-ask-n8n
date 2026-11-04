const {run,cfg,d,DateTime}=require('./harness');
let seed=12345;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;const pick=a=>a[Math.floor(rnd()*a.length)];
const MARK='<x-fz>';
const pool=()=>pick([MARK+'"\'&',' ','','\r\nBcc: e@x.com','constructor','__proto__','toString','hasOwnProperty',null,undefined,0,-1,1e309,NaN,true,{a:MARK},[MARK],'a'.repeat(5000),'Ünïcödé 😀 '+MARK,'=HYPERLINK("http://x")','plumbing','Heating','completed','COMPLETED','Y','y',d(3),d(-2),d(20),'2026-02-30','x@y.co','  X@Y.CO ','bad@','NG-1001','NG-9999','2026-11-01 10:00','gas leak fire']);
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
let fails={},runs=0;const fail=(k,info)=>{fails[k]=(fails[k]||0)+1;if(fails[k]===1)console.log('FAIL',k,JSON.stringify(info).slice(0,200));};
const N=Number(process.argv[2]||2000);
for(let i=0;i<N;i++){runs++;
 // M2
 const jobs=Array.from({length:1+Math.floor(rnd()*8)},()=>({job_id:pick(['NG-'+(1000+Math.floor(rnd()*20)),pool()]),customer_name:pool(),customer_email:pick([pool(),'c'+Math.floor(rnd()*5)+'@x.com']),service_type:pool(),completed_date:pick([d(Math.floor(rnd()*20)),pool()]),job_status:pick(['completed',pool()]),opted_out:pool(),invited_at:pick(['','',pool()]),invite_status:pick(['','sent',pool()]),skip_reason:pool()}));
 let out;try{out=run('decide.js',{'Read Config':cfg,'Read Jobs':jobs}).map(o=>o.json)}catch(e){fail('M2 crash',e.message);continue}
 const sends=out.filter(o=>o.action==='send');const em=new Set();
 for(const s of sends){
  if(!s.has_public_link)fail('R4 public link missing',s.job_id);
  if((s.html.match(/Post a public review/g)||[]).length!==1||(s.html.match(/Send private feedback/g)||[]).length!==1)fail('R2 buttons not equal',s.job_id);
  if(s.html.includes(MARK)||s.html.includes('<script'))fail('M2 unescaped input in html',s.job_id);
  if(/[\r\n]/.test(s.subject))fail('M2 newline in subject',s.subject);
  {const tx=s.subject+s.html.replace(/<[^>]+>/g,'');const m=tx.match(/function \w*\(|native code|undefined|\[object/);if(m)fail('M2 junk text in email',m[0]);}
  if(!EMAIL_RE.test(s.to))fail('M2 invalid recipient',s.to);
  if(em.has(s.to))fail('M2 duplicate recipient in one run',s.to);em.add(s.to);}
 if(sends.length>40)fail('M2 over cap',sends.length);
 // M3
 const f={job_id:pool(),'What is it about?':pick(['Lateness','Damage or safety',pool()]),'What happened?':pool(),'Can we contact you about this?':pool()};
 const cases=Array.from({length:Math.floor(rnd()*4)},()=>({job_id:pool(),severity:pick(['urgent',pool()]),created_at:pick([DateTime.now().setZone('Asia/Karachi').toFormat('yyyy-MM-dd HH:mm'),pool()])}));
 let t;try{t=run('triage.js',{'Read Config':cfg,'Read Jobs':[{job_id:'NG-1001'},{job_id:pool()}],'Read Cases':cases,'Feedback form':[f]})[0].json}catch(e){fail('M3 triage crash',e.message);continue}
 if(!['went well','work quality','lateness','price/billing','communication','damage/safety','other'].includes(t.category))fail('M3 bad category',t.category);
 if(!['urgent','normal'].includes(t.severity))fail('M3 bad severity',t.severity);
 if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(t.due_at))fail('M3 bad due_at',t.due_at);
 if(t.job_id!=='UNKNOWN'&&!/^NG-\d{4}$/.test(t.job_id))fail('M3 bad job_id stored',t.job_id);
 let fz;try{fz=run('finalize.js',{'Triage':[t]},{$input:{first:()=>({json:pick([{},{choices:[{message:{content:pool()}}]},{error:'x'}])})}})[0].json}catch(e){fail('M3 finalize crash',e.message);continue}
 if(fz.html.includes(MARK)||/<script|<img/.test(fz.html))fail('M3 unescaped in alert',fz.case_id);
 if(/[\r\n]/.test(fz.subject))fail('M3 newline in subject',fz.subject);
 if(fz.classified_by==='rules+ai'&&fz.summary.includes('<'))fail('M3 AI summary with markup accepted',fz.summary);
 // M4
 const cs=Array.from({length:1+Math.floor(rnd()*5)},(_,k)=>({case_id:pick(['C-'+k,pool()]),job_id:pool(),category:pool(),severity:pick(['urgent','normal',pool()]),summary:pool(),owner:pick(['o@x.com','evil@x.com',pool()]),status:pick(['open','resolved',pool()]),due_at:pick(['2020-01-01 00:00',pool()]),resolved_at:pool()}));
 let m4;try{m4=run('find.js',{'Read Config':cfg,'Read Cases':cs,'Read Log':[{module:'M4 reminder',event:'reminded',timestamp:pool(),detail:pool()}]}).map(o=>o.json)}catch(e){fail('M4 crash',e.message);continue}
 for(const o of m4.filter(o=>o.kind==='digest')){if(!['o@x.com','q@x.com','a@x.com'].includes(o.to))fail('M4 mail to non-owner',o.to);if(o.html.includes(MARK))fail('M4 unescaped',o.to);}
 // M5
 try{const r=run('report.js',{'Read Config':cfg.concat([{key:'report_month',value:pool()}]),'Read Jobs':jobs,'Read Cases':cs,'Read Feedback':[{timestamp:pool()}]})[0].json;if(r.html.includes(MARK))fail('M5 unescaped','');if(/Invalid/.test(r.html))fail('M5 junk in report',r.period);}catch(e){fail('M5 crash',e.message)}
}
console.log('runs',runs,'failures',JSON.stringify(fails));
