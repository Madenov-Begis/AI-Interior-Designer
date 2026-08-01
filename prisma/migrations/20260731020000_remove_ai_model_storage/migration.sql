-- The application uses one fixed server-side generation configuration.
ALTER TABLE "Generation" DROP CONSTRAINT "Generation_modelId_fkey";
ALTER TABLE "PlanModel" DROP CONSTRAINT "PlanModel_modelId_fkey";
ALTER TABLE "PlanModel" DROP CONSTRAINT "PlanModel_planId_fkey";
ALTER TABLE "Project" DROP CONSTRAINT "Project_modelId_fkey";

ALTER TABLE "Generation" DROP COLUMN "modelId";
ALTER TABLE "Project" DROP COLUMN "modelId";

DROP TABLE "AiModel";
DROP TABLE "PlanModel";
