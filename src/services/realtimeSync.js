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

    // Teachers subscription
    const teachersChannel = supabase
      .channel('teachers-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'teachers' },
        (payload) => {
          logger.info('[RealtimeSync] Teachers changed:', payload.eventType)
          if (this.callbacks.teachers) {
            this.callbacks.teachers(payload)
          }
        }
      )
      .subscribe()
    this.channels.push(teachersChannel)
    unsubscribeFunctions.push(() => teachersChannel.unsubscribe())

    // Classes subscription
    const classesChannel = supabase
      .channel('classes-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'classes' },
        (payload) => {
          logger.info('[RealtimeSync] Classes changed:', payload.eventType)
          if (this.callbacks.classes) {
            this.callbacks.classes(payload)
          }
        }
      )
      .subscribe()
    this.channels.push(classesChannel)
    unsubscribeFunctions.push(() => classesChannel.unsubscribe())

    // Absents subscription
    const absentsChannel = supabase
      .channel('absents-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'absents' },
        (payload) => {
          logger.info('[RealtimeSync] Absents changed:', payload.eventType)
          if (this.callbacks.absents) {
            this.callbacks.absents(payload)
          }
        }
      )
      .subscribe()
    this.channels.push(absentsChannel)
    unsubscribeFunctions.push(() => absentsChannel.unsubscribe())

    // Class Free subscription
    const classFreeChannel = supabase
      .channel('class-free-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'class_free' },
        (payload) => {
          logger.info('[RealtimeSync] Class Free changed:', payload.eventType)
          if (this.callbacks.classFree) {
            this.callbacks.classFree(payload)
          }
        }
      )
      .subscribe()
    this.channels.push(classFreeChannel)
    unsubscribeFunctions.push(() => classFreeChannel.unsubscribe())

    // Teacher Free subscription
    const teacherFreeChannel = supabase
      .channel('teacher-free-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'teacher_free' },
        (payload) => {
          logger.info('[RealtimeSync] Teacher Free changed:', payload.eventType)
          if (this.callbacks.teacherFree) {
            this.callbacks.teacherFree(payload)
          }
        }
      )
      .subscribe()
    this.channels.push(teacherFreeChannel)
    unsubscribeFunctions.push(() => teacherFreeChannel.unsubscribe())

    // Class Absence subscription
    const classAbsenceChannel = supabase
      .channel('class-absence-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'class_absence' },
        (payload) => {
          logger.info('[RealtimeSync] Class Absence changed:', payload.eventType)
          if (this.callbacks.classAbsence) {
            this.callbacks.classAbsence(payload)
          }
        }
      )
      .subscribe()
    this.channels.push(classAbsenceChannel)
    unsubscribeFunctions.push(() => classAbsenceChannel.unsubscribe())

    // Locks subscription
    const locksChannel = supabase
      .channel('locks-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'locks' },
        (payload) => {
          logger.info('[RealtimeSync] Locks changed:', payload.eventType)
          if (this.callbacks.locks) {
            this.callbacks.locks(payload)
          }
        }
      )
      .subscribe()
    this.channels.push(locksChannel)
    unsubscribeFunctions.push(() => locksChannel.unsubscribe())

    // PDF Schedule subscription
    const pdfScheduleChannel = supabase
      .channel('pdf-schedule-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pdf_schedule' },
        (payload) => {
          logger.info('[RealtimeSync] PDF Schedule changed:', payload.eventType)
          if (this.callbacks.pdfSchedule) {
            this.callbacks.pdfSchedule(payload)
          }
        }
      )
      .subscribe()
    this.channels.push(pdfScheduleChannel)
    unsubscribeFunctions.push(() => pdfScheduleChannel.unsubscribe())

    // Teacher Schedules subscription
    const teacherSchedulesChannel = supabase
      .channel('teacher-schedules-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'teacher_schedules' },
        (payload) => {
          logger.info('[RealtimeSync] Teacher Schedules changed:', payload.eventType)
          if (this.callbacks.teacherSchedules) {
            this.callbacks.teacherSchedules(payload)
          }
        }
      )
      .subscribe()
    this.channels.push(teacherSchedulesChannel)
    unsubscribeFunctions.push(() => teacherSchedulesChannel.unsubscribe())

    // Common Lessons subscription
    const commonLessonsChannel = supabase
      .channel('common-lessons-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'common_lessons' },
        (payload) => {
          logger.info('[RealtimeSync] Common Lessons changed:', payload.eventType)
          if (this.callbacks.commonLessons) {
            this.callbacks.commonLessons(payload)
          }
        }
      )
      .subscribe()
    this.channels.push(commonLessonsChannel)
    unsubscribeFunctions.push(() => commonLessonsChannel.unsubscribe())

    // Import History subscription
    const importHistoryChannel = supabase
      .channel('import-history-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'import_history' },
        (payload) => {
          logger.info('[RealtimeSync] Import History changed:', payload.eventType)
          if (this.callbacks.importHistory) {
            this.callbacks.importHistory(payload)
          }
        }
      )
      .subscribe()
    this.channels.push(importHistoryChannel)
    unsubscribeFunctions.push(() => importHistoryChannel.unsubscribe())

    // Snapshots subscription
    const snapshotsChannel = supabase
      .channel('snapshots-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'snapshots' },
        (payload) => {
          logger.info('[RealtimeSync] Snapshots changed:', payload.eventType)
          if (this.callbacks.snapshots) {
            this.callbacks.snapshots(payload)
          }
        }
      )
      .subscribe()
    this.channels.push(snapshotsChannel)
    unsubscribeFunctions.push(() => snapshotsChannel.unsubscribe())

    this.isConnected = true
    logger.info('[RealtimeSync] All subscriptions active')

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

