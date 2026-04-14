import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const RESUME_DIR = path.join(os.homedir(), '.federal-compass');
const RESUME_PATH = path.join(RESUME_DIR, 'resume.json');

interface StoredResume {
  content: string;
  savedAt: string;
  format: string;
}

export async function handleSaveResume(params: {
  content: string;
  format?: string;
}): Promise<CallToolResult> {
  const resume: StoredResume = {
    content: params.content,
    savedAt: new Date().toISOString(),
    format: params.format ?? 'txt',
  };

  try {
    await fs.mkdir(RESUME_DIR, { recursive: true });
    await fs.writeFile(RESUME_PATH, JSON.stringify(resume, null, 2));
  } catch {
    return {
      content: [{ type: 'text', text: 'Unable to save resume. Please check file permissions.' }],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: `Resume saved successfully (${params.content.length} characters, format: ${resume.format}). It will be used automatically for job matching and qualification checks.`,
      },
    ],
  };
}

export async function handleGetResume(): Promise<CallToolResult> {
  try {
    const raw = await fs.readFile(RESUME_PATH, 'utf-8');
    const resume: StoredResume = JSON.parse(raw);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              content: resume.content,
              savedAt: resume.savedAt,
              format: resume.format,
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
          text: 'No resume saved yet. Use the save_resume tool to save your resume for automatic use in job matching and qualification checks.',
        },
      ],
    };
  }
}

export async function requireResume(): Promise<StoredResume> {
  try {
    const raw = await fs.readFile(RESUME_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    throw new Error(
      'No resume found. Please save your resume first using the save_resume tool, then try again.',
    );
  }
}
