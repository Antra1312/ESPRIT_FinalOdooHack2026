import { createContext, useContext, useState } from 'react';

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
  const [user,setUser]=useState(null);
  const login=(role)=>{
    const empId=ROLE_USER[role];
    setUser({role, empId, name: role});
  };
  const logout=()=>setUser(null);
  const can=(...roles)=> user && roles.includes(user.role);
  return <AuthContext.Provider value={{user,login,logout,can,ROLES}}>{children}</AuthContext.Provider>;
}
