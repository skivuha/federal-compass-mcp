import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { SERVER_VERSION } from '../src/version.js';

const readText = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf-8');

const pkg = JSON.parse(readText('../package.json'));
const serverManifest = JSON.parse(readText('../server.json'));
const releaseConfig = JSON.parse(readText('../release-please-config.json'));

describe('version', () => {
  it('reports the same version to MCP clients as package.json', () => {
    expect(SERVER_VERSION).toBe(pkg.version);
  });

  it('keeps server.json in sync with package.json', () => {
    expect(serverManifest.version).toBe(pkg.version);
    expect(serverManifest.packages[0].version).toBe(pkg.version);
  });

  it('is what src/index.ts hands to McpServer', () => {
    const code = readText('../src/index.ts')
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');

    expect(code).toMatch(/version:\s*SERVER_VERSION/);
    expect(code).not.toMatch(/version:\s*['"]/);
  });

  it('keeps the release-please marker on the same line as the literal', () => {
    expect(readText('../src/version.ts')).toMatch(
      /SERVER_VERSION = ['"][^'"]+['"];.*x-release-please-version/,
    );
  });

  it('is still listed in release-please extra-files', () => {
    expect(releaseConfig.packages['.']['extra-files']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'generic', path: 'src/version.ts' }),
      ]),
    );
  });
});
