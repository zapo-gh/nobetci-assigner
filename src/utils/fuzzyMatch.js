import FuzzySet from 'fuzzyset.js';

/**
 * İki isim arasındaki benzerlik skorunu hesaplar
 * @param {string} name1 - İlk isim
 * @param {string} name2 - İkinci isim
 * @returns {number} Benzerlik skoru (0-1 arası)
 */
export function calculateSimilarity(name1, name2) {
  if (!name1 || !name2) return 0;
  
  // İsimleri normalize et
  const normalized1 = normalizeForComparison(name1);
  const normalized2 = normalizeForComparison(name2);
  
  // Exact match kontrolü
  if (normalized1 === normalized2) return 1.0;
  
  // FuzzySet kullan
  const fuzzySet = FuzzySet([normalized1]);
  const results = fuzzySet.get(normalized2);
  
  if (results && results.length > 0) {
    return results[0][0]; // İlk sonucun skorunu döndür
  }
  
  // Contains match kontrolü
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return 0.7;
  }
  
  return 0;
}

/**
 * Karşılaştırma için ismi normalize eder
 * @param {string} name - Ham isim
 * @returns {string} Normalize edilmiş isim
 */
function normalizeForComparison(name) {
  if (!name || typeof name !== 'string') return '';
  
  return name
    .trim()
    .toUpperCase()
    .replace(/[İ]/g, 'I')
    .replace(/[Ğ]/g, 'G')
    .replace(/[Ü]/g, 'U')
    .replace(/[Ş]/g, 'S')
    .replace(/[Ö]/g, 'O')
    .replace(/[Ç]/g, 'C')
    .replace(/[.,]/g, '') // Nokta ve virgül kaldır
    .replace(/\s+/g, ' ') // Çoklu boşlukları tek boşluğa çevir
    .trim();
}

/**
 * PDF'deki ismi sistemdeki öğretmenlerle eşleştirir
 * @param {string} pdfName - PDF'den gelen isim
 * @param {Array} systemTeachers - Sistemdeki öğretmen listesi
 * @param {number} threshold - Minimum benzerlik eşiği (varsayılan: 0.7)
 * @returns {Object|null} Eşleştirme sonucu
 */
export function findBestMatch(pdfName, systemTeachers, threshold = 0.7) {
  if (!pdfName || !systemTeachers || !Array.isArray(systemTeachers)) {
    return null;
  }

  let bestMatch = null;
  let bestScore = 0;

  for (const teacher of systemTeachers) {
    const teacherName = teacher.teacherName || teacher.name || '';
    const score = calculateSimilarity(pdfName, teacherName);
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        teacher,
        confidence: score,
        pdfName,
        systemName: teacherName
      };
    }
  }

  // Eşik değerini kontrol et
  if (bestScore >= threshold) {
    return bestMatch;
  }

  return null;
}

/**
 * Birden fazla PDF ismini toplu olarak eşleştirir
 * @param {Array} pdfNames - PDF'den gelen isim listesi
 * @param {Array} systemTeachers - Sistemdeki öğretmen listesi
 * @param {number} threshold - Minimum benzerlik eşiği
 * @returns {Object} Eşleştirme sonuçları
 */
export function batchMatchNames(pdfNames, systemTeachers, threshold = 0.7) {
  const results = {
    matched: [], // Başarılı eşleşmeler
    uncertain: [], // Belirsiz eşleşmeler (düşük güven)
    unmatched: [] // Eşleşmeyenler
  };

  if (!Array.isArray(pdfNames) || !Array.isArray(systemTeachers)) {
    return results;
  }

  for (const pdfName of pdfNames) {
    const match = findBestMatch(pdfName, systemTeachers, threshold);
    
    if (match) {
      if (match.confidence >= 0.8) {
        // Yüksek güven - otomatik eşleştir
        results.matched.push(match);
      } else {
        // Düşük güven - kullanıcı onayı gerekli
        results.uncertain.push(match);
      }
    } else {
      // Eşleşme bulunamadı
      results.unmatched.push({
        pdfName,
        confidence: 0,
        teacher: null,
        systemName: null
      });
    }
  }

  return results;
}

/**
 * Eşleştirme sonuçlarını özetler
 * @param {Object} results - Eşleştirme sonuçları
 * @returns {Object} Özet bilgiler
 */
export function summarizeMatchingResults(results) {
  const summary = {
    total: 0,
    matched: results.matched?.length || 0,
    uncertain: results.uncertain?.length || 0,
    unmatched: results.unmatched?.length || 0,
    successRate: 0
  };

  summary.total = summary.matched + summary.uncertain + summary.unmatched;
  
  if (summary.total > 0) {
    summary.successRate = (summary.matched / summary.total) * 100;
  }

  return summary;
}

/**
 * Manuel eşleştirme için öneriler getirir
 * @param {string} pdfName - PDF'den gelen isim
 * @param {Array} systemTeachers - Sistemdeki öğretmen listesi
 * @param {number} limit - Maksimum öneri sayısı
 * @returns {Array} Öneri listesi
 */
export function getMatchingSuggestions(pdfName, systemTeachers, limit = 5) {
  if (!pdfName || !systemTeachers || !Array.isArray(systemTeachers)) {
    return [];
  }

  const suggestions = systemTeachers
    .map(teacher => ({
      teacher,
      score: calculateSimilarity(pdfName, teacher.teacherName || teacher.name || ''),
      systemName: teacher.teacherName || teacher.name || ''
    }))
    .filter(suggestion => suggestion.score > 0.1) // Çok düşük skorları filtrele
    .sort((a, b) => b.score - a.score) // Yüksek skorlu olanları önce getir
    .slice(0, limit); // Limit kadar öneri al

  return suggestions;
}

/**
 * Çakışan eşleştirmeleri tespit eder
 * @param {Array} matches - Eşleştirme sonuçları
 * @returns {Array} Çakışan eşleştirmeler
 */
export function findConflictingMatches(matches) {
  const conflicts = [];
  const teacherUsage = new Map();

  for (const match of matches) {
    if (!match.teacher) continue;
    
    const teacherId = match.teacher.teacherId;
    const existingUsage = teacherUsage.get(teacherId);
    
    if (existingUsage) {
      conflicts.push({
        teacher: match.teacher,
        pdfNames: [existingUsage.pdfName, match.pdfName],
        conflictType: 'multiple_assignment'
      });
    } else {
      teacherUsage.set(teacherId, match);
    }
  }

  return conflicts;
}
