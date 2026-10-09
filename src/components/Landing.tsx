import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, Activity, Users, Lock, ChevronDown, CheckCircle2, Star, UserPlus, QrCode, Key, Share2, Play, Pause, Volume2, VolumeX, Calculator, AlertTriangle, TrendingUp, Menu, X } from 'lucide-react';
import { motion } from 'motion/react';
import Compliance from './Compliance';
import Infographic from './Infographic';
import MutualAidIllustration from './MutualAidIllustration';

// @ts-ignore
import depo1 from '../depoimentos/depo-1.mp4';
// @ts-ignore
import depo2 from '../depoimentos/depo-2-1.mp4';
// @ts-ignore
import depo3 from '../depoimentos/depo-3.mp4';
// @ts-ignore
import depo4 from '../depoimentos/depo-4.mp4';

const promoVideo = "https://drive.google.com/file/d/1iBFrl4-Si4tZ7iyAOd90H_FeQth-l7Gb/view?usp=sharing";

interface LandingProps {
  onStart: () => void;
  onAdminClick?: () => void;
}

export default function Landing({ onStart, onAdminClick }: LandingProps) {
  const [view, setView] = useState<'landing' | 'terms' | 'privacy' | 'legal'>('landing');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  const menuItems = [
    { label: 'Como Funciona', href: '#como-funciona' },
    { label: 'Infográfico', href: '#infografico' },
    { label: 'Simulador', href: '#simulador' },
    { label: 'Legalidade', href: '#legalidade' },
    { label: 'Depoimentos', href: '#depoimentos' },
    { label: 'Dúvidas', href: '#faq' }
  ];

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id.replace('#', ''));
    if (element) {
      const offset = 100; // Header height offset
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
    setMobileMenuOpen(false);
  };

  // Projection Simulator States
  const [directReferrals, setDirectReferrals] = useState(5);
  const [duplicationRate, setDuplicationRate] = useState(5);

  const level1Count = directReferrals;
  const level2Count = level1Count * duplicationRate;
  const level3Count = level2Count * duplicationRate;
  const level4Count = level3Count * duplicationRate;
  const level5Count = level4Count * duplicationRate;

  const level1Total = level1Count * 10;
  const level2Total = level2Count * 10;
  const level3Total = level3Count * 10;
  const level4Total = level4Count * 10;
  const level5Total = level5Count * 10;

  const totalDonations = level1Total + level2Total + level3Total + level4Total + level5Total;
  const totalMembros = level1Count + level2Count + level3Count + level4Count + level5Count;

  const testimonials = [
    {
      name: "João Silva",
      role: "Empreendedor",
      text: "O Direct Cash Pix transformou minha forma de ver ajuda mútua. A transparência do PIX direto na conta é fantástica.",
    },
    {
      name: "Maria Santos",
      role: "Profissional Liberal",
      text: "No começo fiquei desconfiada, mas ver as doações caindo diretamente na minha chave PIX me deu total segurança.",
    },
    {
      name: "Carlos Eduardo",
      role: "Investidor Anjo",
      text: "A arquitetura de 5 níveis é matematicamente brilhante. O roteamento inteligente faz todo o trabalho duro de forma justa.",
    },
    {
      name: "Ana Paula",
      role: "Autônoma",
      text: "Finalmente um sistema onde não precisamos pedir saque ou pagar taxas abusivas. Tudo é 100% P2P e instantâneo.",
    },
    {
      name: "Roberto Alves",
      role: "Consultor de Vendas",
      text: "O poder de alavancagem dessa rede é incrível. Com apenas algumas indicações, minha rede não parou mais de crescer.",
    },
    {
      name: "Fernanda Lima",
      role: "Estudante",
      text: "A facilidade de começar com apenas R$ 50 e a dinâmica de pagamentos diretos tornam o sistema acessível e muito poderoso.",
    }
  ];

  const faqs = [
    {
      q: 'A ajuda mútua é legal?',
      a: 'Sim. Doações financeiras espontâneas entre pessoas físicas são totalmente legais e previstas no Código Civil Brasileiro. Não somos uma empresa de investimentos e não há promessa de rendimentos.'
    },
    {
      q: 'Minha chave PIX está segura?',
      a: 'Sua chave PIX é utilizada exclusivamente para receber transferências de outros usuários. Nosso sistema não possui acesso à sua conta bancária nem realiza débitos automáticos.'
    },
    {
      q: 'Como funciona a agilidade do sistema?',
      a: 'Os pagamentos são processados em tempo real, diretamente via PIX P2P (ponto a ponto). Não há retenção de saldo na plataforma, o dinheiro cai imediatamente na sua conta bancária.'
    }
  ];

  if (view !== 'landing') {
    return (
      <div className="min-h-screen bg-[#121212] font-sans selection:bg-[#00FF85]/30 selection:text-white">
        <header className="fixed top-0 inset-x-0 bg-[#121212]/90 backdrop-blur-md z-50 border-b border-[#00FF85]/10">
          <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('landing')}>
              <img src="/images/direct_cash_pix_logo_1784486102011.jpg" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/src/assets/images/direct_cash_pix_logo_1784486102011.jpg'; }} alt="Direct Cash Pix" className="w-[179px] h-[52px] rounded-xl object-cover" referrerPolicy="no-referrer" />
            </div>
          </div>
        </header>
        <Compliance type={view} onBack={() => setView('landing')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-slate-300 font-sans selection:bg-[#00FF85]/30 selection:text-white">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 bg-[#121212]/90 backdrop-blur-md z-50 border-b border-[#00FF85]/10">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/direct_cash_pix_logo_1784486102011.jpg" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/src/assets/images/direct_cash_pix_logo_1784486102011.jpg'; }} alt="Direct Cash Pix" className="w-[179px] h-[52px] rounded-xl object-cover" referrerPolicy="no-referrer" />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {menuItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => handleScrollTo(e, item.href)}
                className="text-sm font-medium text-slate-400 hover:text-[#00FF85] transition-colors relative group py-2"
              >
                {item.label}
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#00FF85] transition-all group-hover:w-full"></span>
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={onStart}
              className="hidden sm:inline-block text-sm font-bold bg-[#00FF85]/10 text-[#00FF85] px-5 py-2.5 rounded-lg border border-[#00FF85]/30 hover:bg-[#00FF85]/20 transition-colors"
            >
              Acessar Sistema
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white transition-colors focus:outline-none"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-[#121212]/95 border-b border-[#00FF85]/10 px-6 py-6 space-y-4"
          >
            <div className="flex flex-col gap-4">
              {menuItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleScrollTo(e, item.href)}
                  className="text-base font-semibold text-slate-300 hover:text-[#00FF85] py-2 transition-colors border-b border-white/5 last:border-0"
                >
                  {item.label}
                </a>
              ))}
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  onStart();
                }}
                className="w-full text-center text-sm font-bold bg-[#00FF85] text-[#121212] py-3 rounded-lg hover:bg-[#00cc6a] transition-colors mt-2"
              >
                Acessar Sistema
              </button>
            </div>
          </motion.div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#00FF85]/5 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Copy & Actions */}
            <div className="lg:col-span-7 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00FF85]/10 border border-[#00FF85]/20 text-[#00FF85] text-xs font-bold tracking-widest uppercase">
                    <span className="w-2 h-2 rounded-full bg-[#00FF85] animate-pulse"></span>
                    Rede P2P Inteligente
                  </div>
                </div>
                
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[51px] font-extrabold text-white tracking-tight leading-[1.15] mb-6">
                  Receba doações de R$ 50 diretamente<br className="hidden sm:inline" /> na sua conta via PIX,<br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FF85] to-emerald-500">sem intermediários.</span>
                </h1>
                
                <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto lg:mx-0">
                  Um sistema de roteamento inteligente que organiza fluxos de doações diretas entre os participantes, de forma 100% descentralizada e transparente.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                  <button 
                    onClick={onStart}
                    className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-[#00FF85] hover:bg-[#00cc6a] text-[#121212] font-bold text-lg px-8 py-4 rounded-xl transition-all shadow-[0_0_30px_rgba(0,255,133,0.3)] hover:shadow-[0_0_40px_rgba(0,255,133,0.5)] cursor-pointer"
                  >
                    Ativar meu Direct Cash Pix
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
                <p className="mt-4 text-xs text-slate-500 font-medium">Nenhuma taxa de saque. O dinheiro é enviado diretamente para sua chave.</p>
              </motion.div>
            </div>

            {/* Right Column: Mutual Aid Vector Illustration */}
            <div id="video-apresentacao" className="lg:col-span-5 w-full scroll-mt-28 transition-all duration-500">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="relative mt-6 lg:mt-0 w-full max-w-lg mx-auto lg:max-w-none group"
              >
                {/* Ambient Glow background */}
                <div className="absolute -inset-2 bg-gradient-to-r from-[#00FF85]/20 to-emerald-500/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition duration-500"></div>
                
                <MutualAidIllustration onOpenVideo={() => setShowVideoModal(true)} />
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      {/* Step by Step Section */}
      <section id="como-funciona" className="py-24 px-6 bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Como funciona na prática</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              Começar é simples, rápido e 100% seguro. Siga 4 passos básicos para ativar seu fluxo de caixa.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-transparent via-[#00FF85]/30 to-transparent z-0"></div>

            {[
              {
                icon: <UserPlus size={28} />,
                title: "1. Cadastre-se",
                desc: "Crie sua conta informando seus dados básicos para acessar o painel.",
              },
              {
                icon: <QrCode size={28} />,
                title: "2. Faça sua Doação",
                desc: "Envie R$ 10,00 via PIX diretamente para as 5 pessoas indicadas pelo sistema.",
              },
              {
                icon: <Key size={28} />,
                title: "3. Insira sua Chave",
                desc: "Cadastre sua chave PIX no sistema para começar a receber as doações.",
              },
              {
                icon: <Share2 size={28} />,
                title: "4. Compartilhe",
                desc: "Convide novos membros e receba as doações diretamente na sua conta.",
              }
            ].map((step, idx) => (
              <div key={idx} className="relative z-10 flex flex-col items-center text-center group">
                <div className="w-24 h-24 rounded-full bg-[#161616] border-2 border-[#00FF85]/20 flex items-center justify-center text-[#00FF85] mb-6 shadow-[0_0_20px_rgba(0,255,133,0.1)] group-hover:scale-110 group-hover:border-[#00FF85] transition-all duration-300">
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed max-w-[250px]">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INFOGRAPHIC SECTION */}
      <Infographic onStart={onStart} />

      {/* PROJECTION SIMULATOR */}
      <section id="simulador" className="py-24 px-6 bg-[#121212] border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00FF85]/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00FF85]/10 border border-[#00FF85]/20 text-[#00FF85] text-xs font-bold tracking-widest uppercase mb-4">
              <Calculator size={14} />
              Simulador Interativo
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Simulador de Projeção P2P</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-base">
              Ajuste a quantidade de indicados diretos e a média de duplicação para visualizar o poder de multiplicação geométrica de doações em 5 níveis de profundidade.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Column: Sliders */}
            <div className="lg:col-span-5 bg-[#161616] p-8 rounded-2xl border border-white/5 flex flex-col justify-between space-y-8">
              <div>
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <TrendingUp className="text-[#00FF85]" size={20} />
                  Configure Sua Rede
                </h3>
                
                {/* Slider 1 */}
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-200 font-sans">Seus Indicados Diretos (Nível 1)</label>
                    <span className="text-lg font-bold text-[#00FF85] bg-[#00FF85]/10 px-3 py-1 rounded-lg border border-[#00FF85]/20 font-mono">{directReferrals}</span>
                  </div>
                  <input 
                    type="range" 
                    min="2" 
                    max="10" 
                    value={directReferrals} 
                    onChange={(e) => setDirectReferrals(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00FF85]"
                  />
                  <p className="text-xs text-slate-500 leading-normal font-sans">
                    Pessoas que você convida diretamente com o seu link e que doam R$ 10,00 para você (Nível 1).
                  </p>
                </div>

                {/* Slider 2 */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-200 font-sans font-sans">Média de Duplicação (Níveis 2 a 5)</label>
                    <span className="text-lg font-bold text-[#00FF85] bg-[#00FF85]/10 px-3 py-1 rounded-lg border border-[#00FF85]/20 font-mono">{duplicationRate}</span>
                  </div>
                  <input 
                    type="range" 
                    min="2" 
                    max="6" 
                    value={duplicationRate} 
                    onChange={(e) => setDuplicationRate(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00FF85]"
                  />
                  <p className="text-xs text-slate-500 leading-normal font-sans">
                    Média de novos membros que cada participante convida na sequência da sua rede.
                  </p>
                </div>
              </div>

              <div className="bg-[#121212] p-4 rounded-xl border border-white/5 space-y-2">
                <div className="flex justify-between text-xs text-slate-400 font-sans">
                  <span>Total de Membros na Rede:</span>
                  <span className="font-bold text-white font-mono">{totalMembros.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400 font-sans">
                  <span>Valor de Ativação por Membro:</span>
                  <span className="font-bold text-[#00FF85] font-mono">R$ 50,00</span>
                </div>
              </div>
            </div>

            {/* Right Column: Calculations & Breakdown */}
            <div className="lg:col-span-7 bg-[#161616] p-8 rounded-2xl border border-white/5 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-400 mb-6 uppercase tracking-wider text-xs font-sans">
                  Projeção de Recebimento por Nível (R$ 10 por doador)
                </h3>

                <div className="space-y-4">
                  {/* Level 1 */}
                  <div className="bg-[#121212] p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block font-sans">1º Nível (Seus Convidados)</span>
                      <span className="text-sm font-semibold text-white font-sans">{level1Count} {level1Count === 1 ? 'membro' : 'membros'} × R$ 10,00</span>
                    </div>
                    <span className="text-lg font-bold text-[#00FF85] font-mono">R$ {level1Total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>

                  {/* Level 2 */}
                  <div className="bg-[#121212] p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block font-sans">2º Nível (Convidados deles)</span>
                      <span className="text-sm font-semibold text-white font-sans">{level2Count} {level2Count === 1 ? 'membro' : 'membros'} × R$ 10,00</span>
                    </div>
                    <span className="text-lg font-bold text-[#00FF85] font-mono">R$ {level2Total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>

                  {/* Level 3 */}
                  <div className="bg-[#121212] p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block font-sans">3º Nível (Indiretos)</span>
                      <span className="text-sm font-semibold text-white font-sans">{level3Count} {level3Count === 1 ? 'membro' : 'membros'} × R$ 10,00</span>
                    </div>
                    <span className="text-lg font-bold text-[#00FF85] font-mono">R$ {level3Total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>

                  {/* Level 4 */}
                  <div className="bg-[#121212] p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block font-sans">4º Nível (Indiretos)</span>
                      <span className="text-sm font-semibold text-white font-sans">{level4Count} {level4Count === 1 ? 'membro' : 'membros'} × R$ 10,00</span>
                    </div>
                    <span className="text-lg font-bold text-[#00FF85] font-mono">R$ {level4Total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>

                  {/* Level 5 */}
                  <div className="bg-[#121212] p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block font-sans">5º Nível (Indiretos)</span>
                      <span className="text-sm font-semibold text-white font-sans">{level5Count} {level5Count === 1 ? 'membro' : 'membros'} × R$ 10,00</span>
                    </div>
                    <span className="text-lg font-bold text-[#00FF85] font-mono">R$ {level5Total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5">
                <div className="bg-gradient-to-r from-[#00FF85]/10 to-emerald-500/10 p-6 rounded-xl border border-[#00FF85]/20 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block font-sans">Total Potencial de Doações</span>
                    <span className="text-3xl font-extrabold text-[#00FF85] font-mono">R$ {totalDonations.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <button 
                    onClick={onStart}
                    className="w-full sm:w-auto bg-[#00FF85] hover:bg-[#00cc6a] text-[#121212] font-bold text-sm px-6 py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(0,255,133,0.2)] hover:shadow-[0_0_30px_rgba(0,255,133,0.4)] cursor-pointer"
                  >
                    Ativar Meu Fluxo
                  </button>
                </div>
                <p className="mt-4 text-[10px] text-slate-500 leading-normal text-center sm:text-left font-sans">
                  * Os valores apresentados são simulações ilustrativas baseadas na progressão geométrica. O recebimento efetivo das doações espontâneas depende diretamente do cadastro e ativação de novos membros por parte da rede.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY THIS IS NOT A PYRAMID / PONZI */}
      <section id="legalidade" className="py-24 px-6 bg-[#0a0a0a] border-t border-white/5 relative">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#00FF85] text-xs font-bold tracking-widest uppercase mb-4">
              <ShieldCheck size={14} />
              Sustentabilidade e Legalidade
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Transparência Total e Legalidade</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-base font-sans">
              Entenda de forma clara e objetiva por que o <strong>Direct Cash Pix</strong> é um sistema legítimo de ajuda mútua 100% sustentável e totalmente diferente de pirâmides financeiras ou esquemas de pirâmide/Ponzi.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            {/* Direct Cash Box */}
            <div className="bg-[#121212] p-8 rounded-2xl border-2 border-[#00FF85]/30 relative overflow-hidden flex flex-col justify-between shadow-[0_0_25px_rgba(0,255,133,0.05)]">
              <div className="absolute top-0 right-0 bg-[#00FF85]/10 text-[#00FF85] text-[10px] font-bold px-4 py-1 rounded-bl-xl uppercase tracking-wider font-sans">
                100% Sustentável
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00FF85]"></span>
                  Direct Cash Pix (Ajuda Mútua)
                </h3>
                
                <div className="space-y-5">
                  <div className="flex gap-3">
                    <CheckCircle2 className="text-[#00FF85] shrink-0 mt-0.5" size={18} />
                    <div>
                      <h4 className="text-white font-bold text-sm font-sans">Doações Diretas Ponto a Ponto (P2P)</h4>
                      <p className="text-slate-400 text-xs mt-1 font-sans">O sistema não possui conta bancária centralizada nem retém um único centavo. O dinheiro é transferido de forma imediata e transparente diretamente do participante que doa para o que recebe via PIX.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <CheckCircle2 className="text-[#00FF85] shrink-0 mt-0.5" size={18} />
                    <div>
                      <h4 className="text-white font-bold text-sm font-sans">Pleno Amparo Legal (Código Civil)</h4>
                      <p className="text-slate-400 text-xs mt-1 font-sans">As doações financeiras espontâneas e gratuitas entre pessoas físicas são totalmente lícitas no Brasil, conforme amparado pelo Artigo 538 do Código Civil Brasileiro.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <CheckCircle2 className="text-[#00FF85] shrink-0 mt-0.5" size={18} />
                    <div>
                      <h4 className="text-white font-bold text-sm font-sans">Sem Promessas de Ganhos Passivos</h4>
                      <p className="text-slate-400 text-xs mt-1 font-sans">Não existe promessa de "lucro garantido", rendimento fixo diário ou retorno mágico sobre investimentos. Os recebimentos dependem única e exclusivamente do seu engajamento e trabalho na rede.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <CheckCircle2 className="text-[#00FF85] shrink-0 mt-0.5" size={18} />
                    <div>
                      <h4 className="text-white font-bold text-sm font-sans">Risco de Perda Central Zero</h4>
                      <p className="text-slate-400 text-xs mt-1 font-sans">Como a plataforma nunca guarda o dinheiro de ninguém (todo envio é P2P instantâneo), é impossível haver bloqueio de saques, fraudes centralizadas ou golpes de encerramento (exit scam).</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-white/5 text-[11px] text-[#00FF85] font-semibold font-sans">
                ✓ Sistema facilitador e roteador matemático transparente.
              </div>
            </div>

            {/* Pyramid/Ponzi Box */}
            <div className="bg-[#121212]/50 p-8 rounded-2xl border border-white/5 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-400 mb-6 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/60"></span>
                  Pirâmides / Esquemas Ponzi
                </h3>
                
                <div className="space-y-5">
                  <div className="flex gap-3">
                    <AlertTriangle className="text-red-500/80 shrink-0 mt-0.5" size={18} />
                    <div>
                      <h4 className="text-slate-300 font-bold text-sm font-sans">Centralização e Custódia de Fundos</h4>
                      <p className="text-slate-500 text-xs mt-1 font-sans">Os participantes são induzidos a enviar dinheiro para a conta bancária de uma empresa, site ou administrador central que promete gerir o dinheiro.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <AlertTriangle className="text-red-500/80 shrink-0 mt-0.5" size={18} />
                    <div>
                      <h4 className="text-slate-300 font-bold text-sm font-sans">Crime Contra a Economia Popular</h4>
                      <p className="text-slate-500 text-xs mt-1 font-sans">Configura crime financeiro (Lei nº 1.521/51) por atuar na captação pública irregular de poupança popular, prometendo pagar rendas insustentáveis sem lastro real.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <AlertTriangle className="text-red-500/80 shrink-0 mt-0.5" size={18} />
                    <div>
                      <h4 className="text-slate-300 font-bold text-sm font-sans">Falsas Rendas e Robôs Mágicos</h4>
                      <p className="text-slate-500 text-xs mt-1 font-sans">Prometem rendimentos automáticos (ex: 3% ao dia) atrelados a supostos investimentos em cripto ou forex. Na verdade, usam dinheiro de novos membros para pagar os antigos até colapsar.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <AlertTriangle className="text-red-500/80 shrink-0 mt-0.5" size={18} />
                    <div>
                      <h4 className="text-slate-300 font-bold text-sm font-sans">Golpe de Fuga e Bloqueio de Saque</h4>
                      <p className="text-slate-500 text-xs mt-1 font-sans">O esquema colapsa quando entra menos dinheiro de novos entrantes do que o necessário para pagar as promessas de rendimento. Os donos bloqueiam os saques e fogem com o capital.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-white/5 text-[11px] text-red-400/80 font-semibold font-sans">
                ✗ Esquemas insustentáveis focados em centralização ilegal de fundos.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Transparency */}
      <section className="py-24 px-6 bg-[#161616] border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Arquitetura de Fluxo Descentralizado</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Nossa tecnologia distribui os pagamentos através de um algoritmo de 5 níveis de profundidade, garantindo o máximo de expansão e sustentabilidade da rede.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[#121212] p-8 rounded-2xl border border-white/5 hover:border-[#00FF85]/30 transition-colors">
              <div className="w-12 h-12 bg-[#00FF85]/10 rounded-xl flex items-center justify-center text-[#00FF85] mb-6">
                <Users size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Rede de 5 Níveis</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Ao compartilhar seu link, seus indicados pagarão diretamente a você e a outras 4 pessoas da sua linha ascendente, criando um efeito de alavancagem progressiva.
              </p>
            </div>
            
            <div className="bg-[#121212] p-8 rounded-2xl border border-white/5 hover:border-[#00FF85]/30 transition-colors">
              <div className="w-12 h-12 bg-[#00FF85]/10 rounded-xl flex items-center justify-center text-[#00FF85] mb-6">
                <Activity size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Roteamento Inteligente</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Nosso sistema apenas exibe a ordem de pagamento. O algoritmo calcula instantaneamente quem deve receber cada cota da doação.
              </p>
            </div>

            <div className="bg-[#121212] p-8 rounded-2xl border border-white/5 hover:border-[#00FF85]/30 transition-colors">
              <div className="w-12 h-12 bg-[#00FF85]/10 rounded-xl flex items-center justify-center text-[#00FF85] mb-6">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Fluxo P2P Direto</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Sem conta central, sem pedido de saque. O valor sai da conta do novo membro e cai diretamente na sua conta bancária cadastrada via PIX.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="depoimentos" className="py-24 px-6 bg-[#0a0a0a] border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">O que dizem nossos membros</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Assista aos relatos reais de quem já ativou o Direct Cash Pix e está colhendo resultados diários de forma transparente e descentralizada.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              { src: depo1, title: "Resultados com doações instantâneas", duration: "Membro Ativo" },
              { src: depo2, title: "Ativação simples e rápida via PIX", duration: "Membro Ativo" },
              { src: depo3, title: "Como o sistema mudou minha perspectiva", duration: "Membro Ativo" },
              { src: depo4, title: "Crescimento acelerado em comunidade", duration: "Membro Ativo" }
            ].map((video, idx) => (
              <div key={idx} className="bg-[#121212] rounded-2xl border border-white/5 overflow-hidden group hover:border-[#00FF85]/30 transition-all flex flex-col shadow-2xl">
                <div className="relative aspect-[9/16] bg-black flex items-center justify-center overflow-hidden">
                  <video
                    src={video.src}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                    preload="metadata"
                  />
                </div>
                <div className="p-5 flex flex-col justify-between flex-grow bg-slate-950/40">
                  <div>
                    <span className="text-[10px] bg-[#00FF85]/10 text-[#00FF85] border border-[#00FF85]/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                      {video.duration}
                    </span>
                    <h4 className="text-white font-bold text-sm mt-4 group-hover:text-[#00FF85] transition-colors leading-snug">
                      {video.title}
                    </h4>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Fictitious/Written Testimonials */}
          <div className="mt-20 pt-16 border-t border-white/5">
            <div className="text-center mb-12">
              <h3 className="text-2xl font-bold text-white mb-3">Experiências de Membros</h3>
              <p className="text-slate-400 text-sm max-w-xl mx-auto">
                Confira as avaliações espontâneas compartilhadas por membros ativos da rede Direct Cash Pix.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((testimonial, i) => (
                <div key={i} className="bg-[#121212] p-8 rounded-2xl border border-white/5 hover:border-[#00FF85]/30 transition-all group">
                  <div className="flex text-[#00FF85] mb-6 gap-1">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} size={16} fill="currentColor" />
                    ))}
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed mb-8 italic">
                    "{testimonial.text}"
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold border border-white/10 group-hover:border-[#00FF85]/50 transition-colors">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm">{testimonial.name}</h4>
                      <p className="text-slate-500 text-xs">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-16 flex justify-center">
              <button 
                onClick={onStart}
                className="bg-[#00FF85] hover:bg-[#00cc6a] text-[#121212] font-bold text-lg px-8 py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(0,255,133,0.3)] hover:shadow-[0_0_40px_rgba(0,255,133,0.5)] cursor-pointer flex items-center gap-2"
              >
                Ativar Meu Fluxo <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Security FAQ */}
      <section id="faq" className="py-24 px-6 relative">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#00FF85]/10 text-[#00FF85] mb-6 border border-[#00FF85]/20">
              <Lock size={32} />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Transparência e Segurança</h2>
            <p className="text-slate-400">Tire suas dúvidas sobre o funcionamento legal e técnico.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-[#161616] border border-white/5 rounded-2xl p-6 hover:border-[#00FF85]/20 transition-colors">
                <h4 className="text-lg font-bold text-white mb-2 flex items-start gap-3">
                  <CheckCircle2 className="text-[#00FF85] shrink-0 mt-0.5" size={20} />
                  {faq.q}
                </h4>
                <p className="text-slate-400 text-sm pl-8 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Legal & Footer */}
      <footer className="bg-[#0a0a0a] pt-16 pb-8 border-t border-white/5 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <img src="/src/assets/images/direct_cash_pix_logo_1784486102011.jpg" alt="Direct Cash Pix" className="w-48 h-auto rounded-xl object-cover opacity-90" style={{ height: '103.722px' }} referrerPolicy="no-referrer" />
              </div>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                Plataforma de tecnologia descentralizada de direcionamento PIX. Não somos instituição financeira.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-8 text-xs text-slate-400">
              <div>
                <h5 className="font-bold text-slate-200 mb-4 uppercase tracking-widest">Compliance</h5>
                <ul className="space-y-3">
                  <li onClick={() => setView('terms')} className="hover:text-[#00FF85] cursor-pointer transition-colors">Termos de Uso</li>
                  <li onClick={() => setView('privacy')} className="hover:text-[#00FF85] cursor-pointer transition-colors">Política de Privacidade</li>
                  <li onClick={() => setView('legal')} className="hover:text-[#00FF85] cursor-pointer transition-colors">Aviso Legal</li>
                  {onAdminClick && (
                    <li onClick={onAdminClick} className="text-slate-500 hover:text-[#00FF85] cursor-pointer transition-colors font-medium border-t border-white/5 pt-2 mt-2">
                      Acesso Admin
                    </li>
                  )}
                </ul>
              </div>
              <div>
                <h5 className="font-bold text-slate-200 mb-4 uppercase tracking-widest">Legalidade</h5>
                <p className="leading-relaxed mb-3">
                  <strong className="text-slate-300">Uso da Chave:</strong> Sua chave PIX será exposta unicamente a usuários da sua rede de forma segura.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-slate-300">Isenção:</strong> As doações são voluntárias e irreversíveis. Não há garantia de retorno.
                </p>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-600">
            <p>© {new Date().getFullYear()} Direct Cash Pix. Todos os direitos reservados.</p>
            <div className="flex items-center gap-4">
              <p>Infraestrutura Operacional Protegida</p>
              {onAdminClick && (
                <button 
                  onClick={onAdminClick} 
                  className="hover:text-[#00FF85] text-slate-500 hover:underline cursor-pointer transition-all uppercase tracking-wider text-[10px] font-bold bg-white/5 hover:bg-[#00FF85]/10 px-2.5 py-1 rounded-md border border-white/5 hover:border-[#00FF85]/30"
                >
                  Acesso Admin
                </button>
              )}
            </div>
          </div>
        </div>
      </footer>

      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col">
            <button 
              onClick={() => setShowVideoModal(false)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-[#00FF85] transition-colors cursor-pointer bg-white/5 hover:bg-white/10 rounded-full"
            >
              <X size={24} />
            </button>
            <div className="bg-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative aspect-video flex items-center justify-center">
              {promoVideo.includes('drive.google.com') ? (
                <iframe
                  className="w-full h-full border-0 absolute inset-0"
                  src={promoVideo.replace('/view?usp=sharing', '/preview').replace('/view', '/preview')}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <video 
                  src={promoVideo}
                  controls 
                  autoPlay 
                  className="w-full h-full object-contain"
                  playsInline
                  controlsList="nodownload"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
