CREATE INDEX "Project_sourceImageId_idx" ON "Project"("sourceImageId");
CREATE INDEX "Project_sourcePreviewId_idx" ON "Project"("sourcePreviewId");
CREATE INDEX "Project_visualPromptId_idx" ON "Project"("visualPromptId");

CREATE INDEX "Generation_sourceImageId_idx" ON "Generation"("sourceImageId");
CREATE INDEX "Generation_visualPromptImageId_idx" ON "Generation"("visualPromptImageId");
CREATE INDEX "Generation_resultOriginalId_idx" ON "Generation"("resultOriginalId");
CREATE INDEX "Generation_resultUserId_idx" ON "Generation"("resultUserId");
