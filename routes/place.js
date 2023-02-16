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
  showPopularPlaces,
  explorePlace,
  attractions,
  copyPlaceCoordinates,
  exploreMapPlace,
  exploreAllMapPlaces,
  exploreMapPlaces,
  exploreMapPlaceDetails,
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
router.route("/popular-places").post(isAuthenticated, showPopularPlaces);

router.route("/explore-place/:place_id").post(isAuthenticated, explorePlace);

//NEARBY POSTS
router.route("/attractions").post(isAuthenticated, attractions);
//Map places version 6
router.route("/map-places").post(isAuthenticated, exploreMapPlace)
                            .get(isAuthenticated, exploreAllMapPlaces);
//Map places version 7
router.route("/map-places-v7").post(isAuthenticated, exploreMapPlaces);
router.route("/map-place-details").post(isAuthenticated, exploreMapPlaceDetails);
// router.route("/copy-coordinates").get(isAuthenticated, copyPlaceCoordinates);

//============AT ALL QUERIES BEFORE THIS LINE==========
router
  .route("/:place_id")
  .get(isAuthenticated, getPlace)
  .post(isAuthenticated, getPlacePosts);

module.exports = router;
