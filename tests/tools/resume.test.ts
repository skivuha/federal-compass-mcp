import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs/promises';

vi.mock('node:fs/promises');

describe('resume tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('handleSaveResume', () => {
    it('saves resume as JSON with metadata', async () => {
      const { handleSaveResume } = await import('../../src/tools/resume.js');

      vi.mocked(fs.mkdir).mockResolvedValueOnce(undefined);
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined);

      const result = await handleSaveResume({
        content: 'Senior Engineer with 8 years experience',
        format: 'txt',
      });

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('resume.json'),
        expect.stringContaining('Senior Engineer'),
      );
      expect(result.content[0].text).toContain('saved');
    });
  });

  describe('handleGetResume', () => {
    it('returns resume content and metadata', async () => {
      const { handleGetResume } = await import('../../src/tools/resume.js');

      const stored = {
        content: 'My resume text',
        savedAt: '2026-04-13T00:00:00.000Z',
        format: 'txt',
      };
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(stored));

      const result = await handleGetResume();

      expect(result.content[0].text).toContain('My resume text');
    });

    it('returns informational message when no resume exists', async () => {
      const { handleGetResume } = await import('../../src/tools/resume.js');

      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT'));

      const result = await handleGetResume();

      expect(result.content[0].text).toContain('No resume saved yet');
    });
  });

  describe('requireResume', () => {
    it('returns resume content when file exists', async () => {
      const { requireResume } = await import('../../src/tools/resume.js');

      const stored = {
        content: 'Resume text',
        savedAt: '2026-04-13T00:00:00.000Z',
        format: 'txt',
      };
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(stored));

      const result = await requireResume();

      expect(result.content).toBe('Resume text');
    });

    it('throws when no resume exists', async () => {
      const { requireResume } = await import('../../src/tools/resume.js');

      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT'));

      await expect(requireResume()).rejects.toThrow('No resume found');
    });
  });
});
