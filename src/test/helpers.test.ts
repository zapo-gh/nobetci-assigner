/**
 * helpers.test.ts — Pure utility fonksiyonları için unit testler
 *
 * Faz 4: Vitest ile otomatik test altyapısı
 * Kapsam: toInt, sanitizeInput, mondayOfWeek, dateForSelectedDay, formatTRDate,
 *          normalizeReason, validateTeacherData, validateClassData,
 *          normalizeClassLabel, mapSetToArray, arrayToSetMap
 */
import { describe, it, expect } from 'vitest';
import {
  toInt,
  sanitizeInput,
  mondayOfWeek,
  dateForSelectedDay,
  formatTRDate,
  getWeekMonday,
  getWeekDatesForOffset,
  formatWeekRangeTR,
  formatDateKey,
  normalizeReason,
  validateTeacherData,
  validateClassData,
  normalizeClassLabel,
  validateAbsentRow,
  mapSetToArray,
  arrayToSetMap,
} from '../utils/helpers.js';

// ──────────────────────────── toInt ────────────────────────────
describe('toInt', () => {
  it('geçerli tam sayıyı döndürür', () => {
    expect(toInt('5')).toBe(5);
    expect(toInt(10)).toBe(10);
    expect(toInt('0')).toBe(0);
  });

  it('geçersiz değerde varsayılanı döndürür', () => {
    expect(toInt('abc')).toBe(0);
    expect(toInt(null)).toBe(0);
    expect(toInt(undefined)).toBe(0);
    expect(toInt('abc', 99)).toBe(99);
  });

  it('float değeri tamsayıya yuvarlar', () => {
    expect(toInt('3.9')).toBe(3);
  });
});

// ──────────────────────────── sanitizeInput ────────────────────────────
describe('sanitizeInput', () => {
  it('baştaki ve sondaki boşlukları temizler', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });

  it('< ve > karakterlerini kaldırır (XSS koruması)', () => {
    expect(sanitizeInput('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
  });

  it('160 karakterde kırpar', () => {
    const long = 'a'.repeat(200);
    expect(sanitizeInput(long)).toHaveLength(160);
  });

  it('null/undefined için boş string döndürür', () => {
    expect(sanitizeInput(null as unknown as string)).toBe('');
    expect(sanitizeInput(undefined as unknown as string)).toBe('');
  });
});

// ──────────────────────────── mondayOfWeek ────────────────────────────
describe('mondayOfWeek', () => {
  it('Çarşamba için o haftanın Pazartesini döndürür', () => {
    // 2024-01-10 Çarşamba → 2024-01-08 Pazartesi
    const wed = new Date('2024-01-10');
    const mon = mondayOfWeek(wed);
    expect(formatTRDate(mon)).toBe('08.01.2024');
  });

  it('Pazartesi için aynı günü döndürür', () => {
    const monday = new Date('2024-01-08');
    const mon = mondayOfWeek(monday);
    expect(formatTRDate(mon)).toBe('08.01.2024');
  });

  it('Pazar için önceki haftanın Pazartesini döndürür', () => {
    const sunday = new Date('2024-01-07');
    const mon = mondayOfWeek(sunday);
    expect(formatTRDate(mon)).toBe('01.01.2024');
  });
});

// ──────────────────────────── dateForSelectedDay ────────────────────────────
describe('dateForSelectedDay', () => {
  // Baz: 2024-01-10 (Çarşamba) → Hafta: 08-12 Ocak 2024
  const base = new Date('2024-01-10');

  it('Mon → Pazartesi', () => {
    expect(formatTRDate(dateForSelectedDay('Mon', base))).toBe('08.01.2024');
  });

  it('Tue → Salı', () => {
    expect(formatTRDate(dateForSelectedDay('Tue', base))).toBe('09.01.2024');
  });

  it('Fri → Cuma', () => {
    expect(formatTRDate(dateForSelectedDay('Fri', base))).toBe('12.01.2024');
  });

  it('geçersiz gün kodu → Pazartesi fallback', () => {
    expect(formatTRDate(dateForSelectedDay('Sat', base))).toBe('08.01.2024');
  });
});

// ──────────────────────────── formatTRDate ────────────────────────────
describe('formatTRDate', () => {
  it('DD.MM.YYYY formatını döndürür', () => {
    const d = new Date('2024-01-08');
    expect(formatTRDate(d)).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
  });

  it('geçersiz tarih için boş string döndürür', () => {
    expect(formatTRDate(null as unknown as Date)).toBe('');
  });
});

// ──────────────────────────── normalizeReason ────────────────────────────
describe('normalizeReason', () => {
  it('rapor → Raporlu', () => {
    expect(normalizeReason('rapor')).toBe('Raporlu');
    expect(normalizeReason('RAPOR')).toBe('Raporlu');
    expect(normalizeReason('Raporlu')).toBe('Raporlu');
  });

  it('izin → İzinli', () => {
    expect(normalizeReason('izin')).toBe('İzinli');
    expect(normalizeReason('İzin')).toBe('İzinli');
  });

  it('görevli → Görevli İzinli', () => {
    expect(normalizeReason('görevli')).toBe('Görevli İzinli');
    expect(normalizeReason('Görevli İzinli')).toBe('Görevli İzinli');
  });

  it('diğer → Diğer', () => {
    expect(normalizeReason('diğer')).toBe('Diğer');
    expect(normalizeReason('Diger')).toBe('Diğer');
  });

  it('tanımsız değer → boş string', () => {
    expect(normalizeReason('')).toBe('');
    expect(normalizeReason(null as unknown as string)).toBe('');
    expect(normalizeReason('geçersiz-neden')).toBe('');
  });
});

// ──────────────────────────── validateTeacherData ────────────────────────────
describe('validateTeacherData', () => {
  it('geçerli veri için boş hata listesi döndürür', () => {
    expect(validateTeacherData({ teacherId: 'id1', teacherName: 'Ahmet', maxDutyPerDay: 3 })).toHaveLength(0);
  });

  it('eksik teacherId hata döndürür', () => {
    const errs = validateTeacherData({ teacherName: 'Ahmet', maxDutyPerDay: 3 });
    expect(errs).toContain('Öğretmen ID boş');
  });

  it('geçersiz maxDutyPerDay hata döndürür', () => {
    const errs = validateTeacherData({ teacherId: 'id1', teacherName: 'Ahmet', maxDutyPerDay: 0 });
    expect(errs).toContain('Günlük görev 1–9 olmalı');
  });

  it('çok büyük maxDutyPerDay hata döndürür', () => {
    const errs = validateTeacherData({ teacherId: 'id1', teacherName: 'Ahmet', maxDutyPerDay: 10 });
    expect(errs).toContain('Günlük görev 1–9 olmalı');
  });
});

// ──────────────────────────── validateClassData ────────────────────────────
describe('validateClassData', () => {
  it('geçerli veri için boş hata listesi döndürür', () => {
    expect(validateClassData({ classId: 'c1', className: '5-A' })).toHaveLength(0);
  });

  it('eksik classId hata döndürür', () => {
    const errs = validateClassData({ className: '5-A' });
    expect(errs).toContain('Sınıf ID boş');
  });
});

// ──────────────────────────── normalizeClassLabel ────────────────────────────
describe('normalizeClassLabel', () => {
  it('büyük harfe dönüştürür ve boşlukları normalleştirir', () => {
    expect(normalizeClassLabel('  5-a  ')).toBe('5-A');
    expect(normalizeClassLabel('5  a')).toBe('5 A');
  });

  it('boş string için boş döndürür', () => {
    expect(normalizeClassLabel('')).toBe('');
    expect(normalizeClassLabel(null as unknown as string)).toBe('');
  });
});

// ──────────────────────────── validateAbsentRow ────────────────────────────
describe('validateAbsentRow', () => {
  it('geçerli veri için hata yok', () => {
    expect(validateAbsentRow({ name: 'Ahmet', reason: 'rapor' })).toHaveLength(0);
  });

  it('isim boşsa hata döndürür', () => {
    const errs = validateAbsentRow({ name: '', reason: 'rapor' });
    expect(errs).toContain('İsim boş');
  });

  it('geçersiz neden için hata döndürür', () => {
    const errs = validateAbsentRow({ name: 'Ahmet', reason: 'bilmiyorum' });
    expect(errs).toContain('Geçerli bir neden girin');
  });
});

// ──────────────────────────── mapSetToArray ────────────────────────────
describe('mapSetToArray', () => {
  it('flat yapıda Set → Array dönüşümü', () => {
    const input = { 1: new Set(['a', 'b']), 2: new Set(['c']) };
    const result = mapSetToArray(input);
    expect(result[1]).toEqual(['a', 'b']);
    expect(result[2]).toEqual(['c']);
  });

  it('nested yapıda (classFree) Set → Array dönüşümü', () => {
    const input = { monday: { 1: new Set(['cls1', 'cls2']) } };
    const result = mapSetToArray(input);
    expect(result.monday[1]).toEqual(['cls1', 'cls2']);
  });

  it('boş obje için boş obje döndürür', () => {
    expect(mapSetToArray({})).toEqual({});
    expect(mapSetToArray(null as unknown as object)).toEqual({});
  });

  it('Array giriş için de çalışır', () => {
    const input = { 1: ['a', 'b'] };
    const result = mapSetToArray(input);
    expect(result[1]).toEqual(['a', 'b']);
  });
});

// ──────────────────────────── arrayToSetMap ────────────────────────────
describe('arrayToSetMap', () => {
  it('flat yapıda Array → Set dönüşümü (teacherFree)', () => {
    const input = { 1: ['t1', 't2'], 2: ['t3'] };
    const result = arrayToSetMap(input);
    expect(result[1]).toBeInstanceOf(Set);
    expect(result[1].has('t1')).toBe(true);
    expect(result[2].has('t3')).toBe(true);
  });

  it('nested yapıda (classFree) Array → Set dönüşümü', () => {
    const input = { monday: { 1: ['cls1'] } };
    const result = arrayToSetMap(input);
    expect(result.monday[1]).toBeInstanceOf(Set);
    expect(result.monday[1].has('cls1')).toBe(true);
  });

  it('boş/null giriş için boş obje döndürür', () => {
    expect(arrayToSetMap(null as unknown as object)).toEqual({});
    expect(arrayToSetMap(undefined as unknown as object)).toEqual({});
  });

  it('string period key → number key dönüşümü', () => {
    const input = { '1': ['a'], '2': ['b'] };
    const result = arrayToSetMap(input);
    // Numeric key ile erişilebilir olmalı
    expect(result[1]).toBeInstanceOf(Set);
    expect(result[2]).toBeInstanceOf(Set);
  });
});

// ──────────────────────────── Hafta Gezinme Yardımcıları ────────────────────────────
describe('Hafta Gezinme Yardımcıları', () => {
  const baseWed = new Date('2026-10-07'); // Çarşamba

  it('getWeekMonday: mevcut hafta Pazartesi döner (05.10.2026)', () => {
    const mon = getWeekMonday(0, baseWed);
    expect(formatTRDate(mon)).toBe('05.10.2026');
  });

  it('getWeekMonday: sonraki hafta Pazartesi döner (12.10.2026)', () => {
    const nextMon = getWeekMonday(1, baseWed);
    expect(formatTRDate(nextMon)).toBe('12.10.2026');
  });

  it('getWeekMonday: önceki hafta Pazartesi döner (28.09.2026)', () => {
    const prevMon = getWeekMonday(-1, baseWed);
    expect(formatTRDate(prevMon)).toBe('28.09.2026');
  });

  it('getWeekDatesForOffset: 1 hafta sonrası için 12-16 Ekim günlerini üretir', () => {
    const dates = getWeekDatesForOffset(1, baseWed);
    expect(dates).toHaveLength(5);
    expect(dates[0]?.getDate()).toBe(12); // Pzt
    expect(dates[1]?.getDate()).toBe(13); // Sal (13 Ekim!)
    expect(dates[2]?.getDate()).toBe(14); // Çar
    expect(dates[3]?.getDate()).toBe(15); // Per
    expect(dates[4]?.getDate()).toBe(16); // Cum
  });

  it('formatWeekRangeTR: hafta aralığını doğru formatlar', () => {
    const dates = getWeekDatesForOffset(1, baseWed);
    expect(formatWeekRangeTR(dates)).toBe('12 - 16 Ekim 2026');
  });

  it('formatDateKey: YYYY-MM-DD anahtarı üretir', () => {
    const d = new Date('2026-10-13');
    expect(formatDateKey(d)).toBe('2026-10-13');
  });
});

