import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import pngToIco from 'png-to-ico';

const root = process.cwd();
const publicDir = path.join(root, 'public');

const inputSvgPath = path.join(publicDir, 'favicon.svg');
const svgBuffer = await readFile(inputSvgPath);
const svg = svgBuffer.toString('utf8');

const out32Path = path.join(publicDir, 'favicon-32.png');
const out180Path = path.join(publicDir, 'apple-touch-icon.png');
const outIcoPath = path.join(publicDir, 'favicon.ico');

const renderPng = (size) => {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size }
  });
  const rendered = resvg.render();
  return Buffer.from(rendered.asPng());
};

// PNG fallbacks
await writeFile(out32Path, renderPng(32));
await writeFile(out180Path, renderPng(180));

// ICO (bundle 16 + 32)
const ico = await pngToIco([renderPng(16), renderPng(32)]);
await writeFile(outIcoPath, ico);

console.log('Generated:', {
  out32Path: path.relative(root, out32Path),
  out180Path: path.relative(root, out180Path),
  outIcoPath: path.relative(root, outIcoPath)
});
