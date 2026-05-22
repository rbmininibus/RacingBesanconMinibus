'use client';

import { useEffect, useMemo, useState } from 'react';
import { BusFront, CalendarDays, CheckCircle2, Clock, History, Mail, Plus, ShieldCheck, XCircle } from 'lucide-react';

type Reservation = {
  id: string;
  team: string;
  user_name: string;
  user_email: string;
  destination: string;
  departure_date: string;
  departure_time: string;
  return_time: string;
  passengers: number;
  driver: string;
  comment?: string;
  status: 'pending' | 'approved' | 'rejected';
  vehicles?: { name: string };
};

const statusLabel: Record<string, string> = { pending: 'En attente', approved: 'Validée', rejected: 'Refusée' };
const statusClass: Record<string, string> = {
  pending: 'bg-orange-50 text-orange-700 border-orange-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

const vehicles = [
  { id: 'MINIBUS_1', name: 'Minibus 1' },
  { id: 'MINIBUS_2', name: 'Minibus 2' },
  { id: 'MINIBUS_3', name: 'Minibus 3' },
];

export default function Home() {
  const [tab, setTab] = useState('dashboard');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function loadReservations() {
    setLoading(true);
    const response = await fetch('/api/reservations');
    const data = await response.json();
    setReservations(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { loadReservations(); }, []);

  const pending = useMemo(() => reservations.filter(r => r.status === 'pending'), [reservations]);
  const approved = useMemo(() => reservations.filter(r => r.status === 'approved'), [reservations]);

  async function createReservation(event: any) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    const response = await fetch('/api/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (response.ok) {
      setMessage('Demande envoyée à loris.rosain@gmail.com');
      event.currentTarget.reset();
      setTab('dashboard');
      loadReservations();
    } else {
      setMessage('Erreur lors de l’envoi de la demande.');
    }
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    const response = await fetch(`/api/reservations/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    if (response.ok) {
      setMessage(status === 'approved' ? 'Réservation validée, mail envoyé.' : 'Réservation refusée, mail envoyé.');
      loadReservations();
    } else {
      setMessage('Erreur lors du changement de statut.');
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-gradient-to-r from-blue-950 via-blue-800 to-red-700 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white font-black text-blue-950">RB</div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-blue-100">Racing Besançon</p>
              <h1 className="text-2xl font-black">Réservation Minibus</h1>
            </div>
          </div>
          <div className="hidden rounded-full bg-white/10 px-4 py-2 text-sm md:block">Admin : loris.rosain@gmail.com</div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6">
        <nav className="mb-6 grid grid-cols-4 gap-2 rounded-2xl bg-white p-2 shadow-sm md:flex md:w-fit">
          {[
            ['dashboard', CalendarDays, 'Accueil'], ['new', Plus, 'Réserver'], ['admin', ShieldCheck, 'Admin'], ['history', History, 'Historique']
          ].map(([id, Icon, label]: any) => (
            <button key={id} onClick={() => setTab(id)} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${tab === id ? 'bg-blue-950 text-white' : 'text-slate-500 hover:bg-slate-100'}`}><Icon className="h-4 w-4" />{label}</button>
          ))}
        </nav>

        {message && <div className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4 font-semibold text-emerald-800">{message}</div>}

        {tab === 'dashboard' && <Dashboard loading={loading} reservations={reservations} pending={pending.length} approved={approved.length} />}
        {tab === 'new' && <NewReservation onSubmit={createReservation} />}
        {tab === 'admin' && <Admin pending={pending} onDecision={updateStatus} />}
        {tab === 'history' && <ReservationList reservations={reservations} title="Historique des réservations" />}
      </section>
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) { return <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">{children}</div>; }
function Badge({ status }: { status: string }) { return <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass[status]}`}>{statusLabel[status]}</span>; }
function Stat({ icon: Icon, label, value }: any) { return <Card><div className="flex items-center gap-3"><div className="rounded-2xl bg-blue-50 p-3 text-blue-950"><Icon className="h-5 w-5" /></div><div><p className="text-sm text-slate-500">{label}</p><p className="text-2xl font-black">{value}</p></div></div></Card>; }

function Dashboard({ loading, reservations, pending, approved }: any) {
  return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-4"><Stat icon={BusFront} label="Minibus" value="3" /><Stat icon={Clock} label="En attente" value={pending} /><Stat icon={CheckCircle2} label="Validées" value={approved} /><Stat icon={Mail} label="Mails" value="Actifs" /></div>{loading ? <Card>Chargement...</Card> : <ReservationList reservations={reservations} title="Planning" />}</div>;
}

function NewReservation({ onSubmit }: any) {
  return <Card><h2 className="mb-1 text-2xl font-black">Nouvelle réservation</h2><p className="mb-5 text-slate-500">La demande sera envoyée à loris.rosain@gmail.com.</p><form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
    <input required name="team" placeholder="Équipe" className="rounded-xl border p-3" />
    <input required name="user_name" placeholder="Nom du demandeur" className="rounded-xl border p-3" />
    <input required type="email" name="user_email" placeholder="Email du demandeur" className="rounded-xl border p-3" />
    <select name="vehicle_id" className="rounded-xl border p-3">{vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
    <input required type="date" name="departure_date" className="rounded-xl border p-3" />
    <input required type="time" name="departure_time" className="rounded-xl border p-3" />
    <input required type="time" name="return_time" className="rounded-xl border p-3" />
    <input required name="destination" placeholder="Destination" className="rounded-xl border p-3" />
    <input name="driver" placeholder="Conducteur" className="rounded-xl border p-3" />
    <input type="number" name="passengers" placeholder="Nombre de passagers" className="rounded-xl border p-3" />
    <textarea name="comment" placeholder="Commentaire" className="rounded-xl border p-3 md:col-span-2" />
    <button className="rounded-xl bg-blue-950 p-4 font-black text-white md:col-span-2">Envoyer la demande</button>
  </form></Card>;
}

function Admin({ pending, onDecision }: any) {
  return <div className="space-y-4"><h2 className="text-2xl font-black">Demandes à valider</h2>{pending.length === 0 && <Card>Aucune demande en attente.</Card>}{pending.map((r: Reservation) => <Card key={r.id}><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><Badge status={r.status}/><h3 className="mt-3 text-xl font-black">{r.team} → {r.destination}</h3><p className="text-slate-500">{r.departure_date} · {r.departure_time} - {r.return_time} · {r.user_name}</p></div><div className="flex gap-2"><button onClick={() => onDecision(r.id, 'approved')} className="rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white">Valider</button><button onClick={() => onDecision(r.id, 'rejected')} className="rounded-xl bg-red-600 px-4 py-3 font-bold text-white">Refuser</button></div></div></Card>)}</div>;
}

function ReservationList({ reservations, title }: any) {
  return <Card><h2 className="mb-4 text-xl font-black">{title}</h2><div className="space-y-3">{reservations.map((r: Reservation) => <div key={r.id} className="rounded-2xl border border-slate-100 p-4"><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><Badge status={r.status}/><h3 className="mt-2 font-black">{r.team} · {r.destination}</h3><p className="text-sm text-slate-500">{r.departure_date} · {r.departure_time} - {r.return_time} · {r.user_name} · {r.passengers || 0} passagers</p></div><div className="font-semibold text-blue-950">{r.vehicles?.name || 'Minibus'}</div></div></div>)}</div></Card>;
}
