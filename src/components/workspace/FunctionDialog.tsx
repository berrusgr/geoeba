'use client';

import React, { useState } from 'react';
import { useWorkspace } from '@/state/WorkspaceContext';
import { compileMathExpression } from '@/math/parser';
import { TrendingUp, X, Check, AlertCircle, HelpCircle } from 'lucide-react';

interface FunctionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const TEMPLATES = [
  { label: 'Doğrusal: 2x + 1', expr: '2*x + 1' },
  { label: 'Parabol: x² - 4', expr: 'x^2 - 4' },
  { label: 'Sinüs: sin(x)', expr: 'sin(x)' },
  { label: 'Kosinüs: cos(x)', expr: 'cos(x)' },
  { label: 'Mutlak Değer: abs(x)', expr: 'abs(x)' },
  { label: 'Parametreli: a*x^2 + b', expr: 'a*x^2 + b' },
];

export function FunctionDialog({ isOpen, onClose }: FunctionDialogProps) {
  const { addFunction } = useWorkspace();
  const [expression, setExpression] = useState('2*x + 1');
  const [label, setLabel] = useState('f(x)');

  if (!isOpen) return null;

  const isValid = compileMathExpression(expression) !== null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !expression.trim()) return;

    addFunction(expression.trim(), `${label} = ${expression}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Fonksiyon Grafiği Ekle</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Fonksiyon İfadesi (x değişkenine bağlı)
            </label>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-muted-foreground">{label} =</span>
              <input
                type="text"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="Örn: 2*x + 1 veya x^2 - 4"
                className="w-full px-3 py-2 rounded-xl bg-input border border-border text-foreground font-mono text-sm focus:ring-2 focus:ring-primary outline-none"
                autoFocus
              />
            </div>
            {!isValid && expression.trim() !== '' && (
              <div className="flex items-center gap-1 text-[11px] text-destructive pt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Geçersiz matematiksel ifade. Lütfen parantez ve operatörleri kontrol edin.</span>
              </div>
            )}
          </div>

          {/* Hızlı Şablonlar */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Hızlı Şablonlar
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setExpression(t.expr)}
                  className="px-2.5 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-xs font-medium text-foreground text-left truncate transition-colors"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={!isValid || !expression.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Grafiği Çiz</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
