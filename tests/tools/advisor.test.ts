import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs/promises';
import { JOB_LOOKUP_PAGE_SIZE } from '../../src/tools/search.js';

vi.mock('node:fs/promises');
vi.mock('../../src/api/usajobs-client.js', () => ({
  searchJobs: vi.fn(),
}));
vi.mock('../../src/cache/codelist-cache.js', () => ({
  getCodelist: vi.fn(),
  resolveCode: vi.fn(),
}));

// Helper to create mock job item
function mockJobItem(overrides: Record<string, any> = {}) {
  return {
    MatchedObjectId: overrides.id ?? '12345',
    MatchedObjectDescriptor: {
      PositionTitle: overrides.title ?? 'Software Developer',
      OrganizationName: overrides.agency ?? 'SSA',
      DepartmentName: 'SSA',
      PositionLocationDisplay: overrides.location ?? 'Remote',
      PositionRemuneration: [
        { MinimumRange: '100000', MaximumRange: '150000', RateIntervalCode: 'PA' },
      ],
      ApplicationCloseDate: '2026-06-01',
      PositionURI: '',
      ApplyURI: [''],
      JobGrade: [{ Code: 'GS' }],
      QualificationSummary: overrides.qualifications ?? 'Must have 5 years experience',
      UserArea: {
        Details: {
          LowGrade: '13',
          HighGrade: '14',
          JobSummary: '',
          MajorDuties: overrides.duties ?? ['Build web apps', 'Lead team'],
          HiringPath: ['public'],
          TeleworkEligible: true,
          RemoteIndicator: true,
          SecurityClearance: 'Not Required',
        },
      },
    },
  };
}

describe('advisor tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('handleExplainConcept', () => {
    it('returns glossary entry for known concept', async () => {
      const { handleExplainConcept } = await import('../../src/tools/advisor.js');
      const { getCodelist } = await import('../../src/cache/codelist-cache.js');
      vi.mocked(getCodelist).mockResolvedValue([]);

      const result = await handleExplainConcept({ concept: 'GS-13' });
      const text = result.content[0].text;

      expect(text).toContain('General Schedule');
      expect(text).toContain('13');
    });

    it('falls back to codelist for unknown glossary entry', async () => {
      const { handleExplainConcept } = await import('../../src/tools/advisor.js');
      const { getCodelist } = await import('../../src/cache/codelist-cache.js');

      vi.mocked(getCodelist).mockResolvedValueOnce([
        { Code: '2210', Value: 'Information Technology Management', LastModified: '', IsDisabled: 'No' },
      ]);

      const result = await handleExplainConcept({ concept: '2210' });
      const text = result.content[0].text;

      expect(text).toContain('Information Technology Management');
    });

    it('returns not found message when concept is unknown everywhere', async () => {
      const { handleExplainConcept } = await import('../../src/tools/advisor.js');
      const { getCodelist } = await import('../../src/cache/codelist-cache.js');

      vi.mocked(getCodelist).mockResolvedValue([]);

      const result = await handleExplainConcept({ concept: 'xyzzy_unknown_thing' });
      const text = result.content[0].text;

      expect(text).toContain('Concept not found');
    });
  });

  describe('handleFindMatchingJobs', () => {
    it('extracts keywords from CV and searches', async () => {
      const { handleFindMatchingJobs } = await import('../../src/tools/advisor.js');
      const { searchJobs } = await import('../../src/api/usajobs-client.js');

      const stored = {
        content: 'Skills: React, Node.js, TypeScript\nExperience: 8 years software development',
        savedAt: '2026-04-13T00:00:00.000Z',
        format: 'txt',
      };
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(stored));
      vi.mocked(searchJobs).mockResolvedValue({
        SearchResultCount: 0,
        SearchResultCountAll: 0,
        SearchResultItems: [],
      });

      const client = {} as any;
      const result = await handleFindMatchingJobs(client, {});
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.keywords_used).toBeDefined();
      expect(parsed.keywords_used.length).toBeGreaterThan(0);
      expect(searchJobs).toHaveBeenCalled();
    });

    it('returns error when no CV saved', async () => {
      const { handleFindMatchingJobs } = await import('../../src/tools/advisor.js');

      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT'));

      const client = {} as any;
      const result = await handleFindMatchingJobs(client, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('No CV found');
    });
  });

  describe('handleCheckQualification', () => {
    it('returns CV and job data side by side', async () => {
      const { handleCheckQualification } = await import('../../src/tools/advisor.js');
      const { searchJobs } = await import('../../src/api/usajobs-client.js');

      const stored = {
        content: 'Senior Developer with 8 years React experience',
        savedAt: '2026-04-13T00:00:00.000Z',
        format: 'txt',
      };
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(stored));
      vi.mocked(searchJobs).mockResolvedValueOnce({
        SearchResultCount: 1,
        SearchResultCountAll: 1,
        SearchResultItems: [mockJobItem()],
      });

      const client = {} as any;
      const result = await handleCheckQualification(client, { job_id: '12345' });

      expect(searchJobs).toHaveBeenCalledWith(
        client,
        expect.objectContaining({ Keyword: '12345', ResultsPerPage: JOB_LOOKUP_PAGE_SIZE }),
      );

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.cv).toContain('Senior Developer');
      expect(parsed.job.title).toBe('Software Developer');
      expect(parsed.job.key_requirements).toBeDefined();
    });

    it('returns error when no CV saved', async () => {
      const { handleCheckQualification } = await import('../../src/tools/advisor.js');

      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT'));

      const client = {} as any;
      const result = await handleCheckQualification(client, { job_id: '123' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('No CV found');
    });
  });
});
