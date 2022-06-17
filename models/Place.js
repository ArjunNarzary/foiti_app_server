const mongoose = require("mongoose");

const placeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: [true, "Name of place is required"],
      index: true,
    },
    google_place_id: {
      type: String,
      index: true,
      unique: true,
    },
    // address: {
    //   route: String,
    //   natural_feature: String,
    //   neighborhood: String,
    //   sublocality_level_2: String,
    //   sublocality_level_1: String,
    //   locality: String,
    //   administrative_area_level_2: String,
    //   administrative_area_level_1: String,
    //   country: String,
    //   short_country: String,
    //   postal_code: String,
    //   premise: String,
    // },
    address: {},
    short_address: String,
    local_address: String,
    coordinates: {
      lat: String,
      lng: String,
    },
    google_types: [String],
    types: [String],
    cover_photo: {
      large: {
        public_url: String,
        private_id: String,
      },
      small: {
        public_url: String,
        private_id: String,
      },
      thumbnail: {
        public_url: String,
        private_id: String,
      },
    },
    saved: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Save",
      },
    ],
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    email: String,
    phone_number: String,
    website: String,
    viewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PlaceView",
      },
    ],
    viewers_count: Number,
    location_viewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DirectionClick",
      },
    ],
    location_viewers_count: Number,
    review_id: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
      },
    ],
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    duplicate: {
      type: Boolean,
      default: false,
    },
    original_place_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Place",
    },
    duplicate_place_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Place",
    },
    created_place: {
      type: Boolean,
      default: false,
    },
    reviewed_status: {
      type: Boolean,
      default: false,
    },
    status: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

//CALCULATE AVG RATING
placeSchema.virtual("avgRating").get(function () {
  if (this.review_id.length > 0) {
    let sum = 0;
    for (let i = 0; i < this.review_id.length; i++) {
      sum += this.review_id[i].rating;
    }
    return sum / this.review_id.length;
  } else {
    return 0;
  }
});

//SET VIRTUAL FOR FOLLOWING COUNT
placeSchema.virtual("display_address_for_own_country").get(function () {
  let address =
    this.google_types[0] != "administrative_area_level_1"
      ? this.address.administrative_area_level_1
      : "";
  if (
    this.address.administrative_area_level_2 != undefined &&
    this.address.administrative_area_level_2 != this.name
  ) {
    address = this.address.administrative_area_level_2 + ", " + address;
  } else if (
    this.address.natural_feature != undefined &&
    this.address.natural_feature != this.name
  ) {
    address = this.address.natural_feature + ", " + address;
  } else if (
    this.address.sublocality_level_1 != undefined &&
    this.address.sublocality_level_1 != this.name
  ) {
    address = this.address.sublocality_level_1 + ", " + address;
  } else if (
    this.address.sublocality_level_2 != undefined &&
    this.address.sublocality_level_2 != this.name
  ) {
    address = this.address.sublocality_level_2 + ", " + address;
  } else if (
    this.address.locality != undefined &&
    this.address.locality != this.name
  ) {
    address = this.address.locality + ", " + address;
  }
  return address;
});

//Update view count
placeSchema.pre("save", function (next) {
  if (this.isModified("viewers")) {
    this.viewers_count = this.viewers.length;
  }
  if (this.isModified("location_viewers")) {
    this.location_viewers_count = this.location_viewers.length;
  }
  next();
});

module.exports = mongoose.model("Place", placeSchema);
