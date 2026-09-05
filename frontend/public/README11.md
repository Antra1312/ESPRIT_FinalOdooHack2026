# PeoplePay360 — HR & Payroll (Working Prototype)

A single-file, fully clickable demo of the **PeoplePay360: HR & Payroll** hackathon
brief — Employee → Contract → Attendance → Time Off → Salary Structure/Rules →
Payrun → Payslip → PDF → Dashboard, wired together with real (not hardcoded) logic.

**File to open:** `PeoplePay360.html` — double‑click it, or drag it into any
browser. No install, no server, no build step.

---

## 1. How to run it

1. Open `PeoplePay360.html` in Chrome, Edge, or Safari.
2. You'll land on the **HR Portal** sign‑in screen. Any email/password works —
   this is a demo, not a real auth system.
3. Pick a role chip (Employee, HR Manager, HR Payroll User, HR Payroll Manager,
   Admin) to sign in as a representative user for that role and see exactly
   what that role can and can't do. Or just click **Sign in as Admin** for
   full access.
4. Everything after that is live: forms actually save, buttons actually
   change state, and the dashboard actually recalculates from the data you
   create.

> ⚠️ **This build keeps all data in memory (a JS object in the page), not in a
> database.** Refreshing the page resets everything back to the seed data
> below. That's intentional for a hackathon demo — see §6 for how this maps
> onto a real backend.

---

## 2. What's implemented (and works end‑to‑end)

| Module | What you can actually do |
|---|---|
| **Login / Roles** | Sign in as any of the 5 roles from the brief. Navigation and every action button is gated by role in real time. |
| **Employees** | Kanban view (grouped by department) and List view. Search. Add/Edit. Employee detail page is the "central hub" with smart-button counts and tabs for Contracts / Attendance / Time Off. |
| **Contracts** | Full history per employee (old contracts are never deleted). Add/Edit. The **active** contract is computed automatically from start/end dates against "today" (5 Sep 2026 in this demo). |
| **Working Schedules** | Day-by-day start/end/break editor. **Weekly hours are calculated automatically** — try changing a day's times in the edit form and watch the total update live. |
| **Attendance** | Global list + per-employee list. Manual **correction** (recalculates status: Normal / Late / Missing Checkout / Corrected). |
| **Time Off** | Requests (submit, Approve/Reject), Allocations (balance tracking), Types (policy config). **Approving a request that requires an allocation actually deducts the days from that employee's balance** — it's not a static number. |
| **Salary Structures** | "Regular Salary" and "Sales Incentive Salary", each an ordered, editable list of Salary Rules (add/remove/reorder with ↑/↓). |
| **Salary Rules** | Fixed amount, Percentage-of-another-rule, or Formula (`{CODE}` syntax, e.g. `{GROSS}-{PF}-{TAX}`). This is a real interpreter — edit a rule and every payslip computed after that reflects the change. |
| **Payruns** | Two-step wizard exactly as specified: **Step 1** picks Salary Structure + Period only; **Step 2** lets you tick which eligible employees are included; the Payrun record is only created after Step 2. Processing screen supports **Compute → Validate → Mark Paid**, plus **Send Payslips**. |
| **Payslips** | Auto-computed from the rule sequence, using **the contract that was valid during the selected period** (not just "whatever is current"). Full Basic/Allowances/Deductions/Gross/Net breakdown. |
| **Warnings** | Computed for real at Validate time: missing bank details, missing employee info (PAN), no contract covering the period, duplicate payslip for the same period. They block nothing outright (this is a demo), but **Mark Paid asks for confirmation if warnings exist**, matching "surface before finalization." |
| **Payslip PDF** | "Print / Save PDF" renders a clean payslip layout and opens the browser print dialog — choose "Save as PDF" there. |
| **Dashboard** | KPIs, Salary Cost by Department, Monthly Net Salary Trend, warnings feed, payslip status breakdown — all filtered by Period/Department and computed from the live `DB` object, not fixed numbers. |
| **Users (Admin)** | A read-only reference table of the 5 roles and what each one can do. |

---

## 3. Roles, exactly as specified in the brief

| Role | Can do |
|---|---|
| **Employee** | View own profile, own attendance, own leave balance; submit a Time Off request. No payroll or HR-admin access. |
| **HR Manager** | Full CRUD on Employees, Contracts, Attendance, Schedules, Time Off (incl. approve/reject). **No** Payroll module. |
| **HR Payroll User** | Everything HR Manager can do, **plus** create/update Payruns and Payslips. Salary Structures/Rules are **view-only**. |
| **HR Payroll Manager** | Everything above, **plus** full CRUD on Salary Structures and Salary Rules. |
| **Admin** | Everything, plus the Users & Roles reference page. |

Try it: sign in as **HR Manager** and you'll notice the "Payroll" tab
disappears entirely. Sign in as **HR Payroll User** and open Salary Rules —
the Edit buttons are gone, replaced with "Read-only."

---

## 4. A guided 5-minute walkthrough (mirrors the brief's "two end-to-end scenarios")

**Scenario A — Employee to payslip**
1. Sign in as **HR Payroll Manager**.
2. Go to **Payroll → Payruns** → open **"September 2026 — Regular Salary"**
   (already in Draft status).
3. Click **Compute** — payslips are generated for every selected employee,
   each using the contract valid for September 2026.
4. Click **Validate** — two warnings appear: John Doe (missing bank details)
   and Karan Patel (missing PAN). Look at the exact numbers on Antra Gajjar's
   payslip — Basic ₹40,000 / HRA ₹8,000 / Travel ₹2,000 → Gross ₹50,000;
   PF ₹4,000 / Tax ₹2,000 → **Net ₹44,000** — matching the brief's own
   worked example.
5. Click **Send Payslips**, then **Mark Paid** (confirm past the warning
   prompt). Open any payslip and hit **Print / Save PDF**.

**Scenario B — Leave allocation to request**
1. Sign in as **HR Manager**.
2. Go to **Time Off → Requests** — Antra Gajjar has a **Pending** Annual
   Leave request (10–12 Sept, 3 days).
3. Check her balance first: open **Employees → Antra Gajjar → Time Off** tab
   — 15 days remaining out of 20.
4. Back in **Time Off → Requests**, click **Approve**. Return to her balance
   — it's now 12 remaining. The deduction is live, not scripted.

---

## 5. Seed data included

- **10 employees** across IT / HR / Finance / Sales, with managers, two
  working schedules (Standard 40h and Sales Flex 40h), bank/PAN details
  (two are deliberately incomplete, to demonstrate warnings).
- **Antra Gajjar's 3-contract history** (Junior Developer ₹30,000 → 2025
  Software Developer ₹45,000 → 2026 Software Developer ₹50,000) — the exact
  progression used as the illustration in the brief.
- **2 Salary Structures / 11 Salary Rules** (Regular Salary; Sales Incentive
  Salary with its own Incentive/Gross/Tax/Net rules).
- **3 Payruns**: July 2026 and August 2026 (already Paid, so the Dashboard
  trend has real history) and September 2026 (Draft, for the live walkthrough).
- **Time off**: 3 leave types, an allocation per employee per type, and a
  handful of requests in Pending / Approved / Rejected states.
- **Attendance**: a sample week including a Late and two Missing Checkout
  exceptions.

---

## 6. Design decisions & what a production build would add

This is a 24-hour hackathon prototype, so a few things are intentionally
simplified — flagged here for transparency rather than left implicit:

- **No backend / database.** Data lives in a single in-memory `DB` object in
  the page's JavaScript. In production this maps directly onto relational
  tables (`employees`, `contracts`, `schedules`, `attendance`,
  `time_off_types`, `allocations`, `time_off_requests`, `salary_structures`,
  `salary_rules`, `payruns`, `payslips`) with the same foreign keys already
  modeled here (e.g. `contract.employeeId`, `payslip.contractId`). A
  PostgreSQL/Neon schema is a very natural next step, since the relationships
  in this file are already 1:1 with what a normalized schema needs.
- **No real authentication.** Login accepts anything and just lets you pick a
  role for demo purposes. A real build would issue accounts per the brief's
  "accounts are created by an Admin" note.
- **PDF via browser print, not a PDF library.** "Print / Save PDF" opens the
  native print dialog on a formatted payslip view. A production build could
  swap in a server-side renderer (e.g. wkhtmltopdf, Puppeteer) without
  touching the payslip layout markup.
- **"Send Payslips" is simulated** (marks the payslip as emailed and time-
  stamps it) rather than sending real email — wiring an email provider is a
  drop-in addition once a backend exists.
- **Formulas use a small `{CODE}` interpreter** evaluated with `Function()`,
  which is fine for an HR admin configuring their own rules in a trusted
  internal tool, but a production build should use a safer expression
  parser (e.g. a restricted grammar) rather than raw `eval`-style execution.
- **"Today"** for contract-status and warning logic is fixed to **5 Sept
  2026** to keep the seed data deterministic for the demo.

---

## 7. Tech

Vanilla HTML/CSS/JavaScript, zero dependencies, zero build step — same
approach as the team's other prototypes (EduCare AI, EcoSphere). Fonts:
Sora (headings/nav) + Inter (body/data) via Google Fonts. Colour system is a
navy/teal enterprise palette chosen to read as payroll/finance software
rather than a marketing page.
