/*
  Warnings:

  - A unique constraint covering the columns `[verificationCode]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email,verificationCode,passwordResetToken]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `users` ADD COLUMN `passwordResetAt` DATETIME(3) NULL,
    ADD COLUMN `passwordResetToken` VARCHAR(100) NULL,
    ADD COLUMN `provider` VARCHAR(350) NULL,
    ADD COLUMN `verificationCode` VARCHAR(350) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_verificationCode_key` ON `users`(`verificationCode`);

-- CreateIndex
CREATE UNIQUE INDEX `users_email_verificationCode_passwordResetToken_key` ON `users`(`email`, `verificationCode`, `passwordResetToken`);
