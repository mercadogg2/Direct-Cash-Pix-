import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../types';
import { 
  ArrowDownRight, ArrowUpRight, ArrowLeftRight, Clock, CheckCircle2, 
  AlertTriangle, Eye, Download, Printer, Search, Filter, X, Upload, 
  Loader2, Check, FileText, Wallet, ShieldCheck, RefreshCw, MessageCircle
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { exportToCSV, printStatementReport } from '../utils/exportReport';

export interface TransactionItem {
  id: string;
  type: 'received' | 'sent';
  counterpartyName: string;
  counterpartyPixKey?: string;
  counterpartyWhatsapp?: string;
  amount: number;
  level: number;
  status: 'pending' | 'pending_verification' | 'verified';
  receiptImage?: string;
  createdAt?: any;
  senderId?: string;
  receiverId?: string;
}

interface RecentTransactionsProps {
  user: User;
  limitCount?: number;
  showFilters?: boolean;
  title?: string;
  subtitle?: string;
  onViewAll?: () => void;
}

export default function RecentTransactions({
  user,
  limitCount,
  showFilters = true,
  title = "Transações Recentes",
  subtitle = "Acompanhamento em tempo real das doações enviadas e recebidas via PIX P2P"
}: RecentTransactionsProps) {
  const [receivedTransactions, setReceivedTransactions] = useState<TransactionItem[]>([]);
  const [sentTransactions, setSentTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [typeFilter, setTypeFilter] = useState<'all' | 'received' | 'sent'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending_verification' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Real-time Firestore Listeners
  useEffect(() => {
    if (!user) return;

    let unsubReceived = () => {};
    let unsubSent = () => {};

    // 1. Escutar doações recebidas
    if (user.pixKey) {
      const qReceived = query(
        collection(db, 'payments'),
        where('receiverId', '==', user.pixKey)
      );
      unsubReceived = onSnapshot(qReceived, (snapshot) => {
        const items = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            type: 'received' as const,
            counterpartyName: data.senderName || 'Doador da Rede',
            counterpartyPixKey: data.senderPixKey || '',
            amount: data.amount || 10,
            level: data.level || 1,
            status: data.status || 'pending',
            receiptImage: data.receiptImage,
            createdAt: data.createdAt,
            senderId: data.senderId,
            receiverId: data.receiverId
          };
        });
        setReceivedTransactions(items);
        setLoading(false);
      }, (error) => {
        console.error("Erro ao escutar transações recebidas:", error);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

    // 2. Escutar doações enviadas
    if (user.uid) {
      const qSent = query(
        collection(db, 'payments'),
        where('senderId', '==', user.uid)
      );
      unsubSent = onSnapshot(qSent, (snapshot) => {
        const items = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            type: 'sent' as const,
            counterpartyName: data.receiverName || 'Patrocinador',
            counterpartyPixKey: data.receiverPixKey || data.receiverId || '',
            counterpartyWhatsapp: data.receiverWhatsapp,
            amount: data.amount || 10,
            level: data.level || 1,
            status: data.status || 'pending',
            receiptImage: data.receiptImage,
            createdAt: data.createdAt,
            senderId: data.senderId,
            receiverId: data.receiverId
          };
        });
        setSentTransactions(items);
      }, (error) => {
        console.error("Erro ao escutar transações enviadas:", error);
      });
    }

    return () => {
      unsubReceived();
      unsubSent();
    };
  }, [user]);

  // Combine and sort all transactions descending
  const allTransactions = useMemo(() => {
    const combined = [...receivedTransactions, ...sentTransactions];
    combined.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
    return combined;
  }, [receivedTransactions, sentTransactions]);

  // Calculated Totals
  const totalReceivedConfirmed = useMemo(() => {
    return receivedTransactions
      .filter(t => t.status === 'verified')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [receivedTransactions]);

  const totalSentConfirmed = useMemo(() => {
    return sentTransactions
      .filter(t => t.status === 'verified')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [sentTransactions]);

  const pendingApprovalsCount = useMemo(() => {
    return receivedTransactions.filter(t => t.status === 'pending_verification').length;
  }, [receivedTransactions]);

  // Filtered List
  const filteredTransactions = useMemo(() => {
    let result = allTransactions;

    if (typeFilter !== 'all') {
      result = result.filter(t => t.type === typeFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter(t => t.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(t => 
        t.counterpartyName.toLowerCase().includes(q) ||
        (t.counterpartyPixKey && t.counterpartyPixKey.toLowerCase().includes(q))
      );
    }

    if (limitCount && limitCount > 0) {
      result = result.slice(0, limitCount);
    }

    return result;
  }, [allTransactions, typeFilter, statusFilter, searchQuery, limitCount]);

  // Approving a payment
  const handleApprovePayment = async (txId: string) => {
    try {
      const paymentRef = doc(db, 'payments', txId);
      await updateDoc(paymentRef, {
        status: 'verified'
      });
      if (selectedTx && selectedTx.id === txId) {
        setSelectedTx(prev => prev ? { ...prev, status: 'verified' } : null);
      }
    } catch (err) {
      console.error("Erro ao aprovar pagamento:", err);
    }
  };

  // Upload receipt file for sent payments
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, txId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800000) {
      alert("O arquivo é muito grande. Escolha uma imagem de até 800KB.");
      return;
    }

    setUploadingId(txId);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const paymentRef = doc(db, 'payments', txId);
        await updateDoc(paymentRef, {
          receiptImage: base64,
          status: 'pending_verification'
        });
        if (selectedTx && selectedTx.id === txId) {
          setSelectedTx(prev => prev ? { ...prev, receiptImage: base64, status: 'pending_verification' } : null);
        }
      } catch (err) {
        console.error("Erro ao salvar comprovante:", err);
      } finally {
        setUploadingId(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return 'Agora';
    if (ts.seconds) {
      return new Date(ts.seconds * 1000).toLocaleString('pt-BR');
    }
    if (ts instanceof Date) {
      return ts.toLocaleString('pt-BR');
    }
    return 'Recente';
  };

  // Export functions mapped
  const handleExportCSV = () => {
    const reportData = filteredTransactions.map(t => ({
      id: t.id,
      senderName: t.type === 'received' ? t.counterpartyName : user.name,
      receiverName: t.type === 'sent' ? t.counterpartyName : user.name,
      amount: t.amount,
      level: t.level,
      status: t.status,
      createdAt: t.createdAt
    }));
    exportToCSV(reportData, user.name, typeFilter === 'sent' ? 'enviados' : 'recebimentos');
  };

  const handlePrint = () => {
    const reportData = filteredTransactions.map(t => ({
      id: t.id,
      senderName: t.type === 'received' ? t.counterpartyName : user.name,
      receiverName: t.type === 'sent' ? t.counterpartyName : user.name,
      amount: t.amount,
      level: t.level,
      status: t.status,
      createdAt: t.createdAt
    }));
    printStatementReport(reportData, user.name, totalReceivedConfirmed);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      
      {/* Top Header Card */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#32BCAD]/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#32BCAD]/10 border border-[#32BCAD]/20 flex items-center justify-center text-[#32BCAD] shadow-sm">
              <ArrowLeftRight size={24} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">{title}</h2>
              <p className="text-slate-400 text-xs md:text-sm mt-0.5">{subtitle}</p>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="bg-slate-950/60 border border-emerald-500/30 px-3.5 py-2 rounded-xl flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
              <div>
                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Entradas PIX</p>
                <p className="text-sm font-black text-emerald-400 font-mono">
                  R$ {totalReceivedConfirmed.toFixed(2).replace('.', ',')}
                </p>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 px-3.5 py-2 rounded-xl flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-slate-400"></div>
              <div>
                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Saídas PIX</p>
                <p className="text-sm font-black text-slate-300 font-mono">
                  R$ {totalSentConfirmed.toFixed(2).replace('.', ',')}
                </p>
              </div>
            </div>

            {pendingApprovalsCount > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 rounded-xl flex items-center gap-2.5 animate-pulse">
                <Clock size={16} className="text-amber-400" />
                <div>
                  <p className="text-[9px] text-amber-300 uppercase font-bold tracking-wider">Para Aprovar</p>
                  <p className="text-sm font-black text-amber-400 font-mono">
                    {pendingApprovalsCount} pendente{pendingApprovalsCount > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Export */}
      {showFilters && (
        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nome ou chave PIX..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-[#32BCAD] transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 justify-between md:justify-end">
            
            {/* Type Filter Buttons */}
            <div className="flex bg-slate-950/70 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  typeFilter === 'all' ? 'bg-[#32BCAD] text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Todas ({allTransactions.length})
              </button>
              <button
                onClick={() => setTypeFilter('received')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  typeFilter === 'received' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowDownRight size={13} /> Recebidas ({receivedTransactions.length})
              </button>
              <button
                onClick={() => setTypeFilter('sent')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  typeFilter === 'sent' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowUpRight size={13} /> Enviadas ({sentTransactions.length})
              </button>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-950/70 text-slate-300 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-[#32BCAD] cursor-pointer"
            >
              <option value="all">Todos os Status</option>
              <option value="verified">Apenas Confirmadas</option>
              <option value="pending_verification">Aguardando Aprovação</option>
              <option value="pending">Apenas Pendentes</option>
            </select>

            {/* Export Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                title="Exportar como CSV para Excel"
                className="p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                <Download size={14} />
              </button>
              <button
                onClick={handlePrint}
                title="Imprimir relatório oficial"
                className="p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                <Printer size={14} />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Main Transactions List */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="animate-spin text-[#32BCAD]" size={32} />
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">Carregando transações PIX...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-16 bg-slate-950/20 rounded-2xl border border-slate-850 flex flex-col items-center gap-3">
            <Wallet size={36} className="text-slate-600" />
            <h4 className="font-bold text-white text-sm">Nenhuma transação encontrada</h4>
            <p className="text-slate-500 text-xs max-w-sm px-4">
              {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'Nenhum resultado corresponde aos filtros selecionados. Tente redefinir a busca.'
                : 'Quando doações forem enviadas ou recebidas via PIX na sua rede, elas aparecerão listadas em tempo real aqui.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((tx) => {
              const isReceived = tx.type === 'received';

              return (
                <div
                  key={tx.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4.5 bg-slate-950/30 border border-slate-800/80 rounded-2xl hover:border-slate-700 hover:bg-slate-950/50 transition-all gap-4"
                >
                  {/* Left: Direction icon + Counterparty & Level details */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                      isReceived 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}>
                      {isReceived ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white truncate">{tx.counterpartyName}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                          isReceived 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {isReceived ? 'Recebida (Entrada)' : 'Enviada (Saída)'}
                        </span>
                        <span className="text-[9px] font-mono bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                          Nível {tx.level}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 flex-wrap">
                        <span className="font-mono text-slate-500 truncate select-all">
                          PIX: {tx.counterpartyPixKey || 'Não informada'}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-500 flex items-center gap-1">
                          <Clock size={11} /> {formatTimestamp(tx.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Value, Status badge and Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto border-t sm:border-t-0 border-slate-850 pt-3 sm:pt-0">
                    
                    {/* Value */}
                    <div className="text-left sm:text-right">
                      <p className={`text-base font-black font-mono tracking-tight ${
                        isReceived ? 'text-emerald-400' : 'text-slate-200'
                      }`}>
                        {isReceived ? '+' : '-'} R$ {tx.amount.toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">
                        PIX P2P Direto
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2.5">
                      {tx.status === 'verified' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] tracking-wider uppercase">
                          <CheckCircle2 size={12} /> Confirmado
                        </span>
                      ) : tx.status === 'pending_verification' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[10px] tracking-wider uppercase animate-pulse">
                          <Clock size={12} /> {isReceived ? 'Aprovar PIX' : 'Em Análise'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-[10px] tracking-wider uppercase">
                          <AlertTriangle size={12} /> Pendente
                        </span>
                      )}

                      {/* View Receipt Button */}
                      <button
                        onClick={() => setSelectedTx(tx)}
                        className="p-2 bg-slate-800/80 hover:bg-[#32BCAD] text-slate-300 hover:text-slate-950 rounded-xl border border-slate-700/60 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold px-3"
                        title="Ver Comprovante Detalhado"
                      >
                        <Eye size={13} />
                        <span className="hidden sm:inline">Ver</span>
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAIL RECEIPT MODAL */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative max-h-[92vh] overflow-y-auto">
            
            <button 
              onClick={() => setSelectedTx(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
            
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                selectedTx.type === 'received' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}>
                {selectedTx.type === 'received' ? 'Doação Recebida' : 'Doação Enviada'}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Nível {selectedTx.level}</span>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 mb-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">{selectedTx.type === 'received' ? 'Remetente:' : 'Destinatário:'}</span>
                <span className="font-bold text-white">{selectedTx.counterpartyName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Chave PIX:</span>
                <span className="font-mono text-[#32BCAD] truncate max-w-[200px]">{selectedTx.counterpartyPixKey || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Valor da Doação:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  R$ {selectedTx.amount.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Data e Hora:</span>
                <span className="text-slate-300">{formatTimestamp(selectedTx.createdAt)}</span>
              </div>
            </div>

            {/* Receipt Image Container */}
            <div className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center min-h-[260px] mb-4 relative p-1.5 shadow-inner">
              {selectedTx.receiptImage ? (
                <img 
                  src={selectedTx.receiptImage} 
                  alt="Comprovante de Transferência PIX" 
                  className="w-full h-auto object-contain rounded-xl max-h-[440px] shadow-sm select-none" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <FileText className="text-slate-600 mx-auto" size={36} />
                  <p className="text-xs text-slate-400 font-medium">Nenhum comprovante visual anexado.</p>
                  <p className="text-[10px] text-slate-600">Se você realizou o pagamento, pode anexar o comprovante abaixo.</p>
                </div>
              )}
            </div>

            {/* Upload form for sender if missing */}
            {selectedTx.type === 'sent' && (
              <div className="mb-4">
                <label className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-750 border border-slate-700/60 text-slate-300 hover:text-white rounded-xl cursor-pointer transition-all text-xs font-bold shadow-sm">
                  {uploadingId === selectedTx.id ? (
                    <><Loader2 className="animate-spin text-[#32BCAD]" size={14} /> Salvando comprovante...</>
                  ) : (
                    <><Upload size={14} /> {selectedTx.receiptImage ? 'Substituir Imagem do Comprovante' : 'Anexar Imagem Comprovante'}</>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    disabled={uploadingId !== null}
                    className="hidden" 
                    onChange={(e) => handleFileChange(e, selectedTx.id)} 
                  />
                </label>
              </div>
            )}

            {/* Approval action for receiver */}
            {selectedTx.type === 'received' && selectedTx.status !== 'verified' && (
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={15} />
                  <p className="text-[11px] text-amber-300 leading-relaxed font-medium">
                    Verifique seu extrato bancário antes de confirmar para assegurar que os <strong>R$ 10,00</strong> foram recebidos.
                  </p>
                </div>

                <button
                  onClick={() => handleApprovePayment(selectedTx.id)}
                  className="w-full bg-[#32BCAD] hover:bg-[#269689] text-slate-950 font-bold uppercase tracking-widest text-xs py-3.5 rounded-xl cursor-pointer shadow-[0_0_15px_rgba(50,188,173,0.3)] transition-all flex items-center justify-center gap-2"
                >
                  <Check size={15} className="stroke-[3]" /> Confirmar Pagamento Recebido
                </button>
              </div>
            )}

            {selectedTx.status === 'verified' && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-widest shadow-sm mt-3">
                <ShieldCheck size={16} /> Transação Confirmada
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
