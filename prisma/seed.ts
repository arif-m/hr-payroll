import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const moment = require('moment');

async function main() {
  await prisma.roles.createMany({
    data: [{ 'roleName': 'Employee', 'createdBy': 'Admin', 'updatedBy': 'Admin' }, { 'roleName': 'Admin', 'createdBy': 'Admin', 'updatedBy': 'Admin'  }, { 'roleName': 'Super Admin', 'createdBy': 'Admin', 'updatedBy': 'Admin' }],
    skipDuplicates: true,
  });

  await prisma.businessUnit.createMany({
    data: [{ 'businessUnitName': 'MID', 'companyName': 'PT. Global Loyal Sejahtera', 'image': 'http://localhost:3000/images/mid-logo.jpg', 'createdBy': 'Admin', 'updatedBy': 'Admin' }, { 'businessUnitName': 'TSMEDIA', 'companyName': 'PT. Teman Setia Sejahtera', 'image': 'http://localhost:3000/images/ts-media-logo.png', 'createdBy': 'Admin', 'updatedBy': 'Admin'  }],
    skipDuplicates: true,
  });

  await prisma.division.createMany({
    data: [{ 'divisionName': 'Technology', 'createdBy': 'Admin', 'updatedBy': 'Admin' }, { 'divisionName': 'Sales', 'createdBy': 'Admin', 'updatedBy': 'Admin'  }],
    skipDuplicates: true,
  });

  await prisma.jobTitle.createMany({
    data: [{ 'jobTitleName': 'VP Tech', 'createdBy': 'Admin', 'updatedBy': 'Admin' }, { 'jobTitleName': 'Tech Lead', 'createdBy': 'Admin', 'updatedBy': 'Admin'  }],
    skipDuplicates: true,
  });

  await prisma.$executeRaw`TRUNCATE TABLE setupAnnualLeave;`
  await prisma.setupAnnualLeave.create({
    data: { 'name': 'Init', 'timeOffPerMonth': 1, 'timeOffPerYear': 12, 'additionalTimeOff': 3, 'createdBy': 'Admin', 'updatedBy': 'Admin' }
  });

  await prisma.$executeRaw`TRUNCATE TABLE setupSickLeave;`
  await prisma.setupSickLeave.create({
    data: { 'name': 'Init', 'day': 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
  });

  await prisma.module.createMany({
    data: [{ 'feature': 'Home', 'uri': '/', 'description': '',  'parentId': 0, 'treeStatus': 'H', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 100 },
           { 'feature': 'Employee Management', 'uri': '#', 'description': '',  'parentId': 0, 'treeStatus': 'H',  'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 200 }, 
           { 'feature': 'Employee', 'description': '', 'uri': '/employee',  'parentId': 2, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 210 },
           { 'feature': 'Promote Employee', 'description': '', 'uri': '/promote-employee', 'parentId': 2, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 220 },
           { 'feature': 'Division', 'uri': '/division', 'description': '', 'parentId': 31,  'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 155 },           
           { 'feature': 'Job Titles', 'uri': '/jobtitles', 'description': '', 'parentId': 31, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 160 },           
           { 'feature': 'Admin Management', 'uri': '#', 'description': '', 'parentId': 0, 'treeStatus': 'H', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 300 },           
           { 'feature': 'Admin List', 'uri': '/admin-management', 'description': '', 'parentId': 7, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 310 },           
           { 'feature': 'Roles', 'uri': '/roles', 'description': '', 'parentId': 7, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 320 },           
           { 'feature': 'Roles Permission', 'uri': '/roles-permission', 'description': '', 'parentId': 7, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 330},           
           { 'feature': 'Employee Leave Setting', 'uri': '#', 'description': '', 'parentId': 0, 'treeStatus': 'H', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 400 },           
           { 'feature': 'Configure Annual Leave ', 'uri': '/leave-management/configure-annual-leave', 'description': '', 'parentId': 11, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 410 },           
           { 'feature': 'Configure Sick Leave', 'uri': '/leave-management/configure-sick-leave', 'description': '', 'parentId': 11, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 420 },           
           { 'feature': 'Employee Main Features', 'uri': '#', 'description': '', 'parentId': 0, 'treeStatus': 'H',  'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 500 },           
           { 'feature': 'View My Profile ', 'uri': '/my-profile', 'description': '', 'parentId': 14, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 510 },           
           { 'feature': 'View My Annual Leave Balance', 'uri': '/my-annual-leave', 'description': '', 'parentId': 14, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 520 },           
           { 'feature': 'View My Sick Leave Balance', 'uri': '/my-sick-leave', 'description': '', 'parentId': 14, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 530 },           
           { 'feature': 'Request Annual Leave', 'uri': '/request-annual-leave', 'description': '', 'parentId': 14, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 540 },           
           { 'feature': 'Request Sick Leave', 'uri': '/request-sick-leave', 'description': '', 'parentId': 14, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 550 },           
           { 'feature': 'Apprv Annual Leave by SPV', 'uri': '/approve-annual-leave-by-supervisor', 'description': '', 'parentId': 14, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 560 },           
           { 'feature': 'Apprv Sick Leave by SPV', 'uri': '/approve-sick-leave-by-supervisor', 'description': '', 'parentId': 14, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 570 },           
           { 'feature': 'Payroll Management', 'uri': '#', 'description': '', 'parentId': 0, 'treeStatus': 'H',  'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 600 }, 
           { 'feature': 'Payslip (Employee)', 'uri': '/payslip', 'description': '', 'parentId': 22, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 610 },           
           { 'feature': 'Generate Salary', 'uri': '/generate-salary', 'description': '', 'parentId': 22, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 620 },           
           { 'feature': 'Setup Employee Salary', 'uri': '/setup-employee-salary', 'description': '', 'parentId': 22, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 630 },           
           { 'feature': 'Salary Template', 'uri': '/salary-template', 'description': '', 'parentId': 22, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 640 },           
           { 'feature': 'Salary Component', 'uri': '/salary-component', 'description': '', 'parentId': 22, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 650 },           
           { 'feature': 'PTKP', 'uri': '/ptkp', 'description': '', 'parentId': 22, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 660 },
           { 'feature': 'Tarif Efektif Bulanan (TER)', 'uri': '/ter-rate', 'description': 'Tabel TER PMK 168/2023', 'parentId': 22, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 665 },
           { 'feature': 'Payroll Run', 'uri': '/payroll-run', 'description': 'Alur DRAFT-SUBMITTED-APPROVED-LOCKED', 'parentId': 22, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 615 },           
           { 'feature': 'History of Employment', 'uri': '/employment-history', 'description': 'Gaji & jabatan efektif-tanggal', 'parentId': 22, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 618 },           
           { 'feature': 'Calendar', 'uri': '/calendar', 'description': '', 'parentId': 22, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 670 },           
           { 'feature': 'BPJS Tenaga Kerja', 'uri': '#', 'description': '', 'parentId': 0, 'treeStatus': 'H',  'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 700 }, 
           { 'feature': 'Master Management', 'uri': '#', 'description': '', 'parentId': 0, 'treeStatus': 'H',  'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 150, 'isVisible': 1 }, 
           { 'feature': 'Master Template', 'uri': '/bpjs-tenaga-kerja-template', 'description': '', 'parentId': 30, 'treeStatus': 'D',  'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 720 }, 
           { 'feature': 'Component', 'uri': '/bpjs-tenaga-kerja-component', 'description': '', 'parentId': 30, 'treeStatus': 'D',  'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 730 }, 
           { 'feature': 'Setup Cutoff Period', 'uri': '/setup-cutoff-period', 'description': '', 'parentId': 22, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 625, 'isVisible': 0 },           
           { 'feature': 'Edit Salary', 'uri': '/list-cutoff-period', 'description': '', 'parentId': 22, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 615 },           
           { 'feature': 'Other Leave Type', 'uri': '/other-leave-type', 'description': '', 'parentId': 31, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 165 },    
           { 'feature': 'Request Other Leave', 'uri': '/request-other-leave', 'description': '', 'parentId': 14, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 552 },                  
           { 'feature': 'Request Sick Leave 2', 'uri': '/request-sick-leave2', 'description': '', 'parentId': 14, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 554 },                  
           { 'feature': 'Apprv Other Leave by SPV', 'uri': '/approve-other-leave-by-supervisor', 'description': '', 'parentId': 14, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 575 },           
           { 'feature': 'Apprv Sick Leave2 by SPV', 'uri': '/approve-sick-leave2-by-supervisor', 'description': '', 'parentId': 14, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 580 },           
           { 'feature': 'Medical Reimbursement Category', 'uri': '/medical-reimbursement-category', 'description': '', 'parentId': 31, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 170 },    
           { 'feature': 'Request Medical Reimbursement', 'uri': '/medical-reimbursement-request', 'description': '', 'parentId': 14, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 556 },                  
           { 'feature': 'Apprv Med Reimb by SPV', 'uri': '/medical-reimbursement-approved-by-supervisor/listing', 'description': '', 'parentId': 14, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 585 },          
           { 'feature': 'Apprv Med Reimb by HR', 'uri': '/medical-reimbursement-approved-by-hr/listing', 'description': '', 'parentId': 14, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 590 },          
           { 'feature': 'Apprv Med Reimb by FA', 'uri': '/medical-reimbursement-approved-by-fa/listing', 'description': '', 'parentId': 14, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 595 },          
           { 'feature': 'Payslip (Admin)', 'uri': '/payslip-admin', 'description': '', 'parentId': 22, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 612 },           
           { 'feature': 'Time Attendance (Admin)', 'uri': '/time-attendance-admin', 'description': '', 'parentId': 22, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 655 },           
           { 'feature': 'Time Attendance (Employee)', 'uri': '/time-attendance-employee', 'description': '', 'parentId': 22, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 658 },           
           { 'feature': 'Request Unpaid Leave', 'uri': '/request-unpaid-leave', 'description': '', 'parentId': 14, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 558 },           
           { 'feature': 'Appr Unpaid Leave by SPV', 'uri': '/approve-unpaid-leave-by-supervisor', 'description': '', 'parentId': 14, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 597 },           
           { 'feature': 'Overtime Management', 'uri': '#', 'description': '', 'parentId': 0, 'treeStatus': 'H', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 800 },           
           { 'feature': 'Request Overtime', 'uri': '/request-overtime', 'description': '', 'parentId': 51, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 810 },           
           { 'feature': 'Apprv Overtime by Head', 'uri': '/approve-request-overtime-by-head/listing', 'description': '', 'parentId': 51, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 820 },           
           { 'feature': 'Apprv Overtime by HR', 'uri': '/approve-request-overtime-by-hr/listing', 'description': '', 'parentId': 51, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 830 },           
           { 'feature': 'PKP', 'uri': '/pkp', 'description': '', 'parentId': 22, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 665 },           
           { 'feature': 'Apprv Annual Leave (HR)', 'uri': '/approve-annual-leave-by-hr', 'description': '', 'parentId': 14, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 562 },           
           { 'feature': 'Apprv Sick Leave by HR', 'uri': '/approve-sick-leave-by-hr', 'description': '', 'parentId': 14, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 571 },           
           { 'feature': 'Apprv Other Leave by HR', 'uri': '/approve-other-leave-by-hr', 'description': '', 'parentId': 14, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 576 },           
           { 'feature': 'Apprv Sick Leave2 by HR', 'uri': '/approve-sick-leave2-by-hr', 'description': '', 'parentId': 14, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 581 },           
           { 'feature': 'Apprv Unpaid Leave by HR', 'uri': '/approve-unpaid-leave-by-hr', 'description': '', 'parentId': 14, 'treeStatus': 'D', 'createdBy': 'Admin', 'updatedBy': 'Admin', 'sequence': 598 },          
  ],
    skipDuplicates: true,
  })

  await prisma.modulePermission.createMany({
    data: [
      {"roleId": 3, 'modulId': 1, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 2, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 3, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 3, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 4, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 5, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 6, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 7, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 8, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 9, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 10, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 11, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 12, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 13, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 14, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 15, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 16, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 17, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 18, "createRight": 1, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 19, "createRight": 1, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 20, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 21, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 22, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 23, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 24, "createRight": 1, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 25, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 26, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 27, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 28, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 29, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 30, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 31, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 32, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 33, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 35, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 36, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 37, "createRight": 1, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 38, "createRight": 1, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 39, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 40, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 41, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 42, "createRight": 1, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 43, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 44, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 45, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 46, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 47, "createRight": 1, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 48, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 49, "createRight": 1, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 50, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 51, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 52, "createRight": 1, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 53, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 54, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 3, 'modulId': 55, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 1, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 2, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 3, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 3, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 4, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 5, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 6, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 7, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 8, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 9, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 10, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 11, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 12, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 13, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 14, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 15, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 16, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 17, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 18, "createRight": 1, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 19, "createRight": 1, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 20, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 21, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 22, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 23, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 24, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 25, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 26, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 27, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 28, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 29, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 30, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 31, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 32, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 33, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 35, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 36, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 37, "createRight": 1, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 38, "createRight": 1, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 39, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 40, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 41, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 1, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 42, "createRight": 1, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 43, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 44, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 45, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 46, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 47, "createRight": 1, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 48, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 49, "createRight": 1, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 50, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 51, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 52, "createRight": 1, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 53, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 54, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 2, 'modulId': 55, "createRight": 1, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 1, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 2, "createRight": 0, "readRight": 0, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 3, "createRight": 0, "readRight": 0, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 4, "createRight": 0, "readRight": 0, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 5, "createRight": 0, "readRight": 0, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 6, "createRight": 0, "readRight": 0, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 7, "createRight": 0, "readRight": 0, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 8, "createRight": 0, "readRight": 0, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 9, "createRight": 0, "readRight": 0, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 10, "createRight": 0, "readRight": 0, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 11, "createRight": 0, "readRight": 0, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 12, "createRight": 0, "readRight": 0, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 13, "createRight": 0, "readRight": 0, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 14, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 15, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 16, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 17, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 18, "createRight": 1, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 19, "createRight": 1, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 22, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 23, "createRight": 0, "readRight": 1, "updateRight": 1, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 37, "createRight": 1, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 38, "createRight": 1, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 42, "createRight": 1, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 48, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 49, "createRight": 1, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 51, "createRight": 0, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
      {"roleId": 1, 'modulId': 52, "createRight": 1, "readRight": 1, "updateRight": 0, "deleteRight": 0, "inactiveRight": 0, 'createdBy': 'Admin', 'updatedBy': 'Admin' },
  ],
    skipDuplicates: true,
  })

  await prisma.$executeRaw`TRUNCATE TABLE leaveType;`
  await prisma.leaveType.createMany({
    data: [
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'uuid': '3432a8e3-fb91-4fd8-9ee8-0a760d17e365', 'description': 'Annual Leave', 'day': 0,'allowToOverrideLimit': 1 },
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'uuid': '70d32c0b-39e8-499e-ac79-fc001dc80775', 'description': 'Sick Leave (Tanpa Surat Dokter)', 'day': 2,'allowToOverrideLimit': 0 },
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'uuid': '75872dba-79e1-487a-a012-a3f09fcf2592', 'description': 'Sick Leave 2 (Dengan Surat Dokter)', 'day': 0,'allowToOverrideLimit': 0 },
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'uuid': '0a06944b-3abb-4e40-b627-41c83db31e80', 'description': 'Unpaid Leave', 'day': 0,'allowToOverrideLimit': 0 },      
    ],
    skipDuplicates: true,
  })

  //await prisma.$executeRaw`TRUNCATE TABLE ptkp;`
  await prisma.ptkp.createMany({
    data: [
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'description': 'Tidak kawin', 'code': 'TK/0', 'amount': 54000000},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'description': 'Tidak kawin punya tanggungan 1', 'code': 'TK/1', 'amount':  58500000},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'description': 'Tidak kawin punya tanggungan 2', 'code': 'TK/2', 'amount':  63000000},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'description': 'Tidak kawin punya tanggungan 3', 'code': 'TK/3', 'amount':  67500000},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'description': 'Kawin', 'code': 'K/0', 'amount': 58500000},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'description': 'Kawin punya anak 1', 'code': 'K/1', 'amount':  63000000},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'description': 'Kawin punya anak 2', 'code': 'K/2', 'amount':  67500000},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'description': 'Kawin punya anak 3', 'code': 'K/3', 'amount':  72000000},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'description': 'Kawin dengan penghasilan istri digabung', 'code': 'K/I/0', 'amount':  112500000},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'description': 'Kawin dengan penghasilan istri digabung punya anak 1', 'code': 'K/I/1', 'amount':  117000000},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'description': 'Kawin dengan penghasilan istri digabung punya anak 2', 'code': 'K/I/2', 'amount':  121500000},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'description': 'Kawin dengan penghasilan istri digabung punya anak 3', 'code': 'K/I/3', 'amount':  126000000},
    ],
    skipDuplicates: true,
  })

  await prisma.pkp.createMany({
    data: [
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'description': 'Penghasilan tahunan sampai dengan Rp60.000.000 dikenakan tarif pajak penghasilan sebesar 5 persen', 'code': 'Lapisan 1', 'startSalary': 0, 'endSalary': 60000000, 'ratesPercentage': 5},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'description': 'Penghasilan tahunan di atas Rp60.000.000 sampai dengan Rp250.000.000 dikenakan tarif sebesar 15 persen', 'code': 'Lapisan 2', 'startSalary': 60000000, 'endSalary': 250000000, 'ratesPercentage': 15},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'description': 'Penghasilan tahunan di atas Rp250.000.000 sampai dengan Rp500.000.000 dikenakan tarif pajak sebesar 25 persen', 'code': 'Lapisan 3', 'startSalary': 250000000, 'endSalary': 500000000, 'ratesPercentage': 25},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'description': 'Penghasilan tahunan di atas Rp500.000.000 sampai dengan Rp5.000.000.000 dikenakan tarif pajak sebesar 30 persen', 'code': 'Lapisan 4', 'startSalary': 500000000, 'endSalary': 5000000000, 'ratesPercentage': 30},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'description': 'Penghasilan tahunan di atas Rp5.000.000.000 dikenakan tarif pajak sebesar 35 persen', 'code': 'Lapisan 5', 'startSalary': 5000000000, 'endSalary': 999000000000000, 'ratesPercentage': 35},
    ],
    skipDuplicates: true,
  })

  await prisma.$executeRaw`TRUNCATE TABLE setupSystem`
  await prisma.setupSystem.create({
    data: { 'workDays': 5, 'workHours': 8, 'workStart': moment.utc('2022-07-01 08:00:00').toDate(), 'workEnd': moment.utc('2022-07-01 17:00:00').toDate(), 'createdBy': 'Admin', 'updatedBy': 'Admin', 'defaultTaxMethod': 'GrossUp', 'taxPercentage': 5, 'biayaJabatanMaxMonthly': 500000, 'npwpSurchargePct': 20, 'isActivatePercentageMedicalReimbursement': 1, 'thrBudgetBaseCodes': 'BS', 'thrEligibilityMonths': 1, 'thrProrateRoundDays': 1 }
  });

  //await prisma.$executeRaw`TRUNCATE TABLE salaryComponentType`
  await prisma.salaryComponentCategory.createMany({
    data: [
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'componentCategory': 'Earnings'},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'componentCategory': 'Deductions'},
    ],
    skipDuplicates: true,
  });

  await prisma.salaryComponentType.createMany({
    data: [
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'componentType': 'Individual', 'isActive': 0},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'componentType': 'Formula'},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'componentType': 'Job Title', 'isActive': 0},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'componentType': 'Job Level', 'isActive': 0},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'componentType': 'Editable', 'isActive': 0},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'componentType': 'Fixed'},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'componentType': 'Variable'},
    ],
    skipDuplicates: true,
  });

  await prisma.salaryComponent.createMany({
    data: [
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'componentCode': 'BS', 'componentName': 'Basic Salary', 'salaryComponentTypeId': 7, 'salaryComponentCategoryId': 1, 'isTaxable': 1, 'isActive': 1, 'sequence': 100, 'isTakeHomePay': 1},
      //{'createdBy': 'Admin', 'updatedBy': 'Admin', 'componentCode': 'OA', 'componentName': 'Other Allowance', 'salaryComponentTypeId': 1, 'salaryComponentCategoryId': 1, 'isTaxable': 1, 'isActive': 1, 'sequence': 150, 'isTakeHomePay': 1},
    ],
    skipDuplicates: true,
  });

  await prisma.salaryTemplateHeader.create({
    data: 
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'templateName': 'Standard'},
  });
  
  await prisma.salaryTemplateDetails.create({
    data: 
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'salaryTemplateId': 1, 'salaryComponentId': 1},
  });

  await prisma.$executeRaw`TRUNCATE TABLE bpjsTenagaKerjaComponent`
  await prisma.bpjsTenagaKerjaComponent.createMany({
    data: [
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'componentCode': 'JKK', 'componentName': 'JKK Company', 'percentage': 0.24, 'formula': 'BS', 'sequence': 1000, 'isTakeHomePay': 0},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'componentCode': 'JKM', 'componentName': 'JKM Company', 'percentage': 0.3, 'formula': 'BS', 'sequence': 1100, 'isTakeHomePay': 0},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'componentCode': 'JHTC', 'componentName': 'JHT Company', 'percentage': 3.7, 'formula': 'BS', 'sequence': 1200, 'isTakeHomePay': 0},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'componentCode': 'JPC', 'componentName': 'JP Company', 'percentage': 2, 'maximumWages': 9077600, 'formula': 'BS', 'sequence': 1300, 'isTakeHomePay': 0},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'componentCode': 'JHTE', 'componentName': 'JHT Employee', 'percentage': 2, 'formula': 'BS', 'sequence': 2000, 'isTakeHomePay': 1},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'componentCode': 'JPE', 'componentName': 'JP Employee', 'percentage': 1, 'maximumWages': 9077600, 'formula': 'BS', 'sequence': 2100, 'isTakeHomePay': 1},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'componentCode': 'JKP', 'componentName': 'JKP Company', 'percentage': 0.46, 'formula': 'BS', 'sequence': 1150, 'isTakeHomePay': 0},
    ],
    skipDuplicates: true,
  });

  await prisma.templateBpjsTenagaKerjaHeader.create({
    data: 
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'templateName': 'BPJS_TK'},
  });

  await prisma.templateBpjsTenagaKerjaDetails.createMany({
    data: [
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'salaryTemplateId': 1, 'bpjsTenagaKerjaTemplateId': 1, 'componentId': 1, 'componentCode': 'JKK', 'componentName': 'JKK Company', 'percentage': 0.24, 'minimumWages': 0, 'maximumWages': 0, 'formula': 'BS', 'sequence': 1100, 'isTakeHomePay': 0},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'salaryTemplateId': 1, 'bpjsTenagaKerjaTemplateId': 1, 'componentId': 2, 'componentCode': 'JKM', 'componentName': 'JKM Company', 'percentage': 0.3, 'minimumWages': 0, 'maximumWages': 0, 'formula': 'BS', 'sequence': 1100, 'isTakeHomePay': 0},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'salaryTemplateId': 1, 'bpjsTenagaKerjaTemplateId': 1, 'componentId': 3, 'componentCode': 'JHTC', 'componentName': 'JHT Company', 'percentage': 3.7, 'minimumWages': 0, 'maximumWages': 0, 'formula': 'BS', 'sequence': 1200, 'isTakeHomePay': 0},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'salaryTemplateId': 1, 'bpjsTenagaKerjaTemplateId': 1, 'componentId': 4, 'componentCode': 'JPC', 'componentName': 'JP Company', 'percentage': 2, 'maximumWages': 9077600, 'formula': 'BS', 'sequence': 1300, 'isTakeHomePay': 0},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'salaryTemplateId': 1, 'bpjsTenagaKerjaTemplateId': 1, 'componentId': 5, 'componentCode': 'JHTE', 'componentName': 'JHT Employee', 'percentage': 2, 'formula': 'BS', 'sequence': 2000, 'isTakeHomePay': 1},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'salaryTemplateId': 1, 'bpjsTenagaKerjaTemplateId': 1, 'componentId': 6, 'componentCode': 'JPE', 'componentName': 'JP Employee', 'percentage': 1, 'maximumWages': 9077600, 'formula': 'BS', 'sequence': 2100, 'isTakeHomePay': 1},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'salaryTemplateId': 1, 'bpjsTenagaKerjaTemplateId': 1, 'componentId': 7, 'componentCode': 'JKP', 'componentName': 'JKP Company', 'percentage': 0.46, 'minimumWages': 0, 'maximumWages': 0, 'formula': 'BS', 'sequence': 1150, 'isTakeHomePay': 0},
    ],
    skipDuplicates: true,
  });

  await prisma.users.createMany({
    data: [
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'employeeId': 202211001, 'roleId': 1, 'fullName': 'arif', 'email': 'arifmugi@gmail.com', 'mobilePhone': '08777777', 'placeOfBirth': 'Depok', 'address': 'depok', 'ptkpId': 1, 'joinDate': moment.utc('2023-01-01 08:00:00').toDate(), 'dob': moment.utc('2000-07-01 08:00:00').toDate(),'businessUnitId': 1, 'divisionId': 1, 'jobTitleId': 2, 'supervisor': 2, 'password': '$2b$10$YtS/rGo3XxF.awpt6gQX7ehnarbpKZhqytxTkrwoRgjsHJazVARmu', 'salt': '$2b$10$YtS/rGo3XxF.awpt6gQX7e', 'basicSalary': 0, npwp: '000', bankName: 'BCA', bankAccountNumber: '1234567890', bankAccountHolder: 'ARIF', 'medicalReimbursementBudget': 1000000, 'medicalReimbursementRemaining': 1000000 },
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'employeeId': 202211002, 'roleId': 2, 'assignDate': moment.utc('2023-01-01 08:00:00').toDate(), 'assignBy': 'Super Admin', 'fullName': 'admin', 'email': 'admin@gmail.com', 'mobilePhone': '087777779', 'placeOfBirth': 'Depok', 'address': 'depok', 'ptkpId': 1, 'joinDate': moment.utc('2023-01-01 08:00:00').toDate(), 'dob': moment.utc('2000-07-01 08:00:00').toDate(), 'businessUnitId': 1, 'divisionId': 1, 'jobTitleId': 1, 'supervisor': 2, 'password': '$2b$10$YtS/rGo3XxF.awpt6gQX7ehnarbpKZhqytxTkrwoRgjsHJazVARmu', 'salt': '$2b$10$YtS/rGo3XxF.awpt6gQX7e', 'basicSalary': 0, npwp: '001', bankName: 'MANDIRI', bankAccountNumber: '9876543210', bankAccountHolder: 'ADMIN', 'medicalReimbursementBudget': 1000000, 'medicalReimbursementRemaining': 1000000 },
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'employeeId': 202211003, 'roleId': 3, 'assignDate': moment.utc('2023-01-01 08:00:00').toDate(), 'assignBy': 'Super Admin', 'fullName': 'super admin', 'email': 'superadmin@gmail.com', 'mobilePhone': '0877777709', 'placeOfBirth': 'Depok', 'address': 'depok', 'ptkpId': 1, 'joinDate': moment.utc('2022-10-01 08:00:00').toDate(), 'dob': moment.utc('2000-07-01 08:00:00').toDate(), 'businessUnitId': 1, 'divisionId': 1, 'jobTitleId': 1, 'supervisor': 3, 'password': '$2b$10$YtS/rGo3XxF.awpt6gQX7ehnarbpKZhqytxTkrwoRgjsHJazVARmu', 'salt': '$2b$10$YtS/rGo3XxF.awpt6gQX7e', 'basicSalary': 0, npwp: '003', bankName: 'BRI', bankAccountNumber: '5554443332', bankAccountHolder: 'SUPER ADMIN', 'medicalReimbursementBudget': 1000000, 'medicalReimbursementRemaining': 1000000 },
    ],
  });

  await prisma.adminManagement.createMany({
    data: [
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'employeeId': 2, 'role': 'Admin', 'assignDate':  moment.utc('2023-01-01 08:00:00').toDate(), 'assignBy': 'Super Admin'},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'employeeId': 3, 'role': 'Super Admin', 'assignDate':  moment.utc('2023-01-01 08:00:00').toDate(), 'assignBy': 'Super Admin' },
    ],
  });

  await prisma.medicalReimbursementCategory.createMany({
    data: [
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'description': 'Kesehatan', 'percentage': 70},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'description': 'Gigi', 'percentage': 15},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'description': 'Kacamata', 'percentage': 15},
    ],
    skipDuplicates: true,
  });

  await prisma.setupOvertimeMultiplier.createMany({
    data: [
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'numberOfOvertimeHours': 1, 'workDaysMultiplier': 1.5, 'workDays6MultiplierHoliday': 2, 'workDays6MultiplierHolidaySortDay': 2, 'workDays5MultiplierHoliday': 2},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'numberOfOvertimeHours': 2, 'workDaysMultiplier': 3.5, 'workDays6MultiplierHoliday': 4, 'workDays6MultiplierHolidaySortDay': 4, 'workDays5MultiplierHoliday': 4},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'numberOfOvertimeHours': 3, 'workDaysMultiplier': 5.5, 'workDays6MultiplierHoliday': 6, 'workDays6MultiplierHolidaySortDay': 6, 'workDays5MultiplierHoliday': 6},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'numberOfOvertimeHours': 4, 'workDaysMultiplier': 7.5, 'workDays6MultiplierHoliday': 8, 'workDays6MultiplierHolidaySortDay': 8, 'workDays5MultiplierHoliday': 8},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'numberOfOvertimeHours': 5, 'workDaysMultiplier': 0, 'workDays6MultiplierHoliday': 10, 'workDays6MultiplierHolidaySortDay': 10, 'workDays5MultiplierHoliday': 10},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'numberOfOvertimeHours': 6, 'workDaysMultiplier': 0, 'workDays6MultiplierHoliday': 12, 'workDays6MultiplierHolidaySortDay': 13, 'workDays5MultiplierHoliday': 12},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'numberOfOvertimeHours': 7, 'workDaysMultiplier': 0, 'workDays6MultiplierHoliday': 14, 'workDays6MultiplierHolidaySortDay': 17, 'workDays5MultiplierHoliday': 14},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'numberOfOvertimeHours': 8, 'workDaysMultiplier': 0, 'workDays6MultiplierHoliday': 17, 'workDays6MultiplierHolidaySortDay': 21, 'workDays5MultiplierHoliday': 16},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'numberOfOvertimeHours': 9, 'workDaysMultiplier': 0, 'workDays6MultiplierHoliday': 21, 'workDays6MultiplierHolidaySortDay': 25, 'workDays5MultiplierHoliday': 19},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'numberOfOvertimeHours': 10, 'workDaysMultiplier': 0, 'workDays6MultiplierHoliday': 25, 'workDays6MultiplierHolidaySortDay': 0, 'workDays5MultiplierHoliday': 23},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'numberOfOvertimeHours': 11, 'workDaysMultiplier': 0, 'workDays6MultiplierHoliday': 29, 'workDays6MultiplierHolidaySortDay': 0, 'workDays5MultiplierHoliday': 27},
      {'createdBy': 'Admin', 'updatedBy': 'Admin', 'numberOfOvertimeHours': 12, 'workDaysMultiplier': 0, 'workDays6MultiplierHoliday': 0, 'workDays6MultiplierHolidaySortDay': 0, 'workDays5MultiplierHoliday': 31},
    ],
    skipDuplicates: true,
  });

  // --- Menu absensi Fase 1/2 (Master Shift, Employee Shift, Business Unit,
  //     Setup Attendance) + permission. Sumber data tunggal di
  //     scripts/attendance-menu-data.js; idempotent, aman untuk re-seed.
  await require('../scripts/attendance-menu-data').seedAttendanceMenu(prisma);

  // --- Restrukturisasi side menu: My Approvals (ganti 13 menu approval) +
  //     4 sub-grup Payroll Management. Idempotent.
  await require('../scripts/side-menu-inbox-data').seedSideMenuRestructure(prisma);

  // --- Menu Annual Leave Reset (penghangusan manual saldo annual leave).
  //     Idempotent; permission = union pemegang parent Employee Leave Setting.
  await require('../scripts/annual-leave-reset-menu').seedAnnualLeaveResetMenu(prisma);

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
