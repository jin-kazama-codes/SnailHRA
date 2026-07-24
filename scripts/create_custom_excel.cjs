const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Fresh distinct dummy records matching standard employee fields
const cleanEmployeeRecords = [
  {
    "Full Name": "Vikramaditya Rao",
    "Email": "vikramaditya.rao@mgmfinanciers.com",
    "Phone": "+91 98111 22334",
    "Role": "employee",
    "Department": "Loans",
    "Branch": "Mumbai Branch",
    "Designation": "Senior Loan Officer",
    "Joining Date": "2026-08-01",
    "Status": "Active",
    "Basic Salary": 58000,
    "HRA": 23200,
    "Allowances": 14000,
    "PF Deduction": 4200,
    "Bank Name": "Kotak Mahindra Bank",
    "Account Number": "881900223411",
    "IFSC Code": "KKBK0000123",
    "Address": "A-45, Vaishali Nagar, Mumbai, Maharashtra",
    "Emergency Contact Name": "Pooja Rao",
    "Emergency Contact Relation": "Spouse",
    "Emergency Contact Phone": "+91 98111 99999",
    "Password": "MGM@2026",
    "Bio": "Senior Credit & Loan Evaluation Specialist."
  },
  {
    "Full Name": "Neha Saxena",
    "Email": "neha.saxena@mgmfinanciers.com",
    "Phone": "+91 97222 33445",
    "Role": "employee",
    "Department": "Risk",
    "Branch": "Noida HQ",
    "Designation": "Risk Analyst",
    "Joining Date": "2026-08-05",
    "Status": "Active",
    "Basic Salary": 49000,
    "HRA": 19600,
    "Allowances": 11000,
    "PF Deduction": 3500,
    "Bank Name": "Axis Bank",
    "Account Number": "91201004567890",
    "IFSC Code": "UTIB0000567",
    "Address": "Block B, Sector 62, Noida, UP",
    "Emergency Contact Name": "Rohan Saxena",
    "Emergency Contact Relation": "Brother",
    "Emergency Contact Phone": "+91 97222 88888",
    "Password": "MGM@2026",
    "Bio": "Fraud Risk & Portfolio Compliance Officer."
  },
  {
    "Full Name": "Tarun Deshmukh",
    "Email": "tarun.deshmukh@mgmfinanciers.com",
    "Phone": "+91 96333 44556",
    "Role": "employee",
    "Department": "Operations",
    "Branch": "Pune Digital Office",
    "Designation": "Collections Specialist",
    "Joining Date": "2026-08-10",
    "Status": "Active",
    "Basic Salary": 62000,
    "HRA": 24800,
    "Allowances": 15000,
    "PF Deduction": 4800,
    "Bank Name": "ICICI Bank",
    "Account Number": "000401987654",
    "IFSC Code": "ICIC0000004",
    "Address": "Plot 12, Baner Road, Pune, Maharashtra",
    "Emergency Contact Name": "Meenal Deshmukh",
    "Emergency Contact Relation": "Spouse",
    "Emergency Contact Phone": "+91 96333 77777",
    "Password": "MGM@2026",
    "Bio": "Field Operations & Collections Management Lead."
  }
];

// Generate XLSX
const worksheet = XLSX.utils.json_to_sheet(cleanEmployeeRecords);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Employee Import Template");

const xlsxPath = path.join(process.cwd(), "custom_fields_employees.xlsx");
XLSX.writeFile(workbook, xlsxPath);
console.log("Updated XLSX with fresh distinct names:", xlsxPath);

// Generate CSV
const csvContent = XLSX.utils.sheet_to_csv(worksheet);
const csvPath = path.join(process.cwd(), "custom_fields_employees.csv");
fs.writeFileSync(csvPath, csvContent, "utf-8");
console.log("Updated CSV with fresh distinct names:", csvPath);
