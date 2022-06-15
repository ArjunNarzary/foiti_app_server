const express = require("express");
const { setUpdateNotification, getUpdateNotification } = require("../controllers/updateNotification");

const router = express.Router();

//GET AND SET UPDATE NOTIFICATION
router
    .route("/")
    .post(setUpdateNotification)
    .get(getUpdateNotification);

module.exports = router;
