import type { RecordedAnalysisCase } from "@/lib/analysis/recorded-provider";
import type {
  ClaimType,
  Confidence,
  ForecastStatus,
  Verdict,
} from "@/lib/contracts";

type EvaluationExpectation = {
  scenario:
    | "verified claim"
    | "current officeholder"
    | "changed statistic"
    | "revised forecast"
    | "absolute language"
    | "unsupported precision"
    | "opinion"
    | "internal contradiction";
  findingId: string;
  claimType: ClaimType;
  verdict: Verdict;
  forecastStatus: ForecastStatus | null;
  confidence: Confidence;
  replacement: string | null;
  sourceCount: number;
};

export type RecordedF4EvaluationCase = RecordedAnalysisCase & {
  expected: EvaluationExpectation;
};

export const RECORDED_F4_CASES = [
  {
    id: "verified-primary-register",
    articleText: "The audited 2025 register lists 42 protected wetlands.",
    checkedAt: "2026-07-20",
    rawOutput: {
      findings: [
        {
          id: "wetlands-count",
          sourceText: "The audited 2025 register lists 42 protected wetlands",
          prefixText: null,
          suffixText: ".",
          claimType: "fact",
          verdict: "verified",
          forecastStatus: null,
          confidence: "high",
          explanation:
            "The official 2025 register lists 42 protected wetlands.",
          replacement: null,
          sources: [
            {
              url: "https://data.example.gov/wetlands-2025",
              title: "Protected Wetlands Register 2025",
              publisher: "National Environment Agency",
              publishedAt: "2025-12-18",
            },
          ],
        },
      ],
    },
    evidence: {
      availableUrls: [
        {
          url: "https://data.example.gov/wetlands-2025",
          surface: "web_search_source",
        },
      ],
      selectedCitations: [
        {
          findingId: "wetlands-count",
          url: "https://data.example.gov/wetlands-2025",
          supports: "lists 42 protected wetlands",
        },
      ],
    },
    expected: {
      scenario: "verified claim",
      findingId: "wetlands-count",
      claimType: "fact",
      verdict: "verified",
      forecastStatus: null,
      confidence: "high",
      replacement: null,
      sourceCount: 1,
    },
  },
  {
    id: "outdated-current-officeholder",
    articleText:
      "The briefing says Jordan Lee is the current transport secretary.",
    checkedAt: "2026-07-20",
    rawOutput: {
      findings: [
        {
          id: "transport-secretary",
          sourceText: "Jordan Lee is the current transport secretary",
          prefixText: "The briefing says ",
          suffixText: ".",
          claimType: "fact",
          verdict: "outdated",
          forecastStatus: null,
          confidence: "high",
          explanation:
            "The official cabinet directory lists Morgan Reyes as transport secretary as of the check date.",
          replacement: "Morgan Reyes is the current transport secretary",
          sources: [
            {
              url: "https://cabinet.example.gov/transport-secretary",
              title: "Transport Secretary",
              publisher: "Cabinet Office",
              publishedAt: null,
            },
          ],
        },
      ],
    },
    evidence: {
      availableUrls: [
        {
          url: "https://cabinet.example.gov/transport-secretary",
          surface: "url_citation",
        },
      ],
      selectedCitations: [
        {
          findingId: "transport-secretary",
          url: "https://cabinet.example.gov/transport-secretary",
          supports: "lists Morgan Reyes as transport secretary",
        },
      ],
    },
    expected: {
      scenario: "current officeholder",
      findingId: "transport-secretary",
      claimType: "fact",
      verdict: "outdated",
      forecastStatus: null,
      confidence: "high",
      replacement: "Morgan Reyes is the current transport secretary",
      sourceCount: 1,
    },
  },
  {
    id: "contradicted-changed-statistic",
    articleText: "The dashboard reports that the unemployment rate is 9.1%.",
    checkedAt: "2026-07-20",
    rawOutput: {
      findings: [
        {
          id: "unemployment-rate",
          sourceText: "the unemployment rate is 9.1%",
          prefixText: "The dashboard reports that ",
          suffixText: ".",
          claimType: "fact",
          verdict: "contradicted",
          forecastStatus: null,
          confidence: "high",
          explanation:
            "The official June 2026 table reports an unemployment rate of 4.2%, not 9.1%.",
          replacement: "the unemployment rate was 4.2% in June 2026",
          sources: [
            {
              url: "https://statistics.example.gov/labour/june-2026",
              title: "Labour Market Summary — June 2026",
              publisher: "National Statistics Office",
              publishedAt: "2026-07-08",
            },
          ],
        },
      ],
    },
    evidence: {
      availableUrls: [
        {
          url: "https://statistics.example.gov/labour/june-2026",
          surface: "web_search_source",
        },
      ],
      selectedCitations: [
        {
          findingId: "unemployment-rate",
          url: "https://statistics.example.gov/labour/june-2026",
          supports: "reports an unemployment rate of 4.2%",
        },
      ],
    },
    expected: {
      scenario: "changed statistic",
      findingId: "unemployment-rate",
      claimType: "fact",
      verdict: "contradicted",
      forecastStatus: null,
      confidence: "high",
      replacement: "the unemployment rate was 4.2% in June 2026",
      sourceCount: 1,
    },
  },
  {
    id: "outdated-revised-forecast",
    articleText:
      "The outlook says the agency currently forecasts 3% growth in 2027.",
    checkedAt: "2026-07-20",
    rawOutput: {
      findings: [
        {
          id: "growth-forecast",
          sourceText: "the agency currently forecasts 3% growth in 2027",
          prefixText: "The outlook says ",
          suffixText: ".",
          claimType: "forecast",
          verdict: "outdated",
          forecastStatus: "revised",
          confidence: "high",
          explanation:
            "The agency's July 2026 outlook revises its 2027 growth forecast to 1.8%.",
          replacement:
            "the agency's July 2026 outlook forecasts 1.8% growth in 2027",
          sources: [
            {
              url: "https://economy.example.gov/outlook/july-2026",
              title: "Economic Outlook — July 2026",
              publisher: "Economic Planning Agency",
              publishedAt: "2026-07-10",
            },
          ],
        },
      ],
    },
    evidence: {
      availableUrls: [
        {
          url: "https://economy.example.gov/outlook/july-2026",
          surface: "url_citation",
        },
      ],
      selectedCitations: [
        {
          findingId: "growth-forecast",
          url: "https://economy.example.gov/outlook/july-2026",
          supports: "revises its 2027 growth forecast to 1.8%",
        },
      ],
    },
    expected: {
      scenario: "revised forecast",
      findingId: "growth-forecast",
      claimType: "forecast",
      verdict: "outdated",
      forecastStatus: "revised",
      confidence: "high",
      replacement:
        "the agency's July 2026 outlook forecasts 1.8% growth in 2027",
      sourceCount: 1,
    },
  },
  {
    id: "unsupported-absolute-language",
    articleText:
      "The summary claims every regional bridge passed its latest inspection.",
    checkedAt: "2026-07-20",
    rawOutput: {
      findings: [
        {
          id: "all-bridges-passed",
          sourceText: "every regional bridge passed its latest inspection",
          prefixText: "The summary claims ",
          suffixText: ".",
          claimType: "fact",
          verdict: "unsupported",
          forecastStatus: null,
          confidence: "low",
          explanation:
            "The universal claim cannot be established because no complete regional inspection register was available.",
          replacement: null,
          sources: [],
        },
      ],
    },
    evidence: { availableUrls: [], selectedCitations: [] },
    expected: {
      scenario: "absolute language",
      findingId: "all-bridges-passed",
      claimType: "fact",
      verdict: "unsupported",
      forecastStatus: null,
      confidence: "low",
      replacement: null,
      sourceCount: 0,
    },
  },
  {
    id: "needs-context-unsupported-precision",
    articleText:
      "The proposal states the project will cost exactly $812.4 million.",
    checkedAt: "2026-07-20",
    rawOutput: {
      findings: [
        {
          id: "exact-project-cost",
          sourceText: "the project will cost exactly $812.4 million",
          prefixText: "The proposal states ",
          suffixText: ".",
          claimType: "forecast",
          verdict: "needs_context",
          forecastStatus: "pending",
          confidence: "high",
          explanation:
            "The official estimate gives a $750 million to $900 million range rather than an exact cost.",
          replacement:
            "the project is estimated to cost between $750 million and $900 million",
          sources: [
            {
              url: "https://infrastructure.example.gov/project-cost-range",
              title: "Project Cost and Risk Estimate",
              publisher: "Infrastructure Authority",
              publishedAt: "2026-06-30",
            },
          ],
        },
      ],
    },
    evidence: {
      availableUrls: [
        {
          url: "https://infrastructure.example.gov/project-cost-range",
          surface: "web_search_source",
        },
      ],
      selectedCitations: [
        {
          findingId: "exact-project-cost",
          url: "https://infrastructure.example.gov/project-cost-range",
          supports: "gives a $750 million to $900 million range",
        },
      ],
    },
    expected: {
      scenario: "unsupported precision",
      findingId: "exact-project-cost",
      claimType: "forecast",
      verdict: "needs_context",
      forecastStatus: "pending",
      confidence: "high",
      replacement:
        "the project is estimated to cost between $750 million and $900 million",
      sourceCount: 1,
    },
  },
  {
    id: "opinion-normative-ranking",
    articleText:
      "The editorial calls this unquestionably the best transit plan.",
    checkedAt: "2026-07-20",
    rawOutput: {
      findings: [
        {
          id: "best-transit-plan",
          sourceText: "this unquestionably the best transit plan",
          prefixText: "The editorial calls ",
          suffixText: ".",
          claimType: "opinion",
          verdict: "opinion",
          forecastStatus: null,
          confidence: "high",
          explanation:
            "The absolute ranking is a subjective judgment without a defined measurable standard.",
          replacement: null,
          sources: [],
        },
      ],
    },
    evidence: { availableUrls: [], selectedCitations: [] },
    expected: {
      scenario: "opinion",
      findingId: "best-transit-plan",
      claimType: "opinion",
      verdict: "opinion",
      forecastStatus: null,
      confidence: "high",
      replacement: null,
      sourceCount: 0,
    },
  },
  {
    id: "unresolved-internal-contradiction",
    articleText:
      "The report says the program enrolled 400 students. Its conclusion says the same program enrolled 625 students.",
    checkedAt: "2026-07-20",
    rawOutput: {
      findings: [
        {
          id: "conflicting-enrollment",
          sourceText: "the program enrolled 400 students",
          prefixText: "The report says ",
          suffixText: ". Its conclusion",
          claimType: "fact",
          verdict: "unresolved",
          forecastStatus: null,
          confidence: "medium",
          explanation:
            "The article internally conflicts by reporting both 400 and 625 enrolled students, with no authoritative basis to choose one.",
          replacement: null,
          sources: [],
        },
      ],
    },
    evidence: { availableUrls: [], selectedCitations: [] },
    expected: {
      scenario: "internal contradiction",
      findingId: "conflicting-enrollment",
      claimType: "fact",
      verdict: "unresolved",
      forecastStatus: null,
      confidence: "medium",
      replacement: null,
      sourceCount: 0,
    },
  },
] as const satisfies readonly RecordedF4EvaluationCase[];
