'use client';

import React from 'react';
import { EngagementItem } from '../types';

interface EngagementContractSectionProps {
  engagement: EngagementItem;
  uploadingFile: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onViewContract: () => void;
  onDeleteContract: () => void;
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function EngagementContractSection({
  engagement,
  uploadingFile,
  fileInputRef,
  onViewContract,
  onDeleteContract,
}: EngagementContractSectionProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <span>📜</span> Signed Contract & Legal Terms
        </h2>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold capitalize">
          ✓ {engagement.contract_status}
        </span>
      </div>

      {/* Contract File Attachment / Upload Card */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span>📄</span> Contract Document (PDF/DOCX)
          </span>
          {engagement.contract_file && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
              Attached
            </span>
          )}
        </div>

        {engagement.contract_file ? (
          <div className="p-3 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 text-base shrink-0">
                📕
              </span>
              <div className="min-w-0">
                <span
                  className="font-bold text-slate-900 block truncate"
                  title={engagement.contract_file.filename}
                >
                  {engagement.contract_file.filename}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {formatFileSize(engagement.contract_file.size_bytes)} • Uploaded{' '}
                  {new Date(engagement.contract_file.uploaded_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onViewContract}
                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg transition flex items-center gap-1"
              >
                <span>👁️</span> View / Download
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition"
              >
                🔄 Replace
              </button>
              <button
                type="button"
                onClick={onDeleteContract}
                className="text-slate-400 hover:text-rose-600 p-1 text-sm transition"
                title="Remove file"
              >
                🗑️
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-5 border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/30 rounded-xl text-center cursor-pointer transition space-y-1.5"
          >
            <span className="text-2xl block">📤</span>
            <p className="text-xs font-bold text-slate-800">
              {uploadingFile ? 'Uploading contract file...' : 'Upload Signed Contract (PDF, DOCX)'}
            </p>
            <p className="text-[11px] text-slate-400">
              Click to select file or drag & drop (Max 25MB)
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-slate-400 block mb-1">Contract Ref / Link</span>
          <span className="font-mono font-bold text-slate-900 break-all">
            {engagement.contract_ref || 'No doc link specified'}
          </span>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-slate-400 block mb-1">Signed Date</span>
          <span className="font-semibold text-slate-900">
            {engagement.signed_at || 'Not recorded'}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Terms & Conditions (T&C)
        </span>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
          {engagement.terms_and_conditions || 'No specific terms & conditions logged.'}
        </div>
      </div>

      {engagement.notes && (
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Internal Notes & Deliverables
          </span>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap">
            {engagement.notes}
          </div>
        </div>
      )}
    </div>
  );
}
