// @ts-nocheck
import { logger } from './logger.js';
import * as XLSX from '@e965/xlsx';

const debugLog = (...args) => logger.log(...args);


/**
 * Parse duty teacher list from Excel file (nöbet çizelgesi formatı)
 * @param {File} file - Excel file containing duty teacher schedule
 * @returns {Promise<Object>} Object with parsed duty teachers data
 */
export async function parseDutyTeachersFromExcel(file, existingTeachers = []) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    const dutyTeachers = [];
    const dayTeachers = new Map(); // Günlük öğretmen listesi
    const errors = [];
    
    let dutyZones = [];
    // Process each sheet in the workbook
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with better options for handling empty cells
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '', // Default value for empty cells
        raw: false  // Convert all values to strings
      });
      
      debugLog(`Processing sheet: ${sheetName}`);
      debugLog('Sheet data length:', jsonData.length);
      
      // Debug: Show first 10 rows to understand structure
      debugLog('First 10 rows of sheet data:');
      jsonData.slice(0, 10).forEach((row, index) => {
        debugLog(`Row ${index}:`, row);
      });
      
      // Check if this is a duty schedule format
      if (isDutyScheduleFormat(jsonData)) {
        debugLog('Detected duty schedule format');
        const result = parseDutyScheduleFormat(jsonData, sheetName, existingTeachers);
        
        if (result.teachers) {
          dutyTeachers.push(...result.teachers);
          debugLog(`Parsed ${result.teachers.length} duty teachers from sheet "${sheetName}"`);
        }
        
        if (result.dayTeachers) {
          // Günlük verileri birleştir
          result.dayTeachers.forEach((teachers, day) => {
            if (!dayTeachers.has(day)) {
              dayTeachers.set(day, []);
            }
            dayTeachers.get(day).push(...teachers);
          });
          debugLog(`Parsed day teachers for ${result.dayTeachers.size} days from sheet "${sheetName}"`);
        }
        
        if (result.dutyZones && result.dutyZones.length > 0) {
          dutyZones = [...result.dutyZones]; // Capture the zones
        }
      } else {
        // Try traditional teacher list format
        const headerRowIndex = findHeaderRow(jsonData);
        
        if (headerRowIndex === -1) {
          errors.push(`Sayfa "${sheetName}" içinde başlık satırı bulunamadı`);
          return;
        }
        
        debugLog(`Found header at row ${headerRowIndex}:`, jsonData[headerRowIndex]);
        
        // Parse data rows
        const sheetDutyTeachers = parseDataRows(jsonData, headerRowIndex);
        dutyTeachers.push(...sheetDutyTeachers);
        
        debugLog(`Parsed ${sheetDutyTeachers.length} duty teachers from sheet "${sheetName}"`);
      }
    });
    
    debugLog('\n=== PARSING SUMMARY ===');
    debugLog('Total duty teachers parsed:', dutyTeachers.length);
    
    if (dutyTeachers.length === 0) {
      logger.warn('⚠️ No duty teachers were found in the Excel file!');
    }
    
    return {
      dutyTeachers,
      dayTeachers: dayTeachers,
      dutyZones,
      errors,
      summary: {
        total: dutyTeachers.length,
        sheets: workbook.SheetNames.length,
        errors: errors.length
      }
    };
    
  } catch (error) {
    throw new Error(`Excel nöbetçi öğretmen listesi parsing hatası: ${error.message}`);
  }
}

/**
 * Find the header row in the sheet data
 * @param {Array} sheetData - 2D array of sheet data
 * @returns {number} Row index of header or -1 if not found
 */
function findHeaderRow(sheetData) {
  const headerKeywords = [
    'adı soyadı', 'ad soyad', 'öğretmen adı', 'öğretmen', 'isim', 'name',
    'nöbetçi', 'nöbet', 'duty', 'görev', 'görevli'
  ];
  
  for (let rowIndex = 0; rowIndex < Math.min(sheetData.length, 20); rowIndex++) {
    const row = sheetData[rowIndex];
    if (!row || row.length === 0) continue;
    
    // Check if any cell contains header keywords
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cellValue = String(row[colIndex] || '').toLowerCase().trim();
      
      for (const keyword of headerKeywords) {
        if (cellValue.includes(keyword)) {
          debugLog(`Found header keyword "${keyword}" in cell [${rowIndex}, ${colIndex}]: "${cellValue}"`);
          return rowIndex;
        }
      }
    }
  }
  
  return -1;
}


/**
 * Parse data rows starting from header row
 * @param {Array} sheetData - 2D array of sheet data
 * @param {number} headerRowIndex - Index of header row
 * @param {string} sheetName - Name of the sheet
 * @returns {Array} Array of parsed duty teachers
 */
function parseDataRows(sheetData, headerRowIndex) {
  const dutyTeachers = [];
  const headerRow = sheetData[headerRowIndex];
  
  // Find column indices for different fields
  const columnMap = findColumnIndices(headerRow);
  debugLog('Column mapping:', columnMap);
  
  // Parse data rows
  for (let rowIndex = headerRowIndex + 1; rowIndex < sheetData.length; rowIndex++) {
    const row = sheetData[rowIndex];
    if (!row || row.length === 0) continue;
    
    // Skip empty rows
    if (isRowEmpty(row)) continue;
    
    const dutyTeacher = parseDutyTeacherRow(row, columnMap, rowIndex + 1);
    
    if (dutyTeacher && dutyTeacher.name && dutyTeacher.name.trim()) {
      dutyTeachers.push(dutyTeacher);
      debugLog(`Parsed duty teacher: ${dutyTeacher.name}`);
    }
  }
  
  return dutyTeachers;
}


/**
 * Find column indices for different fields
 * @param {Array} headerRow - Header row data
 * @returns {Object} Column mapping object
 */
function findColumnIndices(headerRow) {
  const columnMap = {
    name: -1,
    id: -1,
    department: -1,
    phone: -1,
    email: -1,
    notes: -1
  };
  
  const fieldMappings = {
    name: ['adı soyadı', 'ad soyad', 'öğretmen adı', 'öğretmen', 'isim', 'name', 'ad', 'soyad'],
    id: ['id', 'numara', 'no', 'öğretmen id', 'teacher id'],
    department: ['bölüm', 'departman', 'department', 'branş', 'alan'],
    phone: ['telefon', 'phone', 'tel', 'cep'],
    email: ['email', 'e-posta', 'mail'],
    notes: ['not', 'açıklama', 'notes', 'remark', 'yorum']
  };
  
  headerRow.forEach((cell, index) => {
    const cellValue = String(cell || '').toLowerCase().trim();
    
    Object.entries(fieldMappings).forEach(([field, keywords]) => {
      for (const keyword of keywords) {
        if (cellValue.includes(keyword)) {
          columnMap[field] = index;
          debugLog(`Found ${field} column at index ${index}: "${cellValue}"`);
          break;
        }
      }
    });
  });
  
  return columnMap;
}


/**
 * Parse a single duty teacher row
 * @param {Array} row - Row data
 * @param {Object} columnMap - Column mapping
 * @param {number} rowNumber - Row number for error reporting
 * @returns {Object|null} Parsed duty teacher object or null if invalid
 */
function parseDutyTeacherRow(row, columnMap, rowNumber) {
  const name = getCellValue(row, columnMap.name);
  const id = getCellValue(row, columnMap.id);
  const department = getCellValue(row, columnMap.department);
  const phone = getCellValue(row, columnMap.phone);
  const email = getCellValue(row, columnMap.email);
  const notes = getCellValue(row, columnMap.notes);
  
  // Validate required fields
  if (!name || name.trim().length < 2) {
    debugLog(`Row ${rowNumber}: Invalid name "${name}"`);
    return null;
  }
  
  // Generate ID if not provided
  const teacherId = id && id.trim() ? id.trim() : generateTeacherId(name);
  
  return {
    teacherId: teacherId,
    teacherName: name.trim(),
    department: department ? department.trim() : '',
    phone: phone ? phone.trim() : '',
    email: email ? email.trim() : '',
    notes: notes ? notes.trim() : '',
    maxDutyPerDay: 6, // Default value
    rowNumber: rowNumber
  };
}


/**
 * Get cell value from row
 * @param {Array} row - Row data
 * @param {number} columnIndex - Column index
 * @returns {string} Cell value or empty string
 */
function getCellValue(row, columnIndex) {
  if (columnIndex === -1 || columnIndex >= row.length) {
    return '';
  }
  
  const value = row[columnIndex];
  return value ? String(value).trim() : '';
}


/**
 * Generate teacher ID from name
 * @param {string} name - Teacher name
 * @returns {string} Generated teacher ID
 */
function generateTeacherId(name) {
  // Extract first letters of first and last name
  const nameParts = name.trim().split(/\s+/);
  if (nameParts.length < 2) {
    return `T${nameParts[0].substring(0, 2).toUpperCase()}`;
  }
  
  const firstInitial = nameParts[0].substring(0, 1).toUpperCase();
  const lastInitial = nameParts[nameParts.length - 1].substring(0, 1).toUpperCase();
  
  // Add more characters to make it more unique
  const secondInitial = nameParts[0].length > 1 ? nameParts[0].substring(1, 2).toUpperCase() : '';
  const lastSecondInitial = nameParts[nameParts.length - 1].length > 1 ? nameParts[nameParts.length - 1].substring(1, 2).toUpperCase() : '';
  
  return `T${firstInitial}${secondInitial}${lastInitial}${lastSecondInitial}`;
}


/**
 * Check if this is a duty schedule format
 * @param {Array} sheetData - 2D array of sheet data
 * @returns {boolean} True if this is a duty schedule format
 */
function isDutyScheduleFormat(sheetData) {
  if (sheetData.length < 2) return false;
  
  // Check for common duty schedule indicators
  const firstRow = sheetData[0] || [];
  
  // Look for "ÖĞRETMEN NÖBET ÇİZELGESİ" or similar patterns
  const titleText = firstRow[0] ? String(firstRow[0]).toLowerCase() : '';
  if (titleText.includes('nöbet') || titleText.includes('çizelge')) {
    return true;
  }
  
  // Check for day names in first column
  const dayNames = [
    'pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma',
    'PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday'
  ];
  for (let i = 0; i < Math.min(sheetData.length, 10); i++) {
    const row = sheetData[i];
    if (row && row[0]) {
      const firstCell = String(row[0]).trim().toLocaleLowerCase('tr-TR');
      if (dayNames.some(day => firstCell.includes(day))) {
        return true;
      }
    }
  }
  
  return false;
}


/**
 * Parse duty schedule format to extract unique teacher names
 * @param {Array} sheetData - 2D array of sheet data
 * @param {string} sheetName - Name of the sheet
 * @returns {Array} Array of unique teacher names
 */
function parseDutyScheduleFormat(sheetData, sheetName, existingTeachers = []) {
  const teacherNames = new Set();
  const dayTeachers = new Map();
  const teacherDutyLocations = new Map();
  const dutyZones = [];
  
  debugLog('Parsing duty schedule format...');
  
  let headerRowIndex = -1;
  let dataStartRow = -1;
  let headerRow = null;
  
  for (let i = 0; i < Math.min(sheetData.length, 10); i++) {
    const row = sheetData[i];
    if (!row || row.length === 0) continue;
    
    const rowText = row.join(' ').toUpperCase();
    if ((rowText.includes('GÜNLER') || rowText.includes('TAM GÜN')) && (rowText.includes('KAT') || rowText.includes('ZEMİN') || rowText.includes('BAHÇE'))) {
      headerRowIndex = i;
      dataStartRow = i + 1;
      headerRow = row;
      break;
    }
  }
  
  // Alternative detection if headers are split across rows
  if (headerRowIndex === -1) {
    for (let i = 0; i < Math.min(sheetData.length, 10); i++) {
      const row = sheetData[i];
      if (!row || row.length === 0) continue;
      const rowText = row.join(' ').toUpperCase();
      if (rowText.includes('KAT') || rowText.includes('ZEMİN') || rowText.includes('BAHÇE')) {
         headerRowIndex = i;
         dataStartRow = i + 1;
         headerRow = row;
         break;
      }
    }
  }
  
  if (headerRowIndex === -1) {
    dataStartRow = 2;
  }
  
  if (headerRow) {
    for (let col = 1; col < headerRow.length; col++) {
      const cellValue = String(headerRow[col] || '').trim();
      if (cellValue && !cellValue.toUpperCase().includes('TAM GÜN')) {
        dutyZones.push({
          zoneId: 'z_' + Math.random().toString(36).substr(2, 9),
          name: cellValue,
          requiredTeacherCount: 1, // Default, updated dynamically below
          colIndex: col
        });
      }
    }
  }
  
  let currentDay = null;
  let inScheduleTable = false;
  
  for (let rowIndex = dataStartRow; rowIndex < sheetData.length; rowIndex++) {
    const row = sheetData[rowIndex];
    if (!row || row.length === 0 || isRowEmpty(row)) continue;
    
    const firstCell = String(row[0] || '').trim();
    const isDayRow = isDayNameRow(firstCell);
    
    if (isDayRow) {
      const lower = firstCell.toLocaleLowerCase('tr-TR');
      if (lower.includes('pazartesi') || lower.includes('monday')) currentDay = 'monday';
      else if (lower.includes('salı') || lower.includes('tuesday')) currentDay = 'tuesday';
      else if (lower.includes('çarşamba') || lower.includes('wednesday')) currentDay = 'wednesday';
      else if (lower.includes('perşembe') || lower.includes('thursday')) currentDay = 'thursday';
      else if (lower.includes('cuma') || lower.includes('friday')) currentDay = 'friday';
      else currentDay = firstCell;
      
      inScheduleTable = true;
    } else if (firstCell === '' && inScheduleTable && currentDay) {
      // Continuation row
    } else {
      if (inScheduleTable) {
        inScheduleTable = false;
        currentDay = null;
      }
      continue;
    }
    
    // Process cells
    for (let colIndex = 1; colIndex < row.length; colIndex++) {
      const cellValue = String(row[colIndex] || '').trim();
      if (!cellValue || isLocationName(cellValue)) continue;
      
      const parsedTeachers = parseNamesFromCell(cellValue, existingTeachers);
      
      const zone = dutyZones.find(z => z.colIndex === colIndex);

      // Update zone requirement based on max names found
      if (headerRow && parsedTeachers.length > 0) {
        if (zone && parsedTeachers.length > zone.requiredTeacherCount) {
          zone.requiredTeacherCount = parsedTeachers.length;
        }
      }
      
      parsedTeachers.forEach(teacher => {
        if (isValidTeacherName(teacher)) {
          teacherNames.add(teacher);
          if (currentDay) {
            if (!dayTeachers.has(currentDay)) dayTeachers.set(currentDay, []);
            dayTeachers.get(currentDay).push(teacher);

            if (!teacherDutyLocations.has(teacher)) {
              teacherDutyLocations.set(teacher, {});
            }
            if (zone) {
              teacherDutyLocations.get(teacher)[currentDay] = zone.name;
            }
          }
        }
      });
    }
  }
  
  const uniqueTeachers = Array.from(teacherNames).map((name) => ({
    teacherId: generateTeacherId(name),
    teacherName: name,
    department: '',
    phone: '',
    email: '',
    notes: `Excel'den yüklendi (${sheetName})`,
    maxDutyPerDay: 6,
    source: 'duty_schedule',
    dutyLocations: teacherDutyLocations.get(name) || {}
  }));
  
  return {
    teachers: uniqueTeachers,
    dayTeachers: dayTeachers,
    dutyZones: dutyZones.map(z => ({ zoneId: z.zoneId, name: z.name, requiredTeacherCount: z.requiredTeacherCount }))
  };
}

function parseNamesFromCell(cellValue, existingTeachers = []) {
  if (!cellValue) return [];
  // Split by newlines, commas, or 've'
  let parts = cellValue.split(/\n|,|\s+ve\s+/i)
    .map(name => name.trim())
    .filter(name => name.length > 2);
    
  // Try to split concatenated names using known teachers list
  if (existingTeachers && existingTeachers.length > 0) {
     const splitParts = [];
     parts.forEach(part => {
        let remaining = part;
        const foundInPart = [];
        // Sort by length to match longest names first
        const sortedTeachers = [...existingTeachers].sort((a, b) => b.teacherName.length - a.teacherName.length);
        
        for (const teacher of sortedTeachers) {
           if (remaining.length < 3) break;
           const remainingLower = remaining.toLocaleLowerCase('tr-TR');
           const teacherLower = teacher.teacherName.toLocaleLowerCase('tr-TR');
           const index = remainingLower.indexOf(teacherLower);
           if (index !== -1) {
              foundInPart.push(teacher.teacherName);
              // Replace found part with spaces to prevent overlapping matches
              remaining = remaining.substring(0, index) + ' ' + remaining.substring(index + teacher.teacherName.length);
           }
        }
        
        if (foundInPart.length > 0) {
           splitParts.push(...foundInPart);
           // Add any leftovers that might be unknown teachers
           const leftover = remaining.trim().replace(/\s+/g, ' ');
           if (leftover.length > 3) {
              splitParts.push(leftover);
           }
        } else {
           splitParts.push(part);
        }
     });
     return splitParts;
  }
  
  return parts;
}


/**
 * Check if a cell contains a day name
 * @param {string} cellValue - Cell value to check
 * @returns {boolean} True if it's a day name
 */
function isDayNameRow(cellValue) {
  if (!cellValue || typeof cellValue !== 'string') return false;
  
  const dayNames = [
    'pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma',
    'PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday'
  ];
  
  const trimmedValue = cellValue.trim().toLocaleLowerCase('tr-TR');
  return dayNames.some(day => trimmedValue.includes(day));
}


/**
 * Extract teacher names from a row
 * @param {Array} row - Row data
 * @param {boolean} isDayRow - Whether this is a day row
 * @param {string} currentDay - Current day name
 * @returns {Array} Array of teacher names found in this row
 */
function extractTeachersFromRow(row, isDayRow) {
  const teachers = [];
  
  // Determine column range
  const startCol = isDayRow ? 1 : 0; // Skip day name column for day rows
  const endCol = row.length - 1; // Skip last column (NÖBETÇİ İDARECİ)
  
  debugLog(`  Extracting from columns ${startCol} to ${endCol}`);
  
  for (let colIndex = startCol; colIndex < endCol; colIndex++) {
    const cellValue = String(row[colIndex] || '').trim();
    
    if (!cellValue) continue;
    
    debugLog(`  Column ${colIndex}: "${cellValue}"`);
    
    // Skip location names and headers
    if (isLocationName(cellValue)) {
      debugLog(`    Skipping location: "${cellValue}"`);
      continue;
    }
    
    // Skip non-teacher patterns
    if (!isValidTeacherName(cellValue)) {
      debugLog(`    Skipping non-teacher: "${cellValue}"`);
      continue;
    }
    
    // This is a valid teacher name
    teachers.push(cellValue);
    debugLog(`    ✓ Valid teacher: "${cellValue}"`);
  }
  
  return teachers;
}


/**
 * Validate if the extracted name is a valid teacher name
 * @param {string} name - Name to validate
 * @returns {boolean} True if valid teacher name
 */
function isValidTeacherName(name) {
  if (!name || typeof name !== 'string') return false;
  
  const trimmedName = name.trim();
  
  // Check length
  if (trimmedName.length < 3 || trimmedName.length > 50) return false;
  
  // Check for non-teacher patterns (case insensitive)
  const nonTeacherPatterns = [
    'GÜNLER', 'SAAT', 'DERS', 'PAZARTESI', 'SALI', 'CARSAMBA', 'PERSEMBE', 'CUMA',
    '...........', 'Table', 'Sheet', 'null', 'undefined', 'NÖBETÇİ', 'İDARECİ',
    '1.KAT', '2.KAT', 'ZEMİN', 'BAHÇE', 'KAT', 'VE', 'NÖBETÇİ İDARECİ',
    'ZEMİN KAT', 'VE BAHÇE', 'KAT VE', 'ZEMİN KAT VE BAHÇE',
    'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'
  ];
  
  const upperName = trimmedName.toUpperCase();
  for (const pattern of nonTeacherPatterns) {
    if (upperName.includes(pattern.toUpperCase())) {
      debugLog(`    Rejected: "${name}" contains "${pattern}"`);
      return false;
    }
  }
  
  // Check if it's only numbers or special characters
  if (/^[0-9\s.-]+$/.test(trimmedName)) {
    debugLog(`    Rejected: "${name}" is only numbers/special chars`);
    return false;
  }
  
  // Check if it contains at least one space (Ad Soyad format)
  if (!trimmedName.includes(' ')) {
    debugLog(`    Rejected: "${name}" has no space (not Ad Soyad format)`);
    return false;
  }
  
  // Check if it contains only valid Turkish characters
  if (!/^[A-ZÇĞIİÖŞÜa-zçğıiöşü\s]+$/.test(trimmedName)) {
    debugLog(`    Rejected: "${name}" contains invalid characters`);
    return false;
  }
  
  // Check for minimum word count (at least 2 words)
  const words = trimmedName.split(/\s+/);
  if (words.length < 2) {
    debugLog(`    Rejected: "${name}" has less than 2 words`);
    return false;
  }
  
  // Check if any word is too short (less than 2 characters)
  for (const word of words) {
    if (word.length < 2) {
      debugLog(`    Rejected: "${name}" has word shorter than 2 chars: "${word}"`);
      return false;
    }
  }
  
  debugLog(`    ✓ Valid teacher name: "${name}"`);
  return true;
}



/**
 * Check if a cell value is a location name
 * @param {string} cellValue - Cell value to check
 * @returns {boolean} True if it's a location name
 */
function isLocationName(cellValue) {
  if (!cellValue || typeof cellValue !== 'string') return false;
  
  const locationPatterns = [
    '1.KAT', '2.KAT', 'ZEMİN KAT', 'BAHÇE', 'ZEMİN KAT VE BAHÇE',
    'NÖBETÇİ İDARECİ', 'GÜNLER', 'SAAT', 'DERS'
  ];
  
  const value = cellValue.toUpperCase().trim();
  
  for (const pattern of locationPatterns) {
    if (value.includes(pattern.toUpperCase())) {
      return true;
    }
  }
  
  return false;
}


/**
 * Check if row is empty
 * @param {Array} row - Row data
 * @returns {boolean} True if row is empty
 */
function isRowEmpty(row) {
  return row.every(cell => !cell || String(cell).trim() === '');
}


