const LABEL_COLORS = [
  '#DC4C64',
  '#E57A2A',
  '#D8A400',
  '#30A46C',
  '#12A594',
  '#0E9888',
  '#0091FF',
  '#5B5BD6',
  '#8E4EC6',
  '#AB4ABA',
  '#D6409F',
  '#E54666',
];

export function normalizeLabelName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

export function labelNameKey(name: string) {
  return normalizeLabelName(name).normalize('NFKC').toLocaleLowerCase('es');
}

export function parseLabelNames(value: string) {
  const names = value.split(',').map(normalizeLabelName).filter(Boolean);
  return names.filter((name, index) => names.findIndex(candidate => labelNameKey(candidate) === labelNameKey(name)) === index);
}

export function automaticLabelColor(position: number) {
  return LABEL_COLORS[position % LABEL_COLORS.length];
}
