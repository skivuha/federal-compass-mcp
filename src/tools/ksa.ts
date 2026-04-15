import type { AxiosInstance } from 'axios';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { lookupJobById } from './search.js';
import { requireCV } from './cv.js';

export type KsaType = 'knowledge' | 'skill' | 'ability' | 'experience' | 'education' | 'certification' | 'other';
export type KsaSource = 'qualification_summary' | 'major_duties';

export interface KsaRequirement {
  type: KsaType;
  text: string;
  source: KsaSource;
  matched: boolean | null;
}

const KSA_PATTERNS: Array<{ pattern: RegExp; type: KsaType }> = [
  { pattern: /knowledge of\b/i, type: 'knowledge' },
  { pattern: /skill in\b/i, type: 'skill' },
  { pattern: /skilled in\b/i, type: 'skill' },
  { pattern: /ability to\b/i, type: 'ability' },
  { pattern: /able to\b/i, type: 'ability' },
  { pattern: /experience with\b/i, type: 'experience' },
  { pattern: /experience in\b/i, type: 'experience' },
  { pattern: /specialized experience\b/i, type: 'experience' },
  { pattern: /\b(?:bachelor|master|phd|doctorate|degree)\b/i, type: 'education' },
  { pattern: /\b(?:certification|certified|cissp|comptia|security\+|pmp)\b/i, type: 'certification' },
  { pattern: /must possess\b/i, type: 'other' },
  { pattern: /must demonstrate\b/i, type: 'other' },
];

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'was',
  'were', 'been', 'being', 'have', 'has', 'had', 'having', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'shall', 'can', 'need', 'not', 'but', 'such', 'than', 'too', 'very',
  'just', 'about', 'above', 'after', 'again', 'all', 'also', 'any',
]);

function splitIntoSentences(text: string): string[] {
  return text
    .split(/[.;]\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 3);
}

function classifySentence(sentence: string): KsaType | null {
  const match = KSA_PATTERNS.find(({ pattern }) => pattern.test(sentence));
  return match?.type ?? null;
}

export function parseKsaRequirements(
  text: string,
  source: KsaSource,
): KsaRequirement[] {
  if (!text || text.trim().length === 0) return [];

  const sentences = splitIntoSentences(text);

  return sentences
    .map((sentence) => {
      const type = classifySentence(sentence);
      if (!type) return null;
      return {
        type,
        text: sentence,
        source,
        matched: null as boolean | null,
      };
    })
    .filter((requirement): requirement is KsaRequirement => requirement !== null);
}

function deduplicateRequirements(requirements: KsaRequirement[]): KsaRequirement[] {
  const seen = new Set<string>();
  return requirements.filter((requirement) => {
    const normalized = requirement.text.toLowerCase().trim();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function extractMeaningfulWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,\-/()]+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

function matchRequirementToCV(requirement: KsaRequirement, cvContent: string): boolean {
  const words = extractMeaningfulWords(requirement.text);
  if (words.length === 0) return false;
  const cvLower = cvContent.toLowerCase();
  const matchedCount = words.filter((word) => cvLower.includes(word)).length;
  return matchedCount / words.length >= 0.5;
}

export async function handleExtractKsa(
  client: AxiosInstance,
  params: { job_id: string },
): Promise<CallToolResult> {
  let item;
  try {
    item = await lookupJobById(client, params.job_id);
  } catch {
    return {
      content: [{ type: 'text', text: 'Unable to search USAJobs at this time. Please try again later.' }],
      isError: true,
    };
  }

  if (!item) {
    return {
      content: [{
        type: 'text',
        text: `Job not found with ID: ${params.job_id}. The posting may have been removed or the ID may be incorrect.`,
      }],
      isError: true,
    };
  }

  const descriptor = item.MatchedObjectDescriptor;
  const details = descriptor.UserArea.Details;
  const qualificationSummary = descriptor.QualificationSummary ?? '';
  const majorDuties = details.MajorDuties ?? [];

  const qualRequirements = parseKsaRequirements(qualificationSummary, 'qualification_summary');
  const dutyRequirements = majorDuties.flatMap((duty) =>
    parseKsaRequirements(duty, 'major_duties'),
  );

  const allRequirements = deduplicateRequirements([...qualRequirements, ...dutyRequirements]);

  let cvContent: string | null = null;
  try {
    const cv = await requireCV();
    cvContent = cv.content;
  } catch {
    // CV not available — matching will be skipped
  }

  const requirements = allRequirements.map((requirement) => ({
    ...requirement,
    matched: cvContent !== null ? matchRequirementToCV(requirement, cvContent) : null,
  }));

  const matchedCount = requirements.filter((r) => r.matched === true).length;
  const unmatchedCount = requirements.filter((r) => r.matched === false).length;

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        job_title: descriptor.PositionTitle,
        requirements,
        summary: cvContent !== null
          ? { total: requirements.length, matched: matchedCount, unmatched: unmatchedCount }
          : { total: requirements.length },
        cv_available: cvContent !== null,
        raw_qualification_summary: qualificationSummary,
      }, null, 2),
    }],
  };
}
