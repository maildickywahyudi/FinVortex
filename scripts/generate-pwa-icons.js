const fs = require('fs');
const path = require('path');

// Ensure public directory exists
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate an SVG for the PWA icon
function createSvgIcon(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="50%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#0d9488"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="url(#bg)"/>
  <!-- Circle backdrop -->
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.35}" fill="#ffffff" opacity="0.15"/>
  <g transform="translate(${size*0.2}, ${size*0.2}) scale(${size/100})">
    <!-- Shield / KSP Logo icon -->
    <path d="M30 10 L50 20 L50 45 C50 60 30 70 30 70 C30 70 10 60 10 45 L10 20 Z" fill="#ffffff" filter="url(#shadow)"/>
    <!-- Dollar / Currency Symbol inside shield -->
    <path d="M30 25 V55 M24 33 C24 29 36 29 36 35 C36 43 24 41 24 48 C24 53 36 53 36 49" stroke="#1e3a8a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>
</svg>`;
}

fs.writeFileSync(path.join(publicDir, 'icon.svg'), createSvgIcon(512));

console.log('SVG icon generated successfully!');
