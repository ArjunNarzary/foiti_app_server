const { validationResult } = require("express-validator");
const CurrentAddress = require("../models/CurrentAddress");
const Place = require("../models/Place");
const TripPlan = require("../models/TripPlan");



function createError(errors, validate) {
    const arrError = validate.array();
    errors[arrError[0].param] = arrError[0].msg;
    return errors;
}

exports.addTrip = async (req, res) => {
    let errors = {};
    try{
        const validate = validationResult(req);
        if (!validate.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: createError(errors, validate),
            });
        }

        let { destination, address, authUser, start_date, end_date, trip_details } = req.body;
        let myAddress = {};

        if(!destination?.name || !destination.coordinates){
            errors.destination = "Please select destination";
            return res.status(400).json({
                success:false,
                error: errors
            })
        }

        if (!destination.coordinates.lat || !destination.coordinates.lng){
            errors.destination = "Please select destination";
            return res.status(400).json({
                success: false,
                error: errors
            })
        }

        //Validate travelling from if user has not set current or hometown address
        if(!authUser.place){
            if (!address?.name || !address.coordinates) {
                errors.address = "Please select where your travelling from.";
                return res.status(400).json({
                    success: false,
                    error: errors
                })
            }else if (!address.coordinates.lat || !address.coordinates.lng) {
                errors.address = "Please select where your travelling from.";
                return res.status(400).json({
                    success: false,
                    error: errors
                })
            }else{
                const createAddress = {
                    name: address.name,
                    administrative_area_level_1: address?.administrative_area_level_1,
                    country: address?.country,
                    short_country: address?.short_country,
                }
                myAddress = {
                    address: createAddress,
                    coords: [parseFloat(address.coordinates.lng), parseFloat(address.coordinates.lat)]
                };
            }
        }else{
            const placeAddress = await Place.findById(authUser.place);
            if (placeAddress) {
                const createAddress = {
                    name: placeAddress.name,
                    administrative_area_level_1: placeAddress?.address?.administrative_area_level_1,
                    country: placeAddress?.address?.country,
                    short_country: placeAddress?.address?.short_country,
                }
                myAddress = {
                    address: createAddress,
                    coords: placeAddress.location.coordinates
                };
            }
        }

        //Validate max 5 active trips
        const activeTrips = await TripPlan.find({})
                            .where('user_id').equals(authUser._id)
                            .where('status').equals('active')
                            .countDocuments();
        
        if(activeTrips > 5){
            errors.general = "You can add atmost 5 active trips";
            return res.stauts(401).json({
                success: false,
                error: errors
            })
        }

        let meetup_status = false;
        if(authUser.place && authUser.gender && authUser.dob){
            meetup_status = true;
        }

        const tripPlan = await TripPlan.create({
            user_id: authUser._id,
            address: myAddress.address,
            address_location: { 
                coordinates: myAddress.coords
            },
            destination: {
                name: destination?.name,
                administrative_area_level_1: destination?.administrative_area_level_1,
                country: destination?.country,
                short_country: destination?.short_country,
            },
            destination_location: {
                coordinates: [parseFloat(destination.coordinates.lng), parseFloat(destination.coordinates.lat)]
            },
            start_date: new Date(start_date).setHours(0, 0, 0, 59),
            end_date : new Date(end_date).setHours(23,59,59,0),
            meetup_status: meetup_status,
            details: trip_details,
            status: "active"
        });

        if(tripPlan){
            res.status(201).json({
                success: true,
                tripPlan
            })
        }

    }catch(error){
        console.log(error);
        errors.general = "Something went wrong";
        res.status(500).json({
            success: false,
            message: errors,
        });
    }
}

exports.getTotalTrip = async (req, res) => {
    const errors = {};
    try{
        const { authUser } = req.body;
        const activeTrips = await TripPlan.find({})
            .where('user_id').equals(authUser._id)
            .where('status').equals('active')
            .countDocuments();
        return res.status(200).json({
            success: true,
            activeTrips
        })
    }catch(error){
        console.log(error);
        errors.general = "Something went wrong";
        res.status(500).json({
            success: false,
            message: errors,
        });
    }
}