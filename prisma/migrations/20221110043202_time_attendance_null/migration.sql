-- AlterTable
ALTER TABLE `timeAttendance` MODIFY `checkIn` TIME(0) NULL,
    MODIFY `checkOut` TIME(0) NULL,
    MODIFY `reason` VARCHAR(300) NULL;
