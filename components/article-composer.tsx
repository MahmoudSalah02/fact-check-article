"use client";

import { useEffect, useRef } from "react";

export const MAX_ARTICLE_LENGTH = 20_000;

type ArticleComposerProps = {
  article: string;
  isChecking: boolean;
  onArticleChange: (article: string) => void;
  onLoadDemo: () => void;
  onCheckArticle: () => void;
  onReset: () => void;
};

export function ArticleComposer({
  article,
  isChecking,
  onArticleChange,
  onLoadDemo,
  onCheckArticle,
  onReset,
}: ArticleComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isOverLimit = article.length > MAX_ARTICLE_LENGTH;
  const canCheck = !isChecking && article.length > 0 && !isOverLimit;

  // Keep the article as the primary surface and grow until the editor reaches
  // a comfortable reading cap, then scroll within it.
  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    if (article.length === 0) {
      element.style.height = "160px";
      return;
    }
    element.style.height = "auto";
    if (element.clientWidth > 0 && element.scrollHeight > 0) {
      element.style.height = `${Math.min(element.scrollHeight, 320)}px`;
    }
  }, [article]);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#1b1b1b]/95 p-3 shadow-[0_20px_70px_rgba(0,0,0,0.28)] backdrop-blur-sm transition-all duration-300 focus-within:-translate-y-0.5 focus-within:border-white/25 focus-within:shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
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
          placeholder="Paste an article to check…"
          className="max-h-80 min-h-40 w-full resize-none overflow-y-auto bg-transparent px-1 py-1 text-[15px] leading-7 text-[#ececec] outline-none placeholder:text-[#8e8ea0] read-only:cursor-default"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onLoadDemo}
              disabled={isChecking}
              className="rounded-lg px-3 py-2 text-sm font-medium text-[#d7d7d7] outline-none transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Load demo article
            </button>
            {article.length > 0 ? (
              <button
                type="button"
                onClick={onReset}
                disabled={isChecking}
                className="rounded-lg px-3 py-2 text-sm text-[#9b9b9b] outline-none transition-all duration-200 hover:bg-white/10 hover:text-[#ececec] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-40"
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
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0d0d0d] shadow-[0_8px_24px_rgba(255,255,255,0.1)] outline-none transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#ececec] hover:shadow-[0_10px_30px_rgba(255,255,255,0.16)] active:translate-y-0 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/40 disabled:shadow-none"
            >
              Check article
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
