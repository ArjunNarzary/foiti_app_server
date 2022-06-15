const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const placeViewerSchema = new Schema({
    place: {
        type: Schema.Types.ObjectId,
        ref: "Place",
        required: true,
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    createdAt: {
        type: Date,
        default: Date.now(),
        immutable: true,
    },
    updatedAt: {
        type: Date,
        default: Date.now(),
    },
});

//UPDATE DATE
placeViewerSchema.pre("save", async function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model("PlaceViewer", placeViewerSchema);