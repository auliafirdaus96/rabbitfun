/**
 * 🕐 Time Formatting Utilities
 * Fungsi untuk format waktu yang user-friendly
 */

export interface TimeFormatOptions {
  showAgo?: boolean;
  short?: boolean;
  maxUnits?: number;
}

/**
 * Format waktu menjadi format yang mudah dibaca
 * @param date - Date object atau timestamp
 * @param options - Opsi formatting
 * @returns String waktu yang diformat
 */
export function formatTimeAgo(date: Date | number | string, options: TimeFormatOptions = {}): string {
  const { showAgo = true, short = false, maxUnits = 2 } = options;

  // Convert ke Date object
  const now = new Date();
  const targetDate = new Date(date);

  // Handle invalid date
  if (isNaN(targetDate.getTime())) {
    return 'Invalid date';
  }

  // Hitung selisih waktu
  const diffMs = now.getTime() - targetDate.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  // Time units
  const units = [
    { value: diffYears, label: 'year', shortLabel: 'y' },
    { value: diffMonths, label: 'month', shortLabel: 'mo' },
    { value: diffWeeks, label: 'week', shortLabel: 'w' },
    { value: diffDays, label: 'day', shortLabel: 'd' },
    { value: diffHours, label: 'hour', shortLabel: 'h' },
    { value: diffMinutes, label: 'minute', shortLabel: 'm' },
    { value: diffSeconds, label: 'second', shortLabel: 's' }
  ];

  // Cari unit yang tidak nol pertama
  const activeUnits = units.filter(unit => unit.value > 0);

  if (activeUnits.length === 0) {
    return showAgo ? 'just now' : 'now';
  }

  // Format berdasarkan opsi
  const unit = activeUnits[0];
  const label = short ? unit.shortLabel : unit.label;
  const plural = unit.value > 1 && !short ? 's' : '';

  const timeString = `${unit.value} ${label}${plural}`;

  return showAgo ? `${timeString} ago` : timeString;
}

/**
 * Format waktu yang sangat singkat untuk badge
 * @param date - Date object atau timestamp
 * @returns String waktu singkat
 */
export function formatTimeShort(date: Date | number | string): string {
  return formatTimeAgo(date, { short: true, showAgo: false });
}

/**
 * Format waktu dengan detail yang lebih lengkap
 * @param date - Date object atau timestamp
 * @returns String waktu detail
 */
export function formatTimeDetailed(date: Date | number | string): string {
  const targetDate = new Date(date);

  if (isNaN(targetDate.getTime())) {
    return 'Invalid date';
  }

  // Format: "2 hours ago (Oct 8, 2024, 3:30 PM)"
  const timeAgo = formatTimeAgo(date);
  const formatted = targetDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: targetDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return `${timeAgo} (${formatted})`;
}

/**
 * Cek apakah token termasuk "new" (dibuat kurang dari 24 jam)
 * @param createdAt - Waktu creation token
 * @returns Boolean apakah termasuk new
 */
export function isNewToken(createdAt: Date | number | string): boolean {
  const now = new Date();
  const created = new Date(createdAt);
  const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
  return diffHours < 24;
}

/**
 * Cek apakah token termasuk "very new" (dibuat kurang dari 1 jam)
 * @param createdAt - Waktu creation token
 * @returns Boolean apakah termasuk very new
 */
export function isVeryNewToken(createdAt: Date | number | string): boolean {
  const now = new Date();
  const created = new Date(createdAt);
  const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
  return diffHours < 1;
}

/**
 * Dapatkan kategori waktu untuk token
 * @param createdAt - Waktu creation token
 * @returns String kategori waktu
 */
export function getTimeCategory(createdAt: Date | number | string): string {
  if (isVeryNewToken(createdAt)) return 'Just now';
  if (isNewToken(createdAt)) return 'New';

  const now = new Date();
  const created = new Date(createdAt);
  const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 7) return 'This week';
  if (diffDays < 30) return 'This month';
  if (diffDays < 90) return 'Recent';

  return 'Established';
}