export const formatArea = (value: number, digits = 1) => {
  const [whole, decimals] = value.toFixed(digits).split('.');
  const spacedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return decimals ? `${spacedWhole}.${decimals}` : spacedWhole;
};

export const toTelHref = (phone: string) => phone.replace(/[^\d+]/g, '');
