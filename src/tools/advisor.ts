import type { AxiosInstance } from 'axios';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { searchJobs, type SearchResultItem } from '../api/usajobs-client.js';
import { getCodelist } from '../cache/codelist-cache.js';
import { lookupConcept } from '../data/federal-glossary.js';
import { lookupJobById, formatJob } from './search.js';
import { requireCV } from './cv.js';

export async function handleExplainConcept(params: {
  concept: string;
}): Promise<CallToolResult> {
  const entry = lookupConcept(params.concept);

  if (entry) {
    const parts: string[] = [`## ${entry.title}\n`, entry.description];

    if (entry.gradeDetail) {
      parts.push(
        `\n**Grade ${entry.gradeDetail.grade} Pay Range:** $${entry.gradeDetail.min.toLocaleString()} — $${entry.gradeDetail.max.toLocaleString()} (base pay, before locality adjustment)`,
      );
    }

    if (entry.timeline) {
      parts.push(`\n**Timeline:** ${entry.timeline}`);
    }

    if (entry.details) {
      parts.push(`\n**Details:** ${JSON.stringify(entry.details)}`);
    }

    if (entry.related?.length) {
      parts.push(`\n**Related concepts:** ${entry.related.join(', ')}`);
    }

    return { content: [{ type: 'text', text: parts.join('\n') }] };
  }

  // Fallback: search codelists
  const codelistNames = [
    'occupationalseries',
    'securityclearances',
    'hiringpaths',
    'payplans',
    'agencysubelements',
    'whomayapply',
  ];

  for (const name of codelistNames) {
    try {
      const items = await getCodelist(name);
      const match = items.find(
        (item) =>
          item.Code === params.concept ||
          item.Value.toLowerCase().includes(params.concept.toLowerCase()),
      );
      if (match) {
        return {
          content: [
            {
              type: 'text',
              text: `**${match.Value}** (Code: ${match.Code})\n\nFound in: ${name}\n\nThis is basic reference data. The AI assistant may be able to provide additional context and explanation.`,
            },
          ],
        };
      }
    } catch {
      // Skip failed codelist lookups
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: `Concept not found in glossary: "${params.concept}". The AI assistant may be able to help based on general knowledge.`,
      },
    ],
  };
}

// Known tech keywords for CV extraction
const TECH_KEYWORDS = new Set([
  'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c++', 'c#',
  'react', 'vue', 'angular', 'node.js', 'nodejs', 'express', 'django',
  'flask', 'spring', 'aws', 'azure', 'gcp', 'docker', 'kubernetes',
  'terraform', 'sql', 'postgresql', 'mongodb', 'redis', 'graphql',
  'rest', 'api', 'microservices', 'ci/cd', 'devops', 'agile', 'scrum',
  'machine learning', 'ai', 'data science', 'cybersecurity', 'cloud',
  'linux', 'networking', 'full stack', 'frontend', 'backend',
  'software developer', 'software engineer', 'project manager',
  'system administrator', 'data analyst', 'security analyst',
]);

function extractKeywords(cvText: string): string[] {
  const lower = cvText.toLowerCase();
  const found: string[] = [];

  for (const keyword of TECH_KEYWORDS) {
    if (lower.includes(keyword)) {
      found.push(keyword);
    }
  }

  // Also extract from "Skills:" or "Technologies:" sections
  const skillsMatch = lower.match(
    /(?:skills|technologies|technical skills|tech stack)[:\s]*([^\n]+(?:\n(?![\n\r]|[a-z]+:)[^\n]+)*)/,
  );
  if (skillsMatch) {
    const skills = skillsMatch[1]
      .split(/[,;|•\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s.length < 30);
    found.push(...skills);
  }

  // Deduplicate
  return [...new Set(found)].slice(0, 10);
}

export async function handleFindMatchingJobs(
  client: AxiosInstance,
  params: { results_per_page?: number },
): Promise<CallToolResult> {
  let cv;
  try {
    cv = await requireCV();
  } catch (error) {
    return {
      content: [{ type: 'text', text: (error as Error).message }],
      isError: true,
    };
  }

  const keywords = extractKeywords(cv.content);
  const resultsPerPage = params.results_per_page ?? 25;

  if (keywords.length === 0) {
    keywords.push('information technology');
  }

  // Make 1-3 searches with different keyword combinations
  const searches: Array<{ keywords: string; items: SearchResultItem[] }> = [];
  const keywordGroups = [
    keywords.slice(0, 3).join(' '),
    keywords.slice(3, 6).join(' '),
    keywords.slice(6, 10).join(' '),
  ].filter((g) => g.length > 0);

  for (const group of keywordGroups) {
    try {
      const result = await searchJobs(client, {
        Keyword: group,
        ResultsPerPage: resultsPerPage,
      });
      searches.push({ keywords: group, items: result.SearchResultItems });
    } catch {
      // Skip failed searches
    }
  }

  // Deduplicate by job ID
  const seen = new Set<string>();
  const allResults: SearchResultItem[] = [];
  for (const search of searches) {
    for (const item of search.items) {
      if (!seen.has(item.MatchedObjectId)) {
        seen.add(item.MatchedObjectId);
        allResults.push(item);
      }
    }
  }

  const formatted = allResults.map(formatJob);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            keywords_used: keywordGroups,
            total_results: formatted.length,
            results: formatted,
          },
          null,
          2,
        ),
      },
    ],
  };
}

export async function handleCheckQualification(
  client: AxiosInstance,
  params: { job_id: string },
): Promise<CallToolResult> {
  let cv;
  try {
    cv = await requireCV();
  } catch (error) {
    return {
      content: [{ type: 'text', text: (error as Error).message }],
      isError: true,
    };
  }

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
      content: [
        {
          type: 'text',
          text: `Job not found with ID: ${params.job_id}. The posting may have been removed or the ID may be incorrect.`,
        },
      ],
      isError: true,
    };
  }

  const d = item.MatchedObjectDescriptor;
  const details = d.UserArea.Details;
  const pay = d.PositionRemuneration[0];

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            cv: cv.content,
            job: {
              title: d.PositionTitle,
              agency: d.OrganizationName,
              location: d.PositionLocationDisplay,
              salary_range: pay
                ? `$${Number(pay.MinimumRange).toLocaleString()} — $${Number(pay.MaximumRange).toLocaleString()}`
                : 'Not specified',
              grade_range: `${details.LowGrade}-${details.HighGrade}`,
              security_clearance: details.SecurityClearance,
              qualification_summary: d.QualificationSummary,
              major_duties: details.MajorDuties,
              hiring_paths: details.HiringPath,
              key_requirements: {
                clearance: details.SecurityClearance,
                grade: `GS-${details.LowGrade} to GS-${details.HighGrade}`,
                qualifications: d.QualificationSummary,
                duties: details.MajorDuties,
              },
            },
          },
          null,
          2,
        ),
      },
    ],
  };
}
