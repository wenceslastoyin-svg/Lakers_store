// Fonctions d'envoi de notifications partagées :
//   * e-mail à l'administrateur via Resend (https://resend.com)
//   * message WhatsApp à l'administrateur via CallMeBot (gratuit, voir SETUP.md)

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'LAKERS STORE <onboarding@resend.dev>'
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') ?? ''

const CALLMEBOT_API_KEY = Deno.env.get('CALLMEBOT_API_KEY') ?? ''
const CALLMEBOT_PHONE = Deno.env.get('CALLMEBOT_PHONE') ?? ''

// ---------------------------------------------------------------------------
// E-mail via Resend
// ---------------------------------------------------------------------------
export async function sendEmail({ subject, html, to = ADMIN_EMAIL }) {
  if (!RESEND_API_KEY || !to) {
    console.warn('Resend non configuré : e-mail ignoré.')
    return { ok: false, reason: 'not_configured' }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html })
  })

  if (!response.ok) {
    const detail = await response.text()
    console.error('Échec de l’envoi Resend :', detail)
    return { ok: false, reason: detail }
  }

  return { ok: true }
}

// ---------------------------------------------------------------------------
// WhatsApp via CallMeBot (solution la plus simple et la moins chère : gratuite)
// ---------------------------------------------------------------------------
export async function sendWhatsApp(text) {
  if (!CALLMEBOT_API_KEY || !CALLMEBOT_PHONE) {
    console.warn('CallMeBot non configuré : message WhatsApp ignoré.')
    return { ok: false, reason: 'not_configured' }
  }

  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
    CALLMEBOT_PHONE
  )}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(CALLMEBOT_API_KEY)}`

  const response = await fetch(url)
  if (!response.ok) {
    const detail = await response.text()
    console.error('Échec de l’envoi CallMeBot :', detail)
    return { ok: false, reason: detail }
  }

  return { ok: true }
}

// ---------------------------------------------------------------------------
// Gabarit d'e-mail commun
// ---------------------------------------------------------------------------
export function emailLayout(title, rows, footer = '') {
  const lines = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-size:14px;white-space:nowrap">${label}</td>` +
        `<td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600">${value ?? '—'}</td></tr>`
    )
    .join('')

  return `
  <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:#0a914c;padding:18px 24px">
        <span style="color:#fff;font-size:18px;font-weight:800">LAKERS STORE</span>
      </div>
      <div style="padding:24px">
        <h1 style="margin:0 0 16px;font-size:18px;color:#0f172a">${title}</h1>
        <table style="border-collapse:collapse;width:100%">${lines}</table>
        ${footer ? `<p style="margin-top:20px;font-size:13px;color:#64748b">${footer}</p>` : ''}
      </div>
      <div style="background:#f1f5f9;padding:12px 24px;font-size:12px;color:#94a3b8">
        Notification automatique de LAKERS STORE
      </div>
    </div>
  </div>`
}

// Échappe les caractères HTML des valeurs saisies par les utilisateurs
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
