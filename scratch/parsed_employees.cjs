/**
 * Parsed employee data from MGM F JUNE 2026.pdf
 * 
 * Fields: Employee Name, Father/Husband Name, Emp Code, Basic Pay, HRent, Conv, Med Allow, 
 *         Gross Pay, NetPay, PF Pay, Date of Joining, Branch
 */

const employees = [
  // Ludhiana Branch
  { empCode: "00002", name: "Sunny Kumar",        fatherName: "Sant Ram",            basic: 50000, hra: 20000, conv: 10000, medAllow: 0,    grossPay: 81800,  netPay: 80000, pfPay: 1800, joiningDate: "2022-04-01", branch: "Ludhiana" },
  { empCode: "00003", name: "Vikram Choudhary",   fatherName: "Saroj Choudhary",     basic: 50000, hra: 20000, conv: 10000, medAllow: 0,    grossPay: 81800,  netPay: 80000, pfPay: 1800, joiningDate: "2022-04-01", branch: "Ludhiana" },
  { empCode: "00005", name: "Samarjit Singh",     fatherName: "Sukhwinder Singh",    basic: 50000, hra: 20000, conv: 10000, medAllow: 0,    grossPay: 81800,  netPay: 80000, pfPay: 1800, joiningDate: "2022-04-01", branch: "Ludhiana" },
  { empCode: "00009", name: "Kulwinder Singh",    fatherName: "Gurmeet Singh",       basic: 50000, hra: 20000, conv: 10000, medAllow: 0,    grossPay: 81800,  netPay: 80000, pfPay: 1800, joiningDate: "2022-11-01", branch: "Ludhiana" },
  { empCode: "00014", name: "Pooja Rani",         fatherName: "Harwinder Singh",     basic: 30000, hra: 7000,  conv: 3000,  medAllow: 10000,grossPay: 50000,  netPay: 50000, pfPay: 0,    joiningDate: "2022-11-01", branch: "Ludhiana" },
  { empCode: "00016", name: "Gagandeep Singh",    fatherName: "Kuldeep Singh",       basic: 50000, hra: 20000, conv: 10000, medAllow: 0,    grossPay: 80000,  netPay: 80000, pfPay: 0,    joiningDate: "2023-03-01", branch: "Ludhiana" },
  { empCode: "00018", name: "K.P Mohindra",       fatherName: "Dharm Paul Mohindra", basic: 170000,hra: 0,     conv: 0,     medAllow: 0,    grossPay: 200000, netPay: 200000,pfPay: 0,    joiningDate: "2023-04-01", branch: "Ludhiana" },
  { empCode: "00019", name: "Anchal Sood",        fatherName: "Harish Sood",         basic: 180000,hra: 20000, conv: 0,     medAllow: 0,    grossPay: 201800, netPay: 200000,pfPay: 1800, joiningDate: "2023-04-01", branch: "Ludhiana" },
  { empCode: "00020", name: "Ratul Mohindra",     fatherName: "K.P Mohindra",        basic: 135000,hra: 15000, conv: 0,     medAllow: 0,    grossPay: 151800, netPay: 150000,pfPay: 1800, joiningDate: "2023-04-01", branch: "Ludhiana" },
  { empCode: "00021", name: "Monika Sood",        fatherName: "Vinay Sood",          basic: 65000, hra: 20000, conv: 5000,  medAllow: 1800, grossPay: 101800, netPay: 91800, pfPay: 1800, joiningDate: "2023-04-01", branch: "Ludhiana" },
  { empCode: "00022", name: "Akriti Goyal Mohindra", fatherName: "Arun Goyal",      basic: 65000, hra: 20000, conv: 5000,  medAllow: 1800, grossPay: 101800, netPay: 91800, pfPay: 1800, joiningDate: "2023-04-01", branch: "Ludhiana" },
  { empCode: "00025", name: "Javed Mohd.",        fatherName: "Abbas",               basic: 50000, hra: 20000, conv: 10000, medAllow: 0,    grossPay: 80000,  netPay: 80000, pfPay: 0,    joiningDate: "2023-07-01", branch: "Ludhiana" },
  { empCode: "00026", name: "Sadik",              fatherName: "",                    basic: 50000, hra: 20000, conv: 10000, medAllow: 0,    grossPay: 80000,  netPay: 80000, pfPay: 0,    joiningDate: "2025-04-01", branch: "Ludhiana" },
  { empCode: "00027", name: "Manpreet",           fatherName: "",                    basic: 50000, hra: 20000, conv: 10000, medAllow: 0,    grossPay: 80000,  netPay: 80000, pfPay: 0,    joiningDate: "2025-04-01", branch: "Ludhiana" },
  { empCode: "00028", name: "Hardeep Singh",      fatherName: "",                    basic: 50000, hra: 20000, conv: 10000, medAllow: 0,    grossPay: 80000,  netPay: 80000, pfPay: 0,    joiningDate: "2025-04-01", branch: "Ludhiana" },
  { empCode: "00029", name: "Harwinder Singh",    fatherName: "",                    basic: 50000, hra: 0,     conv: 0,     medAllow: 0,    grossPay: 50000,  netPay: 50000, pfPay: 0,    joiningDate: "2025-04-01", branch: "Ludhiana" },
  { empCode: "00030", name: "Mani Kumar",         fatherName: "",                    basic: 35000, hra: 12000, conv: 3000,  medAllow: 0,    grossPay: 50000,  netPay: 50000, pfPay: 0,    joiningDate: "2025-04-01", branch: "Ludhiana" },
  { empCode: "00031", name: "Parminder Kaur",     fatherName: "",                    basic: 35000, hra: 12000, conv: 3000,  medAllow: 0,    grossPay: 50000,  netPay: 50000, pfPay: 0,    joiningDate: "2025-04-01", branch: "Ludhiana" },
  { empCode: "00035", name: "Sant Ram",           fatherName: "",                    basic: 40000, hra: 7000,  conv: 3000,  medAllow: 0,    grossPay: 50000,  netPay: 50000, pfPay: 0,    joiningDate: "2025-04-01", branch: "Ludhiana" },
  { empCode: "00036", name: "Gurmeet Singh",      fatherName: "",                    basic: 35000, hra: 10000, conv: 5000,  medAllow: 0,    grossPay: 50000,  netPay: 50000, pfPay: 0,    joiningDate: "2025-05-01", branch: "Ludhiana" },
  { empCode: "00045", name: "Navdeep Kaur",       fatherName: "",                    basic: 30000, hra: 0,     conv: 0,     medAllow: 0,    grossPay: 30000,  netPay: 30000, pfPay: 0,    joiningDate: "2025-11-01", branch: "Ludhiana" },
  { empCode: "00047", name: "Kashish",            fatherName: "",                    basic: 30000, hra: 0,     conv: 0,     medAllow: 0,    grossPay: 30000,  netPay: 30000, pfPay: 0,    joiningDate: "2025-11-01", branch: "Ludhiana" },
  { empCode: "00048", name: "Kalpana",            fatherName: "",                    basic: 50000, hra: 0,     conv: 0,     medAllow: 0,    grossPay: 30000,  netPay: 30000, pfPay: 0,    joiningDate: "2025-11-01", branch: "Ludhiana" },
  { empCode: "00049", name: "Charanjeet Kaur",    fatherName: "",                    basic: 30000, hra: 0,     conv: 0,     medAllow: 0,    grossPay: 30000,  netPay: 30000, pfPay: 0,    joiningDate: "2025-11-01", branch: "Ludhiana" },
  { empCode: "00050", name: "Gurpreet Kaur",      fatherName: "",                    basic: 60000, hra: 0,     conv: 0,     medAllow: 0,    grossPay: 30000,  netPay: 30000, pfPay: 0,    joiningDate: "2025-11-01", branch: "Ludhiana" },
  { empCode: "00052", name: "Kuldeep Kaur",       fatherName: "",                    basic: 50000, hra: 0,     conv: 0,     medAllow: 0,    grossPay: 50000,  netPay: 50000, pfPay: 0,    joiningDate: "2025-11-01", branch: "Ludhiana" },
  { empCode: "00053", name: "Bhavna",             fatherName: "",                    basic: 50000, hra: 0,     conv: 0,     medAllow: 0,    grossPay: 50000,  netPay: 50000, pfPay: 0,    joiningDate: "2025-11-01", branch: "Ludhiana" },
  { empCode: "00054", name: "Gurwinder Kaur",     fatherName: "",                    basic: 50000, hra: 0,     conv: 0,     medAllow: 0,    grossPay: 50000,  netPay: 50000, pfPay: 0,    joiningDate: "2026-01-01", branch: "Ludhiana" },
  { empCode: "00056", name: "Anubhav Goyal",      fatherName: "",                    basic: 75000, hra: 0,     conv: 0,     medAllow: 0,    grossPay: 75000,  netPay: 75000, pfPay: 0,    joiningDate: "2026-01-01", branch: "Ludhiana" },
  { empCode: "00057", name: "Pooja Bisht",        fatherName: "",                    basic: 60000, hra: 0,     conv: 0,     medAllow: 0,    grossPay: 30000,  netPay: 30000, pfPay: 0,    joiningDate: "2026-02-01", branch: "Ludhiana" },
  { empCode: "00059", name: "Sagar Bagga",        fatherName: "",                    basic: 80000, hra: 0,     conv: 0,     medAllow: 0,    grossPay: 80000,  netPay: 80000, pfPay: 0,    joiningDate: "2026-03-01", branch: "Ludhiana" },
  // Mumbai Branch
  { empCode: "00023", name: "Kiran Anand Thorat", fatherName: "Anand Thorat",        basic: 22000, hra: 0,     conv: 0,     medAllow: 0,    grossPay: 25314,  netPay: 25314, pfPay: 0,    joiningDate: "2023-04-01", branch: "Mumbai"   },
  { empCode: "00032", name: "Sushma",             fatherName: "",                    basic: 50000, hra: 20000, conv: 10000, medAllow: 0,    grossPay: 35742,  netPay: 35742, pfPay: 0,    joiningDate: "2025-04-01", branch: "Mumbai"   },
  { empCode: "00033", name: "Satya",              fatherName: "",                    basic: 30000, hra: 0,     conv: 0,     medAllow: 0,    grossPay: 30000,  netPay: 30000, pfPay: 0,    joiningDate: "2025-04-01", branch: "Mumbai"   },
  { empCode: "00034", name: "Amit Malik",         fatherName: "",                    basic: 45000, hra: 8000,  conv: 2000,  medAllow: 0,    grossPay: 55000,  netPay: 55000, pfPay: 0,    joiningDate: "2025-04-01", branch: "Mumbai"   },
];

module.exports = { employees };
