const express = require("express");
const { createComment, replayComment, likeUnlike, deleteComment, editComment, currentUserCommentAndCount, getAllComments, getReplies, reportComment } = require("../controllers/comment");
const { isAuthenticated } = require("../middlewares/auth");
const { validateComment } = require("../middlewares/validations/commentValidator");

const router = express.Router();



//CREATE COMMENT
router.route("/create/:post_id").post(isAuthenticated, validateComment("validateBody"), createComment);

//GET FIRST COMMENT OF CURRENT USER AND TOTAL COMMENTS
router.route("/total-comment/:post_id").get(isAuthenticated, currentUserCommentAndCount);

//GET ALL COMMENTS
router.route("/all-comments/:post_id").post(isAuthenticated, getAllComments);
//SHOW REPLIES
router.route("/replies/:parent_id").post(isAuthenticated, getReplies);

//REPLAY TO COMMENT
router.route("/replay/:post_id/:comment_id").post(isAuthenticated, validateComment("validateBody"), replayComment);

//REPORT COMMENT
router.route("/report").post(isAuthenticated, reportComment);


// Write all routes above this route
//LIKE UNLIKE AND DELETE
router.route("/:comment_id")
        .post(isAuthenticated, likeUnlike)
        .delete(isAuthenticated, deleteComment)
        .patch(isAuthenticated, validateComment("validateBody"), editComment);





module.exports = router;