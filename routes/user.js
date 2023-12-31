const express = require("express");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const {
  registerUser,
  loginUser,
  editProfile,
  viewOwnProfile,
  followUnfollowUser,
  viewOthersProfile,
  uploadProfileImage,
  uploadCoverImage,
  resetPassword,
  updatePassword,
  viewAllPost,
  checkOtp,
  crateNewPassword,
  enterName,
  updateUsername,
  updateEmail,
  updatePhone,
  viewFollowDetails,
  recommendedTraveller,
  viewRecommendedTraveller,
  setExpoToken,
  getNotificationSettings,
  setNotificationSettings,
  joinRequest,
  deactivate,
  contributions,
  addCurrentLocation,
  removeCurrentLocation,
  blockUser,
  reportUser,
  blockedList,
  unBlockUser,
  removeExpoToken,
  googleLogin,
  facebookLogin,
  getHomeTown,
  viewOthersProfilev10,
  viewOwnProfilev10,
  getTopContributors,
} = require("../controllers/user");
const { validateUser } = require("../middlewares/validations/userValidator");

const { isAuthenticated } = require("../middlewares/auth");
const RecommendedTraveller = require("../models/RecommendedTraveller");

const router = express.Router();

//REGISTER USER
router.route("/register").post(validateUser("createUser"), registerUser);
//LOGIN USER
router.route("/login").post(validateUser("loginUser"), loginUser);
//SOCILA LOGIN
router.route("/login/google").post(googleLogin);
router.route("/login/facebook").post(facebookLogin);

// Edit name
router
  .route("/welcome")
  .post(isAuthenticated, validateUser("validateName"), enterName);
// EDIT PROFILE AND VIEW OWN PROFILE
router
  .route("/")
  .put(isAuthenticated, validateUser("editProfile"), editProfile)
  .get(isAuthenticated, viewOwnProfile)
  .post(isAuthenticated, addCurrentLocation)
  .delete(isAuthenticated, removeCurrentLocation);
  
  //TODO::v10
router
  .route("/v10").get(isAuthenticated, viewOwnProfilev10);

//GET USER HOME TOWN
router.route('/hometown').get(isAuthenticated, getHomeTown);

//View posts of perticular user
router.route("/posts/:id").post(isAuthenticated, viewAllPost);

//UPLOAD OR CHANGE PROFILE
router
  .route("/changeProfileImage")
  .post(isAuthenticated, upload.single("image"), uploadProfileImage);

//UPLOAD OR CHANGE COVER PHOTO
router
  .route("/changeCover")
  .post(isAuthenticated, upload.single("cover"), uploadCoverImage);

//UPDATE PASSWORD
router
  .route("/updatePassword")
  .post(isAuthenticated, validateUser("updatePassword"), updatePassword);

//UPDATE USERNAME AND EMAIL
router
  .route("/update")
  .post(isAuthenticated, validateUser("validateUsername"), updateUsername)
  .put(isAuthenticated, validateUser("validateEmail"), updateEmail)
  .patch(isAuthenticated, validateUser("validatePhone"), updatePhone);

//RESET PASSWORD
router
  .route("/resetPassword")
  .post(validateUser("resetPassword"), resetPassword);
//CHECK OTP AND CREATE NEW PASSWORD
router
  .route("/resetPassword/:id")
  .post(validateUser("checkotp"), checkOtp)
  .put(validateUser("newPassword"), crateNewPassword);


router.route("/followDetails/:id")
      .get(isAuthenticated, viewFollowDetails);

router.route("/recommendedTravellers").get(isAuthenticated, viewRecommendedTraveller);
router.route("/recommended/:id").get(isAuthenticated, recommendedTraveller);
//SET EXPO TOKEN
router.route("/setExpoToken").post(isAuthenticated, setExpoToken)
                              .delete(isAuthenticated, removeExpoToken);
//GET NOTIFICATION DETAILS
router.route("/notification").get(isAuthenticated, getNotificationSettings)
      .post(isAuthenticated, setNotificationSettings);
//JOIN REQUEST
router.route("/join").post(validateUser("joinRequest"), joinRequest);
//Deactivated user
router.route("/deactivate").post(isAuthenticated, deactivate);
router.route("/contributions/:userId").get(isAuthenticated, contributions);

router.route("/block").post(isAuthenticated, blockUser)
                      .get(isAuthenticated, blockedList)
                      .put(isAuthenticated, unBlockUser);
router.route("/report").post(isAuthenticated, reportUser);
router.route("/top-contributors").get(isAuthenticated, getTopContributors);

router
  .route("/v10/:id").get(isAuthenticated, viewOthersProfilev10);

// ==============ADD ROUTES ABOVE THIS ====================
//FOLLOW UNFOLLOW VIEW OTHERS PROFILE USER
router
  .route("/:id")
  .post(isAuthenticated, followUnfollowUser)
  .get(isAuthenticated, viewOthersProfile);

module.exports = router;
