/*
  Warnings:

  - A unique constraint covering the columns `[templateName]` on the table `salaryTemplateHeader` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `salaryTemplateHeader_templateName_key` ON `salaryTemplateHeader`(`templateName`);
