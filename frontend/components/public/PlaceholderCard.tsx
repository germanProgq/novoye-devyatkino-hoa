import React from 'react';

interface PlaceholderCardProps {
  title: string;
  description: string;
  caption?: string;
  icon?: string;
  linkHref?: string;
  linkLabel?: string;
}

const PlaceholderCard: React.FC<PlaceholderCardProps> = ({
  title,
  description,
  caption = 'Раздел готовится',
  icon = 'auto_awesome_motion',
  linkHref = 'https://example.com',
  linkLabel = 'Временная ссылка',
}) => {
  return (
    <div className="bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] rounded-2xl p-6 md:p-8 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-white text-primary border border-[color:var(--color-info-border)] flex items-center justify-center shadow-sm shrink-0">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)]/70 font-semibold">
              {caption}
            </p>
            <h2 className="text-xl md:text-2xl font-bold text-[var(--color-ink)] mt-1">{title}</h2>
          </div>
          <p className="text-[var(--color-ink-soft)] leading-relaxed">{description}</p>
          <a
            className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:text-accent transition"
            href={linkHref}
            target="_blank"
            rel="noreferrer"
          >
            {linkLabel}
            <span className="material-symbols-outlined text-base">open_in_new</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderCard;
