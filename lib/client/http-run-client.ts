import type {
  CreateRunInput,
  CreateRunResult,
  GetRunResult,
  RunClient,
} from "@/lib/contracts";

// TODO(F5): Implement authenticated submission and visibility-aware polling.
// Acceptance: refresh restores a run and all API payloads pass the shared schemas.
export class HttpRunClient implements RunClient {
  async createRun(input: CreateRunInput): Promise<CreateRunResult> {
    void input;
    throw new Error("The HTTP run client is not implemented until F5");
  }

  async getRun(runId: string): Promise<GetRunResult> {
    void runId;
    throw new Error("The HTTP run client is not implemented until F5");
  }
}
