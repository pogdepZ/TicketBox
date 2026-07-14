const VI_TIME_ZONE = "Asia/Ho_Chi_Minh";

export function formatViDate(
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions = {},
) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: VI_TIME_ZONE,
    ...options,
  }).format(new Date(value));
}

export function formatViTime(
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions = {},
) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: VI_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    ...options,
  }).format(new Date(value));
}
