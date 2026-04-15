import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs/promises';

vi.mock('node:fs/promises');

describe('cv tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('handleSaveCV', () => {
    it('saves CV as JSON with metadata', async () => {
      const { handleSaveCV } = await import('../../src/tools/cv.js');

      vi.mocked(fs.mkdir).mockResolvedValueOnce(undefined);
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined);

      const result = await handleSaveCV({
        content: 'Senior Engineer with 8 years experience',
        format: 'txt',
      });

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('cv.json'),
        expect.stringContaining('Senior Engineer'),
      );
      expect(result.content[0].text).toContain('saved');
    });

    it('returns error when file system fails', async () => {
      const { handleSaveCV } = await import('../../src/tools/cv.js');

      vi.mocked(fs.mkdir).mockRejectedValueOnce(new Error('EACCES'));

      const result = await handleSaveCV({
        content: 'Some CV text',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unable to save');
    });
  });

  describe('handleGetCV', () => {
    it('returns CV content and metadata', async () => {
      const { handleGetCV } = await import('../../src/tools/cv.js');

      const stored = {
        content: 'My CV text',
        savedAt: '2026-04-13T00:00:00.000Z',
        format: 'txt',
      };
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(stored));

      const result = await handleGetCV();

      expect(result.content[0].text).toContain('My CV text');
    });

    it('returns informational message when no CV exists', async () => {
      const { handleGetCV } = await import('../../src/tools/cv.js');

      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT'));

      const result = await handleGetCV();

      expect(result.content[0].text).toContain('No CV saved yet');
    });
  });

  describe('requireCV', () => {
    it('returns CV content when file exists', async () => {
      const { requireCV } = await import('../../src/tools/cv.js');

      const stored = {
        content: 'CV text',
        savedAt: '2026-04-13T00:00:00.000Z',
        format: 'txt',
      };
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(stored));

      const result = await requireCV();

      expect(result.content).toBe('CV text');
    });

    it('throws when no CV exists', async () => {
      const { requireCV } = await import('../../src/tools/cv.js');

      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT'));

      await expect(requireCV()).rejects.toThrow('No CV found');
    });
  });
});
