
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Person, WarehouseItem } from '../types';
import { QrCode, Camera, Scan, Download, X, User, Package, ShieldCheck, RefreshCw } from 'lucide-react';
// @ts-ignore
import jsQR from 'https://esm.sh/jsqr@1.4.0';

interface QRManagerProps {
  state: AppState;
  setState: (updater: (prev: AppState) => AppState) => void;
}

const QRManager: React.FC<QRManagerProps> = ({ state, setState }) => {
  const [mode, setMode] = useState<'generate' | 'scan'>('generate');
  const [selectedType, setSelectedType] = useState<'players' | 'items'>('players');
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const players = state.people.filter(p => p.role === 'لاعب' && (state.globalCategoryFilter === 'الكل' || p.category === state.globalCategoryFilter));
  const warehouse = state.warehouse.filter(i => state.globalCategoryFilter === 'الكل' || i.category === state.globalCategoryFilter || i.category === 'المخزن العام');

  // استخدام خدمة QR.io أو Google Charts الموثوقة مع معطيات واضحة
  const getQRUrl = (id: string) => `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(id)}&bgcolor=ffffff&color=001f3f`;

  const startScanner = async () => {
    setCameraActive(true);
    setScannedData(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.play();
        requestAnimationFrame(tick);
      }
    } catch (err) {
      alert("تعذر الوصول للكاميرا: " + err);
      setCameraActive(false);
    }
  };

  const stopScanner = () => {
    setCameraActive(false);
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const tick = () => {
    if (videoRef.current?.readyState === videoRef.current?.HAVE_ENOUGH_DATA && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx && videoRef.current) {
        canvas.height = videoRef.current.videoHeight;
        canvas.width = videoRef.current.videoWidth;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code) {
          setScannedData(code.data);
          stopScanner();
          return;
        }
      }
    }
    if (cameraActive) requestAnimationFrame(tick);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex p-1.5 bg-slate-900/80 backdrop-blur border border-white/5 rounded-2xl w-fit mx-auto">
         <button onClick={() => { setMode('generate'); stopScanner(); }} className={`px-10 py-3 rounded-xl font-bold text-xs transition-all ${mode === 'generate' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}>
            <QrCode size={18} className="inline ml-2"/> توليد الرموز
         </button>
         <button onClick={() => { setMode('scan'); }} className={`px-10 py-3 rounded-xl font-bold text-xs transition-all ${mode === 'scan' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}>
            <Scan size={18} className="inline ml-2"/> مسح ضوئي سريع
         </button>
      </div>

      {mode === 'generate' ? (
        <div className="space-y-8">
           <div className="flex gap-4 justify-center">
              <button onClick={() => setSelectedType('players')} className={`px-6 py-2.5 rounded-xl border-2 font-bold text-[10px] uppercase transition-all ${selectedType === 'players' ? 'border-orange-500 bg-orange-500/10 text-white' : 'border-white/5 text-slate-500'}`}>بطاقات اللاعبين</button>
              <button onClick={() => setSelectedType('items')} className={`px-6 py-2.5 rounded-xl border-2 font-bold text-[10px] uppercase transition-all ${selectedType === 'items' ? 'border-orange-500 bg-orange-500/10 text-white' : 'border-white/5 text-slate-500'}`}>ملصقات المستودع</button>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {(selectedType === 'players' ? players : warehouse).map(item => (
                <div key={item.id} className="modern-card p-6 flex flex-col items-center gap-6 group hover:border-orange-500/30 transition-all">
                   <div className="bg-white p-3 rounded-2xl shadow-xl border-4 border-slate-800">
                      <img 
                        src={getQRUrl(item.id)} 
                        alt="QR Code" 
                        className="w-40 h-40 object-contain"
                        loading="lazy"
                        onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                        style={{ opacity: 0.8, transition: 'opacity 0.3s' }}
                      />
                   </div>
                   <div className="text-center w-full">
                      <p className="text-white font-bold text-sm truncate">{item.name}</p>
                      <p className="text-orange-500 font-bold text-[9px] uppercase tracking-widest mt-1">
                        {selectedType === 'players' ? `ID: ${(item as Person).number || '---'}` : `QTY: ${(item as WarehouseItem).quantity}`}
                      </p>
                   </div>
                   <a 
                    href={getQRUrl(item.id)} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full bg-white/5 hover:bg-orange-500 text-slate-400 hover:text-white py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 border border-white/5"
                   >
                      <Download size={14}/> <span className="text-[10px] font-bold">تحميل الرمز</span>
                   </a>
                </div>
              ))}
              {(selectedType === 'players' ? players : warehouse).length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-600 font-medium italic border-2 border-dashed border-white/5 rounded-[3rem]">
                   لا توجد بيانات متاحة لهذا القسم حالياً
                </div>
              )}
           </div>
        </div>
      ) : (
        <div className="max-w-xl mx-auto space-y-8">
           <div className="modern-card p-10 flex flex-col items-center border-white/10">
              {cameraActive ? (
                <div className="relative w-full aspect-square bg-black rounded-[2rem] overflow-hidden border-4 border-orange-500/30">
                   <video ref={videoRef} className="w-full h-full object-cover" />
                   <canvas ref={canvasRef} className="hidden" />
                   <div className="absolute inset-10 border-2 border-orange-500 animate-pulse rounded-2xl opacity-50"></div>
                </div>
              ) : (
                <button onClick={startScanner} className="w-full aspect-square flex flex-col items-center justify-center gap-6 border-4 border-dashed border-white/5 rounded-[3rem] hover:bg-white/5 transition-all group">
                   <div className="p-8 bg-orange-500/10 rounded-full group-hover:scale-110 transition-transform">
                      <Camera size={64} className="text-orange-500" />
                   </div>
                   <span className="font-bold text-lg text-slate-400">تشغيل ماسح الرموز الكاميـرا</span>
                </button>
              )}
              {cameraActive && (
                <button onClick={stopScanner} className="mt-8 bg-red-500/10 text-red-500 px-10 py-3.5 rounded-xl font-bold border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">إيقاف الكاميرا</button>
              )}
           </div>

           {scannedData && (
             <div className="modern-card p-8 border-emerald-500/30 bg-emerald-500/5 animate-in slide-in-from-bottom-6">
                <div className="flex items-center gap-4 mb-8">
                   <div className="bg-emerald-500 p-3 rounded-2xl text-white shadow-lg shadow-emerald-500/20"><ShieldCheck size={28}/></div>
                   <div>
                      <h3 className="text-xl font-bold text-white tracking-tight">تم التعرف على الرمز</h3>
                      <p className="text-xs text-emerald-500/60 font-bold">جاري عرض البيانات المربوطة...</p>
                   </div>
                </div>
                
                {(() => {
                  const p = state.people.find(x => x.id === scannedData);
                  const i = state.warehouse.find(x => x.id === scannedData);
                  if (p) return (
                    <div className="flex items-center gap-6 p-6 bg-slate-900/60 rounded-3xl border border-white/5">
                       <div className="w-20 h-20 bg-orange-500 text-white rounded-2xl flex items-center justify-center font-bold text-4xl shadow-xl border-4 border-white/10">#{p.number}</div>
                       <div>
                          <p className="text-2xl font-bold text-white tracking-tight">{p.name}</p>
                          <p className="text-orange-500 font-bold text-sm mt-1">{p.role} • {p.category}</p>
                       </div>
                    </div>
                  );
                  if (i) return (
                    <div className="flex items-center gap-6 p-6 bg-slate-900/60 rounded-3xl border border-white/5">
                       <div className="w-20 h-20 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-xl border-4 border-white/10"><Package size={40} /></div>
                       <div>
                          <p className="text-2xl font-bold text-white tracking-tight">{i.name}</p>
                          <p className="text-blue-500 font-bold text-sm mt-1">الكمية: {i.quantity} {i.unit} • {i.category}</p>
                       </div>
                    </div>
                  );
                  return (
                    <div className="p-6 bg-red-500/10 rounded-3xl border border-red-500/20 text-center">
                       <p className="font-bold text-red-500 text-sm">عذراً! الرمز الممسوح غير مسجل في قاعدة البيانات المركزية.</p>
                       <p className="text-[10px] text-red-500/50 mt-2">ID: {scannedData}</p>
                    </div>
                  );
                })()}
                
                <button onClick={() => setScannedData(null)} className="mt-8 w-full bg-white/5 border border-white/5 hover:bg-orange-500 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-xl">
                   <RefreshCw size={20}/> مسح رمز جديد
                </button>
             </div>
           )}
        </div>
      )}
    </div>
  );
};

export default QRManager;
