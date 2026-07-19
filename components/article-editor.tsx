export const MAX_ARTICLE_LENGTH = 20_000;

export type ArticleEditorStatus =
  "empty" | "ready" | "checking" | "completed" | "error";

type ArticleEditorProps = {
  article: string;
  status: ArticleEditorStatus;
  error: string | null;
  findingsCount: number | null;
  onArticleChange: (article: string) => void;
  onLoadDemo: () => void;
  onCheckArticle: () => void;
  onReset: () => void;
};

function getStatusMessage(
  status: ArticleEditorStatus,
  findingsCount: number | null,
) {
  if (status === "checking") {
    return "Researching and validating claims…";
  }

  if (status === "completed") {
    const count = findingsCount ?? 0;
    return `${count} ${count === 1 ? "finding" : "findings"} ready to review.`;
  }

  return null;
}

export function ArticleEditor({
  article,
  status,
  error,
  findingsCount,
  onArticleChange,
  onLoadDemo,
  onCheckArticle,
  onReset,
}: ArticleEditorProps) {
  const isChecking = status === "checking";
  const isEmpty = article.length === 0;
  const isOverLimit = article.length > MAX_ARTICLE_LENGTH;
  const canCheck = !isChecking && !isEmpty && !isOverLimit;
  const statusMessage = getStatusMessage(status, findingsCount);
  const descriptionIds = ["article-help", "article-count"];

  if (isOverLimit) descriptionIds.push("article-limit-error");
  if (error) descriptionIds.push("article-error");

  return (
    <section
      aria-labelledby="article-editor-title"
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2
            id="article-editor-title"
            className="text-base font-semibold text-zinc-950"
          >
            Article
          </h2>
          <p id="article-help" className="mt-1 text-sm leading-6 text-zinc-500">
            Paste plain text to research its factual claims and review only the
            smallest evidence-backed changes.
          </p>
        </div>
        {article.length > 0 ? (
          <button
            type="button"
            onClick={onReset}
            disabled={isChecking}
            className="min-h-11 rounded-md px-2.5 py-1.5 text-sm font-medium text-zinc-600 outline-none transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset
          </button>
        ) : null}
      </div>

      <label htmlFor="article" className="sr-only">
        Article text
      </label>
      <textarea
        id="article"
        value={article}
        onChange={(event) => onArticleChange(event.target.value)}
        readOnly={isChecking}
        aria-readonly={isChecking}
        aria-describedby={descriptionIds.join(" ")}
        aria-invalid={isOverLimit}
        placeholder="Paste an article to check…"
        className="mt-5 min-h-80 w-full resize-y rounded-lg border border-zinc-200 bg-white px-4 py-3 text-[15px] leading-7 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 read-only:cursor-default read-only:bg-zinc-50"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p
          id="article-count"
          aria-live="polite"
          className={`text-sm ${isOverLimit ? "font-medium text-red-700" : "text-zinc-500"}`}
        >
          {article.length.toLocaleString()} /{" "}
          {MAX_ARTICLE_LENGTH.toLocaleString()} characters
        </p>
        {isOverLimit ? (
          <p id="article-limit-error" className="text-sm text-red-700">
            Shorten the article to {MAX_ARTICLE_LENGTH.toLocaleString()}{" "}
            characters or fewer.
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-5">
        <button
          type="button"
          onClick={onLoadDemo}
          disabled={isChecking}
          className="min-h-11 rounded-md border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-800 outline-none transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Load demo article
        </button>
        <button
          type="button"
          onClick={onCheckArticle}
          disabled={!canCheck}
          className="min-h-11 rounded-md bg-zinc-950 px-3.5 py-2 text-sm font-medium text-white outline-none transition hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {isChecking ? "Checking article…" : "Check article"}
        </button>
      </div>

      <p className="mt-4 max-w-2xl text-xs leading-5 text-zinc-500">
        Your article is sent to OpenAI for research. Do not paste secrets or
        information you are not authorized to process.
      </p>

      {statusMessage ? (
        <div className="mt-5">
          {status === "checking" ? (
            <div
              role="progressbar"
              aria-label="Article analysis in progress"
              aria-valuetext="Researching and validating claims"
              className="mb-2 h-px w-full overflow-hidden bg-zinc-200"
            >
              <div className="h-full w-2/5 bg-zinc-700" />
            </div>
          ) : null}
          <p
            role="status"
            aria-live="polite"
            className={`rounded-md border px-3 py-2 text-sm ${
              status === "checking"
                ? "border-zinc-200 bg-zinc-50 text-zinc-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {statusMessage}
          </p>
        </div>
      ) : null}

      {error ? (
        <p
          id="article-error"
          role="alert"
          className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
