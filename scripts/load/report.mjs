import { readFile, writeFile } from "node:fs/promises";
const [logPath, output = ".data/load/worker-report.json"] =
  process.argv.slice(2);
if (!logPath) throw new Error("Укажите лог worker");
const rows = (await readFile(logPath, "utf8")).split("\n").flatMap((line) => {
  try {
    const start = line.indexOf("{");
    return start < 0
      ? []
      : [
          {
            ...JSON.parse(line.slice(start)),
            worker: line.slice(0, start).trim(),
          },
        ];
  } catch {
    return [];
  }
});
const percentile = (values, q) =>
  values.length
    ? [...values].sort((a, b) => a - b)[
        Math.max(0, Math.ceil(values.length * q) - 1)
      ]
    : null;
const timing = (event, field) => {
  const values = rows
    .filter((r) => r.event === event)
    .map((r) => r[field])
    .filter(Number.isFinite);
  return {
    count: values.length,
    p50: percentile(values, 0.5),
    p95: percentile(values, 0.95),
  };
};
const metrics = rows.filter((r) => r.event === "worker_metrics");
const report = {
  queueMs: timing("generation_dispatch", "queueMs"),
  aiMs: timing("generation_ai", "durationMs"),
  processingMs: timing("generation_processed", "durationMs"),
  totalMs: timing("generation_processed", "totalMs"),
  throttles: rows.filter((r) => r.event === "generation_throttled").length,
  maxRssPerProcess: metrics.length
    ? Math.max(...metrics.map((r) => r.rss))
    : null,
  maxQueueAgeMs: metrics.length
    ? Math.max(...metrics.map((r) => r.oldestMs))
    : null,
  maxTemporaryBytes: metrics.length
    ? Math.max(...metrics.map((r) => r.temporaryBytes || 0))
    : null,
  maxLimit: metrics.length
    ? Math.max(...metrics.map((r) => r.limit || 0))
    : null,
  workerErrors: rows.filter((r) => r.code).map(({ code }) => code),
  cpuSamples: metrics.map(({ cpu, pid, at, worker }) => ({
    cpu,
    pid,
    at,
    worker,
  })),
  note: "Метрики fake не измеряют мощность Google; итоговую скорость и отказы берите из k6 summary. RSS относится к одному процессу, не сумме worker.",
};
await writeFile(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
