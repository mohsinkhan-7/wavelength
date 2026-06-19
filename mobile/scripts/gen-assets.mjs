// Generates the Wavelength app icons & splash from an SVG "equalizer" logo.
//   node scripts/gen-assets.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');

const PURPLE = '#7C5CFF';
const PURPLE_DARK = '#5B3FD6';

// Seven rounded bars forming a symmetric "audio waveform" arch.
const BAR_W = 64;
const GAP = 44;
const HEIGHTS = [180, 320, 470, 580, 470, 320, 180];

function bars(color) {
  const total = HEIGHTS.length * BAR_W + (HEIGHTS.length - 1) * GAP;
  const startX = (1024 - total) / 2;
  const cy = 512;
  return HEIGHTS.map((h, i) => {
    const x = startX + i * (BAR_W + GAP);
    const y = cy - h / 2;
    return `<rect x="${x}" y="${y}" width="${BAR_W}" height="${h}" rx="${BAR_W / 2}" fill="${color}"/>`;
  }).join('');
}

// Full icon: purple gradient background + white waveform.
function iconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${PURPLE}"/>
        <stop offset="1" stop-color="${PURPLE_DARK}"/>
      </linearGradient>
    </defs>
    <rect width="1024" height="1024" fill="url(#g)"/>
    ${bars('#FFFFFF')}
  </svg>`;
}

// Transparent waveform, scaled into the central safe zone (for Android adaptive
// foreground and the splash image).
function glyphSvg(color, scale) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
      ${bars(color)}
    </g>
  </svg>`;
}

async function render(svg, size, outfile) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(ASSETS, outfile));
  console.log('  ✓', outfile, `(${size}×${size})`);
}

console.log('Generating Wavelength assets →', ASSETS);
await render(iconSvg(), 1024, 'icon.png'); // iOS + base icon
await render(glyphSvg('#FFFFFF', 0.6), 1024, 'adaptive-icon.png'); // Android adaptive foreground
await render(glyphSvg('#FFFFFF', 0.7), 1024, 'splash-icon.png'); // splash logo (on dark bg)
await render(iconSvg(), 48, 'favicon.png'); // web favicon
console.log('Done.');
