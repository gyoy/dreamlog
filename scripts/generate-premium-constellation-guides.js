const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', 'assets', 'constellation-guides-premium');
fs.mkdirSync(OUT, { recursive: true });

const guides = [
  ['capricorn', [[.18,.66],[.31,.46],[.46,.54],[.58,.37],[.73,.48],[.83,.29],[.77,.68],[.57,.75],[.43,.63]], [[0,1],[1,2],[2,3],[3,4],[4,5],[4,6],[6,7],[7,8],[8,2]]],
  ['aquarius', [[.16,.33],[.30,.43],[.43,.31],[.56,.43],[.70,.30],[.82,.40],[.72,.58],[.57,.67],[.42,.57],[.27,.70]], [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[1,9]]],
  ['pisces', [[.18,.29],[.31,.38],[.42,.51],[.54,.60],[.68,.49],[.82,.34],[.70,.73],[.54,.79],[.38,.71],[.24,.58]], [[0,1],[1,2],[2,3],[3,4],[4,5],[3,6],[6,7],[7,8],[8,9],[9,2]]],
  ['aries', [[.21,.66],[.31,.49],[.43,.34],[.58,.30],[.73,.39],[.82,.55]], [[0,1],[1,2],[2,3],[3,4],[4,5]]],
  ['taurus', [[.16,.58],[.30,.48],[.43,.52],[.55,.38],[.69,.47],[.83,.35],[.73,.66],[.57,.73],[.40,.67]], [[0,1],[1,2],[2,3],[3,4],[4,5],[4,6],[6,7],[7,8],[8,2]]],
  ['gemini', [[.26,.25],[.30,.43],[.28,.65],[.24,.80],[.69,.24],[.66,.43],[.70,.64],[.75,.79]], [[0,1],[1,2],[2,3],[4,5],[5,6],[6,7],[1,5],[2,6]]],
  ['cancer', [[.20,.47],[.35,.40],[.49,.50],[.64,.41],[.80,.49],[.40,.68],[.58,.69]], [[0,1],[1,2],[2,3],[3,4],[2,5],[2,6]]],
  ['leo', [[.17,.66],[.31,.55],[.42,.38],[.56,.27],[.71,.31],[.82,.46],[.72,.61],[.57,.69],[.41,.66]], [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,1]]],
  ['virgo', [[.16,.31],[.29,.43],[.43,.37],[.55,.51],[.69,.42],[.82,.56],[.68,.70],[.50,.73],[.34,.62]], [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,3]]],
  ['libra', [[.20,.36],[.38,.49],[.61,.49],[.80,.36],[.68,.68],[.32,.68]], [[0,1],[1,2],[2,3],[2,4],[4,5],[5,1]]],
  ['scorpio', [[.15,.25],[.27,.36],[.40,.40],[.51,.53],[.62,.65],[.75,.69],[.84,.58],[.78,.45]], [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]]],
  ['sagittarius', [[.16,.68],[.34,.54],[.52,.39],[.72,.25],[.61,.54],[.77,.68],[.48,.67]], [[0,1],[1,2],[2,3],[2,4],[4,5],[4,6],[6,1]]],
  ['cassiopeia', [[.16,.58],[.32,.35],[.50,.61],[.68,.34],[.84,.55]], [[0,1],[1,2],[2,3],[3,4]]],
  ['cygnus', [[.50,.18],[.50,.34],[.50,.51],[.50,.70],[.22,.44],[.36,.48],[.72,.41]], [[0,1],[1,2],[2,3],[4,5],[5,2],[2,6]]],
  ['pegasus', [[.20,.32],[.42,.27],[.67,.34],[.78,.56],[.57,.70],[.34,.67],[.18,.53]], [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0]]],
  ['andromeda', [[.16,.61],[.31,.50],[.46,.43],[.61,.34],[.78,.27],[.60,.60],[.76,.72]], [[0,1],[1,2],[2,3],[3,4],[2,5],[5,6]]],
  ['orion', [[.24,.25],[.72,.26],[.40,.47],[.51,.50],[.62,.53],[.31,.76],[.70,.76]], [[0,2],[1,4],[2,3],[3,4],[2,5],[4,6]]],
  ['lyra', [[.50,.19],[.28,.43],[.68,.42],[.36,.72],[.63,.72]], [[0,1],[0,2],[1,3],[3,4],[4,2]]],
];

function seededSparkles(index) {
  return Array.from({ length: 44 }, (_, i) => {
    const x = 86 + ((i * 211 + index * 47) % 1360);
    const y = 92 + ((i * 317 + index * 73) % 1630);
    const radius = i % 11 === 0 ? 5 : i % 4 === 0 ? 3.2 : 1.8;
    const opacity = 0.22 + (i % 5) * 0.11;
    return `<circle cx="${x}" cy="${y}" r="${radius}" fill="#FFF8D5" opacity="${opacity}"/>`;
  }).join('');
}

async function render([id, points, edges], index) {
  const width = 1536;
  const height = 1920;
  const mapped = points.map(([x, y]) => [x * width, y * height]);
  const lines = edges
    .map(([a, b]) => `<line x1="${mapped[a][0]}" y1="${mapped[a][1]}" x2="${mapped[b][0]}" y2="${mapped[b][1]}" />`)
    .join('');
  const dots = mapped.map(([x, y], pointIndex) => `
    <circle cx="${x}" cy="${y}" r="${pointIndex % 4 === 0 ? 25 : 20}" fill="#FFE16D" opacity=".18" filter="url(#pointGlow)"/>
    <circle cx="${x}" cy="${y}" r="${pointIndex % 4 === 0 ? 13 : 10}" fill="#FFE77C"/>
    <circle cx="${x - 3}" cy="${y - 4}" r="${pointIndex % 4 === 0 ? 4 : 3}" fill="#FFFDF0" opacity=".98"/>
  `).join('');
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg" cx="50%" cy="42%" r="76%">
          <stop offset="0%" stop-color="#756DDA"/>
          <stop offset="48%" stop-color="#4D43B2"/>
          <stop offset="100%" stop-color="#241B68"/>
        </radialGradient>
        <radialGradient id="mist" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#D9D0FF" stop-opacity=".28"/>
          <stop offset="100%" stop-color="#D9D0FF" stop-opacity="0"/>
        </radialGradient>
        <filter id="lineGlow"><feGaussianBlur stdDeviation="12"/></filter>
        <filter id="pointGlow"><feGaussianBlur stdDeviation="16"/></filter>
      </defs>
      <rect width="${width}" height="${height}" rx="220" fill="url(#bg)"/>
      <ellipse cx="350" cy="260" rx="390" ry="220" fill="url(#mist)"/>
      <ellipse cx="1220" cy="1540" rx="430" ry="280" fill="url(#mist)" opacity=".55"/>
      ${seededSparkles(index)}
      <g stroke="#FFD95F" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" opacity=".24" filter="url(#lineGlow)">${lines}</g>
      <g stroke="#FFE36F" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".98">${lines}</g>
      <g stroke="#FFF6BE" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity=".84">${lines}</g>
      <g>${dots}</g>
    </svg>`;

  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(OUT, `${String(index + 1).padStart(2, '0')}-${id}.png`));
}

Promise.all(guides.map(render))
  .then(() => console.log(`generated ${guides.length} premium constellation guides`));
