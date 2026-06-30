"use client";

import { useEffect, useRef, useState, type VideoHTMLAttributes } from "react";

const MAX_AUTO_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

type RetryableVideoProps = Omit<VideoHTMLAttributes<HTMLVideoElement>, "src"> & {
  src: string;
  errorMessage?: string;
  showRetryButton?: boolean;
  wrapperClassName?: string;
};

function appendRetryToken(src: string, retryToken: number) {
  if (!retryToken) return src;
  return `${src}${src.includes("?") ? "&" : "?"}media_retry=${retryToken}`;
}

export function RetryableVideo({ src, errorMessage = "영상을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", showRetryButton = true, wrapperClassName, className, ...videoProps }: RetryableVideoProps) {
  const [retryToken, setRetryToken] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [failed, setFailed] = useState(false);
  const retryTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setRetryToken(0);
    setRetryCount(0);
    setFailed(false);
    return () => {
      if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
    };
  }, [src]);

  function handleError() {
    if (retryTimerRef.current !== null || failed) return;
    if (retryCount >= MAX_AUTO_RETRIES) {
      setFailed(true);
      return;
    }
    retryTimerRef.current = window.setTimeout(() => {
      retryTimerRef.current = null;
      setRetryCount((count) => count + 1);
      setRetryToken(Date.now());
    }, RETRY_DELAY_MS);
  }

  function handleManualRetry() {
    if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
    setRetryCount(0);
    setFailed(false);
    setRetryToken(Date.now());
  }

  const displaySrc = appendRetryToken(src, retryToken);

  return (
    <div className={wrapperClassName ?? "relative"}>
      <video {...videoProps} key={displaySrc} src={displaySrc} className={className} onError={handleError} />
      {failed ? (
        <div className="absolute inset-0 grid place-items-center bg-slate-950/90 px-4 text-center text-white">
          <div>
            <p className="text-sm font-bold">{errorMessage}</p>
            {showRetryButton ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleManualRetry(); }}
                className="mt-3 rounded-lg border border-white/30 px-3 py-2 text-xs font-bold hover:bg-white/10"
              >
                다시 시도
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
