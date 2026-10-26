import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Trash2, X, RefreshCw, Check, Loader2, Sparkles, User } from 'lucide-react';
import { compressProfilePhoto } from '../utils/imageCompressor';

interface ProfilePhotoUploaderProps {
  photo?: string | null;
  name: string;
  role?: string;
  number?: string | number;
  onPhotoChange: (newPhotoBase64: string | null) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBadges?: boolean;
}

export const ProfilePhotoUploader: React.FC<ProfilePhotoUploaderProps> = ({
  photo,
  name,
  role,
  number,
  onPhotoChange,
  disabled = false,
  size = 'lg',
  className = '',
  showBadges = true,
}) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [savedBadge, setSavedBadge] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // إيقاف بث الكاميرا عند إغلاق النافذة أو إلغاء المكون
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
    setCameraError(null);
  };

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // تشغيل الكاميرا المباشرة
  const startCamera = async () => {
    if (disabled) return;
    setCameraError(null);
    setIsCameraOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 }
        },
        audio: false
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('تعذر الوصول إلى الكاميرا. يرجى التحقق من أذونات المتصفح أو استخدام خيار رفع صورة من الجهاز.');
    }
  };

  // التأكد من ربط البث بالفيديو فور توفره
  useEffect(() => {
    if (isCameraOpen && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(e => console.error(e));
    }
  }, [isCameraOpen, cameraStream]);

  // التقاط الصورة من الكاميرا
  const capturePhoto = async () => {
    if (!videoRef.current) return;
    setIsCompressing(true);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const minDim = Math.min(video.videoWidth || 640, video.videoHeight || 640);
      canvas.width = minDim;
      canvas.height = minDim;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('فشل معالجة الكاميرا');

      // قص مربع في المنتصف
      const startX = ((video.videoWidth || minDim) - minDim) / 2;
      const startY = ((video.videoHeight || minDim) - minDim) / 2;
      ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, minDim, minDim);

      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error('فشل التقاط الصورة');
        const compressed = await compressProfilePhoto(blob, { targetSize: 480, quality: 0.78 });
        onPhotoChange(compressed.base64);
        setSavedBadge(`تم الحفظ بنقاء عالي (${compressed.compressedSizeKB} ك.ب)`);
        setTimeout(() => setSavedBadge(null), 4000);
        stopCamera();
        setIsCompressing(false);
      }, 'image/jpeg', 0.95);
    } catch (err: any) {
      alert('خطأ أثناء التقاط الصورة: ' + err.message);
      setIsCompressing(false);
    }
  };

  // معالجة اختيار ملف من الجهاز
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const compressed = await compressProfilePhoto(file, { targetSize: 480, quality: 0.78 });
      onPhotoChange(compressed.base64);
      setSavedBadge(`تم ضغط الصورة بنجاح (${compressed.compressedSizeKB} ك.ب)`);
      setTimeout(() => setSavedBadge(null), 4000);
    } catch (err: any) {
      alert('خطأ في معالجة الصورة: ' + err.message);
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // تحديد قياسات الحاوية
  const sizeClasses = {
    sm: 'w-12 h-12 text-lg rounded-xl',
    md: 'w-16 h-16 text-2xl rounded-2xl',
    lg: 'w-24 h-24 md:w-28 md:h-28 text-4xl md:text-5xl rounded-[1.8rem]',
    xl: 'w-32 h-32 md:w-36 md:h-36 text-5xl md:text-6xl rounded-[2.2rem]',
  }[size];

  return (
    <div className={`relative inline-block ${className}`}>
      {/* إدخال الملفات المخفي */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled}
      />

      {/* حاوية الصورة الأساسية */}
      <div className={`relative ${sizeClasses} bg-gradient-to-br from-blue-900 to-indigo-950 text-white flex items-center justify-center font-black border-4 border-orange-500/40 shadow-xl overflow-hidden group select-none shrink-0`}>
        {photo ? (
          <img
            src={photo}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="font-black text-white/95">
            {name ? name.trim().charAt(0) : <User />}
          </span>
        )}

        {/* مؤشر جاري الضغط */}
        {isCompressing && (
          <div className="absolute inset-0 bg-blue-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-1 z-20">
            <Loader2 className="animate-spin text-orange-400" size={24} />
            <span className="text-[9px] font-black text-white">معالجة...</span>
          </div>
        )}

        {/* شارة رقم القميص */}
        {showBadges && number && (
          <div className="absolute -bottom-1 -right-1 bg-orange-500 text-white font-black text-[11px] px-2 py-0.5 rounded-lg border-2 border-blue-950 shadow-md z-10 font-mono">
            #{number}
          </div>
        )}

        {/* طبقة التحكم عند تحويم الماوس للإداريين فقط */}
        {!disabled && (
          <div className="absolute inset-0 bg-blue-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10 backdrop-blur-[2px]">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="رفع صورة من الجهاز"
              className="p-2 bg-white/20 hover:bg-orange-500 text-white rounded-xl transition-colors shadow-sm"
            >
              <Upload size={16} />
            </button>
            <button
              type="button"
              onClick={startCamera}
              title="التقاط بالكاميرا"
              className="p-2 bg-white/20 hover:bg-blue-600 text-white rounded-xl transition-colors shadow-sm"
            >
              <Camera size={16} />
            </button>
            {photo && (
              <button
                type="button"
                onClick={() => onPhotoChange(null)}
                title="حذف الصورة"
                className="p-2 bg-white/20 hover:bg-rose-600 text-white rounded-xl transition-colors shadow-sm"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* أزرار سريعة أسفل الصورة إن لم تكن مخفية وللإداريين فقط */}
      {!disabled && (
        <div className="flex items-center justify-center gap-2 mt-2.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-[10px] font-black bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors shadow-2xs"
          >
            <Upload size={12} className="text-blue-700" />
            <span>رفع صورة</span>
          </button>
          <button
            type="button"
            onClick={startCamera}
            className="flex items-center gap-1 text-[10px] font-black bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 px-2.5 py-1 rounded-lg transition-colors shadow-2xs"
          >
            <Camera size={12} className="text-orange-600" />
            <span>التقاط</span>
          </button>
          {photo && (
            <button
              type="button"
              onClick={() => onPhotoChange(null)}
              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
              title="حذف الصورة"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}

      {/* تنبيه حجم الصورة المضغوطة */}
      {savedBadge && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md z-30 animate-in fade-in">
          {savedBadge}
        </div>
      )}

      {/* نافذة التقاط الكاميرا المباشرة المودال */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Camera size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-blue-950">التقاط صورة شخصية بالكاميرا</h4>
                  <p className="text-[10px] text-slate-500 font-bold">{name} - {role || 'عضو نادي الكرامة'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* معاينة الكاميرا المباشرة */}
            <div className="relative aspect-square w-full max-w-[340px] mx-auto bg-slate-900 rounded-2xl overflow-hidden border-4 border-slate-200 shadow-inner flex items-center justify-center">
              {cameraError ? (
                <div className="p-4 text-center text-rose-500 text-xs font-bold space-y-2">
                  <p>{cameraError}</p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-[10px] font-black inline-flex items-center gap-1"
                  >
                    <RefreshCw size={12} /> إعادة المحاولة
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover -scale-x-100"
                  />
                  {/* إطار دليلي لموضع الوجه */}
                  <div className="absolute inset-4 border-2 border-dashed border-white/60 rounded-full pointer-events-none flex items-center justify-center">
                    <span className="text-[10px] font-black text-white/80 bg-black/40 px-2 py-0.5 rounded-full mt-36">
                      ضع الوجه داخل الإطار
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* أزرار التحكم بالالتقاط */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={stopCamera}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                disabled={Boolean(cameraError) || isCompressing}
                className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50"
              >
                {isCompressing ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                <span>التقاط واعتماد</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePhotoUploader;
