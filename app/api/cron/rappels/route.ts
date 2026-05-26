import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const { data: reservations, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('date_depart', tomorrowStr)
    .eq('statut', 'validee')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!reservations || reservations.length === 0) {
    return NextResponse.json({ message: 'Aucun rappel à envoyer', count: 0 })
  }

  const MINIBUS_NAMES: Record<string, string> = {
    'minibus-1': 'Minibus 1',
    'minibus-2': 'Minibus 2',
    'minibus-3': 'Minibus 3',
  }

  let sent = 0
  for (const r of reservations) {
    try {
      await resend.emails.send({
        from: process.env.MAIL_FROM || 'noreply@rbresaminibus.fr',
        to: r.email,
        subject: '⏰ Rappel — Votre déplacement est demain !',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #C8102E; padding: 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Rappel de déplacement</h1>
            </div>
            <div style="padding: 32px; background: #f9f9f9;">
              <h2 style="color: #111;">Bonjour ${r.prenom} ${r.nom},</h2>
              <p>Votre déplacement avec le minibus est <strong>demain</strong> !</p>
              <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #C8102E;">
                <p><strong>🚌 Minibus :</strong> ${MINIBUS_NAMES[r.minibus_id] || r.minibus_id}</p>
                <p><strong>📅 Date :</strong> ${new Date(r.date_depart).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p><strong>🕐 Horaire :</strong> ${r.heure_depart} → ${r.heure_retour}</p>
                <p><strong>📍 Destination :</strong> ${r.destination}</p>
                <p><strong>👥 Passagers :</strong> ${r.nb_passagers}</p>
              </div>
              <p style="color: #666; font-size: 14px;">Bon voyage à toute l'équipe ! 🏆</p>
            </div>
            <div style="background: #111; padding: 16px; text-align: center;">
              <p style="color: #888; font-size: 12px; margin: 0;">© Racing Besançon — rbresaminibus.fr</p>
            </div>
          </div>
        `
      })
      sent++
    } catch (err) {
      console.error(`Erreur envoi rappel pour ${r.email}:`, err)
    }
  }

  return NextResponse.json({ message: `${sent} rappel(s) envoyé(s)`, count: sent })
}
