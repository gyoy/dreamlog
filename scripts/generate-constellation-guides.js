const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', 'assets', 'constellation-guides');
fs.mkdirSync(OUT, { recursive: true });

const guides = [
  ['capricorn', '염소자리', [[.18,.66],[.31,.46],[.46,.54],[.58,.37],[.73,.48],[.83,.29],[.77,.68],[.57,.75],[.43,.63]]],
  ['aquarius', '물병자리', [[.16,.33],[.30,.43],[.43,.31],[.56,.43],[.70,.30],[.82,.40],[.72,.58],[.57,.67],[.42,.57],[.27,.70]]],
  ['pisces', '물고기자리', [[.18,.29],[.31,.38],[.42,.51],[.54,.60],[.68,.49],[.82,.34],[.70,.73],[.54,.79],[.38,.71],[.24,.58]]],
  ['aries', '양자리', [[.21,.66],[.31,.49],[.43,.34],[.58,.30],[.73,.39],[.82,.55]]],
  ['taurus', '황소자리', [[.16,.58],[.30,.48],[.43,.52],[.55,.38],[.69,.47],[.83,.35],[.73,.66],[.57,.73],[.40,.67]]],
  ['gemini', '쌍둥이자리', [[.26,.25],[.30,.43],[.28,.65],[.24,.80],[.69,.24],[.66,.43],[.70,.64],[.75,.79],[.30,.43],[.66,.43],[.28,.65],[.70,.64]]],
  ['cancer', '게자리', [[.20,.47],[.35,.40],[.49,.50],[.64,.41],[.80,.49],[.49,.50],[.40,.68],[.58,.69]]],
  ['leo', '사자자리', [[.17,.66],[.31,.55],[.42,.38],[.56,.27],[.71,.31],[.82,.46],[.72,.61],[.57,.69],[.41,.66]]],
  ['virgo', '처녀자리', [[.16,.31],[.29,.43],[.43,.37],[.55,.51],[.69,.42],[.82,.56],[.68,.70],[.50,.73],[.34,.62]]],
  ['libra', '천칭자리', [[.20,.36],[.38,.49],[.61,.49],[.80,.36],[.68,.68],[.32,.68],[.38,.49],[.32,.68],[.61,.49],[.68,.68]]],
  ['scorpio', '전갈자리', [[.15,.25],[.27,.36],[.40,.40],[.51,.53],[.62,.65],[.75,.69],[.84,.58],[.78,.45]]],
  ['sagittarius', '궁수자리', [[.16,.68],[.34,.54],[.52,.39],[.72,.25],[.61,.54],[.77,.68],[.52,.39],[.48,.67],[.31,.31]]],
  ['cassiopeia', '카시오페이아', [[.13,.50],[.31,.31],[.49,.55],[.68,.30],[.87,.49]]],
  ['cygnus', '백조자리', [[.14,.51],[.33,.50],[.51,.48],[.71,.46],[.87,.44],[.51,.48],[.47,.25],[.55,.73]]],
  ['pegasus', '페가수스자리', [[.22,.28],[.70,.27],[.72,.67],[.25,.69],[.22,.28],[.70,.27],[.84,.16],[.72,.67],[.86,.78]]],
  ['andromeda', '안드로메다자리', [[.12,.55],[.30,.50],[.48,.43],[.65,.35],[.83,.26],[.48,.43],[.58,.64],[.72,.75]]],
  ['orion', '오리온자리', [[.25,.23],[.38,.43],[.50,.48],[.62,.43],[.75,.22],[.38,.43],[.30,.75],[.50,.48],[.68,.76]]],
  ['lyra', '거문고자리', [[.28,.24],[.46,.42],[.68,.34],[.73,.62],[.46,.69],[.46,.42],[.46,.69]]],
];

const linePairs = (points) => points.slice(0, -1).map((_, i) => [i, i + 1]);

async function render([id, label, points], index) {
  const width = 768;
  const height = 960;
  const mapped = points.map(([x, y]) => [x * width, y * height]);
  const lines = linePairs(mapped)
    .map(([a,b]) => `<line x1="${mapped[a][0]}" y1="${mapped[a][1]}" x2="${mapped[b][0]}" y2="${mapped[b][1]}" />`)
    .join('');
  const dots = mapped.map(([x,y], i) => `
    <circle cx="${x}" cy="${y}" r="${i % 4 === 0 ? 14 : 9}" fill="#FFD75E"/>
    <circle cx="${x}" cy="${y}" r="${i % 4 === 0 ? 25 : 18}" fill="#FFD75E" opacity=".13"/>
  `).join('');
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg" cx="50%" cy="40%" r="72%">
          <stop offset="0%" stop-color="#7770DB"/>
          <stop offset="55%" stop-color="#5147B8"/>
          <stop offset="100%" stop-color="#29206D"/>
        </radialGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="7"/></filter>
      </defs>
      <rect x="16" y="16" width="736" height="928" rx="112" fill="url(#bg)"/>
      <ellipse cx="190" cy="145" rx="180" ry="86" fill="#BFB4FF" opacity=".18"/>
      <ellipse cx="615" cy="800" rx="210" ry="110" fill="#D8CFFF" opacity=".12"/>
      ${Array.from({length: 22}, (_,i) => {
        const x = 45 + ((i * 97) % 675);
        const y = 72 + ((i * 157) % 790);
        return `<circle cx="${x}" cy="${y}" r="${2 + (i%3)}" fill="#FFF8D4" opacity="${.35 + (i%4)*.12}"/>`;
      }).join('')}
      <g stroke="#FFE08A" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".38" filter="url(#glow)">${lines}</g>
      <g stroke="#FFE08A" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" opacity=".96">${lines}</g>
      <g>${dots}</g>
      <text x="384" y="885" text-anchor="middle" fill="#FFF9DB" font-size="34" font-family="sans-serif" font-weight="700">${label}</text>
      <text x="384" y="920" text-anchor="middle" fill="#DCD6FF" font-size="20" font-family="sans-serif">${index < 12 ? `${index + 1}월의 꿈별` : '예비 꿈별'}</text>
    </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(OUT, `${String(index + 1).padStart(2,'0')}-${id}.png`));
}

Promise.all(guides.map(render)).then(() => console.log(`generated ${guides.length} guides`));
