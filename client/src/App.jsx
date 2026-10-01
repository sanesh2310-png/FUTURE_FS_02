import { useState, useEffect, useMemo, useCallback } from 'react';
import { api, getToken, setToken } from './api';

const STATUSES = ['new', 'contacted', 'converted', 'lost'];
const LABEL = { new: 'New', contacted: 'Contacted', converted: 'Converted', lost: 'Lost' };
const COLOR = { new: '#3b82c4', contacted: '#d98a1f', converted: '#2f9e6b', lost: '#c8514f' };
const PALETTE = ['#11606b', '#e0902a', '#3b82c4', '#8a6bbf', '#c8514f', '#6b7f88'];
const SOURCES = ['Website form', 'Referral', 'Instagram', 'Google Ads', 'Manual entry'];
const TITLES = { overview: 'Overview', leads: 'All leads', board: 'Pipeline board' };
const fmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const isDue = (l) => l.followUpDate && !['converted', 'lost'].includes(l.status) && new Date(l.followUpDate) <= new Date();
const FLOW = ['new', 'contacted', 'converted'];
const Badge = ({ s }) => <span className="badge" style={{ '--c': COLOR[s] }}>{LABEL[s]}</span>;
const Progress = ({ s }) => {
  const i = FLOW.indexOf(s);
  return <span className="prog" aria-hidden="true">{FLOW.map((x, k) => <i key={x} className={s === 'lost' || k <= i ? 'on' : ''} style={{ '--c': COLOR[s] }} />)}</span>;
};

/* ---------- charts (plain CSS/SVG, no extra libraries) ---------- */
function Funnel({ counts }) {
  const total = STATUSES.reduce((a, s) => a + counts[s], 0);
  const steps = [
    { label: 'Leads captured', n: total, c: '#6b7f88' },
    { label: 'Contacted', n: counts.contacted + counts.converted, c: COLOR.contacted },
    { label: 'Converted', n: counts.converted, c: COLOR.converted },
  ];
  return (
    <div className="funnel">
      {steps.map((s) => (
        <div key={s.label} className="fstep">
          <div className="fbar" style={{ width: `${total ? Math.max(8, (s.n / total) * 100) : 8}%`, background: s.c }}>{s.n}</div>
          <span>{s.label}{total ? ` (${Math.round((s.n / total) * 100)}%)` : ''}</span>
        </div>
      ))}
      {counts.lost > 0 && <p className="muted">{counts.lost} lead{counts.lost > 1 ? 's' : ''} marked as lost</p>}
    </div>
  );
}

function SourceBars({ leads }) {
  const map = {};
  leads.forEach((l) => { const m = (map[l.source] = map[l.source] || { n: 0, won: 0 }); m.n++; if (l.status === 'converted') m.won++; });
  const rows = Object.entries(map).sort((a, b) => b[1].n - a[1].n).slice(0, 6);
  if (!rows.length) return <p className="muted">Sources appear here once leads arrive.</p>;
  const max = rows[0][1].n;
  return (
    <ul className="srcbars">
      {rows.map(([name, m]) => (
        <li key={name}>
          <div><b>{name}</b><span>{m.n} lead{m.n > 1 ? 's' : ''}, {Math.round((m.won / m.n) * 100)}% converted</span></div>
          <i style={{ width: `${(m.n / max) * 100}%` }} />
        </li>
      ))}
    </ul>
  );
}

function Weekly({ leads }) {
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const weeks = [];
  for (let i = 7; i >= 0; i--) { const d = new Date(start); d.setDate(d.getDate() - i * 7); weeks.push({ d, n: 0 }); }
  leads.forEach((l) => {
    const t = new Date(l.createdAt);
    for (let i = weeks.length - 1; i >= 0; i--) if (t >= weeks[i].d) { weeks[i].n++; break; }
  });
  const max = Math.max(1, ...weeks.map((w) => w.n));
  return (
    <div className="weeks">
      {weeks.map((w) => (
        <div key={+w.d} className="wk">
          <span>{w.n || ''}</span>
          <i style={{ height: w.n ? Math.max(8, (w.n / max) * 110) : 2 }} />
          <b>{w.d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</b>
        </div>
      ))}
    </div>
  );
}

function Stepper({ status, onPick }) {
  const idx = FLOW.indexOf(status);
  return (
    <ol className={`stepper ${status === 'lost' ? 'is-lost' : ''}`}>
      {FLOW.map((s, i) => (
        <li key={s} className={i < idx ? 'done' : i === idx ? 'now' : ''} style={{ '--c': COLOR[s] }}>
          <button onClick={() => onPick(s)}><span>{i + 1}</span>{LABEL[s]}</button>
        </li>
      ))}
    </ol>
  );
}

/* ---------- screens ---------- */
function Login({ onLogin }) {
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try { const { token } = await api('/auth/login', { method: 'POST', body: f }); setToken(token); onLogin(); }
    catch (ex) { setErr(ex.message); }
  };
  return (
    <main className="login">
      <form onSubmit={submit}>
        <div className="brand dark"><i />Leadlane</div>
        <h1>Sign in</h1>
        <p className="muted">Admin access to your leads.</p>
        <label>Email<input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <label>Password<input type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
        {err && <p className="error" role="alert">{err}</p>}
        <button className="primary wide">Sign in</button>
      </form>
    </main>
  );
}

function Overview({ leads, counts, go, onOpen }) {
  const total = leads.length;
  const rate = total ? Math.round((counts.converted / total) * 100) : 0;
  const due = leads.filter(isDue).sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate));
  return (
    <>
      <section className="stats">
        <div className="stat"><b>{total}</b>Total leads</div>
        {['new', 'contacted', 'converted'].map((s) => (
          <button key={s} className="stat" style={{ '--c': COLOR[s] }} onClick={() => go(s)}><b>{counts[s]}</b>{LABEL[s]}</button>
        ))}
        <div className="stat"><b>{rate}%</b>Conversion rate</div>
        <div className={`stat ${due.length ? 'warn' : ''}`}><b>{due.length}</b>Follow-ups due</div>
      </section>
      <div className="grid2">
        <section className="box"><h2>Conversion funnel</h2><p className="muted">How leads move toward a sale</p><Funnel counts={counts} /></section>
        <section className="box"><h2>Sources that convert</h2><p className="muted">Lead volume and win rate by channel</p><SourceBars leads={leads} /></section>
      </div>
      <div className="grid2 wide-left">
        <section className="box"><h2>Leads per week</h2><p className="muted">The last 8 weeks</p><Weekly leads={leads} /></section>
        <section className="box"><h2>Needs follow-up</h2>
          {due.length === 0 && <p className="muted">Nothing due. Add a note with a follow-up date and it shows up here.</p>}
          <ul className="duelist">
            {due.slice(0, 6).map((l) => (
              <li key={l._id}><button onClick={() => onOpen(l._id)}><b>{l.name}</b><span>{fmt(l.followUpDate)}</span></button></li>
            ))}
          </ul>
        </section>
      </div>
      <h2 className="sec">Latest leads</h2>
      <Table leads={leads.slice(0, 5)} onOpen={onOpen} />
    </>
  );
}

function Table({ leads, onOpen, filtered, onClear }) {
  return (
    <div className="tablewrap">
      <table>
        <thead><tr><th>Lead</th><th>Source</th><th>Stage</th><th>Follow-up</th><th>Received</th></tr></thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l._id} tabIndex={0} onClick={() => onOpen(l._id)} onKeyDown={(e) => e.key === 'Enter' && onOpen(l._id)}>
              <td><b>{l.name}</b><small>{l.email}</small></td>
              <td><span className="src">{l.source}</span></td>
              <td><Badge s={l.status} /><Progress s={l.status} /></td>
              <td className={isDue(l) ? 'due' : ''}>{fmt(l.followUpDate)}</td>
              <td>{fmt(l.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {leads.length === 0 && (filtered
        ? <p className="empty">No leads match your search or filter. <button onClick={onClear}>Show all leads</button></p>
        : <p className="empty">No leads yet. Use New lead, or point a website contact form at <code>POST /api/leads</code>.</p>)}
    </div>
  );
}

function Board({ leads, onOpen, onMove }) {
  const [over, setOver] = useState('');
  return (
    <div className="board">
      {STATUSES.map((s) => {
        const items = leads.filter((l) => l.status === s);
        return (
          <section key={s} className={`col ${over === s ? 'over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setOver(s); }} onDragLeave={() => setOver('')}
            onDrop={(e) => { setOver(''); const id = e.dataTransfer.getData('id'); if (id) onMove(id, s); }}>
            <h3><i style={{ background: COLOR[s] }} />{LABEL[s]}<span>{items.length}</span></h3>
            {items.map((l) => (
              <article key={l._id} className="lc" draggable tabIndex={0}
                onDragStart={(e) => e.dataTransfer.setData('id', l._id)}
                onClick={() => onOpen(l._id)} onKeyDown={(e) => e.key === 'Enter' && onOpen(l._id)}>
                <b>{l.name}</b><span>{l.email}</span><small>{l.source}</small>
                {isDue(l) && <em className="tag">Follow-up due</em>}
              </article>
            ))}
            {items.length === 0 && <p className="muted">Drop a lead here</p>}
          </section>
        );
      })}
    </div>
  );
}

function AddLead({ onDone, onCancel }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', source: 'Website form', status: 'new', followUpDate: '', message: '', note: '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    try { await api('/leads', { method: 'POST', body: f }); onDone(); } catch (ex) { setErr(ex.message); }
  };
  return (
    <div className="backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>New lead</h2>
        <label>Name<input required autoFocus value={f.name} onChange={set('name')} /></label>
        <label>Email<input type="email" required value={f.email} onChange={set('email')} /></label>
        <label>Phone<input value={f.phone} onChange={set('phone')} /></label>
        <label>Source<input list="sources" value={f.source} onChange={set('source')} /></label>
        <datalist id="sources">{SOURCES.map((s) => <option key={s} value={s} />)}</datalist>
        <div className="two">
          <label>Stage<select value={f.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}</select></label>
          <label>Next follow-up<input type="date" value={f.followUpDate} onChange={set('followUpDate')} /></label>
        </div>
        <label>Message from the lead<textarea rows="3" value={f.message} onChange={set('message')} /></label>
        <label>Your note (optional)<textarea rows="2" placeholder="e.g. Called, asked me to reach out next week" value={f.note} onChange={set('note')} /></label>
        {err && <p className="error" role="alert">{err}</p>}
        <div className="row"><button type="button" onClick={onCancel}>Cancel</button><button className="primary">Save lead</button></div>
      </form>
    </div>
  );
}

function LeadPanel({ lead, onChange, onClose }) {
  const [note, setNote] = useState('');
  const [noteDate, setNoteDate] = useState('');
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState(null);
  const run = async (fn) => {
    try { await fn(); setErr(''); onChange(); return true; } catch (ex) { setErr(ex.message); return false; }
  };
  const patch = (body) => run(() => api(`/leads/${lead._id}`, { method: 'PATCH', body }));
  const addNote = (e) => {
    e.preventDefault();
    run(async () => {
      await api(`/leads/${lead._id}/notes`, { method: 'POST', body: { text: note, followUp: noteDate } });
      setNote(''); setNoteDate('');
    });
  };
  const remove = () => {
    if (confirm(`Delete ${lead.name}? This cannot be undone.`)) run(async () => { await api(`/leads/${lead._id}`, { method: 'DELETE' }); onClose(); });
  };
  const saveEdit = async (e) => { e.preventDefault(); if (await patch(edit)) setEdit(null); };
  const setE = (k) => (e) => setEdit({ ...edit, [k]: e.target.value });
  return (
    <div className="backdrop side" onClick={onClose}>
      <aside className="panel" onClick={(e) => e.stopPropagation()} aria-label="Lead details">
        <button className="close" onClick={onClose} aria-label="Close details">×</button>
        {edit ? (
          <form onSubmit={saveEdit} className="editform">
            <h2>Edit details</h2>
            <label>Name<input required value={edit.name} onChange={setE('name')} /></label>
            <label>Email<input type="email" required value={edit.email} onChange={setE('email')} /></label>
            <label>Phone<input value={edit.phone} onChange={setE('phone')} /></label>
            <label>Source<input list="sources" value={edit.source} onChange={setE('source')} /></label>
            <div className="row"><button type="button" onClick={() => setEdit(null)}>Cancel</button><button className="primary">Save changes</button></div>
          </form>
        ) : (
          <><h2>{lead.name}</h2><p className="muted">{lead.email}</p></>
        )}

        <h3>Pipeline stage</h3>
        <Stepper status={lead.status} onPick={(s) => patch({ status: s })} />
        {lead.status === 'lost'
          ? <button className="wide" onClick={() => patch({ status: 'new' })}>Reopen lead</button>
          : <button className="wide lostbtn" onClick={() => patch({ status: 'lost' })}>Mark as lost</button>}

        {!edit && (
          <>
            <dl className="facts">
              <div><dt>Phone</dt><dd>{lead.phone || '—'}</dd></div>
              <div><dt>Source</dt><dd>{lead.source}</dd></div>
              <div><dt>Lead since</dt><dd>{fmt(lead.createdAt)}</dd></div>
              <div><dt>Next follow-up</dt>
                <dd>{lead.followUpDate
                  ? <><span className={isDue(lead) ? 'due' : ''}>{fmt(lead.followUpDate)}</span><button className="link" onClick={() => patch({ followUpDate: null })}>Done</button></>
                  : '—'}</dd></div>
            </dl>
            {lead.message && <blockquote>{lead.message}</blockquote>}
            <button onClick={() => setEdit({ name: lead.name, email: lead.email, phone: lead.phone || '', source: lead.source })}>Edit details</button>
          </>
        )}

        <h3>Notes and follow-ups</h3>
        <form onSubmit={addNote}>
          <textarea rows="3" placeholder="Log a call, an email or what to do next" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="noterow">
            <input type="date" aria-label="Follow-up date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} />
            <button className="primary" disabled={!note.trim()}>Add note</button>
          </div>
        </form>
        {err && <p className="error" role="alert">{err}</p>}
        <ul className="notes">
          {lead.notes.length === 0 && <li className="muted">No notes yet.</li>}
          {lead.notes.map((n) => (
            <li key={n._id}><p>{n.text}</p><small>{fmt(n.createdAt)}</small>{n.followUp && <em className="fu">Follow up {fmt(n.followUp)}</em>}</li>
          ))}
        </ul>
        <button className="danger" onClick={remove}>Delete lead</button>
      </aside>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [leads, setLeads] = useState([]);
  const [view, setView] = useState('overview');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try { setLeads(await api('/leads')); setErr(''); } catch (ex) { setErr(ex.message); }
  }, []);
  useEffect(() => { if (authed) load(); }, [authed, load]);

  const counts = useMemo(() => Object.fromEntries(STATUSES.map((s) => [s, leads.filter((l) => l.status === s).length])), [leads]);
  const searched = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? leads.filter((l) => `${l.name} ${l.email} ${l.source}`.toLowerCase().includes(t)) : leads;
  }, [leads, q]);
  const shown = filter === 'all' ? searched : searched.filter((l) => l.status === filter);

  const move = async (id, status) => {
    setLeads((ls) => ls.map((l) => (l._id === id ? { ...l, status } : l)));
    try { await api(`/leads/${id}`, { method: 'PATCH', body: { status } }); } catch (ex) { setErr(ex.message); load(); }
  };

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;
  const open = leads.find((l) => l._id === openId);
  const go = (s) => { setFilter(s); setView('leads'); };

  return (
    <div className="shell">
      <nav className="side">
        <div className="brand"><i />Leadlane</div>
        {[['overview', 'Overview'], ['leads', 'Leads'], ['board', 'Board']].map(([k, t]) => (
          <button key={k} className={view === k ? 'nav on' : 'nav'} onClick={() => setView(k)}>{t}{k === 'leads' && <span>{leads.length}</span>}</button>
        ))}
        <button className="nav out" onClick={() => { setToken(null); setAuthed(false); }}>Sign out</button>
      </nav>

      <main className="main">
        <header className="top">
          <h1>{TITLES[view]}</h1>
          {view !== 'overview' && <input type="search" placeholder="Search name, email or source" value={q} onChange={(e) => setQ(e.target.value)} />}
          <button className="primary" onClick={() => setAdding(true)}>New lead</button>
        </header>
        {err && <p className="error" role="alert">{err}</p>}

        {view === 'overview' && <Overview leads={leads} counts={counts} go={go} onOpen={setOpenId} />}
        {view === 'leads' && (
          <>
            <div className="chips">
              {['all', ...STATUSES].map((s) => (
                <button key={s} className={filter === s ? 'chip on' : 'chip'} onClick={() => setFilter(s)}>
                  {s === 'all' ? 'All' : LABEL[s]}<span>{s === 'all' ? leads.length : counts[s]}</span>
                </button>
              ))}
            </div>
            <Table leads={shown} onOpen={setOpenId} filtered={q.trim() !== '' || filter !== 'all'} onClear={() => { setQ(''); setFilter('all'); }} />
          </>
        )}
        {view === 'board' && <Board leads={searched} onOpen={setOpenId} onMove={move} />}
      </main>

      {open && <LeadPanel key={open._id} lead={open} onChange={load} onClose={() => { setOpenId(null); load(); }} />}
      {adding && <AddLead onCancel={() => setAdding(false)} onDone={() => { setAdding(false); setQ(''); setFilter('all'); load(); }} />}
    </div>
  );
}
