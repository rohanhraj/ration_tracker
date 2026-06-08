export const getCurrentMonth = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
};

export const formatKg = (value: number) =>
  `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value)} kg`;

export const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value);

export const formatDateTime = (value: string | null) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};
