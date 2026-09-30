// @ts-ignore
import FuzzySet from 'fuzzyset.js';

export interface MatchResult {
  teacher: any;
  confidence: number;
  pdfName: string;
  systemName: string;
}

export interface BatchMatchResult {
  matched: MatchResult[];
  uncertain: MatchResult[];
  unmatched: Array<{ pdfName: string; confidence: number; teacher: null; systemName: null }>;
}

export interface MatchSummary {
  total: number;
  matched: number;
  uncertain: number;
  unmatched: number;
  successRate: number;
}

export interface ConflictResult {
  teacher: any;
  pdfNames: string[];
  conflictType: string;
}

export function calculateSimilarity(name1: string, name2: string): number {
  if (!name1 || !name2) return 0;
  
  const normalized1 = normalizeForComparison(name1);
  const normalized2 = normalizeForComparison(name2);
  
  if (normalized1 === normalized2) return 1.0;
  
  const fuzzySet = FuzzySet([normalized1]);
  const results = fuzzySet.get(normalized2);
  
  if (results && results.length > 0) {
    return results[0][0]; 
  }
  
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return 0.7;
  }
  
  return 0;
}

function normalizeForComparison(name: any): string {
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
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findBestMatch(pdfName: string, systemTeachers: any[], threshold = 0.7): MatchResult | null {
  if (!pdfName || !systemTeachers || !Array.isArray(systemTeachers)) {
    return null;
  }

  let bestMatch: MatchResult | null = null;
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

  if (bestScore >= threshold) {
    return bestMatch;
  }

  return null;
}

export function batchMatchNames(pdfNames: string[], systemTeachers: any[], threshold = 0.7): BatchMatchResult {
  const results: BatchMatchResult = {
    matched: [],
    uncertain: [],
    unmatched: []
  };

  if (!Array.isArray(pdfNames) || !Array.isArray(systemTeachers)) {
    return results;
  }

  for (const pdfName of pdfNames) {
    const match = findBestMatch(pdfName, systemTeachers, threshold);
    
    if (match) {
      if (match.confidence >= 0.8) {
        results.matched.push(match);
      } else {
        results.uncertain.push(match);
      }
    } else {
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

export function summarizeMatchingResults(results: BatchMatchResult): MatchSummary {
  const summary: MatchSummary = {
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

export function getMatchingSuggestions(pdfName: string, systemTeachers: any[], limit = 5) {
  if (!pdfName || !systemTeachers || !Array.isArray(systemTeachers)) {
    return [];
  }

  const suggestions = systemTeachers
    .map(teacher => ({
      teacher,
      score: calculateSimilarity(pdfName, teacher.teacherName || teacher.name || ''),
      systemName: teacher.teacherName || teacher.name || ''
    }))
    .filter(suggestion => suggestion.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return suggestions;
}

export function findConflictingMatches(matches: MatchResult[]): ConflictResult[] {
  const conflicts: ConflictResult[] = [];
  const teacherUsage = new Map<string, MatchResult>();

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
