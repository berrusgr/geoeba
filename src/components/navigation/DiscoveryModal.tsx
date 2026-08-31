'use client';

import React from 'react';
import { Topic, Activity } from '@/types/curriculum';
import {
  X,
  FileText,
  Play,
  Percent,
  Shapes,
  Variable,
  Ruler,
  Sigma,
  Divide,
  Sparkles,
  Box,
} from 'lucide-react';

interface DiscoveryModalProps {
  topic: Topic | null;
  onClose: () => void;
  onLaunchActivity: (activity: Activity) => void;
}

export function DiscoveryModal({ topic, onClose, onLaunchActivity }: DiscoveryModalProps) {
  React.useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }
    };
  }, []);

  if (!topic) return null;

  const handleClose = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-card/95 border-2 border-border/90 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* 1. ÜST PASTEL BAŞLIK ŞERİDİ (Tıpkı Referans Görsel 1 Gibi) */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-200/80 via-rose-100 to-sky-100 dark:from-slate-800 dark:via-slate-850 dark:to-slate-900 border-b border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                ALT KONULAR
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {topic.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-black/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. ORTA BÖLÜM: AÇIKLAMA BALONU VE SARI SAYAÇ KUTUSU */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Beyaz Konuşma Balonu */}
            <div className="flex-1 p-4 rounded-2xl bg-muted/40 border border-border/80 text-xs sm:text-sm font-semibold text-foreground">
              <span>{topic.description || 'Prizmalar kurun ve boyutlarını çarpın.'}</span>
            </div>

            {/* Sağ Sarı Sayaç Kutusu (İLGİLİ GÖREVLER) */}
            <div className="px-6 py-3 rounded-2xl bg-amber-300 dark:bg-amber-400 text-slate-950 font-black text-center shrink-0 shadow-xs">
              <div className="text-[9px] uppercase tracking-wider text-slate-800 font-extrabold">
                İLGİLİ GÖREVLER
              </div>
              <div className="text-3xl font-black">{topic.activities.length}</div>
            </div>
          </div>

          {/* 3. DOSYA / KLASÖR STİLLİ GÖREV KARTLARI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {topic.activities.map((activity, idx) => {
              const folderColor = activity.folderColor || (idx === 0 ? '#ef4444' : idx === 1 ? '#eab308' : idx === 2 ? '#3b82f6' : '#10b981');

              return (
                <div
                  key={activity.id}
                  className="group relative rounded-3xl p-5 text-white flex flex-col space-y-4 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                  style={{ backgroundColor: folderColor }}
                >
                  {/* Klasör Kulakçığı */}
                  <div
                    className="absolute -top-3 left-6 px-4 py-1 rounded-t-xl font-bold text-[10px] uppercase tracking-wider shadow-xs"
                    style={{ backgroundColor: folderColor }}
                  >
                    <span className="opacity-90">GÖREV #{idx + 1}</span>
                  </div>

                  {/* Beyaz Görsel Çizim / Önizleme Kutusu (Birebir Referans Görsel 1 Çizimleri) */}
                  <div className="w-full h-36 rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-3 flex items-center justify-center overflow-hidden relative shadow-inner border border-black/10">
                    {/* 1. Prizma Hacmi 3D Tel Çerçeve Çizimi */}
                    {activity.previewType === 'prism_volume' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <svg viewBox="0 0 160 90" className="w-36 h-24">
                          {/* 3D Prizma Çizimi */}
                          <polygon points="30,40 100,40 130,20 60,20" fill="#fef3c7" stroke="#0284c7" strokeWidth="2" />
                          <polygon points="30,40 100,40 100,75 30,75" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />
                          <polygon points="100,40 130,20 130,55 100,75" fill="#bae6fd" stroke="#0284c7" strokeWidth="2" />
                          <text x="65" y="16" fontSize="9" fontWeight="bold" fill="#0369a1">4</text>
                          <text x="118" y="48" fontSize="9" fontWeight="bold" fill="#0369a1">3</text>
                          <text x="20" y="60" fontSize="9" fontWeight="bold" fill="#0369a1">5</text>
                        </svg>
                        <div className="font-mono text-[9px] font-bold text-slate-700 dark:text-slate-300">
                          Prizma Hacmi: V = a × b × c
                        </div>
                      </div>
                    )}

                    {/* 2. Silindir Modeli Çizimi */}
                    {activity.previewType === 'cylinder_model' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <svg viewBox="0 0 160 90" className="w-36 h-24">
                          <ellipse cx="80" cy="25" rx="40" ry="12" fill="#ecfdf5" stroke="#059669" strokeWidth="2" />
                          <ellipse cx="80" cy="65" rx="40" ry="12" fill="#d1fae5" stroke="#059669" strokeWidth="2" />
                          <line x1="40" y1="25" x2="40" y2="65" stroke="#059669" strokeWidth="2" />
                          <line x1="120" y1="25" x2="120" y2="65" stroke="#059669" strokeWidth="2" />
                          <text x="80" y="27" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#059669">r</text>
                          <text x="126" y="48" fontSize="9" fontWeight="bold" fill="#059669">h</text>
                        </svg>
                        <div className="font-mono text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                          Silindir: V = π × r² × h
                        </div>
                      </div>
                    )}

                    {/* 3. Akvaryum Hacmi / Sıvı Modeli */}
                    {activity.previewType === 'aquarium_fluid' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <svg viewBox="0 0 160 90" className="w-36 h-24">
                          <rect x="25" y="20" width="110" height="50" rx="6" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />
                          <rect x="27" y="38" width="106" height="30" rx="4" fill="#38bdf8" fillOpacity="0.6" stroke="#0284c7" strokeWidth="1" strokeDasharray="3,2" />
                          <text x="80" y="32" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#0369a1">6 × 4 × 3</text>
                          <text x="80" y="58" textAnchor="middle" fontSize="9" fontWeight="black" fill="#0369a1">72 birim küp</text>
                        </svg>
                        <div className="font-mono text-[9px] font-bold text-sky-700 dark:text-sky-300">
                          Kapasite = 72 birim küp
                        </div>
                      </div>
                    )}

                    {/* 4. Hacim Yığını / Birim Küpler */}
                    {activity.previewType === 'unit_cubes' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <svg viewBox="0 0 160 90" className="w-36 h-24">
                          {/* Katmanlı Küp Yığını */}
                          <polygon points="40,35 70,35 85,22 55,22" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
                          <polygon points="40,35 70,35 70,60 40,60" fill="#fef9c3" stroke="#ca8a04" strokeWidth="1.5" />
                          <polygon points="70,35 85,22 85,47 70,60" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
                          {/* İkinci Blok */}
                          <polygon points="75,45 105,45 120,32 90,32" fill="#bbf7d0" stroke="#16a34a" strokeWidth="1.5" />
                          <polygon points="75,45 105,45 105,70 75,70" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5" />
                          <polygon points="105,45 120,32 120,57 105,70" fill="#bbf7d0" stroke="#16a34a" strokeWidth="1.5" />
                          <text x="80" y="80" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#16a34a">V = l × w × h</text>
                        </svg>
                        <div className="font-mono text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                          Katman Katman Sayım
                        </div>
                      </div>
                    )}

                    {/* Pizza Kesir Çizimi Önizlemesi */}
                    {activity.previewType === 'pizza_fractions' && (
                      <div className="flex items-center justify-center gap-6 w-full">
                        <div className="relative w-20 h-20">
                          <svg viewBox="0 0 100 100" className="w-full h-full">
                            <circle cx="50" cy="50" r="45" fill="#ffe4e6" stroke="#e11d48" strokeWidth="4" />
                            <path d="M 50 50 L 50 5 A 45 45 0 0 1 89 27.5 Z" fill="#f43f5e" />
                            <path d="M 50 50 L 89 27.5 A 45 45 0 0 1 89 72.5 Z" fill="#f43f5e" />
                            <line x1="50" y1="5" x2="50" y2="95" stroke="#e11d48" strokeWidth="1.5" />
                            <line x1="11" y1="27.5" x2="89" y2="72.5" stroke="#e11d48" strokeWidth="1.5" />
                            <line x1="11" y1="72.5" x2="89" y2="27.5" stroke="#e11d48" strokeWidth="1.5" />
                          </svg>
                          <div className="text-center font-mono text-[10px] font-black text-rose-600">2/6</div>
                        </div>
                        <div className="relative w-20 h-20">
                          <svg viewBox="0 0 100 100" className="w-full h-full">
                            <circle cx="50" cy="50" r="45" fill="#e0e7ff" stroke="#3b82f6" strokeWidth="4" />
                            <path d="M 50 50 L 50 5 A 45 45 0 0 1 50 95 Z" fill="#3b82f6" />
                            <line x1="50" y1="5" x2="50" y2="95" stroke="#3b82f6" strokeWidth="2" />
                          </svg>
                          <div className="text-center font-mono text-[10px] font-black text-blue-600">1/2</div>
                        </div>
                      </div>
                    )}

                    {/* 5. Sayı Doğrusu Önizlemesi */}
                    {activity.previewType === 'number_line' && (
                      <div className="w-full flex flex-col items-center justify-center space-y-1">
                        <svg viewBox="0 0 240 50" className="w-full h-12">
                          <line x1="20" y1="25" x2="220" y2="25" stroke="#334155" strokeWidth="2.5" />
                          <circle cx="60" cy="25" r="4.5" fill="#f43f5e" />
                          <text x="60" y="14" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#f43f5e">1/4</text>
                          <circle cx="100" cy="25" r="4.5" fill="#10b981" />
                          <text x="100" y="14" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#10b981">0.4</text>
                          <circle cx="170" cy="25" r="4.5" fill="#3b82f6" />
                          <text x="170" y="14" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#3b82f6">2/3</text>
                          <line x1="20" y1="20" x2="20" y2="30" stroke="#334155" strokeWidth="1.5" />
                          <text x="20" y="40" textAnchor="middle" fontSize="8" fill="#64748b">0</text>
                          <line x1="220" y1="20" x2="220" y2="30" stroke="#334155" strokeWidth="1.5" />
                          <text x="220" y="40" textAnchor="middle" fontSize="8" fill="#64748b">1</text>
                        </svg>
                        <div className="font-mono text-[9px] font-bold text-slate-700 dark:text-slate-300">
                          Sayı Doğrusu Sıralama
                        </div>
                      </div>
                    )}

                    {/* 6. Kefeli Terazi / Denge Modeli */}
                    {activity.previewType === 'balance_scale' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <svg viewBox="0 0 160 80" className="w-36 h-20">
                          <line x1="80" y1="20" x2="80" y2="65" stroke="#334155" strokeWidth="3" />
                          <polygon points="65,65 95,65 80,50" fill="#64748b" />
                          <line x1="25" y1="30" x2="135" y2="30" stroke="#0284c7" strokeWidth="3" />
                          <circle cx="80" cy="30" r="4" fill="#0369a1" />
                          {/* Sol Kefe */}
                          <line x1="25" y1="30" x2="15" y2="50" stroke="#94a3b8" strokeWidth="1.5" />
                          <line x1="25" y1="30" x2="35" y2="50" stroke="#94a3b8" strokeWidth="1.5" />
                          <ellipse cx="25" cy="50" rx="16" ry="5" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1.5" />
                          <text x="25" y="46" textAnchor="middle" fontSize="8" fontWeight="black" fill="#0284c7">2x + 4</text>
                          {/* Sağ Kefe */}
                          <line x1="135" y1="30" x2="125" y2="50" stroke="#94a3b8" strokeWidth="1.5" />
                          <line x1="135" y1="30" x2="145" y2="50" stroke="#94a3b8" strokeWidth="1.5" />
                          <ellipse cx="135" cy="50" rx="16" ry="5" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
                          <text x="135" y="46" textAnchor="middle" fontSize="8" fontWeight="black" fill="#d97706">10</text>
                        </svg>
                        <div className="font-mono text-[9px] font-bold text-amber-700 dark:text-amber-300">
                          Denge: 2x + 4 = 10 ⟹ x = 3
                        </div>
                      </div>
                    )}

                    {/* 7. Koordinat Düzlemi / Hedef Bölge */}
                    {activity.previewType === 'coordinate_grid' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <svg viewBox="0 0 140 80" className="w-32 h-18">
                          <line x1="10" y1="40" x2="130" y2="40" stroke="#3b82f6" strokeWidth="2" />
                          <line x1="70" y1="10" x2="70" y2="70" stroke="#06b6d4" strokeWidth="2" />
                          <circle cx="100" cy="20" r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" className="animate-ping" />
                          <circle cx="100" cy="20" r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                          <text x="106" y="24" fontSize="8" fontWeight="black" fill="#ef4444">(3; 2)</text>
                          <text x="105" y="65" fontSize="7" fontWeight="bold" fill="#059669">I. Bölge</text>
                          <text x="25" y="25" fontSize="7" fontWeight="bold" fill="#d97706">II. Bölge</text>
                        </svg>
                        <div className="font-mono text-[9px] font-bold text-blue-700 dark:text-blue-300">
                          Kartezyen Koordinat Sistemi
                        </div>
                      </div>
                    )}

                    {/* 8. Pisagor Teoremi Dik Üçgen */}
                    {activity.previewType === 'triangle_pythagoras' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <svg viewBox="0 0 140 80" className="w-32 h-18">
                          <polygon points="30,65 110,65 110,20" fill="#ecfdf5" stroke="#059669" strokeWidth="2" />
                          <rect x="100" y="55" width="10" height="10" fill="none" stroke="#059669" strokeWidth="1.5" />
                          <circle cx="105" cy="60" r="1.5" fill="#059669" />
                          <text x="70" y="75" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#059669">a = 3</text>
                          <text x="120" y="45" fontSize="8" fontWeight="bold" fill="#059669">b = 4</text>
                          <text x="60" y="38" fontSize="8" fontWeight="black" fill="#047857">c = 5</text>
                        </svg>
                        <div className="font-mono text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                          Pisagor: a² + b² = c²
                        </div>
                      </div>
                    )}

                    {/* 9. Çember ve Pergel */}
                    {activity.previewType === 'circle_radius' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <svg viewBox="0 0 140 80" className="w-32 h-18">
                          <circle cx="70" cy="40" r="28" fill="#fdf2f8" stroke="#db2777" strokeWidth="2" />
                          <line x1="70" y1="40" x2="98" y2="40" stroke="#db2777" strokeWidth="2" strokeDasharray="2,2" />
                          <circle cx="70" cy="40" r="3" fill="#be185d" />
                          <text x="82" y="36" fontSize="8" fontWeight="black" fill="#be185d">r</text>
                          <text x="70" y="74" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#9d174d">Çevre = 2·π·r</text>
                        </svg>
                        <div className="font-mono text-[9px] font-bold text-pink-700 dark:text-pink-300">
                          Çember & Yarıçap İnşası
                        </div>
                      </div>
                    )}

                    {/* 10. Doğru Eğimi ve Grafiği */}
                    {activity.previewType === 'slope_line' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <svg viewBox="0 0 140 80" className="w-32 h-18">
                          <line x1="20" y1="65" x2="120" y2="15" stroke="#4f46e5" strokeWidth="2.5" />
                          <polygon points="50,50 90,50 90,30" fill="#ede9fe" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="2,2" />
                          <text x="70" y="60" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#4f46e5">Δx = 2</text>
                          <text x="102" y="42" fontSize="7" fontWeight="bold" fill="#4f46e5">Δy = 1</text>
                        </svg>
                        <div className="font-mono text-[9px] font-bold text-indigo-700 dark:text-indigo-300">
                          Eğim: m = Δy / Δx = 1/2
                        </div>
                      </div>
                    )}

                    {/* 11. Açı Ölçer */}
                    {activity.previewType === 'angle_arc' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <svg viewBox="0 0 140 80" className="w-32 h-18">
                          <line x1="30" y1="60" x2="110" y2="60" stroke="#d97706" strokeWidth="2" />
                          <line x1="30" y1="60" x2="90" y2="20" stroke="#d97706" strokeWidth="2" />
                          <path d="M 60 60 A 30 30 0 0 0 54 44" fill="none" stroke="#f59e0b" strokeWidth="2" />
                          <text x="68" y="50" fontSize="9" fontWeight="black" fill="#b45309">60°</text>
                        </svg>
                        <div className="font-mono text-[9px] font-bold text-amber-700 dark:text-amber-300">
                          Açı Ölçümü & Sınıflandırma
                        </div>
                      </div>
                    )}

                    {/* 12. Çokgen & Alan Modeli */}
                    {activity.previewType === 'polygon_shapes' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <svg viewBox="0 0 140 80" className="w-32 h-18">
                          <polygon points="30,60 100,60 120,25 50,25" fill="#ccfbf1" stroke="#0f766e" strokeWidth="2" />
                          <line x1="50" y1="25" x2="50" y2="60" stroke="#0f766e" strokeWidth="1.5" strokeDasharray="2,2" />
                          <text x="44" y="45" fontSize="8" fontWeight="bold" fill="#0f766e">h</text>
                          <text x="65" y="70" fontSize="8" fontWeight="bold" fill="#0f766e">taban (a)</text>
                        </svg>
                        <div className="font-mono text-[9px] font-bold text-teal-700 dark:text-teal-300">
                          Paralelkenar Alanı: A = a × h
                        </div>
                      </div>
                    )}

                    {/* 13. Olasılık Çarkı */}
                    {activity.previewType === 'probability_spinner' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <svg viewBox="0 0 140 80" className="w-32 h-18">
                          <circle cx="70" cy="40" r="28" fill="#fef3c7" stroke="#b45309" strokeWidth="2" />
                          <path d="M 70 40 L 70 12 A 28 28 0 0 1 98 40 Z" fill="#ef4444" />
                          <path d="M 70 40 L 98 40 A 28 28 0 0 1 70 68 Z" fill="#3b82f6" />
                          <path d="M 70 40 L 70 68 A 28 28 0 0 1 42 40 Z" fill="#10b981" />
                          <line x1="70" y1="40" x2="86" y2="24" stroke="#1e293b" strokeWidth="2.5" markerEnd="url(#arrow)" />
                        </svg>
                        <div className="font-mono text-[9px] font-bold text-amber-700 dark:text-amber-300">
                          Olasılık: P(Kırmızı) = 1/4
                        </div>
                      </div>
                    )}

                    {/* 14. Veri & Sütun Grafiği */}
                    {activity.previewType === 'data_barchart' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <svg viewBox="0 0 140 80" className="w-32 h-18">
                          <line x1="20" y1="65" x2="120" y2="65" stroke="#475569" strokeWidth="1.5" />
                          <rect x="30" y="35" width="16" height="30" rx="3" fill="#3b82f6" />
                          <rect x="55" y="20" width="16" height="45" rx="3" fill="#10b981" />
                          <rect x="80" y="45" width="16" height="20" rx="3" fill="#f59e0b" />
                          <rect x="105" y="28" width="16" height="37" rx="3" fill="#ec4899" />
                        </svg>
                        <div className="font-mono text-[9px] font-bold text-sky-700 dark:text-sky-300">
                          Sütun Grafiği & Dağılım
                        </div>
                      </div>
                    )}

                    {/* 15. Asal Çarpan Ağacı */}
                    {activity.previewType === 'prime_factor_tree' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <svg viewBox="0 0 140 80" className="w-32 h-18">
                          <circle cx="70" cy="18" r="9" fill="#e0e7ff" stroke="#4f46e5" strokeWidth="1.5" />
                          <text x="70" y="22" textAnchor="middle" fontSize="8" fontWeight="black" fill="#4f46e5">24</text>
                          <line x1="64" y1="26" x2="45" y2="40" stroke="#94a3b8" strokeWidth="1.5" />
                          <line x1="76" y1="26" x2="95" y2="40" stroke="#94a3b8" strokeWidth="1.5" />
                          <circle cx="45" cy="45" r="8" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
                          <text x="45" y="49" textAnchor="middle" fontSize="8" fontWeight="black" fill="#d97706">2</text>
                          <circle cx="95" cy="45" r="8" fill="#ecfdf5" stroke="#059669" strokeWidth="1.5" />
                          <text x="95" y="49" textAnchor="middle" fontSize="8" fontWeight="black" fill="#059669">12</text>
                        </svg>
                        <div className="font-mono text-[9px] font-bold text-indigo-700 dark:text-indigo-300">
                          24 = 2³ × 3
                        </div>
                      </div>
                    )}

                    {/* 16. Oran ve Orantı */}
                    {activity.previewType === 'ratio_proportion' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <svg viewBox="0 0 140 80" className="w-32 h-18">
                          <rect x="25" y="25" width="35" height="30" rx="4" fill="#fee2e2" stroke="#dc2626" strokeWidth="1.5" />
                          <text x="42" y="44" textAnchor="middle" fontSize="10" fontWeight="black" fill="#dc2626">2/3</text>
                          <text x="70" y="44" textAnchor="middle" fontSize="12" fontWeight="black" fill="#475569">=</text>
                          <rect x="80" y="25" width="35" height="30" rx="4" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.5" />
                          <text x="97" y="44" textAnchor="middle" fontSize="10" fontWeight="black" fill="#2563eb">6/9</text>
                        </svg>
                        <div className="font-mono text-[9px] font-bold text-red-700 dark:text-red-300">
                          İçler Dışlar Çarpımı: 2·9 = 3·6
                        </div>
                      </div>
                    )}

                    {/* 17. Simetri & Dönüşüm Geometrisi */}
                    {activity.previewType === 'transformation_symmetry' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <svg viewBox="0 0 140 80" className="w-32 h-18">
                          <line x1="70" y1="10" x2="70" y2="70" stroke="#e11d48" strokeWidth="2" strokeDasharray="3,3" />
                          <polygon points="35,30 55,50 35,50" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.5" />
                          <polygon points="105,30 85,50 105,50" fill="#fce7f3" stroke="#db2777" strokeWidth="1.5" />
                          <text x="70" y="77" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#e11d48">Ayna Ekseni</text>
                        </svg>
                        <div className="font-mono text-[9px] font-bold text-pink-700 dark:text-pink-300">
                          Yansıma & Öteleme Simetrisi
                        </div>
                      </div>
                    )}

                    {/* 18. Kareköklü Sayılar & Alan */}
                    {activity.previewType === 'square_roots' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <svg viewBox="0 0 140 80" className="w-32 h-18">
                          <rect x="45" y="15" width="50" height="50" rx="4" fill="#fef3c7" stroke="#d97706" strokeWidth="2" />
                          <text x="70" y="44" textAnchor="middle" fontSize="10" fontWeight="black" fill="#b45309">Alan = 49</text>
                          <text x="70" y="73" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#b45309">√49 = 7</text>
                        </svg>
                        <div className="font-mono text-[9px] font-bold text-amber-700 dark:text-amber-300">
                          Kare Alanı & Karekök İlişkisi
                        </div>
                      </div>
                    )}

                    {/* 19. Cebir Karoları & Özdeşlikler */}
                    {activity.previewType === 'algebraic_tiles' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <svg viewBox="0 0 140 80" className="w-32 h-18">
                          <rect x="35" y="15" width="35" height="35" fill="#93c5fd" stroke="#1d4ed8" strokeWidth="1.5" />
                          <text x="52" y="36" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1e3a8a">x²</text>
                          <rect x="70" y="15" width="20" height="35" fill="#86efac" stroke="#15803d" strokeWidth="1.5" />
                          <text x="80" y="36" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#14532d">2x</text>
                          <rect x="35" y="50" width="35" height="15" fill="#86efac" stroke="#15803d" strokeWidth="1.5" />
                          <text x="52" y="62" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#14532d">3x</text>
                          <rect x="70" y="50" width="20" height="15" fill="#fde047" stroke="#a16207" strokeWidth="1.5" />
                          <text x="80" y="62" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#713f12">6</text>
                        </svg>
                        <div className="font-mono text-[9px] font-bold text-blue-700 dark:text-blue-300">
                          (x + 2)(x + 3) = x² + 5x + 6
                        </div>
                      </div>
                    )}

                    {/* 19b. Eratosthenes Kalburu (1-100 Asal Sayılar) */}
                    {activity.previewType === 'eratosthenes_sieve' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <div className="grid grid-cols-5 gap-1 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                          <span className="w-5 h-5 flex items-center justify-center rounded bg-amber-400 text-amber-950 font-black text-[9px] shadow-xs">2</span>
                          <span className="w-5 h-5 flex items-center justify-center rounded bg-amber-400 text-amber-950 font-black text-[9px] shadow-xs">3</span>
                          <span className="w-5 h-5 flex items-center justify-center rounded bg-slate-200 dark:bg-slate-700 text-slate-400 line-through text-[8px]">4</span>
                          <span className="w-5 h-5 flex items-center justify-center rounded bg-amber-400 text-amber-950 font-black text-[9px] shadow-xs">5</span>
                          <span className="w-5 h-5 flex items-center justify-center rounded bg-slate-200 dark:bg-slate-700 text-slate-400 line-through text-[8px]">6</span>
                          <span className="w-5 h-5 flex items-center justify-center rounded bg-amber-400 text-amber-950 font-black text-[9px] shadow-xs">7</span>
                          <span className="w-5 h-5 flex items-center justify-center rounded bg-slate-200 dark:bg-slate-700 text-slate-400 line-through text-[8px]">8</span>
                          <span className="w-5 h-5 flex items-center justify-center rounded bg-slate-200 dark:bg-slate-700 text-slate-400 line-through text-[8px]">9</span>
                          <span className="w-5 h-5 flex items-center justify-center rounded bg-slate-200 dark:bg-slate-700 text-slate-400 line-through text-[8px]">10</span>
                          <span className="w-5 h-5 flex items-center justify-center rounded bg-amber-400 text-amber-950 font-black text-[9px] shadow-xs">11</span>
                        </div>
                        <div className="font-mono text-[9px] font-bold text-rose-600 dark:text-rose-400 mt-1">
                          1-100 Asal Sayı Kalburu (25 Asal)
                        </div>
                      </div>
                    )}

                    {/* 19c. Bölünebilme Kuralları (2, 3, 4, 5, 6, 9, 10) */}
                    {activity.previewType === 'divisibility_rules' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <div className="flex items-center gap-1.5 p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-500/20">
                          <span className="px-2 py-1 rounded bg-white dark:bg-slate-800 font-mono font-black text-xs text-foreground shadow-xs border">
                            24<span className="text-emerald-600 underline">0</span>
                          </span>
                          <div className="flex flex-col gap-0.5 text-[8px] font-black text-emerald-700 dark:text-emerald-300">
                            <span>✓ 2, 5, 10'a tam bölünür</span>
                            <span>✓ 2+4+0=6 (3'e bölünür)</span>
                          </div>
                        </div>
                        <div className="font-mono text-[9px] font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                          Bölünebilme Kural Testi
                        </div>
                      </div>
                    )}

                    {/* 19d. İki Sayının Ortak Bölenleri (Venn Şeması) */}
                    {activity.previewType === 'venn_divisors' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <svg viewBox="0 0 140 80" className="w-32 h-18">
                          <circle cx="52" cy="40" r="28" fill="#f472b6" fillOpacity="0.3" stroke="#db2777" strokeWidth="1.5" />
                          <circle cx="88" cy="40" r="28" fill="#60a5fa" fillOpacity="0.3" stroke="#2563eb" strokeWidth="1.5" />
                          <text x="36" y="42" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#be185d">9, 18</text>
                          <text x="70" y="36" textAnchor="middle" fontSize="8" fontWeight="black" fill="#4338ca">1, 2</text>
                          <text x="70" y="48" textAnchor="middle" fontSize="8" fontWeight="black" fill="#4338ca">3, 6</text>
                          <text x="104" y="42" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#1d4ed8">4, 8, 12, 24</text>
                        </svg>
                        <div className="font-mono text-[9px] font-bold text-pink-700 dark:text-pink-300">
                          EBOB(18, 24) = 6
                        </div>
                      </div>
                    )}

                    {/* 19e. İki Sayının Ortak Katları (Ritim Modeli & EKOK) */}
                    {activity.previewType === 'rhythmic_multiples' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <svg viewBox="0 0 140 80" className="w-32 h-18">
                          <line x1="10" y1="40" x2="130" y2="40" stroke="#94a3b8" strokeWidth="1.5" />
                          {/* 4'er ritim yayları */}
                          <path d="M 10 40 Q 30 20, 50 40 Q 70 20, 90 40" fill="none" stroke="#06b6d4" strokeWidth="1.5" />
                          {/* 6'şar ritim yayları */}
                          <path d="M 10 40 Q 50 10, 90 40" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,2" />
                          <circle cx="90" cy="40" r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                          <text x="90" y="60" textAnchor="middle" fontSize="8" fontWeight="black" fill="#ef4444">12 (EKOK)</text>
                          <text x="25" y="70" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#06b6d4">4'er</text>
                          <text x="50" y="70" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#f59e0b">6'şar</text>
                        </svg>
                        <div className="font-mono text-[9px] font-bold text-cyan-700 dark:text-cyan-300">
                          EKOK(4, 6) = 12
                        </div>
                      </div>
                    )}

                    {/* 19f. Alan Modeli ile Çarpanları Bulma */}
                    {activity.previewType === 'area_rectangles' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <svg viewBox="0 0 140 80" className="w-32 h-18">
                          <rect x="15" y="20" width="30" height="30" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
                          <text x="30" y="38" textAnchor="middle" fontSize="8" fontWeight="black" fill="#b45309">6×6</text>
                          <rect x="55" y="25" width="45" height="20" fill="#ecfdf5" stroke="#059669" strokeWidth="1.5" />
                          <text x="77" y="38" textAnchor="middle" fontSize="8" fontWeight="black" fill="#047857">9×4</text>
                          <rect x="105" y="15" width="20" height="45" fill="#e0e7ff" stroke="#4f46e5" strokeWidth="1.5" />
                          <text x="115" y="40" textAnchor="middle" fontSize="7" fontWeight="black" fill="#3730a3">3×12</text>
                        </svg>
                        <div className="font-mono text-[9px] font-bold text-amber-700 dark:text-amber-300">
                          Alan = 36 br² (Tüm Çarpanlar)
                        </div>
                      </div>
                    )}

                    {/* 19g. Bölen Listesi (Asal Çarpan Algoritması) */}
                    {activity.previewType === 'division_ladder' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border font-mono text-[9px] font-black">
                          <div className="flex flex-col text-right text-foreground pr-2 border-r-2 border-indigo-600">
                            <span>24</span>
                            <span>12</span>
                            <span>6</span>
                            <span>3</span>
                            <span>1</span>
                          </div>
                          <div className="flex flex-col text-left text-indigo-600 dark:text-indigo-400">
                            <span>2</span>
                            <span>2</span>
                            <span>2</span>
                            <span>3</span>
                          </div>
                        </div>
                        <div className="font-mono text-[9px] font-bold text-indigo-700 dark:text-indigo-300 mt-1">
                          24 = 2³ × 3
                        </div>
                      </div>
                    )}

                    {/* 20a. İlkokul: Ağaçtan Elma Toplama (1-5) */}
                    {(activity.previewType === 'apple_tree_collect' || activity.previewType === 'counting_objects') && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <div className="flex items-center gap-1 text-2xl">
                          <span className="relative inline-flex items-center justify-center">
                            🍎
                            <span className="absolute text-[8px] font-black text-white bg-black/60 px-1 rounded-full bottom-0">1</span>
                          </span>
                          <span className="relative inline-flex items-center justify-center">
                            🍎
                            <span className="absolute text-[8px] font-black text-white bg-black/60 px-1 rounded-full bottom-0">2</span>
                          </span>
                          <span className="relative inline-flex items-center justify-center">
                            🍎
                            <span className="absolute text-[8px] font-black text-white bg-black/60 px-1 rounded-full bottom-0">3</span>
                          </span>
                          <span className="relative inline-flex items-center justify-center">
                            🍎
                            <span className="absolute text-[8px] font-black text-white bg-black/60 px-1 rounded-full bottom-0">4</span>
                          </span>
                          <span className="relative inline-flex items-center justify-center">
                            🍎
                            <span className="absolute text-[8px] font-black text-white bg-black/60 px-1 rounded-full bottom-0">5</span>
                          </span>
                        </div>
                        <div className="text-xs font-black text-rose-600 dark:text-rose-400 mt-1.5">
                          Ağaçtan Elma Toplama (1-5)
                        </div>
                      </div>
                    )}

                    {/* 20b. İlkokul: Kedicikler (10-20 Onluk & Birlik) */}
                    {activity.previewType === 'kitten_ten_frames' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <div className="flex items-center gap-2">
                          <div className="px-2 py-1 bg-amber-100 dark:bg-amber-950/70 border border-amber-400 rounded-lg flex items-center gap-1">
                            <span className="text-xl">🐱</span>
                            <span className="text-[10px] font-black text-amber-800 dark:text-amber-300">1 Onluk (10)</span>
                          </div>
                          <span className="text-sm font-black text-muted-foreground">+</span>
                          <div className="flex items-center gap-0.5 text-lg">
                            <span>🐱</span>
                            <span>🐱</span>
                            <span>🐱</span>
                            <span>🐱</span>
                          </div>
                        </div>
                        <div className="text-xs font-black text-amber-700 dark:text-amber-300 mt-1.5">
                          1 Onluk + 4 Birlik = 14
                        </div>
                      </div>
                    )}

                    {/* 20c. İlkokul: Tren Vagonları Sıralama */}
                    {activity.previewType === 'train_wagons' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <div className="flex items-center gap-1">
                          <span className="text-2xl">🚂</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-blue-500 text-white font-black text-xs shadow-xs">1.</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-rose-500 text-white font-black text-xs shadow-xs">2.</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-white font-black text-xs shadow-xs">3.</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-white font-black text-xs shadow-xs">4.</span>
                        </div>
                        <div className="text-xs font-black text-blue-600 dark:text-blue-400 mt-1.5">
                          Sıra Sayıları: 1. 2. 3. 4. Vagon
                        </div>
                      </div>
                    )}

                    {/* 20d. İlkokul: Azlık & Çokluk Karşılaştırma */}
                    {activity.previewType === 'compare_quantities' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-0.5 text-lg bg-rose-100 dark:bg-rose-950/60 px-2 py-1 rounded-xl border border-rose-300">
                            <span>🎈</span>
                            <span>🎈</span>
                            <span>🎈</span>
                            <span>🎈</span>
                            <span className="text-[10px] font-black text-rose-700 dark:text-rose-300 ml-1">4 (Çok)</span>
                          </div>
                          <span className="text-xs font-black text-muted-foreground">vs</span>
                          <div className="flex items-center gap-0.5 text-lg bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl border border-border">
                            <span>🎈</span>
                            <span>🎈</span>
                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 ml-1">2 (Az)</span>
                          </div>
                        </div>
                        <div className="text-xs font-black text-rose-600 dark:text-rose-400 mt-1.5">
                          Azlık - Çokluk Karşılaştırma
                        </div>
                      </div>
                    )}

                    {/* 20e. İlkokul: Kurbağa Ritmik Sayma */}
                    {activity.previewType === 'frog_rhythmic' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <div className="flex items-center gap-1.5 text-xs font-black">
                          <span className="text-xl animate-bounce">🐸</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">5</span>
                          <span className="text-[10px] text-muted-foreground">➡️</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">10</span>
                          <span className="text-[10px] text-muted-foreground">➡️</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold shadow-xs">15</span>
                          <span className="text-[10px] text-muted-foreground">➡️</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">20</span>
                        </div>
                        <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1.5">
                          5’er Ritmik Zıplama (5-10-15-20)
                        </div>
                      </div>
                    )}

                    {/* 20f. İlkokul: Meyve Tahmini */}
                    {activity.previewType === 'fruit_estimation' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <div className="flex items-center gap-2">
                          <span className="text-3xl">🧺</span>
                          <span className="text-xl">🍎 🍏 🍎</span>
                          <span className="px-2 py-0.5 rounded-lg bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300 border border-pink-300 text-xs font-black">
                            Tahmin: 8?
                          </span>
                        </div>
                        <div className="text-xs font-black text-pink-600 dark:text-pink-400 mt-1.5">
                          Gözle Tahmin Et &amp; Say
                        </div>
                      </div>
                    )}

                    {/* 20b. İlkokul: Eş Nesneleri Bulma (Çorap & Eldiven) */}
                    {activity.previewType === 'matching_pairs' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <div className="flex items-center gap-2 text-2xl">
                          <span className="p-1 rounded-full bg-red-100 dark:bg-red-950/50 border border-red-300">🧦</span>
                          <span className="text-xs text-muted-foreground font-black">↔️</span>
                          <span className="p-1 rounded-full bg-red-100 dark:bg-red-950/50 border border-red-300">🧦</span>
                          <span className="p-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-300">🧤</span>
                          <span className="text-xs text-muted-foreground font-black">↔️</span>
                          <span className="p-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-300">🧤</span>
                        </div>
                        <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1.5">
                          Eş Nesneleri Bulma Oyunu
                        </div>
                      </div>
                    )}

                    {/* 21. İlkokul: Yön ve Konum Labirenti (1-2. Sınıf) */}
                    {activity.previewType === 'spatial_grid' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <div className="flex items-center gap-3 text-2xl">
                          <span>🐰</span>
                          <span className="text-xs font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md">➡️ İleri</span>
                          <span>🥕</span>
                        </div>
                        <div className="font-mono text-[9px] font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                          Sağ - Sol - İleri Yön Bulmaca
                        </div>
                      </div>
                    )}

                    {/* 22. İlkokul: Paralarımız (1-4. Sınıf) */}
                    {activity.previewType === 'money_coins' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-amber-400 border-2 border-amber-600 flex items-center justify-center font-black text-xs text-amber-950 shadow-xs">
                            1₺
                          </span>
                          <span className="px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-950 border border-blue-400 text-blue-700 dark:text-blue-300 font-bold text-xs">
                            5 TL
                          </span>
                          <span className="px-2.5 py-1 rounded-md bg-rose-100 dark:bg-rose-950 border border-rose-400 text-rose-700 dark:text-rose-300 font-bold text-xs">
                            10 TL
                          </span>
                        </div>
                        <div className="font-mono text-[9px] font-bold text-amber-700 dark:text-amber-300 mt-1">
                          Paralarımızı Tanıyalım (TL / ₺)
                        </div>
                      </div>
                    )}

                    {/* 23. İlkokul: Şekil Örüntüsü (1-4. Sınıf) */}
                    {activity.previewType === 'pattern_blocks' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <div className="flex items-center gap-1.5 text-xl">
                          <span>🔴</span>
                          <span>🟦</span>
                          <span>🟡</span>
                          <span>🔴</span>
                          <span className="text-sm font-black text-indigo-600 border border-indigo-400 px-1 rounded-md">❓</span>
                        </div>
                        <div className="font-mono text-[9px] font-bold text-purple-700 dark:text-purple-300 mt-1">
                          Örüntüyü Tamamla
                        </div>
                      </div>
                    )}

                    {/* 24. İlkokul: Saatler & Zaman (2-4. Sınıf) */}
                    {activity.previewType === 'clock_face' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <svg viewBox="0 0 100 70" className="w-24 h-16">
                          <circle cx="50" cy="35" r="28" fill="#fef3c7" stroke="#d97706" strokeWidth="2.5" />
                          <circle cx="50" cy="35" r="3" fill="#b45309" />
                          <line x1="50" y1="35" x2="50" y2="15" stroke="#b45309" strokeWidth="2.5" />
                          <line x1="50" y1="35" x2="68" y2="35" stroke="#d97706" strokeWidth="2" />
                          <text x="50" y="14" textAnchor="middle" fontSize="7" fontWeight="black" fill="#78350f">12</text>
                          <text x="74" y="38" textAnchor="middle" fontSize="7" fontWeight="black" fill="#78350f">3</text>
                          <text x="50" y="60" textAnchor="middle" fontSize="7" fontWeight="black" fill="#78350f">6</text>
                          <text x="26" y="38" textAnchor="middle" fontSize="7" fontWeight="black" fill="#78350f">9</text>
                        </svg>
                        <div className="font-mono text-[9px] font-bold text-amber-700 dark:text-amber-300">
                          Saat: 03:00 (Tam Saat)
                        </div>
                      </div>
                    )}

                    {/* 25. İlkokul: Görsel Toplama & Çıkarma */}
                    {activity.previewType === 'addition_subtraction_visual' && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <div className="flex items-center gap-1 text-base font-black text-slate-800 dark:text-white">
                          <span>🐱🐱</span>
                          <span className="text-emerald-600 font-bold">+</span>
                          <span>🐱</span>
                          <span className="text-slate-400">=</span>
                          <span className="text-rose-600 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-lg text-sm">3 🐱</span>
                        </div>
                        <div className="font-mono text-[9px] font-bold text-rose-700 dark:text-rose-300 mt-1">
                          Resimli Toplama Oyunu
                        </div>
                      </div>
                    )}

                    {/* Genel Diğer Çizimler */}
                    {!activity.previewType && (
                      <div className="flex items-center gap-2 text-primary font-bold text-xs">
                        <Shapes className="w-8 h-8" />
                        <span>Etkileşimli Simülasyon</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-wider opacity-85">
                      UYGULAMA
                    </div>
                    <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                      <Box className="w-4 h-4 shrink-0" />
                      <span>{activity.title}</span>
                    </h3>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      onLaunchActivity(activity);
                    }}
                    className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-950 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xl hover:scale-102 transition-all mt-auto cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current text-amber-400" />
                    <span>Görevi Başlat</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
