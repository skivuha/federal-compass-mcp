import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs/promises';

vi.mock('node:fs/promises');
vi.mock('../../src/api/usajobs-client.js', () => ({
  fetchCodelist: vi.fn(),
}));

const TTL_MS = 30 * 24 * 60 * 60 * 1000;

describe('codelist-cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('fetches from API and caches when no local file exists', async () => {
    const { fetchCodelist } = await import('../../src/api/usajobs-client.js');
    const { getCodelist } = await import('../../src/cache/codelist-cache.js');

    vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT'));
    vi.mocked(fs.mkdir).mockResolvedValueOnce(undefined);
    vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined);
    vi.mocked(fetchCodelist).mockResolvedValueOnce({
      CodeList: [
        {
          ValidValue: [
            { Code: '2210', Value: 'IT Management', LastModified: '', IsDisabled: 'No' },
            { Code: '9999', Value: 'Disabled', LastModified: '', IsDisabled: 'Yes' },
          ],
          id: 'OccupationalSeries',
        },
      ],
      DateGenerated: '',
    });

    const result = await getCodelist('occupationalseries');

    expect(fetchCodelist).toHaveBeenCalledWith('occupationalseries');
    expect(result).toHaveLength(1);
    expect(result[0].Code).toBe('2210');
  });

  it('reads from cache when file exists and TTL not expired', async () => {
    const { fetchCodelist } = await import('../../src/api/usajobs-client.js');
    const { getCodelist } = await import('../../src/cache/codelist-cache.js');

    const cached = {
      data: [{ Code: '2210', Value: 'IT Management', LastModified: '', IsDisabled: 'No' }],
      lastFetched: new Date().toISOString(),
    };
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(cached));

    const result = await getCodelist('occupationalseries');

    expect(fetchCodelist).not.toHaveBeenCalled();
    expect(result[0].Code).toBe('2210');
  });

  it('refetches when TTL is expired', async () => {
    const { fetchCodelist } = await import('../../src/api/usajobs-client.js');
    const { getCodelist } = await import('../../src/cache/codelist-cache.js');

    const expired = {
      data: [{ Code: 'OLD', Value: 'Old', LastModified: '', IsDisabled: 'No' }],
      lastFetched: new Date(Date.now() - TTL_MS - 1000).toISOString(),
    };
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(expired));
    vi.mocked(fs.mkdir).mockResolvedValueOnce(undefined);
    vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined);
    vi.mocked(fetchCodelist).mockResolvedValueOnce({
      CodeList: [
        {
          ValidValue: [
            { Code: 'NEW', Value: 'New', LastModified: '', IsDisabled: 'No' },
          ],
          id: 'Test',
        },
      ],
      DateGenerated: '',
    });

    const result = await getCodelist('occupationalseries');

    expect(fetchCodelist).toHaveBeenCalled();
    expect(result[0].Code).toBe('NEW');
  });

  it('resolves code from human-readable name', async () => {
    const { resolveCode } = await import('../../src/cache/codelist-cache.js');

    const cached = {
      data: [
        { Code: 'LP00', Value: 'Government Publishing Office', LastModified: '', IsDisabled: 'No' },
        { Code: 'DD00', Value: 'Department of Defense', LastModified: '', IsDisabled: 'No' },
      ],
      lastFetched: new Date().toISOString(),
    };
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(cached));

    const code = await resolveCode('agencysubelements', 'Department of Defense');

    expect(code).toBe('DD00');
  });
});
