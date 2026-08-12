const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string) {
  const cached = dateFormatterCache.get(timeZone);
  if (cached) return cached;
  const value = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  dateFormatterCache.set(timeZone, value);
  return value;
}

function zonedParts(date: Date, timeZone: string) {
  const parts = Object.fromEntries(
    formatter(timeZone)
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

export function zonedDateKey(date: Date, timeZone: string) {
  const { year, month, day } = zonedParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function zonedMidnight(key: string, timeZone: string) {
  const [year, month, day] = key.split("-").map(Number);
  const guess = Date.UTC(year, month - 1, day);
  const atGuess = zonedParts(new Date(guess), timeZone);
  const represented = Date.UTC(
    atGuess.year,
    atGuess.month - 1,
    atGuess.day,
    atGuess.hour,
    atGuess.minute,
    atGuess.second,
  );
  let result = guess - (represented - guess);
  const check = zonedParts(new Date(result), timeZone);
  const correction =
    Date.UTC(check.year, check.month - 1, check.day, check.hour, check.minute, check.second) -
    guess;
  result -= correction;
  return new Date(result);
}

function addDays(key: string, amount: number) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + amount)).toISOString().slice(0, 10);
}

export function adminPeriodRange(
  period: "today" | "7d" | "30d",
  timeZone: string,
  now = new Date(),
) {
  const days = period === "today" ? 1 : period === "7d" ? 7 : 30;
  const today = zonedDateKey(now, timeZone);
  const firstKey = addDays(today, -(days - 1));
  return {
    period,
    days,
    timeZone,
    from: zonedMidnight(firstKey, timeZone),
    to: now,
    dateKeys: Array.from({ length: days }, (_, index) => addDays(firstKey, index)),
  };
}
