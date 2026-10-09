import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { 
  Users, UserCheck, ShieldCheck, Calendar, ArrowRight, UserPlus, 
  Smartphone, Mail, Hash, User as UserIcon, Loader2, Copy, Check,
  ChevronDown, ChevronRight, HelpCircle, Network
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NetworkTreeProps {
  user: User;
}

interface DownlineMember extends User {
  id: string;
}

export default function NetworkTree({ user }: { user: User }) {
  const [sponsor, setSponsor] = useState<User | null>(null);
  const [loadingSponsor, setLoadingSponsor] = useState(true);
  
  const [directs, setDirects] = useState<DownlineMember[]>([]);
  const [loadingDirects, setLoadingDirects] = useState(true);
  
  // State for tracking sub-networks (expanded members and their downlines)
  const [expandedMembers, setExpandedMembers] = useState<Record<string, DownlineMember[]>>({});
  const [loadingSubTree, setLoadingSubTree] = useState<Record<string, boolean>>({});
  
  const [copiedLink, setCopiedLink] = useState(false);
  const inviteLink = `https://directcash.app/invite/${user.inviteCode}`;

  // Load Sponsor details
  useEffect(() => {
    if (!user.sponsorCode) {
      setSponsor(null);
      setLoadingSponsor(false);
      return;
    }

    setLoadingSponsor(true);
    const qSponsor = query(
      collection(db, 'users'),
      where('inviteCode', '==', user.sponsorCode)
    );

    const unsubscribe = onSnapshot(qSponsor, (snapshot) => {
      if (!snapshot.empty) {
        setSponsor(snapshot.docs[0].data() as User);
      } else {
        setSponsor(null);
      }
      setLoadingSponsor(false);
    }, (error) => {
      console.error("Erro ao buscar patrocinador:", error);
      setLoadingSponsor(false);
    });

    return () => unsubscribe();
  }, [user.sponsorCode]);

  // Load Direct Referrals (Level 1)
  useEffect(() => {
    if (!user.inviteCode) return;

    setLoadingDirects(true);
    const qDirects = query(
      collection(db, 'users'),
      where('sponsorCode', '==', user.inviteCode)
    );

    const unsubscribe = onSnapshot(qDirects, (snapshot) => {
      const members = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DownlineMember[];
      
      // Sort by creation date
      members.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setDirects(members);
      setLoadingDirects(false);
    }, (error) => {
      console.error("Erro ao buscar indicados diretos:", error);
      setLoadingDirects(false);
    });

    return () => unsubscribe();
  }, [user.inviteCode]);

  // Expand and load sub-network (Level 2, etc.)
  const toggleMemberExpand = async (memberId: string, inviteCode?: string) => {
    if (!inviteCode) return;

    // If already expanded, just toggle it closed by deleting key from state
    if (expandedMembers[memberId]) {
      setExpandedMembers(prev => {
        const next = { ...prev };
        delete next[memberId];
        return next;
      });
      return;
    }

    // Load sub-referrals
    setLoadingSubTree(prev => ({ ...prev, [memberId]: true }));
    try {
      const qSub = query(
        collection(db, 'users'),
        where('sponsorCode', '==', inviteCode)
      );
      const snapshot = await getDocs(qSub);
      const subMembers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DownlineMember[];

      // Sort by creation date
      subMembers.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setExpandedMembers(prev => ({
        ...prev,
        [memberId]: subMembers
      }));
    } catch (err) {
      console.error(`Erro ao buscar sub-rede de ${inviteCode}:`, err);
    } finally {
      setLoadingSubTree(prev => ({ ...prev, [memberId]: false }));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Utility to mask key for privacy
  const formatPixKeyPreview = (key: string, type: string) => {
    if (!key) return '';
    const clean = key.trim();
    if (type === 'cpf') {
      return `${clean.substring(0, 3)}.***.***-${clean.substring(9, 11)}`;
    }
    if (type === 'email') {
      const [name, domain] = clean.split('@');
      if (!domain) return clean;
      return `${name.substring(0, Math.min(3, name.length))}***@${domain}`;
    }
    if (type === 'telefone') {
      return `(${clean.substring(0, 2)}) *****-${clean.substring(clean.length - 4)}`;
    }
    return `${clean.substring(0, 4)}...${clean.substring(clean.length - 4)}`;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Recente';
    const d = new Date(timestamp.seconds * 1000);
    return d.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Intro Header */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#32BCAD]/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#32BCAD]/10 border border-[#32BCAD]/20 flex items-center justify-center text-[#32BCAD] shadow-[0_0_20px_rgba(50,188,173,0.1)]">
              <Network size={28} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Árvore de Expansão</h3>
              <p className="text-slate-400 text-xs mt-0.5">Explore sua genealogia de doadores, patrocinador e indicados ativos</p>
            </div>
          </div>
          
          <button
            onClick={() => copyToClipboard(inviteLink)}
            className={`w-full md:w-auto flex items-center justify-center gap-2 px-4.5 py-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${copiedLink ? 'bg-emerald-500 text-slate-900 border-emerald-500' : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-750'}`}
          >
            {copiedLink ? <Check size={14} className="stroke-[3]" /> : <Copy size={14} />}
            {copiedLink ? 'Link Copiado!' : 'Copiar Link de Convite'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Sponsor & Stats */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Patrocinador Card */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 hover:border-slate-800/80 transition-colors">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <UserCheck size={14} className="text-[#32BCAD]" /> Meu Patrocinador
            </h4>

            {loadingSponsor ? (
              <div className="flex items-center gap-2.5 py-4">
                <Loader2 className="animate-spin text-[#32BCAD]" size={16} />
                <span className="text-slate-400 text-xs">Carregando dados...</span>
              </div>
            ) : sponsor ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-[#32BCAD] font-bold">
                    {sponsor.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-sm tracking-wide">{sponsor.name}</h5>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${sponsor.isActive ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                      <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                        {sponsor.isActive ? 'Ativo' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-850 pt-4 space-y-3">
                  <div>
                    <span className="text-[9px] font-bold tracking-widest text-slate-500 uppercase">Código</span>
                    <p className="text-xs font-mono font-bold text-white mt-0.5">{sponsor.inviteCode}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold tracking-widest text-slate-500 uppercase">Chave PIX de Doação</span>
                    <div className="bg-slate-950/40 border border-slate-800 px-3 py-2 rounded-lg text-xs font-mono text-slate-300 mt-1 flex justify-between items-center select-all">
                      <span>{formatPixKeyPreview(sponsor.pixKey, sponsor.pixType)}</span>
                      <span className="text-[9px] bg-[#32BCAD]/10 text-[#32BCAD] px-1.5 py-0.5 rounded font-sans font-bold uppercase tracking-wider">{sponsor.pixType}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800/80 text-center space-y-1.5">
                <ShieldCheck className="text-[#32BCAD] mx-auto" size={24} />
                <h5 className="font-bold text-white text-xs">Administrador (Topo da Rede)</h5>
                <p className="text-[11px] text-slate-500">Você foi indicado pelo link global do sistema.</p>
              </div>
            )}
          </div>

          {/* Matrix Stats Card */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users size={14} className="text-[#32BCAD]" /> Estatísticas de Rede
            </h4>

            <div className="space-y-4">
              <div className="bg-slate-950/20 border border-slate-800/50 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Diretos Ativos (Nível 1)</p>
                  <h4 className="text-xl font-bold text-white mt-1">{directs.filter(d => d.isActive).length}</h4>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                  <UserPlus size={18} />
                </div>
              </div>

              <div className="bg-slate-950/20 border border-slate-800/50 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Aguardando Ativação</p>
                  <h4 className="text-xl font-bold text-white mt-1">{directs.filter(d => !d.isActive).length}</h4>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                  <Loader2 className="animate-spin" size={18} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Genealogic downlines explorer */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 h-full flex flex-col">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5 flex items-center gap-2">
              <Network size={14} className="text-[#32BCAD]" /> Explorador Genealógico Direto
            </h4>

            {loadingDirects ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 flex-1">
                <Loader2 className="animate-spin text-[#32BCAD]" size={32} />
                <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Mapeando rede...</p>
              </div>
            ) : directs.length === 0 ? (
              <div className="text-center py-16 bg-slate-950/20 rounded-xl border border-slate-850 flex flex-col items-center justify-center gap-3.5 flex-1">
                <Users size={32} className="text-slate-600" />
                <div>
                  <h5 className="font-bold text-white text-sm">Nenhum indicado na rede ainda</h5>
                  <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto px-4">
                    Compartilhe seu link de convite com amigos para preencher seu Nível 1. Cada pessoa que se ativa contribui diretamente para você!
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(inviteLink)}
                  className="px-4 py-2 bg-[#32BCAD]/10 border border-[#32BCAD]/30 hover:bg-[#32BCAD]/20 rounded-xl text-xs font-bold text-[#32BCAD] transition-all cursor-pointer"
                >
                  {copiedLink ? 'Link Copiado!' : 'Copiar Meu Link'}
                </button>
              </div>
            ) : (
              <div className="space-y-4 flex-1">
                <p className="text-xs text-slate-400 mb-2">
                  Abaixo estão os usuários cadastrados com o seu link de convite. Clique em <strong>"Ver Sub-rede"</strong> para abrir as ramificações de segundo nível da rede.
                </p>

                <div className="space-y-3">
                  {directs.map((member) => {
                    const isExpanded = !!expandedMembers[member.id];
                    const subMembers = expandedMembers[member.id] || [];
                    const isSubLoading = !!loadingSubTree[member.id];

                    return (
                      <div key={member.id} className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/10 hover:border-slate-750 transition-colors">
                        
                        {/* Member Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 bg-slate-900/20">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-[#32BCAD] font-bold">
                              {member.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h5 className="font-bold text-sm text-white tracking-wide">{member.name}</h5>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-mono text-slate-500">Cód: {member.inviteCode}</span>
                                <span className="text-[10px] text-slate-600">•</span>
                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <Calendar size={10} /> {formatDate(member.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-slate-850 pt-2.5 sm:pt-0">
                            <div>
                              {member.isActive ? (
                                <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[9px] tracking-wider uppercase">
                                  Ativo (Doado)
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[9px] tracking-wider uppercase">
                                  Pendente
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => toggleMemberExpand(member.id, member.inviteCode)}
                              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-lg text-xs font-bold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              {isSubLoading ? (
                                <Loader2 className="animate-spin text-[#32BCAD]" size={12} />
                              ) : isExpanded ? (
                                <ChevronDown size={14} />
                              ) : (
                                <ChevronRight size={14} />
                              )}
                              Sub-rede
                            </button>
                          </div>
                        </div>

                        {/* Expandable Sub-network Segment (Level 2) */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="bg-slate-950/40 border-t border-slate-850 p-4 pl-8 relative before:absolute before:left-4 before:top-0 before:bottom-6 before:w-px before:bg-slate-800"
                            >
                              <div className="text-[10px] font-bold text-[#32BCAD] uppercase tracking-widest mb-3 flex items-center gap-1">
                                <ArrowRight size={10} /> Sub-rede de {member.name} (Nível 2)
                              </div>

                              {subMembers.length === 0 ? (
                                <p className="text-xs text-slate-500 italic py-1 pl-4">Nenhum membro cadastrado abaixo de {member.name} ainda.</p>
                              ) : (
                                <div className="space-y-2">
                                  {subMembers.map((sub) => (
                                    <div key={sub.id} className="flex items-center justify-between p-3 bg-slate-900/30 border border-slate-850 rounded-lg hover:border-slate-800 transition-colors">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs">
                                          {sub.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                          <h6 className="font-bold text-slate-200 text-xs">{sub.name}</h6>
                                          <p className="text-[9px] text-slate-500 mt-0.5">Indicado por {member.name}</p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-3">
                                        <span className={`w-2 h-2 rounded-full ${sub.isActive ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400'}`}></span>
                                        <span className="text-[10px] font-bold tracking-wide uppercase text-slate-400">
                                          {sub.isActive ? 'Ativo' : 'Pendente'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>

                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
