import {
  InMemoryDocumentRepository,
  InMemoryRunRepository,
} from "@/lib/server/repositories";
import { runRepositoryContract } from "@/tests/contract/repository-contract";

runRepositoryContract("in-memory", () => ({
  documents: new InMemoryDocumentRepository(),
  runs: new InMemoryRunRepository(),
}));
