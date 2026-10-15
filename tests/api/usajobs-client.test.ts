import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    interceptors: {
      response: { use: vi.fn() },
    },
  };
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
      get: vi.fn(),
    },
  };
});

describe('usajobs-client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createApiClient', () => {
    it('creates axios instance with correct headers', async () => {
      const { createApiClient } = await import('../../src/api/usajobs-client.js');
      createApiClient('test-key', 'test@email.com');

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://data.usajobs.gov/api',
          timeout: 15_000,
          headers: {
            Host: 'data.usajobs.gov',
            'User-Agent': 'test@email.com',
            'Authorization-Key': 'test-key',
          },
        }),
      );
    });
  });

  describe('searchJobs', () => {
    it('calls /search with params and returns SearchResult', async () => {
      const { createApiClient, searchJobs } = await import('../../src/api/usajobs-client.js');
      const client = createApiClient('key', 'email');

      const mockResponse = {
        data: {
          SearchResult: {
            SearchResultCount: 2,
            SearchResultCountAll: 50,
            SearchResultItems: [{ MatchedObjectId: '123' }],
          },
        },
      };
      vi.mocked(client.get).mockResolvedValueOnce(mockResponse);

      const result = await searchJobs(client, { Keyword: 'react' });

      expect(client.get).toHaveBeenCalledWith('/search', { params: { Keyword: 'react' } });
      expect(result.SearchResultCountAll).toBe(50);
    });
  });

  describe('fetchCodelist', () => {
    it('calls codelist endpoint without auth', async () => {
      const { fetchCodelist } = await import('../../src/api/usajobs-client.js');

      const mockResponse = {
        data: {
          CodeList: [
            {
              ValidValue: [
                { Code: '2210', Value: 'IT Management', IsDisabled: 'No' },
              ],
            },
          ],
        },
      };
      vi.mocked(axios.get).mockResolvedValueOnce(mockResponse);

      const result = await fetchCodelist('occupationalseries');

      expect(axios.get).toHaveBeenCalledWith('https://data.usajobs.gov/api/codelist/occupationalseries', { timeout: 15_000 });
      expect(result.CodeList[0].ValidValue[0].Code).toBe('2210');
    });
  });
});

// The wrappers must preserve failures so handlers can distinguish outages from empty results.
it('propagates search timeouts', async () => {
  const { createApiClient, searchJobs } = await import('../../src/api/usajobs-client.js');
  const client = createApiClient('test-key', 'test@example.com');
  const error = Object.assign(new Error('timeout'), { code: 'ECONNABORTED' });
  vi.mocked(client.get).mockRejectedValueOnce(error);
  await expect(searchJobs(client, { Keyword: 'python' })).rejects.toBe(error);
});

it('propagates codelist timeouts', async () => {
  const { fetchCodelist } = await import('../../src/api/usajobs-client.js');
  const error = Object.assign(new Error('timeout'), { code: 'ECONNABORTED' });
  vi.mocked(axios.get).mockRejectedValueOnce(error);
  await expect(fetchCodelist('occupationalseries')).rejects.toBe(error);
});
