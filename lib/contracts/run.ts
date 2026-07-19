import { z } from "zod";

import { FindingSchema } from "@/lib/contracts/finding";

export const RunStatusSchema = z.enum([
  "queued",
  "in_progress",
  "completed",
  "failed",
]);

export const DocumentSchema = z
  .object({
    id: z.uuid(),
    userId: z.string().min(1),
    title: z.string().trim().min(1).max(200).nullable(),
    originalText: z.string().min(1).max(20_000),
    createdAt: z.iso.datetime(),
  })
  .strict();

export const AnalysisRunSchema = z
  .object({
    id: z.uuid(),
    documentId: z.uuid(),
    status: RunStatusSchema,
    checkedAt: z.iso.date(),
    model: z.string().min(1).nullable(),
    providerResponseId: z.string().min(1).nullable(),
    errorCode: z.string().min(1).nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const EditDecisionSchema = z
  .object({
    findingId: z.string().min(1),
    decision: z.enum(["accepted", "rejected", "restored"]),
    decidedAt: z.iso.datetime(),
  })
  .strict();

export const RunViewSchema = z
  .object({
    run: AnalysisRunSchema,
    document: DocumentSchema,
    findings: z.array(FindingSchema).nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.run.status === "completed" && value.findings === null) {
      context.addIssue({
        code: "custom",
        path: ["findings"],
        message: "Completed runs must expose a findings array",
      });
    }
    if (value.run.status !== "completed" && value.findings !== null) {
      context.addIssue({
        code: "custom",
        path: ["findings"],
        message: "Non-completed runs cannot expose partial findings",
      });
    }
  });

export type RunStatus = z.infer<typeof RunStatusSchema>;
export type Document = z.infer<typeof DocumentSchema>;
export type AnalysisRun = z.infer<typeof AnalysisRunSchema>;
export type EditDecision = z.infer<typeof EditDecisionSchema>;
export type RunView = z.infer<typeof RunViewSchema>;
