import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  {key:'employee',label:'Employee',sub:'Antra Gajjar',icon:'👨‍💻'},
  {key:'hr_manager',label:'HR Manager',sub:'Karan Patel',icon:'👩‍💼'},
  {key:'hr_payroll_user',label:'HR Payroll User',sub:'Meera Iyer',icon:'💰'},
  {key:'hr_payroll_manager',label:'Payroll Manager',sub:'Rahul Sharma',icon:'🧑‍💼'},
  {key:'admin',label:'Admin',sub:'Full access',icon:'👑'},
];

export default function Login(){
  const {login}=useAuth();
  const nav=useNavigate();
  const doLogin=(role)=>{
    login(role);
    nav(role==='employee'?'/employees':'/dashboard');
  };
  return (
    <div id="loginScreen">
      <div className="loginCard">
        <div className="loginLeft">
          <div className="logo"><span className="dot"></span>PeoplePay360</div>
          <div>
            <h1>Employee → Contract → Attendance → Leave → Payroll → Payslip, all in one flow.</h1>
            <p>A connected HR & Payroll operations platform.</p>
            <div className="flowMini">
              <span>👤 Employees</span><span>📄 Contracts</span><span>🕐 Attendance</span><span>🏖️ Time Off</span><span>💰 Payroll</span><span>📃 Payslips</span><span>📊 Dashboard</span>
            </div>
          </div>
          <div style={{fontSize:12,color:'#93A7BA'}}>Demo build · in-memory data · resets on reload</div>
        </div>
        <div className="loginRight">
          <h2>Welcome back</h2>
          <div className="sub">Sign in to the HR portal. Any email/password works in this demo.</div>
          <div className="field"><label>Work email</label><input defaultValue="antra.gajjar@peoplepay360.com" /></div>
          <div className="field"><label>Password</label><input type="password" defaultValue="demo1234" /></div>
          <button className="btnPrimary" onClick={()=>doLogin('admin')}>Sign in as Admin</button>
          <div className="demoNote">👉 Or jump straight into a role to explore permissions:</div>
          <div className="roleGrid">
            {ROLES.map(r=>(
              <button key={r.key} className="roleChip" onClick={()=>doLogin(r.key)}>{r.icon} {r.label}<span className="d">{r.sub}</span></button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
