const express = require("express");
const { createHelpSupport } = require("../controllers/helpSupport");

const { isAuthenticated } = require("../middlewares/auth");
const { validateHelpSupport } = require("../middlewares/validations/helpSupportValidator");

const router = express.Router();

//CREATE FEEDBBACK
router
    .route("/")
    .post(isAuthenticated, validateHelpSupport("createHelpSupport"), createHelpSupport);

module.exports = router;
