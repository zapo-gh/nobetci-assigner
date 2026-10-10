// @ts-nocheck
import * as XLSX from '@e965/xlsx';

const dayMapping = {
  'pazartesi': 'monday',
  'salı': 'tuesday',
  'sali': 'tuesday',
  'çarşamba': 'wednesday',
  'carsamba': 'wednesday',
  'perşembe': 'thursday',
  'persembe': 'thursday',
  'cuma': 'friday'
};

function detectPeriodColumns(headerRow) {
  const mapping = {};
  if (!Array.isArray(headerRow)) return mapping;
  for (let col = 0; col < headerRow.length; col++) {
    const raw = headerRow[col];
    if (raw == null) continue;
    const text = String(raw).replace(/\n/g, ' ').trim();
    const m = text.match(/^(?:\()?(\d{1,2})(?:\)|\.Ders)/i);
    if (m) {
      const periodNum = parseInt(m[1], 10);
      if (periodNum >= 1 && periodNum <= 12 && mapping[periodNum] == null) {
        mapping[periodNum] = col;
      }
    }
  }
  if (Object.keys(mapping).length === 0) {
    return { 1: 2, 2: 4, 3: 5, 4: 6, 5: 7, 6: 8, 7: 10, 8: 11, 9: 12, 10: 14, 11: 15 };
  }
  return mapping;
}

export function matchTeacherAbbr(abbr, fullName) {
  if (!abbr || !fullName) return false;
  const cleanAbbr = String(abbr).trim().toLocaleUpperCase('tr-TR');
  const cleanFull = String(fullName).trim().toLocaleUpperCase('tr-TR');
  
  if (cleanAbbr === cleanFull) return true;
  
  const fullParts = cleanFull.split(/\s+/);
  const fullLastName = fullParts[fullParts.length - 1];
  const fullFirstInitial = fullParts[0].charAt(0);

  if (cleanAbbr.includes('.')) {
    const dotIdx = cleanAbbr.lastIndexOf('.');
    const initial = cleanAbbr.substring(0, dotIdx).replace(/[^A-ZÇĞİÖŞÜ]/g, '').charAt(0);
    const lastName = cleanAbbr.substring(dotIdx + 1).trim();

    const lastNameMatch = (lastName === fullLastName) ||
      (lastName.length >= 4 && fullLastName.startsWith(lastName)) ||
      (fullLastName.length >= 4 && lastName.startsWith(fullLastName));

    if (lastNameMatch) {
      if (!initial || initial === fullFirstInitial) return true;
    }
    return false;
  }

  // Without dot: e.g. "KAYALAR" or full name match
  if (cleanAbbr === fullLastName) return true;
  if (cleanAbbr.length >= 5 && fullLastName.startsWith(cleanAbbr)) return true;

  return false;
}

export async function parseClassLocationsFromExcel(file, teacherSchedules, teachersList) {
  let arrayBuffer;
  if (file && typeof file.arrayBuffer === 'function') {
    arrayBuffer = await file.arrayBuffer();
  } else if (file && file._buffer) {
    arrayBuffer = file._buffer;
  } else if (file instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(file))) {
    arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  } else {
    arrayBuffer = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

  const classLocations = {};
  const globalSubjectMap = {};

  // Find all "Dersler\nGünler" headers to identify schedule blocks
  const headerRows = [];
  jsonData.forEach((row, index) => {
    if (row && row[0] && String(row[0]).includes('Günler')) {
      headerRows.push(index);
    }
  });

  headerRows.forEach((gunlerRowIndex, blockIdx) => {
    const nextHeaderRow = headerRows[blockIdx + 1] || jsonData.length;
    const periodColumns = detectPeriodColumns(jsonData[gunlerRowIndex]);

    // Find where schedule table ends (at the 'Sr' table header or next block)
    let srRowIndex = nextHeaderRow;
    for (let r = gunlerRowIndex + 1; r < nextHeaderRow; r++) {
      const firstCell = String((jsonData[r] || [])[0] || '').trim().toLowerCase();
      if (firstCell === 'sr') {
        srRowIndex = r;
        break;
      }
    }

    // Extract the 'Sr' table for this specific block
    const blockSubjectDetails = {}; // code -> { name, teacher, location }
    if (srRowIndex < nextHeaderRow) {
      const srHeader = jsonData[srRowIndex] || [];
      let codeCol = -1, nameCol = -1, teacherCol = -1, yerCol = -1;
      for (let c = 0; c < srHeader.length; c++) {
        const hVal = String(srHeader[c] || '').replace(/\n/g, ' ').trim().toLowerCase();
        if (hVal.includes('ders kodu') || hVal === 'kodu') codeCol = c;
        if (hVal.includes('ders adı') || hVal === 'dersin adı') nameCol = c;
        if (hVal.includes('öğretmen') || hVal.includes('ogretmen')) teacherCol = c;
        if (hVal.includes('yer')) yerCol = c;
      }
      if (codeCol === -1) codeCol = 1;
      if (nameCol === -1) nameCol = 3;
      if (teacherCol === -1) teacherCol = 10;
      if (yerCol === -1) yerCol = 15;

      for (let r = srRowIndex + 1; r < nextHeaderRow; r++) {
        const row = jsonData[r];
        if (!row || !row[0] || isNaN(Number(row[0]))) break;
        const code = String(row[codeCol] || '').trim();
        const name = String(row[nameCol] || row[2] || '').trim();
        const teacher = String(row[teacherCol] || row[5] || '').trim();
        const yer = String(row[yerCol] || row[6] || '').trim();
        if (code) {
          blockSubjectDetails[code] = {
            name: name || code,
            teacher: teacher || '',
            location: yer ? yer.split('-')[0].trim() : ''
          };
          if (name) globalSubjectMap[code] = name;
        }
      }
    }

    // Find all day rows dynamically between gunlerRowIndex + 1 and srRowIndex
    const dayRows = [];
    for (let r = gunlerRowIndex + 1; r < srRowIndex; r++) {
      const row = jsonData[r];
      if (!row) continue;
      const firstCell = String(row[0] || '').trim().toLowerCase();
      if (dayMapping[firstCell]) {
        dayRows.push({
          dayKey: dayMapping[firstCell],
          dayName: firstCell,
          rowIndex: r
        });
      }
    }

    const blockSchedule = {};
    const collectedCandidates = [];

    dayRows.forEach(({ dayKey, rowIndex }) => {
      blockSchedule[dayKey] = {};
      const dayRow = jsonData[rowIndex];
      const prevRow = jsonData[rowIndex - 1];

      // Check if previous row contains subject codes (e.g. 3-row day layout)
      const prevRowIsCodes = prevRow && rowIndex - 1 > gunlerRowIndex &&
        !dayMapping[String(prevRow[0] || '').trim().toLowerCase()] &&
        Object.values(periodColumns).some(col => {
          const val = String(prevRow[col] || '').trim();
          return val.length > 0 && !val.includes(':');
        });

      Object.entries(periodColumns).forEach(([periodNum, colIndex]) => {
        const col = Number(colIndex);
        if (col >= dayRow.length) return;

        let cellText = String(dayRow[col] || '').trim();

        // If previous row had course codes, prepend it
        if (prevRowIsCodes && prevRow && prevRow[col]) {
          const codeVal = String(prevRow[col]).trim();
          if (codeVal && !cellText.includes(codeVal)) {
            cellText = `${codeVal}\n${cellText}`;
          }
        }

        if (cellText && cellText.length > 2) {
          const lines = cellText.split('\n').map(l => l.trim()).filter(Boolean);
          // Filter out time strings like 08:30-09:10
          const contentLines = lines.map(l => l.replace(/\d{2}:\d{2}(?:\s*-\s*\d{2}:\d{2})?/g, '').trim()).filter(Boolean);
          const fullContent = contentLines.join(' ').replace(/\s+/g, ' ').trim();

          // Match against known subject codes from this block's Sr table (longest code first)
          let matchedCode = null;
          const sortedCodes = Object.keys(blockSubjectDetails).sort((a, b) => b.length - a.length);
          for (const code of sortedCodes) {
            if (fullContent.startsWith(code) || (contentLines[0] && contentLines[0] === code) || fullContent.includes(code)) {
              matchedCode = code;
              break;
            }
          }

          let subject = '';
          let teacherNamesStr = '';
          let location = '';

          if (matchedCode) {
            subject = blockSubjectDetails[matchedCode].name;
            // Extract remaining text after matchedCode
            let remainder = fullContent.replace(matchedCode, '').trim();
            const rParts = remainder.split(' ').filter(Boolean);
            if (rParts.length > 0) {
              const lastPart = rParts[rParts.length - 1];
              // Check if last part is location
              if (!lastPart.includes('.') && (lastPart.match(/[0-9]/) || ['OTOM', 'LAB', 'ATÖLYE'].includes(lastPart.toUpperCase()))) {
                if (rParts.length >= 2 && ['OTOM', 'LAB', 'BİLİŞİM', 'MOTOR'].includes(rParts[rParts.length - 2].toUpperCase())) {
                  location = `${rParts[rParts.length - 2]} ${lastPart}`;
                  teacherNamesStr = rParts.slice(0, -2).join(' ');
                } else {
                  location = lastPart;
                  teacherNamesStr = rParts.slice(0, -1).join(' ');
                }
              } else {
                teacherNamesStr = remainder;
              }
            }

            if (!location && blockSubjectDetails[matchedCode].location) {
              location = blockSubjectDetails[matchedCode].location;
            }
            if (!teacherNamesStr && blockSubjectDetails[matchedCode].teacher) {
              teacherNamesStr = blockSubjectDetails[matchedCode].teacher;
            }
          } else {
            // General parsing fallback
            const parts = fullContent.split(' ').filter(Boolean);
            if (parts.length >= 2) {
              location = parts[parts.length - 1];
              subject = parts[0];
              teacherNamesStr = parts.slice(1, -1).join(' ');

              if (location.includes('.') || (!location.match(/[0-9]/) && location.length > 5 && !['OTOM', 'LAB', 'ATÖLYE'].includes(location.toUpperCase()))) {
                teacherNamesStr = parts.slice(1).join(' ');
                location = '';
              }
            } else if (parts.length === 1) {
              subject = parts[0];
            }
          }

          blockSchedule[dayKey][periodNum] = { location, subject, teacherNamesStr };
          if (teacherNamesStr) {
            collectedCandidates.push({ teacherNamesStr, dayKey, periodNum });
          }
        }
      });
    });

    // Detect Class ID
    let detectedClassId = null;
    // 1. From header rows above table
    for (let i = Math.max(0, gunlerRowIndex - 5); i < gunlerRowIndex; i++) {
      const hRow = jsonData[i];
      if (hRow && Array.isArray(hRow)) {
        for (let j = 0; j < hRow.length; j++) {
          const cellVal = String(hRow[j] || '').trim();
          if (cellVal.includes('Sınıf :') || cellVal.includes('Sınıf:')) {
            detectedClassId = cellVal.split(':')[1].trim();
            break;
          }
          if (cellVal.match(/(AMP|ATP|MESEM)\s*\d{1,2}[-\s\/]?[A-ZÇĞİÖŞÜ]+/i)) {
            detectedClassId = cellVal;
            break;
          }
        }
      }
      if (detectedClassId) break;
    }

    // 2. Fallback to deducing from teacher schedules using voting across candidate lessons
    if (!detectedClassId) {
      const classVotes = {};
      for (const cand of collectedCandidates) {
        const possibleTeacherNames = cand.teacherNamesStr.split(/[\/\-]/);
        for (const tName of possibleTeacherNames) {
          const cleanTName = tName.trim();
          if (cleanTName.length > 2) {
            // Check in teachersList
            if (teachersList && teachersList.length > 0) {
              const matchedTeachers = teachersList.filter(t => matchTeacherAbbr(cleanTName, t.teacherName));
              for (const mt of matchedTeachers) {
                const cName = teacherSchedules[mt.teacherName]?.[cand.dayKey]?.[cand.periodNum];
                if (cName) {
                  classVotes[cName] = (classVotes[cName] || 0) + 1;
                }
              }
            }
            // Check directly in teacherSchedules keys
            for (const tSchedKey of Object.keys(teacherSchedules || {})) {
              if (matchTeacherAbbr(cleanTName, tSchedKey)) {
                const cName = teacherSchedules[tSchedKey]?.[cand.dayKey]?.[cand.periodNum];
                if (cName) {
                  classVotes[cName] = (classVotes[cName] || 0) + 1;
                }
              }
            }
          }
        }
      }

      const sortedVotes = Object.entries(classVotes).sort((a, b) => b[1] - a[1]);
      if (sortedVotes.length > 0) {
        detectedClassId = sortedVotes[0][0];
      }
    }

    if (detectedClassId) {
      if (!classLocations[detectedClassId]) {
        classLocations[detectedClassId] = {};
      }
      Object.keys(blockSchedule).forEach(day => {
        if (!classLocations[detectedClassId][day]) classLocations[detectedClassId][day] = {};
        Object.keys(blockSchedule[day]).forEach(period => {
          classLocations[detectedClassId][day][period] = blockSchedule[day][period];
        });
      });
    }
  });

  // Apply global subject mapping for any subjects that were not mapped
  Object.keys(classLocations).forEach(cId => {
    Object.keys(classLocations[cId]).forEach(day => {
      Object.keys(classLocations[cId][day]).forEach(period => {
        const lesson = classLocations[cId][day][period];
        if (lesson && lesson.subject && globalSubjectMap[lesson.subject]) {
          lesson.subject = globalSubjectMap[lesson.subject];
        }
      });
    });
  });

  return classLocations;
}
