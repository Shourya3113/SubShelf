/**
 * Output schemas for the categorization prompt. Both models are constrained to an object whose keys
 * are exactly the taxonomy IDs and whose values only contain the channel references of the current
 * batch ("c0", "c1", ...), so a response can't be malformed or invent channels.
 */

/** Standard JSON Schema, used as the Prompt API's `responseConstraint` (Gemini Nano). */
export function categorizationJsonSchema(categoryIds: string[], refs: string[]): Record<string, unknown> {
  const list = { type: 'array', items: { type: 'string', enum: refs } };
  return {
    type: 'object',
    properties: Object.fromEntries(categoryIds.map(id => [id, list])),
    required: categoryIds,
    additionalProperties: false,
  };
}

/** Gemini API `responseSchema` (OpenAPI subset: upper-case types, no additionalProperties). */
export function categorizationGeminiSchema(categoryIds: string[], refs: string[]): Record<string, unknown> {
  const list = { type: 'ARRAY', items: { type: 'STRING', enum: refs } };
  return {
    type: 'OBJECT',
    properties: Object.fromEntries(categoryIds.map(id => [id, list])),
    required: categoryIds,
  };
}
