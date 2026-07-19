import type { AnalysisOutput } from "@/lib/contracts";

// TODO(M3): Implement Responses background submission, retrieval, and signed webhook handling.
// Acceptance: transport SDK types never cross this server adapter boundary.
export interface OpenAITransport {
  start(
    articleText: string,
    checkedAt: string,
  ): Promise<{ responseId: string }>;
  retrieve(responseId: string): Promise<AnalysisOutput>;
}
