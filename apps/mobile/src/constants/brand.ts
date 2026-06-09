export const Brand = {
  blue: '#0038A8',
  blueDark: '#052B78',
  blueSoft: '#EEF4FF',
  red: '#CE1126',
  yellow: '#FCD116',
  white: '#FFFFFF',
  ink: '#101828',
  slate: '#667085',
  muted: '#F2F4F7',
  surface: '#FCFCFD',
  border: '#D0D5DD',
  placeholder: '#98A2B3',
  success: '#039855',
  warning: '#DC6803',
  danger: '#B42318',
} as const;

/** Spacing scale (4pt grid) used across the Katiwala UI kit. */
export const Space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Corner radii. */
export const Radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

/** Type ramp — pair `size` with `weight`/`lineHeight` as needed. */
export const FontSize = {
  xs: 11,
  sm: 13,
  md: 14,
  base: 15,
  lg: 16,
  xl: 18,
  title: 28,
} as const;

export function formatPeso(value: number) {
  return `PHP ${Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function humanizeCategory(category: string) {
  return category
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

export function statusColor(status: string) {
  if (['COMPLETED', 'PAID', 'VERIFIED', 'ACTIVE'].includes(status)) return Brand.success;
  if (['CANCELLED', 'FAILED', 'SUSPENDED', 'BANNED'].includes(status)) return Brand.danger;
  if (['IN_PROGRESS', 'ACCEPTED', 'ASSIGNED'].includes(status)) return Brand.blue;
  return Brand.warning;
}
