const jwt = require("jsonwebtoken");
const sharp = require("sharp");
const fs = require("fs");
const util = require("util");
const User = require("../models/User");
const Place = require("../models/Place");
const unlinkFile = util.promisify(fs.unlink);
const { uploadFile, deleteFile } = require("../utils/s3");
const Post = require("../models/Post");
const PostLike = require("../models/PostLike");
const PlaceAddeddBy = require("../models/PlaceAddedBy");
const ContributionPoint = require("../models/ContributionPoint");
const SavePostPlace = require("../models/SavePostPlace");
const Contribution = require("../models/Contribution");
const { getCountry } = require("../utils/getCountry");
const Review = require("../models/Review");
const PostViewer = require("../models/PostViewer");
const PostLocationViewer = require("../models/PostLocationViewer");
const { deleteNotificationOnUnlike, sendPostLikeNotification, sendNewPostNotification } = require("../utils/sendInAppNotifiation");
var ObjectId = require('mongoose').Types.ObjectId;

exports.createContributionPoints = async (req, res) => {
  try {
    const contri = await ContributionPoint.create({
      place: 10,
      added_place: 15,
      photo: 5,
      review: 10,
      review_200_characters: 10,
      rating: 1,
      reports: 10,
    });

    res.json({
      success: true,
      contri,
    });
  } catch (error) {}
};

//CREATE POST
exports.createPost = async (req, res) => {
  let errors = {};
  try {
    const { token } = req.headers;
    const decoded = await jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id);

    const details = JSON.parse(req.body.details);

    //Validate CAPTION LENGTH
    if (req.body.caption.length > 2000) {
      errors.caption = "Please write caption within 2000 characeters";
      await unlinkFile(req.file.path);
      return res.status(400).json({
        success: false,
        message: errors,
      });
    }
    //IF user not found
    if (!user) {
      errors.general = "Unauthorized User";
      await unlinkFile(req.file.path);
      return res.status(400).json({
        success: false,
        message: errors,
      });
    }

    //IF USER UPLOAD STATUS IS FALSE
    if (user.upload_status === false) {
      errors.general = "You are not authorized to upload post yet";
      await unlinkFile(req.file.path);
      return res.status(400).json({
        success: false,
        message: errors,
      });
    }

    //UPLOAD IMAGE TO S3
    //Resize post Image if width is larger than 1080
    // let resultLarge = {};
    // if (details.images[0].width > 1080)

    const sharpLarge = await sharp(req.file.path)
      .resize(1080)
      .withMetadata()
      .toBuffer();
    const resultLarge = await uploadFile(req.file, sharpLarge);

    //Resize Image for thumbnail
    const sharpThumb = await sharp(req.file.path)
      // .resize(500, 500, { fit: "cover" })
      .resize(500)
      .withMetadata()
      .toBuffer();
    const resultThumb = await uploadFile(req.file, sharpThumb);

    //Resize Image for small
    const sharpSmall = await sharp(req.file.path)
      .resize(150, 150, { fit: "cover" })
      .withMetadata()
      .toBuffer();
    const resultSmall = await uploadFile(req.file, sharpSmall);
    // const resultThumb = await uploadFile(req.file, fileStream);

    //CHECK IF PLACE ID IS ALREADY PRESENT
    let newPlaceCreated = false;
    let place = await Place.findOne({ google_place_id: details.place_id });
    if (!place) {
      place = await Place.create({
        name: details.name,
        google_place_id: details.place_id,
        address: details.address,
        coordinates: details.coordinates,
        google_types: details.types,
        created_place: details.created_place,
        cover_photo: {
          thumbnail: {
            public_url: resultThumb.Location,
            private_id: resultThumb.Key,
          },
          small: {
            public_url: resultSmall.Location,
            private_id: resultSmall.Key,
          },
          large: {
            public_url: resultLarge.Location,
            private_id: resultLarge.Key,
          },
        },
      });
      newPlaceCreated = true;
    }

    if (!place) {
      errors.message = "Please try again after some time.";
      await unlinkFile(req.file.path);
      //IF UPLOADED DELETE FROM S3
      if (resultThumb.Key || resultLarge.Key) {
        await deleteFile(resultThumb.Key);
        await deleteFile(resultLarge.Key);
        await deleteFile(resultSmall.Key);
      }
      return res.status(500).json({
        success: false,
        error: errors,
      });
    }

    //CHECK IF USER ALREADY UPLOADED POST FOR CURRENT PLACE
    let uploadedBefore = false;
    const uploaded = await Post.find({})
      .where("user")
      .equals(user._id)
      .where("place")
      .equals(place._id);
    if (uploaded.length > 0) {
      uploadedBefore = true;
    }

    const content = [
      {
        image: {
          thumbnail: {
            public_url: resultThumb.Location,
            private_id: resultThumb.Key,
          },
          small: {
            public_url: resultSmall.Location,
            private_id: resultSmall.Key,
          },
          large: {
            public_url: resultLarge.Location,
            private_id: resultLarge.Key,
          },
        },
        coordinate: {
          lat: details.images[0].coordinates.lat,
          lng: details.images[0].coordinates.lng,
        },
        type: details.images[0].type,
      },
    ];
    //Create post
    const post = await Post.create({
      name: details.name,
      user: user._id,
      place: place._id,
      content,
      caption: req.body.caption,
      status: user.account_status,
    });

    //ADD POST IN PLACE
    place.posts.push(post._id);
    await place.save();

    //ADD PLACE IN PlaceAddeddBy TABLE AND CONTRIBUTION TABLE
    //FIND CONTRIBUTION OR CREATE NEW
    let contribution = await Contribution.findOne({ userId: user._id });
    if (!contribution) {
      contribution = await Contribution({ userId: user._id });
    }

    //ADD POST IN CONTRIBUTION
    contribution.photos.push(post._id);
    //Add to placeCreatedTableBy
    if (newPlaceCreated) {
      await PlaceAddeddBy.create({
        place: place._id,
        user: user._id,
      });
      contribution.added_places.push(place._id);
    } else {
      //ADD to contribution table if this place creation contribution is not added before
      const findPostCreatedBy = await PlaceAddeddBy.findOne({
        place: place._id,
      });
      if (!findPostCreatedBy) {
        await PlaceAddeddBy.create({
          place: place._id,
          user: user._id,
        });
        contribution.added_places.push(place._id);
      }
    }
    //IF IMAGE HAS COORDINATES
    if (
      post.content[0].coordinate.lat !== "" &&
      post.content[0].coordinate.lng !== ""
    ) {
      //ADD POST TO CONTRIBUTION TABLE
      contribution.photos_with_coordinates.push(post._id);
      post.coordinate_status = true;
      await user.save();
    } else {
      post.coordinate_status = false;
    }

    //ADD CONTRIBUTION TO USER table
    await contribution.save();
    user.total_contribution = contribution.calculateTotalContribution();
    user.save();

    await post.save();

    //delete file from server storage
    await unlinkFile(req.file.path);

    //SEND NEW POST IN APP NOTIFICATION TO FOLLOWERS
    sendNewPostNotification(user, post);

    return res.status(201).json({
      success: true,
      post,
      uploadedBefore,
    });
  } catch (error) {
    errors.general = error.message;
    console.log(error);
    if (req.file) {
      await unlinkFile(req.file.path);
    }
    return res.status(500).json({
      success: false,
      error: errors,
    });
  }
};

//EDID POST
exports.editPost = async (req, res) => {
  let errors = {};
  try {
    const { authUser, details, caption } = req.body;
    const postId = req.params.id;

    //Validate CAPTION LENGTH
    if (caption.length > 2000) {
      errors.caption = "Please write caption within 2000 characeters";
      res.status(400).json({
        success: false,
        message: errors,
      });
    }
    if (details.name == "" && caption.length === 0) {
      errors.general =
        "You must change either location or caption to edit the post";
      res.status(400).json({
        success: false,
        message: errors,
      });
    }

    //GET POST DETAILS
    const post = await Post.findById(postId);

    //CHECK IF POST EXIST
    if (!post) {
      errors.general = "Post not found";
      res.status(404).json({
        success: false,
        message: errors,
      });
    }

    //CHECK WEATHER AUTHORIZED USER
    if (post.user.toString() !== authUser._id.toString()) {
      errors.general = "Your are not authorize to edit this post";
      res.status(401).json({
        success: false,
        message: errors,
      });
    }

    //CHECK IF PLACE ID IS ALREADY PRESENT
    let newPlaceCreated = false;
    let samePlace = true;

    //GET CURRENT PLACE AND REMOVE POST FROM THERE
    let place = await Place.findById(post.place);

    if (!place) {
      errors.message = "Please try again after some time.";
      res.status(500).json({
        success: false,
        error: errors,
      });
    }

    //IF NEW PLACE IS NOT SAME REMOVE POST FROM PREVIOUS PLACE
    if (details.name != "") {
      if (place.google_place_id.toString() !== details.place_id.toString()) {
        if (place.posts.includes(post._id)) {
          const index = place.posts.indexOf(post._id);
          place.posts.splice(index, 1);
          await place.save();
        }

        //DELETE PLACE IF NO POST AVAILABLE
        if (place.posts.length === 0) {
          const placeCreated = await PlaceAddeddBy.findOne({
            place: place._id,
          });

          //REMOVE CONTRIBUITION FROM THE USER WHO CREATED THE PLACE
          if (placeCreated) {
            const placeCreator = await User.findById(placeCreated.user);
            //REMOVE PLACE FROM CONTRIBUTION TABLE
            const contribution = await Contribution.findOne({
              userId: placeCreator._id,
            });
            if (contribution.added_places.includes(place._id)) {
              const index = contribution.added_places.indexOf(place._id);
              contribution.added_places.splice(index, 1);
              await contribution.save();
            }
            if (placeCreator) {
              placeCreator.total_contribution =
                contribution.calculateTotalContribution();
              await placeCreator.save();
            }

            await placeCreated.deleteOne();
          }
          if (place.reviewed_status === false) {
            await place.deleteOne();
          }
        }
        samePlace = false;
      }

      if (!samePlace) {
        place = await Place.findOne({ google_place_id: details.place_id });
        if (!place) {
          place = await Place.create({
            name: details.name,
            google_place_id: details.place_id,
            address: details.address,
            coordinates: details.coordinates,
            google_types: details.types,
          });
          newPlaceCreated = true;
        }
      }
    }

    //IF IMAGE HAS COORDINATES
    const currentUser = await User.findById(authUser._id);
    const currentUserContribution = await Contribution.findOne({
      userId: authUser._id,
    });

    //Add to placeCreatedTableBy
    if (newPlaceCreated) {
      await PlaceAddeddBy.create({
        place: place._id,
        user: authUser._id,
      });
      +(
        //ADD to contribution table
        currentUserContribution.added_places.push(place._id)
      );
    } else {
      //IF PLACE IS SAME AND FIRST POST WITH COORDINATES CREATED
      if (samePlace) {
        //ADD to contribution table if this place creeation contribution is not added before
        const findPostCreatedBy = await PlaceAddeddBy.findOne({
          place: place._id,
        });
        if (!findPostCreatedBy) {
          await PlaceAddeddBy.create({
            place: place._id,
            user: authUser._id,
          });
          currentUserContribution.added_places.push(place._id);
        }
      }
    }
    await currentUserContribution.save();
    currentUser.total_contribution =
      currentUserContribution.calculateTotalContribution();
    await currentUser.save();

    //UPDATE POST AND UPDATE PLACE TABLE

    //Create post
    if (!samePlace) {
      post.name = details.name;
      post.place = place._id;
    }
    if (caption.length > 0) {
      post.caption = req.body.caption;
    }
    await post.save();

    //ADD POST IN PLACE
    if (!samePlace) {
      place.posts.push(post._id);
      await place.save();
    }

    res.status(200).json({
      success: true,
      post,
      newPlaceCreated,
    });
  } catch (error) {
    errors.general = error.message;
    res.status(500).json({
      success: false,
      error: errors,
    });
  }
};

//View Post
exports.viewPost = async (req, res) => {
  let errors = {};
  try {
    const postId = req.params.id;
    const { authUser, ip } = req.body;

    //Validate Object ID
    if (!ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post"
      });
    }

    const post = await Post.findById(postId).populate("user").populate("place");

    if (!post || post.status === "deactivated") {
      errors.general = "Post not found";
      return res.status(404).json({
        success: false,
        message: errors,
      });
    }

    //Insert in post view Table
    if (post.user._id.toString() !== authUser._id.toString()) {
      let postViewer = await PostViewer.findOne({
        $and: [{ post: post._id }, { user: authUser._id }],
      });
      if (!postViewer) {
        postViewer = await PostViewer.create({
          post: post._id,
          user: authUser._id,
        });
        post.viewers.push(postViewer._id);
        await post.save();
      }

      postViewer.save();
    }

    let liked = false;
    if (await post.hasLiked(authUser._id)) {
      liked = true;
    }

    let country = "";
    const location = await getCountry(ip);
    if (location != null && location.country !== undefined) {
      country = location.country;
    } else {
      country = "IN";
    }

    if (post.place.address.short_country == country) {
      post.place.local_address = post.display_address_for_own_country;
    } else {
      let state = "";
      if (
        post.place.address.administrative_area_level_1 != null &&
        post.place.types[0] != "administrative_area_level_1"
      ) {
        state = post.place.address.administrative_area_level_1;
      } else if (post.place.address.administrative_area_level_2 != null) {
        state = post.place.address.administrative_area_level_2;
      } else if (post.place.address.locality != null) {
        state = post.place.address.locality;
      } else if (post.place.address.sublocality_level_1 != null) {
        state = post.place.address.sublocality_level_1;
      } else if (post.place.address.sublocality_level_2 != null) {
        state = post.place.address.sublocality_level_2;
      } else if (post.place.address.neighborhood != null) {
        state = post.place.address.neighborhood;
      }

      if (state != "") {
        state = state + ", ";
      }

      post.place.short_address = state + post.place.address.country;
    }

    return res.status(200).json({
      success: true,
      post,
      liked,
    });
  } catch (error) {
    console.log(error);
    errors.general = error.message;
    return res.status(500).json({
      success: false,
      error: errors,
    });
  }
};

//DELETE POST
exports.deletePost = async (req, res) => {
  let errors = {};
  try {
    const postId = req.params.id;
    const { authUser } = req.body;
    const post = await Post.findById(postId);
    if (!post) {
      errors.general = "Post not found";
      return res.status(404).json({
        success: false,
        message: errors,
      });
    }

    if (post.user.toString() != authUser._id.toString()) {
      errors.general = "You are not authorized to delete this post";
      return res.status(401).json({
        success: false,
        message: errors,
      });
    }

    //DELETE POST FROM PLACE
    const place = await Place.findById(post.place);
    //DELETE PLACE if no more posts and remove review and contribution from user
    if (place.posts.length == 1) {
      const PlaceAddeddBy = await PlaceAddeddBy.findOne({ place: place._id });
      if (PlaceAddeddBy) {
        const user = await User.findById(PlaceAddeddBy.user);
        const contribution = await Contribution.findOne({ userId: user._id });
        if (contribution) {
          contribution.added_places = contribution.added_places.filter(
            (place) => place.toString() != PlaceAddeddBy.place.toString()
          );
          await contribution.save();
        }
        user.total_contribution = contribution.calculateTotalContribution();
        await user.save();
        await PlaceAddeddBy.remove();
      }

      if (place.reviewed_status === false) {
        //REMOVE COVER PICTURE IF IMAGE IS DIFFERENT FROM POST IMAGE
        if (
          place.cover_photo.large.private_id != undefined &&
          place.cover_photo.large.private_id !=
            post.content[0].image.large.private_id
        ) {
          await deleteFile(place.cover_photo.large.private_id);
          await deleteFile(place.cover_photo.thumbnail.private_id);
          await deleteFile(place.cover_photo.small.private_id);
        }
        //GET ALL REVIEWS OF THE PLACE AND REMOVE
        await Review.deleteMany({ place_id: place._id });
        await place.remove();
      }
    } else {
      const index = place.posts.indexOf(post._id);
      place.posts.splice(index, 1);
      //REPLACE PLACE COVER PHOTO IF DELETED POST IS COVER PHOTO`
      if (
        place.cover_photo.large.private_id ==
        post.content[0].image.large.private_id
      ) {
        //GET MOST LIKE ARRAY COUNT
        const HighestLikedPost = await Post.aggregate([
          {
            $match: Post.where("_id")
              .ne(post._id)
              .where("place")
              .equals(place._id)
              .where("coordinate_status")
              .equals(true)
              .cast(Post),
          },
          {
            $addFields: {
              TotalLike: { $size: "$like" },
            },
          },
          { $sort: { TotalLike: -1 } },
        ]).limit(1);
        if (HighestLikedPost.length > 0) {
          place.cover_photo = HighestLikedPost[0].content[0].image;
        } else {
          place.cover_photo = {};
        }
      }
      await place.save();
    }
    //DECREASE COTRIBUTION FOR CURRENT POST
    // if (post.coordinate_status) {
    const contribution = await Contribution.findOne({ userId: authUser._id });
    if (contribution) {
      const index = contribution.photos.indexOf(post._id);
      contribution.photos.splice(index, 1);
      if (post.coordinate_status) {
        const index1 = contribution.photos_with_coordinates.indexOf(post._id);
        contribution.photos_with_coordinates.splice(index1, 1);
      }
    }
    await contribution.save();

    const user = await User.findById(authUser._id);
    user.total_contribution = contribution.calculateTotalContribution();
    await user.save();
    // }

    //DELETE POST IMAGES and DELETE POST
    await deleteFile(post.content[0].image.large.private_id);
    await deleteFile(post.content[0].image.thumbnail.private_id);
    await deleteFile(post.content[0].image.small.private_id);
    await post.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.log(error);
    errors.general = error.message;
    return res.status(500).json({
      success: false,
      error: errors,
    });
  }
};

//LIKE UNLIKE POST
exports.likeUnlikePost = async (req, res) => {
  let errors = {};
  try {
    const postId = req.params.id;
    const { authUser } = req.body;
    const post = await Post.findById(postId);

    //IF NOT POST FOUND
    if (!post) {
      errors.general = "Post not found";
      res.status(404).json({
        success: false,
        message: errors,
      });
    }

    //UNLIKE IF ALEADY LIKED
    if (post.like.includes(authUser._id)) {
      const index = post.like.indexOf(authUser._id);
      post.like.splice(index, 1);
      await post.save();

      //Remove from PostLike table
      await PostLike.deleteOne({
        $and: [{ user: authUser._id }, { post: post._id }],
      });

      //DELETE LIKE NOTIFICATION FROM IN_APP_NOTIFICATION TABLE
      deleteNotificationOnUnlike(authUser, post);

      return res.status(200).json({
        success: true,
        message: "You have successfully unliked the post",
      });
    } else {
      post.like.push(authUser._id);
      await post.save();

      //Add to POSTLIKE TABLE
      await PostLike.create({
        user: authUser._id,
        post: post._id,
      });

      //SEND POST LIKE IN APP NOTIFICATION
      sendPostLikeNotification(authUser, post);

      return res.status(200).json({
        success: true,
        message: "You have successfully liked the post",
      });
    }
  } catch (error) {
    errors.general = error.message;
    res.status(500).json({
      success: false,
      error: errors,
    });
  }
};

//Save and Unsave post
exports.savePost = async (req, res) => {
  let errors = {};
  try {
    const postId = req.params.id;
    const { authUser } = req.body;

    const post = await Post.findById(postId);
    //IF NOT POST FOUND
    if (!post) {
      errors.general = "Post not found";
      res.status(404).json({
        success: false,
        message: errors,
      });
    }

    //If post is already save by user
    if (post.saved.includes(authUser._id)) {
      const index = post.saved.indexOf(authUser._id);
      post.saved.splice(index, 1);
      await post.save();

      //Remove from SavePostPlace table
      await SavePostPlace.deleteOne({
        and: [{ user: authUser._id }, { post: post._id }],
      });

      res.status(200).json({
        success: true,
        message: "You have successfully unsave the post",
      });
      return;
    }

    post.saved.push(authUser._id);
    await post.save();

    //Add in SavePostPlace table
    await SavePostPlace.create({
      user: authUser._id,
      post: post._id,
    });

    res.status(200).json({
      success: true,
      message: "You have successfully save the post",
    });
  } catch (error) {
    errors.general = error.message;
    res.status(500).json({
      success: false,
      error: errors,
    });
  }
};

//RANDOMIZE ARRAY
// function shuffleArray(array) {
//   for (let i = array.length - 1; i > 0; i--) {
//     const j = Math.floor(Math.random() * (i + 1));
//     [array[i], array[j]] = [array[j], array[i]];
//   }
//   return array;
// }

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

//GET RANDOM POSTS
// let call = 1;
exports.randomPosts = async (req, res) => {
  let errors = {};
  try {
    const { ip, authUser, skip, limit } = req.body;
    let posts;
    if (skip === undefined || skip === null) {
      //Random post form post screen, showing others post
      posts = await Post.find({})
        // .or([{ 'status': 'active' }, { 'status': 'silent' }])
        .where("status")
        .equals("active")
        .where("coordinate_status")
        .ne(false)
        .where("terminated")
        .ne(true)
        .where("user")
        .ne(authUser._id)
        .populate("place")
        .limit(6)
        .sort({ createdAt: -1 });
    } else {
      //Random post form explorer screen, showing all posts
      posts = await Post.find({})
        .where("status")
        .equals("active")
        .where("coordinate_status")
        .ne(false)
        .where("terminated")
        .ne(true)
        .where("user")
        .ne(authUser._id)
        .populate("place")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
    }

    if (!posts) {
      errors.general = "No posts found";
      res.status(404).json({
        success: false,
        message: errors,
      });
    }

    let skipData = 0;
    let maxRandom = 10;
    if (skip !== undefined && skip !== null) {
      skipData = parseInt(skip) + posts.length;
      maxRandom = posts.length;
    }

    let randomPosts = [];
    //SUFFLE ARRAY
    if (posts.length > 0) {
      randomPosts = shuffleArray(posts);
    }

    let country = "";
    const location = await getCountry(ip);
    if (location != null && location.country !== undefined) {
      country = location.country;
    } else {
      country = "IN";
    }

    randomPosts.forEach((post) => {
      // console.log("post1", post.display_address_for_own_country);
      if (post.place.address.short_country == country) {
        post.place.local_address = post.display_address_for_own_country;
      } else {
        let state = "";
        if (post.place.address.administrative_area_level_1 != null) {
          state = post.place.address.administrative_area_level_1;
        } else if (post.place.address.administrative_area_level_2 != null) {
          state = post.place.address.administrative_area_level_2;
        } else if (post.place.address.locality != null) {
          state = post.place.address.locality;
        } else if (post.place.address.sublocality_level_1 != null) {
          state = post.place.address.sublocality_level_1;
        } else if (post.place.address.sublocality_level_2 != null) {
          state = post.place.address.sublocality_level_2;
        } else if (post.place.address.neighborhood != null) {
          state = post.place.address.neighborhood;
        }

        post.place.short_address = state + ", " + post.place.address.country;
      }
    });

    res.status(200).json({
      success: true,
      randomPosts,
      skipData,
    });
  } catch (error) {
    console.log(error);
    errors.general = error.message;
    res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

exports.viewFollowersPosts = async (req, res) => {
  let errors = {};
  try {
    const { authUser, skip, limit, hasFollowing, ip, suggestedSkip } = req.body;
    let posts = [];
    let following = true;
    let skipCount = skip;
    let suggestedSkipCount = suggestedSkip;
    posts = await Post.find({ user: { $in: authUser.following } })
      .where("status")
      .equals("active")
      .where("coordinate_status")
      .equals(true)
      .select(
        "_id user place createdAt status coordinate_status content caption like comments"
      )
      .populate("user", "name username total_contribution profileImage foiti_ambassador")
      .populate("place", "name address types")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    skipCount = skip + posts.length;

    if (posts.length === 0) {
      following = false;
      posts = await Post.find({
        $and: [
          { user: { $nin: authUser.following } },
          { user: { $ne: authUser._id } },
        ],
      })
        .where("status")
        .equals("active")
        .where("coordinate_status")
        .equals(true)
        .select(
          "_id user place createdAt status coordinate_status content caption like comments"
        )
        .populate(
          "user",
          "name username total_contribution profileImage foiti_ambassador"
        )
        .populate("place", "name address short_address local_address types")
        .sort({ createdAt: -1 })
        .skip(suggestedSkip)
        .limit(limit);
      if (posts.length > 0) {
        posts = shuffleArray(posts);
      }
      let count = suggestedSkip;
      suggestedSkipCount = count + posts.length;
    } else {
      following = true;
    }

    if (!posts) {
      return res.status(200).json({
        success: true,
        posts,
        suggestedSkip: suggestedSkipCount,
        skip: skipCount,
        hasFollowing: following,
      });
    }

    let country = "";
    const location = await getCountry(ip);
    if (location != null && location.country !== undefined) {
      country = location.country;
    } else {
      country = "IN";
    }

    posts.forEach((post) => {
      // console.log("post1", post.display_address_for_own_country);
      if (post.place.address.short_country == country) {
        post.place.local_address = post.display_address_for_own_country;
      } else {
        let state = "";
        if (
          post.place.address.administrative_area_level_1 != null &&
          post.place.types[0] != "administrative_area_level_1"
        ) {
          state = post.place.address.administrative_area_level_1;
        } else if (
          post.place.address.administrative_area_level_2 != null &&
          post.place.types[0] != "administrative_area_level_2"
        ) {
          state = post.place.address.administrative_area_level_2;
        } else if (
          post.place.address.locality != null &&
          post.place.types[0] != "locality"
        ) {
          state = post.place.address.locality;
        } else if (
          post.place.address.sublocality_level_1 != null &&
          post.place.types[0] != "sublocality_level_1"
        ) {
          state = post.place.address.sublocality_level_1;
        } else if (
          post.place.address.sublocality_level_2 != null &&
          post.place.types[0] != "sublocality_level_2"
        ) {
          state = post.place.address.sublocality_level_2;
        } else if (
          post.place.address.neighborhood != null &&
          post.place.types[0] != "neighborhood"
        ) {
          state = post.place.address.neighborhood;
        }
        if (state != "") {
          post.place.short_address = state + ", " + post.place.address.country;
        } else {
          post.place.short_address = post.place.address.country;
        }
      }
    });

    return res.status(200).json({
      success: true,
      posts,
      suggestedSkip: suggestedSkipCount,
      skip: skipCount,
      hasFollowing: following,
    });
  } catch (error) {
    errors.general = "Something went wrong. Please try again";
    console.log(error);
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//ADD DIRECTION CLICKED DETAILS TO POST
exports.addPostLocationClickedDetails = async (req, res) => {
  let errors = {};
  try {
    const postId = req.params.id;
    const { authUser } = req.body;

    const post = await Post.findById(postId);
    if (!post) {
      errors.general = "Post not found";
      return res.status(404).json({
        success: false,
        message: errors,
      });
    }

    if (post.user.toString() !== authUser._id.toString()) {
      let locationClicked = await PostLocationViewer.findOne({
        $and: [{ post: postId }, { user: authUser._id }],
      });
      if (!locationClicked) {
        locationClicked = await PostLocationViewer.create({
          post: postId,
          user: authUser._id,
        });

        post.location_viewers.push(locationClicked._id);
        await post.save();
      }

      await locationClicked.save();
    }

    return res.status(200).json({
      success: true,
      message: "Direction clicked successfully",
    });
  } catch (error) {
    console.log(error);
    errors.general = error.message;
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};
