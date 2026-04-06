import React from 'react';
import AddTeacherModal from "./AddTeacherModal.jsx";
import AddClassModal from "./AddClassModal.jsx";
import AddAbsentModal from "./AddAbsentModal.jsx";
import CommonLessonModal from "./CommonLessonModal.jsx";
import ConfirmationModal from "./ConfirmationModal.jsx";
import PdfScheduleImportModal from "./PdfScheduleImportModal.jsx";
import DutyTeacherExcelImportModal from "./DutyTeacherExcelImportModal.jsx";
import TeacherScheduleModal from "./TeacherScheduleModal.jsx";

export default function GlobalModals({
    modals,
    setModals,
    addTeacher,
    addClass,
    addAbsent,
    day,
    DAYS,
    scheduledTeacherOptions,
    handleCloseCommonLessonModal,
    handleSetCommonLesson,
    handleSelectAbsence,
    currentCommonLesson,
    commonLessons,
    confirmationModal,
    setConfirmationModal,
    excelReplaceModal,
    handleExcelReplaceCancel,
    handleExcelReplaceConfirm,
    teacherScheduleReplaceModal,
    handleTeacherScheduleReplaceCancel,
    handleTeacherScheduleReplaceConfirm,
    pdfImportModal,
    setPdfImportModal,
    loadScheduleFromPDF,
    teachers,
    classes,
    locked,
    IconComponent,
    handleCloseDutyTeacherExcelModal,
    loadDutyTeachersFromExcel,
    selectedTeacher,
    setSelectedTeacher,
    blockedAbsentTeacherNames = new Set(),
}) {
    const Icon = IconComponent;

    return (
        <>
            {modals.teacher && (
                <AddTeacherModal
                    isOpen={modals.teacher}
                    onClose={() => setModals(m => ({ ...m, teacher: false }))}
                    onSubmit={addTeacher}
                />
            )}

            {modals.class && (
                <AddClassModal
                    isOpen={modals.class}
                    onClose={() => setModals(m => ({ ...m, class: false }))}
                    onSubmit={addClass}
                />
            )}

            {modals.absent && (
                <AddAbsentModal
                    isOpen={modals.absent}
                    onClose={() => setModals(m => ({ ...m, absent: false }))}
                    onSubmit={addAbsent}
                    currentDayKey={day}
                    currentDayLabel={DAYS.find(d => d.key === day)?.label || day}
                    teacherOptions={scheduledTeacherOptions}
                    blockedTeacherNames={blockedAbsentTeacherNames}
                />
            )}

            {modals.commonLesson && (
                <CommonLessonModal
                    isOpen={modals.commonLesson}
                    onClose={handleCloseCommonLessonModal}
                    onSubmit={(teacherName) => {
                        if (currentCommonLesson.day && currentCommonLesson.period && currentCommonLesson.classId) {
                            handleSetCommonLesson(currentCommonLesson.day, currentCommonLesson.period, currentCommonLesson.classId, teacherName);
                            // Also set classAbsence to mark it as common lesson
                            handleSelectAbsence(currentCommonLesson.day, currentCommonLesson.period, currentCommonLesson.classId, "COMMON_LESSON");
                        }
                        handleCloseCommonLessonModal();
                    }}
                    currentTeacherName={currentCommonLesson.day && currentCommonLesson.period && currentCommonLesson.classId ?
                        commonLessons[currentCommonLesson.day]?.[currentCommonLesson.period]?.[currentCommonLesson.classId] : ""}
                />
            )}

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmationModal.isOpen}
                onClose={() => {
                    if (typeof confirmationModal.onCancel === 'function') {
                        confirmationModal.onCancel();
                    } else {
                        setConfirmationModal(prev => ({ ...prev, isOpen: false }));
                    }
                }}
                onConfirm={confirmationModal.onConfirm}
                title={confirmationModal.title}
                message={confirmationModal.message}
                type={confirmationModal.type}
                confirmText={confirmationModal.confirmText}
                cancelText={confirmationModal.cancelText}
                IconComponent={Icon}
            />

            {/* Excel Replace Modal */}
            <ConfirmationModal
                isOpen={excelReplaceModal.isOpen}
                onClose={handleExcelReplaceCancel}
                onConfirm={handleExcelReplaceConfirm}
                title="Mevcut Nöbetçi Öğretmen Listesi"
                message={`Mevcut ${excelReplaceModal.existingCount} nöbetçi öğretmen bulunuyor. Yeni Excel dosyası ile değiştirmek istediğinizden emin misiniz?\n\nMevcut öğretmenler silinecek ve yeni liste yüklenecek.`}
                type="warning"
                confirmText="Değiştir"
                cancelText="İptal"
                IconComponent={Icon}
            />

            {/* Teacher Schedule Replace Modal */}
            <ConfirmationModal
                isOpen={teacherScheduleReplaceModal.isOpen}
                onClose={handleTeacherScheduleReplaceCancel}
                onConfirm={handleTeacherScheduleReplaceConfirm}
                title="Mevcut Ders Programı Değiştirilecek"
                message={`Mevcut ${teacherScheduleReplaceModal.existingCount || 0} öğretmenin ders programı bulunuyor. Yeni Excel dosyası ile değiştirmek istediğinizden emin misiniz?\n\nMevcut ders programları silinecek ve yeni ders programları yüklenecek.`}
                type="warning"
                confirmText="Değiştir"
                cancelText="İptal"
                IconComponent={Icon}
            />

            <PdfScheduleImportModal
                isOpen={pdfImportModal}
                onClose={() => setPdfImportModal(false)}
                onImport={loadScheduleFromPDF}
                teachers={teachers}
                classes={classes}
                locked={locked}
                IconComponent={Icon}
            />

            {/* Duty Teacher Excel Import Modal */}
            {modals.dutyTeacherExcel && (
                <DutyTeacherExcelImportModal
                    isOpen={modals.dutyTeacherExcel}
                    onClose={handleCloseDutyTeacherExcelModal}
                    onImport={loadDutyTeachersFromExcel}
                />
            )}

            {/* Teacher Schedule Modal */}
            <TeacherScheduleModal
                isOpen={selectedTeacher !== null}
                onClose={() => setSelectedTeacher(null)}
                teacherName={selectedTeacher?.name}
                schedule={selectedTeacher?.schedule}
                IconComponent={Icon}
            />
        </>
    );
}
