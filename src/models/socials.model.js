import mongoose, {Schema} from "mongoose";

const socialSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    facebook: {
        type: String,
        default: null
    },
    x: {
        type: String,
        default: null
    },
    instagram: {
        type: String,
        default: null
    },
    linkedin: {
        type: String,
        default: null
    },
    github: {
        type: String,
        default: null
    },
    website: {
        type: String,
        default: null
    }
},{
    timestamps:true
})

export const Social = mongoose.model("Social", socialSchema)