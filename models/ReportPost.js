const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const reportPostSchema = new Schema(
    {
        reporter: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        post_id: {
            type: Schema.Types.ObjectId,
            ref: "Post",
        },
        body: {
            type: String,
            maxlength: 5000,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("ReportPost", reportPostSchema);
