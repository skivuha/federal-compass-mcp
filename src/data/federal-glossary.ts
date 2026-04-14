export interface GradeDetail {
  grade: string;
  min: number;
  max: number;
}

export interface GlossaryEntry {
  title: string;
  description: string;
  gradeDetail?: GradeDetail;
  timeline?: string;
  related?: string[];
  details?: Record<string, string | number>;
}

// GS pay table 2026 — source: OPM General Schedule pay tables
// Using Step 1 (min) and Step 10 (max) for base pay
// TODO: Update with actual 2026 OPM data at implementation time
const GS_PAY_TABLE: Record<string, { min: number; max: number }> = {
  '1': { min: 21986, max: 27487 },
  '2': { min: 24722, max: 31177 },
  '3': { min: 26974, max: 35065 },
  '4': { min: 30280, max: 39361 },
  '5': { min: 33878, max: 44042 },
  '6': { min: 37774, max: 49107 },
  '7': { min: 41925, max: 54504 },
  '8': { min: 46340, max: 60243 },
  '9': { min: 51054, max: 66370 },
  '10': { min: 56233, max: 73101 },
  '11': { min: 61727, max: 80244 },
  '12': { min: 73969, max: 96161 },
  '13': { min: 87971, max: 114358 },
  '14': { min: 103945, max: 135125 },
  '15': { min: 122290, max: 156755 },
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
        gradeDetail: { grade, min: payRange.min, max: payRange.max },
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
