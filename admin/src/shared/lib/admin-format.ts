const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "short",
  timeStyle: "short",
});
const dateFormatter = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" });
const numberFormatter = new Intl.NumberFormat("ru-RU");
const moneyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "UZS",
  maximumFractionDigits: 0,
});

export const formatDateTime = (value: string | null | undefined) =>
  value ? dateTimeFormatter.format(new Date(value)) : "—";
export const formatDate = (value: string | null | undefined) =>
  value ? dateFormatter.format(new Date(value)) : "—";
export const formatNumber = (value: number) => numberFormatter.format(value);
export const formatUzs = (value: number) => moneyFormatter.format(value);
export const formatDuration = (value: number | null) =>
  value == null ? "—" : value < 1000 ? `${value} мс` : `${(value / 1000).toFixed(1)} с`;
export const formatBytes = (value: number) =>
  value < 1024 * 1024 ? `${Math.round(value / 1024)} КБ` : `${(value / 1024 / 1024).toFixed(1)} МБ`;
export const shortId = (value: string) => `${value.slice(0, 8)}…`;

export function toApiDate(value: string, end = false) {
  if (!value) return undefined;
  const date = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}`);
  return date.toISOString();
}
