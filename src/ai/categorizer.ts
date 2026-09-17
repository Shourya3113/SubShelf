import { SubscribedChannel, CategoryDeck } from '@/types';
import { HeuristicCategorizer, SUBDECK_TAXONOMY } from './heuristic';
import { buildCategorizationPrompt } from './prompt';
import { SubDeckStorage } from '@/utils/storage';
import { Logger } from '@/utils/logger';

export class AICategorizer {
  static async categorizeAll(channels: SubscribedChannel[]): Promise<CategoryDeck[]> {
    if (channels.length === 0) return [];

    const settings = (await SubDeckStorage.getAll()).settings;
    let result: CategoryDeck[];

    switch (settings.aiProvider) {
      case 'gemini-api':
        if (settings.apiKey) {
          try {
            const cloudResult = await this.tryGeminiCloud(channels, settings.apiKey);
            if (cloudResult) {
              Logger.info('[SubShelf AI] Successfully organized using Gemini Cloud API');
              result = cloudResult;
              break;
            }
          } catch (err) {
            Logger.warn('[SubShelf AI] Gemini Cloud failed, falling back to heuristic:', err);
          }
        }
        result = HeuristicCategorizer.categorize(channels);
        break;

      case 'heuristic':
        Logger.info('[SubShelf AI] Organizing using Heuristic Categorizer');
        result = HeuristicCategorizer.categorize(channels);
        break;

      case 'gemini-nano':
      default:
        // Tier 1: Chrome Built-in AI (Gemini Nano)
        try {
          const nanoResult = await this.tryGeminiNano(channels);
          if (nanoResult) {
            Logger.info('[SubShelf AI] Successfully organized using Gemini Nano');
            result = nanoResult;
            break;
          }
        } catch (err) {
          Logger.warn('[SubShelf AI] Gemini Nano unavailable, falling back:', err);
        }

        // Tier 2: Gemini Cloud API (if user entered API key)
        if (settings.apiKey) {
          try {
            const cloudResult = await this.tryGeminiCloud(channels, settings.apiKey);
            if (cloudResult) {
              Logger.info('[SubShelf AI] Successfully organized using Gemini Cloud API');
              result = cloudResult;
              break;
            }
          } catch (err) {
            Logger.warn('[SubShelf AI] Gemini Cloud failed, falling back:', err);
          }
        }

        // Tier 3: Deterministic Keyword/Regex Heuristic
        Logger.info('[SubShelf AI] Organizing using Heuristic Categorizer');
        result = HeuristicCategorizer.categorize(channels);
        break;
    }

    // Second pass: Run channels stuck in "general-other" through heuristic to rescue them
    return this.rescueGeneralOther(result!, channels);
  }

  /**
   * Takes channels assigned to "general-other" by AI and tries to place them
   * via heuristic signatures/keywords. Only moves them if the heuristic finds
   * a match (i.e. they don't stay in general-other in the heuristic result too).
   */
  private static rescueGeneralOther(decks: CategoryDeck[], allChannels: SubscribedChannel[]): CategoryDeck[] {
    const generalDeck = decks.find(d => d.id === 'general-other');
    if (!generalDeck || generalDeck.channelIds.length === 0) return decks;

    const channelMap = new Map(allChannels.map(ch => [ch.ucId, ch]));
    const stuckChannels = generalDeck.channelIds
      .map(id => channelMap.get(id))
      .filter((ch): ch is SubscribedChannel => Boolean(ch));

    if (stuckChannels.length === 0) return decks;

    const heuristicResult = HeuristicCategorizer.categorize(stuckChannels);
    let rescued = 0;

    for (const hDeck of heuristicResult) {
      if (hDeck.id === 'general-other') continue;
      if (hDeck.channelIds.length === 0) continue;

      const targetDeck = decks.find(d => d.id === hDeck.id);
      for (const ucId of hDeck.channelIds) {
        // Move from general-other to the heuristic-matched deck
        generalDeck.channelIds = generalDeck.channelIds.filter(id => id !== ucId);
        if (targetDeck) {
          if (!targetDeck.channelIds.includes(ucId)) {
            targetDeck.channelIds.push(ucId);
          }
        } else {
          // Create the deck if AI didn't produce it
          decks.push({ ...hDeck, channelIds: [ucId] });
        }
        rescued++;
      }
    }

    if (rescued > 0) {
      Logger.info(`[SubShelf AI] Rescued ${rescued} channels from General & Others via heuristic fallback`);
    }

    return decks.filter(d => d.channelIds.length > 0);
  }

  private static async tryGeminiNano(channels: SubscribedChannel[]): Promise<CategoryDeck[] | null> {
    const ai = (self as unknown as { ai?: { languageModel?: { capabilities: () => Promise<{ available: string }>; create: () => Promise<{ prompt: (p: string) => Promise<string>; destroy: () => void }> } } }).ai;
    if (!ai?.languageModel) return null;

    const capabilities = await ai.languageModel.capabilities();
    if (capabilities.available === 'no') return null;

    const session = await ai.languageModel.create();
    try {
      const prompt = buildCategorizationPrompt(channels);
      const raw = await session.prompt(prompt);
      return this.parseAIResponse(raw, channels);
    } finally {
      session.destroy();
    }
  }

  private static async tryGeminiCloud(channels: SubscribedChannel[], apiKey: string): Promise<CategoryDeck[] | null> {
    const prompt = buildCategorizationPrompt(channels);
    // Security: Pass API key via header rather than exposing in URL query parameter
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini Cloud API error HTTP ${res.status}`);
    }

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return null;

    return this.parseAIResponse(raw, channels);
  }

  private static parseAIResponse(raw: string, channels: SubscribedChannel[]): CategoryDeck[] | null {
    try {
      const knownIds = new Set(channels.map(c => c.ucId));
      const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return null;
      }

      const safeParsed = parsed as Record<string, unknown>;

      const decks: CategoryDeck[] = SUBDECK_TAXONOMY.map((tax, idx) => {
        const rawIds = safeParsed[tax.id];
        const validIds = Array.isArray(rawIds)
          ? rawIds.filter((id): id is string => typeof id === 'string' && knownIds.has(id))
          : [];

        return {
          id: tax.id,
          name: tax.name,
          icon: tax.icon,
          color: tax.color,
          channelIds: validIds,
          isCollapsed: true,
          sortOrder: idx,
        };
      });

      const assignedIds = new Set<string>();
      decks.forEach(d => d.channelIds.forEach(id => assignedIds.add(id)));

      return decks.filter(d => d.channelIds.length > 0);
    } catch (err) {
      Logger.warn('[SubShelf AI] Failed to parse AI JSON response:', err);
      return null;
    }
  }

  /**
   * Applies user manual assignments and exclusions on top of AI/heuristic categorization.
   * Guarantees that:
   * 1. Channels explicitly removed from a category are NEVER re-added to that category.
   * 2. Channels manually assigned to folders are preserved.
   * 3. Custom folders created by the user are retained.
   * 4. Any unassigned channels land in Uncategorized.
   */
  static applyOverrides(
    categorizedDecks: CategoryDeck[],
    currentCategories: CategoryDeck[],
    manualAssignments: Record<string, string[]>,
    channelExclusions: Record<string, string[]>,
    allChannels: SubscribedChannel[]
  ): CategoryDeck[] {
    const obsoleteSystemIds = new Set([
      'education', 'tech', 'music', 'gaming', 'entertainment',
      'news-politics', 'general-other', '__uncategorized__',
    ]);
    const systemDeckNames = new Set(categorizedDecks.map(d => d.name.toLowerCase().trim()));

    // 1. Preserve custom user-created decks
    const customDecks = currentCategories.filter(c =>
      !c.isSystem &&
      !obsoleteSystemIds.has(c.id) &&
      !systemDeckNames.has(c.name.toLowerCase().trim()) &&
      !categorizedDecks.some(d => d.id === c.id)
    );

    // Deep clone combined decks
    const combinedDecks: CategoryDeck[] = [...categorizedDecks, ...customDecks].map(d => ({
      ...d,
      channelIds: [...d.channelIds],
    }));

    // 2. Filter out any AI assignments that violate user exclusions or manual assignments
    for (const deck of combinedDecks) {
      if (deck.id === '__uncategorized__') continue;

      deck.channelIds = deck.channelIds.filter(ucId => {
        // If user explicitly removed this channel from this deck -> EXCLUDE!
        const exclusions = channelExclusions[ucId] || [];
        if (exclusions.includes(deck.id)) {
          return false;
        }

        // If user manually assigned this channel to specific deck(s) -> ONLY allow in those decks!
        const manual = manualAssignments[ucId] || [];
        if (manual.length > 0 && !manual.includes(deck.id)) {
          return false;
        }

        return true;
      });
    }

    // 3. Ensure all manual assignments are respected and present in their target decks
    const allChannelIds = new Set(allChannels.map(c => c.ucId));
    for (const [ucId, targetDeckIds] of Object.entries(manualAssignments)) {
      if (!allChannelIds.has(ucId)) continue; // Skip unsubscribed channels
      for (const targetId of targetDeckIds) {
        if (targetId === '__uncategorized__') continue;
        let targetDeck = combinedDecks.find(d => d.id === targetId);
        if (!targetDeck) {
          // Check if deck existed in currentCategories (e.g. custom deck)
          const existing = currentCategories.find(c => c.id === targetId);
          if (existing) {
            targetDeck = { ...existing, channelIds: [] };
            combinedDecks.push(targetDeck);
          }
        }
        if (targetDeck && !targetDeck.channelIds.includes(ucId)) {
          targetDeck.channelIds.push(ucId);
        }
      }
    }

    // 4. Deduplicate final decks by normalized name
    const finalDecks: CategoryDeck[] = [];
    const seenNames = new Set<string>();

    for (const deck of combinedDecks) {
      if (deck.id === '__uncategorized__') continue;
      const normName = deck.name.toLowerCase().trim();
      if (!seenNames.has(normName)) {
        seenNames.add(normName);
        finalDecks.push(deck);
      } else {
        const canonical = finalDecks.find(d => d.name.toLowerCase().trim() === normName);
        if (canonical) {
          const merged = new Set([...canonical.channelIds, ...deck.channelIds]);
          canonical.channelIds = Array.from(merged);
        }
      }
    }

    // Return decks with channels or user-created custom decks
    return finalDecks.filter(d => d.channelIds.length > 0 || !d.isSystem);
  }
}
