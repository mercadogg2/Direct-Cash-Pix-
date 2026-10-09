import React, { useState } from 'react';
import { Calculator as CalcIcon, DollarSign, TrendingUp } from 'lucide-react';

export default function Calculator() {
  const [directReferrals, setDirectReferrals] = useState<number>(5);

  const calculateGains = () => {
    let gains = [];
    let currentMembers = 1;
    let total = 0;

    for (let i = 1; i <= 5; i++) {
      currentMembers = currentMembers * directReferrals;
      const levelGain = currentMembers * 10;
      total += levelGain;
      gains.push({
        level: i,
        members: currentMembers,
        gain: levelGain
      });
    }

    return { gains, total };
  };

  const { gains, total } = calculateGains();

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-slate-800/50 text-[#32BCAD] rounded-lg">
            <CalcIcon size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-white">Calculadora de Projeção</h3>
            <p className="text-slate-400 text-sm">Projete seus recebimentos com base em indicações</p>
          </div>
        </div>

        <div className="mb-8">
          <label className="block text-[10px] font-medium text-slate-500 uppercase mb-4">
            Membros Diretos (Se cada pessoa convidar quantas?)
          </label>
          <div className="flex items-center gap-4">
            <input 
              type="range" 
              min="1" 
              max="10" 
              value={directReferrals} 
              onChange={(e) => setDirectReferrals(parseInt(e.target.value))}
              className="flex-1 accent-[#32BCAD] bg-slate-800 rounded-lg h-1.5 cursor-pointer" 
            />
            <div className="w-16 h-12 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center font-bold text-xl text-[#32BCAD]">
              {directReferrals}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-slate-500 uppercase bg-slate-800/50 tracking-widest">
              <tr>
                <th className="px-4 py-3 rounded-l-lg">Nível</th>
                <th className="px-4 py-3">Membros</th>
                <th className="px-4 py-3">Valor por Doação</th>
                <th className="px-4 py-3 rounded-r-lg text-right">Total Recebido</th>
              </tr>
            </thead>
            <tbody>
              {gains.map((g) => (
                <tr key={g.level} className="border-b border-slate-800/50 last:border-0">
                  <td className="px-4 py-4 font-bold text-white">Nível {g.level}</td>
                  <td className="px-4 py-4 text-slate-300 font-mono">{g.members.toLocaleString()}</td>
                  <td className="px-4 py-4 text-slate-400">R$ 10,00</td>
                  <td className="px-4 py-4 text-right font-bold text-[#32BCAD]">
                    R$ {g.gain.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 p-6 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Ganhos Acumulados Potenciais</span>
          <span className="text-4xl font-black text-white tracking-tight">
            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}
