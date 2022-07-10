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
    let addressArr = [];

    if (this.address.administrative_area_level_1 != this.name && this.address.administrative_area_level_1 != undefined) {
        addressArr.push(this.address.administrative_area_level_1);
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
currentAddressSchema.virtual("display_address_for_other_country").get(function () {
    let arrAddress = [];

    if (this.address.country != undefined && this.address.country != this.name){
        arrAddress.push(this.address.country);
    }

    if (
        this.address.administrative_area_level_1 != this.name && this.address.administrative_area_level_1 != undefined
    ) {
        arrAddress.push(this.address.administrative_area_level_1);
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


module.exports = mongoose.model("CurrentAddress", currentAddressSchema);
