// Load function check
const { check } = require('express-validator');

// Export function validateSalaryTemplate
exports.validateSalaryTemplateInsert = [
  check("template_name").notEmpty().withMessage("The Template name is empty"),
  check('template_name')
  .isLength({ min:3, max: 100 })
  .withMessage("The Template name must have between 3 and 100 characters")
];

exports.validateSalaryTemplateUpdate = [
  check("template_name_edit").notEmpty().withMessage("The Template name is empty"),
  check('template_name_edit')
  .isLength({ min:3, max: 100 })
  .withMessage("The Template name must have between 3 and 100 characters")
];
