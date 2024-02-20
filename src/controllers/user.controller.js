import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {
  deleteOldAvatarAfterChangeAvatarOnCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateAccessAndRefreshTokens } from "../utils/generateAccessAndRefreshTokens.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const registerUser = asyncHandler(async (req, res) => {
  // steps for create new user
  // validation (not empty or more)
  // check if user already exists by username or email
  // check for images , check for avatar required
  // upload them to cloudinary, check avtar is successfully uploded or not because it is required field
  // create user object - create new entry in database
  // remove password and refresh token filed response
  // check for user creation
  // return response

  // get user request from frontened

  const { username, fullName, email, password } = req.body;

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(404, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  // console.log(existedUser);

  if (existedUser) {
    throw new ApiError(409, "User with email or username is already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;

  let coverImageLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(505, "Something went wrong while regestering user");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req body --> data
  // is username or email available?
  // find the user in database
  // if username exist so check password
  // if password ok then use access and refresh token
  //send cokkies

  const { email, username, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "username or password is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  // console.log(user);

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  // console.log(isPasswordValid);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // console.log(loggedInUser);

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        201,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.dody.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(404, "Unauthorized token");
  }

  try {
    const decodedVerifyToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    if (!decodedVerifyToken) {
      throw new ApiError(404, "Invalid refresh token");
    }

    const user = await User.findById(decodedVerifyToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(
        401,
        "Refresh token is expired or used, Please login again"
      );
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    // const loggedInUserAgain = await User.findById(user._id).select("-password -refreshToken")

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          201,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(404, error.message || "invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  //take email or username ,old password and new password from req.body
  //check email or username in database
  // if email exist
  // check user real saved database password with user given password
  // old database passowrd replace with new
  //return new success

  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!(oldPassword && newPassword && confirmPassword)) {
    throw new ApiError(
      401,
      "Old-Password , New-Password and Confirm-Password filed are required"
    );
  }

  if (!(newPassword === confirmPassword)) {
    throw new ApiError(402, "New password and Confrim password should be same");
  }
  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(402, "User doesn't exist");
  }

  const isPasswordCorrectPassword = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrectPassword) {
    throw new ApiError(402, "Invalid old password ");
  }

  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!(fullName && email)) {
    throw new ApiError(400, "All fileds are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { fullName: fullName, email: email },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const localAvatarPath = req.file?.path;

  if (!localAvatarPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(localAvatarPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar on cloudinary");
  }

  // old avatar removing from clodinary after update new avatar
  const oldAvatar = await User.findById(req.user?._id).select("avatar");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  await deleteOldAvatarAfterChangeAvatarOnCloudinary(oldAvatar?.avatar);

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User avatar changed successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const localCoverImagePath = req.file?.path;

  if (!localCoverImagePath) {
    throw new ApiError(400, "Cover image file is missing");
  }

  const coverImage = await uploadOnCloudinary(localCoverImagePath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading avatar on cloudinary");
  }

  // old coverImage removing from clodinary after update new avatar
  const oldCoverImage = await User.findById(req.user?._id).select("coverImage");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  await deleteOldAvatarAfterChangeAvatarOnCloudinary(oldCoverImage?.coverImage);

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User cover image changed successfully"));
});

const deleteUser = asyncHandler(async (req, res) => {
  try {
    const currentUser = req.cookies.refreshToken;
    if (!currentUser) {
      throw new ApiError(400, "User doesn't exist");
    }

    const decodedRefreshToken = jwt.verify(
      currentUser,
      process.env.REFRESH_TOKEN_SECRET
    );
    if (!decodedRefreshToken) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    const userForDelete = await User.findByIdAndDelete(
      decodedRefreshToken?._id
    );
    if (!userForDelete) {
      throw new ApiError(404, "User not found");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "User account deleted successfully"));
  } catch (error) {
    throw new ApiError(500, error.message || "invalid server response");
  }
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(401, "User not found");
  }

  try {
    const channel = await User.aggregate([
      {
        $match: {
          username: username?.toLowerCase(),
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers",
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "subscriber",
          as: "subscribedTo",
        },
      },
      {
        $addFields: {
          subscribersCount: {
            $size: "$subscribers",
          },
          channelsSubscribedToCount: {
            $size: "$subscribedTo",
          },
          isSubscribed: {
            $cond: {
              if: { $in: [req.user?._id, "$subscribers.subscriber"] },
              then: true,
              else: false,
            },
          },
        },
      },

      {
        $project: {
          fullName: 1,
          email: 1,
          subscribersCount: 1,
          channelsSubscribedToCount: 1,
          avatar: 1,
          coverImage: 1,
          isSubscribed: 1,
        },
      },
    ]);

    if (!channel?.length) {
      throw new ApiError(400, "Channel not found");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, channel[0], "channel details fetched succesfully")
      );
  } catch (error) {
    throw new ApiError(400, error.messege || "channel not found");
  }
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
                {
                  $addFields: {
                    owner: {
                      $first: "$owner",
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  deleteUser,
  getUserChannelProfile,
  getWatchHistory,
};
