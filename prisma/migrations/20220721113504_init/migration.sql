-- CreateTable
CREATE TABLE `division` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `divisionName` VARCHAR(150) NOT NULL,

    UNIQUE INDEX `division_divisionName_key`(`divisionName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jobTitle` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `jobTitleName` VARCHAR(150) NOT NULL,

    UNIQUE INDEX `jobTitle_jobTitleName_key`(`jobTitleName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `businessUnit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `businessUnitName` VARCHAR(150) NOT NULL,

    UNIQUE INDEX `businessUnit_businessUnitName_key`(`businessUnitName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(60) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `roleName` VARCHAR(150) NOT NULL,

    UNIQUE INDEX `roles_uuid_key`(`uuid`),
    UNIQUE INDEX `roles_roleName_key`(`roleName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ptkp` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `code` VARCHAR(5) NOT NULL,
    `description` VARCHAR(150) NULL,
    `amount` FLOAT NULL,

    UNIQUE INDEX `ptkp_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `employeeId` BIGINT NOT NULL,
    `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
    `roleId` INTEGER NOT NULL,
    `assignDate` DATE NULL,
    `assignBy` VARCHAR(150) NULL,
    `fullName` VARCHAR(150) NOT NULL,
    `joinDate` DATE NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `mobilePhone` VARCHAR(20) NULL,
    `dob` DATE NOT NULL,
    `placeOfBirth` VARCHAR(150) NOT NULL,
    `personalIdType` VARCHAR(25) NULL,
    `personalIdNumber` VARCHAR(150) NULL,
    `address` VARCHAR(150) NOT NULL,
    `employmentStatus` ENUM('Probation', 'Contract', 'Permanent') NULL DEFAULT 'Probation',
    `businessUnitId` INTEGER NOT NULL,
    `divisionId` INTEGER NOT NULL,
    `jobTitleId` INTEGER NOT NULL,
    `basicSalary` FLOAT NULL,
    `npwp` VARCHAR(150) NULL,
    `password` VARCHAR(150) NOT NULL,
    `salt` VARCHAR(150) NOT NULL,
    `annualLeave` INTEGER NULL DEFAULT 0,
    `annualLeaveBalance` INTEGER NULL DEFAULT 0,
    `sickLeave` INTEGER NULL DEFAULT 0,
    `sickLeaveBalance` INTEGER NULL DEFAULT 0,
    `promoteDate` DATE NULL,
    `supervisor` INTEGER NOT NULL,
    `ptkpId` INTEGER NOT NULL,
    `salaryTemplateHeaderId` INTEGER NULL,
    `is_using_bjps_tenaga_kerja` TINYINT NULL DEFAULT 1,
    `is_using_bjps_kesehatan` TINYINT NULL DEFAULT 0,

    UNIQUE INDEX `users_uuid_key`(`uuid`),
    UNIQUE INDEX `users_employeeId_key`(`employeeId`),
    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_businessUnitId_fkey`(`businessUnitId`),
    INDEX `users_divisionId_fkey`(`divisionId`),
    INDEX `users_jobTitleId_fkey`(`jobTitleId`),
    INDEX `users_ptkpId_fkey`(`ptkpId`),
    INDEX `users_roleId_fkey`(`roleId`),
    INDEX `users_salaryTemplateHeaderId_fkey`(`salaryTemplateHeaderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `module` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(60) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `feature` VARCHAR(150) NOT NULL,
    `description` VARCHAR(300) NULL,
    `uri` VARCHAR(300) NOT NULL,
    `parentId` INTEGER NOT NULL DEFAULT 0,
    `treeStatus` VARCHAR(1) NOT NULL DEFAULT 'H',
    `icon` VARCHAR(100) NULL,
    `isVisible` TINYINT NOT NULL DEFAULT 1,
    `sequence` INTEGER NULL,

    UNIQUE INDEX `module_uuid_key`(`uuid`),
    UNIQUE INDEX `module_feature_key`(`feature`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `modulePermission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(60) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `modulId` INTEGER NOT NULL,
    `roleId` INTEGER NOT NULL,
    `createRight` TINYINT NOT NULL DEFAULT 0,
    `readRight` TINYINT NOT NULL DEFAULT 1,
    `updateRight` TINYINT NOT NULL DEFAULT 0,
    `deleteRight` TINYINT NOT NULL DEFAULT 0,
    `inactiveRight` TINYINT NOT NULL DEFAULT 0,

    UNIQUE INDEX `modulePermission_uuid_key`(`uuid`),
    INDEX `modulePermission_modulId_fkey`(`modulId`),
    INDEX `modulePermission_roleId_fkey`(`roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `adminManagement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `employeeId` INTEGER NOT NULL,
    `role` VARCHAR(100) NOT NULL,
    `assignDate` DATE NOT NULL,
    `assignBy` VARCHAR(150) NULL,

    UNIQUE INDEX `adminManagement_uuid_key`(`uuid`),
    INDEX `adminManagement_employeeId_fkey`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `setupAnnualLeave` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `name` VARCHAR(150) NULL,
    `timeOffPerMonth` INTEGER NOT NULL,
    `timeOffPerYear` INTEGER NULL,
    `additionalTimeOff` INTEGER NOT NULL,
    `defaultCalculation` ENUM('Monthly', 'Yearly') NOT NULL DEFAULT 'Monthly',

    UNIQUE INDEX `setupAnnualLeave_uuid_key`(`uuid`),
    UNIQUE INDEX `setupAnnualLeave_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `setupSickLeave` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `name` VARCHAR(150) NULL,
    `day` INTEGER NOT NULL,
    `defaultCalculation` ENUM('Monthly', 'Yearly') NOT NULL DEFAULT 'Monthly',

    UNIQUE INDEX `setupSickLeave_uuid_key`(`uuid`),
    UNIQUE INDEX `setupSickLeave_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employeeAnnualLeave` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `employeeId` INTEGER NOT NULL,
    `Period` INTEGER NOT NULL,
    `day` TINYINT NOT NULL DEFAULT 1,

    UNIQUE INDEX `employeeAnnualLeave_uuid_key`(`uuid`),
    INDEX `employeeAnnualLeave_employeeId_fkey`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employeeSickLeave` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `employeeId` INTEGER NOT NULL,
    `Period` INTEGER NOT NULL,
    `day` TINYINT NOT NULL DEFAULT 1,

    UNIQUE INDEX `employeeSickLeave_uuid_key`(`uuid`),
    INDEX `employeeSickLeave_employeeId_fkey`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leaveType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `description` VARCHAR(150) NOT NULL,
    `day` TINYINT NOT NULL DEFAULT 1,
    `allowToOverrideLimit` TINYINT NOT NULL DEFAULT 0,
    `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',

    UNIQUE INDEX `leaveType_uuid_key`(`uuid`),
    UNIQUE INDEX `leaveType_description_key`(`description`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `requestLeave` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `leaveType` INTEGER NOT NULL,
    `leaveTypeDescription` VARCHAR(150) NOT NULL,
    `startDuration` DATETIME(0) NOT NULL,
    `endDuration` DATETIME(0) NOT NULL,
    `days` FLOAT NOT NULL,
    `leaveDescription` VARCHAR(300) NOT NULL,
    `employeeId` INTEGER NOT NULL,
    `businessUnitId` INTEGER NULL,
    `businessUnitName` VARCHAR(150) NULL,
    `divisionId` INTEGER NULL,
    `divisionName` VARCHAR(150) NULL,
    `jobTitleId` INTEGER NULL,
    `jobTitleName` VARCHAR(150) NULL,
    `isApproved` TINYINT NOT NULL DEFAULT 0,
    `approvedBy` VARCHAR(150) NULL,
    `approvedDate` DATETIME(0) NULL,
    `commentsBySupervisor` VARCHAR(300) NULL,

    UNIQUE INDEX `requestLeave_uuid_key`(`uuid`),
    INDEX `requestLeave_employeeId_fkey`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `setupSystem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `workDays` INTEGER NOT NULL,
    `workHours` INTEGER NOT NULL,
    `workStart` TIME(0) NOT NULL,
    `workEnd` TIME(0) NOT NULL,
    `defaultTaxMethod` ENUM('Gross', 'Netto', 'GrossUp') NULL DEFAULT 'GrossUp',
    `taxCalculationMethod` ENUM('Standard', 'Forward') NULL DEFAULT 'Standard',
    `taxPercentage` FLOAT NULL DEFAULT 5,

    UNIQUE INDEX `setupSystem_uuid_key`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `setupCalendar` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `eventDate` DATE NOT NULL,
    `eventName` VARCHAR(300) NOT NULL,
    `is_workdays` TINYINT NOT NULL DEFAULT 0,

    UNIQUE INDEX `setupCalendar_uuid_key`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salaryComponentType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `componentType` VARCHAR(150) NOT NULL,
    `isActive` TINYINT NOT NULL DEFAULT 1,

    UNIQUE INDEX `salaryComponentType_uuid_key`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salaryComponentCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `componentCategory` VARCHAR(150) NOT NULL,
    `isActive` TINYINT NOT NULL DEFAULT 1,

    UNIQUE INDEX `salaryComponentCategory_uuid_key`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salaryComponent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `componentCode` VARCHAR(30) NOT NULL,
    `componentName` VARCHAR(250) NOT NULL,
    `salaryComponentTypeId` INTEGER NOT NULL,
    `salaryComponentCategoryId` INTEGER NOT NULL,
    `isTaxable` TINYINT NOT NULL DEFAULT 0,
    `isActive` TINYINT NOT NULL DEFAULT 1,
    `sequence` INTEGER NULL,
    `isTakeHomePay` TINYINT NOT NULL DEFAULT 0,

    UNIQUE INDEX `salaryComponent_uuid_key`(`uuid`),
    UNIQUE INDEX `salaryComponent_componentCode_key`(`componentCode`),
    INDEX `salaryComponent_salaryComponentCategoryId_fkey`(`salaryComponentCategoryId`),
    INDEX `salaryComponent_salaryComponentTypeId_fkey`(`salaryComponentTypeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salaryTemplateHeader` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `templateName` VARCHAR(250) NOT NULL,
    `isActive` TINYINT NOT NULL DEFAULT 1,

    UNIQUE INDEX `salaryTemplateHeader_uuid_key`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salaryTemplateDetails` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `salaryTemplateId` INTEGER NOT NULL,
    `salaryComponentId` INTEGER NOT NULL,
    `formula` VARCHAR(300) NULL,
    `amount` FLOAT NULL,

    UNIQUE INDEX `salaryTemplateDetails_uuid_key`(`uuid`),
    INDEX `salaryTemplateDetails_salaryComponentId_fkey`(`salaryComponentId`),
    INDEX `salaryTemplateDetails_salaryTemplateId_fkey`(`salaryTemplateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usersSalary` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usersId` INTEGER NOT NULL,
    `componentId` INTEGER NOT NULL,
    `componentCode` VARCHAR(30) NOT NULL,
    `componentName` VARCHAR(250) NOT NULL,
    `salaryComponentTypeId` INTEGER NOT NULL,
    `salaryComponentTypeName` VARCHAR(150) NOT NULL,
    `salaryComponentCategoryId` INTEGER NOT NULL,
    `salaryComponentCategoryName` VARCHAR(150) NOT NULL,
    `formula` VARCHAR(300) NULL,
    `amount` FLOAT NULL DEFAULT 0,
    `isTakeHomePay` TINYINT NOT NULL DEFAULT 0,
    `sequence` INTEGER NULL,

    UNIQUE INDEX `usersSalary_uuid_key`(`uuid`),
    INDEX `usersSalary_usersId_fkey`(`usersId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bpjsTenagaKerjaComponent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isActive` TINYINT NOT NULL DEFAULT 1,
    `componentCode` VARCHAR(250) NOT NULL,
    `componentName` VARCHAR(250) NOT NULL,
    `percentage` FLOAT NULL DEFAULT 0,
    `minimumWages` FLOAT NULL DEFAULT 0,
    `maximumWages` FLOAT NULL DEFAULT 0,
    `formula` VARCHAR(300) NULL,
    `sequence` INTEGER NULL,
    `isTakeHomePay` TINYINT NOT NULL DEFAULT 0,

    UNIQUE INDEX `bpjsTenagaKerjaComponent_uuid_key`(`uuid`),
    UNIQUE INDEX `bpjsTenagaKerjaComponent_componentCode_key`(`componentCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `templateBpjsTenagaKerjaHeader` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isActive` TINYINT NOT NULL DEFAULT 1,
    `templateName` VARCHAR(250) NOT NULL,

    UNIQUE INDEX `templateBpjsTenagaKerjaHeader_uuid_key`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `templateBpjsTenagaKerjaDetails` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `salaryTemplateId` INTEGER NOT NULL,
    `bpjsTenagaKerjaTemplateId` INTEGER NOT NULL,
    `componentId` INTEGER NOT NULL,
    `componentCode` VARCHAR(250) NOT NULL,
    `componentName` VARCHAR(250) NOT NULL,
    `percentage` FLOAT NULL DEFAULT 0,
    `minimumWages` FLOAT NULL DEFAULT 0,
    `maximumWages` FLOAT NULL DEFAULT 0,
    `formula` VARCHAR(300) NULL,
    `sequence` INTEGER NULL,
    `isTakeHomePay` TINYINT NOT NULL DEFAULT 0,

    UNIQUE INDEX `templateBpjsTenagaKerjaDetails_uuid_key`(`uuid`),
    INDEX `templateBpjsTenagaKerjaDetails_bpjsTenagaKerjaTemplateId_fkey`(`bpjsTenagaKerjaTemplateId`),
    INDEX `templateBpjsTenagaKerjaDetails_salaryTemplateId_fkey`(`salaryTemplateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bpjsKesehatanComponent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isActive` TINYINT NOT NULL DEFAULT 1,
    `componentCode` VARCHAR(250) NOT NULL,
    `componentName` VARCHAR(250) NOT NULL,
    `percentage` FLOAT NULL DEFAULT 0,
    `minimumWages` FLOAT NULL DEFAULT 0,
    `maximumWages` FLOAT NULL DEFAULT 0,
    `formula` VARCHAR(300) NULL,
    `isTakeHomePay` TINYINT NOT NULL DEFAULT 0,

    UNIQUE INDEX `bpjsKesehatanComponent_uuid_key`(`uuid`),
    UNIQUE INDEX `bpjsKesehatanComponent_componentCode_key`(`componentCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `templateBpjsKesehatanHeader` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isActive` TINYINT NOT NULL DEFAULT 1,
    `templateName` VARCHAR(250) NOT NULL,

    UNIQUE INDEX `templateBpjsKesehatanHeader_uuid_key`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `templateBpjsKesehatanDetails` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `salaryTemplateId` INTEGER NOT NULL,
    `bpjsKesehatanTemplateId` INTEGER NOT NULL,
    `componentId` INTEGER NOT NULL,
    `componentCode` VARCHAR(250) NOT NULL,
    `componentName` VARCHAR(250) NOT NULL,
    `percentage` FLOAT NULL DEFAULT 0,
    `minimumWages` FLOAT NULL DEFAULT 0,
    `maximumWages` FLOAT NULL DEFAULT 0,
    `formula` VARCHAR(300) NULL,
    `isTakeHomePay` TINYINT NOT NULL DEFAULT 0,

    UNIQUE INDEX `templateBpjsKesehatanDetails_uuid_key`(`uuid`),
    INDEX `templateBpjsKesehatanDetails_bpjsKesehatanTemplateId_fkey`(`bpjsKesehatanTemplateId`),
    INDEX `templateBpjsKesehatanDetails_salaryTemplateId_fkey`(`salaryTemplateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cutOffPeriod` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isActive` TINYINT NOT NULL DEFAULT 1,
    `startPeriod` DATE NOT NULL,
    `endPeriod` DATE NOT NULL,
    `monthPeriod` VARCHAR(2) NOT NULL,
    `yearPeriod` VARCHAR(4) NOT NULL,
    `workDays` TINYINT NULL,

    UNIQUE INDEX `cutOffPeriod_uuid_key`(`uuid`),
    UNIQUE INDEX `cutOffPeriod_monthPeriod_yearPeriod_key`(`monthPeriod`, `yearPeriod`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payslipHeader` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cutOffPeriodId` INTEGER NOT NULL,
    `monthPeriod` VARCHAR(2) NOT NULL,
    `yearPeriod` VARCHAR(4) NOT NULL,
    `startPeriod` DATE NOT NULL,
    `endPeriod` DATE NOT NULL,
    `workDays` TINYINT NULL,
    `attendance` TINYINT NOT NULL,
    `usersId` INTEGER NOT NULL,
    `employeeId` INTEGER NOT NULL,
    `fullName` VARCHAR(150) NOT NULL,
    `organization` VARCHAR(150) NOT NULL,
    `jobTitle` VARCHAR(150) NOT NULL,
    `ptkp` VARCHAR(5) NOT NULL,
    `npwp` VARCHAR(150) NOT NULL,

    UNIQUE INDEX `payslipHeader_uuid_key`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payslipDetails` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `payslipHeaderId` INTEGER NOT NULL,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(250) NOT NULL,
    `category` VARCHAR(150) NOT NULL,
    `isTakeHomePay` TINYINT NOT NULL,
    `amount` FLOAT NOT NULL,
    `sequence` INTEGER NULL,

    UNIQUE INDEX `payslipDetails_uuid_key`(`uuid`),
    INDEX `payslipDetails_payslipHeaderId_fkey`(`payslipHeaderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_divisionId_fkey` FOREIGN KEY (`divisionId`) REFERENCES `division`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_jobTitleId_fkey` FOREIGN KEY (`jobTitleId`) REFERENCES `jobTitle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_businessUnitId_fkey` FOREIGN KEY (`businessUnitId`) REFERENCES `businessUnit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_ptkpId_fkey` FOREIGN KEY (`ptkpId`) REFERENCES `ptkp`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_salaryTemplateHeaderId_fkey` FOREIGN KEY (`salaryTemplateHeaderId`) REFERENCES `salaryTemplateHeader`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `modulePermission` ADD CONSTRAINT `modulePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `modulePermission` ADD CONSTRAINT `modulePermission_modulId_fkey` FOREIGN KEY (`modulId`) REFERENCES `module`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `adminManagement` ADD CONSTRAINT `adminManagement_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employeeAnnualLeave` ADD CONSTRAINT `employeeAnnualLeave_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employeeSickLeave` ADD CONSTRAINT `employeeSickLeave_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requestLeave` ADD CONSTRAINT `requestLeave_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `salaryComponent` ADD CONSTRAINT `salaryComponent_salaryComponentTypeId_fkey` FOREIGN KEY (`salaryComponentTypeId`) REFERENCES `salaryComponentType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `salaryComponent` ADD CONSTRAINT `salaryComponent_salaryComponentCategoryId_fkey` FOREIGN KEY (`salaryComponentCategoryId`) REFERENCES `salaryComponentCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `salaryTemplateDetails` ADD CONSTRAINT `salaryTemplateDetails_salaryComponentId_fkey` FOREIGN KEY (`salaryComponentId`) REFERENCES `salaryComponent`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `salaryTemplateDetails` ADD CONSTRAINT `salaryTemplateDetails_salaryTemplateId_fkey` FOREIGN KEY (`salaryTemplateId`) REFERENCES `salaryTemplateHeader`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usersSalary` ADD CONSTRAINT `usersSalary_usersId_fkey` FOREIGN KEY (`usersId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usersSalary` ADD CONSTRAINT `usersSalary_salaryComponentTypeId_fkey` FOREIGN KEY (`salaryComponentTypeId`) REFERENCES `salaryComponentType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usersSalary` ADD CONSTRAINT `usersSalary_salaryComponentCategoryId_fkey` FOREIGN KEY (`salaryComponentCategoryId`) REFERENCES `salaryComponentCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `templateBpjsTenagaKerjaDetails` ADD CONSTRAINT `templateBpjsTenagaKerjaDetails_salaryTemplateId_fkey` FOREIGN KEY (`salaryTemplateId`) REFERENCES `salaryTemplateHeader`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `templateBpjsTenagaKerjaDetails` ADD CONSTRAINT `templateBpjsTenagaKerjaDetails_bpjsTenagaKerjaTemplateId_fkey` FOREIGN KEY (`bpjsTenagaKerjaTemplateId`) REFERENCES `templateBpjsTenagaKerjaHeader`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `templateBpjsKesehatanDetails` ADD CONSTRAINT `templateBpjsKesehatanDetails_salaryTemplateId_fkey` FOREIGN KEY (`salaryTemplateId`) REFERENCES `salaryTemplateHeader`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `templateBpjsKesehatanDetails` ADD CONSTRAINT `templateBpjsKesehatanDetails_bpjsKesehatanTemplateId_fkey` FOREIGN KEY (`bpjsKesehatanTemplateId`) REFERENCES `templateBpjsKesehatanHeader`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payslipHeader` ADD CONSTRAINT `payslipHeader_usersId_fkey` FOREIGN KEY (`usersId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payslipDetails` ADD CONSTRAINT `payslipDetails_payslipHeaderId_fkey` FOREIGN KEY (`payslipHeaderId`) REFERENCES `payslipHeader`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
