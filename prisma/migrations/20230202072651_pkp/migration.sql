-- CreateTable
CREATE TABLE `pkp` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `code` VARCHAR(10) NOT NULL,
    `description` VARCHAR(350) NULL,
    `startSalary` FLOAT NOT NULL,
    `endSalary` FLOAT NOT NULL,
    `ratesPercentage` FLOAT NOT NULL,

    UNIQUE INDEX `pkp_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
