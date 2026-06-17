import cloudinary from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        // upload the file on the cloudinary
        const res = await cloudinary.uploader
            .upload(localFilePath, {
                resource_type: "auto"
            })
        // file has been uploaded successfully

        // console.log(`File Uploaded Successfully \n ${res.url}`)
        fs.unlinkSync(localFilePath);
        return res;
    } catch (error) {
        fs.unlinkSync(localFilePath);// remove the file from local uploads folder
        console.log("Error while uploading on cloudinary", error);
        return null;
    }
}

export { uploadOnCloudinary };