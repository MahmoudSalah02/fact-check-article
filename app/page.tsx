import { readFile } from "node:fs/promises";
import { join } from "node:path";

import demoExpected from "@/fixtures/demo-expected.json";
import { DurablePulseCheckApp } from "@/components/durable-pulsecheck-app";
import { PulseCheckApp } from "@/components/pulsecheck-app";
import { readServerConfig } from "@/lib/server/config";

export default async function Home() {
  const config = readServerConfig();
  const demoArticle = await readFile(
    join(process.cwd(), "fixtures", "demo-article.txt"),
    "utf8",
  );

  const pulseCheckProps = {
    demoArticle: demoArticle.trim(),
    demoExpected,
  };

  return config.DATA_BACKEND === "supabase" ? (
    <DurablePulseCheckApp {...pulseCheckProps} />
  ) : (
    <PulseCheckApp {...pulseCheckProps} />
  );
}
