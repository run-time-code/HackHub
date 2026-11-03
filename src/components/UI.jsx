import React from 'react';
import { Bookmark, CalendarDays, Clock3, MapPin, Trophy, Users, X } from 'lucide-react';

export function Badge({children, tone=''}) { return <span className={`badge ${tone}`}>{children}</span>; }
export function Button({children, variant='primary', ...props}) { return <button className={`button ${variant}`} {...props}>{children}</button>; }
export function ScoreBadge({score}) { const tone = score >= 80 ? 'high' : score >= 60 ? 'mid' : 'low'; return <span className={`score-badge ${tone}`} title={`Worth Score: ${score} out of 100`}><strong>{score}</strong><small>/100</small></span>; }
export function HackathonCard({item, saved, onSave, onOpen, onNotRelevant, compare, onCompare}) {
 const days = Math.ceil((new Date(`${item.deadline}T23:59:59`) - new Date()) / 86400000);
 return <article className="hack-card">
  <div className="card-top"><Badge>{item.organizer}</Badge><ScoreBadge score={item.score}/></div>
  <button className="card-title" onClick={onOpen}>{item.title}</button>
  <p className="muted description">{item.description}</p>
  <div className="meta-grid"><span><CalendarDays size={15}/>{new Date(item.deadline+'T12:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span><span><Clock3 size={15}/>{days < 0 ? 'Closed' : `${days} days left`}</span><span><MapPin size={15}/>{item.mode}</span><span><Trophy size={15}/>{item.prize == null ? 'Prize not disclosed' : `₹${item.prize.toLocaleString('en-IN')}`}</span><span><Users size={15}/>{item.teamSize} members</span></div>
  <div className="tags">{item.skills.map(s=><Badge key={s} tone="tag">{s}</Badge>)}</div>
  <div className="card-actions"><Button onClick={onOpen}>View details</Button><Button variant={saved?'saved':'secondary'} onClick={onSave}><Bookmark size={15} fill={saved?'currentColor':'none'}/>{saved?'Saved':'Save'}</Button><label className="compare-check"><input type="checkbox" checked={compare} onChange={onCompare}/> Compare</label></div>
  <button className="not-relevant" onClick={onNotRelevant}><X size={13}/> Not relevant</button>
 </article>;
}
export function Modal({children,onClose}) { return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="modal"><button className="modal-close" onClick={onClose} aria-label="Close"><X/></button>{children}</section></div>; }
