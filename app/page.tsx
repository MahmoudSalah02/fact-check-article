import { readFile } from "node:fs/promises";
import { join } from "node:path";

import demoExpected from "@/fixtures/demo-expected.json";
import { PulseCheckApp } from "@/components/pulsecheck-app";
import { readServerConfig } from "@/lib/server/config";

export default async function Home() {
  const config = readServerConfig();
  const demoArticle = await readFile(
    join(process.cwd(), "fixtures", "demo-article.txt"),
    "utf8",
  );

  return (
    <PulseCheckApp
      demoArticle={demoArticle.trim()}
      demoExpected={demoExpected}
      backend={config.DATA_BACKEND}
    />
  );
}
