import React from 'react';
import { 
  UserPlus, 
  Send, 
  FileCheck2, 
  Share2, 
  Users, 
  TrendingUp, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Wallet, 
  Layers, 
  Sparkles,
  ArrowDown,
  PieChart
} from 'lucide-react';

interface InfographicProps {
  onStart?: () => void;
}

export default function Infographic({ onStart }: InfographicProps) {
  const levels = [
    {
      level: 1,
      members: 5,
      unitValue: 10,
      total: 50,
      position: '1º Nível (Directs)',
      percentage: '1.28%',
      color: 'from-emerald-500/20 to-[#00FF85]/10',
      borderColor: 'border-[#00FF85]/30'
    },
    {
      level: 2,
      members: 25,
      unitValue: 10,
      total: 250,
      position: '2º Nível',
      percentage: '6.40%',
      color: 'from-emerald-500/20 to-[#00FF85]/10',
      borderColor: 'border-[#00FF85]/30'
    },
    {
      level: 3,
      members: 125,
      unitValue: 10,
      total: 1250,
      position: '3º Nível',
      percentage: '32.0%',
      color: 'from-emerald-500/20 to-[#00FF85]/10',
      borderColor: 'border-[#00FF85]/30'
    },
    {
      level: 4,
      members: 625,
      unitValue: 10,
      total: 6250,
      position: '4º Nível',
      percentage: '16.0%',
      color: 'from-emerald-500/20 to-[#00FF85]/10',
      borderColor: 'border-[#00FF85]/30'
    },
    {
      level: 5,
      members: 3125,
      unitValue: 10,
      total: 31250,
      position: '5º Nível',
      percentage: '80.0%',
      color: 'from-[#00FF85]/30 to-emerald-400/20',
      borderColor: 'border-[#00FF85]/60'
    }
  ];

  return (
    <section id="infografico" className="py-24 px-4 sm:px-6 bg-[#0a0a0a] text-white relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[#00FF85]/5 blur-[120px] pointer-events-none rounded-full"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header Title */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00FF85]/10 border border-[#00FF85]/20 text-[#00FF85] text-xs font-bold tracking-widest uppercase mb-4 shadow-[0_0_15px_rgba(0,255,133,0.15)]">
            <PieChart size={14} />
            Infográfico Visual de Ganhos
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-4">
            Sistema Ajuda Mútua
          </h2>
          <p className="text-slate-300 max-w-3xl mx-auto text-base sm:text-lg leading-relaxed">
            Entenda graficamente como um investimento inicial único de <span className="text-[#00FF85] font-bold">R$ 50,00</span> pode se transformar em mais de <span className="text-[#00FF85] font-bold">R$ 39.000,00</span> através da duplicação direta na rede.
          </p>
        </div>

        {/* STEP 1: JORNADA DO MEMBRO (HORIZONTAL FLOW / CARDS) */}
        <div className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#00FF85]/10 border border-[#00FF85]/30 flex items-center justify-center text-[#00FF85] font-bold text-sm font-mono">
              01
            </div>
            <h3 className="text-2xl font-bold text-white">Etapas de Ativação do Membro</h3>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            
            {/* Step 1 Card */}
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 relative group hover:border-[#00FF85]/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-[#00FF85] mb-5 group-hover:scale-110 transition-transform">
                  <UserPlus size={24} />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">1. Cadastro e Acesso</h4>
                <p className="text-slate-400 text-xs leading-relaxed mb-4">
                  Inscrição rápida com seus dados e chave PIX para acessar seu Escritório Virtual.
                </p>
              </div>
              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Passo Inicial</span>
                <span className="text-[#00FF85]">Gratuito</span>
              </div>
            </div>

            {/* Step 2 Card */}
            <div className="bg-[#121212] border border-[#00FF85]/30 rounded-2xl p-6 relative group hover:border-[#00FF85]/60 transition-all flex flex-col justify-between shadow-[0_0_20px_rgba(0,255,133,0.05)]">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#00FF85]/10 border border-[#00FF85]/30 flex items-center justify-center text-[#00FF85] mb-5 group-hover:scale-110 transition-transform">
                  <Wallet size={24} />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">2. Doação de R$ 50</h4>
                <p className="text-slate-400 text-xs leading-relaxed mb-4">
                  O valor de R$ 50 é dividido em 5 envios diretos de R$ 10,00 via PIX para seus 5 patrocinadores superiores (Up-lines).
                </p>
              </div>
              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>5 x R$ 10,00</span>
                <span className="text-[#00FF85] font-bold">Direct PIX</span>
              </div>
            </div>

            {/* Step 3 Card */}
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 relative group hover:border-[#00FF85]/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-[#00FF85] mb-5 group-hover:scale-110 transition-transform">
                  <FileCheck2 size={24} />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">3. Envio de Comprovantes</h4>
                <p className="text-slate-400 text-xs leading-relaxed mb-4">
                  Você anexa os 5 comprovantes. Quando os recebedores confirmam o PIX, sua conta é ativada imediatamente.
                </p>
              </div>
              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Comprovação</span>
                <span className="text-amber-400">100% Verificado</span>
              </div>
            </div>

            {/* Step 4 Card */}
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 relative group hover:border-[#00FF85]/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-[#00FF85] mb-5 group-hover:scale-110 transition-transform">
                  <Share2 size={24} />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">4. Seu Link de Indicação</h4>
                <p className="text-slate-400 text-xs leading-relaxed mb-4">
                  Ativo, você obtém seu link exclusivo de divulgação com seu nome como o novo convidante principal da rede.
                </p>
              </div>
              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Divulgação</span>
                <span className="text-[#00FF85]">Desbloqueado</span>
              </div>
            </div>

          </div>
        </div>

        {/* STEP 2: O PODER DA REDE & TABELA DE NÍVEIS */}
        <div className="mb-20 bg-[#121212] border border-white/10 rounded-3xl p-6 sm:p-10 relative overflow-hidden">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-8 border-b border-white/10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#00FF85]/10 border border-[#00FF85]/30 flex items-center justify-center text-[#00FF85] font-bold text-sm font-mono">
                  02
                </div>
                <h3 className="text-2xl font-bold text-white">O Poder da Rede (Simulação de Duplicação)</h3>
              </div>
              <p className="text-slate-400 text-sm max-w-2xl">
                Ao indicar apenas 5 pessoas e cada uma duplicar o processo até o 5º nível, você participa diretamente do roteamento de doações de <strong className="text-white">3.905 membros</strong>.
              </p>
            </div>

            <div className="bg-[#161616] p-4 rounded-2xl border border-[#00FF85]/30 flex items-center gap-4 shrink-0 shadow-[0_0_20px_rgba(0,255,133,0.1)]">
              <div className="w-12 h-12 rounded-xl bg-[#00FF85] text-slate-950 flex items-center justify-center font-extrabold">
                <Sparkles size={24} />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-mono font-bold tracking-wider block">Acumulado Potencial</span>
                <span className="text-2xl font-black text-[#00FF85] font-mono">R$ 39.050,00</span>
              </div>
            </div>
          </div>

          {/* Level Cards Breakdown */}
          <div className="space-y-4">
            {levels.map((item) => (
              <div 
                key={item.level}
                className={`bg-[#161616] border ${item.borderColor} rounded-2xl p-4 sm:p-6 transition-all hover:translate-x-1 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4`}
              >
                {/* Level Title & Badge */}
                <div className="flex items-center gap-4 min-w-[200px]">
                  <div className="w-12 h-12 rounded-xl bg-[#00FF85]/10 border border-[#00FF85]/30 flex items-center justify-center text-[#00FF85] font-bold font-mono text-lg shrink-0">
                    {item.level}º
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-mono tracking-wider block">Posição na Rede</span>
                    <h4 className="text-white font-bold text-base flex items-center gap-2">
                      {item.position}
                    </h4>
                  </div>
                </div>

                {/* Calculation Details */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 lg:gap-8 w-full lg:w-auto text-left lg:text-center font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Membros na Rede</span>
                    <span className="text-sm sm:text-base text-slate-200 font-bold flex items-center lg:justify-center gap-1.5 mt-0.5">
                      <Users size={14} className="text-[#00FF85]" />
                      {item.members.toLocaleString('pt-BR')} pessoas
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Valor Recebido</span>
                    <span className="text-sm sm:text-base text-slate-200 font-bold block mt-0.5">
                      R$ {item.unitValue},00 / un
                    </span>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Subtotal em Doações</span>
                    <span className="text-base sm:text-lg text-[#00FF85] font-black block mt-0.5">
                      R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Progress Visual */}
                <div className="w-full lg:w-48 bg-black/50 p-2 rounded-xl border border-white/5 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 text-[11px]">Proporção</span>
                  <span className="text-[#00FF85] font-bold">{item.percentage}</span>
                </div>
              </div>
            ))}
          </div>

          {/* TOTAL BANNER SUMMARY */}
          <div className="mt-8 bg-gradient-to-r from-emerald-950/80 via-[#161616] to-emerald-950/80 border-2 border-[#00FF85]/40 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-[0_0_30px_rgba(0,255,133,0.15)]">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-14 h-14 rounded-2xl bg-[#00FF85] text-slate-950 flex items-center justify-center shrink-0 font-extrabold shadow-lg">
                <TrendingUp size={28} />
              </div>
              <div>
                <span className="text-xs text-[#00FF85] uppercase tracking-widest font-mono font-bold block">
                  Capacidade Total do Sistema (5 Níveis)
                </span>
                <h4 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                  3.905 Pessoas <span className="text-slate-400 text-sm font-normal">na sua matriz</span>
                </h4>
              </div>
            </div>

            <div className="text-center sm:text-right w-full sm:w-auto bg-black/40 px-6 py-4 rounded-xl border border-white/10">
              <span className="text-xs text-slate-400 uppercase font-mono block mb-1">Total Geral Acumulado</span>
              <span className="text-3xl font-black text-[#00FF85] font-mono">
                R$ 39.050,00
              </span>
            </div>
          </div>
        </div>

        {/* STEP 3: POR QUE PARTICIPAR (BENEFITS) */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-[#121212] border border-white/10 rounded-2xl p-8 hover:border-[#00FF85]/30 transition-all flex gap-5 items-start">
            <div className="w-12 h-12 rounded-xl bg-[#00FF85]/10 border border-[#00FF85]/30 flex items-center justify-center text-[#00FF85] shrink-0">
              <ShieldCheck size={26} />
            </div>
            <div>
              <h4 className="text-xl font-bold text-white mb-2">Liberdade de Gestão</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Através do Escritório Virtual intuitivo, você acompanha em tempo real a evolução da sua rede, solicitações de comprovante e confirmações de recebimento PIX.
              </p>
            </div>
          </div>

          <div className="bg-[#121212] border border-white/10 rounded-2xl p-8 hover:border-[#00FF85]/30 transition-all flex gap-5 items-start">
            <div className="w-12 h-12 rounded-xl bg-[#00FF85]/10 border border-[#00FF85]/30 flex items-center justify-center text-[#00FF85] shrink-0">
              <CheckCircle2 size={26} />
            </div>
            <div>
              <h4 className="text-xl font-bold text-white mb-2">Negócio 100% Sem Intermediários</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                O sistema opera de pessoa para pessoa (P2P). O dinheiro nunca fica retido na plataforma, circulando diretamente entre as contas bancárias dos participantes.
              </p>
            </div>
          </div>
        </div>

        {/* Call To Action Button */}
        {onStart && (
          <div className="text-center">
            <button 
              onClick={onStart}
              className="bg-[#00FF85] hover:bg-[#00cc6a] text-[#121212] font-extrabold text-lg px-10 py-5 rounded-2xl transition-all shadow-[0_0_30px_rgba(0,255,133,0.3)] hover:shadow-[0_0_50px_rgba(0,255,133,0.5)] cursor-pointer inline-flex items-center gap-3 hover:scale-105"
            >
              Ativar Meu Fluxo Agora
              <ArrowRight size={22} />
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
