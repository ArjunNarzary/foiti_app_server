const express = require("express");
const { isAuthenticated } = require('../middlewares/auth')
const { sentMessage, allMessage, updateMessageStatus } = require('../controllers/chat/messageController')

const router = express.Router();

router.route("/").post(isAuthenticated, sentMessage)
// router.route("/:chatId").get(isAuthenticated, allMessage)
router.route("/:chatId/:skip").get(isAuthenticated, allMessage)
router.route("/updatestatus/:chatId").patch(isAuthenticated, updateMessageStatus)

module.exports = router;