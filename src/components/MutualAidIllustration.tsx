import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Play, Sparkles, HeartHandshake, ShieldCheck, ArrowRight, Zap, RefreshCw } from 'lucide-react';

interface MutualAidIllustrationProps {
  onOpenVideo?: () => void;
}

export default function MutualAidIllustration({ onOpenVideo }: MutualAidIllustrationProps) {
  const [activeNode, setActiveNode] = useState<number | null>(null);

  const nodes = [
    { id: 1, label: 'Nível 1', role: 'Indicador Direto', x: 300, y: 70, amount: 'R$ 10', delay: 0 },
    { id: 2, label: 'Nível 2', role: '2ª Geração', x: 485, y: 155, amount: 'R$ 10', delay: 0.2 },
    { id: 3, label: 'Nível 3', role: '3ª Geração', x: 435, y: 345, amount: 'R$ 10', delay: 0.4 },
    { id: 4, label: 'Nível 4', role: '4ª Geração', x: 165, y: 345, amount: 'R$ 10', delay: 0.6 },
    { id: 5, label: 'Nível 5', role: '5ª Geração', x: 115, y: 155, amount: 'R$ 10', delay: 0.8 },
  ];

  return (
    <div className="relative w-full rounded-2xl bg-gradient-to-b from-[#111827] via-[#0b111e] to-[#030712] border border-emerald-500/20 overflow-hidden shadow-2xl group select-none">
      {/* Decorative Grid and Ambient Lights */}
      <div className="absolute inset-0 bg-[radial-gradient(#00FF85_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-[#00FF85]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-4 right-4 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header bar / Window Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0a0f1d]/90 border-b border-white/10 backdrop-blur-sm z-20 relative">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
          </div>
          <span className="text-[11px] font-mono text-emerald-400/90 font-medium ml-1 flex items-center gap-1.5">
            <HeartHandshake size={13} className="text-[#00FF85]" />
            Rede_Ajuda_Mutua_P2P.svg
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00FF85]/10 border border-[#00FF85]/30 text-[10px] text-[#00FF85] font-semibold">
            <Sparkles size={10} /> 100% Direto • Sem Retenção
          </span>
          {onOpenVideo && (
            <button
              onClick={onOpenVideo}
              title="Assistir vídeo de apresentação"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold transition-all hover:scale-105 cursor-pointer shadow-sm"
            >
              <Play size={11} className="fill-amber-400" />
              <span className="text-[11px]">Ver Vídeo</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Vector SVG Canvas */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/11] flex items-center justify-center p-2 sm:p-4">
        <svg
          viewBox="0 0 600 450"
          className="w-full h-full max-w-[560px] overflow-visible drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)]"
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="centerGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00FF85" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00FF85" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#00FF85" stopOpacity="0.8" />
            </linearGradient>

            <linearGradient id="peerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>

            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>

            {/* Glow Filter */}
            <filter id="vectorGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* PIX Symbol Template */}
            <g id="pixIcon">
              <path
                d="M-7,-7 L0,-14 L7,-7 L0,0 Z M-7,7 L0,0 L7,7 L0,14 Z"
                fill="#32BCAD"
              />
            </g>
          </defs>

          {/* Background Circular Network Ring */}
          <circle
            cx="300"
            cy="225"
            r="165"
            fill="none"
            stroke="#10b981"
            strokeWidth="1.5"
            strokeDasharray="6 8"
            strokeOpacity="0.25"
            className="animate-[spin_60s_linear_infinite] origin-[300px_225px]"
          />
          <circle
            cx="300"
            cy="225"
            r="115"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1"
            strokeDasharray="4 6"
            strokeOpacity="0.2"
            className="animate-[spin_40s_linear_infinite_reverse] origin-[300px_225px]"
          />

          {/* Interconnecting Peer Polygon (Solidarity Web) */}
          <polygon
            points="300,70 485,155 435,345 165,345 115,155"
            fill="url(#centerGlow)"
            fillOpacity="0.03"
            stroke="#00FF85"
            strokeWidth="1"
            strokeOpacity="0.2"
            strokeDasharray="3 4"
          />

          {/* Connection Lines from Center (Você) to 5 Mutual Aid Nodes */}
          {nodes.map((node) => {
            const isHovered = activeNode === node.id;
            return (
              <g key={`link-${node.id}`}>
                {/* Glow Underline */}
                <line
                  x1="300"
                  y1="225"
                  x2={node.x}
                  y2={node.y}
                  stroke="#00FF85"
                  strokeWidth={isHovered ? '4' : '2'}
                  strokeOpacity={isHovered ? '0.7' : '0.2'}
                  filter={isHovered ? 'url(#vectorGlow)' : undefined}
                  className="transition-all duration-300"
                />

                {/* Animated Pulsing Dash Line */}
                <line
                  x1="300"
                  y1="225"
                  x2={node.x}
                  y2={node.y}
                  stroke="url(#lineGrad)"
                  strokeWidth="2.5"
                  strokeDasharray="6 8"
                  className="animate-[dash_1.5s_linear_infinite]"
                  style={{ animationDelay: `${node.delay}s` }}
                />

                {/* Animated PIX / Currency Donation Particle Traveling Along Vector */}
                <circle
                  r="4"
                  fill="#00FF85"
                  filter="url(#vectorGlow)"
                >
                  <animateMotion
                    path={`M 300 225 L ${node.x} ${node.y}`}
                    dur="2.2s"
                    repeatCount="indefinite"
                    begin={`${node.delay}s`}
                  />
                </circle>

                {/* Transfer Value Badge along the midpoint */}
                <g
                  transform={`translate(${(300 + node.x) / 2}, ${(225 + node.y) / 2})`}
                  className="cursor-pointer"
                  onClick={() => setActiveNode(node.id)}
                >
                  <rect
                    x="-26"
                    y="-11"
                    width="52"
                    height="22"
                    rx="11"
                    fill="#041b14"
                    stroke="#00FF85"
                    strokeWidth="1"
                    strokeOpacity="0.6"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill="#00FF85"
                    fontSize="9.5"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                  >
                    PIX {node.amount}
                  </text>
                </g>
              </g>
            );
          })}

          {/* 5 Outer Peer Nodes (Beneficiários da Ajuda Mútua) */}
          {nodes.map((node) => {
            const isHovered = activeNode === node.id;
            return (
              <g
                key={`node-${node.id}`}
                className="cursor-pointer transition-transform duration-300"
                onMouseEnter={() => setActiveNode(node.id)}
                onMouseLeave={() => setActiveNode(null)}
                onClick={() => setActiveNode(activeNode === node.id ? null : node.id)}
              >
                {/* Ambient node glow */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isHovered ? 34 : 28}
                  fill="#00FF85"
                  fillOpacity={isHovered ? 0.25 : 0.08}
                  filter="url(#vectorGlow)"
                  className="transition-all duration-300"
                />

                {/* Node Outer Circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="24"
                  fill="url(#peerGrad)"
                  stroke={isHovered ? '#00FF85' : '#334155'}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  className="transition-all duration-300"
                />

                {/* User/Avatar Vector Silhouette */}
                <g transform={`translate(${node.x - 10}, ${node.y - 10})`}>
                  <circle cx="10" cy="6" r="4.5" fill={isHovered ? '#00FF85' : '#94A3B8'} />
                  <path
                    d="M3 18 C3 13, 6 12, 10 12 C14 12, 17 13, 17 18 Z"
                    fill={isHovered ? '#00FF85' : '#94A3B8'}
                  />
                </g>

                {/* Small PIX Emblem on Node */}
                <circle cx={node.x + 16} cy={node.y - 14} r="7" fill="#03251e" stroke="#00FF85" strokeWidth="1" />
                <path
                  d={`M ${node.x + 16 - 3} ${node.y - 14} L ${node.x + 16} ${node.y - 14 - 3} L ${node.x + 16 + 3} ${node.y - 14} L ${node.x + 16} ${node.y - 14 + 3} Z`}
                  fill="#00FF85"
                />

                {/* Node Text Label & Role */}
                <text
                  x={node.x}
                  y={node.y + 38}
                  textAnchor="middle"
                  fill="#F8FAFC"
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  {node.label}
                </text>
                <text
                  x={node.x}
                  y={node.y + 49}
                  textAnchor="middle"
                  fill="#94A3B8"
                  fontSize="8.5"
                  fontFamily="sans-serif"
                >
                  {node.role}
                </text>
              </g>
            );
          })}

          {/* Central Core: "VOCÊ" (O Participante que Ativa a Rede de Ajuda Mútua) */}
          <g className="cursor-pointer">
            {/* Multiple animated radiating rings around YOU */}
            <circle
              cx="300"
              cy="225"
              r="54"
              fill="#00FF85"
              fillOpacity="0.08"
              className="animate-ping origin-[300px_225px]"
              style={{ animationDuration: '3s' }}
            />
            <circle
              cx="300"
              cy="225"
              r="46"
              fill="none"
              stroke="#00FF85"
              strokeWidth="2"
              strokeDasharray="4 4"
              strokeOpacity="0.6"
              className="animate-[spin_18s_linear_infinite] origin-[300px_225px]"
            />

            {/* Glowing Base */}
            <circle
              cx="300"
              cy="225"
              r="38"
              fill="url(#centerGlow)"
              filter="url(#vectorGlow)"
              opacity="0.9"
            />

            {/* Core Dark Inner */}
            <circle
              cx="300"
              cy="225"
              r="34"
              fill="#0B132B"
              stroke="#00FF85"
              strokeWidth="2.5"
            />

            {/* Center Vector Icon: Mutual Aid Hands & Heart */}
            <g transform="translate(285, 210)">
              {/* Stylized Hands holding a heart / mutual aid */}
              <path
                d="M15 4 C11 0, 4 4, 8 11 L15 18 L22 11 C26 4, 19 0, 15 4 Z"
                fill="#00FF85"
              />
              <path
                d="M5 20 C10 16, 20 16, 25 20 L27 24 C20 27, 10 27, 3 24 Z"
                fill="#38BDF8"
                opacity="0.9"
              />
            </g>

            {/* Central Badge "VOCÊ" */}
            <g transform="translate(300, 275)">
              <rect
                x="-42"
                y="-13"
                width="84"
                height="26"
                rx="13"
                fill="#022C22"
                stroke="#00FF85"
                strokeWidth="1.5"
              />
              <text
                x="0"
                y="4"
                textAnchor="middle"
                fill="#00FF85"
                fontSize="11"
                fontWeight="900"
                fontFamily="sans-serif"
                letterSpacing="0.8"
              >
                VOCÊ (ATIVO)
              </text>
            </g>
          </g>

          {/* Top-Left Informational Pill */}
          <g transform="translate(25, 30)">
            <rect
              x="0"
              y="0"
              width="155"
              height="30"
              rx="15"
              fill="#0F172A"
              fillOpacity="0.85"
              stroke="#10B981"
              strokeWidth="1"
              strokeOpacity="0.4"
            />
            <circle cx="16" cy="15" r="5" fill="#00FF85" />
            <text x="28" y="19" fill="#E2E8F0" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
              Ajuda Mútua P2P
            </text>
          </g>

          {/* Bottom Floating Card: Total Distributed */}
          <g transform="translate(200, 412)">
            <rect
              x="-90"
              y="-15"
              width="180"
              height="30"
              rx="15"
              fill="#061A14"
              stroke="#00FF85"
              strokeWidth="1.2"
            />
            <text x="0" y="4" textAnchor="middle" fill="#00FF85" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
              5 Doações de R$ 10 = R$ 50
            </text>
          </g>
        </svg>

        {/* Floating Interactive Tooltip overlay when clicking a node */}
        {activeNode && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-4 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 bg-slate-900/95 border border-emerald-500/40 rounded-xl px-4 py-2.5 backdrop-blur-md shadow-xl text-center z-30"
          >
            <div className="flex items-center justify-center gap-2 text-xs text-white font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#00FF85] animate-ping" />
              Doação direta ao {nodes.find((n) => n.id === activeNode)?.label}:{' '}
              <span className="text-[#00FF85] font-bold">R$ 10,00 via PIX</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Transferência instantânea de conta bancária para conta bancária, sem intermediários.
            </p>
          </motion.div>
        )}
      </div>

      {/* Footer Info Ribbon */}
      <div className="px-4 py-3 bg-[#0a0f1d]/90 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-[#00FF85]" />
          <span>Solidariedade direta respaldada pelo Código Civil (Art. 538)</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-emerald-400/80">
          <span className="flex items-center gap-1">
            <Zap size={11} className="text-[#00FF85]" /> Roteamento P2P
          </span>
          <span className="flex items-center gap-1">
            <RefreshCw size={11} className="text-cyan-400" /> Fluxo Contínuo
          </span>
        </div>
      </div>

      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -28;
          }
        }
      `}</style>
    </div>
  );
}
