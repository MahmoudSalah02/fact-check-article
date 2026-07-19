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
      className="rounded-3xl bg-[#2f2f2f] p-4 ring-1 ring-white/5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2
            id="article-editor-title"
            className="text-base font-semibold text-[#ececec]"
          >
            Article
          </h2>
          <p
            id="article-help"
            className="mt-1 text-sm leading-6 text-[#8e8ea0]"
          >
            Paste plain text to research its factual claims and review only the
            smallest evidence-backed changes.
          </p>
        </div>
        {article.length > 0 ? (
          <button
            type="button"
            onClick={onReset}
            disabled={isChecking}
            className="min-h-11 rounded-md px-2.5 py-1.5 text-sm font-medium text-[#b4b4b4] outline-none transition hover:bg-white/5 hover:text-[#ececec] focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-50"
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
        className="mt-5 min-h-80 w-full resize-y rounded-2xl border border-white/10 bg-[#212121] px-4 py-3 text-[15px] leading-7 text-[#ececec] outline-none transition placeholder:text-[#8e8ea0] focus:border-white/25 focus:ring-2 focus:ring-white/10 read-only:cursor-default read-only:bg-[#262626]"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p
          id="article-count"
          aria-live="polite"
          className={`text-sm ${isOverLimit ? "font-medium text-red-400" : "text-[#8e8ea0]"}`}
        >
          {article.length.toLocaleString()} /{" "}
          {MAX_ARTICLE_LENGTH.toLocaleString()} characters
        </p>
        {isOverLimit ? (
          <p id="article-limit-error" className="text-sm text-red-400">
            Shorten the article to {MAX_ARTICLE_LENGTH.toLocaleString()}{" "}
            characters or fewer.
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
        <button
          type="button"
          onClick={onLoadDemo}
          disabled={isChecking}
          className="min-h-11 rounded-full border border-white/15 bg-transparent px-4 py-2 text-sm font-medium text-[#ececec] outline-none transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Load demo article
        </button>
        <button
          type="button"
          onClick={onCheckArticle}
          disabled={!canCheck}
          className="min-h-11 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#171717] outline-none transition hover:bg-[#ececec] focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-[#8e8ea0]"
        >
          {isChecking ? "Checking article…" : "Check article"}
        </button>
      </div>

      <p className="mt-4 max-w-2xl text-xs leading-5 text-[#8e8ea0]">
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
              className="mb-2 h-px w-full overflow-hidden bg-white/10"
            >
              <div className="h-full w-2/5 bg-white/70" />
            </div>
          ) : null}
          <p
            role="status"
            aria-live="polite"
            className={`rounded-xl border px-3 py-2 text-sm ${
              status === "checking"
                ? "border-white/10 bg-white/5 text-[#d1d1d1]"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
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
          className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
