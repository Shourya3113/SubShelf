import { describe, it, expect } from 'vitest';
import { buildCorrectionReport, reportIssueUrl } from '@/utils/correctionReport';
import { NO_FOLDER, SubscribedChannel } from '@/types';

const id = (n: number) => 'UC' + String(n).padStart(22, '0');
const ch = (n: number, title = `Channel ${n}`): SubscribedChannel => ({
  ucId: id(n), title, handle: `@chan${n}`, url: '', avatarUrl: '', discoveredAt: 0,
});

describe('correction report', () => {
  it('lists channels moved into built-in folders, with their folder names', () => {
    const r = buildCorrectionReport({
      channels: { [id(1)]: ch(1, 'ServersatHome'), [id(2)]: ch(2, 'Another') },
      manualAssignments: { [id(1)]: ['tech-coding'], [id(2)]: ['gaming', 'music'] },
    }, '1.3.3');
    expect(r.count).toBe(2);
    expect(r.leftOut).toBe(0);
    expect(r.body).toContain('Channels I moved by hand in SubShelf 1.3.3:');
    expect(r.body).toContain('ServersatHome (@chan1) -> Tech & Coding');
    expect(r.body).toContain('Another (@chan2) -> Gaming, Music & Audio');
  });

  it('leaves out custom folders, "no folder" and channels it no longer has', () => {
    const r = buildCorrectionReport({
      channels: { [id(1)]: ch(1), [id(2)]: ch(2), [id(3)]: ch(3) },
      manualAssignments: {
        [id(1)]: ['my-private-folder-1234'],
        [id(2)]: [NO_FOLDER],
        [id(3)]: ['my-private-folder-1234', 'gaming'],
        [id(4)]: ['gaming'],
      },
    }, '1.3.3');
    expect(r.count).toBe(1);
    expect(r.body).not.toContain('private');
    expect(r.body).toContain('Channel 3 (@chan3) -> Gaming');
  });

  it('keeps handles inside a code block, so nobody on GitHub gets notified', () => {
    const r = buildCorrectionReport({
      channels: { [id(1)]: ch(1, 'Sneaky ``` @someone\nsecond line') },
      manualAssignments: { [id(1)]: ['gaming'] },
    }, '1.3.3');
    const lines = r.body.split('\n');
    expect(lines.filter(l => l.startsWith('```'))).toHaveLength(2);
    const row = lines.find(l => l.includes('@chan1'))!;
    expect(lines.indexOf(row)).toBeGreaterThan(lines.indexOf('```text'));
    expect(row).toBe('Sneaky @someone second line (@chan1) -> Gaming');
  });

  it('stops at 40 channels and says how many it left out', () => {
    const nums = Array.from({ length: 50 }, (_, i) => i + 1);
    const r = buildCorrectionReport({
      channels: Object.fromEntries(nums.map(n => [id(n), ch(n)])),
      manualAssignments: Object.fromEntries(nums.map(n => [id(n), ['gaming']])),
    }, '1.3.3');
    expect(r.count).toBe(40);
    expect(r.leftOut).toBe(10);
    expect(r.body).toContain('10 more left out');
  });

  it('keeps the link short enough for GitHub with non-Latin channel names', () => {
    const nums = Array.from({ length: 40 }, (_, i) => i + 1);
    const r = buildCorrectionReport({
      channels: Object.fromEntries(nums.map(n => [id(n), ch(n, 'चैनल का बहुत लंबा नाम जो हिंदी में लिखा गया है')])),
      manualAssignments: Object.fromEntries(nums.map(n => [id(n), ['gaming']])),
    }, '1.3.3');
    expect(r.count).toBeLessThan(40);
    expect(r.leftOut).toBe(40 - r.count);
    expect(reportIssueUrl(r).length).toBeLessThan(6500);
  });

  it('builds a prefilled issue link', () => {
    const r = buildCorrectionReport({ channels: { [id(1)]: ch(1) }, manualAssignments: { [id(1)]: ['gaming'] } }, '1.3.3');
    const url = new URL(reportIssueUrl(r));
    expect(url.origin + url.pathname).toBe('https://github.com/Shourya3113/SubShelf/issues/new');
    expect(url.searchParams.get('title')).toBe('Sorter corrections');
    expect(url.searchParams.get('body')).toBe(r.body);
  });

  it('reports nothing when there are no corrections', () => {
    expect(buildCorrectionReport({ channels: {}, manualAssignments: {} }, '1.3.3').count).toBe(0);
  });
});
