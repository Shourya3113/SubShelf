import { describe, it, expect } from 'vitest';
import {
  normalizeHandle,
  bareHandle,
  channelKey,
  resolveChannelId,
  mapHandle,
  channelAliases,
  isChannelId,
} from '@/utils/channelIdentity';
import { SubscribedChannel } from '@/types';

const UC1 = 'UC0000000000000000000001';

describe('normalizeHandle', () => {
  it('produces "@name" lowercase from every form YouTube uses', () => {
    expect(normalizeHandle('MKBHD')).toBe('@mkbhd');
    expect(normalizeHandle('@MKBHD')).toBe('@mkbhd');
    expect(normalizeHandle('/@mkbhd')).toBe('@mkbhd');
    expect(normalizeHandle('  @Fireship ')).toBe('@fireship');
  });

  it('decodes percent-encoded and keeps non-Latin handles', () => {
    expect(normalizeHandle('@%E0%A4%B9%E0%A4%BF%E0%A4%82%E0%A4%A6%E0%A5%80')).toBe('@हिंदी');
    expect(normalizeHandle('@테스트')).toBe('@테스트');
  });

  it('tolerates invalid encoding and empty input', () => {
    expect(normalizeHandle('@100%')).toBe('@100%');
    expect(normalizeHandle('')).toBe('');
    expect(normalizeHandle(undefined)).toBe('');
    expect(normalizeHandle('@')).toBe('');
  });

  it('bareHandle drops the @', () => {
    expect(bareHandle('/@MrWhoseTheBoss')).toBe('mrwhosetheboss');
  });
});

describe('channelKey', () => {
  it('prefers the UC ID, then the handle, then the title', () => {
    expect(channelKey({ ucId: UC1, handle: '@x', title: 'X' })).toBe(UC1);
    expect(channelKey({ ucId: '@x', handle: '@X', title: 'X' })).toBe('@x');
    expect(channelKey({ ucId: '', handle: '', title: ' Some Title ' })).toBe('some title');
  });
});

describe('resolveChannelId / mapHandle', () => {
  it('maps both handle forms and resolves either back to the UC ID', () => {
    const map: Record<string, string> = {};
    expect(mapHandle(map, '@Fireship', UC1)).toBe(true);
    expect(map).toEqual({ '@fireship': UC1, fireship: UC1 });
    expect(mapHandle(map, 'fireship', UC1)).toBe(false); // already mapped
    expect(resolveChannelId('@FIRESHIP', map)).toBe(UC1);
    expect(resolveChannelId('fireship', map)).toBe(UC1);
    expect(resolveChannelId(UC1, {})).toBe(UC1);
    expect(resolveChannelId('@unknown', map)).toBe('@unknown');
  });

  it('never maps to something that is not a UC ID', () => {
    const map: Record<string, string> = {};
    expect(mapHandle(map, '@x', '@x')).toBe(false);
    expect(map).toEqual({});
    expect(isChannelId('@x')).toBe(false);
  });
});

describe('channelAliases', () => {
  it('collects every identifier a channel can appear under in folders', () => {
    const channels: Record<string, SubscribedChannel> = {
      [UC1]: { ucId: UC1, title: 'Fireship', handle: '@fireship', url: '', avatarUrl: '', discoveredAt: 0 },
    };
    const aliases = channelAliases(UC1, channels, { '@fireship': UC1, fireship: UC1, '@old-name': UC1 });
    expect([...aliases].sort()).toEqual(['@fireship', '@old-name', UC1, 'fireship'].sort());
  });
});
