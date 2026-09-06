import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext';
import { DB, initials } from '../data/mockData';

const NAV = [
  {to:'/payroll-dashboard',label:'Payroll Dashboard',roles:['hr_manager','hr_payroll_user','hr_payroll_manager','admin']},
  {to:'/employees',label:'Employees',roles:['employee','hr_manager','hr_payroll_user','hr_payroll_manager','admin']},
  {to:'/contracts',label:'Contracts',roles:['hr_manager','hr_payroll_user','hr_payroll_manager','admin']},
  {to:'/schedules',label:'Working Schedules',roles:['hr_manager','hr_payroll_user','hr_payroll_manager','admin']},
  {to:'/attendance',label:'Attendance',roles:['employee','hr_manager','hr_payroll_user','hr_payroll_manager','admin']},
  {to:'/timeoff',label:'Time Off',roles:['employee','hr_manager','hr_payroll_user','hr_payroll_manager','admin']},
  {to:'/payroll',label:'Payroll',roles:['hr_payroll_user','hr_payroll_manager','admin']},
  {to:'/payslips',label:'Payslips',roles:['hr_manager','hr_payroll_user','hr_payroll_manager','admin']},
  {to:'/salary-structures',label:'Salary Structures',roles:['hr_payroll_user','hr_payroll_manager','admin']},
  {to:'/salary-rules',label:'Salary Rules',roles:['hr_payroll_user','hr_payroll_manager','admin']},
];

export default function Layout({children}){
  const {user,logout}=useAuth();
  const nav=useNavigate();
  const emp=user ? DB.employees.find(e=>e.id===user.empId) : null;
  const name=emp?emp.name:user?.role||'';
  const visible=NAV.filter(n=>n.roles.includes(user.role));

  const handleLogout=()=>{
    logout();
    nav('/login');
  };

  return (
    <div id="appShell">
      <div className="topbar">
        <div className="brand"><span className="dot"></span>PeoplePay360</div>
        <div className="right">
          <span className="rolePill">{ROLES[user.role].label}</span>
          <div className="userMini"><span className="avatar" style={{background:ROLES[user.role].color}}>{initials(name)}</span>{name}</div>
          <button className="logoutBtn" onClick={handleLogout}>Sign out</button>
        </div>
      </div>
      <div className="subnav">
        {visible.map(n=>(
          <NavLink key={n.to} to={n.to} className={({isActive})=> {
            const payrollActive = n.to==='/payroll' && (location.pathname==='/payroll' || location.pathname.startsWith('/payroll/'));
            return isActive || payrollActive ? 'navbtn active' : 'navbtn';
          }}>{n.label}</NavLink>
        ))}
      </div>
      <div id="appBody">{children}</div>
    </div>
  );
}
