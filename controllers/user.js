const sharp = require("sharp");
const fs = require("fs");
const util = require("util");
const unlinkFile = util.promisify(fs.unlink);
const { validationResult } = require("express-validator");
const axios = require('axios');

const User = require("../models/User");
const FollowDetail = require("../models/FollowDetail");
const { uploadFile, deleteFile } = require("../utils/s3");
const Sharp = require("sharp");
const jwt = require("jsonwebtoken");
const Post = require("../models/Post");
const Otp = require("../models/Otp");
const crypto = require("crypto");
const { sendEmail } = require("../utils/sentEmail");
const { getCountry } = require("../utils/getCountry");
const RecommendedTraveller = require("../models/RecommendedTraveller");
const Contribution = require("../models/Contribution");
const Notification = require("../models/Notification");
const JoinRequest = require("../models/JoinRequest");
const {
  deleteNotificationOnUnfollow,
  sendFollowNotification,
} = require("../utils/sendInAppNotification");
const CurrentAddress = require("../models/CurrentAddress");
const ReportUser = require("../models/ReportUser");
const Place = require("../models/Place");
const Review = require("../models/Review");
const TripPlan = require("../models/TripPlan");
const { calculateMeetupPoints } = require("../utils/handles");
var ObjectId = require("mongoose").Types.ObjectId;

function createError(errors, validate) {
  const arrError = validate.array();
  errors[arrError[0].param] = arrError[0].msg;
  return errors;
}

function randomString(length, chars) {
  var result = "";
  for (var i = length; i > 0; --i)
    result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function generateUniqueUsername(rString) {
  return User.findOne({ username: rString })
    .then(function (account) {
      if (account) {
        rString = randomString(10, "0123456789abcdefghijklmnopqrstuvwxyz");
        return generateUniqueUsername(rString); // <== return statement here
      }
      return rString;
    })
    .catch(function (err) {
      console.error(err);
      throw err;
    });
}

function generatePassword() {
  return randomString(8, "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@!.");
}

function generateUniqueUsernameByName(name) {
  const rString = randomString(5, "0123456789abcdefghijklmnopqrstuvwxyz");
  const generatedName = name + rString;
  return User.findOne({ username: generatedName })
    .then(function (account) {
      if (account) {
        return generateUniqueUsernameByName(name); // <== return statement here
      }
      return generatedName;
    })
    .catch(function (err) {
      console.error(err);
      throw err;
    });
}

//SHUFFLE ARRAY
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

//CREATE USER
exports.registerUser = async (req, res) => {
  let errors = {};

  try {
    // Finds the validation errors in this request and wraps them in an object with handy functions
    const validate = validationResult(req);
    if (!validate.isEmpty()) {
      return res.status(400).json({
        success: false,
        // message: validate.array(),
        message: createError(errors, validate),
      });
    }

    //CREATE RANDOM USERNAME
    let rString = randomString(10, "0123456789abcdefghijklmnopqrstuvwxyz");
    const username = await generateUniqueUsername(rString);

    const newUserData = {
      email: req.body.email.trim(),
      password: req.body.password,
      username,
      //CHANGES BELOW IN FUTURE
      upload_status: true,
      account_status: "silent",
      last_account_status: "silent",
    };

    const user = await User.create(newUserData);

    const token = await user.generateToken();
    user.password = "";
    //Create notification table
    await Notification.create({ user: user._id });

    return res.status(201).json({
      success: true,
      user,
      token,
    });
  } catch (error) {
    console.log(error);
    errors.general = "Something went wrong";
    // errors.general = error.message;
    res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//LOGIN USER
exports.loginUser = async (req, res) => {
  let errors = {};
  try {
    const validate = validationResult(req);
    if (!validate.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: createError(errors, validate),
      });
    }

    let { email, password } = req.body;
    email = email.toLowerCase().trim();

    const user = await User.findOne({
      $or: [{ username: email }, { email: email }],
    }).select("+password");
    if (!user) {
      errors.password =
        "Your password is incorrect or this account doesn't exist";
      return res.status(400).json({
        success: false,
        message: errors,
      });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      errors.password =
        "Your password is incorrect or this account doesn't exist";
      return res.status(401).json({
        success: false,
        message: errors,
      });
    }

    if (user.terminated) {
      errors.general = "Your account has been terminated.";
      return res.status(403).json({
        success: false,
        message: errors,
      });
    }

    //Active user if deactivated
    if (user.account_status == "deactivated") {
      user.account_status = user.last_account_status || "silent";
      await user.save();
      await Post.updateMany({ user: user._id }, { deactivated: false });
    }

    const token = await user.generateToken();

    user.password = "";

    return res.status(200).json({
      success: true,
      user,
      token,
    });
  } catch (error) {
    console.log(error);
    errors.general = "Something went wrong while logging in";
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//Goole Login
exports.googleLogin = async (req, res) => {
  let errors = {};
  try {
    const { access_token } = req.body;

    if (!access_token) {
      errors.general = "Something went wrong while logging in";
      return res.status(500).json({
        success: false,
        message: errors,
      });
    }

    const url = "https://www.googleapis.com/userinfo/v2/me";
    const userData = await axios(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`
      }
    });

    if (!userData.data) {
      errors.general = "Something went wrong while logging in. Please try again";
      return res.status(500).json({
        success: false,
        message: errors,
      });
    }

    const nativeUserData = userData.data;
    if (!nativeUserData.email) {
      errors.general = "Something went wrong while logging in. Please try again";
      return res.status(500).json({
        success: false,
        message: errors,
      });
    }

    //Search email in USER model
    let user = await User.findOne({ email: nativeUserData.email });
    if (user) {
      if (user.terminated) {
        errors.general = "Your account has been terminated.";
        return res.status(403).json({
          success: false,
          message: errors,
        });
      }

      //Active user if deactivated
      if (user.account_status == "deactivated") {
        user.account_status = user.last_account_status || "silent";
        await user.save();
        await Post.updateMany({ user: user._id }, { deactivated: false });
      }
    } else {
      //Create new User
      let rString = randomString(10, "0123456789abcdefghijklmnopqrstuvwxyz");
      const username = await generateUniqueUsername(rString);
      const password = generatePassword();

      user = await User.create({
        email: nativeUserData.email,
        name: nativeUserData.name,
        socialProvider: 'Google',
        socialLogin: true,
        email_verified: nativeUserData.verified_email,
        username,
        password,
        upload_status: true,
        account_status: "silent",
        last_account_status: "silent"
      });

      //Create notification table
      await Notification.create({ user: user._id });
    }

    const token = await user.generateToken();
    user.password = "";

    return res.status(200).json({
      success: true,
      user,
      token,
    });

  } catch (error) {
    console.log(error);
    errors.general = "Something went wrong while logging in";
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
}

//Facebook Login
exports.facebookLogin = async (req, res) => {
  let errors = {};
  try {
    const { access_token } = req.body;

    if (!access_token) {
      errors.general = "Something went wrong while logging in";
      return res.status(500).json({
        success: false,
        message: errors,
      });
    }

    const url = `https://graph.facebook.com/me?fields=id,name,email,gender&access_token=${access_token}`;
    const userData = await axios(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!userData.data) {
      errors.general = "Something went wrong while logging in. Please try again";
      return res.status(500).json({
        success: false,
        message: errors,
      });
    }

    const nativeUserData = userData.data;
    if (!nativeUserData.email) {
      errors.general = "Something went wrong while logging in. Please try again";
      return res.status(500).json({
        success: false,
        message: errors,
      });
    }

    //Search email in USER model
    let user = await User.findOne({ email: nativeUserData.email });
    if (user) {
      if (user.terminated) {
        errors.general = "Your account has been terminated.";
        return res.status(403).json({
          success: false,
          message: errors,
        });
      }

      //Active user if deactivated
      if (user.account_status == "deactivated") {
        user.account_status = user.last_account_status || "silent";
        await user.save();
        await Post.updateMany({ user: user._id }, { deactivated: false });
      }
    } else {
      //Create new User
      let rString = randomString(10, "0123456789abcdefghijklmnopqrstuvwxyz");
      const username = await generateUniqueUsername(rString);
      const password = generatePassword();

      user = await User.create({
        email: nativeUserData.email,
        name: nativeUserData.name,
        socialProvider: 'Facebook',
        socialLogin: true,
        email_verified: true,
        username,
        password,
        upload_status: true,
        account_status: "silent",
        last_account_status: "silent"
      });
      //Create notification table
      await Notification.create({ user: user._id });
    }

    const token = await user.generateToken();
    user.password = "";

    return res.status(200).json({
      success: true,
      user,
      token,
    });

  } catch (error) {
    console.log(error);
    errors.general = "Something went wrong while logging in";
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
}

//Enter name
exports.enterName = async (req, res) => {
  let errors = {};
  try {
    const validate = validationResult(req);
    if (!validate.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: createError(errors, validate),
      });
    }

    const { name, authUser } = req.body;

    const user = await User.findById(authUser._id);

    const formatName = name.split(" ").join("").toLowerCase();
    const username = await generateUniqueUsernameByName(formatName);
    user.name = name;
    user.username = username;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "You have successfully added your name",
      user,
    });
  } catch (error) {
    console.log(error.message);
    errors.general = "Smething went wrong while entering your name";
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};
//EDIT PROFILE
exports.editProfile = async (req, res) => {
  let errors = {};
  try {
    const validate = validationResult(req);
    if (!validate.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: createError(errors, validate),
      });
    }

    const { name, bio, website, address, currentAddress, authUser, place,
      gender, dob, meetup_reason, interests, education, occupation,
      languages, movies_books_music, } = req.body;

    const user = await User.findById(authUser._id).populate('place');

    user.name = name.replace(/\s\s+/g, " ");
    if (bio != undefined && bio != "") {
      user.bio =
        bio
          .trim()
          .replace(/(\r\n|\r|\n){2}/g, "$1")
          .replace(/(\r\n|\r|\n){3,}/g, "$1\n")
          .replace(/(\r\n|\r|\n){2}/g, "$1") || "";
    } else {
      user.bio = "";
    }

    if (website != "" && website != undefined) {
      user.website = website.toLowerCase().trim() || "";
    } else {
      user.website = ""
    }

    // if (about_me != undefined && about_me != "") {
    //   user.about_me =
    //     about_me
    //       .trim()
    //       .replace(/(\r\n|\r|\n){2}/g, "$1")
    //       .replace(/(\r\n|\r|\n){3,}/g, "$1\n")
    //       .replace(/(\r\n|\r|\n){2}/g, "$1") || "";
    // }else{
    //   user.about_me = "";
    // }

    if (meetup_reason != undefined && meetup_reason != "") {
      user.meetup_reason =
        meetup_reason
          .trim()
          .replace(/(\r\n|\r|\n){2}/g, "$1")
          .replace(/(\r\n|\r|\n){3,}/g, "$1\n")
          .replace(/(\r\n|\r|\n){2}/g, "$1") || "";
    } else {
      user.meetup_reason = "";
    }

    const genderEnum = ['male', 'female', 'other'];
    if (gender && genderEnum.includes(gender)) {
      user.gender = gender;
    } else {
      user.gender = undefined;
    }

    if (dob != "" && dob != undefined) {
      user.dob = new Date(dob);
    } else {
      user.dob = undefined;
    }

    if (interests != "" && interests != undefined) {
      user.interests = interests
        .trim()
        .replace(/(\r\n|\r|\n){2}/g, "$1")
        .replace(/(\r\n|\r|\n){3,}/g, "$1\n")
        .replace(/(\r\n|\r|\n){2}/g, "$1") || "";
    } else {
      user.interests = "";
    }

    if (education != "" && education != undefined) {
      user.education = education.trim() || "";
    } else {
      user.education = "";
    }

    if (occupation != "" && occupation != undefined) {
      user.occupation = occupation.trim() || "";
    } else {
      user.occupation = "";
    }

    if (languages.length > 0) {
      user.languages = languages;
    } else {
      user.languages = [];
    }

    if (movies_books_music != "" && movies_books_music != undefined) {
      user.movies_books_music = movies_books_music
        .trim()
        .replace(/(\r\n|\r|\n){2}/g, "$1")
        .replace(/(\r\n|\r|\n){3,}/g, "$1\n")
        .replace(/(\r\n|\r|\n){2}/g, "$1") || "";
    } else {
      user.movies_books_music = "";
    }


    user.address = address;

    if (currentAddress != null) {
      user.current_location.address = currentAddress;
      user.current_location.createDate = Date.now();
    }

    if (place && place.place_id != "") {
      //Remove previous place if exist and not same
      let differentPlace = true;
      if (user.place) {
        if (user.place.google_place_id.toString() !== place.place_id.toString()) {
          const prevPlace = await Place.findById(user.place._id);
          if (prevPlace) {
            if (prevPlace.users.includes(user._id)) {
              if (prevPlace.users.length === 1) {
                prevPlace.users = [];
              } else {
                const index = prevPlace.users.indexOf(user._id);
                prevPlace.users.splice(index, 1);
              }
              await prevPlace.save();
            }
          }

          //DELETE PLACE
          if (prevPlace.posts.length === 0 && prevPlace.users.length === 0 && !prevPlace.reviewed_status) {
            //DELETE ALL REVIEWS ADDED BY USERS AND CONTRIBUTIONS
            const reviews = await Review.find({ place_id: place._id });
            if (reviews.length > 0) {
              //Remove contributions
              reviews.forEach(async (reviewData) => {
                const userContribution = await Contribution.findOne({ userId: reviewData.user_id });
                if (userContribution.reviews.includes(reviewData._id)) {
                  const index = userContribution.reviews.indexOf(reviewData._id);
                  userContribution.reviews.splice(index, 1);
                }
                if (userContribution.review_200_characters.includes(reviewData._id)) {
                  const index = userContribution.review_200_characters.indexOf(reviewData._id);
                  userContribution.review_200_characters.splice(index, 1);
                }
                if (userContribution.ratings.includes(reviewData._id)) {
                  const index = userContribution.ratings.indexOf(reviewData._id);
                  userContribution.ratings.splice(index, 1);
                }

                await userContribution.save();
                const contributionOwner = await User.findById(userContribution.userId);
                if (contributionOwner) {
                  contributionOwner.total_contribution = userContribution.calculateTotalContribution();
                  await contributionOwner.save();
                }

              })
            }

            //GET ALL REVIEWS OF THE PLACE AND REMOVE
            await Review.deleteMany({ place_id: place._id });
            await prevPlace.remove();
          }

        } else {
          differentPlace = false;
        }
      }

      if (differentPlace) {
        let placeData = await Place.findOne({ google_place_id: place.place_id });
        if (!placeData) {
          //Format timming if available
          let timingArr = [];
          let phone_number = "";
          if (place.timing) {
            if (formatTiming(place.timing)) {
              timingArr = formatTiming(place.timing);
            }
          }
          if (typeof (place.phone_number) === "string") {
            phone_number = place.phone_number;
          }

          placeData = await Place.create({
            name: place.name,
            google_place_id: place.place_id,
            address: place.address,
            coordinates: place.coordinates,
            location: {
              coordinates: [
                parseFloat(place.coordinates.lng),
                parseFloat(place.coordinates.lat),
              ],
            },
            google_types: place.types,
            created_place: place.created_place,
            open_hours: timingArr,
            phone_number,
          })
        }

        if (!placeData.users.includes(user._id)) {
          placeData.review_required = true;
          placeData.users.push(user._id);
          await placeData.save();
          user.place = placeData._id;
        }
      }
    }

    const meetupPoint = calculateMeetupPoints(
      user?.bio,
      user?.meetup_reason,
      user?.gender,
      user?.dob,
      user?.place?._id,
      user?.profileImage?.thumbnail?.private_id,
      user?.interests,
      user?.movies_books_music,
      user?.languages,
      user?.occupation,
      user?.education
    )


    user.meetup_points = meetupPoint;
    await user.save();

    //SET MEETUP STATUS TO TRUE
    if (user.place._id && user.gender && user.dob) {
      await TripPlan.updateMany({ $and: [{ "user_id": authUser._id }, { "meetup_status": false }] }, { "$set": { "meetup_status": true } });
    }

    return res.status(200).json({
      success: true,
      message: "Profile edited successful",
      user,
    });
  } catch (error) {
    console.log(error);
    errors.general = "Something went wrong while editing your profile";
    res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

exports.addCurrentLocation = async (req, res) => {
  try {
    const { address, authUser, types, name, coordinates } = req.body;

    const user = await User.findById(authUser._id);

    if (name != null && coordinates.lng && coordinates.lat) {
      let currentAddress = await CurrentAddress.findOne({ userId: user._id });
      if (!currentAddress) {
        currentAddress = await CurrentAddress.create({ userId: user._id });
      }

      currentAddress.name = name;
      currentAddress.address = address;
      currentAddress.google_types = types;
      currentAddress.location = {
        coordinates: [parseFloat(coordinates.lng), parseFloat(coordinates.lat)]
      },
        await currentAddress.save();
      user.currently_in = currentAddress._id;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile edited successful",
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.removeCurrentLocation = async (req, res) => {
  let errors = {};
  try {
    const { authUser } = req.body;
    const user = await User.findById(authUser._id);
    const currentlyAt = await CurrentAddress.findOne({ userId: authUser._id });
    if (currentlyAt) {
      await currentlyAt.remove();
    }

    if (user) {
      user.currently_in = undefined;
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: "Your current location has been removed successfully",
    });
  } catch (error) {
    errors.general = error.message;
    console.log(error);
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//Update Username
exports.updateUsername = async (req, res) => {
  let errors = {};
  try {
    const validate = validationResult(req);
    if (!validate.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: createError(errors, validate),
      });
    }

    const { username, authUser } = req.body;

    const userWithSameUsername = await User.find({
      $and: [{ username: username }, { _id: { $ne: authUser._id } }],
    });

    if (userWithSameUsername.length > 0) {
      errors.username = "Username has already been taken";
      return res.status(409).json({
        success: false,
        message: errors,
      });
    }

    const user = await User.findById(authUser._id);
    user.username = username;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Username updated successful",
      user,
    });
  } catch (error) {
    console.log(error.message);
    errors.general = "Something went wrong while updating your username";
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//Update Email
exports.updateEmail = async (req, res) => {
  let errors = {};
  try {
    const validate = validationResult(req);
    if (!validate.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: createError(errors, validate),
      });
    }

    const { email, authUser } = req.body;

    const user = await User.findById(authUser._id);
    if (!user) {
      errors.general = "User not found";
      return res.status(404).json({
        success: false,
        message: errors,
      });
    }

    if (user.email.trim() == email.trim().toLowerCase()) {
      errors.email = "New email must be different from current email";
      return res.status(409).json({
        success: false,
        message: errors,
      });
    }

    //Check for existing email
    const userWithSameEmail = await User.find({
      $and: [{ email: email }, { _id: { $ne: authUser._id } }],
    });

    if (userWithSameEmail.length > 0) {
      errors.email = "This email is already registered";
      return res.status(409).json({
        success: false,
        message: errors,
      });
    }

    user.email = email.toLowerCase().trim();
    user.isVerified = false;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email updated successful",
      user,
    });
  } catch (error) {
    console.log(error.message);
    errors.general = "Something went wrong while updating your email";
    return res.status(500).json({ success: false, message: errors });
  }
};

//Update Phone Number
exports.updatePhone = async (req, res) => {
  let errors = {};
  try {
    const validate = validationResult(req);
    if (!validate.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: createError(errors, validate),
      });
    }

    const { phoneNumber, authUser } = req.body;

    const user = await User.findById(authUser._id);
    if (!user) {
      errors.general = "User not found";
      return res.status(404).json({
        success: false,
        message: errors,
      });
    }

    if (user.phoneNumber) {
      if (user.phoneNumber.trim() == phoneNumber.trim()) {
        errors.phoneNumber = "Phone number already in use";
        return res.status(409).json({
          success: false,
          message: errors,
        });
      }
    }

    //Check for existing phone number
    const userWithSamePhone = await User.find({
      $and: [{ phoneNumber: phoneNumber }, { _id: { $ne: authUser._id } }],
    });

    if (userWithSamePhone.length > 0) {
      errors.email = "This phone number is already in use";
      return res.status(409).json({
        success: false,
        message: errors,
      });
    }

    user.phoneNumber = phoneNumber.trim();
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Phone number updated successful",
      user,
    });
  } catch (error) {
    console.log(error.message);
    errors.general = "Something went wrong while updating your phone number";
    return res.status(500).json({ success: false, message: errors });
  }
};

//TODO::View own profile v10
exports.viewOwnProfilev10 = async (req, res) => {
  let errors = {};
  try {
    const { authUser } = req.body;
    const { ip } = req.headers;
    // const user = authUser;
    const user = await User.findById(authUser._id).populate("currently_in").populate("place");
    //FORMAT ADDRESS
    let country = "";
    const location = await getCountry(ip);
    if (location != null && location.country !== undefined) {
      country = location.country;
    } else {
      country = "IN";
    }

    if (user.currently_in?.name != undefined) {
      if (user.currently_in.address.short_country == country) {
        user.currently_in.formattedAddress =
          user.currently_in.display_address_for_own_country;
      } else {
        user.currently_in.formattedAddress =
          user.currently_in.display_address_for_other_country;
      }
    }



    if (user.place?._id) {
      if (user.place?.duplicate && user?.place?.original_place_id) {
        const originalPlace = await Place.findById(user?.place?.original_place_id);
        if (originalPlace) {
          if (originalPlace.address.short_country == country) {
            user.place.local_address = originalPlace?.display_name ? originalPlace?.display_name : originalPlace?.name + originalPlace.display_address_for_own_country_home;
          } else {
            user.place.short_address =
              originalPlace?.display_name ? originalPlace?.display_name : originalPlace?.name + originalPlace.display_address_for_other_country_home;
          }
        } else {
          if (user.place.address.short_country == country) {
            user.place.local_address = user?.place?.display_name ? user?.place?.display_name : user?.place?.name + user.place.display_address_for_own_country_home;
          } else {
            user.place.short_address =
              user?.place?.display_name ? user?.place?.display_name : user?.place?.name + user.place.display_address_for_other_country_home;
          }
        }
      } else {
        if (user.place.address.short_country == country) {
          user.place.local_address = user?.place?.display_name ? user?.place?.display_name : user?.place?.name + user.place.display_address_for_own_country_home;
        } else {
          user.place.short_address =
            user?.place?.display_name ? user?.place?.display_name : user?.place?.name + user.place.display_address_for_other_country_home;
        }
      }
    }


    //COUNT TOTAL POST UPLOADS
    let posts = await Post.find({ user: user._id }).populate("place");

    const totalPosts = posts.length;

    //Unique Place
    let helpNavigate = 0;
    const totalPlaces = posts.map((post) => {
      if (post.location_viewers_count != undefined) {
        helpNavigate = helpNavigate + post.location_viewers_count;
      }
      if (post?.place) {
        if (post?.place?.duplicate && post?.place?.original_place_id) {
          return post.place.original_place_id
        } else {
          return post?.place?._id;
        }
      }
    });

    //COUNT HELPED NAVIGATE

    const uniquePlacesVisitedIds = new Set();
    totalPlaces.map((ele) => {
      if (ele) {
        uniquePlacesVisitedIds.add(ele.toString());
      }
    })


    // const uniquePlacesVisited = [...new Set(totalPlaces.toString())];
    const uniquePlacesVisited = [...uniquePlacesVisitedIds];
    const placesVisited = uniquePlacesVisited.length;


    //Country Visited
    let countryVisited = 0;
    const totalCountriesSaved = posts.map((post) => {
      return post?.place?.address?.country;
    });

    const totalCountries = totalCountriesSaved.filter((c) => {
      return c != undefined;
    });

    const uniqueCountryVisited = [...new Set(totalCountries)];

    const countryVisitedCount = uniqueCountryVisited.length;

    if (countryVisitedCount > 1) {
      countryVisited = countryVisitedCount - 1;
    } else {
      countryVisited = 0;
    }

    //GET ALL ACTIVE TRIP PLANS
    const activeTrips = await TripPlan.find({})
      .where('user_id').equals(authUser._id)
      .where('status').equals('active');

    return res.status(200).json({
      success: true,
      user,
      totalFollowing: authUser.totalFollowing,
      totalFollower: authUser.totalFollower,
      totalPosts,
      placesVisited,
      countryVisited,
      helpNavigate,
      tripPlans: activeTrips
    });
  } catch (error) {
    console.log(error);
    errors.general = "Something went wrong while viewing your profile";
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//View own profile
exports.viewOwnProfile = async (req, res) => {
  let errors = {};
  try {
    const { authUser } = req.body;
    const { ip } = req.headers;
    // const user = authUser;
    const user = await User.findById(authUser._id).populate("currently_in").populate("place");
    //FORMAT ADDRESS
    let country = "";
    const location = await getCountry(ip);
    if (location != null && location.country !== undefined) {
      country = location.country;
    } else {
      country = "IN";
    }

    if (user.currently_in?.name != undefined) {
      if (user.currently_in.address.short_country == country) {
        user.currently_in.formattedAddress =
          user.currently_in.display_address_for_own_country;
      } else {
        user.currently_in.formattedAddress =
          user.currently_in.display_address_for_other_country;
      }
    }



    if (user.place?._id) {
      if (user.place?.duplicate && user?.place?.original_place_id) {
        const originalPlace = await Place.findById(user?.place?.original_place_id);
        if (originalPlace) {
          if (originalPlace.address.short_country == country) {
            user.place.local_address = originalPlace.display_address_for_own_country_home;
          } else {
            user.place.short_address =
              originalPlace.display_address_for_other_country_home;
          }
        } else {
          if (user.place.address.short_country == country) {
            user.place.local_address = user.place.display_address_for_own_country_home;
          } else {
            user.place.short_address =
              user.place.display_address_for_other_country_home;
          }
        }
      } else {
        if (user.place.address.short_country == country) {
          user.place.local_address = user.place.display_address_for_own_country_home;
        } else {
          user.place.short_address =
            user.place.display_address_for_other_country_home;
        }
      }
    }


    //COUNT TOTAL POST UPLOADS
    let posts = await Post.find({ user: user._id }).populate("place");

    const totalPosts = posts.length;

    //Unique Place
    let helpNavigate = 0;
    const totalPlaces = posts.map((post) => {
      if (post.location_viewers_count != undefined) {
        helpNavigate = helpNavigate + post.location_viewers_count;
      }
      if (post?.place) {
        if (post?.place?.duplicate && post?.place?.original_place_id) {
          return post.place.original_place_id
        } else {
          return post?.place?._id;
        }
      }
    });

    //COUNT HELPED NAVIGATE

    const uniquePlacesVisitedIds = new Set();
    totalPlaces.map((ele) => {
      if (ele) {
        uniquePlacesVisitedIds.add(ele.toString());
      }
    })


    // const uniquePlacesVisited = [...new Set(totalPlaces.toString())];
    const uniquePlacesVisited = [...uniquePlacesVisitedIds];
    const placesVisited = uniquePlacesVisited.length;


    //Country Visited
    let countryVisited = 0;
    const totalCountriesSaved = posts.map((post) => {
      return post?.place?.address?.country;
    });

    const totalCountries = totalCountriesSaved.filter((c) => {
      return c != undefined;
    });

    const uniqueCountryVisited = [...new Set(totalCountries)];

    const countryVisitedCount = uniqueCountryVisited.length;

    if (countryVisitedCount > 1) {
      countryVisited = countryVisitedCount - 1;
    } else {
      countryVisited = 0;
    }

    //GET ALL ACTIVE TRIP PLANS
    const activeTrips = await TripPlan.find({})
      .where('user_id').equals(authUser._id)
      .where('status').equals('active');

    return res.status(200).json({
      success: true,
      user,
      totalFollowing: authUser.totalFollowing,
      totalFollower: authUser.totalFollower,
      totalPosts,
      placesVisited,
      countryVisited,
      helpNavigate,
      tripPlans: activeTrips
    });
  } catch (error) {
    console.log(error);
    errors.general = "Something went wrong while viewing your profile";
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//TODO::V10 View others profile
exports.viewOthersProfilev10 = async (req, res) => {
  let errors = {};
  try {
    const profileId = req.params.id;
    const { authUser } = req.body;
    const { ip } = req.headers;
    //Validate Object ID
    if (!ObjectId.isValid(profileId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user",
      });
    }

    const profileUser = await User.findById(profileId).populate("currently_in").populate("place");
    if (!profileUser) {
      errors.general = "User not found";
      return res.status(404).json({
        success: false,
        message: errors,
      });
    }

    if (profileUser.account_status === "deactivated") {
      return res.status(401).json({
        success: false,
        message: "This account has been deactivated",
      });
    }

    if (profileUser.terminated) {
      return res.status(401).json({
        success: false,
        message: "This account has been terminated",
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

    if (profileUser.currently_in?.name != undefined) {
      if (profileUser.currently_in.address.short_country == country) {
        profileUser.currently_in.formattedAddress =
          profileUser.currently_in.display_address_for_own_country;
      } else {
        profileUser.currently_in.formattedAddress =
          profileUser.currently_in.display_address_for_other_country;
      }
    }

    //FORMAT ADDRESS
    if (profileUser.place?._id) {
      if (profileUser.place?.duplicate && profileUser?.place?.original_place_id) {
        const originalPlace = await Place.findById(profileUser?.place?.original_place_id);
        if (originalPlace) {
          if (originalPlace.address.short_country == country) {
            profileUser.place.local_address = originalPlace?.display_name ? originalPlace?.display_name : originalPlace?.name + originalPlace.display_address_for_own_country_home;
          } else {
            profileUser.place.short_address =
              originalPlace?.display_name ? originalPlace?.display_name : originalPlace?.name + originalPlace.display_address_for_other_country_home;
          }
        } else {
          if (profileUser.place.address.short_country == country) {
            profileUser.place.local_address = profileUser?.place?.display_name ? profileUser?.place?.display_name : profileUser?.place?.name + profileUser.place.display_address_for_own_country_home;
          } else {
            profileUser.place.short_address =
              profileUser.place.display_address_for_other_country_home;
          }
        }
      } else {
        if (profileUser.place.address.short_country == country) {
          profileUser.place.local_address = profileUser?.place?.display_name ? profileUser?.place?.display_name : profileUser?.place?.name + profileUser.place.display_address_for_own_country_home;
        } else {
          profileUser.place.short_address =
            profileUser?.place?.display_name ? profileUser?.place?.display_name : profileUser?.place?.name + profileUser.place.display_address_for_other_country_home;
        }
      }
    }

    //CHECK WHEATHER FOLLOWED CURRENT USER
    let isFollowed = false;
    if (await profileUser.isFollowed(authUser._id)) {
      isFollowed = true;
    }

    //TOTOAL NUMBER
    const posts = await Post.find({ user: profileUser._id })
      .or([{ status: "active" }, { status: "silent" }])
      .where("deactivated")
      .ne(true)
      // .where('coordinate_status').ne(false)
      .where("terminated")
      .ne(true)
      .populate("place");

    const totalPosts = posts.length;
    //Unique Place
    let helpNavigate = 0;
    const totalPlaces = posts.map((post) => {
      if (post.location_viewers_count != undefined) {
        helpNavigate = helpNavigate + post.location_viewers_count;
      }
      if (post.place.duplicate && post.place.original_place_id) {
        return post.place.original_place_id
      } else {
        return post.place._id;
      }
    });

    const uniquePlacesVisitedIds = new Set();
    totalPlaces.map((ele) => {
      uniquePlacesVisitedIds.add(ele.toString());
    })


    // const uniquePlacesVisited = [...new Set(totalPlaces.toString())];
    const uniquePlacesVisited = [...uniquePlacesVisitedIds];
    const placesVisited = uniquePlacesVisited.length;

    //Country Visited
    let countryVisited = 0;
    const totalCountriesSaved = posts.map((post) => {
      return post.place.address.country;
    });

    const totalCountries = totalCountriesSaved.filter((c) => {
      return c != undefined;
    });

    const uniqueCountryVisited = [...new Set(totalCountries)];

    const countryVisitedCount = uniqueCountryVisited.length;

    if (countryVisitedCount > 1) {
      countryVisited = countryVisitedCount - 1;
    } else {
      countryVisited = 0;
    }

    //GET ALL ACTIVE TRIP PLANS
    const activeTrips = await TripPlan.find({})
      .where('user_id').equals(profileId)
      .where('status').equals('active');

    return res.status(200).json({
      success: true,
      user: profileUser,
      totalFollowing: authUser.totalFollowing,
      totalFollower: authUser.totalFollower,
      isFollowed,
      totalPosts,
      placesVisited,
      countryVisited,
      helpNavigate,
      tripPlans: activeTrips
    });
  } catch (error) {
    console.log(error);
    errors.general = "Something went wrong while viewing this user's profile";
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//View others profile
exports.viewOthersProfile = async (req, res) => {
  let errors = {};
  try {
    const profileId = req.params.id;
    const { authUser } = req.body;
    const { ip } = req.headers;
    //Validate Object ID
    if (!ObjectId.isValid(profileId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user",
      });
    }

    const profileUser = await User.findById(profileId).populate("currently_in").populate("place");
    if (!profileUser) {
      errors.general = "User not found";
      return res.status(404).json({
        success: false,
        message: errors,
      });
    }

    if (profileUser.account_status === "deactivated") {
      return res.status(401).json({
        success: false,
        message: "This account has been deactivated",
      });
    }

    if (profileUser.terminated) {
      return res.status(401).json({
        success: false,
        message: "This account has been terminated",
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

    if (profileUser.currently_in?.name != undefined) {
      if (profileUser.currently_in.address.short_country == country) {
        profileUser.currently_in.formattedAddress =
          profileUser.currently_in.display_address_for_own_country;
      } else {
        profileUser.currently_in.formattedAddress =
          profileUser.currently_in.display_address_for_other_country;
      }
    }

    //FORMAT ADDRESS
    if (profileUser.place?._id) {
      if (profileUser.place?.duplicate && profileUser?.place?.original_place_id) {
        const originalPlace = await Place.findById(profileUser?.place?.original_place_id);
        if (originalPlace) {
          if (originalPlace.address.short_country == country) {
            profileUser.place.local_address = originalPlace.display_address_for_own_country_home;
          } else {
            profileUser.place.short_address =
              originalPlace.display_address_for_other_country_home;
          }
        } else {
          if (profileUser.place.address.short_country == country) {
            profileUser.place.local_address = profileUser.place.display_address_for_own_country_home;
          } else {
            profileUser.place.short_address =
              profileUser.place.display_address_for_other_country_home;
          }
        }
      } else {
        if (profileUser.place.address.short_country == country) {
          profileUser.place.local_address = profileUser.place.display_address_for_own_country_home;
        } else {
          profileUser.place.short_address =
            profileUser.place.display_address_for_other_country_home;
        }
      }
    }

    //CHECK WHEATHER FOLLOWED CURRENT USER
    let isFollowed = false;
    if (await profileUser.isFollowed(authUser._id)) {
      isFollowed = true;
    }

    //TOTOAL NUMBER
    const posts = await Post.find({ user: profileUser._id })
      .or([{ status: "active" }, { status: "silent" }])
      .where("deactivated")
      .ne(true)
      // .where('coordinate_status').ne(false)
      .where("terminated")
      .ne(true)
      .populate("place");

    const totalPosts = posts.length;
    //Unique Place
    let helpNavigate = 0;
    const totalPlaces = posts.map((post) => {
      if (post.location_viewers_count != undefined) {
        helpNavigate = helpNavigate + post.location_viewers_count;
      }
      if (post.place.duplicate && post.place.original_place_id) {
        return post.place.original_place_id
      } else {
        return post.place._id;
      }
    });

    const uniquePlacesVisitedIds = new Set();
    totalPlaces.map((ele) => {
      uniquePlacesVisitedIds.add(ele.toString());
    })


    // const uniquePlacesVisited = [...new Set(totalPlaces.toString())];
    const uniquePlacesVisited = [...uniquePlacesVisitedIds];
    const placesVisited = uniquePlacesVisited.length;

    //Country Visited
    let countryVisited = 0;
    const totalCountriesSaved = posts.map((post) => {
      return post.place.address.country;
    });

    const totalCountries = totalCountriesSaved.filter((c) => {
      return c != undefined;
    });

    const uniqueCountryVisited = [...new Set(totalCountries)];

    const countryVisitedCount = uniqueCountryVisited.length;

    if (countryVisitedCount > 1) {
      countryVisited = countryVisitedCount - 1;
    } else {
      countryVisited = 0;
    }

    //GET ALL ACTIVE TRIP PLANS
    const activeTrips = await TripPlan.find({})
      .where('user_id').equals(profileId)
      .where('status').equals('active');

    return res.status(200).json({
      success: true,
      user: profileUser,
      totalFollowing: authUser.totalFollowing,
      totalFollower: authUser.totalFollower,
      isFollowed,
      totalPosts,
      placesVisited,
      countryVisited,
      helpNavigate,
      tripPlans: activeTrips
    });
  } catch (error) {
    console.log(error);
    errors.general = "Something went wrong while viewing this user's profile";
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//View all post of particular user
exports.viewAllPost = async (req, res) => {
  let errors = {};
  try {
    const profileId = req.params.id;
    const { authUser, skip, limit, ip, showGeoPost } = req.body;

    //Validate Object ID
    if (!ObjectId.isValid(profileId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user",
      });
    }

    if (skip == null || limit == null) {
      errors.general = "Please provide skips and limits";
      return res.json({
        success: false,
        message: errors,
      });
    }

    let posts;
    if (profileId.toString() === authUser._id.toString()) {
      //IF OWN PROFILE
      posts = await Post.find({})
        .select(
          "_id name user place content coordinate_status updatedAt"
        )
        .populate("place")
        .where("user")
        .equals(profileId)
        .where("deactivated")
        .ne(true)
        .sort({ createdAt: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit));
    } else {
      //IF OTHERS PROFILE
      if (!showGeoPost) {
        posts = await Post.find({})
          .select(
            "_id name user place content updatedAt"
          )
          .where("user")
          .equals(profileId)
          .populate("place")
          .or([{ status: "active" }, { status: "silent" }])
          .where("deactivated")
          .ne(true)
          .where("terminated")
          .ne(true)
          .sort({ createdAt: -1 })
          .skip(parseInt(skip))
          .limit(parseInt(limit));
      } else {
        posts = await Post.find({})
          .select(
            "_id name user place content updatedAt"
          )
          .where("user")
          .equals(profileId)
          .or([{ status: "active" }, { status: "silent" }])
          .where("coordinate_status")
          .ne(false)
          .where("deactivated")
          .ne(true)
          .where("terminated")
          .ne(true)
          .populate("place")
          .sort({ createdAt: -1 })
          .skip(parseInt(skip))
          .limit(parseInt(limit));
      }
    }

    postsCount = await Post.countDocuments({})
      .where("user")
      .equals(profileId)
      .or([{ status: "active" }, { status: "silent" }])
      .where("terminated")
      .ne(true);

    if (posts.length === 0) {
      errors.general = "No post avialble";
      return res.status(200).json({
        success: true,
        message: errors,
        posts,
      });
    }

    let country = "";
    const location = getCountry(ip);

    if (location != null && location.country !== undefined) {
      country = location.country;
    } else {
      country = "IN";
    }


    posts.forEach((post) => {
      if (post?.place?.display_name) {
        post.place.name = post.place.display_name;
      }
      if (post?.place?.address?.short_country == country) {
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


    const totalCount = posts.length;
    const newSkip = skip + totalCount;

    return res.status(200).json({
      posts,
      newSkip,
      postsCount,
    });
  } catch (error) {
    console.log(error);
    errors.general = "Something went wrong while viewing this user's posts";
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//FOLLOW UNFOLLOW USER
exports.followUnfollowUser = async (req, res) => {
  let errors = {};
  try {
    const { authUser } = req.body;
    const ownerId = req.params.id;

    const owner = await User.findById(ownerId);
    const user = await User.findById(authUser._id);
    if (!owner) {
      errors.general = "User not found";
      return res.status(404).json({
        success: false,
        message: errors,
      });
    }

    //Already followed than unfollow
    if (user.following.includes(owner._id)) {
      const index = user.following.indexOf(owner.id);
      user.following.splice(index, 1);
      await user.save();

      //Remove auth user from owner's followers
      const ownerIndex = owner.follower.indexOf(user._id);
      owner.follower.splice(ownerIndex, 1);
      await owner.save();
      //Remove from FollowDetail table
      await FollowDetail.deleteOne({
        $and: [{ follower: user._id }, { following: owner._id }],
      });

      //DELETE IF IN APP NOTIFICATION EXIST
      deleteNotificationOnUnfollow(user, owner);

      return res.status(200).json({
        success: true,
        message: `You have unfollowed ${owner.name}`,
      });
    } else {
      user.following.push(owner._id);
      if (!owner.follower.includes(user._id)) {
        owner.follower.push(user._id);
      }
      await owner.save();
      await user.save();

      //Create details in Follow Details model
      await FollowDetail.create({
        follower: user._id,
        following: owner._id,
      });

      //SEND INAPP NOTIFICAITON TO OWNER
      sendFollowNotification(user, owner);

      return res.status(200).json({
        success: true,
        message: `You are now following ${owner.name}`,
      });
    }
  } catch (error) {
    console.log(error.message);
    errors.general = "Something went wrong while following this user";
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//UPLOAD OR CHANGE PROFILE IMAGE
// const storage = multer.memoryStorage();

exports.uploadProfileImage = async (req, res) => {
  let errors = {};
  try {
    const { token } = req.headers;
    const decoded = await jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id);

    if (!user) {
      errors.general = "Unauthorized User";
      return res.status(400).json({
        success: false,
        message: errors,
      });
    }

    //Resize Image for large DP
    const sharpExtraLarge = await sharp(req.file.path).resize(500).toBuffer();
    const resultExtraLarge = await uploadFile(req.file, sharpExtraLarge);
    //Resize Image for large DP
    const sharpLarge = await sharp(req.file.path).resize(200).toBuffer();
    const resultLarge = await uploadFile(req.file, sharpLarge);
    //Resize Image for thumbnail
    const sharpThumb = await sharp(req.file.path).resize(100).toBuffer();
    const resultThumb = await uploadFile(req.file, sharpThumb);

    //If not empty delete file from S3
    if (user.profileImage.large.private_id != null) {
      if (user.profileImage.extraLarge.private_id != null) {
        await deleteFile(user.profileImage.extraLarge.private_id);
      }
      await deleteFile(user.profileImage.large.private_id);
      await deleteFile(user.profileImage.thumbnail.private_id);
    }
    const newData = {
      extraLarge: {
        public_url: resultExtraLarge.Location,
        private_id: resultExtraLarge.Key,
      },
      large: {
        public_url: resultLarge.Location,
        private_id: resultLarge.Key,
      },
      thumbnail: {
        public_url: resultThumb.Location,
        private_id: resultThumb.Key,
      },
    };
    user.profileImage = newData;

    const meetupPoint = calculateMeetupPoints(
      user?.bio,
      user?.meetup_reason,
      user?.gender,
      user?.dob,
      user?.place?._id,
      user?.profileImage?.thumbnail?.private_id,
      user?.interests,
      user?.movies_books_music,
      user?.languages,
      user?.occupation,
      user?.education
    )


    user.meetup_points = meetupPoint;

    await user.save();

    //delete file from server storage
    await unlinkFile(req.file.path);
    return res.status(200).json({
      success: true,
      message: "Profile uploaded successful",
      user,
    });
  } catch (error) {
    console.log(error.message);
    errors.general = "Something went wrong while uploading profile image";
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//UPLOAD OR CHANGE COVER PICTURE
exports.uploadCoverImage = async (req, res) => {
  let errors = {};
  try {
    const { token } = req.headers;
    const decoded = await jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id);
    if (!user) {
      errors.general = "Unauthorized User";
      return res.status(400).json({
        success: false,
        message: errors,
      });
    }

    //Resize Image for large DP
    const sharpLarge = await sharp(req.file.path).resize(1080).toBuffer();
    const resultLarge = await uploadFile(req.file, sharpLarge);

    //If not empty delete file from S3
    if (user.coverImage.large.private_id != null) {
      await deleteFile(user.coverImage.large.private_id);
    }
    const newData = {
      large: {
        public_url: resultLarge.Location,
        private_id: resultLarge.Key,
      },
    };
    user.coverImage = newData;
    await user.save();

    //delete file from server storage
    await unlinkFile(req.file.path);
    return res.status(200).json({
      success: true,
      message: "Cover uploaded successful",
      user,
    });
  } catch (error) {
    console.log(error.message);
    errors.general = "Something went wrong while uploading cover image";
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//UPDATE PASSWORD
exports.updatePassword = async (req, res) => {
  let errors = {};
  try {
    const validate = validationResult(req);
    if (!validate.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: createError(errors, validate),
      });
    }

    const { authUser, currentPassword, newPassword } = req.body;
    const user = await User.findById(authUser._id).select("+password");

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      errors.currentPassword = "Current password does not match";
      return res.status(401).json({
        success: false,
        message: errors,
      });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password has been updated successfully",
    });
  } catch (error) {
    console.log(error.message);
    errors.general = "Something went wrong while updating password";
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//Total number of Contribution
exports.contributions = async (req, res) => {
  errors = {};
  try {
    const { userId } = req.params;
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user",
      });
    }

    const contribution = await Contribution.findOne({ userId });

    if (!contribution) {
      errors.general = "No contribution found";
      return res.status(400).json({
        success: false,
        message: errors,
      });
    }

    return res.status(200).json({
      contribution,
      success: true,
    });
  } catch (error) {
    errors.general = "Server error";
    console.log(error);
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//VIEW FOLLOW DETAILS
exports.viewFollowDetails = async (req, res) => {
  let errors = {};
  try {
    const ownerId = req.params.id;

    const owner = await User.findById(ownerId)
      .select("_id, name, following, follower")
      .populate("following", {
        name: 1,
        total_contribution: 1,
        profileImage: 1,
        _id: 1,
        follower: 1,
        following: 1,
        foiti_ambassador: 1,
      })
      .populate("follower", {
        name: 1,
        total_contribution: 1,
        profileImage: 1,
        _id: 1,
        follower: 1,
        following: 1,
        foiti_ambassador: 1,
      });
    if (!owner) {
      errors.general = "User not found";
      return res.status(404).json({
        success: false,
        message: errors,
      });
    }

    return res.status(200).json({
      success: true,
      owner,
    });
  } catch (error) {
    console.log(error.message);
    errors.general = "Something went wrong";
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//RESET PASSWORD (SENT OTP AT EMAIL)
exports.resetPassword = async (req, res) => {
  let errors = {};
  try {
    const validate = validationResult(req);
    if (!validate.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: createError(errors, validate),
      });
    }

    const email = req.body.email;
    const user = await User.findOne({ email });

    if (!user) {
      errors.email = "Provide email address is not registered with us";
      return res.status(404).json({
        success: false,
        message: errors,
      });
    }

    let otp = await Otp.findOne({ userId: user._id });
    if (otp) {
      await otp.deleteOne();
    }
    const newOtp = user.generateOtp();
    const message = `One time password for resetting your passward is ${newOtp}. This OTP is valid for 15 minutes.`;
    const html = `<div style="padding: 1.5rem; margin:1.5rem; background-color:#E5E5E5;">
                      <p>Hi ${user.name || `there`},</p>
                      <p>A request has been received to change the password for your Foiti account.</p>
                      <p>If you did not make this request, just ignore this email. Otherwise, please enter the OTP below to change your password. This OTP is valid for 15 minutes</p>
                      <div style="padding: 10px; display:flex;">
                        <div style="padding:5px 15px; font-weight:bold; font-size: 20px; background-color: #E45527; color: #fff; margin:0 auto;">${newOtp}</div>
                      </div>
                      <p>Regards,<br>The Foiti Team</p>
                  </div>`;

    otp = await Otp.create({
      userId: user._id,
      otp: newOtp,
    });

    //SEND EMAIL
    try {
      await sendEmail({
        from: "Foiti - Reset Password <authentication@gmail.com>",
        email: user.email,
        subject: "Reset Password",
        message,
        html,
      });

      return res.status(201).json({
        success: true,
        message: "An otp has been sent to your registered email address",
        id: otp._id,
      });
    } catch (error) {
      console.log(error.message);
      errors.general = "Something went wrong while sending email";
      await otp.deleteOne();
      return res.status(500).json({
        success: false,
        message: errors,
      });
    }
  } catch (error) {
    console.log(error.message);
    errors.general = "Something went wrong while resetting password";
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//CHECK OTP
exports.checkOtp = async (req, res) => {
  let errors = {};
  try {
    const validate = validationResult(req);
    if (!validate.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: createError(errors, validate),
      });
    }

    const otpId = req.params.id;
    const otpTable = await Otp.findById(otpId);

    if (!otpTable) {
      errors.general = "Please enter a valid otp";
      return res.status(401).json({
        success: false,
        message: errors,
      });
    }

    const isMatch = await otpTable.matchOtp(req.body.otp);
    if (!isMatch) {
      errors.otp = "Please provide valid OTP";
      return res.status(400).json({
        success: false,
        message: errors,
      });
    }

    const user = await User.findById(otpTable.userId);
    if (!user) {
      errors.otp = "Please try again";
      return res.status(400).json({
        success: false,
        message: errors,
      });
    }

    const resetPasswordToken = user.getResetPasswordToken();
    user.save();

    await otpTable.deleteOne();

    return res.status(200).json({
      success: true,
      token: resetPasswordToken,
    });
  } catch (error) {
    console.log(error.message);
    errors.general = "Something went wrong while checking otp";
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

exports.crateNewPassword = async (req, res) => {
  let errors = {};
  try {
    const validate = validationResult(req);
    if (!validate.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: createError(errors, validate),
      });
    }

    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.id)
      .digest("hex");
    console.log(resetPasswordToken);

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      errors.general = "Token is invalid or has expired";
      return res.status(400).json({
        success: false,
        message: errors,
      });
    }

    user.password = req.body.password;
    user.email_varified = true;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.tokenVersion = user.tokenVersion + 1;
    await user.save();

    const token = await user.generateToken();

    return res.status(200).json({
      success: true,
      message: "Your password has been successfully updated",
      user,
      token,
    });
  } catch (error) {
    console.log(error.message);
    errors.general = "Something went wrong while creating new password";
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

exports.recommendedTraveller = async (req, res) => {
  let errors = {};
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("_id");
    if (!user) {
      errors.general = "User not found";
      return res.status(404).json({
        success: false,
        message: errors,
      });
    }

    const traveller = await RecommendedTraveller.findOne({ userId: user._id });
    if (traveller) {
      return res.status(200).json({
        success: true,
        traveller,
        message: "User already exists",
      });
    }

    const newTraveller = await RecommendedTraveller.create({
      userId: user._id,
    });

    return res.status(201).json({
      success: true,
      traveller: newTraveller,
      message: "User created successfully",
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

//VIEW RECOMMENDED TRAVELLERS
exports.viewRecommendedTraveller = async (req, res) => {
  let errors = {};
  try {
    const { authUser } = req.body;
    const recommendedTravellers = await RecommendedTraveller.find({
      $and: [
        { userId: { $nin: authUser.following } },
        { userId: { $ne: authUser._id } },
        { userId: { $nin: authUser.blocked_users } },
        { userId: { $nin: authUser.reported_users } },
      ],
    })
      .populate("userId", "_id name profileImage foiti_ambassador")
      .limit(100);

    if (!recommendedTravellers) {
      errors.general = "No recommended traveller found";
      return res.status(404).json({
        success: false,
        message: errors,
      });
    }

    let travellers = shuffleArray(recommendedTravellers).splice(0, 10);

    return res.status(200).json({
      success: true,
      travellers,
    });
  } catch (error) {
    errors.general = error.message;
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//SET EXPO TOKEN
exports.setExpoToken = async (req, res) => {
  let errors = {};
  try {
    let { authUser, expoToken } = req.body;
    if (expoToken != "" || expoToken != undefined) {
      const user = await User.findById(authUser._id).select("+expoToken");
      let hasToken = false;
      if (user.expoToken != undefined && user.expoToken != "") {
        hasToken = true;
      }
      user.expoToken = expoToken;
      await user.save();

      //IF no token existed before
      if (!hasToken) {
        let notification = await Notification.findOne({ user: authUser._id });
        if (!notification) {
          notification = await Notification.create({
            user: authUser._id,
          });
        }
        notification.new_post = true;
        notification.post_likes = true;
        notification.new_followers = true;
        notification.chat_message = true;
        notification.email_notitications = true;
        await notification.save();
      }
    }
    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    errors.general = error.message;
    return res.status(500).json({
      success: false,
      messgae: errors,
    });
  }
};

//REMOVE EXPO TOKEN
exports.removeExpoToken = async (req, res) => {
  let errors = {};
  try {
    // let { authUser, expoToken } = req.body;
    let { authUser } = req.body;
    // if (expoToken != "" || expoToken != undefined) {
    const user = await User.findById(authUser._id).select("+expoToken");
    let hasToken = false;
    if (user.expoToken != undefined && user.expoToken != "") {
      hasToken = true;
    }

    // if(hasToken && user.expoToken == expoToken){
    if (hasToken) {
      user.expoToken = undefined;
      await user.save();

      //Turnoff all notifications
      // const  notification = await Notification.findOne({ user: authUser._id });
      // if(notification){
      //   notification.new_post = false;
      //   notification.post_likes = false;
      //   notification.new_followers = false;
      //   notification.chat_message = false;
      //   notification.email_notitications = false;
      //   await notification.save();
      // }
    }
    // }
    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    errors.general = error.message;
    return res.status(500).json({
      success: false,
      messgae: errors,
    });
  }
};

//GET NOTIFICATION SETTINGS
exports.getNotificationSettings = async (req, res) => {
  let errors = {};
  try {
    let { authUser } = req.body;
    const notification = await Notification.findOne({ user: authUser._id });
    if (!notification) {
      errors.general = "No notification settings found";
      return res.status(404).json({
        success: false,
        message: errors,
      });
    }
    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    errors.general = error.message;
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//SET NOTIFICATION SETTINGS
exports.setNotificationSettings = async (req, res) => {
  let errors = {};
  try {
    let { authUser, notification, status } = req.body;
    // if (expoToken && status){
    //   const user = await User.findById(authUser._id).select("+expoToken");
    //   if(user){
    //     user.expoToken = expoToken;
    //     await user.save();
    //   }
    // }
    // console.log(notification, status);
    let notificationTable = await Notification.findOne({ user: authUser._id });
    if (!notificationTable) {
      notificationTable = await Notification.create({
        user: authUser._id,
      });
    }

    if (notification == "new_post") {
      notificationTable.new_post = status;
    } else if (notification == "post_likes") {
      notificationTable.post_likes = status;
    } else if (notification == "new_followers") {
      notificationTable.new_followers = status;
    } else if (notification == "email_notitications") {
      notificationTable.email_notitications = status;
    } else if (notification == "chat_message") {
      notificationTable.chat_message = status;
    } else {
      notificationTable.new_post = status;
      notificationTable.post_likes = status;
      notificationTable.new_followers = status;
      notificationTable.chat_message = status;
    }

    await notificationTable.save();

    return res.status(200).json({
      success: true,
      notification: notificationTable,
    });
  } catch (error) {
    errors.general = error.message;
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//JOIN REQUEST
exports.joinRequest = async (req, res) => {
  let errors = {};
  try {
    const validate = validationResult(req);
    if (!validate.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: createError(errors, validate),
      });
    }
    let { email, instagram, twitter, youtube, facebook } = req.body;
    email = email.toLowerCase();

    const joinRequest = await JoinRequest.findOne({ email });
    if (joinRequest) {
      errors.general = "You have already sent a join request";
      return res.status(401).json({
        success: false,
        message: errors,
      });
    }

    const newJoinRequest = await JoinRequest.create({
      email,
      instagram,
      twitter,
      youtube,
      facebook,
    });

    return res.status(200).json({
      success: true,
      joinRequest: newJoinRequest,
    });
  } catch (error) {
    errors.general = error.message;
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//Deactivate User
exports.deactivate = async (req, res) => {
  let errors = {};
  try {
    const { authUser, password } = req.body;
    const user = await User.findById(authUser._id).select("+password");

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      errors.password = "Password does not match";
      return res.status(401).json({
        success: false,
        message: errors,
      });
    }
    // const l_status = user.account_status
    user.last_account_status = user.account_status;
    user.expoToken = undefined;
    user.account_status = "deactivated";
    await user.save();
    await Post.updateMany({ user: user._id }, { deactivated: true });

    return res.status(200).json({
      success: true,
      message: "Your account has been deactivated",
    });
  } catch (error) {
    console.log(error);
    errors.general = "Something went wrong, please try again.";
    res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//BLOCK USER
exports.blockUser = async (req, res) => {
  let errors = {};
  try {
    const { authUser, user_id } = req.body;

    //Validate Object ID
    if (!ObjectId.isValid(user_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user",
      });
    }

    if (user_id.toString() === authUser._id.toString()) {
      return res.status(401).json({
        success: fasle,
        message: "You cannot block yourself",
      });
    }

    const user = await User.findById(user_id);
    if (!user) {
      errors.general = "User not found";
      return res.status(404).json({
        success: false,
        message: errors,
      });
    }

    const currentUser = await User.findById(authUser._id);
    //CHECK IF ALREADY BLOCKED
    if (!currentUser.blocked_users.includes(user._id)) {
      currentUser.blocked_users.push(user._id);
    }

    await currentUser.save();

    return res.status(200).json({
      success: true,
      message: "User has been blocked",
    });
  } catch (error) {
    console.log(error);
    errors.general = "Something went wrong. Please try again";
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//BLOCK USER
exports.unBlockUser = async (req, res) => {
  let errors = {};
  try {
    const { authUser, user_id } = req.body;

    //Validate Object ID
    if (!ObjectId.isValid(user_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user",
      });
    }

    if (user_id.toString() === authUser._id.toString()) {
      return res.status(401).json({
        success: fasle,
        message: "You cannot block or unblock yourself",
      });
    }

    const user = await User.findById(user_id);
    if (!user) {
      errors.general = "User not found";
      return res.status(404).json({
        success: false,
        message: errors,
      });
    }

    const currentUser = await User.findById(authUser._id);
    //UNBLOCK IF USER EXIST UNDER BLOCKED USER
    if (currentUser.blocked_users.includes(user._id)) {
      const index = currentUser.blocked_users.indexOf(user._id);
      currentUser.blocked_users.splice(index, 1);
    }

    await currentUser.save();

    const updatedUser = await User.findById(authUser._id).populate("blocked_users", "_id name profileImage total_contribution foiti_ambassador");

    return res.status(200).json({
      updatedUser,
      success: true,
      message: "User has been unblocked",
    });
  } catch (error) {
    console.log(error);
    errors.general = "Something went wrong. Please try again";
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//VIEW BLCOKED USER LIST
exports.blockedList = async (req, res) => {
  let errors = {};
  try {
    const { authUser } = req.body;

    const user = await User.findById(authUser._id).populate("blocked_users", "_id name profileImage total_contribution foiti_ambassador");

    if (!user) {
      errors.general = "User not found";
      return res.status(404).json({
        success: false,
        message: errors,
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.log(error);
    errors.general = "Something went wrong. Please try again";
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

//REPORT USER
exports.reportUser = async (req, res) => {
  let errors = {};
  try {
    const { authUser, user_id, message } = req.body;

    //Validate Object ID
    if (!ObjectId.isValid(user_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user",
      });
    }

    if (message.length > 5000) {
      errors.message = "Please write message within 5000 characters.";
      return res.status(400).json({
        success: false,
        message: errors
      });
    }

    if (user_id.toString() === authUser._id.toString()) {
      return res.status(401).json({
        success: fasle,
        message: "You cannot report yourself",
      });
    }

    const user = await User.findById(user_id);
    if (!user) {
      errors.general = "User not found";
      return res.status(404).json({
        success: false,
        message: errors,
      });
    }

    const currentUser = await User.findById(authUser._id);
    //CHECK IF ALREADY REPORTED
    if (!currentUser.reported_users.includes(user._id)) {
      currentUser.reported_users.push(user._id);
      await ReportUser.create({
        reporter_id: currentUser._id,
        user_id,
        body: message,
      });
    }

    await currentUser.save();

    return res.status(200).json({
      success: true,
      message: "User has been reported",
    });
  } catch (error) {
    errors.general = "Something went wrong. Please try again.";
    console.log(error);
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
};

exports.getHomeTown = async (req, res) => {
  const errors = {};
  try {
    const { authUser } = req.body;
    let address = "";
    if (authUser.place) {
      const place = await Place.findById(authUser.place);
      if (place) {
        const add = place.display_address_for_own_country_home;
        if (add) {
          address = `${place.name}${add}`;
        } else {
          address = place.name;
        }
      }
    }

    res.status(200).json({
      success: true,
      address
    })

  } catch (error) {
    errors.general = "Something went wrong. Please try again.";
    console.log(error);
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
}

//Get top contributors
exports.getTopContributors = async (req, res) => {
  const errors = {}
  try {
    let { type, value, place_id } = req.query
    let users = [];

    if (type && type.toLowerCase() === "country"){
      users = await User.aggregate([
        {
          $match: {
            $and: [
              { top_contributor: { $eq: true } },
              // { _id: { $ne: authUser._id } },
              { place: { $exists: true, $ne: null } }
            ]
          }
        },
        {
          $lookup: {
            from: 'places',
            localField: "place",
            foreignField: "_id",
            as: "place"
          }
        },
        {
          $unwind: "$place"
        },
        {
          $match: {
            $or: [
              { "place.display_address.country": value },
              { "place.address.country": value }
            ]
          }
        },
        {
          $project: {
            _id: 1,
            name: 1,
            email: 1,
            total_contribution: 1,
            foiti_ambassador: 1,
            profileImage: 1,
            'place.name': 1,
            'place.display_name': 1,
            'place.address': 1,
            'place.display_address': 1,
            'place.types': 1
          }
        },
      ]).limit(100);
    }else{
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

      if (place.types[1] === "state" || place.types[1] === "union_territory") {
        users = await User.aggregate([
          {
            $match: {
              $and: [
                { top_contributor: { $eq: true } },
                // { _id: { $ne: authUser._id } },
                { place: { $exists: true, $ne: null } }
              ]
            }
          },
          {
            $lookup: {
              from: 'places',
              localField: "place",
              foreignField: "_id",
              as: "place"
            }
          },
          {
            $unwind: "$place"
          },
          {
            $match: {
              $and: [
                {$or: [
                  { "place.display_address.admin_area_1": place.name },
                  { "place.name": place.name }
                ]},
                { "place.display_address.country": place.display_address.country }
              ]
            }
          },
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
              total_contribution: 1,
              foiti_ambassador: 1,
              profileImage: 1,
              'place.name': 1,
              'place.display_name': 1,
              'place.address': 1,
              'place.display_address': 1,
              'place.types': 1

            }
          },
        ]).limit(100);
      }
      else if (place.types[1] === "town" || place.types[1] === "city"){
        users = await User.aggregate([
          {
            $match: {
              $and: [
                { top_contributor: { $eq: true } },
                // { _id: { $ne: authUser._id } },
                { place: { $exists: true, $ne: null } }
              ]
            }
          },
          {
            $lookup: {
              from: 'places',
              localField: "place",
              foreignField: "_id",
              as: "place"
            }
          },
          {
            $unwind: "$place"
          },
          {
            $match: {
              $and: [
                {$or: [
                  { "place.display_address.locality": place.name },
                  { "place.name": place.name }
                ]},
                { "place.display_address.admin_area_1": place.display_address.admin_area_1 },
                { "place.display_address.country": place.display_address.country }
              ]
            }
          },
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
              total_contribution: 1,
              foiti_ambassador: 1,
              profileImage: 1,
              'place.name': 1,
              'place.display_name': 1,
              'place.address': 1,
              'place.display_address': 1,
              'place.types': 1

            }
          },
        ]).limit(100);
      }
      else if (place.types[1] === "neighbourhood" || place.types[1] === "village") {
        users = await User.aggregate([
          {
            $match: {
              $and: [
                { top_contributor: { $eq: true } },
                // { _id: { $ne: authUser._id } },
                { place: { $exists: true, $ne: null } }
              ]
            }
          },
          {
            $lookup: {
              from: 'places',
              localField: "place",
              foreignField: "_id",
              as: "place"
            }
          },
          {
            $unwind: "$place"
          },
          {
            $match: {
              $and: [
                {
                  $or: [
                    { "place.display_address.sublocality": place.name },
                    { "place.name": place.name }
                  ]
                },
                { "place.display_address.admin_area_2": place.display_address.admin_area_2 },
                { "place.display_address.admin_area_1": place.display_address.admin_area_1 },
                { "place.display_address.country": place.display_address.country }
              ]
            }
          },
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
              total_contribution: 1,
              foiti_ambassador: 1,
              profileImage: 1,
              'place.name': 1,
              'place.display_name': 1,
              'place.address': 1,
              'place.display_address': 1,
              'place.types': 1

            }
          },
        ]).limit(100);
      }
      else if (place.types[1] === "district") {
        users = await User.aggregate([
          {
            $match: {
              $and: [
                { top_contributor: { $eq: true } },
                // { _id: { $ne: authUser._id } },
                { place: { $exists: true, $ne: null } }
              ]
            }
          },
          {
            $lookup: {
              from: 'places',
              localField: "place",
              foreignField: "_id",
              as: "place"
            }
          },
          {
            $unwind: "$place"
          },
          {
            $match: {
              $and: [
                {
                  $or: [
                    { "place.display_address.admin_area_2": place.name },
                    { "place.name": place.name }
                  ]
                },
                { "place.display_address.admin_area_1": place.display_address.admin_area_1 },
                { "place.display_address.country": place.display_address.country }
              ]
            }
          },
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
              total_contribution: 1,
              foiti_ambassador: 1,
              profileImage: 1,
              'place.name': 1,
              'place.display_name': 1,
              'place.address': 1,
              'place.display_address': 1,
              'place.types': 1

            }
          },
        ]).limit(100);
      }
    }

    if(users.length > 2){
      users = shuffleArray(users).splice(0, 15);
    }


    return res.status(200).json({
      success: true,
      users
    })
  } catch (error) {
    errors.general = "Something went wrong. Please try again.";
    console.log(error);
    return res.status(500).json({
      success: false,
      message: errors,
    });
  }
}
