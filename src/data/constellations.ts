export const MONTHLY_CONSTELLATIONS = [
  { id: 'capricorn', name: '염소자리', month: 1, points: 9 },
  { id: 'aquarius', name: '물병자리', month: 2, points: 10 },
  { id: 'pisces', name: '물고기자리', month: 3, points: 10 },
  { id: 'aries', name: '양자리', month: 4, points: 6 },
  { id: 'taurus', name: '황소자리', month: 5, points: 9 },
  { id: 'gemini', name: '쌍둥이자리', month: 6, points: 8 },
  { id: 'cancer', name: '게자리', month: 7, points: 7 },
  { id: 'leo', name: '사자자리', month: 8, points: 9 },
  { id: 'virgo', name: '처녀자리', month: 9, points: 9 },
  { id: 'libra', name: '천칭자리', month: 10, points: 6 },
  { id: 'scorpio', name: '전갈자리', month: 11, points: 8 },
  { id: 'sagittarius', name: '궁수자리', month: 12, points: 7 },
] as const;

export const RESERVE_CONSTELLATIONS = [
  { id: 'cassiopeia', name: '카시오페이아', points: 5 },
  { id: 'cygnus', name: '백조자리', points: 7 },
  { id: 'pegasus', name: '페가수스자리', points: 7 },
  { id: 'andromeda', name: '안드로메다자리', points: 7 },
  { id: 'orion', name: '오리온자리', points: 7 },
  { id: 'lyra', name: '거문고자리', points: 5 },
] as const;

export const CONSTELLATION_POINT_LAYOUTS: Record<string, readonly [number, number][]> = {
  capricorn: [[.18,.66],[.31,.46],[.46,.54],[.58,.37],[.73,.48],[.83,.29],[.77,.68],[.57,.75],[.43,.63]],
  aquarius: [[.16,.33],[.30,.43],[.43,.31],[.56,.43],[.70,.30],[.82,.40],[.72,.58],[.57,.67],[.42,.57],[.27,.70]],
  pisces: [[.18,.29],[.31,.38],[.42,.51],[.54,.60],[.68,.49],[.82,.34],[.70,.73],[.54,.79],[.38,.71],[.24,.58]],
  aries: [[.21,.66],[.31,.49],[.43,.34],[.58,.30],[.73,.39],[.82,.55]],
  taurus: [[.16,.58],[.30,.48],[.43,.52],[.55,.38],[.69,.47],[.83,.35],[.73,.66],[.57,.73],[.40,.67]],
  gemini: [[.26,.25],[.30,.43],[.28,.65],[.24,.80],[.69,.24],[.66,.43],[.70,.64],[.75,.79]],
  cancer: [[.20,.47],[.35,.40],[.49,.50],[.64,.41],[.80,.49],[.40,.68],[.58,.69]],
  leo: [[.17,.66],[.31,.55],[.42,.38],[.56,.27],[.71,.31],[.82,.46],[.72,.61],[.57,.69],[.41,.66]],
  virgo: [[.16,.31],[.29,.43],[.43,.37],[.55,.51],[.69,.42],[.82,.56],[.68,.70],[.50,.73],[.34,.62]],
  libra: [[.20,.36],[.38,.49],[.61,.49],[.80,.36],[.68,.68],[.32,.68]],
  scorpio: [[.15,.25],[.27,.36],[.40,.40],[.51,.53],[.62,.65],[.75,.69],[.84,.58],[.78,.45]],
  sagittarius: [[.16,.68],[.34,.54],[.52,.39],[.72,.25],[.61,.54],[.77,.68],[.48,.67]],
  cassiopeia: [[.16,.58],[.32,.35],[.50,.61],[.68,.34],[.84,.55]],
  cygnus: [[.50,.18],[.50,.34],[.50,.51],[.50,.70],[.22,.44],[.36,.48],[.72,.41]],
  pegasus: [[.20,.32],[.42,.27],[.67,.34],[.78,.56],[.57,.70],[.34,.67],[.18,.53]],
  andromeda: [[.16,.61],[.31,.50],[.46,.43],[.61,.34],[.78,.27],[.60,.60],[.76,.72]],
  orion: [[.24,.25],[.72,.26],[.40,.47],[.51,.50],[.62,.53],[.31,.76],[.70,.76]],
  lyra: [[.50,.19],[.28,.43],[.68,.42],[.36,.72],[.63,.72]],
};

export const ALL_CONSTELLATIONS = [
  ...MONTHLY_CONSTELLATIONS,
  ...RESERVE_CONSTELLATIONS,
] as const;

export const getConstellationById = (id?: string) =>
  ALL_CONSTELLATIONS.find((constellation) => constellation.id === id);

export const constellationForDate = (date: string, dreamIndexInMonth = 0) => {
  const month = Number(date.slice(5, 7)) || new Date().getMonth() + 1;
  const primary = MONTHLY_CONSTELLATIONS[month - 1];
  if (dreamIndexInMonth < primary.points) return primary;
  return RESERVE_CONSTELLATIONS[(dreamIndexInMonth - primary.points) % RESERVE_CONSTELLATIONS.length];
};
