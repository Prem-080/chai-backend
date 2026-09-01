import { Router } from "express";

const router = Router();
import { loginUser, registerUser, logoutUser, refreshAcessToken, getUserProfileDetails } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 }
    ]),
    registerUser
);

router.route("/login").post(loginUser);

// secured routes
router.route("/logout").post(verifyJWT, logoutUser);

router.route("/refresh").post(refreshAcessToken);

router.route("/:username").get(getUserProfileDetails);


export default router;