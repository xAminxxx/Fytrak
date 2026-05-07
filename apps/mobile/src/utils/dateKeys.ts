export const toLocalDateKey = (date = new Date()): string => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

export const localDateKeyDaysAgo = (daysAgo: number, fromDate = new Date()): string => {
  const date = new Date(fromDate);
  date.setDate(date.getDate() - daysAgo);
  return toLocalDateKey(date);
};
