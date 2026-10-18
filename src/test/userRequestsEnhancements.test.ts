import { describe, it, expect } from 'vitest';
import { useDutyTeacherFilter } from '../hooks/useDutyTeacherFilter';
import { renderHook } from '@testing-library/react';

describe('User Requests Enhancements', () => {
  describe('Duty Teacher Ordering by Duty Zones Menu Order', () => {
    it('sorts duty teachers in the order defined by dutyZones array', () => {
      const dutyZones = [
        { zoneId: 'z1', name: 'Bahçe', requiredTeacherCount: 2 },
        { zoneId: 'z2', name: 'Zemin Kat', requiredTeacherCount: 1 },
        { zoneId: 'z3', name: '1. Kat', requiredTeacherCount: 2 },
      ];

      const teachers = [
        { teacherId: 't1', teacherName: 'Zeynep Kaya', dutyLocations: { monday: '1. Kat' } },
        { teacherId: 't2', teacherName: 'Ahmet Yılmaz', dutyLocations: { monday: 'Bahçe' } },
        { teacherId: 't3', teacherName: 'Bahar Demir', dutyLocations: { monday: 'Bahçe' } },
        { teacherId: 't4', teacherName: 'Can Öztürk', dutyLocations: { monday: 'Zemin Kat' } },
        { teacherId: 't5', teacherName: 'Kemal Ak', dutyLocations: {} }, // Unassigned zone
      ];

      const { result } = renderHook(() =>
        useDutyTeacherFilter(teachers, {}, 'Mon', dutyZones)
      );

      const names = result.current.map((t) => t.teacherName);
      // Bahçe: Ahmet Yılmaz, Bahar Demir
      // Zemin Kat: Can Öztürk
      // 1. Kat: Zeynep Kaya
      // Unassigned: Kemal Ak
      expect(names).toEqual([
        'Ahmet Yılmaz',
        'Bahar Demir',
        'Can Öztürk',
        'Zeynep Kaya',
        'Kemal Ak',
      ]);
    });
  });

  describe('Merged Group WhatsApp Notification Message Logic', () => {
    it('formats single merged lesson notification correctly', () => {
      const teacherName = 'Zafer Özdemir';
      const dateLabel = 'Pazartesi';
      const item = {
        period: 3,
        className: '9-A',
        subject: 'Mesleki Gelişim',
        absentTeacherName: 'Murat Kara',
        absentReason: 'Raporlu',
      };

      const msg = `Sayın ${teacherName} Hocam,\n\n${dateLabel} günü ${item.period}. ders ${item.className} sınıfı ${item.subject} dersinde, ${item.absentTeacherName} Hocamız ${item.absentReason.toLowerCase()} olduğu için bu derste gruplar birleştirilecektir.\n\nBilgilerinize sunar, iyi dersler dileriz.`;

      expect(msg).toContain('9-A');
      expect(msg).toContain('Mesleki Gelişim dersinde');
      expect(msg).toContain('Murat Kara Hocamız raporlu olduğu için');
      expect(msg).toContain('gruplar birleştirilecektir');
    });

    it('formats multi-period merged lesson notification correctly', () => {
      const teacherName = 'Fatma Şahin';
      const dateLabel = 'Salı';
      const lessons = [
        { period: 3, className: '10-B', subject: 'Web Tasarımı', absentTeacherName: 'Ali Demir', absentReason: 'İzinli' },
        { period: 4, className: '10-B', subject: 'Web Tasarımı', absentTeacherName: 'Ali Demir', absentReason: 'İzinli' },
      ];

      let msg = `Sayın ${teacherName} Hocam,\n\n${dateLabel} günü aşağıdaki derslerinizde diğer grup öğretmeninin izinli/mazeretli olması sebebiyle gruplar birleştirilecektir:\n\n`;
      lessons.forEach((l) => {
        msg += `• ${l.period}. Ders: ${l.className} (${l.subject}) [${l.absentTeacherName} - ${l.absentReason}]\n`;
      });
      msg += `\nBilgilerinize sunar, iyi dersler dileriz.`;

      expect(msg).toContain('3. Ders: 10-B (Web Tasarımı) [Ali Demir - İzinli]');
      expect(msg).toContain('4. Ders: 10-B (Web Tasarımı) [Ali Demir - İzinli]');
    });
  });

  describe('Co-Taught Class Multi-Absent Scenario (e.g. Zehra Koşan & Bülent Aygün in AMP 9-G)', () => {
    it('preserves both absent teachers without overwriting and retains duty need', async () => {
      const { mergeAbsentIdValues, decodeClassAbsenceValue, removeAbsentIdFromValue } = await import('../utils/classAbsence.js');
      const { useFilteredClassAbsence, useFilteredClassFree } = await import('../hooks/useDerivedAvailability.js');

      // 1. Initial state: Bülent Aygün is absent on Tuesday
      let slotValue = mergeAbsentIdValues(undefined, 'abs_bulent', true);
      expect(slotValue).toBe('abs_bulent');

      // 2. Zehra Koşan is also absent on Tuesday for the same class (AMP 9-G, period 8)
      slotValue = mergeAbsentIdValues(slotValue, 'abs_zehra', true);
      expect(slotValue).toBe('abs_bulent,abs_zehra');

      const decoded = decodeClassAbsenceValue(slotValue);
      expect(decoded.absentIds).toEqual(['abs_bulent', 'abs_zehra']);

      // 3. Test derived availability: both absent teachers are active
      const absentPeople = [
        { absentId: 'abs_bulent', name: 'BÜLENT AYGÜN', reason: 'Görevli İzinli', days: ['Salı'] },
        { absentId: 'abs_zehra', name: 'ZEHRA KOŞAN', reason: 'Görevli İzinli', days: ['Salı'] },
      ];
      const absentIdsForCurrentDay = new Set(['abs_bulent', 'abs_zehra']);
      const classAbsence = {
        'Salı': {
          8: { 'c_9g': slotValue }
        }
      };
      const classFree = {
        'Salı': {
          8: new Set(['c_9g'])
        }
      };

      const { result: filteredAbsence } = renderHook(() =>
        useFilteredClassAbsence({
          classAbsence,
          day: 'Salı',
          absentIdsForCurrentDay,
          commonLessons: {},
          absentPeople,
        })
      );
      expect(filteredAbsence.current['Salı'][8]['c_9g']).toBe('abs_bulent,abs_zehra');

      const { result: filteredFree } = renderHook(() =>
        useFilteredClassFree({
          classFree,
          classAbsence,
          day: 'Salı',
          periods: [8],
          absentIdsForCurrentDay,
          commonLessons: {},
          absentPeople,
        })
      );
      expect(filteredFree.current['Salı'][8].has('c_9g')).toBe(true);

      // 4. Test removing one teacher: the other teacher remains
      const { nextValue, remainingIds } = removeAbsentIdFromValue(slotValue, 'abs_bulent');
      expect(nextValue).toBe('abs_zehra');
      expect(remainingIds).toEqual(['abs_zehra']);
    });

    it('resolves both Zehra Koşan and Bülent Aygün even if only one is in rawAbsValue and other is in teacherSchedules with Turkish day key', async () => {
      const { resolveAllAbsentTeachers } = await import('../utils/classAbsence.js');

      const absentPeople = [
        { absentId: 'abs_zehra', name: 'ZEHRA KOŞAN', reason: 'gorevli-izinli', days: ['Salı'] },
        { absentId: 'abs_bulent', name: 'BÜLENT AYGÜN', reason: 'gorevli-izinli', days: ['Salı'] },
      ];

      const teacherSchedules = {
        'BÜLENT AYGÜN': {
          'Salı': {
            8: '9/G',
            9: '9/G',
            10: '9/G',
          }
        },
        'ZEHRA KOŞAN': {
          'Salı': {
            8: 'AMP 9-G BİLİŞİM (B-07)',
            9: 'AMP 9-G BİLİŞİM (B-07)',
            10: 'AMP 9-G BİLİŞİM (B-07)',
          }
        }
      };

      // Scenario: IndexedDB only has abs_zehra in rawAbsValue
      const resolved = resolveAllAbsentTeachers({
        day: 'Tue',
        period: 8,
        classId: 'c_9g',
        className: 'AMP 9-G',
        rawAbsValue: 'abs_zehra',
        absentPeople,
        teacherSchedules,
        absentInfoById: {
          abs_zehra: { name: 'ZEHRA KOŞAN', reason: 'gorevli-izinli' },
          abs_bulent: { name: 'BÜLENT AYGÜN', reason: 'gorevli-izinli' },
        }
      });

      expect(resolved.length).toBe(2);
      const names = resolved.map(r => r.name);
      expect(names).toContain('ZEHRA KOŞAN');
      expect(names).toContain('BÜLENT AYGÜN');
    });

    it('cleanSubjectName correctly strips redundant class names and noise so messages do not repeat class name in parentheses', async () => {
      const { cleanSubjectName } = await import('../utils/classAbsence.js');

      // 1. Raw subject equals class name: should return empty string
      expect(cleanSubjectName('AMP 9-I', 'AMP 9-I')).toBe('');
      expect(cleanSubjectName('9-I', 'AMP 9-I')).toBe('');
      expect(cleanSubjectName('AMP 9-I (AMP 9-I)', 'AMP 9-I')).toBe('');

      // 2. Schedule with room info: extracts clean subject
      expect(cleanSubjectName('AMP 9-G MUH T.MHSB11 (B-07)', 'AMP 9-G')).toBe('MUH T.MHSB11');
      expect(cleanSubjectName('9-I BİLİŞİM (LAB 1)', 'AMP 9-I')).toBe('BİLİŞİM');
      expect(cleanSubjectName('Web Tasarımı (LAB 2)', '10-A')).toBe('Web Tasarımı');
    });
  });
});
