import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { Resend } from 'resend'
 
const resend = new Resend(process.env.RESEND_API_KEY)
 
export async function GET() {
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .order('created_at', { ascending: false })
 
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
 
export async function POST(req: NextRequest) {
  const body = await req.json()
 
  const { data, error } = await supabase
    .from('reservations')
    .insert([{ ...body, statut: 'en_attente' }])
    .select()
    .single()
 
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
 
  const minibusName = body.minibus_id === 'minibus-1' ? 'Minibus 1'
    : body.minibus_id === 'minibus-2' ? 'Minibus 2' : 'Minibus 3'
 
  // Mail à l'utilisateur
  await resend.emails.send({
    from: process.env.MAIL_FROM || 'noreply@rbresaminibus.fr',
    to: body.email,
    subject: '📋 Demande de réservation reçue — Racing Besançon',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #C8102E; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Racing Besançon Minibus</h1>
        </div>
        <div style="padding: 32px; background: #f9f9f9;">
          <h2 style="color: #111;">Bonjour ${body.prenom} ${body.nom},</h2>
          <p>Votre demande de réservation a bien été reçue et est en attente de validation.</p>
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #C8102E;">
            <p><strong>Minibus :</strong> ${minibusName}</p>
            <p><strong>Date :</strong> ${new Date(body.date_depart).toLocaleDateString('fr-FR')}</p>
            <p><strong>Horaire :</strong> ${body.heure_depart} → ${body.heure_retour}</p>
            <p><strong>Destination :</strong> ${body.destination}</p>
            <p><strong>Organisme :</strong> ${body.organisme} — ${body.categorie}</p>
            <p><strong>Passagers :</strong> ${body.nb_passagers}</p>
          </div>
          <p>Vous recevrez un email de confirmation ou de refus une fois votre demande traitée.</p>
        </div>
        <div style="background: #111; padding: 16px; text-align: center;">
          <p style="color: #888; font-size: 12px; margin: 0;">© Racing Besançon — rbresaminibus.fr</p>
        </div>
      </div>
    `
  })
 
  // Mail à l'admin
  await resend.emails.send({
    from: process.env.MAIL_FROM || 'noreply@rbresaminibus.fr',
    to: process.env.ADMIN_EMAIL || '',
    subject: `🔔 Nouvelle réservation — ${body.prenom} ${body.nom}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #111; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Nouvelle demande de réservation</h1>
        </div>
        <div style="padding: 32px; background: #f9f9f9;">
          <div style="background: white; border-radius: 8px; padding: 20px; border-left: 4px solid #ffc107;">
            <p><strong>Demandeur :</strong> ${body.prenom} ${body.nom}</p>
            <p><strong>Email :</strong> ${body.email}</p>
            <p><strong>Téléphone :</strong> ${body.telephone}</p>
            <p><strong>Organisme :</strong> ${body.organisme} — ${body.categorie}</p>
            <p><strong>Minibus :</strong> ${minibusName}</p>
            <p><strong>Date :</strong> ${new Date(body.date_depart).toLocaleDateString('fr-FR')}</p>
            <p><strong>Horaire :</strong> ${body.heure_depart} → ${body.heure_retour}</p>
            <p><strong>Destination :</strong> ${body.destination}</p>
            <p><strong>Passagers :</strong> ${body.nb_passagers}</p>
            ${body.commentaire ? `<p><strong>Commentaire :</strong> ${body.commentaire}</p>` : ''}
          </div>
          <p style="margin-top: 20px;">Connectez-vous à l'espace admin pour valider ou refuser cette demande.</p>
        </div>
      </div>
    `
  })
 
  return NextResponse.json(data)
}
 
