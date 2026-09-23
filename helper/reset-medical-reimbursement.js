const prisma = require('../libs/prisma');
let logger = require('../libs/logger');

async function resetMedicalReimbursement() {
    let createdBy = 'system';
    let updatedBy = 'system';

    try {
        const updateDataEmployeeMedicalReimbursement = await prisma.$executeRaw`UPDATE users SET medicalReimbursementRemaining = medicalReimbursementBudget, medicalReimbursementTaken = 0;`     
        console.log('Reset medical reimbursement successfully');
        return "Reset medical reimbursement successfully";

    } catch (e) {
        console.log(e.message);  
        logger.error(e);      
    }
}

module.exports = { resetMedicalReimbursement }