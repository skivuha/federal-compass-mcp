import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs/promises';
import { parseKsaRequirements } from '../../src/tools/ksa.js';

vi.mock('node:fs/promises');
vi.mock('../../src/api/usajobs-client.js', () => ({
  searchJobs: vi.fn(),
}));

function mockJobItem(overrides: Record<string, any> = {}) {
  return {
    MatchedObjectId: overrides.id ?? '12345',
    MatchedObjectDescriptor: {
      PositionTitle: overrides.title ?? 'Software Developer',
      OrganizationName: 'SSA',
      DepartmentName: 'SSA',
      PositionLocationDisplay: 'Remote',
      PositionRemuneration: [
        { MinimumRange: '100000', MaximumRange: '150000', RateIntervalCode: 'PA' },
      ],
      ApplicationCloseDate: '2026-06-01',
      PositionURI: '',
      ApplyURI: [''],
      JobGrade: [{ Code: 'GS' }],
      QualificationSummary: overrides.qualifications ?? 'Knowledge of React and Node.js. Ability to lead development teams. Specialized experience equivalent to GS-12.',
      UserArea: {
        Details: {
          LowGrade: '13',
          HighGrade: '14',
          JobSummary: '',
          MajorDuties: overrides.duties ?? ['Skill in designing RESTful APIs.', 'Experience with cloud platforms.'],
          HiringPath: ['public'],
          TeleworkEligible: true,
          RemoteIndicator: true,
          SecurityClearance: 'Not Required',
        },
      },
    },
  };
}

describe('parseKsaRequirements', () => {
  it('extracts knowledge requirements', () => {
    const results = parseKsaRequirements(
      'Knowledge of modern web frameworks such as React and Angular.',
      'qualification_summary',
    );
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('knowledge');
    expect(results[0].text).toContain('Knowledge of modern web frameworks');
    expect(results[0].source).toBe('qualification_summary');
  });

  it('extracts skill requirements', () => {
    const results = parseKsaRequirements(
      'Skill in developing RESTful APIs and microservices.',
      'qualification_summary',
    );
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('skill');
  });

  it('extracts ability requirements', () => {
    const results = parseKsaRequirements(
      'Ability to communicate technical concepts to non-technical stakeholders.',
      'qualification_summary',
    );
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('ability');
  });

  it('extracts experience requirements', () => {
    const results = parseKsaRequirements(
      'Experience with cloud computing platforms (AWS, Azure, GCP). Specialized experience equivalent to the GS-12 level.',
      'qualification_summary',
    );
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.type === 'experience')).toBe(true);
  });

  it('extracts education requirements', () => {
    const results = parseKsaRequirements(
      "Bachelor's degree in Computer Science or related field. Master's degree preferred.",
      'qualification_summary',
    );
    expect(results.some((r) => r.type === 'education')).toBe(true);
  });

  it('extracts certification requirements', () => {
    const results = parseKsaRequirements(
      'Must possess current CISSP or Security+ certification.',
      'qualification_summary',
    );
    expect(results.some((r) => r.type === 'certification')).toBe(true);
  });

  it('extracts must possess / must demonstrate patterns', () => {
    const results = parseKsaRequirements(
      'Must demonstrate ability to lead teams. Must possess strong analytical skills.',
      'qualification_summary',
    );
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it('handles multiple requirements separated by semicolons', () => {
    const results = parseKsaRequirements(
      'Knowledge of Java; Skill in database design; Ability to work independently.',
      'qualification_summary',
    );
    expect(results.length).toBe(3);
  });

  it('returns empty array for text with no KSA patterns', () => {
    const results = parseKsaRequirements(
      'This is a general description with no specific requirements.',
      'qualification_summary',
    );
    expect(results).toHaveLength(0);
  });

  it('returns empty array for empty text', () => {
    const results = parseKsaRequirements('', 'qualification_summary');
    expect(results).toHaveLength(0);
  });

  it('sets source correctly', () => {
    const results = parseKsaRequirements(
      'Knowledge of Python programming.',
      'major_duties',
    );
    expect(results[0].source).toBe('major_duties');
  });
});

describe('handleExtractKsa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('extracts requirements from job posting with CV matching', async () => {
    const { searchJobs } = await import('../../src/api/usajobs-client.js');
    const { handleExtractKsa } = await import('../../src/tools/ksa.js');

    vi.mocked(searchJobs).mockResolvedValueOnce({
      SearchResultCount: 1,
      SearchResultCountAll: 1,
      SearchResultItems: [mockJobItem()],
    });

    const stored = {
      content: 'Senior Developer with React, Node.js, and cloud experience. Led multiple teams.',
      savedAt: '2026-04-15T00:00:00.000Z',
      format: 'txt',
    };
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(stored));

    const client = {} as any;
    const result = await handleExtractKsa(client, { job_id: '12345' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.job_title).toBe('Software Developer');
    expect(parsed.requirements.length).toBeGreaterThan(0);
    expect(parsed.cv_available).toBe(true);
    expect(parsed.requirements.some((r: any) => r.matched === true)).toBe(true);
    expect(parsed.summary.total).toBeGreaterThan(0);
    expect(parsed.summary.matched).toBeDefined();
    expect(parsed.raw_qualification_summary).toBeDefined();
  });

  it('extracts requirements without CV', async () => {
    const { searchJobs } = await import('../../src/api/usajobs-client.js');
    const { handleExtractKsa } = await import('../../src/tools/ksa.js');

    vi.mocked(searchJobs).mockResolvedValueOnce({
      SearchResultCount: 1,
      SearchResultCountAll: 1,
      SearchResultItems: [mockJobItem()],
    });

    vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT'));

    const client = {} as any;
    const result = await handleExtractKsa(client, { job_id: '12345' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.cv_available).toBe(false);
    expect(parsed.requirements.every((r: any) => r.matched === null)).toBe(true);
  });

  it('handles empty qualifications and duties', async () => {
    const { searchJobs } = await import('../../src/api/usajobs-client.js');
    const { handleExtractKsa } = await import('../../src/tools/ksa.js');

    vi.mocked(searchJobs).mockResolvedValueOnce({
      SearchResultCount: 1,
      SearchResultCountAll: 1,
      SearchResultItems: [mockJobItem({ qualifications: '', duties: [] })],
    });

    vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT'));

    const client = {} as any;
    const result = await handleExtractKsa(client, { job_id: '12345' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.requirements).toHaveLength(0);
    expect(parsed.raw_qualification_summary).toBe('');
  });

  it('returns error when job not found', async () => {
    const { searchJobs } = await import('../../src/api/usajobs-client.js');
    const { handleExtractKsa } = await import('../../src/tools/ksa.js');

    vi.mocked(searchJobs).mockResolvedValueOnce({
      SearchResultCount: 0,
      SearchResultCountAll: 0,
      SearchResultItems: [],
    });

    const client = {} as any;
    const result = await handleExtractKsa(client, { job_id: '99999' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Job not found');
  });

  it('returns error when API fails', async () => {
    const { searchJobs } = await import('../../src/api/usajobs-client.js');
    const { handleExtractKsa } = await import('../../src/tools/ksa.js');

    vi.mocked(searchJobs).mockRejectedValueOnce(new Error('Network error'));

    const client = {} as any;
    const result = await handleExtractKsa(client, { job_id: '12345' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unable to search');
  });
});
