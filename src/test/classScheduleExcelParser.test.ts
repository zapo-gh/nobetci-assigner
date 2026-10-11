import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseClassLocationsFromExcel } from '../utils/classScheduleExcelParser';
import { parseTeacherSchedulesFromExcel } from '../utils/teacherScheduleExcelParser';

describe('parseClassLocationsFromExcel', () => {
  it('correctly parses multi-row days and all 5 weekdays for ATP 10-A', async () => {
    const tPath = path.resolve(__dirname, '../../OgretmenElProgrami.xlsx');
    const cPath = path.resolve(__dirname, '../../SinifElProgrami.xlsx');

    const tBuf = fs.readFileSync(tPath);
    const cBuf = fs.readFileSync(cPath);

    const tFile = {
      name: 'OgretmenElProgrami.xlsx',
      arrayBuffer: async () => new Uint8Array(tBuf).buffer
    };
    const teacherSchedules = await parseTeacherSchedulesFromExcel(tFile);

    const cFile = {
      name: 'SinifElProgrami.xlsx',
      arrayBuffer: async () => new Uint8Array(cBuf).buffer
    };
    const locations = await parseClassLocationsFromExcel(cFile, teacherSchedules, []);

    // Check ATP 10-A is present
    const atpKey = Object.keys(locations).find(k => k.includes('10') && k.includes('A') && k.includes('ATP'));
    expect(atpKey).toBeDefined();

    const schedule = locations[atpKey!];

    // Check all 5 days are present
    expect(schedule.monday).toBeDefined();
    expect(schedule.tuesday).toBeDefined();
    expect(schedule.wednesday).toBeDefined();
    expect(schedule.thursday).toBeDefined();
    expect(schedule.friday).toBeDefined();

    // Monday (Pazartesi): Periods 1 and 2 should be FELSEFE with Sema Kesekler in B-05
    expect(schedule.monday['1'].subject).toBe('FELSEFE');
    expect(schedule.monday['1'].location).toBe('B-05');
    expect(schedule.monday['2'].subject).toBe('FELSEFE');
    expect(schedule.monday['2'].location).toBe('B-05');

    // Tuesday (Salı): Periods 1 to 9 should be ATÖLYE in OTOM 3
    expect(schedule.tuesday['1'].subject).toBe('ATÖLYE');
    expect(schedule.tuesday['1'].location).toBe('OTOM 3');
    expect(schedule.tuesday['9'].subject).toBe('ATÖLYE');
    expect(schedule.tuesday['10'].subject).toBe('SEÇMELİ TÜRK DÜŞÜNCE TARİHİ');

    // Wednesday (Çarşamba): Periods 1 and 2 should be BEDEN EĞİTİMİ VE SPOR
    expect(schedule.wednesday['1'].subject).toBe('BEDEN EĞİTİMİ VE SPOR');
    expect(schedule.wednesday['3'].subject).toBe('TÜRK DİLİ VE EDEBİYATI');

    // Thursday (Perşembe): Period 1 should be SEÇMELİ ADABI MUAŞERET
    expect(schedule.thursday['1'].subject).toBe('SEÇMELİ ADABI MUAŞERET');
    expect(schedule.thursday['2'].subject).toBe('MATEMATİK');

    // Friday (Cuma): Period 1 should be MODELLEME VE MONTAJ
    expect(schedule.friday['1'].subject).toBe('MODELLEME VE MONTAJ');
    expect(schedule.friday['5'].subject).toBe('REHBERLİK VE YÖNLENDİRME');
  });
});
