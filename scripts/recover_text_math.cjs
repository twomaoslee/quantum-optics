// Recover TeX only when re-rendering it reproduces a published MathJax SVG.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dep = process.env.LECTURE06_MATHJAX || path.join(require('os').homedir(), '.cache/quantum-optics/lecture06-tools/node_modules/mathjax-full');
const {mathjax} = require(path.join(dep, 'js/mathjax.js'));
const {TeX} = require(path.join(dep, 'js/input/tex.js'));
const {SVG} = require(path.join(dep, 'js/output/svg.js'));
const {liteAdaptor} = require(path.join(dep, 'js/adaptors/liteAdaptor.js'));
const {RegisterHTMLHandler} = require(path.join(dep, 'js/handlers/html.js'));
const {AllPackages} = require(path.join(dep, 'js/input/tex/AllPackages.js'));
const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const recovered = {};
for (const filename of process.argv.slice(2)) {
  let page = fs.readFileSync(filename, 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  page = page.replace(/<(\/?)(fieldset|legend)(?=[\s>])/gi, (_, close, tag) => '<'+close+'quiz-render-'+tag.toLowerCase());
  const doc = mathjax.document(page, {InputJax:new TeX({packages:AllPackages}), OutputJax:new SVG({fontCache:'local'})});
  doc.render();
  for (const item of doc.math) {
    const svg = adaptor.outerHTML(item.typesetRoot).replace(/MJX-\d+/g, 'MJX-ID');
    const hash = crypto.createHash('sha256').update(svg).digest('hex');
    recovered[hash] = (item.display ? '\\[' : '\\(') + item.math + (item.display ? '\\]' : '\\)');
  }
}
process.stdout.write(JSON.stringify(recovered));
