import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { fetchCodelist, type CodelistItem } from '../api/usajobs-client.js';
import { createLogger } from '../logger.js';

const log = createLogger('cache');

const CACHE_DIR = path.join(os.homedir(), '.federal-compass', 'codelists');
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CachedCodelist {
  data: CodelistItem[];
  lastFetched: string;
}

export async function getCodelist(name: string): Promise<CodelistItem[]> {
  const filePath = path.join(CACHE_DIR, `${name}.json`);

  // Try reading cache
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const cached: CachedCodelist = JSON.parse(raw);
    const age = Date.now() - new Date(cached.lastFetched).getTime();

    if (age < TTL_MS) {
      log('cache hit for %s (age: %dd)', name, Math.floor(age / 86400000));
      return cached.data;
    }
    log('cache expired for %s', name);
  } catch {
    log('no cache for %s, fetching', name);
  }

  // Fetch from API
  const response = await fetchCodelist(name);
  const items = response.CodeList[0]?.ValidValue ?? [];
  const filtered = items.filter((item) => item.IsDisabled !== 'Yes');

  // Save to cache
  const cached: CachedCodelist = {
    data: filtered,
    lastFetched: new Date().toISOString(),
  };

  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(cached, null, 2));
  log('cached %d items for %s', filtered.length, name);

  return filtered;
}

export async function resolveCode(
  codelistName: string,
  searchValue: string,
): Promise<string | undefined> {
  const items = await getCodelist(codelistName);
  const lower = searchValue.toLowerCase();
  const match = items.find((item) =>
    item.Value.toLowerCase().includes(lower),
  );
  return match?.Code;
}
