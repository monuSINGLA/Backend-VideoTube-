import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { ApiError } from "./ApiError.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //upload file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log(response.public_id);
    //fille has been uploaded successfully
    // console.log(`file is uploaded on cloudinary ${response.url}`);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); //remove the locally saved temporary file as a operation got failed
    return null;
  }
};

const deleteOldAvatarAfterChangeAvatarOnCloudinary = async (oldAvatarUrl) => {
  // console.log(oldAvatarUrl);
  try {
    if (!oldAvatarUrl) return null;

    const url = oldAvatarUrl.split("/");

    const publicId = url[url.length - 1].split(".")[0];
    console.log(publicId);
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    throw new ApiError(500, "Error while deleting old Avatar on cloudinary");
  }
};

export { uploadOnCloudinary, deleteOldAvatarAfterChangeAvatarOnCloudinary };

// cloudinary.v2.uploader.upload("https://upload.wikimedia.org/wikipedia/commons/a/ae/Olympic_flag.jpg",
//   { public_id: "olympic_flag" },
//   function(error, result) {console.log(result); });
