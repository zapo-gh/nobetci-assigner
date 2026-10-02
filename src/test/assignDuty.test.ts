// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { assignDuties } from '../utils/assignDuty';

describe('assignDuties Engine', () => {
  it('should not assign absent teachers', () => {
    const result = assignDuties({
      teachers: [{ teacherId: 't1', teacherName: 'Ali', maxDutyPerDay: 6, source: 'manual' }],
      freeTeachers: { monday: {} }, // Boş, müsait öğretmen yok
      classes: [{ classId: 'c1', className: '5A' }],
      freeClasses: { monday: { 1: new Set(['c1']) } },
      locked: {},
      options: { preventConsecutive: false, maxClassesPerSlot: 1, ignoreConsecutiveLimit: false },
      commonLessons: {}
    });
    
    // Pazartesi 1. ders için kimse atanmamış olmalı (çünkü öğretmen absent / müsait değil)
    expect(result.schedule.monday?.[1] ?? []).toHaveLength(0);
  });

  it('should respect manual locked assignments', () => {
    const result = assignDuties({
      teachers: [{ teacherId: 't1', teacherName: 'Ali', maxDutyPerDay: 6, source: 'manual' }],
      freeTeachers: { monday: { 1: new Set(['t1']) } }, 
      classes: [{ classId: 'c1', className: '5A' }],
      freeClasses: { monday: { 1: new Set(['c1']) } },
      locked: { 'monday|1|c1': 't1' }, // c1 sınıfına t1 öğretmeni manuel kilitlenmiş
      options: { preventConsecutive: false, maxClassesPerSlot: 1, ignoreConsecutiveLimit: false },
      commonLessons: {}
    });
    
    // Pazartesi 1. ders 5A sınıfına t1 atanmış olmalı
    const assigned = result.schedule.monday?.[1]?.find((a: any) => a.classId === 'c1');
    expect(assigned).toBeDefined();
    expect(assigned?.teacherId).toBe('t1');
  });
});
