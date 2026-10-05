export const normalizeClassName = (raw: string): string => {
  const s = (raw || '')
    .replace(/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
    
  const parts = s.split(' ');
  let i = 0;
  if (parts[i] === 'AMP' || parts[i] === 'ATP' || parts[i] === 'MESEM') i++;
  if (parts[i]?.match(/\d/)) i++;
  
  const classParts = parts.slice(0, i);
  for (; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    
    // Subject codes almost always contain numbers, whereas department/branch parts don't
    if (part !== '-' && part.match(/\d/)) {
      break;
    }
    classParts.push(part);
  }
  
  return classParts.join(' ').replace(/\s+-\s*$/, '').trim();
};
