import React, { useState, useEffect } from 'react';
import { User } from '../types';
import UserDashboard from './UserDashboard';
import RecentTransactions from './RecentTransactions';
import NotificationCenter from './NotificationCenter';
import Dashboard from './Dashboard';
import NetworkTree from './NetworkTree';
import Calculator from './Calculator';
import Notifications from './Notifications';
import Profile from './Profile';
import AdminDashboard from './AdminDashboard';
import { LayoutDashboard, Users, Calculator as CalcIcon, QrCode, Shield, Activity, Menu, X, LogOut, User as UserIcon, Bell, Volume2, ArrowLeftRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, requestFCMToken, playDonationChime } from '../lib/firebase';
import { signOut } from 'firebase/auth';

type Tab = 'dashboard' | 'transactions' | 'notifications' | 'network' | 'calculator' | 'profile' | 'admin';

export default function MainLayout({ user, onUserUpdate }: { user: User; onUserUpdate: (updatedUser: User) => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [fcmEnabled, setFcmEnabled] = useState(false);
  const [enablingFcm, setEnablingFcm] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setFcmEnabled(true);
      }
    }
  }, []);

  const handleToggleFCM = async () => {
    setEnablingFcm(true);
    const token = await requestFCMToken(user.uid || user.id);
    if (token) {
      setFcmEnabled(true);
      playDonationChime();
    } else {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        setFcmEnabled(true);
      }
    }
    setEnablingFcm(false);
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transações Recentes', icon: ArrowLeftRight },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'network', label: 'Rede Ativa', icon: Users },
    { id: 'calculator', label: 'Projeções', icon: CalcIcon },
    { id: 'profile', label: 'Meu Perfil', icon: UserIcon },
    { id: 'admin', label: 'Painel Admin', icon: Shield },
  ] as const;

  const NavContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      <div className="px-6 flex items-center justify-between gap-4 mt-2">
        <div className="flex items-center gap-3">
          <img 
            src="/images/direct_cash_pix_logo_1784486102011.jpg" 
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/src/assets/images/direct_cash_pix_logo_1784486102011.jpg'; }}
            alt="Logo" 
            className="w-52 h-auto rounded-xl object-cover shadow-[0_0_15px_rgba(50,188,173,0.2)]" 
            style={!isMobile ? { height: '63.846999999999994px' } : undefined}
            referrerPolicy="no-referrer" 
          />
        </div>
        
        {/* Mobile menu close button */}
        <button className="md:hidden text-slate-400 p-2" onClick={() => setMobileMenuOpen(false)}>
          <X size={20} />
        </button>
      </div>

      <div className="px-5 mt-6 mb-2 hidden md:block">
        <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800/80 shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-[#32BCAD]/10 rounded-full blur-xl"></div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"></div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Sessão Segura</p>
          </div>
          <p className="font-bold text-white text-sm truncate">{user.name}</p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{user.pixKey}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto mt-4 md:mt-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all cursor-pointer relative overflow-hidden group ${
                isActive ? 'bg-[#32BCAD]/10 text-[#32BCAD]' : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'
              }`}
            >
              {isActive && <motion.div layoutId="active-indicator" className="absolute left-0 top-1/4 h-1/2 w-1 bg-[#32BCAD] rounded-r-full" />}
              <Icon size={20} className={isActive ? 'text-[#32BCAD]' : 'text-slate-500 group-hover:text-slate-400'} />
              <span className="font-bold text-sm tracking-wide">{tab.label}</span>
            </button>
          );
        })}
      </nav>
      
      <div className="p-5 mt-auto border-t border-slate-800/50 space-y-4">
        <button
          onClick={() => signOut(auth)}
          className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-slate-800/50 hover:bg-slate-800 py-2 rounded-lg"
        >
          <LogOut size={14} />
          Sair da Conta
        </button>
        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
          <Shield size={12} className="text-slate-600" />
          Proteção P2P Ativa
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-[100dvh] bg-[#020617] text-slate-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-[#32BCAD]/30 selection:text-white">
      <Notifications user={user} />
      
      {/* Mobile Header (Safe Area Compliant) */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] bg-[#090e1a]/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <img 
            src="/images/direct_cash_pix_logo_1784486102011.jpg" 
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/src/assets/images/direct_cash_pix_logo_1784486102011.jpg'; }}
            alt="Logo" 
            className="w-[150px] sm:w-[170px] h-auto rounded-lg object-cover" 
            referrerPolicy="no-referrer" 
          />
        </div>
        <div className="flex items-center gap-2">
          <NotificationCenter user={user} onNavigateToTransactions={() => setActiveTab('transactions')} />
          <button 
            onClick={() => setMobileMenuOpen(true)} 
            className="text-slate-300 p-2 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 bg-[#090e1a] border-r border-slate-800/80 flex-col shrink-0 py-4 shadow-xl z-10 relative">
        <NavContent />
      </aside>

      {/* Sidebar Mobile Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside 
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#090e1a] border-r border-slate-800 shadow-2xl z-50 flex flex-col py-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
              <NavContent isMobile={true} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 md:p-8 pb-28 md:pb-8 bg-[#020617] flex flex-col relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#32BCAD]/5 rounded-full blur-[100px] pointer-events-none -mr-40 -mt-40"></div>
        
        <div className="max-w-6xl mx-auto flex-1 w-full relative z-10">
          
          <header className="mb-8 hidden md:flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {tabs.find(t => t.id === activeTab)?.label}
              </h2>
              <p className="text-slate-400 text-sm mt-1">Gestão inteligente de doações P2P via PIX</p>
            </div>
            
            <div className="flex items-center gap-3">
              <NotificationCenter user={user} onNavigateToTransactions={() => setActiveTab('transactions')} />

              <button
                onClick={handleToggleFCM}
                disabled={enablingFcm}
                title="Sincronizar Notificações FCM em Tempo Real"
                className={`flex items-center gap-2 py-1.5 px-3.5 rounded-full border text-[11px] font-bold tracking-wider uppercase transition-all cursor-pointer ${
                  fcmEnabled 
                    ? 'bg-[#32BCAD]/10 border-[#32BCAD]/40 text-[#32BCAD]' 
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <Bell size={13} className={fcmEnabled ? "animate-pulse text-[#32BCAD]" : ""} />
                <span>{enablingFcm ? 'Ativando FCM...' : fcmEnabled ? 'FCM Ativo' : 'Ativar Notificações FCM'}</span>
              </button>

              <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 py-1.5 px-3 rounded-full">
                <Activity size={14} className="text-[#32BCAD]" />
                <span className="text-[11px] font-bold tracking-wider text-slate-300 uppercase">Rede Sincronizada</span>
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {activeTab === 'dashboard' && (
                <UserDashboard 
                  user={user} 
                  onUserUpdate={onUserUpdate}
                  onNavigateToTransactions={() => setActiveTab('transactions')} 
                />
              )}
              {activeTab === 'transactions' && <RecentTransactions user={user} />}
              {activeTab === 'notifications' && (
                <NotificationCenter 
                  user={user} 
                  variant="page" 
                  onNavigateToTransactions={() => setActiveTab('transactions')} 
                />
              )}
              {activeTab === 'network' && <NetworkTree user={user} />}
              {activeTab === 'calculator' && <Calculator />}
              {activeTab === 'profile' && <Profile user={user} onUserUpdate={onUserUpdate} />}
              {activeTab === 'admin' && <AdminDashboard currentUser={user} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="max-w-6xl mx-auto w-full mt-12 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-500 gap-3 border-t border-slate-800/50 pt-6 relative z-10">
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              SISTEMA OPERACIONAL
            </span>
            <span>VERIFICAÇÃO P2P ATIVA</span>
          </div>
          <p>© {new Date().getFullYear()} Direct Cash Pix • Tecnologia Segura de Ponta a Ponta</p>
        </footer>
      </main>

      {/* Mobile Bottom Navigation Bar (iOS / Android Safe Area Compliant) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#090e1a]/95 backdrop-blur-xl border-t border-slate-800/80 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-2xl">
        {[
          { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
          { id: 'transactions', label: 'Extrato', icon: ArrowLeftRight },
          { id: 'notifications', label: 'Alertas', icon: Bell },
          { id: 'network', label: 'Rede', icon: Users },
          { id: 'profile', label: 'Perfil', icon: UserIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[52px] min-h-[46px] cursor-pointer ${
                isActive ? 'text-[#32BCAD]' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <div className="relative">
                <Icon size={19} className={isActive ? 'text-[#32BCAD]' : 'text-slate-500'} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#32BCAD]" />
                )}
              </div>
              <span className={`text-[10px] mt-1 font-bold tracking-tight truncate max-w-[56px] ${isActive ? 'text-[#32BCAD]' : 'text-slate-500'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
