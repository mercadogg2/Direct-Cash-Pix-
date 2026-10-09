import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { User } from '../types';
import { QrCode, Copy, Check, X, ShieldCheck, Share2 } from 'lucide-react';
import PixKeyCopy from './PixKeyCopy';

interface PixQrModalProps {
  user: User;
  onClose: () => void;
}

export default function PixQrModal({ user, onClose }: PixQrModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  const inviteLink = `https://directcash.app/invite/${user.inviteCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-8 max-w-md w-full max-h-[90dvh] overflow-y-auto relative shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Modal Title */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-[#32BCAD]/10 border border-[#32BCAD]/30 rounded-2xl flex items-center justify-center text-[#32BCAD] mx-auto mb-3 shadow-[0_0_20px_rgba(50,188,173,0.15)]">
            <QrCode size={28} />
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">QR Code & Chave PIX</h3>
          <p className="text-xs text-slate-400 mt-1">Sua carteira para recebimento direto P2P</p>
        </div>

        {/* QR Code Container */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col items-center justify-center mb-6">
          <div className="bg-white p-3 rounded-xl shadow-lg mb-3 max-w-[190px] w-full flex items-center justify-center aspect-square">
            <QRCodeSVG value={user.pixKey} size={160} level="H" className="w-full h-full max-w-[160px] max-h-[160px] object-contain" />
          </div>
          <span className="text-[10px] text-slate-500 uppercase font-mono font-bold tracking-widest">
            TIPO: {user.pixType.toUpperCase()}
          </span>
        </div>

        {/* PIX Key Copy Field */}
        <div className="space-y-4 mb-6">
          <PixKeyCopy
            pixKey={user.pixKey}
            pixType={user.pixType}
            label="Sua Chave PIX"
            variant="input"
          />

          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1.5">
              Seu Link de Expansão
            </label>
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="flex-1 bg-transparent px-3 text-xs text-white font-mono outline-none"
              />
              <button
                onClick={copyLink}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedLink ? <Check size={14} className="text-[#32BCAD]" /> : <Copy size={14} />}
                {copiedLink ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Security Badge */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#32BCAD]" />
            Sem Intermediários
          </span>
          <span className="text-emerald-400 font-bold">100% P2P</span>
        </div>

      </div>
    </div>
  );
}
