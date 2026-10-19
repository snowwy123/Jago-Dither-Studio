// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Cameron Jago Lis Illustrates.
const fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm');
const dir = __dirname,
  root = path.dirname(dir),
  read = (name) => fs.readFileSync(path.join(dir, name), 'utf8');
let html = read('shell.html');
for (const [marker, content] of [
  ['STYLE', read('style.css')],
  ['MEDIA',read('Vendor/mediabunny.min.js')],
  ['MOTION_MODEL',read('motion-model.cjs')],
  ['ENGINE', read('riso.js')+'\n'+read('engine.js')],
  [
    'DEMOS',
    'const starterArt = ' +
      JSON.stringify(JSON.parse(read('starter-art.json'))) +
      ';\n' +
      read('studies.js')
  ],
  ['CODECS', read('codecs.js')],
  [
    'APP',
    'const engineSource = ' +
      JSON.stringify(read('riso.js')+'\n'+read('engine.js')) +
      ';\n' +
      read('app.js') +
      '\n' +
      read('workspace.js') +
      '\n' +
      read('overlays.js') +
      '\n' +
      read('alignment.js') +
      '\n' +
      read('features.js') + '\n' + read('suite-bridge.js') + '\n' + read('suite-adapter.js') + '\n' + read('suite-round.js')+'\n'+read('print-bench.js')+'\n'+read('explore.js')+'\n'+read('motion-workshop.js')+'\n'+read('directions.js')
  ]
]) {
  const slot = '/* ' + marker + ' */';
  if (html.split(slot).length !== 2) throw Error('Missing or repeated slot: ' + marker);
  html = html.replace(slot, () => content);
}
for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/g))
  new vm.Script(match[1]);
for (const name of ['index.html', 'Jago-Dither-Studio.html'])
  fs.writeFileSync(path.join(root, name), html);
console.log('Built browser and offline app.');

