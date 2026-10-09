import React, { useState, useMemo, useRef } from 'react';
import { User, PixType } from '../types';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { createStaticPix } from 'pix-utils';
import {
  KeyRound,
  QrCode,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Download,
  Share2,
  Smartphone,
  Mail,
  User as UserIcon,
  Hash,
  Sparkles,
  Save,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  Edit3,
  X,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';

interface PixKeyConfigProps {
  user: User;
  onUserUpdate?: (updatedUser: User) => void;
  variant?: 'card' | 'modal' | 'inline';
  isOpen?: boolean;
  onClose?: () => void;
}

export default function PixKeyConfig({
  user,
  onUserUpdate,
  variant = 'card',
  isOpen,
  onClose
}: PixKeyConfigProps) {
  // Current active key state (can be edited)
  const [isEditing, setIsEditing] = useState(false);
  const [pixType, setPixType] = useState<PixType>(user.pixType || 'cpf');
  const [pixKey, setPixKey] = useState<string>(user.pixKey || '');
  const [amountMode, setAmountMode] = useState<'fixed' | 'open'>('fixed'); // R$ 10,00 fixed for network donation or open
  
  // UI states
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedBrCode, setCopiedBrCode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showQrExpanded, setShowQrExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [maskKey, setMaskKey] = useState(false);

  const qrContainerRef = useRef<HTMLDivElement>(null);

  // Synchronize initial state when user prop changes
  React.useEffect(() => {
    if (!isEditing) {
      setPixType(user.pixType || 'cpf');
      setPixKey(user.pixKey || '');
    }
  }, [user, isEditing]);

  // Generate PIX BR Code payload
  const brCodePayload = useMemo(() => {
    const targetKey = isEditing ? pixKey.trim() : user.pixKey;
    if (!targetKey) return '';

    try {
      const cleanKey = targetKey.replace(/\s+/g, '');
      const merchantName = (user.name || 'DIRECT CASH').normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 25);
      
      const config: any = {
        pixKey: cleanKey,
        merchantName: merchantName || 'RECEBEDOR',
        merchantCity: 'BRASILIA',
      };

      if (amountMode === 'fixed') {
        config.transactionAmount = 10;
        config.infoAdicional = 'Direct Cash P2P';
      }

      const pixResult = createStaticPix(config);
      if ('toBRCode' in pixResult && typeof pixResult.toBRCode === 'function') {
        return pixResult.toBRCode();
      }
      return cleanKey;
    } catch (e) {
      console.warn('Erro ao gerar código BR Code com pix-utils:', e);
      return targetKey;
    }
  }, [user, pixKey, isEditing, amountMode]);

  // Format helpers
  const getPixTypeLabel = (type: PixType) => {
    switch (type) {
      case 'cpf': return 'CPF';
      case 'telefone': return 'Telefone / Celular';
      case 'email': return 'E-mail';
      case 'aleatoria': return 'Chave Aleatória (EVP)';
      default: return 'Chave PIX';
    }
  };

  const getPixTypeIcon = (type: PixType) => {
    switch (type) {
      case 'cpf': return <UserIcon size={16} className="text-[#32BCAD]" />;
      case 'telefone': return <Smartphone size={16} className="text-[#32BCAD]" />;
      case 'email': return <Mail size={16} className="text-[#32BCAD]" />;
      case 'aleatoria': return <Hash size={16} className="text-[#32BCAD]" />;
      default: return <KeyRound size={16} className="text-[#32BCAD]" />;
    }
  };

  const getPlaceholder = (type: PixType) => {
    switch (type) {
      case 'cpf': return 'Ex: 123.456.789-00 ou apenas 11 dígitos';
      case 'telefone': return 'Ex: 11987654321 (com DDD)';
      case 'email': return 'Ex: seunome@email.com';
      case 'aleatoria': return 'Ex: 123e4567-e89b-12d3-a456-426614174000';
      default: return 'Digite sua chave PIX';
    }
  };

  // Validate PIX Key
  const validatePixKey = (key: string, type: PixType): string | null => {
    const clean = key.trim();
    if (!clean) return 'Informe uma chave PIX para continuar.';

    if (type === 'cpf') {
      const nums = clean.replace(/\D/g, '');
      if (nums.length !== 11) {
        return 'CPF inválido: deve conter exatamente 11 dígitos numéricos.';
      }
    } else if (type === 'telefone') {
      const nums = clean.replace(/\D/g, '');
      if (nums.length < 10 || nums.length > 13) {
        return 'Telefone inválido: insira o DDD + número (ex: 11988887777).';
      }
    } else if (type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clean)) {
        return 'E-mail inválido: verifique o endereço digitado.';
      }
    } else if (type === 'aleatoria') {
      if (clean.length < 20) {
        return 'Chave aleatória inválida: informe o código EVP completo.';
      }
    }
    return null;
  };

  // Save updated PIX Key
  const handleSavePix = async () => {
    setErrorMessage(null);
    setSaveSuccess(false);

    const validationError = validatePixKey(pixKey, pixType);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    const userId = user.id || user.uid;
    if (!userId) {
      setErrorMessage('Identificador de usuário não encontrado. Faça login novamente.');
      return;
    }

    setIsSaving(true);
    try {
      const cleanKey = pixKey.trim();
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        pixKey: cleanKey,
        pixType: pixType,
      });

      const updatedUser: User = {
        ...user,
        pixKey: cleanKey,
        pixType: pixType
      };

      if (onUserUpdate) {
        onUserUpdate(updatedUser);
      }

      setSaveSuccess(true);
      setIsEditing(false);

      setTimeout(() => {
        setSaveSuccess(false);
      }, 3500);
    } catch (err: any) {
      console.error('Erro ao atualizar chave PIX:', err);
      setErrorMessage('Falha ao salvar no banco de dados. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setPixType(user.pixType || 'cpf');
    setPixKey(user.pixKey || '');
    setErrorMessage(null);
    setIsEditing(false);
  };

  const copyToClipboard = async (text: string, type: 'key' | 'brcode') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'key') {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
      } else {
        setCopiedBrCode(true);
        setTimeout(() => setCopiedBrCode(false), 2000);
      }
    } catch (err) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      if (type === 'key') {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
      } else {
        setCopiedBrCode(true);
        setTimeout(() => setCopiedBrCode(false), 2000);
      }
    }
  };

  // Download QR Code as PNG
  const handleDownloadQrCode = () => {
    setIsDownloading(true);
    try {
      const svgElement = qrContainerRef.current?.querySelector('svg');
      if (!svgElement) {
        setIsDownloading(false);
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      const pixelRatio = typeof window !== 'undefined' ? Math.max(window.devicePixelRatio || 2, 2) : 2;
      const baseSize = 600;
      const baseHeight = baseSize + 160; // Extra room for banner & label
      canvas.width = baseSize * pixelRatio;
      canvas.height = baseHeight * pixelRatio;

      img.onload = () => {
        if (!ctx) return;
        // Retina crisp scale
        ctx.scale(pixelRatio, pixelRatio);

        // Background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, baseSize, baseHeight);

        // Header Title
        ctx.fillStyle = '#32BCAD';
        ctx.font = 'bold 26px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DIRECT CASH PIX - DOAÇÃO P2P', baseSize / 2, 45);

        // Subtitle
        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px monospace';
        ctx.fillText(`Titular: ${user.name} | Nível 1`, baseSize / 2, 75);

        // White card background for QR
        const qrCardMargin = 40;
        const qrCardSize = baseSize - (qrCardMargin * 2);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(qrCardMargin, 95, qrCardSize, qrCardSize, 20);
        ctx.fill();

        // Draw QR Code in the center
        const qrPadding = 30;
        ctx.drawImage(
          img, 
          qrCardMargin + qrPadding, 
          95 + qrPadding, 
          qrCardSize - (qrPadding * 2), 
          qrCardSize - (qrPadding * 2)
        );

        // Footer Text
        ctx.fillStyle = '#32BCAD';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(
          amountMode === 'fixed' ? 'VALOR: R$ 10,00' : 'VALOR LIVRE', 
          baseSize / 2, 
          baseHeight - 45
        );

        ctx.fillStyle = '#64748b';
        ctx.font = '14px monospace';
        ctx.fillText(`Chave: ${user.pixKey} (${user.pixType.toUpperCase()})`, baseSize / 2, baseHeight - 20);

        // Trigger download
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `directcash_pix_qrcode_${user.name.toLowerCase().replace(/\s+/g, '_')}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        setIsDownloading(false);
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.error('Erro ao baixar QR Code:', err);
      setIsDownloading(false);
    }
  };

  const displayKey = useMemo(() => {
    const raw = user.pixKey || '';
    if (!maskKey) return raw;
    if (raw.length <= 6) return '••••••';
    return `${raw.slice(0, 4)}••••${raw.slice(-3)}`;
  }, [user.pixKey, maskKey]);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-xl backdrop-blur-sm">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#32BCAD]/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* COMPONENT HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#32BCAD]/10 border border-[#32BCAD]/30 flex items-center justify-center text-[#32BCAD] shadow-[0_0_15px_rgba(50,188,173,0.15)]">
            <KeyRound size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-white text-base tracking-tight">
                Configuração de Chave PIX
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Ativa
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              Gerencie sua chave de recebimento e QR Code para doações diretas na rede
            </p>
          </div>
        </div>

        {/* Action Toggle (Edit / Manage) */}
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/60 transition-all cursor-pointer"
          >
            <Edit3 size={14} className="text-[#32BCAD]" />
            <span>Editar Chave PIX</span>
          </button>
        ) : (
          <button
            onClick={handleCancelEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X size={14} />
            <span>Fechar Edição</span>
          </button>
        )}
      </div>

      {/* FEEDBACK ALERTS */}
      {saveSuccess && (
        <div className="mt-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
          <span>Chave PIX atualizada com sucesso no banco de dados e sincronizada na rede!</span>
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
          <AlertTriangle size={16} className="shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* MAIN BODY: 2 COLUMNS (QR CODE ON LEFT/TOP, KEY DETAILS & CONFIG ON RIGHT) */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: QR CODE PREVIEW & QUICK ACTIONS (5 COLS) */}
        <div className="md:col-span-5 flex flex-col items-center bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 shadow-inner">
          <div className="flex items-center justify-between w-full mb-3 px-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <QrCode size={13} className="text-[#32BCAD]" />
              QR Code Oficial
            </span>
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setAmountMode('fixed')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  amountMode === 'fixed' 
                    ? 'bg-[#32BCAD] text-slate-950' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Gera o QR Code com valor fixo de R$ 10,00"
              >
                R$ 10,00
              </button>
              <button
                type="button"
                onClick={() => setAmountMode('open')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  amountMode === 'open' 
                    ? 'bg-[#32BCAD] text-slate-950' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Gera o QR Code sem valor pré-definido"
              >
                Aberto
              </button>
            </div>
          </div>

          {/* QR Code Container with High-Contrast White Background for Camera Reading */}
          <div 
            ref={qrContainerRef} 
            className="p-3.5 bg-white rounded-2xl shadow-xl transition-transform hover:scale-[1.02] duration-200 cursor-pointer max-w-[200px] w-full flex items-center justify-center aspect-square"
            onClick={() => setShowQrExpanded(!showQrExpanded)}
            title="Clique para ampliar"
          >
            <QRCodeSVG 
              value={brCodePayload || user.pixKey} 
              size={175} 
              level="H" 
              includeMargin={false}
              className="w-full h-full max-w-[175px] max-h-[175px] object-contain"
            />
          </div>

          <div className="mt-3 text-center">
            <span className="text-[11px] font-bold font-mono text-[#32BCAD] block">
              {amountMode === 'fixed' ? 'Valor: R$ 10,00 (Doação)' : 'Valor Livre / Aberto'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Padrão EMV BR Code Oficial (BCB)
            </span>
          </div>

          {/* Quick QR Code Actions */}
          <div className="grid grid-cols-2 gap-2 w-full mt-4">
            <button
              onClick={() => copyToClipboard(brCodePayload, 'brcode')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                copiedBrCode 
                  ? 'bg-emerald-500 text-slate-950 border-emerald-500' 
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border-slate-800'
              }`}
            >
              {copiedBrCode ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedBrCode ? 'Copiado!' : 'Copia e Cola'}</span>
            </button>

            <button
              onClick={handleDownloadQrCode}
              disabled={isDownloading}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer"
              title="Baixar imagem PNG do QR Code para impressão ou WhatsApp"
            >
              {isDownloading ? <Loader2 size={14} className="animate-spin text-[#32BCAD]" /> : <Download size={14} />}
              <span>Baixar PNG</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: KEY DETAILS OR EDIT FORM (7 COLS) */}
        <div className="md:col-span-7 space-y-4">
          
          {/* VIEW MODE: Informações Atuais */}
          {!isEditing ? (
            <div className="space-y-4">
              {/* Card da Chave Cadastrada */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    {getPixTypeIcon(user.pixType)}
                    Tipo: {getPixTypeLabel(user.pixType)}
                  </span>
                  
                  <button
                    onClick={() => setMaskKey(!maskKey)}
                    className="text-slate-500 hover:text-slate-300 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                    title={maskKey ? "Exibir chave completa" : "Ocultar chave"}
                  >
                    {maskKey ? <Eye size={13} /> : <EyeOff size={13} />}
                    <span>{maskKey ? 'Mostrar' : 'Ocultar'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5">
                  <span className="font-mono text-sm md:text-base font-bold text-white tracking-wide truncate">
                    {displayKey}
                  </span>

                  <button
                    onClick={() => copyToClipboard(user.pixKey, 'key')}
                    className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      copiedKey
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-[#32BCAD] hover:bg-[#269689] text-slate-950 shadow-sm'
                    }`}
                  >
                    {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKey ? 'Copiada' : 'Copiar'}</span>
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Titular: <strong className="text-slate-300 font-sans">{user.name}</strong></span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <ShieldCheck size={13} /> Sincronizada P2P
                  </span>
                </div>
              </div>

              {/* Informações Importantes & Regras P2P */}
              <div className="bg-slate-950/30 border border-slate-850 rounded-2xl p-4 text-xs space-y-2.5">
                <h4 className="font-bold text-slate-300 flex items-center gap-2 text-xs uppercase tracking-wider">
                  <ShieldCheck size={15} className="text-[#32BCAD]" />
                  Regras de Recebimento Direto
                </h4>
                <p className="text-slate-400 leading-relaxed">
                  Todos os membros que entrarem pelo seu link de convite (<span className="text-[#32BCAD] font-mono">{user.inviteCode}</span>) realizarão o PIX de R$ 10,00 diretamente para esta chave cadastrada.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/80">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Intermediários:</span>
                    <span className="text-white font-medium">Zero (Direto na sua conta)</span>
                  </div>
                  <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/80">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Confirmação:</span>
                    <span className="text-white font-medium">Via Comprovante / 1-Clique</span>
                  </div>
                </div>
              </div>

              {/* Botão de Edição Rápida */}
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-2.5 px-4 rounded-xl border border-[#32BCAD]/30 bg-[#32BCAD]/10 hover:bg-[#32BCAD]/20 text-[#32BCAD] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Settings size={15} />
                <span>Alterar Tipo ou Número da Chave PIX</span>
              </button>
            </div>
          ) : (
            /* EDIT MODE: Formulário Interativo de Configuração */
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  1. Selecione o Tipo de Chave PIX
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['cpf', 'telefone', 'email', 'aleatoria'] as PixType[]).map((type) => {
                    const isSelected = pixType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setPixType(type)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#32BCAD]/15 border-[#32BCAD] text-[#32BCAD] shadow-[0_0_12px_rgba(50,188,173,0.2)]'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        <div className="mb-1">{getPixTypeIcon(type)}</div>
                        <span className="capitalize text-[11px]">{type === 'cpf' ? 'CPF' : type === 'telefone' ? 'Telefone' : type === 'email' ? 'E-mail' : 'Aleatória'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    2. Digite sua Chave PIX ({getPixTypeLabel(pixType)})
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {pixType === 'cpf' ? '11 dígitos' : pixType === 'telefone' ? 'com DDD' : ''}
                  </span>
                </div>
                
                <div className="relative">
                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => {
                      setPixKey(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder={getPlaceholder(pixType)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-[#32BCAD] rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-slate-600 outline-none transition-colors"
                  />
                  {pixKey && (
                    <button
                      type="button"
                      onClick={() => setPixKey('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  Certifique-se de que a conta bancária vinculada está ativa para receber as doações instantaneamente.
                </p>
              </div>

              {/* Botões de Ação do Formulário */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSavePix}
                  disabled={isSaving}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#32BCAD] hover:bg-[#269689] disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(50,188,173,0.25)] transition-all cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Salvando Chave no Banco de Dados...</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>Salvar e Atualizar Chave PIX</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

export { PixKeyConfig };
