import {
  CreateRunInputSchema,
  CreateRunResultSchema,
  FindingSchema,
  GetRunResultSchema,
  type Finding,
  type RunClient,
} from "@/lib/contracts";
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

  async createRun(input: unknown) {
    const parsed = CreateRunInputSchema.parse(input);
    const document = await this.documents.create({
      userId: "local-fixture-user",
      title: parsed.title,
      originalText: parsed.text,
    });
    const run = await this.runs.create(document.id, this.checkedAt);
    const submission = await this.analysis.start({
      runId: run.id,
      articleText: document.originalText,
      checkedAt: run.checkedAt,
    });
    await this.runs.markInProgress(run.id, submission.providerRunId);

    const output = await this.analysis.retrieve(submission.providerRunId);
    const findings = output.findings.map((finding) =>
      FindingSchema.parse({
        ...finding,
        ...resolveFixtureSpan(document.originalText, finding),
        checkedAt: run.checkedAt,
      }),
    );
    const completed = await this.runs.complete(run.id, findings);

    return CreateRunResultSchema.parse({
      runId: completed.id,
      status: completed.status,
      createdAt: completed.createdAt,
    });
  }

  async getRun(runId: string) {
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

function resolveFixtureSpan(
  articleText: string,
  finding: Pick<Finding, "id" | "sourceText" | "prefixText" | "suffixText">,
) {
  // TODO(F2): Replace this fixture-only resolver with the complete ambiguity/overlap engine.
  // Acceptance: preserve Unicode and every untouched character across all documented edge cases.
  const startOffset = articleText.indexOf(finding.sourceText);
  if (
    startOffset < 0 ||
    articleText.lastIndexOf(finding.sourceText) !== startOffset
  ) {
    throw new Error(
      `Fixture sourceText must resolve exactly once: ${finding.id}`,
    );
  }

  if (
    finding.prefixText !== null &&
    articleText.slice(startOffset - finding.prefixText.length, startOffset) !==
      finding.prefixText
  ) {
    throw new Error(`Fixture prefix does not match: ${finding.id}`);
  }

  const endOffset = startOffset + finding.sourceText.length;
  if (
    finding.suffixText !== null &&
    articleText.slice(endOffset, endOffset + finding.suffixText.length) !==
      finding.suffixText
  ) {
    throw new Error(`Fixture suffix does not match: ${finding.id}`);
  }

  return { startOffset, endOffset };
}
