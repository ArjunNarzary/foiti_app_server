const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const commentSchema = new Schema({
    post_id: {
        type: Schema.Types.ObjectId,
        ref: "Post"
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: "User",
        require: [true, "Author name is required"],
    },
    parent_id: {
        type: Schema.Types.ObjectId,
        ref: "Comment"
    },
    body: {
        type: String,
        require: [true, "Comment body must be provided"]
    },
    has_reply: {
        type: Boolean,
        default: false
    },
    likes: [
        {
            type: Schema.Types.ObjectId,
            ref: "User",
        }
    ]
},
{ timestamps: true }
);

module.exports = mongoose.model("Comment", commentSchema);
