import fs from 'node:fs';
import path from 'node:path';
import {execSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'out','venues','CUCEA-21SEP2026-VenueLoop-DEMO.mp4');
fs.mkdirSync(path.dirname(out),{recursive:true});
execSync(`npx remotion render src/index.ts ForoDyT-VenueLoop "${out}" --codec=h264 --crf=18 --overwrite`,{cwd:root,stdio:'inherit',shell:'cmd.exe'});
console.log(out);
