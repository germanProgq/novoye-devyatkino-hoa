import React from 'react';
import { Feature } from '../../pages/landingData';

type FeaturesSectionProps = {
  features: Feature[];
};

const FeaturesSection: React.FC<FeaturesSectionProps> = ({ features }) => (
  <section id="features" className="space-y-6 scroll-reveal scroll-mt-28 md:scroll-mt-32">
    <div>
      <p className="text-sm font-semibold text-primary">Возможности</p>
      <h2 className="text-3xl font-bold text-[var(--color-ink)] mt-2">Сервис, который закрывает ежедневные задачи жильцов</h2>
    </div>
    <div className="grid gap-6 md:grid-cols-3">
      {features.map((feature, idx) => (
        <div
          key={feature.title}
          className="bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] rounded-2xl p-6 shadow-sm backdrop-blur-sm scroll-reveal"
          style={{ transitionDelay: `${idx * 120}ms` }}
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-2xl">{feature.icon}</span>
          </div>
          <h3 className="text-lg font-semibold text-[var(--color-ink)]">{feature.title}</h3>
          <p className="text-[var(--color-ink-soft)] mt-2 text-sm leading-relaxed">{feature.description}</p>
        </div>
      ))}
    </div>
  </section>
);

export default FeaturesSection;
