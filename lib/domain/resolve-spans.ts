import {
  AnalysisFindingSchema,
  FindingSchema,
  type AnalysisFinding,
  type Finding,
} from "@/lib/contracts";

export function resolveFindingSpans(
  articleText: string,
  findings: AnalysisFinding[],
  checkedAt: string,
): Finding[] {
  const ids = new Set<string>();

  const resolved = findings.map((untrustedFinding, index) => {
    const finding = AnalysisFindingSchema.parse(untrustedFinding);

    if (ids.has(finding.id)) {
      throw new Error(`Duplicate finding ID: ${finding.id}`);
    }
    ids.add(finding.id);

    const candidates = findOccurrences(articleText, finding.sourceText).filter(
      (startOffset) => anchorsMatch(articleText, startOffset, finding),
    );

    if (candidates.length === 0) {
      throw new Error(
        `Finding "${finding.id}" quote was not found with its supplied anchors`,
      );
    }
    if (candidates.length > 1) {
      throw new Error(
        `Finding "${finding.id}" quote is ambiguous (${candidates.length} matches)`,
      );
    }

    const startOffset = candidates[0];
    if (startOffset === undefined) {
      throw new Error(`Finding at index ${index} could not be resolved`);
    }

    return FindingSchema.parse({
      ...finding,
      startOffset,
      endOffset: startOffset + finding.sourceText.length,
      checkedAt,
    });
  });

  resolved.sort(
    (left, right) =>
      left.startOffset - right.startOffset ||
      left.endOffset - right.endOffset ||
      left.id.localeCompare(right.id),
  );

  for (let index = 1; index < resolved.length; index += 1) {
    const previous = resolved[index - 1];
    const current = resolved[index];
    if (previous && current && current.startOffset < previous.endOffset) {
      throw new Error(
        `Finding spans overlap: "${previous.id}" and "${current.id}"`,
      );
    }
  }

  return resolved;
}

function findOccurrences(text: string, quote: string): number[] {
  const occurrences: number[] = [];
  let fromIndex = 0;

  while (fromIndex <= text.length - quote.length) {
    const match = text.indexOf(quote, fromIndex);
    if (match === -1) break;
    occurrences.push(match);
    fromIndex = match + 1;
  }

  return occurrences;
}

function anchorsMatch(
  articleText: string,
  startOffset: number,
  finding: AnalysisFinding,
): boolean {
  const prefixMatches =
    finding.prefixText === null ||
    articleText.slice(0, startOffset).endsWith(finding.prefixText);
  const endOffset = startOffset + finding.sourceText.length;
  const suffixMatches =
    finding.suffixText === null ||
    articleText.slice(endOffset).startsWith(finding.suffixText);

  return prefixMatches && suffixMatches;
}

// --- Lenient, per-finding resolution for untrusted model output. -----------
// Model quotes are usually exact but their optional anchors are imprecise
// (a missing boundary space) and their whitespace can differ (\n vs space).
// The quote is the primary key; anchors only disambiguate repeats. Returns null
// instead of throwing so a single unresolvable finding can be dropped rather
// than failing the whole analysis.

export type ResolvedSpan = {
  sourceText: string;
  startOffset: number;
  endOffset: number;
};

export function resolveFindingSpanLenient(
  articleText: string,
  finding: AnalysisFinding,
): ResolvedSpan | null {
  const exact = findOccurrences(articleText, finding.sourceText);
  // A unique exact quote has one location; anchors can't add safety, so accept.
  if (exact.length === 1 && exact[0] !== undefined) {
    return spanAt(exact[0], finding.sourceText);
  }
  // Repeated quote: anchors disambiguate, tolerating boundary whitespace.
  if (exact.length > 1) {
    const anchored = exact.filter((start) =>
      anchorsMatchLoosely(articleText, start, finding),
    );
    return anchored.length === 1 && anchored[0] !== undefined
      ? spanAt(anchored[0], finding.sourceText)
      : null;
  }
  // No exact hit: retry against whitespace-normalized text (\n -> space, etc.).
  return resolveWhitespaceNormalized(articleText, finding.sourceText);
}

function spanAt(startOffset: number, sourceText: string): ResolvedSpan {
  return {
    sourceText,
    startOffset,
    endOffset: startOffset + sourceText.length,
  };
}

function anchorsMatchLoosely(
  articleText: string,
  startOffset: number,
  finding: AnalysisFinding,
): boolean {
  const before = articleText.slice(0, startOffset);
  const after = articleText.slice(startOffset + finding.sourceText.length);
  const prefixOk =
    finding.prefixText === null ||
    before.trimEnd().endsWith(finding.prefixText.trimEnd());
  const suffixOk =
    finding.suffixText === null ||
    after.trimStart().startsWith(finding.suffixText.trimStart());
  return prefixOk && suffixOk;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}

/**
 * Collapse whitespace while tracking, for each normalized character, its
 * original index — so a normalized match maps back to exact original offsets.
 */
function normalizeWithMap(text: string): { normalized: string; map: number[] } {
  const map: number[] = [];
  let normalized = "";
  let index = 0;
  while (index < text.length) {
    if (/\s/.test(text[index] as string)) {
      let end = index;
      while (end < text.length && /\s/.test(text[end] as string)) end += 1;
      // Emit a single space only between tokens (skip leading/trailing runs).
      if (normalized.length > 0 && end < text.length) {
        normalized += " ";
        map.push(index);
      }
      index = end;
    } else {
      normalized += text[index] as string;
      map.push(index);
      index += 1;
    }
  }
  return { normalized, map };
}

function resolveWhitespaceNormalized(
  articleText: string,
  sourceText: string,
): ResolvedSpan | null {
  const quote = normalizeWhitespace(sourceText);
  if (quote.length === 0) return null;

  const { normalized, map } = normalizeWithMap(articleText);
  const first = normalized.indexOf(quote);
  if (first === -1 || normalized.indexOf(quote, first + 1) !== -1) return null;

  const startOffset = map[first];
  const endMapped = map[first + quote.length - 1];
  if (startOffset === undefined || endMapped === undefined) return null;
  const endOffset = endMapped + 1;

  // The original slice becomes the authoritative sourceText so offsets and text
  // stay consistent (e.g. "GitHub\nstars" instead of the model's "GitHub stars").
  return {
    sourceText: articleText.slice(startOffset, endOffset),
    startOffset,
    endOffset,
  };
}
