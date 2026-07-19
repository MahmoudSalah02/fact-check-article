import { readFile } from "node:fs/promises";
import { join } from "node:path";

import demoExpected from "@/fixtures/demo-expected.json";
import { PulseCheckApp } from "@/components/pulsecheck-app";

export default async function Home() {
  const demoArticle = await readFile(
    join(process.cwd(), "fixtures", "demo-article.txt"),
    "utf8",
  );

  return (
    <PulseCheckApp
      demoArticle={demoArticle.trim()}
      demoExpected={demoExpected}
    />
  );
}
