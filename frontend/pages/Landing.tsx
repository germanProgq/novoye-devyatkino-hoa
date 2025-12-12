import React, { useEffect } from 'react';
import ContactsSection from '../components/landing/ContactsSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import HeroSection from '../components/landing/HeroSection';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import LandingHeader from '../components/landing/LandingHeader';
import LandingFooter from '../components/landing/LandingFooter';
import MapSection from '../components/landing/MapSection';
import { BILLING_ITEMS, CONTACTS, FEATURES, HERO_IMAGES, HOW_IT_WORKS_STEPS } from './landingData';

const scrollRevealOptions: IntersectionObserverInit = {
  threshold: 0.15,
  rootMargin: '0px 0px -40px 0px',
};

const Landing: React.FC = () => {
  useEffect(() => {
    const elements = document.querySelectorAll('.scroll-reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('scroll-reveal-visible');
          observer.unobserve(entry.target);
        }
      });
    }, scrollRevealOptions);
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-sand)] text-[var(--color-ink)]">
      <LandingHeader />
      <HeroSection images={HERO_IMAGES} />

      <main className="max-w-6xl mx-auto px-6 py-16 space-y-16 text-[var(--color-ink)]">
        <FeaturesSection features={FEATURES} />
        <HowItWorksSection steps={HOW_IT_WORKS_STEPS} billingItems={BILLING_ITEMS} />
        <ContactsSection contacts={CONTACTS} />
        <MapSection />
      </main>

      <LandingFooter />
    </div>
  );
};

export default Landing;
