import { logger } from './logger.js'

export interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  maxDelay?: number;
  shouldRetry?: (error: any) => boolean;
}

/**
 * Retry mekanizması - geçici hatalar için otomatik tekrar dener
 * @param fn - Çalıştırılacak async fonksiyon
 * @param options - Retry seçenekleri
 * @returns Fonksiyonun sonucu
 */
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    maxDelay = 10000,
    shouldRetry = (error: any) => {
      // Supabase hata kodlarına göre retry yap
      if (error && typeof error === 'object') {
        const status = error.status || error.code || error.statusCode
        
        // Geçici sunucu hataları ve rate limit için retry yap
        if ([429, 500, 502, 503, 504].includes(status)) {
          return true
        }
        
        // Network hataları için retry yap
        if (error.message && (
          error.message.includes('network') ||
          error.message.includes('timeout') ||
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('ENOTFOUND')
        )) {
          return true
        }
      }
      
      return false
    }
  } = options

  let lastError: any
  let currentDelay = delay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn()
      // Başarılı olursa, eğer önceki denemeler varsa logla
      if (attempt > 0) {
        logger.info(`[Retry] Succeeded after ${attempt} retry(ies)`)
      }
      return result
    } catch (error: any) {
      lastError = error
      
      // Son deneme ise veya retry yapılmayacaksa hata fırlat
      if (attempt === maxRetries || !shouldRetry(error)) {
        if (attempt > 0) {
          logger.error(`[Retry] Failed after ${attempt} retry(ies):`, error)
        }
        throw error
      }

      // Retry yapılacaksa bekle ve tekrar dene
      const status = error?.status || error?.code || error?.statusCode
      logger.warn(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed (status: ${status}), retrying in ${currentDelay}ms...`)
      
      await new Promise(resolve => setTimeout(resolve, currentDelay))
      
      // Exponential backoff - her denemede gecikmeyi artır
      currentDelay = Math.min(currentDelay * 2, maxDelay)
    }
  }

  throw lastError
}
