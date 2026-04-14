import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const CV_DIR = path.join(os.homedir(), '.federal-compass');
const CV_PATH = path.join(CV_DIR, 'cv.json');

interface StoredCV {
  content: string;
  savedAt: string;
  format: string;
}

export async function handleSaveCV(params: {
  content: string;
  format?: string;
}): Promise<CallToolResult> {
  const cv: StoredCV = {
    content: params.content,
    savedAt: new Date().toISOString(),
    format: params.format ?? 'txt',
  };

  try {
    await fs.mkdir(CV_DIR, { recursive: true });
    await fs.writeFile(CV_PATH, JSON.stringify(cv, null, 2));
  } catch {
    return {
      content: [{ type: 'text', text: 'Unable to save CV. Please check file permissions.' }],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: `CV saved successfully (${params.content.length} characters, format: ${cv.format}). It will be used automatically for job matching and qualification checks.`,
      },
    ],
  };
}

export async function handleGetCV(): Promise<CallToolResult> {
  try {
    const raw = await fs.readFile(CV_PATH, 'utf-8');
    const cv: StoredCV = JSON.parse(raw);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              content: cv.content,
              savedAt: cv.savedAt,
              format: cv.format,
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch {
    return {
      content: [
        {
          type: 'text',
          text: 'No CV saved yet. Use the save_cv tool to save your CV for automatic use in job matching and qualification checks.',
        },
      ],
    };
  }
}

export async function requireCV(): Promise<StoredCV> {
  try {
    const raw = await fs.readFile(CV_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    throw new Error(
      'No CV found. Please save your CV first using the save_cv tool, then try again.',
    );
  }
}
