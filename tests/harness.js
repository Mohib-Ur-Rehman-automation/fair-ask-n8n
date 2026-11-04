const {DateTime}=require('luxon');const fs=require('fs');
const load=f=>fs.readFileSync(require('path').join(__dirname,'..','src',f),'utf8');
const run=(f,data,extra={})=>new Function('$','DateTime','$input',load(f))(n=>({all:()=>(data[n]||[]).map(j=>({json:j})),first:()=>({json:(data[n]||[{}])[0]})}),DateTime,extra.$input||{first:()=>({json:{}})});
const today=DateTime.now().setZone('Asia/Karachi');const d=n=>today.minus({days:n}).toISODate();
const cfg=[{key:'public_review_url',value:'https://g.page/r/X/review'},{key:'feedback_form_url',value:'http://localhost:5678/webhook/northgate-feedback'},{key:'from_email',value:'f@x.com'},{key:'alert_email',value:'a@x.com'},{key:'urgent_keywords',value:'gas,leak,fire'},{key:'owner:other',value:'o@x.com'},{key:'owner:work quality',value:'q@x.com'}];
module.exports={run,cfg,d,DateTime};
