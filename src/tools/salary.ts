import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { GS_STEPS } from '../data/federal-glossary.js';
import { findLocalityArea, EFFECTIVE_YEAR } from '../data/locality-rates.js';

interface CalculateSalaryParams {
  grade: string;
  step?: number;
  location?: string;
}

function normalizeGrade(grade: string): string {
  return grade.replace(/^gs[- ]?/i, '').trim();
}

function calculateAdjustedPay(basePay: number, localityPercentage: number): number {
  return Math.round(basePay * (1 + localityPercentage / 100));
}

export function handleCalculateSalary(params: CalculateSalaryParams): CallToolResult {
  const grade = normalizeGrade(params.grade);

  // Reject grade ranges
  if (grade.includes('-') || grade.includes(':')) {
    return {
      content: [
        {
          type: 'text',
          text: 'Please specify a single grade. Use search_jobs for grade ranges.',
        },
      ],
      isError: true,
    };
  }

  const steps = GS_STEPS[grade];
  if (!steps) {
    return {
      content: [
        {
          type: 'text',
          text: `Only GS grades 1-15 are supported. Got: "${params.grade}".`,
        },
      ],
      isError: true,
    };
  }

  const localityMatch = findLocalityArea(params.location ?? '');
  const { name: localityArea, percentage: localityPercentage, fallback } = localityMatch;

  const fallbackNote = fallback && params.location
    ? `Location '${params.location}' not found. Using Rest of US rate (${localityPercentage}%).`
    : undefined;

  const baseNote = `Base pay + ${localityPercentage}% locality adjustment`;
  const note = fallbackNote ?? baseNote;

  if (params.step !== undefined) {
    const stepIndex = params.step - 1;
    const basePay = steps[stepIndex];

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              grade,
              step: params.step,
              base_pay: basePay,
              locality_area: localityArea,
              locality_percentage: localityPercentage,
              adjusted_pay: calculateAdjustedPay(basePay, localityPercentage),
              effective_year: EFFECTIVE_YEAR,
              note,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  // All steps
  const allSteps = steps.map((basePay, index) => ({
    step: index + 1,
    base_pay: basePay,
    adjusted_pay: calculateAdjustedPay(basePay, localityPercentage),
  }));

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            grade,
            locality_area: localityArea,
            locality_percentage: localityPercentage,
            effective_year: EFFECTIVE_YEAR,
            min_adjusted: allSteps[0].adjusted_pay,
            max_adjusted: allSteps[allSteps.length - 1].adjusted_pay,
            steps: allSteps,
            note,
          },
          null,
          2,
        ),
      },
    ],
  };
}
