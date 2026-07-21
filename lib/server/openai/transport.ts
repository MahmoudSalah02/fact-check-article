import "server-only";

import OpenAI from "openai";

import {
  ANALYSIS_INSTRUCTIONS,
  buildAnalysisInput,
} from "@/lib/analysis/prompt";
import type {
  AnalysisEvidence,
  AvailableEvidenceUrl,
  SelectedCitation,
} from "@/lib/analysis/validate-output";
import { ANALYSIS_RESPONSE_FORMAT } from "@/lib/server/openai/response-schema";

/**
 * Result of polling/retrieving a background Response, mapped to our domain so
 * OpenAI SDK types never cross this boundary.
 */
export type OpenAiFetchResult =
  | { status: "pending" }
  | { status: "completed"; rawOutput: unknown; evidence: AnalysisEvidence }
  | { status: "failed"; errorCode: string };

export interface OpenAiTransport {
  submit(
    articleText: string,
    checkedAt: string,
  ): Promise<{ responseId: string }>;
  fetchResult(responseId: string): Promise<OpenAiFetchResult>;
}

// The full list of URLs the web_search tool consulted is an optional field that
// must be requested via `include` on BOTH create and retrieve; otherwise the
// response omits `web_search_call.action.sources`. This surface is what the
// evidence validator cross-checks finding citations against.
const WEB_SEARCH_INCLUDE = ["web_search_call.action.sources"] as const;

export function createOpenAiTransport(): OpenAiTransport {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) {
    throw new Error(
      "OpenAI transport requires OPENAI_API_KEY and OPENAI_MODEL",
    );
  }
  const client = new OpenAI({ apiKey });

  return {
    async submit(articleText, checkedAt) {
      // Use Structured Outputs (json_schema) to enforce the response SHAPE;
      // application-level cross-field policies are validated with Zod downstream.
      // Note: JSON mode (json_object) is rejected alongside web_search, but
      // Structured Outputs (json_schema) works. tool_choice forces a search so
      // every run has an evidence surface to cross-check citations against.
      const response = await client.responses.create({
        model,
        background: true,
        store: false,
        include: [...WEB_SEARCH_INCLUDE],
        instructions: ANALYSIS_INSTRUCTIONS,
        input: buildAnalysisInput({ articleText, checkedAt }),
        tools: [{ type: "web_search" }],
        tool_choice: "required",
        text: { format: ANALYSIS_RESPONSE_FORMAT },
      });
      return { responseId: response.id };
    },

    async fetchResult(responseId) {
      const response = await client.responses.retrieve(responseId, {
        include: [...WEB_SEARCH_INCLUDE],
      });
      return interpretResponse(response);
    },
  };
}

/**
 * Map a retrieved Response to our domain result. Exported and pure so the
 * evidence-extraction and status-mapping logic — the trickiest seam — can be
 * unit-tested without the network.
 */
export function interpretResponse(response: unknown): OpenAiFetchResult {
  const status = getString(response, "status");
  if (status === "completed") {
    const rawOutput = parseOutputJson(response);
    const evidence = extractEvidence(response, rawOutput);
    return { status: "completed", rawOutput, evidence };
  }
  if (
    status === "failed" ||
    status === "cancelled" ||
    status === "incomplete"
  ) {
    return { status: "failed", errorCode: `openai_${status}` };
  }
  // queued | in_progress — not ready yet.
  return { status: "pending" };
}

function parseOutputJson(response: unknown): unknown {
  const direct = getString(response, "output_text");
  const text =
    direct && direct.length > 0 ? direct : collectOutputText(response);
  if (!text) {
    throw new Error("OpenAI response contained no output text");
  }
  return JSON.parse(extractJsonObject(text));
}

/**
 * Without JSON mode the model may wrap its object in a ```json fence or stray
 * prose, so pull out the outermost {...} before parsing. Zod then validates it.
 */
function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const body = fenced ? fenced[1] : trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  return start >= 0 && end > start ? body.slice(start, end + 1) : body;
}

function collectOutputText(response: unknown): string {
  let text = "";
  for (const item of asArray(getUnknown(response, "output"))) {
    if (getString(item, "type") !== "message") continue;
    for (const content of asArray(getUnknown(item, "content"))) {
      if (getString(content, "type") === "output_text") {
        const value = getString(content, "text");
        if (value) text += value;
      }
    }
  }
  return text;
}

/**
 * Available evidence is unioned across both surfaces the analysis validator
 * accepts — web_search tool sources and inline url_citation annotations —
 * because background + web_search can omit one or the other. Selected citations
 * are derived from the model's own finding sources.
 */
function extractEvidence(
  response: unknown,
  rawOutput: unknown,
): AnalysisEvidence {
  const availableUrls: AvailableEvidenceUrl[] = [];

  for (const item of asArray(getUnknown(response, "output"))) {
    const type = getString(item, "type");
    if (type === "web_search_call") {
      const action = getUnknown(item, "action");
      for (const source of asArray(getUnknown(action, "sources"))) {
        const url = getString(source, "url");
        if (url) availableUrls.push({ url, surface: "web_search_source" });
      }
    }
    if (type === "message") {
      for (const content of asArray(getUnknown(item, "content"))) {
        for (const annotation of asArray(getUnknown(content, "annotations"))) {
          if (getString(annotation, "type") === "url_citation") {
            const url = getString(annotation, "url");
            if (url) availableUrls.push({ url, surface: "url_citation" });
          }
        }
      }
    }
  }

  const selectedCitations: SelectedCitation[] = [];
  for (const finding of asArray(getUnknown(rawOutput, "findings"))) {
    const findingId = getString(finding, "id");
    const supports = getString(finding, "explanation");
    if (!findingId || !supports) continue;
    for (const source of asArray(getUnknown(finding, "sources"))) {
      const url = getString(source, "url");
      if (url) selectedCitations.push({ findingId, url, supports });
    }
  }

  return { availableUrls, selectedCitations };
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getUnknown(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null) return undefined;
  return (value as Record<string, unknown>)[key];
}

function getString(value: unknown, key: string): string | undefined {
  const field = getUnknown(value, key);
  return typeof field === "string" ? field : undefined;
}
