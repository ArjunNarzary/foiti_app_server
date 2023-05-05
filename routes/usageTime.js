const express = require("express");
const { setUsageTime, setUsageTimeV9 } = require("../controllers/usageTime");

const { isAuthenticated } = require("../middlewares/auth");

const router = express.Router();

//SETUSAGE TIME
router
    .route("/")
    .post(isAuthenticated, setUsageTime);
router.route("/v9").post(isAuthenticated, setUsageTimeV9)

module.exports = router;
