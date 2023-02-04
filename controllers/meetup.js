const User = require("../models/User");
const Place = require("../models/Place");
const Review = require("../models/Review");
const Contribution = require("../models/Contribution");
const { validationResult } = require("express-validator");
const TripPlan = require("../models/TripPlan");
const { getCountry } = require("../utils/getCountry");
const MeetUpRequest = require("../models/MeetUpRequest");
const MeetupChat = require("../models/MeetupChat");
const MetTraveller = require("../models/MetTraveller");
const { sendMeetupRequestNotification } = require("../utils/sendInAppNotification");
var ObjectId = require('mongoose').Types.ObjectId;

function createError(errors, validate) {
    const arrError = validate.array();
    errors[arrError[0].param] = arrError[0].msg;
    return errors;
}

exports.updateProfile = async (req, res) => {
    let errors = {};
    try {
        const validate = validationResult(req);
        if (!validate.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: createError(errors, validate),
            });
        }

        const { address, authUser, place,
            about_me, gender, dob, meetup_reason, interests, education, occupation,
            languages, movies_books_music, ip } = req.body;

        const user = await User.findById(authUser._id).populate('place');
        //VALIDATE ADDRESS
        if (!user?.place?.name && (!place || !place?.place_id)) {
            errors.address = "Place add your address"
            return res.status(400).json({
                success: false,
                message: errors
            })
        }



        if (about_me != undefined && about_me != "") {
            user.bio =
                about_me
                    .trim()
                    .replace(/(\r\n|\r|\n){2}/g, "$1")
                    .replace(/(\r\n|\r|\n){3,}/g, "$1\n")
                    .replace(/(\r\n|\r|\n){2}/g, "$1") || "";
        } else {
            user.bio = "";
        }

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
                            coordinates: [parseFloat(place.coordinates.lng), parseFloat(place.coordinates.lat)]
                        },
                        google_types: place.types,
                        created_place: place.created_place,
                        open_hours: timingArr,
                        phone_number,
                    });
                }

                if (!placeData.users.includes(user._id)) {
                    placeData.users.push(user._id);
                    await placeData.save();
                    user.place = placeData._id;
                }
            }
        }

        await user.save();

        const refetchUser = await User.findById(authUser._id).populate('place');

        //FORMAT ADDRESS
        let country = "";
        const location = await getCountry(ip);
        if (location != null && location.country !== undefined) {
            country = location.country;
        } else {
            country = "IN";
        }

        if (refetchUser.place?._id) {
            if (refetchUser.place.address.short_country == country) {
                if (refetchUser.place.display_address_for_own_country_home != "") {
                    refetchUser.place.local_address =
                        refetchUser.place.display_address_for_own_country_home;
                } else {
                    refetchUser.place.local_address = refetchUser.place.display_address_for_own_country_home;
                }
            } else {
                if (refetchUser.place.display_address_for_other_country_home != "") {
                    refetchUser.place.short_address =
                        refetchUser.place.display_address_for_other_country_home;
                } else {
                    refetchUser.place.short_address =
                        refetchUser.place.display_address_for_other_country_home;
                }
            }
        }

        //SET MEETUP STATUS TO TRUE
        await TripPlan.updateMany({ $and: [{ "user_id": authUser._id }, { "meetup_status": false }] }, { "$set": { "meetup_status": true } });

        return res.status(200).json({
            success: true,
            message: "Profile edited successful",
            user: refetchUser,
        });
    } catch (error) {
        console.log(error);
        errors.general = "Something went wrong while updating your profile";
        res.status(500).json({
            success: false,
            message: errors,
        });
    }
}

//GET TRAVELLERS WITH ACTIVE TRIP PLAN
exports.getTravellers = async (req, res) => {
    const errors = {};
    try {
        let { skip = 0, address, authUser } = req.body;
        const limit = 9;
        let noMoreData = false;

        if (!address?.coordinates?.lat || !address?.coordinates?.lat) {
            errors.address = "Invalid address provided."
            return res.status(400).json({
                success: false,
                error: errors
            })
        }

        const { lat, lng } = address?.coordinates;
        const maxDistanceInMeter = 50 * 1000;

        const travellers = await TripPlan.aggregate([
            {
                $geoNear: {
                    near: {
                        type: "Point",
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    key: "destination_location",
                    query: {
                        // "user_id": { $ne: authUser._id },
                        "end_date": { $gt: new Date() },
                        "status": "active",
                        "meetup_status": true
                    },
                    "maxDistance": maxDistanceInMeter,
                    "spherical": true,
                    "distanceField": "distance",
                    "distanceMultiplier": 0.001
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user"
                }
            },
            {
                $project: {
                    _id: 1,
                    address: 1,
                    address_location: 1,
                    destination: 1,
                    destination_location: 1,
                    start_date: 1,
                    end_date: 1,
                    details: 1,
                    'distance': 1,
                    'user._id': 1,
                    'user.name': 1,
                    'user.profileImage': 1,
                    'user.gender': 1,
                    'user.dob': 1,
                }
            },
            { $sort: { start_date: 1, _id: 1 } },
            { $skip: skip },
            { $limit: limit }
        ]);

        if (travellers.length < limit) {
            noMoreData = true;
        }

        skip = skip + travellers.length;

        return res.status(200).json({
            success: true,
            travellers,
            noMoreData,
            skip
        })


    } catch (error) {
        console.log(error);
        errors.general = "Something went wrong while fecthing trip plans";
        res.status(500).json({
            success: false,
            message: errors,
        });
    }
}

exports.getLocals = async (req, res) => {
    let errors = {};
    try {
        let { skip, address, placesArr, authUser } = req.body;
        const limit = 10;
        let noMoreData = false;

        if (!address?.coordinates?.lat || !address?.coordinates?.lat) {
            errors.address = "Invalid address provided."
            return res.status(400).json({
                success: false,
                error: errors
            })
        }

        const { lat, lng } = address?.coordinates;
        const maxDistanceInMeter = 50 * 1000;

        let duplicate_places = [];
        let foundPlaces = [];
        if (placesArr.length === 0) {
            await Place.aggregate([
                {
                    $geoNear: {
                        near: {
                            type: "Point",
                            coordinates: [parseFloat(lng), parseFloat(lat)]
                        },
                        key: "location",
                        query: {
                            "users": { $exists: true, $ne: [] },
                            "duplicate": { $ne: true }
                        },
                        "maxDistance": maxDistanceInMeter,
                        "spherical": true,
                        "distanceField": "distance",
                        "distanceMultiplier": 0.001
                    }
                }]).exec()
                .then(async (cPlace) => {
                    cPlace.map((p) => {
                        foundPlaces.push(p._id);
                        duplicate_places = [...duplicate_places, ...p.duplicate_place_id];
                    });
                });

            placesArr = [...foundPlaces, ...duplicate_places];
        }

        const locals = await User.find({ place: { $in: placesArr } })
            .where("deactivated")
            .ne(true)
            .where("terminated")
            .ne(true)
            .sort({ total_contribution: -1, _id: -1 })
            .select("_id name profileImage gender dob about_me meetup_reason interests education occupation languages movies_books_music")
            .populate("place", "name display_name address display_address_available display_address display_address_for_own_country display_address_for_other_country original_place_id")
            .skip(skip)
            .limit(limit);

        locals.forEach((user) => {
            if (user.place.display_name) {
                user.place.name = user.place.display_name;
            }
            if (user.place.display_address_for_own_country_home != "") {
                user.place.local_address =
                    user.place.display_address_for_own_country_home.substr(2);
            } else {
                user.place.local_address = user.place.display_address_for_own_country_home;
            }
        });

        if (locals.length < limit) {
            noMoreData = true;
        }

        skip = skip + locals.length;

        res.status(200).json({
            success: true,
            locals,
            placesArr,
            skip,
            noMoreData,
        })
    } catch (error) {
        console.log(error);
        errors.general = "Something went wrong while fecthing locals";
        res.status(500).json({
            success: false,
            message: errors,
        });
    }
}

exports.getTravellerDetails = async (req, res) => {
    const errors = {};
    try {
        const { trip_id } = req.params;
        if (!trip_id) {
            errors.genral = "Invalid request";
            return res.status(400).json({
                success: false,
                error: errors
            })
        }

        const tripPlan = await TripPlan.findById(trip_id);
        if (!tripPlan) {
            errors.genral = "Trip plan not found";
            return res.status(400).json({
                success: false,
                error: errors
            })
        }

        const user = await User.findById(tripPlan.user_id)
            .select("_id name profileImage gender dob bio meetup_reason interests education occupation languages movies_books_music")
            .populate("place", "name display_name address display_address_available display_address display_address_for_own_country display_address_for_other_country original_place_id")

        if (!user) {
            errors.genral = "User not found";
            return res.status(400).json({
                success: false,
                error: errors
            })
        }

        if (user.place.display_name) {
            user.place.name = user.place.display_name;
        }
        if (user.place.display_address_for_own_country_home != "") {
            user.place.local_address =
                user.place.display_address_for_own_country_home.substr(2);
        } else {
            user.place.local_address = user.place.display_address_for_own_country_home;
        }
        return res.status(200).json({
            success: true,
            tripPlan,
            user
        })



    } catch (error) {
        console.log(error);
        errors.general = "Something went wrong while fecthing traveller details";
        res.status(500).json({
            success: false,
            message: errors,
        });
    }
}

exports.requestMeetup = async (req, res) => {
    const errors = {};
    try {
        let { user_id, authUser } = req.body;
        if (!user_id) {
            errors.general = "User does not exist"
            return res.status(400).json({
                success: false,
                message: errors
            })
        }

        //Validate Object ID
        if (!ObjectId.isValid(user_id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user"
            });
        }

        const user = await User.findById(user_id);
        if (!user) {
            errors.general = "User not found"
            return res.status(400).json({
                success: false,
                message: errors
            })
        }

        //Check if meetup request exist
        let meetupRequest = await MeetUpRequest.findOne({})
            .where('user_id').equals(authUser._id)
            .where('receiver').equals(user._id)

        //Create meetup if no previous request exist
        if (!meetupRequest){
            await MeetUpRequest.create({
                user_id: authUser._id,
                receiver: user._id
            });
        }

        //Create meetup chat
        let meetupChat = await MeetupChat.findOne({
            isGroup: false,
            $and: [
                { chatUsers: { $elemMatch: { $eq: authUser._id } } },
                { chatUsers: { $elemMatch: { $eq: user._id } } }
            ]
        }).populate("chatUsers", "name email profileImage blocked_users")
            .populate("lastMessage");

        if (meetupChat) {
            meetupChat = await User.populate(meetupChat, {
                path: "lastMessage.sender",
                select: "name email profileImage blocked_users"
            });

            sendMeetupRequestNotification(authUser, user._id);

            res.status(200).json({
                success: true,
                meetupChat
            });
        } else {

            let chatData = {
                chatName: 'sender',
                isGroup: false,
                chatUsers: [authUser._id, user._id]
            }

            const createdChat = await MeetupChat.create(chatData);
            const newChat = await MeetupChat.findOne({ _id: createdChat._id }).populate("chatUsers", "name email profileImage blocked_users");
            
            sendMeetupRequestNotification(authUser, user._id);

            res.status(200).json({
                success: true,
                meetupChat: newChat
            });
        }
    } catch (error) {
        console.log(error);
        errors.general = "Something went wrong while requesting meetup";
        res.status(500).json({
            success: false,
            message: errors,
        });
    }
}


exports.meetupResquestResponse = async(req, res) => {
    const errors = {};
    try{
        const { meetupResponse, sender, authUser } = req.body;
        if (!sender) {
            errors.general = "User does not exist"
            return res.status(400).json({
                success: false,
                message: errors
            })
        }
        
        const meetupRequest = await MeetUpRequest.findOne({})
                            .where('user_id').equals(sender)
                            .where('receiver').equals(authUser._id);

        if(!meetupRequest){
            errors.general = "No request found"
            return res.status(404).json({
                success: false,
                message: errors
            })
        }

        if (meetupResponse === 'accept'){
            //Insert to current user's met traveller
            let curretUserMetTraveller = await MetTraveller.findOne({})
                                            .where('user').equals(authUser);
            if(!curretUserMetTraveller){
                curretUserMetTraveller = await MetTraveller.create({
                                            user: authUser._id
                                        })
            }

            if (!curretUserMetTraveller.travellers.includes(sender)){
                curretUserMetTraveller.travellers.push(sender);
                await curretUserMetTraveller.save();
            }

            //Insert to current sender's met traveller
            let senderUserMetTraveller = await MetTraveller.findOne({})
                                .where('user').equals(sender);

            if(!senderUserMetTraveller){
                senderUserMetTraveller = await MetTraveller.create({
                                            user: sender
                                        });
            }
            if (!senderUserMetTraveller.travellers.includes(authUser._id)){
                senderUserMetTraveller.travellers.push(authUser._id);
                await senderUserMetTraveller.save();
            }
        }

        await meetupRequest.remove();

        return res.status(200).json({
            success: false,
            message: "Your response has been updated successfully"
        })

    }catch(error){
        console.log(error);
        errors.general = "Something went wrong while responding to meetup request";
        res.status(500).json({
            success: false,
            message: errors,
        });
    }
}