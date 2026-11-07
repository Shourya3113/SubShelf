import { SubDeckStorageSchema } from '@/types';
import { SUBDECK_TAXONOMY } from '@/ai/heuristic';

const ISSUES_URL = 'https://github.com/Shourya3113/SubShelf/issues/new';
const ISSUE_TITLE = 'Sorter corrections';
const MAX_CHANNELS = 40;
/** GitHub rejects very long prefilled links. Non-Latin titles encode to 9 characters per letter, so count encoded length. */
const MAX_ENCODED_BODY = 6000;

export interface CorrectionReport {
  /** Channels included in `body`. */
  count: number;
  /** Corrections that didn't fit. */
  leftOut: number;
  body: string;
}

const oneLine = (s: string) => s.replace(/[`\s]+/g, ' ').trim();

/**
 * The channels the user moved by hand into built-in folders, as the text of a GitHub issue. Custom
 * folders are left out: the sorter can't learn from them and their names can be personal. The list
 * is a code block because a handle like @name would otherwise notify the GitHub user of that name.
 */
export function buildCorrectionReport(
  state: Pick<SubDeckStorageSchema, 'channels' | 'manualAssignments'>,
  version: string
): CorrectionReport {
  const builtIn = new Map(SUBDECK_TAXONOMY.map(t => [t.id, t.name]));
  const lines: string[] = [];
  for (const [id, folderIds] of Object.entries(state.manualAssignments)) {
    const ch = state.channels[id];
    const folders = folderIds.flatMap(f => builtIn.get(f) ?? []);
    if (ch && folders.length > 0) lines.push(`${oneLine(ch.title)} (${oneLine(ch.handle)}) -> ${folders.join(', ')}`);
  }
  lines.sort((a, b) => a.localeCompare(b));

  const render = (rows: string[]) => [
    `Channels I moved by hand in SubShelf ${version}:`,
    '',
    '```text',
    ...rows,
    '```',
    ...(rows.length < lines.length ? ['', `${lines.length - rows.length} more left out to keep this link short.`] : []),
  ].join('\n');

  let rows = lines.slice(0, MAX_CHANNELS);
  while (rows.length > 0 && encodeURIComponent(render(rows)).length > MAX_ENCODED_BODY) rows = rows.slice(0, -1);
  return { count: rows.length, leftOut: lines.length - rows.length, body: render(rows) };
}

export function reportIssueUrl(report: CorrectionReport): string {
  return `${ISSUES_URL}?title=${encodeURIComponent(ISSUE_TITLE)}&body=${encodeURIComponent(report.body)}`;
}
