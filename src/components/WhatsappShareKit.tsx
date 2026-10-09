import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { User } from '../types';
import { Share2, MessageCircle, Copy, Check, QrCode, Sparkles, Send, X, ExternalLink } from 'lucide-react';

interface WhatsappShareKitProps {
  user: User;
  onClose?: () => void;
}

export default function WhatsappShareKit({ user, onClose }: WhatsappShareKitProps) {
  const inviteLink = `https://directcash.app/invite/${user.inviteCode}`;
  const [selectedTemplate, setSelectedTemplate] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const templates = [
    {
      title: "Direct Cash (Curto e Direto)",
      subtitle: "Ideal para grupos e contatos próximos",
      text: `Olá! Conheça o Sistema Ajuda Mútua PIX (Direct Cash) 🚀\n\nParticipe de uma rede 100% P2P, sem intermediários. Os depósitos são feitos diretamente na sua conta via PIX.\n\nAcesse meu link de convite e saiba mais:\n${inviteLink}`
    },
    {
      title: "Explicativo (Com Valores)",
      subtitle: "Mostra o potencial de R$ 50 para R$ 39 mil",
      text: `💡 Já pensou em transformar R$ 50,00 em mais de R$ 39.000,00 recebidos diretamente na sua conta PIX?\n\nSem taxas retidas em plataforma, sem intermediários!\n\n1. Ativação única de R$ 50\n2. Sistema de 5 níveis de doações diretas\n3. Recebimentos instantâneos por PIX\n\nCadastre-se com meu convite oficial:\n${inviteLink}`
    },
    {
      title: "Segurança e P2P",
      subtitle: "Foco na transparência e controle total",
      text: `🔒 Transparência e Segurança no Direct Cash PIX!\n\nNo sistema de Ajuda Mútua, você tem controle total. Cada comprovante é anexado e validado pelos próprios recebedores da rede.\n\nVenha fazer parte da minha equipe:\n${inviteLink}`
    },
    {
      title: "Incentivo a Amigos e Família",
      subtitle: "Mensagem amigável para convites diretos",
      text: `Oi! Quero te convidar para um projeto de solidariedade e colaboração financeira que estou participando. Funciona de pessoa para pessoa com depósitos diretos via PIX.\n\nDá uma olhada no projeto e se cadastre por este link:\n${inviteLink}`
    }
  ];

  const currentText = templates[selectedTemplate].text;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsapp = () => {
    const encoded = encodeURIComponent(currentText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleOpenTelegram = () => {
    const encoded = encodeURIComponent(currentText);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encoded}`, '_blank');
  };

  return (
    <div className="bg-slate-900 border border-[#32BCAD]/30 rounded-3xl p-5 sm:p-6 relative shadow-2xl max-h-[90dvh] overflow-y-auto max-w-2xl w-full mx-auto">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#32BCAD]/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center justify-between pb-5 border-b border-slate-800 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <MessageCircle size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Kit de Divulgação WhatsApp
              <span className="text-[10px] bg-[#32BCAD]/20 text-[#32BCAD] border border-[#32BCAD]/30 font-mono px-2 py-0.5 rounded-full uppercase">
                Aumente suas indicações
              </span>
            </h3>
            <p className="text-slate-400 text-xs">Mensagens prontas com seu link de convite personalizado</p>
          </div>
        </div>

        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Template Selector Pills */}
      <div className="space-y-2 mb-6">
        <label className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">Selecione o Estilo do Texto</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {templates.map((tpl, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedTemplate(idx)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedTemplate === idx
                  ? 'bg-[#32BCAD]/10 border-[#32BCAD] text-white'
                  : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">{tpl.title}</span>
                {selectedTemplate === idx && <Sparkles size={14} className="text-[#32BCAD]" />}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">{tpl.subtitle}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Preview Box & QR Code Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Text Preview */}
        <div className="md:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <textarea
            readOnly
            value={currentText}
            className="w-full h-36 bg-transparent text-xs text-slate-300 font-sans outline-none resize-none leading-relaxed"
          />
          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Link de Convite incluso</span>
            <span className="text-[#32BCAD] truncate max-w-[180px]">{user.inviteCode}</span>
          </div>
        </div>

        {/* QR Code Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <div className="bg-white p-2 rounded-xl shadow-md mb-2">
            <QRCodeSVG value={inviteLink} size={110} level="M" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Escaneie para cadastrar</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleOpenWhatsapp}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.25)]"
        >
          <MessageCircle size={18} />
          Enviar no WhatsApp
        </button>

        <button
          onClick={handleCopy}
          className="bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs py-3.5 px-5 rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
        >
          {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          {copied ? 'Copiado!' : 'Copiar Texto'}
        </button>

        <button
          onClick={handleOpenTelegram}
          className="bg-slate-800 hover:bg-slate-750 text-blue-400 font-bold text-xs py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
        >
          <Send size={16} />
          Telegram
        </button>
      </div>
    </div>
  );
}
