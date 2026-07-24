const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Create dummy data with custom fields completely different from standard employee table fields
const customRecords = [
  {
    "Agent ID Code": "AGT-8001",
    "Full Person Name": "Vikramaditya Sharma",
    "Work Email Handle": "vikram.sharma@mgmfinanciers.com",
    "Mobile Phone No": "+91 98111 22334",
    "Employee Level": "Senior Agent",
    "Operating Unit": "Microfinance & Credit",
    "Regional Hub": "Jaipur West Office",
    "Designation Title": "Lead Credit Officer",
    "Appointment Date": "2026-08-01",
    "Current Employment Phase": "Probation",
    "Gross Monthly Basic": 55000,
    "House Rent Subsidies": 22000,
    "Special Allowances": 14000,
    "EPF Deduction": 4100,
    "Salary Depository Bank": "Kotak Mahindra Bank",
    "Bank Account Hash": "881900223411",
    "IFSC Branch Code": "KKBK0000123",
    "Residential Location": "A-45, Vaishali Nagar, Jaipur, Rajasthan",
    "Emergency Nominee": "Pooja Sharma",
    "Nominee Kinship": "Spouse",
    "Nominee Phone": "+91 98111 99999",
    "Access Keyphrase": "MGM#Pass2026",
    "Aadhaar Number": "1234-5678-9012",
    "PAN Card Number": "ABCPS1234F",
    "PF UAN Number": "100900800700",
    "Blood Group Code": "O Positive",
    "Primary Expertise": "NBFC Credit Underwriting",
    "Previous Organisation": "Bajaj Finance Ltd",
    "Medical Insurance Card No": "MED-99887711",
    "Assigned Desk Floor": "Floor 3, Wing B"
  },
  {
    "Agent ID Code": "AGT-8002",
    "Full Person Name": "Ananya Roy",
    "Work Email Handle": "ananya.roy@mgmfinanciers.com",
    "Mobile Phone No": "+91 97222 33445",
    "Employee Level": "Agent",
    "Operating Unit": "Retail Asset Management",
    "Regional Hub": "Kolkata Central Desk",
    "Designation Title": "Risk Compliance Associate",
    "Appointment Date": "2026-08-05",
    "Current Employment Phase": "Active",
    "Gross Monthly Basic": 48000,
    "House Rent Subsidies": 19000,
    "Special Allowances": 11000,
    "EPF Deduction": 3500,
    "Salary Depository Bank": "Axis Bank",
    "Bank Account Hash": "91201004567890",
    "IFSC Branch Code": "UTIB0000567",
    "Residential Location": "Block B, Salt Lake City, Sector 2, Kolkata",
    "Emergency Nominee": "Debasis Roy",
    "Nominee Kinship": "Father",
    "Nominee Phone": "+91 97222 88888",
    "Access Keyphrase": "MGM#Pass2026",
    "Aadhaar Number": "9876-5432-1098",
    "PAN Card Number": "XYZPR9876K",
    "PF UAN Number": "100900800701",
    "Blood Group Code": "A Positive",
    "Primary Expertise": "KYC Compliance & Fraud Risk",
    "Previous Organisation": "Tata Capital",
    "Medical Insurance Card No": "MED-99887722",
    "Assigned Desk Floor": "Floor 2, Wing A"
  },
  {
    "Agent ID Code": "AGT-8003",
    "Full Person Name": "Rohan Deshmukh",
    "Work Email Handle": "rohan.deshmukh@mgmfinanciers.com",
    "Mobile Phone No": "+91 96333 44556",
    "Employee Level": "Team Lead",
    "Operating Unit": "Commercial Vehicle Loans",
    "Regional Hub": "Pune Technology Hub",
    "Designation Title": "Field Operations Specialist",
    "Appointment Date": "2026-08-10",
    "Current Employment Phase": "Active",
    "Gross Monthly Basic": 62000,
    "House Rent Subsidies": 25000,
    "Special Allowances": 16000,
    "EPF Deduction": 4800,
    "Salary Depository Bank": "ICICI Bank",
    "Bank Account Hash": "000401987654",
    "IFSC Branch Code": "ICIC0000004",
    "Residential Location": "Plot 12, Baner Road, Pune, Maharashtra",
    "Emergency Nominee": "Meenal Deshmukh",
    "Nominee Kinship": "Sister",
    "Nominee Phone": "+91 96333 77777",
    "Access Keyphrase": "MGM#Pass2026",
    "Aadhaar Number": "4567-8901-2345",
    "PAN Card Number": "LMNOP5432Q",
    "PF UAN Number": "100900800702",
    "Blood Group Code": "B Negative",
    "Primary Expertise": "Vehicle Loan Recovery & Field Audit",
    "Previous Organisation": "Mahindra Finance",
    "Medical Insurance Card No": "MED-99887733",
    "Assigned Desk Floor": "Floor 5, Executive Suite"
  }
];

// Generate XLSX
const worksheet = XLSX.utils.json_to_sheet(customRecords);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Custom Field Employees");

const xlsxPath = path.join(process.cwd(), "custom_fields_employees.xlsx");
XLSX.writeFile(workbook, xlsxPath);
console.log("Created XLSX file:", xlsxPath);

// Generate CSV
const csvContent = XLSX.utils.sheet_to_csv(worksheet);
const csvPath = path.join(process.cwd(), "custom_fields_employees.csv");
fs.writeFileSync(csvPath, csvContent, "utf-8");
console.log("Created CSV file:", csvPath);
