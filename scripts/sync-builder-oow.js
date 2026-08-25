const fs = require('fs');
const path = require('path');

const srcPath = path.resolve(__dirname, '../datamine/oow/index.html');
const destPath = path.resolve(__dirname, '../datamine-builder/oow/index.html');

let html = fs.readFileSync(srcPath, 'utf8');

// 1. Add base href and robots meta
html = html.replace('<head>', '<head>\n<base href="../../datamine/oow/">\n<meta name="robots" content="noindex, nofollow">');

// 2. Update title & add builder.css
html = html.replace(
  '<title>TOF Origin of War Datamine</title>',
  '<title>OOW Image Binder — Builder</title>\n<!-- Builder-only styles (root-absolute so <base> does not rewrite them). -->\n<link rel="stylesheet" href="/datamine-builder/oow/styles/builder.css">'
);

// 3. Add builder scripts at the bottom before </body>
const builderScripts = '<!-- Builder image-binder tool (root-absolute so <base> does not rewrite them). -->\n<script src="/datamine-builder/oow/js/jszip.min.js"></script>\n<script src="/datamine-builder/oow/js/image-binder.js"></script>\n</body>';
html = html.replace('</body>', builderScripts);

fs.writeFileSync(destPath, html, 'utf8');
console.log('Successfully synced datamine-builder/oow/index.html from datamine/oow/index.html! Lines:', html.split('\n').length);
