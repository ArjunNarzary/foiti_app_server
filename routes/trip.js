const express = require('express');
const { addTrip, getTotalTrip } = require('../controllers/trip');
const { isAuthenticated } = require("../middlewares/auth");
const { validateTrip } = require('../middlewares/validations/tripValidator');
const router = express.Router();


//access chat

router.route("/add").post(isAuthenticated, validateTrip("addTrip"), addTrip)
router.route("/active-trips").get(isAuthenticated, getTotalTrip);

module.exports = router