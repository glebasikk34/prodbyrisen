// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Volume2,
  VolumeX,
  Search,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Edit3,
  Upload,
  X,
  Sliders,
  Disc,
  Radio,
  ExternalLink,
  ShieldAlert,
  ChevronDown,
  Cloud,
  RefreshCw,
  Film,
  Video,
  Image as ImageIcon,
  Zap,
  Eye,
  Copy,
  Check,
  Send,
  Crosshair
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  collection,
  getDocs
} from 'firebase/firestore';

// ============================================================================
// 1. МАСТЕР-ПАРОЛЬ СОЗДАТЕЛЯ И ОБЛАЧНАЯ СИНХРОНИЗАЦИЯ ДЛЯ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ
// ============================================================================
export const MASTER_ADMIN_PASSWORD = 'R1s3n$ArCh1v3_909#Xz';

// Инициализация глобального облака Firebase (доступно всем посетителям сайта)
let firebaseApp = null;
let auth = null;
let db = null;
const appId =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_ID) ||
  (typeof __app_id !== 'undefined' && __app_id) ||
  'risen-sound-archive';

try {
  const rawConfig =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_CONFIG) ||
    (typeof __firebase_config !== 'undefined' && __firebase_config);

  if (rawConfig) {
    const firebaseConfig = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
  }
} catch (err) {
  console.warn('Firebase init fallback:', err);
}


const DB_NAME = 'RisenArchiveMasterDB_v5';
const DB_VERSION = 5;
const STORE_TRACKS = 'tracks';
const STORE_SETTINGS = 'settings';
const STORE_RUNWAY = 'runway';

const DEFAULT_PROFILE = {
  nickname: 'risen',
  role: 'artist',
  telegramUsername: 'risen',
  avatarUrl:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80'
};

export const DEFAULT_RUNWAY_ITEMS = [
  {
    id: 'runway-1',
    code: 'TAPE-01 // PARIS [VIDEO]',
    house: 'MAISON MARGIELA',
    season: 'ARTISANAL COLLECTION // RUNWAY FILM',
    mediaType: 'video',
    videoUrl:
      'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-posing-in-neon-light-39877-large.mp4',
    fallbackVideoUrl:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    imageUrl:
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1400&q=80',
    description:
      'Архивная видеозапись закрытого кутюрного показа Maison Margiela Artisanal в Париже. Деконструкция, белые стежки, анонимные маски и сырой индустриальный свет.',
    order: 0
  },
  {
    id: 'runway-2',
    code: 'TAPE-02 // PARIS',
    house: 'RICK OWENS',
    season: 'PALAIS DE TOKYO — MONOLITH',
    mediaType: 'image',
    videoUrl: '',
    imageUrl:
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1400&q=80',
    description:
      'Монохромный брутализм, тяжелый индустриальный дым и деконструированные силуэты на бетонном подиуме Palais de Tokyo.',
    order: 1
  },
  {
    id: 'runway-3',
    code: 'TAPE-03 // LONDON-PARIS',
    house: 'ALEXANDER MCQUEEN',
    season: 'NO. 13 / SAVAGE BEAUTY ARCHIVE',
    mediaType: 'image',
    videoUrl: '',
    imageUrl:
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1400&q=80',
    description:
      'Экспериментальная готика и резкий контраст света. Архивная съемка с высокой зернистостью пленки 35mm.',
    order: 2
  },
  {
    id: 'runway-4',
    code: 'TAPE-04 // PARIS',
    house: 'MAISON MARGIELA',
    season: 'ARCHIVE 0-23 // WHITE STITCH',
    mediaType: 'image',
    videoUrl: '',
    imageUrl:
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1400&q=80',
    description:
      'Анонимность, четыре белых стежка и необработанные края ткани. Эстетика закрытого показа в Париже.',
    order: 3
  },
  {
    id: 'runway-5',
    code: 'TAPE-05 // PARIS',
    house: 'RICK OWENS',
    season: 'DRKSHDW — CONCRETE FOG ARCHIVE',
    mediaType: 'image',
    videoUrl: '',
    imageUrl:
      'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=1400&q=80',
    description:
      'Геометричный авангард, гипертрофированные пропорции и глухая индустриальная акустика бетонного бункера.',
    order: 4
  },
  {
    id: 'runway-6',
    code: 'TAPE-06 // LONDON',
    house: 'ALEXANDER MCQUEEN',
    season: 'VOSS / GLASS ASYLUM ARCHIVE',
    mediaType: 'image',
    videoUrl: '',
    imageUrl:
      'https://images.unsplash.com/photo-1509319117193-57bab727e09d?auto=format&fit=crop&w=1400&q=80',
    description:
      'Темная театральная драматургия, зеркальный куб и бескомпромиссный силуэт на грани высокой моды и арт-перформанса.',
    order: 5
  }
];

// ============================================================================
// 2. INDEXED-DB И ОБЛАЧНЫЕ УТИЛИТЫ (СЖАТИЕ ОБЛОЖЕК + ЧАНКИНГ АУДИО ДЛЯ ВСЕХ)
// ============================================================================
function openArchiveDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const idb = event.target.result;
      if (!idb.objectStoreNames.contains(STORE_TRACKS)) {
        idb.createObjectStore(STORE_TRACKS, { keyPath: 'id' });
      }
      if (!idb.objectStoreNames.contains(STORE_SETTINGS)) {
        idb.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
      if (!idb.objectStoreNames.contains(STORE_RUNWAY)) {
        idb.createObjectStore(STORE_RUNWAY, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbGetAll(storeName) {
  const idb = await openArchiveDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(storeName, key) {
  const idb = await openArchiveDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(storeName, value) {
  const idb = await openArchiveDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(storeName, key) {
  const idb = await openArchiveDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

async function dbClear(storeName) {
  const idb = await openArchiveDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

// Сжатие любого загруженного изображения в компактный DataURL для мгновенной раздачи всем через Firestore
async function compressImageForCloud(file, maxDim = 900, quality = 0.78) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve('');
      img.src = e.target.result;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

// Преобразование файла в Base64 для разбивки на облачные чанки
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const commaIdx = result.indexOf(',');
      resolve(commaIdx !== -1 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function base64ToBlob(base64, mimeType = 'audio/mpeg') {
  const byteChars = atob(base64);
  const byteArrays = [];
  const sliceSize = 8192;
  for (let offset = 0; offset < byteChars.length; offset += sliceSize) {
    const slice = byteChars.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }
  return new Blob(byteArrays, { type: mimeType });
}

// Сохранение аудио/видео файла в облако по чанкам (до ~14 МБ), чтобы его слышали все пользователи
async function uploadMediaChunksToCloud(mediaId, file, onProgress) {
  if (!db) return { chunkCount: 0, mimeType: file.type || 'audio/mpeg' };
  const base64 = await fileToBase64(file);
  const chunkSize = 620000; // ~620 KB безопасный размер для документа Firestore (< 1MB)
  const totalChunks = Math.ceil(base64.length / chunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const slice = base64.slice(i * chunkSize, (i + 1) * chunkSize);
    const chunkDocRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'media_chunks',
      `${mediaId}_part_${i}`
    );
    await setDoc(chunkDocRef, {
      mediaId,
      index: i,
      totalChunks,
      mimeType: file.type || 'audio/mpeg',
      data: slice
    });
    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalChunks) * 100));
    }
  }
  return {
    chunkCount: totalChunks,
    mimeType: file.type || 'audio/mpeg'
  };
}

// Скачивание и сборка облачных чанков в живой Blob URL на устройстве любого посетителя
async function downloadMediaChunksFromCloud(mediaId, totalChunks, mimeType) {
  if (!db || !totalChunks) return null;
  const allSnap = await getDocs(
    collection(db, 'artifacts', appId, 'public', 'data', 'media_chunks')
  );
  const parts = [];
  allSnap.forEach((docSnap) => {
    const d = docSnap.data();
    if (d && d.mediaId === mediaId) {
      parts.push(d);
    }
  });
  if (parts.length === 0) return null;
  parts.sort((a, b) => a.index - b.index);
  const fullBase64 = parts.map((p) => p.data).join('');
  return base64ToBlob(fullBase64, mimeType || 'audio/mpeg');
}

// ============================================================================
// 3. АНАЛИЗАТОР ВОЛНЫ SOUNDCLOUD И ФОРМАТИРОВАНИЕ
// ============================================================================
function createFallbackPeaks(seedStr = 'risen', bars = 72) {
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const peaks = [];
  for (let i = 0; i < bars; i++) {
    hash ^= i * 37;
    hash = Math.imul(hash, 16777619);
    const normalized = (Math.abs(hash) % 1000) / 1000;
    const envelope = Math.sin((i / bars) * Math.PI);
    const height = Math.max(
      0.18,
      Math.min(0.98, normalized * 0.65 + envelope * 0.35)
    );
    peaks.push(Number(height.toFixed(3)));
  }
  return peaks;
}

async function extractWaveformAndDuration(file, bars = 72) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return { peaks: createFallbackPeaks(file.name, bars), duration: 0 };
  }
  const audioCtx = new AudioCtx();
  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const rawData = audioBuffer.getChannelData(0);
    const blockSize = Math.max(1, Math.floor(rawData.length / bars));
    const peaks = [];

    for (let i = 0; i < bars; i++) {
      const start = i * blockSize;
      let sum = 0;
      let max = 0;
      for (let j = 0; j < blockSize; j += 4) {
        const sample = Math.abs(rawData[start + j] || 0);
        if (sample > max) max = sample;
        sum += sample;
      }
      const avg = sum / (blockSize / 4);
      const combined = max * 0.65 + avg * 0.35;
      peaks.push(combined);
    }

    const maxPeak = Math.max(...peaks, 0.01);
    const normalizedPeaks = peaks.map((p) =>
      Number(Math.max(0.15, Math.min(0.98, p / maxPeak)).toFixed(3))
    );

    return {
      peaks: normalizedPeaks,
      duration: Math.round(audioBuffer.duration)
    };
  } catch (_) {
    return { peaks: createFallbackPeaks(file.name, bars), duration: 0 };
  } finally {
    try {
      if (audioCtx.state !== 'closed') {
        await audioCtx.close();
      }
    } catch (_) {}
  }
}

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function isVideoUrl(url = '') {
  return /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i.test(String(url).trim());
}

// ============================================================================
// 4. НЕЖНЫЙ ГЛИТЧ-ДВИЖОК В СТИЛЕ ВИДЕО «SQWORE — ЗАВТРА» (SOFT TOUCHDESIGNER
//    BLOB TRACKING + ДЕЛИКАТНЫЙ ФОСФОРНЫЙ СВЕТ + ТОНКИЕ ВЕКТОРЫ И ПОЛОСЫ)
// ============================================================================
function AcidBlobTrackingGlitchOverlay({ intensity = 0, seed = 0 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (intensity <= 0.02) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.clearRect(0, 0, w, h);

    // Псевдослучайный генератор от текущего скролл-сида
    let localHash = Math.floor((seed + 0.1337) * 1000000);
    const rand = () => {
      localHash = (localHash * 1664525 + 1013904223) % 4294967296;
      return localHash / 4294967296;
    };

    const isPeakExplosion = intensity > 0.52;

    // 1. Мягкие полупрозрачные вертикальные нити (Delicate Pixel Sort Streaks)
    const streakCount = Math.floor(10 + intensity * 22);
    for (let i = 0; i < streakCount; i++) {
      const x =
        rand() < 0.45
          ? rand() * (w * 0.26)
          : rand() * w;
      const streakW = rand() < 0.8 ? 0.8 + rand() * 1.4 : 2 + rand() * 6 * intensity;
      const streakY = rand() * h * 0.55;
      const streakH = h * (0.2 + rand() * 0.55);

      const alpha = (0.04 + rand() * 0.14) * intensity;
      ctx.fillStyle =
        rand() > 0.3
          ? `rgba(134, 239, 172, ${alpha})`
          : `rgba(236, 252, 203, ${alpha * 1.1})`;
      ctx.fillRect(x, streakY, streakW, streakH);
    }

    // 2. Деликатные полупрозрачные макроблоки (без резкого перекрытия контента)
    const blockCount = isPeakExplosion
      ? Math.floor(8 + intensity * 14)
      : Math.floor(3 + intensity * 7);

    for (let i = 0; i < blockCount; i++) {
      const bx = rand() * w;
      const by = rand() * h;
      const bw = (24 + rand() * 130) * intensity;
      const bh = (8 + rand() * 55) * intensity;
      const styleRoll = rand();

      if (styleRoll < 0.45) {
        ctx.fillStyle = `rgba(217, 249, 157, ${(0.05 + rand() * 0.12) * intensity})`;
      } else if (styleRoll < 0.82) {
        ctx.fillStyle = `rgba(74, 222, 128, ${(0.04 + rand() * 0.1) * intensity})`;
      } else {
        ctx.fillStyle = `rgba(5, 12, 7, ${(0.08 + rand() * 0.14) * intensity})`;
      }
      ctx.fillRect(bx, by, bw, bh);
    }

    // 3. Генерируем узлы компьютерного зрения (TouchDesigner Blob Tracking Boxes)
    const nodeCount = Math.floor(7 + intensity * 15);
    const nodes = [];

    for (let i = 0; i < nodeCount; i++) {
      const biasCenter = rand() < 0.65;
      const nx = biasCenter
        ? w * (0.18 + rand() * 0.64)
        : rand() * (w - 60) + 30;
      const ny = biasCenter
        ? h * (0.14 + rand() * 0.72)
        : rand() * (h - 60) + 30;

      const boxSize =
        rand() < 0.76
          ? 14 + rand() * 36
          : 48 + rand() * 90 * intensity;

      const labelType = i % 3;
      const labelText =
        labelType === 0
          ? (0.11 + rand() * 0.88).toFixed(2)
          : labelType === 1
          ? String(Math.floor(100 + rand() * 1890))
          : `${(rand() * 19).toFixed(1)} // ${(rand() * 0.99).toFixed(2)}`;

      nodes.push({
        x: nx,
        y: ny,
        w: boxSize,
        h: boxSize * (0.75 + rand() * 0.45),
        label: labelText
      });
    }

    // 4. Тонкие паутинные векторы связи (Plexus Lines) между узлами
    ctx.lineWidth = 0.65;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      const connections = isPeakExplosion ? 2 : 1;
      for (let c = 1; c <= connections; c++) {
        const b = nodes[(i + c * 3) % nodes.length];
        if (!b) continue;
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        if (dist < w * 0.48) {
          ctx.strokeStyle =
            c % 2 === 0
              ? `rgba(240, 253, 244, ${Math.min(0.45, intensity * 0.42)})`
              : `rgba(134, 239, 172, ${Math.min(0.38, intensity * 0.35)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // 5. Аккуратные рамки захвата (Bounding Boxes) и мягкие числовые метрики
    ctx.font = '9px monospace';
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const halfW = n.w / 2;
      const halfH = n.h / 2;

      if (i % 5 === 0) {
        ctx.fillStyle = `rgba(187, 247, 208, ${0.06 * intensity})`;
        ctx.fillRect(n.x - halfW, n.y - halfH, n.w, n.h);
      }

      ctx.strokeStyle =
        i % 3 === 0
          ? `rgba(255, 255, 255, ${Math.min(0.55, 0.18 + intensity * 0.35)})`
          : `rgba(163, 230, 53, ${Math.min(0.5, 0.15 + intensity * 0.32)})`;
      ctx.lineWidth = 0.8;
      ctx.strokeRect(n.x - halfW, n.y - halfH, n.w, n.h);

      // Миниатюрная точка в центре узла
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.65, 0.25 + intensity * 0.4)})`;
      ctx.fillRect(n.x - 1, n.y - 1, 2, 2);

      // Координатная подпись сверху от рамки
      ctx.fillStyle = `rgba(236, 252, 203, ${Math.min(0.65, 0.22 + intensity * 0.4)})`;
      ctx.fillText(n.label, n.x - halfW + 2, n.y - halfH - 4);
    }
  }, [intensity, seed]);

  if (intensity <= 0.02) return null;

  const isPeak = intensity > 0.52;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden transition-opacity duration-200">
      {/* Мягкая атмосферная вуаль в духе ночного видения без резкого пересвета */}
      <div
        className="absolute inset-0 transition-opacity duration-150"
        style={{
          opacity: Math.min(0.38, intensity * 0.42),
          background:
            'radial-gradient(circle at 45% 45%, rgba(74, 222, 128, 0.1), rgba(20, 83, 45, 0.16) 65%, rgba(2, 12, 6, 0.25) 100%)',
          backdropFilter: `contrast(${100 + Math.round(intensity * 32)}%) brightness(${
            100 + Math.round(intensity * 8)
          }%) hue-rotate(${Math.round(intensity * 24)}deg) saturate(${
            100 + Math.round(intensity * 35)
          }%)`
        }}
      />

      {/* Деликатные полупрозрачные полосы развертки при быстром скролле */}
      {isPeak && (
        <>
          <div
            className="absolute inset-x-0 bg-lime-300/5 backdrop-blur-[0.5px] border-y border-lime-300/20"
            style={{
              top: `${Math.round(((seed * 100) % 65) + 12)}%`,
              height: `${Math.round(3 + intensity * 7)}vh`,
              transform: `translate3d(${Math.round((seed - 0.5) * 14)}px, 0, 0)`
            }}
          />
          <div
            className="absolute inset-x-0 bg-emerald-400/5 border-y border-white/15"
            style={{
              top: `${Math.round(((seed * 230) % 70) + 18)}%`,
              height: `${Math.round(2 + intensity * 5)}vh`,
              transform: `translate3d(${Math.round((0.5 - seed) * 18)}px, 0, 0)`
            }}
          />
        </>
      )}

      {/* Холст с мягким TouchDesigner Blob-трекингом */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Нежный индикатор CV-трекинга в углу */}
      <div className="fixed right-3 top-14 bg-black/80 backdrop-blur-sm border border-lime-400/40 px-2.5 py-1 font-mono text-[9px] tracking-widest uppercase flex items-center gap-1.5 shadow-[0_0_15px_rgba(132,204,22,0.2)]">
        <Crosshair className="w-3 h-3 text-lime-400/80 animate-spin" />
        <span className="text-lime-300/85">
          CV_TRACK // [{(intensity * 4.5).toFixed(2)}]
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// 5. КОМПОНЕНТ АРХИВНОГО ВИДЕО / ФОТО ПОКАЗОВ (С VHS-ПЛЕНКОЙ 16MM)
// ============================================================================
function RunwayMediaRenderer({ item, className = '', showBadge = true }) {
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef(null);

  const isVideo =
    item?.mediaType === 'video' ||
    Boolean(item?.videoUrl) ||
    isVideoUrl(item?.imageUrl);

  const activeVideoSrc =
    item?.videoUrl || (isVideoUrl(item?.imageUrl) ? item?.imageUrl : '');
  const posterSrc =
    item?.imageUrl && !isVideoUrl(item?.imageUrl)
      ? item.imageUrl
      : DEFAULT_RUNWAY_ITEMS[0].imageUrl;

  useEffect(() => {
    setVideoFailed(false);
  }, [activeVideoSrc, item?.id]);

  return (
    <div className={`relative overflow-hidden bg-black ${className}`}>
      {isVideo && activeVideoSrc && !videoFailed ? (
        <video
          ref={videoRef}
          key={activeVideoSrc}
          poster={posterSrc}
          autoPlay
          loop
          muted
          playsInline
          onError={() => setVideoFailed(true)}
          className="w-full h-full object-cover grayscale contrast-150 brightness-90"
        >
          <source src={activeVideoSrc} type="video/mp4" />
          {item?.fallbackVideoUrl && (
            <source src={item.fallbackVideoUrl} type="video/mp4" />
          )}
        </video>
      ) : (
        <img
          src={posterSrc}
          alt={item?.house || 'Runway'}
          loading="lazy"
          className={`w-full h-full object-cover grayscale contrast-125 ${
            isVideo ? 'animate-pulse scale-105' : ''
          }`}
        />
      )}

      {isVideo && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="w-full h-full opacity-35"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(0,0,0,0.65) 0px, rgba(0,0,0,0.65) 1px, transparent 1px, transparent 3px)'
            }}
          />
          {showBadge && (
            <div className="absolute bottom-2 left-2 z-10 bg-black/90 border border-[#FF5500] px-2 py-0.5 font-mono text-[9px] text-[#FF5500] uppercase flex items-center gap-1.5 shadow-[0_0_12px_rgba(255,85,0,0.5)]">
              <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-ping" />
              <span className="font-bold">REC ● 16MM VIDEO TAPE</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 6. КОМПОНЕНТ ВОЛНЫ SOUNDCLOUD (С ПОДДЕРЖКОЙ TOUCH И МЫШИ)
// ============================================================================
function SoundCloudWaveform({
  peaks = [],
  isActive,
  progress = 0,
  duration = 0,
  onSeek
}) {
  const containerRef = useRef(null);
  const [hoverRatio, setHoverRatio] = useState(null);

  const safePeaks = useMemo(() => {
    return Array.isArray(peaks) && peaks.length > 0
      ? peaks
      : createFallbackPeaks('default', 72);
  }, [peaks]);

  const computeRatioFromClientX = (clientX) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return null;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const handleClick = (e) => {
    e.stopPropagation();
    const ratio = computeRatioFromClientX(e.clientX);
    if (ratio !== null) onSeek(ratio);
  };

  const handleMouseMove = (e) => {
    const ratio = computeRatioFromClientX(e.clientX);
    if (ratio !== null) setHoverRatio(ratio);
  };

  const handleTouchStart = (e) => {
    e.stopPropagation();
    const touch = e.touches?.[0];
    if (!touch) return;
    const ratio = computeRatioFromClientX(touch.clientX);
    if (ratio !== null) {
      setHoverRatio(ratio);
      onSeek(ratio);
    }
  };

  const handleTouchMove = (e) => {
    const touch = e.touches?.[0];
    if (!touch) return;
    const ratio = computeRatioFromClientX(touch.clientX);
    if (ratio !== null) {
      setHoverRatio(ratio);
      onSeek(ratio);
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverRatio(null)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => setHoverRatio(null)}
      className="relative w-full h-14 sm:h-16 flex flex-col justify-center cursor-pointer select-none group py-1 touch-pan-y"
      title="Нажмите или проведите для перемотки"
    >
      {hoverRatio !== null && duration > 0 && (
        <div
          className="absolute -top-2 z-20 -translate-x-1/2 px-1.5 py-0.5 bg-black border border-[#FF5500] text-[#FF5500] font-mono text-[10px] pointer-events-none tracking-tighter"
          style={{ left: `${hoverRatio * 100}%` }}
        >
          {formatTime(hoverRatio * duration)}
        </div>
      )}

      <div className="w-full h-9 sm:h-10 flex items-end gap-[1px] sm:gap-[2px]">
        {safePeaks.map((peak, idx) => {
          const barRatio = idx / safePeaks.length;
          const isPlayed = isActive && barRatio <= progress;
          const isHovered = hoverRatio !== null && barRatio <= hoverRatio;

          let barColor = 'bg-zinc-600/75 group-hover:bg-zinc-500';
          if (isPlayed) {
            barColor = 'bg-[#FF5500] shadow-[0_0_8px_rgba(255,85,0,0.45)]';
          } else if (isHovered) {
            barColor = 'bg-[#FF5500]/65';
          }

          return (
            <div
              key={idx}
              className={`flex-1 min-w-[1px] rounded-t-[1px] transition-colors duration-75 ${barColor}`}
              style={{
                height: `${Math.max(14, Math.round(peak * 100))}%`
              }}
            />
          );
        })}
      </div>

      <div className="w-full h-[1px] bg-zinc-800 my-[1px]" />

      <div className="w-full h-3 sm:h-3.5 flex items-start gap-[1px] sm:gap-[2px] opacity-35">
        {safePeaks.map((peak, idx) => {
          const barRatio = idx / safePeaks.length;
          const isPlayed = isActive && barRatio <= progress;
          return (
            <div
              key={idx}
              className={`flex-1 min-w-[1px] rounded-b-[1px] ${
                isPlayed ? 'bg-[#FF5500]' : 'bg-zinc-700'
              }`}
              style={{
                height: `${Math.max(15, Math.round(peak * 65))}%`
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// 7. ГЛАВНЫЙ КОМПОНЕНТ ПРИЛОЖЕНИЯ
// ============================================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [runwayItems, setRunwayItems] = useState(DEFAULT_RUNWAY_ITEMS);
  const [isLoadingArchive, setIsLoadingArchive] = useState(true);
  const [uploadProgressText, setUploadProgressText] = useState('');

  const [activeRunwayIndex, setActiveRunwayIndex] = useState(0);
  const [selectedRunwayModal, setSelectedRunwayModal] = useState(null);

  const [activeCategory, setActiveCategory] = useState('ALL');
  const [activeGenre, setActiveGenre] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Плеер
  const audioRef = useRef(null);
  const [currentTrackId, setCurrentTrackId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  // Таймкод и уведомления
  const [clockStr, setClockStr] = useState('00:00:00:00');
  const [securityToast, setSecurityToast] = useState(null);
  const [copiedTrackId, setCopiedTrackId] = useState(null);

  // Тройной тап по логотипу для мобильного входа в админку
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef(null);

  // Глитч-движок (Sqwore — Завтра: Acid Green Blob-Tracker & Datamosh)
  const [fxOverloadEnabled, setFxOverloadEnabled] = useState(true);
  const [overloadIntensity, setOverloadIntensity] = useState(0);
  const [glitchSeed, setGlitchSeed] = useState(0.42);
  const lastScrollYRef = useRef(0);
  const lastScrollTimeRef = useRef(performance.now());
  const decayTimerRef = useRef(null);
  const manualStormIntervalRef = useRef(null);

  // Панель Создателя (Creator Studio)
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [showStudioModal, setShowStudioModal] = useState(false);
  const [adminTab, setAdminTab] = useState('tracks');

  // Состояние формы трека
  const [editingTrackId, setEditingTrackId] = useState(null);
  const [trackForm, setTrackForm] = useState({
    title: '',
    category: 'BEAT',
    genre: 'Opium / Dark',
    bpm: '144',
    musicalKey: 'F#m',
    description: '',
    audioFile: null,
    audioDirectUrl: '',
    coverFile: null,
    coverPreviewUrl: ''
  });
  const [isSavingData, setIsSavingData] = useState(false);

  // Состояние формы профиля
  const [profileForm, setProfileForm] = useState(DEFAULT_PROFILE);
  const [avatarFile, setAvatarFile] = useState(null);

  // Состояние формы показов мод (Runway Archive: Фото + Видео)
  const [editingRunwayId, setEditingRunwayId] = useState(null);
  const [runwayForm, setRunwayForm] = useState({
    code: 'TAPE-07 // PARIS',
    house: '',
    season: '',
    mediaType: 'image',
    description: '',
    imageUrl: '',
    videoUrl: '',
    imageFile: null,
    videoFile: null
  });

  // Регистрация ObjectURL для предотвращения утечек памяти
  const createdObjectUrlsRef = useRef(new Set());
  const audioChunkCacheRef = useRef(new Map());

  const registerObjectUrl = useCallback((blob) => {
    const url = URL.createObjectURL(blob);
    createdObjectUrlsRef.current.add(url);
    return url;
  }, []);

  useEffect(() => {
    return () => {
      createdObjectUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (_) {}
      });
      createdObjectUrlsRef.current.clear();
    };
  }, []);

  const triggerSecurityAlert = useCallback((msg) => {
    setSecurityToast(msg);
  }, []);

  useEffect(() => {
    if (!securityToast) return;
    const t = setTimeout(() => setSecurityToast(null), 3000);
    return () => clearTimeout(t);
  }, [securityToast]);

  // --------------------------------------------------------------------------
  // ШАГ 1: Авторизация в облаке Firebase (правило RULE 3)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!auth) {
      setIsLoadingArchive(false);
      return;
    }
    const initAuth = async () => {
      try {
        if (
          typeof __initial_auth_token !== 'undefined' &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.warn('Auth error:', err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // --------------------------------------------------------------------------
  // ШАГ 2: Загрузка локального кэша + Подписка на реальное время для ВСЕХ пользователей
  // --------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    // Сначала мгновенно читаем локальный кэш IndexedDB
    async function loadLocalCache() {
      try {
        const [localTracks, localProfile, localRunway] = await Promise.all([
          dbGetAll(STORE_TRACKS),
          dbGet(STORE_SETTINGS, 'profile'),
          dbGetAll(STORE_RUNWAY)
        ]);
        if (!isMounted) return;

        if (localTracks && localTracks.length > 0) {
          const hydrated = localTracks
            .map((t) => {
              let liveAudio = t.audioUrl || '';
              if (t.audioBlob instanceof Blob) {
                liveAudio = registerObjectUrl(t.audioBlob);
                audioChunkCacheRef.current.set(t.id, liveAudio);
              }
              return {
                ...t,
                audioUrl: liveAudio,
                coverUrl: t.coverUrl || DEFAULT_RUNWAY_ITEMS[0].imageUrl
              };
            })
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setTracks(hydrated);
        }

        if (localProfile?.value) {
          const p = { ...DEFAULT_PROFILE, ...localProfile.value };
          setProfile(p);
          setProfileForm(p);
        }

        if (localRunway && localRunway.length >= 6) {
          setRunwayItems(
            [...localRunway].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          );
        }
      } catch (_) {}
    }

    loadLocalCache();
    return () => {
      isMounted = false;
    };
  }, [registerObjectUrl]);

  // Реалтайм-синхронизация с общим облаком Firestore (видно всем посетителям сразу)
  useEffect(() => {
    if (!user || !db) {
      setIsLoadingArchive(false);
      return;
    }

    const tracksCol = collection(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'tracks'
    );
    const settingsCol = collection(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'site_settings'
    );
    const runwayCol = collection(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'runway_items'
    );

    const unsubTracks = onSnapshot(
      tracksCol,
      (snapshot) => {
        const cloudTracks = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data) {
            const cachedBlobUrl = audioChunkCacheRef.current.get(data.id);
            cloudTracks.push({
              ...data,
              id: docSnap.id,
              audioUrl: cachedBlobUrl || data.audioUrl || '',
              coverUrl: data.coverUrl || DEFAULT_RUNWAY_ITEMS[0].imageUrl,
              peaks: Array.isArray(data.peaks)
                ? data.peaks
                : createFallbackPeaks(data.title || 'risen')
            });
          }
        });
        cloudTracks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setTracks(cloudTracks);
        setIsLoadingArchive(false);
      },
      (err) => {
        console.warn('Tracks sync warning:', err);
        setIsLoadingArchive(false);
      }
    );

    const unsubProfile = onSnapshot(
      settingsCol,
      (snapshot) => {
        snapshot.forEach((docSnap) => {
          if (docSnap.id === 'profile') {
            const data = docSnap.data();
            if (data) {
              const merged = {
                nickname: data.nickname || 'risen',
                role: data.role || 'artist',
                telegramUsername: data.telegramUsername || 'risen',
                avatarUrl: data.avatarUrl || DEFAULT_PROFILE.avatarUrl
              };
              setProfile(merged);
              setProfileForm(merged);
            }
          }
        });
      },
      (err) => console.warn('Profile sync warning:', err)
    );

    const unsubRunway = onSnapshot(
      runwayCol,
      async (snapshot) => {
        if (snapshot.empty) {
          // Инициализируем 6 дефолтных пленок в общем облаке при первом открытии
          for (let i = 0; i < DEFAULT_RUNWAY_ITEMS.length; i++) {
            const item = DEFAULT_RUNWAY_ITEMS[i];
            const ref = doc(
              db,
              'artifacts',
              appId,
              'public',
              'data',
              'runway_items',
              item.id
            );
            await setDoc(ref, { ...item, order: i }).catch(() => {});
          }
          setRunwayItems(DEFAULT_RUNWAY_ITEMS);
          return;
        }
        const list = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          if (d) list.push({ ...d, id: docSnap.id });
        });
        list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setRunwayItems(list);
      },
      (err) => console.warn('Runway sync warning:', err)
    );

    return () => {
      unsubTracks();
      unsubProfile();
      unsubRunway();
    };
  }, [user]);

  // Живой таймкод
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      const ff = String(Math.floor(now.getMilliseconds() / 40)).padStart(2, '0');
      setClockStr(`${hh}:${mm}:${ss}:${ff}`);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  // Хоткей Shift + A и мобильный тройной тап
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        e.target?.isContentEditable
      ) {
        return;
      }
      if (e.shiftKey && e.code === 'KeyA') {
        e.preventDefault();
        if (isAdmin) {
          setShowStudioModal((prev) => !prev);
        } else {
          setShowAuthModal((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdmin]);

  const handleSecretMobileTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      if (isAdmin) {
        setShowStudioModal(true);
      } else {
        setShowAuthModal(true);
      }
      return;
    }
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 600);
  };

  // ==========================================================================
  // ЗАПУСК МЯГКОГО КИСЛОТНОГО BLOB-TRACKING ГЛИТЧА (ПРИ СКРОЛЛЕ И ПО КНОПКЕ)
  // ==========================================================================
  const triggerHardcoreGlitchStorm = useCallback(() => {
    setFxOverloadEnabled(true);
    if (manualStormIntervalRef.current) {
      clearInterval(manualStormIntervalRef.current);
    }
    let ticks = 0;
    setOverloadIntensity(0.62);
    setGlitchSeed(Math.random());

    manualStormIntervalRef.current = setInterval(() => {
      ticks += 1;
      setGlitchSeed(Math.random());
      setOverloadIntensity(0.38 + Math.random() * 0.25);
      if (ticks >= 14) {
        clearInterval(manualStormIntervalRef.current);
        manualStormIntervalRef.current = null;
        setOverloadIntensity(0);
      }
    }, 95);
  }, []);

  useEffect(() => {
    if (!fxOverloadEnabled) {
      setOverloadIntensity(0);
      return;
    }

    const handleScroll = () => {
      const now = performance.now();
      const currentY = window.scrollY;
      const deltaY = Math.abs(currentY - lastScrollYRef.current);
      const deltaTime = Math.max(16, now - lastScrollTimeRef.current);

      lastScrollYRef.current = currentY;
      lastScrollTimeRef.current = now;

      const velocity = deltaY / deltaTime;
      const calculated = Math.min(0.7, Math.max(0.14, velocity / 1.9));

      setOverloadIntensity(calculated);
      setGlitchSeed(Math.random());

      if (decayTimerRef.current) clearTimeout(decayTimerRef.current);
      decayTimerRef.current = setTimeout(() => {
        setOverloadIntensity(0);
      }, 240);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (decayTimerRef.current) clearTimeout(decayTimerRef.current);
    };
  }, [fxOverloadEnabled]);

  const handleContextMenu = (e) => {
    e.preventDefault();
    triggerSecurityAlert(
      '[SECURITY ALERT] СКАЧИВАНИЕ ЗАБЛОКИРОВАНО // STREAM ONLY'
    );
    return false;
  };

  // Жанры и фильтрация
  const availableGenres = useMemo(() => {
    const set = new Set();
    tracks.forEach((t) => {
      if (t.genre && t.genre.trim()) set.add(t.genre.trim());
    });
    return ['All', ...Array.from(set)];
  }, [tracks]);

  useEffect(() => {
    if (activeGenre !== 'All' && !availableGenres.includes(activeGenre)) {
      setActiveGenre('All');
    }
  }, [availableGenres, activeGenre]);

  const filteredTracks = useMemo(() => {
    return tracks.filter((track) => {
      const matchCat =
        activeCategory === 'ALL' || (track.category || 'BEAT') === activeCategory;
      const matchGenre =
        activeGenre === 'All' ||
        (track.genre || '').toLowerCase() === activeGenre.toLowerCase();
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        (track.title || '').toLowerCase().includes(q) ||
        (track.description || '').toLowerCase().includes(q) ||
        (track.genre || '').toLowerCase().includes(q) ||
        (track.serial || '').toLowerCase().includes(q);
      return matchCat && matchGenre && matchSearch;
    });
  }, [tracks, activeCategory, activeGenre, searchQuery]);

  const currentTrack = useMemo(
    () => tracks.find((t) => t.id === currentTrackId) || null,
    [tracks, currentTrackId]
  );

  // Управление аудиоплеером (с подгрузкой чанков из облака для любого посетителя)
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.loop = isLooping;
  }, [isLooping]);

  const resolvePlayableAudioUrl = useCallback(
    async (track) => {
      if (track.audioUrl && !track.audioUrl.startsWith('cloud-chunks:')) {
        return track.audioUrl;
      }
      if (audioChunkCacheRef.current.has(track.id)) {
        return audioChunkCacheRef.current.get(track.id);
      }
      if (track.chunkCount > 0 && db) {
        triggerSecurityAlert('ЗАГРУЗКА АУДИОПОТОКА ИЗ ОБЛАКА...');
        const blob = await downloadMediaChunksFromCloud(
          track.id,
          track.chunkCount,
          track.audioMimeType || 'audio/mpeg'
        );
        if (blob) {
          const url = registerObjectUrl(blob);
          audioChunkCacheRef.current.set(track.id, url);
          return url;
        }
      }
      return '';
    },
    [registerObjectUrl, triggerSecurityAlert]
  );

  const playTrack = useCallback(
    async (track) => {
      if (!track) return;
      const audio = audioRef.current;
      if (!audio) return;

      if (currentTrackId === track.id) {
        if (isPlaying) {
          audio.pause();
          setIsPlaying(false);
        } else {
          try {
            await audio.play();
            setIsPlaying(true);
          } catch (_) {
            setIsPlaying(false);
          }
        }
        return;
      }

      try {
        audio.pause();
        const playableUrl = await resolvePlayableAudioUrl(track);
        if (!playableUrl) {
          triggerSecurityAlert('АУДИОФАЙЛ НЕДОСТУПЕН');
          return;
        }
        setCurrentTrackId(track.id);
        setCurrentTime(0);
        setDuration(track.duration || 0);
        audio.src = playableUrl;
        audio.currentTime = 0;
        await audio.play();
        setIsPlaying(true);
      } catch (_) {
        setIsPlaying(false);
      }
    },
    [currentTrackId, isPlaying, resolvePlayableAudioUrl, triggerSecurityAlert]
  );

  const handleSeek = useCallback(
    async (track, ratio) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (currentTrackId !== track.id) {
        audio.pause();
        const playableUrl = await resolvePlayableAudioUrl(track);
        if (!playableUrl) return;
        setCurrentTrackId(track.id);
        audio.src = playableUrl;
        const targetDur = track.duration || 0;
        if (Number.isFinite(targetDur) && targetDur > 0) {
          audio.currentTime = ratio * targetDur;
          setCurrentTime(ratio * targetDur);
        }
        audio
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
        return;
      }

      const activeDur =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : duration;

      if (Number.isFinite(activeDur) && activeDur > 0) {
        const nextTime = Math.max(0, Math.min(activeDur, ratio * activeDur));
        audio.currentTime = nextTime;
        setCurrentTime(nextTime);
      }
    },
    [currentTrackId, duration, resolvePlayableAudioUrl]
  );

  const handleSkip = useCallback(
    (direction) => {
      const list = filteredTracks.length > 0 ? filteredTracks : tracks;
      if (list.length === 0) return;
      const idx = list.findIndex((t) => t.id === currentTrackId);
      if (idx === -1) {
        playTrack(list[0]);
        return;
      }
      const nextIdx = (idx + direction + list.length) % list.length;
      playTrack(list[nextIdx]);
    },
    [filteredTracks, tracks, currentTrackId, playTrack]
  );

  // Авторизация создателя
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (passwordInput.trim() === MASTER_ADMIN_PASSWORD) {
      setIsAdmin(true);
      setAuthError('');
      setPasswordInput('');
      setShowAuthModal(false);
      setShowStudioModal(true);
      triggerSecurityAlert('CREATOR STUDIO РАЗБЛОКИРОВАНА');
    } else {
      setAuthError('ACCESS DENIED // НЕВЕРНЫЙ МАСТЕР-ПАРОЛЬ');
    }
  };

  // Сохранение трека (Мгновенно публикуется в Firestore для ВСЕХ посетителей + локальный кэш)
  const handleSaveTrack = async (e) => {
    e.preventDefault();
    if (!trackForm.title.trim()) {
      triggerSecurityAlert('ВВЕДИТЕ НАЗВАНИЕ РЕЛИЗА');
      return;
    }

    const existingTrack = tracks.find((t) => t.id === editingTrackId);
    if (
      !editingTrackId &&
      !trackForm.audioFile &&
      !trackForm.audioDirectUrl.trim()
    ) {
      triggerSecurityAlert('ПРИКРЕПИТЕ MP3 / WAV ФАЙЛ ИЛИ ССЫЛКУ');
      return;
    }

    setIsSavingData(true);
    setUploadProgressText('АНАЛИЗ ВОЛНЫ...');
    try {
      const now = Date.now();
      const id = editingTrackId || `track-${now}`;
      let peaks = existingTrack?.peaks || createFallbackPeaks(trackForm.title);
      let trackDuration = existingTrack?.duration || 0;
      let audioBlob = existingTrack?.audioBlob || null;
      let audioUrl =
        trackForm.audioDirectUrl.trim() || existingTrack?.audioUrl || '';
      let chunkCount = existingTrack?.chunkCount || 0;
      let audioMimeType = existingTrack?.audioMimeType || 'audio/mpeg';

      if (trackForm.audioFile) {
        const extracted = await extractWaveformAndDuration(trackForm.audioFile);
        peaks = extracted.peaks;
        trackDuration = extracted.duration;
        audioBlob = trackForm.audioFile;
        audioMimeType = trackForm.audioFile.type || 'audio/mpeg';

        const localObjUrl = registerObjectUrl(trackForm.audioFile);
        audioChunkCacheRef.current.set(id, localObjUrl);

        if (db && user) {
          setUploadProgressText('СИНХРОНИЗАЦИЯ АУДИО В ОБЛАКО (0%)...');
          const uploaded = await uploadMediaChunksToCloud(
            id,
            trackForm.audioFile,
            (pct) => {
              setUploadProgressText(`СИНХРОНИЗАЦИЯ АУДИО В ОБЛАКО (${pct}%)...`);
            }
          );
          chunkCount = uploaded.chunkCount;
          if (!trackForm.audioDirectUrl.trim()) {
            audioUrl = `cloud-chunks:${id}`;
          }
        } else {
          audioUrl = localObjUrl;
        }
      }

      let coverUrl =
        trackForm.coverPreviewUrl.trim() ||
        existingTrack?.coverUrl ||
        DEFAULT_RUNWAY_ITEMS[0].imageUrl;

      if (trackForm.coverFile) {
        setUploadProgressText('ОПТИМИЗАЦИЯ ОБЛОЖКИ...');
        const compressedCover = await compressImageForCloud(
          trackForm.coverFile,
          800,
          0.8
        );
        if (compressedCover) {
          coverUrl = compressedCover;
        } else {
          coverUrl = registerObjectUrl(trackForm.coverFile);
        }
      }

      const serialNumber =
        existingTrack?.serial ||
        `RSN-${String(tracks.length + 1).padStart(3, '0')}`;
      const dateAdded =
        existingTrack?.dateAdded ||
        new Date(now).toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      const createdAt = existingTrack?.createdAt || now;

      const cloudRecord = {
        id,
        serial: serialNumber,
        title: trackForm.title.trim(),
        category: trackForm.category || 'BEAT',
        genre: trackForm.genre.trim() || 'Archive',
        bpm: trackForm.bpm.trim() || '144',
        musicalKey: trackForm.musicalKey.trim() || 'F#m',
        description: trackForm.description.trim(),
        peaks,
        duration: trackDuration,
        audioUrl,
        chunkCount,
        audioMimeType,
        coverUrl,
        dateAdded,
        createdAt
      };

      // Сохраняем локально с бинарным Blob
      await dbPut(STORE_TRACKS, {
        ...cloudRecord,
        audioBlob
      });

      // Сохраняем в общее облако Firestore, чтобы видели ВСЕ пользователи
      if (db && user) {
        const trackDocRef = doc(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          'tracks',
          id
        );
        await setDoc(trackDocRef, cloudRecord);
      } else {
        setTracks((prev) => {
          const without = prev.filter((item) => item.id !== id);
          return [
            {
              ...cloudRecord,
              audioUrl: audioChunkCacheRef.current.get(id) || audioUrl
            },
            ...without
          ].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        });
      }

      setEditingTrackId(null);
      setTrackForm({
        title: '',
        category: 'BEAT',
        genre: 'Opium / Dark',
        bpm: '144',
        musicalKey: 'F#m',
        description: '',
        audioFile: null,
        audioDirectUrl: '',
        coverFile: null,
        coverPreviewUrl: ''
      });

      triggerSecurityAlert('РЕЛИЗ ОПУБЛИКОВАН И ВИДЕН ВСЕМ ПОЛЬЗОВАТЕЛЯМ');
    } catch (err) {
      triggerSecurityAlert(`ОШИБКА СОХРАНЕНИЯ: ${err.message}`);
    } finally {
      setIsSavingData(false);
      setUploadProgressText('');
    }
  };

  const handleStartEditTrack = (track) => {
    setEditingTrackId(track.id);
    setTrackForm({
      title: track.title || '',
      category: track.category || 'BEAT',
      genre: track.genre || '',
      bpm: track.bpm || '144',
      musicalKey: track.musicalKey || 'F#m',
      description: track.description || '',
      audioFile: null,
      audioDirectUrl:
        track.audioUrl && !track.audioUrl.startsWith('cloud-chunks:')
          ? track.audioUrl
          : '',
      coverFile: null,
      coverPreviewUrl:
        track.coverUrl && !track.coverUrl.startsWith('data:')
          ? track.coverUrl
          : ''
    });
    setAdminTab('tracks');
    setShowStudioModal(true);
  };

  const handleDeleteTrack = async (trackId) => {
    try {
      if (currentTrackId === trackId) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.removeAttribute('src');
        }
        setIsPlaying(false);
        setCurrentTrackId(null);
        setCurrentTime(0);
        setDuration(0);
      }

      await dbDelete(STORE_TRACKS, trackId);
      if (db && user) {
        const trackDocRef = doc(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          'tracks',
          trackId
        );
        await deleteDoc(trackDocRef);
      } else {
        setTracks((prev) => prev.filter((t) => t.id !== trackId));
      }

      if (editingTrackId === trackId) setEditingTrackId(null);
      triggerSecurityAlert('РЕЛИЗ УДАЛЕН У ВСЕХ ПОЛЬЗОВАТЕЛЕЙ');
    } catch (_) {
      triggerSecurityAlert('ОШИБКА УДАЛЕНИЯ');
    }
  };

  // Сохранение профиля (Сразу обновляется у всех посетителей через Firestore)
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingData(true);
    try {
      const cleanTg = (profileForm.telegramUsername || 'risen')
        .replace(/^https?:\/\/t\.me\//i, '')
        .replace(/^@/, '')
        .trim();

      let avatarUrl = profileForm.avatarUrl || DEFAULT_PROFILE.avatarUrl;

      if (avatarFile) {
        const compressedAvatar = await compressImageForCloud(
          avatarFile,
          600,
          0.82
        );
        if (compressedAvatar) {
          avatarUrl = compressedAvatar;
        } else {
          avatarUrl = registerObjectUrl(avatarFile);
        }
      }

      const nextProfileData = {
        nickname: profileForm.nickname.trim() || 'risen',
        role: profileForm.role.trim() || 'artist',
        telegramUsername: cleanTg || 'risen',
        avatarUrl
      };

      await dbPut(STORE_SETTINGS, { key: 'profile', value: nextProfileData });

      if (db && user) {
        const profDocRef = doc(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          'site_settings',
          'profile'
        );
        await setDoc(profDocRef, nextProfileData);
      }

      setProfile(nextProfileData);
      setProfileForm(nextProfileData);
      setAvatarFile(null);
      triggerSecurityAlert('ПРОФИЛЬ ОБНОВЛЕН ДЛЯ ВСЕХ ПОСЕТИТЕЛЕЙ');
    } catch (err) {
      triggerSecurityAlert(`ОШИБКА: ${err.message}`);
    } finally {
      setIsSavingData(false);
    }
  };

  // Сохранение фото или видео с показа в Runway Archive (Видно всем посетителям)
  const handleSaveRunway = async (e) => {
    e.preventDefault();
    if (!runwayForm.house.trim()) {
      triggerSecurityAlert('УКАЖИТЕ НАЗВАНИЕ ДОМА МОДЫ / ПОКАЗА');
      return;
    }

    setIsSavingData(true);
    try {
      const existing = runwayItems.find((r) => r.id === editingRunwayId);

      const isVideoSelected =
        runwayForm.mediaType === 'video' ||
        Boolean(runwayForm.videoFile) ||
        Boolean(runwayForm.videoUrl.trim()) ||
        isVideoUrl(runwayForm.imageUrl);

      let imageUrl =
        runwayForm.imageUrl.trim() ||
        existing?.imageUrl ||
        DEFAULT_RUNWAY_ITEMS[0].imageUrl;

      let videoUrl =
        runwayForm.videoUrl.trim() ||
        existing?.videoUrl ||
        (isVideoUrl(runwayForm.imageUrl) ? runwayForm.imageUrl.trim() : '');

      if (runwayForm.imageFile) {
        const compressedImg = await compressImageForCloud(
          runwayForm.imageFile,
          1100,
          0.8
        );
        if (compressedImg) {
          imageUrl = compressedImg;
        } else {
          imageUrl = registerObjectUrl(runwayForm.imageFile);
        }
      }

      if (runwayForm.videoFile) {
        videoUrl = registerObjectUrl(runwayForm.videoFile);
      }

      const id = editingRunwayId || `runway-${Date.now()}`;
      const sortOrder = existing?.order ?? runwayItems.length;

      const defaultCodePrefix = isVideoSelected
        ? `TAPE-0${runwayItems.length + 1} // PARIS [VIDEO]`
        : `TAPE-0${runwayItems.length + 1} // PARIS`;

      const cloudRecord = {
        id,
        code: runwayForm.code.trim() || defaultCodePrefix,
        house: runwayForm.house.trim().toUpperCase(),
        season: runwayForm.season.trim() || 'PARIS RUNWAY ARCHIVE',
        mediaType: isVideoSelected ? 'video' : 'image',
        description: runwayForm.description.trim(),
        imageUrl,
        videoUrl,
        order: sortOrder
      };

      await dbPut(STORE_RUNWAY, cloudRecord);

      if (db && user) {
        const runwayDocRef = doc(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          'runway_items',
          id
        );
        await setDoc(runwayDocRef, cloudRecord);
      } else {
        setRunwayItems((prev) => {
          const exists = prev.some((item) => item.id === id);
          if (exists) {
            return prev.map((item) => (item.id === id ? cloudRecord : item));
          }
          return [...prev, cloudRecord];
        });
      }

      setEditingRunwayId(null);
      setRunwayForm({
        code: `TAPE-0${runwayItems.length + 2} // PARIS`,
        house: '',
        season: '',
        mediaType: 'image',
        description: '',
        imageUrl: '',
        videoUrl: '',
        imageFile: null,
        videoFile: null
      });

      triggerSecurityAlert(
        'КАРТОЧКА ПОКАЗА ОБНОВЛЕНА ДЛЯ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ САЙТА'
      );
    } catch (err) {
      triggerSecurityAlert(`ОШИБКА: ${err.message}`);
    } finally {
      setIsSavingData(false);
    }
  };

  const handleDeleteRunway = async (id) => {
    if (runwayItems.length <= 1) {
      triggerSecurityAlert('В АРХИВЕ ДОЛЖЕН ОСТАТЬСЯ МИНИМУМ 1 КАДР');
      return;
    }
    await dbDelete(STORE_RUNWAY, id);
    if (db && user) {
      const runwayDocRef = doc(
        db,
        'artifacts',
        appId,
        'public',
        'data',
        'runway_items',
        id
      );
      await deleteDoc(runwayDocRef).catch(() => {});
    } else {
      setRunwayItems((prev) => prev.filter((item) => item.id !== id));
    }
    setActiveRunwayIndex(0);
    triggerSecurityAlert('КАДР УДАЛЕН ИЗ ПАНЕЛИ ПОКАЗОВ');
  };

  const handleRestoreAllDefaultRunway = async () => {
    await dbClear(STORE_RUNWAY);
    for (let i = 0; i < DEFAULT_RUNWAY_ITEMS.length; i++) {
      const item = { ...DEFAULT_RUNWAY_ITEMS[i], order: i };
      await dbPut(STORE_RUNWAY, item);
      if (db && user) {
        const ref = doc(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          'runway_items',
          item.id
        );
        await setDoc(ref, item).catch(() => {});
      }
    }
    setRunwayItems(DEFAULT_RUNWAY_ITEMS);
    setActiveRunwayIndex(0);
    triggerSecurityAlert(
      'ВОССТАНОВЛЕНЫ ВСЕ 6 ПЛЕНОК ПОКАЗОВ + ВИДЕО MAISON MARGIELA'
    );
  };

  const getTelegramLink = (trackTitle = null) => {
    const cleanUser = (profile.telegramUsername || 'risen')
      .replace(/^@/, '')
      .trim();
    const message = trackTitle
      ? `Привет, ${profile.nickname}! Хочу обсудить «${trackTitle}»`
      : `Привет, ${profile.nickname}! Пишу с твоего сайта-архива.`;
    return `https://t.me/${cleanUser}?text=${encodeURIComponent(message)}`;
  };

  const activeRunway =
    runwayItems[activeRunwayIndex] ||
    runwayItems[0] ||
    DEFAULT_RUNWAY_ITEMS[0];

  const isOverloaded = fxOverloadEnabled && overloadIntensity > 0.02;
  const jitterX = isOverloaded
    ? ((Math.sin(glitchSeed * 999) * 3.2 * overloadIntensity) || 0).toFixed(1)
    : 0;
  const jitterY = isOverloaded
    ? ((Math.cos(glitchSeed * 555) * 1.4 * overloadIntensity) || 0).toFixed(1)
    : 0;
  const skewXDeg = isOverloaded
    ? ((Math.sin(glitchSeed * 333) * 0.55 * overloadIntensity) || 0).toFixed(2)
    : 0;
  const greenSplit = isOverloaded ? (overloadIntensity * 2.1).toFixed(1) : 0;

  return (
    <div
      onContextMenu={handleContextMenu}
      className="min-h-screen bg-[#070709] text-zinc-100 font-sans selection:bg-[#FF5500] selection:text-black relative overflow-x-hidden select-none"
    >
      {/* СКРЫТЫЙ АУДИО-ДВИЖОК */}
      <audio
        ref={audioRef}
        controlsList="nodownload noplaybackrate"
        playsInline
        crossOrigin="anonymous"
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime || 0);
          }
        }}
        onLoadedMetadata={() => {
          if (
            audioRef.current &&
            Number.isFinite(audioRef.current.duration) &&
            audioRef.current.duration > 0
          ) {
            setDuration(audioRef.current.duration);
          }
        }}
        onEnded={() => {
          if (!isLooping) {
            handleSkip(1);
          }
        }}
        className="hidden"
      />

      {/* ПЛЕНОЧНЫЙ ШУМ (FILM GRAIN) */}
      <div
        className="fixed inset-0 pointer-events-none z-30 opacity-[0.055]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
        }}
      />

      {/* ====================================================================
          ГЛИТЧ-ОВЕРЛЕЙ В СТИЛЕ ВИДЕО SQWORE — «ЗАВТРА» (CV BLOB TRACKING + ACID GREEN)
      ==================================================================== */}
      <AcidBlobTrackingGlitchOverlay
        intensity={fxOverloadEnabled ? overloadIntensity : 0}
        seed={glitchSeed}
      />

      {/* УВЕДОМЛЕНИЕ БЕЗОПАСНОСТИ / СТАТУСА */}
      {securityToast && (
        <div className="fixed top-14 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-50 bg-black border-2 border-[#FF5500] px-4 py-2.5 shadow-[0_0_25px_rgba(255,85,0,0.5)] flex items-center justify-center gap-2 font-mono text-[11px] sm:text-xs text-zinc-100 text-center">
          <ShieldAlert className="w-4 h-4 text-[#FF5500] shrink-0" />
          <span>{securityToast}</span>
        </div>
      )}

      {/* ВЕРХНЯЯ ТЕХНИЧЕСКАЯ ШАПКА (FIXED) */}
      <header className="fixed top-0 inset-x-0 z-30 h-12 bg-[#070709]/95 backdrop-blur-md border-b border-zinc-800/80 px-3 sm:px-6 lg:px-8 flex items-center justify-between font-mono text-xs">
        <div
          onClick={handleSecretMobileTap}
          className="flex items-center gap-2 sm:gap-3 cursor-pointer"
          title="risen — artist"
        >
          <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse shrink-0" />
          <span className="font-bold tracking-widest text-zinc-100 lowercase truncate max-w-[100px] sm:max-w-none">
            {profile.nickname}
          </span>
          <span className="text-zinc-600">//</span>
          <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-[10px] text-[#FF5500] lowercase">
            {profile.role}
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-5 text-[11px] text-zinc-400">
          <span>ARCHIVE TC: {clockStr}</span>
          <span className="text-zinc-700">|</span>
          <span className="text-lime-400 flex items-center gap-1">
            <Cloud className="w-3 h-3" />
            LIVE SYNC
          </span>
          <span className="text-zinc-700">|</span>
          <span>RELEASES: {String(tracks.length).padStart(2, '0')}</span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Кнопка ручного запуска кислотного CV-глитча как в видео */}
          <button
            onClick={triggerHardcoreGlitchStorm}
            className="px-2 py-1.5 bg-lime-400/15 hover:bg-lime-400 text-lime-300 hover:text-black border border-lime-400 font-bold text-[10px] tracking-wider uppercase flex items-center gap-1 transition"
            title="Запустить кислотный CV-глитч (как в видео)"
          >
            <Crosshair className="w-3 h-3" />
            <span className="hidden sm:inline">ТЕСТ CV-ГЛИТЧА</span>
          </button>

          <button
            onClick={() => setFxOverloadEnabled((prev) => !prev)}
            className={`px-2 py-1.5 border text-[10px] tracking-wider uppercase transition ${
              fxOverloadEnabled
                ? 'border-lime-400/70 text-lime-300 bg-zinc-900'
                : 'border-zinc-800 text-zinc-500 bg-zinc-950'
            }`}
          >
            GLITCH: {fxOverloadEnabled ? 'ON' : 'OFF'}
          </button>

          {isAdmin ? (
            <button
              onClick={() => setShowStudioModal(true)}
              className="px-2.5 py-1.5 bg-[#FF5500] text-black font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 hover:bg-[#ff6a1f] transition"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Studio</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-200 active:text-[#FF5500] transition"
              aria-label="Creator Access"
              title="Вход для создателя (Shift + A)"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {}
      <main
        style={
          isOverloaded
            ? {
                transform: `translate3d(${jitterX}px, ${jitterY}px, 0) skewX(${skewXDeg}deg)`,
                textShadow: `${greenSplit}px 0 0 rgba(132, 204, 22, 0.45), -${greenSplit}px 0 0 rgba(236, 252, 203, 0.35)`
              }
            : undefined
        }
        className="pt-12 pb-32 transition-transform duration-150 ease-out"
      >
        {/* 1. ПРИВЕТСТВЕННЫЙ ЭКРАН (WELCOME SCREEN + ВИДЕО MAISON MARGIELA) */}
        <section className="relative min-h-[calc(100dvh-3rem)] flex flex-col justify-between border-b border-zinc-800 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <RunwayMediaRenderer
              item={activeRunway}
              showBadge={false}
              className="w-full h-full opacity-35 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-[#070709]/70 to-[#070709]/85" />
          </div>

          <div className="relative z-10 max-w-7xl w-full mx-auto px-4 lg:px-8 pt-4 sm:pt-6 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] sm:text-[11px] text-zinc-400">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 bg-zinc-900/90 border border-zinc-700 text-zinc-200 shrink-0">
                {activeRunway.code}
              </span>
              {activeRunway.mediaType === 'video' && (
                <span className="px-2 py-0.5 bg-[#FF5500] text-black font-bold flex items-center gap-1 shrink-0">
                  <Video className="w-3 h-3" />
                  16MM VIDEO
                </span>
              )}
              <span className="text-[#FF5500] uppercase font-bold truncate">
                {activeRunway.house}
              </span>
              <span className="hidden md:inline text-zinc-500 truncate">
                — {activeRunway.season}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-[10px] tracking-widest bg-black/80 border border-zinc-800 px-3 py-1">
              {[0, 1, 2, 3, 4, 6, 10, 14, 22, 23].map((n) => (
                <span
                  key={n}
                  className={
                    n === 10
                      ? 'px-1 border border-[#FF5500] text-[#FF5500] font-bold'
                      : 'text-zinc-500'
                  }
                >
                  {n}
                </span>
              ))}
            </div>
          </div>

          <div className="relative z-10 max-w-7xl w-full mx-auto px-4 lg:px-8 my-auto py-6 sm:py-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            <div className="lg:col-span-3 flex flex-col items-center lg:items-start">
              <div className="relative p-2.5 sm:p-3 bg-[#0c0c0f] border border-zinc-800 shadow-2xl w-44 sm:w-56">
                <span className="absolute -top-1.5 -left-1.5 w-3 h-0.5 bg-white rotate-45" />
                <span className="absolute -top-1.5 -right-1.5 w-3 h-0.5 bg-white -rotate-45" />
                <span className="absolute -bottom-1.5 -left-1.5 w-3 h-0.5 bg-white -rotate-45" />
                <span className="absolute -bottom-1.5 -right-1.5 w-3 h-0.5 bg-white rotate-45" />

                <div className="relative aspect-square w-full overflow-hidden bg-zinc-950 border border-zinc-800">
                  <img
                    src={profile.avatarUrl}
                    alt={profile.nickname}
                    className="w-full h-full object-cover grayscale contrast-125 hover:grayscale-0 transition duration-500"
                  />
                  <div className="absolute top-1.5 left-1.5 bg-black/85 border border-zinc-700 px-1.5 py-0.5 font-mono text-[9px] text-zinc-200">
                    ID // {profile.nickname.toUpperCase()}
                  </div>
                  <div className="absolute bottom-1.5 right-1.5 bg-[#FF5500] text-black font-mono font-bold text-[9px] px-1.5 py-0.5 lowercase">
                    {profile.role}
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between font-mono text-[11px] text-zinc-400">
                  <span className="lowercase text-zinc-100 font-bold">
                    {profile.nickname}
                  </span>
                  <span className="lowercase text-[#FF5500]">
                    {profile.role}
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900/90 border border-zinc-800 font-mono text-[11px] sm:text-xs text-zinc-300 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#FF5500]" />
                <span className="lowercase">
                  {profile.nickname} — {profile.role}
                </span>
              </div>

              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter lowercase leading-none text-white select-none">
                {profile.nickname}
                <span className="text-[#FF5500]">.</span>
              </h1>

              <div className="mt-4 sm:mt-5 w-full bg-black/80 border-l-2 border-[#FF5500] p-3.5 font-mono text-[11px] sm:text-xs text-zinc-300 text-left">
                <div className="text-[10px] text-[#FF5500] uppercase tracking-widest mb-1 flex items-center justify-between">
                  <span>
                    {activeRunway.mediaType === 'video'
                      ? 'RUNWAY FILM // '
                      : 'RUNWAY PHOTO // '}
                    {activeRunway.house}
                  </span>
                  <span>{activeRunway.code}</span>
                </div>
                <p className="leading-relaxed text-zinc-300">
                  {activeRunway.description}
                </p>
              </div>

              <div className="mt-5 sm:mt-6 w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3">
                <a
                  href="#catalog"
                  className="px-5 py-3.5 bg-[#FF5500] hover:bg-[#ff691f] text-black font-mono font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition shadow-[0_0_25px_rgba(255,85,0,0.35)]"
                >
                  <span>Мастер-каталог ({tracks.length})</span>
                  <ChevronDown className="w-4 h-4" />
                </a>

                <a
                  href={getTelegramLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3.5 bg-zinc-950 hover:bg-zinc-900 text-zinc-100 border border-zinc-700 font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition"
                >
                  <span>Telegram</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#FF5500]" />
                </a>
              </div>
            </div>

            <div className="lg:col-span-4 bg-[#0b0b0f]/95 border border-zinc-800 p-3.5 shadow-2xl">
              <div className="flex items-center justify-between font-mono text-[10px] text-zinc-400 pb-2 mb-2.5 border-b border-zinc-800">
                <span className="flex items-center gap-1.5 text-white font-bold uppercase">
                  <Film className="w-3.5 h-3.5 text-[#FF5500]" />
                  <span>PARIS RUNWAY MONITOR</span>
                </span>
                <button
                  onClick={() => setSelectedRunwayModal(activeRunway)}
                  className="text-[#FF5500] hover:underline flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>РАЗВЕРНУТЬ</span>
                </button>
              </div>

              <div
                onClick={() => setSelectedRunwayModal(activeRunway)}
                className="relative h-52 sm:h-60 w-full border border-zinc-800 cursor-pointer group overflow-hidden"
              >
                <RunwayMediaRenderer
                  item={activeRunway}
                  className="w-full h-full group-hover:scale-105 transition duration-500"
                />
                <div className="absolute top-2 left-2 bg-black/85 border border-zinc-700 px-2 py-0.5 font-mono text-[10px] text-white">
                  {activeRunway.house}
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 max-w-7xl w-full mx-auto px-4 lg:px-8 pb-4 sm:pb-6">
            <div className="flex sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-2 overflow-x-auto pb-1 snap-x snap-mandatory">
              {runwayItems.map((item, idx) => {
                const isSelected = idx === activeRunwayIndex;
                const isVid =
                  item.mediaType === 'video' || Boolean(item.videoUrl);
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveRunwayIndex(idx)}
                    className={`snap-start shrink-0 w-56 sm:w-auto text-left p-2.5 border font-mono transition ${
                      isSelected
                        ? 'bg-black/95 border-[#FF5500] text-white shadow-[0_0_15px_rgba(255,85,0,0.25)]'
                        : 'bg-black/60 border-zinc-800/90 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[9px] mb-1">
                      <span
                        className={
                          isSelected
                            ? 'text-[#FF5500] font-bold truncate'
                            : 'text-zinc-500 truncate'
                        }
                      >
                        {item.code}
                      </span>
                      {isVid && (
                        <span className="px-1 bg-[#FF5500] text-black font-bold text-[8px] shrink-0">
                          VIDEO
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-bold uppercase truncate">
                      {item.house}
                    </div>
                    <div className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                      {item.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {}
        {/* 2. ПАНЕЛЬ ФОТО И ВИДЕО С ПОКАЗОВ В ПАРИЖЕ + ОПИСАНИЯ */}
        <section className="max-w-7xl mx-auto px-4 lg:px-8 py-10 sm:py-12 border-b border-zinc-800/80">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <div className="font-mono text-[10px] text-[#FF5500] uppercase tracking-widest">
                PARIS RUNWAY VISUAL ARCHIVE // VIDEO & PHOTO CONTACT SHEET
              </div>
              <h2 className="text-lg sm:text-2xl font-bold tracking-tight uppercase mt-1">
                Архив показов ({runwayItems.length})
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => {
                    setAdminTab('runway');
                    setShowStudioModal(true);
                  }}
                  className="px-3 py-2 bg-[#FF5500] text-black font-mono font-bold text-xs uppercase hover:bg-[#ff6a1f] transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Добавить фото / видео с показа
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {runwayItems.map((item, idx) => {
              const isVid =
                item.mediaType === 'video' || Boolean(item.videoUrl);
              return (
                <article
                  key={item.id}
                  onClick={() => {
                    setActiveRunwayIndex(idx);
                    setSelectedRunwayModal(item);
                  }}
                  className="group cursor-pointer bg-[#0c0c10] border border-zinc-800 hover:border-[#FF5500] transition flex flex-col justify-between overflow-hidden"
                >
                  <div>
                    <div className="relative h-52 sm:h-56 overflow-hidden bg-black">
                      <RunwayMediaRenderer
                        item={item}
                        className="w-full h-full group-hover:scale-105 transition duration-500"
                      />
                      <div className="absolute top-2 left-2 bg-black/85 border border-zinc-700 px-2 py-0.5 font-mono text-[10px] text-[#FF5500]">
                        {item.code}
                      </div>
                      <div className="absolute top-2 right-2 bg-black/85 border border-zinc-700 px-2 py-0.5 font-mono text-[10px] text-zinc-200 flex items-center gap-1">
                        {isVid ? (
                          <>
                            <Video className="w-3 h-3 text-[#FF5500]" />
                            <span>VIDEO</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3 text-[#FF5500]" />
                            <span>PHOTO</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="font-mono text-[10px] text-zinc-500 uppercase">
                        {item.season}
                      </div>
                      <h3 className="text-sm sm:text-base font-bold uppercase text-zinc-100 mt-0.5">
                        {item.house}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {isAdmin && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="px-4 py-2.5 bg-zinc-950 border-t border-zinc-800/80 flex items-center justify-end gap-2 font-mono text-[11px]"
                    >
                      <button
                        onClick={() => {
                          setEditingRunwayId(item.id);
                          setRunwayForm({
                            code: item.code || '',
                            house: item.house || '',
                            season: item.season || '',
                            mediaType: item.mediaType || 'image',
                            description: item.description || '',
                            imageUrl:
                              item.imageUrl && !item.imageUrl.startsWith('data:')
                                ? item.imageUrl
                                : '',
                            videoUrl: item.videoUrl || '',
                            imageFile: null,
                            videoFile: null
                          });
                          setAdminTab('runway');
                          setShowStudioModal(true);
                        }}
                        className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700"
                      >
                        Изменить
                      </button>
                      <button
                        onClick={() => handleDeleteRunway(item.id)}
                        className="px-2.5 py-1.5 bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/60"
                      >
                        Удалить
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        {/* 3. МАСТЕР-КАТАЛОГ РЕЛИЗОВ */}
        <section
          id="catalog"
          className="max-w-7xl mx-auto px-4 lg:px-8 pt-10 sm:pt-12"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-zinc-800">
            <div>
              <div className="font-mono text-xs text-[#FF5500] lowercase flex items-center gap-2">
                <Disc className="w-3.5 h-3.5 animate-spin" />
                <span>
                  {profile.nickname} — {profile.role} // master catalog
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase mt-1">
                Аудио-Архив ({filteredTracks.length})
              </h2>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по названию, жанру..."
                  className="w-full bg-[#0d0d11] border border-zinc-800 focus:border-[#FF5500] pl-9 pr-3 py-2.5 text-base sm:text-xs font-mono text-zinc-100 outline-none rounded-none"
                />
              </div>
            </div>
          </div>

          <div className="py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-zinc-900">
            <div className="flex items-center gap-1.5 font-mono text-xs overflow-x-auto pb-1">
              {[
                { id: 'ALL', label: 'ВСЕ' },
                { id: 'BEAT', label: 'БИТЫ' },
                { id: 'LOOP', label: 'ЛУПЫ' },
                { id: 'SONG', label: 'ПЕСНИ' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`shrink-0 px-3.5 py-2 sm:py-1.5 border uppercase transition ${
                    activeCategory === tab.id
                      ? 'bg-[#FF5500] border-[#FF5500] text-black font-bold'
                      : 'bg-[#0d0d11] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[11px] overflow-x-auto pb-1">
              <span className="text-zinc-500 mr-1 shrink-0">GENRE:</span>
              {availableGenres.map((genre) => (
                <button
                  key={genre}
                  onClick={() => setActiveGenre(genre)}
                  className={`shrink-0 px-3 py-1.5 sm:py-1 rounded-full border transition ${
                    activeGenre === genre
                      ? 'border-[#FF5500] bg-[#FF5500]/15 text-[#FF5500] font-bold'
                      : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-3.5 sm:space-y-4">
            {isLoadingArchive ? (
              <div className="py-16 text-center font-mono text-xs text-zinc-500">
                СИНХРОНИЗАЦИЯ ОБЛАЧНОГО МАСТЕР-АРХИВА...
              </div>
            ) : filteredTracks.length === 0 ? (
              <div className="py-14 px-4 bg-[#0b0b0e] border border-dashed border-zinc-800 text-center">
                <Radio className="w-8 h-8 text-[#FF5500] mx-auto mb-3 opacity-80" />
                <div className="font-mono text-sm text-zinc-200 uppercase font-bold">
                  В архиве пока нет загруженных записей
                </div>
                <p className="font-mono text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                  Здесь отображаются только собственные треки, биты и лупы,
                  загруженные{' '}
                  <span className="text-zinc-300 lowercase">
                    {profile.nickname}
                  </span>
                  . Все загруженные релизы сразу видны всем посетителям сайта.
                </p>
                <button
                  onClick={() => {
                    if (isAdmin) {
                      setAdminTab('tracks');
                      setShowStudioModal(true);
                    } else {
                      setShowAuthModal(true);
                    }
                  }}
                  className="mt-5 px-5 py-3 bg-[#FF5500] text-black font-mono font-bold text-xs uppercase tracking-wider hover:bg-[#ff6a1f] transition inline-flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {isAdmin
                    ? 'Загрузить первый MP3 в каталог'
                    : 'Вход для создателя (Загрузить MP3)'}
                </button>
              </div>
            ) : (
              filteredTracks.map((track) => {
                const isThisTrack = currentTrackId === track.id;
                const isThisPlaying = isThisTrack && isPlaying;
                const trackProgress =
                  isThisTrack && duration > 0
                    ? Math.min(1, currentTime / duration)
                    : 0;

                return (
                  <div
                    key={track.id}
                    className={`bg-[#0c0c10] border transition p-3.5 sm:p-5 flex flex-col sm:flex-row gap-3.5 sm:gap-5 items-start sm:items-center ${
                      isThisTrack
                        ? 'border-[#FF5500] shadow-[0_0_30px_rgba(255,85,0,0.12)]'
                        : 'border-zinc-800/90 hover:border-zinc-700'
                    }`}
                  >
                    <div
                      onClick={() => playTrack(track)}
                      className="hidden sm:block relative w-32 h-32 lg:w-36 lg:h-36 shrink-0 bg-black border border-zinc-800 overflow-hidden cursor-pointer group"
                    >
                      <img
                        src={track.coverUrl || DEFAULT_RUNWAY_ITEMS[0].imageUrl}
                        alt={track.title}
                        loading="lazy"
                        className="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <div className="w-11 h-11 rounded-full bg-[#FF5500] text-black flex items-center justify-center shadow-lg">
                          {isThisPlaying ? (
                            <Pause className="w-5 h-5 fill-current" />
                          ) : (
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          )}
                        </div>
                      </div>
                      <span className="absolute top-1.5 left-1.5 bg-black/85 border border-zinc-700 px-1.5 py-0.5 font-mono text-[9px] text-zinc-300">
                        {track.serial}
                      </span>
                      <span className="absolute bottom-1.5 right-1.5 bg-[#FF5500] text-black font-mono font-bold text-[9px] px-1.5 py-0.5 uppercase">
                        {track.category || 'BEAT'}
                      </span>
                    </div>

                    <div className="flex-1 w-full min-w-0">
                      <div className="flex items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            onClick={() => playTrack(track)}
                            className="sm:hidden relative w-16 h-16 shrink-0 bg-black border border-zinc-800 overflow-hidden"
                          >
                            <img
                              src={
                                track.coverUrl ||
                                DEFAULT_RUNWAY_ITEMS[0].imageUrl
                              }
                              alt={track.title}
                              className="w-full h-full object-cover grayscale contrast-125"
                            />
                            <span className="absolute bottom-0 right-0 bg-[#FF5500] text-black font-mono font-bold text-[8px] px-1">
                              {track.category || 'BEAT'}
                            </span>
                          </div>

                          <button
                            onClick={() => playTrack(track)}
                            className="w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-[#FF5500] hover:bg-[#ff6a1f] active:scale-95 text-black flex items-center justify-center shrink-0 transition shadow-md"
                            aria-label={isThisPlaying ? 'Pause' : 'Play'}
                          >
                            {isThisPlaying ? (
                              <Pause className="w-4 h-4 fill-current" />
                            ) : (
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            )}
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] sm:text-[11px] text-zinc-400">
                              <span className="lowercase text-zinc-200 font-bold">
                                {profile.nickname}
                              </span>
                              <span>—</span>
                              <span className="lowercase text-[#FF5500]">
                                {profile.role}
                              </span>
                              <span className="hidden xs:inline text-zinc-600">
                                •
                              </span>
                              <span className="hidden xs:inline">
                                {track.dateAdded}
                              </span>
                            </div>
                            <h3 className="text-sm sm:text-lg font-bold text-white truncate mt-0.5">
                              {track.title}
                            </h3>
                          </div>
                        </div>

                        <div className="hidden md:flex flex-wrap items-center gap-1.5 font-mono text-[11px] shrink-0">
                          {track.genre && (
                            <span className="px-2 py-0.5 bg-zinc-900 border border-[#FF5500]/50 text-[#FF5500]">
                              #{track.genre}
                            </span>
                          )}
                          {track.bpm && (
                            <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-300">
                              {track.bpm} BPM
                            </span>
                          )}
                          {track.musicalKey && (
                            <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-300">
                              KEY: {track.musicalKey}
                            </span>
                          )}
                        </div>
                      </div>

                      {track.description && (
                        <p className="mt-2 text-xs text-zinc-400 font-mono leading-relaxed line-clamp-2">
                          {track.description}
                        </p>
                      )}

                      <div className="mt-2 sm:mt-3">
                        <SoundCloudWaveform
                          peaks={track.peaks}
                          isActive={isThisTrack}
                          isPlaying={isThisPlaying}
                          progress={trackProgress}
                          duration={
                            isThisTrack ? duration : track.duration || 0
                          }
                          onSeek={(ratio) => handleSeek(track, ratio)}
                        />
                      </div>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-900 font-mono text-xs">
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                          <span className="text-[#FF5500] font-bold">
                            {isThisTrack ? formatTime(currentTime) : '00:00'}
                          </span>
                          <span>/</span>
                          <span>
                            {formatTime(
                              isThisTrack && duration > 0
                                ? duration
                                : track.duration || 0
                            )}
                          </span>
                          <span className="hidden sm:inline text-zinc-700 ml-2">
                            [STREAM PROTECTED]
                          </span>
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            onClick={() => {
                              navigator.clipboard
                                ?.writeText(`${track.title} (${track.serial})`)
                                .catch(() => {});
                              setCopiedTrackId(track.id);
                              setTimeout(() => setCopiedTrackId(null), 1800);
                            }}
                            className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-[11px] flex items-center gap-1"
                          >
                            {copiedTrackId === track.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>ID</span>
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleStartEditTrack(track)}
                                className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-[11px] flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span className="hidden xs:inline">Изм.</span>
                              </button>
                              <button
                                onClick={() => handleDeleteTrack(track.id)}
                                className="px-2.5 py-1.5 bg-red-950/60 hover:bg-red-900/70 text-red-300 border border-red-800/60 text-[11px] flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}

                          <a
                            href={getTelegramLink(track.title)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 sm:px-4 py-1.5 bg-[#FF5500] hover:bg-[#ff6a1f] text-black font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition"
                          >
                            <Send className="w-3 h-3" />
                            <span>Обсудить в TG</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* 4. ПОДВАЛ */}
        <footer className="max-w-7xl mx-auto px-4 lg:px-8 mt-16 sm:mt-20 pt-8 sm:pt-10 border-t border-zinc-800/80 font-mono text-xs text-zinc-500">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 pb-8">
            <div>
              <div className="text-base font-bold text-white lowercase">
                {profile.nickname}{' '}
                <span className="text-[#FF5500] font-normal">
                  — {profile.role}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                {profile.nickname} audio archive — all rights reserved.
                unauthorized distribution is prohibited.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <a
                href={getTelegramLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 uppercase text-[11px] flex items-center gap-2 transition"
              >
                <span>Telegram: @{profile.telegramUsername}</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#FF5500]" />
              </a>

              <button
                onClick={() =>
                  isAdmin ? setShowStudioModal(true) : setShowAuthModal(true)
                }
                className="w-9 h-9 flex items-center justify-center text-zinc-600 hover:text-[#FF5500] transition"
                title="Creator Access (Shift + A)"
              >
                •
              </button>
            </div>
          </div>
        </footer>
      </main>

      {}
      {/* МОДАЛЬНОЕ ОКНО ПРОСМОТРА ВИДЕО / ФОТО ПОКАЗА МОД */}
      {selectedRunwayModal && (
        <div
          onClick={() => setSelectedRunwayModal(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0b0f] border border-[#FF5500] max-w-3xl w-full p-4 sm:p-6 font-mono space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 text-xs">
              <div className="flex items-center gap-2 text-[#FF5500] font-bold">
                <Film className="w-4 h-4" />
                <span>
                  {selectedRunwayModal.code} // {selectedRunwayModal.house}
                </span>
              </div>
              <button
                onClick={() => setSelectedRunwayModal(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="h-72 sm:h-[420px] w-full border border-zinc-800 overflow-hidden">
              <RunwayMediaRenderer
                item={selectedRunwayModal}
                className="w-full h-full"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1 text-xs">
              <div>
                <div className="text-[10px] text-zinc-500 uppercase">
                  {selectedRunwayModal.season}
                </div>
                <p className="text-zinc-200 mt-1 leading-relaxed">
                  {selectedRunwayModal.description}
                </p>
              </div>
              <button
                onClick={() => setSelectedRunwayModal(null)}
                className="px-5 py-2.5 bg-[#FF5500] text-black font-bold uppercase shrink-0"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* НИЖНИЙ ПЛЕЕР (STICKY SOUNDCLOUD PLAYER) */}
      {currentTrack && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-[#0b0b0f]/95 backdrop-blur-md border-t border-zinc-800 shadow-[0_-10px_30px_rgba(0,0,0,0.9)] pb-[max(0.6rem,env(safe-area-inset-bottom))]">
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              if (rect.width <= 0) return;
              const ratio = Math.max(
                0,
                Math.min(1, (e.clientX - rect.left) / rect.width)
              );
              handleSeek(currentTrack, ratio);
            }}
            className="w-full h-2 bg-zinc-900 cursor-pointer relative overflow-hidden"
          >
            <div
              className="h-full bg-[#FF5500] transition-all duration-75"
              style={{
                width: `${
                  duration > 0
                    ? Math.min(100, (currentTime / duration) * 100)
                    : 0
                }%`
              }}
            />
          </div>

          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-2 flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <button
                onClick={() => handleSkip(-1)}
                className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white transition"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={() => playTrack(currentTrack)}
                className="w-10 h-10 rounded-full bg-[#FF5500] text-black flex items-center justify-center hover:bg-[#ff6a1f] transition shrink-0"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={() => handleSkip(1)}
                className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white transition"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsLooping((prev) => !prev)}
                className={`hidden xs:flex w-8 h-8 items-center justify-center transition ${
                  isLooping
                    ? 'text-[#FF5500]'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-w-0 flex items-center gap-2.5">
              <img
                src={currentTrack.coverUrl || DEFAULT_RUNWAY_ITEMS[0].imageUrl}
                alt={currentTrack.title}
                className="w-9 h-9 object-cover border border-zinc-700 grayscale hidden sm:block shrink-0"
              />
              <div className="min-w-0 flex-1 font-mono">
                <div className="text-xs font-bold text-white truncate">
                  {currentTrack.title}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 truncate">
                  <span className="lowercase text-[#FF5500]">
                    {profile.nickname} — {profile.role}
                  </span>
                  <span>•</span>
                  <span>
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden md:flex items-center gap-1.5">
                <button
                  onClick={() => setIsMuted((prev) => !prev)}
                  className="text-zinc-400 hover:text-white"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-[#FF5500]" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setIsMuted(false);
                    setVolume(parseFloat(e.target.value));
                  }}
                  className="w-20 accent-[#FF5500] cursor-pointer"
                />
              </div>

              <a
                href={getTelegramLink(currentTrack.title)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-[#FF5500] text-black font-mono font-bold text-[10px] sm:text-[11px] uppercase tracking-wider hover:bg-[#ff6a1f] transition shrink-0"
              >
                В TG
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ОКНО ВВОДА МАСТЕР-ПАРОЛЯ (CREATOR ACCESS) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c0c10] border border-zinc-700 max-w-md w-full p-5 sm:p-6 font-mono relative">
            <button
              onClick={() => {
                setShowAuthModal(false);
                setAuthError('');
              }}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-[10px] text-[#FF5500] uppercase tracking-widest mb-1">
              RESTRICTED ACCESS // CREATOR TERMINAL
            </div>
            <h3 className="text-base sm:text-lg font-bold uppercase text-white mb-4">
              Вход для создателя ({profile.nickname})
            </h3>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  МАСТЕР-ПАРОЛЬ:
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Введите мастер-ключ..."
                  autoFocus
                  className="w-full bg-black border border-zinc-700 focus:border-[#FF5500] px-3 py-2.5 text-base sm:text-xs text-white outline-none rounded-none"
                />
                {authError && (
                  <p className="text-[11px] text-red-400 mt-1.5">{authError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#FF5500] hover:bg-[#ff6a1f] text-black font-bold text-xs uppercase tracking-widest transition"
              >
                Разблокировать Creator Studio
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CREATOR STUDIO (СИНХРОНИЗАЦИЯ ИЗМЕНЕНИЙ ДЛЯ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ) */}
      {isAdmin && showStudioModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-6 overflow-y-auto">
          <div className="bg-[#0b0b0f] border border-[#FF5500]/60 max-w-3xl w-full my-auto max-h-[94dvh] overflow-y-auto p-4 sm:p-6 font-mono relative shadow-2xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800">
              <div className="flex flex-wrap items-center gap-2">
                <Unlock className="w-4 h-4 text-[#FF5500] shrink-0" />
                <span className="text-xs sm:text-sm font-bold uppercase text-white">
                  CREATOR STUDIO // {profile.nickname} — {profile.role}
                </span>
                <span className="px-2 py-0.5 text-[10px] border border-lime-500/40 bg-lime-950/30 text-lime-300 flex items-center gap-1">
                  <Cloud className="w-3 h-3" />
                  GLOBAL CLOUD SYNC (ВИДНО ВСЕМ)
                </span>
              </div>
              <button
                onClick={() => setShowStudioModal(false)}
                className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 my-4 text-xs">
              <button
                onClick={() => setAdminTab('tracks')}
                className={`py-2.5 px-3 border text-left uppercase transition ${
                  adminTab === 'tracks'
                    ? 'bg-[#FF5500] text-black border-[#FF5500] font-bold'
                    : 'bg-zinc-900/70 text-zinc-300 border-zinc-800'
                }`}
              >
                1. Загрузить MP3 / Каталог
              </button>
              <button
                onClick={() => setAdminTab('profile')}
                className={`py-2.5 px-3 border text-left uppercase transition ${
                  adminTab === 'profile'
                    ? 'bg-[#FF5500] text-black border-[#FF5500] font-bold'
                    : 'bg-zinc-900/70 text-zinc-300 border-zinc-800'
                }`}
              >
                2. Профиль (Ник / Аватар)
              </button>
              <button
                onClick={() => setAdminTab('runway')}
                className={`py-2.5 px-3 border text-left uppercase transition ${
                  adminTab === 'runway'
                    ? 'bg-[#FF5500] text-black border-[#FF5500] font-bold'
                    : 'bg-zinc-900/70 text-zinc-300 border-zinc-800'
                }`}
              >
                3. Фото / Видео с показов
              </button>
            </div>

            {/* ВКЛАДКА 1: ТРЕКИ */}
            {adminTab === 'tracks' && (
              <form onSubmit={handleSaveTrack} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 mb-1">
                      НАЗВАНИЕ ТРЕКА / БИТА *
                    </label>
                    <input
                      type="text"
                      required
                      value={trackForm.title}
                      onChange={(e) =>
                        setTrackForm({ ...trackForm, title: e.target.value })
                      }
                      placeholder="Например: risen — night archive"
                      className="w-full bg-black border border-zinc-700 focus:border-[#FF5500] px-3 py-2 text-base sm:text-xs text-white outline-none rounded-none"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">
                      КАТЕГОРИЯ РЕЛИЗА
                    </label>
                    <select
                      value={trackForm.category}
                      onChange={(e) =>
                        setTrackForm({ ...trackForm, category: e.target.value })
                      }
                      className="w-full bg-black border border-zinc-700 focus:border-[#FF5500] px-3 py-2 text-base sm:text-xs text-white outline-none rounded-none"
                    >
                      <option value="BEAT">БИТ (BEAT)</option>
                      <option value="LOOP">ЛУП / СЭМПЛ (LOOP)</option>
                      <option value="SONG">ПЕСНЯ (SONG)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-zinc-400 mb-1">
                      ЖАНР (ВПИШИТЕ ЛЮБОЙ СВОЙ)
                    </label>
                    <input
                      type="text"
                      value={trackForm.genre}
                      onChange={(e) =>
                        setTrackForm({ ...trackForm, genre: e.target.value })
                      }
                      placeholder="Opium / Dark / Rage..."
                      className="w-full bg-black border border-zinc-700 focus:border-[#FF5500] px-3 py-2 text-base sm:text-xs text-white outline-none rounded-none"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[
                        'Opium / Dark',
                        'Rage',
                        'Archive',
                        'Ambient',
                        'Trap'
                      ].map((g) => (
                        <button
                          type="button"
                          key={g}
                          onClick={() =>
                            setTrackForm({ ...trackForm, genre: g })
                          }
                          className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 hover:text-[#FF5500]"
                        >
                          +{g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">BPM</label>
                    <input
                      type="text"
                      value={trackForm.bpm}
                      onChange={(e) =>
                        setTrackForm({ ...trackForm, bpm: e.target.value })
                      }
                      placeholder="144"
                      className="w-full bg-black border border-zinc-700 focus:border-[#FF5500] px-3 py-2 text-base sm:text-xs text-white outline-none rounded-none"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">
                      ТОНАЛЬНОСТЬ (KEY)
                    </label>
                    <input
                      type="text"
                      value={trackForm.musicalKey}
                      onChange={(e) =>
                        setTrackForm({
                          ...trackForm,
                          musicalKey: e.target.value
                        })
                      }
                      placeholder="F#m"
                      className="w-full bg-black border border-zinc-700 focus:border-[#FF5500] px-3 py-2 text-base sm:text-xs text-white outline-none rounded-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">
                    ОПИСАНИЕ РЕЛИЗА
                  </label>
                  <textarea
                    rows={2}
                    value={trackForm.description}
                    onChange={(e) =>
                      setTrackForm({
                        ...trackForm,
                        description: e.target.value
                      })
                    }
                    placeholder="Добавьте описание бита, настроение или условия для артистов..."
                    className="w-full bg-black border border-zinc-700 focus:border-[#FF5500] p-3 text-base sm:text-xs text-white outline-none rounded-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-black border border-zinc-800 space-y-2">
                    <label className="block text-zinc-300 font-bold">
                      АУДИОФАЙЛ (MP3 / WAV) {editingTrackId ? '' : '*'}
                    </label>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) =>
                        setTrackForm({
                          ...trackForm,
                          audioFile: e.target.files?.[0] || null
                        })
                      }
                      className="w-full text-[11px] text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:border-0 file:bg-[#FF5500] file:text-black file:font-bold"
                    />
                    <input
                      type="url"
                      value={trackForm.audioDirectUrl}
                      onChange={(e) =>
                        setTrackForm({
                          ...trackForm,
                          audioDirectUrl: e.target.value
                        })
                      }
                      placeholder="Или прямая ссылка на аудио (https://...)"
                      className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-2 text-base sm:text-[11px] text-white outline-none rounded-none"
                    />
                  </div>

                  <div className="p-3 bg-black border border-zinc-800 space-y-2">
                    <label className="block text-zinc-300 font-bold">
                      ОБЛОЖКА ТРЕКА (ФАЙЛ ИЛИ URL)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setTrackForm({
                          ...trackForm,
                          coverFile: e.target.files?.[0] || null
                        })
                      }
                      className="w-full text-[11px] text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:border-0 file:bg-zinc-800 file:text-white"
                    />
                    <input
                      type="url"
                      value={trackForm.coverPreviewUrl}
                      onChange={(e) =>
                        setTrackForm({
                          ...trackForm,
                          coverPreviewUrl: e.target.value
                        })
                      }
                      placeholder="Или вставьте прямую ссылку на фото..."
                      className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-2 text-base sm:text-[11px] text-white outline-none rounded-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingData}
                  className="w-full py-3.5 bg-[#FF5500] hover:bg-[#ff6a1f] disabled:opacity-50 text-black font-bold uppercase tracking-widest transition"
                >
                  {isSavingData
                    ? uploadProgressText || 'СИНХРОНИЗАЦИЯ С ОБЛАКОМ...'
                    : editingTrackId
                    ? 'Сохранить изменения (Для всех пользователей)'
                    : 'Опубликовать в мастер-каталог (Видно всем)'}
                </button>
              </form>
            )}

            {/* ВКЛАДКА 2: ПРОФИЛЬ */}
            {adminTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 mb-1">
                      НИКНЕЙМ (ПО УМОЛЧАНИЮ: risen)
                    </label>
                    <input
                      type="text"
                      value={profileForm.nickname}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          nickname: e.target.value
                        })
                      }
                      className="w-full bg-black border border-zinc-700 focus:border-[#FF5500] px-3 py-2 text-base sm:text-xs text-white outline-none rounded-none"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">
                      СТАТУС / РОЛЬ (ПО УМОЛЧАНИЮ: artist)
                    </label>
                    <input
                      type="text"
                      value={profileForm.role}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, role: e.target.value })
                      }
                      className="w-full bg-black border border-zinc-700 focus:border-[#FF5500] px-3 py-2 text-base sm:text-xs text-white outline-none rounded-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">
                    TELEGRAM USERNAME (БЕЗ @)
                  </label>
                  <input
                    type="text"
                    value={profileForm.telegramUsername}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        telegramUsername: e.target.value
                      })
                    }
                    placeholder="risen"
                    className="w-full bg-black border border-zinc-700 focus:border-[#FF5500] px-3 py-2 text-base sm:text-xs text-white outline-none rounded-none"
                  />
                </div>

                <div className="p-3 bg-black border border-zinc-800 space-y-2">
                  <label className="block text-zinc-300 font-bold">
                    АВАТАРКА ПРОФИЛЯ
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setAvatarFile(e.target.files?.[0] || null)
                    }
                    className="w-full text-[11px] text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:border-0 file:bg-[#FF5500] file:text-black file:font-bold"
                  />
                  <input
                    type="url"
                    value={
                      profileForm.avatarUrl?.startsWith('data:')
                        ? ''
                        : profileForm.avatarUrl
                    }
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        avatarUrl: e.target.value
                      })
                    }
                    placeholder="Или вставьте URL вашей аватарки..."
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-base sm:text-xs text-white outline-none rounded-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingData}
                  className="w-full py-3.5 bg-[#FF5500] hover:bg-[#ff6a1f] disabled:opacity-50 text-black font-bold uppercase tracking-widest transition"
                >
                  Сохранить настройки профиля (Для всех пользователей)
                </button>
              </form>
            )}

            {/* ВКЛАДКА 3: ЗАГРУЗКА ФОТО И ВИДЕО С ПОКАЗОВ + ОПИСАНИЯ */}
            {adminTab === 'runway' && (
              <div className="space-y-5 text-xs">
                <form onSubmit={handleSaveRunway} className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setRunwayForm({ ...runwayForm, mediaType: 'image' })
                      }
                      className={`py-2.5 px-3 border font-bold uppercase flex items-center justify-center gap-2 transition ${
                        runwayForm.mediaType === 'image'
                          ? 'bg-[#FF5500] text-black border-[#FF5500]'
                          : 'bg-black text-zinc-400 border-zinc-800'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>ФОТО С ПОКАЗА (IMAGE)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setRunwayForm({ ...runwayForm, mediaType: 'video' })
                      }
                      className={`py-2.5 px-3 border font-bold uppercase flex items-center justify-center gap-2 transition ${
                        runwayForm.mediaType === 'video'
                          ? 'bg-[#FF5500] text-black border-[#FF5500]'
                          : 'bg-black text-zinc-400 border-zinc-800'
                      }`}
                    >
                      <Video className="w-4 h-4" />
                      <span>ВИДЕО С ПОКАЗА (MP4 / WEBM)</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-zinc-400 mb-1">
                        КОД ПЛЕНКИ
                      </label>
                      <input
                        type="text"
                        value={runwayForm.code}
                        onChange={(e) =>
                          setRunwayForm({ ...runwayForm, code: e.target.value })
                        }
                        placeholder="TAPE-07 // PARIS"
                        className="w-full bg-black border border-zinc-700 px-3 py-2 text-base sm:text-xs text-white outline-none rounded-none"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 mb-1">
                        ДОМ МОДЫ / ПОКАЗ *
                      </label>
                      <input
                        type="text"
                        required
                        value={runwayForm.house}
                        onChange={(e) =>
                          setRunwayForm({
                            ...runwayForm,
                            house: e.target.value
                          })
                        }
                        placeholder="MAISON MARGIELA / RICK OWENS"
                        className="w-full bg-black border border-zinc-700 px-3 py-2 text-base sm:text-xs text-white outline-none rounded-none"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 mb-1">
                        СЕЗОН / ЛОКАЦИЯ
                      </label>
                      <input
                        type="text"
                        value={runwayForm.season}
                        onChange={(e) =>
                          setRunwayForm({
                            ...runwayForm,
                            season: e.target.value
                          })
                        }
                        placeholder="ARTISANAL PARIS ARCHIVE"
                        className="w-full bg-black border border-zinc-700 px-3 py-2 text-base sm:text-xs text-white outline-none rounded-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">
                      ОПИСАНИЕ КАДРА ИЛИ ВИДЕО С ПОКАЗА *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={runwayForm.description}
                      onChange={(e) =>
                        setRunwayForm({
                          ...runwayForm,
                          description: e.target.value
                        })
                      }
                      placeholder="Опишите атмосферу показа, коллекцию или детали кадра..."
                      className="w-full bg-black border border-zinc-700 p-3 text-base sm:text-xs text-white outline-none rounded-none"
                    />
                  </div>

                  {runwayForm.mediaType === 'video' ? (
                    <div className="p-3 bg-black border border-[#FF5500]/60 space-y-2">
                      <label className="block text-[#FF5500] font-bold">
                        ВИДЕО С ПОКАЗА (ПРЯМАЯ ССЫЛКА .MP4 / .WEBM ИЛИ ФАЙЛ)
                      </label>
                      <input
                        type="url"
                        value={runwayForm.videoUrl}
                        onChange={(e) =>
                          setRunwayForm({
                            ...runwayForm,
                            videoUrl: e.target.value
                          })
                        }
                        placeholder="Вставьте прямую ссылку на .mp4 / .webm видео..."
                        className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-base sm:text-xs text-white outline-none rounded-none"
                      />
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) =>
                          setRunwayForm({
                            ...runwayForm,
                            videoFile: e.target.files?.[0] || null
                          })
                        }
                        className="w-full text-[11px] text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:border-0 file:bg-[#FF5500] file:text-black file:font-bold"
                      />
                      <input
                        type="url"
                        value={runwayForm.imageUrl}
                        onChange={(e) =>
                          setRunwayForm({
                            ...runwayForm,
                            imageUrl: e.target.value
                          })
                        }
                        placeholder="Необязательно: ссылка на постер/обложку видео..."
                        className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-base sm:text-xs text-white outline-none rounded-none"
                      />
                    </div>
                  ) : (
                    <div className="p-3 bg-black border border-zinc-800 space-y-2">
                      <label className="block text-zinc-300 font-bold">
                        ФОТО С ПОКАЗА (С УСТРОЙСТВА ИЛИ URL)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setRunwayForm({
                            ...runwayForm,
                            imageFile: e.target.files?.[0] || null
                          })
                        }
                        className="w-full text-[11px] text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:border-0 file:bg-[#FF5500] file:text-black file:font-bold"
                      />
                      <input
                        type="url"
                        value={runwayForm.imageUrl}
                        onChange={(e) =>
                          setRunwayForm({
                            ...runwayForm,
                            imageUrl: e.target.value
                          })
                        }
                        placeholder="Или вставьте прямую ссылку на архивное фото..."
                        className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-base sm:text-xs text-white outline-none rounded-none"
                      />
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleRestoreAllDefaultRunway}
                      className="w-full sm:w-auto px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#FF5500]" />
                      <span>Восстановить все исходные пленки (6 шт.)</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isSavingData}
                      className="w-full sm:w-auto flex-1 py-3 bg-[#FF5500] hover:bg-[#ff6a1f] disabled:opacity-50 text-black font-bold uppercase tracking-widest transition"
                    >
                      {editingRunwayId
                        ? 'Обновить карточку (Видно всем)'
                        : 'Добавить в архив показов (Видно всем)'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}