const { validationResult } = require("express-validator");
const Contribution = require("../models/Contribution");
const Place = require("../models/Place");
const PlaceViewer = require("../models/PlaceViewer");
const Post = require("../models/Post");
const Review = require("../models/Review");
const User = require("../models/User");
const { getCountry } = require("../utils/getCountry");
const PlaceLocationViewer = require("../models/PlaceLocationViewer");
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

    const results = await Place.find({
      $or: [{ name: { $regex: `^${trimedPlace}`, $options: "i" } }, {alias: { $regex: `^${trimedPlace}`, $options: "i" }}]
    })
      .where("duplicate")
      .ne(true)
      .select(
        "_id name address cover_photo short_address local_address types destination show_destinations alias display_address display_address_available destination"
      )
      .sort({ search_rank: -1 })
      .limit(12);

    // const users = await User.find({ username: { $regex: `^${trimedPlace}`, $options: "i" } })
    //   .where("name")
    //   .ne(undefined)
    //   .where("account_status")
    //   .equals("active")
    //   .where("terminated")
    //   .ne(true)
    //   .select(
    //     "_id name profileImage total_contribution"
    //   )
    //   .limit(5);

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

    if (place.address.short_country == country) {
      if (place.display_address_for_own_country != "") {
        place.local_address = place.display_address_for_own_country.substr(2);
      } else {
        place.local_address = place.display_address_for_own_country;
      }
    } else {
      if (place.display_address_for_other_country != "") {
        place.short_address = place.display_address_for_other_country.substr(2);
      } else {
        place.short_address = place.display_address_for_other_country;
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
    const distPost = await Post.find({ user: userId }).distinct("place");

    const promises = distPost.map(async (id) => {
      return (
        Post.findOne({ $and: [{ user: userId }, { place: id }] })
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
    let { skip, limit, placesArr } = req.body;

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
          .where("display_address.country")
          .equals(place.name)
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
          .where("display_address.admin_area_1")
          .equals(place.name)
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
      } else if (place.types[1] === "town" || place.types[1] === "city" || place.types[1] === "village") {
        await Place.find({})
          .where("display_address.locality")
          .equals(place.name)
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
            .where("display_address.admin_area_2")
            .equals(place.name)
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
      .where("status")
      .equals("active")
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
    let { skip, limit, placesArr, showPost = 200, ip } = req.body;

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
          .where("display_address.country")
          .equals(place.name)
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
          .where("display_address.admin_area_1")
          .equals(place.name)
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
      } else if (place.types[1] === "town" || place.types[1] === "city" || place.types[1] === "village") {
        await Place.find({})
          .where("display_address.locality")
          .equals(place.name)
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
          .where("display_address.admin_area_2")
          .equals(place.name)
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
      .where("status")
      .equals("active")
      .where("deactivated")
      .ne(true)
      .where("terminated")
      .ne(true)
      .sort({ createdAt: -1 })
      .select("_id status createdAt deactivated terminated content")
      .populate("place", "name address display_address display_address_for_own_country display_address_for_other_country original_place_id")
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
    if (place.types[1] == "village" || place.types[1] == "town" || place.types[1] == "city") {
      popular_places = await Place.find({})
        .select("_id name types destination show_destinations cover_photo display_address editor_rating original_place_id")
        .where("duplicate").ne(true)
        .where("reviewed_status").equals(true)
        .where("editor_rating").gte(1)
        .where("display_address.locality").equals(place.name)
        .where("display_address.admin_area_2").equals(place.display_address.admin_area_2)
        .where("display_address.admin_area_1").equals(place.display_address.admin_area_1)
        .where("display_address.country").equals(place.display_address.country)
        .where("types").equals("point_of_interest")
        .sort({ editor_rating: -1 })
        .skip(skip)
        .limit(limit);
    }

    //If place is state or union territory
    else if(place.types[1] == "state" || place.types[1] == "union_territory"){
      popular_places = await Place.find({})
        .select("_id name types destination show_destinations cover_photo display_address editor_rating original_place_id")
                        .where("duplicate").ne(true)
                        .where("reviewed_status").equals(true)
                        .where("editor_rating").gte(1)
                        .where("display_address.admin_area_1").equals(place.name)
                        .where("display_address.country").equals(place.display_address.country)
                        .where("types").equals("point_of_interest") 
                        .sort({ editor_rating: -1 }) 
                        .skip(skip)           
                        .limit(limit);
    }
    else if(place.types[1] == "country"){
      popular_places = await Place.find({$or:[{types: "state"}, {types: "union_territory"}]})
                      .select("_id name types destination show_destinations cover_photo display_address original_place_id")
                        .where("display_address.country").equals(place.name);
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