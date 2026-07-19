import {
  CreateRunInputSchema,
  CreateRunResultSchema,
  GetRunResultSchema,
  type CreateRunInput,
  type CreateRunResult,
  type GetRunResult,
  type RunClient,
} from "@/lib/contracts";
import { prepareFixtureFindings } from "@/lib/server/fixture-findings";
import type { AnalysisProvider } from "@/lib/analysis/provider";
import type {
  DocumentRepository,
  RunRepository,
} from "@/lib/server/repositories";

export class FakeRunClient implements RunClient {
  constructor(
    private readonly documents: DocumentRepository,
    private readonly runs: RunRepository,
    private readonly analysis: AnalysisProvider,
    private readonly checkedAt: string,
  ) {}

  async createRun(input: CreateRunInput): Promise<CreateRunResult> {
    const parsed = CreateRunInputSchema.parse(input);
    const document = await this.documents.create({
      userId: "local-fixture-user",
      title: parsed.title,
      originalText: parsed.text,
    });
    const run = await this.runs.create(document.id, this.checkedAt);
    try {
      const submission = await this.analysis.start({
        runId: run.id,
        articleText: document.originalText,
        checkedAt: run.checkedAt,
      });
      await this.runs.markInProgress(run.id, submission.providerRunId);

      const output = await this.analysis.retrieve(submission.providerRunId);
      const findings = prepareFixtureFindings(
        document.originalText,
        run.checkedAt,
        output.findings,
      );
      const completed = await this.runs.complete(run.id, findings);

      return CreateRunResultSchema.parse({
        runId: completed.id,
        status: completed.status,
        createdAt: completed.createdAt,
      });
    } catch (error) {
      await this.runs.fail(run.id, "fixture_analysis_failed");
      throw error;
    }
  }

  async getRun(runId: string): Promise<GetRunResult> {
    const run = await this.runs.getById(runId);
    if (!run) throw new Error("Run not found");
    const document = await this.documents.getById(run.documentId);
    if (!document) throw new Error("Document not found");

    return GetRunResultSchema.parse({
      run,
      document,
      findings: await this.runs.getFindings(runId),
    });
  }
}
