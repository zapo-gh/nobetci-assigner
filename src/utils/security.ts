import { reportError } from './errorReporting.js';

// Güvenlik yardımcı fonksiyonları

/**
 * XSS koruması için input temizleme (gelişmiş versiyon)
 */
const ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;'
};

export const sanitizeInputAdvanced = (input: unknown): string => {
  if (input == null) return '';

  let sanitized = String(input).trim();

  // Kontrol edilemeyen karakterleri temizle
  sanitized = Array.from(sanitized)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('');

  // Boşlukları normalize et
  sanitized = sanitized.replace(/\s+/g, ' ');

  // HTML entity encoding
  sanitized = sanitized.replace(/[&<>"'/]/g, (char) => ENTITY_MAP[char] || char);

  // Uzunluk sınırlaması
  return sanitized.slice(0, 200);
};

export interface FileUploadValidationResult {
  valid: boolean;
  error: string | null;
}

export interface FileUploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

/**
 * Dosya yükleme güvenliği kontrolü
 */
export const validateFileUpload = (file: File, options: FileUploadOptions = {}): FileUploadValidationResult => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = ['text/csv', 'application/json', 'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    allowedExtensions = ['.csv', '.json', '.pdf', '.xlsx', '.xls']
  } = options;

  // Dosya boyutu kontrolü
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Dosya boyutu çok büyük. Maksimum ${Math.round(maxSize / 1024 / 1024)}MB olabilir.`
    };
  }

  // MIME type kontrolü
  if (!allowedTypes.includes(file.type) && file.type !== '') {
    return {
      valid: false,
      error: 'Desteklenmeyen dosya türü.'
    };
  }

  // Dosya uzantısı kontrolü
  const fileName = file.name.toLowerCase();
  const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

  if (!hasValidExtension) {
    return {
      valid: false,
      error: `Desteklenmeyen dosya uzantısı. Sadece ${allowedExtensions.join(', ')} dosyaları kabul edilir.`
    };
  }

  // Dosya adı kontrolü (path traversal koruması)
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return {
      valid: false,
      error: 'Geçersiz dosya adı.'
    };
  }

  return { valid: true, error: null };
};

/**
 * Güvenli localStorage işlemleri
 */
export class SecureStorage {
  static setItem(key: string, value: unknown): boolean {
    try {
      const serializedValue = JSON.stringify(value);
      // Veri boyutu kontrolü (5MB limit)
      if (serializedValue.length > 5 * 1024 * 1024) {
        throw new Error('Veri boyutu çok büyük');
      }
      localStorage.setItem(key, serializedValue);
      return true;
    } catch (error) {
      reportError('SecureStorage setItem error:', error);
      return false;
    }
  }

  static getItem<T = unknown>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) as T : null;
    } catch (error) {
      reportError('SecureStorage getItem error:', error);
      return null;
    }
  }

  static removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      reportError('SecureStorage removeItem error:', error);
      return false;
    }
  }

  static clear(): boolean {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      reportError('SecureStorage clear error:', error);
      return false;
    }
  }
}

/**
 * Güvenli dosya okuma
 */
export const readFileSecurely = async (file: File): Promise<string | ArrayBuffer> => {
  // Dosya validasyonu
  const validation = validateFileUpload(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Geçersiz dosya');
  }

  // Dosya içeriğini oku
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (!content) {
          resolve('');
          return;
        }

        // Metin tabanlı dosyalar için ek kontroller
        if (typeof content === 'string') {
          // Dosya boyutu kontrolü (metin için 50MB limit)
          if (content.length > 50 * 1024 * 1024) {
            throw new Error('Dosya içeriği çok büyük');
          }

          // Tehlikeli karakterler için temel kontrol
          if (content.includes('<script') || content.includes('javascript:')) {
            throw new Error('Güvenlik riski içeren dosya');
          }
        }

        resolve(content);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Dosya okunamadı'));
    };

    // Metin dosyaları için text() kullan, binary için readAsArrayBuffer()
    if (file.type.startsWith('text/') ||
        file.type === 'application/json' ||
        file.name.endsWith('.csv') ||
        file.name.endsWith('.txt')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
};

/**
 * CSV verisi validasyonu ve temizleme
 */
export const sanitizeCsvData = (data: unknown[]): Array<Record<string, string>> => {
  if (!Array.isArray(data)) return [];

  return data.map(row => {
    if (typeof row !== 'object' || row === null) return {};

    const sanitizedRow: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      // Anahtar temizleme
      const cleanKey = String(key).replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 50);

      // Değer temizleme
      sanitizedRow[cleanKey] = sanitizeInputAdvanced(value);
    }
    return sanitizedRow;
  });
};

/**
 * Rate limiting için basit implementasyon
 */
export class RateLimiter {
  private maxRequests: number;
  private windowMs: number;
  private requests: number[];

  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    // Eski istekleri temizle
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      return false;
    }

    this.requests.push(now);
    return true;
  }

  getRemainingTime(): number {
    if (this.requests.length === 0) return 0;

    const now = Date.now();
    const oldestRequest = Math.min(...this.requests);
    const timePassed = now - oldestRequest;

    return Math.max(0, this.windowMs - timePassed);
  }
}



