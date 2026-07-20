import type {
  AnalysisProvider,
  AnalysisRequest,
} from "@/lib/analysis/provider";
import type { AnalysisOutput } from "@/lib/contracts";

export const LIVE_ANALYSIS_EVALUATION_ENV = "RUN_LIVE_ANALYSIS_EVALS";

export function liveAnalysisEvaluationsEnabled(
  environment: Record<string, string | undefined> = process.env,
): boolean {
  return environment[LIVE_ANALYSIS_EVALUATION_ENV] === "1";
}

export async function runAnalysisEvaluation(
  provider: AnalysisProvider,
  request: AnalysisRequest,
): Promise<AnalysisOutput> {
  const { providerRunId } = await provider.start(request);
  return provider.retrieve(providerRunId);
}
