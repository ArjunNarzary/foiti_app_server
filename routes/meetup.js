const express = require("express");
const { updateProfile, getTravellers, getLocals, getTravellerDetails } = require("../controllers/meetup");

const { isAuthenticated } = require("../middlewares/auth");
const { validateMeetup } = require("../middlewares/validations/meetupValidator");

const router = express.Router();
//Update profile
router.route("/update-profile").post(isAuthenticated, validateMeetup("updateProfile"), updateProfile)
router.route("/trip-travellers").post(isAuthenticated, getTravellers);
router.route("/locals").post(isAuthenticated, getLocals);
router.route("/traveller-details/:trip_id").get(isAuthenticated, getTravellerDetails);



module.exports = router;
