const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const foitiTeamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email:{
        type: String,
        required: [true, "Please enter your email"],
        unique: [true, "Email already exist"],
        lowercase: true,
    },
    username: {
        type: String,
        required: true,
        unique: [true, "Username has already been taken"],
        lowercase: true,
        sparse: true,
    },
    password: {
        type: String,
        required: [true, "Plase enter a password"],
        minlength: [8, "Password should be minimum 8 characters"],
        select: false,
    },
    designation: String,
    tokenVersion: {
        type: Number,
        default: 0,
    }
},{timestamps:true});

module.exports = mongoose.model("FoitiTeam", foitiTeamSchema);
