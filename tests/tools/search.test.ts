import { describe, it, expect, vi, beforeEach } from 'vitest';

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
    it('returns full job details', async () => {
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
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.title).toBe('Developer');
      expect(parsed.major_duties).toHaveLength(2);
      expect(parsed.qualification_summary).toBe('Qualifications here');
    });
  });
});
