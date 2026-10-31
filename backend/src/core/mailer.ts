// Envio de e-mails sem dependências extras. MAIL_DRIVER=console (padrão, imprime no terminal do servidor) ou resend (API HTTP).
export const publicUrl = () => (process.env.PUBLIC_URL ?? process.env.APP_ORIGIN ?? 'http://localhost:3333').replace(/\/+$/, '');
export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  const driver = process.env.MAIL_DRIVER ?? 'console';
  if (driver === 'resend') {
    const key = process.env.RESEND_API_KEY, from = process.env.MAIL_FROM;
    if (!key || !from) throw new Error('RESEND_API_KEY e MAIL_FROM são necessários para MAIL_DRIVER=resend.');
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text }), signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`Provedor de e-mail respondeu ${response.status}.`);
    return;
  }
  if (process.env.NODE_ENV === 'production') console.warn('[e-mail] MAIL_DRIVER=console em produção: nenhuma mensagem será entregue.');
  console.log(`\n[e-mail simulado]\nPara: ${to}\nAssunto: ${subject}\n${text}\n`);
}
export function notifyMail(to: string, subject: string, text: string) {
  void sendMail(to, subject, text).catch(error => console.error('[e-mail] falha ao enviar:', error instanceof Error ? error.message : error));
}
