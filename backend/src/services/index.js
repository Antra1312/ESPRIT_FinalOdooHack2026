const employeeService = require('./employeeService');
const departmentService = require('./departmentService');
const jobPositionService = require('./jobPositionService');
const workingScheduleService = require('./workingScheduleService');
const contractService = require('./contractService');
const attendanceService = require('./attendanceService');
const { timeOffTypeService, timeOffAllocationService, timeOffRequestService } = require('./timeOffService');
const { salaryStructureService, salaryRuleService, salaryStructureRuleService } = require('./salaryService');
const { payrunService, payslipService, payrollWarningService } = require('./payrollService');

module.exports = {
  employeeService,
  departmentService,
  jobPositionService,
  workingScheduleService,
  contractService,
  attendanceService,
  timeOffTypeService,
  timeOffAllocationService,
  timeOffRequestService,
  salaryStructureService,
  salaryRuleService,
  salaryStructureRuleService,
  payrunService,
  payslipService,
  payrollWarningService,
};