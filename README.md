# ESPRIT FinalOdooHack2026 - HR & Payroll Platform

## Problem Statement & Project Understanding

### 1) Project Overview
Goal: Build an HR and Payroll platform that becomes a **connected operational flow** beyond simple employee CRUD screens.

**Core Architecture:**
- **Employee Record** — Central hub of the system
- **Contracts & Working Schedules** — Provide payroll context
- **Attendance & Time Off** — Capture day-to-day HR activity
- **Salary Structures & Rules** — Define salary computation
- **Payruns** — Turn eligible employee records into validated payslips

**Key Business Scenarios:**
- Employee may have **multiple contracts over time**, but payroll must use only the contract applicable to the selected period
- Working hours come from an **assigned schedule**, not manual entry
- Attendance contains **exceptions** that may need review/correction
- Leave balances depend on **allocations and approved requests**
- Payroll must transform all related data into **understandable payslips** before payment

**Main Goal:** Integrated HR and payroll platform managing the full employee lifecycle — from master data and time tracking to payroll calculation and reporting.

**Key Outcomes:**
1. Unified HR Flow: Centralized employee records with seamless navigation to Contracts, Attendance, and Time Off
2. Contract Management: Maintain historical records while ensuring payroll uses only the active, period-specific contract
3. Operational Tracking: Flexible Working Schedules, attendance tracking (with exception handling), comprehensive Time Off (requests/allocations)
4. Payroll Processing: Two-step pay run workflow — select scope/period, then select employees. Generates payslips with clear breakdowns (Basic, Allowances, Deductions) and validation warnings
5. Reporting: Centralized Payroll Dashboard aggregating HR/Payroll data across Periods, Departments, and Employee types

---

### 2) Goals & Scope

**User Roles & Permissions:**

| Role | Permissions | Key Restrictions |
|------|-------------|------------------|
| **Employee** | View own details, attendance, leave balances; Create attendance entries and Time Off Requests | No payroll or HR administration access |
| **HR Manager** | Full CRUD on Employees, Attendance, Contracts, Working Schedules, Time Off; Approve/Refuse Time Off Requests | No access to payroll features |
| **HR Payroll User** | HR Manager permissions + CRUD on Payruns and Payslips; Read-only on Salary Structures and Rules | Cannot fully control payroll configurations |
| **HR Payroll Manager** | All HR Payroll User permissions + full CRUD on Payruns, Payslips, Salary Structures, and Salary Rules | — |
| **Admin** | Full access to all modules and models; User management, role assignment, permission updates | — |

**Role Hierarchy:** Employee → HR Manager → HR Payroll User → HR Payroll Manager → Admin

**Key Business Rules (must implement):**
- Period-based contract validation — payroll uses only contract applicable to selected period
- Leave balance consumption — allocations and approved requests automatically consume balances
- Salary rule sequencing — rules processed in specific order respecting dependencies
- Two-step payrun workflow — select scope/period first, then select employees
- Warning detection — missing bank details, duplicate payslips, incomplete employee data before finalization

**Data Relationships Priority:**
- Working hours come from **assigned schedules**, not manual entry
- Leave balances depend on **allocations and approved requests**
- Payroll transforms **all related data** (contracts, attendance, leave, salary rules) into understandable payslips
- Contracts have **historical records** but payroll selects period-specific active contracts

**Technical Requirements:**
- Role-based access controls across all modules
- Comprehensive data relationships (parent-child: employees ↔ contracts ↔ payruns ↔ payslips)
- Historical record tracking for contracts and payroll history
- Aggregated analytics from live system data (not static charts)
- End-to-end employee-to-payslip flow

---

### 3) User Roles (In Depth)

**Employee:**
- View own employee details, attendance records, and leave balances
- Create attendance entries and Time Off Requests
- **No** payroll or HR administration access

**HR Manager:**
- Full CRUD access to Employees, Attendance, Contracts, Working Schedules, and Time Off modules
- Approve or refuse Time Off Requests
- **No** access to payroll features

**HR Payroll User:**
- All HR Manager permissions + CRUD on Payruns and Payslips
- Read-only access to Salary Structures and Salary Rules

**HR Payroll Manager:**
- All HR Payroll User permissions + full CRUD on Payruns, Payslips, Salary Structures, and Salary Rules
- Full control over HR and payroll-related records and configurations

**Admin:**
- Full access to all modules and models across the platform
- User management, role assignment, permission updates, and complete system administration

---

### 4) Modules / Features Breakdown (In Depth)

#### A) HR Backend (Configuration & Master Data Area)

**A1) Employee Master Management**
- Support Kanban, List, and Form views for employee records
- Capture essential work details: department, manager, schedule, job position, and status on the employee form
- Provide quick list-view access and direct links from the employee form to filter and view related Contracts, Attendance, and Time Off records

**A2) Contract Management**
- Maintain historical contract records linked to employees to track changes over time
- List view must display key contract details like dates, wages, and status, clearly highlighting the active contract
- Contract forms should capture employment terms including duration, department, position, wage, and salary structure
- Ensure payroll processes only the contract applicable to the selected period, avoiding concurrent active contracts

**A3) Working Schedule Setup**
- Implement List and Form views for scheduling; list view should show key metrics like name, type, and weekly hours
- Form view defines the weekly pattern using Day, Start Time, End Time, and Break
- Calculate total weekly hours automatically from the defined schedule rather than entering them manually
- Assign working schedules to employees or contracts to standardize attendance and payroll expectations

**A4) Time Off Type & Allocation Setup**
- Time Off is accessible via the main navigation, housing Requests, Allocations, and configured Time Off Types
- Time Off Types define leave policies including units (days/hours), allocation requirements, approval workflows, and payroll integration
- Allocations manage employee balances, requiring approval before availability, and tracking detailed metrics like taken, remaining, and validity periods
- Approved leave requests automatically deduct from assigned allocations, ensuring balances are accurately consumed and transparently linked

**A5) Salary Structure Setup**
- Salary Structures act as containers for organized collections of Salary Rules, such as a "Regular Salary" structure
- Structures require List and Form views to display associated details like the number of rules, employees, and active status
- The form view manages included salary rules and their execution sequence
- Selected structures on a Payrun dictate the specific set of rules applied to calculate employee payslips

**A6) Salary Rule Setup**
- Salary Rules define how earnings and deductions are calculated, utilizing List and Form views to manage attributes like Name, Code, Category, and Sequence
- Categories allow for the clear distinction of salary components, including Basic, Allowances, Gross, Deductions, and Net salary
- Rules are processed in a specific sequence to ensure dependencies are respected, allowing complex totals to build upon earlier calculations
- Flexible computation methods — including fixed amounts, percentages, and formulas — drive the actual salary calculations visible on final payslips

**A7) Reporting & Dashboard Configuration**
- The Payroll Dashboard integrates data from HR and Payroll modules, displaying live metrics derived from actual system records
- Flexible filtering by Period and Department allows users to analyze salary costs, attendance, and leave patterns across specific timeframes or business units
- Employee Type filters enable focused analysis, restricting dashboard data to specific groups like full-time or contract staff

#### B) HR & Payroll Frontend (Operational Experience)

**B1) Main Navigation & Employee Views**
- Top navigation exposes Employees, Contracts, Attendance, Time Off, Payroll, and Reports
- Employees can be accessed via Kanban or List views, both leading to a unified Employee Form acting as the operational hub

**B2) Employee Form & Related Record Navigation**
- Employee Form displays identity, role, department, manager, schedule, and active status
- Smart-button actions display counts and open filtered views for related Contracts, Attendance, Time Off, and Allocations

**B3) Attendance List & Form**
- Attendance is accessible globally from the main menu or directly from an individual Employee Form
- List view displays Check In, Check Out, Worked Hours, and Status for quick review of entries and exceptions
- Attendance Form provides detailed records and supports manual corrections restricted to authorized users
- Attendance data remains available for reporting and Payroll Dashboard insights

**B4) Time Off Requests**
- Requests are accessed exclusively via Time Off → Requests in the top navigation
- Request List provides an overview of Employee, Type, Dates, Duration, and Status
- Request Form details the request and supports a simple approval or refusal workflow
- Approved requests automatically reduce balances for leave types requiring allocation

**B5) Payrun Creation Wizard**
- Clicking NEW launches a setup wizard instead of immediately creating a record
- Step 1 defines scope including Salary Structure, and Period
- Clicking Continue moves to employee selection without creating the Payrun
- Step 2 filters eligible staff for explicit user selection
- Create Payrun initializes the batch containing only selected employees and opens the processing view

**B6) Payrun Processing Screen**
- Payruns group generated Payslips for a specific payroll period
- Payrun Form provides processing actions: Compute, Validate, Mark Paid, and Send Payslips
- Displays run name, structure, period, status, and summary list of payslips
- Highlights warnings such as missing bank details or duplicate payslips prior to finalization
- Preserves finalized or paid payroll batches as historical records

**B7) Payslip & Salary Computation Screen**
- Payslips can be accessed via parent Payruns or from the dedicated Payslips list view
- Displays key identification attributes: Employee, Structure, Pay Run, Period, Status, and Worked Days
- Salary Computation section details individual rule breakdowns including Basic, Allowances, Deductions, Gross, and Net amounts
- Computation logic automatically uses the applicable period contract alongside the Payrun's assigned Salary Structure

**B8) Payslip PDF & Employee Delivery**
- Print Payslip action generates a printable PDF document for individual employees
- Parent Payrun includes a Send Payslips action for bulk email distribution

**B9) Payroll Dashboard**
- KPI cards display key metrics like Total Net Salary Paid, Payslips Generated, Average Salary, Approved Time Off, and Attendance Health
- Charts plot Salary Cost by Department and Monthly Net Salary Trends using historical data
- Operational alerts surface payroll statuses, missing required information, duplicate payslips, and contract attention items
- Attendance and Time Off overviews track presence, overtime, approved days, pending requests, and leave balances
- Attendance Overview can show Present, Late, Absent, Overtime, missing check-outs, manual edits, and attendance coverage
- Department breakdown combines headcount with total salary expenditure
- Aggregates live data across Employees, Contracts, Payroll, Attendance, and Time Off modules

---

### 5) Complete Flow (End-to-End)

**Full Operational Flow:**
- Attendance records capture daily presence and exceptions, allowing authorized users to verify and correct entries as needed
- Time Off management automates the lifecycle from defining leave types and allocating balances to processing and approving individual requests
- Payroll configuration involves defining Salary Structures and sequencing Salary Rules to dictate how earnings, deductions, and net salary are computed
- Payroll officers initiate a Payrun by defining the scope and period, then selecting specific employees before finalizing the batch creation
- The system computes individual Payslips based on the applicable contract, defined structure, and period context
- Officers review computed Payslip components and system-generated warnings to ensure accuracy before validating and marking the Payrun as paid
- Finalized Payruns are archived for history, with options to generate individual PDF Payslips and distribute them to employees via email
- The Payroll Dashboard aggregates real-time data across HR, attendance, and payroll modules, offering filtered insights for strategic decision-making
- Integrates core HR and Payroll operations into one cohesive, end-to-end business flow, covering everything from employee master data to final payslip distribution
- Prioritizes real-world business logic such as period-based contract handling, leave allocation, and ordered salary calculations over simple interface design
- Encourages industry-standard system architecture, including role-based permissions, parent-child data relationships, and comprehensive historical payroll tracking
- Allows teams to demonstrate technical versatility by choosing their preferred stack, ensuring the focus remains on robust data modeling and accurate payroll computation

**Why This Hackathon Problem Is Important:**
- Teams are free to select any backend language, framework, or database technology for their solution
- Implement essential business rules such as contract selection, schedule calculations, leave logic, and payroll computation directly in the application logic rather than using hardcoded values
- Ensure Salary Rules actively drive Payslip generation; configuration screens must be fully functional and integrated, not static mockups
- Surface potential payroll issues, such as duplicate entries or incomplete employee data, to users before finalization
- The Payroll Dashboard must reflect real-time, live data generated from HR and payroll operations instead of relying on static charts
- Include support for generating Payslip PDFs and facilitating bulk email distribution directly from the Payrun workflow
- Functional platform: Fully operational HR and payroll system populated with representative employee, contract, time, salary, and payroll data
- Live demonstration: Five-minute walkthrough showcasing two end-to-end scenarios, such as the full employee-to-payslip and leave allocation-to-request workflows
- Future roadmap: Brief summary of proposed enhancements or extensions the team would prioritize with additional development time

### 6) Technical Guidelines (Inferred)
- Robust data modeling with accurate, configurable business logic
- Support for period-based contract validation in payroll computation
- Leave allocation logic with balance consumption
- Salary rule sequencing and dependency respect
- Warning/error detection before payrun finalization
- Role-based permissions across all modules
- Historical tracking (contracts, payroll history)
- Live dashboard aggregations from actual records
- Configurable computation methods (fixed amounts, percentages, formulas)
- End-to-end employee-to-payslip flow

### 7) Deliverables
- **Functional platform** populated with representative employee, contract, time, salary, and payroll data
- **Five-minute walkthrough** showcasing two end-to-end scenarios:
  1. Full employee-to-payslip workflow
  2. Leave allocation-to-request workflow
- **Role-based permissions** properly configured and testable
- **Period-based contract selection** working correctly in payroll
- **Leave balance consumption** logic verified
- **Salary rules** computing correctly with proper sequencing
- **Dashboard** showing live aggregated data from actual records (not static/mock)
- **PDF generation** and bulk email distribution functional
- **Warning/error detection** before payrun finalization
- **Historical record tracking** maintained across all modules

### 8) Why This Problem Matters
- Moves industry from UI screens to functional integrated systems
- Emphasizes real business logic over surface-level design
- Requires live data interactions over static mockups
- Demands end-to-end workflows over isolated module demonstrations
- Validates role-based, permission-aware systems
- Focus on robust data modeling and accurate payroll computation

**Core Thesis:** This hackathon problem is important because it forces teams to build actual working software solving real business problems, not demo-friendly prototypes. The emphasis on accurate business logic, live data integration, end-to-end workflows, role-based systems, and configurable computation ensures winning solutions will be operationally viable HR & payroll platforms, not just code exercises with pretty interfaces.

**Winning Formula:** Focus on correct computation over visual polish, prioritize data modeling and relationships, implement real validation and warnings, build live querying dashboards, focus on end-to-end flows not isolated CRUD screens.