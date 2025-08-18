import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';


cloudinary.config({
cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
api_key: process.env.CLOUDINARY_API_KEY,
api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath)=>{

    try {  
        if (!localFilePath) {
            console.log('No local file path provided');
            return null;
        }
        
        // Check if file exists
        if (!fs.existsSync(localFilePath)) {
            console.log('File does not exist:', localFilePath);
            return null;
        }
        
        console.log('Uploading file to Cloudinary:', localFilePath);
        
        //upload the file on cloudinary
        const uploadResult = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        console.log('Upload successful:', uploadResult.url);
        
        // Clean up local file after successful upload
        fs.unlinkSync(localFilePath)
        return uploadResult

    } catch (error) {
        console.error('Cloudinary upload error:', error.message);
        
        // Clean up local file if it exists
        if (localFilePath && fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath)
        }
        
        return null
        
    }
}


export default uploadOnCloudinary