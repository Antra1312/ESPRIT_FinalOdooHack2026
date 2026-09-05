import { useNavigate } from 'react-router-dom';
import { DB, fmtMoney, periodLabel } from '../data/mockData';

export default function Payslips(){
  const nav=useNavigate();
  return (
    <div>
      <div className="pageHead"><div><h1>Payslips</h1><div className="desc">Accessible via parent Payruns or dedicated list — Employee, Structure, Pay Run, Period, Status, Worked Days, rule breakdowns. — B7 spec</div></div></div>
      <div className="card"><div className="tableWrap"><table>
        <thead><tr><th>Employee</th><th>Pay Run</th><th>Period</th><th>Status</th><th>Worked Days</th><th>Net</th></tr></thead>
        <tbody>{DB.payslips.map(ps=>{
          const emp=DB.employees.find(e=>e.id===ps.employeeId);
          const pr=DB.payruns.find(p=>p.id===ps.payrunId);
          return <tr key={ps.id} className="clickable" onClick={()=>nav(`/payslips/${ps.id}`)}>
            <td>{emp?.name}</td><td>{pr?.name}</td><td>{periodLabel(ps.period)}</td><td><span className={`pill ${ps.status==='Paid'?'green':ps.status==='Computed'?'blue':'amber'}`}>{ps.status}</span></td><td>{ps.workedDays||22}</td><td><b>{fmtMoney(ps.net)}</b></td>
          </tr>;
        })}</tbody>
      </table></div></div>
    </div>
  );
}
