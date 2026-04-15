import { describe, it, expect } from 'vitest';
import { findLocalityArea, LOCALITY_AREAS } from '../../src/data/locality-rates.js';

describe('locality-rates', () => {
  it('has Rest of US as fallback', () => {
    const rus = LOCALITY_AREAS.find((area) => area.name === 'Rest of US');
    expect(rus).toBeDefined();
    expect(rus!.percentage).toBe(17.06);
  });

  it('finds area by exact substring match', () => {
    const result = findLocalityArea('Raleigh');
    expect(result.name).toContain('Raleigh');
    expect(result.percentage).toBe(22.24);
  });

  it('finds area by alias dc', () => {
    const result = findLocalityArea('dc');
    expect(result.name).toContain('Washington');
    expect(result.percentage).toBe(33.94);
  });

  it('finds area by alias NYC', () => {
    const result = findLocalityArea('nyc');
    expect(result.name).toContain('New York');
  });

  it('finds area by alias SF', () => {
    const result = findLocalityArea('sf');
    expect(result.name).toContain('San Jose-San Francisco');
    expect(result.percentage).toBe(46.34);
  });

  it('is case insensitive', () => {
    const result = findLocalityArea('CHICAGO');
    expect(result.name).toContain('Chicago');
  });

  it('falls back to Rest of US for unknown location', () => {
    const result = findLocalityArea('Middle of Nowhere');
    expect(result.name).toBe('Rest of US');
    expect(result.fallback).toBe(true);
  });

  it('returns Rest of US without fallback flag for empty string', () => {
    const result = findLocalityArea('');
    expect(result.name).toBe('Rest of US');
    expect(result.fallback).toBeUndefined();
  });

  it('matches by token overlap', () => {
    const result = findLocalityArea('Oakland Jose');
    expect(result.name).toContain('San Jose-San Francisco-Oakland');
  });
});
