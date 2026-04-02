export function normalizeTeacherName(name) {
  if (!name || typeof name !== 'string') return '';

  return name
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

export function normalizeForComparison(name) {
  if (!name || typeof name !== 'string') return '';

  return name
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[İ]/g, 'I')
    .replace(/[Ğ]/g, 'G')
    .replace(/[Ü]/g, 'U')
    .replace(/[Ş]/g, 'S')
    .replace(/[Ö]/g, 'O')
    .replace(/[Ç]/g, 'C');
}