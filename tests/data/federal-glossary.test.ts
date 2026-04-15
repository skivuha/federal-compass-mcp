import { describe, it, expect } from 'vitest';
import { lookupConcept } from '../../src/data/federal-glossary.js';

describe('federal-glossary', () => {
  it('finds concept by exact key', () => {
    const result = lookupConcept('GS');
    expect(result).toBeDefined();
    expect(result!.title).toBe('General Schedule');
  });

  it('finds GS grade by "GS-13" query with 2026 OPM data', () => {
    const result = lookupConcept('GS-13');
    expect(result).toBeDefined();
    expect(result!.title).toContain('General Schedule');
    expect(result!.gradeDetail).toBeDefined();
    expect(result!.gradeDetail!.grade).toBe('13');
    expect(result!.gradeDetail!.min).toBe(90925);
    expect(result!.gradeDetail!.max).toBe(118204);
    expect(result!.gradeDetail!.steps).toHaveLength(10);
    expect(result!.gradeDetail!.steps[0]).toBe(90925);
  });

  it('finds security clearance by keyword', () => {
    const result = lookupConcept('TS/SCI');
    expect(result).toBeDefined();
    expect(result!.title).toContain('Top Secret');
  });

  it('returns undefined for unknown concept', () => {
    const result = lookupConcept('xyzzy');
    expect(result).toBeUndefined();
  });
});
