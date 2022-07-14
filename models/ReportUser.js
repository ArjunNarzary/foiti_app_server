const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const reportUserSchema = new Schema(
    {
        reporter_id: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        user_id: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        body: {
            type: String,
            maxlength: 5000,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("ReportUser", reportUserSchema);
