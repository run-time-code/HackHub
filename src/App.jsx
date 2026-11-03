import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownUp, ArrowLeft, Bookmark, Check, ChevronDown, CircleHelp, Compass, GitCompare, Menu, Search, SlidersHorizontal, Sparkles, Trophy, X,LogOut,UserPlus,ShieldCheck } from 'lucide-react';
import { hackathons as seed } from './data';
import { hackathonApi, bookmarkApi } from './services/api';
import { Badge, Button, HackathonCard, Modal, ScoreBadge } from './components/UI';


const readParams = () => { const p=new URLSearchParams(location.search); return {q:p.get('q')||'',domain:p.get('domain')||'All domains',mode:p.get('mode')||'Any mode',sort:p.get('sort')||'recommended'}; };
const money = n => n == null ? 'Not disclosed' : `₹${n.toLocaleString('en-IN')}`;

export default function App(){
 const [items,setItems]=useState(seed), [apiState,setApiState]=useState('demo'), [params,setParams]=useState(readParams);
 const [saved,setSaved]=useState(()=>{try{return JSON.parse(localStorage.getItem('hackhub-saved')||'[]')}catch{return []}});
 const [selected,setSelected]=useState(null), [compare,setCompare]=useState([]), [showCompare,setShowCompare]=useState(false), [showFilters,setShowFilters]=useState(false), [why,setWhy]=useState(null), [toast,setToast]=useState(''), [activeTab,setActiveTab]=useState('For You');
 const [showProfileMenu, setShowProfileMenu] = useState(false);

 const [domainFilter,setDomainFilter]=useState('All domains'),[modeFilter,setModeFilter]=useState('Any mode'),[skillFilter,setSkillFilter]=useState(''),[minPrize,setMinPrize]=useState('');
 useEffect(()=>{let alive=true; const load=async()=>{const base=import.meta.env.VITE_HACKATHON_API_BASE_URL;if(!base)return;try{const data=await hackathonApi.list();const rows=Array.isArray(data)?data:(data?.items||data?.hackathons);if(alive&&Array.isArray(rows)&&rows.length){setItems(rows.map(normalize));setApiState('connected')}}catch{if(alive)setApiState('demo')}};load();return()=>{alive=false}},[]);
 useEffect(()=>{const p=new URLSearchParams();Object.entries(params).forEach(([k,v])=>{if(v&&v!=='All domains'&&v!=='Any mode'&&v!=='recommended')p.set(k,v)});history.replaceState({},'',`${location.pathname}${p.size?'?'+p.toString():''}`)},[params]);
 useEffect(()=>{localStorage.setItem('hackhub-saved',JSON.stringify(saved))},[saved]);
 useEffect(()=>{if(!toast)return;const id=setTimeout(()=>setToast(''),2600);return()=>clearTimeout(id)},[toast]);
 const filtered=useMemo(()=>{let list=items.filter(x=>{const text=`${x.title} ${x.description} ${x.organizer} ${x.skills.join(' ')} ${x.domain}`.toLowerCase();return (!params.q||text.includes(params.q.toLowerCase()))&&(domainFilter==='All domains'||x.domain===domainFilter)&&(modeFilter==='Any mode'||x.mode===modeFilter)&&(!skillFilter||x.skills.some(s=>s.toLowerCase().includes(skillFilter.toLowerCase())))&&(!minPrize||(x.prize||0)>=Number(minPrize))});if(activeTab==='Saved')list=list.filter(x=>saved.includes(x.id));if(activeTab==='Ending Soon')list=list.filter(x=>(new Date(x.deadline)-new Date())/86400000<=7);if(activeTab==='Trending')list=list.filter(x=>x.trending);if(activeTab==='New This Week')list=list.filter(x=>x.createdDays<=7);if(params.sort==='deadline')list.sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));if(params.sort==='newest')list.sort((a,b)=>a.createdDays-b.createdDays);if(params.sort==='prize')list.sort((a,b)=>(b.prize||0)-(a.prize||0));if(params.sort==='worth')list.sort((a,b)=>b.score-a.score);return list},[items,params,domainFilter,modeFilter,skillFilter,minPrize,activeTab,saved]);
 function update(key,value){setParams(old=>({...old,[key]:value}))}
 function toggleSave(id){const exists=saved.includes(id);setSaved(old=>exists?old.filter(x=>x!==id):[...old,id]);setToast(exists?'Removed from saved hackathons':'Hackathon saved');const base=import.meta.env.VITE_BOOKMARK_API_BASE_URL;if(base){(exists?bookmarkApi.remove(id):bookmarkApi.save(id)).catch(()=>setToast('Saved locally. API request failed; check endpoint configuration.'))}}
 function markIrrelevant(id){setItems(old=>old.filter(x=>x.id!==id));setToast('Removed from this feed');const base=import.meta.env.VITE_BOOKMARK_API_BASE_URL;if(base)bookmarkApi.notRelevant(id).catch(()=>{});}
 function toggleCompare(id){setCompare(old=>old.includes(id)?old.filter(x=>x!==id):old.length<3?[...old,id]:(setToast('You can compare up to 3 hackathons'),old))}
 const selectedItems=items.filter(x=>compare.includes(x.id)); const domains=['All domains',...new Set(items.map(x=>x.domain))];
 return <div className="app-shell">
  <aside className="sidebar"><div className="brand"><span className="brand-mark"><Activity size={21}/></span><span>hack<span>hub</span></span></div><div className="workspace-label">WORKSPACE</div><nav><button className="nav-item active"><Compass size={18}/> Discover <span className="nav-dot"/></button><button className="nav-item" onClick={()=>setActiveTab('For You')}><Sparkles size={18}/> For You</button><button className="nav-item" onClick={()=>{setActiveTab('Saved');setToast('Saved items are highlighted with the Save button')}}><Bookmark size={18}/> Saved <span className="count">{saved.length}</span></button><button className="nav-item" onClick={()=>setShowCompare(true)}><GitCompare size={18}/> Compare <span className="count">{compare.length}</span></button></nav>
<div className="sidebar-bottom">
  <button
    className="profile-dropdown-btn"
    onClick={() => setShowProfileMenu(!showProfileMenu)}
  >
    <div className="profile-avatar">A</div>

    <div className="profile-info">
      <strong>Admin Profile</strong>
      <small>Administrator</small>
    </div>

    <ChevronDown size={16} />
  </button>

  {showProfileMenu && (
    <div className="profile-menu">
      <button onClick={() => setToast("Personal Details opened")}>
        Personal Details
      </button>

      <button onClick={() => setToast("Add Account clicked")}>
        + Add Account
      </button>

      <button
        className="logout-menu-btn"
        onClick={() => {
          if (window.confirm("Are you sure you want to logout?")) {
            setToast("Logout clicked");
          }
        }}
      >
        Log Out
      </button>
    </div>
  )}
</div>
</aside>

  <main className="main-content"><header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>Discover hackathons</strong></div><div className="topbar-right"><span className={`api-status ${apiState}`}><i/>{apiState==='connected'?'API connected':'Demo data'}</span><div className="profile-avatar small">A</div></div></header>
   <section className="hero"><div><div className="eyebrow"><Sparkles size={14}/> YOUR NEXT BIG IDEA STARTS HERE</div><h1>Find your next <span>hackathon.</span></h1><p>Discover opportunities that match your skills, goals, and schedule.</p></div><div className="hero-art"><div className="art-circle"><Trophy size={37}/></div><div className="art-spark s1">✳</div><div className="art-spark s2">✦</div><div className="art-pill">Build something brilliant</div></div></section>
   <section className="search-row"><div className="search-box"><Search size={19}/><input aria-label="Search hackathons" value={params.q} onChange={e=>update('q',e.target.value)} placeholder="Search by name, skill, domain, or organizer..."/><kbd>⌘ K</kbd></div><Button variant="secondary" onClick={()=>setShowFilters(!showFilters)}><SlidersHorizontal size={17}/> Filters <span className="filter-count">{[domainFilter!=='All domains',modeFilter!=='Any mode',!!skillFilter,!!minPrize].filter(Boolean).length||''}</span></Button></section>
   {showFilters&&<section className="filter-panel"><label>Domain<select value={domainFilter} onChange={e=>setDomainFilter(e.target.value)}>{domains.map(d=><option key={d}>{d}</option>)}</select></label><label>Mode<select value={modeFilter} onChange={e=>setModeFilter(e.target.value)}>{['Any mode','Online','Offline','Hybrid'].map(d=><option key={d}>{d}</option>)}</select></label><label>Skill<input value={skillFilter} onChange={e=>setSkillFilter(e.target.value)} placeholder="e.g. React"/></label><label>Minimum prize (₹)<input type="number" min="0" value={minPrize} onChange={e=>setMinPrize(e.target.value)} placeholder="Any prize"/></label><Button variant="secondary" onClick={()=>{setDomainFilter('All domains');setModeFilter('Any mode');setSkillFilter('');setMinPrize('')}}>Reset</Button></section>}
   <div className="section-heading"><div><h2>Discover opportunities</h2><p>Curated events to help you learn, build, and stand out.</p></div><div className="sort-control"><ArrowDownUp size={16}/><select aria-label="Sort hackathons" value={params.sort} onChange={e=>update('sort',e.target.value)}><option value="recommended">Recommended</option><option value="deadline">Deadline soon</option><option value="newest">Newest</option><option value="prize">Highest prize</option><option value="worth">Worth Score</option></select></div></div>
   <div className="tabs">{['For You','Ending Soon','Trending','New This Week'].map(t=><button key={t} className={activeTab===t?'selected':''} onClick={()=>setActiveTab(t)}>{t}{t==='For You'&&<Sparkles size={14}/>}</button>)}</div>
   <div className="result-line"><span><strong>{filtered.length}</strong> opportunities found</span><span className="demo-note">{apiState==='demo'?'Sample data · connect your team API when ready':'Live data from API'}</span></div>
   {filtered.length?<div className="cards-grid">{filtered.map(item=><HackathonCard key={item.id} item={item} saved={saved.includes(item.id)} onSave={()=>toggleSave(item.id)} onOpen={()=>setSelected(item)} onNotRelevant={()=>markIrrelevant(item.id)} compare={compare.includes(item.id)} onCompare={()=>toggleCompare(item.id)}/>)}</div>:<div className="empty-state"><div className="empty-icon"><Search size={25}/></div><h3>No hackathons found</h3><p>Try another keyword or reset your filters to see more opportunities.</p><Button onClick={()=>{update('q','');setDomainFilter('All domains');setModeFilter('Any mode');setSkillFilter('');setMinPrize('');setActiveTab('For You')}}>Clear all filters</Button></div>}
   <footer className="page-footer"><span>Made for builders, by builders.</span><span>HackHub UI · Work Area 1</span></footer>
  </main>
  {selected&&<Modal onClose={()=>setSelected(null)}><div className="detail-heading"><Badge>{selected.organizer}</Badge><ScoreBadge score={selected.score}/></div><h2 className="detail-title">{selected.title}</h2><p className="muted">{selected.description}</p><div className="detail-stats"><div><small>Prize pool</small><strong>{money(selected.prize)}</strong></div><div><small>Deadline</small><strong>{new Date(selected.deadline+'T12:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</strong></div><div><small>Mode</small><strong>{selected.mode}</strong></div><div><small>Team size</small><strong>{selected.teamSize}</strong></div></div><h3>About this hackathon</h3><p>{selected.description}</p><p><strong>Eligibility:</strong> {selected.eligibility}</p><h3>Skills</h3><div className="tags">{selected.skills.map(s=><Badge key={s} tone="tag">{s}</Badge>)}</div><div className="score-explain"><div className="score-explain-head"><div><h3>Why this score?</h3><p className="muted">A transparent preview of six fit factors.</p></div><button className="help-button" onClick={()=>setWhy(why===selected.id?null:selected.id)}><CircleHelp size={18}/></button></div><div className="factor-list">{selected.factors.map(f=><div className="factor" key={f.name}><div><span>{f.name}</span><strong>{f.score}/100</strong></div><div className="factor-track"><i style={{width:`${f.score}%`}}/></div>{why===selected.id&&<p>{f.reason}</p>}</div>)}</div></div><div className="modal-actions"><Button variant="secondary" onClick={()=>toggleSave(selected.id)}><Bookmark size={16}/>{saved.includes(selected.id)?'Saved':'Save hackathon'}</Button><Button onClick={()=>setToast('Add the official registration URL from the API response to enable registration.')}>Register externally ↗</Button></div></Modal>}
  {showCompare&&<Modal onClose={()=>setShowCompare(false)}><div className="eyebrow"><GitCompare size={15}/> DECISION TOOL</div><h2 className="detail-title">Compare hackathons</h2><p className="muted">Select up to 3 cards using the Compare checkbox. Compare dates, prizes, format, and Worth Score side by side.</p>{selectedItems.length?<div className="compare-table-wrap"><table className="compare-table"><thead><tr><th>Details</th>{selectedItems.map(x=><th key={x.id}>{x.title}</th>)}</tr></thead><tbody>{[['Deadline',x=>new Date(x.deadline+'T12:00:00').toLocaleDateString('en-IN')],['Prize',x=>money(x.prize)],['Mode',x=>x.mode],['Team size',x=>x.teamSize],['Worth Score',x=>`${x.score}/100`]].map(([label,fn])=><tr key={label}><td>{label}</td>{selectedItems.map(x=><td key={x.id}>{fn(x)}</td>)}</tr>)}</tbody></table></div>:<div className="empty-state compact"><div className="empty-icon"><GitCompare size={23}/></div><h3>No comparisons yet</h3><p>Close this panel and tick Compare on up to three hackathon cards.</p></div>}<div className="modal-actions"><Button variant="secondary" onClick={()=>setCompare([])}>Clear selection</Button><Button onClick={()=>setShowCompare(false)}>Done</Button></div></Modal>}
  {toast&&<div className="toast"><Check size={17}/>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss"><X size={15}/></button></div>}
 </div>
}
function normalize(x){return {...x,id:String(x.id??x._id),title:x.title??x.name??'Untitled hackathon',organizer:x.organizer??x.source??'Community',domain:x.domain??'General',mode:x.mode??'Online',location:x.location??'Online',deadline:x.deadline??x.deadlineAt??'2026-12-31',prize:x.prize??x.prizeAmount??null,teamSize:x.teamSize??'Not specified',skills:Array.isArray(x.skills)?x.skills:[],description:x.description??'Details will be available soon.',eligibility:x.eligibility??'Check official rules',trending:!!x.trending,createdDays:x.createdDays??10,score:Math.max(0,Math.min(100,Number(x.score??x.worthScore??0))),factors:Array.isArray(x.factors)?x.factors:[]}}
