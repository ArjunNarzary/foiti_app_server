const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const currentAddressSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "User",
    },
    name: String,
    address: {},
    google_types:[String],
    formattedAddress:String,
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
        expires: 604800, // this is the expiry time in seconds for 7 days
    },
});

//SET VIRTUAL FOR DISPLAYING ADDRESS FOR OWN COUNTRY
currentAddressSchema.virtual("display_address_for_own_country").get(function () {
    let address = "";
        // this.google_types[0] != "administrative_area_level_1"
        //     ? this.address.administrative_area_level_1
        //     : "";
    if (this.google_types[0] != "administrative_area_level_1"){
        address = this.address.administrative_area_level_1
    }
    else if (
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


//SET VIRTUAL FOR DISPLAYING ADDRESS FOR OTHER COUNTRY
currentAddressSchema.virtual("display_address_for_other_country").get(function () {
    let state = "";

    if (
        this.address.administrative_area_level_1 != null &&
        this.google_types[0] != "administrative_area_level_1"
    ) {
        state = this.address.administrative_area_level_1;
    } else if (
        this.address.administrative_area_level_2 != null &&
        this.google_types[0] != "administrative_area_level_2"
    ) {
        state = this.address.administrative_area_level_2;
    } else if (
        this.address.locality != null &&
        this.google_types[0] != "locality"
    ) {
        state = this.address.locality;
    } else if (
        this.address.sublocality_level_1 != null &&
        this.google_types[0] != "sublocality_level_1"
    ) {
        state = this.address.sublocality_level_1;
    } else if (
        this.address.sublocality_level_2 != null &&
        this.google_types[0] != "sublocality_level_2"
    ) {
        state = this.address.sublocality_level_2;
    } else if (
        this.address.neighborhood != null &&
        this.google_types[0] != "neighborhood"
    ) {
        state = this.address.neighborhood;
    }
    let comma = " ";
    if (state == "" || this.address.country == undefined) {
        comma = " ";
    } else {
        comma = ", ";
    }

    // state = state + comma + (this.address.country != undefined ? this.address.country : "");
    name = this.address.country != undefined ? this.address.country : state;
    return name;
});


module.exports = mongoose.model("CurrentAddress", currentAddressSchema);
