import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { DB, fmtDate, isContractActive, uid } from '../data/mockData';
import { useAuth } from '../context/AuthContext';

export default function Contracts() {
  const [tick, setTick] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const filterEmp = searchParams.get('employee');
  const { can } = useAuth();
  const isHROrAdmin = can('hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin');

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Overlap resolution state
  const [overlapWarning, setOverlapWarning] = useState(null);

  const positions = [
    'Software Developer', 'Senior Developer', 'Team Lead', 'Engineering Manager',
    'QA Engineer', 'DevOps Engineer', 'HR Executive', 'HR Manager', 'Recruiter',
    'Financial Analyst', 'Sales Executive', 'Sales Manager', 'Intern',
    'Product Manager', 'UX Designer', 'Business Analyst'
  ];

  const defaultForm = {
    employeeId: DB.employees[0]?.id || '',
    position: '',
    dept: 'IT',
    wage: 50000,
    structureId: 'st_regular',
    startDate: '2026-09-01',
    endDate: ''
  };

  const [form, setForm] = useState(defaultForm);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      ...defaultForm,
      employeeId: filterEmp || DB.employees[0]?.id || ''
    });
    setOverlapWarning(null);
    setShowModal(true);
  };

  const openEditModal = (contract) => {
    setEditingId(contract.id);
    setForm({
      employeeId: contract.employeeId,
      position: contract.position,
      dept: contract.dept,
      wage: contract.wage,
      structureId: contract.structureId,
      startDate: contract.startDate,
      endDate: contract.endDate || ''
    });
    setOverlapWarning(null);
    setShowModal(true);
  };

  // Check for date overlaps among contracts of the same employee
  const checkOverlaps = (empId, startStr, endStr, excludeId) => {
    const s1 = new Date(startStr);
    const e1 = endStr ? new Date(endStr) : new Date('9999-12-31');

    return DB.contracts.filter(c => {
      if (c.employeeId !== empId) return false;
      if (excludeId && c.id === excludeId) return false;
      const s2 = new Date(c.startDate);
      const e2 = c.endDate ? new Date(c.endDate) : new Date('9999-12-31');
      return s1 <= e2 && e1 >= s2;
    });
  };

  const handleSave = () => {
    if (!form.position) return alert('Position is required.');
    if (!form.startDate) return alert('Start date is required.');
    if (Number(form.wage) <= 0) return alert('Wage must be greater than 0.');
    if (form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
      return alert('End date cannot be earlier than start date.');
    }

    // Check for period overlaps (A2 specification requirement)
    const conflicts = checkOverlaps(form.employeeId, form.startDate, form.endDate, editingId);
    if (conflicts.length > 0) {
      setOverlapWarning(conflicts);
      return;
    }

    commitContract();
  };

  const commitContract = (autoCloseConflictId = null) => {
    if (autoCloseConflictId) {
      // Automatically end the prior contract on the day before the new contract starts
      const conflict = DB.contracts.find(c => c.id === autoCloseConflictId);
      if (conflict) {
        const s = new Date(form.startDate);
        s.setDate(s.getDate() - 1);
        conflict.endDate = s.toISOString().slice(0, 10);
      }
    }

    if (editingId) {
      const idx = DB.contracts.findIndex(c => c.id === editingId);
      if (idx !== -1) {
        DB.contracts[idx] = {
          ...DB.contracts[idx],
          employeeId: form.employeeId,
          position: form.position,
          dept: form.dept,
          wage: Number(form.wage),
          structureId: form.structureId,
          startDate: form.startDate,
          endDate: form.endDate || null
        };
      }
    } else {
      DB.contracts.push({
        id: uid('C'),
        employeeId: form.employeeId,
        position: form.position,
        dept: form.dept,
        wage: Number(form.wage),
        structureId: form.structureId,
        startDate: form.startDate,
        endDate: form.endDate || null
      });
    }

    setShowModal(false);
    setOverlapWarning(null);
    setTick(x => x + 1);
  };

  const handleEndContract = (c) => {
    const emp = DB.employees.find(e => e.id === c.employeeId);
    if (window.confirm(`End contract for ${emp?.name || 'employee'} (${c.position}) as of today (2026-09-05)?`)) {
      c.endDate = '2026-09-05';
      setTick(x => x + 1);
    }
  };

  // Filtered dataset
  const filtered = DB.contracts.filter(c => {
    if (filterEmp && c.employeeId !== filterEmp) return false;
    if (deptFilter !== 'All' && c.dept !== deptFilter) return false;
    const active = isContractActive(c);
    if (statusFilter === 'Active' && !active) return false;
    if (statusFilter === 'Ended' && active) return false;

    if (searchTerm) {
      const emp = DB.employees.find(e => e.id === c.employeeId);
      const q = searchTerm.toLowerCase();
      const matchName = emp?.name.toLowerCase().includes(q);
      const matchPos = c.position.toLowerCase().includes(q);
      const matchDept = c.dept.toLowerCase().includes(q);
      if (!matchName && !matchPos && !matchDept) return false;
    }
    return true;
  }).sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

  const filterEmpRecord = filterEmp ? DB.employees.find(e => e.id === filterEmp) : null;

  // KPI calculations
  const totalContracts = DB.contracts.length;
  const activeContracts = DB.contracts.filter(isContractActive).length;
  const endedContracts = totalContracts - activeContracts;
  const totalActiveWage = DB.contracts
    .filter(isContractActive)
    .reduce((sum, c) => sum + c.wage, 0);

  return (
    <div>
      {/* Header */}
      <div className="pageHead">
        <div>
          <h1>Contracts {filterEmpRecord ? `— ${filterEmpRecord.name}` : ''}</h1>
          <div className="desc">
            Historical records preserved — payroll uses only the contract applicable to the selected period, avoiding concurrent active contracts. (A2 Spec)
            {filterEmp && (
              <button
                className="btn small"
                style={{ marginLeft: 12 }}
                onClick={() => setSearchParams({})}
              >
                ✕ Clear employee filter
              </button>
            )}
          </div>
        </div>
        {isHROrAdmin && (
          <button className="btn solid" onClick={openCreateModal}>
            + New Contract
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="kpiGrid" style={{ marginBottom: 18 }}>
        <div className="kpi">
          <div className="lbl">Total Contracts</div>
          <div className="val">{totalContracts}</div>
          <div className="sub">All historical & active</div>
        </div>
        <div className="kpi">
          <div className="lbl">Active Contracts</div>
          <div className="val" style={{ color: 'var(--success)' }}>{activeContracts}</div>
          <div className="sub">Currently in effect</div>
        </div>
        <div className="kpi">
          <div className="lbl">Historical / Ended</div>
          <div className="val" style={{ color: 'var(--ink-dim)' }}>{endedContracts}</div>
          <div className="sub">Past records preserved</div>
        </div>
        <div className="kpi">
          <div className="lbl">Active Monthly Payroll</div>
          <div className="val">₹{totalActiveWage.toLocaleString()}</div>
          <div className="sub">Sum of active contracts</div>
        </div>
        <div className="kpi">
          <div className="lbl">Period Overlap Check</div>
          <div className="val" style={{ color: 'var(--accent-dark)', fontSize: 18 }}>Enforced ✅</div>
          <div className="sub">Zero concurrent active runs</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="filterBar">
        <div className="searchBox">
          <input
            placeholder="Search employee or position…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="All">All Departments</option>
          <option value="IT">IT</option>
          <option value="HR">HR</option>
          <option value="Finance">Finance</option>
          <option value="Sales">Sales</option>
          <option value="Operations">Operations</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="All">All Statuses</option>
          <option value="Active">Active Only</option>
          <option value="Ended">Ended Only</option>
        </select>
      </div>

      {/* Contracts Table */}
      <div className="card">
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Position &amp; Department</th>
                <th>Monthly Wage (CTC)</th>
                <th>Salary Structure</th>
                <th>Contract Period</th>
                <th>Status</th>
                {isHROrAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map(c => {
                  const emp = DB.employees.find(e => e.id === c.employeeId);
                  const active = isContractActive(c);
                  const structure = DB.structures.find(s => s.id === c.structureId);

                  return (
                    <tr
                      key={c.id}
                      style={active ? { background: '#F0FBFA' } : {}}
                    >
                      <td>
                        <Link
                          to={`/employees/${emp?.id}`}
                          style={{ fontWeight: 600, color: 'var(--primary)' }}
                        >
                          {emp?.name || c.employeeId}
                        </Link>
                        <div className="hint">{emp?.email}</div>
                      </td>
                      <td>
                        <b>{c.position}</b>
                        <div className="hint">{c.dept}</div>
                      </td>
                      <td>
                        <b>₹{c.wage.toLocaleString()}</b>
                        <div className="hint">per month</div>
                      </td>
                      <td>
                        <span className="pill blue">{structure?.name || c.structureId}</span>
                      </td>
                      <td>
                        {fmtDate(c.startDate)} — {c.endDate ? fmtDate(c.endDate) : <span style={{ color: 'var(--success)', fontWeight: 600 }}>Ongoing</span>}
                      </td>
                      <td>
                        <span className={`pill ${active ? 'green' : 'gray'}`}>
                          {active ? 'Active' : 'Ended'}
                        </span>
                      </td>
                      {isHROrAdmin && (
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            className="btn small"
                            style={{ marginRight: 6 }}
                            onClick={() => openEditModal(c)}
                          >
                            Edit
                          </button>
                          {active && (
                            <button
                              className="btn small"
                              style={{ color: 'var(--danger)', borderColor: '#F2C9CB' }}
                              onClick={() => handleEndContract(c)}
                              title="Set contract end date to today"
                            >
                              End Contract
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="emptyState">
                    No contracts found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contract Create / Edit Modal */}
      {showModal && (
        <div
          className="modalOverlay"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="modal" style={{ maxWidth: 540 }}>
            <div className="modalHead">
              <h3>{editingId ? 'Edit Contract' : 'New Contract'}</h3>
              <button className="modalClose" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <div className="modalBody">
              {/* Overlap Warning Banner if conflicts detected */}
              {overlapWarning && (
                <div
                  style={{
                    background: 'var(--warning-bg)',
                    border: '1px solid var(--warning)',
                    borderRadius: 8,
                    padding: '12px 14px',
                    marginBottom: 16,
                    fontSize: 13
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    ⚠️ Period Overlap Detected!
                  </div>
                  <div>
                    This employee already has overlapping contract(s):
                    <ul style={{ margin: '6px 0 10px 20px', padding: 0 }}>
                      {overlapWarning.map(conf => (
                        <li key={conf.id}>
                          <b>{conf.position}</b> ({fmtDate(conf.startDate)} – {conf.endDate ? fmtDate(conf.endDate) : 'Ongoing'})
                        </li>
                      ))}
                    </ul>
                    <i>Per A2 specification: Concurrent active contracts are prohibited.</i>
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button
                      className="btn small solid"
                      style={{ background: 'var(--warning)', borderColor: 'var(--warning)', color: '#fff' }}
                      onClick={() => commitContract(overlapWarning[0]?.id)}
                    >
                      ⚡ Auto-close prior contract &amp; save
                    </button>
                    <button
                      className="btn small"
                      onClick={() => setOverlapWarning(null)}
                    >
                      Adjust dates
                    </button>
                  </div>
                </div>
              )}

              <div className="formGrid">
                <div className="field full">
                  <label>Employee</label>
                  <select
                    value={form.employeeId}
                    disabled={!!editingId}
                    onChange={e => setForm({ ...form, employeeId: e.target.value })}
                  >
                    {DB.employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} — {emp.dept} ({emp.position})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Position</label>
                  <select
                    value={form.position}
                    onChange={e => setForm({ ...form, position: e.target.value })}
                  >
                    <option value="">— Select position</option>
                    {positions.map(p => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Department</label>
                  <select
                    value={form.dept}
                    onChange={e => setForm({ ...form, dept: e.target.value })}
                  >
                    <option>IT</option>
                    <option>HR</option>
                    <option>Finance</option>
                    <option>Sales</option>
                    <option>Operations</option>
                    <option>Marketing</option>
                    <option>Engineering</option>
                    <option>Support</option>
                    <option>Admin</option>
                  </select>
                </div>

                <div className="field">
                  <label>Monthly Wage (CTC ₹)</label>
                  <input
                    type="number"
                    min="1"
                    step="1000"
                    placeholder="e.g. 50000"
                    value={form.wage}
                    onChange={e => setForm({ ...form, wage: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label>Salary Structure</label>
                  <select
                    value={form.structureId}
                    onChange={e => setForm({ ...form, structureId: e.target.value })}
                  >
                    {DB.structures.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => {
                      setForm({ ...form, startDate: e.target.value });
                      setOverlapWarning(null);
                    }}
                  />
                </div>

                <div className="field">
                  <label>End Date (blank for ongoing)</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={e => {
                      setForm({ ...form, endDate: e.target.value });
                      setOverlapWarning(null);
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="modalFoot">
              <button className="btn" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn solid" onClick={handleSave}>
                {editingId ? 'Save Changes' : 'Create Contract'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
