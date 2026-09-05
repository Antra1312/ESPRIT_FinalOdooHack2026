function escapePdfText(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildPayslipPdf(payslip) {
  const employeeName = `${payslip.employee.firstName} ${payslip.employee.lastName}`;
  const lines = [
    'PeoplePay360 Payslip',
    `Employee: ${employeeName} (${payslip.employee.employeeCode})`,
    `Period: ${payslip.periodStart.toISOString().slice(0, 10)} to ${payslip.periodEnd.toISOString().slice(0, 10)}`,
    `Gross: ${payslip.currency} ${Number(payslip.grossAmount).toFixed(2)}`,
    `Deductions: ${payslip.currency} ${Number(payslip.deductionAmount).toFixed(2)}`,
    `Net: ${payslip.currency} ${Number(payslip.netAmount).toFixed(2)}`,
    '',
    ...payslip.lines.map((line) => `${line.ruleCode} ${line.ruleName}: ${Number(line.amount).toFixed(2)}`),
  ];
  const stream = `BT /F1 11 Tf 50 780 Td ${lines.map((line, index) => `${index ? '0 -16 Td ' : ''}(${escapePdfText(line)}) Tj`).join(' ')} ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf, 'ascii');
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'ascii');
}

module.exports = { buildPayslipPdf };
