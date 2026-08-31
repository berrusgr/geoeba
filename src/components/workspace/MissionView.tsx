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

  // 14. KARIŞ VE ADIM İLE UZUNLUK ÖLÇÜMÜ (1. Sınıf Standart Olmayan Ölçme)
  const [placedSpans, setPlacedSpans] = useState<number>(0);
  const targetSpans = 6;
  const [spanVerified, setSpanVerified] = useState<boolean>(false);

  const handleAddSpan = () => {
    if (placedSpans < 6) {
      const next = placedSpans + 1;
      setPlacedSpans(next);
      speakText(`${next}. karış yerleştirildi`);
      if (next === targetSpans) {
        setSpanVerified(true);
        speakText('Tebrikler! Masanın boyu tam 6 karış!');
        if (selectedActivity) markActivityCompleted(selectedActivity.id);
        try {
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
        } catch (e) {}
      }
    }
  };

  const handleRemoveSpan = () => {
    if (placedSpans > 0) {
      setPlacedSpans((prev) => prev - 1);
      setSpanVerified(false);
    }
  };

  const handleResetSpans = () => {
    setPlacedSpans(0);
    setSpanVerified(false);
  };

  const handleVerifySpans = () => {
    if (placedSpans === targetSpans) {
      setSpanVerified(true);
      speakText('Tebrikler! Sıranın uzunluğu 6 karış olarak doğru ölçüldü!');
      if (selectedActivity) markActivityCompleted(selectedActivity.id);
      try {
        confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
      } catch (e) {}
    } else {
      speakText(`Masa henüz tam ölçülmedi. Masayı doldurmak için ${targetSpans - placedSpans} karış daha yerleştir!`);
    }
  };

  // 15. PİSAGOR TEOREMİ & DİK ÜÇGEN MODELLERİ (8. Sınıf LGS)
  const [pythA, setPythA] = useState<number>(3);
  const [pythB, setPythB] = useState<number>(4);
  const [pythScenario, setPythScenario] = useState<'abstract' | 'ladder' | 'tree'>('abstract');
  const [pythVerified, setPythVerified] = useState<boolean>(false);
  const pythC = Math.round(Math.sqrt(pythA * pythA + pythB * pythB) * 100) / 100;
  const isPythSpecial = Number.isInteger(pythC);

  const handleVerifyPythagoras = () => {
    setPythVerified(true);
    speakText(`Harika! a kare artı b kare eşittir c kare. ${pythA} karesi artı ${pythB} karesi eşittir ${pythC} karesi.`);
    if (selectedActivity) markActivityCompleted(selectedActivity.id);
    try {
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
    } catch (e) {}
  };

  // 16. KAREKÖKLÜ SAYILAR & ALAN-KENAR İLİŞKİSİ (8. Sınıf LGS)
  const [sqrtArea, setSqrtArea] = useState<number>(25);
  const [sqrtVerified, setSqrtVerified] = useState<boolean>(false);
  const sqrtVal = Math.round(Math.sqrt(sqrtArea) * 100) / 100;
  const isPerfectSquare = Number.isInteger(Math.sqrt(sqrtArea));

  const handleVerifySqrt = () => {
    setSqrtVerified(true);
    if (isPerfectSquare) {
      speakText(`Tebrikler! Alanı ${sqrtArea} olan karenin bir kenarı tam karekök ${sqrtArea} yani ${sqrtVal} birimdir.`);
    } else {
      const lowerSquare = Math.floor(Math.sqrt(sqrtArea)) ** 2;
      const upperSquare = Math.ceil(Math.sqrt(sqrtArea)) ** 2;
      speakText(`Tebrikler! Karekök ${sqrtArea}, karekök ${lowerSquare} yani ${Math.floor(Math.sqrt(sqrtArea))} ile karekök ${upperSquare} yani ${Math.ceil(Math.sqrt(sqrtArea))} arasındadır.`);
    }
    if (selectedActivity) markActivityCompleted(selectedActivity.id);
    try {
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
    } catch (e) {}
  };

  // 17. EBOB & EKOK FAYANS VE PERİYODİK MODEL (6 & 8. Sınıf)
  const [roomW, setRoomW] = useState<number>(24);
  const [roomH, setRoomH] = useState<number>(36);
  const [tileSize, setTileSize] = useState<number>(6);
  const [ebobVerified, setEbobVerified] = useState<boolean>(false);

  // EBOB Hesaplayıcı
  const getGCD = (a: number, b: number): number => (b === 0 ? a : getGCD(b, a % b));
  const currentEBOB = getGCD(roomW, roomH);
  const currentEKOK = (roomW * roomH) / currentEBOB;
  const isTilePerfect = roomW % tileSize === 0 && roomH % tileSize === 0;
  const totalTilesCount = isTilePerfect ? (roomW / tileSize) * (roomH / tileSize) : 0;

  const handleSetEBOBTile = () => {
    setTileSize(currentEBOB);
    speakText(`En büyük ortak bölen EBOB bulundu: ${currentEBOB} cm. Odaya en az sayıda ${ (roomW/currentEBOB)*(roomH/currentEBOB) } adet kare fayans döşenir!`);
  };

  const handleVerifyEBOB = () => {
    if (isTilePerfect) {
      setEbobVerified(true);
      speakText(`Mükemmel! ${tileSize} cmlik fayanslarla oda tam kaplandı. Toplam ${totalTilesCount} adet fayans gerekir.`);
      if (selectedActivity) markActivityCompleted(selectedActivity.id);
      try {
        confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
      } catch (e) {}
    } else {
      speakText(`Seçilen ${tileSize} cmlik fayans odayı tam bölmüyor! Lütfen her iki kenarı da tam bölen bir ölçü seçiniz.`);
    }
  };

  // 18. ORAN, ORANTI, YÜZDE & İNDİRİM (7. Sınıf)
  const [priceItem, setPriceItem] = useState<number>(200);
  const [discountPercent, setDiscountPercent] = useState<number>(20);
  const [ratioVerified, setRatioVerified] = useState<boolean>(false);
  const discountAmount = (priceItem * discountPercent) / 100;
  const finalPrice = priceItem - discountAmount;

  const handleVerifyRatio = () => {
    setRatioVerified(true);
    speakText(`Tebrikler! ${priceItem} TL lik ürüne yüzde ${discountPercent} indirim uygulandığında indirim tutarı ${discountAmount} TL ve yeni fiyat ${finalPrice} TL olur.`);
    if (selectedActivity) markActivityCompleted(selectedActivity.id);
    try {
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
    } catch (e) {}
  };

  // 19. ASAL ÇARPAN AĞACI (6 & 8. Sınıf - Dinamik Matematik Motoru)
  const [treeNumber, setTreeNumber] = useState<number>(24);
  const [treeStep, setTreeStep] = useState<number>(1);
  const [treeVerified, setTreeVerified] = useState<boolean>(false);

  // Asal Sayı Kontrolü
  const isPrime = (n: number): boolean => {
    if (n < 2) return false;
    for (let i = 2; i * i <= n; i++) {
      if (n % i === 0) return false;
    }
    return true;
  };

  // En Küçük Asal Bölen
  const getSmallestPrime = (n: number): number => {
    for (let i = 2; i <= n; i++) {
      if (n % i === 0 && isPrime(i)) return i;
    }
    return n;
  };

  // Dinamik Adım Adım Ağaç Ayrıştırma
  const treeDecomposition = useMemo(() => {
    const steps: {
      parentVal: number;
      leftPrime: number;
      rightVal: number;
      rightIsPrime: boolean;
    }[] = [];

    let current = treeNumber;
    while (!isPrime(current) && current > 1) {
      const p = getSmallestPrime(current);
      const q = current / p;
      steps.push({
        parentVal: current,
        leftPrime: p,
        rightVal: q,
        rightIsPrime: isPrime(q),
      });
      current = q;
    }
    return steps;
  }, [treeNumber]);

  const maxTreeSteps = Math.max(1, treeDecomposition.length);

  // Üslü ve Asal Çarpan Özeti
  const primeSummary = useMemo(() => {
    const counts: { [k: number]: number } = {};
    treeDecomposition.forEach((st) => {
      counts[st.leftPrime] = (counts[st.leftPrime] || 0) + 1;
    });
    if (treeDecomposition.length > 0) {
      const last = treeDecomposition[treeDecomposition.length - 1];
      if (last.rightIsPrime) {
        counts[last.rightVal] = (counts[last.rightVal] || 0) + 1;
      }
    }

    const superDigits = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
    const expString = Object.entries(counts)
      .map(([prime, power]) => {
        const pStr = power > 1 ? power.toString().split('').map((d) => superDigits[parseInt(d)]).join('') : '';
        return `${prime}${pStr}`;
      })
      .join(' · ');

    const uniquePrimes = Object.keys(counts).join(', ');

    return {
      counts,
      expString: expString || `${treeNumber}`,
      uniquePrimes: uniquePrimes || `${treeNumber}`,
    };
  }, [treeDecomposition, treeNumber]);

  const handleNextTreeStep = () => {
    if (treeStep < maxTreeSteps) {
      const next = treeStep + 1;
      setTreeStep(next);
      speakText(`${next}. dal açıldı`);
      if (next === maxTreeSteps) {
        setTreeVerified(true);
        speakText(`Tebrikler! ${treeNumber} sayısının tüm asal çarpanları bulundu: ${primeSummary.expString}`);
        if (selectedActivity) markActivityCompleted(selectedActivity.id);
        try {
          confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
        } catch (e) {}
      }
    }
  };

  const handleResetTree = () => {
    setTreeStep(1);
    setTreeVerified(false);
  };

  const handleFullTree = () => {
    setTreeStep(maxTreeSteps);
    setTreeVerified(true);
    speakText(`${treeNumber} sayısının asal çarpan ağacı tamamlandı: ${primeSummary.expString}`);
    if (selectedActivity) markActivityCompleted(selectedActivity.id);
    try {
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
    } catch (e) {}
  };

  // 20. ERATOSTHENES KALBURU (1-100 Asal Sayılar)
  const [sieveEliminated, setSieveEliminated] = useState<number[]>([1]); // 1 her zaman asal değil
  const [sieveVerified, setSieveVerified] = useState<boolean>(false);

  const isSieveEliminated = (n: number) => {
    if (n === 1) return true;
    for (const p of sieveEliminated) {
      if (p > 1 && n > p && n % p === 0) return true;
    }
    return false;
  };

  const handleSieveEliminate = (prime: number) => {
    if (!sieveEliminated.includes(prime)) {
      const updated = [...sieveEliminated, prime];
      setSieveEliminated(updated);
      speakText(`${prime}'nin katları elendi`);
      if (updated.length >= 5) {
        setSieveVerified(true);
        speakText('Tebrikler! 100 e kadar olan 25 asal sayı bulundu.');
        if (selectedActivity) markActivityCompleted(selectedActivity.id);
        try {
          confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
        } catch (e) {}
      }
    }
  };

  const handleRunAllSieve = () => {
    setSieveEliminated([1, 2, 3, 5, 7]);
    setSieveVerified(true);
    speakText('100 e kadar olan tüm asal sayılar kalburdan süzüldü!');
    if (selectedActivity) markActivityCompleted(selectedActivity.id);
    try {
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
    } catch (e) {}
  };

  const handleResetSieve = () => {
    setSieveEliminated([1]);
    setSieveVerified(false);
  };

  // 21. BÖLÜNEBİLME KURALLARI MOTORU (2, 3, 4, 5, 6, 9, 10)
  const [divNum, setDivNum] = useState<number>(240);
  const [selectedDivRule, setSelectedDivRule] = useState<number>(2);

  const checkDivisibility = (num: number, divisor: number) => {
    return num % divisor === 0;
  };

  // 22. ORTAK BÖLENLER VE VENN ŞEMASI (18 & 24)
  const [vennA, setVennA] = useState<number>(18);
  const [vennB, setVennB] = useState<number>(24);

  const getDivisors = (n: number) => {
    const d: number[] = [];
    for (let i = 1; i <= n; i++) {
      if (n % i === 0) d.push(i);
    }
    return d;
  };

  const divisorsA = useMemo(() => getDivisors(vennA), [vennA]);
  const divisorsB = useMemo(() => getDivisors(vennB), [vennB]);
  const commonDivisors = useMemo(() => divisorsA.filter((x) => divisorsB.includes(x)), [divisorsA, divisorsB]);
  const onlyA = useMemo(() => divisorsA.filter((x) => !divisorsB.includes(x)), [divisorsA, divisorsB]);
  const onlyB = useMemo(() => divisorsB.filter((x) => !divisorsA.includes(x)), [divisorsA, divisorsB]);
  const ebobVal = useMemo(() => (commonDivisors.length > 0 ? Math.max(...commonDivisors) : 1), [commonDivisors]);

  // 23. ORTAK KATLAR VE RİTİM MODELİ (EKOK)
  const [rhythmA, setRhythmA] = useState<number>(4);
  const [rhythmB, setRhythmB] = useState<number>(6);

  const gcd = (a: number, b: number): number => (!b ? a : gcd(b, a % b));
  const ekokVal = useMemo(() => (rhythmA * rhythmB) / gcd(rhythmA, rhythmB), [rhythmA, rhythmB]);

  // 24. ALAN MODELİ İLE ÇARPANLAR (Dikdörtgenler)
  const [areaTarget, setAreaTarget] = useState<number>(36);
  const areaFactorPairs = useMemo(() => {
    const pairs: { w: number; h: number }[] = [];
    for (let i = 1; i * i <= areaTarget; i++) {
      if (areaTarget % i === 0) {
        pairs.push({ w: areaTarget / i, h: i });
      }
    }
    return pairs;
  }, [areaTarget]);
  const [selectedPairIdx, setSelectedPairIdx] = useState<number>(0);

  // 25. BÖLEN LİSTESİ (Asal Çarpan Algoritması)
  const [ladderNum, setLadderNum] = useState<number>(24);
  const [ladderStep, setLadderStep] = useState<number>(1);
  const ladderSteps = useMemo(() => {
    const list: { val: number; prime: number }[] = [];
    let current = ladderNum;
    while (current > 1) {
      const p = getSmallestPrime(current);
      list.push({ val: current, prime: p });
      current = current / p;
    }
    list.push({ val: 1, prime: 1 });
    return list;
  }, [ladderNum]);

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

  // Ekran veya görev değiştiğinde / bileşen kapandığında seslendirmeyi derhal durdur
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }
    };
  }, []);

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

    // Karış, Adım, Ayak ve Uzunluk Ölçümü
    if (
      prev === 'body_measurements' ||
      prev === 'span_measurement' ||
      selectedActivity?.id === 'act-1-olcme-karis' ||
      title.includes('karış') ||
      title.includes('adım') ||
      title.includes('kulaç') ||
      title.includes('standart olmayan')
    ) {
      return 'span_measurement';
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
    if (
      prev === 'pattern_blocks' ||
      prev === 'polygon_shapes' ||
      selectedActivity?.id === 'act-1-sayi-6' ||
      selectedActivity?.id === 'act-1-sekil-ayir' ||
      selectedActivity?.id === 'act-1-sekil-ev' ||
      selectedActivity?.id === 'act-1-sekil-kose' ||
      title.includes('örüntü') ||
      title.includes('şekil') ||
      title.includes('tangram')
    ) {
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

    // Pisagor Teoremi & Dik Üçgen (8. Sınıf)
    if (
      prev === 'pythagoras_theorem' ||
      title.includes('pisagor') ||
      title.includes('hipotenüs') ||
      title.includes('dik üçgen') ||
      desc.includes('pisagor')
    ) {
      return 'pythagoras_theorem';
    }

    // Kareköklü Sayılar & Alan-Kenar (8. Sınıf)
    if (
      prev === 'square_roots' ||
      prev === 'square_root_area' ||
      title.includes('karekök') ||
      title.includes('tam kare') ||
      desc.includes('karekök')
    ) {
      return 'square_roots';
    }

    // Eratosthenes Kalburu (6. Sınıf)
    if (
      prev === 'eratosthenes_sieve' ||
      selectedActivity?.id === 'act-6-eratosthenes' ||
      title.includes('eratosthenes') ||
      title.includes('kalbur') ||
      (title.includes('1-100') && title.includes('asal'))
    ) {
      return 'eratosthenes_sieve';
    }

    // Bölünebilme Kuralları (6. Sınıf)
    if (
      prev === 'divisibility_rules' ||
      title.includes('bölünebilme') ||
      title.includes('rakamlar toplamı') ||
      title.includes('bölünme')
    ) {
      return 'divisibility_rules';
    }

    // Venn Şeması & Ortak Bölenler (6. Sınıf)
    if (
      prev === 'venn_divisors' ||
      selectedActivity?.id === 'act-6-ortak-bolen' ||
      title.includes('ortak bölen') ||
      title.includes('venn')
    ) {
      return 'venn_divisors';
    }

    // Ritmik Ortak Katlar & EKOK (6. Sınıf)
    if (
      prev === 'rhythmic_multiples' ||
      selectedActivity?.id === 'act-6-ortak-kat' ||
      title.includes('ortak kat') ||
      title.includes('ritim modeli')
    ) {
      return 'rhythmic_multiples';
    }

    // Alan Modeli ile Çarpanlar (6. Sınıf)
    if (
      prev === 'area_rectangles' ||
      selectedActivity?.id === 'act-6-carpan-dikdortgen' ||
      (title.includes('çarpan') && title.includes('alan')) ||
      title.includes('dikdörtgen')
    ) {
      return 'area_rectangles';
    }

    // Bölen Listesi Algoritması (6. Sınıf)
    if (
      prev === 'division_ladder' ||
      selectedActivity?.id === 'act-6-asal-carpan-algoritma' ||
      title.includes('bölen listesi') ||
      title.includes('çarpan algoritma')
    ) {
      return 'division_ladder';
    }

    // Asal Çarpan Ağacı (6 & 8. Sınıf)
    if (
      prev === 'prime_factor_tree' ||
      selectedActivity?.id === 'act-6-asal-1' ||
      title.includes('çarpan ağacı') ||
      title.includes('asal çarpan ağacı') ||
      (title.includes('asal') && title.includes('ağaç')) ||
      (title.includes('asal çarpan') && !title.includes('ebob'))
    ) {
      return 'prime_factor_tree';
    }

    // EBOB & EKOK Fayans & Periyodik Olaylar (6 & 8. Sınıf)
    if (
      prev === 'ebob_ekok_tiles' ||
      title.includes('ebob') ||
      title.includes('ekok') ||
      title.includes('fayans') ||
      title.includes('katlar')
    ) {
      return 'ebob_ekok_tiles';
    }

    // Oran, Orantı, Yüzde & İndirim (7. Sınıf)
    if (
      prev === 'ratio_proportion' ||
      title.includes('oranti') ||
      title.includes('orantı') ||
      title.includes('yüzde') ||
      title.includes('indirim') ||
      title.includes('kâr') ||
      title.includes('kdv')
    ) {
      return 'ratio_proportion';
    }

    // Eğim ve Doğrusal Fonksiyon
    if (prev === 'slope_line' || title.includes('eğim') || title.includes('doğru') || cat === 'fonksiyon') {
      return 'slope_explorer';
    }

    return 'data_barchart';
  }, [mission, selectedActivity]);

  // Kapsamlı Pedagojik Veri (Karar Ver Soruları, Açıklamalar ve Notlar)
  const pedagogicalData = useMemo(() => {
    switch (missionType) {
      case 'prime_factor_tree':
        return {
          question: `${treeNumber} sayısının asal çarpanlarına ayrılmış üslü gösterimi aşağıdakilerden hangisidir?`,
          options: [
            `${treeNumber} = ${primeSummary.expString}`,
            `${treeNumber} = ${treeNumber} × 1`,
            `${treeNumber} = 2 × ${Math.floor(treeNumber / 2)}`,
            `${treeNumber} = 3 × ${Math.floor(treeNumber / 3)}`,
          ],
          correctIndex: 0,
          explanation: `Tebrikler! ${treeNumber} sayısı asal çarpanlarına ayrıştırıldığında en uçtaki asal yaprakların çarpımı ${primeSummary.expString} olur. Asal çarpanlar kümesi: { ${primeSummary.uniquePrimes} } olarak bulunur.`,
          summaryNotes: [
            `• Asal Çarpan Ağacı: Sayıyı 1'den büyük en küçük asal bölenlerine dallandırarak çözümler.`,
            `• Üslü Gösterim: Aynı asal çarpanların tekrar eden adedi üs olarak yazılır (${treeNumber} = ${primeSummary.expString}).`,
            `• Asal Sayı: Yalnızca 1'e ve kendisine bölünebilen 1'den büyük doğal sayılardır.`,
            `• Temel Aritmetik Teoremi: 1'den büyük her tam sayı, asal çarpanların çarpımı olarak tek bir şekilde yazılabilir.`,
          ],
        };

      case 'eratosthenes_sieve':
        return {
          question: '1 ile 100 arasındaki asal sayılarla ilgili aşağıdaki ifadelerden hangisi DOĞRUDUR?',
          options: [
            '100 e kadar toplam 25 adet asal sayı vardır ve en küçük asal sayı 2 dir.',
            '1 sayısı asal sayıdır.',
            'Tüm tek sayılar asal sayıdır.',
            'Çift sayıların hiçbiri asal olamaz.',
          ],
          correctIndex: 0,
          explanation: 'Tebrikler! 1 asal değildir. 2 sayısı hem en küçük hem de tek çift asal sayıdır. 2, 3, 5, 7 katları elendiğinde 1-100 arasında tam 25 asal sayı kalır.',
          summaryNotes: [
            '• Eratosthenes Kalburu: Bileşik sayıları katlarına göre eleyerek asal sayıları bulan antik yöntemdir.',
            '• 1-100 Arası 25 Asal Sayı: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97.',
            '• Çift Asal Kuralı: 2 haricindeki tüm çift sayılar 2 ye bölündüğü için asal değildir.',
          ],
        };

      case 'divisibility_rules':
        return {
          question: `${divNum} sayısının bölünebilme durumları incelendiğinde hangisi kesinlikle doğrudur?`,
          options: [
            divNum % 10 === 0
              ? `${divNum} sayısının son basamağı 0 olduğu için hem 2, hem 5 hem de 10 a kalansız bölünür.`
              : divNum % 2 === 0
              ? `${divNum} sayısı çift sayı olduğu için 2 ye kalansız bölünür.`
              : `${divNum} sayısı tek sayı olduğu için 2 ye bölünmez.`,
            'Rakamları toplamı çift olan her sayı 2 ye bölünür.',
            'Son basamağı 5 olan her sayı 10 a kalansız bölünür.',
            'Yalnızca 9 a bölünen sayılar 3 e bölünür.',
          ],
          correctIndex: 0,
          explanation: `Harika! ${divNum} sayısının son basamağı (${divNum % 10}) ve rakamlar toplamı kuralına göre bölünebilirlik tespiti başarıyla doğrulandı.`,
          summaryNotes: [
            '• 2 ile Bölünme: Son basamak çift (0, 2, 4, 6, 8) olmalıdır.',
            '• 3 ve 9 ile Bölünme: Rakamlar toplamı sırasıyla 3 veya 9 un katı olmalıdır.',
            '• 4 ile Bölünme: Son iki basamağın oluşturduğu sayı 00 veya 4 ün katı olmalıdır.',
            '• 5 ve 10 ile Bölünme: Son basamak 5 için (0, 5), 10 için (0) olmalıdır.',
            '• 6 ile Bölünme: Sayı hem 2 ye hem de 3 e aynı anda kalansız bölünmelidir.',
          ],
        };

      case 'venn_divisors':
        return {
          question: `${vennA} ve ${vennB} sayılarının En Büyük Ortak Böleni (EBOB) kaçtır?`,
          options: [
            `EBOB(${vennA}, ${vennB}) = ${ebobVal}`,
            `EBOB(${vennA}, ${vennB}) = 1`,
            `EBOB(${vennA}, ${vennB}) = ${vennA * vennB}`,
            `EBOB(${vennA}, ${vennB}) = ${Math.max(vennA, vennB)}`,
          ],
          correctIndex: 0,
          explanation: `Tebrikler! ${vennA} ve ${vennB} sayılarının ortak bölenler kümesi { ${commonDivisors.join(', ')} } olup bunların en büyüğü EBOB = ${ebobVal} dir.`,
          summaryNotes: [
            `• Ortak Bölen: İki veya daha fazla sayıyı aynı anda kalansız bölen pozitif tam sayılardır.`,
            `• EBOB (En Büyük Ortak Bölen): Ortak bölenlerin en büyüğüdür.`,
            `• Venn Şeması Kesişimi: İki kümenin kesişim bölgesi ortak bölenleri gösterir.`,
          ],
        };

      case 'rhythmic_multiples':
        return {
          question: `${rhythmA}'şar ve ${rhythmB}'şer ritmik saymada karşılaşılan ilk ortak kat (EKOK) kaçtır?`,
          options: [
            `EKOK(${rhythmA}, ${rhythmB}) = ${ekokVal}`,
            `EKOK = ${rhythmA + rhythmB}`,
            `EKOK = ${Math.abs(rhythmA - rhythmB)}`,
            `EKOK = ${rhythmA * rhythmB * 2}`,
          ],
          correctIndex: 0,
          explanation: `Harika! ${rhythmA} ve ${rhythmB} sayılarının pozitif katları sayı doğrusunda incelendiğinde buluştukları en küçük ortak kat EKOK = ${ekokVal} dir.`,
          summaryNotes: [
            `• Ortak Kat: Verilen sayıların her birine kalansız bölünebilen sayılardır.`,
            `• EKOK (En Küçük Ortak Kat): Sıfırdan farklı ortak katların en küçüğüdür.`,
            `• Ritim Modeli: İki farklı periyodun ilk çakıştığı anı bulmak için EKOK kullanılır.`,
          ],
        };

      case 'area_rectangles':
        return {
          question: `Alanı ${areaTarget} br² olan bir dikdörtgenin kenar uzunlukları aşağıdakilerden hangisi OLABİLİR?`,
          options: [
            `${areaFactorPairs[0]?.w || 6} br ve ${areaFactorPairs[0]?.h || 6} br (${areaTarget} = ${areaFactorPairs[0]?.w || 6} × ${areaFactorPairs[0]?.h || 6})`,
            '5 br ve 7 br',
            '10 br ve 4 br',
            '8 br ve 3 br',
          ],
          correctIndex: 0,
          explanation: `Tebrikler! Dikdörtgenin alanı Kenar × Kenar olduğundan, ${areaTarget} alanını veren tüm (En, Boy) ikilileri bu sayının çarpan çiftlerini oluşturur.`,
          summaryNotes: [
            `• Alan - Çarpan İlişkisi: Dikdörtgensel alan modelleri bir sayının tüm pozitif çarpanlarını somutlaştırır.`,
            `• Çevre Hesabı: Çevre = 2 × (En + Boy)`,
            `• Kare Özel Durumu: En = Boy olduğunda alan tam karedir (${areaTarget === 36 ? '6 × 6 = 36' : ''}).`,
          ],
        };

      case 'division_ladder':
        return {
          question: `${ladderNum} sayısının bölen listesi (asal çarpan algoritması) sonucunda elde edilen asal çarpanlar hangisidir?`,
          options: [
            `${ladderNum} = ${primeSummary.expString}`,
            `${ladderNum} = ${ladderNum} × 1`,
            `${ladderNum} = 2 + ${ladderNum - 2}`,
            `${ladderNum} = 10 × ${Math.floor(ladderNum / 10)}`,
          ],
          correctIndex: 0,
          explanation: `Harika! Dikey çizginin sağına en küçük asallardan başlayarak bölme yapıldığında sağdaki sayıların çarpımı ${ladderNum} sayısını verir.`,
          summaryNotes: [
            `• Bölen Listesi: Sayı 1 olana kadar en küçük asallara bölünerek dikey sırada yazılır.`,
            `• Sağdaki Asallar: Dikey çizginin sağındaki tüm sayıların çarpımı başlangıç sayısına eşittir.`,
          ],
        };

      case 'pythagoras_theorem':
        return {
          question: 'Kenarları a = 3 br ve b = 4 br olan dik üçgende hipotenüs c uzunluğu kaç birimdir?',
          options: ['5 br (3² + 4² = 9 + 16 = 25 = 5²)', '7 br (3 + 4)', '6 br', '8 br'],
          correctIndex: 0,
          explanation: 'Tebrikler! Pisagor bağıntısına göre dik kenarların kareleri toplamı hipotenüsün karesine eşittir: a² + b² = c² (9 + 16 = 25 ⇒ c = 5).',
          summaryNotes: [
            '• Pisagor Bağıntısı: Bir dik üçgende a² + b² = c²',
            '• Özel Dik Üçgenler: (3-4-5), (5-12-13), (6-8-10), (8-15-17), (7-24-25)',
            '• Alan Modeli: Dik kenarlar üzerine kurulan karelerin alanları toplamı, hipotenüs karesinin alanına eşittir.',
          ],
        };

      case 'square_roots':
        return {
          question: 'Alanı 49 br² olan karenin bir kenar uzunluğu kaç birimdir?',
          options: ['7 br (√49 = 7)', '14 br', '24.5 br', '49 br'],
          correctIndex: 0,
          explanation: 'Harika! Bir sayının karekökü, karesi o sayıya eşit olan pozitif sayıdır. Alanı A olan karenin kenarı s = √A dır (√49 = 7).',
          summaryNotes: [
            '• Karekök Tanımı: √A, karesi A olan pozitif sayıdır.',
            '• Tam Kare Sayılar: 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225...',
            '• İrrasyonel Karekök Tahmini: √20 sayısı √16 (4) ile √25 (5) arasındadır (≈ 4.47).',
          ],
        };

      case 'ebob_ekok_tiles':
        return {
          question: `${roomW} cm ve ${roomH} cm ölçülerindeki bir odayı hiç boşluk kalmadan kaplayacak EN BÜYÜK kare fayansın kenarı kaç cm dir?`,
          options: [
            `${currentEBOB} cm (EBOB = ${currentEBOB})`,
            '1 cm',
            `${Math.min(roomW, roomH)} cm`,
            `${roomW * roomH} cm`,
          ],
          correctIndex: 0,
          explanation: `Tebrikler! Dikdörtgen şeklindeki bir alanı en büyük eş karelere bölmek için boyutların En Büyük Ortak Böleni (EBOB) hesaplanır: EBOB(${roomW}, ${roomH}) = ${currentEBOB} cm.`,
          summaryNotes: [
            `• Parçalama / Bölme Problemleri: Büyük bütünü eş küçük parçalara ayırırken EBOB kullanılır.`,
            `• Fayans Sayısı Hesabı: Toplam Alan / Bir Fayansın Alanı = (${roomW} × ${roomH}) / (${tileSize} × ${tileSize}) = ${totalTilesCount} adet.`,
            `• Katlama / Birleştirme Problemleri: Küçük parçalardan büyük bütüne giderken EKOK kullanılır.`,
          ],
        };

      case 'ratio_proportion':
        return {
          question: `${priceItem} TL etiket fiyatlı bir ürüne %${discountPercent} indirim uygulandığında müşterinin ödeyeceği tutar kaç TL dir?`,
          options: [
            `${finalPrice} TL (İndirim: -${discountAmount} TL)`,
            `${priceItem - 10} TL`,
            `${priceItem + discountAmount} TL`,
            `${discountAmount} TL`,
          ],
          correctIndex: 0,
          explanation: `Harika! İndirim Tutarı = ${priceItem} × %${discountPercent} = ${discountAmount} TL. Ödenecek Tutar = ${priceItem} - ${discountAmount} = ${finalPrice} TL dir.`,
          summaryNotes: [
            `• Yüzde Hesabı: A sayısının %X'i = (A × X) / 100`,
            `• İndirimli Fiyat: Etiket Fiyatı × (100 - İndirim Oranı) / 100`,
            `• Doğru Orantı: Bir çokluk artarken diğeri de aynı oranda artar (İçler - Dışlar çarpımı).`,
          ],
        };

      case 'span_measurement':
        return {
          question: 'Masayı karış ile ölçerken sonucun kişiden kişiye farklı çıkmasının sebebi nedir?',
          options: [
            'Karış standart olmayan bir ölçme birimidir ve herkesin el büyüklüğü farklıdır.',
            'Masa sürekli büyüyüp küçülmektedir.',
            'Karışla sadece yuvarlak nesneler ölçülebilir.',
            'Cetvel yerine karış kullanmak yasaktır.',
          ],
          correctIndex: 0,
          explanation: 'Tebrikler! Karış, kulaç, adım, ayak gibi vücut uzuvlarıyla yapılan ölçmeler standart değildir; kişiden kişiye değişir. Bu nedenle bilimde ve ticarette standart metre (m) ve santimetre (cm) kullanılır.',
          summaryNotes: [
            '• Standart Olmayan Ölçme Birimleri: Karış, Kulaç, Adım, Ayak, Parmak.',
            '• Standart Ölçme Birimi: Metre (m), Santimetre (cm), Milimetre (mm).',
            '• 1 Metre = 100 Santimetredir.',
          ],
        };

      case 'algebraic_tiles':
        return {
          question: 'Sayma pulları modeline göre (+2) - (-3) çıkarma işleminin sonucu kaçtır?',
          options: ['+5 (5 adet pozitif pul)', '-1', '-5', '+1'],
          correctIndex: 0,
          explanation: 'Tebrikler! (+2) sayısından (-3) çıkarmak için modele 3 adet sıfır çifti (+ / -) eklenir ve 3 negatif pul dışarı atıldığında sonuçta +5 pozitif pul kaldığını ispatladınız: (+2) - (-3) = (+2) + (+3) = +5.',
          summaryNotes: [
            '• Tam Sayılarda Çıkarma: a - (-b) = a + (+b)',
            '• Sıfır Çifti: Bir (+) ve bir (-) pulun değeri 0 dır.',
            '• Çıkarma Modellemesi: Olmayan pullar yerine sıfır çifti eklenir.',
          ],
        };

      case 'balance_scale':
        return {
          question: '2x + 4 = 10 denkleminde terazinin dengede kalması için x ağırlığı kaç kg olmalıdır?',
          options: ['x = 2', 'x = 3 (2×3 + 4 = 10)', 'x = 4', 'x = 5'],
          correctIndex: 1,
          explanation: 'Harika! Eşitliğin her iki tarafından 4 çıkarıldığında 2x = 6 kalır. Her iki taraf 2 ye bölündüğünde x = 3 bulunur.',
          summaryNotes: [
            '• Eşitliğin Korunumu: Terazi prensibi gereği her iki tarafa aynı işlem uygulanır.',
            '• Denklem Çözümü: ax + b = c ⇒ ax = c - b ⇒ x = (c - b)/a',
          ],
        };

      case 'slope_explorer':
        return {
          question: 'y = 2x + 1 doğrusunda x değeri 1 birim arttığında y değeri kaç birim artar?',
          options: ['2 birim (Eğim m = 2)', '1 birim', '3 birim', '4 birim'],
          correctIndex: 0,
          explanation: 'Tebrikler! Eğim m, dikey değişimin yatay değişime oranıdır (Δy / Δx). m = 2 doğrunun dikliğini ve artış hızını belirler.',
          summaryNotes: [
            '• Doğru Denklemi: y = mx + n',
            '• m (Eğim): Δy / Δx (Dikey Değişim / Yatay Değişim)',
            '• n (Sabit Terim): Doğrunun y-eksenini kestiği nokta (0, n).',
          ],
        };

      case 'pizza_fractions':
        return {
          question: '3/6 kesri aşağıdaki kesirlerden hangisine denktir?',
          options: ['1/4', '1/2 (%50 Yarım)', '2/3', '3/4'],
          correctIndex: 1,
          explanation: 'Harika! Kesrin pay ve paydası 3 ile sadeleştirildiğinde 3/6 = 1/2 olur. Her iki model de bütünün tam yarısını temsil eder.',
          summaryNotes: [
            '• Denk Kesirler: a/b = (a × k) / (b × k)',
            '• Sadeleştirme: Pay ve paydanın aynı sayıya bölünmesi.',
            '• 3/6 = 1/2 = %50',
          ],
        };

      case 'data_barchart':
        return {
          question: 'Şekil grafiğindeki her yıldız 2 öğrenciyi temsil ettiğinde, 6 yıldızlı Yaz mevsimini kaç öğrenci seçmiştir?',
          options: ['12 öğrenci (6 × 2)', '6 öğrenci', '8 öğrenci', '10 öğrenci'],
          correctIndex: 0,
          explanation: 'Tebrikler! Grafiğin altındaki gösterge notuna göre her sembol 2 kişidir: 6 × 2 = 12 öğrenci.',
          summaryNotes: [
            '• Şekil Grafiği: Verilerin sembol veya resimlerle gösterilmesidir.',
            '• Ölçek Notu: Her şeklin kaç birimi temsil ettiği kuralına dikkat edilmelidir.',
          ],
        };

      case 'probability_spinner':
        return {
          question: 'Tamamı kırmızı olan bir çark çevrildiğinde kırmızı gelme olasılığı hangi kavramla ifade edilir?',
          options: ['Kesin Olay (%100 Olasılık: P = 1)', 'İmkânsız Olay (P = 0)', 'Eşit Olasılık', 'Rastgele Olay'],
          correctIndex: 0,
          explanation: 'Tebrikler! Gerçekleşmesi kesin olan olayların olasılığı 1 (%100), gerçekleşmesi imkânsız olan olayların olasılığı 0 dır.',
          summaryNotes: [
            '• Olasılık Değer Aralığı: 0 ≤ P(A) ≤ 1',
            '• İmkânsız Olay: P = 0 (%0)',
            '• Kesin Olay: P = 1 (%100)',
          ],
        };

      case 'spatial_grid':
        return {
          question: 'Tavşanı başlangıç noktasından havuca ulaştırmak için hangi yön sıralaması izlenmelidir?',
          options: ['2 birim Sağa, 2 birim Aşağı', '2 birim Sola, 1 birim Yukarı', '3 birim Aşağı', '1 birim Sağa'],
          correctIndex: 0,
          explanation: 'Tebrikler! Uzamsal ızgara üzerinde sağ-sol ve yukarı-aşağı koordinat adımları başarıyla tamamlandı.',
          summaryNotes: [
            '• Yön ve Konum: İleri, Geri, Sağ, Sol, Yukarı, Aşağı.',
            '• Koordinat Adımları: Grid üzerinde birim kareler sayılarak hedef konuma ulaşılır.',
          ],
        };

      case 'money_coins':
        return {
          question: 'Kumbarada 2 adet 10 TL madeni/kağıt para olduğunda toplam kaç TL birikmiş olur?',
          options: ['20 TL (2 × 10 TL)', '15 TL', '12 TL', '30 TL'],
          correctIndex: 0,
          explanation: 'Harika! 10 TL + 10 TL = 20 TL eder. 1 TL = 100 Kuruştur.',
          summaryNotes: [
            '• Madeni Paralarımız: 1 kr, 5 kr, 10 kr, 25 kr, 50 kr, 1 TL, 5 TL.',
            '• Kağıt Paralarımız: 5 TL, 10 TL, 20 TL, 50 TL, 100 TL, 200 TL.',
            '• 1 TL = 100 Kuruş.',
          ],
        };

      case 'pattern_blocks':
        return {
          question: '🔴 🟦 🔴 🟦 🔴 ? örüntüsünde soru işareti yerine hangi şekil gelmelidir?',
          options: ['🟦 Mavi Kare', '🔴 Kırmızı Daire', '🟡 Sarı Daire', '🔺 Üçgen'],
          correctIndex: 0,
          explanation: 'Tebrikler! Örüntü kuralı (1 Kırmızı Daire, 1 Mavi Kare) şeklinde periyodik olarak devam etmektedir.',
          summaryNotes: [
            '• Geometrik Örüntü: Belirli bir kurala göre düzenli tekrar eden şekil dizileridir.',
            '• Örüntü Kuralı: Tekrar eden ana blok belirlenerek eksik adım bulunur.',
          ],
        };

      case 'unit_cubes':
        return {
          question: '4 Yüzlük + 5 Onluk + 6 Birlik taban bloklarıyla modellenen sayı kaçtır?',
          options: ['456', '546', '654', '465'],
          correctIndex: 0,
          explanation: 'Tebrikler! 4×100 + 5×10 + 6×1 = 400 + 50 + 6 = 456 sayısı elde edilir.',
          summaryNotes: [
            '• Basamak Değeri: Rakamın sayıda bulunduğu basamağa göre aldığı değerdir.',
            '• Yüzler (×100), Onlar (×10), Birler (×1) basamağı.',
          ],
        };

      case 'prism_volume':
        return {
          question: 'Uzunluğu 5, genişliği 4 ve yüksekliği 3 birim olan bir prizmanın hacmi kaç birim küptür?',
          options: ['60 birim küp (5 × 4 × 3)', '20 birim küp', '12 birim küp', '48 birim küp'],
          correctIndex: 0,
          explanation: 'Tebrikler! Prizmanın hacmi V = Uzunluk × Genişlik × Yükseklik = 5 × 4 × 3 = 60 birim küptür.',
          summaryNotes: [
            '• Prizma Hacmi: V = a × b × c (Taban Alanı × Yükseklik)',
            '• Küp Hacmi: V = a³',
          ],
        };

      case 'quadrant_target':
        return {
          question: '(3; 2) koordinatları analitik düzlemde kaçıncı bölgededir?',
          options: ['I. Bölge (+, +)', 'II. Bölge (-, +)', 'III. Bölge (-, -)', 'IV. Bölge (+, -)'],
          correctIndex: 0,
          explanation: 'Tebrikler! Hem x hem de y pozitif olduğunda nokta I. Bölgede yer alır.',
          summaryNotes: [
            '• I. Bölge: (+, +)',
            '• II. Bölge: (-, +)',
            '• III. Bölge: (-, -)',
            '• IV. Bölge: (+, -)',
          ],
        };

      case 'circle_radius':
        return {
          question: 'Yarıçapı r = 3 br olan bir çemberin çapı (R = 2r) kaç birimdir?',
          options: ['6 br (2 × 3)', '3 br', '9 br', '12 br'],
          correctIndex: 0,
          explanation: 'Tebrikler! Çap, yarıçapın 2 katıdır: R = 2r = 2 × 3 = 6 birimdir.',
          summaryNotes: [
            '• Çap: R = 2r',
            '• Çember Çevresi: 2πr',
            '• Daire Alanı: πr²',
          ],
        };

      default:
        return {
          question: `${selectedActivity?.title || 'Matematik Görevi'} ile ilgili temel matematiksel çıkarım hangisidir?`,
          options: [
            'Model üzerinde yapılan adımlar matematiksel kurallarla tam uyumludur.',
            'Matematik modelleri rastgele sonuçlar üretir.',
            'Geometrik çizimlerde ölçümler önemsizdir.',
            'Formüller gerçek hayat durumlarıyla uyuşmaz.',
          ],
          correctIndex: 0,
          explanation: `Tebrikler! ${selectedActivity?.title || 'Bu etkinlik'} başarıyla çözümlendi ve kavramsal ilişki kavrandı.`,
          summaryNotes: [
            `• Matematiksel Modelleme: Somut materyaller ve dijital simülasyonlar soyut kavramları anlamayı kolaylaştırır.`,
            `• TYMM 2026: Keşfet, Karar Ver, Açıkla ve Not Al adımlarıyla derinlemesine kalıcı öğrenme sağlanır.`,
          ],
        };
    }
  }, [
    missionType,
    treeNumber,
    primeSummary,
    divNum,
    vennA,
    vennB,
    ebobVal,
    commonDivisors,
    rhythmA,
    rhythmB,
    ekokVal,
    areaTarget,
    areaFactorPairs,
    ladderNum,
    currentEBOB,
    roomW,
    roomH,
    tileSize,
    totalTilesCount,
    priceItem,
    discountPercent,
    discountAmount,
    finalPrice,
    selectedActivity,
  ]);

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
    const correctIdx = pedagogicalData.correctIndex;

    if (selectedOption === correctIdx) {
      setStep2Verified(true);
      setActiveStep(3);
      speakText('Harika! Doğru cevabı buldunuz.');
      try {
        confetti({ particleCount: 90, spread: 100, origin: { y: 0.5 } });
      } catch (e) { }
    } else {
      speakText('Tekrar deneyin! Verilen matematiksel modeli ve seçenekleri inceleyin.');
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
          {/* Üst Yönerge / Görev Kutusu (Büyük Punto & Vurgulu) */}
          <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-500/15 via-sky-500/10 to-transparent dark:from-emerald-950/40 dark:via-slate-900/60 border-b border-border/80 flex items-center justify-between gap-4 select-none shadow-2xs">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="px-3.5 py-1.5 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-xs uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                <Target className="w-4 h-4" />
                <span>GÖREV</span>
              </span>
              <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug truncate sm:whitespace-normal">
                {selectedActivity?.description || selectedActivity?.title || 'Matematiksel modeli keşfedin ve hedefleri tamamlayın.'}
              </p>
            </div>

            {selectedGrade && selectedGrade.gradeNumber <= 4 && (
              <button
                onClick={() => speakText(selectedActivity?.description || '')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs sm:text-sm shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
                title="Sesli Dinle"
              >
                <Volume2 className="w-4 h-4" />
                <span>Sesli Dinle</span>
              </button>
            )}
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
                {/* Çorap & Eldiven Eşleştirme Izgarası (Büyütüldü & SVG yapıldı) */}
                <div className="grid grid-cols-3 gap-6 sm:gap-8 p-6 sm:p-8 rounded-[36px] bg-card border-2 border-border shadow-xl my-auto">
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

            {/* F8) İLKOKUL 1: KARIŞ İLE MASA ÖLÇME SİMÜLATÖRÜ */}
            {missionType === 'span_measurement' && (
              <div className="w-full h-full relative flex flex-col items-center justify-between p-6 select-none min-h-[500px]">
                {/* Üst Bilgi Rozeti */}
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 font-black text-xs border border-amber-500/20 shadow-2xs">
                    <span>🖐️ Masayı Karışla Ölçme Laboratuvarı</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Masayı sol kenarından başlayarak boşluk bırakmadan karışlarla (✋) ölçün.
                  </p>
                </div>

                {/* İnteraktif Masa & Karışlar Sahnesi */}
                <div className="w-full max-w-4xl h-72 sm:h-80 relative flex items-center justify-center p-4 bg-gradient-to-b from-sky-50/50 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 rounded-3xl border-2 border-amber-200 dark:border-slate-800 shadow-xl overflow-hidden my-auto">
                  <svg className="w-full h-full block" viewBox="0 0 800 320" preserveAspectRatio="xMidYMid meet">
                    {/* Arka Plan Zemin & Duvar Çizgisi */}
                    <line x1="40" y1="260" x2="760" y2="260" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />

                    {/* Masa Sol Ayak */}
                    <rect x="130" y="160" width="22" height="100" rx="4" fill="#78350f" stroke="#451a03" strokeWidth="2" />
                    {/* Masa Sağ Ayak */}
                    <rect x="648" y="160" width="22" height="100" rx="4" fill="#78350f" stroke="#451a03" strokeWidth="2" />
                    {/* Masa Ara Destek */}
                    <rect x="150" y="210" width="500" height="12" rx="3" fill="#92400e" opacity="0.7" />

                    {/* Masa Tablası (Ahşap Üst Yüzey: x=100'den x=700'e -> Toplam 600px genişlik = 6 karış x 100px) */}
                    <rect x="100" y="145" width="600" height="28" rx="8" fill="#d97706" stroke="#92400e" strokeWidth="3" />
                    <rect x="106" y="148" width="588" height="8" rx="4" fill="#fef3c7" opacity="0.4" />

                    {/* Karış Yuvaları (6 Adet Slot) */}
                    {Array.from({ length: 6 }).map((_, idx) => {
                      const slotX = 100 + idx * 100;
                      const isPlaced = idx < placedSpans;

                      return (
                        <g
                          key={idx}
                          onClick={handleAddSpan}
                          className="cursor-pointer transition-all hover:opacity-90"
                        >
                          {/* Slot Kesikli Çerçeve */}
                          <rect
                            x={slotX + 4}
                            y="70"
                            width="92"
                            height="70"
                            rx="14"
                            fill={isPlaced ? '#fef3c7' : '#ffffff'}
                            fillOpacity={isPlaced ? '0.9' : '0.4'}
                            stroke={isPlaced ? '#f59e0b' : '#cbd5e1'}
                            strokeWidth={isPlaced ? '3' : '2'}
                            strokeDasharray={isPlaced ? 'none' : '4,3'}
                            className="transition-all"
                          />

                          {/* Karış İkonu */}
                          {isPlaced ? (
                            <g className="animate-in zoom-in-50 duration-200">
                              <text x={slotX + 50} y="118" textAnchor="middle" fontSize="38">
                                ✋
                              </text>
                              {/* Karış Numarası Rozeti */}
                              <rect x={slotX + 32} y="126" width="36" height="16" rx="8" fill="#d97706" />
                              <text x={slotX + 50} y="138" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="10">
                                {idx + 1}. Karış
                              </text>
                            </g>
                          ) : (
                            <g opacity="0.4">
                              <text x={slotX + 50} y="112" textAnchor="middle" fontSize="24">
                                ✋
                              </text>
                              <text x={slotX + 50} y="132" textAnchor="middle" fill="#94a3b8" fontWeight="700" fontSize="9">
                                {idx + 1}
                              </text>
                            </g>
                          )}

                          {/* Dikey Ayrım Çizgisi */}
                          <line x1={slotX + 100} y1="65" x2={slotX + 100} y2="175" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3,3" opacity={idx < 5 ? 0.7 : 0} />
                        </g>
                      );
                    })}

                    {/* Ölçüm Özet Çubuğu */}
                    <g transform="translate(250, 275)">
                      <rect width="300" height="36" rx="14" fill="#ffffff" stroke="#f59e0b" strokeWidth="2.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.06))" />
                      <text x="150" y="23" textAnchor="middle" fill="#78350f" fontWeight="900" fontSize="13">
                        Ölçüm: {placedSpans} / 6 Karış {placedSpans === 6 ? '🎉 (Tam Ölçüldü!)' : ''}
                      </text>
                    </g>
                  </svg>
                </div>

                {/* Alt İnteraktif Kontrol Butonları */}
                <div className="w-full flex flex-wrap items-center justify-center gap-3 pt-4">
                  <button
                    onClick={handleAddSpan}
                    disabled={placedSpans >= 6}
                    className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-sm shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="text-lg">✋</span>
                    <span>+1 Karış Yerleştir</span>
                  </button>

                  <button
                    onClick={handleRemoveSpan}
                    disabled={placedSpans === 0}
                    className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-800 dark:text-white font-black text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    <span>↩️ Karış Çıkar</span>
                  </button>

                  <button
                    onClick={handleResetSpans}
                    disabled={placedSpans === 0}
                    className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 disabled:opacity-40 font-black text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Sıfırla</span>
                  </button>
                </div>
              </div>
            )}

            {/* H1) ORTAOKUL 8: PİSAGOR TEOREMİ & HİPOTENÜS ALAN LABORATUVARI */}
            {missionType === 'pythagoras_theorem' && (
              <div className="w-full h-full relative flex flex-col items-center justify-between p-6 select-none min-h-[500px]">
                {/* Üst Başlık Rozeti */}
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-black text-xs border border-emerald-500/20 shadow-2xs">
                    <span>📐 Pisagor Teoremi &amp; Hipotenüs Alan Modeli (a² + b² = c²)</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Dik kenarların karelerinin alanları toplamı, hipotenüsün karesinin alanına eşittir!
                  </p>
                </div>

                {/* İnteraktif SVG Pisagor Sahnesi */}
                <div className="w-full max-w-4xl h-80 sm:h-96 relative flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 via-white to-emerald-50/30 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 rounded-3xl border-2 border-border shadow-xl overflow-hidden my-auto">
                  <svg className="w-full h-full block" viewBox="0 0 800 380" preserveAspectRatio="xMidYMid meet">
                    {/* Arka Plan Izgarası */}
                    <g className="opacity-15 dark:opacity-10" stroke="currentColor">
                      {Array.from({ length: 17 }).map((_, i) => (
                        <React.Fragment key={i}>
                          <line x1={i * 50} y1="0" x2={i * 50} y2="380" strokeDasharray="3,3" />
                          <line x1="0" y1={i * 50} x2="800" y2={i * 50} strokeDasharray="3,3" />
                        </React.Fragment>
                      ))}
                    </g>

                    {/* Dik Üçgen ve Kareler Grubu (Merkezlenmiş) */}
                    <g transform="translate(280, 220)">
                      {/* 1. Dik Kenar a Karesi (Alt Kare - Pembe) */}
                      <rect
                        x="0"
                        y="0"
                        width={pythA * 16}
                        height={pythA * 16}
                        fill="#fce7f3"
                        fillOpacity="0.8"
                        stroke="#f43f5e"
                        strokeWidth="2.5"
                        rx="4"
                      />
                      <text x={(pythA * 16) / 2} y={(pythA * 16) / 2 + 5} textAnchor="middle" fill="#be123c" fontWeight="900" fontSize="13">
                        a² = {pythA * pythA} br²
                      </text>

                      {/* 2. Dik Kenar b Karesi (Sol Kare - Mavi) */}
                      <rect
                        x={-(pythB * 16)}
                        y={-(pythB * 16)}
                        width={pythB * 16}
                        height={pythB * 16}
                        fill="#e0f2fe"
                        fillOpacity="0.8"
                        stroke="#0284c7"
                        strokeWidth="2.5"
                        rx="4"
                      />
                      <text x={-(pythB * 16) / 2} y={-(pythB * 16) / 2 + 5} textAnchor="middle" fill="#0369a1" fontWeight="900" fontSize="13">
                        b² = {pythB * pythB} br²
                      </text>

                      {/* 3. Ana Dik Üçgen (Sarı/Turuncu) */}
                      <polygon
                        points={`0,0 ${pythA * 16},0 0,${-(pythB * 16)}`}
                        fill="#fef08a"
                        fillOpacity="0.85"
                        stroke="#d97706"
                        strokeWidth="3.5"
                      />

                      {/* Dik Açı İşareti (Köşede ⊾) */}
                      <rect x="0" y="-14" width="14" height="14" fill="none" stroke="#d97706" strokeWidth="2" />
                      <circle cx="7" cy="-7" r="2" fill="#d97706" />

                      {/* Kenar Ölçü Etiketleri */}
                      <text x={(pythA * 16) / 2} y="-6" textAnchor="middle" fill="#b45309" fontWeight="900" fontSize="12">
                        a = {pythA}
                      </text>
                      <text x="-8" y={-(pythB * 16) / 2} textAnchor="end" fill="#0284c7" fontWeight="900" fontSize="12">
                        b = {pythB}
                      </text>
                      <text
                        x={(pythA * 16) / 2 + 12}
                        y={-(pythB * 16) / 2 - 8}
                        textAnchor="start"
                        fill="#059669"
                        fontWeight="900"
                        fontSize="14"
                      >
                        c = {pythC} {isPythSpecial ? '⭐' : ''}
                      </text>
                    </g>

                    {/* Sağ Taraf: Canlı Pisagor Formülü ve Özel Üçgen Bilgisi */}
                    <g transform="translate(540, 60)">
                      <rect width="230" height="240" rx="20" fill="#ffffff" stroke="#10b981" strokeWidth="2" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.06))" />
                      <text x="115" y="32" textAnchor="middle" fill="#047857" fontWeight="900" fontSize="14">
                        PİSAGOR BAĞINTISI
                      </text>
                      <line x1="20" y1="46" x2="210" y2="46" stroke="#e2e8f0" strokeWidth="1.5" />

                      <text x="115" y="76" textAnchor="middle" fill="#0f172a" fontWeight="900" fontSize="15" fontFamily="monospace">
                        a² + b² = c²
                      </text>

                      <text x="115" y="112" textAnchor="middle" fill="#334155" fontWeight="700" fontSize="12">
                        {pythA}² + {pythB}² = c²
                      </text>

                      <text x="115" y="142" textAnchor="middle" fill="#334155" fontWeight="700" fontSize="12">
                        {pythA * pythA} + {pythB * pythB} = {pythA * pythA + pythB * pythB}
                      </text>

                      <rect x="25" y="165" width="180" height="42" rx="12" fill="#ecfdf5" stroke="#10b981" strokeWidth="2" />
                      <text x="115" y="191" textAnchor="middle" fill="#065f46" fontWeight="900" fontSize="15">
                        c = √{pythA * pythA + pythB * pythB} = {pythC} br
                      </text>

                      {isPythSpecial && (
                        <text x="115" y="224" textAnchor="middle" fill="#d97706" fontWeight="900" fontSize="11">
                          ✨ Özel Tam Sayılı Üçgen ({pythA}-{pythB}-{pythC})
                        </text>
                      )}
                    </g>
                  </svg>
                </div>
              </div>
            )}

            {/* H2) ORTAOKUL 8: KAREKÖKLÜ SAYILAR & ALAN-KENAR LABORATUVARI */}
            {missionType === 'square_roots' && (
              <div className="w-full h-full relative flex flex-col items-center justify-between p-6 select-none min-h-[500px]">
                {/* Üst Başlık Rozeti */}
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 text-rose-800 dark:text-rose-300 font-black text-xs border border-rose-500/20 shadow-2xs">
                    <span>🟩 Tam Kare Sayılar &amp; Karekök Alan-Kenar Modeli</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Alanı bilinen bir karenin bir kenar uzunluğu, alanın kareköküne (√A) eşittir.
                  </p>
                </div>

                {/* İnteraktif Kare & Sayı Doğrusu Sahnesi */}
                <div className="w-full max-w-4xl h-80 sm:h-96 relative flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 via-white to-rose-50/30 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 rounded-3xl border-2 border-border shadow-xl overflow-hidden my-auto">
                  <svg className="w-full h-full block" viewBox="0 0 800 360" preserveAspectRatio="xMidYMid meet">
                    {/* Sol Alan: Dinamik Kare Geometrisi */}
                    <g transform="translate(140, 40)">
                      {/* Karenin Kendisi */}
                      <rect
                        x="0"
                        y="0"
                        width={Math.min(220, Math.max(70, sqrtVal * 22))}
                        height={Math.min(220, Math.max(70, sqrtVal * 22))}
                        rx="10"
                        fill="#fee2e2"
                        fillOpacity="0.75"
                        stroke="#ef4444"
                        strokeWidth="3.5"
                      />

                      {/* Alan Rozeti */}
                      <text
                        x={Math.min(220, Math.max(70, sqrtVal * 22)) / 2}
                        y={Math.min(220, Math.max(70, sqrtVal * 22)) / 2 + 6}
                        textAnchor="middle"
                        fill="#991b1b"
                        fontWeight="900"
                        fontSize="18"
                      >
                        Alan = {sqrtArea} br²
                      </text>

                      {/* Kenar Etiketleri */}
                      <text
                        x={Math.min(220, Math.max(70, sqrtVal * 22)) / 2}
                        y="-10"
                        textAnchor="middle"
                        fill="#dc2626"
                        fontWeight="900"
                        fontSize="13"
                      >
                        Kenar (s) = √{sqrtArea} = {sqrtVal} br
                      </text>

                      <text
                        x="-12"
                        y={Math.min(220, Math.max(70, sqrtVal * 22)) / 2}
                        textAnchor="end"
                        fill="#dc2626"
                        fontWeight="900"
                        fontSize="13"
                      >
                        √{sqrtArea}
                      </text>
                    </g>

                    {/* Sağ Taraf: Karekök Sayı Doğrusu ve Aralık Tespiti */}
                    <g transform="translate(420, 60)">
                      <rect width="350" height="250" rx="20" fill="#ffffff" stroke="#ef4444" strokeWidth="2" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.06))" />
                      <text x="175" y="32" textAnchor="middle" fill="#991b1b" fontWeight="900" fontSize="14">
                        KAREKÖK TAHMİNİ &amp; DEĞERİ
                      </text>
                      <line x1="20" y1="46" x2="330" y2="46" stroke="#e2e8f0" strokeWidth="1.5" />

                      {/* Tam Kare mi? */}
                      <g transform="translate(25, 65)">
                        <rect width="300" height="40" rx="10" fill={isPerfectSquare ? '#ecfdf5' : '#fffbeb'} stroke={isPerfectSquare ? '#10b981' : '#f59e0b'} strokeWidth="1.5" />
                        <text x="150" y="25" textAnchor="middle" fill={isPerfectSquare ? '#065f46' : '#92400e'} fontWeight="900" fontSize="12">
                          {isPerfectSquare ? `🎉 ${sqrtArea} Tam Kare Sayıdır (√${sqrtArea} = ${sqrtVal})` : `📍 √${sqrtArea} İrrasyoneldir (≈ ${sqrtVal})`}
                        </text>
                      </g>

                      {/* Sayı Doğrusu Cetveli */}
                      <g transform="translate(30, 170)">
                        <line x1="0" y1="0" x2="290" y2="0" stroke="#0f172a" strokeWidth="3" />
                        {/* 1'den 10'a kadar tam kare sayı çentikleri */}
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                          const px = (n - 1) * 32;
                          const isCurrentFloor = Math.floor(sqrtVal) === n;
                          const isCurrentCeil = Math.ceil(sqrtVal) === n;

                          return (
                            <g key={n} transform={`translate(${px}, 0)`}>
                              <line y1="-8" y2="8" stroke="#64748b" strokeWidth="2" />
                              <text y="24" textAnchor="middle" fill="#475569" fontWeight="700" fontSize="11">
                                {n}
                              </text>
                              <text y="-14" textAnchor="middle" fill="#94a3b8" fontWeight="600" fontSize="9">
                                √{n * n}
                              </text>
                            </g>
                          );
                        })}

                        {/* Canlı İbre / Pin */}
                        <g transform={`translate(${Math.min(288, Math.max(0, (sqrtVal - 1) * 32))}, 0)`}>
                          <polygon points="0,-2 6,-14 -6,-14" fill="#ef4444" />
                          <circle cx="0" cy="0" r="4" fill="#ef4444" />
                          <rect x="-30" y="-36" width="60" height="20" rx="6" fill="#ef4444" />
                          <text x="0" y="-22" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="10">
                            √{sqrtArea}
                          </text>
                        </g>
                      </g>
                    </g>
                  </svg>
                </div>
              </div>
            )}

            {/* H3) ORTAOKUL 6 & 8: EBOB & EKOK FAYANS DÖŞEME LABORATUVARI */}
            {missionType === 'ebob_ekok_tiles' && (
              <div className="w-full h-full relative flex flex-col items-center justify-between p-6 select-none min-h-[500px]">
                {/* Üst Başlık Rozeti */}
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-800 dark:text-blue-300 font-black text-xs border border-blue-500/20 shadow-2xs">
                    <span>🧱 EBOB &amp; EKOK / Fayans Döşeme &amp; Periyodik Olaylar Modeli</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold">
                    {roomW} cm × {roomH} cm boyutundaki odayı en az sayıda eş kare fayanslarla boşluksuz kaplayın.
                  </p>
                </div>

                {/* İnteraktif Oda & Fayans Sahnesi */}
                <div className="w-full max-w-4xl h-80 sm:h-96 relative flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 rounded-3xl border-2 border-border shadow-xl overflow-hidden my-auto">
                  <svg className="w-full h-full block" viewBox="0 0 800 360" preserveAspectRatio="xMidYMid meet">
                    {/* Sol: Oda Zemini ve Döşenen Fayanslar */}
                    <g transform="translate(100, 50)">
                      {/* Oda Dış Çerçevesi (Genişlik=300px, Yükseklik=220px) */}
                      <rect
                        width="320"
                        height="240"
                        rx="8"
                        fill="#f8fafc"
                        stroke="#3b82f6"
                        strokeWidth="3"
                      />

                      {/* Döşenen Fayans Izgarası */}
                      {isTilePerfect ? (
                        Array.from({ length: Math.round(roomH / tileSize) }).map((_, r) =>
                          Array.from({ length: Math.round(roomW / tileSize) }).map((_, c) => {
                            const fw = 320 / (roomW / tileSize);
                            const fh = 240 / (roomH / tileSize);
                            return (
                              <rect
                                key={`${r}-${c}`}
                                x={c * fw + 1}
                                y={r * fh + 1}
                                width={fw - 2}
                                height={fh - 2}
                                rx="3"
                                fill={(r + c) % 2 === 0 ? '#dbeafe' : '#bfdbfe'}
                                stroke="#2563eb"
                                strokeWidth="1"
                              />
                            );
                          })
                        )
                      ) : (
                        <g>
                          <rect width="320" height="240" fill="#fee2e2" fillOpacity="0.4" stroke="#ef4444" strokeWidth="2" strokeDasharray="4,4" />
                          <text x="160" y="125" textAnchor="middle" fill="#dc2626" fontWeight="900" fontSize="13">
                            ⚠️ Seçilen {tileSize} cm fayans kenarları tam bölmüyor!
                          </text>
                        </g>
                      )}

                      {/* Boyut Etiketleri */}
                      <text x="160" y="-12" textAnchor="middle" fill="#1d4ed8" fontWeight="900" fontSize="13">
                        Genişlik (W) = {roomW} cm
                      </text>
                      <text x="-12" y="125" textAnchor="end" fill="#1d4ed8" fontWeight="900" fontSize="13">
                        Yükseklik (H) = {roomH} cm
                      </text>
                    </g>

                    {/* Sağ Taraf: EBOB / EKOK Çözüm Kartı */}
                    <g transform="translate(480, 50)">
                      <rect width="280" height="240" rx="20" fill="#ffffff" stroke="#3b82f6" strokeWidth="2" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.06))" />
                      <text x="140" y="32" textAnchor="middle" fill="#1d4ed8" fontWeight="900" fontSize="14">
                        EBOB &amp; EKOK ANALİZİ
                      </text>
                      <line x1="20" y1="46" x2="260" y2="46" stroke="#e2e8f0" strokeWidth="1.5" />

                      <g transform="translate(20, 60)">
                        <rect width="240" height="42" rx="10" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5" />
                        <text x="120" y="26" textAnchor="middle" fill="#1e40af" fontWeight="900" fontSize="13">
                          EBOB({roomW}, {roomH}) = {currentEBOB} cm
                        </text>
                      </g>

                      <g transform="translate(20, 115)">
                        <rect width="240" height="42" rx="10" fill="#f0fdf4" stroke="#10b981" strokeWidth="1.5" />
                        <text x="120" y="26" textAnchor="middle" fill="#065f46" fontWeight="900" fontSize="13">
                          EKOK({roomW}, {roomH}) = {currentEKOK} cm
                        </text>
                      </g>

                      <g transform="translate(20, 170)">
                        <rect width="240" height="48" rx="10" fill="#faf5ff" stroke="#a855f7" strokeWidth="1.5" />
                        <text x="120" y="22" textAnchor="middle" fill="#7e22ce" fontWeight="900" fontSize="11">
                          Fayans Sayısı = ({roomW}×{roomH}) / ({tileSize}×{tileSize})
                        </text>
                        <text x="120" y="38" textAnchor="middle" fill="#6b21a8" fontWeight="900" fontSize="13">
                          = {totalTilesCount > 0 ? `${totalTilesCount} Adet Kare Fayans` : 'Tam Bölünmüyor'}
                        </text>
                      </g>
                    </g>
                  </svg>
                </div>
              </div>
            )}

            {/* H4) ORTAOKUL 7: ORAN, ORANTI, YÜZDE & İNDİRİM LABORATUVARI */}
            {missionType === 'ratio_proportion' && (
              <div className="w-full h-full relative flex flex-col items-center justify-between p-6 select-none min-h-[500px]">
                {/* Üst Başlık Rozeti */}
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 font-black text-xs border border-amber-500/20 shadow-2xs">
                    <span>🏷️ Yüzde, İndirim, KDV ve Kâr-Zarar Simülatörü (7. Sınıf)</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Etiket fiyatı {priceItem} TL olan bir ürüne %{discountPercent} indirim uygulandığında indirim tutarını ve yeni fiyatı hesaplayın.
                  </p>
                </div>

                {/* İnteraktif Fiyat & İndirim Kartı Sahnesi */}
                <div className="w-full max-w-4xl h-80 sm:h-96 relative flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 via-white to-amber-50/30 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 rounded-3xl border-2 border-border shadow-xl overflow-hidden my-auto">
                  <svg className="w-full h-full block" viewBox="0 0 800 360" preserveAspectRatio="xMidYMid meet">
                    {/* Sol: Alışveriş Fiyat Etiketi */}
                    <g transform="translate(120, 60)">
                      <rect width="240" height="240" rx="24" fill="#ffffff" stroke="#f59e0b" strokeWidth="3" filter="drop-shadow(0 6px 14px rgba(0,0,0,0.08))" />
                      <circle cx="120" cy="30" r="8" fill="#f59e0b" />

                      <text x="120" y="70" textAnchor="middle" fill="#92400e" fontWeight="900" fontSize="13">
                        ÜRÜN ETİKETİ
                      </text>
                      <line x1="30" y1="82" x2="210" y2="82" stroke="#fde68a" strokeWidth="2" />

                      {/* Eski Fiyat (Üstü Çizili) */}
                      <text x="120" y="118" textAnchor="middle" fill="#94a3b8" fontWeight="900" fontSize="18" className="line-through">
                        {priceItem} TL
                      </text>

                      {/* İndirim Rozeti */}
                      <rect x="50" y="132" width="140" height="32" rx="12" fill="#ef4444" />
                      <text x="120" y="153" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="14">
                        %{discountPercent} İNDİRİM
                      </text>

                      {/* Yeni İndirimli Fiyat */}
                      <text x="120" y="205" textAnchor="middle" fill="#16a34a" fontWeight="900" fontSize="26">
                        {finalPrice} TL
                      </text>
                    </g>

                    {/* Sağ: Matematiksel Hesaplama Adımları */}
                    <g transform="translate(420, 60)">
                      <rect width="320" height="240" rx="24" fill="#ffffff" stroke="#10b981" strokeWidth="2" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.06))" />
                      <text x="160" y="34" textAnchor="middle" fill="#047857" fontWeight="900" fontSize="14">
                        YÜZDE HESAPLAMA ADIMLARI
                      </text>
                      <line x1="20" y1="46" x2="300" y2="46" stroke="#e2e8f0" strokeWidth="1.5" />

                      {/* Adım 1: İndirim Tutarı */}
                      <g transform="translate(20, 60)">
                        <rect width="280" height="46" rx="10" fill="#fff1f2" stroke="#f43f5e" strokeWidth="1.5" />
                        <text x="140" y="20" textAnchor="middle" fill="#be123c" fontWeight="800" fontSize="10">
                          1. ADIM: İndirim Tutarı = Fiyat × (Yüzde / 100)
                        </text>
                        <text x="140" y="38" textAnchor="middle" fill="#9f1239" fontWeight="900" fontSize="13">
                          {priceItem} × (%{discountPercent} / 100) = {discountAmount} TL İndirim
                        </text>
                      </g>

                      {/* Adım 2: Yeni Satış Fiyatı */}
                      <g transform="translate(20, 120)">
                        <rect width="280" height="46" rx="10" fill="#ecfdf5" stroke="#10b981" strokeWidth="1.5" />
                        <text x="140" y="20" textAnchor="middle" fill="#047857" fontWeight="800" fontSize="10">
                          2. ADIM: İndirimli Fiyat = Eski Fiyat - İndirim
                        </text>
                        <text x="140" y="38" textAnchor="middle" fill="#065f46" fontWeight="900" fontSize="13">
                          {priceItem} - {discountAmount} = {finalPrice} TL
                        </text>
                      </g>

                      {/* Pratik Yol */}
                      <g transform="translate(20, 180)">
                        <rect width="280" height="38" rx="10" fill="#f8fafc" stroke="#64748b" strokeWidth="1.5" />
                        <text x="140" y="24" textAnchor="middle" fill="#334155" fontWeight="900" fontSize="11">
                          ⚡ Pratik Yol: {priceItem} × {(100 - discountPercent) / 100} = {finalPrice} TL
                        </text>
                      </g>
                    </g>
                  </svg>
                </div>
              </div>
            )}

            {/* H5) ORTAOKUL 6: ASAL ÇARPAN AĞACI LABORATUVARI (DAİRELER & DALLAR) */}
            {missionType === 'prime_factor_tree' && (
              <div className="w-full h-full relative flex flex-col items-center justify-between p-6 select-none min-h-[500px]">
                {/* Üst Başlık Rozeti */}
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 font-black text-xs border border-indigo-500/20 shadow-2xs">
                    <span>🌳 Asal Çarpan Ağacı Modeli ({treeNumber} = {primeSummary.expString})</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Dallara dokunarak veya butonları kullanarak sayıyı en küçük asal çarpanlarına kadar ayrıştırın.
                  </p>
                </div>

                {/* İnteraktif Asal Çarpan Ağacı SVG Sahnesi */}
                <div className="w-full max-w-4xl h-80 sm:h-96 relative flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 rounded-3xl border-2 border-border shadow-xl overflow-hidden my-auto">
                  <svg className="w-full h-full block" viewBox="0 0 800 380" preserveAspectRatio="xMidYMid meet">
                    {/* Arka Plan Hafif Izgara Çizgileri */}
                    <g className="opacity-15 dark:opacity-10" stroke="currentColor">
                      {Array.from({ length: 17 }).map((_, i) => (
                        <line key={i} x1={i * 50} y1="0" x2={i * 50} y2="380" strokeDasharray="3,3" />
                      ))}
                    </g>

                    {/* Sol Bilgi Kutusu: Üslü Gösterim ve Asal Çarpanlar */}
                    <g transform="translate(40, 60)">
                      <rect width="180" height="230" rx="20" fill="#ffffff" stroke="#6366f1" strokeWidth="2" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.06))" />
                      <text x="90" y="32" textAnchor="middle" fill="#4338ca" fontWeight="900" fontSize="13">
                        ASAL ÇARPANLAR
                      </text>
                      <line x1="15" y1="44" x2="165" y2="44" stroke="#e0e7ff" strokeWidth="1.5" />

                      <text x="90" y="74" textAnchor="middle" fill="#64748b" fontWeight="700" fontSize="11">
                        Sayı:
                      </text>
                      <text x="90" y="98" textAnchor="middle" fill="#4f46e5" fontWeight="900" fontSize="22">
                        {treeNumber}
                      </text>

                      <rect x="20" y="115" width="140" height="36" rx="10" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
                      <text x="90" y="138" textAnchor="middle" fill="#b45309" fontWeight="900" fontSize="12">
                        Asallar: &#123; {primeSummary.uniquePrimes} &#125;
                      </text>

                      <rect x="20" y="162" width="140" height="46" rx="10" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.5" />
                      <text x="90" y="180" textAnchor="middle" fill="#3730a3" fontWeight="700" fontSize="10">
                        Üslü Çarpım:
                      </text>
                      <text x="90" y="198" textAnchor="middle" fill="#312e81" fontWeight="900" fontSize="14" fontFamily="monospace">
                        {primeSummary.expString}
                      </text>
                    </g>

                    {/* Merkez & Sağ: Daireler ve Dallardan Oluşan Ağaç (Dinamik) */}
                    <g transform="translate(130, 0)">
                      {/* DALLAR (Çizgiler arka planda çizilir) */}
                      {treeDecomposition.map((step, idx) => {
                        if (idx >= treeStep) return null;
                        const px = 320 + idx * 70;
                        const py = 55 + idx * 75;
                        const lx = px - 80;
                        const ly = py + 75;
                        const rx = px + 70;
                        const ry = py + 75;

                        return (
                          <g key={`branch-${idx}`}>
                            <line x1={px} y1={py} x2={lx} y2={ly} stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
                            <line x1={px} y1={py} x2={rx} y2={ry} stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
                          </g>
                        );
                      })}

                      {/* LEVEL 0: KÖK DÜĞÜM */}
                      <g>
                        <circle cx="320" cy="55" r="32" fill="#e0e7ff" stroke="#4f46e5" strokeWidth="3.5" filter="drop-shadow(0 4px 6px rgba(79,70,229,0.2))" />
                        <text x="320" y="63" textAnchor="middle" fill="#3730a3" fontWeight="900" fontSize="20">
                          {treeNumber}
                        </text>
                      </g>

                      {/* TÜM DÜĞÜMLER (Açılmış Seviyeler) */}
                      {treeDecomposition.map((step, idx) => {
                        if (idx >= treeStep) return null;
                        const px = 320 + idx * 70;
                        const py = 55 + idx * 75;
                        const lx = px - 80;
                        const ly = py + 75;
                        const rx = px + 70;
                        const ry = py + 75;

                        return (
                          <g key={`nodes-${idx}`} className="animate-in fade-in duration-300">
                            {/* Sol Çocuk Düğüm (Asal Turuncu Daire) */}
                            <g transform={`translate(${lx}, ${ly})`}>
                              <circle cx="0" cy="0" r={26 - idx * 1} fill="#fef3c7" stroke="#d97706" strokeWidth="3" filter="drop-shadow(0 2px 4px rgba(217,119,6,0.15))" />
                              <text x="0" y="6" textAnchor="middle" fill="#b45309" fontWeight="900" fontSize={18 - idx}>
                                {step.leftPrime}
                              </text>
                              <rect x="-18" y={32 - idx} width="36" height="16" rx="8" fill="#d97706" />
                              <text x="0" y={43 - idx} textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="8">
                                ASAL
                              </text>
                            </g>

                            {/* Sağ Çocuk Düğüm */}
                            <g
                              transform={`translate(${rx}, ${ry})`}
                              onClick={!step.rightIsPrime ? handleNextTreeStep : undefined}
                              className={!step.rightIsPrime ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}
                            >
                              <circle
                                cx="0"
                                cy="0"
                                r={26 - idx * 1}
                                fill={step.rightIsPrime ? '#fef3c7' : '#ecfdf5'}
                                stroke={step.rightIsPrime ? '#d97706' : '#059669'}
                                strokeWidth="3"
                                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.12))"
                              />
                              <text
                                x="0"
                                y="6"
                                textAnchor="middle"
                                fill={step.rightIsPrime ? '#b45309' : '#047857'}
                                fontWeight="900"
                                fontSize={18 - idx}
                              >
                                {step.rightVal}
                              </text>
                              <rect
                                x="-22"
                                y={32 - idx}
                                width="44"
                                height="16"
                                rx="8"
                                fill={step.rightIsPrime ? '#d97706' : '#059669'}
                              />
                              <text x="0" y={43 - idx} textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="8">
                                {step.rightIsPrime ? 'ASAL' : 'Bileşik'}
                              </text>
                            </g>
                          </g>
                        );
                      })}
                    </g>
                  </svg>
                </div>

                {/* Alt Kontrol Butonları */}
                <div className="w-full flex flex-wrap items-center justify-center gap-3 pt-4">
                  <button
                    onClick={handleNextTreeStep}
                    disabled={treeStep >= maxTreeSteps}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>🌿 +1 Dal Aç</span>
                  </button>

                  <button
                    onClick={handleFullTree}
                    disabled={treeStep >= maxTreeSteps}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black text-xs shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>⚡ Tüm Ağacı Aç</span>
                  </button>

                  <button
                    onClick={handleResetTree}
                    disabled={treeStep === 1}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 text-foreground disabled:opacity-40 font-black text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Baştan Başla</span>
                  </button>
                </div>
              </div>
            )}

            {/* H6) ORTAOKUL 6: ERATOSTHENES KALBURU (1-100 ASAL SAYILAR) */}
            {missionType === 'eratosthenes_sieve' && (
              <div className="w-full h-full relative flex flex-col items-center justify-between p-4 select-none min-h-[520px]">
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 text-rose-800 dark:text-rose-300 font-black text-xs border border-rose-500/20">
                    <span>🔴 Eratosthenes Kalburu (1-100 Arası 25 Asal Sayı)</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Asal sayıları tutun, katlarını eleyerek 100'e kadar olan tüm asalları süzün!
                  </p>
                </div>

                {/* 10x10 Izgara (1-100) */}
                <div className="w-full max-w-2xl bg-white dark:bg-slate-900 p-3 rounded-3xl border-2 border-border shadow-lg my-auto">
                  <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
                    {Array.from({ length: 100 }).map((_, i) => {
                      const num = i + 1;
                      const eliminated = isSieveEliminated(num);
                      const isPrimeNum = isPrime(num);
                      const isKeptPrime = isPrimeNum && sieveEliminated.includes(num);

                      return (
                        <div
                          key={num}
                          className={`h-7 sm:h-8 flex items-center justify-center rounded-lg font-black text-xs transition-all duration-200 ${
                            num === 1
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through opacity-40'
                              : isKeptPrime
                              ? 'bg-amber-400 dark:bg-amber-500 text-amber-950 shadow-md ring-2 ring-amber-600 scale-105'
                              : eliminated
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through opacity-35'
                              : 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 border border-indigo-200/50 hover:bg-indigo-100'
                          }`}
                        >
                          {num}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Filtreleme Adım Butonları */}
                <div className="w-full flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => handleSieveEliminate(2)}
                    disabled={sieveEliminated.includes(2)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-amber-950 font-black text-xs shadow-xs cursor-pointer"
                  >
                    <span>🟠 2'nin Katlarını Ele</span>
                  </button>
                  <button
                    onClick={() => handleSieveEliminate(3)}
                    disabled={sieveEliminated.includes(3)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black text-xs shadow-xs cursor-pointer"
                  >
                    <span>🟢 3'ün Katlarını Ele</span>
                  </button>
                  <button
                    onClick={() => handleSieveEliminate(5)}
                    disabled={sieveEliminated.includes(5)}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black text-xs shadow-xs cursor-pointer"
                  >
                    <span>🔵 5'in Katlarını Ele</span>
                  </button>
                  <button
                    onClick={() => handleSieveEliminate(7)}
                    disabled={sieveEliminated.includes(7)}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-black text-xs shadow-xs cursor-pointer"
                  >
                    <span>🟣 7'nin Katlarını Ele</span>
                  </button>
                  <button
                    onClick={handleRunAllSieve}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md cursor-pointer"
                  >
                    <span>⚡ Tümünü Süz (25 Asal)</span>
                  </button>
                  <button
                    onClick={handleResetSieve}
                    className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-foreground font-black text-xs cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* H7) ORTAOKUL 6: BÖLÜNEBİLME KURALLARI LABORATUVARI */}
            {missionType === 'divisibility_rules' && (
              <div className="w-full h-full relative flex flex-col items-center justify-between p-6 select-none min-h-[500px]">
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-black text-xs border border-emerald-500/20">
                    <span>⚡ Bölünebilme Kuralı İnceleme Laboratuvarı ({divNum})</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Son basamak ve rakamlar toplamı kurallarını canlı simülasyonla doğrulayın.
                  </p>
                </div>

                {/* Merkez İnteraktif Sayı Kartı ve Kural Kartları */}
                <div className="w-full max-w-3xl space-y-4 my-auto">
                  {/* Büyük Sayı Göstergesi */}
                  <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 rounded-3xl border-2 border-emerald-500/20 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-muted-foreground">İncelenen Sayı:</div>
                      <div className="font-mono text-3xl font-black text-foreground">
                        {divNum}{' '}
                        <span className="text-xs font-normal text-muted-foreground">
                          (Son Basamak: <strong className="text-emerald-600">{divNum % 10}</strong>, Rakamlar Toplamı:{' '}
                          <strong className="text-indigo-600">
                            {divNum
                              .toString()
                              .split('')
                              .map(Number)
                              .reduce((a, b) => a + b, 0)}
                          </strong>
                          )
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1.5 flex-wrap">
                      {[120, 240, 315, 459, 1024, 7500].map((val) => (
                        <button
                          key={val}
                          onClick={() => setDivNum(val)}
                          className={`px-3 py-1.5 rounded-xl font-mono font-black text-xs border transition-all cursor-pointer ${
                            divNum === val ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs' : 'bg-muted/60 text-foreground'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Kural Kontrol Matrisi */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {[
                      {
                        d: 2,
                        title: '2 ile Bölünme',
                        rule: 'Son basamak çift (0,2,4,6,8)',
                        pass: divNum % 2 === 0,
                      },
                      {
                        d: 3,
                        title: '3 ile Bölünme',
                        rule: 'Rakamlar toplamı 3\'ün katı',
                        pass: divNum % 3 === 0,
                      },
                      {
                        d: 4,
                        title: '4 ile Bölünme',
                        rule: 'Son 2 basamak 4\'ün katı',
                        pass: divNum % 4 === 0,
                      },
                      {
                        d: 5,
                        title: '5 ile Bölünme',
                        rule: 'Son basamak 0 veya 5',
                        pass: divNum % 5 === 0,
                      },
                      {
                        d: 6,
                        title: '6 ile Bölünme',
                        rule: 'Hem 2 hem 3\'e tam bölünür',
                        pass: divNum % 6 === 0,
                      },
                      {
                        d: 9,
                        title: '9 ile Bölünme',
                        rule: 'Rakamlar toplamı 9\'un katı',
                        pass: divNum % 9 === 0,
                      },
                      {
                        d: 10,
                        title: '10 ile Bölünme',
                        rule: 'Son basamak 0',
                        pass: divNum % 10 === 0,
                      },
                    ].map((k) => (
                      <div
                        key={k.d}
                        className={`p-3 rounded-2xl border transition-all ${
                          k.pass
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/40 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-900 border-border opacity-70'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-black text-xs text-foreground">{k.title}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                              k.pass ? 'bg-emerald-600 text-white' : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {k.pass ? 'BÖLÜNÜR ✓' : 'Bölünmez ✕'}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium">{k.rule}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    speakText(`${divNum} sayısının bölünebilme kuralları doğrulandı.`);
                    if (selectedActivity) markActivityCompleted(selectedActivity.id);
                    try {
                      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
                    } catch (e) {}
                  }}
                  className="px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Kuralları Doğrula &amp; Soruya Geç →
                </button>
              </div>
            )}

            {/* H8) ORTAOKUL 6: VENN ŞEMASI & ORTAK BÖLENLER */}
            {missionType === 'venn_divisors' && (
              <div className="w-full h-full relative flex flex-col items-center justify-between p-6 select-none min-h-[500px]">
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/10 text-pink-800 dark:text-pink-300 font-black text-xs border border-pink-500/20">
                    <span>⭕ Ortak Bölenler ve EBOB Venn Şeması ({vennA} &amp; {vennB})</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold">
                    İki sayının çarpanlarını Venn şemasında kesiştirerek ortak bölenleri ve EBOB'u bulun.
                  </p>
                </div>

                {/* Venn Şeması SVG */}
                <div className="w-full max-w-2xl h-72 relative flex items-center justify-center p-2 bg-white dark:bg-slate-900 rounded-3xl border-2 border-border shadow-xl my-auto">
                  <svg viewBox="0 0 600 240" className="w-full h-full">
                    {/* Sol Halka (A) */}
                    <circle cx="230" cy="120" r="100" fill="#f472b6" fillOpacity="0.25" stroke="#db2777" strokeWidth="3" />
                    {/* Sağ Halka (B) */}
                    <circle cx="370" cy="120" r="100" fill="#60a5fa" fillOpacity="0.25" stroke="#2563eb" strokeWidth="3" />

                    {/* Başlıklar */}
                    <text x="180" y="45" textAnchor="middle" fill="#db2777" fontWeight="900" fontSize="14">
                      {vennA}'nın Bölenleri
                    </text>
                    <text x="420" y="45" textAnchor="middle" fill="#2563eb" fontWeight="900" fontSize="14">
                      {vennB}'nin Bölenleri
                    </text>
                    <text x="300" y="35" textAnchor="middle" fill="#4f46e5" fontWeight="900" fontSize="13">
                      ORTAK BÖLENLER (EBOB = {ebobVal})
                    </text>

                    {/* Yalnızca A'nın Bölenleri */}
                    <g transform="translate(180, 110)">
                      <text x="0" y="0" textAnchor="middle" fill="#9d174d" fontWeight="900" fontSize="13">
                        {onlyA.join(', ') || '-'}
                      </text>
                    </g>

                    {/* Kesişim / Ortak Bölenler */}
                    <g transform="translate(300, 110)">
                      <text x="0" y="0" textAnchor="middle" fill="#312e81" fontWeight="900" fontSize="15">
                        {commonDivisors.join(', ')}
                      </text>
                      <rect x="-35" y="16" width="70" height="20" rx="10" fill="#4f46e5" />
                      <text x="0" y="30" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="9">
                        EBOB = {ebobVal}
                      </text>
                    </g>

                    {/* Yalnızca B'nin Bölenleri */}
                    <g transform="translate(420, 110)">
                      <text x="0" y="0" textAnchor="middle" fill="#1e40af" fontWeight="900" fontSize="13">
                        {onlyB.join(', ') || '-'}
                      </text>
                    </g>
                  </svg>
                </div>

                {/* Kontroller */}
                <div className="w-full flex flex-wrap items-center justify-center gap-3 pt-2">
                  <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-2xl text-xs font-bold">
                    <span>A:</span>
                    {[12, 18, 20, 30].map((v) => (
                      <button
                        key={v}
                        onClick={() => setVennA(v)}
                        className={`px-2.5 py-1 rounded-xl cursor-pointer ${vennA === v ? 'bg-pink-600 text-white' : 'bg-background'}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-2xl text-xs font-bold">
                    <span>B:</span>
                    {[18, 24, 36, 48].map((v) => (
                      <button
                        key={v}
                        onClick={() => setVennB(v)}
                        className={`px-2.5 py-1 rounded-xl cursor-pointer ${vennB === v ? 'bg-blue-600 text-white' : 'bg-background'}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      speakText(`${vennA} ve ${vennB} sayılarının en büyük ortak böleni EBOB ${ebobVal} dir.`);
                      if (selectedActivity) markActivityCompleted(selectedActivity.id);
                      try {
                        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
                      } catch (e) {}
                    }}
                    className="px-6 py-2.5 rounded-2xl bg-pink-600 hover:bg-pink-700 text-white font-black text-xs shadow-md cursor-pointer"
                  >
                    EBOB'u Doğrula →
                  </button>
                </div>
              </div>
            )}

            {/* H9) ORTAOKUL 6: RİTİM MODELİ & ORTAK KATLAR (EKOK) */}
            {missionType === 'rhythmic_multiples' && (
              <div className="w-full h-full relative flex flex-col items-center justify-between p-6 select-none min-h-[500px]">
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 font-black text-xs border border-cyan-500/20">
                    <span>🏃 Ritmik Sayma &amp; En Küçük Ortak Kat (EKOK = {ekokVal})</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold">
                    {rhythmA}'şar ve {rhythmB}'şer ritmik saymada buluşulan ilk ortak noktayı keşfedin.
                  </p>
                </div>

                {/* Çift Ritim Çizgisi Sahnesi */}
                <div className="w-full max-w-3xl h-64 bg-white dark:bg-slate-900 rounded-3xl border-2 border-border p-4 shadow-xl my-auto flex items-center justify-center">
                  <svg viewBox="0 0 700 200" className="w-full h-full">
                    {/* Sayı Doğrusu Ana Çizgisi */}
                    <line x1="30" y1="100" x2="670" y2="100" stroke="#94a3b8" strokeWidth="2.5" />

                    {/* Çentikler (0'dan 24'e) */}
                    {Array.from({ length: 25 }).map((_, i) => {
                      const cx = 40 + i * 25;
                      const isEKOK = i === ekokVal;
                      return (
                        <g key={i}>
                          <line x1={cx} y1="92" x2={cx} y2="108" stroke="#cbd5e1" strokeWidth="1.5" />
                          <text x={cx} y="124" textAnchor="middle" fontSize="10" fontWeight="bold" fill={isEKOK ? '#ef4444' : '#64748b'}>
                            {i}
                          </text>
                          {isEKOK && (
                            <g>
                              <circle cx={cx} cy="100" r="7" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                              <rect x={cx - 30} y="132" width="60" height="20" rx="10" fill="#ef4444" />
                              <text x={cx} y="145" textAnchor="middle" fontSize="9" fontWeight="900" fill="#ffffff">
                                EKOK = {ekokVal}
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {/* A Ritim Yayları (Üst - Turkuaz) */}
                    {Array.from({ length: Math.floor(24 / rhythmA) }).map((_, i) => {
                      const startX = 40 + i * rhythmA * 25;
                      const endX = startX + rhythmA * 25;
                      const midX = (startX + endX) / 2;
                      return (
                        <path
                          key={`a-${i}`}
                          d={`M ${startX} 95 Q ${midX} 45, ${endX} 95`}
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      );
                    })}

                    {/* B Ritim Yayları (Alt - Kehribar) */}
                    {Array.from({ length: Math.floor(24 / rhythmB) }).map((_, i) => {
                      const startX = 40 + i * rhythmB * 25;
                      const endX = startX + rhythmB * 25;
                      const midX = (startX + endX) / 2;
                      return (
                        <path
                          key={`b-${i}`}
                          d={`M ${startX} 105 Q ${midX} 155, ${endX} 105`}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="3"
                          strokeDasharray="4,3"
                          strokeLinecap="round"
                        />
                      );
                    })}
                  </svg>
                </div>

                {/* Kontroller */}
                <div className="w-full flex flex-wrap items-center justify-center gap-3 pt-2">
                  <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-2xl text-xs font-bold">
                    <span>1. Koşucu:</span>
                    {[3, 4, 5, 6].map((v) => (
                      <button
                        key={v}
                        onClick={() => setRhythmA(v)}
                        className={`px-2.5 py-1 rounded-xl cursor-pointer ${rhythmA === v ? 'bg-cyan-600 text-white' : 'bg-background'}`}
                      >
                        {v}'er
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-2xl text-xs font-bold">
                    <span>2. Koşucu:</span>
                    {[4, 6, 8, 10].map((v) => (
                      <button
                        key={v}
                        onClick={() => setRhythmB(v)}
                        className={`px-2.5 py-1 rounded-xl cursor-pointer ${rhythmB === v ? 'bg-amber-600 text-white' : 'bg-background'}`}
                      >
                        {v}'şer
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      speakText(`${rhythmA} ve ${rhythmB} sayılarının en küçük ortak katı EKOK ${ekokVal} dir.`);
                      if (selectedActivity) markActivityCompleted(selectedActivity.id);
                      try {
                        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
                      } catch (e) {}
                    }}
                    className="px-6 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs shadow-md cursor-pointer"
                  >
                    EKOK'u Doğrula →
                  </button>
                </div>
              </div>
            )}

            {/* H10) ORTAOKUL 6: ALAN MODELİ İLE ÇARPANLAR */}
            {missionType === 'area_rectangles' && (
              <div className="w-full h-full relative flex flex-col items-center justify-between p-6 select-none min-h-[500px]">
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 font-black text-xs border border-amber-500/20">
                    <span>📐 Alan Modeli ile Çarpan Keşfi (Alan = {areaTarget} br²)</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Alanı {areaTarget} olan farklı dikdörtgen boyutlarını seçerek tüm çarpan çiftlerini görün.
                  </p>
                </div>

                {/* Geometrik Dikdörtgen Çizim Sahnesi */}
                <div className="w-full max-w-2xl h-72 bg-white dark:bg-slate-900 rounded-3xl border-2 border-border p-4 shadow-xl my-auto flex flex-col items-center justify-center gap-4">
                  {areaFactorPairs[selectedPairIdx] && (
                    <div className="flex flex-col items-center gap-2">
                      <div
                        style={{
                          width: `${Math.min(380, Math.max(60, areaFactorPairs[selectedPairIdx].w * 18))}px`,
                          height: `${Math.min(180, Math.max(40, areaFactorPairs[selectedPairIdx].h * 18))}px`,
                        }}
                        className="bg-amber-100 dark:bg-amber-950/40 border-3 border-amber-600 rounded-2xl flex items-center justify-center font-black text-amber-900 dark:text-amber-200 text-sm shadow-md transition-all duration-300"
                      >
                        {areaFactorPairs[selectedPairIdx].w} × {areaFactorPairs[selectedPairIdx].h} = {areaTarget} br²
                      </div>

                      <div className="text-xs font-bold text-muted-foreground">
                        En: <strong>{areaFactorPairs[selectedPairIdx].w}</strong> | Boy:{' '}
                        <strong>{areaFactorPairs[selectedPairIdx].h}</strong> | Çevre:{' '}
                        <strong>
                          2 × ({areaFactorPairs[selectedPairIdx].w} + {areaFactorPairs[selectedPairIdx].h}) ={' '}
                          {2 * (areaFactorPairs[selectedPairIdx].w + areaFactorPairs[selectedPairIdx].h)} br
                        </strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* Boyut Seçim Butonları */}
                <div className="w-full flex flex-wrap items-center justify-center gap-2 pt-2">
                  {areaFactorPairs.map((pair, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedPairIdx(idx)}
                      className={`px-4 py-2 rounded-xl font-mono font-black text-xs border transition-all cursor-pointer ${
                        selectedPairIdx === idx ? 'bg-amber-600 text-white border-amber-700 shadow-sm scale-105' : 'bg-muted/60 text-foreground'
                      }`}
                    >
                      {pair.w} × {pair.h}
                    </button>
                  ))}

                  <button
                    onClick={() => {
                      speakText(`Alan ${areaTarget} olan dikdörtgenin çarpanları keşfedildi.`);
                      if (selectedActivity) markActivityCompleted(selectedActivity.id);
                      try {
                        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
                      } catch (e) {}
                    }}
                    className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md cursor-pointer ml-2"
                  >
                    Çarpanları Doğrula →
                  </button>
                </div>
              </div>
            )}

            {/* H11) ORTAOKUL 6: BÖLEN LİSTESİ ALGORİTMASI */}
            {missionType === 'division_ladder' && (
              <div className="w-full h-full relative flex flex-col items-center justify-between p-6 select-none min-h-[500px]">
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 font-black text-xs border border-indigo-500/20">
                    <span>📋 Bölen Listesi (Asal Çarpan Algoritması: {ladderNum})</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold">
                    En küçük asaldan başlayarak dikey bölme algoritmasını adım adım uygulayın.
                  </p>
                </div>

                {/* Dikey Bölen Listesi Sahnesi */}
                <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border-2 border-border p-6 shadow-xl my-auto flex flex-col items-center gap-4">
                  <div className="flex items-center gap-4 font-mono text-xl font-black">
                    <div className="flex flex-col text-right text-foreground pr-4 border-r-3 border-indigo-600 space-y-2">
                      {ladderSteps.map((st, i) => (
                        <span key={i} className={i <= ladderStep ? 'opacity-100' : 'opacity-0'}>
                          {st.val}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-col text-left text-indigo-600 dark:text-indigo-400 space-y-2">
                      {ladderSteps.slice(0, -1).map((st, i) => (
                        <span key={i} className={i < ladderStep ? 'opacity-100' : 'opacity-0'}>
                          {st.prime}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="font-mono text-xs font-black text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-xl">
                    Üslü Gösterim: {ladderNum} = {primeSummary.expString}
                  </div>
                </div>

                {/* Kontroller */}
                <div className="w-full flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setLadderStep((p) => Math.min(ladderSteps.length - 1, p + 1))}
                    disabled={ladderStep >= ladderSteps.length - 1}
                    className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs shadow-md cursor-pointer"
                  >
                    <span>⬇️ Bir Sonraki Asala Böl (+1)</span>
                  </button>

                  <button
                    onClick={() => setLadderStep(ladderSteps.length - 1)}
                    className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm cursor-pointer"
                  >
                    <span>⚡ Tüm Listeyi Aç</span>
                  </button>

                  <button
                    onClick={() => setLadderStep(1)}
                    className="p-2.5 rounded-2xl bg-slate-200 dark:bg-slate-800 text-foreground font-black text-xs cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
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

            {/* 0B. KARIŞ İLE UZUNLUK ÖLÇÜM KONTROLLERİ */}
            {missionType === 'span_measurement' && (
              <div className="space-y-4 mb-4">
                <button
                  onClick={() =>
                    speakText(
                      'Sıranın sol ucundan başlayarak karışlarını uç uca ekle. Sıranın kaç karış olduğunu bul ve Doğrula butonuna bas!'
                    )
                  }
                  className="w-full py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 Yönergeyi Sesli Dinle</span>
                </button>

                <div className="p-3 bg-muted/40 rounded-2xl border text-xs space-y-1.5 font-medium">
                  <div className="flex justify-between font-bold">
                    <span>Hedef Ölçüm:</span>
                    <span className="font-mono text-amber-600 font-black">6 Karış</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Yerleştirilen Karış:</span>
                    <span className="font-mono text-emerald-600 font-black">{placedSpans} / 6</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground pt-1 border-t">
                    <span>Kalan Karış:</span>
                    <span className="font-mono font-bold text-foreground">{Math.max(0, 6 - placedSpans)} Karış</span>
                  </div>
                </div>

                <button
                  onClick={handleVerifySpans}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Ölçümü Doğrula &amp; Soruya Geç →
                </button>
              </div>
            )}

            {/* 0C. PİSAGOR TEOREMİ SAĞ KONTROLLERİ */}
            {missionType === 'pythagoras_theorem' && (
              <div className="space-y-4 mb-4">
                <button
                  onClick={() =>
                    speakText(
                      `Dik üçgende dik kenarların kareleri toplamı hipotenüsün karesine eşittir. ${pythA} karesi artı ${pythB} karesi eşittir ${pythC} karesi.`
                    )
                  }
                  className="w-full py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 Pisagor Bağıntısını Dinle</span>
                </button>

                {/* Dik Kenar a Sürgüsü */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-foreground">Dik Kenar (a)</span>
                    <span className="font-mono text-rose-600 bg-rose-500/10 px-2.5 py-0.5 rounded-lg border border-rose-500/20 font-black">
                      {pythA} br (a² = {pythA * pythA})
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={12}
                    step={1}
                    value={pythA}
                    onChange={(e) => setPythA(parseInt(e.target.value))}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                </div>

                {/* Dik Kenar b Sürgüsü */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-foreground">Dik Kenar (b)</span>
                    <span className="font-mono text-sky-600 bg-sky-500/10 px-2.5 py-0.5 rounded-lg border border-sky-500/20 font-black">
                      {pythB} br (b² = {pythB * pythB})
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={12}
                    step={1}
                    value={pythB}
                    onChange={(e) => setPythB(parseInt(e.target.value))}
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                </div>

                {/* Hızlı Özel Üçgen Butonları */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { a: 3, b: 4, name: '3-4-5' },
                    { a: 6, b: 8, name: '6-8-10' },
                    { a: 5, b: 12, name: '5-12-13' },
                    { a: 8, b: 15, name: '8-15-17' },
                  ].map((tri) => (
                    <button
                      key={tri.name}
                      onClick={() => {
                        setPythA(tri.a);
                        setPythB(tri.b);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-300 dark:border-emerald-800 transition-all cursor-pointer"
                    >
                      {tri.name}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleVerifyPythagoras}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Bağıntıyı Doğrula &amp; Soruya Geç →
                </button>
              </div>
            )}

            {/* 0D. KAREKÖKLÜ SAYILAR SAĞ KONTROLLERİ */}
            {missionType === 'square_roots' && (
              <div className="space-y-4 mb-4">
                <button
                  onClick={() =>
                    speakText(
                      `Alanı ${sqrtArea} olan karenin bir kenarı karekök ${sqrtArea} dır. Değeri yaklaşık ${sqrtVal} birimdir.`
                    )
                  }
                  className="w-full py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 Karekök Yönergesini Dinle</span>
                </button>

                {/* Karenin Alanı Sürgüsü */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-foreground">Karenin Alanı (A)</span>
                    <span className="font-mono text-rose-600 bg-rose-500/10 px-2.5 py-0.5 rounded-lg border border-rose-500/20 font-black">
                      {sqrtArea} br²
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    step={1}
                    value={sqrtArea}
                    onChange={(e) => setSqrtArea(parseInt(e.target.value))}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                </div>

                {/* Hızlı Tam Kare Butonları */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[16, 20, 25, 36, 49, 50, 64, 81, 100].map((val) => (
                    <button
                      key={val}
                      onClick={() => setSqrtArea(val)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border transition-all cursor-pointer ${
                        sqrtArea === val
                          ? 'bg-rose-600 text-white border-rose-700'
                          : 'bg-muted/50 hover:bg-muted text-foreground border-border'
                      }`}
                    >
                      A = {val}
                    </button>
                  ))}
                </div>

                <div className="p-3 bg-muted/40 rounded-2xl border text-xs space-y-1 font-medium">
                  <div className="flex justify-between font-bold">
                    <span>Bir Kenar (s = √A):</span>
                    <span className="font-mono text-rose-600 font-black">√{sqrtArea} = {sqrtVal} br</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t text-[11px] text-muted-foreground">
                    <span>Aralık:</span>
                    <span>{Math.floor(sqrtVal)} &lt; √{sqrtArea} &lt; {Math.ceil(sqrtVal)}</span>
                  </div>
                </div>

                <button
                  onClick={handleVerifySqrt}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Karekökü Doğrula &amp; Soruya Geç →
                </button>
              </div>
            )}

            {/* 0E. EBOB & EKOK FAYANS SAĞ KONTROLLERİ */}
            {missionType === 'ebob_ekok_tiles' && (
              <div className="space-y-4 mb-4">
                <button
                  onClick={() =>
                    speakText(
                      `${roomW} ve ${roomH} sayılarının en büyük ortak böleni ${currentEBOB} dir. En büyük kare fayans ${currentEBOB} cm olmalıdır.`
                    )
                  }
                  className="w-full py-2.5 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 EBOB/EKOK Yönergesini Dinle</span>
                </button>

                {/* Fayans Kenarı Sürgüsü */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-foreground">Kare Fayans Kenarı (T)</span>
                    <span className="font-mono text-blue-600 bg-blue-500/10 px-2.5 py-0.5 rounded-lg border border-blue-500/20 font-black">
                      {tileSize} cm
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={Math.min(roomW, roomH)}
                    step={1}
                    value={tileSize}
                    onChange={(e) => setTileSize(parseInt(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                {/* EBOB Butonu */}
                <button
                  onClick={handleSetEBOBTile}
                  className="w-full py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold text-xs border border-amber-300 dark:border-amber-700 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>🎯 En Büyük Fayansı Bul (EBOB = {currentEBOB} cm)</span>
                </button>

                <div className="p-3 bg-muted/40 rounded-2xl border text-xs space-y-1 font-medium">
                  <div className="flex justify-between font-bold">
                    <span>Oda Ölçüleri:</span>
                    <span className="font-mono text-foreground">{roomW} × {roomH} cm</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Durum:</span>
                    <span className={isTilePerfect ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'}>
                      {isTilePerfect ? `✅ Tam Bölüyor (${totalTilesCount} Fayans)` : '❌ Boşluk Kalıyor'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleVerifyEBOB}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Fayans Döşemeyi Doğrula →
                </button>
              </div>
            )}

            {/* 0F. ORAN, ORANTI & YÜZDE SAĞ KONTROLLERİ */}
            {missionType === 'ratio_proportion' && (
              <div className="space-y-4 mb-4">
                <button
                  onClick={() =>
                    speakText(
                      `${priceItem} TL lik ürüne yüzde ${discountPercent} indirim uygulandığında indirim tutarı ${discountAmount} TL olur. Ödenecek tutar ${finalPrice} TL dir.`
                    )
                  }
                  className="w-full py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 İndirim Hesabını Dinle</span>
                </button>

                {/* Ürün Fiyatı Sürgüsü */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-foreground">Etiket Fiyatı</span>
                    <span className="font-mono text-amber-600 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20 font-black">
                      {priceItem} TL
                    </span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={1000}
                    step={50}
                    value={priceItem}
                    onChange={(e) => setPriceItem(parseInt(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>

                {/* İndirim Yüzdesi Sürgüsü */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-foreground">İndirim Oranı</span>
                    <span className="font-mono text-rose-600 bg-rose-500/10 px-2.5 py-0.5 rounded-lg border border-rose-500/20 font-black">
                      %{discountPercent}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={75}
                    step={5}
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseInt(e.target.value))}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-muted/40 rounded-2xl border text-xs space-y-1.5 font-medium">
                  <div className="flex justify-between font-bold text-rose-600">
                    <span>İndirim Tutarı:</span>
                    <span className="font-mono font-black">-{discountAmount} TL</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-600 pt-1 border-t">
                    <span>Ödenecek Tutar:</span>
                    <span className="font-mono text-sm font-black">{finalPrice} TL</span>
                  </div>
                </div>

                <button
                  onClick={handleVerifyRatio}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Hesabı Doğrula &amp; Soruya Geç →
                </button>
              </div>
            )}

            {/* 0G. ASAL ÇARPAN AĞACI SAĞ KONTROLLERİ */}
            {missionType === 'prime_factor_tree' && (
              <div className="space-y-4 mb-4">
                <button
                  onClick={() =>
                    speakText(
                      `${treeNumber} sayısının asal çarpanları 2 ve 3 tür. Üslü biçimde ${treeNumber === 24 ? '2 üzeri 3 çarpı 3' : '2 üzeri 2 çarpı 3 üzeri 2'} olarak gösterilir.`
                    )
                  }
                  className="w-full py-2.5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 Asal Çarpan Ağacını Dinle</span>
                </button>

                {/* Sayı Seçimi */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-foreground">Ayrıştırılacak Sayı</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[24, 36, 48, 60, 72, 90].map((num) => (
                      <button
                        key={num}
                        onClick={() => {
                          setTreeNumber(num);
                          setTreeStep(1);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                          treeNumber === num
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                            : 'bg-muted/50 hover:bg-muted text-foreground border-border'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-muted/40 rounded-2xl border text-xs space-y-1.5 font-medium">
                  <div className="flex justify-between font-bold">
                    <span>Açılan Dal Seviyesi:</span>
                    <span className="font-mono text-indigo-600 font-black">{treeStep} / {maxTreeSteps}</span>
                  </div>
                  <div className="flex justify-between font-bold text-amber-600">
                    <span>Asal Çarpanlar:</span>
                    <span className="font-mono font-black">&#123; {primeSummary.uniquePrimes} &#125;</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-600 pt-1 border-t">
                    <span>Üslü Gösterim:</span>
                    <span className="font-mono text-sm font-black">
                      {primeSummary.expString}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    handleFullTree();
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Ağacı Doğrula &amp; Soruya Geç →
                </button>
              </div>
            )}

            {/* 0G2. ERATOSTHENES KALBURU SAĞ KONTROLLERİ */}
            {missionType === 'eratosthenes_sieve' && (
              <div className="space-y-4 mb-4">
                <button
                  onClick={() =>
                    speakText(
                      'Eratosthenes kalburunda 1 asal değildir. 2, 3, 5, 7 asaldır ancak katları asal değildir. Katlar elendiğinde 100 e kadar toplam 25 asal sayı kalır.'
                    )
                  }
                  className="w-full py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 Kalbur Bilgisini Dinle</span>
                </button>

                <div className="p-3 bg-muted/40 rounded-2xl border text-xs space-y-1.5 font-medium">
                  <div className="flex justify-between font-bold">
                    <span>Elenen Katlar:</span>
                    <span className="font-mono text-rose-600 font-black">
                      {sieveEliminated.filter((x) => x > 1).map((x) => `${x}'nin katları`).join(', ') || 'Henüz elenmedi'}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-amber-600">
                    <span>Kalan Asal Sayılar:</span>
                    <span className="font-mono font-black">
                      {sieveEliminated.length >= 5 ? '25 Asal (Tamamlandı)' : 'Süzülüyor...'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleRunAllSieve}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Kalburu Doğrula &amp; Soruya Geç →
                </button>
              </div>
            )}

            {/* 0G3. BÖLÜNEBİLME KURALLARI SAĞ KONTROLLERİ */}
            {missionType === 'divisibility_rules' && (
              <div className="space-y-4 mb-4">
                <button
                  onClick={() =>
                    speakText(
                      `${divNum} sayısının son basamağı ${divNum % 10}, rakamlar toplamı ${divNum
                        .toString()
                        .split('')
                        .map(Number)
                        .reduce((a, b) => a + b, 0)} dır.`
                    )
                  }
                  className="w-full py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 Kural Açıklamasını Dinle</span>
                </button>

                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-foreground">Sayıyı Değiştir</span>
                  <input
                    type="range"
                    min={10}
                    max={999}
                    step={5}
                    value={divNum}
                    onChange={(e) => setDivNum(parseInt(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-muted/40 rounded-2xl border text-xs space-y-1 font-medium">
                  <div className="flex justify-between font-bold">
                    <span>2, 5, 10 Uyumu:</span>
                    <span className={divNum % 10 === 0 ? 'text-emerald-600 font-black' : 'text-foreground'}>
                      {divNum % 10 === 0 ? 'Hepsine bölünür (Son=0)' : divNum % 2 === 0 ? 'Yalnızca 2' : divNum % 5 === 0 ? 'Yalnızca 5' : 'Bölünmez'}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>3 ve 9 Uyumu:</span>
                    <span className={divNum % 9 === 0 ? 'text-emerald-600 font-black' : divNum % 3 === 0 ? 'text-blue-600 font-black' : 'text-foreground'}>
                      {divNum % 9 === 0 ? 'Hem 3 hem 9' : divNum % 3 === 0 ? 'Yalnızca 3' : 'Bölünmez'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    speakText(`${divNum} sayısının bölünebilme kuralları doğrulandı.`);
                    if (selectedActivity) markActivityCompleted(selectedActivity.id);
                    try {
                      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
                    } catch (e) {}
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Kuralları Doğrula &amp; Soruya Geç →
                </button>
              </div>
            )}

            {/* 0G4. VENN ŞEMASI & ORTAK BÖLENLER SAĞ KONTROLLERİ */}
            {missionType === 'venn_divisors' && (
              <div className="space-y-4 mb-4">
                <button
                  onClick={() =>
                    speakText(
                      `${vennA} ve ${vennB} sayılarının ortak bölenleri ${commonDivisors.join(', ')} dir. En büyük ortak bölen EBOB ${ebobVal} dir.`
                    )
                  }
                  className="w-full py-2.5 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 EBOB Venn Anlatımını Dinle</span>
                </button>

                <div className="p-3 bg-muted/40 rounded-2xl border text-xs space-y-1.5 font-medium">
                  <div className="flex justify-between font-bold">
                    <span>Ortak Bölen Kümesi:</span>
                    <span className="font-mono text-indigo-600 font-black">&#123; {commonDivisors.join(', ')} &#125;</span>
                  </div>
                  <div className="flex justify-between font-bold text-pink-600 pt-1 border-t">
                    <span>EBOB({vennA}, {vennB}):</span>
                    <span className="font-mono text-sm font-black">{ebobVal}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    speakText(`EBOB ${ebobVal} olarak doğrulandı.`);
                    if (selectedActivity) markActivityCompleted(selectedActivity.id);
                    try {
                      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
                    } catch (e) {}
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  EBOB'u Doğrula &amp; Soruya Geç →
                </button>
              </div>
            )}

            {/* 0G5. RİTİM MODELİ & EKOK SAĞ KONTROLLERİ */}
            {missionType === 'rhythmic_multiples' && (
              <div className="space-y-4 mb-4">
                <button
                  onClick={() =>
                    speakText(
                      `${rhythmA} ve ${rhythmB} nin katları sayı doğrusunda incelendiğinde ilk ortak katları ${ekokVal} dir.`
                    )
                  }
                  className="w-full py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-600 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 EKOK Ritim Bilgisini Dinle</span>
                </button>

                <div className="p-3 bg-muted/40 rounded-2xl border text-xs space-y-1.5 font-medium">
                  <div className="flex justify-between font-bold">
                    <span>1. Sayının Katları:</span>
                    <span className="font-mono text-cyan-600 font-black">{rhythmA}, {rhythmA * 2}, {rhythmA * 3}, {rhythmA * 4}...</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>2. Sayının Katları:</span>
                    <span className="font-mono text-amber-600 font-black">{rhythmB}, {rhythmB * 2}, {rhythmB * 3}, {rhythmB * 4}...</span>
                  </div>
                  <div className="flex justify-between font-bold text-red-600 pt-1 border-t">
                    <span>EKOK({rhythmA}, {rhythmB}):</span>
                    <span className="font-mono text-sm font-black">{ekokVal}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    speakText(`EKOK ${ekokVal} olarak doğrulandı.`);
                    if (selectedActivity) markActivityCompleted(selectedActivity.id);
                    try {
                      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
                    } catch (e) {}
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  EKOK'u Doğrula &amp; Soruya Geç →
                </button>
              </div>
            )}

            {/* 0G6. ALAN MODELİ İLE ÇARPANLAR SAĞ KONTROLLERİ */}
            {missionType === 'area_rectangles' && (
              <div className="space-y-4 mb-4">
                <button
                  onClick={() =>
                    speakText(
                      `Alanı ${areaTarget} olan dikdörtgenin tüm çarpan çiftleri: ${areaFactorPairs.map((p) => `${p.w} çarpı ${p.h}`).join(', ')} dir.`
                    )
                  }
                  className="w-full py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 Alan Çarpanlarını Dinle</span>
                </button>

                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-foreground">Hedef Alan (br²)</span>
                  <div className="flex gap-1.5">
                    {[24, 36, 48, 60].map((num) => (
                      <button
                        key={num}
                        onClick={() => {
                          setAreaTarget(num);
                          setSelectedPairIdx(0);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs border cursor-pointer ${
                          areaTarget === num ? 'bg-amber-600 text-white border-amber-700 shadow-xs' : 'bg-muted/50'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-muted/40 rounded-2xl border text-xs space-y-1 font-medium">
                  <div className="flex justify-between font-bold">
                    <span>Toplam Çarpan Çifti:</span>
                    <span className="font-mono text-amber-600 font-black">{areaFactorPairs.length} Adet</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    speakText(`Alan ${areaTarget} olan dikdörtgenin çarpanları doğrulandı.`);
                    if (selectedActivity) markActivityCompleted(selectedActivity.id);
                    try {
                      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
                    } catch (e) {}
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Çarpanları Doğrula &amp; Soruya Geç →
                </button>
              </div>
            )}

            {/* 0G7. BÖLEN LİSTESİ SAĞ KONTROLLERİ */}
            {missionType === 'division_ladder' && (
              <div className="space-y-4 mb-4">
                <button
                  onClick={() =>
                    speakText(
                      `${ladderNum} sayısının bölen listesinde en küçük asaldan başlanarak 1 e ulaşılır. Asal çarpanlar ${primeSummary.expString} dir.`
                    )
                  }
                  className="w-full py-2.5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 Bölen Listesini Dinle</span>
                </button>

                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-foreground">Sayıyı Değiştir</span>
                  <div className="flex gap-1.5">
                    {[24, 36, 48, 60, 72].map((num) => (
                      <button
                        key={num}
                        onClick={() => {
                          setLadderNum(num);
                          setLadderStep(1);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs border cursor-pointer ${
                          ladderNum === num ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs' : 'bg-muted/50'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-muted/40 rounded-2xl border text-xs space-y-1 font-medium">
                  <div className="flex justify-between font-bold">
                    <span>Adım İlerlemesi:</span>
                    <span className="font-mono text-indigo-600 font-black">{ladderStep} / {ladderSteps.length - 1}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-600 pt-1 border-t">
                    <span>Üslü Gösterim:</span>
                    <span className="font-mono text-sm font-black">{primeSummary.expString}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setLadderStep(ladderSteps.length - 1);
                    speakText(`Bölen listesi algoritması doğrulandı.`);
                    if (selectedActivity) markActivityCompleted(selectedActivity.id);
                    try {
                      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
                    } catch (e) {}
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Listeyi Doğrula &amp; Soruya Geç →
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
          <div
            className={`p-4 rounded-3xl border-2 transition-all cursor-pointer ${
              activeStep === 2 ? 'bg-primary/5 border-primary shadow-xs' : 'bg-muted/30 border-border opacity-85 hover:opacity-100'
            }`}
          >
            <div
              onClick={() => setActiveStep(2)}
              className="flex items-center justify-between mb-2 select-none"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-black flex items-center justify-center text-xs">
                  2
                </span>
                <h3 className="font-extrabold text-sm text-foreground">Karar Ver</h3>
              </div>
              {step2Verified && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            </div>

            {activeStep === 2 && (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-foreground font-semibold leading-relaxed">
                  {pedagogicalData.question}
                </p>

                <div className="space-y-1.5">
                  {pedagogicalData.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedOption(idx)}
                      className={`w-full p-2.5 rounded-2xl text-xs font-bold text-left transition-all border cursor-pointer ${
                        selectedOption === idx
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
                  Cevabı Kontrol Et →
                </button>
              </div>
            )}
          </div>

          {/* ADIM 3: AÇIKLA */}
          <div
            className={`p-4 rounded-3xl border-2 transition-all cursor-pointer ${
              activeStep === 3 ? 'bg-emerald-500/10 border-emerald-500' : 'bg-muted/30 border-border opacity-85 hover:opacity-100'
            }`}
          >
            <div
              onClick={() => setActiveStep(3)}
              className="flex items-center gap-2 mb-2 select-none"
            >
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-xs">
                3
              </span>
              <h3 className="font-extrabold text-sm text-foreground">Açıkla</h3>
            </div>

            {activeStep === 3 && (
              <div className="space-y-3 pt-1 text-xs text-muted-foreground">
                <div className="p-3 bg-emerald-500/5 dark:bg-emerald-950/20 rounded-2xl border border-emerald-500/20">
                  <p className="text-foreground font-bold leading-relaxed">
                    {pedagogicalData.explanation}
                  </p>
                </div>

                <button
                  onClick={() => setActiveStep(4)}
                  className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Notlar ve Özete Geç →
                </button>
              </div>
            )}
          </div>

          {/* ADIM 4: NOTLAR VE ÖZET */}
          <div
            className={`p-4 rounded-3xl border-2 transition-all cursor-pointer ${
              activeStep === 4 ? 'bg-indigo-500/10 border-indigo-500' : 'bg-muted/30 border-border opacity-85 hover:opacity-100'
            }`}
          >
            <div
              onClick={() => setActiveStep(4)}
              className="flex items-center gap-2 mb-2 select-none"
            >
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center text-xs">
                4
              </span>
              <h3 className="font-extrabold text-sm text-foreground">Notlar ve Özet</h3>
            </div>

            {activeStep === 4 && (
              <div className="space-y-3 pt-1 text-xs text-muted-foreground">
                <div className="p-3 bg-card rounded-2xl border border-border space-y-2 font-medium text-foreground">
                  <div className="font-black text-indigo-600 dark:text-indigo-400 text-xs">
                    📌 Konu Özeti ve Kritik Kazanımlar:
                  </div>
                  {pedagogicalData.summaryNotes.map((note, nIdx) => (
                    <div key={nIdx} className="leading-relaxed">
                      {note}
                    </div>
                  ))}
                </div>

                <button
                  onClick={openStudioMode}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs shadow-lg transition-all cursor-pointer"
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
