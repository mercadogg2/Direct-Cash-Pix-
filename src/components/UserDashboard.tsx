import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { 
  Users, TrendingUp, Wallet, ShieldCheck, UserCheck, UserPlus, 
  Clock, ArrowDownRight, ArrowUpRight, Copy, Check, MessageCircle, 
  Eye, Download, Printer, Filter, Search, Sparkles, ChevronRight, 
  AlertTriangle, X, Upload, Loader2, QrCode, Activity, Percent,
  Share2, ChevronDown, CheckCircle2, RefreshCw, Award, Crown, Layers, KeyRound
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, query, where, onSnapshot, doc, updateDoc, 
  addDoc, serverTimestamp, getDocs 
} from 'firebase/firestore';
import { generateSimulatedReceiptSvg } from '../lib/receipt';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import WhatsappShareKit from './WhatsappShareKit';
import PixQrModal from './PixQrModal';
import PixKeyCopy from './PixKeyCopy';
import PixKeyConfig from './PixKeyConfig';
import RecentTransactions from './RecentTransactions';

interface DBPayment {
  id: string;
  senderId: string;
  senderName?: string;
  senderPixKey?: string;
  receiverId: string;
  receiverName?: string;
  receiverPixKey?: string;
  receiverWhatsapp?: string;
  receiverAllowWhatsappContact?: boolean;
  amount: number;
  level: number;
  status: 'pending' | 'pending_verification' | 'verified';
  receiptImage?: string;
  createdAt?: any;
}

interface ReferralUser extends User {
  id: string;
}

interface UserDashboardProps {
  user: User;
  onUserUpdate?: (updatedUser: User) => void;
  onNavigateToTransactions?: () => void;
}

export default function UserDashboard({ user, onUserUpdate, onNavigateToTransactions }: UserDashboardProps) {
  const inviteLink = `https://directcash.app/invite/${user.inviteCode}`;
  
  // State for data
  const [directReferrals, setDirectReferrals] = useState<ReferralUser[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(true);
  const [subNetworkCount, setSubNetworkCount] = useState<number>(0);
  
  const [receivedPayments, setReceivedPayments] = useState<DBPayment[]>([]);
  const [sentPayments, setSentPayments] = useState<DBPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  // Filter and search state for referrals list
  const [referralFilter, setReferralFilter] = useState<'all' | 'active' | 'pending'>('all');
  const [referralSearch, setReferralSearch] = useState('');

  // UI state
  const [copiedLink, setCopiedLink] = useState(false);
  const [showWhatsappKit, setShowWhatsappKit] = useState(false);
  const [showPixQrModal, setShowPixQrModal] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // 1. Listen for Direct Referrals
  useEffect(() => {
    if (!user.inviteCode) {
      setLoadingReferrals(false);
      return;
    }

    setLoadingReferrals(true);
    const qReferrals = query(
      collection(db, 'users'),
      where('sponsorCode', '==', user.inviteCode)
    );

    const unsubscribe = onSnapshot(qReferrals, async (snapshot) => {
      const referrals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReferralUser[];

      referrals.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setDirectReferrals(referrals);
      setLoadingReferrals(false);

      // Fetch Level 2 count asynchronously
      try {
        const inviteCodes = referrals.map(r => r.inviteCode).filter(Boolean);
        if (inviteCodes.length > 0) {
          // Firestore 'in' query supports up to 10 elements per batch
          let l2Count = 0;
          for (let i = 0; i < inviteCodes.length; i += 10) {
            const batchCodes = inviteCodes.slice(i, i + 10);
            const qL2 = query(collection(db, 'users'), where('sponsorCode', 'in', batchCodes));
            const l2Snap = await getDocs(qL2);
            l2Count += l2Snap.size;
          }
          setSubNetworkCount(l2Count);
        } else {
          setSubNetworkCount(0);
        }
      } catch (err) {
        console.error("Erro ao calcular nível 2:", err);
      }
    }, (error) => {
      console.error("Erro ao escutar indicados:", error);
      setLoadingReferrals(false);
    });

    return () => unsubscribe();
  }, [user.inviteCode]);

  // 2. Listen for Received & Sent Payments
  useEffect(() => {
    if (!user) return;

    let unsubReceived = () => {};
    let unsubSent = () => {};

    if (user.pixKey) {
      const qReceived = query(
        collection(db, 'payments'),
        where('receiverId', '==', user.pixKey)
      );
      unsubReceived = onSnapshot(qReceived, (snapshot) => {
        const payments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as DBPayment[];

        payments.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });

        setReceivedPayments(payments);
        setLoadingPayments(false);
      }, (error) => {
        console.error("Erro ao escutar pagamentos recebidos:", error);
        setLoadingPayments(false);
      });
    } else {
      setLoadingPayments(false);
    }

    if (user.uid) {
      const qSent = query(
        collection(db, 'payments'),
        where('senderId', '==', user.uid)
      );
      unsubSent = onSnapshot(qSent, (snapshot) => {
        const payments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as DBPayment[];

        payments.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });

        setSentPayments(payments);
      }, (error) => {
        console.error("Erro ao escutar pagamentos enviados:", error);
      });
    }

    return () => {
      unsubReceived();
      unsubSent();
    };
  }, [user]);

  // Calculations for Network Stats & Received Balance
  const totalReferrals = directReferrals.length;
  const activeReferrals = directReferrals.filter(r => r.isActive).length;
  const pendingReferrals = directReferrals.filter(r => !r.isActive).length;
  const activationRate = totalReferrals > 0 ? Math.round((activeReferrals / totalReferrals) * 100) : 0;

  const verifiedPayments = receivedPayments.filter(p => p.status === 'verified');
  const pendingVerificationPayments = receivedPayments.filter(p => p.status === 'pending_verification');
  
  // Saldo Total Recebido (Verified)
  const totalReceivedBalance = verifiedPayments.reduce((sum, p) => sum + (p.amount || 10), 0);
  
  // Saldo Pendente de Validação
  const pendingReceivedBalance = pendingVerificationPayments.reduce((sum, p) => sum + (p.amount || 10), 0);

  // Nível Hierárquico do usuário na rede (1 a 5)
  const hierarchicalLevel = user.level || (
    activeReferrals >= 25 || subNetworkCount >= 100 ? 5 :
    activeReferrals >= 15 || subNetworkCount >= 50 ? 4 :
    activeReferrals >= 10 || subNetworkCount >= 25 ? 3 :
    activeReferrals >= 5 || subNetworkCount >= 5 ? 2 : 1
  );

  const levelInfoMap: Record<number, { title: string; badge: string; color: string; border: string; bg: string; targetText: string; nextTarget: number; progress: number }> = {
    1: {
      title: 'Nível 1 • Doador Ativo',
      badge: 'Iniciante P2P',
      color: 'text-emerald-400',
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10',
      targetText: '5 ativos p/ Nível 2',
      nextTarget: 5,
      progress: Math.min(100, Math.round((activeReferrals / 5) * 100))
    },
    2: {
      title: 'Nível 2 • Expansão Ativa',
      badge: 'Expansão Bronze',
      color: 'text-blue-400',
      border: 'border-blue-500/30',
      bg: 'bg-blue-500/10',
      targetText: '10 ativos p/ Nível 3',
      nextTarget: 10,
      progress: Math.min(100, Math.round((activeReferrals / 10) * 100))
    },
    3: {
      title: 'Nível 3 • Líder de Rede',
      badge: 'Líder Prata',
      color: 'text-purple-400',
      border: 'border-purple-500/30',
      bg: 'bg-purple-500/10',
      targetText: '15 ativos p/ Nível 4',
      nextTarget: 15,
      progress: Math.min(100, Math.round((activeReferrals / 15) * 100))
    },
    4: {
      title: 'Nível 4 • Coordenador Regional',
      badge: 'Coordenador Ouro',
      color: 'text-amber-400',
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
      targetText: '25 ativos p/ Nível 5',
      nextTarget: 25,
      progress: Math.min(100, Math.round((activeReferrals / 25) * 100))
    },
    5: {
      title: 'Nível 5 • Embaixador da Rede',
      badge: 'Embaixador Diamante',
      color: 'text-[#32BCAD]',
      border: 'border-[#32BCAD]/30',
      bg: 'bg-[#32BCAD]/10',
      targetText: 'Nível máximo da rede alcançado!',
      nextTarget: 25,
      progress: 100
    }
  };

  const currentLevel = levelInfoMap[hierarchicalLevel] || levelInfoMap[1];

  // Filtered referrals list for display
  const filteredReferrals = directReferrals.filter(r => {
    if (referralFilter === 'active' && !r.isActive) return false;
    if (referralFilter === 'pending' && r.isActive) return false;
    if (referralSearch.trim()) {
      const queryLower = referralSearch.toLowerCase().trim();
      const matchName = r.name?.toLowerCase().includes(queryLower);
      const matchCode = r.inviteCode?.toLowerCase().includes(queryLower);
      return matchName || matchCode;
    }
    return true;
  });

  // Monthly Donations Chart Data
  const getMonthlyDonationsData = () => {
    const monthsData: { [key: string]: number } = {};
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${monthNames[d.getMonth()]}/${d.getFullYear().toString().substring(2)}`;
      monthsData[monthKey] = 0;
    }

    receivedPayments.forEach(p => {
      if (p.status !== 'verified') return;
      let date = new Date();
      if (p.createdAt?.seconds) {
        date = new Date(p.createdAt.seconds * 1000);
      } else if (p.createdAt instanceof Date) {
        date = p.createdAt;
      }
      const monthKey = `${monthNames[date.getMonth()]}/${date.getFullYear().toString().substring(2)}`;
      if (monthsData[monthKey] !== undefined) {
        monthsData[monthKey] += p.amount || 10;
      }
    });

    return Object.entries(monthsData).map(([name, total]) => ({
      name,
      total
    }));
  };

  const monthlyChartData = getMonthlyDonationsData();
  const currentMonthTotal = monthlyChartData[monthlyChartData.length - 1]?.total || 0;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const triggerMockDonation = async () => {
    setIsSimulating(true);
    try {
      const dateStr = new Date().toLocaleString('pt-BR');
      const mockSenderName = 'Gabriel Santana (Simulado)';
      const mockSvg = generateSimulatedReceiptSvg(
        mockSenderName,
        user.name,
        10,
        dateStr
      );

      await addDoc(collection(db, 'payments'), {
        senderId: 'mock-sender-id',
        senderName: mockSenderName,
        senderPixKey: '11988887777',
        receiverId: user.pixKey,
        receiverName: user.name,
        receiverPixKey: user.pixKey,
        receiptImage: mockSvg,
        amount: 10,
        level: 1,
        status: 'pending_verification',
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Erro ao simular doação:", e);
    } finally {
      setIsSimulating(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Recente';
    const d = new Date(timestamp.seconds * 1000);
    return d.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      
      {/* Top Banner / Welcome & Quick Action */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-[#0a1424] to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#32BCAD]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-[#32BCAD]/10 border border-[#32BCAD]/30 text-[#32BCAD]">
                <Sparkles size={11} /> Painel da Rede P2P
              </span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border ${currentLevel.bg} ${currentLevel.border} ${currentLevel.color}`}>
                <Award size={12} /> Nível Hierárquico: Nível {hierarchicalLevel} ({currentLevel.badge})
              </span>
              <span className="text-xs text-slate-500 font-mono">ID: {user.inviteCode}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-[#32BCAD]">{user.name}</span>
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-xl leading-relaxed">
              Monitore o crescimento dos seus indicados, acompanhe seu saldo total recebido via PIX e gerencie comprovantes com validação peer-to-peer.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={() => copyToClipboard(inviteLink)}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${
                copiedLink 
                  ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                  : 'bg-[#32BCAD] hover:bg-[#269689] text-slate-950 border-transparent shadow-[0_0_15px_rgba(50,188,173,0.25)]'
              }`}
            >
              {copiedLink ? <Check size={15} className="stroke-[3]" /> : <Copy size={15} />}
              <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link de Convite'}</span>
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('pix-key-config-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#32BCAD]/10 hover:bg-[#32BCAD]/20 text-[#32BCAD] border border-[#32BCAD]/30 rounded-2xl text-xs font-bold transition-all cursor-pointer"
              title="Configurar Chave PIX e QR Code"
            >
              <KeyRound size={15} />
              <span className="hidden sm:inline">Configurar PIX</span>
            </button>

            <button
              onClick={() => setShowWhatsappKit(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl text-xs font-bold transition-all cursor-pointer"
              title="Kit de Divulgação para WhatsApp"
            >
              <MessageCircle size={15} />
              <span className="hidden sm:inline">Kit WhatsApp</span>
            </button>

            <button
              onClick={() => setShowPixQrModal(true)}
              className="p-3 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 rounded-2xl transition-all cursor-pointer"
              title="Ver QR Code PIX"
            >
              <QrCode size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* CORE STATS GRID: SALDO TOTAL & ESTATÍSTICAS DA REDE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
        
        {/* Card 1: Saldo Total Recebido */}
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-emerald-500/30 rounded-2xl p-5 relative overflow-hidden shadow-lg group hover:border-emerald-500/50 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400">Saldo Recebido</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-xl lg:text-2xl font-extrabold text-white font-mono tracking-tight">
              R$ {totalReceivedBalance.toFixed(2).replace('.', ',')}
            </h3>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-emerald-400" />
              <span>{verifiedPayments.length} confirmada(s)</span>
            </p>
          </div>
        </div>

        {/* Card 2: Nível Hierárquico na Rede */}
        <div className={`bg-gradient-to-br from-slate-900/90 to-slate-950/90 border ${currentLevel.border} rounded-2xl p-5 relative overflow-hidden shadow-lg group hover:border-[#32BCAD]/50 transition-all`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[11px] font-bold tracking-wider uppercase ${currentLevel.color}`}>Nível Hierárquico</span>
            <div className={`w-10 h-10 rounded-xl ${currentLevel.bg} border ${currentLevel.border} flex items-center justify-center ${currentLevel.color}`}>
              <Award size={20} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl lg:text-2xl font-extrabold text-white font-mono tracking-tight">
                Nível {hierarchicalLevel}
              </h3>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">de 5</span>
            </div>
            <p className={`text-[11px] font-bold ${currentLevel.color} flex items-center gap-1 truncate`}>
              <Crown size={12} /> {currentLevel.badge}
            </p>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-500 to-[#32BCAD] h-full rounded-full transition-all duration-500" 
                style={{ width: `${currentLevel.progress}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-500 pt-0.5 truncate font-mono">
              {currentLevel.targetText}
            </p>
          </div>
        </div>

        {/* Card 3: Número de Indicados na Rede */}
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-[#32BCAD]/30 rounded-2xl p-5 relative overflow-hidden shadow-lg group hover:border-[#32BCAD]/50 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#32BCAD]/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#32BCAD]">Total de Indicados</span>
            <div className="w-10 h-10 rounded-xl bg-[#32BCAD]/10 border border-[#32BCAD]/20 flex items-center justify-center text-[#32BCAD]">
              <Users size={20} />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-xl lg:text-2xl font-extrabold text-white tracking-tight">
              {totalReferrals} <span className="text-xs font-medium text-slate-400">diretos</span>
            </h3>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5 flex-wrap">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> {activeReferrals} ativos
              </span>
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> {pendingReferrals} pend.
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Saldo em Análise / Pendente */}
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-amber-500/25 rounded-2xl p-5 relative overflow-hidden shadow-lg group hover:border-amber-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold tracking-wider uppercase text-amber-400">Para Aprovar</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock size={20} />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-xl lg:text-2xl font-extrabold text-white font-mono tracking-tight">
              R$ {pendingReceivedBalance.toFixed(2).replace('.', ',')}
            </h3>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              {pendingVerificationPayments.length > 0 ? (
                <span className="text-amber-400 font-bold animate-pulse truncate">
                  {pendingVerificationPayments.length} comprovante(s)
                </span>
              ) : (
                <span className="text-slate-500">Sem pendências</span>
              )}
            </p>
          </div>
        </div>

        {/* Card 5: Taxa de Ativação & Sub-rede */}
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-indigo-500/25 rounded-2xl p-5 relative overflow-hidden shadow-lg group hover:border-indigo-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-400">Ativação da Rede</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Percent size={20} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl lg:text-2xl font-extrabold text-white tracking-tight">{activationRate}%</h3>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">conversão</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-[#32BCAD] h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(0, activationRate))}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-500 pt-1 font-mono truncate">
              + {subNetworkCount} membros L2
            </p>
          </div>
        </div>

      </div>

      {/* COMPONENTE DE CONFIGURAÇÃO DE CHAVE PIX & QR CODE */}
      <div id="pix-key-config-section">
        <PixKeyConfig user={user} onUserUpdate={onUserUpdate} />
      </div>

      {/* DETAILED NETWORK & PERFORMANCE SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Chave PIX e Link de Divulgação */}
        <div className="lg:col-span-1 space-y-6">
          <PixKeyCopy
            pixKey={user.pixKey}
            pixType={user.pixType}
            label="Chave PIX Cadastrada"
            variant="card"
            showQrButton={true}
            onQrClick={() => setShowPixQrModal(true)}
          />

          {/* Card Resumo do Link de Convite */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Share2 size={14} className="text-[#32BCAD]" /> Seu Link Direto
              </h4>
              <span className="text-[10px] font-mono text-[#32BCAD] bg-[#32BCAD]/10 px-2 py-0.5 rounded-full border border-[#32BCAD]/20">
                P2P 100%
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Compartilhe seu link para que novos membros se cadastrem diretamente sob sua indicação e façam o PIX inicial para você.
            </p>
            <div className="flex items-center bg-slate-950/60 border border-slate-800 rounded-xl p-1 mb-3">
              <input 
                type="text" 
                readOnly 
                value={inviteLink} 
                className="flex-1 bg-transparent px-3 text-xs text-[#32BCAD] font-mono outline-none truncate" 
              />
              <button 
                onClick={() => copyToClipboard(inviteLink)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  copiedLink ? 'bg-[#32BCAD] text-slate-950' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {copiedLink ? 'Copiado!' : 'Copiar'}
              </button>
            </div>

            <button
              onClick={() => setShowWhatsappKit(true)}
              className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle size={15} />
              Abrir Mensagens Prontas para WhatsApp
            </button>
          </div>

          {/* Card Status da Conta */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-400" /> Segurança & Roteamento
            </h4>
            <div className="space-y-3 text-xs text-slate-400">
              <div className="flex items-center justify-between p-2.5 bg-slate-950/30 rounded-xl border border-slate-850">
                <span className="flex items-center gap-1.5">
                  <Award size={13} className="text-[#32BCAD]" /> Nível Hierárquico:
                </span>
                <span className={`font-bold font-mono px-2 py-0.5 rounded text-[11px] ${currentLevel.bg} ${currentLevel.color} border ${currentLevel.border}`}>
                  Nível {hierarchicalLevel} ({currentLevel.badge})
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-950/30 rounded-xl border border-slate-850">
                <span>Status da Conta:</span>
                <span className="font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Ativa & Segura
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-950/30 rounded-xl border border-slate-850">
                <span>Roteamento P2P:</span>
                <span className="font-bold text-slate-200">Sem intermediários</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-950/30 rounded-xl border border-slate-850">
                <span>Valor por Ciclo L1:</span>
                <span className="font-bold text-[#32BCAD] font-mono">R$ 10,00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Chart & Lista de Indicados da Rede */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Gráfico de Evolução Financeira */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#32BCAD]/10 text-[#32BCAD] rounded-xl border border-[#32BCAD]/20">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-white tracking-tight">Evolução dos Recebimentos</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Histórico mensal de doações confirmadas via PIX P2P</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-slate-950/50 border border-slate-800 px-3.5 py-1.5 rounded-xl">
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest block">Mês Atual</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    R$ {currentMonthTotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="userDashTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#32BCAD" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#32BCAD" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                    axisLine={{ stroke: '#334155', opacity: 0.5 }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                    axisLine={{ stroke: '#334155', opacity: 0.5 }}
                    tickLine={false}
                    tickFormatter={(val) => `R$${val}`}
                  />
                  <Tooltip 
                    content={({ active, payload, label }: any) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl shadow-xl">
                            <p className="text-[10px] text-slate-500 uppercase font-bold font-mono">{label}</p>
                            <p className="text-sm font-black text-[#32BCAD] mt-1 font-mono">
                              R$ {payload[0].value.toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#32BCAD" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#userDashTotal)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* LISTA DE INDICADOS DA REDE */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#32BCAD]/10 text-[#32BCAD] rounded-xl border border-[#32BCAD]/20">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-white tracking-tight">Meus Indicados da Rede</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Lista de membros cadastrados com o seu link de convite</p>
                </div>
              </div>

              {/* Filtros de Indicados */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-44">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar indicado..."
                    value={referralSearch}
                    onChange={(e) => setReferralSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-[#32BCAD]"
                  />
                </div>

                <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-800 shrink-0">
                  <button
                    onClick={() => setReferralFilter('all')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      referralFilter === 'all' ? 'bg-[#32BCAD] text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todos ({totalReferrals})
                  </button>
                  <button
                    onClick={() => setReferralFilter('active')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      referralFilter === 'active' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Ativos ({activeReferrals})
                  </button>
                  <button
                    onClick={() => setReferralFilter('pending')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      referralFilter === 'pending' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Pendentes ({pendingReferrals})
                  </button>
                </div>
              </div>
            </div>

            {/* Conteúdo da Lista de Indicados */}
            <div className="mt-4">
              {loadingReferrals ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="animate-spin text-[#32BCAD]" size={28} />
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">Carregando indicados da rede...</p>
                </div>
              ) : filteredReferrals.length === 0 ? (
                <div className="text-center py-10 bg-slate-950/20 rounded-xl border border-slate-800/50 flex flex-col items-center gap-3">
                  <Users size={32} className="text-slate-600" />
                  <div>
                    <h5 className="font-bold text-white text-sm">
                      {referralSearch || referralFilter !== 'all' ? 'Nenhum indicado encontrado com esses filtros' : 'Nenhum indicado direto cadastrado ainda'}
                    </h5>
                    <p className="text-slate-400 text-xs mt-1 max-w-sm px-4">
                      {referralSearch || referralFilter !== 'all' 
                        ? 'Tente ajustar os filtros ou limpar o termo de busca.' 
                        : 'Compartilhe seu link de convite para cadastrar seus primeiros parceiros e receber R$ 10,00 de cada um.'}
                    </p>
                  </div>
                  {!referralSearch && referralFilter === 'all' && (
                    <button
                      onClick={() => copyToClipboard(inviteLink)}
                      className="px-4 py-2 bg-[#32BCAD]/10 border border-[#32BCAD]/30 text-[#32BCAD] hover:bg-[#32BCAD]/20 rounded-xl text-xs font-bold transition-all cursor-pointer mt-1"
                    >
                      Copiar Link de Convite
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto pr-1">
                  {filteredReferrals.map((referral) => (
                    <div key={referral.id} className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-900/30 px-2 rounded-xl transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-[#32BCAD] font-bold text-xs shrink-0">
                          {referral.name ? referral.name.substring(0, 2).toUpperCase() : 'ME'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-white truncate">{referral.name}</h4>
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded">
                              {referral.inviteCode || 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span>Cadastro: {formatDate(referral.createdAt)}</span>
                            {referral.pixKey && (
                              <span className="text-slate-500 font-mono truncate hidden sm:inline">• PIX: {referral.pixKey}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {referral.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 border border-amber-500/30 text-amber-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> Pendente
                          </span>
                        )}

                        {/* WhatsApp Contact Action */}
                        {referral.whatsapp && (
                          <a
                            href={`https://wa.me/${referral.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                              referral.isActive 
                                ? `Olá ${referral.name}! Vi que você já está ativo na minha rede do Direct Cash. Parabéns! Vamos expandir juntos?`
                                : `Olá ${referral.name}! Vi seu cadastro no Direct Cash. Precisa de ajuda para concluir sua doação via PIX e ativar sua conta?`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/20 transition-all cursor-pointer"
                            title="Conversar no WhatsApp"
                          >
                            <MessageCircle size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* HISTÓRICO DE COMPROVANTES & TRANSAÇÕES RECENTES */}
      <RecentTransactions 
        user={user} 
        title="Transações Recentes & Comprovantes" 
        subtitle="Acompanhamento detalhado das doações enviadas e recebidas via PIX P2P com status e valor"
        onViewAll={onNavigateToTransactions}
      />

      {/* Admin / Simulation Tool */}
      {user.isAdmin && (
        <div className="flex justify-end pt-4 border-t border-slate-800/50">
          <button 
            onClick={triggerMockDonation}
            disabled={isSimulating}
            className="text-[10px] uppercase font-bold tracking-widest bg-slate-900/60 text-slate-400 hover:text-white px-4 py-2 rounded-xl flex items-center gap-2 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw size={12} className={isSimulating ? 'animate-spin' : ''} />
            {isSimulating ? 'Gerando Doação Simulada...' : 'Simular Nova Doação PIX (Admin/Debug)'}
          </button>
        </div>
      )}

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

export { UserDashboard };
