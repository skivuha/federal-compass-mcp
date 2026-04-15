import { describe, it, expect } from 'vitest';
import { handleCalculateSalary } from '../../src/tools/salary.js';

describe('handleCalculateSalary', () => {
  it('calculates salary for specific grade, step, and location', () => {
    const result = handleCalculateSalary({ grade: '13', step: 1, location: 'Raleigh' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.grade).toBe('13');
    expect(parsed.step).toBe(1);
    expect(parsed.base_pay).toBe(90925);
    expect(parsed.locality_area).toContain('Raleigh');
    expect(parsed.locality_percentage).toBe(22.24);
    expect(parsed.adjusted_pay).toBe(Math.round(90925 * 1.2224));
    expect(parsed.effective_year).toBe(2026);
  });

  it('returns all 10 steps when step not specified', () => {
    const result = handleCalculateSalary({ grade: '13', location: 'DC' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.steps).toHaveLength(10);
    expect(parsed.min_adjusted).toBeDefined();
    expect(parsed.max_adjusted).toBeDefined();
    expect(parsed.min_adjusted).toBe(parsed.steps[0].adjusted_pay);
    expect(parsed.max_adjusted).toBe(parsed.steps[9].adjusted_pay);
  });

  it('normalizes GS-13 to 13', () => {
    const result = handleCalculateSalary({ grade: 'GS-13', step: 1 });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.grade).toBe('13');
    expect(parsed.base_pay).toBe(90925);
  });

  it('uses Rest of US when no location specified', () => {
    const result = handleCalculateSalary({ grade: '13', step: 1 });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.locality_area).toBe('Rest of US');
    expect(parsed.locality_percentage).toBe(17.06);
  });

  it('shows fallback message for unknown location', () => {
    const result = handleCalculateSalary({ grade: '13', step: 1, location: 'Middle of Nowhere' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.locality_area).toBe('Rest of US');
    expect(parsed.note).toContain('not found');
  });

  it('returns error for invalid grade', () => {
    const result = handleCalculateSalary({ grade: '16' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Only GS grades 1-15');
  });

  it('returns error for grade range', () => {
    const result = handleCalculateSalary({ grade: '13-14' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('single grade');
  });

  it('rounds adjusted pay to nearest dollar', () => {
    const result = handleCalculateSalary({ grade: '1', step: 1, location: 'Raleigh' });
    const parsed = JSON.parse(result.content[0].text);

    expect(Number.isInteger(parsed.adjusted_pay)).toBe(true);
  });
});
