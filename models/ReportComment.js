const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const reportCommentSchema = new Schema(
    {
        reporter: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        comment_id: {
            type: Schema.Types.ObjectId,
            ref: "Comment",
        },
        body: {
            type: String,
            maxlength: 5000,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("ReportComment", reportCommentSchema);
