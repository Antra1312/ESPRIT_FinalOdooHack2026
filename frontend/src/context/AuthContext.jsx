import { createContext, useContext, useEffect, useState } from 'react';
import { loadBootstrap } from '../api';

const ROLES = {
  employee:{label:'Employee',color:'#4C7EA8'},
  hr_manager:{label:'HR Manager',color:'#0EA5A0'},
  hr_payroll_user:{label:'HR Payroll User',color:'#C77D14'},
  hr_payroll_manager:{label:'HR Payroll Manager',color:'#7C5CBF'},
  admin:{label:'Admin',color:'#C1373B'},
};
const ROLE_USER = { employee:'E1', hr_manager:'E9', hr_payroll_user:'E8', hr_payroll_manager:'E2', admin:'E2' };

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export { ROLES };

export function AuthProvider({children}){
  const [user,setUser]=useState(()=>{ try { return JSON.parse(localStorage.getItem('peoplepay360_session')); } catch { return null; } });
  const [dataReady,setDataReady]=useState(false);
  const [dataError,setDataError]=useState('');
  const [roleDemoUsers,setRoleDemoUsers]=useState(ROLE_USER);
  useEffect(() => {
    loadBootstrap()
      .then((data) => {
        const backendRoleUsers = Object.fromEntries(
          Object.entries(data.roleDemoUsers || {}).filter(([, employeeId]) => employeeId)
        );
        setRoleDemoUsers({ ...ROLE_USER, ...backendRoleUsers });
        setDataReady(true);
      })
      .catch((error) => {
        setDataError(error.message);
        setDataReady(true);
      });
  }, []);
  const login=(session)=>{
    const role=session.user.role.toLowerCase();
    const user={role,empId:session.user.employeeId,name:session.user.email,email:session.user.email,token:session.token};
    localStorage.setItem('peoplepay360_session',JSON.stringify(user));
    setUser(user);
  };
  const logout=()=>{ localStorage.removeItem('peoplepay360_session'); setUser(null); };
  const can=(...roles)=> user && roles.includes(user.role);
  if (!dataReady) return <div style={{ padding: 40 }}>Loading data…</div>;
  if (dataError) return <div style={{ padding: 40 }}>Unable to load backend data: {dataError}</div>;
  return <AuthContext.Provider value={{user,login,logout,can,ROLES,dataReady,dataError,roleDemoUsers}}>{children}</AuthContext.Provider>;
}
