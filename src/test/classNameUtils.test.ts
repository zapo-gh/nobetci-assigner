import { describe, it, expect } from 'vitest';
import {
  normalizeClassName,
  compareClassNames,
  sortClassNames,
  getTeacherDutyLocation,
  abbreviateDutyLocation,
  getClassroomName,
  isImesLesson,
  truncateClassName
} from '../utils/classNameUtils';

describe('classNameUtils', () => {
  describe('normalizeClassName', () => {
    it('standardizes raw class names from Excel to ATP or AMP prefixes', () => {
      // Classes with ATP stay ATP
      expect(normalizeClassName('ATP 10-A')).toBe('ATP 10-A');
      expect(normalizeClassName('ATP10A OTO')).toBe('ATP 10-A OTO');
      expect(normalizeClassName('ATP9A OTOM')).toBe('ATP 9-A OTOM');
      expect(normalizeClassName('ATP11A OTO')).toBe('ATP 11-A OTO');
      expect(normalizeClassName('ATP12A OTO')).toBe('ATP 12-A OTO');

      // Classes without ATP get AMP prefix
      expect(normalizeClassName('10 MOT')).toBe('AMP 10 MOT');
      expect(normalizeClassName('10 MOT E.A')).toBe('AMP 10 MOT E.A');
      expect(normalizeClassName('10 MUHASEB')).toBe('AMP 10 MUHASEB');
      expect(normalizeClassName('10 PAZARLA')).toBe('AMP 10 PAZARLA');
      expect(normalizeClassName('11 BİLİŞİM')).toBe('AMP 11 BİLİŞİM');
      expect(normalizeClassName('11 MOT')).toBe('AMP 11 MOT');
      expect(normalizeClassName('11MOT E.A.')).toBe('AMP 11 MOT E.A.');
      expect(normalizeClassName('11-G')).toBe('AMP 11-G');
      expect(normalizeClassName('11/G')).toBe('AMP 11-G');
      expect(normalizeClassName('11/I')).toBe('AMP 11-I');
      expect(normalizeClassName('11/G MUH')).toBe('AMP 11-G MUH');
      expect(normalizeClassName('12 GIDA')).toBe('AMP 12 GIDA');
      expect(normalizeClassName('12MUHASEBE')).toBe('AMP 12 MUHASEBE');
      expect(normalizeClassName('12 PAZAR')).toBe('AMP 12 PAZAR');

      // Classes that already have AMP
      expect(normalizeClassName('AMP 9A BİL')).toBe('AMP 9-A BİL');
      expect(normalizeClassName('AMP9F GIDA')).toBe('AMP 9-F GIDA');
      expect(normalizeClassName('AMP10A BİL')).toBe('AMP 10-A BİL');
      expect(normalizeClassName('AMP10G-I')).toBe('AMP 10-G-I');
      expect(normalizeClassName('AMP 11 A-E')).toBe('AMP 11 A-E');
      expect(normalizeClassName('AMP11/G-I')).toBe('AMP 11-G-I');
      expect(normalizeClassName('AMP12F-G-I')).toBe('AMP 12-F-G-I');

      // Special units
      expect(normalizeClassName('ÖZEL EĞİTİM')).toBe('ÖZEL EĞİTİM');
      expect(normalizeClassName('ÖZEL EĞİTM')).toBe('ÖZEL EĞİTİM');
    });

    it('strips times and room parentheses correctly', () => {
      expect(normalizeClassName('10 MOT E.A ELKARAÇTE911 (A351)\n08:30-09:10')).toBe('AMP 10 MOT E.A');
      expect(normalizeClassName('11 BİLİŞİM (D-04) 11:50-12:30')).toBe('AMP 11 BİLİŞİM');
    });
  });

  describe('compareClassNames and sortClassNames', () => {
    it('sorts classes in school order: 9 before 10, AMP before ATP', () => {
      const input = [
        'AMP 10 MOT',
        'AMP 11 BİLİŞİM',
        'AMP 9-A BİL',
        'ATP 10-A OTO',
        'ATP 9-A OTOM',
        'AMP 12 GIDA',
        'ÖZEL EĞİTİM',
        'AMP 9-B BİL',
      ];

      const sorted = sortClassNames(input);

      expect(compareClassNames('AMP 9-A', 'AMP 10-A')).toBeLessThan(0);
      expect(compareClassNames('AMP 10-A', 'ATP 10-A')).toBeLessThan(0);

      expect(sorted).toEqual([
        'AMP 9-A BİL',
        'AMP 9-B BİL',
        'ATP 9-A OTOM',
        'AMP 10 MOT',
        'ATP 10-A OTO',
        'AMP 11 BİLİŞİM',
        'AMP 12 GIDA',
        'ÖZEL EĞİTİM',
      ]);
    });
  });

  describe('abbreviateDutyLocation', () => {
    it('abbreviates long location descriptions and keeps short ones intact', () => {
      expect(abbreviateDutyLocation('1. Kat')).toBe('1. Kat');
      expect(abbreviateDutyLocation('Bahçe')).toBe('Bahçe');
      expect(abbreviateDutyLocation('Zemin Kat')).toBe('Zemin Kat');
      expect(abbreviateDutyLocation('Zemin Kat ve Bahçe')).toContain('Zem.');
      expect(abbreviateDutyLocation('Spor Salonu')).toBe('Spor Sal.');
      expect(abbreviateDutyLocation('Bilişim Atölyesi')).toBe('Bilişim Atöl.');
      expect(abbreviateDutyLocation('Fizik Laboratuvarı')).toBe('Fizik Lab.');
    });
  });

  describe('getTeacherDutyLocation', () => {
    it('retrieves correct duty location based on day key mapping', () => {
      const teacher = {
        teacherName: 'Özgür Albayrak',
        dutyLocations: {
          friday: '2. Kat',
          monday: 'Zemin Kat',
        },
      };

      expect(getTeacherDutyLocation(teacher, 'Fri')).toBe('2. Kat');
      expect(getTeacherDutyLocation(teacher, 'Mon')).toBe('Zemin Kat');
      expect(getTeacherDutyLocation(teacher, 'Tue')).toBe('');
    });
  });

  describe('getClassroomName', () => {
    it('extracts primary classroom name from classLocations structure', () => {
      const mockLocations = {
        'AMP 11-G': {
          friday: {
            '1': { location: 'D-14', subject: 'MATEMATİK' },
            '2': { location: 'D-14', subject: 'MATEMATİK' },
            '3': { location: 'D-14', subject: 'FİZİK' },
            '4': { location: 'BİL LAB', subject: 'BİLİŞİM' },
          },
        },
      };

      expect(getClassroomName(mockLocations, '11-G', 'Fri')).toBe('D-14');
      expect(getClassroomName(mockLocations, 'AMP 11-G', 'Fri')).toBe('D-14');
      expect(getClassroomName(mockLocations, 'AMP 11-G', 'Mon')).toBe('D-14'); // fallback to all days
      expect(getClassroomName(mockLocations, 'AMP 12-A', 'Fri')).toBe('');
    });

    it('matches class name with branch or field suffixes in classLocations', () => {
      const mockLocations = {
        'AMP 12-A BİL': {
          friday: {
            '1': { location: 'D-07', subject: 'TDE' },
            '2': { location: 'D-07', subject: 'TDE' },
          },
        },
      };

      expect(getClassroomName(mockLocations, 'AMP 12-A', 'Fri')).toBe('D-07');
      expect(getClassroomName(mockLocations, '12-A', 'Fri')).toBe('D-07');
    });
  });

  describe('isImesLesson', () => {
    it('correctly identifies İMES and coordinator duties', () => {
      expect(isImesLesson('AMP İMES')).toBe(true);
      expect(isImesLesson('ATP İMES')).toBe(true);
      expect(isImesLesson('İMES')).toBe(true);
      expect(isImesLesson('imes')).toBe(true);
      expect(isImesLesson('AMP IMES')).toBe(true);
      expect(isImesLesson('İMES KOORDİNATÖRLÜK')).toBe(true);
      expect(isImesLesson('İŞLETMEDE KOORDİNATÖR')).toBe(true);
    });

    it('returns false for standard classes or empty inputs', () => {
      expect(isImesLesson('AMP 10-A')).toBe(false);
      expect(isImesLesson('ATP 11-B')).toBe(false);
      expect(isImesLesson('12-C')).toBe(false);
      expect(isImesLesson('ÖZEL EĞİTİM')).toBe(false);
      expect(isImesLesson('')).toBe(false);
      expect(isImesLesson(null)).toBe(false);
      expect(isImesLesson(undefined)).toBe(false);
    });
  });

  describe('truncateClassName', () => {
    it('keeps class names at or below maxLen intact', () => {
      expect(truncateClassName('10-A')).toBe('10-A');
      expect(truncateClassName('AMP 10-A')).toBe('AMP 10-A');
      expect(truncateClassName('ATP 11-B')).toBe('ATP 11-B');
      expect(truncateClassName('AMP 10-A/B', 10)).toBe('AMP 10-A/B'); // exact length 10
    });

    it('truncates long class names with single ellipsis character to fit compact cells', () => {
      expect(truncateClassName('AMP 10 PAZARLA')).toBe('AMP 10 PA…');
      expect(truncateClassName('AMP 10 PAZARLAMA')).toBe('AMP 10 PA…');
      expect(truncateClassName('10-I PAZARLAMA')).toBe('10-I PAZA…');
    });

    it('trims trailing whitespace before appending ellipsis', () => {
      // 'AMP 10 ' is length 7, if truncated at 7 it shouldn't produce 'AMP 10 …'
      expect(truncateClassName('AMP 10   TEST', 8)).toBe('AMP 10…');
    });

    it('respects custom maxLen parameter', () => {
      expect(truncateClassName('AMP 10-A', 5)).toBe('AMP…');
      expect(truncateClassName('AMP 10-A', 15)).toBe('AMP 10-A');
    });

    it('handles empty, undefined, and non-string inputs safely', () => {
      expect(truncateClassName('')).toBe('');
      expect(truncateClassName(null)).toBe('');
      expect(truncateClassName(undefined)).toBe('');
      expect(truncateClassName(123 as any)).toBe('');
    });
  });
});
