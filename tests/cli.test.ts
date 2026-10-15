import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const entry = resolve('build/src/index.js');

describe('built CLI (run npm run build before these tests)', () => {
  it('has a Node interpreter directive for npm executable startup', () => {
    expect(existsSync(entry), 'Run npm run build before npm test').toBe(true);
    expect(readFileSync(entry, 'utf8').split('\n')[0]).toBe('#!/usr/bin/env node');
  });

  it('initializes MCP, lists tools, and serves an offline tool', async () => {
    const client = new Client({ name: 'cli-test', version: '1.0.0' });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [entry],
      env: { USAJOBS_API_KEY: 'test-only', USAJOBS_EMAIL: 'test@example.com' },
    });
    try {
      await client.connect(transport);
      const { tools } = await client.listTools();
      expect(tools.map((tool) => tool.name).sort()).toEqual([
        'calculate_salary', 'check_qualification', 'compare_jobs', 'explain_federal_concept',
        'extract_ksa', 'find_matching_jobs', 'get_cv', 'get_job_details', 'save_cv', 'search_jobs',
      ]);
      const result = await client.callTool({
        name: 'calculate_salary', arguments: { grade: '13', step: 1 },
      });
      expect(result.isError).not.toBe(true);
      expect(result.content).toEqual([expect.objectContaining({ type: 'text' })]);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(JSON.parse(content[0].text)).toMatchObject({ grade: '13', step: 1, base_pay: 90925 });
    } finally {
      await client.close();
    }
  });
});
