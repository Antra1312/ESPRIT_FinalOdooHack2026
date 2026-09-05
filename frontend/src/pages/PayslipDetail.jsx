import { useParams, useNavigate } from 'react-router-dom';
import { DB, fmtMoney, periodLabel } from '../data/mockData';

export default function PayslipDetail(){
  const {id}=useParams();
  const nav=useNavigate();
  const ps=DB.payslips.find(p=>p.id===id);
  if(!ps) return <div>Not found</div>;
  const emp=DB.employees.find(e=>e.id===ps.employeeId);
  const pr=DB.payruns.find(p=>p.id===ps.payrunId);

  const print=()=>{
    const w=window.open('','_blank');
    w.document.write(`
      <html><head><title>Payslip - ${emp.name}</title><style>
        body{font-family:Inter,sans-serif;padding:40px;color:#121826}
        h1{font-family:Sora,sans-serif}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        th,td{padding:8px 12px;border:1px solid #E2E6F0;text-align:left}
        th{background:#FAFBFD;font-size:12px;text-transform:uppercase;color:#94A0B8}
      </style></head><body>
      <h1>Payslip — ${emp.name}</h1>
      <div>${periodLabel(ps.period)} · ${pr?.name||''}</div>
      <table><thead><tr><th>Code</th><th>Name</th><th>Category</th><th>Amount</th></tr></thead>
      <tbody>${ps.lines.map(l=>`<tr><td>${l.code}</td><td>${l.name}</td><td>${l.category}</td><td>${fmtMoney(l.amount)}</td></tr>`).join('')}</tbody>
      </table>
      <div style="margin-top:16px;font-weight:700">Gross: ${fmtMoney(ps.gross)} | Deductions: ${fmtMoney(ps.deductions)} | Net: ${fmtMoney(ps.net)}</div>
      </body></html>
    `);
    w.document.close(); w.print();
  };

  return (
    <div>
      <div className="breadcrumb"><a onClick={()=>nav(`/payroll/${pr?.id}`)} style={{cursor:'pointer'}}>Payrun</a> / Payslip</div>
      <div className="pageHead"><div><h1>{emp.name} — {periodLabel(ps.period)}</h1><div className="desc">{pr?.name} · {ps.status}</div></div>
        <button className="btn solid" onClick={print}>Print / Save PDF</button>
      </div>
      <div className="card"><div className="cardHead"><h3>Salary Computation</h3></div>
        <div className="cardBody">
          <div className="tableWrap"><table>
            <thead><tr><th>Code</th><th>Name</th><th>Category</th><th style={{textAlign:'right'}}>Amount</th></tr></thead>
            <tbody>{ps.lines.map(l=>(
              <tr key={l.code}><td>{l.code}</td><td>{l.name}</td><td><span className="pill gray">{l.category}</span></td><td style={{textAlign:'right'}}>{fmtMoney(l.amount)}</td></tr>
            ))}</tbody>
          </table></div>
          <div style={{marginTop:14,borderTop:'2px solid var(--ink)',paddingTop:10,display:'flex',justifyContent:'space-between',fontWeight:700}}>
            <span>Gross {fmtMoney(ps.gross)}</span><span>Deductions {fmtMoney(ps.deductions)}</span><span>Net {fmtMoney(ps.net)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
