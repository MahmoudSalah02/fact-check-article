"use client";

import { useEffect, useRef } from "react";

export const MAX_ARTICLE_LENGTH = 20_000;

type ArticleComposerProps = {
  article: string;
  isChecking: boolean;
  onArticleChange: (article: string) => void;
  onLoadDemo: () => void;
  onCheckArticle: () => void;
};

export function ArticleComposer({
  article,
  isChecking,
  onArticleChange,
  onLoadDemo,
  onCheckArticle,
}: ArticleComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isOverLimit = article.length > MAX_ARTICLE_LENGTH;
  const canCheck = !isChecking && article.length > 0 && !isOverLimit;

  // Grow with the pasted article like the ChatGPT composer: one quiet line
  // when empty, expanding up to a cap before scrolling internally.
  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    if (article.length === 0) {
      element.style.height = "";
      return;
    }
    element.style.height = "auto";
    if (element.clientWidth > 0 && element.scrollHeight > 0) {
      element.style.height = `${Math.min(element.scrollHeight, 320)}px`;
    }
  }, [article]);

  return (
    <div className="rounded-[28px] bg-[#2b2b2b] px-3 py-2.5 ring-1 ring-white/5 transition focus-within:ring-white/15">
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={onLoadDemo}
          disabled={isChecking}
          aria-label="Load demo article"
          title="Load demo article"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#b4b4b4] outline-none transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="h-5 w-5"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>

        <label htmlFor="article" className="sr-only">
          Article text
        </label>
        <textarea
          ref={textareaRef}
          id="article"
          rows={1}
          value={article}
          onChange={(event) => onArticleChange(event.target.value)}
          readOnly={isChecking}
          aria-readonly={isChecking}
          aria-invalid={isOverLimit}
          aria-describedby={isOverLimit ? "article-limit-error" : undefined}
          placeholder="Paste an article to check…"
          className="max-h-80 min-h-9 flex-1 resize-none self-center overflow-y-auto bg-transparent py-1.5 text-[15px] leading-6 text-[#ececec] outline-none placeholder:text-[#8e8ea0] read-only:cursor-default"
        />

        <div className="flex shrink-0 items-center gap-2.5 self-end pb-0.5">
          {article.length > 0 ? (
            <span
              aria-live="polite"
              className={`text-xs tabular-nums ${
                isOverLimit ? "font-medium text-red-400" : "text-[#8e8ea0]"
              }`}
            >
              {article.length.toLocaleString()} /{" "}
              {MAX_ARTICLE_LENGTH.toLocaleString()}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onCheckArticle}
            disabled={!canCheck}
            aria-label="Check article"
            title="Check article"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#0d0d0d] outline-none transition hover:bg-[#ececec] focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/40"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M12 19V5m0 0-6 6m6-6 6 6" />
            </svg>
          </button>
        </div>
      </div>

      {isOverLimit ? (
        <p
          id="article-limit-error"
          className="px-2 pt-2 pb-1 text-xs text-red-400"
        >
          Shorten the article to {MAX_ARTICLE_LENGTH.toLocaleString()}{" "}
          characters or fewer.
        </p>
      ) : null}
    </div>
  );
}
