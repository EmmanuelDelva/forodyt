import fs from 'node:fs';
import path from 'node:path';
import {execSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'out','lower-thirds','Miguel-Angel-Gaspar-LowerThird-DEMO.webm');
fs.mkdirSync(path.dirname(out),{recursive:true});
execSync(`npx remotion render src/index.ts ForoDyT-LowerThird "${out}" --codec=vp8 --image-format=png --pixel-format=yuva420p --overwrite`,{cwd:root,stdio:'inherit',shell:'cmd.exe'});
console.log(out);
