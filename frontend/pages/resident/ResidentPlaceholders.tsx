import React, { useEffect } from 'react';
import PlaceholderCard from '../../components/public/PlaceholderCard';

export const ResidentServicesPage: React.FC = () => (
  <PlaceholderCard
    title="Порядок оказания услуг"
    description="Здесь появится регламент подачи заявок, сроки исполнения и инструкции для жильцов. Пока можно перейти на временную страницу с актуальной схемой обслуживания."
    caption="Документ готовится"
    icon="rule"
  />
);

export const ResidentTariffsPage: React.FC = () => (
  <TariffsPdfRedirect />
);

const TariffsPdfRedirect: React.FC = () => {
  const pdfPath = '/images/tariffs/tarrifs.pdf';

  useEffect(() => {
    window.open(pdfPath, '_blank', 'noopener,noreferrer');
  }, []);

  return (
    <PlaceholderCard
      title="Тарифы на коммунальные услуги"
      description="PDF с актуальными тарифами откроется в новой вкладке. Если не открылся автоматически, воспользуйтесь ссылкой ниже."
      caption="Документ доступен"
      icon="receipt"
      linkHref={pdfPath}
      linkLabel="Открыть PDF с тарифами"
    />
  );
};
