// Performance optimization constants
// These should be moved outside component to prevent recreation on every render

export const TAB_ITEMS = [
    { key: 'teachers', label: 'Öğretmenler', icon: 'users' },
    { key: 'classes', label: 'Sınıflar', icon: 'home' },
    { key: 'absents', label: 'Devamsızlar', icon: 'userX' },
    { key: 'schedule', label: 'Nöbet Programı', icon: 'calendar' },
    { key: 'course-schedule', label: 'Ders Programı', icon: 'book' },
    { key: 'outputs', label: 'Çıktılar', icon: 'printer' },
];

export const DEFAULT_OPTIONS = Object.freeze({
    preventConsecutive: true,
    maxClassesPerSlot: 1,
    ignoreConsecutiveLimit: false,
});
