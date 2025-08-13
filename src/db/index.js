import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDb = async() =>{
    try {
        const connectionResponse =await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`Database Connected Successfully. DB-HOST: ${connectionResponse.connection.host} `)
        
    } catch (error) {
        console.log("Error connection Database Failed: ", error)
        process.exit(1)
    }
}

export default connectDb