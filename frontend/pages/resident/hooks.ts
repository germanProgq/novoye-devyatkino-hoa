import { useEffect } from 'react';

export const useScrollReveal = (options?: IntersectionObserverInit, selector = '.scroll-reveal') => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('scroll-reveal-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: options?.threshold ?? 0.18,
        root: options?.root ?? null,
        rootMargin: options?.rootMargin ?? '0px 0px -12% 0px',
      },
    );

    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [options?.root, options?.rootMargin, options?.threshold, selector]);
};
