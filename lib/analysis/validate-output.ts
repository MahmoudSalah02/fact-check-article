import {
  AnalysisOutputSchema,
  type AnalysisFinding,
  type AnalysisOutput,
} from "@/lib/contracts";
import { resolveFindingSpans } from "@/lib/domain/resolve-spans";

export type EvidenceSurface = "web_search_source" | "url_citation";

export type AvailableEvidenceUrl = {
  url: string;
  surface: EvidenceSurface;
};

export type SelectedCitation = {
  findingId: string;
  url: string;
  supports: string;
};

export type AnalysisEvidence = {
  availableUrls: readonly AvailableEvidenceUrl[];
  selectedCitations: readonly SelectedCitation[];
};

export type AnalysisValidationInput = {
  articleText: string;
  checkedAt: string;
  rawOutput: unknown;
  evidence: AnalysisEvidence;
};

const EVIDENCE_REQUIRED_VERDICTS = new Set([
  "verified",
  "outdated",
  "contradicted",
  "needs_context",
]);

function canonicalizeUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Evidence URL is malformed: ${value}`);
  }
  if (url.protocol !== "https:") {
    throw new Error(`Evidence URL must use HTTPS: ${value}`);
  }
  url.hash = "";
  return url.toString();
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function validateReplacementIsSurgical(
  articleText: string,
  finding: AnalysisFinding,
): void {
  const replacement = finding.replacement;
  if (replacement === null) return;

  if (replacement !== replacement.trim()) {
    throw new Error(
      `Finding "${finding.id}" replacement has surrounding whitespace`,
    );
  }
  if (replacement === finding.sourceText) {
    throw new Error(
      `Finding "${finding.id}" replacement does not change the source quote`,
    );
  }
  if (replacement === articleText) {
    throw new Error(
      `Finding "${finding.id}" replacement rewrites the entire article`,
    );
  }
}

function validateFindingEvidence(
  finding: AnalysisFinding,
  availableUrls: Set<string>,
  selectedCitations: readonly SelectedCitation[],
): void {
  if (
    EVIDENCE_REQUIRED_VERDICTS.has(finding.verdict) &&
    finding.sources.length === 0
  ) {
    throw new Error(
      `Finding "${finding.id}" verdict ${finding.verdict} requires cited evidence`,
    );
  }

  for (const source of finding.sources) {
    const sourceUrl = canonicalizeUrl(source.url);
    if (!availableUrls.has(sourceUrl)) {
      throw new Error(
        `Finding "${finding.id}" source was not present in search or citation metadata: ${source.url}`,
      );
    }

    const selection = selectedCitations.find(
      (candidate) =>
        candidate.findingId === finding.id &&
        canonicalizeUrl(candidate.url) === sourceUrl,
    );
    if (!selection) {
      throw new Error(
        `Finding "${finding.id}" source was consulted but not selected as supporting evidence: ${source.url}`,
      );
    }

    const supportStatement = normalizeText(selection.supports);
    if (supportStatement.length === 0) {
      throw new Error(
        `Finding "${finding.id}" citation must state what it supports`,
      );
    }
    if (!normalizeText(finding.explanation).includes(supportStatement)) {
      throw new Error(
        `Finding "${finding.id}" explanation does not state the selected citation support`,
      );
    }
  }
}

export function parseAndValidateAnalysisOutput({
  articleText,
  checkedAt,
  rawOutput,
  evidence,
}: AnalysisValidationInput): AnalysisOutput {
  const output = AnalysisOutputSchema.parse(rawOutput);
  const availableUrls = new Set(
    evidence.availableUrls.map(({ url }) => canonicalizeUrl(url)),
  );
  const findingsById = new Map(
    output.findings.map((finding) => [finding.id, finding]),
  );

  for (const selection of evidence.selectedCitations) {
    const finding = findingsById.get(selection.findingId);
    if (!finding) {
      throw new Error(
        `Citation selects unknown finding "${selection.findingId}"`,
      );
    }
    const selectedUrl = canonicalizeUrl(selection.url);
    if (!availableUrls.has(selectedUrl)) {
      throw new Error(
        `Selected citation was not present in search or citation metadata: ${selection.url}`,
      );
    }
    if (
      !finding.sources.some(({ url }) => canonicalizeUrl(url) === selectedUrl)
    ) {
      throw new Error(
        `Selected citation is not attached to finding "${selection.findingId}": ${selection.url}`,
      );
    }
  }

  for (const finding of output.findings) {
    if (finding.claimType === "forecast" && finding.forecastStatus === null) {
      throw new Error(
        `Forecast finding "${finding.id}" requires a forecastStatus`,
      );
    }
    validateReplacementIsSurgical(articleText, finding);
    validateFindingEvidence(finding, availableUrls, evidence.selectedCitations);
  }

  resolveFindingSpans(articleText, output.findings, checkedAt);
  return structuredClone(output);
}
