const express = require("express");
const { setUsageTime } = require("../controllers/usageTime");

const { isAuthenticated } = require("../middlewares/auth");

const router = express.Router();

//SETUSAGE TIME
router
    .route("/")
    .post(isAuthenticated, setUsageTime);

module.exports = router;
