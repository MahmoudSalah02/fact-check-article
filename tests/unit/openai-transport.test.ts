import { describe, expect, it } from "vitest";

import { interpretResponse } from "@/lib/server/openai/transport";

const COMPLETED_RESPONSE = {
  status: "completed",
  output_text: JSON.stringify({
    findings: [
      {
        id: "f1",
        sourceText: "the moon is made of cheese",
        explanation: "Authoritative sources describe the moon as rock.",
        sources: [{ url: "https://example.com/moon" }],
      },
    ],
  }),
  output: [
    {
      type: "web_search_call",
      action: {
        sources: [
          { url: "https://example.com/moon" },
          { url: "https://example.com/extra" },
        ],
      },
    },
    {
      type: "message",
      content: [
        {
          type: "output_text",
          text: "…",
          annotations: [
            { type: "url_citation", url: "https://cited.example.com/a" },
          ],
        },
      ],
    },
  ],
};

describe("interpretResponse", () => {
  it("maps queued/in_progress to pending", () => {
    expect(interpretResponse({ status: "queued" })).toEqual({
      status: "pending",
    });
    expect(interpretResponse({ status: "in_progress" })).toEqual({
      status: "pending",
    });
  });

  it("maps terminal non-success statuses to failed with a safe code", () => {
    expect(interpretResponse({ status: "failed" })).toEqual({
      status: "failed",
      errorCode: "openai_failed",
    });
    expect(interpretResponse({ status: "incomplete" })).toEqual({
      status: "failed",
      errorCode: "openai_incomplete",
    });
    expect(interpretResponse({ status: "cancelled" })).toEqual({
      status: "failed",
      errorCode: "openai_cancelled",
    });
  });

  it("parses output JSON and unions evidence from both surfaces", () => {
    const result = interpretResponse(COMPLETED_RESPONSE);
    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;

    expect(result.rawOutput).toEqual({
      findings: [
        {
          id: "f1",
          sourceText: "the moon is made of cheese",
          explanation: "Authoritative sources describe the moon as rock.",
          sources: [{ url: "https://example.com/moon" }],
        },
      ],
    });

    expect(result.evidence.availableUrls).toEqual([
      { url: "https://example.com/moon", surface: "web_search_source" },
      { url: "https://example.com/extra", surface: "web_search_source" },
      { url: "https://cited.example.com/a", surface: "url_citation" },
    ]);
    expect(result.evidence.selectedCitations).toEqual([
      {
        findingId: "f1",
        url: "https://example.com/moon",
        supports: "Authoritative sources describe the moon as rock.",
      },
    ]);
  });

  it("throws when a completed response has no output text", () => {
    expect(() => interpretResponse({ status: "completed" })).toThrow();
  });

  it("tolerates a ```json fence and surrounding prose (no JSON mode)", () => {
    const fenced = interpretResponse({
      status: "completed",
      output_text: '```json\n{"findings":[]}\n```',
    });
    expect(fenced).toMatchObject({
      status: "completed",
      rawOutput: { findings: [] },
    });

    const prose = interpretResponse({
      status: "completed",
      output_text: 'Here is the result:\n{"findings":[]}\nDone.',
    });
    expect(prose).toMatchObject({
      status: "completed",
      rawOutput: { findings: [] },
    });
  });
});
