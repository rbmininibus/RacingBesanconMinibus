'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const MINIBUSES = [
  { id: 'minibus-1', name: 'Minibus 1', places: 9 },
  { id: 'minibus-2', name: 'Minibus 2', places: 9 },
  { id: 'minibus-3', name: 'Minibus 3', places: 9 },
]

const CATEGORIES = [
  'U6', 'U7', 'U8', 'U9', 'U10', 'U11', 'U12', 'U13',
  'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U20',
  'Senior', 'Vétéran', 'Féminine', 'Autre'
]

type Reservation = {
  id: string
  nom: string
  prenom: string
  email: string
  telephone: string
  organisme: string
  categorie: string
  minibus_id: string
  date_depart: string
  heure_depart: string
  heure_retour: string
  destination: string
  nb_passagers: number
  commentaire: string
  statut: 'en_attente' | 'validee' | 'refusee'
  created_at: string
}

type BlockedSlot = {
  minibus_id: string
  date_depart: string
  heure_depart: string
  heure_retour: string
}

export default function Home() {
  const [page, setPage] = useState<'accueil' | 'reservation' | 'mes-reservations' | 'admin'>('accueil')
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([])
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminAuthenticated, setAdminAuthenticated] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)
  const [adminFilter, setAdminFilter] = useState<'tous' | 'en_attente' | 'validee' | 'refusee'>('en_attente')
  const [adminTab, setAdminTab] = useState<'reservations' | 'planning'>('reservations')

  const [validationModal, setValidationModal] = useState<Reservation | null>(null)
  const [selectedMinibus, setSelectedMinibus] = useState('')

  const [searchEmail, setSearchEmail] = useState('')
  const [mesReservations, setMesReservations] = useState<Reservation[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchDone, setSearchDone] = useState(false)

  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', telephone: '',
    organisme: '', categorie: '',
    date_depart: '', heure_depart: '', heure_retour: '',
    destination: '', nb_passagers: 1, commentaire: ''
  })

  useEffect(() => { loadBlockedSlots() }, [])

  async function loadBlockedSlots() {
    const { data } = await supabase
      .from('reservations')
      .select('minibus_id, date_depart, heure_depart, heure_retour')
      .eq('statut', 'validee')
    if (data) setBlockedSlots(data)
  }

  async function loadReservations() {
    const { data } = await supabase
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setReservations(data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')

    if (form.heure_depart >= form.heure_retour) {
      setSubmitError("L'heure de retour doit être après l'heure de départ.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, minibus_id: 'non-attribue' })
      })
      if (!res.ok) throw new Error('Erreur serveur')
      setSubmitSuccess(true)
      setForm({ nom: '', prenom: '', email: '', telephone: '', organisme: '', categorie: '', date_depart: '', heure_depart: '', heure_retour: '', destination: '', nb_passagers: 1, commentaire: '' })
      loadBlockedSlots()
    } catch {
      setSubmitError('Une erreur est survenue. Veuillez réessayer.')
    }
    setLoading(false)
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    setAdminError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword })
    if (error) {
      setAdminError('Email ou mot de passe incorrect.')
    } else {
      setAdminAuthenticated(true)
      loadReservations()
    }
    setLoading(false)
  }

  async function handleAdminLogout() {
    await supabase.auth.signOut()
    setAdminAuthenticated(false)
    setAdminEmail('')
    setAdminPassword('')
  }

  function openValidationModal(r: Reservation) {
    setValidationModal(r)
    setSelectedMinibus('minibus-1')
  }

  async function confirmValidation() {
    if (!validationModal) return
    await fetch(`/api/reservations/${validationModal.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut: 'validee', minibus_id: selectedMinibus })
    })
    setValidationModal(null)
    loadReservations()
    loadBlockedSlots()
  }

  async function updateStatut(id: string, statut: 'refusee') {
    await fetch(`/api/reservations/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut })
    })
    loadReservations()
    loadBlockedSlots()
  }

  async function handleSearchReservations(e: React.FormEvent) {
    e.preventDefault()
    setSearchLoading(true)
    setSearchDone(false)
    try {
      const res = await fetch(`/api/mes-reservations?email=${encodeURIComponent(searchEmail)}`)
      const data = await res.json()
      setMesReservations(data)
      setSearchDone(true)
    } catch {
      setMesReservations([])
      setSearchDone(true)
    }
    setSearchLoading(false)
  }

  function getNext14Days() {
    const days = []
    for (let i = 0; i < 14; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      days.push(d.toISOString().split('T')[0])
    }
    return days
  }

  const planningDays = getNext14Days()
  const validatedReservations = reservations.filter(r => r.statut === 'validee')

  function getReservationsForDayAndMinibus(date: string, minibusId: string) {
    return validatedReservations.filter(r => r.date_depart === date && r.minibus_id === minibusId)
  }

  const filteredReservations = reservations.filter(r =>
    adminFilter === 'tous' ? true : r.statut === adminFilter
  )

  const today = new Date().toISOString().split('T')[0]

  const statutColor = (statut: string) => {
    if (statut === 'validee') return { bg: '#D1E7DD', color: '#0F5132', label: '✅ Validée' }
    if (statut === 'refusee') return { bg: '#F8D7DA', color: '#842029', label: '❌ Refusée' }
    return { bg: '#FFF3CD', color: '#856404', label: '⏳ En attente' }
  }

  return (
    <main style={{ minHeight: '100vh', fontFamily: "'Barlow', system-ui, sans-serif", background: '#f4f4f4' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&family=Barlow+Condensed:wght@700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .btn-red { background: #C8102E; color: white; border: none; padding: 12px 28px; font-family: 'Barlow', sans-serif; font-weight: 700; font-size: 15px; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; transition: background 0.2s; }
        .btn-red:hover { background: #a00d24; }
        .btn-green { background: #198754; color: white; border: none; padding: 8px 18px; border-radius: 6px; cursor: pointer; font-weight: 700; font-family: 'Barlow', sans-serif; font-size: 14px; }
        .btn-green:hover { background: #146c43; }
        .btn-outline { background: transparent; color: #C8102E; border: 2px solid #C8102E; padding: 10px 24px; font-family: 'Barlow', sans-serif; font-weight: 700; font-size: 14px; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; transition: all 0.2s; }
        .btn-outline:hover { background: #C8102E; color: white; }
        input, select, textarea { width: 100%; padding: 10px 14px; border: 1.5px solid #ddd; border-radius: 6px; font-family: 'Barlow', sans-serif; font-size: 15px; background: white; transition: border-color 0.2s; }
        input:focus, select:focus, textarea:focus { outline: none; border-color: #C8102E; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        label { font-size: 13px; font-weight: 600; color: #444; text-transform: uppercase; letter-spacing: 0.5px; }
        .badge-attente { background: #FFF3CD; color: #856404; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .badge-validee { background: #D1E7DD; color: #0F5132; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .badge-refusee { background: #F8D7DA; color: #842029; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .nav-link { background: none; border: none; cursor: pointer; font-family: 'Barlow', sans-serif; font-size: 14px; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 1px; padding: 8px 16px; opacity: 0.8; transition: opacity 0.2s; }
        .nav-link:hover, .nav-link.active { opacity: 1; border-bottom: 2px solid #C8102E; }
        .admin-tab { background: none; border: none; cursor: pointer; font-family: 'Barlow', sans-serif; font-size: 14px; font-weight: 700; padding: 10px 24px; border-bottom: 3px solid transparent; transition: all 0.2s; color: #666; }
        .admin-tab.active { color: #C8102E; border-bottom-color: #C8102E; }
        .planning-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .planning-table th { background: #111; color: white; padding: 10px 8px; text-align: center; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 14px; }
        .planning-table td { border: 1px solid #e0e0e0; padding: 8px; vertical-align: top; min-width: 120px; background: white; }
        .planning-cell { background: #D1E7DD; border-radius: 6px; padding: 6px 8px; margin: 2px 0; font-size: 12px; color: #0F5132; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal { background: white; border-radius: 12px; padding: 32px; max-width: 480px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
      `}</style>

      {/* MODAL VALIDATION */}
      {validationModal && (
        <div className="modal-overlay" onClick={() => setValidationModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 24, textTransform: 'uppercase', marginBottom: 8 }}>
              Attribuer un minibus
            </h2>
            <p style={{ color: '#666', marginBottom: 4, fontSize: 14 }}>
              <strong>{validationModal.prenom} {validationModal.nom}</strong> — {validationModal.organisme} ({validationModal.categorie})
            </p>
            <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
              📅 {new Date(validationModal.date_depart).toLocaleDateString('fr-FR')} • {validationModal.heure_depart} → {validationModal.heure_retour} • 📍 {validationModal.destination}
            </p>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label>Minibus à attribuer *</label>
              <select value={selectedMinibus} onChange={e => setSelectedMinibus(e.target.value)}>
                {MINIBUSES.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.places} places)</option>
                ))}
              </select>
              <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                Un email de confirmation avec le minibus attribué sera envoyé automatiquement.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-green" onClick={confirmValidation} style={{ flex: 1, padding: '12px' }}>
                ✓ Valider et notifier
              </button>
              <button className="btn-outline" onClick={() => setValidationModal(null)} style={{ padding: '12px 20px' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav style={{ background: '#111', padding: '0 5%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="https://i.imgur.com/I53aYMn.png" alt="Racing Besançon" style={{ height: 50, width: 'auto' }} />
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button className={`nav-link ${page === 'accueil' ? 'active' : ''}`} onClick={() => setPage('accueil')}>Accueil</button>
          <button className={`nav-link ${page === 'reservation' ? 'active' : ''}`} onClick={() => { setPage('reservation'); setSubmitSuccess(false); }}>Réserver</button>
          <button className={`nav-link ${page === 'mes-reservations' ? 'active' : ''}`} onClick={() => { setPage('mes-reservations'); setSearchDone(false); setSearchEmail(''); }}>Mes réservations</button>
          <button className={`nav-link ${page === 'admin' ? 'active' : ''}`} onClick={() => setPage('admin')}>Admin</button>
        </div>
      </nav>

      {/* ACCUEIL */}
      {page === 'accueil' && (
        <div>
          <div style={{ background: 'linear-gradient(135deg, #111 0%, #1a1a1a 50%, #C8102E 100%)', padding: '80px 5%', textAlign: 'center', color: 'white', position: 'relative', overflow: 'hidden' }}>
            <img src="https://i.imgur.com/I53aYMn.png" alt="" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', height: '420px', width: 'auto', opacity: 0.12, pointerEvents: 'none', userSelect: 'none' }} />
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(200,16,46,0.2)', border: '1px solid rgba(200,16,46,0.4)', borderRadius: 20, padding: '6px 16px', marginBottom: 24, position: 'relative' }}>
              <span style={{ width: 8, height: 8, background: '#C8102E', borderRadius: '50%', display: 'inline-block' }}></span>
              <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Service minibus du club</span>
            </div>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(40px, 8vw, 80px)', lineHeight: 1, marginBottom: 20, textTransform: 'uppercase', position: 'relative' }}>
              RÉSERVATION<br /><span style={{ color: '#C8102E' }}>MINIBUS</span>
            </h1>
            <p style={{ fontSize: 18, opacity: 0.8, maxWidth: 500, margin: '0 auto 36px', position: 'relative' }}>
              Réservez un minibus du Racing Besançon pour vos déplacements sportifs.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
              <button className="btn-red" style={{ fontSize: 16, padding: '14px 36px' }} onClick={() => setPage('reservation')}>Faire une réservation →</button>
              <button className="btn-outline" style={{ fontSize: 16, padding: '14px 36px', borderColor: 'white', color: 'white' }} onClick={() => setPage('mes-reservations')}>Voir mes réservations</button>
            </div>
          </div>

          <div style={{ padding: '60px 5%' }}>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 32, textTransform: 'uppercase', textAlign: 'center', marginBottom: 8 }}>Nos 3 minibus</h2>
            <p style={{ textAlign: 'center', color: '#666', marginBottom: 40 }}>Disponibles pour tous les organismes et catégories du club</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24, maxWidth: 900, margin: '0 auto' }}>
              {MINIBUSES.map((m) => (
                <div key={m.id} style={{ background: 'white', borderRadius: 12, padding: '28px 24px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderTop: '4px solid #C8102E' }}>
                  <div style={{ width: 64, height: 64, background: '#fff0f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <span style={{ fontSize: 28 }}>🚌</span>
                  </div>
                  <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, textTransform: 'uppercase', marginBottom: 8 }}>{m.name}</h3>
                  <p style={{ color: '#666', fontSize: 14 }}>{m.places} places • Disponible à la réservation</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#111', color: 'white', padding: '50px 5%', textAlign: 'center' }}>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, textTransform: 'uppercase', marginBottom: 32 }}>Comment ça marche ?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32, maxWidth: 900, margin: '0 auto' }}>
              {[
                { n: '01', t: 'Faites votre demande', d: 'Renseignez vos infos et votre créneau' },
                { n: '02', t: 'Attribution admin', d: "L'admin vous attribue un minibus disponible" },
                { n: '03', t: 'Confirmation par mail', d: 'Vous recevez le minibus attribué par email' },
                { n: '04', t: 'Rappel automatique', d: 'Un rappel est envoyé 24h avant le départ' },
              ].map(s => (
                <div key={s.n}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 48, color: '#C8102E', lineHeight: 1 }}>{s.n}</div>
                  <h4 style={{ fontWeight: 700, marginBottom: 8, marginTop: 8 }}>{s.t}</h4>
                  <p style={{ opacity: 0.6, fontSize: 14 }}>{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RESERVATION */}
      {page === 'reservation' && (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '50px 5%' }}>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 36, textTransform: 'uppercase', marginBottom: 8 }}>Nouvelle réservation</h1>
          <p style={{ color: '#666', marginBottom: 36 }}>Remplissez le formulaire. Un minibus vous sera attribué par l'administration.</p>

          {submitSuccess ? (
            <div style={{ background: '#D1E7DD', border: '1px solid #A3CFBB', borderRadius: 12, padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 24, color: '#0F5132', marginBottom: 12 }}>Demande envoyée !</h2>
              <p style={{ color: '#0F5132', marginBottom: 24 }}>Votre demande a bien été reçue. L'administration va vous attribuer un minibus et vous recevrez un email de confirmation avec les détails.</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn-red" onClick={() => { setSubmitSuccess(false); setPage('accueil'); }}>Retour à l'accueil</button>
                <button className="btn-outline" onClick={() => { setSubmitSuccess(false); setPage('mes-reservations'); }}>Voir mes réservations</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ background: 'white', borderRadius: 12, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, textTransform: 'uppercase', marginBottom: 20, borderBottom: '2px solid #C8102E', paddingBottom: 10 }}>Vos informations</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group"><label>Prénom *</label><input required value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} placeholder="Jean" /></div>
                  <div className="form-group"><label>Nom *</label><input required value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Dupont" /></div>
                  <div className="form-group"><label>Email *</label><input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jean@email.com" /></div>
                  <div className="form-group"><label>Téléphone *</label><input type="tel" required value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} placeholder="06 00 00 00 00" /></div>
                  <div className="form-group"><label>Organisme *</label><input required value={form.organisme} onChange={e => setForm(f => ({ ...f, organisme: e.target.value }))} placeholder="Racing Besançon Football" /></div>
                  <div className="form-group">
                    <label>Catégorie *</label>
                    <select required value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}>
                      <option value="">Sélectionner...</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ background: 'white', borderRadius: 12, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, textTransform: 'uppercase', marginBottom: 20, borderBottom: '2px solid #C8102E', paddingBottom: 10 }}>Détails du déplacement</h3>

                {/* Bandeau minibus */}
                <div style={{ background: 'linear-gradient(135deg, #111, #1a1a1a)', borderRadius: 10, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: 32 }}>🚌</span>
                  <div>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>Demande de réservation d'un minibus</div>
                    <div style={{ color: '#aaa', fontSize: 13 }}>Un minibus vous sera attribué par l'administration après validation</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Date *</label><input type="date" required min={today} value={form.date_depart} onChange={e => setForm(f => ({ ...f, date_depart: e.target.value }))} /></div>
                  <div className="form-group"><label>Heure de départ *</label><input type="time" required value={form.heure_depart} onChange={e => setForm(f => ({ ...f, heure_depart: e.target.value }))} /></div>
                  <div className="form-group"><label>Heure de retour *</label><input type="time" required value={form.heure_retour} onChange={e => setForm(f => ({ ...f, heure_retour: e.target.value }))} /></div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Destination *</label><input required value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} placeholder="Stade de Lyon, 69000 Lyon" /></div>
                  <div className="form-group"><label>Nombre de passagers *</label><input type="number" min={1} max={9} required value={form.nb_passagers} onChange={e => setForm(f => ({ ...f, nb_passagers: parseInt(e.target.value) }))} /></div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Commentaire (optionnel)</label><textarea rows={3} value={form.commentaire} onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))} placeholder="Informations supplémentaires..." style={{ resize: 'vertical' }} /></div>
                </div>
              </div>

              {submitError && <div style={{ background: '#F8D7DA', color: '#842029', padding: '12px 16px', borderRadius: 8, fontWeight: 600 }}>⚠️ {submitError}</div>}
              <button type="submit" className="btn-red" disabled={loading} style={{ fontSize: 16, padding: '14px', alignSelf: 'flex-start' }}>
                {loading ? 'Envoi en cours...' : 'Envoyer ma demande →'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* MES RESERVATIONS */}
      {page === 'mes-reservations' && (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '50px 5%' }}>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 36, textTransform: 'uppercase', marginBottom: 8 }}>Mes réservations</h1>
          <p style={{ color: '#666', marginBottom: 36 }}>Entrez votre email pour retrouver toutes vos réservations.</p>
          <form onSubmit={handleSearchReservations} style={{ background: 'white', borderRadius: 12, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 32 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Votre email</label>
                <input type="email" required value={searchEmail} onChange={e => setSearchEmail(e.target.value)} placeholder="jean@email.com" />
              </div>
              <button type="submit" className="btn-red" disabled={searchLoading} style={{ whiteSpace: 'nowrap', padding: '10px 24px' }}>
                {searchLoading ? 'Recherche...' : 'Rechercher'}
              </button>
            </div>
          </form>
          {searchDone && (
            <div>
              {mesReservations.length === 0 ? (
                <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center', color: '#666' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                  <p>Aucune réservation trouvée pour cet email.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ color: '#666', marginBottom: 8 }}>{mesReservations.length} réservation(s) trouvée(s)</p>
                  {mesReservations.map(r => {
                    const s = statutColor(r.statut)
                    return (
                      <div key={r.id} style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: `4px solid ${r.statut === 'validee' ? '#198754' : r.statut === 'refusee' ? '#dc3545' : '#ffc107'}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, textTransform: 'uppercase' }}>
                            {new Date(r.date_depart).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                          <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{s.label}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px 24px', fontSize: 14, color: '#555' }}>
                          <span>🚌 {r.statut === 'validee' ? (MINIBUSES.find(m => m.id === r.minibus_id)?.name || r.minibus_id) : 'Minibus à attribuer'}</span>
                          <span>🕐 {r.heure_depart} → {r.heure_retour}</span>
                          <span>📍 {r.destination}</span>
                          <span>👥 {r.organisme} — {r.categorie}</span>
                          <span>🧍 {r.nb_passagers} passager(s)</span>
                          {r.commentaire && <span style={{ gridColumn: '1 / -1' }}>💬 {r.commentaire}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ADMIN */}
      {page === 'admin' && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '50px 5%' }}>
          {!adminAuthenticated ? (
            <div style={{ maxWidth: 400, margin: '0 auto' }}>
              <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 36, textTransform: 'uppercase', marginBottom: 8 }}>Espace Admin</h1>
              <p style={{ color: '#666', marginBottom: 32 }}>Accès réservé aux administrateurs.</p>
              <form onSubmit={handleAdminLogin} style={{ background: 'white', borderRadius: 12, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label>Email</label>
                  <input type="email" required value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@email.com" />
                </div>
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label>Mot de passe</label>
                  <input type="password" required value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="••••••••" />
                </div>
                {adminError && <p style={{ color: '#C8102E', fontSize: 14, marginBottom: 12, fontWeight: 600 }}>{adminError}</p>}
                <button type="submit" className="btn-red" disabled={loading} style={{ width: '100%' }}>{loading ? 'Connexion...' : 'Se connecter'}</button>
              </form>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 36, textTransform: 'uppercase' }}>Tableau de bord</h1>
                  <p style={{ color: '#666' }}>{reservations.length} réservation(s) au total</p>
                </div>
                <button className="btn-outline" onClick={handleAdminLogout}>Déconnexion</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 24 }}>
                {[
                  { label: 'En attente', count: reservations.filter(r => r.statut === 'en_attente').length, color: '#856404', bg: '#FFF3CD' },
                  { label: 'Validées', count: reservations.filter(r => r.statut === 'validee').length, color: '#0F5132', bg: '#D1E7DD' },
                  { label: 'Refusées', count: reservations.filter(r => r.statut === 'refusee').length, color: '#842029', bg: '#F8D7DA' },
                  { label: 'Total', count: reservations.length, color: '#111', bg: '#f4f4f4' },
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '20px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: s.color, fontFamily: "'Barlow Condensed', sans-serif" }}>{s.count}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: s.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ borderBottom: '2px solid #e0e0e0', marginBottom: 24, display: 'flex', gap: 0 }}>
                <button className={`admin-tab ${adminTab === 'reservations' ? 'active' : ''}`} onClick={() => setAdminTab('reservations')}>📋 Réservations</button>
                <button className={`admin-tab ${adminTab === 'planning' ? 'active' : ''}`} onClick={() => setAdminTab('planning')}>📅 Planning 2 semaines</button>
              </div>

              {adminTab === 'reservations' && (
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                    {(['tous', 'en_attente', 'validee', 'refusee'] as const).map(f => (
                      <button key={f} onClick={() => setAdminFilter(f)} style={{ padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: "'Barlow', sans-serif", fontWeight: 600, fontSize: 13, background: adminFilter === f ? '#111' : '#e0e0e0', color: adminFilter === f ? 'white' : '#444' }}>
                        {f === 'tous' ? 'Toutes' : f === 'en_attente' ? 'En attente' : f === 'validee' ? 'Validées' : 'Refusées'}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filteredReservations.length === 0 && (
                      <div style={{ textAlign: 'center', padding: 40, color: '#666', background: 'white', borderRadius: 12 }}>Aucune réservation dans cette catégorie.</div>
                    )}
                    {filteredReservations.map(r => (
                      <div key={r.id} style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: `4px solid ${r.statut === 'validee' ? '#198754' : r.statut === 'refusee' ? '#dc3545' : '#ffc107'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, textTransform: 'uppercase' }}>{r.prenom} {r.nom}</span>
                              <span className={`badge-${r.statut}`}>{r.statut === 'en_attente' ? 'En attente' : r.statut === 'validee' ? 'Validée' : 'Refusée'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '4px 24px', fontSize: 14, color: '#555' }}>
                              <span>📅 {new Date(r.date_depart).toLocaleDateString('fr-FR')} • {r.heure_depart} → {r.heure_retour}</span>
                              <span>🚌 {r.statut === 'validee' ? (MINIBUSES.find(m => m.id === r.minibus_id)?.name || r.minibus_id) : '⏳ À attribuer'}</span>
                              <span>📍 {r.destination}</span>
                              <span>👥 {r.organisme} — {r.categorie}</span>
                              <span>✉️ {r.email}</span>
                              <span>📞 {r.telephone}</span>
                              {r.commentaire && <span style={{ gridColumn: '1 / -1' }}>💬 {r.commentaire}</span>}
                            </div>
                          </div>
                          {r.statut === 'en_attente' && (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn-green" onClick={() => openValidationModal(r)}>🚌 Attribuer & Valider</button>
                              <button onClick={() => updateStatut(r.id, 'refusee')} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontFamily: "'Barlow', sans-serif" }}>✗ Refuser</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {adminTab === 'planning' && (
                <div>
                  <p style={{ color: '#666', marginBottom: 20, fontSize: 14 }}>Planning des 14 prochains jours — réservations validées uniquement</p>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="planning-table">
                      <thead>
                        <tr>
                          <th style={{ width: 120 }}>Date</th>
                          {MINIBUSES.map(m => <th key={m.id}>🚌 {m.name}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {planningDays.map(day => {
                          const hasAny = MINIBUSES.some(m => getReservationsForDayAndMinibus(day, m.id).length > 0)
                          return (
                            <tr key={day}>
                              <td style={{ fontWeight: 700, fontSize: 13, background: hasAny ? '#fff8f0' : 'white' }}>
                                <div>{new Date(day + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                                {day === today && <span style={{ background: '#C8102E', color: 'white', fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>AUJOURD'HUI</span>}
                              </td>
                              {MINIBUSES.map(m => {
                                const ress = getReservationsForDayAndMinibus(day, m.id)
                                return (
                                  <td key={m.id}>
                                    {ress.length === 0 ? (
                                      <span style={{ color: '#ccc', fontSize: 12 }}>Libre</span>
                                    ) : (
                                      ress.map(r => (
                                        <div key={r.id} className="planning-cell">
                                          <div style={{ fontWeight: 700 }}>{r.heure_depart} → {r.heure_retour}</div>
                                          <div>{r.prenom} {r.nom}</div>
                                          <div style={{ opacity: 0.8 }}>{r.organisme} — {r.categorie}</div>
                                          <div style={{ opacity: 0.8 }}>📍 {r.destination}</div>
                                        </div>
                                      ))
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <footer style={{ background: '#111', color: 'white', textAlign: 'center', padding: '24px 5%', marginTop: 60 }}>
        <p style={{ opacity: 0.5, fontSize: 13 }}>© {new Date().getFullYear()} Racing Besançon — Tous droits réservés</p>
      </footer>
    </main>
  )
}
