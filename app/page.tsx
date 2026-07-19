import { readFile } from "node:fs/promises";
import { join } from "node:path";

import demoExpected from "@/fixtures/demo-expected.json";
import { M1FixtureRunner } from "@/components/m1-fixture-runner";

export default async function Home() {
  const demoArticle = await readFile(
    join(process.cwd(), "fixtures", "demo-article.txt"),
    "utf8",
  );

  return (
    <M1FixtureRunner
      demoArticle={demoArticle.trim()}
      demoExpected={demoExpected}
    />
  );
}
