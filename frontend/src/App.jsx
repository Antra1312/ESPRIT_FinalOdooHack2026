import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeDetail from './pages/EmployeeDetail';
import Contracts from './pages/Contracts';
import Schedules from './pages/Schedules';
import Attendance from './pages/Attendance';
import TimeOff from './pages/TimeOff';
import Payroll from './pages/Payroll';
import PayrunDetail from './pages/PayrunDetail';
import PayslipDetail from './pages/PayslipDetail';
import Payslips from './pages/Payslips';
import SalaryStructures from './pages/SalaryStructures';
import SalaryRules from './pages/SalaryRules';

function Protected({children, roles}){
  const {user}=useAuth();
  if(!user) return <Navigate to="/login" replace />;
  if(roles && !roles.includes(user.role)) return <Navigate to="/employees" replace />;
  return children;
}

function AppRoutes(){
  const {user}=useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role==='employee'?'/employees':'/payroll-dashboard'} replace/> : <Login/>} />
      <Route path="/payroll-dashboard" element={<Protected roles={['hr_manager','hr_payroll_user','hr_payroll_manager','admin']}><Layout><Dashboard/></Layout></Protected>} />
      <Route path="/reports" element={<Navigate to="/payroll-dashboard" replace/>} />
      <Route path="/dashboard" element={<Navigate to="/payroll-dashboard" replace/>} />
      <Route path="/employees" element={<Protected><Layout><Employees/></Layout></Protected>} />
      <Route path="/employees/:id" element={<Protected><Layout><EmployeeDetail/></Layout></Protected>} />
      <Route path="/contracts" element={<Protected roles={['hr_manager','hr_payroll_user','hr_payroll_manager','admin']}><Layout><Contracts/></Layout></Protected>} />
      <Route path="/schedules" element={<Protected roles={['hr_manager','hr_payroll_user','hr_payroll_manager','admin']}><Layout><Schedules/></Layout></Protected>} />
      <Route path="/attendance" element={<Protected><Layout><Attendance/></Layout></Protected>} />
      <Route path="/timeoff" element={<Protected><Layout><TimeOff/></Layout></Protected>} />
      <Route path="/payroll" element={<Protected roles={['hr_payroll_user','hr_payroll_manager','admin']}><Layout><Payroll/></Layout></Protected>} />
      <Route path="/payroll/:id" element={<Protected roles={['hr_payroll_user','hr_payroll_manager','admin']}><Layout><PayrunDetail/></Layout></Protected>} />
      <Route path="/payslips" element={<Protected roles={['hr_payroll_user','hr_payroll_manager','admin']}><Layout><Payslips/></Layout></Protected>} />
      <Route path="/payslips/:id" element={<Protected roles={['hr_payroll_user','hr_payroll_manager','admin']}><Layout><PayslipDetail/></Layout></Protected>} />
      <Route path="/salary-structures" element={<Protected roles={['hr_payroll_user','hr_payroll_manager','admin']}><Layout><SalaryStructures/></Layout></Protected>} />
      <Route path="/salary-rules" element={<Protected roles={['hr_payroll_user','hr_payroll_manager','admin']}><Layout><SalaryRules/></Layout></Protected>} />
      <Route path="/" element={<Navigate to="/login" replace/>} />
      <Route path="*" element={<div style={{padding:40}}>Not found</div>} />
    </Routes>
  );
}

export default function App(){
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes/>
      </AuthProvider>
    </BrowserRouter>
  );
}
