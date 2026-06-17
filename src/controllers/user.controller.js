import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong while generating refresh and access token");

    }
}

const registerUser = asyncHandler(async (req, res, next) => {
    // res.status(200).json({
    //     message: "OK"
    // })

    const { fullName, email, username, password } = req.body;

    if ([fullName, email, username, password].some(field => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    console.log("Request Body:", req.body);
    console.log("Request Files:", req.files);

    const existedUser = await User.findOne({ $or: [{ email }, { username }] });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath = null;
    if (req.files?.coverImage) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(500, "Error while uploading avatar");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        username: username.toLowerCase(),
        password
    })

    const createdUser = await User.findById(user._id)
        .select(
            "-password -refreshToken"
        );
    if (!createdUser) {
        throw new ApiError(500, "Error while creating user");
    }

    return res.status(201).json(
        new ApiResponse(createdUser, "User created successfully", 200)
    );


});

const loginUser = asyncHandler(async (req, res, next) => {
    // req.body -> data
    // username or email
    // find the user
    // password compare
    // access and refersh token generation
    // send cookie

    const { username, password, email } = req.body;

    if (!email && !username) {
        throw new ApiError(400, "Email or username is required");
    }

    const user = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await user.isPasswordcorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res.status(200)
        .cookie("refreshToken", refreshToken, options)
        .cookie("accessToken", accessToken, options)
        .json(
            new ApiResponse(
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged in successfully",
                200
            )
        )


});


const logoutUser = asyncHandler(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user._id, 
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    );

    const options = {
        httpOnly: true,
        secure: true
    };
    return res.status(200)
        .cookie("refreshToken", "", { ... options, expires: new Date(0)})
        .cookie("accessToken", "", { ... options, expires: new Date(0)})
        .json(new ApiResponse({}, "User logged out successfully", 200))



});

export { registerUser, loginUser, logoutUser };