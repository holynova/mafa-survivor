import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/assets/mir');
export function runtimeManifest(m){
 const frames=Object.fromEntries(Object.entries(m.frames).map(([id,f])=>[id,Object.fromEntries(['dx','dy','width','height','texture','originX','originY'].map(k=>[k,f[k]]))]));
 return {world:m.world,worlds:m.worlds,pages:m.pages,animations:m.animations,frames,rightsStatus:m.rightsStatus};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const m=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
 fs.writeFileSync(path.join(root,'runtime.json'),JSON.stringify(runtimeManifest(m)));
 console.log('Runtime manifest bytes:',fs.statSync(path.join(root,'runtime.json')).size);
}
