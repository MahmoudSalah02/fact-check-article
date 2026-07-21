import { z } from "zod";

import {
  EditDecisionSchema,
  RunStatusSchema,
  RunViewSchema,
} from "@/lib/contracts/run";

export const CreateRunInputSchema = z
  .object({
    text: z.string().min(1, "Paste an article before checking").max(20_000),
    title: z.string().trim().min(1).max(200).nullable(),
  })
  .strict();

export const CreateRunResultSchema = z
  .object({
    runId: z.uuid(),
    status: RunStatusSchema,
    createdAt: z.iso.datetime(),
  })
  .strict();

export const GetRunResultSchema = RunViewSchema;

export const RecentRunSchema = z
  .object({
    id: z.uuid(),
    title: z.string().trim().min(1).max(200),
    createdAt: z.iso.datetime(),
  })
  .strict();

export const ListRecentRunsResultSchema = z
  .object({ runs: z.array(RecentRunSchema).max(10) })
  .strict();

export const SetDecisionInputSchema = z
  .object({ decision: z.enum(["accepted", "rejected", "restored"]) })
  .strict();

export const SetDecisionResultSchema = EditDecisionSchema;

export type CreateRunInput = z.infer<typeof CreateRunInputSchema>;
export type CreateRunResult = z.infer<typeof CreateRunResultSchema>;
export type GetRunResult = z.infer<typeof GetRunResultSchema>;
export type RecentRun = z.infer<typeof RecentRunSchema>;
export type ListRecentRunsResult = z.infer<typeof ListRecentRunsResultSchema>;
export type SetDecisionInput = z.infer<typeof SetDecisionInputSchema>;
export type SetDecisionResult = z.infer<typeof SetDecisionResultSchema>;

export interface RunClient {
  createRun(input: CreateRunInput): Promise<CreateRunResult>;
  getRun(runId: string): Promise<GetRunResult>;
}
