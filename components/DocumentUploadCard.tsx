import React, { useState, useRef } from 'react';
import { Upload, X, Eye, Image as ImageIcon, Loader2, CheckCircle2, Sparkles, Download, ZoomIn } from 'lucide-react';
import { compressDocumentImage, CompressionResult } from '../utils/imageCompressor';

interface DocumentUploadCardProps {
  title: string;
  description?: string;
  value?: string;
  onChange?: (base64: string | undefined) => void;
  disabled?: boolean;
  readOnly?: boolean;
  badgeLabel?: string;
  icon?: React.ReactNode;
}

export const DocumentUploadCard: React.FC<DocumentUploadCardProps> = ({
  title,
  description,
  value,
  onChange,
  disabled = false,
  readOnly = false,
  badgeLabel,
  icon
}) => {
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<CompressionResult | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)');
      return;
    }

    try {
      setIsCompressing(true);
      // High-res document compression: 1280px, quality 0.74 (text is razor-sharp, size ~40-80KB)
      const result = await compressDocumentImage(file, {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.74
      });

      setCompressionInfo(result);
      onChange?.(result.base64);
    } catch (err: any) {
      console.error('Image compression error:', err);
      alert('حدث خطأ أثناء معالجة الصورة: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || readOnly) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || readOnly) return;
    setCompressionInfo(null);
    onChange?.(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {icon || <ImageIcon className="text-orange-500" size={18} />}
              <h5 className="text-xs font-black text-slate-800">{title}</h5>
            </div>
            {badgeLabel && (
              <span className="text-[10px] font-black bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                {badgeLabel}
              </span>
            )}
          </div>
          {description && (
            <p className="text-[11px] text-slate-500 font-semibold mb-3 leading-relaxed">{description}</p>
          )}

          {/* Upload Dropzone or Image Preview */}
          {value ? (
            <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
              <div className="h-44 w-full flex items-center justify-center overflow-hidden bg-slate-900/5 cursor-pointer" onClick={() => setIsPreviewOpen(true)}>
                <img
                  src={value}
                  alt={title}
                  className="w-full h-full object-contain transition-transform group-hover:scale-105 duration-200"
                />
              </div>

              {/* Overlay action buttons */}
              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none group-hover:pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="bg-white/95 text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-white"
                >
                  <Eye size={14} /> تكبير
                </button>
                {!readOnly && !disabled && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="bg-red-500/90 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-red-600"
                  >
                    <X size={14} /> حذف
                  </button>
                )}
              </div>

              {/* Compression stat badge */}
              {compressionInfo && (
                <div className="bg-emerald-50 border-t border-emerald-200 p-2 flex items-center gap-1.5 text-[10px] font-bold text-emerald-800">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>
                    تم الضغط: من {compressionInfo.originalSizeKB} KB إلى {compressionInfo.compressedSizeKB} KB (وفر {compressionInfo.savedPercentage}%)
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !disabled && !readOnly && !isCompressing && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[140px] ${
                isDragging ? 'border-orange-500 bg-orange-50/50' : 'border-slate-300 hover:border-orange-400 bg-slate-50/60'
              } ${disabled || readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={disabled || readOnly || isCompressing}
                onChange={handleFileChange}
              />
              
              {isCompressing ? (
                <div className="flex flex-col items-center gap-2 text-orange-600">
                  <Loader2 size={24} className="animate-spin" />
                  <span className="text-xs font-bold">جاري ضغط المستند بدقة عالية...</span>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-2 shadow-sm">
                    <Upload size={20} />
                  </div>
                  <p className="text-xs font-black text-slate-800">
                    {readOnly ? 'لا توجد صورة مرفوعة' : 'انقر لرفع المستند أو اسحبه هنا'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold mt-1">
                    يتم ضغط الصورة تلقائياً لحجم صغير جداً مع بقاء البيانات واضحة تماماً
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Change Image button if already has value */}
        {value && !readOnly && !disabled && (
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1"
            >
              <Upload size={14} /> تغيير الصورة
            </button>
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="text-xs text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1"
            >
              <ZoomIn size={14} /> معاينة
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {isPreviewOpen && value && (
        <div
          className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ImageIcon className="text-orange-500" size={20} />
                <h4 className="text-sm font-black text-slate-900">{title}</h4>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={value}
                  download={`${title.replace(/\s+/g, '_')}.jpg`}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold"
                  title="تحميل الصورة"
                >
                  <Download size={16} /> تحميل
                </a>
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-auto flex items-center justify-center max-h-[80vh] bg-slate-100">
              <img
                src={value}
                alt={title}
                className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-lg border border-slate-200"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DocumentUploadCard;
