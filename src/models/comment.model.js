import mongoose, { Schema } from "mongoose";

const commentSchema = new Schema({
    content: {
        type: String,
        required: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    video: {
        type: Schema.Types.ObjectId,
        ref: "Video"
    },
    tweet: {
        type: Schema.Types.ObjectId,
        ref: "Tweet"
    },
    parentComment: {
        type: Schema.Types.ObjectId,
        ref: "Comment"
    },
    replyingTo: {
        type: Schema.Types.ObjectId,
        ref: "Comment"
    },
    isEdited: {
        type: Boolean,
        default: false,
        required: true
    }
}, {
    timestamps: true
})

export const Comment = mongoose.model("Comment", commentSchema)