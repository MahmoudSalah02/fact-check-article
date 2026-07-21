import { describe, expect, it } from "vitest";

import type { AnalysisEvidence } from "@/lib/analysis/validate-output";
import { AnalysisOutputSchema } from "@/lib/contracts";
import {
  normalizeReplacements,
  resolveModelFindings,
} from "@/lib/server/analysis-completion";

// Simulate the web-search surface: every cited URL was consulted, and each
// citation supports its finding's explanation (mirrors the transport's evidence
// extraction on a real response).
function evidenceFrom(raw: {
  findings: {
    id: string;
    explanation: string;
    sources: { url: string }[];
  }[];
}): AnalysisEvidence {
  return {
    availableUrls: raw.findings.flatMap((finding) =>
      finding.sources.map((source) => ({
        url: source.url,
        surface: "web_search_source" as const,
      })),
    ),
    selectedCitations: raw.findings.flatMap((finding) =>
      finding.sources.map((source) => ({
        findingId: finding.id,
        url: source.url,
        supports: finding.explanation,
      })),
    ),
  };
}

const ARTICLE =
  "Baidu just open-sourced an OCR model that reads entire 40-page documents in one shot.\n\nIt's called Unlimited-OCR. 3 billion parameters but only 500 million active during inference. Runs 100% locally on your machine.\n\nWhy this matters: traditional OCR tools chop documents page by page. Tables that span two pages break. Reading order gets lost. Cross-page context disappears.\n\nUnlimited-OCR processes the whole document at once. 32K context window. Text, formulas, tables, reading order all preserved across pages.\n\nOutput comes out as clean structured Markdown.\n\n→ 93% accuracy on the standard benchmark. +6 points over the baseline.\n→ Error rate stays below 0.11 even past 40 pages.\n→ Multilingual out of the box.\n→ 2.12 million downloads on Hugging Face last month. 14,600 GitHub\nstars.\n\nFor context: Amazon Textract, Google Cloud Vision, and Azure Document Intelligence all charge per page. This runs locally for free.";

// Exact model output from the failing run (log pasted by the user).
const RAW = {
  findings: [
    {
      id: "f1",
      sourceText:
        "Baidu just open-sourced an OCR model that reads entire 40-page documents in one shot.",
      prefixText: null,
      suffixText: "\n\nIt's called Unlimited-OCR.",
      claimType: "fact",
      verdict: "verified",
      forecastStatus: null,
      confidence: "high",
      explanation:
        "The technical report says Unlimited-OCR can transcribe dozens of pages in one forward pass and reports testing with 40-plus-page inputs.",
      replacement: null,
      sources: [
        {
          url: "https://arxiv.org/abs/2606.23050",
          title: "Unlimited OCR Works",
          publisher: "arXiv",
          publishedAt: "2026-06-22",
        },
      ],
    },
    {
      id: "f2",
      sourceText:
        "It's called Unlimited-OCR. 3 billion parameters but only 500 million active during inference.",
      prefixText:
        "Baidu just open-sourced an OCR model that reads entire 40-page documents in one shot.\n\n",
      suffixText: " Runs 100% locally on your machine.",
      claimType: "fact",
      verdict: "verified",
      forecastStatus: null,
      confidence: "high",
      explanation:
        "The official model card lists 3B parameters, and the paper describes the inherited MoE architecture with 0.5B activated parameters during inference.",
      replacement: null,
      sources: [
        {
          url: "https://huggingface.co/baidu/Unlimited-OCR",
          title: "baidu/Unlimited-OCR",
          publisher: "Hugging Face",
          publishedAt: null,
        },
      ],
    },
    {
      id: "f3",
      sourceText: "Runs 100% locally on your machine.",
      prefixText:
        "It's called Unlimited-OCR. 3 billion parameters but only 500 million active during inference.",
      suffixText: "\n\nWhy this matters:",
      claimType: "fact",
      verdict: "needs_context",
      forecastStatus: null,
      confidence: "high",
      explanation:
        "Local inference is supported, but the official instructions specify tested NVIDIA GPU and CUDA requirements, so this does not mean it runs on every machine without suitable hardware or setup.",
      replacement:
        "Can run locally with supported hardware and software; the official setup was tested on NVIDIA GPUs with CUDA 12.9.",
      sources: [
        {
          url: "https://github.com/baidu/Unlimited-OCR",
          title: "baidu/Unlimited-OCR",
          publisher: "GitHub",
          publishedAt: null,
        },
      ],
    },
    {
      id: "f4",
      sourceText:
        "traditional OCR tools chop documents page by page. Tables that span two pages break. Reading order gets lost. Cross-page context disappears.",
      prefixText: "Why this matters: ",
      suffixText: "\n\nUnlimited-OCR processes the whole document at once.",
      claimType: "fact",
      verdict: "needs_context",
      forecastStatus: null,
      confidence: "medium",
      explanation:
        "The paper supports page-by-page processing as a limitation of many existing OCR models, but the article generalizes that behavior to all traditional OCR tools.",
      replacement:
        "Many OCR systems process pages separately, which can make cross-page tables, reading order, and context harder to preserve.",
      sources: [
        {
          url: "https://arxiv.org/abs/2606.23050",
          title: "Unlimited OCR Works",
          publisher: "arXiv",
          publishedAt: "2026-06-22",
        },
      ],
    },
    {
      id: "f5",
      sourceText:
        "Unlimited-OCR processes the whole document at once. 32K context window.",
      prefixText:
        "Tables that span two pages break. Reading order gets lost. Cross-page context disappears.\n\n",
      suffixText:
        " Text, formulas, tables, reading order all preserved across pages.",
      claimType: "fact",
      verdict: "verified",
      forecastStatus: null,
      confidence: "high",
      explanation:
        "The official code uses multi-page inference with a maximum length of 32,768 tokens, and the paper describes multi-page one-shot parsing.",
      replacement: null,
      sources: [
        {
          url: "https://github.com/baidu/Unlimited-OCR",
          title: "baidu/Unlimited-OCR",
          publisher: "GitHub",
          publishedAt: null,
        },
      ],
    },
    {
      id: "f6",
      sourceText:
        "Text, formulas, tables, reading order all preserved across pages.",
      prefixText:
        "Unlimited-OCR processes the whole document at once. 32K context window. ",
      suffixText: "\n\nOutput comes out as clean structured Markdown.",
      claimType: "fact",
      verdict: "needs_context",
      forecastStatus: null,
      confidence: "medium",
      explanation:
        "The paper evaluates text content, formatting, and reading order and describes document parsing, but all preserved is an absolute quality claim not established for every document.",
      replacement:
        "It is designed to preserve text, formulas, tables, formatting, and reading order across multi-page documents.",
      sources: [
        {
          url: "https://arxiv.org/abs/2606.23050",
          title: "Unlimited OCR Works",
          publisher: "arXiv",
          publishedAt: "2026-06-22",
        },
      ],
    },
    {
      id: "f7",
      sourceText: "Output comes out as clean structured Markdown.",
      prefixText:
        "Text, formulas, tables, reading order all preserved across pages.\n\n",
      suffixText: "\n\n→ 93% accuracy on the standard benchmark.",
      claimType: "fact",
      verdict: "unsupported",
      forecastStatus: null,
      confidence: "low",
      explanation:
        "The official Baidu model card and paper establish structured document parsing but do not clearly document Markdown as the guaranteed output format.",
      replacement: null,
      sources: [
        {
          url: "https://github.com/baidu/Unlimited-OCR",
          title: "baidu/Unlimited-OCR",
          publisher: "GitHub",
          publishedAt: null,
        },
      ],
    },
    {
      id: "f8",
      sourceText:
        "93% accuracy on the standard benchmark. +6 points over the baseline.",
      prefixText: "Output comes out as clean structured Markdown.\n\n",
      suffixText: "\n→ Error rate stays below 0.11 even past 40 pages.",
      claimType: "fact",
      verdict: "needs_context",
      forecastStatus: null,
      confidence: "high",
      explanation:
        "The paper reports 93.92% on OmniDocBench v1.6, but the article does not identify the benchmark version or establish a directly comparable six-point baseline comparison.",
      replacement:
        "The paper reports a 93.92% overall score on OmniDocBench v1.6.",
      sources: [
        {
          url: "https://arxiv.org/abs/2606.23050",
          title: "Unlimited OCR Works",
          publisher: "arXiv",
          publishedAt: "2026-06-22",
        },
      ],
    },
    {
      id: "f9",
      sourceText: "Error rate stays below 0.11 even past 40 pages.",
      prefixText:
        "→ 93% accuracy on the standard benchmark. +6 points over the baseline.\n",
      suffixText: "\n→ Multilingual out of the box.",
      claimType: "fact",
      verdict: "verified",
      forecastStatus: null,
      confidence: "high",
      explanation:
        "The paper reports that at 40-plus pages the edit distance remains below 0.11, alongside a 97% Distinct-35 score.",
      replacement: null,
      sources: [
        {
          url: "https://arxiv.org/abs/2606.23050",
          title: "Unlimited OCR Works",
          publisher: "arXiv",
          publishedAt: "2026-06-22",
        },
      ],
    },
    {
      id: "f10",
      sourceText: "Multilingual out of the box.",
      prefixText: "→ Error rate stays below 0.11 even past 40 pages.\n",
      suffixText: "\n→ 2.12 million downloads on Hugging Face last month.",
      claimType: "fact",
      verdict: "verified",
      forecastStatus: null,
      confidence: "medium",
      explanation:
        "The official Hugging Face model card labels Unlimited-OCR as multilingual, although the article does not specify the languages or language-specific accuracy.",
      replacement: null,
      sources: [
        {
          url: "https://huggingface.co/baidu/Unlimited-OCR",
          title: "baidu/Unlimited-OCR",
          publisher: "Hugging Face",
          publishedAt: null,
        },
      ],
    },
    {
      id: "f11",
      sourceText:
        "2.12 million downloads on Hugging Face last month. 14,600 GitHub\nstars.",
      prefixText:
        "→ Error rate stays below 0.11 even past 40 pages.\n→ Multilingual out of the box.\n",
      suffixText: "\n\nFor context:",
      claimType: "fact",
      verdict: "outdated",
      forecastStatus: null,
      confidence: "high",
      explanation:
        "On the July 21, 2026 check, the Hugging Face model card displayed 2,122,848 downloads in the last month, while the GitHub repository displayed 15.6k stars rather than 14,600.",
      replacement:
        "On July 21, 2026, the model card showed 2,122,848 Hugging Face downloads in the last month and the GitHub repository showed 15.6k stars.",
      sources: [
        {
          url: "https://huggingface.co/baidu/Unlimited-OCR",
          title: "baidu/Unlimited-OCR",
          publisher: "Hugging Face",
          publishedAt: null,
        },
        {
          url: "https://github.com/baidu/Unlimited-OCR",
          title: "baidu/Unlimited-OCR",
          publisher: "GitHub",
          publishedAt: null,
        },
      ],
    },
    {
      id: "f12",
      sourceText:
        "Amazon Textract, Google Cloud Vision, and Azure Document Intelligence all charge per page.",
      prefixText: "For context: ",
      suffixText: " This runs locally for free.",
      claimType: "fact",
      verdict: "needs_context",
      forecastStatus: null,
      confidence: "high",
      explanation:
        "The services use page- or page-equivalent usage billing, but the word all omits their free tiers and differing billing units and plans.",
      replacement:
        "These cloud services bill document processing by pages or page-equivalent units and offer limited free tiers.",
      sources: [
        {
          url: "https://aws.amazon.com/textract/pricing/",
          title: "Textract Pricing",
          publisher: "Amazon Web Services",
          publishedAt: null,
        },
        {
          url: "https://cloud.google.com/vision/pricing",
          title: "Cloud Vision API Pricing",
          publisher: "Google Cloud",
          publishedAt: null,
        },
        {
          url: "https://azure.microsoft.com/en-us/pricing/details/document-intelligence/",
          title: "Azure Document Intelligence Pricing",
          publisher: "Microsoft Azure",
          publishedAt: null,
        },
      ],
    },
    {
      id: "f13",
      sourceText: "This runs locally for free.",
      prefixText:
        "Amazon Textract, Google Cloud Vision, and Azure Document Intelligence all charge per page. ",
      suffixText: null,
      claimType: "fact",
      verdict: "needs_context",
      forecastStatus: null,
      confidence: "high",
      explanation:
        "Open-source local execution can avoid API charges, but it still requires compatible hardware, software, electricity, and setup costs.",
      replacement:
        "Local execution avoids per-page API charges but still requires compatible hardware and operating costs.",
      sources: [
        {
          url: "https://github.com/baidu/Unlimited-OCR",
          title: "baidu/Unlimited-OCR",
          publisher: "GitHub",
          publishedAt: null,
        },
      ],
    },
  ],
};

describe("M3 completion on the real failing trace", () => {
  it("strict validation rejects the raw output (medium-confidence replacements)", () => {
    expect(() => AnalysisOutputSchema.parse(RAW)).toThrow();
  });

  it("the lenient pipeline recovers all 13 findings", () => {
    const rawFindings = (normalizeReplacements(RAW) as { findings: unknown[] })
      .findings;
    const findings = resolveModelFindings(
      ARTICLE,
      "2026-07-21",
      rawFindings,
      evidenceFrom(RAW),
    );

    // Nothing dropped: f3's unique quote resolves despite its imprecise anchor.
    expect(findings).toHaveLength(13);
    // Every resolved span exactly matches the article text at its offsets.
    for (const finding of findings) {
      expect(ARTICLE.slice(finding.startOffset, finding.endOffset)).toBe(
        finding.sourceText,
      );
    }
    // f4 and f6 (medium confidence) lost their replacement; the five
    // high-confidence editable findings kept theirs.
    expect(
      findings.filter((finding) => finding.replacement !== null),
    ).toHaveLength(5);
  });
});

describe("resolveModelFindings resilience", () => {
  const baseFinding = {
    id: "x",
    prefixText: null,
    suffixText: null,
    claimType: "fact" as const,
    verdict: "verified" as const,
    forecastStatus: null,
    confidence: "high" as const,
    explanation: "Supported by the cited source.",
    replacement: null,
    sources: [
      {
        url: "https://example.com/a",
        title: "A",
        publisher: null,
        publishedAt: null,
      },
    ],
  };
  const evidence: AnalysisEvidence = {
    availableUrls: [
      { url: "https://example.com/a", surface: "web_search_source" },
    ],
    selectedCitations: [
      {
        findingId: "x",
        url: "https://example.com/a",
        supports: "Supported by the cited source.",
      },
    ],
  };

  it("resolves a whitespace-normalized quote and rewrites sourceText", () => {
    const article = "The repo has 14,600 GitHub\nstars today.";
    const findings = resolveModelFindings(
      article,
      "2026-07-21",
      [{ ...baseFinding, sourceText: "14,600 GitHub stars" }],
      evidence,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.sourceText).toBe("14,600 GitHub\nstars");
    expect(
      article.slice(findings[0]!.startOffset, findings[0]!.endOffset),
    ).toBe("14,600 GitHub\nstars");
  });

  it("drops an unlocatable finding instead of failing the batch", () => {
    const article = "Only this sentence exists.";
    const findings = resolveModelFindings(
      article,
      "2026-07-21",
      [
        {
          ...baseFinding,
          id: "good",
          sourceText: "Only this sentence exists.",
        },
        {
          ...baseFinding,
          id: "ghost",
          sourceText: "This text is not present.",
        },
      ],
      {
        availableUrls: evidence.availableUrls,
        selectedCitations: [
          { ...evidence.selectedCitations[0]!, findingId: "good" },
          { ...evidence.selectedCitations[0]!, findingId: "ghost" },
        ],
      },
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.sourceText).toBe("Only this sentence exists.");
  });

  it("accepts a reformatted URL on a domain that was searched", () => {
    // Model cites arxiv `html`; search surfaced arxiv `abs`. Same domain → keep.
    const findings = resolveModelFindings(
      "A verified claim here.",
      "2026-07-21",
      [
        {
          ...baseFinding,
          sourceText: "A verified claim here.",
          sources: [
            {
              url: "https://arxiv.org/html/2606.23050",
              title: "Paper",
              publisher: "arXiv",
              publishedAt: null,
            },
          ],
        },
      ],
      {
        availableUrls: [
          {
            url: "https://arxiv.org/abs/2606.23050",
            surface: "web_search_source",
          },
        ],
        selectedCitations: [],
      },
    );
    expect(findings).toHaveLength(1);
  });

  it("drops a finding whose sources are not on the search surface", () => {
    const findings = resolveModelFindings(
      "A verified claim here.",
      "2026-07-21",
      [
        {
          ...baseFinding,
          sourceText: "A verified claim here.",
          sources: [
            {
              url: "https://uncited.example.com/x",
              title: "X",
              publisher: null,
              publishedAt: null,
            },
          ],
        },
      ],
      evidence,
    );
    expect(findings).toHaveLength(0);
  });
});
