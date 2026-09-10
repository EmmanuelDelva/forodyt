import {execSync} from 'node:child_process';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const run=(script)=>execSync(`npm run ${script}`,{cwd:root,stdio:'inherit',shell:'cmd.exe'});

run('validate');
run('render:venue');
run('render:session');
run('render:lower-third');

console.log('ForoDyT demo render set complete.');