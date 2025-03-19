import { Router } from "express";
import { sendOtp, verifyOtp } from "../controllers/otp.controller.js";
import trackOtpRequest from "../middlewares/trackOtpRequest.middleware.js";

const router = Router()

router.route("/send-otp/:context").post(trackOtpRequest, sendOtp)
router.route("/verify-otp").post(verifyOtp)

export default router