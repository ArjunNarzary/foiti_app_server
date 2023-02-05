const express = require('express');
const { addTrip, updateTripPlan, deleteTrip, getActiveTrips } = require('../controllers/trip');
const { isAuthenticated } = require("../middlewares/auth");
const { validateTrip } = require('../middlewares/validations/tripValidator');
const router = express.Router();


//access chat

router.route("/add").post(isAuthenticated, validateTrip("addTrip"), addTrip)
router.route("/update").patch(isAuthenticated, validateTrip("addTrip"), updateTripPlan)
                        .delete(isAuthenticated, deleteTrip)
router.route("/active-trips/:user_id").get(isAuthenticated, getActiveTrips);

module.exports = router