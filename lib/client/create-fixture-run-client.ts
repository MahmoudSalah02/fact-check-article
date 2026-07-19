import { FixtureAnalysisProvider } from "@/lib/analysis/fixture-provider";
import type { RunClient } from "@/lib/contracts";
import { FakeRunClient } from "@/lib/server/fake-run-client";
import {
  InMemoryDocumentRepository,
  InMemoryRunRepository,
} from "@/lib/server/repositories";

export function createFixtureRunClient(
  articleText: string,
  fixture: unknown,
): RunClient {
  const provider = new FixtureAnalysisProvider(articleText, fixture);
  return new FakeRunClient(
    new InMemoryDocumentRepository(),
    new InMemoryRunRepository(),
    provider,
    provider.checkedAt,
  );
}
