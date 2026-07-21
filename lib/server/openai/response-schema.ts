// Structured Outputs schema handed to the Responses API so the model returns
// exactly the AnalysisOutput shape (field names, enums, required, nullability)
// instead of improvising (e.g. `citations` markdown strings). This guarantees
// the SHAPE; the Zod AnalysisOutputSchema still enforces the finer rules
// (lengths, uniqueness, replacement policy, evidence cross-checks) downstream.
//
// Strict mode requires every property to be listed in `required` and
// `additionalProperties: false` on every object; nullability is expressed with
// a `["type", "null"]` type array. Server-owned fields (offsets, checkedAt) are
// intentionally absent — the server derives those after validation.

const SOURCE = {
  type: "object",
  additionalProperties: false,
  properties: {
    url: { type: "string" },
    title: { type: "string" },
    publisher: { type: ["string", "null"] },
    publishedAt: { type: ["string", "null"] },
  },
  required: ["url", "title", "publisher", "publishedAt"],
} as const;

const FINDING = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    sourceText: { type: "string" },
    prefixText: { type: ["string", "null"] },
    suffixText: { type: ["string", "null"] },
    claimType: { type: "string", enum: ["fact", "forecast", "opinion"] },
    verdict: {
      type: "string",
      enum: [
        "verified",
        "outdated",
        "contradicted",
        "unsupported",
        "needs_context",
        "unresolved",
        "opinion",
      ],
    },
    forecastStatus: {
      type: ["string", "null"],
      enum: [
        "pending",
        "on_track",
        "revised",
        "fulfilled",
        "missed",
        "not_measurable",
        null,
      ],
    },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    explanation: { type: "string" },
    replacement: { type: ["string", "null"] },
    sources: { type: "array", items: SOURCE },
  },
  required: [
    "id",
    "sourceText",
    "prefixText",
    "suffixText",
    "claimType",
    "verdict",
    "forecastStatus",
    "confidence",
    "explanation",
    "replacement",
    "sources",
  ],
} as const;

export const ANALYSIS_RESPONSE_FORMAT = {
  type: "json_schema",
  name: "pulsecheck_analysis",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: { findings: { type: "array", items: FINDING } },
    required: ["findings"],
  },
} as const;
