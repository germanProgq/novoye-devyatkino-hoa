import React, { useCallback, useEffect, useRef, useState } from 'react';

export const useMapAutoReset = () => {
  const [mapKey, setMapKey] = useState(0);
  const mapResetTimer = useRef<number | null>(null);
  const mapIdleInterval = useRef<number | null>(null);

  const resetMap = useCallback(() => setMapKey((key) => key + 1), []);

  const scheduleMapReset = useCallback(() => {
    if (mapResetTimer.current) {
      clearTimeout(mapResetTimer.current);
    }
    mapResetTimer.current = window.setTimeout(resetMap, 8000);
  }, [resetMap]);

  useEffect(() => {
    mapIdleInterval.current = window.setInterval(resetMap, 60000);
    return () => {
      if (mapIdleInterval.current) {
        clearInterval(mapIdleInterval.current);
      }
    };
  }, [resetMap]);

  useEffect(() => {
    return () => {
      if (mapResetTimer.current) {
        clearTimeout(mapResetTimer.current);
      }
    };
  }, []);

  return { mapKey, scheduleMapReset };
};

export const MapEmbed: React.FC<{ className?: string; iframeClassName?: string; title?: string }> = ({
  className = '',
  iframeClassName = 'w-full h-80',
  title = 'Новое Девяткино на карте',
}) => {
  const { mapKey, scheduleMapReset } = useMapAutoReset();

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-[color:var(--color-info-border)] shadow-lg bg-[var(--color-info-surface)] ${className}`}
      onPointerDown={scheduleMapReset}
      onWheel={scheduleMapReset}
      onTouchStart={scheduleMapReset}
    >
      <iframe
        key={mapKey}
        title={title}
        src="https://www.openstreetmap.org/export/embed.html?bbox=30.456%2C59.999%2C30.52%2C60.04&layer=mapnik&marker=60.020%2C30.488"
        className={iframeClassName}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        onFocus={scheduleMapReset}
        onMouseDownCapture={scheduleMapReset}
        onPointerDownCapture={scheduleMapReset}
        tabIndex={-1}
      />
      <a
        className="absolute bottom-3 right-3 text-xs text-[var(--color-ink)] hover:text-accent bg-white/90 px-3 py-1 rounded-full shadow-sm"
        href="https://www.openstreetmap.org/?mlat=60.020&mlon=30.488#map=14/60.0200/30.4880"
        target="_blank"
        rel="noreferrer"
      >
        Открыть в карте
      </a>
    </div>
  );
};

const MapSection: React.FC = () => {
  return (
    <section id="map" className="grid md:grid-cols-2 gap-10 items-start scroll-mt-28 md:scroll-mt-32">
      <div className="space-y-3 scroll-reveal" style={{ transitionDelay: '80ms' }}>
        <p className="text-sm font-semibold text-primary">Как нас найти</p>
        <h2 className="text-3xl font-bold text-[var(--color-ink)]">Новое Девяткино на карте</h2>
        <p className="text-[var(--color-ink-soft)] leading-relaxed">
          Посёлок расположен в Ленинградской области, рядом с КАД и станцией метро «Девяткино». На карте отмечен центр управления и приём жителей.
        </p>
      </div>
      <MapEmbed className="scroll-reveal" iframeClassName="w-full h-80" />
    </section>
  );
};

export default MapSection;
