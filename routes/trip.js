const express = require('express');
const { addTrip } = require('../controllers/trip');
const { isAuthenticated } = require("../middlewares/auth");
const { validateTrip } = require('../middlewares/validations/tripValidator');
const router = express.Router();


//access chat

router.route("/add").post(isAuthenticated, validateTrip("addTrip"), addTrip)

module.exports = router