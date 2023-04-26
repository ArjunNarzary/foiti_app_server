const express = require("express");
const { isAuthenticated } = require('../middlewares/auth')
const { sentMeetupMessage, unreadMeetupMessages, allMeetupMessage, updateMeetupMessageStatus, chatReceiverUser } = require("../controllers/chat/meetupMessage");

const router = express.Router();

router.route("/").post(isAuthenticated, sentMeetupMessage)
router.route("/get-user-details/:chatId").get(isAuthenticated, chatReceiverUser)
router.route("/unreadMsg").get(isAuthenticated, unreadMeetupMessages)
// router.route("/:chatId").get(isAuthenticated, allMessage)
router.route("/:chatId/:skip").get(isAuthenticated, allMeetupMessage)
router.route("/updatestatus/:chatId").patch(isAuthenticated, updateMeetupMessageStatus)

module.exports = router;