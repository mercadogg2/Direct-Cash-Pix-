import React, { useState } from 'react';
import { User, PixType } from '../types';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ShieldCheck, Copy, Check, User as UserIcon, AlertCircle, RefreshCw, Smartphone, Mail, Hash, UserCheck, MessageCircle, QrCode } from 'lucide-react';
import WhatsappShareKit from './WhatsappShareKit';
import PixQrModal from './PixQrModal';
import PixKeyCopy from './PixKeyCopy';

interface ProfileProps {
  user: User;
  onUserUpdate: (updatedUser: User) => void;
}

export default function Profile({ user, onUserUpdate }: ProfileProps) {
  const [pixType, setPixType] = useState<PixType>(user.pixType);
  const [pixKey, setPixKey] = useState<string>(user.pixKey);
  const [whatsapp, setWhatsapp] = useState<string>(user.whatsapp || '');
  const [allowWhatsappContact, setAllowWhatsappContact] = useState<boolean>(user.allowWhatsappContact !== false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Modals state
  const [showWhatsappKit, setShowWhatsappKit] = useState(false);
  const [showPixQrModal, setShowPixQrModal] = useState(false);

  const inviteLink = `https://directcash.app/invite/${user.inviteCode}`;

  const getPixTypeLabel = (type: PixType) => {
    switch (type) {
      case 'cpf': return 'CPF';
      case 'email': return 'E-mail';
      case 'telefone': return 'Telefone';
      case 'aleatoria': return 'Chave Aleatória';
      default: return type;
    }
  };

  const getPixIcon = (type: PixType) => {
    switch (type) {
      case 'cpf': return <UserIcon className="text-[#32BCAD]" size={18} />;
      case 'email': return <Mail className="text-[#32BCAD]" size={18} />;
      case 'telefone': return <Smartphone className="text-[#32BCAD]" size={18} />;
      case 'aleatoria': return <Hash className="text-[#32BCAD]" size={18} />;
      default: return <UserIcon className="text-[#32BCAD]" size={18} />;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSavePix = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Basic Validation
    const cleanKey = pixKey.trim();
    if (!cleanKey) {
      setErrorMsg('A chave PIX não pode ficar em branco.');
      setIsSaving(false);
      return;
    }

    if (pixType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanKey)) {
        setErrorMsg('Insira um e-mail válido para a chave PIX.');
        setIsSaving(false);
        return;
      }
    } else if (pixType === 'cpf') {
      const numeric = cleanKey.replace(/\D/g, '');
      if (numeric.length !== 11) {
        setErrorMsg('O CPF deve conter exatamente 11 números.');
        setIsSaving(false);
        return;
      }
    } else if (pixType === 'telefone') {
      const numeric = cleanKey.replace(/\D/g, '');
      if (numeric.length < 10 || numeric.length > 15) {
        setErrorMsg('Insira um telefone válido com DDD (ex: 11999999999).');
        setIsSaving(false);
        return;
      }
    }

    let cleanWhatsapp = whatsapp.trim().replace(/\D/g, '');
    if (cleanWhatsapp) {
      if (cleanWhatsapp.length < 10 || cleanWhatsapp.length > 15) {
        setErrorMsg('Insira um número de WhatsApp válido com DDD (ex: 11999999999).');
        setIsSaving(false);
        return;
      }
      if ((cleanWhatsapp.length === 10 || cleanWhatsapp.length === 11) && !cleanWhatsapp.startsWith('55')) {
        cleanWhatsapp = '55' + cleanWhatsapp;
      }
    }

    try {
      if (!user.uid) {
        throw new Error('Usuário não identificado.');
      }

      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        pixKey: cleanKey,
        pixType: pixType,
        whatsapp: cleanWhatsapp,
        allowWhatsappContact: allowWhatsappContact
      });

      // Update local and App state
      const updatedUser: User = {
        ...user,
        pixKey: cleanKey,
        pixType: pixType,
        whatsapp: cleanWhatsapp,
        allowWhatsappContact: allowWhatsappContact
      };
      
      onUserUpdate(updatedUser);
      setSuccessMsg('Perfil e dados de contato atualizados com sucesso!');
      
      // Auto-clear success message after 4s
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Erro ao atualizar perfil:', err);
      setErrorMsg(err.message || 'Erro ao atualizar dados no banco de dados.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Overview Card */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-[#32BCAD]/5 rounded-full blur-3xl"></div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#32BCAD]/10 border border-[#32BCAD]/20 flex items-center justify-center text-[#32BCAD] shadow-[0_0_20px_rgba(50,188,173,0.1)]">
              <UserCheck size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">{user.name}</h3>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                <span className="text-xs font-bold tracking-wider text-emerald-400 uppercase">Conta Ativa & Verificada</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={() => setShowWhatsappKit(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <MessageCircle size={15} />
              Kit WhatsApp
            </button>

            <button
              onClick={() => setShowPixQrModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <QrCode size={15} className="text-[#32BCAD]" />
              QR Code PIX
            </button>

            {user.inviteCode && (
              <button
                onClick={() => copyToClipboard(inviteLink)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copied ? 'Link Copiado!' : 'Copiar Convite'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Details & PIX Editor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Account Details Card */}
        <div className="lg:col-span-1 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-800/80 transition-colors">
          <div>
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-5">Detalhes do Membro</h4>
            
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Código de Convite</p>
                <p className="text-sm font-mono font-bold text-white mt-1 select-all">{user.inviteCode || 'Nenhum'}</p>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Patrocinador</p>
                <p className="text-sm font-mono font-bold text-white mt-1">{user.sponsorCode || 'Sem patrocinador'}</p>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1.5">Chave PIX Cadastrada</p>
                <PixKeyCopy
                  pixKey={user.pixKey}
                  pixType={user.pixType}
                  variant="compact"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-slate-800/60 flex items-center gap-2 text-slate-500">
            <ShieldCheck size={14} className="text-[#32BCAD]" />
            <span className="text-[10px] font-bold tracking-wider uppercase">Ambiente Criptografado SSL</span>
          </div>
        </div>

        {/* PIX Key Editor Form Card */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 hover:border-slate-800/80 transition-colors">
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-5">Editar Chave PIX</h4>
          <p className="text-xs text-slate-400 mb-6">
            Mantenha sua chave PIX sempre atualizada para garantir que você receba as doações diretamente em sua conta sem qualquer atraso ou erro de envio.
          </p>

          <form onSubmit={handleSavePix} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Tipo de Chave</label>
                <select
                  value={pixType}
                  onChange={(e) => setPixType(e.target.value as PixType)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-[#32BCAD] transition-colors text-white appearance-none cursor-pointer"
                >
                  <option value="cpf">CPF</option>
                  <option value="email">E-mail</option>
                  <option value="telefone">Telefone</option>
                  <option value="aleatoria">Aleatória</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Sua Chave PIX</label>
                <input
                  required
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder={
                    pixType === 'cpf' ? '00000000000' :
                    pixType === 'email' ? 'exemplo@email.com' :
                    pixType === 'telefone' ? '11999999999' :
                    'Sua chave aleatória PIX'
                  }
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-[#32BCAD] transition-colors text-white placeholder-slate-500 font-mono"
                />
              </div>
            </div>

            {/* WhatsApp Integration Field */}
            <div className="pt-4 border-t border-slate-800/60 space-y-4">
              <h5 className="text-[11px] font-bold text-[#32BCAD] uppercase tracking-widest">Contato de Suporte / Confirmação</h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Número do WhatsApp (com DDD)</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="Ex: 11999999999"
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-[#32BCAD] transition-colors text-white placeholder-slate-500 font-mono"
                  />
                  <p className="text-[9px] text-slate-500 mt-1">Insira seu celular completo para receber mensagens diretas de seus doadores solicitando ativação rápida.</p>
                </div>

                <div className="flex items-center pt-2 sm:pt-6">
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={allowWhatsappContact}
                      onChange={(e) => setAllowWhatsappContact(e.target.checked)}
                      className="rounded bg-slate-800/50 border-slate-700 text-[#32BCAD] focus:ring-0 focus:ring-offset-0 cursor-pointer w-4 h-4"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">Habilitar WhatsApp</span>
                      <span className="text-[9px] text-slate-500">Mostrar botão de contato nas telas de envio</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Error & Success Messages */}
            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 mt-4">
                <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-red-300 font-medium">{errorMsg}</p>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 mt-4">
                <ShieldCheck className="text-emerald-400 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-emerald-300 font-medium">{successMsg}</p>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="bg-[#32BCAD] hover:bg-[#269689] disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold tracking-widest uppercase text-xs rounded-xl px-5 py-3.5 flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(50,188,173,0.2)] disabled:shadow-none"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="animate-spin" size={14} />
                    Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* WHATSAPP SHARE KIT MODAL */}
      {showWhatsappKit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <WhatsappShareKit user={user} onClose={() => setShowWhatsappKit(false)} />
        </div>
      )}

      {/* PIX QR CODE MODAL */}
      {showPixQrModal && (
        <PixQrModal user={user} onClose={() => setShowPixQrModal(false)} />
      )}
    </div>
  );
}
