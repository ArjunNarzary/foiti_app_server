const { validationResult } = require("express-validator");
const Contribution = require("../models/Contribution");
const Place = require("../models/Place");
const PlaceViewer = require("../models/PlaceViewer");
const Post = require("../models/Post");
const Review = require("../models/Review");
const User = require("../models/User");
const { getCountry } = require("../utils/getCountry");
const PlaceLocationViewer = require("../models/PlaceLocationViewer");
const { getDistance, isPointInPolygon } = require('geolib');
const { ListReceiptRuleSetsResponse } = require("@aws-sdk/client-ses");
const { where } = require("../models/Contribution");
var ObjectId = require("mongoose").Types.ObjectId;

function createError(errors, validate) {
  const arrError = validate.array();
  errors[arrError[0].param] = arrError[0].msg;
  return errors;
}

function shuffleArray(array) {
  var i = array.length,
    j = 0,
    temp;

  while (i--) {
    j = Math.floor(Math.random() * (i + 1));

    // swap randomly chosen element with current element
    temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

function shuffleArraytoNew(array, length) {
  var i = array.length,
    j = 0,
    temp;

  while (i--) {
    j = Math.floor(Math.random() * (i + 1));

    // swap randomly chosen element with current element
    temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  const newArry = array.slice(0, length);
  return newArry;

}

//Search places while adding location of post
exports.searchPlace = async (req, res) => {
  try {
    const { place, count } = req.query;
    const trimedPlace = place.trim();

    const results = await Place.find({
      $or: [{ name: { $regex: `${trimedPlace}`, $options: "i" } }, { alias: { $regex: `${trimedPlace}`, $options: "i" } }]
    }).
    limit(count);

    return res.status(200).json({
      success: true,
      results,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

//Autocomplete places for place search
exports.autocompletePlace = async (req, res) => {
  try {
    const { authUser } = req.body;
    const { place, count } = req.query;
    const { ip } = req.headers;
    const trimedPlace = place.trim();


    // //Search State and UTs
    // const resultsStateUt = await Place.find({}).and([
    //   { $or: [{ name: { $regex: `^${trimedPlace}`, $options: "i" } }, { alias: { $regex: `^${trimedPlace}`, $options: "i" } }] },
    //   { $or: [{ types: "state" }, { types: "union_territory" }] }
    // ])
    //   .where("duplicate")
    //   .ne(true)
    //   .where("destination").ne(true)
    //   .select(
    //     "_id name address cover_photo short_address local_address types google_types alias display_address display_address_available destination"
    //   )
    //   .limit(2);

    // if (resultsStateUt.length > 0) {
    //   results = [...results, ...resultsStateUt];
    // }

    // //Search others
    // const resultsOthers = await Place.find({})
    //    .or([{ name: { $regex: `^${trimedPlace}`, $options: "i" } }, { alias: { $regex: `^${trimedPlace}`, $options: "i" } }])
    //   .and([{ types: { $ne: "country" } }, { types: { $ne: "state" } }, { types: { $ne: "union_territory" } } ])
    //   .where("duplicate").ne(true)
    //   .where("destination").ne(true)
    //   .select(
    //     "_id name address cover_photo short_address local_address types google_types alias display_address display_address_available destination"
    //   )
    //   .limit(8);

    // if (resultsOthers.length > 0) {
    //   results = [...results, ...resultsOthers];
    // }
    let results = [];

    if (trimedPlace.length > 2){
      
      results = await Place.find({
        $or: [{ name: { $regex: `^${trimedPlace}`, $options: "i" } }, {alias: { $regex: `^${trimedPlace}`, $options: "i" }}]
      })
        .where("duplicate")
        .ne(true)
        .select(
          "_id name address cover_photo short_address local_address types destination show_destinations alias display_address display_address_available destination"
        )
        .sort({ search_rank: -1, _id: 1 })
        .limit(12);
    }else{
      results = await Place.find({ name: { $regex: `^${trimedPlace}`, $options: "i" } })
        .where("duplicate")
        .ne(true)
        .select(
          "_id name address cover_photo short_address local_address types destination show_destinations alias display_address display_address_available destination"
        )
        .sort({ search_rank: -1, _id: 1 })
        .limit(12);
    }

    const users = await User.find({ name: { $regex: `^${trimedPlace}`, $options: "i" } })
      .where("blocked_users").ne(authUser._id)
      .where("_id").ne(authUser._id)
      .where("terminated").ne(true)
      .select(
        "_id name profileImage total_contribution"
      )
      .sort({ total_contribution: -1, _id: 1 })
      .limit(10);



    //FORMAT ADDRESS
    let country = "";
    const location = await getCountry(ip);
    if (location != null && location.country !== undefined) {
      country = location.country;
    } else {
      country = "IN";
    }

    results.forEach((place) => {

      if(place.types.length > 1){
        const typeArray = place.types[1].split("_");
        const capitalizedArray = typeArray.map((item) => {
          return item.charAt(0).toUpperCase() + item.slice(1);
        });
        place.types[1] = capitalizedArray.join(" ");
      }
      
      if (place.address.short_country == country) {
        if (place.display_address_for_own_country != "") {
          place.local_address = place.display_address_for_own_country.substr(2);
        } else {
          place.local_address = place.display_address_for_own_country;
        }
      } else {
        if (place.display_address_for_other_country != "") {
          place.short_address =
            place.display_address_for_other_country.substr(2);
        } else {
          place.short_address = place.display_address_for_other_country;
        }
      }
    });


    return res.status(200).json({
      success: true,
      results,
      users
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getPlace = async (req, res) => {
  let errors = {};
  try {
    const { place_id } = req.params;
    const { authUser } = req.body;
    const { ip } = req.headers;

    //Validate Object ID
    if (!ObjectId.isValid(place_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid place ID",
      });
    }

    const place = await Place.findById(place_id).populate("review_id");
    // place.totalRating =

    if (!place) {
      errors.place = "Place not found";
      return res.status(404).json({
        success: false,
        error: errors,
      });
    }

    //Insert view in Place View table
    let placeViewer = await PlaceViewer.findOne({
      $and: [{ place: place._id }, { user: authUser._id }],
    });
    if (!placeViewer) {
      placeViewer = await PlaceViewer.create({
        place: place._id,
        user: authUser._id,
      });
      place.viewers.push(placeViewer._id);
      await place.save();
    }

    placeViewer.save();

    // format Type
    // let formattedType = "";
    // if(place.types.length > 0 && place.types[1] != ""){
    //   formattedType = place.types[1];
    // }
    // else if (place.google_types.length > 0) {
    //   let type = place.google_types[0];
    //   const typeArr = type.split("_");
    //   const capitalizedType = typeArr.map((type) => {
    //     return type.charAt(0).toUpperCase() + type.slice(1);
    //   });
    //   formattedType = capitalizedType.join(" ");
    // }else{
    //   formattedType = "";
    // }

    //FORMAT ADDRESS
    let country = "";
    const location = await getCountry(ip);
    if (location != null && location.country !== undefined) {
      country = location.country;
    } else {
      country = "IN";
    }

    if (place.display_name) {
      place.name = place.display_name;
    }

    if (place.address.short_country == country) {
      if (place.display_address_for_own_country != "") {
        place.local_address = place.display_address_for_own_country_place.substr(2);
      } else {
        place.local_address = place.display_address_for_own_country_place;
      }
    } else {
      if (place.display_address_for_other_country != "") {
        place.short_address = place.display_address_for_other_country_place.substr(2);
      } else {
        place.short_address = place.display_address_for_other_country_place;
      }
    }

    return res.status(200).json({
      success: true,
      place,
      // formattedType,
      avgRating: place.avgRating,
    });
  } catch (error) {
    console.log(error);
    errors.general = "Something went wrong";
    return res.status(500).json({
      success: false,
      error: errors,
    });
  }
};

//ADD OR EDIT REVIEW
exports.addEditReview = async (req, res) => {
  let errors = {};
  try {
    const validate = validationResult(req);
    if (!validate.isEmpty()) {
      return res.status(400).json({
        success: false,
        // message: validate.array(),
        message: createError(errors, validate),
      });
    }

    const { place_id } = req.params;
    const { authUser, review, rating } = req.body;

    const place = await Place.findById(place_id);

    if (!place) {
      errors.place = "Place not found";
      return res.status(404).json({
        success: false,
        error: errors,
      });
    }

    let reviewModel = {};
    const reviewExists = await Review.findOne({})
      .where("user_id")
      .equals(authUser._id)
      .where("place_id")
      .equals(place_id);
    if (reviewExists) {
      reviewExists.body = review;
      reviewExists.rating = rating;
      await reviewExists.save();
      reviewModel = reviewExists;
    } else {
      reviewModel = await Review.create({
        user_id: authUser._id,
        place_id: place_id,
        body: review,
        rating: rating,
      });

      place.review_id.push(reviewModel._id);
      place.save();
    }

    //Add contribution
    //FIND CONTRIBUTION OR CREATE NEW
    let contribution = await Contribution.findOne({ userId: authUser._id });
    if (!contribution) {
      contribution = await Contribution({ userId: authUser._id });
    }
    if (review != "" && review != undefined) {
      let review_200_characters = review.length;
      //Add contribution for review
      if (review_200_characters >= 200) {
        if (!contribution.review_200_characters.includes(reviewModel._id)) {
          contribution.review_200_characters.push(reviewModel._id);
        }
      } else {
        if (contribution.review_200_characters.includes(reviewModel._id)) {
          contribution.review_200_characters =
            contribution.review_200_characters.filter(
              (review) => review.toString() != reviewModel._id.toString()
            );
        }
      }

      if (!contribution.reviews.includes(reviewModel._id)) {
        contribution.reviews.push(reviewModel._id);
      }
    }

    //Add contribution for rating
    // if (rating != "" && rating != undefined) {
    //   if (!contribution.ratings.includes(reviewModel._id)) {
    //     contribution.ratings.push(reviewModel._id);
    //   }
    // } else {
    //   if (contribution.ratings.includes(reviewModel._id)) {
    //     contribution.ratings = contribution.ratings.filter(
    //       (review) => review.toString() != reviewModel._id.toString()
    //     );
    //   }
    // }

    await contribution.save();

    const user = await User.findById(authUser._id);
    user.total_contribution = contribution.calculateTotalContribution();
    await user.save();

    res.status(200).json({
      success: true,
      review: reviewModel,
    });
  } catch (error) {
    console.log(error);
    errors.general = "Something went wrong";
    return res.status(500).json({
      success: false,
      error: errors,
    });
  }
};

// exports.getPlacePostsOld = async (req, res) => {
//   let errors = {};
//   try {
//     const { place_id } = req.params;
//     // let { skip, limit, extraSkip } = req.body;
//     let { skip, limit } = req.body;

//     const place = await Place.findById(place_id);
//     if (!place) {
//       errors.place = "Place not found";
//       return res.status(404).json({
//         success: false,
//         error: errors,
//       });
//     }

//     let posts = [];

//     if (place.google_types[0] === "country") {
//       const places = await Place.find({})
//         .where("address.country")
//         .equals(place.address.country)
//         .populate("posts")
//         .exec()
//         .then(async (cPlace) => {
//           cPlace.map((p) => {
//             posts = [...posts, ...p.posts];
//           });
//         });
//     } else if (place.google_types[0] === "administrative_area_level_1") {
//       const places = await Place.find({})
//         .where("address.administrative_area_level_1")
//         .equals(place.address.administrative_area_level_1)
//         .where("address.country")
//         .equals(place.address.country)
//         .populate("posts")
//         .exec()
//         .then(async (cPlace) => {
//           cPlace.map((p) => {
//             posts = [...posts, ...p.posts];
//           });
//         });
//     } else if (place.google_types[0] === "administrative_area_level_2") {
//       const places = await Place.find({})
//         .where("address.administrative_area_level_2")
//         .equals(place.address.administrative_area_level_2)
//         .where("address.administrative_area_level_1")
//         .equals(place.address.administrative_area_level_1)
//         .where("address.country")
//         .equals(place.address.country)
//         .populate("posts")
//         .exec()
//         .then(async (cPlace) => {
//           cPlace.map((p) => {
//             posts = [...posts, ...p.posts];
//           });
//         });
//     } else if (place.google_types[0] === "locality") {
//       if (
//         place.address.administrative_area_level_2 != "" ||
//         place.address.administrative_area_level_2 !== undefined
//       ) {
//         const places = await Place.find({})
//           .where("address.locality")
//           .equals(place.address.locality)
//           .where("address.administrative_area_level_2")
//           .equals(place.address.administrative_area_level_2)
//           .where("address.administrative_area_level_1")
//           .equals(place.address.administrative_area_level_1)
//           .where("address.country")
//           .equals(place.address.country)
//           .populate("posts")
//           .exec()
//           .then(async (cPlace) => {
//             cPlace.map((p) => {
//               posts = [...posts, ...p.posts];
//             });
//           });
//       } else {
//         const places = await Place.find({})
//           .where("address.locality")
//           .equals(place.address.locality)
//           .where("address.administrative_area_level_1")
//           .equals(place.address.administrative_area_level_1)
//           .where("address.country")
//           .equals(place.address.country)
//           .populate("posts")
//           .exec()
//           .then((cPlace) => {
//             cPlace.map((p) => {
//               posts = [...posts, ...p.posts];
//             });
//           });
//       }
//     } else {
//       posts = await Post.find({})
//         .where("place")
//         .equals(place_id)
//         .where("status")
//         .equals("active")
//         .where("deactivated")
//         .ne(true)
//         .where("terminated")
//         .ne(true)
//         .sort({ createdAt: -1 });
//     }

//     posts = posts.filter(
//       (post) =>
//         post.status === "active" &&
//         post.deactivated !== true &&
//         post.terminated !== true
//     );

//     return res.status(200).json({
//       success: true,
//       posts,
//       skip,
//       // extraSkip,
//     });
//   } catch (error) {
//     console.log(error);
//     errors.general = "Something went wrong";
//     return res.status(500).json({
//       success: false,
//       error: errors,
//     });
//   }
// };

//ADD DIRECTION CLICKED DETAILS
exports.addPlaceLocationClickedDetails = async (req, res) => {
  let errors = {};
  try {
    const placeId = req.params.id;
    const { authUser } = req.body;
    const place = await Place.findById(placeId);

    if (!place) {
      errors.general = "Place not found";
      return res.status(404).json({
        success: false,
        message: errors,
      });
    }

    let locationClicked = await PlaceLocationViewer.findOne({
      $and: [{ place: placeId }, { user: authUser._id }],
    });

    if (!locationClicked) {
      locationClicked = await PlaceLocationViewer.create({
        place: placeId,
        user: authUser._id,
      });

      place.location_viewers.push(locationClicked._id);
      await place.save();
    }

    await locationClicked.save();

    return res.status(200).json({
      success: true,
      message: "Direction clicked details added",
    });
  } catch (error) {
    console.log(error);
    errors.general = "Something went wrong";
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//PLACES VISITED
exports.placesVisited = async (req, res) => {
  let errors = {};
  try {
    const { userId } = req.params;
    const { ip } = req.headers;
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user",
      });
    }
    let posts = [];
    // const distPost = await Post.find({ user: userId }).distinct("place");
    const allPosts = await Post.find({ user: userId }).populate("place").populate("original_place");
    let distPost = new Set();
    allPosts.map((p) => {
      if(p.original_place && p.original_place._id){
        distPost.add(p.original_place._id.toString());
      }else{
        distPost.add(p.place._id.toString());
      }
    })

    distPost = [...distPost];

    const promises = distPost.map(async (id) => {
      let objId = require('mongoose').Types.ObjectId(id);
      return (
        Post.findOne({ $and: [{ user: userId }, { $or: [{ place: objId }, { original_place: objId}]}] })
          // .where('status').equals('active')
          .where("deactivated")
          .ne(true)
          .where("terminated")
          .ne(true)
          .select("content place status deactivated terminated")
          .populate("place")
      );
    });
    if (distPost.length > 0) {
      posts = await Promise.all(promises);
    }

    posts = posts.filter(p => p != null);

    if (posts.length == 0) {
      errors.general = "No posts found";
      console.log(errors);
      return res.status(404).json({
        success: false,
        message: errors,
      });
    }

    //FORMAT ADDRESS
    let country = "";
    const location = await getCountry(ip);
    if (location != null && location.country !== undefined) {
      country = location.country;
    } else {
      country = "IN";
    }

    posts.forEach((post) => {
      if(post.place.display_name){
        post.place.name = post.place.display_name;
      }
      if (post.place.types.length > 1) {
        const typeArray = post.place.types[1].split("_");
        const capitalizedArray = typeArray.map((item) => {
          return item.charAt(0).toUpperCase() + item.slice(1);
        });
        post.place.types[1] = capitalizedArray.join(" ");
      }
      if (post.place.address.short_country == country) {
        if (post.place.display_address_for_own_country != "") {
          post.place.local_address =
            post.place.display_address_for_own_country.substr(2);
        } else {
          post.place.local_address = post.place.display_address_for_own_country;
        }
      } else {
        if (post.place.display_address_for_other_country != "") {
          post.place.short_address =
            post.place.display_address_for_other_country.substr(2);
        } else {
          post.place.short_address =
            post.place.display_address_for_other_country;
        }
      }
    });

    return res.status(200).json({
      posts,
      success: true,
    });
  } catch (error) {
    errors.general = "Fetching data failed. Please try again";
    console.log(error);
    res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

// //GET SUGGESTED POSTS FOR PLACE
// exports.getPlacePosts = async (req, res) => {
//   let errors = {};
//   try {
//     const { place_id } = req.params;
//     let { skip, limit, placesArr } = req.body;

//     //Validate Object ID
//     if (!ObjectId.isValid(place_id)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid place ID",
//       });
//     }

//     const place = await Place.findById(place_id);
//     if (!place) {
//       errors.place = "Place not found";
//       return res.status(404).json({
//         success: false,
//         error: errors,
//       });
//     }

//     let duplicate_places = [];
//     let foundPlaces = [];
//     if (placesArr.length == 0) {
//       if (place.google_types[0] === "country") {
//         await Place.find({})
//           .where("address.country")
//           .equals(place.address.country)
//           .where("duplicate")
//           .ne(true)
//           .exec()
//           .then(async (cPlace) => {
//             cPlace.map((p) => {
//               foundPlaces.push(p._id);
//               duplicate_places = [...duplicate_places, ...p.duplicate_place_id];
//             });
//           });
//       } else if (place.google_types[0] === "administrative_area_level_1") {
//         await Place.find({})
//           .where("address.administrative_area_level_1")
//           .equals(place.address.administrative_area_level_1)
//           .where("address.country")
//           .equals(place.address.country)
//           .where("duplicate")
//           .ne(true)
//           .exec()
//           .then(async (cPlace) => {
//             cPlace.map((p) => {
//               foundPlaces.push(p._id);
//               duplicate_places = [...duplicate_places, ...p.duplicate_place_id];
//             });
//           });
//       } else if (place.google_types[0] === "administrative_area_level_2") {
//         await Place.find({})
//           .where("address.administrative_area_level_2")
//           .equals(place.address.administrative_area_level_2)
//           .where("address.administrative_area_level_1")
//           .equals(place.address.administrative_area_level_1)
//           .where("address.country")
//           .equals(place.address.country)
//           .where("duplicate")
//           .ne(true)
//           .exec()
//           .then(async (cPlace) => {
//             cPlace.map((p) => {
//               foundPlaces.push(p._id);
//               duplicate_places = [...duplicate_places, ...p.duplicate_place_id];
//             });
//           });
//       } else if (place.google_types[0] === "locality") {
//         if (
//           place.address.administrative_area_level_2 != "" ||
//           place.address.administrative_area_level_2 !== undefined
//         ) {
//           await Place.find({})
//             .where("address.locality")
//             .equals(place.address.locality)
//             .where("address.administrative_area_level_2")
//             .equals(place.address.administrative_area_level_2)
//             .where("address.administrative_area_level_1")
//             .equals(place.address.administrative_area_level_1)
//             .where("address.country")
//             .equals(place.address.country)
//             .where("duplicate")
//             .ne(true)
//             .exec()
//             .then(async (cPlace) => {
//               cPlace.map((p) => {
//                 foundPlaces.push(p._id);
//                 duplicate_places = [
//                   ...duplicate_places,
//                   ...p.duplicate_place_id,
//                 ];
//               });
//             });
//         } else {
//           await Place.find({})
//             .where("address.locality")
//             .equals(place.address.locality)
//             .where("address.administrative_area_level_1")
//             .equals(place.address.administrative_area_level_1)
//             .where("address.country")
//             .equals(place.address.country)
//             .where("duplicate")
//             .ne(true)
//             .exec()
//             .then(async (cPlace) => {
//               cPlace.map((p) => {
//                 foundPlaces.push(p._id);
//                 duplicate_places = [
//                   ...duplicate_places,
//                   ...p.duplicate_place_id,
//                 ];
//               });
//             });
//         }
//       } else {
//         foundPlaces.push(place._id);
//         duplicate_places = [...place.duplicate_place_id];
//       }
//       placesArr = [...foundPlaces, ...duplicate_places];
//     }

//     let posts = await Post.find({ place: { $in: placesArr } })
//       .where("status")
//       .equals("active")
//       .where("deactivated")
//       .ne(true)
//       .where("terminated")
//       .ne(true)
//       .sort({ createdAt: -1 })
//       .select("_id status createdAt deactivated terminated content")
//       .skip(skip)
//       .limit(limit);

//     //Randomize posts
//     if (posts.length > 0) {
//       posts = shuffleArray(posts);
//     }

//     let newskip = skip + posts.length;
//     skip = newskip;

//     return res.status(200).json({
//       success: true,
//       posts,
//       skip,
//       placesArr
//     });
//   } catch (error) {
//     console.log(error);
//     errors.general = "Something went wrong.Please try again";
//     return res.status(500).json({
//       success: false,
//       message: errors,
//     });
//   }
// };

//GET SUGGESTED POSTS FOR PLACE
exports.getPlacePosts = async (req, res) => {
  let errors = {};
  try {
    const { place_id } = req.params;
    let { skip, limit, placesArr, authUser } = req.body;

    //Validate Object ID
    if (!ObjectId.isValid(place_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid place ID",
      });
    }

    const place = await Place.findById(place_id);
    if (!place) {
      errors.place = "Place not found";
      return res.status(404).json({
        success: false,
        error: errors,
      });
    }

    //This line of code is for old version
    if(placesArr === undefined){
      placesArr = [];
    }

    let duplicate_places = [];
    let foundPlaces = [];
    if (placesArr.length == 0) {
      if (place.types[1] === "country") {
        await Place.find({})
          .or([{ "display_address.country": place.name }, { name: place.name }])
          .where("duplicate")
          .ne(true)
          .exec()
          .then(async (cPlace) => {
            cPlace.map((p) => {
              foundPlaces.push(p._id);
              duplicate_places = [...duplicate_places, ...p.duplicate_place_id];
            });
          });
      } else if (place.types[1] === "state" || place.types[1] === "union_territory") {
        await Place.find({})
          .or([{ "display_address.admin_area_1": place.name }, { name: place.name }])
          .where("display_address.country")
          .equals(place.display_address.country)
          .where("duplicate")
          .ne(true)
          .exec()
          .then(async (cPlace) => {
            cPlace.map((p) => {
              foundPlaces.push(p._id);
              duplicate_places = [...duplicate_places, ...p.duplicate_place_id];
            });
          });
      } else if (place.types[1] === "town" || place.types[1] === "city") {
        await Place.find({})
          .or([{ "display_address.locality": place.name }, { name: place.name }])
          .where("display_address.admin_area_1")
          .equals(place.display_address.admin_area_1)
          .where("display_address.country")
          .equals(place.display_address.country)
          .where("duplicate")
          .ne(true)
          .exec()
          .then(async (cPlace) => {
            cPlace.map((p) => {
              foundPlaces.push(p._id);
              duplicate_places = [...duplicate_places, ...p.duplicate_place_id];
            });
          });
      } else if (place.types[1] === "neighbourhood" || place.types[1] === "village") {
        await Place.find({})
          .or([{ "display_address.sublocality": place.name }, { name: place.name }])
          .where("display_address.admin_area_2")
          .equals(place.display_address.admin_area_2)
          .where("display_address.admin_area_1")
          .equals(place.display_address.admin_area_1)
          .where("display_address.country")
          .equals(place.display_address.country)
          .where("duplicate")
          .ne(true)
          .exec()
          .then(async (cPlace) => {
            cPlace.map((p) => {
              foundPlaces.push(p._id);
              duplicate_places = [...duplicate_places, ...p.duplicate_place_id];
            });
          });
      } else if (place.types[1] === "district") {
          await Place.find({})
            .or([{ "display_address.admin_area_2": place.name }, { name: place.name }])
            .where("display_address.admin_area_1")
            .equals(place.display_address.admin_area_1)
            .where("display_address.country")
            .equals(place.display_address.country)
            .where("duplicate")
            .ne(true)
            .exec()
            .then(async (cPlace) => {
              cPlace.map((p) => {
                foundPlaces.push(p._id);
                duplicate_places = [...duplicate_places, ...p.duplicate_place_id];
              });
            });
      } else {
        foundPlaces.push(place._id);
        duplicate_places = [...place.duplicate_place_id];
      }
      placesArr = [...foundPlaces, ...duplicate_places];
    }

    let posts = await Post.find({ place: { $in: placesArr } })
      .or([{ status: "active" }, { user: authUser._id }])
      .where("deactivated")
      .ne(true)
      .where("terminated")
      .ne(true)
      .sort({ createdAt: -1 })
      .select("_id status createdAt deactivated terminated content")
      .skip(skip)
      .limit(limit);

    //Randomize posts
    if (posts.length > 0) {
      posts = shuffleArray(posts);
    }

    let newskip = skip + posts.length;
    skip = newskip;

    return res.status(200).json({
      success: true,
      posts,
      skip,
      placesArr
    });
  } catch (error) {
    console.log(error);
    errors.general = "Something went wrong.Please try again";
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//EXPLORE POSTS OF PLACE
exports.explorePlace = async (req, res) => {
  let errors = {};
  try {
    const { place_id } = req.params;
    let { skip, limit, placesArr, showPost = 200, ip, authUser } = req.body;

    //Validate Object ID
    if (!ObjectId.isValid(place_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid place ID",
      });
    }

    const place = await Place.findById(place_id);
    if (!place) {
      errors.place = "Place not found";
      return res.status(404).json({
        success: false,
        error: errors,
      });
    }

    let duplicate_places = [];
    let foundPlaces = [];
    if (placesArr.length == 0) {
      if (place.types[1] === "country") {
        await Place.find({})
          .or([{ "display_address.country": place.name }, { name: place.name }])
          .where("duplicate")
          .ne(true)
          .exec()
          .then(async (cPlace) => {
            cPlace.map((p) => {
              foundPlaces.push(p._id);
              duplicate_places = [...duplicate_places, ...p.duplicate_place_id];
            });
          });
      } else if (place.types[1] === "state" || place.types[1] === "union_territory") {
        await Place.find({})
          .or([{"display_address.admin_area_1" : place.name}, { name: place.name }])
          .where("display_address.country")
          .equals(place.display_address.country)
          .where("duplicate")
          .ne(true)
          .exec()
          .then(async (cPlace) => {
            cPlace.map((p) => {
              foundPlaces.push(p._id);
              duplicate_places = [...duplicate_places, ...p.duplicate_place_id];
            });
          });
      } else if (place.types[1] === "town" || place.types[1] === "city") {
        await Place.find({})
          .or([{ "display_address.locality": place.name }, { name: place.name }])
          .where("display_address.admin_area_1")
          .equals(place.display_address.admin_area_1)
          .where("display_address.country")
          .equals(place.display_address.country)
          .where("duplicate")
          .ne(true)
          .exec()
          .then(async (cPlace) => {
            cPlace.map((p) => {
              foundPlaces.push(p._id);
              duplicate_places = [...duplicate_places, ...p.duplicate_place_id];
            });
          });
      } else if (place.types[1] === "neighbourhood" || place.types[1] === "village") {
        await Place.find({})
          .or([{ "display_address.sublocality": place.name }, { name: place.name }])
          .where("display_address.admin_area_2")
          .equals(place.display_address.admin_area_2)
          .where("display_address.admin_area_1")
          .equals(place.display_address.admin_area_1)
          .where("display_address.country")
          .equals(place.display_address.country)
          .where("duplicate")
          .ne(true)
          .exec()
          .then(async (cPlace) => {
            cPlace.map((p) => {
              foundPlaces.push(p._id);
              duplicate_places = [...duplicate_places, ...p.duplicate_place_id];
            });
          });
      } else if (place.types[1] === "district") {
        await Place.find({})
          .or([{ "display_address.admin_area_2": place.name }, { name: place.name }])
          .where("display_address.admin_area_1")
          .equals(place.display_address.admin_area_1)
          .where("display_address.country")
          .equals(place.display_address.country)
          .where("duplicate")
          .ne(true)
          .exec()
          .then(async (cPlace) => {
            cPlace.map((p) => {
              foundPlaces.push(p._id);
              duplicate_places = [...duplicate_places, ...p.duplicate_place_id];
            });
          });
      } else {
        foundPlaces.push(place._id);
        duplicate_places = [...place.duplicate_place_id];
      }
      placesArr = [...foundPlaces, ...duplicate_places];
    }

    let posts = await Post.find({ place: { $in: placesArr } })
      .or([{ status: "active" }, { user: authUser._id }])
      .where("deactivated")
      .ne(true)
      .where("terminated")
      .ne(true)
      .sort({ createdAt: -1 })
      .select("_id status createdAt deactivated terminated content")
      .populate("place", "name display_name address display_address_available display_address display_address_for_own_country display_address_for_other_country original_place_id")
      .skip(skip)
      .limit(limit);

    //Randomize posts
    if (posts.length > 0) {
      if(showPost == 10){
        posts = shuffleArraytoNew(posts, 10);
      }else{
        posts = shuffleArray(posts);
      }
    }

    //FORMAT ADDRESS
    let country = "";
    const location = await getCountry(ip);
    if (location != null && location.country !== undefined) {
      country = location.country;
    } else {
      country = "IN";
    }

    posts.forEach((post) => {
      if(post.place.display_name){
        post.place.name = post.place.display_name;
      }
      if (post.place.address.short_country == country) {
        if (post.place.display_address_for_own_country != "") {
          post.place.local_address =
            post.place.display_address_for_own_country.substr(2);
        } else {
          post.place.local_address = post.place.display_address_for_own_country;
        }
      } else {
        if (post.place.display_address_for_other_country != "") {
          post.place.short_address =
            post.place.display_address_for_other_country.substr(2);
        } else {
          post.place.short_address =
            post.place.display_address_for_other_country;
        }
      }
    });

    let newskip = skip + posts.length;
    skip = newskip;

    return res.status(200).json({
      success: true,
      posts,
      skip,
      placesArr
    });
  } catch (error) {
    console.log(error);
    errors.general = "Something went wrong.Please try again";
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//GET DESTINATIONS FOR PLACE
exports.getPlaceDestinations = async (req, res) => {
  let errors = {};
  try{
    const { place_id } = req.body;

    //Validate Object ID
    if (!ObjectId.isValid(place_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid place ID",
      });
    }

    const place = await Place.findById(place_id);
    if (!place) {
      errors.place = "Place not found";
      return res.status(404).json({
        success: false,
        error: errors,
      });
    }

    if(place.types.length < 2 || place.display_address_avaialble == false){
      return res.status(404).json({
        success: false,
        destinations: [],
      });
    }

    let destinations = [];
    if (place.types[1] == "state" && place.show_destinations){
      //GET DESTINATIONS OF CURRENT PLACE
      destinations = await Place.find({})
                .select("_id name types destination show_destinations cover_photo display_address destination original_place_id")
                .where("display_address.admin_area_1").equals(place.name)
                .where("display_address.country").equals(place.display_address.country)
                .where("destination").equals(true);
    } else if (place.types[1] == "country" && place.show_destinations){
      //GET DESTINATIONS OF CURRENT PLACE
      destinations = await Place.find({})
                  .select("_id name types destination show_destinations cover_photo display_address destination original_place_id")
                  .where("display_address.country").equals(place.name)
                  .where("destination").equals(true);
    }

    return res.status(200).json({
      success: true,
      destinations,
    })


  }catch(error){
    console.log(error);
    errors.general = "Something went wrong.Please try again";
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
}

exports.showPopularPlaces = async (req, res) => {
  let errors = {};
  try{
      let { place_id, skip, limit } = req.body;

    //Validate Object ID
    if (!ObjectId.isValid(place_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid place ID",
      });
    }

    const place = await Place.findById(place_id);
    let popular_places = [];
    if (!place) {
      errors.place = "Place not found";
      return res.status(404).json({
        success: false,
        error: errors,
      });
    }

    if (place.types.length < 2 || place.display_address_avaialble == false) {
      return res.status(404).json({
        success: false,
        popular_places: [],
      });
    }

    //If place is destination
    if (place.types[1] == "town" || place.types[1] == "city") {
      popular_places = await Place.find({})
        .select("_id name display_name types destination show_destinations cover_photo display_address editor_rating original_place_id")
        .where("duplicate").ne(true)
        .where("reviewed_status").equals(true)
        .where("editor_rating").gte(1)
        .where("display_address.locality").equals(place.name)
        .where("display_address.admin_area_1").equals(place.display_address.admin_area_1)
        .where("display_address.country").equals(place.display_address.country)
        .where("types").equals("point_of_interest")
        .sort({ editor_rating: -1, _id: 1 })
        .skip(skip)
        .limit(limit);
    }

    //If place is destination
    if (place.types[1] == "village" || place.types[1] == "neighbourhood") {
      popular_places = await Place.find({})
        .select("_id name display_name types destination show_destinations cover_photo display_address editor_rating original_place_id")
        .where("duplicate").ne(true)
        .where("reviewed_status").equals(true)
        .where("editor_rating").gte(1)
        .where("display_address.sublocality").equals(place.name)
        .where("display_address.admin_area_1").equals(place.display_address.admin_area_1)
        .where("display_address.admin_area_2").equals(place.display_address.admin_area_2)
        .where("display_address.country").equals(place.display_address.country)
        .where("types").equals("point_of_interest")
        .sort({ editor_rating: -1, _id: 1 })
        .skip(skip)
        .limit(limit);
    }

    //If place is state or union territory
    else if(place.types[1] == "state" || place.types[1] == "union_territory"){
      popular_places = await Place.find({})
        .select("_id name display_name types destination show_destinations cover_photo display_address editor_rating original_place_id")
                        .where("duplicate").ne(true)
                        .where("reviewed_status").equals(true)
                        .where("editor_rating").gte(1)
                        .where("display_address.admin_area_1").equals(place.name)
                        .where("display_address.country").equals(place.display_address.country)
                        .where("types").equals("point_of_interest") 
                        .sort({ editor_rating: -1, _id: 1 }) 
                        .skip(skip)           
                        .limit(limit);
    }
    else if(place.types[1] == "country"){
      popular_places = await Place.find({$or:[{types: "state"}, {types: "union_territory"}]})
                      .select("_id name display_name types destination show_destinations cover_photo display_address original_place_id")
                      .where("display_address.country").equals(place.name)
                      .sort({ name: 1, _id: 1 });
    }

    skip = skip + popular_places.length;

    popular_places.forEach((p) => {
      if (p.types.length > 1) {
        const typeArray = p.types[1].split("_");
        const capitalizedArray = typeArray.map((item) => {
          return item.charAt(0).toUpperCase() + item.slice(1);
        });
        p.types[1] = capitalizedArray.join(" ");
      }
    });

    res.status(200).json({
      success: true,
      popular_places,
      skip
    })

  }catch(error){
    console.log(error);
    errors.general = "Something went wrong.Please try again";
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
}

exports.attractions = async (req, res) => {
  let errors = {};
  try {
    let { skip, currentCoordinate } = req.body;
    let limit = 20;


    const { lat, lng } = currentCoordinate;
    
    if(lat === undefined || lng === undefined){
      return res.status(401).json({
        success: false
      })
    }
    
    const maxDistanceInMeter = 99 * 1000;

    const attractions = await Place.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [lng, lat],
          },
          query: { "duplicate": false, "types": 'point_of_interest' },
          "maxDistance": maxDistanceInMeter,
          "spherical": true,
          "distanceField": "distance",
          "distanceMultiplier": 0.001
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          distance: 1,
          cover_photo: 1,
          original_place_id:1,
          address: 1,
          duplicate: 1,
          types: 1,
          google_types: 1,
        }
      },
      { $skip: skip },
      { $limit: limit }
    ]);

    skip = skip + attractions.length;
    
    let noMorePost = false;
    if (attractions.length < limit) {
      noMorePost = true;
    }

    res.status(200).json({
      attractions,
      skip,
      noMorePost
    });

  } catch (error) {
    console.log(error);
    errors.general = "Something went wrong, please try again.";
    res.status(500).json({
      success: false,
      message: errors
    })
  }
}

exports.copyPlaceCoordinates = async(req, res) => {
  return;
  try{
    const places = await Place.find({});
    places.forEach(async (place) => {
      const placeData = await Place.findById(place._id);
      const newArr = [parseFloat(placeData.coordinates.lng), parseFloat(placeData.coordinates.lat)];
      const data = {
        coordinates: newArr
      }
      console.log(data);
      placeData.location = data;
      await placeData.save();
    });

    return res.status(200).json({
      success: true,
      message: "Success"
    })

  }catch(error){
    console.log(error);
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

//MAP VIEW for version 6
exports.exploreMapPlace = async (req, res) => {
  let errors = {};
  try {
    let { topLeftCoords, topRightCoords, bottomRightCoords, bottomLeftCoords, lngDelta, latDelta, ip } = req.body;
    // const distInMeter = parseFloat(lngDelta) / 0.00004;

    if (topRightCoords.latitude === undefined || topRightCoords.longitude === undefined || 
        bottomLeftCoords.latitude === undefined || bottomLeftCoords.longitude === undefined ||
        topLeftCoords.latitude === undefined || topLeftCoords.longitude === undefined ||
        bottomRightCoords.latitude === undefined || bottomRightCoords.longitude === undefined
      ) {
      return res.status(401).json({
        success: false
      })
    }

    const upperLeftArr = [parseFloat(topLeftCoords.longitude), parseFloat(topLeftCoords.latitude)]
    const upperRightArr = [parseFloat(topRightCoords.longitude), parseFloat(topRightCoords.latitude)]
    const bottomRightArr = [parseFloat(bottomRightCoords.longitude), parseFloat(bottomRightCoords.latitude)]
    const bottomLeftArr = [parseFloat(bottomLeftCoords.longitude), parseFloat(bottomLeftCoords.latitude)]

    let places = await Place.aggregate([
      {
        $match: {
          $and: [
            {'location': {
              $geoWithin: {
                $geometry: {
                  type: "Polygon",
                  coordinates: [
                    [upperLeftArr, bottomLeftArr, bottomRightArr, upperRightArr, upperLeftArr]
                  ]
                }
              }
            }},
            { "duplicate": false },
            { "types": 'point_of_interest' },
            {"types": {$ne: 'river'}}
        ]
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          display_name: 1,
          distance: 1,
          location: 1,
          cover_photo: 1,
          original_place_id: 1,
          location:1,
          address: 1,
          display_address: 1,
          duplicate: 1,
          types: 1,
          google_types: 1,
          destination: 1,
          display_address_available: 1,
          short_address: 1,
          local_address: 1,
          display_address_for_own_country: 1,
          display_address_for_other_country: 1,
          editor_rating:1
        }

      },
      { $sort: { editor_rating: -1, _id: 1 } },
      { $limit: 30 }
    ]);

    // const selectedPlaces = [];


    // places.map(place => {
    //   if (selectedPlaces.length >= 15) return;
    //   let isNear = false;
    //   places.map(p => {
    //     const coods = {
    //       latitude: parseFloat(p.location.coordinates[1]),
    //       longitude: parseFloat(p.location.coordinates[0])
    //     }

    //     const currentCoods = {
    //       latitude: parseFloat(place.location.coordinates[1]),
    //       longitude: parseFloat(place.location.coordinates[0])
    //     }
    //     if (checkCoordsIsInsidePolygone(currentCoods, latDelta, lngDelta, coods)) {
    //       isNear = true;
    //       return
    //     }

    //   })

    //   if (!isNear) {
    //     selectedPlaces.push(place._id);
    //   }
    // });

    places = places.map(doc => {
      return new Place(doc)
    });

    //FORMAT ADDRESS
    let country = "";
    const location = await getCountry(ip);
    if (location != null && location.country !== undefined) {
      country = location.country;
    } else {
      country = "IN";
    }

    places.forEach((place) => {
      if (place.display_name) {
        place.name = place.display_name;
      }

      if (place.types.length > 1) {
        const typeArray = place.types[1].split("_");
        const capitalizedArray = typeArray.map((item) => {
          return item.charAt(0).toUpperCase() + item.slice(1);
        });
        place.types[1] = capitalizedArray.join(" ");
      }

      if (place.address.short_country == country) {
        if (place.display_address_for_own_country != "") {
          place.local_address =
            place.display_address_for_own_country.substr(2);
        } else {
          place.local_address = place.display_address_for_own_country;
        }
      } else {
        if (place.display_address_for_other_country != "") {
          place.short_address =
            place.display_address_for_other_country.substr(2);
        } else {
          place.short_address =
            place.display_address_for_other_country;
        }
      }
    });

    const displayLabel = [];

    // if (lngDelta < 0.13){
    //   places.map(place => {
    //     let isNear = false;
    //     places.map(p => {
    //       if (p._id !== place._id && !displayLabel.includes(p._id)){
    //         const distance = getDistance(
    //           { latitude: parseFloat(place.location.coordinates[1]), longitude: parseFloat(place.location.coordinates[0]) },
    //           { latitude: parseFloat(p.location.coordinates[1]), longitude: parseFloat(p.location.coordinates[0]) },
    //         )
  
    //         if (distance <= distInMeter) {
    //           isNear = true
    //           return;
    //         }
    //       }
    //     })
  
    //     if(!isNear){
    //       displayLabel.push(place._id);
    //     }
    //   })
    // }

    if (lngDelta <= 0.5){
      places.map(place => {
        if (displayLabel.length >= 12) return;
        let isNear = false;
        places.map(p => {
          const coods = {
            latitude: parseFloat(p.location.coordinates[1]),
            longitude: parseFloat(p.location.coordinates[0])
          }

          const currentCoods = {
            latitude: parseFloat(place.location.coordinates[1]),
            longitude: parseFloat(place.location.coordinates[0])
          }
          if (checkCoordsIsInsidePolygone(currentCoods, latDelta, lngDelta, coods)){
            isNear = true;
            return
          }

        })
  
        if(!isNear){
          displayLabel.push(place._id);
        }
      });
    }


    res.status(200).json({
      places,
      displayLabel
    });

  } catch (error) {
    console.log(error);
    errors.general = "Something went wrong, please try again.";
    res.status(500).json({
      success: false,
      message: errors
    })
  }
}


// exports.exploreMapPlace = async (req, res) => {
//   let errors = {};
//   try {
//     let { topLeftCoords, topRightCoords, bottomRightCoords, bottomLeftCoords, lngDelta, latDelta, ip } = req.body;
//     // const distInMeter = parseFloat(lngDelta) / 0.00004;

//     if (topRightCoords.latitude === undefined || topRightCoords.longitude === undefined ||
//       bottomLeftCoords.latitude === undefined || bottomLeftCoords.longitude === undefined ||
//       topLeftCoords.latitude === undefined || topLeftCoords.longitude === undefined ||
//       bottomRightCoords.latitude === undefined || bottomRightCoords.longitude === undefined
//     ) {
//       return res.status(401).json({
//         success: false
//       })
//     }

//     const upperLeftArr = [parseFloat(topLeftCoords.longitude), parseFloat(topLeftCoords.latitude)]
//     const upperRightArr = [parseFloat(topRightCoords.longitude), parseFloat(topRightCoords.latitude)]
//     const bottomRightArr = [parseFloat(bottomRightCoords.longitude), parseFloat(bottomRightCoords.latitude)]
//     const bottomLeftArr = [parseFloat(bottomLeftCoords.longitude), parseFloat(bottomLeftCoords.latitude)]

//     let places = await Place.aggregate([
//       {
//         $match: {
//           $and: [
//             {
//               'location': {
//                 $geoWithin: {
//                   $geometry: {
//                     type: "Polygon",
//                     coordinates: [
//                       [upperLeftArr, bottomLeftArr, bottomRightArr, upperRightArr, upperLeftArr]
//                     ]
//                   }
//                 }
//               }
//             },
//             { "duplicate": false },
//             { "types": 'point_of_interest' },
//             { "types": { $ne: 'river' } }
//           ]
//         }
//       },
//       {
//         $project: {
//           _id: 1,
//           name: 1,
//           display_name: 1,
//           location: 1,
//           // cover_photo: 1,
//           // original_place_id: 1,
//           // address: 1,
//           // display_address: 1,
//           // duplicate: 1,
//           types: 1,
//           google_types: 1,
//           // destination: 1,
//           // display_address_available: 1,
//           // short_address: 1,
//           // local_address: 1,
//           // display_address_for_own_country: 1,
//           // display_address_for_other_country: 1,
//           // editor_rating: 1
//         }
//       },
//       // { $sort: { editor_rating: -1, _id: 1 } },
//       // { $limit: 100 }
//     ]);


//     // places = places;

//     //FORMAT ADDRESS
//     let country = "";
//     const location = await getCountry(ip);
//     if (location != null && location.country !== undefined) {
//       country = location.country;
//     } else {
//       country = "IN";
//     }

//     // places = places.map(doc => new Place(doc));

//     places = places.map((p) => {
//       let place = new Place(p);
//       // if (place.display_name) {
//       //   place.name = place.display_name;
//       // }

//       // if (place.types.length > 1) {
//       //   const typeArray = place.types[1].split("_");
//       //   const capitalizedArray = typeArray.map((item) => {
//       //     return item.charAt(0).toUpperCase() + item.slice(1);
//       //   });
//       //   place.types[1] = capitalizedArray.join(" ");
//       // }

//       // if (place.address.short_country == country) {
//       //   if (place.display_address_for_own_country != "") {
//       //     place.local_address =
//       //       place.display_address_for_own_country.substr(2);
//       //   } else {
//       //     place.local_address = place.display_address_for_own_country;
//       //   }
//       // } else {
//       //   if (place.display_address_for_other_country != "") {
//       //     place.short_address =
//       //       place.display_address_for_other_country.substr(2);
//       //   } else {
//       //     place.short_address =
//       //       place.display_address_for_other_country;
//       //   }
//       // }

//       return place;
//     });

//     const displayLabel = [];

//     if (lngDelta <= 0.5) {
//       places.map(place => {
//         if (displayLabel.length >= 12) return;
//         let isNear = false;
//         places.map(p => {
//           const coods = {
//             latitude: parseFloat(p.location.coordinates[1]),
//             longitude: parseFloat(p.location.coordinates[0])
//           }

//           const currentCoods = {
//             latitude: parseFloat(place.location.coordinates[1]),
//             longitude: parseFloat(place.location.coordinates[0])
//           }
//           if (checkCoordsIsInsidePolygone(currentCoods, latDelta, lngDelta, coods)) {
//             isNear = true;
//             return
//           }

//         })

//         if (!isNear) {
//           displayLabel.push(place._id);
//         }
//       });
//     }


//     res.status(200).json({
//       places,
//       displayLabel
//     });

//   } catch (error) {
//     console.log(error);
//     errors.general = "Something went wrong, please try again.";
//     res.status(500).json({
//       success: false,
//       message: errors
//     })
//   }
// }



//MAP VIEW for version 7
exports.exploreMapPlaces = async (req, res) => {
  let errors = {};
  try {
    let { topLeftCoords, topRightCoords, bottomRightCoords, bottomLeftCoords, lngDelta, latDelta } = req.body;
    // const distInMeter = parseFloat(lngDelta) / 0.00004;

    if (topRightCoords.latitude === undefined || topRightCoords.longitude === undefined ||
      bottomLeftCoords.latitude === undefined || bottomLeftCoords.longitude === undefined ||
      topLeftCoords.latitude === undefined || topLeftCoords.longitude === undefined ||
      bottomRightCoords.latitude === undefined || bottomRightCoords.longitude === undefined
    ) {
      return res.status(401).json({
        success: false
      })
    }

    const upperLeftArr = [parseFloat(topLeftCoords.longitude), parseFloat(topLeftCoords.latitude)]
    const upperRightArr = [parseFloat(topRightCoords.longitude), parseFloat(topRightCoords.latitude)]
    const bottomRightArr = [parseFloat(bottomRightCoords.longitude), parseFloat(bottomRightCoords.latitude)]
    const bottomLeftArr = [parseFloat(bottomLeftCoords.longitude), parseFloat(bottomLeftCoords.latitude)]

    let places = await Place.aggregate([
      {
        $match: {
          $and: [
            {
              'location': {
                $geoWithin: {
                  $geometry: {
                    type: "Polygon",
                    coordinates: [
                      [upperLeftArr, bottomLeftArr, bottomRightArr, upperRightArr, upperLeftArr]
                    ]
                  }
                }
              }
            },
            { "duplicate": false },
            { "types": 'point_of_interest' },
            { "types": { $ne: 'river' } }
          ]
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          display_name: 1,
          location: 1
        }

      },
      // { $sort: { editor_rating: -1, _id: 1 } },
      // { $limit: 30 }
    ]);

    places = places.map(doc => {
      return new Place(doc)
    });

    const displayLabel = [];

    if (lngDelta <= 0.3) {
      places.map(place => {
        if (displayLabel.length >= 12) return;
        let isNear = false;
        places.map(p => {
          const coods = {
            latitude: parseFloat(p.location.coordinates[1]),
            longitude: parseFloat(p.location.coordinates[0])
          }

          const currentCoods = {
            latitude: parseFloat(place.location.coordinates[1]),
            longitude: parseFloat(place.location.coordinates[0])
          }
          if (checkCoordsIsInsidePolygone(currentCoods, latDelta, lngDelta, coods)) {
            isNear = true;
            return
          }

        })

        if (!isNear) {
          displayLabel.push(place._id);
        }
      });
    }


    res.status(200).json({
      places,
      displayLabel
    });

  } catch (error) {
    console.log(error);
    errors.general = "Something went wrong, please try again.";
    res.status(500).json({
      success: false,
      message: errors
    })
  }
}

exports.exploreAllMapPlaces = async (req, res) => {
  let errors = {};
  try {
    let places = await Place.find({})
                .where('duplicate').equals(false)
                .where('types').equals('point_of_interest')
                .where('types').ne('river')
                .select('_id name display_name location types')

    res.status(200).json({
      places
    });

  } catch (error) {
    console.log(error);
    errors.general = "Something went wrong, please try again.";
    res.status(500).json({
      success: false,
      message: errors
    })
  }
}

//GET EXPLORE MAP PLACE DETAILS
exports.exploreMapPlaceDetails = async (req, res) => {
  const errors = {};
  try{
    let { place_id, ip } = req.body;
    
    //Validate Object ID
    if (!ObjectId.isValid(place_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid place ID",
      });
    }

    const place = await Place.findById(place_id)
      .select('_id original_place_id name display_name types address display_address_available display_address display_address_for_own_country local_address cover_photo destination');

    if(!place){
      console.log(error);
      errors.general = "Place not found.";
      return res.status(404).json({
        success: false,
        message: errors
      })
    }


    //FORMAT ADDRESS
    let country = "";
    const location = await getCountry(ip);
    if (location != null && location.country !== undefined) {
      country = location.country;
    } else {
      country = "IN";
    }

      if (place.display_name) {
        place.name = place.display_name;
      }

      if (place.types.length > 1) {
        const typeArray = place.types[1].split("_");
        const capitalizedArray = typeArray.map((item) => {
          return item.charAt(0).toUpperCase() + item.slice(1);
        });
        place.types[1] = capitalizedArray.join(" ");
      }

      if (place.address.short_country == country) {
        if (place.display_address_for_own_country != "") {
          place.local_address =
            place.display_address_for_own_country.substr(2);
        } else {
          place.local_address = place.display_address_for_own_country;
        }
      } else {
        if (place.display_address_for_other_country != "") {
          place.short_address =
            place.display_address_for_other_country.substr(2);
        } else {
          place.short_address =
            place.display_address_for_other_country;
        }
      }

      return res.status(200).json({
        success: true,
        place
      })


  }catch(error){
    console.log(error);
    errors.general = "Something went wrong, please try again.";
    res.status(500).json({
      success: false,
      message: errors
    })
  }
}

//Explore map for version 8
exports.exploreMapPlaceV8 = async (req, res) => {
  let errors = {};
  try {
    let { topLeftCoords, topRightCoords, bottomRightCoords, bottomLeftCoords, lngDelta, latDelta, ip } = req.body;

    if (topRightCoords.latitude === undefined || topRightCoords.longitude === undefined ||
      bottomLeftCoords.latitude === undefined || bottomLeftCoords.longitude === undefined ||
      topLeftCoords.latitude === undefined || topLeftCoords.longitude === undefined ||
      bottomRightCoords.latitude === undefined || bottomRightCoords.longitude === undefined
    ) {
      return res.status(401).json({
        success: false
      })
    }

    const upperLeftArr = [parseFloat(topLeftCoords.longitude), parseFloat(topLeftCoords.latitude)]
    const upperRightArr = [parseFloat(topRightCoords.longitude), parseFloat(topRightCoords.latitude)]
    const bottomRightArr = [parseFloat(bottomRightCoords.longitude), parseFloat(bottomRightCoords.latitude)]
    const bottomLeftArr = [parseFloat(bottomLeftCoords.longitude), parseFloat(bottomLeftCoords.latitude)]

    let places = await Place.aggregate([
      {
        $match: {
          $and: [
            {
              'location': {
                $geoWithin: {
                  $geometry: {
                    type: "Polygon",
                    coordinates: [
                      [upperLeftArr, bottomLeftArr, bottomRightArr, upperRightArr, upperLeftArr]
                    ]
                  }
                }
              }
            },
            { "duplicate": false },
            { "types": 'point_of_interest' },
            { "types": { $ne: 'river' } }
          ]
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          display_name: 1,
          location: 1,
          editor_rating: 1
        }
      },
      { $sort: { editor_rating: -1, _id: 1 } },
      { $limit: 100 }
    ]);


    const selectedPlaces = [];
    const skipArr = [];

    for (let i = 0; i < places.length; i++) {
      if(selectedPlaces.length >= 6) break;
      if (skipArr.includes(places[i]._id)) continue;
      places.map(p => {
        const coods = {
          latitude: parseFloat(p.location.coordinates[1]),
          longitude: parseFloat(p.location.coordinates[0])
        }

        const currentCoods = {
          latitude: parseFloat(places[i].location.coordinates[1]),
          longitude: parseFloat(places[i].location.coordinates[0])

        }

        if ((p._id.toString() !== places[i]._id.toString()) && checkCoordsForAttractionIsInsidePolygone(currentCoods, latDelta, lngDelta, coods)) {
          isNear = true;
          skipArr.push(p._id);
        }

      });

      selectedPlaces.push(new Place(places[i]));
    }

    places = selectedPlaces;

    const displayLabel = [];

    if (lngDelta <= 0.5) {
      places.map(place => {
        if (displayLabel.length >= 12) return;
        let isNear = false;
        places.map(p => {
          const coods = {
            latitude: parseFloat(p.location.coordinates[1]),
            longitude: parseFloat(p.location.coordinates[0])
          }

          const currentCoods = {
            latitude: parseFloat(place.location.coordinates[1]),
            longitude: parseFloat(place.location.coordinates[0])
          }
          if (checkCoordsIsInsidePolygone(currentCoods, latDelta, lngDelta, coods)) {
            isNear = true;
            return
          }

        })

        if (!isNear) {
          displayLabel.push(place._id);
        }
      });
    }


    res.status(200).json({
      places,
      displayLabel
    });

  } catch (error) {
    console.log(error);
    errors.general = "Something went wrong, please try again.";
    res.status(500).json({
      success: false,
      message: errors
    })
  }
}




function checkCoordsIsInsidePolygone(currentCoords, latDelta, lngDelta, coordsToCheck){
  const topLeftCoords = {
    latitude: currentCoords.latitude,
    longitude: currentCoords.longitude - (lngDelta / 4)
  }

  const topRightCoords = {
    latitude: currentCoords.latitude,
    longitude: currentCoords.longitude + (lngDelta / 4)
  }

  const bottomRightCoords = {
    latitude: currentCoords.latitude - (latDelta / 16),
    longitude: currentCoords.longitude + (lngDelta / 4)
  }

  const bottomLeftCoords = {
    latitude: currentCoords.latitude - (latDelta / 16),
    longitude: currentCoords.longitude - (lngDelta / 4)
  }

  return  isPointInPolygon(coordsToCheck, [
    topLeftCoords,
    topRightCoords,
    bottomRightCoords,
    bottomLeftCoords,
    topLeftCoords
  ]);
}


function checkCoordsForAttractionIsInsidePolygone(currentCoords, latDelta, lngDelta, coordsToCheck){
  const topLeftCoords = {
    latitude: currentCoords.latitude + (latDelta / 11),
    longitude: currentCoords.longitude - (lngDelta / 5)
  }

  const topRightCoords = {
    latitude: currentCoords.latitude + (latDelta / 11),
    longitude: currentCoords.longitude + (lngDelta / 5)
  }

  const bottomRightCoords = {
    latitude: currentCoords.latitude - (latDelta / 11),
    longitude: currentCoords.longitude + (lngDelta / 5)
  }

  const bottomLeftCoords = {
    latitude: currentCoords.latitude - (latDelta / 11),
    longitude: currentCoords.longitude - (lngDelta / 5)
  }
  // const topLeftCoords = {
  //   latitude: currentCoords.latitude + (latDelta / 26),
  //   longitude: currentCoords.longitude - (lngDelta / 20)
  // }

  // const topRightCoords = {
  //   latitude: currentCoords.latitude + (latDelta / 26),
  //   longitude: currentCoords.longitude + (lngDelta / 20)
  // }

  // const bottomRightCoords = {
  //   latitude: currentCoords.latitude - (latDelta / 26),
  //   longitude: currentCoords.longitude + (lngDelta / 14)
  // }

  // const bottomLeftCoords = {
  //   latitude: currentCoords.latitude - (latDelta / 26),
  //   longitude: currentCoords.longitude - (lngDelta / 14)
  // }

  return  isPointInPolygon(coordsToCheck, [
    topLeftCoords,
    topRightCoords,
    bottomRightCoords,
    bottomLeftCoords,
    topLeftCoords
  ]);
}
// function checkCoordsForAttractionIsInsidePolygone(currentCoords, latDelta, lngDelta, coordsToCheck){
//   const topLeftCoords = {
//     latitude: currentCoords.latitude + (latDelta / 26),
//     longitude: currentCoords.longitude - (lngDelta / 20)
//   }

//   const topRightCoords = {
//     latitude: currentCoords.latitude + (latDelta / 26),
//     longitude: currentCoords.longitude + (lngDelta / 20)
//   }

//   const bottomRightCoords = {
//     latitude: currentCoords.latitude - (latDelta / 26),
//     longitude: currentCoords.longitude + (lngDelta / 14)
//   }

//   const bottomLeftCoords = {
//     latitude: currentCoords.latitude - (latDelta / 26),
//     longitude: currentCoords.longitude - (lngDelta / 14)
//   }

//   return  isPointInPolygon(coordsToCheck, [
//     topLeftCoords,
//     topRightCoords,
//     bottomRightCoords,
//     bottomLeftCoords,
//     topLeftCoords
//   ]);
// }