// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { assignDuties, getZoneFloor, getZoneDistance } from '../utils/assignDuty';

describe('assignDuties Engine Basics', () => {
  it('should not assign absent teachers when not free', () => {
    const result = assignDuties({
      teachers: [{ teacherId: 't1', teacherName: 'Ali', maxDutyPerDay: 6, source: 'manual' }],
      freeTeachers: { monday: {} },
      classes: [{ classId: 'c1', className: '5A' }],
      freeClasses: { monday: { 1: new Set(['c1']) } },
      locked: {},
      options: { preventConsecutive: false, maxClassesPerSlot: 1, ignoreConsecutiveLimit: false },
      commonLessons: {}
    });
    
    expect(result.schedule.monday?.[1] ?? []).toHaveLength(0);
  });

  it('should respect manual locked assignments', () => {
    const result = assignDuties({
      teachers: [{ teacherId: 't1', teacherName: 'Ali', maxDutyPerDay: 6, source: 'manual' }],
      freeTeachers: { monday: { 1: new Set(['t1']) } }, 
      classes: [{ classId: 'c1', className: '5A' }],
      freeClasses: { monday: { 1: new Set(['c1']) } },
      locked: { 'monday|1|c1': 't1' },
      options: { preventConsecutive: false, maxClassesPerSlot: 1, ignoreConsecutiveLimit: false },
      commonLessons: {}
    });
    
    const assigned = result.schedule.monday?.[1]?.find((a: any) => a.classId === 'c1');
    expect(assigned).toBeDefined();
    expect(assigned?.teacherId).toBe('t1');
  });
});

describe('Zone Floor and Distance Calculations', () => {
  it('correctly maps zone names to floor numbers', () => {
    expect(getZoneFloor('A- ZEMİN KAT')).toBe(0);
    expect(getZoneFloor('B - 1. KAT')).toBe(1);
    expect(getZoneFloor('C - 2. KAT')).toBe(2);
    expect(getZoneFloor('D - 3. KAT')).toBe(3);
    expect(getZoneFloor('BAHÇE GİRİŞİ VE ÖN BAHÇE')).toBe(0);
    expect(getZoneFloor('ARKA BAHÇE -MOTOR ATÖLYESİ ÇEVRESİ')).toBe(0);
    expect(getZoneFloor('BODRUM')).toBe(-1);
    expect(getZoneFloor('A-01')).toBe(0);
    expect(getZoneFloor('B-03')).toBe(1);
    expect(getZoneFloor('C-11')).toBe(2);
    expect(getZoneFloor('D-05')).toBe(3);
  });

  it('correctly calculates floor distances between zones', () => {
    expect(getZoneDistance('D - 3. KAT', 'D - 3. KAT')).toBe(0);
    expect(getZoneDistance('D - 3. KAT', 'C - 2. KAT')).toBe(1);
    expect(getZoneDistance('D - 3. KAT', 'B - 1. KAT')).toBe(2);
    expect(getZoneDistance('D - 3. KAT', 'A- ZEMİN KAT')).toBe(3);
    expect(getZoneDistance('D-01', 'D - 3. KAT')).toBe(0);
    expect(getZoneDistance('C-02', 'D - 3. KAT')).toBe(1);
    expect(getZoneDistance('NÖBETÇİ İDARECİLER', 'NÖBETÇİ İDARECİLER')).toBe(0);
  });
});

describe('assignDuties 4-Tier Hierarchy and Fairness', () => {
  it('Tier 1: prefers same-floor free teacher over another-floor free teacher', () => {
    const result = assignDuties({
      teachers: [
        { teacherId: 't_other', teacherName: 'Ahmet', dutyLocations: { monday: 'B - 1. KAT' }, maxDutyPerDay: 6 },
        { teacherId: 't_same', teacherName: 'Mehmet', dutyLocations: { monday: 'C - 2. KAT' }, maxDutyPerDay: 6 },
      ],
      freeTeachers: { monday: { 1: new Set(['t_other', 't_same']) } },
      classes: [{ classId: 'c_c01', className: '10-A' }],
      freeClasses: { monday: { 1: new Set(['c_c01']) } },
      classLocations: { 'c_c01': { monday: { 1: 'C-01' } } },
      locationZoneMapping: { 'C-01': 'C - 2. KAT' },
      locked: {},
      options: { maxClassesPerSlot: 1 },
      commonLessons: {},
    });

    const assigned = result.schedule.monday?.[1]?.find(a => a.classId === 'c_c01');
    expect(assigned?.teacherId).toBe('t_same');
  });

  it('Tier 2: prefers same-floor teacher with lesson over another-floor free teacher if no same-floor free teacher', () => {
    const result = assignDuties({
      teachers: [
        { teacherId: 't_other_free', teacherName: 'Ahmet', dutyLocations: { monday: 'B - 1. KAT' }, maxDutyPerDay: 6 },
        { teacherId: 't_same_busy', teacherName: 'Mehmet', dutyLocations: { monday: 'C - 2. KAT' }, maxDutyPerDay: 6 },
      ],
      // t_same_busy has a lesson (not in freeTeachers), but t_other_free is free
      freeTeachers: { monday: { 1: new Set(['t_other_free']) } },
      classes: [{ classId: 'c_c01', className: '10-A' }],
      freeClasses: { monday: { 1: new Set(['c_c01']) } },
      classLocations: { 'c_c01': { monday: { 1: 'C-01' } } },
      locationZoneMapping: { 'C-01': 'C - 2. KAT' },
      locked: {},
      options: { maxClassesPerSlot: 1 },
      commonLessons: {},
    });

    const assigned = result.schedule.monday?.[1]?.find(a => a.classId === 'c_c01');
    expect(assigned?.teacherId).toBe('t_same_busy');
  });

  it('Tier 3: prefers nearest floor free teacher over farther floor free teacher', () => {
    const result = assignDuties({
      teachers: [
        { teacherId: 't_far', teacherName: 'Far Teacher', dutyLocations: { monday: 'A- ZEMİN KAT' }, maxDutyPerDay: 6 },
        { teacherId: 't_near', teacherName: 'Near Teacher', dutyLocations: { monday: 'C - 2. KAT' }, maxDutyPerDay: 6 },
      ],
      // Class is on D - 3. KAT (dist 1 to C, dist 3 to A)
      freeTeachers: { monday: { 1: new Set(['t_far', 't_near']) } },
      classes: [{ classId: 'c_d01', className: '12-A' }],
      freeClasses: { monday: { 1: new Set(['c_d01']) } },
      classLocations: { 'c_d01': { monday: { 1: 'D-01' } } },
      locationZoneMapping: { 'D-01': 'D - 3. KAT' },
      locked: {},
      options: { maxClassesPerSlot: 1 },
      commonLessons: {},
    });

    const assigned = result.schedule.monday?.[1]?.find(a => a.classId === 'c_d01');
    expect(assigned?.teacherId).toBe('t_near');
  });

  it('Tier 4: prefers nearest floor teacher with lesson over farther floor teacher when no free teachers', () => {
    const result = assignDuties({
      teachers: [
        { teacherId: 't_far_busy', teacherName: 'Far Teacher', dutyLocations: { monday: 'A- ZEMİN KAT' }, maxDutyPerDay: 6 },
        { teacherId: 't_near_busy', teacherName: 'Near Teacher', dutyLocations: { monday: 'C - 2. KAT' }, maxDutyPerDay: 6 },
      ],
      // No free teachers anywhere
      freeTeachers: { monday: { 1: new Set([]) } },
      classes: [{ classId: 'c_d01', className: '12-A' }],
      freeClasses: { monday: { 1: new Set(['c_d01']) } },
      classLocations: { 'c_d01': { monday: { 1: 'D-01' } } },
      locationZoneMapping: { 'D-01': 'D - 3. KAT' },
      locked: {},
      options: { maxClassesPerSlot: 1 },
      commonLessons: {},
    });

    const assigned = result.schedule.monday?.[1]?.find(a => a.classId === 'c_d01');
    expect(assigned?.teacherId).toBe('t_near_busy');
  });

  it('Fairness: picks teacher with fewer duties assigned so far today', () => {
    const result = assignDuties({
      teachers: [
        { teacherId: 't1', teacherName: 'Teacher 1', dutyLocations: { monday: 'C - 2. KAT' }, maxDutyPerDay: 6 },
        { teacherId: 't2', teacherName: 'Teacher 2', dutyLocations: { monday: 'C - 2. KAT' }, maxDutyPerDay: 6 },
      ],
      freeTeachers: {
        monday: {
          1: new Set(['t1', 't2']),
          2: new Set(['t1', 't2']),
        }
      },
      classes: [
        { classId: 'c1', className: '10-A' },
        { classId: 'c2', className: '10-B' },
      ],
      freeClasses: {
        monday: {
          1: new Set(['c1']),
          2: new Set(['c2']),
        }
      },
      classLocations: {
        c1: { monday: { 1: 'C-01' } },
        c2: { monday: { 2: 'C-02' } },
      },
      locationZoneMapping: {
        'C-01': 'C - 2. KAT',
        'C-02': 'C - 2. KAT',
      },
      locked: {},
      options: { maxClassesPerSlot: 1 },
      commonLessons: {},
    });

    const period1Assign = result.schedule.monday?.[1]?.[0]?.teacherId;
    const period2Assign = result.schedule.monday?.[2]?.[0]?.teacherId;
    expect(period1Assign).toBeDefined();
    expect(period2Assign).toBeDefined();
    expect(period1Assign).not.toBe(period2Assign);
  });

  it('does not assign absent teachers', () => {
    const result = assignDuties({
      teachers: [
        { teacherId: 't_absent', teacherName: 'Fatma Yılmaz', dutyLocations: { monday: 'C - 2. KAT' }, maxDutyPerDay: 6 },
        { teacherId: 't_active', teacherName: 'Ali Demir', dutyLocations: { monday: 'C - 2. KAT' }, maxDutyPerDay: 6 },
      ],
      freeTeachers: { monday: { 1: new Set(['t_absent', 't_active']) } },
      classes: [{ classId: 'c1', className: '10-A' }],
      freeClasses: { monday: { 1: new Set(['c1']) } },
      classLocations: { c1: { monday: { 1: 'C-01' } } },
      locationZoneMapping: { 'C-01': 'C - 2. KAT' },
      locked: {},
      options: { maxClassesPerSlot: 1 },
      commonLessons: {},
      absentPeople: [{ absentId: 't_absent', name: 'Fatma Yılmaz', reason: 'raporlu' }],
    });

    const assigned = result.schedule.monday?.[1]?.find(a => a.classId === 'c1');
    expect(assigned?.teacherId).toBe('t_active');
  });

  it('respects maxDutyPerDay limits', () => {
    const result = assignDuties({
      teachers: [
        { teacherId: 't1', teacherName: 'Teacher 1', dutyLocations: { monday: 'C - 2. KAT' }, maxDutyPerDay: 1 },
      ],
      freeTeachers: {
        monday: {
          1: new Set(['t1']),
          2: new Set(['t1']),
        }
      },
      classes: [
        { classId: 'c1', className: '10-A' },
        { classId: 'c2', className: '10-B' },
      ],
      freeClasses: {
        monday: {
          1: new Set(['c1']),
          2: new Set(['c2']),
        }
      },
      classLocations: {
        c1: { monday: { 1: 'C-01' } },
        c2: { monday: { 2: 'C-02' } },
      },
      locationZoneMapping: {
        'C-01': 'C - 2. KAT',
        'C-02': 'C - 2. KAT',
      },
      locked: {},
      options: { maxClassesPerSlot: 1 },
      commonLessons: {},
    });

    expect(result.schedule.monday?.[1]).toHaveLength(1);
    expect(result.schedule.monday?.[2] ?? []).toHaveLength(0);
    expect(result.unassigned.monday?.[2]).toContain('c2');
  });

  it('handles null candidates gracefully when teachers have lessons and no duty locations', () => {
    const result = assignDuties({
      teachers: [
        { teacherId: 't_no_zone_busy', teacherName: 'No Zone Busy', dutyLocations: {}, maxDutyPerDay: 6 },
        { teacherId: 't_free', teacherName: 'Free Teacher', dutyLocations: { monday: 'C - 2. KAT' }, maxDutyPerDay: 6 },
      ],
      freeTeachers: { monday: { 1: new Set(['t_free']) } },
      classes: [{ classId: 'c1', className: '10-A' }],
      freeClasses: { monday: { 1: new Set(['c1']) } },
      classLocations: { c1: { monday: { 1: 'C-01' } } },
      locationZoneMapping: { 'C-01': 'C - 2. KAT' },
      locked: {},
      options: { maxClassesPerSlot: 1 },
      commonLessons: {},
    });

    expect(result.schedule.monday?.[1]?.[0]?.teacherId).toBe('t_free');
  });

  it('does not assign duty teachers to İMES lessons because they are out-of-school duties', () => {
    const result = assignDuties({
      teachers: [
        { teacherId: 't1', teacherName: 'Nöbetçi Öğretmen', dutyLocations: { monday: 'Zemin Kat' }, maxDutyPerDay: 6 },
      ],
      freeTeachers: { monday: { 1: new Set(['t1']) } },
      classes: [
        { classId: 'c_imes', className: 'AMP İMES' },
      ],
      freeClasses: { monday: { 1: new Set(['c_imes']) } },
      classLocations: {},
      locationZoneMapping: {},
      locked: {},
      options: { maxClassesPerSlot: 1 },
      commonLessons: {},
    });

    expect(result.schedule.monday?.[1] ?? []).toHaveLength(0);
  });

  it('balances duties fairly across adjacent floors when a single teacher would otherwise get overloaded with 3+ duties', () => {
    // 3 classes on D - 3. KAT across periods 1, 2, 3
    // Teacher Hatice is on D - 3. KAT (dist 0), Teacher Omer is on C - 2. KAT (dist 1)
    // Both are free in all 3 periods. Hatice shouldn't take all 3 duties while Omer gets 0!
    const result = assignDuties({
      teachers: [
        { teacherId: 't_hatice', teacherName: 'Hatice', dutyLocations: { monday: 'D - 3. KAT' }, maxDutyPerDay: 6 },
        { teacherId: 't_omer', teacherName: 'Omer', dutyLocations: { monday: 'C - 2. KAT' }, maxDutyPerDay: 6 },
      ],
      freeTeachers: {
        monday: {
          1: new Set(['t_hatice', 't_omer']),
          2: new Set(['t_hatice', 't_omer']),
          3: new Set(['t_hatice', 't_omer']),
        },
      },
      classes: [
        { classId: 'c1', className: '11-A' },
        { classId: 'c2', className: '11-B' },
        { classId: 'c3', className: '11-C' },
      ],
      freeClasses: {
        monday: {
          1: new Set(['c1']),
          2: new Set(['c2']),
          3: new Set(['c3']),
        },
      },
      classLocations: {
        c1: { monday: { 1: 'D-01' } },
        c2: { monday: { 2: 'D-02' } },
        c3: { monday: { 3: 'D-03' } },
      },
      locationZoneMapping: {
        'D-01': 'D - 3. KAT',
        'D-02': 'D - 3. KAT',
        'D-03': 'D - 3. KAT',
      },
      locked: {},
      options: { maxClassesPerSlot: 1, preventConsecutive: false },
      commonLessons: {},
    });

    const assignedIds = [
      result.schedule.monday?.[1]?.[0]?.teacherId,
      result.schedule.monday?.[2]?.[0]?.teacherId,
      result.schedule.monday?.[3]?.[0]?.teacherId,
    ];

    // Both teachers should share the duties, neither should get all 3 while the other gets 0!
    expect(assignedIds).toContain('t_hatice');
    expect(assignedIds).toContain('t_omer');
  });
});

