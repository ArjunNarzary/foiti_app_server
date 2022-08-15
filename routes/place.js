const express = require("express");
const {
  searchPlace,
  getPlace,
  addEditReview,
  autocompletePlace,
  getPlacePosts,
  addPlaceLocationClickedDetails,
  placesVisited,
  getPlaceDestinations,
} = require("../controllers/place");
const router = express.Router();

const { isAuthenticated } = require("../middlewares/auth");
const { validatePlace } = require("../middlewares/validations/placeValidator");

//Search Places
router.route("/search").get(isAuthenticated, searchPlace);
//Autocomplete Places
router.route("/autocomplete/search").get(isAuthenticated, autocompletePlace);

//ADD, edit and Delete REVIEW
router
  .route("/review/:place_id")
  .post(isAuthenticated, validatePlace("addReview"), addEditReview);

//ADD DIRECTION CLIKED DETAILS
router
  .route("/directionClick/:id")
  .post(isAuthenticated, addPlaceLocationClickedDetails);
  //PLACES VISITED
router
  .route("/visited/:userId")
  .get(isAuthenticated, placesVisited);

  //GET PLACE DESTINATIONS
router.route("/destinations").post(isAuthenticated, getPlaceDestinations);

//GET PLACE
router
  .route("/:place_id")
  .get(isAuthenticated, getPlace)
  .post(isAuthenticated, getPlacePosts);

module.exports = router;
