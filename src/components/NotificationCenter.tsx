import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { db, playDonationChime, requestFCMToken } from '../lib/firebase';
import { 
  collection, query, where, onSnapshot, doc, updateDoc, orderBy, limit 
} from 'firebase/firestore';
import { 
  Bell, CheckCircle2, DollarSign, Clock, ShieldCheck, X, 
  Volume2, VolumeX, Sparkles, ArrowDownRight, ArrowUpRight, 
  CheckCheck, Trash2, ExternalLink, Loader2, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface NetworkNotification {
  id: string;
  type: 'donation_confirmed' | 'donation_pending' | 'sent_confirmed';
  title: string;
  message: string;
  amount: number;
  counterpartyName: string;
  level: number;
  timestamp: Date;
  read: boolean;
  paymentId: string;
}

interface NotificationCenterProps {
  user: User;
  variant?: 'popover' | 'page';
  onNavigateToTransactions?: () => void;
}

export default function NotificationCenter({ 
  user, 
  variant = 'popover',
  onNavigateToTransactions 
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NetworkNotification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'confirmed' | 'pending'>('all');
  const [liveToast, setLiveToast] = useState<NetworkNotification | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const previousVerifiedIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Request browser notification permissions on mount if not determined
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  // 1. Real-time Listener for Received Donations (Confirmed & Pending)
  useEffect(() => {
    if (!user.pixKey) return;

    // Listen to payments where this user is the receiver
    const qReceived = query(
      collection(db, 'payments'),
      where('receiverId', '==', user.pixKey)
    );

    const unsubscribeReceived = onSnapshot(qReceived, (snapshot) => {
      const currentVerifiedIds = new Set<string>();
      const notifs: NetworkNotification[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;
        
        let date = new Date();
        if (data.createdAt?.seconds) {
          date = new Date(data.createdAt.seconds * 1000);
        } else if (data.createdAt instanceof Date) {
          date = data.createdAt;
        }

        if (data.status === 'verified') {
          currentVerifiedIds.add(id);
          notifs.push({
            id: `notif-rec-ver-${id}`,
            paymentId: id,
            type: 'donation_confirmed',
            title: 'Doação PIX Confirmada!',
            message: `Doação de R$ ${(data.amount || 10).toFixed(2).replace('.', ',')} recebida com sucesso na rede.`,
            amount: data.amount || 10,
            counterpartyName: data.senderName || 'Membro da Rede',
            level: data.level || 1,
            timestamp: date,
            read: false
          });
        } else if (data.status === 'pending_verification') {
          notifs.push({
            id: `notif-rec-pend-${id}`,
            paymentId: id,
            type: 'donation_pending',
            title: 'Comprovante PIX Aguardando Validação',
            message: `${data.senderName || 'Um indicado'} enviou um comprovante de R$ ${(data.amount || 10).toFixed(2).replace('.', ',')}.`,
            amount: data.amount || 10,
            counterpartyName: data.senderName || 'Membro da Rede',
            level: data.level || 1,
            timestamp: date,
            read: false
          });
        }
      });

      // Detect newly confirmed payments to trigger Audio chime and Push alert
      if (!initialLoadRef.current) {
        currentVerifiedIds.forEach((id) => {
          if (!previousVerifiedIdsRef.current.has(id)) {
            const confirmedItem = notifs.find(n => n.paymentId === id && n.type === 'donation_confirmed');
            
            // Play chime sound
            if (soundEnabled) {
              playDonationChime();
            }

            // Show Toast Alert
            if (confirmedItem) {
              setLiveToast(confirmedItem);
              setTimeout(() => setLiveToast(null), 5000);
            }

            // Native Browser Push Notification
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification("🎉 Doação PIX Confirmada na Rede!", {
                  body: `${confirmedItem?.counterpartyName || 'Membro'} confirmou uma doação de R$ ${(confirmedItem?.amount || 10).toFixed(2)} (Nível ${confirmedItem?.level || 1})!`,
                  icon: '/images/direct_cash_pix_logo_1784486102011.jpg'
                });
              } catch (e) {
                console.error("Erro ao emitir notificação nativa:", e);
              }
            }
          }
        });
      } else {
        initialLoadRef.current = false;
      }

      previousVerifiedIdsRef.current = currentVerifiedIds;

      // Sort notifications descending by date
      notifs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setNotifications(notifs);
    }, (error) => {
      console.error("Erro ao escutar notificações de pagamentos recebidos:", error);
    });

    return () => unsubscribeReceived();
  }, [user.pixKey, soundEnabled]);

  // Unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleConfirmPayment = async (paymentId: string) => {
    setConfirmingId(paymentId);
    try {
      const docRef = doc(db, 'payments', paymentId);
      await updateDoc(docRef, {
        status: 'verified',
        verifiedAt: new Date().toISOString()
      });
      if (soundEnabled) {
        playDonationChime();
      }
    } catch (err) {
      console.error("Erro ao confirmar pagamento pela notificação:", err);
    } finally {
      setConfirmingId(null);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'confirmed') return n.type === 'donation_confirmed';
    if (activeFilter === 'pending') return n.type === 'donation_pending';
    return true;
  });

  const formatRelativeTime = (date: Date) => {
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Há ${diffMins} min`;
    if (diffHours < 24) return `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    return date.toLocaleDateString('pt-BR');
  };

  if (variant === 'page') {
    return (
      <div className="space-y-6 max-w-5xl mx-auto font-sans">
        {/* Header Banner */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#32BCAD]/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#32BCAD]/10 border border-[#32BCAD]/20 flex items-center justify-center text-[#32BCAD] shadow-sm">
                <Bell size={24} />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">Central de Notificações</h2>
                <p className="text-slate-400 text-xs md:text-sm mt-0.5">
                  Avisos sonoros e em tempo real quando novas doações PIX forem confirmadas
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  soundEnabled
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
                title="Configuração do alerta sonoro"
              >
                {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                <span>{soundEnabled ? 'Som Ativado' : 'Som Desativado'}</span>
              </button>

              <button
                onClick={() => {
                  playDonationChime();
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Testar sinal sonoro de PIX confirmado"
              >
                Testar Som
              </button>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-3.5 py-2 bg-[#32BCAD] hover:bg-[#269689] text-slate-950 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Marcar Lidas
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex bg-slate-950/70 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => setActiveFilter('all')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeFilter === 'all' ? 'bg-[#32BCAD] text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('confirmed')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeFilter === 'confirmed' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 size={13} /> Confirmadas ({notifications.filter(n => n.type === 'donation_confirmed').length})
            </button>
            <button
              onClick={() => setActiveFilter('pending')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeFilter === 'pending' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock size={13} /> Pendentes ({notifications.filter(n => n.type === 'donation_pending').length})
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Monitoramento de rede ativo</span>
          </div>
        </div>

        {/* List of Notifications */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-sm">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-16 bg-slate-950/20 rounded-2xl border border-slate-850 flex flex-col items-center gap-3">
              <Bell size={36} className="text-slate-600" />
              <h4 className="font-bold text-white text-sm">Nenhuma notificação encontrada</h4>
              <p className="text-slate-500 text-xs max-w-sm px-4">
                Quando novos membros da sua rede realizarem transferências e as doações forem confirmadas, o sistema avisará você instantaneamente aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notif) => {
                const isConfirmed = notif.type === 'donation_confirmed';

                return (
                  <div
                    key={notif.id}
                    className={`p-4.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      isConfirmed
                        ? 'bg-slate-950/30 border-slate-800/80 hover:border-emerald-500/40'
                        : 'bg-slate-950/30 border-amber-500/20 hover:border-amber-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                        isConfirmed 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      }`}>
                        {isConfirmed ? <CheckCircle2 size={22} /> : <Clock size={22} />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-white">{notif.title}</h4>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            isConfirmed 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {isConfirmed ? 'Confirmado' : 'Aguardando Aprovação'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 mt-1">
                          {notif.counterpartyName} enviou doação para o seu <strong>Nível {notif.level}</strong>.
                        </p>
                        
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {formatRelativeTime(notif.timestamp)} • {notif.timestamp.toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 border-slate-850 pt-3 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <span className="font-mono font-black text-base text-emerald-400">
                          + R$ {notif.amount.toFixed(2).replace('.', ',')}
                        </span>
                        <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">PIX Direto</p>
                      </div>

                      {notif.type === 'donation_pending' && (
                        <button
                          onClick={() => handleConfirmPayment(notif.paymentId)}
                          disabled={confirmingId === notif.paymentId}
                          className="px-3 py-2 bg-[#32BCAD] hover:bg-[#269689] text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                        >
                          {confirmingId === notif.paymentId ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={13} />
                          )}
                          Aprovar PIX
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={panelRef}>
      
      {/* BELL TRIGGER BUTTON */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && unreadCount > 0) {
            markAllAsRead();
          }
        }}
        className={`relative p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-center ${
          isOpen
            ? 'bg-[#32BCAD] text-slate-950 border-[#32BCAD] shadow-[0_0_15px_rgba(50,188,173,0.3)]'
            : unreadCount > 0
            ? 'bg-slate-900 border-[#32BCAD]/40 text-[#32BCAD] hover:bg-slate-850 hover:border-[#32BCAD]'
            : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
        }`}
        title="Central de Notificações da Rede"
        aria-label="Central de Notificações"
      >
        <Bell size={18} className={unreadCount > 0 ? 'animate-wiggle' : ''} />
        
        {/* Animated Badge Count */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex items-center justify-center rounded-full h-5 w-5 bg-emerald-500 text-[10px] font-black text-slate-950">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* FLOATING REAL-TIME TOAST ALERT (when panel is closed) */}
      <AnimatePresence>
        {liveToast && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm bg-slate-950 border-2 border-emerald-500 rounded-2xl p-4 shadow-[0_15px_35px_rgba(16,185,129,0.3)] backdrop-blur-xl flex items-start gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-400 flex items-center gap-1">
                  <Sparkles size={11} /> Doação Confirmada
                </span>
                <button 
                  onClick={() => setLiveToast(null)}
                  className="text-slate-500 hover:text-white p-1"
                >
                  <X size={14} />
                </button>
              </div>
              <h4 className="text-sm font-black text-white mt-0.5 truncate">{liveToast.counterpartyName}</h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Valor: <strong className="text-emerald-400 font-mono">R$ {liveToast.amount.toFixed(2).replace('.', ',')}</strong> (Nível {liveToast.level})
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CENTRAL DE NOTIFICAÇÕES DROPDOWN / PANEL */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 mt-3 w-[calc(100vw-2rem)] max-w-sm sm:w-96 bg-slate-950/95 border border-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-800/80 bg-slate-900/40">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-[#32BCAD]/10 text-[#32BCAD] rounded-lg border border-[#32BCAD]/20">
                    <Bell size={15} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white tracking-tight">Central de Notificações</h3>
                    <p className="text-[10px] text-slate-400">Alertas de doações PIX em tempo real</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    title={soundEnabled ? 'Silenciar avisos sonoros' : 'Ativar avisos sonoros'}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      soundEnabled 
                        ? 'bg-slate-800 text-emerald-400 border-slate-700' 
                        : 'bg-slate-900 text-slate-500 border-slate-800'
                    }`}
                  >
                    {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                  </button>

                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex bg-slate-900 p-0.5 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setActiveFilter('all')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                      activeFilter === 'all' ? 'bg-[#32BCAD] text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todas ({notifications.length})
                  </button>
                  <button
                    onClick={() => setActiveFilter('confirmed')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                      activeFilter === 'confirmed' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Confirmadas ({notifications.filter(n => n.type === 'donation_confirmed').length})
                  </button>
                  <button
                    onClick={() => setActiveFilter('pending')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                      activeFilter === 'pending' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Pendentes ({notifications.filter(n => n.type === 'donation_pending').length})
                  </button>
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[10px] text-slate-400 hover:text-[#32BCAD] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck size={12} /> Ler todas
                  </button>
                )}
              </div>
            </div>

            {/* Notifications Body List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60 p-1">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-10 px-4 flex flex-col items-center gap-2.5">
                  <Clock size={28} className="text-slate-600" />
                  <p className="text-slate-300 text-xs font-semibold">Nenhuma notificação por enquanto</p>
                  <p className="text-slate-500 text-[11px] max-w-xs leading-relaxed">
                    Você será avisado automaticamente com som e alerta assim que novas doações PIX forem confirmadas na rede.
                  </p>
                </div>
              ) : (
                filteredNotifications.map((notif) => {
                  const isConfirmed = notif.type === 'donation_confirmed';

                  return (
                    <div
                      key={notif.id}
                      className={`p-3.5 rounded-2xl transition-all flex items-start gap-3 hover:bg-slate-900/50 ${
                        !notif.read ? 'bg-slate-900/30' : ''
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isConfirmed 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      }`}>
                        {isConfirmed ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-xs text-white truncate">{notif.title}</h4>
                          <span className="text-[9px] text-slate-500 font-mono shrink-0">
                            {formatRelativeTime(notif.timestamp)}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                          {notif.counterpartyName} • Nível {notif.level}
                        </p>

                        <div className="flex items-center justify-between mt-2">
                          <span className="font-mono font-bold text-xs text-emerald-400">
                            + R$ {notif.amount.toFixed(2).replace('.', ',')}
                          </span>

                          {/* Quick action if pending */}
                          {notif.type === 'donation_pending' && (
                            <button
                              onClick={() => handleConfirmPayment(notif.paymentId)}
                              disabled={confirmingId === notif.paymentId}
                              className="px-2.5 py-1 bg-[#32BCAD] hover:bg-[#269689] text-slate-950 font-bold text-[10px] rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                            >
                              {confirmingId === notif.paymentId ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={11} />
                              )}
                              Aprovar PIX
                            </button>
                          )}

                          {isConfirmed && (
                            <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              Confirmado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-900/60 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 flex items-center gap-1">
                <ShieldCheck size={12} className="text-[#32BCAD]" /> Verificação P2P Ativa
              </span>

              {onNavigateToTransactions && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onNavigateToTransactions();
                  }}
                  className="text-[#32BCAD] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  Ver Extrato Completo <ExternalLink size={11} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export { NotificationCenter as CentralDeNotificacoes };
