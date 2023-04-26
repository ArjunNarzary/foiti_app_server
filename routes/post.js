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
  viewSavedPosts,
  reportPost,
  viewPostLikedUsers,
  exploreNearby,
  copyCoordinates,
  exploreMapPost,
  exploreMapPostData,
  addCoordinates,
  exploreMapPostDetails,
  savePostNew,
} = require("../controllers/post");
const { isAuthenticated } = require("../middlewares/auth");
const router = express.Router();

//Create Post
router.route("/").post(isAuthenticated, upload.single("postImage"), createPost);
router.route("/add-coordinates").post(isAuthenticated, addCoordinates);
// router.route("/").post(upload.single("postImage"), createPost);

//Like POST
router.route("/like/:id").get(isAuthenticated, likeUnlikePost);
//Save and Unsave post
router
  .route("/save/:id")
  .get(isAuthenticated, savePost)
  .post(isAuthenticated, savePostNew)

router.route("/contribution/points").get(createContributionPoints);

//GET RANDOM POST
router.route("/random").post(isAuthenticated, randomPosts);

//GET FOLLOWERS POSTS
router.route("/followersPosts").post(isAuthenticated, viewFollowersPosts);
//GET SAVED POSTS
router.route("/savedPosts").post(isAuthenticated, viewSavedPosts);

//ADD DIRECTION CLIKED DETAILS
router
  .route("/directionClick/:id")
  .post(isAuthenticated, addPostLocationClickedDetails);

//REPORT POST
router.route("/report").post(isAuthenticated, reportPost);

//POST LIKED USERS
router.route("/likedUsers/:post_id").post(isAuthenticated, viewPostLikedUsers);

//NEARBY POST
router.route("/explore-nearby").post(isAuthenticated, exploreNearby);
router.route("/map-posts").post(isAuthenticated, exploreMapPost);
router.route("/map-post-data").post(isAuthenticated, exploreMapPostData);
router.route("/map-post-details").post(isAuthenticated, exploreMapPostDetails)
//Coppy coordinates
// router.route("/copy-coordinates").get(isAuthenticated, copyCoordinates);



// ==============ADD ALL ROUTES ABOVE THIS ROUTE==================
//EDIT, VIEW and DELETE POST
router
  .route("/:id")
  .put(isAuthenticated, editPost)
  .post(isAuthenticated, viewPost)
  .delete(isAuthenticated, deletePost);


module.exports = router;
