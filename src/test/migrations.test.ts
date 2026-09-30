// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { normalizeAbsentPeople } from '../utils/migrations';

describe('normalizeAbsentPeople', () => {
  it('should fallback to all valid days if no days are specified and no usage exists', () => {
    const list = [{ absentId: 'a1', teacherId: 't1' }];
    const normalized = normalizeAbsentPeople(list);
    
    expect(normalized).toHaveLength(1);
    expect(normalized[0].days).toHaveLength(5); // Mon, Tue, Wed, Thu, Fri
    expect(normalized[0].days).toContain('Mon');
  });

  it('should infer days from classAbsence usage if days array is missing', () => {
    const list = [{ absentId: 'a1', teacherId: 't1' }];
    const classAbsence = {
      'Tue': { 1: { 'c1': 'a1' } },
      'Wed': { 2: { 'c2': 'a1' } }
    };
    
    const normalized = normalizeAbsentPeople(list, classAbsence);
    
    expect(normalized[0].days).toHaveLength(2);
    expect(normalized[0].days).toContain('Tue');
    expect(normalized[0].days).toContain('Wed');
  });

  it('should retain explicitly set valid days and filter out invalid ones', () => {
    const list = [{ absentId: 'a1', teacherId: 't1', days: ['Mon', 'invalid_day'] }];
    const normalized = normalizeAbsentPeople(list);
    
    expect(normalized[0].days).toHaveLength(1);
    expect(normalized[0].days).toContain('Mon');
  });
});
