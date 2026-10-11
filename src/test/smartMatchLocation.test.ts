import { describe, it, expect } from 'vitest';
import { smartMatchLocation } from '../components/DutyZonesSection';

describe('smartMatchLocation', () => {
  const sampleZones = [
    { zoneId: 'z1', name: 'A- ZEMİN KAT' },
    { zoneId: 'z2', name: 'A- 1. KAT' },
    { zoneId: 'z3', name: 'A- 2. KAT' },
    { zoneId: 'z4', name: 'B- ZEMİN KAT' },
    { zoneId: 'z5', name: 'ARKA BAHÇE -MOTOR ATÖLYESİ ÇEVRESİ' }
  ];

  it('correctly matches ground floor rooms with block A', () => {
    expect(smartMatchLocation('A-01', sampleZones)).toBe('A- ZEMİN KAT');
    expect(smartMatchLocation('A-02', sampleZones)).toBe('A- ZEMİN KAT');
    expect(smartMatchLocation('A-03', sampleZones)).toBe('A- ZEMİN KAT');
    expect(smartMatchLocation('A-02/D-01', sampleZones)).toBe('A- ZEMİN KAT');
  });

  it('correctly matches first floor and second floor rooms', () => {
    expect(smartMatchLocation('A-101', sampleZones)).toBe('A- 1. KAT');
    expect(smartMatchLocation('A-201', sampleZones)).toBe('A- 2. KAT');
  });

  it('correctly matches workshop and garden rooms', () => {
    expect(smartMatchLocation('A-350', sampleZones)).toBe('ARKA BAHÇE -MOTOR ATÖLYESİ ÇEVRESİ');
    expect(smartMatchLocation('A351', sampleZones)).toBe('ARKA BAHÇE -MOTOR ATÖLYESİ ÇEVRESİ');
    expect(smartMatchLocation('A352', sampleZones)).toBe('ARKA BAHÇE -MOTOR ATÖLYESİ ÇEVRESİ');
    expect(smartMatchLocation('Motor Atölyesi', sampleZones)).toBe('ARKA BAHÇE -MOTOR ATÖLYESİ ÇEVRESİ');
  });

  it('returns null for unknown rooms without match', () => {
    expect(smartMatchLocation('1', sampleZones)).toBeNull();
  });
});
