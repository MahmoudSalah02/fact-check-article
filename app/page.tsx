import { readFile } from "node:fs/promises";
import { join } from "node:path";

import demoExpected from "@/fixtures/demo-expected.json";
import { M1FixtureRunner } from "@/components/m1-fixture-runner";
import { readServerConfig } from "@/lib/server/config";

export default async function Home() {
  const config = readServerConfig();
  const demoArticle = await readFile(
    join(process.cwd(), "fixtures", "demo-article.txt"),
    "utf8",
  );

  return (
    <M1FixtureRunner
      demoArticle={demoArticle.trim()}
      demoExpected={demoExpected}
      backend={config.DATA_BACKEND}
    />
  );
}
