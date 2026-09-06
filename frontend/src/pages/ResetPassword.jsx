import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';

export default function ResetPassword() {
  const [params] = useSearchParams(); const nav = useNavigate();
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [message, setMessage] = useState(''); const token = params.get('token');
  const submit = async (event) => { event.preventDefault(); if (password !== confirm) return setMessage('Passwords do not match'); try { const result = await api.resetPassword(token, password); setMessage(result.message); setTimeout(() => nav('/login'), 1600); } catch (error) { setMessage(error.message); } };
  return <div id="loginScreen"><div className="loginCard"><div className="loginRight" style={{ margin: 'auto', maxWidth: 480 }}><h2>Choose a new password</h2>{!token ? <p className="hint">This reset link is incomplete or invalid.</p> : <form onSubmit={submit}><div className="field"><label>New password</label><input required minLength="8" type="password" value={password} onChange={e => setPassword(e.target.value)} /></div><div className="field"><label>Confirm password</label><input required minLength="8" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} /></div><button className="btnPrimary">Reset password</button></form>}{message && <p className="hint">{message}</p>}<Link to="/login">Back to sign in</Link></div></div></div>;
}
