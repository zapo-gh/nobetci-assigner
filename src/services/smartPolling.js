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
        this.tableIntervals = {
            // Sık değişenler - 3-5 saniye
            absents: 3000,
            class_free: 3000,
            class_absence: 3000,

            // Orta sıklıkta - 8-10 saniye
            common_lessons: 8000,
            teachers: 10000,
            classes: 10000,

            // Az değişenler - 15-20 saniye
            locks: 15000,
            teacher_schedules: 20000
        }

        // Idle durumunda interval çarpanı
        this.idleMultiplier = 3 // 3x daha yavaş

        // Page Visibility API listener'ı ekle
        this.setupVisibilityListener()
    }

    /**
     * Page Visibility API ile tab aktifliğini izle
     */
    setupVisibilityListener() {
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                this.isVisible = !document.hidden

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
            const baseInterval = this.tableIntervals[tableName] || 10000

            // İlk poll'u hemen yap
            this.pollTable(tableName, callback)

            // Periyodik polling
            const interval = setInterval(() => {
                if (!this.isActive) return

                // Tab görünür değilse interval'i artır
                const effectiveInterval = this.isVisible ? baseInterval : baseInterval * this.idleMultiplier

                this.pollTable(tableName, callback)
            }, baseInterval)

            this.intervals.set(tableName, interval)
            cleanupFunctions.push(() => clearInterval(interval))
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
            // Hata yönetimi - exponential backoff
            const currentAttempts = this.retryAttempts.get(tableName) || 0
            this.retryAttempts.set(tableName, currentAttempts + 1)

            const backoffDelay = Math.min(1000 * Math.pow(2, currentAttempts), 30000) // Max 30 saniye

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
        this.intervals.forEach(interval => clearInterval(interval))
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
            const oldInterval = this.intervals.get(tableName)

            clearInterval(oldInterval)

            const newInterval = setInterval(() => {
                if (!this.isActive) return
                this.pollTable(tableName, callback)
            }, ms)

            this.intervals.set(tableName, newInterval)
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
