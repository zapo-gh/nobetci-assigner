function isTwelfthGradeClassName(value = '') {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) return false;
  const compact = normalized.replace(/[^0-9A-ZÇĞİÖŞÜ]/g, '');
  if (!compact.startsWith('12')) return false;
  return compact.length > 2;
}

console.log(isTwelfthGradeClassName("AMP 12-A"));
console.log(isTwelfthGradeClassName("12-A"));
