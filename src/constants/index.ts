export const DAYS = [
    { key: "Mon", label: "Pazartesi", short: "Pzt" },
    { key: "Tue", label: "Salı", short: "Sal" },
    { key: "Wed", label: "Çarşamba", short: "Çar" },
    { key: "Thu", label: "Perşembe", short: "Per" },
    { key: "Fri", label: "Cuma", short: "Cum" }
];

export const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export const DEFAULT_PERIOD_TIMES: Record<number | string, string> = {
  1: "08:30 - 09:10",
  2: "09:20 - 10:00",
  3: "10:10 - 10:50",
  4: "11:00 - 11:40",
  5: "11:50 - 12:30",
  6: "13:40 - 14:20",
  7: "14:30 - 15:10",
  8: "15:20 - 16:00",
  9: "16:10 - 16:50",
  10: "16:55 - 17:35",
  11: "17:40 - 18:20",
};

export const REAL_DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const STORAGE_KEY_PREFIX = 'nobetci_persist_v4';
