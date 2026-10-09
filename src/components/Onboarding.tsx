import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Receiver, PixType } from '../types';
import { CheckCircle, Upload, ArrowRight, ShieldCheck, QrCode, AlertCircle, Loader2, Copy, Image as ImageIcon, Hourglass, LogOut, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, addDoc, query, where, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { createStaticPix } from 'pix-utils';
import PixKeyCopy from './PixKeyCopy';

interface OnboardingProps {
  onComplete: (user: User) => void;
  initialUser?: User | null;
}

export default function Onboarding({ onComplete, initialUser }: OnboardingProps) {
  const [step, setStep] = useState<1 | 2>(initialUser ? 2 : 1);
  const [isLoginView, setIsLoginView] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '',
    password: '',
    pixKey: '', 
    pixType: 'cpf' as PixType, 
    sponsorCode: '', 
    uid: '' 
  });
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [loadingReceivers, setLoadingReceivers] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Real flow states
  const [receiptsMap, setReceiptsMap] = useState<{[level: number]: string}>({});
  const [isSentForVerification, setIsSentForVerification] = useState(false);
  const [checkingExistingPayments, setCheckingExistingPayments] = useState(true);
  const [hasPendingPayments, setHasPendingPayments] = useState(false);
  const [userPayments, setUserPayments] = useState<any[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadLevel, setActiveUploadLevel] = useState<number | null>(null);

  const [expandedReceiver, setExpandedReceiver] = useState<number | null>(1);
  const [expandedQR, setExpandedQR] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Extract referral code from URL on mount
  useEffect(() => {
    let refCode = '';
    const searchParams = new URLSearchParams(window.location.search);
    refCode = searchParams.get('ref') || searchParams.get('invite') || searchParams.get('code') || '';
    
    if (!refCode) {
      const pathParts = window.location.pathname.split('/');
      const inviteIndex = pathParts.indexOf('invite');
      if (inviteIndex !== -1 && pathParts[inviteIndex + 1]) {
        refCode = pathParts[inviteIndex + 1];
      }
    }
    
    if (refCode) {
      setFormData(prev => ({ ...prev, sponsorCode: refCode.trim().toUpperCase() }));
    }
  }, []);

  // Check if payments are already uploaded for this user
  useEffect(() => {
    const checkExisting = async () => {
      const uid = auth.currentUser?.uid || initialUser?.uid || formData.uid;
      if (!uid) {
        setCheckingExistingPayments(false);
        return;
      }
      try {
        const q = query(collection(db, 'payments'), where('senderId', '==', uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setUserPayments(list);
          setHasPendingPayments(true);
          setStep(2);
        }
      } catch (err) {
        console.error("Erro ao verificar pagamentos existentes:", err);
      } finally {
        setCheckingExistingPayments(false);
      }
    };
    checkExisting();
  }, [initialUser, formData.uid]);

  // Listen to User document real-time changes to automatically log in when approved
  useEffect(() => {
    const uid = auth.currentUser?.uid || initialUser?.uid || formData.uid;
    if (!uid) return;

    const userRef = doc(db, 'users', uid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.data() as User;
        if (userData.isActive) {
          onComplete({ ...userData, uid });
        }
      }
    });

    return () => unsubscribe();
  }, [initialUser, formData.uid, onComplete]);

  // Listen to user's uploaded payments in real-time
  useEffect(() => {
    const uid = auth.currentUser?.uid || initialUser?.uid || formData.uid;
    if (!uid) return;

    const q = query(collection(db, 'payments'), where('senderId', '==', uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserPayments(list);
    });

    return () => unsubscribe();
  }, [initialUser, formData.uid]);

  // Dynamically build 5 receivers based on MLM sponsor chain or admin fallback
  const fetchReceivers = async (sponsorCodeInput: string) => {
    setLoadingReceivers(true);
    setErrorMsg(null);
    try {
      let adminName = 'Jorge Furtado';
      let adminPix = 'jorjefurtado6@gmail.com';
      let adminPixType = 'email';
      let adminData: any = null;

      // Load Admin Info as fallback
      const adminQuery = query(collection(db, 'users'), where('isAdmin', '==', true), limit(1));
      const adminSnap = await getDocs(adminQuery);
      if (!adminSnap.empty) {
        adminData = adminSnap.docs[0].data();
        adminName = adminData.name || adminName;
        adminPix = adminData.pixKey || adminPix;
        adminPixType = adminData.pixType || adminPixType;
      } else {
        const ownerQuery = query(collection(db, 'users'), where('email', 'in', ['directcashpix@gmail.com', 'jorjefurtado6@gmail.com']), limit(1));
        const ownerSnap = await getDocs(ownerQuery);
        if (!ownerSnap.empty) {
          adminData = ownerSnap.docs[0].data();
          adminName = adminData.name || adminName;
          adminPix = adminData.pixKey || adminPix;
          adminPixType = adminData.pixType || adminPixType;
        }
      }

      const list: Receiver[] = [];
      let currentSponsorCode = sponsorCodeInput?.trim().toUpperCase();

      for (let level = 1; level <= 5; level++) {
        let levelUser: any = null;
        if (currentSponsorCode) {
          const q = query(collection(db, 'users'), where('inviteCode', '==', currentSponsorCode), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const userData = snap.docs[0].data();
            // Sponsor must be active to receive payments
            if (userData.isActive) {
              levelUser = userData;
            }
          }
        }

        if (levelUser) {
          list.push({
            level,
            name: levelUser.name,
            pixKey: levelUser.pixKey,
            status: 'pending',
            whatsapp: levelUser.whatsapp || '',
            allowWhatsappContact: levelUser.allowWhatsappContact !== false
          });
          // Traverse to next sponsor up the chain
          currentSponsorCode = levelUser.sponsorCode || '';
        } else {
          list.push({
            level,
            name: `${adminName} - Nível ${level}`,
            pixKey: adminPix,
            status: 'pending',
            whatsapp: adminData?.whatsapp || '',
            allowWhatsappContact: adminData?.allowWhatsappContact !== false
          });
          // End of sponsor chain, default remaining levels to Admin
          currentSponsorCode = '';
        }
      }

      setReceivers(list);
    } catch (err) {
      console.error("Erro ao carregar recebedores da rede:", err);
      setErrorMsg("Erro ao carregar patrocinadores da rede. Por favor, tente novamente.");
    } finally {
      setLoadingReceivers(false);
    }
  };

  // Fetch receivers when entering step 2
  useEffect(() => {
    if (step === 2 && receivers.length === 0) {
      const code = initialUser?.sponsorCode || formData.sponsorCode || '';
      fetchReceivers(code);
    }
  }, [step, initialUser]);

  const getFriendlyAuthErrorMessage = (error: any): string => {
    if (!error) return "Erro desconhecido.";
    let code = error.code || '';
    if (!code && error.message) {
      if (error.message.includes('auth/invalid-credential')) {
        code = 'auth/invalid-credential';
      } else if (error.message.includes('auth/email-already-in-use')) {
        code = 'auth/email-already-in-use';
      } else if (error.message.includes('auth/weak-password')) {
        code = 'auth/weak-password';
      }
    }
    
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return "E-mail ou senha incorretos. Verifique os dados inseridos e tente novamente.";
      case 'auth/email-already-in-use':
        return "Este e-mail já está sendo utilizado por outra conta.";
      case 'auth/weak-password':
        return "A senha deve conter no mínimo 6 caracteres.";
      case 'auth/invalid-email':
        return "O formato do e-mail inserido é inválido.";
      case 'auth/user-disabled':
        return "Esta conta de usuário foi desativada.";
      case 'auth/network-request-failed':
        return "Erro de conexão com o servidor. Verifique sua internet e tente novamente.";
      default:
        return error.message || String(error);
    }
  };

  const handlePasswordReset = async () => {
    if (!formData.email) {
      setErrorMsg("Por favor, digite seu e-mail no campo acima para receber o link de redefinição/criação de senha.");
      setResetSuccess(null);
      return;
    }
    setIsLoggingIn(true);
    setErrorMsg(null);
    setResetSuccess(null);
    try {
      await sendPasswordResetEmail(auth, formData.email.trim());
      setResetSuccess(`E-mail de redefinição de senha enviado para: ${formData.email.trim()}. Verifique sua caixa de entrada e pasta de spam.`);
    } catch (err: any) {
      console.error("Error sending password reset:", err);
      setErrorMsg(`Erro ao enviar link de redefinição: ${err.message || err}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLoginOnly = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.email || !formData.password) {
      setErrorMsg("Por favor, preencha o e-mail e a senha para entrar.");
      return;
    }
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email.trim(), formData.password);
      const uid = userCredential.user.uid;
      
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const userData = docSnap.data() as User;
        if (userData.isActive) {
          onComplete({ ...userData, uid });
        } else {
          setFormData({
            name: userData.name,
            email: userData.email || formData.email,
            password: '',
            pixKey: userData.pixKey,
            pixType: userData.pixType,
            sponsorCode: userData.sponsorCode || '',
            uid: uid
          });
          setStep(2);
        }
      } else {
        await auth.signOut();
        setErrorMsg("Conta de autenticação encontrada, mas dados cadastrais não encontrados. Por favor, registre-se.");
      }
    } catch (error: any) {
      console.error("Error logging in:", error);
      setErrorMsg(`Erro de acesso: ${getFriendlyAuthErrorMessage(error)}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.pixKey || !formData.email || !formData.password) {
      setErrorMsg("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    if (formData.password.length < 6) {
      setErrorMsg("A senha deve conter no mínimo 6 caracteres.");
      return;
    }
    
    setIsRegistering(true);
    setErrorMsg(null);
    try {
      if (!initialUser) {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password);
        const uid = userCredential.user.uid;
        
        // Check if user already exists
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const userData = docSnap.data() as User;
          if (userData.isActive) {
            onComplete({ ...userData, uid });
            return;
          } else {
            setFormData({
              name: userData.name,
              email: userData.email || formData.email,
              password: '',
              pixKey: userData.pixKey,
              pixType: userData.pixType,
              sponsorCode: userData.sponsorCode || '',
              uid: uid
            });
            setStep(2);
            return;
          }
        }

        const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        
        const newUser: User = {
          name: formData.name,
          email: formData.email.trim(),
          pixKey: formData.pixKey,
          pixType: formData.pixType,
          uid,
          isActive: false,
          isAdmin: false,
          inviteCode,
          sponsorCode: formData.sponsorCode || '',
          createdAt: serverTimestamp(),
        };
        
        await setDoc(docRef, newUser);
        setFormData(prev => ({ ...prev, uid }));
      }
      setStep(2);
    } catch (error: any) {
      console.error("Error creating user:", error);
      setErrorMsg(`Erro de cadastro: ${getFriendlyAuthErrorMessage(error)}`);
    } finally {
      setIsRegistering(false);
    }
  };

  const copyToClipboard = (pixKey: string) => {
    navigator.clipboard.writeText(pixKey);
    setCopiedKey(pixKey);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Real receipt attachment logic
  const triggerFileSelect = (level: number) => {
    setActiveUploadLevel(level);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const level = activeUploadLevel;
    if (!file || level === null) return;

    if (file.size > 800000) {
      setErrorMsg("O arquivo de imagem do comprovante é muito grande. Escolha uma imagem de até 800KB.");
      return;
    }

    setReceivers(prev => prev.map(r => r.level === level ? { ...r, status: 'uploading' } : r));

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setReceiptsMap(prev => ({ ...prev, [level]: base64String }));
      setReceivers(prev => prev.map(r => r.level === level ? { ...r, status: 'verified' } : r));
      
      // Auto-expand next pending receiver
      const nextPending = receivers.find(r => r.level > level && r.status === 'pending');
      if (nextPending) {
        setExpandedReceiver(nextPending.level);
      } else {
        setExpandedReceiver(null);
      }
    };
    reader.onerror = () => {
      setErrorMsg("Erro ao ler o arquivo de comprovante.");
      setReceivers(prev => prev.map(r => r.level === level ? { ...r, status: 'pending' } : r));
    };
    reader.readAsDataURL(file);
  };

  const allVerified = useMemo(() => {
    return receivers.length > 0 && receivers.every(r => r.status === 'verified');
  }, [receivers]);

  // Submits real payments with actual base64 receipts to Firebase
  const finishActivation = async () => {
    if (!allVerified) {
      setErrorMsg("Por favor, anexe o comprovante para todos os recebedores da lista antes de enviar.");
      return;
    }
    
    setIsActivating(true);
    setErrorMsg(null);
    
    try {
      const uid = auth.currentUser?.uid || initialUser?.uid || formData.uid;
      const currentUser = initialUser || formData;

      if (!uid) {
         throw new Error("Usuário não identificado. Recarregue a página e tente novamente.");
      }

      // Record payments in firestore
      for (let i = 0; i < receivers.length; i++) {
        const receiver = receivers[i];
        const uploadedReceiptBase64 = receiptsMap[receiver.level];
        
        await addDoc(collection(db, 'payments'), {
          senderId: uid,
          senderName: currentUser.name || 'Membro Cadastrado',
          senderPixKey: currentUser.pixKey || '',
          receiverId: receiver.pixKey,
          receiverName: receiver.name,
          receiverPixKey: receiver.pixKey,
          receiverWhatsapp: receiver.whatsapp || '',
          receiverAllowWhatsappContact: receiver.allowWhatsappContact !== false,
          receiptImage: uploadedReceiptBase64 || '',
          amount: 10,
          level: receiver.level,
          status: 'pending_verification', // Set to real pending status! Needs admin review
          createdAt: serverTimestamp()
        });
      }

      setIsSentForVerification(true);
      setHasPendingPayments(true);
    } catch (error: any) {
      console.error("Error activating user:", error);
      setErrorMsg(`Erro de envio: ${error.message || error}`);
    } finally {
      setIsActivating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      window.location.reload();
    } catch (err) {
      console.error("Erro ao sair:", err);
    }
  };

  if (checkingExistingPayments) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617] text-[#32BCAD]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin" size={32} />
          <span className="font-semibold text-sm">Carregando dados de ativação...</span>
        </div>
      </div>
    );
  }

  // Pending activation / Verification screen
  if (hasPendingPayments || isSentForVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_top_right,_#1e293b_0%,_#020617_40%)]">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 flex flex-col items-center animate-pulse">
            <img src="/images/direct_cash_pix_logo_1784486102011.jpg" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/src/assets/images/direct_cash_pix_logo_1784486102011.jpg'; }} alt="Direct Cash Pix Logo" className="w-52 h-auto rounded-3xl object-cover mb-4 shadow-[0_0_30px_rgba(50,188,173,0.3)]" style={{ height: '70.438px' }} referrerPolicy="no-referrer" />
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/60 border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400"></span>
              </span>
            </div>

            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
                <Hourglass className="text-amber-400 animate-spin" size={28} style={{ animationDuration: '4s' }} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Conta em Análise</h2>
              <p className="text-slate-300 text-xs px-2 leading-relaxed">
                Seus comprovantes foram enviados com sucesso! Os administradores do sistema estão verificando as transferências de R$ 10,00 para cada um de seus patrocinadores.
              </p>
            </div>

            <div className="space-y-2 mb-6 max-h-[220px] overflow-y-auto pr-1">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Status dos Seus Comprovantes</div>
              {[1, 2, 3, 4, 5].map((lvl) => {
                const associatedPayment = userPayments.find(p => p.level === lvl);
                const status = associatedPayment?.status || 'pending_verification';
                
                return (
                  <div key={lvl} className="flex items-center justify-between p-2.5 bg-slate-950/40 rounded-xl border border-slate-850">
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-bold text-[#32BCAD] w-6">Lv{lvl}</div>
                      <div className="text-xs text-slate-300 truncate max-w-[150px]">
                        {associatedPayment?.receiverName || `Patrocinador Nível ${lvl}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {status !== 'verified' && associatedPayment?.receiverWhatsapp && associatedPayment?.receiverAllowWhatsappContact !== false && (
                        <a
                          href={`https://wa.me/${associatedPayment.receiverWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Olá! Eu sou o(a) ${associatedPayment.senderName || 'Membro do Sistema'} e acabei de transferir R$ 10,00 via PIX para você no Direct Cash (Nível ${lvl}). Já enviei o comprovante no sistema. Poderia verificar e aprovar minha conta? Obrigado!`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Chamar no WhatsApp"
                          className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-lg border border-emerald-500/20 hover:border-transparent transition-all cursor-pointer flex items-center justify-center gap-1 text-[10px] font-bold"
                        >
                          <MessageCircle size={12} />
                          <span className="hidden sm:inline">Chamar</span>
                        </a>
                      )}
                      {status === 'verified' ? (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-bold">Aprovado</span>
                      ) : (
                        <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full font-bold">Em análise</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-slate-950/50 border border-slate-850 rounded-xl mb-6 text-center">
              <span className="text-[10px] text-slate-400">
                🚀 Assim que as verificações terminarem, esta página irá se atualizar automaticamente e você terá acesso total à sua conta!
              </span>
            </div>

            <button 
              onClick={handleLogout}
              className="w-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-white font-bold text-xs rounded-xl px-4 py-3 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogOut size={14} /> Sair da Conta / Cancelar
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_top_right,_#1e293b_0%,_#020617_40%)]">
      {/* Hidden file input for real uploads */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center">
          <img src="/images/direct_cash_pix_logo_1784486102011.jpg" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/src/assets/images/direct_cash_pix_logo_1784486102011.jpg'; }} alt="Direct Cash Pix Logo" className="w-52 h-auto rounded-3xl object-cover mb-4 shadow-[0_0_30px_rgba(50,188,173,0.3)]" style={{ height: '70.438px' }} referrerPolicy="no-referrer" />
        </div>

        {step === 1 ? (
          <AnimatePresence mode="wait">
            {isLoginView ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 relative overflow-hidden"
              >
                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-white">
                  <ShieldCheck className="text-[#32BCAD]" /> Acessar Conta
                </h2>
                <form onSubmit={handleLoginOnly} className="space-y-4 relative z-10">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">E-mail</label>
                    <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-[#32BCAD] transition-colors text-white" placeholder="exemplo@email.com" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Senha</label>
                    <input required type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-[#32BCAD] transition-colors text-white" placeholder="Sua senha" />
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-xs font-medium">
                      {errorMsg}
                    </div>
                  )}

                  {resetSuccess && (
                    <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-emerald-400 text-xs font-medium">
                      {resetSuccess}
                    </div>
                  )}

                  <button type="submit" disabled={isLoggingIn} className="w-full bg-[#32BCAD] hover:bg-[#269689] disabled:bg-slate-850 disabled:text-slate-500 text-slate-900 font-bold tracking-widest uppercase text-xs rounded-xl px-4 py-4 mt-6 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(50,188,173,0.3)]">
                    {isLoggingIn ? (
                      <><Loader2 size={16} className="animate-spin" /> Acessando...</>
                    ) : (
                      <>Entrar na Conta <ArrowRight size={16} /></>
                    )}
                  </button>

                  <div className="text-center mt-3">
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      className="text-[11px] text-slate-500 hover:text-slate-300 transition-all underline decoration-dotted"
                    >
                      Definir ou recuperar senha? Enviar link por e-mail
                    </button>
                  </div>

                  <div className="text-center mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setIsLoginView(false);
                        setErrorMsg(null);
                        setResetSuccess(null);
                      }}
                      className="text-xs text-[#32BCAD] hover:underline font-semibold"
                    >
                      Não tem uma conta? Cadastre-se aqui
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 relative overflow-hidden"
              >
                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-white">
                  <ShieldCheck className="text-[#32BCAD]" /> Cadastro Seguro
                </h2>
                <form onSubmit={handleRegister} className="space-y-4 relative z-10">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nome Completo</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-[#32BCAD] transition-colors text-white" placeholder="Seu nome completo" />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">E-mail</label>
                      <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-[#32BCAD] transition-colors text-white" placeholder="exemplo@email.com" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Senha</label>
                      <input required type="password" minLength={6} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-[#32BCAD] transition-colors text-white" placeholder="Mín. 6 caracteres" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Tipo de Chave</label>
                      <select value={formData.pixType} onChange={e => setFormData({ ...formData, pixType: e.target.value as PixType })} className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-[#32BCAD] transition-colors text-white appearance-none">
                        <option value="cpf">CPF</option>
                        <option value="email">E-mail</option>
                        <option value="telefone">Telefone</option>
                        <option value="aleatoria">Aleatória</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Chave PIX</label>
                      <input required type="text" value={formData.pixKey} onChange={e => setFormData({ ...formData, pixKey: e.target.value })} className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-[#32BCAD] transition-colors text-white" placeholder="Sua chave PIX" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Código do Patrocinador (Opcional)</label>
                    <input type="text" value={formData.sponsorCode} onChange={e => setFormData({ ...formData, sponsorCode: e.target.value.toUpperCase() })} className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-[#32BCAD] transition-colors text-white font-mono" placeholder="EX: A1B2C3D4" />
                    <p className="text-[10px] text-slate-500 mt-1">Se não possuir código de indicação, você será patrocinado pelo sistema.</p>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-xs font-medium">
                      {errorMsg}
                    </div>
                  )}

                  <button type="submit" disabled={isRegistering} className="w-full bg-[#32BCAD] hover:bg-[#269689] disabled:bg-slate-850 disabled:text-slate-500 text-slate-900 font-bold tracking-widest uppercase text-xs rounded-xl px-4 py-4 mt-6 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(50,188,173,0.3)]">
                    {isRegistering ? (
                      <><Loader2 size={16} className="animate-spin" /> Cadastrando...</>
                    ) : (
                      <>Continuar para Ativação <ArrowRight size={16} /></>
                    )}
                  </button>

                  <div className="text-center mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setIsLoginView(true);
                        setErrorMsg(null);
                        setResetSuccess(null);
                      }}
                      className="text-xs text-[#32BCAD] hover:underline font-semibold"
                    >
                      Já tem uma conta? Entre aqui
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-slate-900/60 border border-[#32BCAD]/30 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#32BCAD] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#32BCAD]"></span>
              </span>
            </div>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 text-white">
              Ativação de Conta
            </h2>
            <p className="text-slate-400 text-xs mb-6 leading-normal">Transfira exatamente R$ 10,00 para cada membro abaixo e anexe fotos reais dos comprovantes de transferência.</p>
            
            {loadingReceivers ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-[#32BCAD]" size={28} />
                <span className="text-xs text-slate-400 font-medium">Buscando patrocinadores da rede...</span>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6 relative z-10 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {receivers.map((r) => {
                    const isExpanded = expandedReceiver === r.level;
                    const isVerified = r.status === 'verified';
                    const isUploading = r.status === 'uploading';
                    
                    return (
                      <div key={r.level} className={`flex flex-col p-3 rounded-xl border transition-all ${isVerified ? 'bg-[#32BCAD]/10 border-[#32BCAD]/30' : 'bg-slate-800/40 border-slate-700'}`}>
                        <div 
                          className="flex items-center justify-between cursor-pointer" 
                          onClick={() => !isVerified && setExpandedReceiver(isExpanded ? null : r.level)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                              0{r.level}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm text-white">{r.name}</span>
                              <span className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">{r.pixKey}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-[#32BCAD] text-sm">R$ 10</span>
                            {isVerified ? (
                              <CheckCircle size={18} className="text-[#32BCAD]" />
                            ) : (
                              <div className={`w-4 h-4 rounded-full border-2 ${isExpanded ? 'border-[#32BCAD]' : 'border-slate-600'}`} />
                            )}
                          </div>
                        </div>
                        
                        <AnimatePresence>
                          {isExpanded && !isVerified && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }} 
                              animate={{ height: 'auto', opacity: 1 }} 
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="pt-4 mt-2 border-t border-slate-700/50 flex flex-col gap-3">
                                <div className="grid grid-cols-2 gap-2">
                                  <PixKeyCopy
                                    pixKey={r.pixKey}
                                    variant="compact"
                                    className="w-full justify-center"
                                  />
                                  <button 
                                    onClick={() => setExpandedQR(expandedQR === r.level ? null : r.level)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 rounded-lg text-xs font-mono text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                                  >
                                    <QrCode size={14} /> QR Code
                                  </button>
                                </div>

                                <AnimatePresence>
                                  {expandedQR === r.level && (
                                    <motion.div 
                                      initial={{ height: 0, opacity: 0 }} 
                                      animate={{ height: 'auto', opacity: 1 }} 
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden flex flex-col items-center justify-center py-4 bg-white rounded-lg"
                                    >
                                      {(() => {
                                        const pixPayload = createStaticPix({ 
                                          pixKey: r.pixKey, 
                                          merchantName: r.name.substring(0, 25) || 'Receiver', 
                                          merchantCity: 'Brasil', 
                                          transactionAmount: 10, 
                                          infoAdicional: 'Doacao' 
                                        });
                                        return 'toBRCode' in pixPayload ? (
                                          <QRCodeSVG value={pixPayload.toBRCode()} size={150} />
                                        ) : (
                                          <div className="text-red-500 text-xs text-center px-4">Erro ao gerar PIX QR Code. Use a chave acima para pagar.</div>
                                        );
                                      })()}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                                
                                {r.whatsapp && r.allowWhatsappContact !== false && (
                                  <a
                                    href={`https://wa.me/${r.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                                      `Olá! Estou na etapa de ativação da minha conta no Direct Cash e você é meu patrocinador (Nível ${r.level}). Tive uma dúvida ou gostaria de falar com você sobre a doação de R$ 10,00.`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-400 hover:text-white font-bold text-xs rounded-lg px-4 py-2.5 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <MessageCircle size={14} /> Falar com Patrocinador no WhatsApp
                                  </a>
                                )}
                                
                                <button 
                                  onClick={() => triggerFileSelect(r.level)}
                                  disabled={isUploading}
                                  className="w-full bg-[#32BCAD] hover:bg-[#269689] text-slate-900 font-bold text-xs rounded-lg px-4 py-2.5 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                >
                                  {isUploading ? (
                                    <><Loader2 size={14} className="animate-spin" /> Processando...</>
                                  ) : (
                                    <><ImageIcon size={14} /> Anexar Comprovante (Imagem)</>
                                  )}
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                {errorMsg && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-xs font-medium relative z-10">
                    {errorMsg}
                  </div>
                )}

                <div className="flex gap-2">
                  <button 
                    onClick={handleLogout}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl px-4 py-4 flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-700"
                  >
                    Sair
                  </button>
                  <button 
                    onClick={finishActivation} 
                    disabled={isActivating} 
                    className={`flex-[2] font-bold uppercase tracking-widest text-xs rounded-xl px-4 py-4 flex items-center justify-center gap-2 transition-all relative z-10 ${allVerified ? 'bg-[#32BCAD] hover:bg-[#269689] text-slate-900 cursor-pointer shadow-[0_0_15px_rgba(50,188,173,0.3)]' : 'bg-[#32BCAD]/80 hover:bg-[#32BCAD] text-slate-900 cursor-pointer shadow-[0_0_15px_rgba(50,188,173,0.1)]'}`}
                  >
                    {isActivating ? (
                      <><Loader2 size={16} className="animate-spin" /> Enviando...</>
                    ) : (
                      <><CheckCircle size={16} /> Enviar Comprovantes</>
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
