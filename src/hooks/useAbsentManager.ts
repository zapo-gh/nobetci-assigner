// @ts-nocheck
import { useCallback } from 'react';
import {
  insertAbsent,
  getClassByName,
  insertClass,
  upsertClassFree,
  upsertClassAbsence,
  bulkUpsertClassFree,
  bulkUpsertClassAbsence,
  deleteAbsentById,
} from '../services/firebaseDataService.js';
import { normalizeForComparison } from '../utils/nameNormalization.js';
import { sanitizeInputAdvanced } from '../utils/security.js';
import {
  COMMON_LESSON_LABEL,
  encodeClassAbsenceValue,
} from '../utils/classAbsence.js';
import { normalizeAbsentPeople } from '../utils/migrations';
import { normalizeClassName, isImesLesson } from '../utils/classNameUtils.js';

export function useAbsentManager({
  day,
  DAYS,
  teachers,
  classes,
  periods,
  teacherSchedules,
  teacherMap,
  normalizeCommonLessonTeacherName,
  absentPeople,
  filteredAbsentPeople = [],
  setAbsentPeople,
  setClasses,
  setClassFree,
  setClassAbsence,
  setCommonLessons,
  classAbsenceStateRef,
  requestConfirmation,
  addNotification,
  logger,
}) {
  const addAbsent = useCallback(
    async (data) => {
      if (data) {
        data.name = sanitizeInputAdvanced(data.name, { maxLength: 100 });
        if (data.reason) data.reason = sanitizeInputAdvanced(data.reason, { maxLength: 200 });
      }
      const requestedDays = Array.isArray(data?.days) ? data.days : [];
      const effectiveDays = requestedDays.length > 0 ? requestedDays : [day];
      const dayLabelMap = new Map(DAYS.map((d) => [d.key, d.label]));
      const normalizeDayKey = (value = '') => {
        const trimmed = String(value || '').trim().toLowerCase();
        if (!trimmed) return '';

        const removeDiacritics = (str) =>
          typeof str.normalize === 'function'
            ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            : str;

        const sanitized = removeDiacritics(trimmed).replace(/[^a-z]/g, '');

        const startsWithAny = (needle, ...haystack) =>
          haystack.some((prefix) => needle.startsWith(prefix));

        if (startsWithAny(sanitized, 'mon', 'paz')) return 'monday';
        if (startsWithAny(sanitized, 'tue', 'sali', 'sal')) return 'tuesday';
        if (startsWithAny(sanitized, 'wed', 'cars', 'car', 'çar', 'carsamba')) return 'wednesday';
        if (startsWithAny(sanitized, 'thu', 'per', 'pers', 'persembe')) return 'thursday';
        if (startsWithAny(sanitized, 'fri', 'cum')) return 'friday';

        return sanitized || trimmed;
      };

      const resolveDaySchedule = (scheduleObj = {}, requestedKey) => {
        if (!scheduleObj || typeof scheduleObj !== 'object') return {};
        if (!requestedKey) return {};
        const normalizedTarget = normalizeDayKey(requestedKey);

        const availableKeys = Object.keys(scheduleObj);
        const directKey = availableKeys.find((key) => normalizeDayKey(key) === normalizedTarget);

        if (directKey && scheduleObj[directKey]) {
          return scheduleObj[directKey] || {};
        }

        logger.warn(
          `[addAbsent] resolveDaySchedule: Could not find schedule for "${requestedKey}" (normalized: "${normalizedTarget}"). Available keys:`,
          availableKeys,
        );

        return {};
      };
      const targetNameNorm = normalizeForComparison(data.name);
      const overlapsWithExistingAbsent = (person) => {
        if (!person) return false;
        const normalized = normalizeForComparison(
          person.name || person.teacherName || person.displayName || '',
        );
        if (!normalized || normalized !== targetNameNorm) return false;

        // Tarihli kayıtlar için: Farklı tarihlerdeki mazeretler çakışma oluşturmaz
        if (person.date && data.date && person.date !== data.date) {
          return false;
        }

        const personDays =
          Array.isArray(person.days) && person.days.length > 0
            ? person.days
            : DAYS.map((d) => d.key);
        return personDays.some((dayKey) => effectiveDays.includes(dayKey));
      };

      const isDuplicate =
        (filteredAbsentPeople || []).some(overlapsWithExistingAbsent) ||
        (absentPeople || []).some(overlapsWithExistingAbsent);
      if (isDuplicate) {
        addNotification('Bu öğretmen seçilen tarihte/günlerde zaten mazeretli listesinde', 'warning');
        return;
      }

      // 1) Mazeret kaydını ekle (gün ve zaman dilimi bilgisiyle)
      const timeSlot = data?.timeSlot || 'full';
      const isPeriodInSlot = (p: number) => {
        if (timeSlot === 'morning') return p >= 1 && p <= 5;
        if (timeSlot === 'afternoon') return p >= 6;
        return true;
      };
      let createdAbsent;
      try {
        createdAbsent = await insertAbsent({
          name: data.name,
          teacherId: data.teacherId,
          reason: data.reason,
          days: effectiveDays,
          timeSlot,
          date: data.date || null,
          weekKey: data.weekKey || null,
        });
        setAbsentPeople((prev) =>
          normalizeAbsentPeople([...(prev || []), createdAbsent], classAbsenceStateRef.current || {}),
        );
      } catch (error) {
        logger.error('Absent insert error:', error);
        addNotification('Mazeret kaydedilemedi', 'error');
        return;
      }

      const absentId = createdAbsent?.absentId;
      if (!absentId) {
        logger.error('Absent ID not found after insert');
        addNotification('Mazeret kaydı oluşturulamadı', 'error');
        return;
      }
      const dayLabelText = effectiveDays.map((key) => dayLabelMap.get(key) || key).join(', ');
      const timeSlotLabel = timeSlot === 'morning' ? ' (Öğleden Önce)' : timeSlot === 'afternoon' ? ' (Öğleden Sonra)' : '';
      addNotification(
        `${data.name} (${data.reason}${timeSlotLabel}) eklendi${dayLabelText ? ` — Günler: ${dayLabelText}` : ''}`,
        'success',
      );

      // 2) Seçilen günlere göre öğretmenin derslerini işaretle
      try {
        if (!teacherSchedules || Object.keys(teacherSchedules).length === 0) {
          logger.warn(`[addAbsent] teacherSchedules is empty or null`);
          return;
        }

        const dayKeyMapping = {
          Mon: 'monday',
          Tue: 'tuesday',
          Wed: 'wednesday',
          Thu: 'thursday',
          Fri: 'friday',
        };

        // İsim eşleştirme (normalize edilmiş)
        const targetNameNorm = normalizeForComparison(data.name);
        logger.log(`[addAbsent] Looking for teacher: "${data.name}" (normalized: "${targetNameNorm}")`);
        logger.log(`[addAbsent] Available teachers in teacherSchedules:`, Object.keys(teacherSchedules));
        const matchedTeacherName = Object.keys(teacherSchedules).find(
          (n) => normalizeForComparison(n) === targetNameNorm,
        );
        if (!matchedTeacherName) {
          logger.warn(`[addAbsent] Teacher not found in teacherSchedules: "${data.name}"`);
          return;
        }
        logger.log(`[addAbsent] Found teacher: "${matchedTeacherName}"`);

        const teacherSchedule = teacherSchedules[matchedTeacherName] || {};
        logger.log(
          `[addAbsent] Teacher schedule keys for ${matchedTeacherName}:`,
          Object.keys(teacherSchedule || {}),
        );
        logger.log(
          `[addAbsent] Teacher schedule normalized keys:`,
          Object.keys(teacherSchedule || {}).map((key) => `${key} -> ${normalizeDayKey(key)}`),
        );
        const daySchedules = {};

        const normalizeClassKey = (name = '') => {
          const norm = normalizeClassName(String(name || ''));
          return (norm || String(name || '')).trim().toUpperCase();
        };
        const classNameCache = new Map();
        const existingClassIds = new Set(classes.map((c) => c.classId));
        classes.forEach((c) => {
          const normKey = normalizeClassKey(c.className);
          const rawKey = String(c.className || '').trim().toUpperCase();
          if (normKey) classNameCache.set(normKey, c);
          if (rawKey) classNameCache.set(rawKey, c);
        });
        const classNamesToResolve = new Map();
        const classResolutionPromises = new Map();
        const newlyDiscoveredClasses = [];

        const ensureClassRecord = async (rawName) => {
          const canonicalLabel = normalizeClassName(String(rawName || '')) || String(rawName || '').trim();
          if (!canonicalLabel) return null;
          const key = normalizeClassKey(canonicalLabel);
          if (classNameCache.has(key)) {
            return classNameCache.get(key);
          }
          if (classResolutionPromises.has(key)) {
            return classResolutionPromises.get(key);
          }

          const promise = (async () => {
            const records = await getClassByName(canonicalLabel);
            let record = records && records.length > 0 ? records[0] : null;
            if (!record) {
              record = await insertClass({ className: canonicalLabel });
            }
            classNameCache.set(key, record);
            if (record?.classId && !existingClassIds.has(record.classId)) {
              existingClassIds.add(record.classId);
              newlyDiscoveredClasses.push(record);
            }
            return record;
          })();

          classResolutionPromises.set(key, promise);
          return promise;
        };

        const classNameToId = new Map();
        const teacherByNormalizedName = new Map(
          (teachers || [])
            .filter((teacher) => teacher?.teacherName)
            .map((teacher) => [normalizeForComparison(teacher.teacherName), teacher]),
        );
        const peerTeacherSchedules = Object.entries(teacherSchedules || {}).map(([key, schedule]) => {
          const normalizedName = normalizeForComparison(key);
          const teacherById = teacherMap.get(key);
          const teacherByName = teacherByNormalizedName.get(normalizedName);
          const displayName = teacherById?.teacherName || teacherByName?.teacherName || key;
          const teacherId = teacherById?.teacherId || teacherByName?.teacherId || key;
          return {
            key,
            normalizedName,
            schedule,
            displayName,
            teacherId,
          };
        });

        const findOverlappingTeachers = (scheduleDayKey, period, normalizedClassKey) => {
          if (!scheduleDayKey || !normalizedClassKey) return [];
          if (isImesLesson(normalizedClassKey)) return [];
          return peerTeacherSchedules
            .filter((entry) => entry.normalizedName !== targetNameNorm)
            .map((entry) => {
              const daySchedule = resolveDaySchedule(entry.schedule, scheduleDayKey);
              const otherClassName = daySchedule?.[period];
              if (!otherClassName) return null;
              
              const classNames = typeof otherClassName === 'string' ? otherClassName.split(',').map(s => s.trim()) : [otherClassName];
              const isMatch = classNames.some(cName => {
                if (isImesLesson(cName)) return false;
                return normalizeClassKey(cName) === normalizedClassKey;
              });
              
              if (!isMatch) return null;
              return {
                teacherId: entry.teacherId,
                displayName: entry.displayName,
              };
            })
            .filter(Boolean);
        };

        const teacherIdToName = new Map(teachers.map((t) => [t.teacherId, t.teacherName]));

        const resolveOverlapDisplayName = (overlapEntry) => {
          if (!overlapEntry) return '';
          const { displayName, teacherId } = overlapEntry;
          if (displayName && displayName.trim().length > 0) {
            const normalizedDisplay = normalizeForComparison(displayName);
            const teacherByDisplay = teacherByNormalizedName.get(normalizedDisplay);
            if (teacherByDisplay?.teacherName) {
              return teacherByDisplay.teacherName;
            }
            return displayName;
          }

          if (teacherId) {
            const nameById = teacherIdToName.get(teacherId);
            if (nameById) return nameById;

            const normalizedId = normalizeForComparison(teacherId);
            const teacherByNormalizedId = teacherByNormalizedName.get(normalizedId);
            if (teacherByNormalizedId?.teacherName) {
              return teacherByNormalizedId.teacherName;
            }
          }

          return teacherId || '';
        };

        const daysWithoutLessons = [];

        effectiveDays.forEach((uiDay) => {
          const scheduleDayKey = dayKeyMapping[uiDay];
          if (!scheduleDayKey) {
            logger.warn(`[addAbsent] No scheduleDayKey for uiDay: ${uiDay}`);
            return;
          }
          let scheduleForDay = resolveDaySchedule(teacherSchedule, scheduleDayKey);
          if (!scheduleForDay || Object.keys(scheduleForDay).length === 0) {
            logger.warn(`[addAbsent] teacherSchedule[${scheduleDayKey}] is empty or undefined for uiDay: ${uiDay}`);
          }
          daySchedules[uiDay] = scheduleForDay || {};

          const hasLessons = Object.entries(scheduleForDay || {}).some(
            ([pStr, className]) => isPeriodInSlot(Number(pStr)) && typeof className === 'string' && className.trim().length > 0,
          );
          if (!hasLessons) {
            daysWithoutLessons.push({
              dayKey: uiDay,
              label: dayLabelMap.get(uiDay) || uiDay,
            });
          }

          const classListForDay = Array.from(new Set(Object.values(scheduleForDay).filter(Boolean)));
          logger.log(`[addAbsent] classListForDay for ${uiDay}:`, classListForDay);
          classListForDay.forEach((rawClassName) => {
            const classNames = typeof rawClassName === 'string' ? rawClassName.split(',').map(s => s.trim()) : [rawClassName];
            classNames.forEach((className) => {
              const canonicalLabel = normalizeClassName(String(className || '')) || String(className).trim();
              if (!canonicalLabel) return;
              const key = normalizeClassKey(canonicalLabel);
              if (!classNamesToResolve.has(key)) {
                classNamesToResolve.set(key, canonicalLabel);
              }
            });
          });
        });

        classNameCache.forEach((classRecord, key) => {
          if (classRecord?.classId) {
            classNameToId.set(key, classRecord.classId);
          }
        });

        const scheduleClassNamesMap = new Map();
        effectiveDays.forEach((uiDay) => {
          let scheduleForDay = daySchedules[uiDay];
          if (!scheduleForDay || Object.keys(scheduleForDay).length === 0) {
            const scheduleDayKey = dayKeyMapping[uiDay];
            if (scheduleDayKey) {
              scheduleForDay = resolveDaySchedule(teacherSchedule, scheduleDayKey);
              daySchedules[uiDay] = scheduleForDay;
              logger.log(
                `[addAbsent] daySchedules[${uiDay}] was empty, loaded from teacherSchedule[${scheduleDayKey}]:`,
                scheduleForDay,
              );
            }
          }
          Object.values(scheduleForDay || {}).forEach((className) => {
            if (className) {
              const canonicalLabel = normalizeClassName(String(className || '')) || String(className).trim();
              const normalizedKey = normalizeClassKey(canonicalLabel);
              if (!scheduleClassNamesMap.has(normalizedKey)) {
                scheduleClassNamesMap.set(normalizedKey, canonicalLabel);
              }
            }
          });
        });

        await Promise.all(
          Array.from(scheduleClassNamesMap.entries()).map(async ([normalizedKey, originalClassName]) => {
            if (!classNameToId.has(normalizedKey)) {
              if (classNameCache.has(normalizedKey)) {
                const cachedClass = classNameCache.get(normalizedKey);
                if (cachedClass?.classId) {
                  classNameToId.set(normalizedKey, cachedClass.classId);
                  return;
                }
              }
              const label = classNamesToResolve.get(normalizedKey);
              if (label) {
                const record = await ensureClassRecord(label);
                if (record) {
                  classNameToId.set(normalizedKey, record.classId);
                }
              } else {
                const record = await ensureClassRecord(originalClassName);
                if (record) {
                  classNameToId.set(normalizedKey, record.classId);
                }
              }
            }
          }),
        );

        await Promise.all(
          Array.from(classNamesToResolve.entries()).map(async ([key, label]) => {
            if (!classNameToId.has(key)) {
              const record = await ensureClassRecord(label);
              if (record) {
                classNameToId.set(key, record.classId);
              }
            }
          }),
        );

        logger.log(`[addAbsent] classNameToId Map size: ${classNameToId.size}`);
        logger.log(`[addAbsent] classNameToId keys:`, Array.from(classNameToId.keys()));
        logger.log(`[addAbsent] classNamesToResolve keys:`, Array.from(classNamesToResolve.keys()));
        logger.log(`[addAbsent] scheduleClassNamesMap:`, Array.from(scheduleClassNamesMap.entries()));
        logger.log(`[addAbsent] daySchedules:`, daySchedules);
        logger.log(`[addAbsent] teacherSchedule:`, teacherSchedule);

        if (daysWithoutLessons.length > 0) {
          const dayListText = daysWithoutLessons.map(({ label }) => label).join(', ');
          const proceedForEmptyDays = await requestConfirmation({
            title: 'Ders bulunamadı',
            message: `${data.name} öğretmeninin ${dayListText} günü için ders programında kayıt bulunmuyor. Yine de mazeret eklemek ister misiniz?`,
            type: 'warning',
            confirmText: 'Mazereti Kaydet',
            cancelText: 'İptal Et',
          });

          if (!proceedForEmptyDays) {
            try {
              await deleteAbsentById(absentId);
            } catch (deleteErr) {
              logger.warn('Mazeret iptal edilirken silme hatası:', deleteErr);
            }
            setAbsentPeople((prev) => prev.filter((p) => p.absentId !== absentId));
            addNotification(`${data.name} için mazeret eklenmedi; bu gün için ders bulunamadı.`, 'info');
            return;
          }
        }

        if (newlyDiscoveredClasses.length > 0) {
          setClasses((prev) => {
            const existingIds = new Set(prev.map((c) => c.classId));
            const additions = newlyDiscoveredClasses.filter((c) => !existingIds.has(c.classId));
            if (!additions.length) return prev;
            const next = [...prev, ...additions];
            const unique = [];
            const seen = new Set();
            next.forEach((cls) => {
              if (!cls?.classId || seen.has(cls.classId)) return;
              seen.add(cls.classId);
              unique.push(cls);
            });
            return unique;
          });
        }

        const classFreeOps = [];
        const classAbsenceOps = [];
        const commonLessonOps = [];
        const pendingAssignments = [];

        effectiveDays.forEach((uiDay) => {
          const scheduleDayKey = dayKeyMapping[uiDay];
          let scheduleForDay = daySchedules[uiDay];

          if (!scheduleForDay || Object.keys(scheduleForDay).length === 0) {
            if (scheduleDayKey) {
              scheduleForDay = resolveDaySchedule(teacherSchedule, scheduleDayKey);
              daySchedules[uiDay] = scheduleForDay;
              logger.log(
                `[addAbsent] daySchedules[${uiDay}] was empty, using teacherSchedule[${scheduleDayKey}]:`,
                scheduleForDay,
              );
            } else {
              scheduleForDay = {};
            }
          }
          logger.log(`[addAbsent] Processing day ${uiDay}, scheduleForDay:`, scheduleForDay);

          Object.entries(scheduleForDay).forEach(([periodStr, className]) => {
            const period = Number(periodStr);
            let effectiveClassName = className;
            if (!effectiveClassName && teacherSchedule) {
              effectiveClassName = teacherSchedule[periodStr];
            }
            if (!effectiveClassName || !periods.includes(period) || !isPeriodInSlot(period)) {
              logger.log(`[addAbsent] Skipping: className="${effectiveClassName}", period=${period}, timeSlot=${timeSlot}`);
              return;
            }
            
            const classNames = typeof effectiveClassName === 'string' ? effectiveClassName.split(',').map(s => s.trim()) : [effectiveClassName];
            
            classNames.forEach((cName) => {
              const canonical = normalizeClassName(String(cName || '')) || String(cName).trim();
              const normalizedKey = normalizeClassKey(canonical);
              let id = classNameToId.get(normalizedKey) || classNameToId.get(String(cName || '').trim().toUpperCase());
              logger.log(`[addAbsent] className="${cName}", normalizedKey="${normalizedKey}", id=${id}`);
              if (!id) {
                logger.warn(
                  `[addAbsent] Sınıf ID bulunamadı: "${cName}" (normalized: "${normalizedKey}")`,
                );
                return;
              }
              const isImes = isImesLesson(canonical) || isImesLesson(cName) || isImesLesson(normalizedKey);
              const baseFreeOp = { day: uiDay, period, classId: id };
              const baseAbsenceOp = { day: uiDay, period, classId: id, absentId, allowDuty: !isImes };
              const overlaps = isImes ? [] : findOverlappingTeachers(scheduleDayKey, period, normalizedKey);
              pendingAssignments.push({
                baseFreeOp,
                baseAbsenceOp,
                className: canonical,
                overlaps,
                dayLabel: dayLabelMap.get(uiDay) || uiDay,
                isImes,
              });
              logger.log(
                `[addAbsent] Pending ops for day ${uiDay}, period ${period}, classId ${id}, isImes: ${isImes}, overlaps:`,
                overlaps,
              );
            });
          });
        });

        for (const assignment of pendingAssignments) {
          if (assignment.isImes) {
            // İMES dersleri okul dışı staj/koordinatörlük görevi olduğu için nöbetçi öğretmen atanmaz:
            // 1) classFreeOps'a (boş sınıflar) EKLENMEZ
            // 2) classAbsence'a allowDuty: false olarak kaydedilir
            classAbsenceOps.push({
              ...assignment.baseAbsenceOp,
              allowDuty: false,
            });
            continue;
          }

          const overlapNames = assignment.overlaps
            .map(resolveOverlapDisplayName)
            .filter((name) => typeof name === 'string' && name.trim().length > 0);

          if (overlapNames.length > 0) {
            const overlapLabel = overlapNames.join(', ');
            const mergeConfirmed = await requestConfirmation({
              title: 'Grup birleştirilsin mi?',
              message: `${assignment.dayLabel} ${assignment.baseFreeOp.period}. saat ${assignment.className} dersine ayrıca ${overlapLabel} giriyor. Grup birleştirilsin mi?`,
              type: 'info',
              confirmText: 'Birleştir',
              cancelText: 'Hayır',
            });

            if (mergeConfirmed) {
              const teacherLabel = normalizeCommonLessonTeacherName(overlapNames[0] || overlapLabel || 'Diğer Öğretmen');
              classAbsenceOps.push({
                day: assignment.baseAbsenceOp.day,
                period: assignment.baseAbsenceOp.period,
                classId: assignment.baseAbsenceOp.classId,
                absentId: COMMON_LESSON_LABEL,
                allowDuty: false,
                commonLessonOwnerId: assignment.baseAbsenceOp.absentId,
              });
              commonLessonOps.push({
                day: assignment.baseAbsenceOp.day,
                period: assignment.baseAbsenceOp.period,
                classId: assignment.baseAbsenceOp.classId,
                teacherName: teacherLabel,
              });
              continue;
            }
          }

          classFreeOps.push(assignment.baseFreeOp);
          classAbsenceOps.push(assignment.baseAbsenceOp);
        }

        logger.log(`[addAbsent] classFreeOps length: ${classFreeOps.length}`, classFreeOps);
        logger.log(`[addAbsent] classAbsenceOps length: ${classAbsenceOps.length}`, classAbsenceOps);

        if (classFreeOps.length > 0) {
          setClassFree((prev) => {
            const next = { ...prev };
            const ensureSet = (d, p) => {
              if (!next[d]) next[d] = {};
              if (!(next[d][p] instanceof Set)) {
                next[d][p] = new Set(Array.isArray(next[d][p]) ? next[d][p] : []);
              }
            };

            classFreeOps.forEach(({ day: dKey, period: per, classId: cId }) => {
              ensureSet(dKey, per);
              next[dKey][per].add(cId);
            });

            return next;
          });
        } else {
          logger.warn('[addAbsent] No classFreeOps generated');
        }

        if (classAbsenceOps.length > 0) {
          setClassAbsence((prev) => {
            const next = { ...prev };

            classAbsenceOps.forEach(({ day: dKey, period: per, classId: cId, absentId: aId, allowDuty, commonLessonOwnerId }) => {
              if (!next[dKey]) next[dKey] = {};
              if (!next[dKey][per]) next[dKey][per] = {};
              const encodedValue = encodeClassAbsenceValue(aId, allowDuty !== false, { commonLessonOwnerId });
              next[dKey][per][cId] = encodedValue;
            });

            return next;
          });
        } else {
          logger.warn('[addAbsent] No classAbsenceOps generated');
        }

        if (commonLessonOps.length > 0) {
          setCommonLessons((prev) => {
            const next = { ...prev };
            commonLessonOps.forEach(({ day: dKey, period: per, classId: cId, teacherName }) => {
              if (!next[dKey]) next[dKey] = {};
              if (!next[dKey][per]) next[dKey][per] = {};
              next[dKey][per][cId] = teacherName;
            });
            return next;
          });
        }

        try {
          if (classFreeOps.length > 0) {
            await bulkUpsertClassFree(
              classFreeOps.map(({ day: dKey, period: per, classId: cId }) => ({
                day: dKey,
                period: per,
                classId: cId,
                isSelected: true,
              }))
            );
          }
        } catch (err) {
          logger.error('Class free bulk insert error:', err);
          addNotification('Sınıfların boşluk bilgisi veritabanına yazılamadı. Lütfen tekrar deneyin.', 'error');
        }

        try {
          if (classAbsenceOps.length > 0) {
            await bulkUpsertClassAbsence(
              classAbsenceOps.map(({ day: dKey, period: per, classId: cId, absentId: aId, allowDuty, commonLessonOwnerId }) => ({
                day: dKey,
                period: per,
                classId: cId,
                absentId: encodeClassAbsenceValue(aId, allowDuty !== false, { commonLessonOwnerId }),
              }))
            );
          }
        } catch (err) {
          logger.error('Class absence bulk insert error:', err);
          addNotification('Mazeretli sınıf işaretleri veritabanına kaydedilemedi.', 'error');
        }

        const addedCount = newlyDiscoveredClasses.length;
        const allowedMarkedCount = classFreeOps.length;

        if (addedCount > 0 || allowedMarkedCount > 0) {
          addNotification(
            `${data.name} için ${addedCount} sınıf eklendi${allowedMarkedCount > 0 ? `, ${allowedMarkedCount} saat işaretlendi` : ''}`,
            'info',
          );
        }
      } catch (err) {
        logger.warn('Mazeret eklemede sınıf/periyot işaretleme hatası:', err);
        addNotification(`Sınıf işaretleme başarısız: ${err.message || err}`, 'error');
      }
    },
    [
      day,
      DAYS,
      teachers,
      classes,
      periods,
      teacherSchedules,
      teacherMap,
      normalizeCommonLessonTeacherName,
      absentPeople,
      setAbsentPeople,
      setClasses,
      setClassFree,
      setClassAbsence,
      setCommonLessons,
      classAbsenceStateRef,
      requestConfirmation,
      addNotification,
      logger,
      filteredAbsentPeople,
    ],
  );

  return { addAbsent };
}

