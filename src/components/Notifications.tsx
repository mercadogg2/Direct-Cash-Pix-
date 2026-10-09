import React, { useEffect, useState, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, requestFCMToken, getMessagingInstance, playDonationChime } from '../lib/firebase';
import { onMessage } from 'firebase/messaging';
import { User } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCircle, X, DollarSign, Volume2, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';

interface NotificationProps {
  user: User;
}

interface PaymentNotification {
  id: string;
  amount: number;
  senderId: string;
  senderName?: string;
  level?: number;
}

export default function Notifications({ user }: NotificationProps) {
  const [notifications, setNotifications] = useState<PaymentNotification[]>([]);
  const [fcmStatus, setFcmStatus] = useState<'granted' | 'denied' | 'default' | 'loading'>('default');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const previousIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  // Initialize FCM and Permission Status
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setFcmStatus(Notification.permission as 'granted' | 'denied' | 'default');
    }

    // Subscribe to FCM messages
    let unsubscribeFcm: (() => void) | null = null;
    getMessagingInstance().then((messaging) => {
      if (messaging) {
        unsubscribeFcm = onMessage(messaging, (payload) => {
          console.log('[FCM Foreground Message Received]:', payload);
          playDonationChime();
          const title = payload.notification?.title || 'Nova Doação PIX Recebida!';
          const body = payload.notification?.body || 'Você recebeu uma nova doação PIX no Direct Cash.';
          
          if (Notification.permission === 'granted') {
            try {
              new Notification(title, {
                body,
                icon: '/images/direct_cash_pix_logo_1784486102011.jpg'
              });
            } catch (e) {
              console.log("Error displaying native notification:", e);
            }
          }
        });
      }
    });

    return () => {
      if (unsubscribeFcm) unsubscribeFcm();
    };
  }, []);

  // Request FCM Permission
  const enableFCM = async () => {
    setFcmStatus('loading');
    const token = await requestFCMToken(user.uid || user.id);
    if (token) {
      setFcmStatus('granted');
      setToastMsg("Notificações em Tempo Real (FCM) Ativadas!");
      setTimeout(() => setToastMsg(null), 4000);
    } else {
      setFcmStatus(Notification.permission as any);
      if (Notification.permission === 'denied') {
        setToastMsg("As notificações estão bloqueadas no navegador. Ative as permissões para alertas.");
        setTimeout(() => setToastMsg(null), 4000);
      }
    }
  };

  // Real-time Firestore query listener for pending donations
  useEffect(() => {
    if (!user.pixKey) return;

    const q = query(
      collection(db, 'payments'),
      where('receiverId', '==', user.pixKey),
      where('status', '==', 'pending_verification')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications: PaymentNotification[] = [];
      const currentIds = new Set<string>();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        currentIds.add(docSnap.id);
        newNotifications.push({
          id: docSnap.id,
          amount: data.amount || 50,
          senderId: data.senderId,
          senderName: data.senderName,
          level: data.level
        });
      });

      // Check for newly added items to trigger audio & browser push alert
      if (!initialLoadRef.current) {
        currentIds.forEach((id) => {
          if (!previousIdsRef.current.has(id)) {
            // PLAY REAL-TIME CHIME SOUND
            playDonationChime();

            // TRIGGER BROWSER NATIVE PUSH NOTIFICATION
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                const notifData = newNotifications.find(n => n.id === id);
                new Notification("🎉 Nova Doação PIX Recebida!", {
                  body: `R$ ${(notifData?.amount || 10).toFixed(2)} recebidos via PIX. Clique para confirmar!`,
                  icon: '/images/direct_cash_pix_logo_1784486102011.jpg'
                });
              } catch (err) {
                console.log("Native Notification error:", err);
              }
            }
          }
        });
      } else {
        initialLoadRef.current = false;
      }

      previousIdsRef.current = currentIds;
      setNotifications(newNotifications);
    });

    return () => unsubscribe();
  }, [user.pixKey]);

  const confirmPayment = async (paymentId: string) => {
    setConfirmingId(paymentId);
    try {
      await updateDoc(doc(db, 'payments', paymentId), {
        status: 'verified',
        verifiedAt: new Date().toISOString()
      });
      setToastMsg("Doação confirmada com sucesso!");
      setTimeout(() => setToastMsg(null), 3000);
    } catch (error) {
      console.error("Erro ao confirmar pagamento:", error);
      setToastMsg("Erro ao confirmar pagamento. Tente novamente.");
      setTimeout(() => setToastMsg(null), 3000);
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      
      {/* Toast Feedback */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="pointer-events-auto bg-[#32BCAD] text-slate-950 px-4 py-3 rounded-xl font-bold text-xs shadow-xl flex items-center justify-between gap-2 border border-[#32BCAD]"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={16} />
              <span>{toastMsg}</span>
            </div>
            <button onClick={() => setToastMsg(null)} className="text-slate-950 hover:opacity-75">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FCM Activation Status Badge / Alert Banner if disabled */}
      {fcmStatus !== 'granted' && notifications.length > 0 && (
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-amber-500/30 p-3 rounded-xl shadow-lg flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-400 font-semibold">
            <Bell size={16} className="animate-bounce" />
            <span>Ativar Alertas Push (FCM)?</span>
          </div>
          <button
            onClick={enableFCM}
            disabled={fcmStatus === 'loading'}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-[11px] transition-all flex items-center gap-1 cursor-pointer"
          >
            {fcmStatus === 'loading' ? <Loader2 size={12} className="animate-spin" /> : <Volume2 size={12} />}
            Ativar FCM
          </button>
        </div>
      )}

      {/* Real-Time Payment Toast Notifications */}
      <AnimatePresence>
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="pointer-events-auto bg-slate-950/95 border-2 border-[#32BCAD] rounded-2xl p-4 shadow-[0_10px_30px_rgba(50,188,173,0.25)] overflow-hidden relative backdrop-blur-xl"
          >
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#32BCAD]"></div>
            <div className="flex gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#32BCAD]/20 border border-[#32BCAD]/40 flex items-center justify-center shrink-0 text-[#32BCAD]">
                <DollarSign size={22} />
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-[#32BCAD]/20 text-[#32BCAD] text-[10px] font-mono font-bold px-2 py-0.5 rounded-md uppercase">
                      PIX em Tempo Real
                    </span>
                  </div>
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#32BCAD] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#32BCAD]"></span>
                  </span>
                </div>

                <h4 className="text-white font-black text-sm mt-1">Nova Doação Recebida!</h4>
                
                <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                  Você recebeu <strong className="text-[#32BCAD] font-mono text-sm">R$ {notif.amount.toFixed(2)}</strong>
                  {notif.senderName ? ` de ${notif.senderName}` : ''}.
                </p>

                <div className="mt-3 flex gap-2">
                  <button 
                    onClick={() => confirmPayment(notif.id)}
                    disabled={confirmingId === notif.id}
                    className="flex-1 bg-[#32BCAD] hover:bg-[#269689] text-slate-950 text-xs font-extrabold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer hover:scale-[1.02]"
                  >
                    {confirmingId === notif.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle size={15} />
                    )}
                    Confirmar Recebimento
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

