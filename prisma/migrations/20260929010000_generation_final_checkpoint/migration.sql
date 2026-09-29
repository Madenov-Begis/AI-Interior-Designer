-- Путь незавершённого результата нужен для очистки после потери worker.
ALTER TABLE "GenerationExecution" ADD COLUMN "finalPath" TEXT;
