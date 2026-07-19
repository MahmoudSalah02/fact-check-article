import type { AnalysisRun, Document, Finding } from "@/lib/contracts";

export type CreateDocumentRecord = Pick<
  Document,
  "userId" | "title" | "originalText"
>;

export interface DocumentRepository {
  create(input: CreateDocumentRecord): Promise<Document>;
  getById(documentId: string): Promise<Document | null>;
}

export interface RunRepository {
  create(documentId: string, checkedAt: string): Promise<AnalysisRun>;
  getById(runId: string): Promise<AnalysisRun | null>;
  markInProgress(
    runId: string,
    providerResponseId: string,
  ): Promise<AnalysisRun>;
  complete(runId: string, findings: Finding[]): Promise<AnalysisRun>;
  fail(runId: string, errorCode: string): Promise<AnalysisRun>;
  getFindings(runId: string): Promise<Finding[] | null>;
}

export class InMemoryDocumentRepository implements DocumentRepository {
  readonly #documents = new Map<string, Document>();

  async create(input: CreateDocumentRecord): Promise<Document> {
    const document: Document = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: new Date().toISOString(),
    };
    this.#documents.set(document.id, structuredClone(document));
    return structuredClone(document);
  }

  async getById(documentId: string): Promise<Document | null> {
    const document = this.#documents.get(documentId);
    return document ? structuredClone(document) : null;
  }
}

export class InMemoryRunRepository implements RunRepository {
  readonly #runs = new Map<string, AnalysisRun>();
  readonly #findings = new Map<string, Finding[]>();

  async create(documentId: string, checkedAt: string): Promise<AnalysisRun> {
    const timestamp = new Date().toISOString();
    const run: AnalysisRun = {
      id: crypto.randomUUID(),
      documentId,
      status: "queued",
      checkedAt,
      model: null,
      providerResponseId: null,
      errorCode: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.#runs.set(run.id, structuredClone(run));
    return structuredClone(run);
  }

  async getById(runId: string): Promise<AnalysisRun | null> {
    const run = this.#runs.get(runId);
    return run ? structuredClone(run) : null;
  }

  async markInProgress(
    runId: string,
    providerResponseId: string,
  ): Promise<AnalysisRun> {
    const run = this.#requireRun(runId);
    const updated: AnalysisRun = {
      ...run,
      status: "in_progress",
      providerResponseId,
      updatedAt: new Date().toISOString(),
    };
    this.#runs.set(runId, updated);
    return structuredClone(updated);
  }

  async complete(runId: string, findings: Finding[]): Promise<AnalysisRun> {
    const run = this.#requireRun(runId);
    const updated: AnalysisRun = {
      ...run,
      status: "completed",
      updatedAt: new Date().toISOString(),
    };
    this.#findings.set(runId, structuredClone(findings));
    this.#runs.set(runId, updated);
    return structuredClone(updated);
  }

  async fail(runId: string, errorCode: string): Promise<AnalysisRun> {
    const run = this.#requireRun(runId);
    const updated: AnalysisRun = {
      ...run,
      status: "failed",
      errorCode,
      updatedAt: new Date().toISOString(),
    };
    this.#runs.set(runId, updated);
    return structuredClone(updated);
  }

  async getFindings(runId: string): Promise<Finding[] | null> {
    const findings = this.#findings.get(runId);
    return findings ? structuredClone(findings) : null;
  }

  #requireRun(runId: string): AnalysisRun {
    const run = this.#runs.get(runId);
    if (!run) throw new Error(`Unknown run: ${runId}`);
    return structuredClone(run);
  }
}
