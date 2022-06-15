const express = require("express");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const {
  createPost,
  likeUnlikePost,
  editPost,
  viewPost,
  savePost,
  createContributionPoints,
  randomPosts,
  viewFollowersPosts,
  deletePost,
  addPostLocationClickedDetails,
} = require("../controllers/post");
const { isAuthenticated } = require("../middlewares/auth");
const router = express.Router();

//Create Post
router.route("/").post(isAuthenticated, upload.single("postImage"), createPost);
// router.route("/").post(upload.single("postImage"), createPost);

//Like POST
router.route("/like/:id").get(isAuthenticated, likeUnlikePost);
//Save and Unsave post
router.route("/save/:id").get(isAuthenticated, savePost);

router.route("/contribution/points").get(createContributionPoints);

//GET RANDOM POST
router.route("/random").post(isAuthenticated, randomPosts);

//GET FOLLOWERS POSTS
router.route("/followersPosts").post(isAuthenticated, viewFollowersPosts);

//ADD DIRECTION CLIKED DETAILS
router
  .route("/directionClick/:id")
  .post(isAuthenticated, addPostLocationClickedDetails);

//EDIT, VIEW and DELETE POST
router
  .route("/:id")
  .put(isAuthenticated, editPost)
  .post(isAuthenticated, viewPost)
  .delete(isAuthenticated, deletePost);

module.exports = router;
