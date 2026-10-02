const text1 = "AMP 10-A";
const text2 = "ATP 10-A";

function extractClassFromCell(text) {
  let prefix = '';
  if (text.includes('AMP')) prefix = 'AMP ';
  else if (text.includes('ATP')) prefix = 'ATP ';
  else if (text.includes('MESEM')) prefix = 'MESEM ';
  
  const m = text.match(/(?:^|[^0-9])(\d{1,2})[-\s\/]?([A-ZÇĞİÖŞÜ]+)/);
  if (m) {
    const grade = m[1];
    const branch = m[2];
    if (branch.length === 1) {
      return `${prefix}${grade}-${branch}`;
    } else {
      return `${prefix}${grade} ${branch}`;
    }
  }
  return text;
}

console.log(extractClassFromCell(text1));
console.log(extractClassFromCell(text2));
console.log(extractClassFromCell("10-A"));
console.log(extractClassFromCell("AMP-10-A"));
