import {
  CreateRunInputSchema,
  CreateRunResultSchema,
  GetRunResultSchema,
  type CreateRunInput,
  type CreateRunResult,
  type GetRunResult,
  type RunClient,
} from "@/lib/contracts";

export class RunClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export class HttpRunClient implements RunClient {
  constructor(private readonly getAccessToken: () => Promise<string>) {}

  async createRun(input: CreateRunInput): Promise<CreateRunResult> {
    const response = await this.request("/api/runs", {
      method: "POST",
      body: JSON.stringify(CreateRunInputSchema.parse(input)),
      headers: { "content-type": "application/json" },
    });
    return CreateRunResultSchema.parse(await response.json());
  }

  async getRun(runId: string): Promise<GetRunResult> {
    const response = await this.request(
      `/api/runs/${encodeURIComponent(runId)}`,
    );
    return GetRunResultSchema.parse(await response.json());
  }

  async request(path: string, init: RequestInit = {}) {
    const token = await this.getAccessToken();
    const response = await fetch(path, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: unknown;
      } | null;
      throw new RunClientError(
        typeof body?.error === "string"
          ? body.error
          : "PulseCheck request failed",
        response.status,
      );
    }
    return response;
  }
}
