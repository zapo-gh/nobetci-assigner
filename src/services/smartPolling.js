import { supabase } from './supabaseClient.js'
import { logger } from '../utils/logger.js'

/**
 * Smart Polling Senkronizasyon Servisi
 * - Tablo bazlı farklı interval'ler
 * - Page Visibility API desteği
 * - Exponential backoff ile hata yönetimi
 * - Optimistic update desteği
 */
export class SmartPollingService {
    constructor() {
        this.intervals = new Map()
        this.callbacks = new Map()
        this.isActive = false
        this.isVisible = true
        this.retryAttempts = new Map()

        // Tablo bazlı polling interval'leri (milisaniye)
        // Supabase request sıklığını azaltmak için interval'leri önemli ölçüde artırdık
        this.tableIntervals = {
            // Sık değişenler - 15-20 saniye (önceden 5-8 saniye)
            absents: 15000,
            class_free: 15000,
            class_absence: 20000, // class_absence için daha uzun interval

            // Orta sıklıkta - 30-45 saniye (önceden 10-15 saniye)
            common_lessons: 30000,
            teachers: 45000,
            classes: 45000,

            // Az değişenler - 60-90 saniye (önceden 20-30 saniye)
            locks: 60000,
            teacher_schedules: 90000
        }

        // Idle durumunda interval çarpanı
        this.idleMultiplier = 3 // 3x daha yavaş

        // Page Visibility API listener'ı ekle
        this.setupVisibilityListener()
    }

    clearTableInterval(tableName) {
        const timerId = this.intervals.get(tableName)
        if (timerId) {
            clearTimeout(timerId)
            this.intervals.delete(tableName)
        }
    }

    startPollingLoop(tableName, callback) {
        const baseInterval = this.tableIntervals[tableName] || 10000

        const executePoll = async () => {
            if (!this.isActive) return

            await this.pollTable(tableName, callback)
            if (!this.isActive) return

            const effectiveInterval = this.isVisible ? baseInterval : baseInterval * this.idleMultiplier
            const timerId = setTimeout(executePoll, effectiveInterval)
            this.intervals.set(tableName, timerId)
        }

        // İlk poll'u hemen başlat
        executePoll()
    }

    /**
     * Page Visibility API ile tab aktifliğini izle
     */
    setupVisibilityListener() {
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                this.isVisible = !document.hidden

                if (!this.isActive) {
                    return
                }

                if (this.isVisible) {
                    logger.info('[SmartPolling] Tab visible - resuming normal polling')
                    // Tab aktif olduğunda hemen bir poll yap
                    this.pollAllTables()
                } else {
                    logger.info('[SmartPolling] Tab hidden - slowing down polling')
                }
            })
        }
    }

    /**
     * Polling'i başlat
     * @param {Object} callbacks - Tablo adı -> callback fonksiyonu mapping'i
     */
    start(callbacks = {}) {
        if (!supabase) {
            logger.warn('[SmartPolling] Supabase client not available')
            return () => { }
        }

        this.isActive = true

        // Callback'leri kaydet
        Object.entries(callbacks).forEach(([tableName, callback]) => {
            this.callbacks.set(tableName, callback)
            this.retryAttempts.set(tableName, 0)
        })

        // Her tablo için polling başlat
        const cleanupFunctions = []

        this.callbacks.forEach((callback, tableName) => {
            this.startPollingLoop(tableName, callback)
            cleanupFunctions.push(() => this.clearTableInterval(tableName))
        })

        logger.info(`[SmartPolling] Started for ${this.intervals.size} tables`)
        console.log(`%c🔄 [SmartPolling] Active for ${this.intervals.size} tables`, 'color: #3b82f6; font-weight: bold;')
        console.table(
            Array.from(this.callbacks.keys()).map(table => ({
                Table: table,
                Interval: `${this.tableIntervals[table] || 10000}ms`,
                'Idle Interval': `${(this.tableIntervals[table] || 10000) * this.idleMultiplier}ms`
            }))
        )

        // Cleanup fonksiyonunu döndür
        return () => {
            cleanupFunctions.forEach(cleanup => cleanup())
            this.intervals.clear()
            this.callbacks.clear()
            this.retryAttempts.clear()
            this.isActive = false
            logger.info('[SmartPolling] Stopped')
        }
    }

    /**
     * Tek bir tabloyu poll et
     */
    async pollTable(tableName, callback) {
        try {
            let query = supabase.from(tableName).select('*')

            // Bazı tablolar için sıralama ekle
            if (['teachers', 'classes'].includes(tableName)) {
                query = query.order('createdAt', { ascending: false })
            }

            const { data, error } = await query

            if (error) throw error

            // Başarılı - retry counter'ı sıfırla
            this.retryAttempts.set(tableName, 0)

            if (data && callback) {
                callback(data)
            }

        } catch (err) {
            // Hata yönetimi - exponential backoff (daha az agresif)
            const currentAttempts = this.retryAttempts.get(tableName) || 0
            
            // ERR_INSUFFICIENT_RESOURCES gibi network hatalarında daha uzun bekle
            const isResourceError = err?.message?.includes('ERR_INSUFFICIENT_RESOURCES') || 
                                   err?.code === 'ERR_INSUFFICIENT_RESOURCES' ||
                                   err?.message?.includes('network') ||
                                   err?.message?.includes('rate limit')
            
            if (isResourceError && currentAttempts >= 3) {
                // Resource hatalarında daha uzun bekle (max 60 saniye)
                const backoffDelay = Math.min(5000 * Math.pow(2, currentAttempts - 3), 60000)
                logger.warn(`[SmartPolling] ${tableName} resource error (attempt ${currentAttempts + 1}), waiting ${backoffDelay}ms`)
                
                setTimeout(() => {
                    if (this.isActive) {
                        this.retryAttempts.set(tableName, currentAttempts + 1)
                        this.pollTable(tableName, callback)
                    }
                }, backoffDelay)
                return
            }
            
            this.retryAttempts.set(tableName, currentAttempts + 1)
            
            // Normal hatalar için daha kısa backoff (max 15 saniye)
            const backoffDelay = Math.min(2000 * Math.pow(1.5, currentAttempts), 15000)

            logger.error(`[SmartPolling] ${tableName} fetch error (attempt ${currentAttempts + 1}):`, err)
            logger.info(`[SmartPolling] Retrying ${tableName} in ${backoffDelay}ms`)

            // Exponential backoff ile tekrar dene
            setTimeout(() => {
                if (this.isActive) {
                    this.pollTable(tableName, callback)
                }
            }, backoffDelay)
        }
    }

    /**
     * Tüm tabloları hemen poll et (manuel refresh için)
     */
    pollAllTables() {
        this.callbacks.forEach((callback, tableName) => {
            this.pollTable(tableName, callback)
        })
    }

    /**
     * Polling'i durdur
     */
    stop() {
        this.intervals.forEach(timerId => clearTimeout(timerId))
        this.intervals.clear()
        this.callbacks.clear()
        this.retryAttempts.clear()
        this.isActive = false
        logger.info('[SmartPolling] Stopped')
    }

    /**
     * Belirli bir tablo için interval'i değiştir
     */
    setTableInterval(tableName, ms) {
        this.tableIntervals[tableName] = ms

        // Eğer tablo zaten poll ediliyorsa, interval'i yeniden başlat
        if (this.intervals.has(tableName)) {
            const callback = this.callbacks.get(tableName)
            this.clearTableInterval(tableName)
            if (this.isActive && callback) {
                this.startPollingLoop(tableName, callback)
            }
            logger.info(`[SmartPolling] Updated ${tableName} interval to ${ms}ms`)
        }
    }

    /**
     * Idle multiplier'ı değiştir
     */
    setIdleMultiplier(multiplier) {
        this.idleMultiplier = multiplier
        logger.info(`[SmartPolling] Idle multiplier set to ${multiplier}x`)
    }
}

// Singleton instance
export const smartPolling = new SmartPollingService()
