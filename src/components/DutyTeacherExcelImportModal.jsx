import React, { useState, useCallback } from 'react';
import { parseDutyTeachersFromExcel } from '../utils/dutyTeacherExcelParser.js';
import Modal from './Modal.jsx';

const DutyTeacherExcelImportModal = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);
  const [maxDutyValues, setMaxDutyValues] = useState({});

  const handleFileChange = useCallback((event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(null);
      setErrors([]);
    }
  }, []);

  const handlePreview = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setErrors([]);

    try {
      const result = await parseDutyTeachersFromExcel(file);
      setPreview(result);
      
      // Her öğretmen için varsayılan max görev değerini ayarla (6)
      const initialMaxDuty = {};
      result.dutyTeachers?.forEach(teacher => {
        initialMaxDuty[teacher.teacherId] = teacher.maxDutyPerDay || 6;
      });
      setMaxDutyValues(initialMaxDuty);
      
      if (result.errors && result.errors.length > 0) {
        setErrors(result.errors);
      }
    } catch (error) {
      setErrors([error.message]);
    } finally {
      setLoading(false);
    }
  }, [file]);

  const handleImport = useCallback(() => {
    if (!preview || !preview.dutyTeachers) return;

    // Validate the data
    const validTeachers = preview.dutyTeachers
      .filter(teacher => {
        return teacher.teacherName && teacher.teacherName.trim().length > 0;
      })
      .map(teacher => ({
        ...teacher,
        maxDutyPerDay: maxDutyValues[teacher.teacherId] || teacher.maxDutyPerDay || 6
      }));

    if (validTeachers.length === 0) {
      setErrors(['Geçerli öğretmen verisi bulunamadı']);
      return;
    }

    // Call the import function with updated data
    onImport({
      ...preview,
      dutyTeachers: validTeachers,
      fileMeta: file
        ? {
            name: file.name,
            size: file.size,
            lastModified: file.lastModified,
            type: file.type,
          }
        : null,
    });
    onClose();
  }, [preview, maxDutyValues, onImport, onClose, file]);

  const handleMaxDutyChange = useCallback((teacherId, value) => {
    const numValue = parseInt(value, 10);
    const safeValue = Number.isFinite(numValue) && numValue >= 1 && numValue <= 9 ? numValue : 6;
    setMaxDutyValues(prev => ({
      ...prev,
      [teacherId]: safeValue
    }));
  }, []);

  const handleClose = useCallback(() => {
    setFile(null);
    setPreview(null);
    setErrors([]);
    setMaxDutyValues({});
    onClose();
  }, [onClose]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nöbetçi Öğretmen Excel Yükleme">
      <div className="excel-import-modal">
        <div className="upload-section">
          <div className="file-upload-area">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="file-input"
              id="excel-file-input"
            />
            <label htmlFor="excel-file-input" className="file-upload-label">
              <div className="upload-icon">📊</div>
              <div className="upload-text">
                <div className="upload-title">Excel dosyası seçin</div>
                <div className="upload-subtitle">.xlsx veya .xls formatında</div>
              </div>
            </label>
          </div>
          
          {file && (
            <div className="file-selected">
              <div className="file-icon">📄</div>
              <div className="file-details">
                <div className="file-name">{file.name}</div>
                <div className="file-size">{(file.size / 1024).toFixed(1)} KB</div>
              </div>
            </div>
          )}
        </div>

        {file && (
          <div className="preview-section">
            <button
              onClick={handlePreview}
              disabled={loading}
              className="preview-btn"
            >
              {loading ? (
                <>
                  <div className="loading-spinner"></div>
                  İşleniyor...
                </>
              ) : (
                <>
                  <div className="preview-icon">👁️</div>
                  Önizleme Yap
                </>
              )}
            </button>
          </div>
        )}

        {errors.length > 0 && (
          <div className="error-alert">
            <div className="error-icon">⚠️</div>
            <div className="error-content">
              <div className="error-title">Hata</div>
              <div className="error-message">{errors[0]}</div>
            </div>
          </div>
        )}

        {preview && preview.dutyTeachers && preview.dutyTeachers.length > 0 && (
          <div className="preview-results">
            <div className="results-header">
              <div className="results-icon">✅</div>
              <div className="results-info">
                <div className="results-title">Önizleme Başarılı</div>
                <div className="results-count">{preview.dutyTeachers.length} öğretmen bulundu</div>
              </div>
            </div>

            <div className="teachers-list">
              {preview.dutyTeachers.map((teacher, index) => (
                <div key={teacher.teacherId || index} className="teacher-item">
                  <div className="teacher-avatar">👨‍🏫</div>
                  <div className="teacher-info">
                    <div className="teacher-name">{teacher.teacherName}</div>
                    <div className="teacher-id">{teacher.teacherId}</div>
                  </div>
                  <div className="teacher-max-duty">
                    <label className="max-duty-label">Günlük Max:</label>
                    <input
                      type="number"
                      min="1"
                      max="9"
                      value={maxDutyValues[teacher.teacherId] || teacher.maxDutyPerDay || 6}
                      onChange={(e) => handleMaxDutyChange(teacher.teacherId, e.target.value)}
                      className="max-duty-input"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button onClick={handleClose} className="btn-cancel">
            İptal
          </button>
          {preview && preview.dutyTeachers && preview.dutyTeachers.length > 0 && (
            <button onClick={handleImport} className="btn-import">
              <div className="import-icon">📥</div>
              Yükle ({preview.dutyTeachers.length} öğretmen)
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .excel-import-modal {
          max-width: 500px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .upload-section {
          margin-bottom: 24px;
        }

        .file-upload-area {
          margin-bottom: 16px;
        }

        .file-input {
          display: none;
        }

        .file-upload-label {
          display: flex;
          align-items: center;
          padding: 24px;
          border: 2px dashed #e1e5e9;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #fafbfc;
        }

        .file-upload-label:hover {
          border-color: #667eea;
          background: #f8f9ff;
        }

        .upload-icon {
          font-size: 24px;
          margin-right: 16px;
        }

        .upload-text {
          flex: 1;
        }

        .upload-title {
          font-size: 16px;
          font-weight: 500;
          color: #2c3e50;
          margin-bottom: 4px;
        }

        .upload-subtitle {
          font-size: 14px;
          color: #6c757d;
        }

        .file-selected {
          display: flex;
          align-items: center;
          padding: 16px;
          background: #e8f5e8;
          border-radius: 8px;
          border: 1px solid #c8e6c9;
        }

        .file-icon {
          font-size: 20px;
          margin-right: 12px;
        }

        .file-details {
          flex: 1;
        }

        .file-name {
          font-size: 14px;
          font-weight: 500;
          color: #2c3e50;
          margin-bottom: 2px;
        }

        .file-size {
          font-size: 12px;
          color: #6c757d;
        }

        .preview-section {
          text-align: center;
          margin: 20px 0;
        }

        .preview-btn {
          display: inline-flex;
          align-items: center;
          padding: 12px 24px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .preview-btn:hover:not(:disabled) {
          background: #5a6fd8;
          transform: translateY(-1px);
        }

        .preview-btn:disabled {
          background: #95a5a6;
          cursor: not-allowed;
          transform: none;
        }

        .preview-icon {
          margin-right: 8px;
          font-size: 16px;
        }

        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-right: 8px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-alert {
          display: flex;
          align-items: center;
          padding: 16px;
          background: #ffebee;
          border: 1px solid #ffcdd2;
          border-radius: 8px;
          margin: 16px 0;
        }

        .error-icon {
          font-size: 20px;
          margin-right: 12px;
        }

        .error-content {
          flex: 1;
        }

        .error-title {
          font-size: 14px;
          font-weight: 500;
          color: #c62828;
          margin-bottom: 2px;
        }

        .error-message {
          font-size: 13px;
          color: #d32f2f;
        }

        .preview-results {
          margin: 20px 0;
          padding: 20px;
          background: #e8f5e8;
          border: 1px solid #c8e6c9;
          border-radius: 8px;
        }

        .results-header {
          display: flex;
          align-items: center;
          margin-bottom: 16px;
        }

        .results-icon {
          font-size: 20px;
          margin-right: 12px;
        }

        .results-info {
          flex: 1;
        }

        .results-title {
          font-size: 16px;
          font-weight: 500;
          color: #2e7d32;
          margin-bottom: 2px;
        }

        .results-count {
          font-size: 14px;
          color: #4caf50;
        }

        .teachers-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .teacher-item {
          display: flex;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #e1e5e9;
        }

        .teacher-item:last-child {
          border-bottom: none;
        }

        .teacher-avatar {
          font-size: 16px;
          margin-right: 12px;
        }

        .teacher-info {
          flex: 1;
        }

        .teacher-name {
          font-size: 14px;
          font-weight: 500;
          color: #2c3e50;
          margin-bottom: 2px;
        }

        .teacher-id {
          font-size: 12px;
          color: #6c757d;
        }

        .teacher-max-duty {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: 12px;
        }

        .max-duty-label {
          font-size: 12px;
          color: #6c757d;
          white-space: nowrap;
        }

        .max-duty-input {
          width: 60px;
          padding: 6px 8px;
          border: 1px solid #e1e5e9;
          border-radius: 6px;
          font-size: 14px;
          text-align: center;
          background: white;
          color: #2c3e50;
        }

        .max-duty-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
        }

        .more-teachers {
          text-align: center;
          padding: 12px;
          font-size: 14px;
          color: #6c757d;
          font-style: italic;
          background: #f8f9fa;
          border-radius: 6px;
          margin-top: 8px;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #e1e5e9;
        }

        .btn-cancel,
        .btn-import {
          display: inline-flex;
          align-items: center;
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .btn-cancel {
          background: #f5f5f5;
          color: #6c757d;
          border: 1px solid #e1e5e9;
        }

        .btn-cancel:hover {
          background: #e9ecef;
        }

        .btn-import {
          background: #667eea;
          color: white;
        }

        .btn-import:hover {
          background: #5a6fd8;
          transform: translateY(-1px);
        }

        .import-icon {
          margin-right: 6px;
          font-size: 14px;
        }
      `}</style>
    </Modal>
  );
};

export default DutyTeacherExcelImportModal;
