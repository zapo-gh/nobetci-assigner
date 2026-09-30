import { reportError } from './errorReporting.js';

// Güvenli localStorage işlemleri

export class SecureStorage {
  storageKey: string;

  constructor(storageKey: string = "nobetci_persist_v4") {
    this.storageKey = storageKey;
  }

  setItem(key: string, value: any): boolean {
    try {
      const data = this.getAllData();
      data[key] = value;
      const serializedValue = JSON.stringify(data);

      // Veri boyutu kontrolü (5MB limit)
      if (serializedValue.length > 5 * 1024 * 1024) {
        throw new Error('Veri boyutu çok büyük (maksimum 5MB)');
      }

      localStorage.setItem(this.storageKey, serializedValue);
      return true;
    } catch (error: any) {
      reportError('SecureStorage setItem error:', error);
      throw new Error('Veri kaydedilemedi: ' + error.message);
    }
  }

  getItem(key: string): any {
    try {
      const data = this.getAllData();
      return data[key] || null;
    } catch (error) {
      reportError('SecureStorage getItem error:', error);
      return null;
    }
  }

  removeItem(key: string): boolean {
    try {
      const data = this.getAllData();
      delete data[key];
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return true;
    } catch (error) {
      reportError('SecureStorage removeItem error:', error);
      return false;
    }
  }

  getAllData(): Record<string, any> {
    try {
      const item = localStorage.getItem(this.storageKey);
      return item ? JSON.parse(item) : {};
    } catch (error) {
      reportError('SecureStorage getAllData error:', error);
      return {};
    }
  }

  setAllData(data: Record<string, any>): boolean {
    try {
      const serializedValue = JSON.stringify(data);

      // Veri boyutu kontrolü
      if (serializedValue.length > 5 * 1024 * 1024) {
        throw new Error('Veri boyutu çok büyük (maksimum 5MB)');
      }

      localStorage.setItem(this.storageKey, serializedValue);
      return true;
    } catch (error: any) {
      reportError('SecureStorage setAllData error:', error);
      throw new Error('Veri kaydedilemedi: ' + error.message);
    }
  }

  clear(): boolean {
    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      reportError('SecureStorage clear error:', error);
      return false;
    }
  }

  // Migration helper for old storage format
  migrateFromOldFormat(oldKey: string): boolean {
    try {
      const oldData = localStorage.getItem(oldKey);
      if (oldData) {
        const parsedData = JSON.parse(oldData);
        this.setAllData(parsedData);
        localStorage.removeItem(oldKey); // Clean up old data
        return true;
      }
      return false;
    } catch (error) {
      reportError('Migration error:', error);
      return false;
    }
  }
}

// Singleton instance for app-wide use
export const appStorage = new SecureStorage();
