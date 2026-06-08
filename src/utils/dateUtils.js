/** Formats a date string as "Jan 1, 2025" */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Formats a date string as "Jan 1, 2025 at 3:30 PM" */
export function formatDateTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Returns true if the given date is in the past. */
export function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

/** Returns true if the given date falls on today (any time). */
export function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** Returns true if the given date is within the next 3 days (and not past). */
export function isSoon(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const threeDaysOut = new Date();
  threeDaysOut.setDate(now.getDate() + 3);
  return d >= now && d <= threeDaysOut;
}

/** Returns a human-friendly relative label: "Overdue", "Today", "Tomorrow", date string. */
export function relativeLabel(dateStr) {
  if (!dateStr) return '';
  if (isOverdue(dateStr)) return 'Overdue';
  if (isToday(dateStr)) return 'Today';
  const d = new Date(dateStr);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate()
  ) {
    return 'Tomorrow';
  }
  return formatDate(dateStr);
}
