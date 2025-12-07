import * as XLSX from 'xlsx';

/**
 * Parse teacher schedules from Excel file
 * @param {File} file - Excel file containing teacher schedules
 * @returns {Promise<Object>} Object with teacher names as keys and their schedules as values
 */
export async function parseTeacherSchedulesFromExcel(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    const teacherSchedules = {};
    
    // Process each sheet in the workbook
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with better options for handling empty cells
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '', // Default value for empty cells
        raw: false  // Convert all values to strings
      });
      
      console.log(`Processing sheet: ${sheetName}`);
      console.log('Sheet data length:', jsonData.length);
      
      // Debug: Show first 20 rows to understand structure
      console.log('First 20 rows of sheet data:');
      jsonData.slice(0, 20).forEach((row, index) => {
        console.log(`Row ${index}:`, row);
      });
      
      // Find all teacher blocks in this sheet
      const teacherBlocks = findTeacherBlocks(jsonData);
      console.log(`Found ${teacherBlocks.length} teacher blocks:`, teacherBlocks);
      
      // Parse each teacher's schedule
      teacherBlocks.forEach(block => {
        const { name: teacherName, startRow, endRow } = block;
        console.log(`\n=== Processing teacher: ${teacherName} (rows ${startRow}-${endRow}) ===`);
        
        const teacherData = jsonData.slice(startRow, endRow);
        console.log(`Teacher data block length: ${teacherData.length}`);
        console.log('First few rows of teacher data:', teacherData.slice(0, 10));
        
        const schedule = parseTeacherScheduleFromBlock(teacherData, teacherName);
        
        if (schedule && Object.keys(schedule).length > 0) {
          teacherSchedules[teacherName] = schedule;
          console.log(`✓ Successfully parsed schedule for ${teacherName}:`, schedule);
        } else {
          console.log(`✗ No valid schedule found for ${teacherName}`);
        }
      });
    });
    
    console.log('\n=== PARSING SUMMARY ===');
    console.log('All teacher schedules:', teacherSchedules);
    
    // Summary statistics
    const totalTeachers = Object.keys(teacherSchedules).length;
    const totalClasses = Object.values(teacherSchedules).reduce((total, teacherSchedule) => {
      return total + Object.values(teacherSchedule).reduce((dayTotal, daySchedule) => {
        return dayTotal + Object.keys(daySchedule).length;
      }, 0);
    }, 0);
    
    console.log(`Total teachers parsed: ${totalTeachers}`);
    console.log(`Total classes parsed: ${totalClasses}`);
    
    if (totalTeachers === 0) {
      console.warn('⚠️ No teachers were found in the Excel file!');
    }
    
    if (totalClasses === 0) {
      console.warn('⚠️ No classes were parsed from any teacher!');
    }
    
    return teacherSchedules;
    
  } catch (error) {
    throw new Error(`Excel öğretmen programı parsing hatası: ${error.message}`);
  }
}

/**
 * Find all teacher blocks in the sheet data
 * @param {Array} sheetData - 2D array of sheet data
 * @returns {Array} Array of teacher blocks with name, startRow, endRow
 */
function findTeacherBlocks(sheetData) {
  const teacherBlocks = [];
  
  for (let rowIndex = 0; rowIndex < sheetData.length; rowIndex++) {
    const row = sheetData[rowIndex];
    if (!row || row.length === 0) continue;
    
    // Check if this row contains "Adı Soyadı" in column A (index 0)
    const firstCell = String(row[0] || '').trim();
    if (firstCell.includes('Adı Soyadı') || 
        firstCell.includes('Adı Soyadı.') ||
        firstCell.includes('Adı Soyadı :') ||
        firstCell.includes('Adı Soyadı:')) {
      
      // Extract teacher name from column C (index 2)
      const teacherName = findTeacherNameInColumn(row);
      
      if (teacherName && isValidTeacherName(teacherName)) {
        // Find the end row for this teacher block
        let endRow = rowIndex + 25; // Default end row
        
        // Look for the next teacher block to determine end row
        for (let nextRowIndex = rowIndex + 1; nextRowIndex < sheetData.length; nextRowIndex++) {
          const nextRow = sheetData[nextRowIndex];
          if (!nextRow || nextRow.length === 0) continue;
          
          const nextFirstCell = String(nextRow[0] || '').trim();
          if (nextFirstCell.includes('Adı Soyadı') || 
              nextFirstCell.includes('Adı Soyadı.') ||
              nextFirstCell.includes('Adı Soyadı :') ||
              nextFirstCell.includes('Adı Soyadı:')) {
            endRow = nextRowIndex;
            break;
          }
        }
        
        teacherBlocks.push({
          name: teacherName,
          startRow: rowIndex,
          endRow: endRow
        });
        
        console.log(`Found valid teacher: "${teacherName}" starting at row ${rowIndex}, ending at row ${endRow}`);
      }
    }
  }
  
  return teacherBlocks;
}

/**
 * Extract teacher name from row data (column C)
 * @param {Array} row - Row data
 * @returns {string|null} Teacher name or null if not found
 */
function findTeacherNameInColumn(row) {
  // Teacher name is in column C (index 2)
  if (row.length > 2) {
    let teacherName = String(row[2] || '').trim();
    
    // Clean the name (remove leading colons, spaces, etc.)
    teacherName = teacherName.replace(/^[:\s]+/, '').replace(/[:\s]+$/, '').trim();
    
    return teacherName;
  }
  
  return null;
}

/**
 * Validate if the extracted name is a valid teacher name
 * @param {string} name - Name to validate
 * @returns {boolean} True if valid teacher name
 */
function isValidTeacherName(name) {
  if (!name || typeof name !== 'string') return false;
  
  // Check length
  if (name.length < 3 || name.length > 50) return false;
  
  // Check for non-teacher patterns
  const nonTeacherPatterns = [
    'GÜNLER', 'SAAT', 'DERS', 'PAZARTESI', 'SALI', 'CARSAMBA', 'PERSEMBE', 'CUMA',
    '...........', 'Table', 'Sheet', 'null', 'undefined'
  ];
  
  for (const pattern of nonTeacherPatterns) {
    if (name.includes(pattern)) {
      return false;
    }
  }
  
  // Check if it's only numbers or special characters
  if (/^[0-9\s.-]+$/.test(name)) return false;
  
  // Check if it contains at least one space (Ad Soyad format)
  if (!name.includes(' ')) return false;
  
  // Check if it contains only valid Turkish characters
  if (!/^[A-ZÇĞIİÖŞÜa-zçğıiöşü\s]+$/.test(name)) return false;
  
  return true;
}

/**
 * Parse teacher schedule from a teacher block data
 * @param {Array} teacherData - 2D array of teacher's data block
 * @param {string} teacherName - Teacher's name
 * @returns {Object} Teacher's schedule object
 */
function parseTeacherScheduleFromBlock(teacherData, teacherName) {
  const schedule = {
    monday: {},
    tuesday: {},
    wednesday: {},
    thursday: {},
    friday: {}
  };
  
  console.log('Parsing schedule for teacher:', teacherName);
  console.log('Teacher data length:', teacherData.length);
  
  // Find the "Günler" row dynamically
  const gunlerRowIndex = findGunlerRow(teacherData);
  
  if (gunlerRowIndex === -1) {
    console.log('Could not find "Günler" row for teacher:', teacherName);
    return schedule;
  }
  
  console.log(`Found "Günler" at row ${gunlerRowIndex}`);
  
  // Parse the schedule table starting from the "Günler" row
  const scheduleTable = parseScheduleTable(teacherData, gunlerRowIndex);
  
  // Map the parsed data to our schedule structure
  Object.entries(scheduleTable).forEach(([dayKey, dayData]) => {
    if (schedule[dayKey]) {
      schedule[dayKey] = dayData;
    }
  });
  
  return schedule;
}

/**
 * Find the "Günler" row in teacher data
 * @param {Array} teacherData - Teacher's data block
 * @returns {number} Row index of "Günler" or -1 if not found
 */
function findGunlerRow(teacherData) {
  console.log('Searching for "Günler" row in teacher data...');
  
  for (let i = 0; i < teacherData.length; i++) {
    const row = teacherData[i];
    if (!row || row.length === 0) continue;
    
    const firstCell = String(row[0] || '').trim();
    console.log(`Row ${i}, first cell: "${firstCell}"`);
    
    // Check for various forms of "Günler"
    if (firstCell.includes('Günler') || 
        firstCell.includes('GUNLER') ||
        firstCell.includes('Dersler Günler') ||
        firstCell.includes('DERSLER GÜNLER')) {
      console.log(`Found "Günler" row at index ${i}: "${firstCell}"`);
      return i;
    }
  }
  
  console.log('Could not find "Günler" row');
  return -1;
}

/**
 * Parse the schedule table starting from "Günler" row
 * @param {Array} teacherData - Teacher's data block
 * @param {number} gunlerRowIndex - Index of "Günler" row
 * @returns {Object} Parsed schedule data
 */
function parseScheduleTable(teacherData, gunlerRowIndex) {
  const schedule = {
    monday: {},
    tuesday: {},
    wednesday: {},
    thursday: {},
    friday: {}
  };
  
  // Day mapping: Turkish day names to English keys
  const dayMapping = {
    'Pazartesi': 'monday',
    'Salı': 'tuesday', 
    'Çarşamba': 'wednesday',
    'Perşembe': 'thursday',
    'Cuma': 'friday'
  };
  
  // Detect period columns dynamically from the header row which contains cells like "(1)", "(2)", ...
  const periodColumns = detectPeriodColumns(teacherData[gunlerRowIndex]);
  console.log('Detected period columns:', periodColumns);
  
  console.log(`Parsing schedule table starting from row ${gunlerRowIndex}`);
  console.log('Günler row:', teacherData[gunlerRowIndex]);
  
  // Start from the row after "Günler" and parse 5 days
  for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
    const rowIndex = gunlerRowIndex + dayOffset;
    if (rowIndex >= teacherData.length) {
      console.log(`Row ${rowIndex} is beyond data length ${teacherData.length}`);
      continue;
    }
    
    const dayRow = teacherData[rowIndex];
    if (!dayRow) {
      console.log(`Row ${rowIndex} is empty`);
      continue;
    }
    
    // Get the day name from column A (index 0)
    const dayName = String(dayRow[0] || '').trim();
    const dayKey = dayMapping[dayName];
    
    if (!dayKey) {
      console.log(`Unknown day name: "${dayName}" at row ${rowIndex}`);
      console.log('Full row:', dayRow);
      continue;
    }
    
    console.log(`Processing ${dayName} (${dayKey}) at row ${rowIndex}:`, dayRow);
    
    // Parse each period for this day
    Object.entries(periodColumns).forEach(([periodNum, colIndex]) => {
      const col = Number(colIndex);
      if (col < dayRow.length) {
        const cellValue = dayRow[col];
        const cellText = String(cellValue || '').trim();
        
        console.log(`  Period ${periodNum} (col ${col}): "${cellText}" (type: ${typeof cellValue}, value: ${JSON.stringify(cellValue)})`);
        
        // Test isEmptyOrFree function
        const isEmpty = isEmptyOrFree(cellText);
        console.log(`  isEmptyOrFree("${cellText}") = ${isEmpty}`);
        
        if (!isEmpty) {
          const classCode = extractClassFromCell(cellText);
          if (!classCode) {
            console.log(`  - Could not extract class from "${cellText}"`);
          } else {
            schedule[dayKey][periodNum] = classCode;
            console.log(`  ✓ Found class at ${dayKey} period ${periodNum}: "${classCode}" (from "${cellText}")`);
            console.log(`  ✓ Schedule object after adding:`, schedule[dayKey]);
          }
        } else {
          console.log(`  - Empty/free period at ${dayKey} period ${periodNum}`);
        }
      } else {
        console.log(`  - Column ${col} is beyond row length ${dayRow.length}`);
      }
    });
  }
  
  console.log('Final parsed schedule:', schedule);
  
  // Debug: Show detailed schedule structure
  console.log('=== DETAILED SCHEDULE STRUCTURE ===');
  Object.entries(schedule).forEach(([day, dayData]) => {
    console.log(`${day}:`, dayData);
    Object.entries(dayData).forEach(([period, className]) => {
      console.log(`  Period ${period}: "${className}"`);
    });
  });
  
  // Validate the parsed schedule
  const totalClasses = Object.values(schedule).reduce((total, day) => total + Object.keys(day).length, 0);
  console.log(`Total classes parsed: ${totalClasses}`);
  
  // Debug: Show each day's class count
  Object.entries(schedule).forEach(([day, dayData]) => {
    const dayClassCount = Object.keys(dayData).length;
    console.log(`${day}: ${dayClassCount} classes`);
    if (dayClassCount > 0) {
      Object.entries(dayData).forEach(([period, className]) => {
        console.log(`  Period ${period}: "${className}"`);
      });
    }
  });
  
  if (totalClasses === 0) {
    console.warn('⚠️ No classes were parsed from this teacher\'s schedule!');
  }
  
  return schedule;
}

/**
 * Detect period columns dynamically from a header row
 * @param {Array} headerRow - The row containing period headers (e.g., "(1)", "(2)", ...)
 * @returns {Object} An object mapping period numbers to their column indices
 */
function detectPeriodColumns(headerRow) {
  const mapping = {};
  if (!Array.isArray(headerRow)) return mapping;
  for (let col = 0; col < headerRow.length; col++) {
    const raw = headerRow[col];
    if (raw == null) continue;
    const text = String(raw).replace(/\n/g, ' ').trim();
    const m = text.match(/^\((\d{1,2})\)/);
    if (m) {
      const periodNum = parseInt(m[1], 10);
      if (periodNum >= 1 && periodNum <= 12 && mapping[periodNum] == null) {
        mapping[periodNum] = col;
      }
    }
  }
  if (Object.keys(mapping).length === 0) {
    return { 1: 2, 2: 6, 3: 12, 4: 14, 5: 15, 6: 18, 7: 20, 8: 22, 9: 24, 10: 25 };
  }
  return mapping;
}

/**
 * Extract class code (e.g., 9-E) from a cell value
 * @param {string} cell - The cell value to extract from
 * @returns {string|null} The extracted class code or null if not found
 */
function extractClassFromCell(cell) {
  if (!cell) return null;
  const text = String(cell).toUpperCase().replace(/\s+/g, ' ').trim();
  const m = text.match(/\b(\d{1,2})[-\s]?([A-ZÇĞİÖŞÜ])\b/);
  if (!m) return null;
  return `${m[1]}-${m[2]}`;
}

/**
 * Check if a cell value represents an empty or free period
 * @param {string} cellValue - Cell value to check
 * @returns {boolean} True if empty or free period
 */
function isEmptyOrFree(cellValue) {
  // Handle null, undefined, empty string
  if (cellValue === null || cellValue === undefined || cellValue === '') {
    return true;
  }
  
  const text = String(cellValue).trim();
  
  // Handle string representations of null/undefined
  if (text === 'null' || text === 'undefined' || text === '') {
    return true;
  }
  
  // Check for "(PBO)" which indicates free period
  if (text === '(PBO)' || text === 'PBO') {
    return true;
  }
  
  // Check for very short text that's likely not a class
  if (text.length < 2) {
    return true;
  }
  
  // Check for numeric values that are not class codes (but allow class codes like "10-A")
  if (/^[0-9]+$/.test(text)) {
    return true;
  }
  
  // Check for common Excel empty indicators
  if (text === '-' || text === '0' || text === '0.0') {
    return true;
  }
  
  // Check for time patterns like "08:30" or "09:10" which are not classes
  if (/^[0-9]{1,2}:[0-9]{2}$/.test(text)) {
    return true;
  }
  
  // Check for period indicators like "(1)", "(2)", etc.
  if (/^\([0-9]+\)$/.test(text)) {
    return true;
  }
  
  // If text doesn't contain a class pattern, treat as empty for our use
  const hasClass = /\b\d{1,2}[-\s]?[A-ZÇĞİÖŞÜ]\b/.test(text);
  if (!hasClass) return true;
  
  // If we get here, it's likely a valid class
  return false;
}
