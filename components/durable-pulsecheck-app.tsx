"use client";

import { useCallback, useEffect, useState } from "react";

import { PulseCheckApp } from "@/components/pulsecheck-app";
import { HttpRunClient } from "@/lib/client/http-run-client";
import type { RunClient } from "@/lib/contracts";
import { getAnonymousAccessToken } from "@/lib/supabase/browser";

type DurablePulseCheckAppProps = {
  demoArticle: string;
  demoExpected: unknown;
};

function readRunParam() {
  const url = new URL(window.location.href);
  return url.searchParams.get("run");
}

function writeRunParam(runId: string | null) {
  const url = new URL(window.location.href);
  if (runId) {
    url.searchParams.set("run", runId);
  } else {
    url.searchParams.delete("run");
  }
  window.history.replaceState(null, "", url);
}

export function DurablePulseCheckApp({
  demoArticle,
  demoExpected,
}: DurablePulseCheckAppProps) {
  const [runClient, setRunClient] = useState<RunClient | null>(null);
  const [restoreRunId, setRestoreRunId] = useState<string | null>(null);
  const [startupError, setStartupError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const savedRunId = readRunParam();

    async function initialize() {
      try {
        await getAnonymousAccessToken();
        if (!cancelled) {
          setRestoreRunId(savedRunId);
          setRunClient(new HttpRunClient(getAnonymousAccessToken));
        }
      } catch {
        if (!cancelled) {
          setStartupError(
            "We couldn't start a secure session. Please refresh and try again.",
          );
        }
      }
    }

    void initialize();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRunIdChange = useCallback((runId: string | null) => {
    writeRunParam(runId);
  }, []);

  return (
    <PulseCheckApp
      demoArticle={demoArticle}
      demoExpected={demoExpected}
      runClient={runClient}
      restoreRunId={restoreRunId}
      onRunIdChange={handleRunIdChange}
      startupError={startupError}
    />
  );
}
