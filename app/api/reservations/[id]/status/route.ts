import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { Resend } from 'resend'
 
const resend = new Resend(process.env.RESEND_API_KEY)
 
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { statut } = await req.json()
  const { id } = params
 
  const { data: reservation, error: fetchError } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', id)
    .single()
 
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 404 })
 
  const { error } = await supabase
    .from('reservations')
    .update({ statut })
    .eq('id', id)
 
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
 
  const minibusName = reservation.minibus_id === 'minibus-1' ? 'Minibus 1'
    : reservation.minibus_id === 'minibus-2' ? 'Minibus 2' : 'Minibus 3'
 
  const isValidee = statut === 'validee'
 
  // Mail de confirmation à l'utilisateur
  await resend.emails.send({
    from: process.env.MAIL_FROM || 'noreply@rbresaminibus.fr',
    to: reservation.email,
    subject: isValidee
      ? '✅ Réservation confirmée — Racing Besançon'
      : '❌ Réservation refusée — Racing Besançon',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${isValidee ? '#198754' : '#dc3545'}; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">
            ${isValidee ? '✅ Réservation confirmée' : '❌ Réservation refusée'}
          </h1>
        </div>
        <div style="padding: 32px; background: #f9f9f9;">
          <h2 style="color: #111;">Bonjour ${reservation.prenom} ${reservation.nom},</h2>
          <p>${isValidee
            ? 'Votre réservation a été <strong>validée</strong> par l\'administration.'
            : 'Votre réservation a été <strong>refusée</strong>. Veuillez contacter l\'administration pour plus d\'informations.'
          }</p>
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${isValidee ? '#198754' : '#dc3545'};">
            <p><strong>Minibus :</strong> ${minibusName}</p>
            <p><strong>Date :</strong> ${new Date(reservation.date_depart).toLocaleDateString('fr-FR')}</p>
            <p><strong>Horaire :</strong> ${reservation.heure_depart} → ${reservation.heure_retour}</p>
            <p><strong>Destination :</strong> ${reservation.destination}</p>
          </div>
        </div>
        <div style="background: #111; padding: 16px; text-align: center;">
          <p style="color: #888; font-size: 12px; margin: 0;">© Racing Besançon — rbresaminibus.fr</p>
        </div>
      </div>
    `
  })
 
  return NextResponse.json({ success: true })
}
 
