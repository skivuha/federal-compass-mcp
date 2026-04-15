import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JOB_LOOKUP_PAGE_SIZE } from '../../src/tools/search.js';

vi.mock('../../src/api/usajobs-client.js', () => ({
  searchJobs: vi.fn(),
}));

vi.mock('../../src/cache/codelist-cache.js', () => ({
  resolveCode: vi.fn(),
}));

// Helper: create a mock search result item
function mockJobItem(overrides: Record<string, any> = {}) {
  return {
    MatchedObjectId: overrides.id ?? '12345',
    MatchedObjectDescriptor: {
      PositionTitle: overrides.title ?? 'Software Developer',
      OrganizationName: overrides.agency ?? 'SSA',
      DepartmentName: overrides.department ?? 'Social Security Administration',
      PositionLocationDisplay: overrides.location ?? 'Raleigh, NC',
      PositionRemuneration: [
        {
          MinimumRange: overrides.salaryMin ?? '100000',
          MaximumRange: overrides.salaryMax ?? '150000',
          RateIntervalCode: 'PA',
        },
      ],
      ApplicationCloseDate: '2026-06-01',
      PositionURI: 'https://usajobs.gov/job/12345',
      ApplyURI: ['https://usajobs.gov/apply/12345'],
      JobGrade: [{ Code: 'GS' }],
      QualificationSummary: overrides.qualifications ?? 'Must have experience...',
      UserArea: {
        Details: {
          LowGrade: overrides.lowGrade ?? '13',
          HighGrade: overrides.highGrade ?? '14',
          JobSummary: 'Build things',
          MajorDuties: overrides.duties ?? ['Code stuff'],
          HiringPath: ['public'],
          TeleworkEligible: true,
          RemoteIndicator: false,
          SecurityClearance: 'Not Required',
        },
      },
    },
  };
}

describe('search tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('handleSearchJobs', () => {
    it('maps params and returns formatted results with agencies', async () => {
      const { searchJobs } = await import('../../src/api/usajobs-client.js');
      const { resolveCode } = await import('../../src/cache/codelist-cache.js');
      const { handleSearchJobs } = await import('../../src/tools/search.js');

      vi.mocked(resolveCode).mockResolvedValue(undefined);
      vi.mocked(searchJobs).mockResolvedValueOnce({
        SearchResultCount: 1,
        SearchResultCountAll: 42,
        SearchResultItems: [mockJobItem()],
      });

      const client = {} as any;
      const result = await handleSearchJobs(client, {
        keyword: 'software developer',
        location: 'Raleigh, NC',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_count).toBe(42);
      expect(parsed.results).toHaveLength(1);
      expect(parsed.results[0].title).toBe('Software Developer');
      expect(parsed.agencies_in_results).toContain('SSA');
    });

    it('returns error when API fails', async () => {
      const { searchJobs } = await import('../../src/api/usajobs-client.js');
      const { resolveCode } = await import('../../src/cache/codelist-cache.js');
      const { handleSearchJobs } = await import('../../src/tools/search.js');

      vi.mocked(resolveCode).mockResolvedValue(undefined);
      vi.mocked(searchJobs).mockRejectedValueOnce(new Error('Network error'));

      const client = {} as any;
      const result = await handleSearchJobs(client, { keyword: 'test' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unable to search');
    });

    it('resolves agency name to code via codelist', async () => {
      const { searchJobs } = await import('../../src/api/usajobs-client.js');
      const { resolveCode } = await import('../../src/cache/codelist-cache.js');
      const { handleSearchJobs } = await import('../../src/tools/search.js');

      vi.mocked(resolveCode).mockResolvedValueOnce('DD00');
      vi.mocked(searchJobs).mockResolvedValueOnce({
        SearchResultCount: 0,
        SearchResultCountAll: 0,
        SearchResultItems: [],
      });

      const client = {} as any;
      await handleSearchJobs(client, { agency: 'Department of Defense' });

      expect(resolveCode).toHaveBeenCalledWith('agencysubelements', 'Department of Defense');
      expect(searchJobs).toHaveBeenCalledWith(
        client,
        expect.objectContaining({ Organization: 'DD00' }),
      );
    });
  });

  describe('handleGetJobDetails', () => {
    it('searches by Keyword with job_id and returns full details', async () => {
      const { searchJobs } = await import('../../src/api/usajobs-client.js');
      const { handleGetJobDetails } = await import('../../src/tools/search.js');

      vi.mocked(searchJobs).mockResolvedValueOnce({
        SearchResultCount: 1,
        SearchResultCountAll: 1,
        SearchResultItems: [
          mockJobItem({
            id: '12345',
            title: 'Developer',
            qualifications: 'Qualifications here',
            duties: ['Duty 1', 'Duty 2'],
          }),
        ],
      });

      const client = {} as any;
      const result = await handleGetJobDetails(client, { job_id: '12345' });

      expect(searchJobs).toHaveBeenCalledWith(
        client,
        expect.objectContaining({ Keyword: '12345', ResultsPerPage: JOB_LOOKUP_PAGE_SIZE }),
      );

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.title).toBe('Developer');
      expect(parsed.major_duties).toHaveLength(2);
      expect(parsed.qualification_summary).toBe('Qualifications here');
    });

    it('returns error when job not found in results', async () => {
      const { searchJobs } = await import('../../src/api/usajobs-client.js');
      const { handleGetJobDetails } = await import('../../src/tools/search.js');

      vi.mocked(searchJobs).mockResolvedValueOnce({
        SearchResultCount: 1,
        SearchResultCountAll: 1,
        SearchResultItems: [mockJobItem({ id: '99999' })],
      });

      const client = {} as any;
      const result = await handleGetJobDetails(client, { job_id: '12345' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Job not found');
    });
  });

  describe('lookupJobById', () => {
    it('returns item when found in search results', async () => {
      const { searchJobs } = await import('../../src/api/usajobs-client.js');
      const { lookupJobById } = await import('../../src/tools/search.js');

      vi.mocked(searchJobs).mockResolvedValueOnce({
        SearchResultCount: 1,
        SearchResultCountAll: 1,
        SearchResultItems: [mockJobItem({ id: '12345' })],
      });

      const client = {} as any;
      const item = await lookupJobById(client, '12345');

      expect(item).not.toBeNull();
      expect(item!.MatchedObjectId).toBe('12345');
      expect(searchJobs).toHaveBeenCalledWith(
        client,
        expect.objectContaining({ Keyword: '12345' }),
      );
    });

    it('returns null when job not in results', async () => {
      const { searchJobs } = await import('../../src/api/usajobs-client.js');
      const { lookupJobById } = await import('../../src/tools/search.js');

      vi.mocked(searchJobs).mockResolvedValueOnce({
        SearchResultCount: 1,
        SearchResultCountAll: 1,
        SearchResultItems: [mockJobItem({ id: '99999' })],
      });

      const client = {} as any;
      const item = await lookupJobById(client, '12345');

      expect(item).toBeNull();
    });
  });

  describe('handleCompareJobs', () => {
    it('compares multiple jobs and returns formatted results', async () => {
      const { searchJobs } = await import('../../src/api/usajobs-client.js');
      const { handleCompareJobs } = await import('../../src/tools/search.js');

      vi.mocked(searchJobs)
        .mockResolvedValueOnce({
          SearchResultCount: 1,
          SearchResultCountAll: 1,
          SearchResultItems: [mockJobItem({ id: '111', title: 'Developer' })],
        })
        .mockResolvedValueOnce({
          SearchResultCount: 1,
          SearchResultCountAll: 1,
          SearchResultItems: [mockJobItem({ id: '222', title: 'Engineer' })],
        });

      const client = {} as any;
      const result = await handleCompareJobs(client, { job_ids: ['111', '222'] });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.jobs).toHaveLength(2);
      expect(parsed.jobs[0].title).toBe('Developer');
      expect(parsed.jobs[1].title).toBe('Engineer');
      expect(parsed.not_found).toHaveLength(0);
      expect(parsed.errors).toHaveLength(0);
    });

    it('separates not_found and errors', async () => {
      const { searchJobs } = await import('../../src/api/usajobs-client.js');
      const { handleCompareJobs } = await import('../../src/tools/search.js');

      vi.mocked(searchJobs)
        .mockResolvedValueOnce({
          SearchResultCount: 1,
          SearchResultCountAll: 1,
          SearchResultItems: [mockJobItem({ id: '111' })],
        })
        .mockResolvedValueOnce({
          SearchResultCount: 0,
          SearchResultCountAll: 0,
          SearchResultItems: [],
        })
        .mockRejectedValueOnce(new Error('API error'));

      const client = {} as any;
      const result = await handleCompareJobs(client, { job_ids: ['111', '222', '333'] });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.jobs).toHaveLength(1);
      expect(parsed.not_found).toContain('222');
      expect(parsed.errors).toContain('333');
    });

    it('returns error when less than 2 IDs', async () => {
      const { handleCompareJobs } = await import('../../src/tools/search.js');

      const client = {} as any;
      const result = await handleCompareJobs(client, { job_ids: ['111'] });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('2 to 5');
    });

    it('returns error when more than 5 IDs', async () => {
      const { handleCompareJobs } = await import('../../src/tools/search.js');

      const client = {} as any;
      const result = await handleCompareJobs(client, {
        job_ids: ['1', '2', '3', '4', '5', '6'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('2 to 5');
    });

    it('deduplicates job IDs', async () => {
      const { handleCompareJobs } = await import('../../src/tools/search.js');

      const client = {} as any;
      const result = await handleCompareJobs(client, { job_ids: ['111', '111', '111'] });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('2 to 5');
    });

    it('returns isError when all jobs fail', async () => {
      const { searchJobs } = await import('../../src/api/usajobs-client.js');
      const { handleCompareJobs } = await import('../../src/tools/search.js');

      vi.mocked(searchJobs)
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'));

      const client = {} as any;
      const result = await handleCompareJobs(client, { job_ids: ['111', '222'] });

      expect(result.isError).toBe(true);
    });
  });
});
