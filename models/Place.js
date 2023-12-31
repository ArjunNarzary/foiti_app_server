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

const placeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: [true, "Name of place is required"],
      index: true,
    },
    //This will be the copy of original place name to show in app
    display_name: String,
    //This array will be used to search for the place, will be manually added by team
    alias: [String],
    google_place_id: {
      type: String,
      require: [true, "Please select valid location"],
      index: true,
      unique: true,
    },
    address: {},
    //If display_address_availaible true show this address
    display_address: {
      locality: String,
      sublocality: String,
      premise: String, //manual
      admin_area_3: String, //manual
      admin_area_2: String, //District name -> google_admin_area_3
      admin_area_1: String, //State name
      country: String,
      short_country: String,
    },
    //This is used to check if display address is available or not
    display_address_available: {
      type: Boolean,
      default: false,
    },
    //Address to show for other country
    short_address: String,
    //Address to show for own country
    local_address: String,
    coordinates: {
      lat: String,
      lng: String,
    },
    location: {
      type: pointSchema,
      index: "2dsphere", // Create a special 2dsphere index
      sparse: true,
    },
    google_types: [String],
    //Custom type to show in type field ["Category-> will be used in filtering", "Display in type field"]
    types: [String],
    //Search rank for sorting search results
    search_rank: {
      type: Number,
      default: 0,
    },
    //Score to sort popular places
    editor_rating: {
      type: Number,
      default: 0,
    },
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
    open_hours: [],
    saved: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Save",
      },
    ],
    //This will be User objectId -> owner of the business or place
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
        ref: "PlaceViewer",
      },
    ],
    viewers_count: Number,
    location_viewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PlaceLocationViewer",
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
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    //This will be used to check if place is duplicate or not
    duplicate: {
      type: Boolean,
      default: false,
    },
    //If duplicate place then this will be place ID of original place
    original_place_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Place",
    },
    //If this place has duplicate places then this will be array of place IDs
    duplicate_place_id: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Place",
      },
    ],
    //If this place is created by user then this will be true addrss will be taken from image coordinates
    created_place: {
      type: Boolean,
      default: false,
    },
    //If this place is reviewed by team then this will be true
    reviewed_status: {
      type: Boolean,
      default: false,
    },
    review_required: {
      type: Boolean,
      default: false,
    },
    destination: {
      type: Boolean,
      default: false,
    },
    show_destinations: {
      type: Boolean,
      default: false,
    },
    status: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
)

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

//SET VIRTUAL FOR DISPLAYING ADDRESS FOR OWN COUNTRY
placeSchema.virtual("display_address_for_own_country").get(function () {
  let addressArr = [];

  if (this.display_address_available){
    if (this.display_address.admin_area_1){
      addressArr.push(this.display_address.admin_area_1);
    }
    if (this.display_address.sublocality){
      addressArr.push(this.display_address.sublocality);
    }else if (this.display_address.locality){
      addressArr.push(this.display_address.locality);
    }else if(this.display_address.admin_area_2){
      addressArr.push(this.display_address.admin_area_2);
    }
  }else{
    if (
    this.address.administrative_area_level_1 != this.name &&
    this.address.administrative_area_level_1 != undefined
  ) {
    addressArr.push(this.address.administrative_area_level_1);
  }
    if (
      this.address.administrative_area_level_3 != undefined &&
      this.address.administrative_area_level_3 != this.name
    ) {
      addressArr.push(this.address.administrative_area_level_3);
    }else if (
    this.address.administrative_area_level_2 != undefined &&
    this.address.administrative_area_level_2 != this.name
  ) {
    addressArr.push(this.address.administrative_area_level_2);
  } else if (
    this.address.natural_feature != undefined &&
    this.address.natural_feature != this.name
  ) {
    addressArr.push(this.address.natural_feature);
  } else if (
    this.address.sublocality_level_1 != undefined &&
    this.address.sublocality_level_1 != this.name
  ) {
    addressArr.push(this.address.sublocality_level_1);
  } else if (
    this.address.sublocality_level_2 != undefined &&
    this.address.sublocality_level_2 != this.name
  ) {
    addressArr.push(this.address.sublocality_level_2);
  } else if (
    this.address.locality != undefined &&
    this.address.locality != this.name
  ) {
    addressArr.push(this.address.locality);
  }}
  // console.log("arr", addressArr);

  let reverseArr = [];
  if (addressArr.length != 0) {
    reverseArr = addressArr.reverse();
  }

  let address = "";
  if (reverseArr.length != 0) {
    address = ", " + reverseArr.join(", ");
  }

  return address;
});

//SET VIRTUAL FOR DISPLAYING ADDRESS FOR OWN COUNTRY
placeSchema.virtual("display_address_for_own_country_home").get(function () {
  let addressArr = [];

  if (this.display_address_available) {
    if (this.display_address.admin_area_1) {
      addressArr.push(this.display_address.admin_area_1);
    }
  } else {
    if (
      this.address.administrative_area_level_1 != this.name &&
      this.address.administrative_area_level_1 != undefined
    ) {
      addressArr.push(this.address.administrative_area_level_1);
    }
    
  }

  let reverseArr = [];
  if (addressArr.length != 0) {
    reverseArr = addressArr.reverse();
  }

  let address = "";
  if (reverseArr.length != 0) {
    address = ", " + reverseArr.join(", ");
  }

  return address;
});

//SET VIRTUAL FOR DISPLAYING ADDRESS FOR OWN COUNTRY
placeSchema.virtual("display_address_for_own_country_place").get(function () {
  let addressArr = [];

  if (this.display_address_available) {
    if (this.display_address.admin_area_1) {
      addressArr.push(this.display_address.admin_area_1);
    }
    if (this.display_address.admin_area_2) {
      addressArr.push(this.display_address.admin_area_2);
    }
    if (this.display_address.sublocality && this.display_address.sublocality !== this.display_address.admin_area_2) {
      addressArr.push(this.display_address.sublocality);
    } else if (this.display_address.locality && this.display_address.locality !== this.display_address.admin_area_2) {
      addressArr.push(this.display_address.locality);
    }  
  } else {
    if (
      this.address.administrative_area_level_1 != this.name &&
      this.address.administrative_area_level_1 != undefined
    ) {
      addressArr.push(this.address.administrative_area_level_1);
    }
    if (
      this.address.administrative_area_level_3 != undefined &&
      this.address.administrative_area_level_3 != this.name
    ) {
      addressArr.push(this.address.administrative_area_level_3);
    }else if (
      this.address.administrative_area_level_2 != undefined &&
      this.address.administrative_area_level_2 != this.name
    ) {
      addressArr.push(this.address.administrative_area_level_2);
    } else if (
      this.address.natural_feature != undefined &&
      this.address.natural_feature != this.name
    ) {
      addressArr.push(this.address.natural_feature);
    } else if (
      this.address.sublocality_level_1 != undefined &&
      this.address.sublocality_level_1 != this.name
    ) {
      addressArr.push(this.address.sublocality_level_1);
    } else if (
      this.address.sublocality_level_2 != undefined &&
      this.address.sublocality_level_2 != this.name
    ) {
      addressArr.push(this.address.sublocality_level_2);
    } else if (
      this.address.locality != undefined &&
      this.address.locality != this.name
    ) {
      addressArr.push(this.address.locality);
    }
  }
  // console.log("arr", addressArr);

  let reverseArr = [];
  if (addressArr.length != 0) {
    reverseArr = addressArr.reverse();
  }

  let address = "";
  if (reverseArr.length != 0) {
    address = ", " + reverseArr.join(", ");
  }

  return address;
});

//SET VIRTUAL FOR DISPLAYING ADDRESS FOR OTHER COUNTRY
placeSchema.virtual("display_address_for_other_country").get(function () {
  let arrAddress = [];

  if (this.display_address_available && this.display_address.country){
    arrAddress.push(this.display_address.country);
  }else{
    if (this.address.country != undefined && this.address.country != this.name) {
    arrAddress.push(this.address.country);
  }
}

  if(this.display_address_available){
    if (this.display_address.admin_area_1) {
      arrAddress.push(this.display_address.admin_area_1);
    }else if (this.display_address.locality) {
      arrAddress.push(this.display_address.locality);
    } else if (this.display_address.admin_area_2) {
      arrAddress.push(this.display_address.admin_area_2);
    }
  }else{
    if (
      this.address.administrative_area_level_1 != this.name &&
      this.address.administrative_area_level_1 != undefined
    ) {
      arrAddress.push(this.address.administrative_area_level_1);
    } else if (
      this.address.administrative_area_level_3 != undefined &&
      this.address.administrative_area_level_3 != this.name
    ) {
      arrAddress.push(this.address.administrative_area_level_3);
    } else if (
      this.address.administrative_area_level_2 != undefined &&
      this.address.administrative_area_level_2 != this.name
    ) {
      arrAddress.push(this.address.administrative_area_level_2);
    } else if (
      this.address.natural_feature != undefined &&
      this.address.natural_feature != this.name
    ) {
      arrAddress.push(this.address.natural_feature);
    } else if (
      this.address.sublocality_level_1 != undefined &&
      this.address.sublocality_level_1 != this.name
    ) {
      arrAddress.push(this.address.sublocality_level_1);
    } else if (
      this.address.sublocality_level_2 != undefined &&
      this.address.sublocality_level_2 != this.name
    ) {
      arrAddress.push(this.address.sublocality_level_2);
    } else if (
      this.address.locality != undefined &&
      this.address.locality != this.name
    ) {
      arrAddress.push(this.address.locality);
    }
  }

  let reverseArr = [];
  if (arrAddress.length != 0) {
    reverseArr = arrAddress.reverse();
  }

  let address = "";
  if (reverseArr.length != 0) {
    address = ", " + reverseArr.join(", ");
  }

  return address;
});

//SET VIRTUAL FOR DISPLAYING ADDRESS FOR OTHER COUNTRY
placeSchema.virtual("display_address_for_other_country_home").get(function () {
  let arrAddress = [];

  if (this.display_address_available && this.display_address.country) {
    arrAddress.push(this.display_address.country);
  } else {
    if (this.address.country != undefined && this.address.country != this.name) {
      arrAddress.push(this.address.country);
    }
  }

  if (this.display_address_available) {
    if (this.display_address.admin_area_1) {
      arrAddress.push(this.display_address.admin_area_1);
    } 
  } else {
    if (
      this.address.administrative_area_level_1 != this.name &&
      this.address.administrative_area_level_1 != undefined
    ) {
      arrAddress.push(this.address.administrative_area_level_1);
    } 
  }

  let reverseArr = [];
  if (arrAddress.length != 0) {
    reverseArr = arrAddress.reverse();
  }

  let address = "";
  if (reverseArr.length != 0) {
    address = ", " + reverseArr.join(", ");
  }

  return address;
});

//SET VIRTUAL FOR DISPLAYING ADDRESS FOR OTHER COUNTRY
placeSchema.virtual("display_address_for_other_country_place").get(function () {
  let arrAddress = [];

  if (this.display_address_available && this.display_address.country) {
    arrAddress.push(this.display_address.country);
  } else {
    if (this.address.country != undefined && this.address.country != this.name) {
      arrAddress.push(this.address.country);
    }
  }

  if (this.display_address_available) {
    if (this.display_address.admin_area_1) {
      arrAddress.push(this.display_address.admin_area_1);
    }
    if (this.display_address.admin_area_2) {
      arrAddress.push(this.display_address.admin_area_2);
    }
    if (this.display_address.sublocality && this.display_address.sublocality !== this.display_address.admin_area_2) {
      arrAddress.push(this.display_address.sublocality);
    } else if (this.display_address.locality && this.display_address.locality !== this.display_address.admin_area_2) {
      arrAddress.push(this.display_address.locality);
    }
  } else {
    if (
      this.address.administrative_area_level_1 != this.name &&
      this.address.administrative_area_level_1 != undefined
    ) {
      arrAddress.push(this.address.administrative_area_level_1);
    } else if (
      this.address.administrative_area_level_3 != undefined &&
      this.address.administrative_area_level_3 != this.name
    ) {
      arrAddress.push(this.address.administrative_area_level_3);
    } else if (
      this.address.administrative_area_level_2 != undefined &&
      this.address.administrative_area_level_2 != this.name
    ) {
      arrAddress.push(this.address.administrative_area_level_2);
    } else if (
      this.address.natural_feature != undefined &&
      this.address.natural_feature != this.name
    ) {
      arrAddress.push(this.address.natural_feature);
    } else if (
      this.address.sublocality_level_1 != undefined &&
      this.address.sublocality_level_1 != this.name
    ) {
      arrAddress.push(this.address.sublocality_level_1);
    } else if (
      this.address.sublocality_level_2 != undefined &&
      this.address.sublocality_level_2 != this.name
    ) {
      arrAddress.push(this.address.sublocality_level_2);
    } else if (
      this.address.locality != undefined &&
      this.address.locality != this.name
    ) {
      arrAddress.push(this.address.locality);
    }
  }

  let reverseArr = [];
  if (arrAddress.length != 0) {
    reverseArr = arrAddress.reverse();
  }

  let address = "";
  if (reverseArr.length != 0) {
    address = ", " + reverseArr.join(", ");
  }

  return address;
});

//TODO::SET VIRTUAL FOR DISPLAYING ADDRESS FOR OWN COUNTRY FOR MEETUP USERLIST
placeSchema.virtual("display_address_for_own_country_meetup_list").get(function () {
  let addressArr = [];

  if (this.display_address_available) {
    if (this.display_address.locality) {
      addressArr.push(this.display_address.locality);
      if(this.display_address.admin_area_1 && (this.display_address.admin_area_1.toLowerCase() !== this.display_address.locality.toLowerCase())){
        addressArr.push(this.display_address.admin_area_1);
      }
    }else{
      addressArr.push(this.name);
      if(this.display_address.admin_area_1 && (this.display_address.admin_area_1.toLowerCase() !== this.name.toLowerCase())){
        addressArr.push(this.display_address.admin_area_1);
      }
    }
  } else {
    if (this.address.locality) {
      addressArr.push(this.address.locality);
      if(this?.address?.administrative_area_level_1 && (this.address.administrative_area_level_1.toLowerCase() !== this.address.locality.toLowerCase())){
        addressArr.push(this.address.administrative_area_level_1);
      }
    }else{
      addressArr.push(this.name);
      if(this.address.administrative_area_level_1 && (this.address.administrative_area_level_1.toLowerCase() !== this.name.toLowerCase())){
        addressArr.push(this.address.administrative_area_level_1);
      }
    }
  }

  let address = addressArr.join((", "));
  return address
})

placeSchema.virtual("display_address_for_own_country_meetup_profile").get(function () {
  let addressArr = [];
  let checkAdd = [];

  if (this?.display_name) {
    addressArr.push(this.display_name);
    checkAdd.push(this.display_name.toLowerCase());
  } else {
    addressArr.push(this.name);
    checkAdd.push(this.name.toLowerCase());
  }

  if (this?.display_address_available) {
    if (this?.display_address?.locality && !checkAdd.includes(this?.display_address?.locality.toLowerCase())) {
      addressArr.push(this.display_address?.locality)
      checkAdd.push(this.display_address?.locality.toLowerCase());
    }
    if (this?.display_address?.admin_area_1 && !checkAdd.includes(this?.display_address?.admin_area_1.toLowerCase())) {
      addressArr.push(this.display_address?.admin_area_1)
      checkAdd.push(this.display_address?.admin_area_1.toLowerCase());
    }
  } else {
    if (this?.address?.locality && !checkAdd.includes(this?.address?.locality.toLowerCase())) {
      addressArr.push(this.address?.locality)
      checkAdd.push(this.address?.locality.toLowerCase());
    }
    if (this?.address?.administrative_area_level_1 && !checkAdd.includes(this?.address?.administrative_area_level_1.toLowerCase())) {
      addressArr.push(this.address?.administrative_area_level_1)
    }
  }

  return addressArr.join(', ');
})

placeSchema.virtual("display_address_for_other_country_meetup_profile").get(function () {
  let addressArr = [];
  let checkAdd = [];

  if (this?.display_name) {
    addressArr.push(this.display_name);
    checkAdd.push(this.display_name.toLowerCase());
  } else {
    addressArr.push(this.name);
    checkAdd.push(this.name.toLowerCase());
  }

  if (this?.display_address_available) {
    if (this?.display_address?.locality && !checkAdd.includes(this?.display_address?.locality.toLowerCase())) {
      addressArr.push(this.display_address?.locality)
      checkAdd.push(this.display_address?.locality.toLowerCase());
    }
    if (this?.display_address?.admin_area_1 && !checkAdd.includes(this?.display_address?.admin_area_1.toLowerCase())) {
      addressArr.push(this.display_address?.admin_area_1)
      checkAdd.push(this.display_address?.admin_area_1.toLowerCase());
    }

    if (this?.display_address?.country && !checkAdd.includes(this?.display_address?.country.toLowerCase())) {
      addressArr.push(this.display_address?.country);
    }
  } else {
    if (this?.address?.locality && !checkAdd.includes(this?.address?.locality.toLowerCase())) {
      addressArr.push(this.address?.locality)
      checkAdd.push(this.address?.locality.toLowerCase());
    }
    if (this?.address?.administrative_area_level_1 && !checkAdd.includes(this?.address?.administrative_area_level_1.toLowerCase())) {
      addressArr.push(this.address?.administrative_area_level_1);
      checkAdd.push(this.address?.administrative_area_level_1.toLowerCase());
    }
    if (this?.address?.country && !checkAdd.includes(this?.address?.country.toLowerCase())) {
      addressArr.push(this.address?.country)
    }
  }

  return addressArr.join(', ');
})



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
