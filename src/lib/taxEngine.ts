/**
 * SnailHRA — India Income Tax Engine
 * FY 2025-26 / AY 2026-27
 *
 * Covers:
 *  - New Tax Regime (default): 7 slabs, std deduction ₹75,000, 87A rebate ≤ ₹12L
 *  - Old Tax Regime: 3 slabs, std deduction ₹50,000, 87A rebate ≤ ₹5L
 *  - HRA Exemption (Old Regime only)
 *  - LTA Exemption (Old Regime only)
 *  - Chapter VI-A: 80C, 80CCD(1B), 80D, 80E, 80G, 80EEA
 *  - 80CCD(2): Employer NPS — both regimes
 *  - Professional Tax deduction — both regimes
 *  - Surcharge: 10% / 15% / 25% / 37%
 *  - Health & Education Cess: 4%
 *  - Section 87A Rebate
 */

export interface TaxComputationInput {
  annualBasic: number;
  annualHRA: number;
  annualLTA: number;
  annualSpecialAllowance: number;
  annualTelephone?: number;
  annualFuel?: number;
  annualProfDev?: number;
  annualPFEmployee?: number;
  regime: "new" | "old";
  monthlyRentPaid?: number;
  cityType?: "metro" | "non-metro";
  section80C?: number;
  section80CCD1B?: number;
  section80D?: number;
  section80E?: number;
  section80G?: number;
  section80EEA?: number;
  employerNPS?: number;
  professionalTax?: number;
  manualMonthlyTDS?: number;
  tdsLocked?: boolean;
}

export interface SlabBreakdown {
  slab: string;
  income: number;
  rate: number;
  tax: number;
}

export interface TaxComputationResult {
  regime: "new" | "old";
  annualGrossIncome: number;
  standardDeduction: number;
  hraExemption: number;
  ltaExemption: number;
  professionalTaxDeduction: number;
  employerNPSDeduction: number;
  section80C: number;
  section80CCD1B: number;
  section80D: number;
  section80E: number;
  section80G: number;
  section80EEA: number;
  totalChapterVIA: number;
  netTaxableIncome: number;
  slabwiseTax: SlabBreakdown[];
  baseTax: number;
  surcharge: number;
  cess: number;
  rebate87A: number;
  netAnnualTax: number;
  netMonthlyTDS: number;
  alternateRegimeTax: number;
  alternateRegimeMonthlyTDS: number;
  betterRegime: "new" | "old";
  savingsVsAlternate: number;
}

function calcSurcharge(taxableIncome: number, baseTax: number): number {
  if (taxableIncome <= 5000000) return 0;
  if (taxableIncome <= 10000000) return Math.round(baseTax * 0.10);
  if (taxableIncome <= 20000000) return Math.round(baseTax * 0.15);
  if (taxableIncome <= 50000000) return Math.round(baseTax * 0.25);
  return Math.round(baseTax * 0.37);
}

function calcNewRegimeTax(taxableIncome: number): { slabs: SlabBreakdown[]; baseTax: number } {
  const brackets = [400000, 400000, 400000, 400000, 400000, 400000, Infinity];
  const rates    = [0,      0.05,   0.10,   0.15,   0.20,   0.25,   0.30];
  const starts   = [0,      400000, 800000, 1200000,1600000,2000000,2400000];
  const labels   = [
    "₹0 – ₹4,00,000",
    "₹4,00,001 – ₹8,00,000",
    "₹8,00,001 – ₹12,00,000",
    "₹12,00,001 – ₹16,00,000",
    "₹16,00,001 – ₹20,00,000",
    "₹20,00,001 – ₹24,00,000",
    "Above ₹24,00,000",
  ];
  let baseTax = 0;
  const slabs: SlabBreakdown[] = [];
  for (let i = 0; i < labels.length; i++) {
    if (taxableIncome <= starts[i]) break;
    const income = brackets[i] === Infinity
      ? taxableIncome - starts[i]
      : Math.min(taxableIncome - starts[i], brackets[i]);
    const tax = Math.round(income * rates[i]);
    slabs.push({ slab: labels[i], income, rate: rates[i] * 100, tax });
    baseTax += tax;
  }
  return { slabs, baseTax };
}

function calcOldRegimeTax(taxableIncome: number): { slabs: SlabBreakdown[]; baseTax: number } {
  const brackets = [250000, 250000, 500000, Infinity];
  const rates    = [0,      0.05,   0.20,   0.30];
  const starts   = [0,      250000, 500000, 1000000];
  const labels   = [
    "₹0 – ₹2,50,000",
    "₹2,50,001 – ₹5,00,000",
    "₹5,00,001 – ₹10,00,000",
    "Above ₹10,00,000",
  ];
  let baseTax = 0;
  const slabs: SlabBreakdown[] = [];
  for (let i = 0; i < labels.length; i++) {
    if (taxableIncome <= starts[i]) break;
    const income = brackets[i] === Infinity
      ? taxableIncome - starts[i]
      : Math.min(taxableIncome - starts[i], brackets[i]);
    const tax = Math.round(income * rates[i]);
    slabs.push({ slab: labels[i], income, rate: rates[i] * 100, tax });
    baseTax += tax;
  }
  return { slabs, baseTax };
}

function calcHRAExemption(
  annualBasic: number,
  annualHRA: number,
  monthlyRentPaid: number,
  cityType: "metro" | "non-metro"
): number {
  if (monthlyRentPaid <= 0) return 0;
  const annualRent = monthlyRentPaid * 12;
  const rentMinusBasic = Math.max(0, annualRent - 0.10 * annualBasic);
  const basicPercent = cityType === "metro" ? 0.50 * annualBasic : 0.40 * annualBasic;
  return Math.max(0, Math.round(Math.min(annualHRA, basicPercent, rentMinusBasic)));
}

let _computingAlt = false;

export function computeTDS(params: TaxComputationInput): TaxComputationResult {
  if (params.tdsLocked && params.manualMonthlyTDS !== undefined) {
    return buildLockedResult(params);
  }

  const {
    annualBasic, annualHRA, annualLTA, annualSpecialAllowance,
    annualTelephone = 0, annualFuel = 0, annualProfDev = 0,
    annualPFEmployee = 0, regime,
    monthlyRentPaid = 0, cityType = "non-metro",
    section80C = 0, section80CCD1B = 0, section80D = 0,
    section80E = 0, section80G = 0, section80EEA = 0,
    employerNPS = 0, professionalTax = 0,
  } = params;

  const annualGrossIncome = annualBasic + annualHRA + annualLTA +
    annualSpecialAllowance + annualTelephone + annualFuel + annualProfDev;

  const standardDeduction = regime === "new" ? 75000 : 50000;
  const hraExemption = regime === "old"
    ? calcHRAExemption(annualBasic, annualHRA, monthlyRentPaid, cityType)
    : 0;
  const ltaExemption = regime === "old" ? annualLTA : 0;
  const professionalTaxDeduction = Math.min(professionalTax, 2500);
  const maxEmployerNPS = Math.round(annualBasic * 0.10);
  const employerNPSDeduction = Math.min(employerNPS, maxEmployerNPS);

  let c80C = 0, c80CCD1B = 0, c80D = 0, c80E = 0, c80G = 0, c80EEA = 0;
  if (regime === "old") {
    c80C     = Math.min(section80C + annualPFEmployee, 150000);
    c80CCD1B = Math.min(section80CCD1B, 50000);
    c80D     = Math.min(section80D, 25000);
    c80E     = section80E;
    c80G     = section80G;
    c80EEA   = Math.min(section80EEA, 150000);
  }
  const totalChapterVIA = c80C + c80CCD1B + c80D + c80E + c80G + c80EEA;

  const grossAfterExemptions = Math.max(0,
    annualGrossIncome - standardDeduction - hraExemption - ltaExemption
    - professionalTaxDeduction - employerNPSDeduction
  );
  const netTaxableIncome = Math.max(0, grossAfterExemptions - totalChapterVIA);

  const { slabs, baseTax } = regime === "new"
    ? calcNewRegimeTax(netTaxableIncome)
    : calcOldRegimeTax(netTaxableIncome);

  const surcharge = calcSurcharge(netTaxableIncome, baseTax);
  const cess = Math.round((baseTax + surcharge) * 0.04);

  let rebate87A = 0;
  if (regime === "new" && netTaxableIncome <= 1200000) {
    rebate87A = baseTax + surcharge + cess;
  } else if (regime === "old" && netTaxableIncome <= 500000) {
    rebate87A = Math.min(baseTax, 12500);
  }

  const netAnnualTax = Math.max(0, baseTax + surcharge + cess - rebate87A);
  const netMonthlyTDS = Math.round(netAnnualTax / 12);

  // Alternate regime comparison
  let alternateRegimeTax = 0;
  let alternateRegimeMonthlyTDS = 0;
  if (!_computingAlt) {
    _computingAlt = true;
    try {
      const alt = computeTDS({ ...params, regime: regime === "new" ? "old" : "new", tdsLocked: false });
      alternateRegimeTax = alt.netAnnualTax;
      alternateRegimeMonthlyTDS = alt.netMonthlyTDS;
    } finally {
      _computingAlt = false;
    }
  }

  const betterRegime: "new" | "old" = alternateRegimeTax < netAnnualTax
    ? (regime === "new" ? "old" : "new")
    : regime;
  const savingsVsAlternate = Math.abs(netAnnualTax - alternateRegimeTax);

  return {
    regime, annualGrossIncome, standardDeduction, hraExemption, ltaExemption,
    professionalTaxDeduction, employerNPSDeduction,
    section80C: c80C, section80CCD1B: c80CCD1B, section80D: c80D,
    section80E: c80E, section80G: c80G, section80EEA: c80EEA,
    totalChapterVIA, netTaxableIncome, slabwiseTax: slabs,
    baseTax, surcharge, cess, rebate87A,
    netAnnualTax, netMonthlyTDS,
    alternateRegimeTax, alternateRegimeMonthlyTDS,
    betterRegime, savingsVsAlternate,
  };
}

function buildLockedResult(params: TaxComputationInput): TaxComputationResult {
  const monthly = params.manualMonthlyTDS ?? 0;
  const annual = monthly * 12;
  const gross = params.annualBasic + params.annualHRA + params.annualLTA +
    params.annualSpecialAllowance + (params.annualTelephone ?? 0) +
    (params.annualFuel ?? 0) + (params.annualProfDev ?? 0);
  return {
    regime: params.regime, annualGrossIncome: gross,
    standardDeduction: 0, hraExemption: 0, ltaExemption: 0,
    professionalTaxDeduction: 0, employerNPSDeduction: 0,
    section80C: 0, section80CCD1B: 0, section80D: 0,
    section80E: 0, section80G: 0, section80EEA: 0, totalChapterVIA: 0,
    netTaxableIncome: gross, slabwiseTax: [],
    baseTax: annual, surcharge: 0, cess: 0, rebate87A: 0,
    netAnnualTax: annual, netMonthlyTDS: monthly,
    alternateRegimeTax: annual, alternateRegimeMonthlyTDS: monthly,
    betterRegime: params.regime, savingsVsAlternate: 0,
  };
}

/** Quick helper used in API routes / server.ts */
export function computeMonthlyTDSFromEmployee(
  salary: {
    basic: number; hra: number; lta?: number; allowances: number;
    telephone?: number; fuel?: number; professionalDev?: number;
    pfDeduction?: number; tdsOptIn?: boolean; tdsMode?: string; tdsDeduction?: number;
    taxProfile?: Partial<TaxComputationInput>;
  },
  configTaxType: string,
  configTaxValue: number
): number {
  if (salary.tdsOptIn === false) return 0;
  if (salary.tdsMode === "custom" && typeof salary.tdsDeduction === "number" && salary.tdsDeduction > 0) {
    return salary.tdsDeduction;
  }
  if (configTaxType === "slab") {
    const profile = salary.taxProfile ?? {};
    const input: TaxComputationInput = {
      annualBasic: salary.basic * 12,
      annualHRA: salary.hra * 12,
      annualLTA: (salary.lta ?? 0) * 12,
      annualSpecialAllowance: salary.allowances * 12,
      annualTelephone: (salary.telephone ?? 0) * 12,
      annualFuel: (salary.fuel ?? 0) * 12,
      annualProfDev: (salary.professionalDev ?? 0) * 12,
      annualPFEmployee: (salary.pfDeduction ?? 0) * 12,
      regime: (profile as TaxComputationInput).regime ?? "new",
      monthlyRentPaid: (profile as TaxComputationInput).monthlyRentPaid,
      cityType: (profile as TaxComputationInput).cityType,
      section80C: (profile as TaxComputationInput).section80C,
      section80CCD1B: (profile as TaxComputationInput).section80CCD1B,
      section80D: (profile as TaxComputationInput).section80D,
      section80E: (profile as TaxComputationInput).section80E,
      section80G: (profile as TaxComputationInput).section80G,
      section80EEA: (profile as TaxComputationInput).section80EEA,
      employerNPS: (profile as TaxComputationInput).employerNPS,
      professionalTax: (profile as TaxComputationInput).professionalTax,
      manualMonthlyTDS: (profile as TaxComputationInput).manualMonthlyTDS,
      tdsLocked: (profile as TaxComputationInput).tdsLocked,
    };
    return computeTDS(input).netMonthlyTDS;
  }
  const gross = salary.basic + salary.hra + salary.allowances +
    (salary.telephone ?? 0) + (salary.fuel ?? 0) +
    (salary.professionalDev ?? 0) + (salary.lta ?? 0);
  if (configTaxType === "fixed") return configTaxValue;
  return Math.round(gross * (configTaxValue / 100));
}
