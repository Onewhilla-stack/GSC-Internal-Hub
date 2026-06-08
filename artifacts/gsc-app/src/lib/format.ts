export function formatKES(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('Ksh', 'KES');
}

export function formatDate(dateString: string): string {
  // Parse as local midnight (not UTC) to avoid off-by-one across timezone boundaries.
  // "2026-06-03" → new Date(2026, 5, 3) stays June 3rd in any timezone.
  const parts = dateString.split("T")[0].split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
