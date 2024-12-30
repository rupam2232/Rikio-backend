import mongoose, { Schema } from "mongoose";

const tweetSchema = new Schema({
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    content: {
        textContent: {
            type: String,
        },
        image: [
            {
                type: String
            }
        ]
    }
}, {
    timestamps: true
})

export const Tweet = mongoose.model("Tweet", tweetSchema)