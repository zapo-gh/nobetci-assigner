import { describe, it, expect } from 'vitest';
import { normalizeTeacherName, normalizeForComparison } from '../utils/nameNormalization';

describe('nameNormalization', () => {
  describe('normalizeTeacherName', () => {
    it('should trim and uppercase the name', () => {
      expect(normalizeTeacherName(' ali  ')).toBe('ALI'); // Depending on locale, but it just calls toUpperCase()
      expect(normalizeTeacherName('Veli Yılmaz')).toBe('VELI YILMAZ');
    });

    it('should return empty string for invalid inputs', () => {
      expect(normalizeTeacherName(null)).toBe('');
      expect(normalizeTeacherName(undefined)).toBe('');
      expect(normalizeTeacherName(123)).toBe('');
    });
  });

  describe('normalizeForComparison', () => {
    it('should convert Turkish characters to English equivalents for reliable comparison', () => {
      expect(normalizeForComparison('ŞöĞüÇİ')).toBe('SOGUCI');
    });

    it('should handle whitespace variations', () => {
      expect(normalizeForComparison('  ali   yılmaz ')).toBe('ALI YILMAZ');
    });
  });
});
