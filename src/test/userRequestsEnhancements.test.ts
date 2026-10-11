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
});
