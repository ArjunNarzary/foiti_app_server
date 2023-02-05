const express = require("express");
const { fetchMeetupChat } = require("../controllers/chat/meetupChat");
const { updateProfile,
    getTravellers,
    getLocals,
    getTravellerDetails,
    requestMeetup,
    getMeetupRequest,
    meetupResquestResponse } = require("../controllers/meetup");

const { isAuthenticated } = require("../middlewares/auth");
const { validateMeetup } = require("../middlewares/validations/meetupValidator");

const router = express.Router();
//Update profile
router.route("/update-profile").post(isAuthenticated, validateMeetup("updateProfile"), updateProfile)
router.route("/trip-travellers").post(isAuthenticated, getTravellers);
router.route("/locals").post(isAuthenticated, getLocals);
router.route("/traveller-details/:trip_id").get(isAuthenticated, getTravellerDetails);
router.route("/meetup-chats/:skip").get(isAuthenticated, fetchMeetupChat);
router.route("/meetup-request").post(isAuthenticated, requestMeetup)
    .get(isAuthenticated, getMeetupRequest);
router.route("/meetup-request-response").post(isAuthenticated, meetupResquestResponse);



module.exports = router;
