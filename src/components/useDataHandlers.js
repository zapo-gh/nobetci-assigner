
import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  sanitizeInput,
  toInt,
  validateTeacherData,
  validateClassData,
  validateAbsentRow,
  normalizeReason,
  mapSetToArray,
  arrayToSetMap,
  readFileAsTextSmart,
  PERIODS,
} from '../utils/helpers';

export function useDataHandlers({
  addNotification,
  periods,
  day,
  options,
  assignment,
  setDay,
  setPeriods,
  setTeachers: setTeachersExt,
  setClasses: setClassesExt,
  setTeacherFree,
  setClassFree,
  setAbsentPeople: setAbsentPeopleExt,
  setClassAbsence,
  setOptions,
  setActiveSection,
  teacherFree,
  classFree,
  classAbsence,
}) {
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [absentPeople, setAbsentPeople] = useState([]);
  const [loading, setLoading] = useState({
    teachers: false,
    classes: false,
    absents: false,
  });

  const loadTeachersCSV = useCallback(
    async (file) => {
      if (!file) {
        addNotification('Lütfen öğretmen CSV dosyası seçin', 'warning');
        return;
      }
      setLoading((s) => ({ ...s, teachers: true }));
      try {
        const text = await readFileAsTextSmart(file);
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        const rows = (parsed.data || [])
          .map((r) => ({
            teacherId: sanitizeInput(r.teacherId || r.id || ''),
            teacherName: sanitizeInput(r.teacherName || r.name || ''),
            maxDutyPerDay: toInt(r.maxDutyPerDay || r.max || 6, 6),
          }))
          .filter((r) => r.teacherId && r.teacherName);
        const errs = rows.flatMap((r, i) =>
          validateTeacherData(r).map((msg) => `Satır ${i + 2}: ${msg}`)
        );
        if (errs.length) {
          addNotification(
            `CSV hataları: ${errs.slice(0, 3).join(' | ')}${
              errs.length > 3 ? ' ...' : ''
            }`,
            'error'
          );
          return;
        }
        setTeachers(rows);
        setTeachersExt(rows);
        setTeacherFree((prev) => {
          const next = { ...prev };
          for (const p of periods) {
            if (!next[p]) next[p] = new Set();
          }
          return next;
        });
        addNotification(`${rows.length} öğretmen yüklendi`, 'success');
        setActiveSection('classes');
      } catch (e) {
        console.error(e);
        addNotification(`CSV okuma hatası: ${e.message}`, 'error');
      } finally {
        setLoading((s) => ({ ...s, teachers: false }));
      }
    },
    [addNotification, periods, setTeachersExt, setTeacherFree, setActiveSection]
  );

  const loadClassesCSV = useCallback(
    async (file) => {
      if (!file) {
        addNotification('Lütfen sınıf CSV dosyası seçin', 'warning');
        return;
      }
      setLoading((s) => ({ ...s, classes: true }));
      try {
        const text = await readFileAsTextSmart(file);
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        const rows = (parsed.data || [])
          .map((r) => ({
            classId: sanitizeInput(r.classId || r.id || ''),
            className: sanitizeInput(r.className || r.name || ''),
          }))
          .filter((r) => r.classId && r.className);
        const errs = rows.flatMap((r, i) =>
          validateClassData(r).map((msg) => `Satır ${i + 2}: ${msg}`)
        );
        if (errs.length) {
          addNotification(
            `CSV hataları: ${errs.slice(0, 3).join(' | ')}${
              errs.length > 3 ? ' ...' : ''
            }`,
            'error'
          );
          return;
        }
        setClasses(rows);
        setClassesExt(rows);
        setClassFree((prev) => {
          const next = { ...prev };
          for (const p of periods) {
            if (!next[p]) next[p] = new Set();
          }
          return next;
        });
        addNotification(`${rows.length} sınıf yüklendi`, 'success');
        setActiveSection('absents');
      } catch (e) {
        console.error(e);
        addNotification(`CSV okuma hatası: ${e.message}`, 'error');
      } finally {
        setLoading((s) => ({ ...s, classes: false }));
      }
    },
    [addNotification, periods, setClassesExt, setClassFree, setActiveSection]
  );

  const loadAbsentsCSV = useCallback(
    async (file) => {
      if (!file) {
        addNotification(
          'Lütfen “okula gelemeyen” CSV dosyası seçin',
          'warning'
        );
        return;
      }
      setLoading((s) => ({ ...s, absents: true }));
      try {
        const text = await readFileAsTextSmart(file);
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        let i = 1;
        const rows = (parsed.data || [])
          .map((r) => {
            const name = sanitizeInput(r.name || r.teacherName || '');
            const reason = normalizeReason(r.reason || '');
            let absentId = sanitizeInput(r.absentId || r.id || '');
            if (!absentId) absentId = `A${String(i++).padStart(2, '0')}`;
            return { absentId, name, reason };
          })
          .filter((r) => r.name && r.reason);
        const errs = rows.flatMap((r, idx) =>
          validateAbsentRow(r).map((msg) => `Satır ${idx + 2}: ${msg}`)
        );
        if (errs.length) {
          addNotification(
            `CSV hataları: ${errs.slice(0, 3).join(' | ')}${
              errs.length > 3 ? ' ...' : ''
            }`,
            'error'
          );
          return;
        }
        setAbsentPeople(rows);
        setAbsentPeopleExt(rows);
        addNotification(
          `${rows.length} izinli/raporlu kayıt yüklendi`,
          'success'
        );
        setActiveSection('schedule');
      } catch (e) {
        console.error(e);
        addNotification(`CSV okuma hatası: ${e.message}`, 'error');
      } finally {
        setLoading((s) => ({ ...s, absents: false }));
      }
    },
    [addNotification, setAbsentPeopleExt, setActiveSection]
  );

  // Prompt kullanan fonksiyonlar kaldırıldı - artık modal'lar kullanılıyor

  function exportExcel() {
    try {
      const rows = [];
      for (const p of periods) {
        const arr = assignment?.[day]?.[p] || [];
        arr.forEach((a) => {
          rows.push({
            Day: day,
            Period: p,
            ClassId: a.classId,
            ClassName:
              classes.find((c) => c.classId === a.classId)?.className || '',
            TeacherId: a.teacherId,
            TeacherName:
              teachers.find((t) => t.teacherId === a.teacherId)?.teacherName ||
              '',
          });
        });
      }
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${day}`);
      XLSX.writeFile(wb, `gorevlendirme_${day}.xlsx`);
      addNotification('Excel dışa aktarıldı', 'success');
    } catch (e) {
      console.error(e);
      addNotification('Excel yazılamadı', 'error');
    }
  }

  function saveJSON() {
    const payload = {
      day,
      periods,
      teachers,
      classes,
      teacherFree: mapSetToArray(teacherFree),
      classFree: mapSetToArray(classFree),
      absentPeople,
      classAbsence,
      options,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nobetci-data.json';
    a.click();
    URL.revokeObjectURL(url);
    addNotification('JSON kaydedildi', 'success');
  }

  function loadJSON(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        setDay(d.day || 'Mon');
        setPeriods(
          Array.isArray(d.periods) && d.periods.length ? d.periods : PERIODS
        );
        setTeachers(d.teachers || []);
        setTeachersExt(d.teachers || []);
        setClasses(d.classes || []);
        setClassesExt(d.classes || []);
        setTeacherFree(arrayToSetMap(d.teacherFree));
        setClassFree(arrayToSetMap(d.classFree));
        setAbsentPeople(
          Array.isArray(d.absentPeople) ? d.absentPeople : []
        );
        setAbsentPeopleExt(
          Array.isArray(d.absentPeople) ? d.absentPeople : []
        );
        setClassAbsence(d.classAbsence || {});
        setOptions(
          d.options || {
            preventConsecutive: true,
            maxClassesPerSlot: 1,
            allowOverload: false,
          }
        );
        addNotification('JSON yüklendi', 'success');
      } catch (err) {
        console.error('JSON yükleme hatası:', err);
        addNotification(`JSON okunamadı: ${err.message}`, 'error');
      }
    };
    r.readAsText(f);
  }

  return {
    teachers,
    classes,
    absentPeople,
    loading,
    loadTeachersCSV,
    loadClassesCSV,
    loadAbsentsCSV,
    // addTeacher, addClass, addAbsent - artık modal'lar kullanılıyor
    exportExcel,
    saveJSON,
    loadJSON,
    setTeachers,
    setClasses,
    setAbsentPeople,
  };
}
