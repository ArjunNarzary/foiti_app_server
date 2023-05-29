const mongoose = require("mongoose");

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: "Point",
  },
  coordinates: {
    type: [Number], // Array of arrays of arrays of numbers
  }
});

const postSchema = new mongoose.Schema(
  {
    name: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    place: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Place",
    },
    original_place: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Place",
    },
    content: [
      {
        image: {
          thumbnail: {
            public_url: String,
            private_id: String,
          },
          small: {
            public_url: String,
            private_id: String,
          },
          large: {
            public_url: String,
            private_id: String,
          },
        },
        Make: String,
        Model: String,
        ExifVersion: String,
        ISOSpeedRatings:String,
        createdDate: {
          year: Number,
          month: Number,
          day: Number
        },
        coordinate: {
          lat: String,
          lng: String,
        },
        type: {
          type: String,
          enum: ["video", "image"],
          default: "image",
        },
        location: {
          type: pointSchema,
          index: '2dsphere', // Create a special 2dsphere index
          sparse: true
        }
      },
    ],
    caption: {
      type: String,
      maxlength: [1000, "Caption should be maximum of 1000 characters"],
    },
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    comment_status: {
      type: Boolean,
      default: true,
    },
    saved: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    location_viewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PostLocationViewer",
      },
    ],
    location_viewers_count: Number,
    like: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    like_count: Number,
    viewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PostViewer",
      },
    ],
    viewers_count: Number,
    status: {
      type: String,
      enum: ["silent", "active", "deactivated", "blocked"],
    },
    coordinate_status: {
      type: Boolean,
      default: false,
    },
    manual_coordinates:{
      type: Boolean,
      default: false,
    },
    verified_coordinates:{
      type: Boolean,
      default: false,
    },
    recommend: {
      type: Boolean,
      default: false,
    },
    deactivated:{
      type:Boolean,
      default:false,
    },
    terminated: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

//CHECK IF LIKED
postSchema.methods.hasLiked = async function (id) {
  return this.like.includes(id);
};

//CHECK IF COUNTRY IS SAME
// postSchema.methods.sameCountry = async function (country) {
//   return this.place.country === country;
// }

//SET VIRTUAL TO SET SAME COUNTRY
//SET VIRTUAL FOR FOLLOWING COUNT
postSchema.virtual("display_address_for_own_country").get(function () {
  let address =
  this.place.google_types[0] != "administrative_area_level_1"
  ? this.place.address.administrative_area_level_1
  : "";
  if (
    this.place.address.administrative_area_level_2 != undefined &&
    this.place.address.administrative_area_level_2 != this.place.name
  ) {
    address = this.place.address.administrative_area_level_2 + ", " + address;
  } else if (
    this.place.address.natural_feature != undefined &&
    this.place.address.natural_feature != this.place.name
  ) {
    address = this.place.address.natural_feature + ", " + address;
  } else if (
    this.place.address.sublocality_level_1 != undefined &&
    this.place.address.sublocality_level_1 != this.place.name
  ) {
    address = this.place.address.sublocality_level_1 + ", " + address;
  } else if (
    this.place.address.sublocality_level_2 != undefined &&
    this.place.address.sublocality_level_2 != this.place.name
  ) {
    address = this.place.address.sublocality_level_2 + ", " + address;
  } else if (
    this.place.address.locality != undefined &&
    this.place.address.locality != this.place.name
  ) {
    address = this.place.address.locality + ", " + address;
  }
  return address;
});

//Update like count
postSchema.pre("save", function (next) {
  if (this.isModified("viewers")) {
    this.viewers_count = this.viewers.length;
  }
  if (this.isModified("like")) {
    this.like_count = this.like.length;
  }
  if (this.isModified("location_viewers")) {
    this.location_viewers_count = this.location_viewers.length;
  }
  if (this.isModified("status")) {
    this.last_status = this.status;
  }
  next();
});

module.exports = mongoose.model("Post", postSchema);
