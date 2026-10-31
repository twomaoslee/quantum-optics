const {build}=require('esbuild');
const fs=require('node:fs'),path=require('node:path');
const out=path.resolve(__dirname,'../../classroom/vendor');fs.mkdirSync(out,{recursive:true});
(async()=>{
 await build({stdin:{contents:"import cloudbase from '@cloudbase/js-sdk';window.QOCloudbase=cloudbase;",resolveDir:path.resolve(__dirname,'..')},bundle:true,minify:true,outfile:path.join(out,'cloudbase.js'),platform:'browser',legalComments:'eof'});
 await build({stdin:{contents:"import QRCode from 'qrcode';window.QOQRCode=QRCode;",resolveDir:path.resolve(__dirname,'..')},bundle:true,minify:true,outfile:path.join(out,'qrcode.js'),platform:'browser',legalComments:'eof'});
 for(const [name,file] of [['@cloudbase/js-sdk','cloudbase-LICENSE'],['qrcode','qrcode-LICENSE']]){
  const root=path.resolve(__dirname,'../node_modules',name);
  const license=['LICENSE','LICENSE.md','LICENSE.txt'].find(n=>fs.existsSync(path.join(root,n)));
  if(!license)throw new Error('License missing: '+name);fs.copyFileSync(path.join(root,license),path.join(out,file));
 }
})();
