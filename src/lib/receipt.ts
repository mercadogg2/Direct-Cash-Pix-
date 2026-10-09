/**
 * Generates a beautiful SVG representation of a PIX receipt on-the-fly.
 * Returns a data URI that can be used directly as an image src.
 */
export const generateSimulatedReceiptSvg = (
  senderName: string,
  receiverName: string,
  amount: number,
  dateStr: string,
  txId?: string
): string => {
  const finalTxId = txId || `E${Math.random().toString().substring(2, 22)}`;
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 620" width="100%" height="100%" style="background-color:#0b0f19; font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#ffffff;">
    <!-- Background card -->
    <rect width="100%" height="100%" fill="#0b0f19"/>
    <rect x="15" y="15" width="370" height="590" rx="20" fill="#0f172a" stroke="#1e293b" stroke-width="1.5"/>
    
    <!-- Success Badge -->
    <circle cx="200" cy="85" r="32" fill="#32bcad" opacity="0.12"/>
    <circle cx="200" cy="85" r="24" fill="#32bcad" opacity="0.2"/>
    <path d="M192 85 l5 5 l10 -10" stroke="#32bcad" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    
    <!-- Title -->
    <text x="200" y="145" font-size="16" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">Comprovante PIX</text>
    <text x="200" y="165" font-size="11" font-weight="600" fill="#32bcad" text-anchor="middle" letter-spacing="1">DIRECT CASH PIX</text>
    
    <!-- Amount -->
    <text x="200" y="225" font-size="34" font-weight="800" fill="#ffffff" text-anchor="middle">R$ ${amount.toFixed(2).replace('.', ',')}</text>
    <text x="200" y="248" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle">Transferência realizada com sucesso</text>
    
    <!-- Dashed Separator -->
    <line x1="35" y1="275" x2="365" y2="275" stroke="#334155" stroke-width="1.5" stroke-dasharray="6,6"/>
    
    <!-- Transaction Details -->
    <!-- Pagador -->
    <text x="35" y="312" font-size="10" font-weight="700" fill="#64748b" letter-spacing="0.5">PAGADOR</text>
    <text x="35" y="332" font-size="14" font-weight="700" fill="#ffffff">${senderName}</text>
    <text x="35" y="348" font-size="11" font-weight="500" fill="#94a3b8">Instituição: Banco Digital DirectCash</text>
    
    <!-- Recebedor -->
    <text x="35" y="395" font-size="10" font-weight="700" fill="#64748b" letter-spacing="0.5">RECEBEDOR</text>
    <text x="35" y="415" font-size="14" font-weight="700" fill="#ffffff">${receiverName}</text>
    <text x="35" y="431" font-size="11" font-weight="500" fill="#94a3b8">Instituição: Banco do Recebedor (PIX)</text>
    
    <!-- Dashed Separator -->
    <line x1="35" y1="465" x2="365" y2="465" stroke="#334155" stroke-width="1.5" stroke-dasharray="6,6"/>
    
    <!-- Timestamp & Auth -->
    <text x="35" y="500" font-size="10" font-weight="700" fill="#64748b" letter-spacing="0.5">DATA E HORA</text>
    <text x="35" y="518" font-size="12" font-weight="600" fill="#e2e8f0">${dateStr}</text>
    
    <text x="35" y="555" font-size="10" font-weight="700" fill="#64748b" letter-spacing="0.5">CÓDIGO DE AUTENTICAÇÃO</text>
    <text x="35" y="573" font-size="11" font-family="monospace" font-weight="600" fill="#32bcad">${finalTxId}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
