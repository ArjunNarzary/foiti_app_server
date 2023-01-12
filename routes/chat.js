const express = require('express');
const { isAuthenticated } = require("../middlewares/auth");
const { accessChat, fetchChat, allUsers } = require("../controllers/chat/chatController");
const router = express.Router();


//access chat

router.route("/").post(isAuthenticated, accessChat)

//get all chats 
router.route("/users").get(isAuthenticated, allUsers)

router.route("/:skip").get(isAuthenticated, fetchChat)

module.exports = router
