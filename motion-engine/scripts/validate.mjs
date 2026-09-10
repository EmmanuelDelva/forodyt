import fs from 'node:fs';
import path from 'node:path';
import {execSync} from 'node:child_process';

const root=path.resolve(import.meta.dirname,'..');
const hard=[]; const warnings=[]; const fonts=[];
const sessions=JSON.parse(fs.readFileSync(path.join(root,'src/data/sessions-IV-2026.json'),'utf8'));
const required=['id','edition','venue','date','startTime','endTime','sessionType','sessionLabel','title','speakers','state'];
const forbidden=/POR CONFIRMAR|PLACEHOLDER|TBD|LOREM IPSUM/i;

try{execSync('npx tsc --noEmit',{cwd:root,stdio:'pipe',shell:'cmd.exe'});}catch(e){hard.push(`TypeScript: ${e.stdout?.toString()||e.message}`);}
for(const s of sessions){
  for(const key of required){if(s[key]===undefined||s[key]===null||s[key]==='')hard.push(`${s.id||'unknown'} missing ${key}`);}
  if(forbidden.test(JSON.stringify(s)))hard.push(`${s.id} contains provisional/placeholder data`);
  if(s.nextSession&&(!s.nextSession.title||!s.nextSession.startTime||!s.nextSession.sessionLabel))hard.push(`${s.id} has incomplete nextSession`);
  if(s.title.length>155)warnings.push(`${s.id} title length ${s.title.length}>155`);
  for(const sp of s.speakers||[]){const meta=[sp.name,sp.role,sp.institution,sp.country].filter(Boolean).join(' · ');if(meta.length>230)warnings.push(`${s.id} speaker metadata ${meta.length}>230`);}
}
const fontFiles=['Fraunces.ttf','Fraunces-Italic.ttf','Inter.ttf','JetBrainsMono.ttf'];
for(const file of fontFiles){
  const p=path.join(root,'public/fonts',file);
  if(!fs.existsSync(p)){hard.push(`Missing canonical font ${file}`);continue;}
  const size=fs.statSync(p).size; fonts.push({file,size});
  if(size<100000)hard.push(`Font ${file} suspicious size ${size}`);
}
const source=[];
const walk=(dir)=>{for(const name of fs.readdirSync(dir)){const p=path.join(dir,name);const st=fs.statSync(p);if(st.isDirectory())walk(p);else if(/\.(tsx|ts)$/.test(name))source.push(p);}};
walk(path.join(root,'src'));
for(const p of source){const txt=fs.readFileSync(p,'utf8');if(/\btransition\s*:|\banimation\s*:/i.test(txt))hard.push(`Forbidden CSS transition/animation in ${path.relative(root,p)}`);}
const report={timestamp:new Date().toISOString(),typescript:hard.some(x=>x.startsWith('TypeScript:'))?'FAIL':'PASS',fontPreflight:fonts.length===4?'PASS':'FAIL',dataPreflight:hard.filter(x=>!x.startsWith('TypeScript:')&&!x.startsWith('Missing canonical font')&&!x.startsWith('Font ')&&!x.startsWith('Forbidden CSS')).length?'FAIL':'PASS',motionRules:hard.some(x=>x.startsWith('Forbidden CSS'))?'FAIL':'PASS',fonts,hardIssues:hard,warnings};
fs.mkdirSync(path.join(root,'out/previews'),{recursive:true});
fs.writeFileSync(path.join(root,'out/previews/preflight-report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(hard.length)process.exit(1);
