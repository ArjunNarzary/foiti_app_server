const express = require("express");
const { getNewInAppNotification, viewInAppNotification, readInAppNotification, markAllRead, deleteInAppNotification } = require("../controllers/inAppNotification");
const { isAuthenticated } = require("../middlewares/auth");
const router = express.Router();

router.route("/").get(isAuthenticated, getNewInAppNotification)
                .post(isAuthenticated, readInAppNotification)
                .put(isAuthenticated, markAllRead)
                .delete(isAuthenticated, deleteInAppNotification);
router.route("/viewNotification").get(isAuthenticated, viewInAppNotification);



module.exports = router;