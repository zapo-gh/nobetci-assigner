
export const toInt = (v, d = 0) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

export const sanitizeInput = (s) =>
  (s ?? '').toString().trim().replace(/[<>]/g, '').slice(0, 160);

export function mondayOfWeek(base = new Date()) {
  const d = new Date(base);
  const day = d.getDay();
  const diffToMon = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diffToMon);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function dateForSelectedDay(dayKey, base = new Date()) {
  const mon = mondayOfWeek(base);
  const idx = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].indexOf(dayKey);
  const dt = new Date(mon);
  dt.setDate(mon.getDate() + (idx >= 0 ? idx : 0));
  return dt;
}

export function formatTRDate(d) {
  try {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  } catch {
    return '';
  }
}

export function normalizeReason(input) {
  if (!input) return '';

  let v = String(input).trim().toLocaleLowerCase('tr').replace(/\s+/g, ' ');

  const norm = (s) => s.replace(/ö/g, 'o');
  const vn = norm(v);

  if (/^g(ö|o)revli(\s*[- ]\s*izinli)?$/.test(v)) return 'Görevli İzinli';

  if (/^rapor/.test(v)) return 'Raporlu';
  if (/^sevk/.test(v)) return 'Sevkli';
  if (/^izin/.test(v)) return 'İzinli';

  if (vn === 'diger' || v === 'diğer') return 'Diğer';

  if (['Raporlu', 'Sevkli', 'İzinli', 'Görevli İzinli', 'Diğer'].includes(v))
    return v;

  return '';
}

export function validateTeacherData(row) {
  const errs = [];
  if (!row.teacherId) errs.push('Öğretmen ID boş');
  if (!row.teacherName) errs.push('Öğretmen adı boş');
  const m = toInt(row.maxDutyPerDay, 6);
  if (m < 1 || m > 9) errs.push('Günlük görev 1–9 olmalı');
  return errs;
}

export function validateClassData(row) {
  const errs = [];
  if (!row.classId) errs.push('Sınıf ID boş');
  if (!row.className) errs.push('Sınıf adı boş');
  return errs;
}

export function validateAbsentRow(row) {
  const errs = [];
  if (!row.name) errs.push('İsim boş');
  const r = normalizeReason(row.reason);
  if (!r) errs.push('Geçerli bir neden girin');
  return errs;
}

export function mapSetToArray(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v instanceof Set) {
      // Eski yapı: {period: Set(classId)}
      out[k] = Array.from(v || []);
    } else if (Array.isArray(v)) {
      out[k] = [...v];
    } else if (typeof v === 'object' && v !== null) {
      // Derin yapı: her seviyede Set -> Array dönüşümü
      const convertNested = (value) => {
        if (value instanceof Set) {
          return Array.from(value || []);
        }
        if (Array.isArray(value)) {
          return [...value];
        }
        if (value && typeof value === 'object') {
          const nestedOut = {};
          for (const [innerKey, innerValue] of Object.entries(value)) {
            nestedOut[innerKey] = convertNested(innerValue);
          }
          return nestedOut;
        }
        return value;
      };

      out[k] = convertNested(v);
    }
  }
  return out;
}

export function arrayToSetMap(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (Array.isArray(v)) {
      // Eski yapı: {period: Array(classId)}
      out[k] = new Set(v);
    } else if (typeof v === 'object' && v !== null) {
      // Yeni yapı: {day: {period: Array(classId)}}
      out[k] = {};
      for (const [dayKey, dayValue] of Object.entries(v)) {
        out[k][dayKey] = {};
        for (const [periodKey, periodValue] of Object.entries(dayValue)) {
          // Convert period key to number if possible (JSON keys are strings)
          const periodNum = Number(periodKey);
          const key = !isNaN(periodNum) ? periodNum : periodKey;
          out[k][dayKey][key] = new Set(Array.isArray(periodValue) ? periodValue : []);
        }
      }
    }
  }
  return out;
}

export async function readFileAsTextSmart(file) {
  return await file.text();
}

export const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
