import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';

const DEFAULT_REVEAL_OPTIONS: IntersectionObserverInit = {
  threshold: 0.16,
  rootMargin: '0px 0px -12% 0px',
};

export const useScrollReveal = (options?: IntersectionObserverInit, selector = '.scroll-reveal') => {
  const mergedOptions = useMemo(
    () => ({
      threshold: options?.threshold ?? DEFAULT_REVEAL_OPTIONS.threshold,
      root: options?.root ?? DEFAULT_REVEAL_OPTIONS.root ?? null,
      rootMargin: options?.rootMargin ?? DEFAULT_REVEAL_OPTIONS.rootMargin,
    }),
    [options?.threshold, options?.root, options?.rootMargin],
  );

  useEffect(() => {
    const elements = document.querySelectorAll(selector);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('scroll-reveal-visible');
          observer.unobserve(entry.target);
        }
      });
    }, mergedOptions);

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [mergedOptions, selector]);
};

export const useRedirectToast = () => {
  const [redirectingTo, setRedirectingTo] = useState<string | null>(null);
  const redirectTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) {
        window.clearTimeout(redirectTimer.current);
      }
    };
  }, []);

  const handleRedirect = useCallback(
    (url: string, label: string) => (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (redirectTimer.current) {
        window.clearTimeout(redirectTimer.current);
      }
      setRedirectingTo(label);
      redirectTimer.current = window.setTimeout(() => {
        window.open(url, '_blank', 'noopener,noreferrer');
        redirectTimer.current = window.setTimeout(() => setRedirectingTo(null), 1400);
      }, 240);
    },
    [],
  );

  return { redirectingTo, handleRedirect };
};
