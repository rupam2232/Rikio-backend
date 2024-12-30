import { Router } from "express";
import { sendOtp, verifyOtp } from "../controllers/otp.controller.js";

const router = Router()

router.route("/send-otp/:context").post(sendOtp)
router.route("/verify-otp").post(verifyOtp)

export default router