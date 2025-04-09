import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";

const app = express();

const isDev = process.env.NODE_ENV === 'development';
const allowedOrigins = process.env.CORS_ORIGIN.split(',').map(origin => origin.trim());;

app.use(cors({
    origin: function (origin, callback) {
        if (!origin && isDev) return callback(null, true);
        if (!origin) return callback(null, false);
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        } else {
          return callback(new Error('CORS policy: Not allowed by CORS'));
        }
      },
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

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    errors: err.errors || [],
  });
});

export {app}