export interface ReportPaymentItem {
  id: string;
  senderName?: string;
  receiverName?: string;
  amount: number;
  level: number;
  status: 'pending' | 'pending_verification' | 'verified';
  createdAt?: any;
}

export function exportToCSV(payments: ReportPaymentItem[], userName: string, type: 'recebimentos' | 'enviados') {
  const headers = ['ID', 'Data/Hora', 'Tipo', 'Remetente / Destinatário', 'Nível', 'Valor (R$)', 'Status'];
  
  const rows = payments.map((p) => {
    let dateStr = 'N/A';
    if (p.createdAt?.seconds) {
      dateStr = new Date(p.createdAt.seconds * 1000).toLocaleString('pt-BR');
    } else if (p.createdAt instanceof Date) {
      dateStr = p.createdAt.toLocaleString('pt-BR');
    }

    const counterparty = type === 'recebimentos' ? (p.senderName || 'Anônimo') : (p.receiverName || 'Patrocinador');
    const statusLabel = p.status === 'verified' ? 'Confirmado' : p.status === 'pending_verification' ? 'Aguardando Verificação' : 'Pendente';

    return [
      `"${p.id}"`,
      `"${dateStr}"`,
      `"${type === 'recebimentos' ? 'Entrada' : 'Saída'}"`,
      `"${counterparty}"`,
      `"Nível ${p.level}"`,
      `"${p.amount.toFixed(2).replace('.', ',')}"`,
      `"${statusLabel}"`
    ].join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `extrato_direto_cash_${type}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printStatementReport(payments: ReportPaymentItem[], userName: string, totalAmount: number) {
  const rowsHtml = payments.map((p) => {
    let dateStr = 'N/A';
    if (p.createdAt?.seconds) {
      dateStr = new Date(p.createdAt.seconds * 1000).toLocaleString('pt-BR');
    } else if (p.createdAt instanceof Date) {
      dateStr = p.createdAt.toLocaleString('pt-BR');
    }

    return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-size: 12px; font-family: monospace;">${p.id.substring(0, 8)}...</td>
        <td style="padding: 10px; font-size: 12px;">${dateStr}</td>
        <td style="padding: 10px; font-size: 12px;">${p.senderName || 'Doador'}</td>
        <td style="padding: 10px; font-size: 12px; font-weight: bold;">Nível ${p.level}</td>
        <td style="padding: 10px; font-size: 12px; font-weight: bold; color: #10b981;">R$ ${p.amount.toFixed(2)}</td>
        <td style="padding: 10px; font-size: 12px;">${p.status === 'verified' ? '✅ Confirmado' : '⏳ Pendente'}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Extrato de Doações - Direct Cash</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #32BCAD; padding-bottom: 15px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; color: #0f172a; }
          .meta { font-size: 12px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { text-align: left; background: #f8fafc; padding: 10px; font-size: 11px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; }
          .total { margin-top: 20px; text-align: right; font-size: 16px; font-weight: bold; color: #10b981; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">DIRECT CASH - Extrato Oficial de Doações</div>
            <div class="meta">Membro: ${userName} | Data de Emissão: ${new Date().toLocaleString('pt-BR')}</div>
          </div>
          <div style="font-size: 24px; font-weight: 900; color: #32BCAD;">Direct Cash</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID da Transação</th>
              <th>Data/Hora</th>
              <th>Origem</th>
              <th>Nível</th>
              <th>Valor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="total">
          Total Confirmado: R$ ${totalAmount.toFixed(2).replace('.', ',')}
        </div>
      </body>
    </html>
  `;

  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 2000);
      }, 500);
    }
  } catch (err) {
    console.error("Erro ao imprimir extrato:", err);
  }
}
