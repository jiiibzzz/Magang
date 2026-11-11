/**
 * Shared currency formatter for IDR.
 * Produces format: "Rp. 150.000.000"
 *
 * @param {number|string|null|undefined} val
 * @param {string} fallback Return value when val is empty/null/undefined (default: '-')
 * @returns {string}
 */
export function formatRupiah(val, fallback = '-') {
  if (val === null || val === undefined || val === '') return fallback
  const num = Math.round(Number(val))
  if (isNaN(num)) return fallback
  return `Rp. ${num.toLocaleString('id-ID')}`
}
