import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

type HeroSectionProps = {
  images: string[];
};

const HeroSection: React.FC<HeroSectionProps> = ({ images }) => {
  const [heroIndex, setHeroIndex] = useState(0);
  const [activeImages, setActiveImages] = useState<string[]>(images);
  const [heroUnlocked, setHeroUnlocked] = useState(() => {
    if (typeof document === 'undefined') return false;
    return document.body.classList.contains('hero-ready');
  });

  useEffect(() => {
    let cancelled = false;
    const preload = async () => {
      const results = await Promise.all(
        images.map(
          (src) =>
            new Promise<{ src: string; ok: boolean }>((resolve) => {
              const img = new Image();
              img.onload = () => resolve({ src, ok: true });
              img.onerror = () => resolve({ src, ok: false });
              img.src = src;
            })
        )
      );
      if (cancelled) return;
      const loaded = results.filter((r) => r.ok).map((r) => r.src);
      setActiveImages(loaded.length ? loaded : images);
      setHeroIndex(0);
    };
    preload();
    return () => {
      cancelled = true;
    };
  }, [images]);

  useEffect(() => {
    const markReady = () => setHeroUnlocked(true);
    if (document.body.classList.contains('hero-ready')) {
      setHeroUnlocked(true);
    }
    window.addEventListener('hero-ready', markReady);
    return () => window.removeEventListener('hero-ready', markReady);
  }, []);

  useEffect(() => {
    if (!activeImages.length || !heroUnlocked) return;
    const id = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % activeImages.length);
    }, 9000);
    return () => clearInterval(id);
  }, [activeImages.length, heroUnlocked]);

  return (
    <header id="landing-hero" className="relative overflow-hidden text-[var(--color-hero-text)]">
      <div className="absolute inset-0" aria-hidden="true">
        {activeImages.map((src, idx) => (
          <div
            key={src}
            className={`absolute inset-0 bg-cover bg-center hero-bg-layer hero-frame ${idx === heroIndex ? 'hero-frame-visible' : 'hero-frame-hidden'}`}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
      </div>
      <div className="absolute inset-0 hero-overlay" aria-hidden="true" />
      <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 relative z-10">
        <div className="max-w-3xl space-y-8 hero-text-shadow">
          <div className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-hero-pill)] rounded-full text-sm font-medium ring-1 ring-[var(--color-hero-ring)] backdrop-blur hero-fade-1">
            <span className="material-symbols-outlined text-lg">apartment</span>
            Портал ТСЖ
          </div>
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.15em] text-[var(--color-hero-subtle)] font-semibold hero-fade-2">Новое Девяткино</p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight hero-fade-2 text-[var(--color-hero-text)]">
              Поселок, который живет вместе с вами
            </h1>
            <p className="text-lg text-[var(--color-hero-subtle)] max-w-2xl hero-fade-3">
              Современная инфраструктура, поддержка управляющей компании и цифровые сервисы для жителей — всё, чтобы жить комфортно.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 hero-fade-4">
            <Link
              to="/dashboard"
              className="px-6 py-3 bg-accent text-primary-contrast font-semibold rounded-xl shadow-sm hover:-translate-y-0.5 hover:bg-ink transition transform"
            >
              Перейти в кабинет
            </Link>
            <a
              href="#features"
              className="px-6 py-3 border border-[var(--color-hero-border)] text-[var(--color-hero-text)] font-semibold rounded-xl hover:bg-[var(--color-hero-ghost)] transition"
            >
              Возможности
            </a>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-[var(--color-hero-subtle)] hero-fade-5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">verified</span>
              Официальные данные и документы
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">notifications_active</span>
              Уведомления о сроках и новостях
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">groups</span>
              Поддержка жителей 24/7
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeroSection;
