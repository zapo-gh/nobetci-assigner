// @ts-nocheck
import React from 'react';
import { truncateClassName } from '../utils/classNameUtils.js';

/**
 * Bir sınıf hücresindeki mazeretli öğretmenleri ortak biçimde gösterir.
 * Birden çok öğretmen varsa her biri kendi mazeretiyle, kesikli çizgiyle ayrılmış
 * ve sınıf adı çizgi sonrasında tekrarlanarak bloklar halinde listelenir.
 */
export default function AbsentTeachersBlock({ infos = [], className = '', reasonLabels = {}, separator = true, suffix = '' }) {
  if (!infos || infos.length === 0) return null;
  return (
    <div className="abs">
      {infos.map((inf, idx) => (
        <div
          key={inf.absentId || `${inf.name}-${idx}`}
          style={idx > 0 && separator ? { marginTop: '3px', paddingTop: '3px', borderTop: '1px dashed #cbd5e1' } : undefined}
        >
          {idx > 0 && className && (
            <div className="class nowrap" title={className}>
              {truncateClassName(className, 10)}
            </div>
          )}
          <small className="absline" style={{ fontWeight: 600 }}>{inf.name}{suffix}</small>
          <small className="absline">{reasonLabels[inf.reason] || inf.reason}</small>
        </div>
      ))}
    </div>
  );
}
