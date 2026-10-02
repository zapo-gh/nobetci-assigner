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

export async function parseClassLocationsFromExcel(file, teacherSchedules, teachersList) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
        
        const classLocations = {}; // className -> { day: { period: location } }
        const uniqueSubjectCodes = new Set<string>();
        
        // Find all "Dersler\nGünler" headers to identify schedule blocks
        const headerRows = [];
        jsonData.forEach((row, index) => {
          if (row[0] && String(row[0]).includes('Günler')) {
            headerRows.push(index);
          }
        });

        headerRows.forEach((gunlerRowIndex) => {
          const periodColumns = detectPeriodColumns(jsonData[gunlerRowIndex]);
          const blockSchedule = {};
          let detectedClassId = null;

          // Process 5 days
          for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
            const rowIndex = gunlerRowIndex + dayOffset;
            if (rowIndex >= jsonData.length) continue;
            
            const dayRow = jsonData[rowIndex];
            if (!dayRow) continue;
            
            const dayName = String(dayRow[0] || '').trim().toLowerCase();
            const dayKey = dayMapping[dayName];
            if (!dayKey) continue;
            
            blockSchedule[dayKey] = {};
            
            Object.entries(periodColumns).forEach(([periodNum, colIndex]) => {
              const col = Number(colIndex);
              if (col < dayRow.length) {
                const cellText = String(dayRow[col] || '').trim();
                if (cellText && cellText.length > 3) {
                  // Some cells might have full info on multiple lines
                  const lines = cellText.split('\n').map(l => l.trim()).filter(Boolean);
                  
                  // Filter out time strings (e.g. 08:30-09:10 or 08:30 09:10) by replacing them, so we don't lose the whole line if they share it
                  const contentLines = lines.map(l => l.replace(/\d{2}:\d{2}(?:\s*-\s*\d{2}:\d{2})?/g, '').trim()).filter(Boolean);
                  const fullContent = contentLines.join(' ');
                  const parts = fullContent.split(' ').filter(Boolean);
                  
                  if (parts.length >= 2) {
                    let location = parts[parts.length - 1]; // e.g., A-01 or OTOM
                    let subjectCode = parts[0];
                    let teacherNamesStr = parts.slice(1, -1).join(' ');
                    
                    // If the location has a dot (e.g. H.KARATOS) it is likely a teacher, meaning location is missing
                    if (location.includes('.') || (!location.match(/[0-9]/) && location.length > 5 && !['OTOM', 'LAB', 'ATÖLYE'].includes(location.toUpperCase()))) {
                       teacherNamesStr = parts.slice(1).join(' ');
                       location = ''; // Set location to empty string, but keep it in blockSchedule so UI renders it correctly!
                    }
                    
                    if (!detectedClassId) {
                      const possibleTeacherNames = teacherNamesStr.split(/[\/\-]/);
                      for (const tName of possibleTeacherNames) {
                        const cleanTName = tName.trim().toUpperCase();
                        if (cleanTName.length > 2) {
                          const teacher = teachersList?.find(t => t.teacherName.toUpperCase().includes(cleanTName) || cleanTName.includes(t.teacherName.split(' ').pop().toUpperCase()));
                          if (teacher && teacherSchedules[teacher.teacherName] && teacherSchedules[teacher.teacherName][dayKey] && teacherSchedules[teacher.teacherName][dayKey][periodNum]) {
                            detectedClassId = teacherSchedules[teacher.teacherName][dayKey][periodNum];
                            break;
                          } else {
                            const exactKey = Object.keys(teacherSchedules || {}).find(k => k.toUpperCase().includes(cleanTName) || cleanTName.includes(k.split(' ').pop().toUpperCase()));
                            if (exactKey && teacherSchedules[exactKey][dayKey] && teacherSchedules[exactKey][dayKey][periodNum]) {
                              detectedClassId = teacherSchedules[exactKey][dayKey][periodNum];
                              break;
                            }
                          }
                        }
                      }
                    }
                    
                    // Always add to blockSchedule even if location is empty, so it's not skipped!
                    uniqueSubjectCodes.add(subjectCode);
                    blockSchedule[dayKey][periodNum] = { location, subject: subjectCode, teacherNamesStr };
                  }
                }
              }
            });
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

        // Map short codes to full names using the bottom tables in the Excel sheet
        const subjectMap = {};
        
        // 1. Look for explicit headers
        let codeCol = -1;
        let nameCol = -1;
        jsonData.forEach((row) => {
            if (!row || !Array.isArray(row)) return;
            const strRow = row.map(c => String(c || '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase());
            
            let tempCodeCol = -1;
            let tempNameCol = -1;
            
            for (let i = 0; i < strRow.length; i++) {
                const cell = strRow[i];
                if (cell === 'ders' || cell === 'kısa adı' || cell === 'kodu' || cell === 'ders kodu') tempCodeCol = i;
                if (cell === 'ders adı' || cell === 'dersin adı' || cell === 'uzun adı' || cell === 'ders ad' || cell === 'ders adi' || cell === 'dersin adi') tempNameCol = i;
            }
            
            if (tempCodeCol !== -1 && tempNameCol !== -1) {
                codeCol = tempCodeCol;
                nameCol = tempNameCol;
            } else if (codeCol !== -1 && nameCol !== -1) {
                const code = String(row[codeCol] || '').trim();
                const name = String(row[nameCol] || '').trim();
                if (code && name && uniqueSubjectCodes.has(code) && code.toLowerCase() !== 'ders' && code.toLowerCase() !== 'kısa adı') {
                    subjectMap[code] = name;
                }
            }
        });
        
        // 2. Fallback heuristic: Scan all rows.
        if (Object.keys(subjectMap).length === 0) {
            jsonData.forEach((row) => {
                if (!row || !Array.isArray(row)) return;
                
                // Find if any cell exactly matches a known short code
                let foundCode = '';
                for (let i = 0; i < row.length; i++) {
                    const cellVal = String(row[i] || '').trim();
                    if (uniqueSubjectCodes.has(cellVal)) {
                        foundCode = cellVal;
                        break;
                    }
                }
                
                if (foundCode) {
                    // The row contains the short code. Let's find the subject name in the same row.
                    // Usually, the subject name is the longest string in the row, or the string immediately after.
                    let bestMatch = foundCode;
                    for (let i = 0; i < row.length; i++) {
                        const cellVal = String(row[i] || '').trim();
                        // Ignore the code itself, ignore numbers/empty strings
                        // Also ignore strings with a dot (like S.KESEKLE) because those are teacher names!
                        if (cellVal !== foundCode && cellVal.length > bestMatch.length && isNaN(Number(cellVal)) && !cellVal.includes('.')) {
                             bestMatch = cellVal;
                        }
                    }
                    if (bestMatch !== foundCode) {
                        subjectMap[foundCode] = bestMatch;
                    }
                }
            });
        }

        // Apply subject mapping
        Object.keys(classLocations).forEach(cId => {
            Object.keys(classLocations[cId]).forEach(day => {
                Object.keys(classLocations[cId][day]).forEach(period => {
                    const lesson = classLocations[cId][day][period];
                    if (lesson && lesson.subject && subjectMap[lesson.subject]) {
                        lesson.subject = subjectMap[lesson.subject];
                    }
                });
            });
        });

        resolve(classLocations);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
