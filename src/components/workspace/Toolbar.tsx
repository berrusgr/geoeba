'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWorkspace } from '@/state/WorkspaceContext';
import { ToolMode } from '@/types/workspace';
import {
  MathObject,
  PointObject,
  FunctionObject,
  CircleObject,
  EllipseObject,
  SegmentObject,
  AngleObject,
  SliderObject,
  MeasurementObject,
} from '@/types/math';
import {
  generateNextPointLabel,
  calculateDistance,
  calculateAngleDegrees,
  calculateSlope,
  rightTriangleRatios,
} from '@/math/geometry';
import { formatTurkishNumber } from '@/math/coordinates';
import { validateMathExpression, extractVariableNames, compileMathExpression, evaluateNumericInput } from '@/math/parser';
import { functionDefinitionCycle, functionNameOwner, relabelFunction, undefinedFunctionCalls } from '@/math/functionNames';
import { Trash2, Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, Calculator, Shapes, Table, Eye, EyeOff, Plus, Check, X, AlertCircle, Keyboard } from 'lucide-react';
import { TOOL_SHORTCUTS } from './toolShortcuts';
import { TOOL_GROUPS } from './toolDefinitions';
import { MathKeypad } from '@/components/workspace/MathKeypad';

interface ToolbarProps {
  onSelectTool?: (tool: ToolMode) => void;
  onOpenFunctionDialog?: () => void;
  onOpenSliderDialog?: () => void;
  /**
   * 2D "Nesne ekle" diyaloğunu açar. Verilmezse düğme gösterilmez.
   * (WorkspaceView bu prop'u geçtiğinde AddObjectModal'ın 2D sekmeleri erişilebilir olur.)
   */
  onOpenAddObjectDialog?: () => void;
}

/** Araç panelinin ikon modu tercihi bu anahtarla saklanır. */
const IKON_MODU_ANAHTARI = 'geoeba_arac_ikon_modu_v1';

const TABLE_ROWS = 10;
const TABLE_COLS = 3;
const COLUMN_LETTERS = ['A', 'B', 'C'];

// Hücre biçimleri: "(2, 3)", "(2; 3)", "2,5" (Türkçe ondalık) veya "(1,5; 2)"
const NUMBER_PATTERN = '[-+]?(?:\\d+(?:[.,]\\d+)?|[.,]\\d+)';
const COORD_REGEX = new RegExp(`^\\s*\\(?\\s*(${NUMBER_PATTERN})\\s*[;,]\\s*(${NUMBER_PATTERN})\\s*\\)?\\s*$`);
const NUM_REGEX = new RegExp(`^\\s*(${NUMBER_PATTERN})\\s*$`);

const parseCell = (raw: string): number => parseFloat(raw.replace(',', '.'));

/**
 * "(1,5, 2)" gibi girdilerde ondalık virgül ile ayırıcı virgül karışabilir;
 * bu durumda yalnızca ";" veya boşluk+virgül ayırıcı kabul edilir.
 */
function matchCoordinate(raw: string): [number, number] | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const m = trimmed.match(COORD_REGEX);
  if (!m) return null;
  const a = parseCell(m[1]);
  const b = parseCell(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return [a, b];
}

function matchNumber(raw: string): number | null {
  const m = raw.trim().match(NUM_REGEX);
  if (!m) return null;
  const n = parseCell(m[1]);
  return Number.isFinite(n) ? n : null;
}

export function Toolbar({ onSelectTool,
  onOpenFunctionDialog, onOpenSliderDialog, onOpenAddObjectDialog }: ToolbarProps) {
  const {
    activeTool,
    setActiveTool,
    objects,
    updateObject,
    deleteObject,
    addObject,
    addFunction,
    assignSliderValue,
    setHintMessage,
    setCircleRadius,
    setSegmentLength,
    setAngleDegrees,
    pendingPointIds,
    requestClearAll,
    openRegularPolygonDialog,
    recordHistory,
  } = useWorkspace();

  const [toolSearch, setToolSearch] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'cebir' | 'araclar' | 'tablo'>('araclar');

  // Cebir Input State
  const [algebraInput, setAlgebraInput] = useState('');
  /** Hesap makinesi çizelgesi açık mı? */
  const [klavyeAcik, setKlavyeAcik] = useState(false);
  const algebraInputRef = useRef<HTMLInputElement>(null);
  const [algebraError, setAlgebraError] = useState<string | null>(null);

  // Cebir listesinde satır içi düzenleme (fonksiyon ifadesi / nokta koordinatı)
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [rowDraft, setRowDraft] = useState<{ a: string; b: string }>({ a: '', b: '' });
  const [rowError, setRowError] = useState<string | null>(null);

  const cancelRowEdit = () => {
    setEditingRowId(null);
    setRowError(null);
  };

  /**
   * Cebir listesinde bir satırın hangi alanlarının düzenlenebileceğini tarif eder.
   * Böylece nokta, çember, elips, doğru parçası ve açı aynı arayüzü paylaşır:
   * kullanıcı değere tıklar, sayıyı yazar, Enter'a basar.
   */
  type SatirBicimi =
    | { mod: 'ifade'; aEtiket: string }
    | { mod: 'tekli'; aEtiket: string; birim: string }
    | { mod: 'ikili'; aEtiket: string; bEtiket: string; ayirac: string };

  const satirBicimi = (obj: MathObject): SatirBicimi | null => {
    switch (obj.type) {
      case 'function':
        return { mod: 'ifade', aEtiket: 'Fonksiyon ifadesi' };
      case 'point':
        return { mod: 'ikili', aEtiket: 'x koordinatı', bEtiket: 'y koordinatı', ayirac: ';' };
      case 'ellipse':
        return { mod: 'ikili', aEtiket: 'Yatay yarıçap (a)', bEtiket: 'Dikey yarıçap (b)', ayirac: '×' };
      case 'circle':
        return { mod: 'tekli', aEtiket: 'Yarıçap', birim: 'br' };
      case 'segment':
        return { mod: 'tekli', aEtiket: 'Uzunluk', birim: 'br' };
      case 'angle':
        return { mod: 'tekli', aEtiket: 'Açı', birim: '°' };
      case 'slider':
        return { mod: 'tekli', aEtiket: 'Değer', birim: '' };
      default:
        return null;
    }
  };

  /** Bir nesnenin çember/yay yarıçapı: merkez ile yarıçap noktası arasındaki uzaklık. */
  const cemberYaricapi = (circ: CircleObject): number => {
    if (typeof circ.fixedRadius === 'number') return circ.fixedRadius;
    const merkez = objects.find((o) => o.id === circ.centerPointId && o.type === 'point') as
      | PointObject
      | undefined;
    const yari = objects.find((o) => o.id === circ.radiusPointId && o.type === 'point') as
      | PointObject
      | undefined;
    if (!merkez || !yari) return 0;
    return Math.hypot(yari.x - merkez.x, yari.y - merkez.y);
  };

  const startRowEdit = (obj: MathObject) => {
    setRowError(null);
    const bicim = satirBicimi(obj);
    if (!bicim) return;
    if (obj.type === 'function') {
      setRowDraft({ a: (obj as FunctionObject).expression, b: '' });
    } else if (obj.type === 'point') {
      const pt = obj as PointObject;
      setRowDraft({ a: formatTurkishNumber(pt.x, 4), b: formatTurkishNumber(pt.y, 4) });
    } else if (obj.type === 'ellipse') {
      const e = obj as EllipseObject;
      setRowDraft({ a: formatTurkishNumber(e.radiusX, 4), b: formatTurkishNumber(e.radiusY, 4) });
    } else if (obj.type === 'circle') {
      setRowDraft({ a: formatTurkishNumber(cemberYaricapi(obj as CircleObject), 4), b: '' });
    } else if (obj.type === 'segment') {
      const seg = obj as SegmentObject;
      const p1 = objects.find((o) => o.id === seg.startPointId) as PointObject | undefined;
      const p2 = objects.find((o) => o.id === seg.endPointId) as PointObject | undefined;
      const uz = p1 && p2 ? Math.hypot(p2.x - p1.x, p2.y - p1.y) : 0;
      setRowDraft({ a: formatTurkishNumber(uz, 4), b: '' });
    } else if (obj.type === 'slider') {
      setRowDraft({ a: formatTurkishNumber((obj as SliderObject).value, 4), b: '' });
    } else if (obj.type === 'angle') {
      const a = obj as AngleObject;
      const p1 = objects.find((o) => o.id === a.point1Id) as PointObject | undefined;
      const v = objects.find((o) => o.id === a.vertexPointId) as PointObject | undefined;
      const p3 = objects.find((o) => o.id === a.point3Id) as PointObject | undefined;
      const derece = p1 && v && p3 ? calculateAngleDegrees(p1, v, p3) : 0;
      setRowDraft({ a: formatTurkishNumber(Math.round(derece), 4), b: '' });
    }
    setEditingRowId(obj.id);
  };

  /** Türkçe ondalık virgülü kabul eden sayı okuyucu. */
  /** Sahnedeki kaydırıcıların o anki değerleri: "a", "2*a" gibi girişler için kapsam. */
  const kaydiriciKapsami = (): Record<string, number> => {
    const kapsam: Record<string, number> = {};
    for (const o of objects) {
      if (o.type === 'slider') kapsam[(o as SliderObject).variableName] = (o as SliderObject).value;
    }
    return kapsam;
  };

  /**
   * Alana yazılanı sayıya çevirir. Düz sayı da olabilir ("3", "7,5"),
   * kaydırıcı adı veya ifade de ("a", "2*a", "pi/2", "sqrt(2)").
   * Hata varsa satırdaki uyarıya yazılır ve null döner.
   */
  const sayiOku = (raw: string): number | null => {
    const kapsam = kaydiriciKapsami();
    const sonuc = evaluateNumericInput(raw, kapsam);
    if (!sonuc.ok) {
      setRowError(sonuc.error);
      return null;
    }
    // Kaydırıcıya dayalı bir ifade yazıldıysa değerin ANLIK olduğunu söyle:
    // kaydırıcı sonradan oynatılınca bu değer kendiliğinden güncellenmez.
    const kullanilan = Object.keys(kapsam).filter((ad) =>
      new RegExp(`(^|[^a-zçğıöşü0-9])${ad}([^a-zçğıöşü0-9]|$)`, 'i').test(raw)
    );
    if (kullanilan.length > 0) {
      setHintMessage(
        `${raw.trim()} = ${formatTurkishNumber(sonuc.value)} olarak hesaplandı. ` +
          `Bu bir anlık değerdir: ${kullanilan.join(', ')} kaydırıcısını oynatınca kendiliğinden güncellenmez.`
      );
    }
    return sonuc.value;
  };

  const commitRowEdit = (obj: MathObject) => {
    if (obj.type === 'function') {
      const ifade = rowDraft.a.trim();
      if (!ifade) {
        setRowError('İfade boş olamaz.');
        return;
      }
      const dogrulama = validateMathExpression(ifade);
      if (!dogrulama.ok) {
        setRowError(dogrulama.error);
        return;
      }
      updateObject(obj.id, { expression: ifade, label: relabelFunction(obj, ifade, objects) });
      cancelRowEdit();
      return;
    }
    if (obj.type === 'point') {
      const x = sayiOku(rowDraft.a);
      const y = sayiOku(rowDraft.b);
      if (x === null || y === null) return; // hata mesajını sayiOku yazdı
      updateObject(obj.id, { x, y });
      cancelRowEdit();
      return;
    }
    if (obj.type === 'ellipse') {
      const a = sayiOku(rowDraft.a);
      const b = sayiOku(rowDraft.b);
      if (a === null || b === null) return;
      if (a <= 0 || b <= 0) {
        setRowError('a ve b sıfırdan büyük olmalı.');
        return;
      }
      updateObject(obj.id, { radiusX: a, radiusY: b } as Partial<MathObject>);
      cancelRowEdit();
      return;
    }
    if (obj.type === 'circle') {
      const r = sayiOku(rowDraft.a);
      if (r === null) return;
      if (r <= 0) {
        setRowError('Yarıçap sıfırdan büyük olmalı.');
        return;
      }
      setCircleRadius(obj.id, r);
      cancelRowEdit();
      return;
    }
    if (obj.type === 'segment') {
      const uz = sayiOku(rowDraft.a);
      if (uz === null) return;
      if (uz <= 0) {
        setRowError('Uzunluk sıfırdan büyük olmalı.');
        return;
      }
      setSegmentLength(obj.id, uz);
      cancelRowEdit();
      return;
    }
    if (obj.type === 'slider') {
      const v = sayiOku(rowDraft.a);
      if (v === null) return; // hata mesajını sayiOku yazdı
      assignSliderValue((obj as SliderObject).variableName, v);
      cancelRowEdit();
      return;
    }
    if (obj.type === 'angle') {
      const d = sayiOku(rowDraft.a);
      if (d === null) return;
      if (d <= 0 || d >= 360) {
        setRowError('Açı 0 ile 360 arasında olmalı.');
        return;
      }
      setAngleDegrees(obj.id, d);
      cancelRowEdit();
      return;
    }
    cancelRowEdit();
  };

  // Spreadsheet Tablo Verileri: 10 Satır x 3 Sütun (A, B, C)
  const [tableData, setTableData] = useState<string[][]>(
    Array.from({ length: TABLE_ROWS }, () => Array.from({ length: TABLE_COLS }, () => ''))
  );

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(TOOL_GROUPS.map((g) => [g.groupName, true]))
  );

  /**
   * Araç panelinin İKON MODU: yazılar gizlenir, araçlar iki sütunlu ikon ızgarası olur.
   * Dar ekranlarda tuvale yer açar. Tercih tarayıcıda saklanır.
   */
  const [ikonModu, setIkonModu] = useState(false);

  // Sunucuda localStorage yok; tercih bağlanma anında okunur.
  useEffect(() => {
    try {
      setIkonModu(localStorage.getItem(IKON_MODU_ANAHTARI) === '1');
    } catch {
      /* depolama kapalıysa varsayılan (kapalı) kalır */
    }
  }, []);

  /**
   * Kayıt, EFEKTLE değil doğrudan burada yapılır. Efektle yazıldığında, ilk
   * render'da okuma henüz state'e yansımadığı için varsayılan değer kaydın
   * üzerine yazılıyor ve tercih her yenilemede kayboluyordu.
   */
  const ikonModuDegistir = () => {
    const yeni = !ikonModu;
    setIkonModu(yeni);
    try {
      localStorage.setItem(IKON_MODU_ANAHTARI, yeni ? '1' : '0');
    } catch {
      /* yoksay */
    }
  };

  /**
   * İkon modunda üzerine gelinen araç ve baloncuğun EKRAN konumu.
   *
   * Baloncuk panelin içine çizilirse panelin `overflow` kırpması ve yığın bağlamı
   * yüzünden tuvalin altında kalıyordu; bu yüzden portal ile doğrudan `body`'ye
   * çizilir ve konumu düğmenin ekran dikdörtgeninden hesaplanır.
   */
  const [vurgulanan, setVurgulanan] = useState<{
    id: string;
    ad: string;
    aciklama: string;
    x: number;
    y: number;
  } | null>(null);

  const baloncukAc = (el: HTMLElement, id: string, ad: string, aciklama: string) => {
    const r = el.getBoundingClientRect();
    setVurgulanan({ id, ad, aciklama, x: Math.round(r.right + 8), y: Math.round(r.top + r.height / 2) });
  };
  const baloncukKapat = (id: string) => setVurgulanan((v) => (v && v.id === id ? null : v));

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupName]: !(prev[groupName] ?? true) }));
  };

  const handleToolClick = (toolId: ToolMode) => {
    if (onSelectTool) { onSelectTool(toolId); return; }
    if (toolId === 'function') {
      onOpenFunctionDialog?.();
      return;
    }
    if (toolId === 'slider') {
      onOpenSliderDialog?.();
      return;
    }
    if (toolId === 'regular_polygon') {
      setActiveTool('regular_polygon');
      openRegularPolygonDialog();
      return;
    }
    setActiveTool(toolId);
  };

  /**
   * Klavye tuşundan gelen metni İMLECİN bulunduğu yere yazar.
   * `geri` kadar imleci geri alır: sin() yazınca imleç parantezin içinde kalsın diye.
   */
  const klavyeEkle = (metin: string, geri = 0) => {
    const el = algebraInputRef.current;
    const bas = el?.selectionStart ?? algebraInput.length;
    const son = el?.selectionEnd ?? algebraInput.length;
    const yeni = algebraInput.slice(0, bas) + metin + algebraInput.slice(son);
    setAlgebraInput(yeni);
    if (algebraError) setAlgebraError(null);
    const imlec = bas + metin.length - geri;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(imlec, imlec);
    });
  };

  /** İmlecin solundaki karakteri siler (seçim varsa seçimi siler). */
  const klavyeSil = () => {
    const el = algebraInputRef.current;
    const bas = el?.selectionStart ?? algebraInput.length;
    const son = el?.selectionEnd ?? algebraInput.length;
    const kesBas = bas === son ? Math.max(0, bas - 1) : bas;
    const yeni = algebraInput.slice(0, kesBas) + algebraInput.slice(son);
    setAlgebraInput(yeni);
    if (algebraError) setAlgebraError(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(kesBas, kesBas);
    });
  };

  /**
   * "a = 2" gibi bir ATAMA mı yazıldı? Öyleyse değişken adı ve sağ tarafı döndürür.
   *
   * GeoGebra'da cebir girişine "a = 2" yazmak kaydırıcı üretir; burada da öyle olmalı.
   * Ama "y = x^2" bir FONKSİYON tanımıdır: sağ taraf x'e bağlıysa ya da sol taraf y ise
   * atama değil fonksiyon sayılır.
   */
  const atamayiCoz = (
    ifade: string
  ): { tur: 'kaydirici'; ad: string; sag: string } | { tur: 'fonksiyon'; ad?: string; sag: string } | null => {
    // f(x) = ... biçimi doğrudan fonksiyondur; adı korunur ("g(x) = f(x) + 1")
    const fonksiyonTanimi = /^\s*([a-zçğıöşü][a-zçğıöşü0-9]?)\s*\(\s*x\s*\)\s*=\s*(.+)$/i.exec(ifade);
    if (fonksiyonTanimi) return { tur: 'fonksiyon', ad: fonksiyonTanimi[1].toLowerCase(), sag: fonksiyonTanimi[2].trim() };

    const atama = /^\s*([a-zçğıöşü][a-zçğıöşü0-9]?)\s*=\s*(.+)$/i.exec(ifade);
    if (!atama) return null;

    const ad = atama[1].toLocaleLowerCase('tr');
    const sag = atama[2].trim();
    if (sag.includes('=')) return null; // "a = b = 2" gibi çoklu atama desteklenmiyor

    // Sağ taraf x'e bağlıysa ya da sol taraf y ise bu bir fonksiyon tanımıdır
    const degiskenler = extractVariableNames(sag);
    if (ad === 'y' || degiskenler.includes('x')) return { tur: 'fonksiyon', sag };
    return { tur: 'kaydirici', ad, sag };
  };

  /** Girişteki ifadeyi doğrular ve tuvale ekler. Hem Enter hem klavyedeki ↵ buradan geçer. */
  const algebraGonder = () => {
    const expr = algebraInput.trim();
    if (!expr) {
      setAlgebraError('Bir ifade girin. Örn: x^2 - 2  ya da  a = 2');
      return;
    }

    const cozum = atamayiCoz(expr);

    // 1) Kaydırıcı ataması: "a = 2", "k = 3/4", "m = 2*a" …
    if (cozum && cozum.tur === 'kaydirici') {
      const bilinen = objects
        .filter((o) => o.type === 'slider')
        .map((o) => (o as SliderObject).variableName);
      const dogrulama = validateMathExpression(cozum.sag, bilinen);
      if (!dogrulama.ok) {
        setAlgebraError(dogrulama.error);
        return;
      }
      const hesapla = compileMathExpression(cozum.sag, bilinen);
      const kapsam: Record<string, number> = {};
      for (const o of objects) {
        if (o.type === 'slider') kapsam[(o as SliderObject).variableName] = (o as SliderObject).value;
      }
      const deger = hesapla ? hesapla(0, kapsam) : NaN;
      if (!Number.isFinite(deger)) {
        setAlgebraError('Sağ taraf bir sayıya eşit olmalı. Örn: a = 2 veya a = 3/4');
        return;
      }
      assignSliderValue(cozum.ad, Number(deger.toFixed(6)));
      setAlgebraInput('');
      setAlgebraError(null);
      return;
    }

    // Eşittir içeren ama tanınmayan girdiler: ayrıştırıcının "Geçersiz karakter" uyarısı
    // burada yanıltıcı olurdu; kullanıcıya ne yazması gerektiğini söyleyelim.
    if (!cozum && expr.includes('=')) {
      setAlgebraError(
        'Atamayı "değişken = sayı" biçiminde yazın (örn. a = 2). Fonksiyon için "y = x^2" ya da doğrudan "x^2" yazabilirsiniz.'
      );
      return;
    }

    // 2) Fonksiyon tanımı: "g(x) = x^2" adıyla eklenir, aynı adlı fonksiyon varsa yeniden tanımlanır.
    //    "y = x^2" ve yalnız "x^2" sıradaki boş adı alır (f, g, h …).
    const ifade = cozum && cozum.tur === 'fonksiyon' ? cozum.sag : expr;
    const ad = cozum && cozum.tur === 'fonksiyon' ? cozum.ad : undefined;
    const validation = validateMathExpression(ifade);
    if (!validation.ok) {
      setAlgebraError(validation.error);
      return;
    }
    const dongu = ad ? functionDefinitionCycle(objects, ad, ifade) : null;
    if (dongu) {
      setAlgebraError(`${ad}(x) kendisine bağlı olamaz: ${dongu.map((n) => `${n}(x)`).join(' → ')}.`);
      return;
    }
    const tanimsiz = undefinedFunctionCalls(objects, ifade, ad);
    if (tanimsiz.length > 0) {
      setAlgebraError(`${tanimsiz[0]}(x) tanımlı değil. Önce ${tanimsiz[0]}(x) = … yazın; çarpma için ${tanimsiz[0]}*(…) kullanın.`);
      return;
    }
    const sahip = ad ? functionNameOwner(objects, ad) : undefined;
    if (sahip && sahip.type !== 'function') {
      setAlgebraError(`"${ad}" adı bir kaydırıcıda kullanılıyor. Fonksiyona başka bir ad verin (örn. g(x) = …).`);
      return;
    }
    if (sahip) {
      const kaydiricilar = new Set(
        objects.filter((o) => o.type === 'slider').map((o) => (o as SliderObject).variableName)
      );
      for (const eksik of extractVariableNames(ifade)) {
        if (!kaydiricilar.has(eksik)) assignSliderValue(eksik, 1);
      }
      updateObject(sahip.id, { expression: ifade, label: `${ad}(x) = ${ifade}`, visible: true });
    } else {
      addFunction(ifade, ad ? `${ad}(x) = ${ifade}` : undefined);
    }
    setAlgebraInput('');
    setAlgebraError(null);
  };

  // Cebir girişi: doğrulama ve ekleme tek yerde (algebraGonder) yapılır
  const handleAlgebraSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    algebraGonder();
  };

  // Hesap tablosundan geçerli bir PointObject üretir (etiket sıradaki boş harf)
  const createSheetPoint = (
    id: string,
    x: number,
    y: number,
    color: string,
    usedLabels: string[]
  ): PointObject => {
    const label = generateNextPointLabel(usedLabels);
    usedLabels.push(label);
    return {
      id,
      type: 'point',
      label,
      showLabel: true,
      isIndependent: true,
      x,
      y,
      color,
      visible: true,
      createdAt: Date.now(),
    };
  };

  // Hücrede yazarken her tuş vuruşu ayrı bir geçmiş adımı üretmesin diye nokta
  // taşımaları geçmişe yazılmadan uygulanır; düzenleme bitince (odak kaybı) tek
  // bir geçmiş adımı kaydedilir. Böylece Geri Al tablo değişikliğini de geri alır.
  const hasUncommittedTableEditRef = useRef(false);

  const commitTableEdit = () => {
    if (!hasUncommittedTableEditRef.current) return;
    hasUncommittedTableEditRef.current = false;
    recordHistory('Hesap tablosu güncellendi');
  };

  // Spreadsheet Hücre Değişimi & Nokta Çizme
  const handleTableCellChange = (rowIdx: number, colIdx: number, val: string) => {
    const newData = tableData.map((row, rIdx) =>
      rIdx === rowIdx ? row.map((cell, cIdx) => (cIdx === colIdx ? val : cell)) : row
    );
    setTableData(newData);

    const usedLabels = objects.filter((o) => o.type === 'point').map((o) => o.label);
    const upsertPoint = (pointId: string, x: number, y: number, color: string) => {
      const existing = objects.find((o) => o.id === pointId);
      if (existing && existing.type === 'point') {
        if (existing.x !== x || existing.y !== y) {
          updateObject(pointId, { x, y } as Partial<PointObject>, false);
          hasUncommittedTableEditRef.current = true;
        }
      } else {
        addObject(createSheetPoint(pointId, x, y, color, usedLabels), 'Hesap tablosundan nokta eklendi');
        hasUncommittedTableEditRef.current = false;
      }
    };
    const removePoint = (pointId: string) => {
      if (objects.some((o) => o.id === pointId)) {
        deleteObject(pointId);
        hasUncommittedTableEditRef.current = false;
      }
    };

    // Yalnızca değişen satırı işle
    const r = rowIdx;
    const row = newData[r];

    // A ve B sütunları birlikte bir nokta: (A, B)
    const rowPointId = `spreadsheet-row-point-${r}`;
    const xVal = matchNumber(row[0]);
    const yVal = matchNumber(row[1]);
    if (xVal !== null && yVal !== null) {
      upsertPoint(rowPointId, xVal, yVal, '#3b82f6');
    } else {
      removePoint(rowPointId);
    }

    // Her hücre tek başına "(x, y)" koordinatı olabilir
    for (let c = 0; c < TABLE_COLS; c++) {
      const cellPointId = `spreadsheet-point-${r}-${c}`;
      const coord = matchCoordinate(row[c]);
      if (coord) {
        upsertPoint(cellPointId, coord[0], coord[1], '#6366f1');
      } else {
        removePoint(cellPointId);
      }
    }
  };

  const getObjectDetails = (obj: MathObject): string => {
    switch (obj.type) {
      case 'point':
        return `(${formatTurkishNumber(obj.x, 2)}; ${formatTurkishNumber(obj.y, 2)})`;
      case 'circle': {
        let radius = obj.fixedRadius ?? 0;
        if (obj.radiusPointId && !radius) {
          const center = objects.find((o) => o.id === obj.centerPointId);
          const rPoint = objects.find((o) => o.id === obj.radiusPointId);
          if (center?.type === 'point' && rPoint?.type === 'point') {
            radius = calculateDistance(center, rPoint);
          }
        }
        return `Yarıçap: ${formatTurkishNumber(radius, 2)} br`;
      }
      case 'ellipse':
        return `a = ${formatTurkishNumber(obj.radiusX, 2)} br, b = ${formatTurkishNumber(obj.radiusY, 2)} br`;
      case 'arc':
      case 'sector': {
        const merkez = objects.find((o) => o.id === obj.centerPointId);
        const bas = objects.find((o) => o.id === obj.startPointId);
        const r =
          merkez?.type === 'point' && bas?.type === 'point' ? calculateDistance(merkez, bas) : 0;
        return `Yarıçap: ${formatTurkishNumber(r, 2)} br`;
      }
      case 'line':
        return 'Doğru';
      case 'ray':
        return 'Işın';
      case 'segment': {
        const p1 = objects.find((o) => o.id === obj.startPointId);
        const p2 = objects.find((o) => o.id === obj.endPointId);
        const uz = p1?.type === 'point' && p2?.type === 'point' ? calculateDistance(p1, p2) : 0;
        return `Uzunluk: ${formatTurkishNumber(uz, 2)} br`;
      }
      case 'polygon':
        return `Çokgen (${obj.pointIds?.length || 0} Köşe)`;
      case 'pen':
        return 'Serbest Çizim';
      case 'fraction':
        return `Kesir (${obj.numerator}/${obj.denominator})`;
      case 'function':
        return obj.expression;
      case 'slider':
        return `${obj.variableName} = ${formatTurkishNumber(obj.value, 2)}`;
      case 'measurement': {
        const m = obj as MeasurementObject;
        const nk = (id: string) => objects.find((o) => o.id === id && o.type === 'point') as PointObject | undefined;
        if (m.kind === 'distance') {
          const a = nk(m.pointIds[0]);
          const b = nk(m.pointIds[1]);
          return a && b ? `|${a.label}${b.label}| = ${formatTurkishNumber(calculateDistance(a, b), 2)} br` : 'Uzunluk';
        }
        if (m.kind === 'slope') {
          const a = nk(m.pointIds[0]);
          const b = nk(m.pointIds[1]);
          if (!a || !b) return 'Eğim';
          const e = calculateSlope(a, b);
          return e === null ? 'eğim tanımsız' : `eğim = ${formatTurkishNumber(Number(e.toFixed(4)))}`;
        }
        const [k, d, u] = m.pointIds.map(nk);
        if (!k || !d || !u) return 'Trigonometrik oranlar';
        const o = rightTriangleRatios(k, d, u);
        return o
          ? `sin=${formatTurkishNumber(Number(o.sin.toFixed(3)))} cos=${formatTurkishNumber(Number(o.cos.toFixed(3)))} tan=${formatTurkishNumber(Number(o.tan.toFixed(3)))}`
          : 'Dik üçgen değil';
      }
      case 'angle': {
        const p1 = objects.find((o) => o.id === obj.point1Id);
        const v = objects.find((o) => o.id === obj.vertexPointId);
        const p3 = objects.find((o) => o.id === obj.point3Id);
        const d =
          p1?.type === 'point' && v?.type === 'point' && p3?.type === 'point'
            ? calculateAngleDegrees(p1, v, p3)
            : 0;
        return `${formatTurkishNumber(Math.round(d), 0)}°`;
      }
      case 'text':
        return 'Metin Notu';
      case 'image':
        return 'Görsel';
      default:
        return 'Nesne';
    }
  };

  const normalizedSearch = (ikonModu ? '' : toolSearch).trim().toLocaleLowerCase('tr');

  return (
    <div className="flex h-full min-h-0 bg-card/95 backdrop-blur-md border-r border-border select-none z-30 shadow-sm shrink-0 relative">

      {/* 1. SOL DİKEY MENÜ SEÇİCİ (GeoGebra Birebir Stil) */}
      <div className="w-14 shrink-0 h-full border-r border-border flex flex-col items-center py-4 justify-between bg-slate-50/70 dark:bg-slate-900/60">

        {/* Üst Kısım: Cebir, Araçlar, Tablo Butonları */}
        <div className="flex flex-col items-center gap-3 w-full">
          {/* Cebir Sekmesi */}
          <button
            onClick={() => {
              setSidebarTab('cebir');
              setIsCollapsed(false);
            }}
            title="Cebir Görünümü (Cebirsel İfadeler & Fonksiyonlar)"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              sidebarTab === 'cebir' && !isCollapsed
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Calculator className="w-5 h-5" />
          </button>

          {/* Araçlar Sekmesi */}
          <button
            onClick={() => {
              setSidebarTab('araclar');
              setIsCollapsed(false);
            }}
            title="Araçlar Görünümü (Geometrik Çizim Araçları)"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              sidebarTab === 'araclar' && !isCollapsed
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Shapes className="w-5 h-5" />
          </button>

          {/* Tablo Sekmesi */}
          <button
            onClick={() => {
              setSidebarTab('tablo');
              setIsCollapsed(false);
            }}
            title="Hesap Tablosu Görünümü (Spreadsheet)"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              sidebarTab === 'tablo' && !isCollapsed
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Table className="w-5 h-5" />
          </button>
        </div>

      </div>

      {/* 2. SAĞ KISIM: İÇERİK PANELİ */}
      {!isCollapsed && (
        // İkon modunda panel daralır: amaç tuvale yer açmaktır.
        <div
          className={`h-full flex flex-col min-h-0 overflow-hidden transition-[width] duration-200 ${
            ikonModu && sidebarTab === 'araclar' ? 'w-[144px]' : 'w-72 sm:w-80'
          }`}
        >

          {/* A. CEBİR GÖRÜNÜMÜ */}
          {sidebarTab === 'cebir' && (
            <div className="flex-1 flex flex-col min-h-0 bg-card">
              <div className="p-3.5 border-b border-border/80 flex items-center justify-between shrink-0">
                <h3 className="text-xs font-black text-foreground">Cebir Girişleri</h3>
                {objects.length > 0 && (
                  <button
                    onClick={() => requestClearAll('2D')}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                    title="Tüm Girişleri ve Şekilleri Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Tümünü Sil</span>
                  </button>
                )}
              </div>

              {/* Obje Listesi */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
                {objects.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-xs font-medium">
                    Masada henüz nesne yok.<br/>Nesne çizin veya aşağıdan fonksiyon girin.
                  </div>
                ) : (
                  objects.map((obj) => {
                    const bicim = satirBicimi(obj);
                    const duzenlenebilir = bicim !== null;
                    const duzenleniyor = editingRowId === obj.id;
                    return (
                    <div key={obj.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/50 hover:bg-muted/70 transition-colors">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* Görünürlük Düğmesi */}
                        <button
                          onClick={() => updateObject(obj.id, { visible: obj.visible !== false ? false : true })}
                          className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                          title={obj.visible !== false ? 'Gizle' : 'Göster'}
                        >
                          {obj.visible !== false ? <Eye className="w-3.5 h-3.5 text-primary" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>

                        {duzenleniyor ? (
                          // DÜZENLEME KİPİ: fonksiyonda ifade, noktada x ve y girilebilir
                          <form
                            className="flex items-center gap-1 min-w-0 flex-1"
                            onSubmit={(e) => {
                              e.preventDefault();
                              commitRowEdit(obj);
                            }}
                          >
                            <span className="text-primary text-xs font-black shrink-0">{obj.label}:</span>
                            {obj.type === 'function' ? (
                              <input
                                autoFocus
                                type="text"
                                value={rowDraft.a}
                                onChange={(e) => {
                                  setRowDraft({ ...rowDraft, a: e.target.value });
                                  if (rowError) setRowError(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    e.stopPropagation();
                                    cancelRowEdit();
                                  }
                                }}
                                aria-invalid={rowError !== null}
                                aria-label="Fonksiyon ifadesi"
                                className={`flex-1 min-w-0 px-2 py-1 rounded-lg bg-background border text-[11px] font-mono outline-none focus:border-primary ${
                                  rowError ? 'border-destructive' : 'border-border'
                                }`}
                              />
                            ) : (
                              <>
                                <input
                                  autoFocus
                                  type="text"
                                  inputMode="decimal"
                                  value={rowDraft.a}
                                  onChange={(e) => {
                                    setRowDraft({ ...rowDraft, a: e.target.value });
                                    if (rowError) setRowError(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      e.stopPropagation();
                                      cancelRowEdit();
                                    }
                                  }}
                                  aria-label={bicim?.mod === 'ifade' ? 'İfade' : bicim?.aEtiket}
                                  className={`w-16 min-w-0 px-1.5 py-1 rounded-lg bg-background border text-[11px] font-mono text-center outline-none focus:border-primary ${
                                    rowError ? 'border-destructive' : 'border-border'
                                  }`}
                                />
                                {bicim?.mod === 'tekli' && (
                                  <span className="text-[10px] text-muted-foreground">{bicim.birim}</span>
                                )}
                                {bicim?.mod === 'ikili' && (
                                  <>
                                <span className="text-[10px] text-muted-foreground">{bicim.ayirac}</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={rowDraft.b}
                                  onChange={(e) => {
                                    setRowDraft({ ...rowDraft, b: e.target.value });
                                    if (rowError) setRowError(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      e.stopPropagation();
                                      cancelRowEdit();
                                    }
                                  }}
                                  aria-label={bicim.bEtiket}
                                  className={`w-16 min-w-0 px-1.5 py-1 rounded-lg bg-background border text-[11px] font-mono text-center outline-none focus:border-primary ${
                                    rowError ? 'border-destructive' : 'border-border'
                                  }`}
                                />
                                  </>
                                )}
                              </>
                            )}
                            <button
                              type="submit"
                              title="Uygula (Enter)"
                              className="p-1 rounded hover:bg-emerald-500/10 text-emerald-600 shrink-0 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelRowEdit}
                              title="Vazgeç (Esc)"
                              className="p-1 rounded hover:bg-muted text-muted-foreground shrink-0 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => duzenlenebilir && startRowEdit(obj)}
                            disabled={!duzenlenebilir}
                            title={duzenlenebilir ? 'Değeri düzenlemek için tıklayın' : undefined}
                            className={`text-xs font-black text-foreground truncate leading-tight text-left min-w-0 ${
                              duzenlenebilir ? 'cursor-text hover:underline decoration-dotted underline-offset-2' : 'cursor-default'
                            }`}
                          >
                            <span className="text-primary mr-1">{obj.label}:</span>
                            <span className="font-mono text-muted-foreground text-[10px]">
                              {getObjectDetails(obj)}
                            </span>
                          </button>
                        )}
                      </div>

                      {!duzenleniyor && (
                        <button
                          onClick={() => deleteObject(obj.id)}
                          className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors shrink-0 cursor-pointer"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    );
                  })
                )}
              </div>

              {rowError && (
                <div role="alert" className="px-3 pb-2 -mt-1 flex items-start gap-1 text-[11px] text-destructive font-semibold">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{rowError}</span>
                </div>
              )}

              {/* Cebir Fonksiyon / Formül Girişi */}
              <form
                onSubmit={handleAlgebraSubmit}
                className="p-3 border-t border-border shrink-0 space-y-2 bg-muted/15"
              >
                <label
                  htmlFor="algebra-expression-input"
                  className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider"
                >
                  Matematiksel İfade Ekle (f(x))
                </label>
                <div className="flex gap-1.5">
                  <input
                    id="algebra-expression-input"
                    ref={algebraInputRef}
                    type="text"
                    value={algebraInput}
                    onChange={(e) => {
                      setAlgebraInput(e.target.value);
                      if (algebraError) setAlgebraError(null);
                    }}
                    placeholder="Örn: x^2 - 2,  a = 2,  y = sin(x)"
                    aria-invalid={algebraError !== null}
                    className={`flex-1 px-3 py-2 rounded-xl bg-background border text-xs outline-none focus:border-primary placeholder:text-muted-foreground font-mono ${
                      algebraError ? 'border-destructive' : 'border-border'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setKlavyeAcik((a) => !a)}
                    aria-expanded={klavyeAcik}
                    className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                      klavyeAcik
                        ? 'bg-primary/15 border-primary/40 text-primary'
                        : 'bg-muted/60 border-border text-muted-foreground hover:text-foreground'
                    }`}
                    title={klavyeAcik ? 'Hesap makinesi klavyesini kapat' : 'Hesap makinesi klavyesini aç'}
                    aria-label="Hesap makinesi klavyesi"
                  >
                    <Keyboard className="w-4 h-4" />
                  </button>
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm transition-colors cursor-pointer"
                    title="Ekle (Enter)"
                    aria-label="İfadeyi ekle"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {klavyeAcik && (
                  <MathKeypad onInsert={klavyeEkle} onDelete={klavyeSil} onSubmit={algebraGonder} />
                )}
                {algebraError && (
                  <div className="flex items-start gap-1 text-[11px] text-destructive" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{algebraError}</span>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* B. ARAÇLAR GÖRÜNÜMÜ */}
          {sidebarTab === 'araclar' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-3.5 border-b border-border/80 flex items-center justify-between gap-2 shrink-0">
                {!ikonModu && (
                  <h3 className="text-xs font-black text-foreground tracking-tight">Geometri Araçları</h3>
                )}
                <div className="flex items-center gap-1 ml-auto">
                  {objects.length > 0 && !ikonModu && (
                    <button
                      onClick={() => requestClearAll('2D')}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      title="Tüm Çizimleri ve Şekilleri Temizle"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Tümünü Sil</span>
                    </button>
                  )}

                </div>
              </div>

              {/* Arama Çubuğu — ikon modunda yer kaplamasın diye gizlenir */}
              <div className={`p-3 border-b border-border/60 shrink-0 ${ikonModu ? 'hidden' : ''}`}>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={toolSearch}
                    onChange={(e) => setToolSearch(e.target.value)}
                    placeholder="Araç veya komut ara..."
                    aria-label="Araç ara"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted/60 border border-border/80 text-foreground text-xs placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>

                {/* Ölçü girerek nesne ekleme (yalnızca üst bileşen diyaloğu bağladıysa) */}
                {onOpenAddObjectDialog && (
                  <button
                    type="button"
                    onClick={onOpenAddObjectDialog}
                    className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-sm hover:opacity-90 transition-all cursor-pointer active:scale-95"
                    title="Kesin ölçü girerek nesne ekleyin (nokta, doğru parçası, çember, üçgen, açı, fonksiyon)"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nesne ekle</span>
                  </button>
                )}
              </div>

              {/* Araç Grupları Listesi */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3.5 scrollbar-thin">
                {TOOL_GROUPS.filter((group) => group.groupName !== 'Düzenleme Araçları').map((group) => {
                  const isExpanded = normalizedSearch !== '' || (expandedGroups[group.groupName] ?? true);
                  const matchingTools = group.tools.filter(
                    (t) =>
                      normalizedSearch === '' ||
                      t.name.toLocaleLowerCase('tr').includes(normalizedSearch) ||
                      t.description.toLocaleLowerCase('tr').includes(normalizedSearch)
                  );

                  if (matchingTools.length === 0) return null;

                  return (
                    <div
                      key={group.groupName}
                      className={`rounded-2xl ${ikonModu ? 'p-1.5' : 'p-2.5'} ${group.containerBg} border ${group.containerBorder} space-y-2 shadow-sm transition-all`}
                    >
                      {/* Grup adı geniş ve dar görünümde okunabilir kalır */}
                      <button
                        onClick={() => toggleGroup(group.groupName)}
                        title={ikonModu ? group.groupName : undefined}
                        className={`w-full flex items-center ${
                          ikonModu ? 'justify-center' : 'justify-between'
                        } px-1.5 py-1 text-xs font-black ${group.headerTextColor} hover:opacity-80 transition-opacity cursor-pointer`}
                        aria-expanded={isExpanded}
                        aria-label={ikonModu ? group.groupName : undefined}
                      >
                        {ikonModu ? (
                          <span className="min-w-0 text-[10px] font-black leading-snug text-center break-words">{group.groupName}</span>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">                              <span className="text-xs font-black">{group.groupName}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${group.badgeBg}`}>
                                {matchingTools.length}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </div>
                          </>
                        )}
                      </button>

                      {/* 2 Sütunlu Buton Kartları */}
                      {isExpanded && (
                        <div className={`grid grid-cols-2 ${ikonModu ? 'gap-1.5' : 'gap-2'} pt-0.5`}>
                          {matchingTools.map((tool) => {
                            const isActive = activeTool === tool.id;

                            // İKON MODU: kare ikon; üzerine gelince ad YANA doğru açılır
                            if (ikonModu) {
                              return (
                                <div
                                  key={tool.id}
                                  onMouseEnter={(e) =>
                                    baloncukAc(e.currentTarget, tool.id, tool.name, `${tool.description} Kısayol: ${TOOL_SHORTCUTS[tool.id]}`)
                                  }
                                  onMouseLeave={() => baloncukKapat(tool.id)}
                                >
                                  <button
                                    onClick={() => handleToolClick(tool.id)}
                                    onFocus={(e) =>
                                      baloncukAc(
                                        e.currentTarget.parentElement as HTMLElement,
                                        tool.id,
                                        tool.name,
                                        tool.description
                                      )
                                    }
                                    onBlur={() => baloncukKapat(tool.id)}
                                    title={`${tool.name} (${TOOL_SHORTCUTS[tool.id]}) — ${tool.description}`}
                                    aria-keyshortcuts={TOOL_SHORTCUTS[tool.id]}
                                    aria-label={tool.name}
                                    aria-pressed={isActive}
                                    className={`relative w-full aspect-square min-w-9 min-h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border ${
                                      isActive
                                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-transparent shadow-sm ring-2 ring-primary/20'
                                        : 'bg-card hover:bg-background text-foreground border-border/80 hover:border-primary/40 shadow-sm'
                                    }`}
                                  >
                                    <div
                                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 [&>svg]:w-5 [&>svg]:h-5 ${
                                        isActive ? 'bg-white/20 text-white' : `${tool.iconBg} ${tool.iconColor}`
                                      }`}
                                    >
                                      {tool.icon}
                                    </div>
                                    <kbd className="absolute bottom-0.5 inset-x-0 text-center text-[7px] leading-none opacity-70">{TOOL_SHORTCUTS[tool.id]}</kbd>
                                  </button>

                                </div>
                              );
                            }

                            return (
                              <button
                                key={tool.id}
                                onClick={() => handleToolClick(tool.id)}
                                title={`${tool.name} (${TOOL_SHORTCUTS[tool.id]}) — ${tool.description}`}
                                aria-label={tool.name}
                                aria-keyshortcuts={TOOL_SHORTCUTS[tool.id]}
                                aria-pressed={isActive}
                                className={`flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer border ${
                                  isActive
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-sm scale-105 ring-2 ring-primary/20'
                                    : 'bg-card hover:bg-background text-foreground border-border/80 hover:border-primary/40 shadow-sm hover:-translate-y-0.5'
                                }`}
                              >
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 [&>svg]:w-5 [&>svg]:h-5 shrink-0 transition-transform ${
                                    isActive
                                      ? 'bg-white/20 text-white'
                                      : `${tool.iconBg} ${tool.iconColor}`
                                  }`}
                                >
                                  {tool.icon}
                                </div>

                                {/* En fazla 2 satır: uzun adlar taşmak yerine kısaltılır, tamamı ipucunda */}
                                <span
                                  className={`text-[11px] sm:text-xs font-bold leading-tight break-words hyphens-auto ${
                                    isActive ? 'text-white' : 'text-foreground'
                                  }`}
                                >
                                  {tool.name}
                                  <kbd className="block text-[9px] leading-tight font-medium opacity-70 mt-1">{TOOL_SHORTCUTS[tool.id]}</kbd>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* C. TABLO SPREADSHEET GÖRÜNÜMÜ */}
          {sidebarTab === 'tablo' && (
            <div className="flex-1 flex flex-col min-h-0 bg-card">
              <div className="p-3.5 border-b border-border/80 flex items-center justify-between shrink-0">
                <h3 className="text-xs font-black text-foreground">Hesap Tablosu</h3>
              </div>

              {/* Hücre Giriş Açıklaması */}
              <div className="p-3 bg-muted/30 border-b border-border text-[10px] text-muted-foreground leading-normal font-medium">
                Bir hücreye <strong className="text-primary">(x; y)</strong> yazarak ya da A ve B sütunlarına ayrı ayrı sayı girerek otomatik nokta oluşturabilirsiniz. Örn: <code className="bg-background px-1 py-0.5 rounded font-mono">(2; 3)</code> veya <code className="bg-background px-1 py-0.5 rounded font-mono">(1,5; -2)</code>
              </div>

              {/* Spreadsheet Grid */}
              <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse text-left text-xs font-mono">
                  <thead className="sticky top-0 bg-muted/70 z-10">
                    <tr className="border-b border-border">
                      <th scope="col" className="w-10 px-2 py-1.5 text-center text-muted-foreground font-black border-r border-border bg-muted/80">#</th>
                      {COLUMN_LETTERS.map((letter, idx) => (
                        <th
                          key={letter}
                          scope="col"
                          className={`px-2 py-1.5 text-center text-muted-foreground font-black ${idx < TABLE_COLS - 1 ? 'border-r border-border' : ''}`}
                        >
                          {letter}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, rIdx) => (
                      <tr key={rIdx} className="border-b border-border/60 hover:bg-muted/10 transition-colors">
                        <td className="w-10 px-2 py-1.5 text-center text-muted-foreground font-black border-r border-border bg-muted/30">{rIdx + 1}</td>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className={`p-0 ${cIdx < TABLE_COLS - 1 ? 'border-r border-border/60' : ''}`}>
                            <input
                              type="text"
                              value={cell}
                              onChange={(e) => handleTableCellChange(rIdx, cIdx, e.target.value)}
                              onBlur={commitTableEdit}
                              aria-label={`Hücre ${COLUMN_LETTERS[cIdx]}${rIdx + 1}`}
                              className="w-full h-8 px-2 bg-transparent outline-none focus:bg-primary/5 focus:ring-1 focus:ring-primary/20 text-center font-mono text-xs text-foreground font-semibold"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bekleyen Seçim Bilgisi */}
          {pendingPointIds.length > 0 && (
            <div className="p-3 border-t border-border bg-amber-500/10 text-[11px] text-amber-700 dark:text-amber-300 font-medium shrink-0">
              <span className="font-bold">Bekleyen Seçim: </span>
              <span>{pendingPointIds.length} nokta seçildi. Devam etmek için sıradaki noktaya tıklayın.</span>
            </div>
          )}
        </div>
      )}

      {/* İkon modu baloncuğu — panelin taşma sınırından etkilenmesin diye body'ye çizilir */}
      {ikonModu &&
        vurgulanan &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="tooltip"
            style={{ position: 'fixed', left: vurgulanan.x, top: vurgulanan.y, transform: 'translateY(-50%)', zIndex: 9999 }}
            className="pointer-events-none animate-in fade-in slide-in-from-left-1 duration-150"
          >
            <div className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-white shadow-2xl border border-white/10 w-max max-w-[220px]">
              <div className="text-[11px] font-black leading-tight">{vurgulanan.ad}</div>
              <div className="text-[10px] text-slate-300 leading-snug mt-0.5">{vurgulanan.aciklama}</div>
            </div>
          </div>,
          document.body
        )}

      {/* Kapatma Kulakçığı */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-12 rounded-r-md bg-card border border-l-0 border-border/80 shadow-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer group z-40"
        style={{ left: '100%' }}
        title={isCollapsed ? 'Araç Çubuğunu Aç (›)' : 'Araç Çubuğunu Daralt (‹)'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
        )}
      </button>

    </div>
  );
}
