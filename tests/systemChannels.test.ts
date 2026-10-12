import { describe, it, expect } from 'vitest';
import { isSystemChannelOrCurator } from '@/utils/systemChannels';

describe('isSystemChannelOrCurator', () => {
  it('treats real creators as normal subscribable channels', () => {
    // Official YouTube channel and T-Series were both once wrongly filtered as "system"
    expect(isSystemChannelOrCurator({ ucId: 'UCBR8-60-B28hp2BmDPdntcQ', title: 'YouTube', handle: '@youtube', url: 'https://www.youtube.com/@youtube' })).toBe(false);
    expect(isSystemChannelOrCurator({ ucId: 'UCq-Fj5jknLsUf-MWSy4_brA', title: 'T-Series', handle: '@tseries' })).toBe(false);
  });

  it('still filters YouTube feed curators and navigation entries', () => {
    expect(isSystemChannelOrCurator({ ucId: 'UC-9-kyTW8ZkZNDHQJ6FgpwQ', title: 'Music' })).toBe(true);
    expect(isSystemChannelOrCurator({ ucId: 'UC4R8DWoMoI7CAwX8_LjQHig' })).toBe(true); // Live
    expect(isSystemChannelOrCurator({ ucId: 'FEsubscriptions', title: 'Subscriptions' })).toBe(true);
  });
});
