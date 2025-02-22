import mongoose, { Schema } from "mongoose";

const watchHistorySchema = new Schema({
    videoId: {
        type: Schema.Types.ObjectId,
        ref: "Video",
        required: true
    },
    watchedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, {
    timestamps: true
})

export const watchHistory = mongoose.model("watchHistory", watchHistorySchema)