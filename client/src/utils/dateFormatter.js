// Helper to format any date string into DD-MM-YYYY format (e.g. 2026-07-31 -> 31-07-2026)
export const formatDateDDMMYYYY = (dateStr) => {
  if (!dateStr || dateStr === '-') return '-';
  const cleanStr = String(dateStr).trim();
  
  // ISO timestamp e.g. "2026-07-31T14:20:00.000Z"
  if (cleanStr.includes('T')) {
    const isoDate = cleanStr.split('T')[0];
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD -> DD-MM-YYYY (e.g. 2026-07-31 -> 31-07-2026)
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  const slashParts = cleanStr.split('/');
  if (slashParts.length === 3) {
    if (slashParts[0].length === 4) {
      // YYYY/MM/DD -> DD-MM-YYYY
      return `${slashParts[2]}-${slashParts[1]}-${slashParts[0]}`;
    }
  }

  return cleanStr;
};
