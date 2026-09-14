import React from 'react';

export function Brand() {
  return <span className="flex items-center gap-2.5 sm:gap-3 whitespace-nowrap">
    <span className="relative flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center text-indigo-600 dark:text-indigo-300">
      <svg viewBox="0 0 40 40" className="h-9 w-9" fill="none" aria-hidden="true">
        <circle cx="20" cy="20" r="13" stroke="currentColor" strokeWidth="1.2" opacity=".55" />
        <path d="M10 28 20 9 30 28Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M10 28 25 19M20 9v19" stroke="#0891b2" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="20" cy="9" r="2.3" fill="#0891b2" />
        <circle cx="10" cy="28" r="2.1" fill="currentColor" />
        <circle cx="30" cy="28" r="2.1" fill="currentColor" />
        <circle cx="20" cy="22" r="2" fill="currentColor" />
      </svg>
    </span>
    <span className="flex flex-col items-start gap-1">
      <span className="inline-flex items-baseline gap-2 text-[22px] sm:text-[25px] font-extrabold leading-none tracking-[-0.055em] text-slate-900 dark:text-slate-50">
        <span>Geo</span><span className="text-[#d50032] tracking-[-0.035em]">EBA</span>
      </span>
      <span className="hidden sm:block text-[8px] font-semibold leading-none tracking-[0.16em] text-slate-500 dark:text-slate-400">
        GEOMETRİ &amp; MATEMATİK
      </span>
    </span>
  </span>;
}
