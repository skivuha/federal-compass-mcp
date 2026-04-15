export interface GradeDetail {
  grade: string;
  min: number;
  max: number;
  steps: number[];
}

export interface GlossaryEntry {
  title: string;
  description: string;
  gradeDetail?: GradeDetail;
  timeline?: string;
  related?: string[];
  details?: Record<string, string | number>;
}

// GS pay table 2026 — source: OPM Salary Table 2026-GS
// Incorporating the 1% General Schedule Increase, Effective January 2026
// https://www.opm.gov/policy-data-oversight/pay-leave/salaries-wages/salary-tables/pdf/2026/GS.pdf
const GS_PAY_TABLE: Record<string, { steps: number[]; min: number; max: number }> = {
  '1':  { steps: [22584, 23341, 24092, 24840, 25589, 26028, 26771, 27519, 27550, 28248], min: 22584, max: 28248 },
  '2':  { steps: [25393, 25997, 26839, 27550, 27858, 28677, 29496, 30315, 31134, 31953], min: 25393, max: 31953 },
  '3':  { steps: [27708, 28632, 29556, 30480, 31404, 32328, 33252, 34176, 35100, 36024], min: 27708, max: 36024 },
  '4':  { steps: [31103, 32140, 33177, 34214, 35251, 36288, 37325, 38362, 39399, 40436], min: 31103, max: 40436 },
  '5':  { steps: [34799, 35959, 37119, 38279, 39439, 40599, 41759, 42919, 44079, 45239], min: 34799, max: 45239 },
  '6':  { steps: [38791, 40084, 41377, 42670, 43963, 45256, 46549, 47842, 49135, 50428], min: 38791, max: 50428 },
  '7':  { steps: [43106, 44543, 45980, 47417, 48854, 50291, 51728, 53165, 54602, 56039], min: 43106, max: 56039 },
  '8':  { steps: [47738, 49329, 50920, 52511, 54102, 55693, 57284, 58875, 60466, 62057], min: 47738, max: 62057 },
  '9':  { steps: [52727, 54485, 56243, 58001, 59759, 61517, 63275, 65033, 66791, 68549], min: 52727, max: 68549 },
  '10': { steps: [58064, 59999, 61934, 63869, 65804, 67739, 69674, 71609, 73544, 75479], min: 58064, max: 75479 },
  '11': { steps: [63795, 65922, 68049, 70176, 72303, 74430, 76557, 78684, 80811, 82938], min: 63795, max: 82938 },
  '12': { steps: [76463, 79012, 81561, 84110, 86659, 89208, 91757, 94306, 96855, 99404], min: 76463, max: 99404 },
  '13': { steps: [90925, 93956, 96987, 100018, 103049, 106080, 109111, 112142, 115173, 118204], min: 90925, max: 118204 },
  '14': { steps: [107446, 111028, 114610, 118192, 121774, 125356, 128938, 132520, 136102, 139684], min: 107446, max: 139684 },
  '15': { steps: [126384, 130597, 134810, 139023, 143236, 147449, 151662, 155875, 160088, 164301], min: 126384, max: 164301 },
};

interface RawGlossaryEntry {
  title: string;
  description: string;
  timeline?: string;
  related?: string[];
  details?: Record<string, string | number>;
}

const GLOSSARY: Record<string, RawGlossaryEntry> = {
  GS: {
    title: 'General Schedule',
    description:
      'The General Schedule (GS) is the predominant pay scale for federal employees. It has 15 grades (GS-1 through GS-15), each with 10 steps. Steps represent periodic pay increases within a grade — Step 1 is entry, Step 10 is maximum. Step increases: Steps 1-3 every 1 year, Steps 4-6 every 2 years, Steps 7-10 every 3 years. Locality pay adjustments add 15-45% on top of base pay depending on location.',
    related: ['GG', 'SES', 'WG'],
  },
  SES: {
    title: 'Senior Executive Service',
    description:
      'The Senior Executive Service (SES) is the corps of executives selected for their leadership qualifications. SES positions are above GS-15 and serve as the link between political appointees and the federal workforce. SES members can be reassigned across agencies.',
    related: ['GS', 'ES'],
  },
  'TS/SCI': {
    title: 'Top Secret / Sensitive Compartmented Information',
    description:
      'The highest commonly referenced security clearance level. TS (Top Secret) grants access to information that could cause exceptionally grave damage to national security. SCI adds compartmented access to intelligence information. Requires a Single Scope Background Investigation (SSBI).',
    timeline: '6-18 months to obtain. Requires extensive background check including interviews with references, neighbors, and colleagues. Polygraph may be required for certain agencies (CIA, NSA).',
    related: ['Secret', 'Confidential', 'Public Trust'],
  },
  Secret: {
    title: 'Secret Security Clearance',
    description:
      'Mid-level security clearance. Grants access to information that could cause serious damage to national security if disclosed. Most common clearance for DoD contractors and many federal positions.',
    timeline: '2-6 months to obtain. Requires background investigation covering 10 years.',
    related: ['TS/SCI', 'Confidential', 'Public Trust'],
  },
  Confidential: {
    title: 'Confidential Security Clearance',
    description:
      'Lowest level of security clearance. Grants access to information that could cause damage to national security. Investigation covers 7 years of history.',
    timeline: '1-3 months to obtain.',
    related: ['Secret', 'TS/SCI'],
  },
  'Public Trust': {
    title: 'Public Trust Position',
    description:
      'Not a security clearance, but a background investigation for positions with access to sensitive information (financial data, medical records, PII). Common in agencies like SSA, IRS, VA. Does not grant access to classified information.',
    timeline: '2-8 weeks to complete.',
    related: ['Confidential', 'Secret'],
  },
  'Schedule A': {
    title: 'Schedule A Hiring Authority',
    description:
      'A hiring authority that allows agencies to hire people with disabilities without going through the competitive hiring process. Applicants need documentation of their disability from a licensed medical professional, vocational rehabilitation counselor, or disability agency. Extremely valuable path for qualifying individuals — bypasses USAJOBS competitive process.',
    related: ['Direct Hire Authority', 'Competitive Service', 'Excepted Service'],
  },
  'Direct Hire Authority': {
    title: 'Direct Hire Authority (DHA)',
    description:
      'Allows agencies to hire candidates directly without the competitive rating and ranking process when there is a critical hiring need or severe shortage of candidates. Common in IT, cybersecurity, and STEM fields. Significantly faster hiring — weeks instead of months.',
    related: ['Schedule A', 'Competitive Service'],
  },
  'Competitive Service': {
    title: 'Competitive Service',
    description:
      'The standard federal hiring process. Positions are filled through a competitive examination of applicants. Most federal jobs are in the competitive service. Requires announcement on USAJOBS, rating and ranking of applicants, and following merit system principles. Typically the slowest hiring path.',
    related: ['Excepted Service', 'Direct Hire Authority'],
  },
  'Excepted Service': {
    title: 'Excepted Service',
    description:
      'Positions not subject to the competitive hiring rules. Agencies can set their own qualification requirements and are not required to post on USAJOBS (though many do). Includes Schedule A, B, C, and D appointments. Intelligence agencies (CIA, NSA) are entirely excepted service.',
    related: ['Competitive Service', 'Schedule A'],
  },
  'Pathways Program': {
    title: 'Pathways Program',
    description:
      'Federal program offering internships and entry-level positions to current students and recent graduates. Three tracks: Internship Program (current students), Recent Graduates Program (within 2 years of graduation), Presidential Management Fellows (advanced degree holders). Great entry point for new graduates.',
    related: ['Competitive Service'],
  },
  GG: {
    title: 'GG Pay Plan',
    description:
      'Pay plan equivalent to the General Schedule (GS) used by certain defense and intelligence agencies (e.g., DIA, NGA). Same grade structure as GS (GG-1 through GG-15) with equivalent pay rates. If you see a GG position, treat the grade the same as GS.',
    related: ['GS'],
  },
};

export function lookupConcept(query: string): GlossaryEntry | undefined {
  const normalized = query.trim().toUpperCase();

  // Check for GS-N pattern (e.g. "GS-13")
  const gsMatch = normalized.match(/^GS[- ]?(\d{1,2})$/);
  if (gsMatch) {
    const grade = gsMatch[1];
    const payRange = GS_PAY_TABLE[grade];
    const gsEntry = GLOSSARY['GS'];
    if (gsEntry && payRange) {
      return {
        title: `${gsEntry.title} — Grade ${grade}`,
        description: gsEntry.description,
        gradeDetail: { grade, min: payRange.min, max: payRange.max, steps: payRange.steps },
        related: gsEntry.related,
      };
    }
  }

  // Direct key match
  const directMatch = Object.entries(GLOSSARY).find(
    ([key]) => key.toUpperCase() === normalized,
  );
  if (directMatch) {
    const [, entry] = directMatch;
    if (normalized === 'GS') {
      return {
        ...entry,
        details: {
          lowestGrade1Min: GS_PAY_TABLE['1'].min,
          highestGrade15Max: GS_PAY_TABLE['15'].max,
          totalGrades: 15,
          stepsPerGrade: 10,
        },
      };
    }
    return { ...entry };
  }

  // Partial match — search titles and descriptions
  const partialMatch = Object.entries(GLOSSARY).find(
    ([key, entry]) =>
      key.toUpperCase().includes(normalized) ||
      entry.title.toUpperCase().includes(normalized),
  );
  if (partialMatch) {
    return { ...partialMatch[1] };
  }

  return undefined;
}
