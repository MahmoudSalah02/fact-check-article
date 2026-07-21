"use client";

import { useEffect, useRef } from "react";

export const MAX_ARTICLE_LENGTH = 20_000;

type ArticleComposerProps = {
  article: string;
  isChecking: boolean;
  isReady: boolean;
  onArticleChange: (article: string) => void;
  onLoadDemo: () => void;
  onCheckArticle: () => void;
  onReset: () => void;
};

export function ArticleComposer({
  article,
  isChecking,
  isReady,
  onArticleChange,
  onLoadDemo,
  onCheckArticle,
  onReset,
}: ArticleComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isOverLimit = article.length > MAX_ARTICLE_LENGTH;
  const canCheck = isReady && !isChecking && article.length > 0 && !isOverLimit;

  // Keep the article as the primary surface and grow until the editor reaches
  // a comfortable reading cap, then scroll within it.
  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    if (article.length === 0) {
      element.style.height = "112px";
      return;
    }
    element.style.height = "auto";
    if (element.clientWidth > 0 && element.scrollHeight > 0) {
      element.style.height = `${Math.min(element.scrollHeight, 320)}px`;
    }
  }, [article]);

  return (
    <div className="rounded-[26px] border border-white/10 bg-[#212121] px-3 py-2.5 shadow-[0_20px_70px_rgba(0,0,0,0.28)] transition-all duration-300 focus-within:border-white/20 focus-within:shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
      <div>
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
          placeholder="Paste an article or upload a file"
          className="max-h-80 min-h-28 w-full resize-none overflow-y-auto bg-transparent px-2 py-2 text-[15px] leading-7 text-[#ececec] outline-none placeholder:text-[#8e8ea0] read-only:cursor-default"
        />

        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Upload article"
              title="Upload article"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#d7d7d7] outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="h-5 w-5"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onLoadDemo}
              disabled={isChecking}
              className="rounded-full px-2.5 py-1.5 text-xs text-[#9b9b9b] outline-none transition-colors hover:bg-white/[0.07] hover:text-[#ececec] focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Use demo
            </button>
            {article.length > 0 ? (
              <button
                type="button"
                onClick={onReset}
                disabled={isChecking}
                className="rounded-full px-2.5 py-1.5 text-xs text-[#777780] outline-none transition-colors hover:bg-white/[0.07] hover:text-[#ececec] focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear article
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
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
              aria-label="Start check"
              title="Start check"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#0d0d0d] outline-none transition-all duration-200 hover:scale-105 hover:bg-[#ececec] active:scale-95 focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/35"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M12 19V5m0 0-5 5m5-5 5 5" />
              </svg>
            </button>
          </div>
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
