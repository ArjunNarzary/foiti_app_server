const express = require('express');
const { isAuthenticated } = require("../middlewares/auth");
const { accessChat, fetchChat, allUsers } = require("../controllers/chat/chatController");
const router = express.Router();


//access chat

router.route("/").post(isAuthenticated, accessChat)

//get all chats 
router.route("/users").get(isAuthenticated, allUsers)

router.route("/all-chats").post(isAuthenticated, fetchChat)

module.exports = router
