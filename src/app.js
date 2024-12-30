import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())


import userRouter from "./routes/user.routes.js"
import videoRouter from "./routes/video.routes.js"
import tweetRouter from "./routes/tweet.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import likeRouter from "./routes/like.routes.js"
import commentRouter from "./routes/comment.routes.js"
import healthcheckRouter from "./routes/healthcheck.routes.js"
import dashboardRouter from "./routes/dashboard.routes.js"
import otpRouter from "./routes/otp.routes.js"

app.use("/api/v1/users", userRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/tweet", tweetRouter)
app.use("/api/v1/subscription", subscriptionRouter)
app.use("/api/v1/playlist", playlistRouter)
app.use("/api/v1/like", likeRouter)
app.use("/api/v1/comment", commentRouter)
app.use("/api/v1/healthcheck", healthcheckRouter)
app.use("/api/v1/dashboard", dashboardRouter)
app.use("/api/v1/otp", otpRouter)

// https://devuiv2.vercel.app/templates/youtube


export {app}