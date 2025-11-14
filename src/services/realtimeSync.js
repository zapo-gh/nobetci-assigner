import { supabase } from './supabaseClient.js'
import { logger } from '../utils/logger.js'

/**
 * Supabase Realtime senkronizasyon servisi
 * Tüm tablolardaki değişiklikleri gerçek zamanlı olarak dinler
 */
export class RealtimeSyncService {
  constructor() {
    this.channels = []
    this.isConnected = false
    this.callbacks = {
      teachers: null,
      classes: null,
      absents: null,
      classFree: null,
      teacherFree: null,
      classAbsence: null,
      locks: null,
      pdfSchedule: null,
      teacherSchedules: null,
      commonLessons: null,
      importHistory: null,
      snapshots: null
    }
  }

  /**
   * Realtime subscription'ları başlat
   */
  subscribe(callbacks) {
    if (!supabase) {
      logger.warn('[RealtimeSync] Supabase client not available')
      return () => {}
    }

    // Callback'leri kaydet
    Object.keys(callbacks).forEach(key => {
      if (Object.prototype.hasOwnProperty.call(this.callbacks, key)) {
        this.callbacks[key] = callbacks[key]
      }
    })

    const unsubscribeFunctions = []
    
    // Hata yakalama wrapper'ı
    const safeCallback = (callback, channelName) => {
      return (payload) => {
        try {
          if (callback) {
            const result = callback(payload)
            // Eğer promise dönerse hataları yakala
            if (result && typeof result.catch === 'function') {
              result.catch(err => {
                logger.error(`[RealtimeSync] Error in ${channelName} callback:`, err)
              })
            }
          }
        } catch (err) {
          logger.error(`[RealtimeSync] Error in ${channelName} callback:`, err)
        }
      }
    }
    
    // Channel subscription helper
    const createChannel = (channelName, tableName, callback) => {
      const channel = supabase
        .channel(`${channelName}-changes`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: tableName },
          safeCallback(callback, channelName)
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.info(`[RealtimeSync] ${channelName} channel subscribed`)
          } else if (status === 'CHANNEL_ERROR') {
            logger.error(`[RealtimeSync] ${channelName} channel error`)
          } else if (status === 'TIMED_OUT') {
            logger.warn(`[RealtimeSync] ${channelName} channel timed out`)
          } else if (status === 'CLOSED') {
            logger.warn(`[RealtimeSync] ${channelName} channel closed`)
          }
        })
      this.channels.push(channel)
      unsubscribeFunctions.push(() => {
        try {
          channel.unsubscribe()
        } catch (err) {
          logger.error(`[RealtimeSync] Error unsubscribing ${channelName} channel:`, err)
        }
      })
      return channel
    }

    // Teachers subscription
    createChannel('teachers', 'teachers', (payload) => {
      logger.info('[RealtimeSync] Teachers changed:', payload.eventType)
      if (this.callbacks.teachers) {
        this.callbacks.teachers(payload)
      }
    })

    // Classes subscription
    createChannel('classes', 'classes', (payload) => {
      logger.info('[RealtimeSync] Classes changed:', payload.eventType)
      if (this.callbacks.classes) {
        this.callbacks.classes(payload)
      }
    })

    // Absents subscription
    createChannel('absents', 'absents', (payload) => {
      logger.info('[RealtimeSync] Absents changed:', payload.eventType)
      if (this.callbacks.absents) {
        this.callbacks.absents(payload)
      }
    })

    // Class Free subscription
    createChannel('class-free', 'class_free', (payload) => {
      logger.info('[RealtimeSync] Class Free changed:', payload.eventType)
      if (this.callbacks.classFree) {
        this.callbacks.classFree(payload)
      }
    })

    // Teacher Free subscription
    createChannel('teacher-free', 'teacher_free', (payload) => {
      logger.info('[RealtimeSync] Teacher Free changed:', payload.eventType)
      if (this.callbacks.teacherFree) {
        this.callbacks.teacherFree(payload)
      }
    })

    // Class Absence subscription
    createChannel('class-absence', 'class_absence', (payload) => {
      logger.info('[RealtimeSync] Class Absence changed:', payload.eventType)
      if (this.callbacks.classAbsence) {
        this.callbacks.classAbsence(payload)
      }
    })

    // Locks subscription
    createChannel('locks', 'locks', (payload) => {
      logger.info('[RealtimeSync] Locks changed:', payload.eventType)
      if (this.callbacks.locks) {
        this.callbacks.locks(payload)
      }
    })

    // PDF Schedule subscription
    createChannel('pdf-schedule', 'pdf_schedule', (payload) => {
      logger.info('[RealtimeSync] PDF Schedule changed:', payload.eventType)
      if (this.callbacks.pdfSchedule) {
        this.callbacks.pdfSchedule(payload)
      }
    })

    // Teacher Schedules subscription
    createChannel('teacher-schedules', 'teacher_schedules', (payload) => {
      logger.info('[RealtimeSync] Teacher Schedules changed:', payload.eventType)
      if (this.callbacks.teacherSchedules) {
        this.callbacks.teacherSchedules(payload)
      }
    })

    // Common Lessons subscription
    createChannel('common-lessons', 'common_lessons', (payload) => {
      logger.info('[RealtimeSync] Common Lessons changed:', payload.eventType)
      if (this.callbacks.commonLessons) {
        this.callbacks.commonLessons(payload)
      }
    })

    // Import History subscription
    createChannel('import-history', 'import_history', (payload) => {
      logger.info('[RealtimeSync] Import History changed:', payload.eventType)
      if (this.callbacks.importHistory) {
        this.callbacks.importHistory(payload)
      }
    })

    // Snapshots subscription
    createChannel('snapshots', 'snapshots', (payload) => {
      logger.info('[RealtimeSync] Snapshots changed:', payload.eventType)
      if (this.callbacks.snapshots) {
        this.callbacks.snapshots(payload)
      }
    })

    this.isConnected = true
    console.log('[RealtimeSync] ✓ All subscriptions active')
    logger.info('[RealtimeSync] ✓ All subscriptions active')

    // Unsubscribe fonksiyonunu döndür
    return () => {
      logger.info('[RealtimeSync] Unsubscribing from all channels')
      unsubscribeFunctions.forEach(unsub => {
        try {
          unsub()
        } catch (err) {
          logger.error('[RealtimeSync] Error unsubscribing:', err)
        }
      })
      this.channels = []
      this.isConnected = false
    }
  }

  /**
   * Tüm subscription'ları kapat
   */
  unsubscribe() {
    this.channels.forEach(channel => {
      try {
        channel.unsubscribe()
      } catch (err) {
        logger.error('[RealtimeSync] Error unsubscribing channel:', err)
      }
    })
    this.channels = []
    this.isConnected = false
    logger.info('[RealtimeSync] All subscriptions closed')
  }
}

// Singleton instance
export const realtimeSync = new RealtimeSyncService()

