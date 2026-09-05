import { useState } from 'react';
import { DB, weeklyHours, uid } from '../data/mockData';
export default function Schedules(){
  const [selected,setSelected]=useState(null);
  const [show,setShow]=useState(false);
  const [form,setForm]=useState({name:'',type:'Fixed',days:[
    {day:'Mon',on:true,start:'09:00',end:'18:00',brk:60},{day:'Tue',on:true,start:'09:00',end:'18:00',brk:60},{day:'Wed',on:true,start:'09:00',end:'18:00',brk:60},{day:'Thu',on:true,start:'09:00',end:'18:00',brk:60},{day:'Fri',on:true,start:'09:00',end:'18:00',brk:60},{day:'Sat',on:false,start:'',end:'',brk:0},{day:'Sun',on:false,start:'',end:'',brk:0}]});
  const [tick,setTick]=useState(0);
  const total=weeklyHours(form);

  const create=()=>{
    if(!form.name.trim()) return alert('Name required');
    DB.schedules.push({id:uid('SCH'),name:form.name,type:form.type,days:form.days.map(d=>({...d}))});
    setShow(false); setTick(x=>x+1);
  };

  return (
    <div>
      <div className="pageHead"><div><h1>Working Schedules</h1><div className="desc">List shows name, type, weekly hours (auto). Form defines Day/Start/End/Break — total auto-calculated. — A3 spec (hardcoded)</div></div>
        <button className="btn solid" onClick={()=>setShow(true)}>+ New Schedule</button>
      </div>
      <div className="card"><div className="tableWrap"><table>
        <thead><tr><th>Name</th><th>Type</th><th>Weekly Hours</th><th>Days</th><th></th></tr></thead>
        <tbody>{DB.schedules.map(s=>(
          <tr key={s.id}><td>{s.name}</td><td><span className="pill gray">{s.type}</span></td><td><b>{weeklyHours(s)}h</b></td><td>{s.days.filter(d=>d.on).map(d=>d.day).join(', ')}</td><td><button className="btn small" onClick={()=>setSelected(s)}>View</button></td></tr>
        ))}</tbody>
      </table></div></div>
      {selected && (
        <div className="modalOverlay" onMouseDown={e=>{if(e.target===e.currentTarget) setSelected(null);}}>
          <div className="modal wide"><div className="modalHead"><h3>{selected.name} — {weeklyHours(selected)}h / week</h3><button className="modalClose" onClick={()=>setSelected(null)}>×</button></div>
            <div className="modalBody">
              <div className="tableWrap"><table><thead><tr><th>Day</th><th>On</th><th>Start</th><th>End</th><th>Break</th></tr></thead>
                <tbody>{selected.days.map(d=>(
                  <tr key={d.day}><td>{d.day}</td><td>{d.on?'✓':'—'}</td><td>{d.start||'—'}</td><td>{d.end||'—'}</td><td>{d.brk||0} min</td></tr>
                ))}</tbody></table></div>
              <div className="hint" style={{marginTop:10}}>Auto-calculated, not manual. Assigned to employees/contracts.</div>
            </div>
          </div>
        </div>
      )}
      {show && (
        <div className="modalOverlay" onMouseDown={e=>{if(e.target===e.currentTarget) setShow(false);}}>
          <div className="modal wide"><div className="modalHead"><h3>New Schedule — {total}h / week (auto)</h3><button className="modalClose" onClick={()=>setShow(false)}>×</button></div>
            <div className="modalBody">
              <div className="field"><label>Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Standard 40h" /></div>
              <div className="field"><label>Type</label><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>Fixed</option><option>Flexible</option><option>Rotational</option><option>Part-time</option><option>Night Shift</option><option>Weekend Only</option></select></div>
              <div className="tableWrap" style={{marginTop:10}}><table><thead><tr><th>Day</th><th>On</th><th>Start</th><th>End</th><th>Break</th></tr></thead>
                <tbody>{form.days.map((d,i)=>(
                  <tr key={d.day}><td>{d.day}</td><td><input type="checkbox" checked={d.on} onChange={e=>{
                    const days=[...form.days]; days[i].on=e.target.checked; setForm({...form,days});
                  }} /></td><td><input style={{width:90,padding:'4px 6px',border:'1px solid var(--border)',borderRadius:6}} value={d.start} onChange={e=>{const days=[...form.days]; days[i].start=e.target.value; setForm({...form,days});}} /></td><td><input style={{width:90,padding:'4px 6px',border:'1px solid var(--border)',borderRadius:6}} value={d.end} onChange={e=>{const days=[...form.days]; days[i].end=e.target.value; setForm({...form,days});}} /></td><td><input type="number" style={{width:70,padding:'4px 6px',border:'1px solid var(--border)',borderRadius:6}} value={d.brk} onChange={e=>{const days=[...form.days]; days[i].brk=Number(e.target.value); setForm({...form,days});}} /></td></tr>
                ))}</tbody></table></div>
            </div>
            <div className="modalFoot"><button className="btn" onClick={()=>setShow(false)}>Cancel</button><button className="btn solid" onClick={create}>Create</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
