import { describe, it, expect } from 'vitest';
import { isAbsentOnDay, isAbsentAtPeriod, isClassScheduleMatch, normalizeDayKey, resolveCommonLessonOwners, encodeClassAbsenceValue } from '../utils/classAbsence';

describe('isAbsentOnDay', () => {
  it('days boşsa tüm günleri kapsar', () => {
    expect(isAbsentOnDay({ days: [] }, 'Tue')).toBe(true);
    expect(isAbsentOnDay({}, 'Tue')).toBe(true);
  });

  it('farklı gün biçimlerini eşleştirir', () => {
    expect(isAbsentOnDay({ days: ['Salı'] }, 'Tue')).toBe(true);
    expect(isAbsentOnDay({ days: ['Tue'] }, 'Salı')).toBe(true);
    expect(isAbsentOnDay({ days: ['tuesday'] }, 'Tue')).toBe(true);
    expect(isAbsentOnDay({ days: ['Çarşamba'] }, 'Wed')).toBe(true);
  });

  it('farklı gün için false döner', () => {
    expect(isAbsentOnDay({ days: ['Mon'] }, 'Tue')).toBe(false);
  });

  it('null kayıt için false döner', () => {
    expect(isAbsentOnDay(null, 'Tue')).toBe(false);
  });

  it('normalizeDayKey tutarlı', () => {
    expect(normalizeDayKey('Perşembe')).toBe(normalizeDayKey('Thu'));
  });
});

describe('isClassScheduleMatch (sıkı eşleşme)', () => {
  it('aynı sınıfı eşleştirir', () => {
    expect(isClassScheduleMatch('AMP 9-G', 'AMP 9-G')).toBe(true);
    expect(isClassScheduleMatch('9-G', 'AMP 9-G Fizik')).toBe(true);
  });

  it('1-A ile 11-A karışmaz', () => {
    expect(isClassScheduleMatch('1-A', '11-A Matematik')).toBe(false);
  });

  it('9-A ile 9-AB karışmaz', () => {
    expect(isClassScheduleMatch('9-A', '9-AB Fizik')).toBe(false);
  });
});

describe('isAbsentAtPeriod (kısmi gün izni)', () => {
  it('full tüm saatleri kapsar', () => {
    expect(isAbsentAtPeriod({ days: ['Mon'], timeSlot: 'full' }, 'Mon', 8)).toBe(true);
    expect(isAbsentAtPeriod({ days: ['Mon'] }, 'Mon', 1)).toBe(true);
  });

  it('morning yalnızca 1-5. dersleri kapsar', () => {
    const p = { days: ['Mon'], timeSlot: 'morning' };
    expect(isAbsentAtPeriod(p, 'Mon', 5)).toBe(true);
    expect(isAbsentAtPeriod(p, 'Mon', 6)).toBe(false);
  });

  it('afternoon 6. dersten itibaren kapsar', () => {
    const p = { days: ['Mon'], timeSlot: 'afternoon' };
    expect(isAbsentAtPeriod(p, 'Mon', 5)).toBe(false);
    expect(isAbsentAtPeriod(p, 'Mon', 6)).toBe(true);
  });

  it('yanlış gün için false', () => {
    expect(isAbsentAtPeriod({ days: ['Mon'], timeSlot: 'full' }, 'Tue', 3)).toBe(false);
  });
});

describe('resolveCommonLessonOwners', () => {
  const info = {
    a1: { name: 'ZEHRA KOŞAN', reason: 'gorevli-izinli' },
    a2: { name: 'BÜLENT AYGÜN', reason: 'raporlu' },
  };

  it('virgülle ayrılmış birden çok sahibi çözer', () => {
    const raw = encodeClassAbsenceValue('COMMON_LESSON', true, { commonLessonOwnerId: 'a1,a2' }) as string;
    const res = resolveCommonLessonOwners(raw, info);
    expect(res.hasOwner).toBe(true);
    expect(res.records.map((r) => r.name)).toEqual(['ZEHRA KOŞAN', 'BÜLENT AYGÜN']);
  });

  it('sahipsiz ortak derste hasOwner=false', () => {
    const res = resolveCommonLessonOwners('COMMON_LESSON', info);
    expect(res.hasOwner).toBe(false);
    expect(res.records).toEqual([]);
  });

  it('bugün izinli olmayan sahipler atlanır', () => {
    const raw = encodeClassAbsenceValue('COMMON_LESSON', true, { commonLessonOwnerId: 'a1,zzz' }) as string;
    expect(resolveCommonLessonOwners(raw, info).records).toHaveLength(1);
  });
});
