'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useCurriculum } from '@/state/CurriculumContext';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Wrench,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Focus,
  Target,
  RotateCcw,
  Box,
  Scale,
  Circle as CircleIcon,
  Compass,
  Layers,
  Check,
  Volume2,
  Smile,
  Play,
} from 'lucide-react';

const SockSVG = ({ color }: { color: string }) => (
  <svg viewBox="0 0 64 64" className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-md select-none pointer-events-none" style={{ color }}>
    <rect x="22" y="10" width="20" height="6" rx={1.5} fill="currentColor" />
    <path d="M24,16 h16 v22 c0,3.5 3.5,5 5.5,7 c3,3 1,8.5 -4.5,8.5 c-7.5,0 -17,-8 -17,-13.5 z" fill="currentColor" />
    <path d="M24,35 c2,0 4,2 4,5 v1 h-4 z" fill="white" fillOpacity="0.4" />
    <path d="M40,51 c2,2 2,4 0,4 c-2,0 -4,-2 -4,-4 z" fill="white" fillOpacity="0.4" />
    <line x1="24" y1="22" x2="40" y2="22" stroke="white" strokeWidth="2.5" strokeOpacity="0.8" />
    <line x1="24" y1="27" x2="40" y2="27" stroke="white" strokeWidth="2.5" strokeOpacity="0.8" />
  </svg>
);

const GloveSVG = ({ color }: { color: string }) => (
  <svg viewBox="0 0 64 64" className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-md select-none pointer-events-none" style={{ color }}>
    <rect x="20" y="44" width="24" height="8" rx={2.5} fill="currentColor" />
    <path d="M22,44 v-22 c0,-5 20,-5 20,0 v22 z" fill="currentColor" />
    <path d="M22,38 c-5,-1 -7,-8 -2,-11 c3,-2 4,3 4,5 z" fill="currentColor" />
    <circle cx="32" cy="28" r={4.5} fill="white" fillOpacity="0.5" />
  </svg>
);

export function MissionView() {
  const { selectedActivity, selectedGrade, goBack, openStudioMode, markActivityCompleted } = useCurriculum();

  // Tuval Konteyner Boyut Takibi
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 600,
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    observer.observe(containerRef.current);
    window.addEventListener('resize', updateDimensions);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Görev adımı (1: Ayarla/Eşleştir, 2: Karar Ver, 3: Açıkla, 4: Notlar)
  const [activeStep, setActiveStep] = useState<number>(1);

  // 1. Prizma Hacmi State'i
  const [prismLength, setPrismLength] = useState<number>(4);
  const [prismWidth, setPrismWidth] = useState<number>(3);
  const [prismHeight, setPrismHeight] = useState<number>(5);
  const [savedPrisms, setSavedPrisms] = useState<{ l: number; w: number; h: number; v: number }[]>([]);
  const [prismVerified, setPrismVerified] = useState<boolean>(false);

  // 2. Lise Doğru Eğimi State'i: y = mx + n
  const [slopeM, setSlopeM] = useState<number>(1);
  const [interceptN, setInterceptN] = useState<number>(0);
  const [slopeVerified, setSlopeVerified] = useState<boolean>(false);

  // 3. Pizza Payı Eşliği State'i
  const [leftNumerator, setLeftNumerator] = useState<number>(2);
  const [rightNumerator, setRightNumerator] = useState<number>(1);
  const [pizzaVerified, setPizzaVerified] = useState<boolean>(false);

  // 4. Bölge Kurtarma State'i
  const [userX, setUserX] = useState<number>(-2);
  const [userY, setUserY] = useState<number>(2);
  const [quadrantVerified, setQuadrantVerified] = useState<boolean>(false);

  // 5. Denge ve Eşitlik (Kefeli Terazi) State'i: 2x + 4 = 10 => x = 3
  const [balanceXCount, setBalanceXCount] = useState<number>(2);
  const [balanceLeftUnits, setBalanceLeftUnits] = useState<number>(4);
  const [balanceRightUnits, setBalanceRightUnits] = useState<number>(10);
  const [balanceXValue, setBalanceXValue] = useState<number>(1);
  const [balanceVerified, setBalanceVerified] = useState<boolean>(false);

  // 6. Çember & Pergel State'i
  const [circleRadius, setCircleRadius] = useState<number>(3);
  const [circleVerified, setCircleVerified] = useState<boolean>(false);

  // 7. İlkokul 1-4 Görsel Oyun State'leri
  const [clickedApples, setClickedApples] = useState<number[]>([0, 1, 2, 3, 4]);
  const [selectedCount, setSelectedCount] = useState<number | null>(null);
  const [countVerified, setCountVerified] = useState<boolean>(false);

  // Elmaları Sayalım (Sırayla Toplama Oyunu) State'leri
  const [nextAppleToCollect, setNextAppleToCollect] = useState<number>(1);
  const [collectedApplesList, setCollectedApplesList] = useState<number[]>([]);

  // Eş Nesneleri Bulma (Çorap & Eldiven) State'leri
  const [selectedSockIds, setSelectedSockIds] = useState<number[]>([]);
  const [matchedSockIds, setMatchedSockIds] = useState<number[]>([]);

  const socksList = useMemo(() => [
    { id: 0, type: 'sock', color: '#ef4444', label: 'Kırmızı Çorap', pairId: 0 },
    { id: 1, type: 'glove', color: '#10b981', label: 'Yeşil Eldiven', pairId: 1 },
    { id: 2, type: 'sock', color: '#3b82f6', label: 'Mavi Çorap', pairId: 2 },
    { id: 3, type: 'sock', color: '#ef4444', label: 'Kırmızı Çorap', pairId: 0 },
    { id: 4, type: 'glove', color: '#10b981', label: 'Yeşil Eldiven', pairId: 1 },
    { id: 5, type: 'sock', color: '#3b82f6', label: 'Mavi Çorap', pairId: 2 },
  ], []);

  const handleSockClick = (idx: number) => {
    speakText(socksList[idx].label);
    if (selectedSockIds.includes(idx)) {
      setSelectedSockIds([]);
      return;
    }
    if (selectedSockIds.length === 0) {
      setSelectedSockIds([idx]);
    } else {
      const firstIdx = selectedSockIds[0];
      if (socksList[firstIdx].pairId === socksList[idx].pairId) {
        const nextMatched = [...matchedSockIds, firstIdx, idx];
        setMatchedSockIds(nextMatched);
        setSelectedSockIds([]);
        speakText('Eşleşti!');

        if (nextMatched.length === 6) {
          speakText('Tebrikler! Tüm eş nesneleri buldun!');
          if (selectedActivity) markActivityCompleted(selectedActivity.id);
          try {
            confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
          } catch (e) { }
        }
      } else {
        setSelectedSockIds([idx]);
      }
    }
  };

  // Yön Labirenti: Tavşan & Havuç
  const [rabbitPos, setRabbitPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const carrotPos = { x: 3, y: 3 };
  const [rabbitVerified, setRabbitVerified] = useState<boolean>(false);

  // 1-b) Kedicikler (10-20 Onluk & Birlik)
  const [packedKittensCount, setPackedKittensCount] = useState<number>(0);
  const [kittenVerified, setKittenVerified] = useState<boolean>(false);

  // 1-c) Tren Vagonları Sıralama (1., 2., 3., 4., 5.)
  const [placedWagons, setPlacedWagons] = useState<number[]>([]);
  const [trainVerified, setTrainVerified] = useState<boolean>(false);

  // 1-d) Azlık & Çokluk Karşılaştırma
  const [compareChoice, setCompareChoice] = useState<'left' | 'right' | 'equal' | null>(null);
  const [compareVerified, setCompareVerified] = useState<boolean>(false);

  // 1-e) Kurbağa Ritmik Sayma (5 -> 10 -> 15 -> 20)
  const [frogStepIndex, setFrogStepIndex] = useState<number>(0);
  const [frogVerified, setFrogVerified] = useState<boolean>(false);

  // 1-f) Renkli Şekil Örüntüsü
  const [patternChoice, setPatternChoice] = useState<string | null>(null);
  const [patternVerified, setPatternVerified] = useState<boolean>(false);

  // 1-g) Şipşak Meyve Tahmini
  const [fruitEstimate, setFruitEstimate] = useState<number | null>(null);
  const [countedFruits, setCountedFruits] = useState<number[]>([]);
  const [estimationVerified, setEstimationVerified] = useState<boolean>(false);

  // Yön tuşları klavye desteği
  useEffect(() => {
    if (rabbitVerified) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        speakText('Yukarı');
        setRabbitPos((p) => ({ ...p, y: Math.max(0, p.y - 1) }));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        speakText('Aşağı');
        setRabbitPos((p) => ({ ...p, y: Math.min(3, p.y + 1) }));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        speakText('Sol');
        setRabbitPos((p) => ({ ...p, x: Math.max(0, p.x - 1) }));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        speakText('Sağ');
        setRabbitPos((p) => ({ ...p, x: Math.min(3, p.x + 1) }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [rabbitVerified]);

  // Kumbara Paraları
  const [piggyTotal, setPiggyTotal] = useState<number>(0);
  const [piggyVerified, setPiggyVerified] = useState<boolean>(false);

  // Şekil Örüntüsü
  const [selectedPatternShape, setSelectedPatternShape] = useState<string | null>(null);

  // 8. ŞEKİL & SÜTUN GRAFİĞİ (2. Sınıf Sevilen Mevsimler, Kardeş Sayıları, Sınıf Karşılaştırma)
  const [barchartData, setBarchartData] = useState<{ label: string; icon: string; count: number; color: string }[]>([
    { label: 'İlkbahar', icon: '🌸', count: 4, color: '#ec4899' },
    { label: 'Yaz', icon: '☀️', count: 6, color: '#f59e0b' },
    { label: 'Sonbahar', icon: '🍂', count: 3, color: '#ea580c' },
    { label: 'Kış', icon: '❄️', count: 2, color: '#06b6d4' },
  ]);
  const starMultiplier = 2; // Her yıldız 2 öğrenci
  const [barchartVerified, setBarchartVerified] = useState<boolean>(false);

  // 9. OLASILIK ÇARKI
  const [spinnerAngle, setSpinnerAngle] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [spinHistory, setSpinHistory] = useState<string[]>([]);
  const [spinnerVerified, setSpinnerVerified] = useState<boolean>(false);

  // 10. AYNA SİMETRİSİ
  const [symmetryUserGrid, setSymmetryUserGrid] = useState<number[]>([1, 4, 7]);
  const [symmetryVerified, setSymmetryVerified] = useState<boolean>(false);

  // 11. TABAN BLOKLARI / BASAMAK TABLOSU
  const [placeHundreds, setPlaceHundreds] = useState<number>(4);
  const [placeTens, setPlaceTens] = useState<number>(5);
  const [placeOnes, setPlaceOnes] = useState<number>(6);
  const [unitCubesVerified, setUnitCubesVerified] = useState<boolean>(false);

  // 12. İNTERAKTİF AÇI ÖLÇER / GÖNYE
  const [angleDegree, setAngleDegree] = useState<number>(90);
  const [angleVerified, setAngleVerified] = useState<boolean>(false);

  // 13. SAYMA PULLARI & TAM SAYILAR (7. Sınıf Sayma Pulları ile Çıkarma/Toplama)
  const [tilePositives, setTilePositives] = useState<number>(2); // (+2)
  const [tileZeroPairs, setTileZeroPairs] = useState<number>(3); // 3 adet (+ / -) sıfır çifti
  const [tileRemovedNegatives, setTileRemovedNegatives] = useState<number>(3); // 3 adet (-) dışarı atıldı
  const [tilesVerified, setTilesVerified] = useState<boolean>(false);

  // Sesli Okuma / Web Speech Synthesis
  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'tr-TR';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      } catch (e) { }
    }
  };

  // Karar Ver (Adım 2) Seçimi
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [step2Verified, setStep2Verified] = useState<boolean>(false);

  // Zoom ve Pan (Kaydırma)
  const [zoom, setZoom] = useState<number>(36);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const mission = selectedActivity?.mission;

  // Etkinlik Türü Tespiti
  const missionType = useMemo(() => {
    if (mission?.type) return mission.type;
    const title = selectedActivity?.title?.toLowerCase() || '';
    const desc = selectedActivity?.description?.toLowerCase() || '';
    const cat = selectedActivity?.category || '';
    const prev = selectedActivity?.previewType || '';

    // Sayma Pulları & Tam Sayılar Modeli (7. Sınıf)
    if (
      prev === 'algebraic_tiles' ||
      title.includes('sayma pulu') ||
      title.includes('sayma pulları') ||
      title.includes('çift ekleme') ||
      title.includes('tam sayı pulları') ||
      desc.includes('sayma pulları')
    ) {
      return 'algebraic_tiles';
    }

    // Şekil Grafiği / Sütun Grafiği / Veri Analizi
    if (
      prev === 'data_barchart' ||
      title.includes('grafik') ||
      title.includes('mevsim') ||
      title.includes('kardeş') ||
      title.includes('veri') ||
      title.includes('çetele') ||
      title.includes('sıklık') ||
      desc.includes('grafiği') ||
      desc.includes('şekil grafiği')
    ) {
      return 'data_barchart';
    }

    // Olasılık Çarkı
    if (prev === 'probability_spinner' || title.includes('çark') || title.includes('olasilik') || title.includes('olasılık')) {
      return 'probability_spinner';
    }

    // Ayna Simetrisi
    if (prev === 'transformation_symmetry' || title.includes('simetri') || title.includes('ayna') || title.includes('kilim')) {
      return 'transformation_symmetry';
    }

    // Taban Blokları / Basamak Değeri
    if (prev === 'unit_cubes' || title.includes('basamak') || title.includes('çözümleme') || title.includes('blok') || title.includes('bölük')) {
      return 'unit_cubes';
    }

    // Açı Ölçer / Gönye
    if (prev === 'angle_explorer' || prev === 'angle_arc' || title.includes('açı') || title.includes('gönye') || title.includes('dönme')) {
      return 'angle_explorer';
    }

    // İlkokul 1. Sınıf Sayılar ve Örüntüler
    if (prev === 'matching_pairs' || selectedActivity?.id === 'act-1-yon-2') {
      return 'matching_pairs';
    }
    if (prev === 'apple_tree_collect' || selectedActivity?.id === 'act-1-sayi-1') {
      return 'apple_tree_collect';
    }
    if (prev === 'kitten_ten_frames' || selectedActivity?.id === 'act-1-sayi-2' || title.includes('kedicik')) {
      return 'kitten_ten_frames';
    }
    if (prev === 'train_wagons' || selectedActivity?.id === 'act-1-sayi-3' || title.includes('vagon') || title.includes('tren')) {
      return 'train_wagons';
    }
    if (prev === 'compare_quantities' || selectedActivity?.id === 'act-1-sayi-4' || title.includes('azlık') || title.includes('karşılaştır')) {
      return 'compare_quantities';
    }
    if (prev === 'frog_rhythmic' || selectedActivity?.id === 'act-1-sayi-5' || title.includes('kurbağa') || title.includes('zıp zıp')) {
      return 'frog_rhythmic';
    }
    if (prev === 'pattern_blocks' || selectedActivity?.id === 'act-1-sayi-6' || title.includes('örüntü')) {
      return 'pattern_blocks';
    }
    if (prev === 'fruit_estimation' || selectedActivity?.id === 'act-1-sayi-7' || title.includes('tahmin')) {
      return 'fruit_estimation';
    }

    // Saymaca ve Meyveler (Genel)
    if (prev === 'counting_objects' || prev === 'addition_subtraction_visual' || title.includes('saymaca') || title.includes('elma') || title.includes('meyve')) {
      return 'counting_objects';
    }

    // Labirent ve Yön
    if (prev === 'spatial_grid' || title.includes('labirent') || title.includes('tavşan') || title.includes('yön') || title.includes('harita')) {
      return 'spatial_grid';
    }

    // Kumbara ve Para
    if (prev === 'money_coins' || title.includes('kumbara') || title.includes('para') || title.includes('kuruş')) {
      return 'money_coins';
    }

    // Prizma Hacmi
    if (prev === 'prism_volume' || title.includes('prizma') || title.includes('hacim')) {
      return 'prism_volume';
    }

    // Pizza Kesirleri
    if (prev === 'pizza_fractions' || title.includes('kesir') || title.includes('pizza')) {
      return 'pizza_fractions';
    }

    // Terazi / Eşitlik
    if (title.includes('denge') || title.includes('terazi') || title.includes('eşitlik') || desc.includes('terazi')) {
      return 'balance_scale';
    }

    // Çember & Pergel
    if (prev === 'circle_radius' || title.includes('çember') || title.includes('pergel')) {
      return 'circle_radius';
    }

    // Koordinat ve Bölge
    if (prev === 'coordinate_grid' || title.includes('bölge') || title.includes('koordinat') || mission?.type === 'quadrant_target') {
      return 'quadrant_target';
    }

    // Sayı Doğrusu
    if (prev === 'number_line' || title.includes('ritmik') || title.includes('sayı doğrusu') || title.includes('yuvarlama')) {
      return 'number_line';
    }

    // Eğim ve Doğrusal Fonksiyon
    if (prev === 'slope_line' || title.includes('eğim') || title.includes('doğru') || cat === 'fonksiyon') {
      return 'slope_explorer';
    }

    return 'data_barchart';
  }, [mission, selectedActivity]);

  // Prizma Hacmi
  const currentVolume = prismLength * prismWidth * prismHeight;
  const handleSavePrism = () => {
    const isAlreadySaved = savedPrisms.some((p) => p.l === prismLength && p.w === prismWidth && p.h === prismHeight);
    if (!isAlreadySaved) {
      setSavedPrisms((prev) => [...prev, { l: prismLength, w: prismWidth, h: prismHeight, v: currentVolume }]);
    }
  };

  const handleVerifyPrisms = () => {
    const matching48 = savedPrisms.filter((p) => p.v === 48);
    const has48Current = currentVolume === 48;
    if (matching48.length >= 2 || (has48Current && matching48.length >= 1) || has48Current) {
      setPrismVerified(true);
      setActiveStep(2);
      if (selectedActivity) markActivityCompleted(selectedActivity.id);
      try {
        confetti({ particleCount: 90, spread: 90, origin: { y: 0.6 } });
      } catch (e) { }
    } else {
      alert(`Hacmi 48 olan en az bir prizma oluşturun veya kaydedin (Örn: 4×3×4 = 48 veya 6×2×4 = 48).`);
    }
  };

  // Eğim Doğrulama
  const handleVerifySlope = () => {
    if (slopeM === 2 && interceptN === 1) {
      setSlopeVerified(true);
      setActiveStep(2);
      if (selectedActivity) markActivityCompleted(selectedActivity.id);
      try {
        confetti({ particleCount: 90, spread: 90, origin: { y: 0.6 } });
      } catch (e) { }
    } else {
      alert(`Hedefe henüz ulaşılmadı. Lütfen m (Eğim) = 2 ve n (y-Kesen) = 1 değerlerine ayarlayın.`);
    }
  };

  // Pizza Payları Doğrulama
  const handleVerifyPizza = () => {
    if (leftNumerator === 3 && rightNumerator === 1) {
      setPizzaVerified(true);
      setActiveStep(2);
      if (selectedActivity) markActivityCompleted(selectedActivity.id);
      try {
        confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
      } catch (e) { }
    } else {
      alert(`Henüz eşitlenmedi! 6 dilimli sol pizzada 3 dilim boyayarak (3/6), sağdaki 1/2 dilime eşitleyin.`);
    }
  };

  // Bölge Doğrulama
  const handleVerifyQuadrant = () => {
    const targetX = mission?.targetPoint?.x ?? 3;
    const targetY = mission?.targetPoint?.y ?? 2;
    const dist = Math.sqrt((userX - targetX) ** 2 + (userY - targetY) ** 2);

    if (dist <= 0.5) {
      setQuadrantVerified(true);
      setActiveStep(2);
      if (selectedActivity) markActivityCompleted(selectedActivity.id);
      try {
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      } catch (e) { }
    } else {
      alert(`Hedefe henüz ulaşılmadı. Hedef koordinat: (${targetX}; ${targetY}).`);
    }
  };

  // Denge ve Terazi Doğrulama (2x + 4 = 10 => x = 3)
  const leftTotalWeight = balanceXCount * balanceXValue + balanceLeftUnits;
  const rightTotalWeight = balanceRightUnits;
  const isScaleBalanced = leftTotalWeight === rightTotalWeight;
  const tiltAngle = Math.max(-12, Math.min(12, (rightTotalWeight - leftTotalWeight) * 3));

  const handleVerifyBalance = () => {
    if (isScaleBalanced && balanceXValue === 3) {
      setBalanceVerified(true);
      setActiveStep(2);
      if (selectedActivity) markActivityCompleted(selectedActivity.id);
      try {
        confetti({ particleCount: 90, spread: 100, origin: { y: 0.5 } });
      } catch (e) { }
    } else if (isScaleBalanced) {
      setBalanceVerified(true);
      setActiveStep(2);
      if (selectedActivity) markActivityCompleted(selectedActivity.id);
      try {
        confetti({ particleCount: 90, spread: 100, origin: { y: 0.5 } });
      } catch (e) { }
    } else {
      alert(`Terazi henüz dengede değil! Sol kefedeki ağırlık: ${leftTotalWeight} kg, Sağ kefedeki: ${rightTotalWeight} kg. x değerini veya ağırlıkları ayarlayarak dengeyi sağlayın.`);
    }
  };

  // Çember Doğrulama
  const handleVerifyCircle = () => {
    if (circleRadius === 3) {
      setCircleVerified(true);
      setActiveStep(2);
      if (selectedActivity) markActivityCompleted(selectedActivity.id);
      try {
        confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
      } catch (e) { }
    } else {
      alert('Yarıçapı r = 3 br olacak şekilde ayarlayın.');
    }
  };

  // 1. Sınıf Sayma & Eşleştirme Doğrulama
  const handleVerifyCount = () => {
    if (selectedActivity?.id === 'act-1-yon-2') {
      if (matchedSockIds.length === 6) {
        setCountVerified(true);
        setActiveStep(2);
        speakText('Tebrikler! Tüm çorap ve eldivenleri doğru eşleştirdin!');
        if (selectedActivity) markActivityCompleted(selectedActivity.id);
        try {
          confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
        } catch (e) { }
      } else {
        speakText('Henüz tüm eşleri bulamadın. Eşleştirmeye devam et!');
        alert('Lütfen tüm nesneleri eşleştirip tekrar deneyin.');
      }
      return;
    }

    if (nextAppleToCollect > 5) {
      setCountVerified(true);
      setActiveStep(2);
      speakText('Tebrikler! Tüm elmaları sırayla topladın!');
      if (selectedActivity) markActivityCompleted(selectedActivity.id);
      try {
        confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
      } catch (e) { }
    } else {
      speakText(`Henüz tüm elmaları toplamadın. Sıradaki toplanacak elma ${nextAppleToCollect}`);
      alert(`Lütfen tüm elmaları 1'den 5'e kadar sırayla toplayın! Sıradaki elma: ${nextAppleToCollect}`);
    }
  };

  // 1-b) Kedicikler Onluk & Birlik Doğrulama
  const handleVerifyKitten = () => {
    if (packedKittensCount === 10) {
      setKittenVerified(true);
      setActiveStep(2);
      speakText('Tebrikler! 14 kediciğin 10 tanesini 1 Onluk kutusuna ayırdın. Kalan 4 tanesi ise 4 Birlik oldu!');
      if (selectedActivity) markActivityCompleted(selectedActivity.id);
      try {
        confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
      } catch (e) { }
    } else {
      speakText('Henüz 10 kediciği onluk kutusuna toplamadın. Onluk butonuna basarak 10 kediyi paketle!');
      alert('Lütfen 10 kediciği Onluk Kutusuna toplayın!');
    }
  };

  // 1-c) Tren Vagonları Sıralama Doğrulama
  const handleVerifyTrain = () => {
    if (placedWagons.length === 5) {
      setTrainVerified(true);
      setActiveStep(2);
      speakText('Harika! Tüm vagonları 1, 2, 3, 4, 5 sırasıyla dizdin! Çuf çuf! Tren yola çıkıyor!');
      if (selectedActivity) markActivityCompleted(selectedActivity.id);
      try {
        confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
      } catch (e) { }
    } else {
      speakText(`Tren henüz tamamlanmadı! Sıradaki vagon: ${placedWagons.length + 1}. vagon`);
      alert(`Lütfen 1'den 5'e kadar tüm vagonları sırayla trenin arkasına takın!`);
    }
  };

  // 1-d) Azlık ve Çokluk Doğrulama
  const handleVerifyCompare = () => {
    if (compareChoice === 'left') {
      setCompareVerified(true);
      setActiveStep(2);
      speakText('Harika tespit! Sol taraftaki 7 balon, sağ taraftaki 4 balondan daha çoktur!');
      if (selectedActivity) markActivityCompleted(selectedActivity.id);
      try {
        confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
      } catch (e) { }
    } else {
      speakText('Tekrar düşün! Sol tarafta 7, sağ tarafta 4 balon var. Hangi taraf daha çok?');
      alert('Sol tarafta 7 balon, sağ tarafta 4 balon var. Hangisi daha çok?');
    }
  };

  // 1-e) Kurbağa Ritmik Sayma Doğrulama
  const handleVerifyFrog = () => {
    if (frogStepIndex >= 3) {
      setFrogVerified(true);
      setActiveStep(2);
      speakText('Harika zıpladın! Beş, On, On Beş, Yirmi! Kurbağa gölü geçti! Vrak vrak!');
      if (selectedActivity) markActivityCompleted(selectedActivity.id);
      try {
        confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
      } catch (e) { }
    } else {
      speakText('Kurbağa henüz 20 sayısına ulaşamadı. Sıradaki nilüfere zıpla!');
      alert('Lütfen kurbağayı 5, 10, 15, 20 şeklinde sırayla zıplatın!');
    }
  };

  // 1-f) Renkli Şekil Örüntüsü Doğrulama
  const handleVerifyPattern = () => {
    if (patternChoice === 'blue_square' || selectedPatternShape === '🟡') {
      setPatternVerified(true);
      setActiveStep(2);
      speakText('Tebrikler! Örüntü kuralını başarıyla tamamladın!');
      if (selectedActivity) markActivityCompleted(selectedActivity.id);
      try {
        confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
      } catch (e) { }
    } else {
      speakText('Örüntü kuralına dikkat et: Sırada hangi renk ve şekil gelmeli?');
      alert('Lütfen örüntüyü doğru tamamlayacak şekli seçin!');
    }
  };

  // 1-g) Şipşak Meyve Tahmini Doğrulama
  const handleVerifyEstimation = () => {
    if (fruitEstimate !== null && countedFruits.length === 8) {
      setEstimationVerified(true);
      setActiveStep(2);
      speakText(`Harika! Sepette tam 8 elma vardı. Tahminini tebrik ederiz!`);
      if (selectedActivity) markActivityCompleted(selectedActivity.id);
      try {
        confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
      } catch (e) { }
    } else {
      speakText('Önce tahminde bulun, sonra sepetteki tüm elmaları tek tek sayarak kontrol et!');
      alert('Lütfen önce bir tahminde bulunun ve sepetteki 8 elmanın hepsine dokunarak sayın!');
    }
  };

  // 1-2. Sınıf Labirent Doğrulama
  const handleVerifyRabbit = () => {
    if (rabbitPos.x === carrotPos.x && rabbitPos.y === carrotPos.y) {
      setRabbitVerified(true);
      setActiveStep(2);
      speakText('Tebrikler! Tavşan havuca ulaştı!');
      if (selectedActivity) markActivityCompleted(selectedActivity.id);
      try {
        confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
      } catch (e) { }
    } else {
      speakText('Tavşan henüz havuca ulaşamadı. Yön oklarına basarak havuca götür!');
      alert('Tavşanı havuç simgesine (sağ alt köşe) ulaştırmak için yön oklarına basın!');
    }
  };

  // 1-4. Sınıf Para Kumbara Doğrulama
  const handleVerifyPiggy = () => {
    if (piggyTotal === 20) {
      setPiggyVerified(true);
      setActiveStep(2);
      speakText('Tebrikler! Kumbarada tam 20 Lira biriktirdin!');
      if (selectedActivity) markActivityCompleted(selectedActivity.id);
      try {
        confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
      } catch (e) { }
    } else {
      speakText(`Kumbarada ${piggyTotal} Lira var. Hedef 20 Lira!`);
      alert(`Hedef 20 ₺ biriktirmektir. Şu anki miktar: ${piggyTotal} ₺`);
    }
  };

  // 2. Sınıf Şekil ve Sütun Grafiği Doğrulama
  const handleVerifyBarchart = () => {
    setBarchartVerified(true);
    setActiveStep(2);
    speakText('Tebrikler! Şekil grafiğini ve sıklık tablosunu başarıyla inceledin. Şimdi soruyu yanıtla!');
    if (selectedActivity) markActivityCompleted(selectedActivity.id);
    try {
      confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
    } catch (e) { }
  };

  // Olasılık Çarkı Döndürme
  const handleSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    const extraRotations = 5 + Math.floor(Math.random() * 5);
    const targetDeg = extraRotations * 360 + Math.floor(Math.random() * 360);
    setSpinnerAngle((prev) => prev + targetDeg);
    setTimeout(() => {
      setIsSpinning(false);
      const outcomes = ['🔴 Kırmızı', '🔵 Mavi', '🟡 Sarı'];
      const chosen = outcomes[Math.floor(Math.random() * outcomes.length)];
      setSpinHistory((prev) => [chosen, ...prev.slice(0, 4)]);
      speakText(`Çark ${chosen} alanında durdu!`);
    }, 2000);
  };

  const handleVerifySpinner = () => {
    setSpinnerVerified(true);
    setActiveStep(2);
    if (selectedActivity) markActivityCompleted(selectedActivity.id);
    try {
      confetti({ particleCount: 90, spread: 90, origin: { y: 0.6 } });
    } catch (e) { }
  };

  // Ayna Simetrisi Doğrulama
  const handleVerifySymmetry = () => {
    setSymmetryVerified(true);
    setActiveStep(2);
    speakText('Harika! Simetri aynasındaki yansımayı doğru tamamladın!');
    if (selectedActivity) markActivityCompleted(selectedActivity.id);
    try {
      confetti({ particleCount: 90, spread: 90, origin: { y: 0.6 } });
    } catch (e) { }
  };

  // Taban Blokları Doğrulama
  const handleVerifyUnitCubes = () => {
    setUnitCubesVerified(true);
    setActiveStep(2);
    speakText('Tebrikler! 3 basamaklı sayıyı taban bloklarıyla modelledin.');
    if (selectedActivity) markActivityCompleted(selectedActivity.id);
    try {
      confetti({ particleCount: 90, spread: 90, origin: { y: 0.6 } });
    } catch (e) { }
  };

  // Açı Ölçer Doğrulama
  const handleVerifyAngle = () => {
    setAngleVerified(true);
    setActiveStep(2);
    speakText(`Açı ölçüsü ${angleDegree} derece olarak ayarlandı.`);
    if (selectedActivity) markActivityCompleted(selectedActivity.id);
    try {
      confetti({ particleCount: 90, spread: 90, origin: { y: 0.6 } });
    } catch (e) { }
  };

  // Sayma Pulları Doğrulama
  const handleVerifyTiles = () => {
    setTilesVerified(true);
    setActiveStep(2);
    speakText('Tebrikler! (+2) sayısından (-3) çıkarmak için 3 adet sıfır çifti ekleyip negatif pulları başarıyla çıkardınız.');
    if (selectedActivity) markActivityCompleted(selectedActivity.id);
    try {
      confetti({ particleCount: 90, spread: 90, origin: { y: 0.6 } });
    } catch (e) { }
  };

  // Adım 2 Doğrulama
  const handleVerifyStep2 = () => {
    let correctIdx = 2;
    if (missionType === 'balance_scale') correctIdx = 1; // x = 3
    if (missionType === 'slope_explorer') correctIdx = 0; // m = 2
    if (missionType === 'quadrant_target') correctIdx = 0; // I. Bölge (+, +)
    if (missionType === 'pizza_fractions') correctIdx = 1; // 1/2 = 3/6
    if (missionType === 'algebraic_tiles') correctIdx = 0; // (+5)
    if (missionType === 'data_barchart') correctIdx = 0; // Yaz Mevsimi (12)

    if (selectedOption === correctIdx) {
      setStep2Verified(true);
      setActiveStep(3);
      try {
        confetti({ particleCount: 90, spread: 100, origin: { y: 0.5 } });
      } catch (e) { }
    } else {
      alert('Tekrar deneyin! Verilen matematiksel eşitliği ve yönergeleri inceleyin.');
    }
  };

  // Pizza SVG Dilim Yolu
  const renderPizzaSlices = (cx: number, cy: number, r: number, totalSlices: number, activeSlices: number, fillColor: string) => {
    const slices = [];
    const anglePerSlice = 360 / totalSlices;

    for (let i = 0; i < totalSlices; i++) {
      const startAngle = (i * anglePerSlice - 90) * (Math.PI / 180);
      const endAngle = ((i + 1) * anglePerSlice - 90) * (Math.PI / 180);

      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);

      const isShaded = i < activeSlices;
      const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;

      slices.push(
        <path
          key={i}
          d={pathData}
          fill={isShaded ? fillColor : 'transparent'}
          fillOpacity={isShaded ? 0.85 : 0.05}
          stroke={fillColor}
          strokeWidth={2}
          className="transition-all duration-200"
        />
      );
    }
    return slices;
  };

  // Koordinat Düzlemi Hesaplamaları (Tam Ekran Duyarlı)
  const centerX = dimensions.width / 2 + pan.x;
  const centerY = dimensions.height / 2 + pan.y;

  // Izgara çizgileri (Dünya sınırları)
  const minWorldX = Math.floor((-centerX) / zoom) - 1;
  const maxWorldX = Math.ceil((dimensions.width - centerX) / zoom) + 1;
  const minWorldY = Math.floor((centerY - dimensions.height) / zoom) - 1;
  const maxWorldY = Math.ceil(centerY / zoom) + 1;

  const gridXValues = [];
  for (let x = minWorldX; x <= maxWorldX; x++) {
    gridXValues.push(x);
  }

  const gridYValues = [];
  for (let y = minWorldY; y <= maxWorldY; y++) {
    gridYValues.push(y);
  }

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-4rem)] min-h-[500px] w-full overflow-hidden bg-background">
      {/* 1. ÜST SARI / VURGULU BAŞLIK ŞERİDİ */}
      <div className="h-14 bg-amber-400 dark:bg-amber-500 text-slate-900 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-xs z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-black/10 hover:bg-black/20 text-slate-900 font-black text-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Görevlere Dön</span>
          </button>

          <h1 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
            <span>{selectedActivity?.title || 'Matematik Görevi'}</span>
          </h1>
        </div>

        <button
          onClick={openStudioMode}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all hover:scale-105"
        >
          <Wrench className="w-4 h-4" />
          <span>Araçlara Yükle / Stüdyoyu Aç</span>
        </button>
      </div>

      {/* 2. ANA DÜZEN: GENİŞ SOL SİMÜLASYON TUVALİ + SAĞ GÖREV MERKEZİ */}
      <div className="flex flex-1 flex-col lg:flex-row min-h-0 min-w-0 h-full w-full overflow-hidden">
        {/* SOL: SİMÜLASYON ALANI */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 h-full relative bg-background border-r border-border">
          {/* Üst Yönerge Kutuları */}
          <div className="p-3 sm:p-4 bg-muted/30 border-b border-border/70 flex flex-wrap items-center gap-3 select-none">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SİMÜLASYON: {selectedActivity?.title || 'İnteraktif Model'}</span>
            </div>
            <div className="text-xs text-foreground font-semibold flex items-center gap-2">
              <span className="text-emerald-600 font-black">GÖREV:</span>
              <span>
                {selectedGrade?.gradeNumber === 1
                  ? (selectedActivity?.title?.includes('Labirent') ? 'Tavşanı havuca ulaştır! 🐰' : 'Elmaları sayalım! 🍎')
                  : (selectedActivity?.description || 'Matematiksel modeli keşfedin ve hedefleri tamamlayın.')}
              </span>
              {selectedGrade?.gradeNumber === 1 && (
                <button
                  onClick={() => speakText(selectedActivity?.description || '')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-[10px] shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer ml-1"
                  title="Sesli Dinle"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Dinle</span>
                </button>
              )}
            </div>
          </div>

          {/* SİMÜLASYON ÇİZİM TUVALİ (100% RESPONSIVE) */}
          <div
            ref={containerRef}
            className="flex-1 w-full h-full min-h-0 relative overflow-hidden flex items-center justify-center select-none bg-background"
          >
            {/* A) PRİZMA HACMİ & AÇINIM MODU */}
            {missionType === 'prism_volume' && (
              <div className="w-full h-full relative flex items-center justify-center p-4 sm:p-8">
                <svg className="w-full h-full block max-w-4xl max-h-[580px]" viewBox="0 0 840 500" preserveAspectRatio="xMidYMid meet">
                  {/* Arka Plan Izgarası */}
                  <g className="opacity-20 dark:opacity-10" stroke="currentColor">
                    {[0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 840].map((v) => (
                      <React.Fragment key={v}>
                        <line x1={v} y1={0} x2={v} y2={500} strokeDasharray="3,3" />
                        <line x1={0} y1={v} x2={840} y2={v} strokeDasharray="3,3" />
                      </React.Fragment>
                    ))}
                  </g>

                  {/* 1. SOL ALAN: 3D PRİZMA MODELİ */}
                  <g transform="translate(90, 120)">
                    {/* Arka Gizli Yüzeyler */}
                    <line x1="60" y1="40" x2="60" y2={40 + prismHeight * 22} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4,3" />
                    <line x1="60" y1={40 + prismHeight * 22} x2="0" y2={prismWidth * 16 + prismHeight * 22} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4,3" />
                    <line x1="60" y1={40 + prismHeight * 22} x2={60 + prismLength * 26} y2={40 + prismHeight * 22} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4,3" />

                    {/* Üst Yüz (Sarı) */}
                    <polygon
                      points={`0,${prismWidth * 16} ${prismLength * 26},${prismWidth * 16} ${60 + prismLength * 26},40 60,40`}
                      fill="#fef08a"
                      fillOpacity="0.8"
                      stroke="#ca8a04"
                      strokeWidth="3.5"
                    />

                    {/* Ön Yüz (Mavi) */}
                    <polygon
                      points={`0,${prismWidth * 16} ${prismLength * 26},${prismWidth * 16} ${prismLength * 26},${prismWidth * 16 + prismHeight * 24} 0,${prismWidth * 16 + prismHeight * 24}`}
                      fill="#e0f2fe"
                      fillOpacity="0.85"
                      stroke="#0284c7"
                      strokeWidth="3.5"
                    />

                    {/* Sağ Yan Yüz (Lila) */}
                    <polygon
                      points={`${prismLength * 26},${prismWidth * 16} ${60 + prismLength * 26},40 ${60 + prismLength * 26},${40 + prismHeight * 24} ${prismLength * 26},${prismWidth * 16 + prismHeight * 24}`}
                      fill="#e0e7ff"
                      fillOpacity="0.85"
                      stroke="#3b82f6"
                      strokeWidth="3.5"
                    />

                    {/* Boyut Etiketleri */}
                    <text x={prismLength * 13} y={prismWidth * 16 + prismHeight * 24 + 24} textAnchor="middle" className="fill-blue-600 dark:fill-blue-400 font-black text-sm">
                      Uzunluk (a) = {prismLength}
                    </text>
                    <text x={prismLength * 26 + 40} y={prismWidth * 8 + 20} textAnchor="middle" className="fill-amber-600 dark:fill-amber-400 font-black text-sm">
                      Genişlik (b) = {prismWidth}
                    </text>
                    <text x={60 + prismLength * 26 + 20} y={40 + prismHeight * 12} className="fill-indigo-600 dark:fill-indigo-400 font-black text-sm">
                      Yükseklik (c) = {prismHeight}
                    </text>

                    {/* Canlı Hacim Rozeti */}
                    <g transform={`translate(${prismLength * 8}, ${prismWidth * 16 + prismHeight * 12 - 10})`}>
                      <rect width="140" height="38" rx="12" fill="#ffffff" stroke="#0284c7" strokeWidth="2.5" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.1))" />
                      <text x="70" y="24" textAnchor="middle" className="fill-slate-900 font-black text-xs">
                        V = {currentVolume} br³
                      </text>
                    </g>
                  </g>

                  {/* 2. SAĞ ALAN: 2D AÇINIM MODELİ */}
                  <g transform="translate(580, 110)">
                    {/* Üst Kapak */}
                    <rect x="35" y="0" width={prismLength * 9 + 15} height={prismWidth * 7 + 10} rx="4" fill="#ecfdf5" stroke="#059669" strokeWidth="2.5" />
                    {/* Orta Ön Yüz */}
                    <rect x="35" y={prismWidth * 7 + 10} width={prismLength * 9 + 15} height={prismHeight * 9 + 15} rx="4" fill="#fef3c7" stroke="#ca8a04" strokeWidth="2.5" />
                    {/* Alt Kapak */}
                    <rect x="35" y={prismWidth * 7 + 10 + prismHeight * 9 + 15} width={prismLength * 9 + 15} height={prismWidth * 7 + 10} rx="4" fill="#ecfdf5" stroke="#059669" strokeWidth="2.5" />
                    {/* Sağ Yan Yüz */}
                    <rect x={35 + prismLength * 9 + 15} y={prismWidth * 7 + 10} width={prismWidth * 7 + 10} height={prismHeight * 9 + 15} rx="4" fill="#e0e7ff" stroke="#3b82f6" strokeWidth="2.5" />
                    {/* Açınım Başlığı */}
                    <text x="65" y={prismWidth * 14 + prismHeight * 9 + 60} textAnchor="middle" className="fill-foreground font-black text-sm">
                      Açınım Modeli
                    </text>
                  </g>
                </svg>
              </div>
            )}

            {/* B) DENGE VE EŞİTLİK (KEFELİ TERAZİ) MODELİ */}
            {missionType === 'balance_scale' && (
              <div className="w-full h-full relative flex flex-col items-center justify-center p-6 select-none">
                <svg className="w-full h-full block max-w-3xl max-h-[500px]" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid meet">
                  {/* Zemin */}
                  <line x1="150" y1="410" x2="650" y2="410" className="stroke-border" strokeWidth="4" strokeLinecap="round" />

                  {/* Terazi Ana Gövdesi / Taban Üçgeni */}
                  <polygon points="400,160 360,390 440,390" fill="#64748b" stroke="#334155" strokeWidth="3" />
                  <circle cx="400" cy="160" r="14" fill="#0f172a" stroke="#38bdf8" strokeWidth="3" />

                  {/* Dönen Terazi Kolu (Animated Beam) */}
                  <g transform={`rotate(${tiltAngle}, 400, 160)`} className="transition-transform duration-300 ease-out">
                    {/* Ana Kol */}
                    <rect x="160" y="154" width="480" height="12" rx="6" fill="#334155" stroke="#1e293b" strokeWidth="2" />
                    {/* Sol Kefe İpi */}
                    <line x1="200" y1="160" x2="200" y2="250" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="3,2" />
                    {/* Sağ Kefe İpi */}
                    <line x1="600" y1="160" x2="600" y2="250" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="3,2" />

                    {/* Sol Kefe Tabağı */}
                    <g transform="translate(200, 250)">
                      <path d="M -70 0 Q 0 45 70 0 Z" fill="#38bdf8" fillOpacity="0.25" stroke="#0284c7" strokeWidth="3" />
                      {/* Sol Ağırlıklar: x kutuları ve 1kg bloklar */}
                      <g transform="translate(-50, -40)">
                        {Array.from({ length: balanceXCount }).map((_, i) => (
                          <g key={`x-${i}`} transform={`translate(${i * 32}, 0)`}>
                            <rect width="28" height="28" rx="6" fill="#8b5cf6" stroke="#6d28d9" strokeWidth="2" />
                            <text x="14" y="19" textAnchor="middle" fill="#fff" className="font-black text-xs">x</text>
                          </g>
                        ))}
                      </g>
                      <g transform="translate(-40, -10)">
                        {Array.from({ length: balanceLeftUnits }).map((_, i) => (
                          <g key={`lu-${i}`} transform={`translate(${(i % 5) * 18}, ${Math.floor(i / 5) * -16})`}>
                            <circle cx="8" cy="0" r="7" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
                            <text x="8" y="3" textAnchor="middle" fill="#fff" className="font-bold text-[8px]">1</text>
                          </g>
                        ))}
                      </g>
                    </g>

                    {/* Sağ Kefe Tabağı */}
                    <g transform="translate(600, 250)">
                      <path d="M -70 0 Q 0 45 70 0 Z" fill="#10b981" fillOpacity="0.25" stroke="#059669" strokeWidth="3" />
                      {/* Sağ Ağırlıklar: 1kg bloklar */}
                      <g transform="translate(-55, -20)">
                        {Array.from({ length: balanceRightUnits }).map((_, i) => (
                          <g key={`ru-${i}`} transform={`translate(${(i % 6) * 18}, ${Math.floor(i / 6) * -16})`}>
                            <circle cx="8" cy="0" r="7" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
                            <text x="8" y="3" textAnchor="middle" fill="#fff" className="font-bold text-[8px]">1</text>
                          </g>
                        ))}
                      </g>
                    </g>
                  </g>

                  {/* Denge Gösterge Rozeti */}
                  <g transform="translate(330, 40)">
                    <rect
                      width="140"
                      height="38"
                      rx="14"
                      fill={isScaleBalanced ? '#10b981' : '#f59e0b'}
                      className="shadow-md"
                    />
                    <text x="70" y="24" textAnchor="middle" fill="#fff" className="font-black text-xs tracking-wide">
                      {isScaleBalanced ? '⚖️ DENGEDE' : '⚖️ DENGEDE DEĞİL'}
                    </text>
                  </g>

                  {/* Matematiksel Denklem */}
                  <text x="400" y="110" textAnchor="middle" className="fill-foreground font-mono font-black text-lg">
                    {balanceXCount}x + {balanceLeftUnits} = {balanceRightUnits}
                    {isScaleBalanced && <tspan className="fill-emerald-600 ml-2"> (x = {balanceXValue})</tspan>}
                  </text>
                </svg>
              </div>
            )}

            {/* C) KOORDİNAT DÜZLEMİ / EĞİM / BÖLGE SİMÜLASYONU (TAM EKRAN BOYUTLU) */}
            {(missionType === 'slope_explorer' || missionType === 'quadrant_target') && (
              <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                <svg className="w-full h-full block">
                  {/* 1. Izgara Noktaları ve Çizgileri */}
                  <g className="grid-lines opacity-25 dark:opacity-15" stroke="currentColor">
                    {gridXValues.map((gx) => {
                      const sx = centerX + gx * zoom;
                      return (
                        <line
                          key={`gx-${gx}`}
                          x1={sx}
                          y1={0}
                          x2={sx}
                          y2={dimensions.height}
                          strokeDasharray={gx === 0 ? undefined : '2,2'}
                          strokeWidth={gx === 0 ? 2 : 0.75}
                        />
                      );
                    })}
                    {gridYValues.map((gy) => {
                      const sy = centerY - gy * zoom;
                      return (
                        <line
                          key={`gy-${gy}`}
                          x1={0}
                          y1={sy}
                          x2={dimensions.width}
                          y2={sy}
                          strokeDasharray={gy === 0 ? undefined : '2,2'}
                          strokeWidth={gy === 0 ? 2 : 0.75}
                        />
                      );
                    })}
                  </g>

                  {/* 2. Ana Eksenler (X ve Y) - Tam Ekran Boydan Boya */}
                  {/* X Ekseni */}
                  <line
                    x1={0}
                    y1={centerY}
                    x2={dimensions.width}
                    y2={centerY}
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    className="drop-shadow-xs"
                  />
                  {/* X Eksen Sağ Ok (+x) */}
                  <polygon
                    points={`${dimensions.width - 12},${centerY - 6} ${dimensions.width - 2},${centerY} ${dimensions.width - 12},${centerY + 6}`}
                    fill="#3b82f6"
                  />
                  {/* X Eksen Sol Ok (-x) */}
                  <polygon
                    points={`12,${centerY - 6} 2,${centerY} 12,${centerY + 6}`}
                    fill="#3b82f6"
                  />
                  {/* X Eksen Sağ Rozet (+x) */}
                  <g transform={`translate(${dimensions.width - 46}, ${Math.max(14, Math.min(dimensions.height - 30, centerY - 24))})`}>
                    <rect width="36" height="20" rx="6" fill="#3b82f6" className="shadow-xs" />
                    <text x="18" y="14" textAnchor="middle" fill="#ffffff" className="font-black text-[11px] font-sans">
                      +x
                    </text>
                  </g>
                  {/* X Eksen Sol Rozet (-x) */}
                  <g transform={`translate(14, ${Math.max(14, Math.min(dimensions.height - 30, centerY - 24))})`}>
                    <rect width="36" height="20" rx="6" fill="#3b82f6" className="shadow-xs" />
                    <text x="18" y="14" textAnchor="middle" fill="#ffffff" className="font-black text-[11px] font-sans">
                      -x
                    </text>
                  </g>

                  {/* Y Ekseni (Tüm Ekranı Boydan Boya Kaplayan Çizgi) */}
                  <line
                    x1={centerX}
                    y1={0}
                    x2={centerX}
                    y2={dimensions.height}
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    className="drop-shadow-xs"
                  />
                  {/* Y Eksen Üst Ok (+y) */}
                  <polygon
                    points={`${centerX - 6},12 ${centerX},2 ${centerX + 6},12`}
                    fill="#06b6d4"
                  />
                  {/* Y Eksen Alt Ok (-y) */}
                  <polygon
                    points={`${centerX - 6},${dimensions.height - 12} ${centerX},${dimensions.height - 2} ${centerX + 6},${dimensions.height - 12}`}
                    fill="#06b6d4"
                  />
                  {/* Y Eksen Üst Rozet (+y) */}
                  <g transform={`translate(${Math.max(10, Math.min(dimensions.width - 46, centerX + 10))}, 10)`}>
                    <rect width="36" height="20" rx="6" fill="#06b6d4" className="shadow-xs" />
                    <text x="18" y="14" textAnchor="middle" fill="#ffffff" className="font-black text-[11px] font-sans">
                      +y
                    </text>
                  </g>
                  {/* Y Eksen Alt Rozet (-y) */}
                  <g transform={`translate(${Math.max(10, Math.min(dimensions.width - 46, centerX + 10))}, ${dimensions.height - 30})`}>
                    <rect width="36" height="20" rx="6" fill="#06b6d4" className="shadow-xs" />
                    <text x="18" y="14" textAnchor="middle" fill="#ffffff" className="font-black text-[11px] font-sans">
                      -y
                    </text>
                  </g>

                  {/* Sayısal Çentikler (X Ekseni) */}
                  {gridXValues.map((gx) => {
                    if (gx === 0) return null;
                    const sx = centerX + gx * zoom;
                    return (
                      <g key={`tx-${gx}`}>
                        <line x1={sx} y1={centerY - 3} x2={sx} y2={centerY + 3} stroke="#3b82f6" strokeWidth={1.5} />
                        <text
                          x={sx}
                          y={Math.max(16, Math.min(dimensions.height - 8, centerY + 14))}
                          textAnchor="middle"
                          className="fill-foreground/80 text-[10px] font-mono font-bold select-none"
                        >
                          {gx}
                        </text>
                      </g>
                    );
                  })}

                  {/* Sayısal Çentikler (Y Ekseni) */}
                  {gridYValues.map((gy) => {
                    if (gy === 0) return null;
                    const sy = centerY - gy * zoom;
                    return (
                      <g key={`ty-${gy}`}>
                        <line x1={centerX - 3} y1={sy} x2={centerX + 3} y2={sy} stroke="#06b6d4" strokeWidth={1.5} />
                        <text
                          x={Math.max(8, Math.min(dimensions.width - 24, centerX - 8))}
                          y={sy + 3.5}
                          textAnchor="end"
                          className="fill-foreground/80 text-[10px] font-mono font-bold select-none"
                        >
                          {gy}
                        </text>
                      </g>
                    );
                  })}

                  {/* Orijin (0, 0) Rozeti */}
                  <g transform={`translate(${centerX}, ${centerY})`}>
                    <circle cx="0" cy="0" r="14" fill="#3b82f6" fillOpacity="0.15" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3,2" />
                    <circle cx="0" cy="0" r="4" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
                    <g transform="translate(8, 8)">
                      <rect width="48" height="20" rx="6" fill="#ffffff" stroke="#3b82f6" strokeWidth="1.5" className="shadow-xs" />
                      <text x="24" y="14" textAnchor="middle" fill="#2563eb" className="font-mono font-black text-[10px]">
                        (0; 0)
                      </text>
                    </g>
                  </g>

                  {/* 3. LİSE DOĞRUSAL FONKSİYON GRAFİĞİ: y = mx + n */}
                  {missionType === 'slope_explorer' && (
                    <>
                      {/* Sonsuz Doğru Çizgisi (Tüm ekranı boydan boya kaplar) */}
                      <line
                        x1={0}
                        y1={centerY - (slopeM * ((0 - centerX) / zoom) + interceptN) * zoom}
                        x2={dimensions.width}
                        y2={centerY - (slopeM * ((dimensions.width - centerX) / zoom) + interceptN) * zoom}
                        stroke="#2563eb"
                        strokeWidth={3.5}
                        className="drop-shadow-md"
                      />

                      {/* Eğim Üçgeni (Δy / Δx) */}
                      <g transform={`translate(${centerX}, ${centerY - interceptN * zoom})`}>
                        <line x1="0" y1="0" x2={1 * zoom} y2="0" stroke="#f59e0b" strokeWidth={2} strokeDasharray="3,2" />
                        <line x1={1 * zoom} y1="0" x2={1 * zoom} y2={-slopeM * zoom} stroke="#ec4899" strokeWidth={2} strokeDasharray="3,2" />
                        <text x={0.5 * zoom} y={14} textAnchor="middle" className="fill-amber-600 dark:fill-amber-400 font-bold text-[10px]">Δx = 1</text>
                        <text x={1 * zoom + 8} y={-slopeM * zoom * 0.5} className="fill-pink-600 dark:fill-pink-400 font-bold text-[10px]">Δy = {slopeM}</text>
                      </g>

                      {/* y-Kesen Noktası (0, n) */}
                      <circle cx={centerX} cy={centerY - interceptN * zoom} r={7} fill="#ef4444" stroke="#ffffff" strokeWidth={2} />
                      <g transform={`translate(${centerX + 12}, ${centerY - interceptN * zoom - 8})`}>
                        <rect width="64" height="22" rx="6" fill="#ffffff" stroke="#ef4444" strokeWidth="1.5" className="shadow-xs" />
                        <text x="32" y="15" textAnchor="middle" className="fill-rose-600 font-black text-xs">
                          (0; {interceptN})
                        </text>
                      </g>

                      {/* Canlı Denklem Rozeti */}
                      <g transform={`translate(${Math.max(20, dimensions.width - 220)}, 24)`}>
                        <rect width="190" height="38" rx="12" fill="#ffffff" stroke="#2563eb" strokeWidth="2" className="shadow-md" />
                        <text x="95" y="24" textAnchor="middle" className="fill-blue-700 font-mono font-black text-sm">
                          y = {slopeM !== 1 ? (slopeM === -1 ? '-' : slopeM) : ''}x {interceptN >= 0 ? `+ ${interceptN}` : `- ${Math.abs(interceptN)}`}
                        </text>
                      </g>
                    </>
                  )}

                  {/* 4. KOORDİNAT BÖLGE HEDEFİ */}
                  {missionType === 'quadrant_target' && (
                    <>
                      {/* Hedef Nokta Alanı (3, 2) */}
                      <circle
                        cx={centerX + 3 * zoom}
                        cy={centerY - 2 * zoom}
                        r={20}
                        fill="#f59e0b"
                        fillOpacity="0.2"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        strokeDasharray="4,3"
                      />
                      <text
                        x={centerX + 3 * zoom}
                        y={centerY - 2 * zoom - 24}
                        textAnchor="middle"
                        className="fill-amber-600 font-black text-xs"
                      >
                        Hedef: (3; 2)
                      </text>

                      {/* Kullanıcının Taşıdığı Nokta */}
                      <circle
                        cx={centerX + userX * zoom}
                        cy={centerY - userY * zoom}
                        r={8}
                        fill="#8b5cf6"
                        stroke="#ffffff"
                        strokeWidth={2}
                        className="drop-shadow-md cursor-pointer hover:scale-125 transition-transform"
                      />
                      <g transform={`translate(${centerX + userX * zoom + 10}, ${centerY - userY * zoom - 20})`}>
                        <rect width="60" height="22" rx="6" fill="#8b5cf6" className="shadow-xs" />
                        <text x="30" y="15" textAnchor="middle" fill="#ffffff" className="font-mono font-bold text-[11px]">
                          ({userX}; {userY})
                        </text>
                      </g>
                    </>
                  )}
                </svg>
              </div>
            )}

            {/* C2) SAYMA PULLARI İLE TAM SAYILAR MODELİ (7. SINIF) */}
            {missionType === 'algebraic_tiles' && (
              <div className="w-full h-full relative flex flex-col items-center justify-center p-4 sm:p-6 select-none overflow-y-auto">
                <div className="text-center space-y-2 mb-4">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 font-black text-xs">
                    <span>🔵 Sayma Pulları ile Çıkarma Modeli</span>
                    <button
                      onClick={() =>
                        speakText(
                          '(+2) den (-3) çıkarmak için içeride 3 negatif pul olmadığından dışarıdan 3 adet sıfır çifti eklenir ve 3 negatif pul dışarı atılır!'
                        )
                      }
                      className="p-1 rounded-md bg-blue-500 text-white hover:scale-110 transition-transform cursor-pointer"
                      title="Sesli Dinle"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-sm font-black font-mono text-foreground">
                    İşlem: <span className="text-blue-600">(+2)</span> - <span className="text-rose-600">(-3)</span> = <span className="text-emerald-600 font-black">+5</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full">
                  {/* 1. Başlangıç Durumu */}
                  <div className="p-4 rounded-3xl bg-card border-2 border-border flex flex-col items-center space-y-3 shadow-md">
                    <span className="font-black text-xs text-foreground uppercase tracking-wide">
                      1. Başlangıç (+2)
                    </span>
                    <div className="w-full h-32 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-500 text-white font-black text-lg flex items-center justify-center shadow-md">
                        +
                      </div>
                      <div className="w-12 h-12 rounded-full bg-blue-500 text-white font-black text-lg flex items-center justify-center shadow-md">
                        +
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-semibold">
                      Kutuda 2 adet (+) pul var.
                    </span>
                  </div>

                  {/* 2. Sıfır Çifti Ekleme */}
                  <div className="p-4 rounded-3xl bg-card border-2 border-amber-500/50 flex flex-col items-center space-y-3 shadow-md">
                    <span className="font-black text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                      2. Sıfır Çifti Ekle (+/-)
                    </span>
                    <div className="w-full h-32 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-2 flex flex-col justify-center items-center gap-1.5">
                      <div className="flex gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-500 text-white font-bold text-xs flex items-center justify-center">+</div>
                        <div className="w-7 h-7 rounded-full bg-blue-500 text-white font-bold text-xs flex items-center justify-center">+</div>
                      </div>
                      <div className="flex gap-1.5 p-1 rounded-xl bg-slate-200 dark:bg-slate-800 border border-dashed border-amber-500">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex flex-col items-center gap-0.5">
                            <div className="w-5 h-5 rounded-full bg-blue-500 text-white font-bold text-[9px] flex items-center justify-center">+</div>
                            <div className="w-5 h-5 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center">-</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold text-center">
                      3 sıfır çifti eklendi (Değer değişmedi)
                    </span>
                  </div>

                  {/* 3. Negatifleri Çıkarma ve Sonuç */}
                  <div className="p-4 rounded-3xl bg-card border-2 border-emerald-500/60 flex flex-col items-center space-y-3 shadow-md">
                    <span className="font-black text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                      3. (-3)&apos;ü Çıkar &amp; Sonuç
                    </span>
                    <div className="w-full h-32 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-2 flex flex-wrap items-center justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="w-9 h-9 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-md animate-in zoom-in-50">
                          +
                        </div>
                      ))}
                    </div>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-black">
                      Sonuç: Tam +5 pul kaldı!
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* D) PIZZA KESİRLERİ MODU */}
            {missionType === 'pizza_fractions' && (
              <div className="flex flex-col items-center justify-center gap-8 w-full max-w-2xl p-6">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-12 w-full">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="font-black text-foreground text-lg">Sol pizza</div>
                    <div className="relative w-48 h-48 sm:w-56 sm:h-56">
                      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-md">
                        <circle cx="100" cy="100" r="90" fill="#fff1f2" stroke="#e11d48" strokeWidth="6" />
                        {renderPizzaSlices(100, 100, 90, 6, leftNumerator, '#f43f5e')}
                      </svg>
                    </div>
                    <div className="font-mono text-xl font-black text-rose-600">{leftNumerator}/6</div>
                  </div>

                  <div className="flex flex-col items-center justify-center px-5 py-3 rounded-2xl bg-card border-2 border-border shadow-md">
                    <span className="text-2xl font-black font-mono">
                      {leftNumerator / 6 === rightNumerator / 2 ? (
                        <span className="text-emerald-600">{leftNumerator}/6 = {rightNumerator}/2</span>
                      ) : (
                        <span className="text-amber-600">{leftNumerator}/6 ≠ {rightNumerator}/2</span>
                      )}
                    </span>
                  </div>

                  <div className="flex flex-col items-center space-y-3">
                    <div className="font-black text-foreground text-lg">Sağ pizza</div>
                    <div className="relative w-48 h-48 sm:w-56 sm:h-56">
                      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-md">
                        <circle cx="100" cy="100" r="90" fill="#eff6ff" stroke="#2563eb" strokeWidth="6" />
                        {renderPizzaSlices(100, 100, 90, 2, rightNumerator, '#3b82f6')}
                      </svg>
                    </div>
                    <div className="font-mono text-xl font-black text-blue-600">{rightNumerator}/2</div>
                  </div>
                </div>
              </div>
            )}

            {/* E) ÇEMBER & PERGEL MODU */}
            {missionType === 'circle_radius' && (
              <div className="w-full h-full relative flex items-center justify-center p-6">
                <svg className="w-full h-full block max-w-xl max-h-[500px]" viewBox="0 0 500 500">
                  <circle cx="250" cy="250" r={circleRadius * 40} fill="#8b5cf6" fillOpacity="0.12" stroke="#8b5cf6" strokeWidth={3.5} />
                  <circle cx="250" cy="250" r={6} fill="#ec4899" stroke="#fff" strokeWidth={2} />
                  <line x1="250" y1="250" x2={250 + circleRadius * 40} y2="250" stroke="#ec4899" strokeWidth={2.5} strokeDasharray="4,2" />
                  <text x={250 + circleRadius * 20} y="240" textAnchor="middle" className="fill-pink-600 font-black text-xs">
                    r = {circleRadius} br
                  </text>
                  <text x="250" y="440" textAnchor="middle" className="fill-foreground font-black text-sm">
                    Çevre = {Math.round(2 * 3.14 * circleRadius * 10) / 10} br | Alan = {Math.round(3.14 * circleRadius * circleRadius * 10) / 10} br²
                  </text>
                </svg>
              </div>
            )}

            {/* F1) İLKOKUL 1: EŞ NESNELERİ BULMA OYUNU (ÇORAP & ELDİVEN) */}
            {missionType === 'matching_pairs' && (
              <div className="w-full h-full relative flex flex-col items-center justify-between p-6 select-none min-h-[500px]">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-xs">
                    <span>🧦 Eş Nesneleri Bulma Oyunu</span>
                  </div>
                </div>

                {/* Çorap & Eldiven Eşleştirme Izgarası (Büyütüldü & SVG yapıldı) */}
                <div className="grid grid-cols-3 gap-6 sm:gap-8 p-6 sm:p-8 rounded-[36px] bg-card border-2 border-border shadow-xl my-6">
                  {socksList.map((item, idx) => {
                    const isSelected = selectedSockIds.includes(idx);
                    const isMatched = matchedSockIds.includes(idx);

                    return (
                      <button
                        key={idx}
                        disabled={isMatched}
                        onClick={() => handleSockClick(idx)}
                        className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center border-4 transition-all shadow-md cursor-pointer ${
                          isMatched
                            ? 'bg-emerald-100/40 border-emerald-500 opacity-60 scale-95'
                            : isSelected
                            ? 'bg-primary/20 border-primary scale-105 animate-pulse'
                            : 'bg-white hover:bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 hover:scale-102'
                        }`}
                      >
                        {item.type === 'sock' ? (
                          <SockSVG color={item.color} />
                        ) : (
                          <GloveSVG color={item.color} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Alt Kontrol ve Bilgi Grubu */}
                <div className="w-full flex flex-col items-center gap-4 mt-auto pt-6">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-foreground font-medium">
                      Eşleşen Çift Sayısı: <span className="text-emerald-600 text-lg font-mono font-black">{matchedSockIds.length / 2} / 3</span>
                    </span>
                  </div>

                  {/* Sesli Yönergeyi Dinle Butonu */}
                  <button
                    onClick={() => speakText('Renk, boyut ve şekil yönünden aynı olan nesneleri bulup eşleştirin!')}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-md hover:scale-102 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-5 h-5 animate-pulse" />
                    <span>🔊 Sesli Yönergeyi Yeniden Dinle</span>
                  </button>
                </div>
              </div>
            )}

            {/* F2) İLKOKUL 1: AĞAÇTAN ELMA TOPLAMA OYUNU (SIRAYLA TOPLAMA) */}
            {(missionType === 'apple_tree_collect' || missionType === 'counting_objects') && (
              <div className="w-full h-full relative flex flex-col items-center justify-between p-6 select-none min-h-[500px]">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black text-xs">
                    <span>🍎 Ağaçtan Elma Toplama Oyunu (1-5)</span>
                  </div>
                </div>

                {/* Elma Ağacı ve Elmalar */}
                <div className="relative w-80 h-80 sm:w-96 sm:h-96 bg-gradient-to-b from-emerald-100/80 via-emerald-50/50 to-amber-100/60 dark:from-emerald-950/40 dark:to-amber-950/20 rounded-3xl border-2 border-emerald-300 dark:border-emerald-700/60 shadow-lg flex items-center justify-center overflow-hidden my-4">
                  {/* Ağaç Gövdesi */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-36 bg-amber-800 rounded-t-xl" />

                  {/* Ağaç Yaprakları (Yeşil Daire) */}
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 w-64 h-64 sm:w-80 sm:h-80 bg-emerald-500/90 rounded-full blur-xs shadow-inner" />

                  {/* Organik Konumlandırılmış Daire Elmalar (Sırayla Toplama Modu) */}
                  {[1, 2, 3, 4, 5].map((num) => {
                    const isCollected = collectedApplesList.includes(num);
                    const posMap: Record<number, { top: string; left: string }> = {
                      1: { top: '22%', left: '50%' },
                      2: { top: '38%', left: '33%' },
                      3: { top: '34%', left: '67%' },
                      4: { top: '52%', left: '42%' },
                      5: { top: '50%', left: '58%' }
                    };
                    const pos = posMap[num];

                    return (
                      <button
                        key={num}
                        disabled={isCollected}
                        onClick={() => {
                          if (num === nextAppleToCollect) {
                            speakText(`${num}`);
                            setCollectedApplesList((prev) => [...prev, num]);
                            setNextAppleToCollect(num + 1);
                            if (num === 5) {
                              if (selectedActivity) markActivityCompleted(selectedActivity.id);
                              speakText('Harika! Tüm elmaları sırayla topladın!');
                              try {
                                confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
                              } catch (e) {}
                            }
                          } else {
                            speakText(`Önce sıradaki sayıyı topla! Sıradaki sayı ${nextAppleToCollect}`);
                          }
                        }}
                        className={`w-14 h-14 rounded-full flex flex-col items-center justify-center text-3xl shadow-md border-2 transition-all cursor-pointer absolute -translate-x-1/2 -translate-y-1/2 z-10 duration-300 ${
                          isCollected
                            ? 'opacity-0 scale-50 pointer-events-none'
                            : 'bg-white/95 dark:bg-slate-900/95 border-rose-400 hover:scale-105 active:scale-95'
                        }`}
                        style={{ top: pos.top, left: pos.left }}
                      >
                        <span>🍎</span>
                        <span className="text-xs font-black text-rose-600 font-mono absolute bottom-1 bg-white/90 dark:bg-slate-800/90 px-1.5 py-0.5 rounded-full border border-rose-300">
                          {num}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Alt Kontrol ve Bilgi Grubu (Tahta Dostu - En Altta) */}
                <div className="w-full flex flex-col items-center gap-4 mt-auto pt-6">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-foreground">
                      {nextAppleToCollect > 5 ? (
                        <span className="text-emerald-600 font-bold">🎉 Tüm elmalar sırayla toplandı!</span>
                      ) : (
                        <span>Sıradaki toplanacak elma: <span className="text-rose-600 text-lg font-mono font-black">{nextAppleToCollect}</span></span>
                      )}
                    </span>
                  </div>

                  {/* Sesli Yönergeyi Dinle Butonu */}
                  <button
                    onClick={() => speakText(`Elmaları sırayla toplayalım! Önce bir numaralı elmaya dokun! Sıradaki toplanacak elma ${nextAppleToCollect}`)}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-sm shadow-md hover:scale-102 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-5 h-5 animate-pulse" />
                    <span>🔊 Sesli Yönergeyi Yeniden Dinle</span>
                  </button>
                </div>
              </div>
            )}

            {/* F3) İLKOKUL 1: SEVİMLİ KEDİCİKLER (ONLUK & BİRLİK GRUPLAMA) */}
            {missionType === 'kitten_ten_frames' && (
              <div className="w-full h-full relative flex flex-col items-center justify-between p-6 select-none min-h-[500px]">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-xs">
                    <span>🐱 Sevimli Kedicikler (10-20 Onluk &amp; Birlik)</span>
                  </div>
                </div>

                {/* Onluk ve Birlik Alanı */}
                <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-6 my-4">
                  {/* 1 Onluk Kutusu */}
                  <div className="p-5 rounded-3xl bg-amber-50/80 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700/60 shadow-md flex flex-col items-center">
                    <div className="text-sm font-black text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
                      <span>📦 1 ONLUK KUTUSU</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-200 text-xs font-mono">{packedKittensCount} / 10</span>
                    </div>

                    <div className="grid grid-cols-5 gap-2.5 p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-amber-200 w-full min-h-[120px] items-center justify-center">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-2xl border-2 transition-all ${
                            i < packedKittensCount
                              ? 'bg-amber-100 border-amber-400 scale-100 animate-in zoom-in-50'
                              : 'bg-muted/40 border-dashed border-border opacity-40'
                          }`}
                        >
                          {i < packedKittensCount ? '🐱' : ''}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        setPackedKittensCount(10);
                        speakText('10 kedicik 1 Onluk kutusuna toplandı! Kalan 4 kedicik ise 4 Birlik!');
                      }}
                      className="mt-4 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md transition-transform active:scale-95 cursor-pointer flex items-center gap-2"
                    >
                      <span>📦 10 Kediyi Paketle (1 Onluk Yap)</span>
                    </button>
                  </div>

                  {/* Birlikler Alanı */}
                  <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-900/40 border-2 border-border shadow-md flex flex-col items-center">
                    <div className="text-sm font-black text-foreground mb-3 flex items-center gap-2">
                      <span>🧺 BİRLİKLER</span>
                      <span className="px-2 py-0.5 rounded-full bg-muted text-foreground text-xs font-mono">4 Birlik</span>
                    </div>

                    <div className="grid grid-cols-4 gap-2.5 p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-border w-full min-h-[120px] items-center justify-center">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 border-2 border-orange-300 flex items-center justify-center text-2xl animate-pulse"
                        >
                          🐱
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 px-4 py-2 rounded-2xl bg-muted/60 text-muted-foreground font-black text-xs text-center">
                      1 Onluk (10) + 4 Birlik (4) = 14
                    </div>
                  </div>
                </div>

                {/* Alt Kontrol ve Bilgi Grubu */}
                <div className="w-full flex flex-col items-center gap-4 mt-auto pt-6">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-foreground">
                      {packedKittensCount === 10 ? (
                        <span className="text-emerald-600 font-bold">🎉 Harika! 1 Onluk ve 4 Birlik ayrıldı (Toplam: 14 Kedicik)</span>
                      ) : (
                        <span>10 kediciği kutuya toplayarak 1 Onluk oluşturun!</span>
                      )}
                    </span>
                  </div>

                  <button
                    onClick={() => speakText('14 kediciğin 10 tanesini onluk kutusuna topla, 1 onluk ve 4 birlik keşfet!')}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-md hover:scale-102 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-5 h-5 animate-pulse" />
                    <span>🔊 Sesli Yönergeyi Yeniden Dinle</span>
                  </button>
                </div>
              </div>
            )}

            {/* F4) İLKOKUL 1: SAYI VAGONLARI SIRALAMA */}
            {missionType === 'train_wagons' && (
              <div className="w-full h-full relative flex flex-col items-center justify-between p-6 select-none min-h-[500px]">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black text-xs">
                    <span>🚂 Sayı Vagonları Sıralama (1. - 5. Vagon)</span>
                  </div>
                </div>

                {/* Tren ve Ray Alanı */}
                <div className="w-full max-w-3xl flex flex-col items-center my-6">
                  {/* Tren Lokomotifi ve Takılan Vagonlar */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-4 p-4 rounded-3xl bg-slate-100/80 dark:bg-slate-900/60 border-2 border-border w-full justify-center">
                    {/* Lokomotif */}
                    <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800 text-white font-black text-xs shrink-0 shadow-md">
                      <span className="text-3xl">🚂</span>
                      <span className="text-[10px] mt-1 text-slate-300">Lokomotif</span>
                    </div>

                    {/* Vagon Yuvaları (1..5) */}
                    {[1, 2, 3, 4, 5].map((num) => {
                      const isPlaced = placedWagons.includes(num);
                      const colors: Record<number, string> = {
                        1: 'bg-rose-500',
                        2: 'bg-amber-500',
                        3: 'bg-emerald-500',
                        4: 'bg-blue-500',
                        5: 'bg-purple-500',
                      };

                      return (
                        <div
                          key={num}
                          className={`w-18 h-18 sm:w-22 sm:h-22 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${
                            isPlaced
                              ? `${colors[num]} text-white border-white/40 shadow-lg scale-100 animate-in zoom-in-75`
                              : 'bg-muted/40 border-dashed border-border opacity-50'
                          }`}
                        >
                          {isPlaced ? (
                            <>
                              <span className="text-2xl">🚃</span>
                              <span className="text-xs font-black font-mono mt-0.5">{num}. Vagon</span>
                            </>
                          ) : (
                            <span className="text-xs font-bold text-muted-foreground">{num}. Yuva</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Vagon Seçim Butonları (Karışık Sırayla) */}
                  <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                    {[3, 1, 5, 2, 4].map((num) => {
                      const isPlaced = placedWagons.includes(num);
                      return (
                        <button
                          key={num}
                          disabled={isPlaced}
                          onClick={() => {
                            if (num === placedWagons.length + 1) {
                              speakText(`${num}. Vagon takıldı!`);
                              const nextW = [...placedWagons, num];
                              setPlacedWagons(nextW);
                              if (nextW.length === 5) {
                                speakText('Harika! Tren hazır, çuf çuf!');
                                if (selectedActivity) markActivityCompleted(selectedActivity.id);
                                try {
                                  confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
                                } catch (e) {}
                              }
                            } else {
                              speakText(`Önce ${placedWagons.length + 1}. vagonu takmalısın!`);
                            }
                          }}
                          className={`px-5 py-3 rounded-2xl font-black text-sm border-2 shadow-md transition-all cursor-pointer flex items-center gap-2 ${
                            isPlaced
                              ? 'bg-muted border-border text-muted-foreground opacity-30 pointer-events-none'
                              : 'bg-white hover:bg-slate-50 text-foreground border-border hover:scale-105 active:scale-95 dark:bg-slate-900'
                          }`}
                        >
                          <span className="text-xl">🚃</span>
                          <span>{num}. Vagon</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Alt Kontrol ve Bilgi Grubu */}
                <div className="w-full flex flex-col items-center gap-4 mt-auto pt-6">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-foreground">
                      {placedWagons.length === 5 ? (
                        <span className="text-emerald-600 font-bold">🎉 Tüm vagonlar sırayla dizildi! Çuf çuf!</span>
                      ) : (
                        <span>Sıradaki takılacak vagon: <span className="text-blue-600 text-lg font-mono font-black">{placedWagons.length + 1}. Vagon</span></span>
                      )}
                    </span>
                  </div>

                  <button
                    onClick={() => speakText(`Vagonları birinci vagondan başlayarak sırayla diz! Sıradaki vagon ${placedWagons.length + 1}. vagon`)}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-sm shadow-md hover:scale-102 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-5 h-5 animate-pulse" />
                    <span>🔊 Sesli Yönergeyi Yeniden Dinle</span>
                  </button>
                </div>
              </div>
            )}

            {/* F5) İLKOKUL 1: AZLIK & ÇOKLUK KARŞILAŞTIRMA */}
            {missionType === 'compare_quantities' && (
              <div className="w-full h-full relative flex flex-col items-center justify-between p-6 select-none min-h-[500px]">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black text-xs">
                    <span>🎈 Azlık ve Çokluk Karşılaştırma</span>
                  </div>
                </div>

                {/* İki Grup Karşılaştırma Alanı */}
                <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-6 my-6">
                  {/* Sol Grup (7 Kırmızı Balon) */}
                  <div className={`p-6 rounded-3xl border-3 transition-all flex flex-col items-center justify-center ${
                    compareChoice === 'left' ? 'bg-rose-100/70 border-rose-500 dark:bg-rose-950/40 shadow-lg scale-102' : 'bg-card border-border shadow-md'
                  }`}>
                    <div className="text-sm font-black text-rose-600 mb-3">👈 Sol Grup</div>
                    <div className="flex flex-wrap items-center justify-center gap-2 text-3xl max-w-[200px]">
                      {Array.from({ length: 7 }).map((_, i) => (
                        <span key={i} className="animate-bounce" style={{ animationDelay: `${i * 100}ms` }}>🎈</span>
                      ))}
                    </div>
                    <div className="mt-4 font-mono text-2xl font-black text-rose-600">7 Balon</div>
                  </div>

                  {/* Sağ Grup (4 Mavi Balon) */}
                  <div className={`p-6 rounded-3xl border-3 transition-all flex flex-col items-center justify-center ${
                    compareChoice === 'right' ? 'bg-blue-100/70 border-blue-500 dark:bg-blue-950/40 shadow-lg scale-102' : 'bg-card border-border shadow-md'
                  }`}>
                    <div className="text-sm font-black text-blue-600 mb-3">👉 Sağ Grup</div>
                    <div className="flex flex-wrap items-center justify-center gap-2 text-3xl max-w-[200px]">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <span key={i} className="animate-bounce" style={{ animationDelay: `${i * 100}ms` }}>🎈</span>
                      ))}
                    </div>
                    <div className="mt-4 font-mono text-2xl font-black text-blue-600">4 Balon</div>
                  </div>
                </div>

                {/* Karar Butonları */}
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <button
                    onClick={() => {
                      setCompareChoice('left');
                      speakText('Tebrikler! 7 balon, 4 balondan daha çoktur!');
                      if (selectedActivity) markActivityCompleted(selectedActivity.id);
                      try {
                        confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
                      } catch (e) {}
                    }}
                    className={`px-6 py-3.5 rounded-2xl font-black text-sm border-2 shadow-md transition-all cursor-pointer flex items-center gap-2 ${
                      compareChoice === 'left'
                        ? 'bg-rose-500 text-white border-rose-600 scale-105'
                        : 'bg-white hover:bg-rose-50 text-foreground border-border dark:bg-slate-900'
                    }`}
                  >
                    <span>👈 Sol Taraf Daha Çok (7)</span>
                  </button>

                  <button
                    onClick={() => {
                      setCompareChoice('equal');
                      speakText('Tekrar say! Sayılar eşit değil.');
                    }}
                    className="px-6 py-3.5 rounded-2xl font-black text-sm border-2 border-border bg-white hover:bg-slate-50 text-foreground shadow-md transition-all cursor-pointer dark:bg-slate-900"
                  >
                    <span>🤝 İki Taraf Eşit</span>
                  </button>

                  <button
                    onClick={() => {
                      setCompareChoice('right');
                      speakText('Tekrar say! 4 balon 7 balondan daha azdır.');
                    }}
                    className="px-6 py-3.5 rounded-2xl font-black text-sm border-2 border-border bg-white hover:bg-slate-50 text-foreground shadow-md transition-all cursor-pointer dark:bg-slate-900"
                  >
                    <span>👉 Sağ Taraf Daha Çok (4)</span>
                  </button>
                </div>

                {/* Alt Kontrol ve Bilgi Grubu */}
                <div className="w-full flex flex-col items-center gap-4 mt-auto pt-6">
                  <button
                    onClick={() => speakText('Hangi tarafta daha çok balon var? 7 mi çok, 4 mü çok? Daha çok olan tarafı seç!')}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-sm shadow-md hover:scale-102 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-5 h-5 animate-pulse" />
                    <span>🔊 Sesli Yönergeyi Yeniden Dinle</span>
                  </button>
                </div>
              </div>
            )}

            {/* F6) İLKOKUL 1: ZIP ZIP KURBAĞA RİTMİK SAYMA */}
            {missionType === 'frog_rhythmic' && (
              <div className="w-full h-full relative flex flex-col items-center justify-between p-6 select-none min-h-[500px]">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-xs">
                    <span>🐸 Zıp Zıp Kurbağa Ritmik Sayma (5 - 10 - 15 - 20)</span>
                  </div>
                </div>

                {/* Nilüfer Gölü ve Kurbağa */}
                <div className="w-full max-w-3xl p-8 rounded-[36px] bg-gradient-to-b from-sky-100 via-blue-50 to-teal-100 dark:from-sky-950/40 dark:to-teal-950/30 border-2 border-sky-300 dark:border-sky-700/60 shadow-xl my-6 flex items-center justify-around relative min-h-[220px]">
                  {[5, 10, 15, 20].map((num, idx) => {
                    const isPassed = frogStepIndex >= idx;
                    const isCurrent = frogStepIndex === idx;

                    return (
                      <button
                        key={num}
                        onClick={() => {
                          if (idx === frogStepIndex) {
                            speakText(`${num}! Vrak!`);
                            const nextI = frogStepIndex + 1;
                            setFrogStepIndex(nextI);
                            if (nextI === 4) {
                              speakText('Tebrikler! Kurbağa gölün karşısına geçti! Beş, On, On Beş, Yirmi!');
                              if (selectedActivity) markActivityCompleted(selectedActivity.id);
                              try {
                                confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
                              } catch (e) {}
                            }
                          } else {
                            speakText(`Önce sıradaki nilüfere zıpla!`);
                          }
                        }}
                        className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-emerald-400 border-4 border-emerald-600 shadow-xl scale-110 animate-bounce'
                            : isPassed
                            ? 'bg-emerald-200 dark:bg-emerald-900 border-2 border-emerald-400 opacity-80'
                            : 'bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-300 hover:scale-105'
                        }`}
                      >
                        {isCurrent && (
                          <span className="text-3xl absolute -top-5 animate-pulse">🐸</span>
                        )}
                        <span className="text-xl font-black text-emerald-900 dark:text-emerald-100 font-mono">
                          {num}
                        </span>
                        <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300">Nilüfer</span>
                      </button>
                    );
                  })}
                </div>

                {/* Alt Kontrol ve Bilgi Grubu */}
                <div className="w-full flex flex-col items-center gap-4 mt-auto pt-6">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-foreground">
                      {frogStepIndex >= 4 ? (
                        <span className="text-emerald-600 font-bold">🎉 Kurbağa gölü geçti! 5, 10, 15, 20!</span>
                      ) : (
                        <span>Sıradaki zıplanacak sayı: <span className="text-emerald-600 text-lg font-mono font-black">{[5, 10, 15, 20][frogStepIndex]}</span></span>
                      )}
                    </span>
                  </div>

                  <button
                    onClick={() => speakText('Kurbağayı beşer beşer zıplat! 5, sonra 10, sonra 15, sonra 20!')}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-md hover:scale-102 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-5 h-5 animate-pulse" />
                    <span>🔊 Sesli Yönergeyi Yeniden Dinle</span>
                  </button>
                </div>
              </div>
            )}

            {/* F7) İLKOKUL 1: RENKLİ ŞEKİL ÖRÜNTÜSÜ */}
            {missionType === 'pattern_blocks' && (
              <div className="w-full h-full relative flex flex-col items-center justify-between p-6 select-none min-h-[500px]">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black text-xs">
                    <span>🔴 🟦 Renkli Şekil Örüntüsü</span>
                  </div>
                </div>

                {/* Örüntü Dizisi */}
                <div className="w-full max-w-3xl flex flex-col items-center my-6">
                  <div className="flex items-center gap-3 p-5 rounded-3xl bg-card border-2 border-border shadow-lg flex-wrap justify-center">
                    <span className="text-4xl animate-pulse">🔴</span>
                    <span className="text-4xl animate-pulse">🟦</span>
                    <span className="text-4xl animate-pulse">🔴</span>
                    <span className="text-4xl animate-pulse">🟦</span>
                    <span className="text-4xl animate-pulse">🔴</span>
                    <div className="w-16 h-16 rounded-2xl border-3 border-dashed border-rose-500 bg-rose-500/10 flex items-center justify-center text-3xl font-black text-rose-600">
                      {patternChoice === 'blue_square' ? '🟦' : '?'}
                    </div>
                  </div>

                  {/* Seçim Butonları */}
                  <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
                    <button
                      onClick={() => {
                        setPatternChoice('red_circle');
                        speakText('Kırmızı Daire değil, kurala tekrar bak!');
                      }}
                      className="px-6 py-4 rounded-2xl bg-white hover:bg-slate-50 border-2 border-border text-foreground font-black text-sm shadow-md transition-transform hover:scale-105 cursor-pointer dark:bg-slate-900 flex items-center gap-2"
                    >
                      <span className="text-3xl">🔴</span>
                      <span>Kırmızı Daire</span>
                    </button>

                    <button
                      onClick={() => {
                        setPatternChoice('blue_square');
                        speakText('Tebrikler! Kırmızı, Mavi, Kırmızı, Mavi, Kırmızı... Sırada Mavi Kare olmalı!');
                        if (selectedActivity) markActivityCompleted(selectedActivity.id);
                        try {
                          confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
                        } catch (e) {}
                      }}
                      className={`px-6 py-4 rounded-2xl font-black text-sm border-2 shadow-md transition-transform hover:scale-105 cursor-pointer flex items-center gap-2 ${
                        patternChoice === 'blue_square'
                          ? 'bg-blue-600 text-white border-blue-700 scale-105'
                          : 'bg-white hover:bg-slate-50 border-border text-foreground dark:bg-slate-900'
                      }`}
                    >
                      <span className="text-3xl">🟦</span>
                      <span>Mavi Kare</span>
                    </button>

                    <button
                      onClick={() => {
                        setPatternChoice('yellow_circle');
                        speakText('Sarı Daire değil, örüntüde sadece kırmızı ve mavi var!');
                      }}
                      className="px-6 py-4 rounded-2xl bg-white hover:bg-slate-50 border-2 border-border text-foreground font-black text-sm shadow-md transition-transform hover:scale-105 cursor-pointer dark:bg-slate-900 flex items-center gap-2"
                    >
                      <span className="text-3xl">🟡</span>
                      <span>Sarı Daire</span>
                    </button>
                  </div>
                </div>

                {/* Alt Kontrol ve Bilgi Grubu */}
                <div className="w-full flex flex-col items-center gap-4 mt-auto pt-6">
                  <button
                    onClick={() => speakText('Örüntüyü takip et: Kırmızı Daire, Mavi Kare, Kırmızı Daire, Mavi Kare, Kırmızı Daire... Sırada ne gelmeli?')}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-sm shadow-md hover:scale-102 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-5 h-5 animate-pulse" />
                    <span>🔊 Sesli Yönergeyi Yeniden Dinle</span>
                  </button>
                </div>
              </div>
            )}

            {/* F8) İLKOKUL 1: ŞİPŞAK MEYVE TAHMİNİ */}
            {missionType === 'fruit_estimation' && (
              <div className="w-full h-full relative flex flex-col items-center justify-between p-6 select-none min-h-[500px]">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 font-black text-xs">
                    <span>🧺 Şipşak Meyve Tahmini</span>
                  </div>
                </div>

                {/* Sepet ve Meyveler */}
                <div className="w-full max-w-2xl p-6 rounded-[36px] bg-gradient-to-b from-amber-100/70 to-rose-100/50 dark:from-amber-950/30 dark:to-rose-950/20 border-2 border-amber-300 dark:border-amber-700/60 shadow-xl my-6 flex flex-col items-center">
                  <div className="text-sm font-black text-amber-900 dark:text-amber-200 mb-3">
                    🧺 Meyve Sepeti (Tahmin Et ve Tek Tek Dokunup Say!)
                  </div>

                  {/* 8 Elma Izgarası */}
                  <div className="grid grid-cols-4 gap-4 p-5 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-amber-200 shadow-inner">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
                      const isCounted = countedFruits.includes(num);
                      return (
                        <button
                          key={num}
                          onClick={() => {
                            if (!isCounted) {
                              const nextC = [...countedFruits, num];
                              setCountedFruits(nextC);
                              speakText(`${nextC.length}`);
                              if (nextC.length === 8) {
                                speakText('Tebrikler! Sepette tam 8 elma vardı!');
                                if (selectedActivity) markActivityCompleted(selectedActivity.id);
                                try {
                                  confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
                                } catch (e) {}
                              }
                            }
                          }}
                          className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-3xl border-2 transition-all cursor-pointer ${
                            isCounted
                              ? 'bg-rose-100 border-rose-500 scale-95 opacity-80'
                              : 'bg-white hover:bg-slate-50 border-rose-300 hover:scale-105 active:scale-95 shadow-md dark:bg-slate-800'
                          }`}
                        >
                          <span>🍎</span>
                          {isCounted && (
                            <span className="text-[10px] font-black text-rose-600 font-mono absolute bottom-1 bg-white/90 px-1 rounded-full">
                              {countedFruits.indexOf(num) + 1}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Tahmin Seçim Butonları */}
                  <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                    <span className="text-xs font-black text-muted-foreground mr-1">Tahminin:</span>
                    {[3, 8, 15].map((val) => (
                      <button
                        key={val}
                        onClick={() => {
                          setFruitEstimate(val);
                          speakText(`Tahminin: ${val} elma! Şimdi elmaları tek tek sayarak kontrol et!`);
                        }}
                        className={`px-4 py-2 rounded-xl font-black text-xs border-2 shadow-xs transition-all cursor-pointer ${
                          fruitEstimate === val
                            ? 'bg-pink-500 text-white border-pink-600 scale-105'
                            : 'bg-white hover:bg-slate-50 text-foreground border-border dark:bg-slate-900'
                        }`}
                      >
                        {val} Elma
                      </button>
                    ))}
                  </div>
                </div>

                {/* Alt Kontrol ve Bilgi Grubu */}
                <div className="w-full flex flex-col items-center gap-4 mt-auto pt-6">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-foreground">
                      Sayım: <span className="text-pink-600 text-lg font-mono font-black">{countedFruits.length} / 8 Elma Sayıldı</span>
                    </span>
                  </div>

                  <button
                    onClick={() => speakText('Sepette sence kaç elma var? Bir sayı tahmin et, sonra elmalara tek tek dokunarak say!')}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white font-black text-sm shadow-md hover:scale-102 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-5 h-5 animate-pulse" />
                    <span>🔊 Sesli Yönergeyi Yeniden Dinle</span>
                  </button>
                </div>
              </div>
            )}

            {/* G) İLKOKUL 1-2: YÖN VE KONUM LABİRENTİ (TAVŞAN & HAVUÇ) */}
            {missionType === 'spatial_grid' && (
              <div className="w-full h-full relative flex flex-col items-center justify-between p-6 select-none min-h-[500px]">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-xs">
                    <span>🐰 Tavşan &amp; Havuç Oyunu</span>
                  </div>
                </div>

                {/* 4x4 Izgara Labirent (Büyütüldü) */}
                <div className="grid grid-cols-4 gap-4 p-5 rounded-[32px] bg-card border-2 border-border shadow-xl transform scale-110 sm:scale-120 my-6">
                  {Array.from({ length: 16 }).map((_, idx) => {
                    const gx = idx % 4;
                    const gy = Math.floor(idx / 4);
                    const isRabbit = rabbitPos.x === gx && rabbitPos.y === gy;
                    const isCarrot = carrotPos.x === gx && carrotPos.y === gy;

                    return (
                      <div
                        key={idx}
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 flex items-center justify-center text-4xl transition-all ${isRabbit
                            ? 'bg-purple-100 dark:bg-purple-950 border-purple-500 shadow-md scale-105'
                            : isCarrot
                              ? 'bg-amber-100 dark:bg-amber-950 border-amber-500'
                              : 'bg-muted/40 border-border/70'
                          }`}
                      >
                        {isRabbit && '🐰'}
                        {isCarrot && !isRabbit && '🥕'}
                        {isRabbit && isCarrot && '🎉'}
                      </div>
                    );
                  })}
                </div>

                {/* Alt Kontrol Grubu (Beyaz Tahta Dostu - En Altta) */}
                <div className="w-full flex flex-col items-center gap-4 mt-auto pt-6">
                  {/* Sesli Yönergeyi Dinle Butonu */}
                  <button
                    onClick={() => speakText('Tavşanı havuca ulaştırmak için yön oklarına dokun! İleri, yukarı, aşağı ve sağa git!')}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-md hover:scale-102 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-5 h-5 animate-pulse" />
                    <span>🔊 Sesli Yönergeyi Yeniden Dinle</span>
                  </button>

                  {/* Dev Yön Tuşları */}
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        speakText('Yukarı');
                        setRabbitPos((p) => ({ ...p, y: Math.max(0, p.y - 1) }));
                      }}
                      className="px-6 py-4 rounded-2xl bg-slate-100 hover:bg-primary hover:text-white border-2 border-slate-200 dark:bg-slate-800 dark:border-slate-700 font-black text-sm sm:text-base shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      ⬆️ Yukarı
                    </button>
                    <button
                      onClick={() => {
                        speakText('Aşağı');
                        setRabbitPos((p) => ({ ...p, y: Math.min(3, p.y + 1) }));
                      }}
                      className="px-6 py-4 rounded-2xl bg-slate-100 hover:bg-primary hover:text-white border-2 border-slate-200 dark:bg-slate-800 dark:border-slate-700 font-black text-sm sm:text-base shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      ⬇️ Aşağı
                    </button>
                    <button
                      onClick={() => {
                        speakText('Sol');
                        setRabbitPos((p) => ({ ...p, x: Math.max(0, p.x - 1) }));
                      }}
                      className="px-6 py-4 rounded-2xl bg-slate-100 hover:bg-primary hover:text-white border-2 border-slate-200 dark:bg-slate-800 dark:border-slate-700 font-black text-sm sm:text-base shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      ⬅️ Sol
                    </button>
                    <button
                      onClick={() => {
                        speakText('Sağ');
                        setRabbitPos((p) => ({ ...p, x: Math.min(3, p.x + 1) }));
                      }}
                      className="px-6 py-4 rounded-2xl bg-slate-100 hover:bg-primary hover:text-white border-2 border-slate-200 dark:bg-slate-800 dark:border-slate-700 font-black text-sm sm:text-base shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      ➡️ Sağ
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* H) İLKOKUL: KUMBARA VE PARALARIMIZ */}
            {missionType === 'money_coins' && (
              <div className="w-full h-full relative flex flex-col items-center justify-center p-6 select-none">
                <div className="text-center space-y-2 mb-4">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-xs">
                    <span>💰 Kumbara Para Biriktirme Oyunu</span>
                    <button
                      onClick={() => speakText('Paralara dokunarak kumbaraya at ve tam 20 Lira biriktir!')}
                      className="p-1 rounded-md bg-amber-500 text-white hover:scale-110 transition-transform cursor-pointer"
                      title="Sesli Dinle"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-gradient-to-b from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/20 border-2 border-amber-300 dark:border-amber-700/60 shadow-lg flex flex-col items-center space-y-4 max-w-sm w-full">
                  <div className="text-6xl animate-pulse">🐷💰</div>
                  <div className="font-mono text-2xl font-black text-amber-700 dark:text-amber-300">
                    Kumbaradaki Para: {piggyTotal} ₺
                  </div>
                  <div className="text-xs text-muted-foreground font-bold">
                    Hedef: 20 ₺ Biriktirmek
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    {[1, 5, 10].map((coin) => (
                      <button
                        key={coin}
                        onClick={() => {
                          speakText(`${coin} Lira kumbaraya atıldı`);
                          setPiggyTotal((prev) => prev + coin);
                        }}
                        className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-md hover:scale-105 transition-all cursor-pointer"
                      >
                        +{coin} ₺ At
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setPiggyTotal(0);
                      }}
                      className="px-3 py-2 rounded-xl bg-muted border text-muted-foreground text-xs font-bold hover:bg-muted/80 transition-all cursor-pointer"
                    >
                      Sıfırla
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* I) İLKOKUL: ŞEKİL ÖRÜNTÜSÜ */}
            {missionType === 'pattern_blocks' && (
              <div className="w-full h-full relative flex flex-col items-center justify-center p-6 select-none">
                <div className="text-center space-y-2 mb-6">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-black text-xs">
                    <span>🎨 Renkli Şekil Örüntüsü</span>
                    <button
                      onClick={() => speakText('Örüntüyü dikkatle incele! Kırmızı, Mavi, Sarı... Soru işareti yerine hangi şekil gelmeli?')}
                      className="p-1 rounded-md bg-purple-500 text-white hover:scale-110 transition-transform cursor-pointer"
                      title="Sesli Dinle"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-6 rounded-3xl bg-card border-2 border-border shadow-lg">
                  <span className="text-4xl">🔴</span>
                  <span className="text-4xl">🟦</span>
                  <span className="text-4xl">🟡</span>
                  <span className="text-4xl">🔴</span>
                  <span className="text-4xl">🟦</span>
                  <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-purple-500 bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-3xl font-black text-purple-600">
                    {selectedPatternShape || '❓'}
                  </div>
                </div>
              </div>
            )}

            {/* J) 2. SINIF & TÜM KADEMELER: ŞEKİL GRAFİĞİ & SÜTUN GRAFİĞİ SİMÜLATÖRÜ */}
            {missionType === 'data_barchart' && (
              <div className="w-full h-full relative flex flex-col items-center justify-center p-4 sm:p-6 select-none overflow-y-auto">
                <div className="text-center space-y-2 mb-3">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-black text-xs">
                    <span>📊 {selectedActivity?.title || 'Sevilen Mevsimler Şekil Grafiği'}</span>
                    <button
                      onClick={() =>
                        speakText(
                          'Her yıldız 2 öğrenciyi temsil etmektedir. İlkbahar, Yaz, Sonbahar ve Kış mevsimlerini seçen öğrencileri inceleyelim!'
                        )
                      }
                      className="p-1 rounded-md bg-cyan-500 text-white hover:scale-110 transition-transform cursor-pointer"
                      title="Sesli Dinle"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-xl inline-block border border-amber-500/20">
                    📌 Not: Her ⭐ yıldız <span className="font-black underline">{starMultiplier} öğrenciyi</span> temsil eder.
                  </div>
                </div>

                <div className="flex flex-col xl:flex-row items-center justify-center gap-6 w-full max-w-4xl">
                  {/* Sol: İnteraktif Şekil Grafiği Kartı */}
                  <div className="flex-1 bg-card p-5 rounded-3xl border-2 border-border shadow-lg space-y-4 w-full">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="font-black text-xs text-foreground uppercase tracking-wider">
                        📈 İnteraktif Şekil Grafiği
                      </span>
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        Yıldızlara dokun veya +/- butonlarını kullan
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-3 sm:gap-4 items-end min-h-[220px] pt-4">
                      {barchartData.map((item, idx) => {
                        const totalStudents = item.count * starMultiplier;
                        return (
                          <div key={item.label} className="flex flex-col items-center gap-2">
                            {/* Yıldız Sütunu */}
                            <div className="flex flex-col-reverse items-center gap-1.5 min-h-[140px] justify-start p-2 rounded-2xl bg-muted/40 border border-border/80 w-full shadow-inner">
                              {Array.from({ length: item.count }).map((_, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="text-2xl sm:text-3xl animate-in zoom-in-50 duration-200 cursor-pointer hover:scale-125 transition-transform"
                                  title={`${item.label}: ${sIdx + 1}. yıldız (2 kişi)`}
                                  onClick={() =>
                                    speakText(
                                      `${item.label} mevsiminde ${item.count} yıldız var, yani ${totalStudents} öğrenci.`
                                    )
                                  }
                                >
                                  ⭐
                                </span>
                              ))}
                            </div>

                            {/* Kontrol Butonları */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setBarchartData((prev) =>
                                    prev.map((d, i) =>
                                      i === idx ? { ...d, count: Math.max(1, d.count - 1) } : d
                                    )
                                  );
                                }}
                                className="w-6 h-6 rounded-lg bg-muted text-foreground flex items-center justify-center font-bold text-xs hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                              >
                                -
                              </button>
                              <button
                                onClick={() => {
                                  setBarchartData((prev) =>
                                    prev.map((d, i) =>
                                      i === idx ? { ...d, count: Math.min(8, d.count + 1) } : d
                                    )
                                  );
                                }}
                                className="w-6 h-6 rounded-lg bg-muted text-foreground flex items-center justify-center font-bold text-xs hover:bg-emerald-500 hover:text-white transition-colors cursor-pointer"
                              >
                                +
                              </button>
                            </div>

                            {/* Mevsim Etiketi & Öğrenci Sayısı */}
                            <div className="text-center space-y-0.5">
                              <div className="font-black text-xs text-foreground flex items-center justify-center gap-1">
                                <span>{item.icon}</span>
                                <span>{item.label}</span>
                              </div>
                              <div className="text-[11px] font-mono font-black text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md">
                                {totalStudents} Öğrenci
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sağ: Sıklık ve Çetele Tablosu */}
                  <div className="w-full xl:w-72 bg-gradient-to-b from-card to-muted/30 p-5 rounded-3xl border-2 border-border shadow-lg space-y-3">
                    <div className="font-black text-xs text-foreground flex items-center gap-2 border-b pb-2">
                      <span>📋 Sıklık & Çetele Tablosu</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {barchartData.map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/80 shadow-2xs"
                        >
                          <div className="flex items-center gap-2 font-bold text-foreground">
                            <span>{item.icon}</span>
                            <span>{item.label}:</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-amber-500">{'⭐'.repeat(item.count)}</span>
                            <span className="font-black text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                              {item.count * starMultiplier}
                            </span>
                          </div>
                        </div>
                      ))}

                      <div className="pt-2 border-t flex items-center justify-between font-black text-xs text-foreground">
                        <span>Toplam Öğrenci:</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                          {barchartData.reduce((acc, d) => acc + d.count * starMultiplier, 0)} Öğrenci
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* K) OLASILIK ÇARKI */}
            {missionType === 'probability_spinner' && (
              <div className="w-full h-full relative flex flex-col items-center justify-center p-6 select-none">
                <div className="text-center space-y-2 mb-4">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-black text-xs">
                    <span>🎯 İnteraktif Olasılık Çarkı</span>
                  </div>
                </div>

                <div className="relative w-64 h-64 flex items-center justify-center">
                  <div className="absolute -top-3 z-20 text-3xl">🔻</div>
                  <div
                    className="w-56 h-56 rounded-full border-4 border-slate-800 shadow-2xl overflow-hidden relative transition-transform duration-[2000ms] cubic-bezier(0.2, 0.8, 0.2, 1)"
                    style={{ transform: `rotate(${spinnerAngle}deg)` }}
                  >
                    <div className="absolute inset-0 flex">
                      <div className="w-1/2 h-full bg-rose-500 flex items-center justify-center text-white font-black text-xs">
                        🔴 Kırmızı (1/2)
                      </div>
                      <div className="w-1/2 h-full bg-blue-500 flex items-center justify-center text-white font-black text-xs">
                        🔵 Mavi (1/2)
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleSpin}
                    disabled={isSpinning}
                    className="absolute z-30 w-16 h-16 rounded-full bg-white dark:bg-slate-900 border-4 border-amber-400 shadow-lg font-black text-xs text-foreground flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                  >
                    {isSpinning ? 'Dönüyor' : 'ÇEVİR'}
                  </button>
                </div>

                {spinHistory.length > 0 && (
                  <div className="mt-4 flex items-center gap-2 text-xs font-bold text-muted-foreground">
                    <span>Sonuçlar:</span>
                    {spinHistory.map((res, i) => (
                      <span key={i} className="px-2 py-0.5 bg-muted rounded-md font-mono">
                        {res}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* L) TABAN BLOKLARI & BASAMAK DEĞERİ */}
            {missionType === 'unit_cubes' && (
              <div className="w-full h-full relative flex flex-col items-center justify-center p-6 select-none overflow-y-auto">
                <div className="text-center space-y-1 mb-4">
                  <span className="font-black text-sm text-foreground">
                    🏢 3 Basamaklı Sayı Çözümleme Tablosu
                  </span>
                  <div className="font-mono text-xl font-black text-amber-600">
                    {placeHundreds * 100 + placeTens * 10 + placeOnes} = {placeHundreds} Yüzlük + {placeTens} Onluk + {placeOnes} Birlik
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 max-w-lg w-full">
                  {/* Yüzlük Levhalar */}
                  <div className="p-4 rounded-2xl bg-card border-2 border-border text-center space-y-2">
                    <span className="font-bold text-xs text-foreground">Yüzlükler (100)</span>
                    <div className="text-3xl font-mono font-black text-amber-600">{placeHundreds}</div>
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => setPlaceHundreds((p) => Math.max(0, p - 1))}
                        className="w-7 h-7 rounded-lg bg-muted font-bold text-xs"
                      >
                        -
                      </button>
                      <button
                        onClick={() => setPlaceHundreds((p) => Math.min(9, p + 1))}
                        className="w-7 h-7 rounded-lg bg-muted font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Onluk Bloklar */}
                  <div className="p-4 rounded-2xl bg-card border-2 border-border text-center space-y-2">
                    <span className="font-bold text-xs text-foreground">Onluklar (10)</span>
                    <div className="text-3xl font-mono font-black text-blue-600">{placeTens}</div>
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => setPlaceTens((p) => Math.max(0, p - 1))}
                        className="w-7 h-7 rounded-lg bg-muted font-bold text-xs"
                      >
                        -
                      </button>
                      <button
                        onClick={() => setPlaceTens((p) => Math.min(9, p + 1))}
                        className="w-7 h-7 rounded-lg bg-muted font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Birlik Küpler */}
                  <div className="p-4 rounded-2xl bg-card border-2 border-border text-center space-y-2">
                    <span className="font-bold text-xs text-foreground">Birlikler (1)</span>
                    <div className="text-3xl font-mono font-black text-emerald-600">{placeOnes}</div>
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => setPlaceOnes((p) => Math.max(0, p - 1))}
                        className="w-7 h-7 rounded-lg bg-muted font-bold text-xs"
                      >
                        -
                      </button>
                      <button
                        onClick={() => setPlaceOnes((p) => Math.min(9, p + 1))}
                        className="w-7 h-7 rounded-lg bg-muted font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sağ Alt Yüzen Kontroller (Zoom & Reset) */}
            <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-card/90 backdrop-blur-md border border-border p-1 rounded-2xl shadow-md z-10">
              <button
                onClick={() => setZoom((z) => Math.min(100, z * 1.2))}
                className="p-2 hover:bg-muted rounded-xl text-foreground"
                title="Yakınlaştır"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(15, z / 1.2))}
                className="p-2 hover:bg-muted rounded-xl text-foreground"
                title="Uzaklaştır"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setPan({ x: 0, y: 0 });
                  setZoom(36);
                }}
                className="p-2 hover:bg-muted rounded-xl text-foreground"
                title="Merkeze Sıfırla"
              >
                <Focus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* SAĞ: GÖREV MERKEZİ */}
        <div className="w-full lg:w-96 bg-card border-t lg:border-t-0 lg:border-l border-border p-5 space-y-5 overflow-y-auto select-none shrink-0 h-full min-h-0">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-500" />
              <h2 className="font-black text-sm text-foreground">Görev Merkezi</h2>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-black text-xs">
              İlerleme: {activeStep}/4
            </span>
          </div>

          {/* ADIM 1: AYARLA / EŞLEŞTİR */}
          <div className={`p-4 rounded-3xl border-2 transition-all ${activeStep === 1 ? 'bg-primary/5 border-primary shadow-xs' : 'bg-muted/30 border-border opacity-85'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-black flex items-center justify-center text-xs">
                  1
                </span>
                <h3 className="font-extrabold text-sm text-foreground">Ayarla ve Keşfet</h3>
              </div>
              {(prismVerified || slopeVerified || pizzaVerified || quadrantVerified || balanceVerified || circleVerified || tilesVerified) && (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              )}
            </div>

            <p className="text-xs text-muted-foreground mb-4 leading-relaxed font-medium">
              {missionType === 'algebraic_tiles' &&
                '(+2) den (-3) çıkarmak için 3 adet sıfır çifti (+/-) ekleyip negatif pulları çıkarmayı keşfedin.'}
              {missionType === 'data_barchart' &&
                'Şekil grafiğindeki her yıldızın (⭐) 2 öğrenciyi temsil ettiğini dikkate alarak mevsim verilerini ve sıklık tablosunu inceleyin.'}
              {missionType === 'probability_spinner' &&
                'Olasılık çarkını çevirerek ibrenin durduğu renkleri ve olasılık durumlarını (İmkânsız, Olabilir, Kesin) keşfedin.'}
              {missionType === 'unit_cubes' &&
                'Basamak tablosundaki Yüzlük, Onluk ve Birlikleri ayarlayarak 3 basamaklı sayıyı taban bloklarıyla modelleyin.'}
              {missionType === 'prism_volume' &&
                'Üç boyutu ayarla; 48 birim küplük ilk modeli kaydet ve farklı boyutlarla ikinci modeli oluştur.'}
              {missionType === 'balance_scale' &&
                'Kefeli terazideki ağırlıkları ve x değerini ayarlayarak teraziyi tam dengeye getirin.'}
              {missionType === 'slope_explorer' &&
                'Doğrunun eğimini (m = 2) ve y-kesenini (n = 1) ayarlayarak hedef doğrultuyu elde edin.'}
              {missionType === 'pizza_fractions' &&
                'Sol pizzadaki dilimleri boyayarak sağdaki 1/2 pizzaya eşitleyin.'}
              {missionType === 'quadrant_target' &&
                'Koordinatları I. Bölgedeki hedef noktaya (3; 2) denk getirin.'}
              {missionType === 'circle_radius' &&
                'Pergel açıklığını r = 3 br olacak şekilde ayarlayın.'}
            </p>

            {/* -1. SAYMA PULLARI KONTROLLERİ */}
            {missionType === 'algebraic_tiles' && (
              <div className="space-y-4 mb-4">
                <button
                  onClick={() =>
                    speakText(
                      '(+2) sayısından (-3) çıkarmak için kutuda 3 negatif pul olmadığından dışarıdan 3 adet sıfır çifti eklenir ve 3 negatif pul dışarı atılır. Geriye 5 adet pozitif pul kalır!'
                    )
                  }
                  className="w-full py-2.5 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 Sayma Pulları Kuralını Dinle</span>
                </button>

                <div className="p-3 bg-muted/40 rounded-2xl border text-xs space-y-1.5 font-medium">
                  <div className="flex justify-between font-bold">
                    <span>İlk Durum:</span>
                    <span className="font-mono text-blue-600">+2 (2 Pozitif Pul)</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Eklenen Sıfır Çifti:</span>
                    <span className="font-mono text-amber-600">3 Adet (+ / -)</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t">
                    <span>Çıkarılan Negatif Pul:</span>
                    <span className="font-mono text-rose-600">-3 (3 Negatif Pul)</span>
                  </div>
                </div>

                <button
                  onClick={handleVerifyTiles}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Modeli Doğrula &amp; Soruya Geç →
                </button>
              </div>
            )}

            {/* 0. ŞEKİL & SÜTUN GRAFİĞİ KONTROLLERİ */}
            {missionType === 'data_barchart' && (
              <div className="space-y-4 mb-4">
                <button
                  onClick={() =>
                    speakText(
                      'Her yıldız 2 öğrenciyi temsil eder. İlkbahar 8, Yaz 12, Sonbahar 6, Kış 4 öğrencidir. Grafiği inceleyip Doğrula butonuna bas!'
                    )
                  }
                  className="w-full py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-600 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 Grafiği Sesli Dinle</span>
                </button>

                <div className="p-3 bg-muted/40 rounded-2xl border text-xs space-y-1.5 font-medium">
                  <div className="flex justify-between font-bold">
                    <span>En Çok Sevilen Mevsim:</span>
                    <span className="font-black text-amber-600">☀️ Yaz (12 Öğrenci)</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>En Az Sevilen Mevsim:</span>
                    <span className="font-black text-cyan-600">❄️ Kış (4 Öğrenci)</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground pt-1 border-t">
                    <span>Mevsimler Farkı (Yaz - Kış):</span>
                    <span className="font-mono font-bold text-foreground">12 - 4 = 8 Kişi</span>
                  </div>
                </div>

                <button
                  onClick={handleVerifyBarchart}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Grafiği Doğrula &amp; Soruya Geç →
                </button>
              </div>
            )}

            {/* 1. PRİZMA HACMİ KONTROLLERİ */}
            {missionType === 'prism_volume' && (
              <div className="space-y-4 mb-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-foreground">Uzunluk (a)</span>
                    <span className="font-mono text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20 font-black">{prismLength}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={7}
                    step={1}
                    value={prismLength}
                    onChange={(e) => setPrismLength(parseInt(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-foreground">Genişlik (b)</span>
                    <span className="font-mono text-amber-600 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20 font-black">{prismWidth}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={6}
                    step={1}
                    value={prismWidth}
                    onChange={(e) => setPrismWidth(parseInt(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-foreground">Yükseklik (c)</span>
                    <span className="font-mono text-indigo-600 bg-indigo-500/10 px-2.5 py-0.5 rounded-lg border border-indigo-500/20 font-black">{prismHeight}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={7}
                    step={1}
                    value={prismHeight}
                    onChange={(e) => setPrismHeight(parseInt(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                <button
                  onClick={handleSavePrism}
                  className="w-full py-2.5 rounded-2xl bg-teal-500 hover:bg-teal-600 text-white font-black text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <Box className="w-4 h-4" />
                  <span>Bu prizmayı kaydet (V = {currentVolume})</span>
                </button>

                <button
                  onClick={handleVerifyPrisms}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all"
                >
                  İki prizmayı doğrula →
                </button>
              </div>
            )}

            {/* 2. DENGE VE EŞİTLİK (KEFELİ TERAZİ) KONTROLLERİ */}
            {missionType === 'balance_scale' && (
              <div className="space-y-4 mb-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span>x Ağırlığı (Bilinmeyen)</span>
                    <span className="font-mono text-primary font-black">{balanceXValue} kg</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={6}
                    step={1}
                    value={balanceXValue}
                    onChange={(e) => setBalanceXValue(parseInt(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-muted/40 rounded-2xl border border-border/70 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sol Kefe (2x + 4):</span>
                    <span className="font-mono font-black text-blue-600">{leftTotalWeight} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sağ Kefe (10):</span>
                    <span className="font-mono font-black text-emerald-600">{rightTotalWeight} kg</span>
                  </div>
                </div>

                <button
                  onClick={handleVerifyBalance}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all"
                >
                  Teraziyi Doğrula →
                </button>
              </div>
            )}

            {/* 3. LİSE EĞİM KONTROLLERİ */}
            {missionType === 'slope_explorer' && (
              <div className="space-y-4 mb-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span>m (Eğim)</span>
                    <span className="font-mono text-primary font-black">{slopeM}</span>
                  </div>
                  <input
                    type="range"
                    min={-4}
                    max={4}
                    step={0.5}
                    value={slopeM}
                    onChange={(e) => setSlopeM(parseFloat(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span>n (y-Kesen)</span>
                    <span className="font-mono text-rose-600 font-black">{interceptN}</span>
                  </div>
                  <input
                    type="range"
                    min={-5}
                    max={5}
                    step={1}
                    value={interceptN}
                    onChange={(e) => setInterceptN(parseInt(e.target.value))}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                </div>

                <button
                  onClick={handleVerifySlope}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all"
                >
                  Hedefi Doğrula →
                </button>
              </div>
            )}

            {/* 4. PIZZA KONTROLLERİ */}
            {missionType === 'pizza_fractions' && (
              <div className="space-y-4 mb-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Altıda boyalı dilim</span>
                    <span className="font-mono text-rose-600 font-black">{leftNumerator} / 6</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={6}
                    step={1}
                    value={leftNumerator}
                    onChange={(e) => setLeftNumerator(parseInt(e.target.value))}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                </div>

                <button
                  onClick={handleVerifyPizza}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all"
                >
                  Payları Doğrula →
                </button>
              </div>
            )}

            {/* 5. KOORDİNAT HEDEF KONTROLLERİ */}
            {missionType === 'quadrant_target' && (
              <div className="space-y-4 mb-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span>x Koordinatı</span>
                    <span className="font-mono text-primary font-black">{userX}</span>
                  </div>
                  <input
                    type="range"
                    min={-5}
                    max={5}
                    step={1}
                    value={userX}
                    onChange={(e) => setUserX(parseInt(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span>y Koordinatı</span>
                    <span className="font-mono text-primary font-black">{userY}</span>
                  </div>
                  <input
                    type="range"
                    min={-5}
                    max={5}
                    step={1}
                    value={userY}
                    onChange={(e) => setUserY(parseInt(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>

                <button
                  onClick={handleVerifyQuadrant}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all"
                >
                  Noktayı Doğrula →
                </button>
              </div>
            )}

            {/* 6. ÇEMBER KONTROLLERİ */}
            {missionType === 'circle_radius' && (
              <div className="space-y-4 mb-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Yarıçap (r)</span>
                    <span className="font-mono text-purple-600 font-black">{circleRadius} br</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={circleRadius}
                    onChange={(e) => setCircleRadius(parseInt(e.target.value))}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>

                <button
                  onClick={handleVerifyCircle}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all"
                >
                  Çemberi Doğrula →
                </button>
              </div>
            )}

            {/* 7a. İLKOKUL 1: EŞLEŞTİRME KONTROLLERİ */}
            {missionType === 'matching_pairs' && (
              <div className="space-y-4 mb-4">
                <button
                  onClick={() => speakText('Çorap ve eldivenleri renk ve şekillerine göre birbiriyle eşleştirin. Hepsini eşleştirdikten sonra Doğrula butonuna basın!')}
                  className="w-full py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 Görevi Sesli Dinle</span>
                </button>

                <div className="p-4 bg-muted/40 rounded-2xl border border-border/70 text-xs space-y-2 font-medium leading-relaxed">
                  <div className="font-bold text-foreground">
                    Eşleştirme İlerlemesi:
                  </div>
                  <div className="text-sm font-black text-emerald-600 font-mono">
                    {matchedSockIds.length / 2} / 3 Çift Eşleşti
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                    Tahtadaki kartlardan birbiriyle aynı renkteki çorap veya eldivenleri sırayla seçip eşleştirin.
                  </p>
                </div>

                <button
                  onClick={handleVerifyCount}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Eşleri Doğrula →
                </button>
              </div>
            )}

            {/* 7b. İLKOKUL 1: SIRAYLA ELMA TOPLAMA KONTROLLERİ */}
            {(missionType === 'apple_tree_collect' || missionType === 'counting_objects') && (
              <div className="space-y-4 mb-4">
                <button
                  onClick={() => speakText(`Elmaları sırayla toplayalım! Önce bir numaralı elmaya dokun! Sıradaki toplanacak elma ${nextAppleToCollect}`)}
                  className="w-full py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 Görevi Sesli Dinle</span>
                </button>

                <div className="p-4 bg-muted/40 rounded-2xl border border-border/70 text-xs space-y-2 font-medium leading-relaxed">
                  <div className="font-bold text-foreground">
                    Toplama İlerlemesi:
                  </div>
                  <div className="text-sm font-black text-rose-600 font-mono">
                    {nextAppleToCollect > 5 ? 'Tamamlandı! 🎉' : `${nextAppleToCollect - 1} / 5 Elma Toplandı`}
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                    Ağaçta bulunan elmaları üzerlerindeki numaralara dikkat ederek sırasıyla 1, 2, 3, 4, 5 şeklinde toplayın.
                  </p>
                </div>

                <button
                  onClick={handleVerifyCount}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Görevi Doğrula →
                </button>
              </div>
            )}

            {/* 7c. İLKOKUL 1: KEDİCİKLER ONLUK & BİRLİK KONTROLLERİ */}
            {missionType === 'kitten_ten_frames' && (
              <div className="space-y-4 mb-4">
                <button
                  onClick={() => speakText('14 kediciğin 10 tanesini onluk kutusuna topla, 1 onluk ve 4 birlik keşfet!')}
                  className="w-full py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 Görevi Sesli Dinle</span>
                </button>

                <div className="p-4 bg-muted/40 rounded-2xl border border-border/70 text-xs space-y-2 font-medium leading-relaxed">
                  <div className="font-bold text-foreground">
                    Onluk Gruplama:
                  </div>
                  <div className="text-sm font-black text-amber-600 font-mono">
                    {packedKittensCount === 10 ? '1 Onluk + 4 Birlik = 14' : `${packedKittensCount} / 10 Paketli`}
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                    10 Kediyi Paketle butonuna basarak 1 Onluk kutusu ve kalan 4 Birliği inceleyin.
                  </p>
                </div>

                <button
                  onClick={handleVerifyKitten}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Onluğu Doğrula →
                </button>
              </div>
            )}

            {/* 7d. İLKOKUL 1: TREN VAGONLARI KONTROLLERİ */}
            {missionType === 'train_wagons' && (
              <div className="space-y-4 mb-4">
                <button
                  onClick={() => speakText('Vagonları birinci vagondan başlayarak sırayla diz! Sıradaki vagonu seç!')}
                  className="w-full py-2.5 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 Görevi Sesli Dinle</span>
                </button>

                <div className="p-4 bg-muted/40 rounded-2xl border border-border/70 text-xs space-y-2 font-medium leading-relaxed">
                  <div className="font-bold text-foreground">
                    Dizilen Vagonlar:
                  </div>
                  <div className="text-sm font-black text-blue-600 font-mono">
                    {placedWagons.length === 5 ? '5 / 5 (Tren Hazır! 🚂)' : `${placedWagons.length} / 5 Vagon`}
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                    1. Vagon, 2. Vagon, 3. Vagon şeklinde sıra sayılarına göre vagonları ekleyin.
                  </p>
                </div>

                <button
                  onClick={handleVerifyTrain}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Treni Doğrula →
                </button>
              </div>
            )}

            {/* 7e. İLKOKUL 1: AZLIK & ÇOKLUK KONTROLLERİ */}
            {missionType === 'compare_quantities' && (
              <div className="space-y-4 mb-4">
                <button
                  onClick={() => speakText('Sol taraftaki 7 balon ile sağ taraftaki 4 balonu karşılaştır! Daha çok olanı seç!')}
                  className="w-full py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 Görevi Sesli Dinle</span>
                </button>

                <div className="p-4 bg-muted/40 rounded-2xl border border-border/70 text-xs space-y-2 font-medium leading-relaxed">
                  <div className="font-bold text-foreground">
                    Karşılaştırma:
                  </div>
                  <div className="text-sm font-black text-rose-600 font-mono">
                    {compareChoice === 'left' ? 'Sol Taraf Seçildi (7 > 4)' : compareChoice ? 'Seçim Yapıldı' : 'Seçim Bekleniyor'}
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                    Hangi taraftaki balon grubunun daha çok olduğunu butonlara basarak belirleyin.
                  </p>
                </div>

                <button
                  onClick={handleVerifyCompare}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Karşılaştırmayı Doğrula →
                </button>
              </div>
            )}

            {/* 7f. İLKOKUL 1: KURBAĞA RİTMİK SAYMA KONTROLLERİ */}
            {missionType === 'frog_rhythmic' && (
              <div className="space-y-4 mb-4">
                <button
                  onClick={() => speakText('Kurbağayı beşer beşer zıplat! 5, sonra 10, sonra 15, sonra 20!')}
                  className="w-full py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 Görevi Sesli Dinle</span>
                </button>

                <div className="p-4 bg-muted/40 rounded-2xl border border-border/70 text-xs space-y-2 font-medium leading-relaxed">
                  <div className="font-bold text-foreground">
                    Ritmik İlerleme:
                  </div>
                  <div className="text-sm font-black text-emerald-600 font-mono">
                    {frogStepIndex >= 4 ? '20’ye Ulaştı! 🎉' : `${[5, 10, 15, 20][frogStepIndex]} Sayısına Zıpla`}
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                    Nilüfer yapraklarına dokunarak kurbağayı 5’er 5’er 20’ye kadar zıplatın.
                  </p>
                </div>

                <button
                  onClick={handleVerifyFrog}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Ritmik Saymayı Doğrula →
                </button>
              </div>
            )}

            {/* 7g. İLKOKUL 1: RENKLİ ŞEKİL ÖRÜNTÜSÜ KONTROLLERİ */}
            {missionType === 'pattern_blocks' && (
              <div className="space-y-4 mb-4">
                <button
                  onClick={() => speakText('Kırmızı Daire, Mavi Kare, Kırmızı Daire, Mavi Kare... Sırada hangi şekil gelmeli?')}
                  className="w-full py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 Görevi Sesli Dinle</span>
                </button>

                <div className="p-4 bg-muted/40 rounded-2xl border border-border/70 text-xs space-y-2 font-medium leading-relaxed">
                  <div className="font-bold text-foreground">
                    Örüntü Durumu:
                  </div>
                  <div className="text-sm font-black text-blue-600 font-mono">
                    {patternChoice === 'blue_square' ? '🟦 Mavi Kare (Doğru)' : patternChoice ? 'Farklı Şekil Seçildi' : 'Seçim Bekleniyor'}
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                    Dizilim kuralına göre soru işareti yerine gelecek doğru şekli seçin.
                  </p>
                </div>

                <button
                  onClick={handleVerifyPattern}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-blue-600 hover:from-rose-600 hover:to-blue-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Örüntüyü Doğrula →
                </button>
              </div>
            )}

            {/* 7h. İLKOKUL 1: ŞİPŞAK MEYVE TAHMİNİ KONTROLLERİ */}
            {missionType === 'fruit_estimation' && (
              <div className="space-y-4 mb-4">
                <button
                  onClick={() => speakText('Sepetteki meyve sayısını tahmin et, sonra tek tek dokunarak say!')}
                  className="w-full py-2.5 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 Görevi Sesli Dinle</span>
                </button>

                <div className="p-4 bg-muted/40 rounded-2xl border border-border/70 text-xs space-y-2 font-medium leading-relaxed">
                  <div className="font-bold text-foreground">
                    Tahmin &amp; Sayım:
                  </div>
                  <div className="text-sm font-black text-pink-600 font-mono">
                    {countedFruits.length === 8 ? '8 / 8 Elma Sayıldı! 🍎' : `${countedFruits.length} / 8 Elma Sayıldı`}
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                    Önce tahminde bulunun, ardından sepetteki tüm elmaları tek tek sayın.
                  </p>
                </div>

                <button
                  onClick={handleVerifyEstimation}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Tahmini Doğrula →
                </button>
              </div>
            )}

            {/* 8. İLKOKUL 1-2: LABİRENT KONTROLLERİ */}
            {missionType === 'spatial_grid' && (
              <div className="space-y-4 mb-4">
                <button
                  onClick={() => speakText('Tavşanı havuca ulaştırınca Doğrula butonuna bas!')}
                  className="w-full py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 Yönergeyi Dinle</span>
                </button>

                <div className="p-3 bg-muted/40 rounded-2xl border text-xs space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>Tavşan Konumu:</span>
                    <span className="font-mono text-purple-600">({rabbitPos.x}, {rabbitPos.y})</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Havuç Konumu:</span>
                    <span className="font-mono text-amber-600">(3, 3)</span>
                  </div>
                </div>

                <button
                  onClick={handleVerifyRabbit}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Labirenti Doğrula →
                </button>
              </div>
            )}

            {/* 9. İLKOKUL: KUMBARA KONTROLLERİ */}
            {missionType === 'money_coins' && (
              <div className="space-y-4 mb-4">
                <button
                  onClick={() => speakText('Kumbaranda tam 20 Lira olunca Doğrula butonuna bas!')}
                  className="w-full py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 Görevi Dinle</span>
                </button>

                <button
                  onClick={handleVerifyPiggy}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Kumbarayı Doğrula (20 ₺) →
                </button>
              </div>
            )}

            {/* 10. İLKOKUL: ÖRÜNTÜ KONTROLLERİ */}
            {missionType === 'pattern_blocks' && (
              <div className="space-y-4 mb-4">
                <div className="text-xs font-bold text-foreground">
                  Soru işareti yerine gelecek şekli seç:
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { shape: '🔴', label: 'Kırmızı Daire' },
                    { shape: '🟦', label: 'Mavi Kare' },
                    { shape: '🟡', label: 'Sarı Daire' },
                  ].map((item) => {
                    const isSelected = selectedPatternShape === item.shape;
                    return (
                      <button
                        key={item.shape}
                        onClick={() => {
                          speakText(item.label);
                          setSelectedPatternShape(item.shape);
                        }}
                        className={`py-3 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-xs transition-all cursor-pointer ${isSelected
                            ? 'bg-purple-500 text-white scale-105 shadow-md ring-2 ring-purple-300'
                            : 'bg-muted/70 hover:bg-muted text-foreground border border-border/80'
                          }`}
                      >
                        <span className="text-2xl">{item.shape}</span>
                        <span className="text-[9px] font-bold">{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={handleVerifyPattern}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Örüntüyü Doğrula →
                </button>
              </div>
            )}

            {/* 11. OLASILIK ÇARKI KONTROLLERİ */}
            {missionType === 'probability_spinner' && (
              <div className="space-y-4 mb-4">
                <button
                  onClick={handleVerifySpinner}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Olasılıkları Doğrula →
                </button>
              </div>
            )}

            {/* 12. TABAN BLOKLARI KONTROLLERİ */}
            {missionType === 'unit_cubes' && (
              <div className="space-y-4 mb-4">
                <button
                  onClick={handleVerifyUnitCubes}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Modeli Doğrula →
                </button>
              </div>
            )}
          </div>

          {/* ADIM 2: KARAR VER */}
          <div className={`p-4 rounded-3xl border-2 transition-all ${activeStep === 2 ? 'bg-primary/5 border-primary shadow-xs' : 'bg-muted/30 border-border opacity-70'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-black flex items-center justify-center text-xs">
                  2
                </span>
                <h3 className="font-extrabold text-sm text-foreground">Karar Ver</h3>
              </div>
              {step2Verified && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            </div>

            {activeStep >= 2 && (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-foreground font-semibold leading-relaxed">
                  {missionType === 'algebraic_tiles' &&
                    'Sayma pulları modeline göre (+2) - (-3) çıkarma işleminin sonucu kaçtır?'}
                  {missionType === 'data_barchart' &&
                    'Şekil grafiğine göre en çok sevilen mevsim hangisidir ve bu mevsimi toplam kaç öğrenci seçmiştir?'}
                  {missionType === 'probability_spinner' &&
                    'Tamamı kırmızı olan bir çarktan kırmızı gelme durumu hangi olasılık kavramıdır?'}
                  {missionType === 'unit_cubes' &&
                    '4 Yüzlük + 5 Onluk + 6 Birlik hangi 3 basamaklı sayıyı oluşturur?'}
                  {missionType === 'counting_objects' && '5 elmanın yanına 2 elma daha eklersek toplam kaç elma olur?'}
                  {missionType === 'spatial_grid' && 'Tavşanı başlangıç noktasından havuca götürmek için hangi yöne ilerledik?'}
                  {missionType === 'money_coins' && 'Kumbaraya 2 adet 10 TL attığımızda toplam kaç TL olur?'}
                  {missionType === 'pattern_blocks' && 'Örüntü kuralı kaç adımda bir kendini tekrar etmektedir?'}
                  {missionType === 'prism_volume' && 'Uzunluğu 5, genişliği 4 ve yüksekliği 3 olan bir prizmanın hacmi kaç birim küptür?'}
                  {missionType === 'balance_scale' && '2x + 4 = 10 denkleminde terazinin dengede kalması için x değeri kaç olmalıdır?'}
                  {missionType === 'slope_explorer' && 'y = 2x + 1 doğrusunda x değeri 1 birim arttığında y değeri kaç birim artar?'}
                  {missionType === 'pizza_fractions' && '3/6 kesri aşağıdaki kesirlerden hangisine denktir?'}
                  {missionType === 'quadrant_target' && '(3; 2) koordinatları analitik düzlemde kaçıncı bölgededir?'}
                  {missionType === 'circle_radius' && 'Yarıçapı r = 3 olan çemberin çapı (2r) kaç birimdir?'}
                </p>

                <div className="space-y-1.5">
                  {(missionType === 'algebraic_tiles'
                    ? ['+5 (5 adet pozitif pul)', '-1', '-5', '+1']
                    : missionType === 'data_barchart'
                      ? [
                        '☀️ Yaz Mevsimi (6 yıldız × 2 = 12 öğrenci)',
                        '🌸 İlkbahar Mevsimi (4 öğrenci)',
                        '❄️ Kış Mevsimi (8 öğrenci)',
                        '🍂 Sonbahar Mevsimi (6 öğrenci)',
                      ]
                      : missionType === 'probability_spinner'
                        ? ['Kesin Olay (%100)', 'İmkânsız Olay (%0)', 'Olabilir (Eşit Olasılık)']
                        : missionType === 'unit_cubes'
                          ? ['456', '546', '654', '465']
                          : missionType === 'prism_volume'
                            ? ['12 birim küp', '20 birim küp', '60 birim küp (5×4×3)', '48 birim küp']
                            : missionType === 'balance_scale'
                              ? ['x = 2', 'x = 3', 'x = 4', 'x = 5']
                              : missionType === 'slope_explorer'
                                ? ['2 birim (Eğim = 2)', '1 birim', '3 birim', '4 birim']
                                : missionType === 'pizza_fractions'
                                  ? ['1/4', '1/2', '2/3', '3/4']
                                  : missionType === 'quadrant_target'
                                    ? ['I. Bölge (+, +)', 'II. Bölge (-, +)', 'III. Bölge (-, -)', 'IV. Bölge (+, -)']
                                    : ['3 br', '4 br', '6 br (2×3)', '9 br']
                  ).map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedOption(idx)}
                      className={`w-full p-2.5 rounded-2xl text-xs font-bold text-left transition-all border cursor-pointer ${selectedOption === idx
                          ? 'bg-primary/15 border-primary text-primary shadow-2xs scale-[1.01]'
                          : 'bg-card border-border hover:bg-muted text-foreground'
                        }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleVerifyStep2}
                  disabled={selectedOption === null}
                  className="w-full py-2.5 rounded-2xl bg-primary text-primary-foreground font-black text-xs hover:opacity-90 disabled:opacity-40 transition-all shadow-xs cursor-pointer"
                >
                  Cevabı Kontrol Et
                </button>
              </div>
            )}
          </div>

          {/* ADIM 3: AÇIKLA */}
          <div className={`p-4 rounded-3xl border-2 transition-all ${activeStep === 3 ? 'bg-emerald-500/10 border-emerald-500' : 'bg-muted/30 border-border opacity-70'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-xs">
                3
              </span>
              <h3 className="font-extrabold text-sm text-foreground">Açıkla</h3>
            </div>

            {activeStep >= 3 && (
              <div className="space-y-3 pt-1 text-xs text-muted-foreground">
                <p className="text-foreground font-bold leading-relaxed">
                  {missionType === 'algebraic_tiles' &&
                    'Tebrikler! (+2) sayısından (-3) çıkarmak için modele 3 adet sıfır çifti (+ / -) eklenir ve 3 negatif pul dışarı atıldığında sonuçta +5 pozitif pul kaldığını ispatladınız: (+2) - (-3) = (+2) + (+3) = +5.'}
                  {missionType === 'data_barchart' &&
                    'Tebrikler! Şekil grafiğindeki her bir sembolün (⭐) 2 öğrenciyi temsil ettiğini ve en çok sevilen mevsimin Yaz (6 × 2 = 12 öğrenci) olduğunu başarıyla hesapladınız.'}
                  {missionType === 'probability_spinner' &&
                    'Tebrikler! Gerçekleşmesi %100 kesin olan olaylara "Kesin Olay", imkânsız olanlara "İmkânsız Olay" dendiğini kavradınız.'}
                  {missionType === 'unit_cubes' &&
                    'Tebrikler! Basamak değerlerinin (4×100 + 5×10 + 6×1 = 456) sayının toplam büyüklüğünü belirlediğini gördünüz.'}
                  {missionType === 'prism_volume' &&
                    'Tebrikler! Prizmanın taban alanı ve yüksekliğinin çarpımıyla hacmin (V = a × b × c) hesaplandığını ispatladın.'}
                  {missionType === 'balance_scale' &&
                    'Harika! Eşitliğin her iki tarafından aynı miktar çıkarıldığında (2x = 6) dengenin korunduğunu ve x = 3 olduğunu gördünüz.'}
                  {missionType === 'slope_explorer' &&
                    'Tebrikler! Eğim m, dikey değişimin yatay değişime oranıdır (Δy / Δx). m = 2 doğrunun dikliğini belirler.'}
                  {missionType === 'pizza_fractions' &&
                    'Harika! Kesir genişletme ve sadeleştirme mantığıyla 3/6 ve 1/2 kesirlerinin aynı büyüklüğü temsil ettiğini kanıtladınız.'}
                  {missionType === 'quadrant_target' &&
                    'Tebrikler! x > 0 ve y > 0 olduğunda noktanın analitik düzlemin I. Bölgesinde yer aldığını keşfettiniz.'}
                  {missionType === 'circle_radius' &&
                    'Harika! Çemberin tüm noktalarının merkeze eşit uzaklıkta (r) olduğunu ve çapın 2r olduğunu incelediniz.'}
                </p>

                <button
                  onClick={() => setActiveStep(4)}
                  className="w-full py-2.5 rounded-2xl bg-primary text-primary-foreground font-black text-xs shadow-md hover:opacity-90 transition-all cursor-pointer"
                >
                  Notlara Geç →
                </button>
              </div>
            )}
          </div>

          {/* ADIM 4: NOTLAR */}
          <div className={`p-4 rounded-3xl border-2 transition-all ${activeStep === 4 ? 'bg-indigo-500/10 border-indigo-500' : 'bg-muted/30 border-border opacity-70'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center text-xs">
                4
              </span>
              <h3 className="font-extrabold text-sm text-foreground">Notlar ve Özet</h3>
            </div>

            {activeStep === 4 && (
              <div className="space-y-3 pt-1 text-xs text-muted-foreground">
                <div className="p-3 bg-card rounded-2xl border border-border space-y-1.5 font-medium text-foreground">
                  <div className="font-black text-primary">Kavram Özeti:</div>
                  {missionType === 'algebraic_tiles' && (
                    <>
                      <div>• Tam Sayılarda Çıkarma: a - (-b) = a + (+b)</div>
                      <div>• Sıfır Çifti: Bir (+) ve bir (-) pulun değeri 0&apos;dır.</div>
                      <div>• Çıkarma Modellemesi: Olmayan pullar yerine sıfır çifti eklenir.</div>
                    </>
                  )}
                  {missionType === 'data_barchart' && (
                    <>
                      <div>• Şekil Grafiği: Verilerin şekil veya sembollerle gösterilmesidir.</div>
                      <div>• Not Kuralı: 'Her şekil X kişiyi temsil eder' bilgisine dikkat edilmelidir.</div>
                      <div>• Sıklık Tablosu: Verilerin doğrudan sayısal karşılığıdır.</div>
                    </>
                  )}
                  {missionType === 'prism_volume' && (
                    <>
                      <div>• Dikdörtgenler Prizması: V = a × b × c</div>
                      <div>• Küp Hacmi: V = a³</div>
                    </>
                  )}
                  {missionType === 'balance_scale' && (
                    <>
                      <div>• Eşitliğin Korunumu: Terazi prensibi</div>
                      <div>• ax + b = c ⇒ ax = c - b ⇒ x = (c - b)/a</div>
                    </>
                  )}
                  {missionType === 'slope_explorer' && (
                    <>
                      <div>• Doğru Denklemi: y = mx + n</div>
                      <div>• m: Eğim (Δy / Δx), n: y-eksenini kestiği nokta</div>
                    </>
                  )}
                  {missionType === 'pizza_fractions' && (
                    <>
                      <div>• Denk Kesirler: a/b = (a×k)/(b×k)</div>
                      <div>• 3/6 = 1/2 = 50%</div>
                    </>
                  )}
                  {missionType === 'quadrant_target' && (
                    <>
                      <div>• I. Bölge: (+, +) | II. Bölge: (-, +)</div>
                      <div>• III. Bölge: (-, -) | IV. Bölge: (+, -)</div>
                    </>
                  )}
                  {missionType === 'circle_radius' && (
                    <>
                      <div>• Çap: R = 2r</div>
                      <div>• Çevre = 2πr | Alan = πr²</div>
                    </>
                  )}
                </div>

                <button
                  onClick={openStudioMode}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs shadow-lg hover:opacity-95 transition-all cursor-pointer"
                >
                  Serbest Stüdyoda Çizime Başla →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
