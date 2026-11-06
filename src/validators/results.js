const { check } = require('express-validator');

const resultsValidation = [
  check('id', 'Event id must be a valid UUID value').isUUID(),
  check('name', 'Event Name is a required field').notEmpty(),
  check('language', 'Language required field').notEmpty(),
  check('sendemails', "'sendemails' flag is required").notEmpty(),
  check('participants.*.id', 'Participant id must be a valid UUID value').isUUID(),
  check('participants.*.name', 'Participant name is a required field').notEmpty(),
  check('participants.*.email', 'Participant email is a required field').notEmpty(),
  check('participants.*.sendemail', "'sendemail' flag is required").notEmpty(),
  check('participants.*.friendid', 'Participant friendid is a required field').notEmpty()
];

module.exports = { resultsValidation };
