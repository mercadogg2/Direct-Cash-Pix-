import React from 'react';
import { ArrowLeft } from 'lucide-react';

type ComplianceType = 'terms' | 'privacy' | 'legal';

interface ComplianceProps {
  type: ComplianceType;
  onBack: () => void;
}

export default function Compliance({ type, onBack }: ComplianceProps) {
  const content = {
    terms: {
      title: 'Termos de Uso',
      body: (
        <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <p>Bem-vindo ao Direct Cash Pix. Ao utilizar nosso sistema, você concorda com os seguintes termos:</p>
          <h3 className="text-white font-bold text-base mt-6">1. Natureza do Sistema</h3>
          <p>O Direct Cash Pix é uma plataforma de organização e direcionamento de doações voluntárias entre pessoas físicas (P2P). Não somos uma instituição financeira, não somos um fundo de investimento e não retemos fundos de usuários em nenhum momento.</p>
          <h3 className="text-white font-bold text-base mt-6">2. Doações Voluntárias</h3>
          <p>Todas as transferências realizadas via PIX são de caráter exclusivo de doação espontânea. Não há qualquer promessa, garantia ou obrigatoriedade de retorno financeiro. Os valores transferidos são irreversíveis e não passíveis de reembolso por parte da plataforma.</p>
          <h3 className="text-white font-bold text-base mt-6">3. Responsabilidade do Usuário</h3>
          <p>Você é integralmente responsável pelas informações fornecidas, incluindo a exatidão da sua chave PIX. A plataforma não se responsabiliza por doações enviadas para chaves incorretas cadastradas pelo usuário.</p>
          <h3 className="text-white font-bold text-base mt-6">4. Isenção de Garantias</h3>
          <p>O uso da plataforma é por sua conta e risco. O algoritmo apenas organiza a ordem de quem deve receber as doações, dependendo inteiramente da entrada voluntária de novos participantes na sua rede.</p>
        </div>
      )
    },
    privacy: {
      title: 'Política de Privacidade',
      body: (
        <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <p>A sua privacidade é fundamental para nós. Esta política descreve como tratamos os seus dados no Direct Cash Pix.</p>
          <h3 className="text-white font-bold text-base mt-6">1. Dados Coletados</h3>
          <p>Coletamos apenas as informações estritamente necessárias para o funcionamento do sistema de roteamento P2P: seu nome, e-mail (para autenticação) e sua chave PIX (para recebimento das doações).</p>
          <h3 className="text-white font-bold text-base mt-6">2. Uso da Chave PIX</h3>
          <p>Sua chave PIX será exibida única e exclusivamente para os membros da sua rede (linha descendente) no momento em que eles forem orientados pelo algoritmo a realizar uma doação para você.</p>
          <h3 className="text-white font-bold text-base mt-6">3. Segurança dos Dados</h3>
          <p>Seus dados são armazenados de forma segura em nossa infraestrutura na nuvem. Nós não temos acesso e não solicitamos senhas bancárias, tokens de acesso do seu banco ou permissões de débito automático.</p>
          <h3 className="text-white font-bold text-base mt-6">4. Compartilhamento</h3>
          <p>Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros sob nenhuma circunstância, exceto a exibição da sua chave PIX para o pagador específico no momento da doação.</p>
        </div>
      )
    },
    legal: {
      title: 'Aviso Legal',
      body: (
        <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <p>Por favor, leia atentamente as seguintes informações legais sobre o funcionamento do Direct Cash Pix.</p>
          <h3 className="text-white font-bold text-base mt-6">1. Amparo Legal</h3>
          <p>A prática de doações financeiras espontâneas entre pessoas físicas, sem contraprestação de serviços ou produtos, é uma atividade lícita amparada pelo Código Civil Brasileiro (Lei nº 10.406/2002), Título VI, Capítulo I (Das Doações).</p>
          <h3 className="text-white font-bold text-base mt-6">2. Não é Investimento</h3>
          <p>O sistema Direct Cash Pix NÃO se configura como oferta pública de investimento, valor mobiliário, marketing multinível de produtos, pirâmide financeira atrelada a promessas irreais ou consórcio. Não prometemos juros, dividendos ou lucros.</p>
          <h3 className="text-white font-bold text-base mt-6">3. Risco Envolvido</h3>
          <p>A atividade baseia-se unicamente na economia colaborativa. O sucesso e o recebimento de doações dependem inteiramente do engajamento social e do convite a novos participantes para a rede. Se a rede parar de crescer, o fluxo de doações é interrompido.</p>
          <h3 className="text-white font-bold text-base mt-6">4. Tributação</h3>
          <p>O usuário é inteiramente responsável por declarar os valores recebidos a título de doação aos órgãos competentes (como a Receita Federal, via ITCMD ou IRPF, conforme a legislação do seu estado/país de residência).</p>
        </div>
      )
    }
  };

  const { title, body } = content[type];

  return (
    <div className="min-h-screen bg-[#121212] pt-32 pb-12 px-6">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-[#00FF85] hover:text-[#00cc6a] transition-colors mb-8 text-sm font-bold uppercase tracking-widest cursor-pointer"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-8">{title}</h1>
        <div className="bg-[#161616] border border-white/5 p-6 md:p-10 rounded-2xl">
          {body}
        </div>
      </div>
    </div>
  );
}
