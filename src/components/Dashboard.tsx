import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { 
  Copy, Link as LinkIcon, QrCode, ArrowDownRight, Wallet, Bug, TrendingUp, 
  Users, ShieldCheck, Activity, FileText, Eye, Upload, X, Clock, AlertTriangle, 
  Check, CheckSquare, Image as ImageIcon, Loader2, MessageCircle, Share2, Download, Printer, Sparkles
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { generateSimulatedReceiptSvg } from '../lib/receipt';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import WhatsappShareKit from './WhatsappShareKit';
import PixQrModal from './PixQrModal';
import PixKeyCopy from './PixKeyCopy';
import { exportToCSV, printStatementReport } from '../utils/exportReport';

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
  receiptImage?: string; // base64 or SVG data URL
  createdAt?: any;
}

export default function Dashboard({ user }: { user: User }) {
  const inviteLink = `https://directcash.app/invite/${user.inviteCode}`;
  const [isSimulating, setIsSimulating] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Modal States for New Features
  const [showWhatsappKit, setShowWhatsappKit] = useState(false);
  const [showPixQrModal, setShowPixQrModal] = useState(false);
  
  // Payments State
  const [receivedPayments, setReceivedPayments] = useState<DBPayment[]>([]);
  const [sentPayments, setSentPayments] = useState<DBPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  
  // UI Tabs and Modal States
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [selectedPayment, setSelectedPayment] = useState<DBPayment | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Real-time Database listeners
  useEffect(() => {
    if (!user) return;

    let unsubReceived = () => {};
    let unsubSent = () => {};

    if (user.pixKey) {
      // Listener for received payments (to the user's PIX key)
      const qReceived = query(
        collection(db, 'payments'),
        where('receiverId', '==', user.pixKey)
      );
      unsubReceived = onSnapshot(qReceived, (snapshot) => {
        const payments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as DBPayment[];
        // Sort in memory by createdAt descending
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
      // Listener for sent payments (by the user's UID)
      const qSent = query(
        collection(db, 'payments'),
        where('senderId', '==', user.uid)
      );
      unsubSent = onSnapshot(qSent, (snapshot) => {
        const payments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as DBPayment[];
        // Sort in memory by createdAt descending
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const triggerMockDonation = async () => {
    setIsSimulating(true);
    try {
      const dateStr = new Date().toLocaleString('pt-BR');
      const mockSenderName = 'Carlos Eduardo (Simulado)';
      const mockSvg = generateSimulatedReceiptSvg(
        mockSenderName,
        user.name,
        10,
        dateStr
      );

      await addDoc(collection(db, 'payments'), {
        senderId: 'mock-sender-id',
        senderName: mockSenderName,
        senderPixKey: '11988888888',
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
      console.error("Erro ao criar doação simulada:", e);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleUpdateStatus = async (paymentId: string, newStatus: 'verified' | 'pending') => {
    try {
      const paymentDocRef = doc(db, 'payments', paymentId);
      await updateDoc(paymentDocRef, {
        status: newStatus
      });
      // Synchronize in-modal view
      setSelectedPayment(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (err) {
      console.error("Erro ao atualizar status do pagamento:", err);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, paymentId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800000) {
      alert("O arquivo de imagem do comprovante é muito grande. Escolha uma imagem de até 800KB.");
      return;
    }

    setUploadingId(paymentId);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const paymentDocRef = doc(db, 'payments', paymentId);
        await updateDoc(paymentDocRef, {
          receiptImage: base64String,
          status: 'pending_verification'
        });
        
        // Update selection locally if modal is open
        setSelectedPayment(prev => prev ? { ...prev, receiptImage: base64String, status: 'pending_verification' } : null);
      } catch (err) {
        console.error("Erro ao salvar comprovante:", err);
      } finally {
        setUploadingId(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Calculations
  const verifiedReceived = receivedPayments.filter(p => p.status === 'verified');
  const totalEarned = verifiedReceived.length * 10;
  const activeNetworkCount = verifiedReceived.length;

  // Recharts Monthly Donations parsing
  const getMonthlyDonationsData = () => {
    const monthsData: { [key: string]: number } = {};
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    const now = new Date();
    // Initialize last 6 months with 0
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${monthNames[d.getMonth()]}/${d.getFullYear().toString().substring(2)}`;
      monthsData[monthKey] = 0;
    }

    // Populate with real payments
    receivedPayments.forEach(p => {
      if (p.status !== 'verified') return;
      
      let date = new Date();
      if (p.createdAt && typeof p.createdAt.seconds === 'number') {
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

  const monthlyData = getMonthlyDonationsData();
  const currentMonthTotal = monthlyData[monthlyData.length - 1]?.total || 0;

  // Recharts Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl shadow-xl">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider font-mono">{label}</p>
          <p className="text-sm font-black text-[#32BCAD] mt-1 font-mono">
            R$ {payload[0].value.toFixed(2).replace('.', ',')}
          </p>
        </div>
      );
    }
    return null;
  };

  const nextReceivers = [
    { level: 1, name: user.name, pixKey: user.pixKey },
    { level: 2, name: 'Patrocinador Direto', pixKey: '***.456.789-**' },
    { level: 3, name: 'Maria Silva', pixKey: 'mar***@email.com' },
    { level: 4, name: 'Carlos Santos', pixKey: '***.456.789-**' },
    { level: 5, name: 'Ana Oliveira', pixKey: 'ana***@pix.com.br' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            title: 'Ganhos Acumulados', 
            value: `R$ ${totalEarned.toFixed(2).replace('.', ',')}`, 
            icon: TrendingUp, 
            color: 'text-emerald-400', 
            bg: 'bg-emerald-400/10' 
          },
          { 
            title: 'Rede Ativa (Doadores)', 
            value: `${activeNetworkCount} pessoa${activeNetworkCount !== 1 ? 's' : ''}`, 
            icon: Users, 
            color: 'text-blue-400', 
            bg: 'bg-blue-400/10' 
          },
          { 
            title: 'Nível Atual', 
            value: '1', 
            icon: Activity, 
            color: 'text-purple-400', 
            bg: 'bg-purple-400/10' 
          },
          { 
            title: 'Status da Conta', 
            value: 'Ativa & Verificada', 
            icon: ShieldCheck, 
            color: 'text-[#32BCAD]', 
            bg: 'bg-[#32BCAD]/10' 
          },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex items-center gap-4 hover:border-slate-700 transition-colors">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={22} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">{stat.title}</p>
              <h4 className="text-lg font-bold text-white mt-1 tracking-tight">{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Link & PIX */}
        <div className="lg:col-span-1 space-y-6">
          {/* Invite Link Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-[#32BCAD]/30 rounded-2xl p-6 relative overflow-hidden shadow-[0_8px_30px_rgba(50,188,173,0.05)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#32BCAD]/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="flex items-center justify-between mb-5 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#32BCAD]/10 text-[#32BCAD] rounded-xl border border-[#32BCAD]/20">
                  <LinkIcon size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-white tracking-tight">Link de Expansão</h3>
                  <p className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Compartilhe sua rede</p>
                </div>
              </div>
            </div>

            <div className="flex items-center bg-slate-950/50 border border-slate-700/50 rounded-xl p-1 relative z-10 mb-3">
              <input type="text" readOnly value={inviteLink} className="flex-1 bg-transparent px-3 text-xs text-[#32BCAD] font-mono outline-none w-full" />
              <button 
                onClick={() => copyToClipboard(inviteLink)} 
                className={`p-2 rounded-lg transition-all text-xs font-bold px-4 flex items-center gap-2 cursor-pointer ${copied ? 'bg-[#32BCAD] text-slate-900' : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'}`}
              >
                {copied ? 'COPIADO!' : <><Copy size={14} /> COPIAR</>}
              </button>
            </div>

            <button
              onClick={() => setShowWhatsappKit(true)}
              className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer relative z-10"
            >
              <MessageCircle size={15} />
              Kit de Divulgação WhatsApp
            </button>
          </div>

          {/* My Pix Key Card */}
          <PixKeyCopy
            pixKey={user.pixKey}
            pixType={user.pixType}
            label="Carteira de Recebimento PIX"
            variant="card"
            showQrButton={true}
            onQrClick={() => setShowPixQrModal(true)}
          />
        </div>

        {/* Right Column: Receivers List */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 h-full shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-slate-800/80 text-[#32BCAD] rounded-xl border border-slate-700/50">
                <Wallet size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white tracking-tight">Smart Contract Routing</h3>
                <p className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Previsão de roteamento de pagamentos para novos indicados</p>
              </div>
            </div>

            <div className="space-y-3">
              {nextReceivers.map((r, idx) => (
                <div key={r.level} className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${idx === 0 ? 'bg-gradient-to-br from-[#32BCAD] to-[#269689] text-slate-900 shadow-[0_0_15px_rgba(50,188,173,0.3)]' : 'bg-slate-800 border border-slate-700 text-slate-400'}`}>
                    L{r.level}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-slate-200 flex flex-wrap items-center gap-2 tracking-wide">
                      <span className="truncate">{r.name}</span>
                      {idx === 0 && (
                        <span className="text-[9px] bg-[#32BCAD]/20 border border-[#32BCAD]/30 text-[#32BCAD] px-2 py-0.5 rounded-full uppercase font-bold tracking-widest whitespace-nowrap">
                          VOCÊ (Primário)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">{r.pixKey}</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#32BCAD] font-bold text-sm bg-[#32BCAD]/10 px-3 py-1.5 rounded-lg border border-[#32BCAD]/20">
                    <ArrowDownRight size={16} /> R$ 10,00
                  </div>
                </div>
              ))}
            </div>
            
            <p className="text-[11px] text-slate-500 mt-5 text-center px-4">
              <ShieldCheck size={12} className="inline mr-1 -mt-0.5" />
              Os pagamentos são processados diretamente entre as contas via PIX P2P. A plataforma não retém fundos.
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Donations Performance Chart */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#32BCAD]/10 text-[#32BCAD] rounded-xl border border-[#32BCAD]/20">
              <TrendingUp size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white tracking-tight">Desempenho de Recebimentos</h3>
              <p className="text-slate-400 text-xs mt-0.5">Visão mensal das doações confirmadas via PIX P2P</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-slate-950/40 border border-slate-800 px-4 py-2 rounded-xl">
              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest block">Este Mês</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">R$ {currentMonthTotal.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="bg-slate-950/40 border border-slate-800 px-4 py-2 rounded-xl">
              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest block">Média Mensal</span>
              <span className="text-sm font-bold text-[#32BCAD] font-mono">
                R$ {(monthlyData.reduce((acc, curr) => acc + curr.total, 0) / monthlyData.length).toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        </div>

        {/* Chart Canvas Container */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={monthlyData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#32BCAD" stopOpacity={0.2}/>
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
                tickFormatter={(value) => `R$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="#32BCAD" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorTotal)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Proof of Payments & Receipts Section */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#32BCAD]/10 text-[#32BCAD] rounded-xl border border-[#32BCAD]/20">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white tracking-tight">Histórico de Comprovantes</h3>
              <p className="text-slate-400 text-xs mt-0.5">Gerenciamento e verificação de transferências P2P</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
            {/* Export Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportToCSV(
                  activeTab === 'received' ? receivedPayments : sentPayments,
                  user.name,
                  activeTab === 'received' ? 'recebimentos' : 'enviados'
                )}
                title="Exportar planilha CSV para Excel"
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-2 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download size={13} className="text-[#32BCAD]" />
                CSV
              </button>

              <button
                onClick={() => printStatementReport(
                  activeTab === 'received' ? receivedPayments : sentPayments,
                  user.name,
                  totalEarned
                )}
                title="Gerar extrato impresso / PDF"
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-2 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Printer size={13} className="text-emerald-400" />
                Imprimir
              </button>
            </div>

            {/* Navigation Tab bar */}
            <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('received')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'received' ? 'bg-[#32BCAD] text-slate-900 shadow-[0_0_10px_rgba(50,188,173,0.15)]' : 'text-slate-400 hover:text-white'}`}
              >
                Doações Recebidas
                {receivedPayments.filter(p => p.status === 'pending_verification').length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'sent' ? 'bg-[#32BCAD] text-slate-900 shadow-[0_0_10px_rgba(50,188,173,0.15)]' : 'text-slate-400 hover:text-white'}`}
              >
                Doações Enviadas
              </button>
            </div>
          </div>
        </div>

        {/* Loading Indicator */}
        {loadingPayments ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="animate-spin text-[#32BCAD]" size={32} />
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">Buscando Comprovantes...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeTab === 'received' ? (
              // Received Payments
              receivedPayments.length === 0 ? (
                <div className="text-center py-10 bg-slate-950/20 rounded-xl border border-slate-800/50 flex flex-col items-center gap-2.5">
                  <Clock size={28} className="text-slate-600" />
                  <p className="text-slate-400 text-xs font-medium">Nenhum comprovante recebido ainda.</p>
                  <p className="text-slate-600 text-[11px] max-w-sm px-6">Quando novos indicados da sua rede efetuarem transferências para você, os comprovantes de PIX aparecerão aqui para verificação.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {receivedPayments.map((p) => (
                    <div key={p.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-950/20 border border-slate-800/80 rounded-xl hover:border-slate-700/80 transition-all gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#32BCAD]/10 border border-[#32BCAD]/20 flex items-center justify-center text-[#32BCAD]">
                          <ArrowDownRight size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white flex items-center gap-2.5">
                            {p.senderName || 'Membro do Sistema'}
                            <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono uppercase tracking-wider">Level {p.level}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5 select-all">PIX origem: {p.senderPixKey || 'Não identificada'}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 border-slate-800/50 pt-3 sm:pt-0">
                        <div className="text-left sm:text-right">
                          <p className="text-sm font-bold text-emerald-400 font-mono">R$ 10,00</p>
                          <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                            {p.createdAt ? new Date(p.createdAt.seconds * 1000).toLocaleString('pt-BR') : 'Agora'}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          {p.status === 'verified' ? (
                            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] tracking-widest uppercase shadow-[0_0_10px_rgba(16,185,129,0.05)]">
                              Confirmado
                            </span>
                          ) : p.status === 'pending_verification' ? (
                            <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[10px] tracking-widest uppercase animate-pulse">
                              Aprovar PIX
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-[10px] tracking-widest uppercase">
                              Pendente
                            </span>
                          )}

                          <button
                            onClick={() => setSelectedPayment(p)}
                            className="p-2 bg-slate-800/80 hover:bg-[#32BCAD] text-slate-300 hover:text-slate-900 rounded-lg border border-slate-700/50 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold px-3.5"
                          >
                            <Eye size={13} /> Ver
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              // Sent Payments
              sentPayments.length === 0 ? (
                <div className="text-center py-10 bg-slate-950/20 rounded-xl border border-slate-800/50 flex flex-col items-center gap-2.5">
                  <CheckSquare size={28} className="text-slate-600" />
                  <p className="text-slate-400 text-xs font-medium">Nenhum comprovante enviado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {sentPayments.map((p) => (
                    <div key={p.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-950/20 border border-slate-800/80 rounded-xl hover:border-slate-700/80 transition-all gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-[#32BCAD]">
                          <ArrowDownRight size={18} className="rotate-180" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white flex items-center gap-2.5">
                            {p.receiverName || 'Membro do Sistema'}
                            <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono uppercase tracking-wider">L{p.level}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5 select-all">Chave PIX: {p.receiverPixKey || p.receiverId}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 border-slate-800/50 pt-3 sm:pt-0">
                        <div className="text-left sm:text-right">
                          <p className="text-sm font-bold text-emerald-400 font-mono">R$ 10,00</p>
                          <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                            {p.createdAt ? new Date(p.createdAt.seconds * 1000).toLocaleString('pt-BR') : 'Recent'}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          {p.status === 'verified' ? (
                            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] tracking-widest uppercase">
                              Aceito
                            </span>
                          ) : p.status === 'pending_verification' ? (
                            <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[10px] tracking-widest uppercase">
                              Análise
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-[10px] tracking-widest uppercase">
                              Pendente
                            </span>
                          )}

                          {p.status !== 'verified' && p.receiverWhatsapp && p.receiverAllowWhatsappContact !== false && (
                            <a
                              href={`https://wa.me/${p.receiverWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                                `Olá! Eu sou o(a) ${user.name} e acabei de transferir R$ 10,00 via PIX para você no Direct Cash (Nível ${p.level}). Já enviei o comprovante no sistema. Poderia verificar e aprovar minha conta? Obrigado!`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Notificar recebimento via WhatsApp"
                              className="p-2 bg-emerald-500/10 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg border border-emerald-500/20 hover:border-transparent transition-colors cursor-pointer flex items-center justify-center gap-1 text-xs font-bold px-3"
                            >
                              <MessageCircle size={13} />
                              <span className="hidden sm:inline">Notificar</span>
                            </a>
                          )}

                          <button
                            onClick={() => setSelectedPayment(p)}
                            className="p-2 bg-slate-800/80 hover:bg-[#32BCAD] text-slate-300 hover:text-slate-900 rounded-lg border border-slate-700/50 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold px-3.5"
                          >
                            <Eye size={13} /> Recibo
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Admin / Debug Controls */}
      {user.isAdmin && (
        <div className="flex justify-end pt-4 border-t border-slate-800/50">
          <button 
            onClick={triggerMockDonation}
            disabled={isSimulating}
            className="text-[10px] uppercase font-bold tracking-widest bg-slate-900/50 text-slate-500 hover:text-slate-300 px-4 py-2 rounded-lg flex items-center gap-2 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
          >
            <Bug size={14} />
            {isSimulating ? 'AGUARDE...' : 'SIMULAR DOAÇÃO ENTRANTE (DEBUG)'}
          </button>
        </div>
      )}

      {/* Detail Receipt Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative max-h-[92vh] overflow-y-auto custom-scrollbar">
            {/* Modal Close Button */}
            <button 
              onClick={() => setSelectedPayment(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
            
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Detalhamento do Comprovante</h3>
            
            {/* Visual Receipt Viewbox */}
            <div className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center min-h-[300px] mb-4 relative p-1.5 shadow-inner">
              {selectedPayment.receiptImage ? (
                <img 
                  src={selectedPayment.receiptImage} 
                  alt="Comprovante de Transferência PIX" 
                  className="w-full h-auto object-contain rounded-xl max-h-[460px] shadow-sm select-none" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <ImageIcon className="text-slate-600 mx-auto" size={36} />
                  <p className="text-xs text-slate-400 font-medium">Nenhum comprovante visual foi anexado.</p>
                  <p className="text-[10px] text-slate-600">Por favor, selecione um comprovante abaixo para anexar.</p>
                </div>
              )}
            </div>

            {/* Attachment Dropzone for Sent Payments */}
            {selectedPayment.senderId === user.uid && (
              <div className="mb-5">
                <label className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-750 border border-slate-700/60 hover:border-slate-600 text-slate-300 hover:text-white rounded-xl cursor-pointer transition-all text-xs font-bold shadow-sm">
                  {uploadingId === selectedPayment.id ? (
                    <><Loader2 className="animate-spin text-[#32BCAD]" size={14} /> Salvando comprovante...</>
                  ) : (
                    <><Upload size={14} /> {selectedPayment.receiptImage ? 'Substituir Comprovante' : 'Anexar Imagem Comprovante'}</>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    disabled={uploadingId !== null}
                    className="hidden" 
                    onChange={(e) => handleFileChange(e, selectedPayment.id)} 
                  />
                </label>
              </div>
            )}

            {/* Actions for Receiver */}
            {selectedPayment.receiverId === user.pixKey && selectedPayment.status !== 'verified' && (
              <div className="space-y-3.5 pt-4 border-t border-slate-800/80">
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5">
                  <AlertTriangle className="text-amber-400 shrink-0 mt-0.5 animate-pulse" size={16} />
                  <p className="text-[11px] leading-relaxed text-amber-300/90 font-medium">
                    Confirme em seu aplicativo do banco se o valor de <strong>R$ 10,00</strong> realmente caiu em sua conta PIX antes de validar o cadastro do usuário.
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedPayment.id, 'verified')}
                    className="flex-1 bg-[#32BCAD] hover:bg-[#269689] text-slate-900 font-bold uppercase tracking-widest text-xs py-4 rounded-xl cursor-pointer shadow-[0_0_15px_rgba(50,188,173,0.3)] hover:shadow-[0_0_20px_rgba(50,188,173,0.4)] transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={14} className="stroke-[3]" /> Confirmar Pagamento
                  </button>
                </div>
              </div>
            )}

            {/* Visual Indicator of Verified Success */}
            {selectedPayment.status === 'verified' && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-widest shadow-sm mt-3">
                <ShieldCheck size={16} /> Transação Confirmada
              </div>
            )}
          </div>
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
