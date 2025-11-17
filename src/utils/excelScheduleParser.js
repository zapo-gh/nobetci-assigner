import * as XLSX from 'xlsx';

/**
 * Parse Excel schedule file for teacher assignments
 * @param {File} file - Excel file containing schedule data
 * @returns {Promise<Object>} Object with parsed schedule data
 */
export async function parseExcelSchedule(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    const schedule = {};
    const errors = [];

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

      // Debug: Show first 10 rows to understand structure
      console.log('First 10 rows of sheet data:');
      jsonData.slice(0, 10).forEach((row, index) => {
        console.log(`Row ${index}:`, row);
      });

      // Try to parse as schedule format
      const result = parseScheduleFormat(jsonData);

      if (result.schedule && Object.keys(result.schedule).length > 0) {
        // Merge schedules from different sheets
        Object.keys(result.schedule).forEach(day => {
          if (!schedule[day]) schedule[day] = {};
          Object.assign(schedule[day], result.schedule[day]);
        });
        console.log(`Parsed schedule from sheet "${sheetName}"`);
      } else {
        errors.push(`Sayfa "${sheetName}" içinde geçerli çizelge bulunamadı`);
      }
    });

    console.log('\n=== PARSING SUMMARY ===');
    console.log('Total schedule data parsed:', Object.keys(schedule).length);

    if (Object.keys(schedule).length === 0) {
      console.warn('⚠️ No schedule data was found in the Excel file!');
    }

    return {
      schedule,
      errors,
      summary: {
        sheets: workbook.SheetNames.length,
        days: Object.keys(schedule).length,
        errors: errors.length
      }
    };

  } catch (error) {
    throw new Error(`Excel çizelge parsing hatası: ${error.message}`);
  }
}

/**
 * Parse schedule format from sheet data
 * @param {Array} sheetData - 2D array of sheet data
 * @param {string} sheetName - Name of the sheet
 * @returns {Object} Parsed schedule data
 */
function parseScheduleFormat(sheetData) {
  const schedule = {};

  // Day mapping: Turkish day names to English keys
  const dayMapping = {
    'Pazartesi': 'monday',
    'Salı': 'tuesday',
    'Çarşamba': 'wednesday',
    'Perşembe': 'thursday',
    'Cuma': 'friday',
    'PAZARTESİ': 'monday',
    'SALI': 'tuesday',
    'ÇARŞAMBA': 'wednesday',
    'PERŞEMBE': 'thursday',
    'CUMA': 'friday'
  };

  // Find the header row (contains day names)
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(sheetData.length, 20); i++) {
    const row = sheetData[i];
    if (!row || row.length === 0) continue;

    const rowText = row.join(' ').toUpperCase();
    if (rowText.includes('PAZARTESİ') || rowText.includes('PZT') ||
        rowText.includes('GÜNLER') || rowText.includes('DAYS')) {
      headerRowIndex = i;
      console.log(`Found header row at index ${i}:`, row);
      break;
    }
  }

  if (headerRowIndex === -1) {
    console.log('Header row not found');
    return { schedule };
  }

  const headerRow = sheetData[headerRowIndex];
  console.log('Header row:', headerRow);

  // Find column indices for each day
  const dayColumns = {};
  headerRow.forEach((cell, colIndex) => {
    const cellValue = String(cell || '').trim();
    const dayKey = dayMapping[cellValue];
    if (dayKey) {
      dayColumns[dayKey] = colIndex;
      console.log(`Found ${cellValue} at column ${colIndex} -> ${dayKey}`);
    }
  });

  console.log('Day columns mapping:', dayColumns);

  // Process data rows starting from header + 1
  for (let rowIndex = headerRowIndex + 1; rowIndex < sheetData.length; rowIndex++) {
    const row = sheetData[rowIndex];
    if (!row || row.length === 0) continue;

    // Skip empty rows
    if (isRowEmpty(row)) continue;

    // First column should contain period/class info
    const firstCell = String(row[0] || '').trim();
    console.log(`\nProcessing row ${rowIndex}, first cell: "${firstCell}"`);

    // Try to extract period number from first cell
    const periodMatch = firstCell.match(/(\d+)/);
    if (!periodMatch) {
      console.log(`No period number found in "${firstCell}", skipping`);
      continue;
    }

    const period = parseInt(periodMatch[1], 10);
    if (period < 1 || period > 12) {
      console.log(`Invalid period ${period}, skipping`);
      continue;
    }

    console.log(`Found period ${period}`);

    // Process each day column
    Object.entries(dayColumns).forEach(([dayKey, colIndex]) => {
      if (colIndex >= row.length) return;

      const cellValue = String(row[colIndex] || '').trim();
      console.log(`  ${dayKey} (col ${colIndex}): "${cellValue}"`);

      if (!cellValue) return;

      // Extract teacher name from cell
      const teacherName = extractTeacherFromCell(cellValue);
      if (!teacherName) {
        console.log(`    No teacher found in "${cellValue}"`);
        return;
      }

      // Initialize schedule structure
      if (!schedule[dayKey]) schedule[dayKey] = {};
      if (!schedule[dayKey][period]) schedule[dayKey][period] = [];

      // Add teacher to schedule
      if (!schedule[dayKey][period].includes(teacherName)) {
        schedule[dayKey][period].push(teacherName);
        console.log(`    ✓ Added ${teacherName} to ${dayKey} period ${period}`);
      }
    });
  }

  console.log('Final parsed schedule:', schedule);

  // Validate the parsed schedule
  const totalAssignments = Object.values(schedule).reduce((total, day) =>
    total + Object.values(day).reduce((dayTotal, periods) =>
      dayTotal + periods.length, 0), 0);

  console.log(`Total assignments parsed: ${totalAssignments}`);

  if (totalAssignments === 0) {
    console.warn('⚠️ No assignments were parsed from this sheet!');
  }

  return { schedule };
}

/**
 * Extract teacher name from a cell value
 * @param {string} cellValue - Cell content
 * @returns {string|null} Teacher name or null if not found
 */
function extractTeacherFromCell(cellValue) {
  if (!cellValue) return null;

  const text = String(cellValue).trim();

  // Remove common prefixes/suffixes
  let cleanText = text
    .replace(/^(Öğretmen|Teacher|Mr\.|Mrs\.|Dr\.)\s*/i, '')
    .replace(/\s*(Öğretmen|Teacher|Mr\.|Mrs\.|Dr\.)$/i, '')
    .trim();

  // Check if it looks like a teacher name (contains spaces, Turkish characters)
  if (cleanText.length < 3 || cleanText.length > 50) return null;
  if (!/[A-ZÇĞIİÖŞÜa-zçğıiöşü]/.test(cleanText)) return null;
  if (!cleanText.includes(' ')) return null; // Must have first and last name

  // Remove numbers and special characters except spaces and Turkish chars
  cleanText = cleanText.replace(/[^A-ZÇĞIİÖŞÜa-zçğıiöşü\s]/g, '').trim();

  if (cleanText.length < 3) return null;

  return cleanText;
}

/**
 * Check if row is empty
 * @param {Array} row - Row data
 * @returns {boolean} True if row is empty
 */
function isRowEmpty(row) {
  return row.every(cell => !cell || String(cell).trim() === '');
}
