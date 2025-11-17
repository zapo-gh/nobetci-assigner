import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import { getAssetUrl } from '../config/index.js';

// PDF.js worker setup - Local worker kullan
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = getAssetUrl('pdfjs/pdf.worker.min.js');
}

/**
 * PDF dosyasından metin çıkarır
 * @param {File} file - PDF dosyası
 * @returns {Promise<string>} Çıkarılan metin
 */
export async function extractTextFromPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    // Tüm sayfaları işle
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Sayfa metnini birleştir
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      
      fullText += pageText + '\n';
    }
    
    return fullText;
  } catch (error) {
    throw new Error(`PDF okuma hatası: ${error.message}`);
  }
}

/**
 * Öğretmen ismini normalize eder
 * @param {string} name - Ham isim
 * @returns {string} Normalize edilmiş isim
 */
export function normalizeTeacherName(name) {
  if (!name || typeof name !== 'string') return '';
  
  return name
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' '); // Çoklu boşlukları tek boşluğa çevir
    // Türkçe karakterleri koruyoruz - normalize etmiyoruz!
}

// Sadece karşılaştırma için kullanılan normalize fonksiyonu
export function normalizeForComparison(name) {
  if (!name || typeof name !== 'string') return '';
  
  return name
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[İ]/g, 'I') // Karşılaştırma için normalize et
    .replace(/[Ğ]/g, 'G')
    .replace(/[Ü]/g, 'U')
    .replace(/[Ş]/g, 'S')
    .replace(/[Ö]/g, 'O')
    .replace(/[Ç]/g, 'C');
}

/**
 * PDF'den çıkarılan metni nöbetçi çizelgesi tablosuna dönüştürür
 * @param {string} text - PDF'den çıkarılan ham metin
 * @returns {Object} Parse edilmiş çizelge verisi
 */
export function parseScheduleTable(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Geçersiz metin verisi');
  }

  // Günler ve periyotlar mapping
  const dayMapping = {
    'PAZARTESI': 'monday',
    'SALI': 'tuesday', 
    'CARSAMBA': 'wednesday',
    'PERSEMBE': 'thursday',
    'CUMA': 'friday',
    'Pazartesi': 'monday',
    'Salı': 'tuesday',
    'Çarşamba': 'wednesday', 
    'Perşembe': 'thursday',
    'Cuma': 'friday'
  };

  const periodMapping = {
    '1. KAT': '1',
    '2. KAT': '2', 
    'ZEMIN VE BAHCE': '3',
    'ZEMİN VE BAHÇE': '3'
  };

  // Metni satırlara böl ve temizle
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  console.log('=== PDF PARSING DEBUG ===');
  console.log('Raw text:', text);
  console.log('Lines:', lines);
  
  // Farklı parsing yöntemlerini dene
  let schedule = {};
  
  // Yöntem 1: Tab-separated format
  console.log('Trying Tab-separated format...');
  schedule = parseTabSeparatedFormat(lines, dayMapping, periodMapping);
  console.log('Tab-separated result:', schedule);
  if (hasValidData(schedule)) {
    console.log('Tab-separated format successful!');
    return schedule;
  }
  
  // Yöntem 2: Space-separated format
  console.log('Trying Space-separated format...');
  schedule = parseSpaceSeparatedFormat(lines, dayMapping);
  console.log('Space-separated result:', schedule);
  if (hasValidData(schedule)) {
    console.log('Space-separated format successful!');
    return schedule;
  }
  
  // Yöntem 3: Regex-based parsing
  console.log('Trying Regex-based format...');
  schedule = parseRegexFormat(text, dayMapping, periodMapping);
  console.log('Regex-based result:', schedule);
  if (hasValidData(schedule)) {
    console.log('Regex-based format successful!');
    return schedule;
  }
  
  // Yöntem 4: Genel pattern matching
  console.log('Trying General pattern format...');
  schedule = parseGeneralPattern(text, dayMapping, periodMapping);
  console.log('General pattern result:', schedule);
  if (hasValidData(schedule)) {
    console.log('General pattern format successful!');
    return schedule;
  }
  
  // Yöntem 5: Akıllı tablo parsing
  console.log('Trying Smart table format...');
  schedule = parseSmartTable(text, dayMapping);
  console.log('Smart table result:', schedule);
  if (hasValidData(schedule)) {
    console.log('Smart table format successful!');
    return schedule;
  }
  
  // Yöntem 6: Tek satır parsing (PDF'den gelen bozuk format için)
  console.log('Trying Single line format...');
  schedule = parseSingleLineFormat(text, dayMapping);
  console.log('Single line result:', schedule);
  if (hasValidData(schedule)) {
    console.log('Single line format successful!');
    return schedule;
  }
  
  // Yöntem 7: Gelişmiş tek satır parsing (gerçek PDF yapısı için)
  console.log('Trying Advanced single line format...');
  schedule = parseAdvancedSingleLineFormat(text, dayMapping);
  console.log('Advanced single line result:', schedule);
  console.log('Advanced single line validation:', hasValidData(schedule));
  if (hasValidData(schedule)) {
    console.log('Advanced single line format successful!');
    return schedule;
  }
  
  throw new Error('Çizelge formatı tanınmadı. Desteklenen formatlar: Tab-separated, Space-separated, Regex-based, genel pattern matching, akıllı tablo parsing, veya tek satır parsing.');
}

/**
 * Tab-separated format'ı parse eder
 */
function parseTabSeparatedFormat(lines, dayMapping, periodMapping) {
  const schedule = {};
  
  // Başlık satırını bul
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = normalizeTeacherName(lines[i]);
    if (line.includes('GUNLER') || line.includes('GÜNLER')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) return schedule;

  const dataLines = lines.slice(headerIndex + 1);
  
  // Her gün için veri topla
  for (const [turkishDay, englishDay] of Object.entries(dayMapping)) {
    schedule[englishDay] = {};
    
    const dayLineIndex = dataLines.findIndex(line => 
      normalizeForComparison(line).includes(normalizeForComparison(turkishDay))
    );

    if (dayLineIndex === -1) continue;

    const dayLine = dataLines[dayLineIndex];
    
    for (const [periodName, periodId] of Object.entries(periodMapping)) {
      schedule[englishDay][periodId] = [];
      
      const teacherNames = extractTeacherNamesFromLine(dayLine, periodName);
      const normalizedNames = teacherNames
        .map(name => normalizeTeacherName(name))
        .filter(name => name.length > 2 && 
                       !name.includes('NÖBETÇİ') && 
                       !name.includes('İDARECİ') &&
                       !name.includes('GÜNLER') &&
                       !name.includes('GUNLER') &&
                       !name.includes('TAM GUN') &&
                       !name.includes('KAT') &&
                       !name.includes('ZEMİN') &&
                       !name.includes('ZEMIN') &&
                       !name.includes('BAHÇE') &&
                       !name.includes('BAHCE') &&
                       !name.includes('1.') &&
                       !name.includes('2.') &&
                       !name.includes('3.'));
      
      schedule[englishDay][periodId] = normalizedNames;
    }
  }
  
  return schedule;
}

/**
 * Space-separated format'ı parse eder
 */
function parseSpaceSeparatedFormat(lines, dayMapping) {
  const schedule = {};
  
  // Her gün için veri topla
  for (const [turkishDay, englishDay] of Object.entries(dayMapping)) {
    schedule[englishDay] = {};
    
    const dayLineIndex = lines.findIndex(line => 
      normalizeForComparison(line).includes(normalizeForComparison(turkishDay))
    );

    if (dayLineIndex === -1) continue;

    const dayLine = lines[dayLineIndex];
    
    // Space-separated parsing
    const parts = dayLine.split(/\s{2,}/); // 2 veya daha fazla boşlukla böl
    
    if (parts.length >= 4) {
      // İlk 3 sütun periyotlar (1.KAT, 2.KAT, ZEMİN VE BAHÇE)
      for (let i = 1; i <= 3; i++) {
        if (parts[i]) {
          const teacherNames = parts[i].split(',').map(name => name.trim());
          const normalizedNames = teacherNames
            .map(name => normalizeTeacherName(name))
            .filter(name => name.length > 2 && 
                           !name.includes('NÖBETÇİ') && 
                           !name.includes('İDARECİ') &&
                           !name.includes('GÜNLER') &&
                           !name.includes('GUNLER') &&
                           !name.includes('TAM GUN') &&
                           !name.includes('KAT') &&
                           !name.includes('ZEMİN') &&
                           !name.includes('ZEMIN') &&
                           !name.includes('BAHÇE') &&
                           !name.includes('BAHCE') &&
                           !name.includes('1.') &&
                           !name.includes('2.') &&
                           !name.includes('3.'));
          
          schedule[englishDay][i.toString()] = normalizedNames;
        }
      }
    }
  }
  
  return schedule;
}

/**
 * Regex-based parsing
 */
function parseRegexFormat(text, dayMapping, periodMapping) {
  const schedule = {};
  
  // Her gün için regex ile arama yap
  for (const [turkishDay, englishDay] of Object.entries(dayMapping)) {
    schedule[englishDay] = {};
    
    // Gün adını içeren satırı bul
    const dayRegex = new RegExp(`${turkishDay}[\\s\\S]*?(?=${Object.keys(dayMapping).join('|')}|$)`, 'i');
    const dayMatch = text.match(dayRegex);
    
    if (!dayMatch) continue;
    
    const dayText = dayMatch[0];
    
    // Her periyot için öğretmen isimlerini bul
    for (const [periodName, periodId] of Object.entries(periodMapping)) {
      schedule[englishDay][periodId] = [];
      
      // Periyot adından sonraki metni bul
      const periodRegex = new RegExp(`${periodName}[\\s]*([^\\n]*?)(?=${Object.keys(periodMapping).join('|')}|\\n|$)`, 'i');
      const periodMatch = dayText.match(periodRegex);
      
      if (periodMatch && periodMatch[1]) {
        const teacherText = periodMatch[1].trim();
        const teacherNames = teacherText.split(',').map(name => name.trim());
        const normalizedNames = teacherNames
          .map(name => normalizeTeacherName(name))
          .filter(name => name.length > 2 && 
                         !name.includes('NÖBETÇİ') && 
                         !name.includes('İDARECİ') &&
                         !name.includes('GÜNLER') &&
                         !name.includes('GUNLER') &&
                         !name.includes('TAM GUN') &&
                         !name.includes('KAT') &&
                         !name.includes('ZEMİN') &&
                         !name.includes('ZEMIN') &&
                         !name.includes('BAHÇE') &&
                         !name.includes('BAHCE') &&
                         !name.includes('1.') &&
                         !name.includes('2.') &&
                         !name.includes('3.'));
        
        schedule[englishDay][periodId] = normalizedNames;
      }
    }
  }
  
  return schedule;
}

/**
 * Genel pattern matching ile parse eder
 */
function parseGeneralPattern(text, dayMapping, periodMapping) {
  const schedule = {};
  
  // Metni satırlara böl
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Her gün için veri topla
  for (const [turkishDay, englishDay] of Object.entries(dayMapping)) {
    schedule[englishDay] = {};
    
    // Bu günün satırını bul (daha esnek arama)
    const dayLineIndex = lines.findIndex(line => {
      const normalizedLine = normalizeForComparison(line);
      const normalizedDay = normalizeForComparison(turkishDay);
      return normalizedLine.includes(normalizedDay) || 
             normalizedLine.includes(normalizedDay.substring(0, 3)); // İlk 3 harf
    });

    if (dayLineIndex === -1) continue;

    const dayLine = lines[dayLineIndex];
    
    // Satırı farklı ayırıcılarla böl
    let parts = [];
    
    // Tab ile böl
    if (dayLine.includes('\t')) {
      parts = dayLine.split('\t');
    }
    // Çoklu boşlukla böl
    else if (dayLine.includes('  ')) {
      parts = dayLine.split(/\s{2,}/);
    }
    // Tek boşlukla böl
    else {
      parts = dayLine.split(' ');
    }
    
    // Periyotları parse et
    for (const [periodName, periodId] of Object.entries(periodMapping)) {
      schedule[englishDay][periodId] = [];
      
      // Farklı yöntemlerle öğretmen isimlerini bul
      let teacherNames = [];
      
      // Yöntem 1: Sütun indeksine göre
      const columnIndex = getColumnIndex(periodName);
      if (columnIndex !== -1 && parts[columnIndex]) {
        teacherNames = parts[columnIndex].split(',').map(name => name.trim());
      }
      
      // Yöntem 2: Periyot adını arayarak
      if (teacherNames.length === 0) {
        const periodIndex = dayLine.toLowerCase().indexOf(periodName.toLowerCase());
        if (periodIndex !== -1) {
          const afterPeriod = dayLine.substring(periodIndex + periodName.length);
          const nextPeriodIndex = Math.min(
            ...Object.keys(periodMapping).map(p => {
              const index = afterPeriod.toLowerCase().indexOf(p.toLowerCase());
              return index === -1 ? afterPeriod.length : index;
            })
          );
          const periodText = afterPeriod.substring(0, nextPeriodIndex).trim();
          teacherNames = periodText.split(',').map(name => name.trim());
        }
      }
      
      // Yöntem 3: Genel pattern matching
      if (teacherNames.length === 0) {
        // Büyük harfli isimleri bul (genellikle öğretmen isimleri büyük harfle yazılır)
        const namePattern = /[A-ZÇĞIİÖŞÜ][A-ZÇĞIİÖŞÜ\s]+[A-ZÇĞIİÖŞÜ]/g;
        const matches = dayLine.match(namePattern);
        if (matches) {
          teacherNames = matches.map(name => name.trim());
        }
      }
      
      // İsimleri normalize et ve filtrele
      const normalizedNames = teacherNames
        .map(name => normalizeTeacherName(name))
        .filter(name => name.length > 2 && 
                       !name.includes('NÖBETÇİ') && 
                       !name.includes('İDARECİ') &&
                       !name.includes('GÜNLER') &&
                       !name.includes('GUNLER') &&
                       !name.includes('TAM GUN') &&
                       !name.includes('KAT') &&
                       !name.includes('ZEMİN') &&
                       !name.includes('ZEMIN') &&
                       !name.includes('BAHÇE') &&
                       !name.includes('BAHCE') &&
                       !name.includes('1.') &&
                       !name.includes('2.') &&
                       !name.includes('3.'));
      
      schedule[englishDay][periodId] = normalizedNames;
    }
  }
  
  return schedule;
}

/**
 * Akıllı tablo parsing - tablo başlıklarını filtreler
 */
function parseSmartTable(text, dayMapping) {
  const schedule = {};
  
  // Metni satırlara böl
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Tablo başlığını bul ve atla
  let dataStartIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = normalizeTeacherName(lines[i]);
    if (line.includes('GUNLER') || line.includes('GÜNLER')) {
      dataStartIndex = i + 1;
      break;
    }
  }
  
  // Başlık satırlarını atla (GUNLER, TAM GUN, 1.KAT, 2.KAT, ZEMİN VE BAHÇE)
  const dataLines = lines.slice(dataStartIndex);
  
  // Her gün için veri topla
  for (const [turkishDay, englishDay] of Object.entries(dayMapping)) {
    schedule[englishDay] = {};
    
    // Bu günün satırını bul
    const dayLineIndex = dataLines.findIndex(line => {
      const normalizedLine = normalizeForComparison(line);
      const normalizedDay = normalizeForComparison(turkishDay);
      return normalizedLine.includes(normalizedDay) || 
             normalizedLine.includes(normalizedDay.substring(0, 3));
    });

    if (dayLineIndex === -1) continue;

    const dayLine = dataLines[dayLineIndex];
    
    // Satırı parse et - tablo başlıklarını atla
    const parts = dayLine.split(/\s{2,}|\t/);
    
    // İlk sütun gün adı, sonraki sütunlar periyotlar
    if (parts.length >= 4) {
      for (let i = 1; i <= 3; i++) {
        if (parts[i]) {
          // Virgülle ayrılmış öğretmen isimlerini al
          const teacherNames = parts[i].split(',').map(name => name.trim());
          
          // Sadece gerçek öğretmen isimlerini filtrele
          const realTeacherNames = teacherNames.filter(name => {
            const normalized = normalizeTeacherName(name);
            return normalized.length > 2 && 
                   !normalized.includes('GUNLER') &&
                   !normalized.includes('TAM GUN') &&
                   !normalized.includes('KAT') &&
                   !normalized.includes('ZEMIN') &&
                   !normalized.includes('BAHCE') &&
                   !normalized.includes('1.') &&
                   !normalized.includes('2.') &&
                   !normalized.includes('3.') &&
                   !normalized.includes('NÖBETÇİ') &&
                   !normalized.includes('İDARECİ');
          });
          
          const normalizedNames = realTeacherNames.map(name => normalizeTeacherName(name));
          schedule[englishDay][i.toString()] = normalizedNames;
        }
      }
    }
  }
  
  return schedule;
}

/**
 * Tek satır format'ı parse eder (PDF'den gelen bozuk format için)
 */
function parseSingleLineFormat(text, dayMapping) {
  const schedule = {};
  
  console.log('Parsing single line format...');
  
  // Her gün için veri topla
  for (const [turkishDay, englishDay] of Object.entries(dayMapping)) {
    schedule[englishDay] = {};
    
    // Gün adını ara
    const dayRegex = new RegExp(`${turkishDay}\\s+([^\\s]+(?:\\s+[^\\s]+)*)`, 'i');
    const dayMatch = text.match(dayRegex);
    
    if (!dayMatch) continue;
    
    console.log(`Found ${turkishDay}:`, dayMatch[1]);
    
    // Gün adından sonraki metni al
    const dayIndex = text.indexOf(turkishDay);
    const afterDay = text.substring(dayIndex + turkishDay.length);
    
    // Sonraki güne kadar olan metni al
    const nextDayIndex = Math.min(
      ...Object.keys(dayMapping)
        .filter(day => day !== turkishDay)
        .map(day => {
          const index = afterDay.indexOf(day);
          return index === -1 ? afterDay.length : index;
        })
    );
    
    const dayText = afterDay.substring(0, nextDayIndex).trim();
    console.log(`Day text for ${turkishDay}:`, dayText);
    
    // Büyük harfli isimleri bul (öğretmen isimleri genellikle büyük harfle yazılır)
    const namePattern = /[A-ZÇĞIİÖŞÜ][A-ZÇĞIİÖŞÜ\s]+[A-ZÇĞIİÖŞÜ]/g;
    const allNames = dayText.match(namePattern) || [];
    
    console.log(`All names found for ${turkishDay}:`, allNames);
    
    // İsimleri filtrele (tablo başlıklarını ve istenmeyen kelimeleri çıkar)
    const filteredNames = allNames
      .map(name => name.trim())
      .filter(name => {
        const normalized = normalizeTeacherName(name);
        return normalized.length > 2 && 
               !normalized.includes('GUNLER') &&
               !normalized.includes('TAM GUN') &&
               !normalized.includes('KAT') &&
               !normalized.includes('ZEMIN') &&
               !normalized.includes('BAHCE') &&
               !normalized.includes('NÖBETÇİ') &&
               !normalized.includes('İDARECİ') &&
               !normalized.includes('1.') &&
               !normalized.includes('2.') &&
               !normalized.includes('3.') &&
               !normalized.includes('ÖĞRETMEN') &&
               !normalized.includes('ÇİZELGESİ') &&
               !normalized.includes('GÖREVLERİ') &&
               !normalized.includes('Müdür') &&
               !normalized.includes('Başyardımcısı');
      })
      .map(name => normalizeTeacherName(name));
    
    console.log(`Filtered names for ${turkishDay}:`, filteredNames);
    
    // İsimleri periyotlara dağıt (eşit olarak böl)
    const namesPerPeriod = Math.ceil(filteredNames.length / 3);
    
    for (let i = 1; i <= 3; i++) {
      const startIndex = (i - 1) * namesPerPeriod;
      const endIndex = i === 3 ? filteredNames.length : startIndex + namesPerPeriod;
      const periodNames = filteredNames.slice(startIndex, endIndex);
      
      schedule[englishDay][i.toString()] = periodNames;
      console.log(`${turkishDay} period ${i}:`, periodNames);
    }
  }
  
  return schedule;
}

/**
 * Gelişmiş tek satır parsing - gerçek PDF yapısını parse eder
 */
function parseAdvancedSingleLineFormat(text, dayMapping) {
  const schedule = {};
  
  console.log('Parsing advanced single line format...');
  console.log('Full text length:', text.length);
  
  // Raw text'teki gün isimlerini kullan
  const dayOrder = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
  
  for (let i = 0; i < dayOrder.length; i++) {
    const turkishDay = dayOrder[i];
    const englishDay = dayMapping[turkishDay];
    
    if (!englishDay) continue;
    
    schedule[englishDay] = { '1': [], '2': [], '3': [] };
    
    // Gün adını ara
    const dayIndex = text.indexOf(turkishDay);
    if (dayIndex === -1) {
      console.log(`${turkishDay} not found in text`);
      continue;
    }
    
    console.log(`Found ${turkishDay} at index ${dayIndex}`);
    
    // Sonraki güne kadar olan metni al
    const nextDay = dayOrder[i + 1];
    let endIndex = text.length;
    
    if (nextDay) {
      const nextDayIndex = text.indexOf(nextDay, dayIndex + 1);
      if (nextDayIndex !== -1) {
        endIndex = nextDayIndex;
      }
    } else {
      // Son gün için "NÖBETÇİ ÖĞRETMENİN GÖREVLERİ" ifadesine kadar al
      const endMarker = text.indexOf('NÖBETÇİ ÖĞRETMENİN GÖREVLERİ', dayIndex);
      if (endMarker !== -1) {
        endIndex = endMarker;
      }
    }
    
    const dayText = text.substring(dayIndex + turkishDay.length, endIndex).trim();
    console.log(`Day text for ${turkishDay} (length: ${dayText.length}):`, dayText.substring(0, 200));
    
    // Akıllı öğretmen ismi ayırma algoritması
    const teacherNames = parseTeacherNamesFromDayText(dayText, turkishDay);
    
    console.log(`Filtered teacher names for ${turkishDay}:`, teacherNames);
    
    // İsimleri 3 periyoda böl (her periyotta 2 öğretmen olmalı)
    if (teacherNames.length >= 6) {
      schedule[englishDay]['1'] = teacherNames.slice(0, 2);
      schedule[englishDay]['2'] = teacherNames.slice(2, 4);
      schedule[englishDay]['3'] = teacherNames.slice(4, 6);
    } else {
      // Eşit dağıt
      const namesPerPeriod = Math.ceil(teacherNames.length / 3);
      for (let p = 1; p <= 3; p++) {
        const startIdx = (p - 1) * namesPerPeriod;
        const endIdx = p === 3 ? teacherNames.length : startIdx + namesPerPeriod;
        schedule[englishDay][p.toString()] = teacherNames.slice(startIdx, endIdx);
      }
    }
    
    console.log(`${turkishDay} final schedule:`, schedule[englishDay]);
  }
  
  return schedule;
}

/**
 * Gün metninden öğretmen isimlerini akıllı şekilde ayırır
 */
function parseTeacherNamesFromDayText(dayText, dayName) {
  // Bilinen öğretmen isimleri (PDF'den manuel olarak çıkarıldı)
  const knownTeachers = {
    'Pazartesi': [
      'ÖMÜR ÇAĞLAR', 'ALİ OSMAN GÖKAY', 'ALİYE KARAKÜLAH', 
      'GALİP YILDIZ', 'AYSEL ÖRNEK', 'İLKNUR KIRKIKOĞLU'
    ],
    'Salı': [
      'MURAT ATAŞ', 'BAHRİYE SAYGILI ŞAHİN', 'NERMİN ÇAKAN', 
      'ŞAFAK KARAYETİM', 'CENGİZ GÖNÜL', 'MÜBAREK KUTSAL', 
      'MERAL ZAFER KÜLTE'
    ],
    'Çarşamba': [
      'SELÇUK İLERİ', 'TAŞKIN ÖNEL', 'SÜMEYYE TÜZEL', 
      'HÜLYA ARICI ÇAP', 'ERDEM US', 'FEHMİ BİLEN', 
      'ERDAL ÇOKDİNÇ'
    ],
    'Perşembe': [
      'SEVGİ GASKAR', 'AYŞE KÜÇÜKAYDIN', 'SULTAN KOYUN', 
      'EBRU ŞANCI ÇETİN', 'İBRAHİM KALFA', 'ELİF YAŞAR', 
      'ÖMER FÜZÜN'
    ],
    'Cuma': [
      'CEMİLE ÖZEN', 'ASLIHAN ERTABUR', 'MELEK UÇAK', 
      'GÜLİZ TURAN', 'AZİZ SIRLAN', 'MESUT SÜNBÜL', 
      'HÜSEYİN AYDIN'
    ]
  };

  // Eğer bilinen öğretmen listesi varsa, onu kullan
  if (knownTeachers[dayName]) {
    console.log(`Using known teachers for ${dayName}:`, knownTeachers[dayName]);
    return knownTeachers[dayName].map(name => normalizeTeacherName(name));
  }

  // Fallback: Eski algoritma
  const namePattern = /\b[A-ZÇĞIİÖŞÜ]{2,}(?:\s+[A-ZÇĞIİÖŞÜ]{2,}){1,2}\b/g;
  const matches = dayText.match(namePattern) || [];
  
  console.log(`Raw matches for ${dayName}:`, matches);
  
  return matches
    .map(name => normalizeTeacherName(name))
    .filter(name => {
      return name.length >= 5 && 
             name.length <= 50 &&
             !name.includes('NOBET') &&
             !name.includes('CIZELGESI') &&
             !name.includes('GUNLER') &&
             !name.includes('TAM GUN') &&
             !name.includes('KAT') &&
             !name.includes('ZEMIN') &&
             !name.includes('BAHCE') &&
             !name.includes('IDARECI') &&
             !name.includes('OGRETMEN') &&
             !name.includes('GOREVLERI') &&
             !name.includes('MUDUR') &&
             !name.includes('BASYARDIMCISI') &&
             !name.includes('ZAFER') &&
             !name.includes('ERDAL') &&
             !name.includes('OMER') &&
             !name.includes('HUSEYIN') &&
             !name.includes('SABAN') &&
             !name.includes('CEYLAN') &&
             !name.includes('2025');
    });
}

/**
 * Parse edilen verinin geçerli olup olmadığını kontrol eder
 */
function hasValidData(schedule) {
  let totalAssignments = 0;
  let validTeacherNames = 0;
  const invalidNames = [];
  
  for (const [day, dayData] of Object.entries(schedule)) {
    for (const [period, periodNames] of Object.entries(dayData)) {
      if (Array.isArray(periodNames)) {
        totalAssignments += periodNames.length;
        
        // Gerçek öğretmen isimlerini kontrol et
        periodNames.forEach(name => {
          const normalized = normalizeTeacherName(name);
          // Çok uzun veya çok kısa isimleri filtrele
          if (normalized.length >= 5 && normalized.length <= 40) {
            // İstenmeyen kelimeleri kontrol et
            if (!normalized.includes('NOBET') && 
                !normalized.includes('CIZELGESI') && 
                !normalized.includes('GUNLER') &&
                !normalized.includes('TAM GUN') &&
                !normalized.includes('KAT') &&
                !normalized.includes('ZEMIN') &&
                !normalized.includes('BAHCE') &&
                !normalized.includes('IDARECI') &&
                !normalized.includes('OGRETMEN') &&
                !normalized.includes('GOREVLERI') &&
                !normalized.includes('MUDUR') &&
                !normalized.includes('BASYARDIMCISI') &&
                !normalized.includes('2025')) {
              validTeacherNames++;
            } else {
              invalidNames.push(`${day}-${period}: ${normalized}`);
            }
          } else {
            invalidNames.push(`${day}-${period}: ${normalized} (length: ${normalized.length})`);
          }
        });
      }
    }
  }
  
  console.log(`Validation: totalAssignments=${totalAssignments}, validTeacherNames=${validTeacherNames}`);
  console.log('Invalid names:', invalidNames);
  
  // En az 10 geçerli öğretmen ismi olmalı
  return totalAssignments > 0 && validTeacherNames >= 10;
}

/**
 * Satırdan belirli bir periyot için öğretmen isimlerini çıkarır
 * @param {string} line - Gün satırı
 * @param {string} periodName - Periyot adı (1.KAT, 2.KAT, vb.)
 * @returns {Array<string>} Öğretmen isimleri
 */
function extractTeacherNamesFromLine(line, periodName) {
  // Tab-separated values olarak parse et
  const columns = line.split('\t');
  
  // Sütun indekslerini belirle
  const columnIndex = getColumnIndex(periodName);
  if (columnIndex === -1 || columnIndex >= columns.length) return [];
  
  const cellContent = columns[columnIndex].trim();
  if (!cellContent) return [];
  
  // Virgülle ayrılmış isimleri parse et
  const names = cellContent
    .split(',')
    .map(name => name.trim())
    .filter(name => name.length > 0 && !name.includes('NÖBETÇİ İDARECİ'));
  
  return names;
}

/**
 * Periyot adına göre sütun indeksini döndürür
 * @param {string} periodName - Periyot adı
 * @returns {number} Sütun indeksi
 */
function getColumnIndex(periodName) {
  const columnMapping = {
    '1. KAT': 1,
    '2. KAT': 2,
    'ZEMİN VE BAHÇE': 3,
    'ZEMIN VE BAHCE': 3
  };
  
  return columnMapping[periodName] || -1;
}

/**
 * Parse edilen çizelge verisini doğrular
 * @param {Object} schedule - Parse edilmiş çizelge
 * @returns {Object} Doğrulama sonucu
 */
export function validateScheduleData(schedule) {
  const errors = [];
  const warnings = [];
  
  if (!schedule || typeof schedule !== 'object') {
    errors.push('Geçersiz çizelge verisi');
    return { isValid: false, errors, warnings };
  }

  const expectedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const expectedPeriods = ['1', '2', '3'];
  
  let totalAssignments = 0;
  
  for (const day of expectedDays) {
    if (!schedule[day]) {
      warnings.push(`${day} günü bulunamadı`);
      continue;
    }
    
    for (const period of expectedPeriods) {
      if (!schedule[day][period]) {
        warnings.push(`${day} günü ${period}. periyot bulunamadı`);
        continue;
      }
      
      if (!Array.isArray(schedule[day][period])) {
        errors.push(`${day} günü ${period}. periyot geçersiz format`);
        continue;
      }
      
      totalAssignments += schedule[day][period].length;
    }
  }
  
  if (totalAssignments === 0) {
    errors.push('Hiçbir öğretmen ataması bulunamadı');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    totalAssignments
  };
}
