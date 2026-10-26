import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, Upload, Trash2, X, RefreshCw, Check, Loader2, 
  User, ZoomIn, ZoomOut, Move, RotateCcw, FlipHorizontal
} from 'lucide-react';
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
  // حالات الكاميرا
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraLiveZoom, setCameraLiveZoom] = useState<number>(1);

  // حالات محرر التكبير وتعديل التموضع (Crop & Scale Editor)
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [isCompressing, setIsCompressing] = useState(false);
  const [savedBadge, setSavedBadge] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // إيقاف بث الكاميرا
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
    setCameraError(null);
    setCameraLiveZoom(1);
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // تشغيل الكاميرا بالوضع المحدد (أمامية أو خلفية)
  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    if (disabled) return;
    
    // إيقاف أي بث سابق أولاً
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }

    setCameraError(null);
    setIsCameraOpen(true);
    setFacingMode(mode);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { exact: mode },
          width: { ideal: 960 },
          height: { ideal: 960 }
        },
        audio: false
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        // في حال عدم دعم exact في بعض المتصفحات، نستخدم الوضع البسيط
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
          audio: false
        });
      }

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('تعذر فتح الكاميرا. يرجى التحقق من أذونات الكاميرا أو استخدام خيار رفع صورة من الجهاز.');
    }
  };

  // تبديل الكاميرا بين الأمامية والخلفية
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    startCamera(nextMode);
  };

  // التقاط الصورة من الكاميرا ونقلها لمحرر التموضع
  const capturePhoto = () => {
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const vWidth = video.videoWidth || 640;
      const vHeight = video.videoHeight || 640;
      canvas.width = vWidth;
      canvas.height = vHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('فشل معالجة لقطة الكاميرا');

      // إذا كانت الكاميرا أمامية، نعكس اللقطة أفقياً كمرآة طبيعية
      if (facingMode === 'user') {
        ctx.translate(vWidth, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, vWidth, vHeight);

      const capturedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      
      // إيقاف الكاميرا وفتح محرر التموضع والتكبير
      stopCamera();
      openEditor(capturedDataUrl, cameraLiveZoom);
    } catch (err: any) {
      alert('خطأ أثناء التقاط الصورة: ' + err.message);
    }
  };

  // اختيار ملف صورة من الجهاز ونقله لمحرر التموضع
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        openEditor(result, 1);
      }
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // فتح محرر التموضع والتكبير
  const openEditor = (imgSrc: string, initialZoom: number = 1) => {
    setRawImageSrc(imgSrc);
    setZoomScale(initialZoom);
    setPanOffset({ x: 0, y: 0 });
    setIsEditorOpen(true);
  };

  // اعتماد وحفظ الصورة بعد معايرة التموضع والتكبير بدقة
  const saveEditedPhoto = async () => {
    if (!rawImageSrc || !imageRef.current) return;
    setIsCompressing(true);

    try {
      const img = imageRef.current;
      const exportSize = 480; // الحجم النهائي المربع للبروفايل
      const canvas = document.createElement('canvas');
      canvas.width = exportSize;
      canvas.height = exportSize;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('فشل تهيئة معالج الرسم');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // خلفية بيضاء
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, exportSize, exportSize);

      // حساب مقاييس وأبعاد الرسم بناءً على الـ zoom والـ pan
      const viewSize = 280; // حجم المعاينة في المودال
      const factor = exportSize / viewSize;

      // الأبعاد الطبيعية للصورة
      const naturalW = img.naturalWidth;
      const naturalH = img.naturalHeight;
      const baseRatio = Math.max(viewSize / naturalW, viewSize / naturalH);
      
      const renderW = naturalW * baseRatio * zoomScale;
      const renderH = naturalH * baseRatio * zoomScale;

      const centerX = (viewSize - renderW) / 2 + panOffset.x;
      const centerY = (viewSize - renderH) / 2 + panOffset.y;

      // رسم الصورة بعد تطبيق الإزاحة والتكبير بدقة
      ctx.drawImage(
        img,
        centerX * factor,
        centerY * factor,
        renderW * factor,
        renderH * factor
      );

      // ضغط الصورة إلى WebP أو JPEG بحجم خفيف جداً (~25-35 ك.ب) ونقاء فائق
      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error('فشل تصدير الصورة');
        const compressed = await compressProfilePhoto(blob, { targetSize: 480, quality: 0.80 });
        onPhotoChange(compressed.base64);
        setSavedBadge(`تم الحفظ بنقاء عالي (${compressed.compressedSizeKB} ك.ب)`);
        setTimeout(() => setSavedBadge(null), 4000);
        setIsEditorOpen(false);
        setRawImageSrc(null);
        setIsCompressing(false);
      }, 'image/jpeg', 0.90);
    } catch (err: any) {
      alert('خطأ أثناء حفظ ومعالجة الصورة: ' + err.message);
      setIsCompressing(false);
    }
  };

  // معالجة السحب بالماوس للتموضع
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // معالجة السحب باللمس على الموبايل
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - panOffset.x,
        y: e.touches[0].clientY - panOffset.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPanOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  // قياسات الحاوية
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

        {/* أزرار التحكم عند التحويم للإداريين فقط */}
        {!disabled && (
          <div className="absolute inset-0 bg-blue-950/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10 backdrop-blur-[2px]">
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
              onClick={() => startCamera(facingMode)}
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

      {/* أزرار سريعة أسفل الصورة للإداريين فقط */}
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
            onClick={() => startCamera(facingMode)}
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

      {/* ============================================================== */}
      {/* 1. نافذة الكاميرا المباشرة (مع خيار التبديل بين الأمامية والخلفية وتكبير البث) */}
      {/* ============================================================== */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-[2.5rem] max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            {/* هيدر الكاميرا */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Camera size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-blue-950">التقاط صورة شخصية رسمية</h4>
                  <p className="text-[10px] text-slate-500 font-bold">
                    {name} • {facingMode === 'user' ? 'الكاميرا الأمامية' : 'الكاميرا الخلفية'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* زر التبديل بين الكاميرا الأمامية والخلفية */}
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-xl text-xs font-black transition-colors border border-blue-200 shadow-2xs"
                  title="التبديل بين الكاميرا الأمامية والخلفية"
                >
                  <FlipHorizontal size={15} className="text-blue-700" />
                  <span>{facingMode === 'user' ? 'خلفية' : 'أمامية'}</span>
                </button>

                <button
                  type="button"
                  onClick={stopCamera}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* شاشة معاينة الكاميرا المباشرة مع تكبير مباشر */}
            <div className="relative aspect-square w-full max-w-[340px] mx-auto bg-slate-950 rounded-3xl overflow-hidden border-4 border-slate-200 shadow-inner flex items-center justify-center">
              {cameraError ? (
                <div className="p-4 text-center text-rose-500 text-xs font-bold space-y-3">
                  <p>{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => startCamera(facingMode)}
                    className="px-3.5 py-2 bg-rose-50 text-rose-700 rounded-xl text-xs font-black inline-flex items-center gap-1.5 border border-rose-200"
                  >
                    <RefreshCw size={14} /> إعادة المحاولة
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      transform: `${facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)'} scale(${cameraLiveZoom})`,
                      transformOrigin: 'center center',
                      transition: 'transform 0.1s ease-out'
                    }}
                    className="w-full h-full object-cover"
                  />
                  {/* إطار دليلي لموضع الرأس والوجه */}
                  <div className="absolute inset-5 border-2 border-dashed border-white/70 rounded-full pointer-events-none flex items-center justify-center shadow-xs">
                    <span className="text-[10px] font-black text-white/90 bg-black/50 backdrop-blur-xs px-2.5 py-1 rounded-full mt-40">
                      ضع الوجه داخل الإطار
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* شريط التحكم بتكبير الكاميرا المباشر (Scale/Zoom Slider) */}
            {!cameraError && (
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center gap-3">
                <ZoomOut size={16} className="text-slate-400 shrink-0" />
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.05"
                  value={cameraLiveZoom}
                  onChange={(e) => setCameraLiveZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-orange-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />
                <ZoomIn size={16} className="text-orange-500 shrink-0" />
                <span className="text-xs font-black font-mono text-blue-950 w-12 text-left">
                  {cameraLiveZoom.toFixed(1)}x
                </span>
              </div>
            )}

            {/* أزرار الإجراءات */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={stopCamera}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                disabled={Boolean(cameraError)}
                className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-black transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-95 disabled:opacity-50"
              >
                <Camera size={16} />
                <span>التقاط ومعايرة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. محرر التموضع والتكبير الاحترافي (Crop & Scale Position Editor) */}
      {/* ============================================================== */}
      {isEditorOpen && rawImageSrc && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-[2.5rem] max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            {/* هيدر المحرر */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-900 flex items-center justify-center">
                  <Move size={20} className="text-blue-700" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-blue-950">معايرة تموضع وتكبير الصورة</h4>
                  <p className="text-[10px] text-slate-500 font-bold">اسحب الصورة باللمس أو الماوس لوضع الوجه في المنتصف</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setIsEditorOpen(false); setRawImageSrc(null); }}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* مساحة المعاينة التفاعلية مع السحب والتكبير */}
            <div className="relative aspect-square w-[280px] h-[280px] mx-auto bg-slate-900 rounded-3xl overflow-hidden border-4 border-orange-500 shadow-xl flex items-center justify-center select-none cursor-grab active:cursor-grabbing">
              {/* الصورة مع تطبيق الـ pan والـ zoom */}
              <div
                className="w-full h-full relative"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <img
                  ref={imageRef}
                  src={rawImageSrc}
                  alt="Editor preview"
                  draggable={false}
                  style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.05s ease-out'
                  }}
                  className="w-full h-full object-cover pointer-events-none select-none max-w-none"
                />
              </div>

              {/* إطار دليلي شفاف يوضح حدود دائرة البروفايل */}
              <div className="absolute inset-2 border-2 border-dashed border-white/80 rounded-full pointer-events-none shadow-xs" />

              {/* شارة إرشادية */}
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[9px] font-black px-2 py-0.5 rounded-md pointer-events-none flex items-center gap-1">
                <Move size={10} />
                <span>اسحب للتحريك</span>
              </div>
            </div>

            {/* شريط التحكم بالتكبير والتصغير (Scale Slider) */}
            <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between text-xs font-black text-slate-700">
                <span className="flex items-center gap-1.5">
                  <ZoomIn size={14} className="text-orange-600" />
                  <span>مستوى التكبير (Scale)</span>
                </span>
                <span className="font-mono text-blue-950 font-black">{zoomScale.toFixed(2)}x</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setZoomScale(prev => Math.max(1, prev - 0.1))}
                  className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                  title="تصغير"
                >
                  <ZoomOut size={16} />
                </button>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoomScale}
                  onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                  className="flex-1 accent-orange-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setZoomScale(prev => Math.min(3, prev + 0.1))}
                  className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                  title="تكبير"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => { setZoomScale(1); setPanOffset({ x: 0, y: 0 }); }}
                  className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors"
                  title="إعادة ضبط الموضع"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>

            {/* أزرار الحفظ والإلغاء */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setIsEditorOpen(false); setRawImageSrc(null); }}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={saveEditedPhoto}
                disabled={isCompressing}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 disabled:opacity-50"
              >
                {isCompressing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                <span>اعتماد وحفظ الصورة</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePhotoUploader;
