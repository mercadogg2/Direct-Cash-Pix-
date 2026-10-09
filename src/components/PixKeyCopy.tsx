import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Copy, 
  Check, 
  Sparkles, 
  QrCode, 
  User as UserIcon, 
  Mail, 
  Smartphone, 
  Hash, 
  CheckCircle2 
} from 'lucide-react';
import { PixType } from '../types';

export interface PixKeyCopyProps {
  pixKey: string;
  pixType?: PixType | string;
  label?: string;
  variant?: 'card' | 'input' | 'compact' | 'badge';
  showQrButton?: boolean;
  onQrClick?: () => void;
  className?: string;
  masked?: boolean;
  onCopySuccess?: () => void;
}

export default function PixKeyCopy({
  pixKey,
  pixType,
  label = 'Chave PIX',
  variant = 'input',
  showQrButton = false,
  onQrClick,
  className = '',
  masked = false,
  onCopySuccess
}: PixKeyCopyProps) {
  const [copied, setCopied] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const getPixTypeLabel = (type?: string) => {
    switch (type) {
      case 'cpf': return 'CPF';
      case 'email': return 'E-mail';
      case 'telefone': return 'Telefone';
      case 'aleatoria': return 'Chave Aleatória';
      default: return type ? type.toUpperCase() : 'PIX';
    }
  };

  const getPixTypeIcon = (type?: string) => {
    switch (type) {
      case 'cpf': return <UserIcon size={14} className="text-[#00FF85]" />;
      case 'email': return <Mail size={14} className="text-[#00FF85]" />;
      case 'telefone': return <Smartphone size={14} className="text-[#00FF85]" />;
      case 'aleatoria': return <Hash size={14} className="text-[#00FF85]" />;
      default: return <Sparkles size={14} className="text-[#00FF85]" />;
    }
  };

  const formatDisplayKey = (key: string, isMasked: boolean) => {
    if (!key) return '';
    if (!isMasked) return key;
    if (key.length <= 8) return key;
    return `${key.slice(0, 4)}••••${key.slice(-4)}`;
  };

  const handleCopy = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!pixKey) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(pixKey);
      } else {
        // Fallback for strict iframe permissions
        const textArea = document.createElement('textarea');
        textArea.value = pixKey;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setCopied(true);
      setShowFeedback(true);
      if (onCopySuccess) onCopySuccess();

      setTimeout(() => {
        setCopied(false);
        setShowFeedback(false);
      }, 2500);
    } catch (err) {
      console.warn('Erro ao copiar chave para a área de transferência:', err);
    }
  };

  const displayKey = formatDisplayKey(pixKey, masked);

  // Variant: COMPACT (Small pill/row for lists & tables)
  if (variant === 'compact') {
    return (
      <div className={`relative inline-flex items-center gap-2 ${className}`}>
        <button
          type="button"
          onClick={handleCopy}
          title="Clique para copiar a chave PIX"
          className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all duration-200 cursor-pointer ${
            copied
              ? 'bg-emerald-500/15 border-[#00FF85] text-[#00FF85] shadow-[0_0_15px_rgba(0,255,133,0.25)]'
              : 'bg-slate-900/80 hover:bg-slate-800 border-slate-700/80 hover:border-slate-600 text-slate-200'
          }`}
        >
          {pixType && getPixTypeIcon(pixType)}
          <span className="truncate max-w-[140px] sm:max-w-[200px]">{displayKey}</span>

          <AnimatePresence mode="wait">
            {copied ? (
              <motion.span
                key="checked"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="flex items-center gap-1 text-[11px] font-sans font-bold text-[#00FF85]"
              >
                <Check size={13} className="stroke-[3]" />
                <span className="hidden sm:inline">Copiado</span>
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="text-slate-400 group-hover:text-white transition-colors"
              >
                <Copy size={13} />
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Floating feedback bubble */}
        <AnimatePresence>
          {showFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.9 }}
              className="absolute -top-8 left-1/2 -translate-x-1/2 z-30 px-2.5 py-1 bg-[#00FF85] text-slate-950 text-[10px] font-black rounded-md shadow-lg pointer-events-none whitespace-nowrap flex items-center gap-1"
            >
              <CheckCircle2 size={11} className="stroke-[3]" /> Chave PIX copiada!
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Variant: BADGE (Minimalist micro-chip)
  if (variant === 'badge') {
    return (
      <button
        type="button"
        onClick={handleCopy}
        title="Copiar Chave PIX"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border transition-all cursor-pointer ${
          copied
            ? 'bg-emerald-500/20 border-[#00FF85] text-[#00FF85] shadow-[0_0_10px_rgba(0,255,133,0.3)]'
            : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700 text-slate-300'
        } ${className}`}
      >
        {copied ? <Check size={12} className="stroke-[3] text-[#00FF85]" /> : <Copy size={12} />}
        <span>{copied ? 'Chave Copiada' : displayKey}</span>
      </button>
    );
  }

  // Variant: CARD (Rich card with type badge, QR option, copy button)
  if (variant === 'card') {
    return (
      <div
        className={`relative bg-gradient-to-br from-slate-900/90 to-slate-950/90 border rounded-2xl p-5 shadow-xl transition-all duration-300 ${
          copied ? 'border-[#00FF85]/60 shadow-[0_0_25px_rgba(0,255,133,0.15)]' : 'border-slate-800 hover:border-slate-700'
        } ${className}`}
      >
        {/* Top meta */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#00FF85]/10 border border-[#00FF85]/30 flex items-center justify-center text-[#00FF85]">
              {getPixTypeIcon(pixType)}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
              {pixType && (
                <span className="text-[11px] font-semibold text-emerald-400">
                  Tipo: {getPixTypeLabel(pixType)}
                </span>
              )}
            </div>
          </div>

          {showQrButton && onQrClick && (
            <button
              type="button"
              onClick={onQrClick}
              className="p-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Abrir QR Code"
            >
              <QrCode size={15} className="text-[#00FF85]" />
              <span className="hidden sm:inline">QR Code</span>
            </button>
          )}
        </div>

        {/* Key Display & Copy Action */}
        <div
          onClick={() => handleCopy()}
          className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer select-all ${
            copied
              ? 'bg-emerald-950/40 border-[#00FF85]/50'
              : 'bg-slate-950/80 hover:bg-slate-950 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-mono font-bold text-white break-all">{displayKey}</p>
          </div>

          <motion.button
            type="button"
            onClick={handleCopy}
            whileTap={{ scale: 0.95 }}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold text-xs transition-all shadow-md cursor-pointer ${
              copied
                ? 'bg-[#00FF85] text-slate-950 shadow-[0_0_15px_rgba(0,255,133,0.4)]'
                : 'bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 hover:text-white'
            }`}
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <Check size={14} className="stroke-[3]" />
                  <span>Copiada!</span>
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <Copy size={14} />
                  <span>Copiar</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Micro-hint */}
        <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-500">
          <span>Clique em qualquer lugar do campo para copiar</span>
          {copied && (
            <motion.span
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-[#00FF85] font-semibold flex items-center gap-1"
            >
              <Sparkles size={11} /> Pronto para colar no app bancário
            </motion.span>
          )}
        </div>
      </div>
    );
  }

  // Default Variant: INPUT (Field style, perfect for forms & modals)
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            {getPixTypeIcon(pixType)}
            <span>{label}</span>
          </label>
          {pixType && (
            <span className="text-[10px] font-mono text-emerald-400/90 font-bold tracking-wider">
              {getPixTypeLabel(pixType)}
            </span>
          )}
        </div>
      )}

      <div
        className={`relative flex items-center rounded-xl border p-1 transition-all duration-300 ${
          copied
            ? 'bg-emerald-950/30 border-[#00FF85] shadow-[0_0_15px_rgba(0,255,133,0.2)]'
            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
        }`}
      >
        <input
          type="text"
          readOnly
          value={displayKey}
          onClick={(e) => {
            (e.target as HTMLInputElement).select();
            handleCopy();
          }}
          className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-white font-mono outline-none cursor-pointer selection:bg-[#00FF85]/30 truncate"
          title="Clique para selecionar e copiar"
        />

        <div className="flex items-center gap-1.5 pr-1">
          {showQrButton && onQrClick && (
            <button
              type="button"
              onClick={onQrClick}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Visualizar QR Code"
            >
              <QrCode size={15} className="text-[#00FF85]" />
            </button>
          )}

          <motion.button
            type="button"
            onClick={handleCopy}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              copied
                ? 'bg-[#00FF85] text-slate-950 shadow-[0_0_12px_rgba(0,255,133,0.4)]'
                : 'bg-[#32BCAD] hover:bg-[#269689] text-slate-950'
            }`}
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <Check size={14} className="stroke-[3]" />
                  <span>Copiado!</span>
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <Copy size={14} />
                  <span>Copiar</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Floating Success Pill */}
        <AnimatePresence>
          {showFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: -34, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="absolute right-2 z-30 px-3 py-1 bg-[#00FF85] text-slate-950 text-xs font-black rounded-lg shadow-xl pointer-events-none flex items-center gap-1.5"
            >
              <CheckCircle2 size={13} className="stroke-[3]" />
              <span>Chave copiada para a área de transferência!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
