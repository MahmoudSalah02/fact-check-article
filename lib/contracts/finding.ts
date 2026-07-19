import { z } from "zod";

export const ClaimTypeSchema = z.enum(["fact", "forecast", "opinion"]);
export const VerdictSchema = z.enum([
  "verified",
  "outdated",
  "contradicted",
  "unsupported",
  "needs_context",
  "unresolved",
  "opinion",
]);
export const ForecastStatusSchema = z.enum([
  "pending",
  "on_track",
  "revised",
  "fulfilled",
  "missed",
  "not_measurable",
]);
export const ConfidenceSchema = z.enum(["high", "medium", "low"]);

export const SourceSchema = z
  .object({
    url: z
      .url()
      .refine(
        (value) => new URL(value).protocol === "https:",
        "Source URL must use HTTPS",
      ),
    title: z.string().trim().min(1).max(500),
    publisher: z.string().trim().min(1).max(200).nullable(),
    publishedAt: z.iso.date().nullable(),
  })
  .strict();

const analysisFindingShape = {
  id: z.string().trim().min(1).max(128),
  sourceText: z.string().min(1).max(20_000),
  prefixText: z.string().max(200).nullable(),
  suffixText: z.string().max(200).nullable(),
  claimType: ClaimTypeSchema,
  verdict: VerdictSchema,
  forecastStatus: ForecastStatusSchema.nullable(),
  confidence: ConfidenceSchema,
  explanation: z.string().trim().min(1).max(1_000),
  replacement: z.string().min(1).max(20_000).nullable(),
  sources: z.array(SourceSchema).max(10),
} as const;

type FindingLike = {
  claimType: z.infer<typeof ClaimTypeSchema>;
  verdict: z.infer<typeof VerdictSchema>;
  forecastStatus: z.infer<typeof ForecastStatusSchema> | null;
  confidence: z.infer<typeof ConfidenceSchema>;
  replacement: string | null;
  sources: Array<z.infer<typeof SourceSchema>>;
};

function validateFindingPolicy(value: FindingLike, context: z.RefinementCtx) {
  if (value.claimType !== "forecast" && value.forecastStatus !== null) {
    context.addIssue({
      code: "custom",
      path: ["forecastStatus"],
      message: "forecastStatus is only valid for forecast claims",
    });
  }

  if (value.claimType === "opinion" && value.verdict !== "opinion") {
    context.addIssue({
      code: "custom",
      path: ["verdict"],
      message: "Opinion claims must use the opinion verdict",
    });
  }

  if (value.verdict === "opinion" && value.claimType !== "opinion") {
    context.addIssue({
      code: "custom",
      path: ["claimType"],
      message: "The opinion verdict requires an opinion claim",
    });
  }

  if (value.replacement !== null) {
    const editableVerdicts = new Set([
      "outdated",
      "contradicted",
      "needs_context",
    ]);
    if (
      value.confidence !== "high" ||
      !editableVerdicts.has(value.verdict) ||
      value.sources.length === 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["replacement"],
        message:
          "A replacement requires high confidence, an editable verdict, and at least one source",
      });
    }
  }
}

export const AnalysisFindingSchema = z
  .object(analysisFindingShape)
  .strict()
  .superRefine(validateFindingPolicy);

export const AnalysisOutputSchema = z
  .object({
    findings: z.array(AnalysisFindingSchema).max(25),
  })
  .strict()
  .superRefine((value, context) => {
    const ids = new Set<string>();
    for (const [index, finding] of value.findings.entries()) {
      if (ids.has(finding.id)) {
        context.addIssue({
          code: "custom",
          path: ["findings", index, "id"],
          message: "Finding IDs must be unique",
        });
      }
      ids.add(finding.id);
    }
  });

export const FindingSchema = z
  .object({
    ...analysisFindingShape,
    startOffset: z.number().int().nonnegative(),
    endOffset: z.number().int().positive(),
    checkedAt: z.iso.date(),
  })
  .strict()
  .superRefine((value, context) => {
    validateFindingPolicy(value, context);
    if (value.endOffset !== value.startOffset + value.sourceText.length) {
      context.addIssue({
        code: "custom",
        path: ["endOffset"],
        message:
          "Offsets must exactly cover sourceText using JavaScript UTF-16 indices",
      });
    }
  });

export type ClaimType = z.infer<typeof ClaimTypeSchema>;
export type Verdict = z.infer<typeof VerdictSchema>;
export type ForecastStatus = z.infer<typeof ForecastStatusSchema>;
export type Confidence = z.infer<typeof ConfidenceSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type AnalysisFinding = z.infer<typeof AnalysisFindingSchema>;
export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;
export type Finding = z.infer<typeof FindingSchema>;
