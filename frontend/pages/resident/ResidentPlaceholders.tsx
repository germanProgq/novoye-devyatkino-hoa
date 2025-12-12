import React from 'react';
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
  <PlaceholderCard
    title="Тарифы на коммунальные услуги"
    description="Таблицы с тарифами и расчётными периодами будут опубликованы после сверки. Временно используйте ссылку на поставщика услуг."
    caption="Публикация в процессе"
    icon="receipt"
  />
);
