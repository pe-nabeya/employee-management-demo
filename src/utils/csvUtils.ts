// CSV export utilities.
// Generates UTF-8 with BOM for Excel compatibility.
// Properly escapes commas, newlines, and double quotes.
// Prefixes cell values with a single quote when needed to prevent Excel formula injection.

const BOM = '\uFEFF';

/** Escapes a single CSV cell value. */
function escapeCell(value: string | number | null | undefined): string {
  let str = value == null ? '' : String(value);

  // Prevent CSV formula injection: if the value starts with =, +, -, @, or a tab/newline,
  // prefix with a single quote so Excel does not interpret it as a formula.
  const firstChar = str.charAt(0);
  if (firstChar === '=' || firstChar === '+' || firstChar === '-' || firstChar === '@' || firstChar === '\t' || firstChar === '\r' || firstChar === '\n') {
    str = "'" + str;
  }

  // If the value contains comma, double quote, or newline, wrap in double quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }

  return str;
}

/** Builds a CSV string from headers and rows. Returns a Blob with UTF-8 BOM. */
export function buildCSV(headers: string[], rows: (string | number | null)[][]): string {
  const lines: string[] = [];
  lines.push(headers.map(escapeCell).join(','));
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(','));
  }
  return BOM + lines.join('\r\n');
}

/** Triggers a download of the CSV content as a file. */
export function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
