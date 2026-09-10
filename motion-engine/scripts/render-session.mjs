import fs from 'node:fs';
import path from 'node:path';
import {execSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'out','sessions','CUCEA-Conferencia-Inaugural-SessionLoop-DEMO.mp4');
fs.mkdirSync(path.dirname(out),{recursive:true});
execSync(`npx remotion render src/index.ts ForoDyT-SessionLoop "${out}" --codec=h264 --crf=18 --overwrite`,{cwd:root,stdio:'inherit',shell:'cmd.exe'});
console.log(out);
