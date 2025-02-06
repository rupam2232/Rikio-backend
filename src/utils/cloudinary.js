import { v2 as cloudinary } from "cloudinary";
import fs from "fs"


export class Cloudinaryopt{
    cloudinary = cloudinary

    constructor(){
        this.cloudinary
        .config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
            api_key: process.env.CLOUDINARY_API_KEY, 
            api_secret: process.env.CLOUDINARY_API_SECRET
        })
    }

    async upload (localFilePath, folder){
        try{
            if (!localFilePath) return null
            const response = await this.cloudinary.uploader.upload(localFilePath,{
                resource_type: "auto",
                asset_folder: folder ? folder : undefined
            })
            
            fs.unlinkSync(localFilePath)
            return response;
        }catch(error){
            fs.unlinkSync(localFilePath)
            // remove the locally saved temporary file as the upload operation got failed
    
            return null;
        }

    }

    async deleteImage (imageURL){
        try{
            const publicId = (imageURL) => imageURL.split("/").pop().split(".")[0];
            const response = await this.cloudinary.uploader.destroy(publicId(imageURL), {
                resource_type: 'image',
                invalidate: true
              })
            return response;
        }catch(err){
            throw err;
        }
    }

    async deleteVideo (videoURL){
        try{
            const publicId = (videoURL) => videoURL.split("/").pop().split(".")[0];
            const response = await this.cloudinary.uploader.destroy(publicId(videoURL), {
                resource_type: 'video',
                invalidate: true
              })
            return response;
        }catch(err){
            throw err;
        }
    }
}

const cloudinaryopt = new Cloudinaryopt()
export default cloudinaryopt
