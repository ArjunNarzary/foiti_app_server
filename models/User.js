const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    required: [true, "Please enter your email"],
    unique: [true, "Email already exist"],
    lowercase: true,
  },
  email_verified: {
    type: Boolean,
    default: false,
  },
  username: {
    type: String,
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
  socialLogin: {
    type: Boolean,
    default: false,
  },
  socialProvider: String,
  profileImage: {
    thumbnail: {
      public_url: String,
      private_id: String,
    },
    large: {
      public_url: String,
      private_id: String,
    },
    extraLarge: {
      public_url: String,
      private_id: String,
    },
  },
  coverImage: {
    thumbnail: {
      public_url: String,
      private_id: String,
    },
    large: {
      public_url: String,
      private_id: String,
    },
  },
  gender: {
    type: String,
    enum: ["male", "female", "other"],
  },
  dob: Date,
  phoneNumber: String,
  address: {
    name: String,
    administrative_area_level_1: String,
    country: String,
    short_country: String,
    coordinates: {
      lat: String,
      lng: String,
    }
  },
  place: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Place",
  },
  currently_in: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CurrentAddress",
  },
  bio: {
    type: String,
    maxlength: [1000, "Bio should be under 1000 characters"],
  },
  website: {
    type: String,
    lowercase: true,
  },
  meetup_reason: {
    type: String,
    maxlength: [1000, "Meetup reason should be under 1000 characters"],
  },
  interests: {
    type: String,
    maxlength: [500, "Interest should be under 500 characters"],
  },
  education: {
    type: String,
    maxlength: [500, "Education should be under 500 characters"],
  },
  occupation: {
    type: String,
    maxlength: [500, "Occupation should be under 500 characters"],
  },
  languages: [String],
  movies_books_music: {
    type: String,
    maxlength: [500, "Movies_books_music should be under 500 characters"],
  },
  visited: {
    places: {
      type: Number,
      default: 0,
    },
    country: {
      type: Number,
      default: 0,
    },
  },
  helped_navigate: {
    type: Number,
    default: 0,
  },
  total_uploads: {
    type: Number,
    default: 0,
  },
  total_contribution: {
    type: Number,
    default: 0,
  },
  follower: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  following: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  isVerified: {
    type: Boolean,
    default: false,
  },
  foiti_ambassador: {
    type: Boolean,
    default: false,
  },
  top_contributor: {
    type: Boolean,
    default: false,
  },
  expoToken: {
    type: String,
    select: false,
  },
  upload_status: Boolean,
  account_status: {
    type: String,
    enum: ["silent", "active", "deactivated"],
  },
  last_account_status: {
    type: String,
    enum: ["silent", "active", "deactivated"],
  },
  terminated: {
    type: Boolean,
    default: false,
  },
  blocked_users: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
  reported_users: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
  reported_posts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    }],
  hidden_meetup_profile: {
    type: Boolean,
    default: false
  },
  /**
   * MEETUP POINT CATEGORIES
  - bio and meetup_reason == <10 is 0pts, 11 to 50 is 5pts and geater than 50 is 10pts.
  - gender, dob and address == 5pts each,
  - if profileImage exist = 10pts
  - interests & movies_books_music  = 1 - 10 is 0pts, 11 to 50 is 5pts and geater than 50 is 10pts.
  - if languages, occupation and education exist = 5pts each
   */
  meetup_points: {
    type: Number,
    default: 0
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  tokenVersion: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.virtual('currently_at', {
  ref: 'currentaddresses',
  localField: 'current_location',
  foreignField: '_id',
  justOne: true
});

//HASH PASSWORD
userSchema.pre("save", async function (next) {
  this.updatedAt = Date.now();
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

//MATCH PASSWORD
userSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

//GENEARATE TOKEN
userSchema.methods.generateToken = function () {
  return jwt.sign(
    { _id: this._id, email: this.email, tokenVersion: this.tokenVersion },
    process.env.JWT_SECRET,
    {
      expiresIn: "90d",
    }
  );
};

//Check isFollwed
userSchema.methods.isFollowed = async function (id) {
  return this.follower.includes(id);
};

//SET VIRTUAL FOR FOLLOWING COUNT
userSchema.virtual("totalFollowing").get(function () {
  return this.following.length;
});
//SET VIRTUAL FOR FOLLOWERS COUNT
userSchema.virtual("totalFollower").get(function () {
  return this.follower.length;
});

//GENERATE OTP
userSchema.methods.generateOtp = function () {
  return Math.floor(100000 + Math.random() * 900000);
};

//GENERATE RESET PASSWORD TOKEN AND SAVE
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model("User", userSchema);
