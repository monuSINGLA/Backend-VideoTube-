import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({path: "./.env"})


connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, () => {
        console.log(`server is running at port : ${process.env.PORT}`);
    })
})
.catch((error)=>{
    console.log(`MONGO DB connection failed !!! ${error}`);
})











// import express from "express"
// const app =express()
// ( async () => {
//     try {
//        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
//        app.on("error", (error) => {
//         console.log("express in not able to connect with db as error:" , error);
//         throw error
//        })

//        app.listen(process.env.PORT || 8000, ()=>{
//         console.log(`app is listenig on port: ${process.env.PORT}`);
//        })

//     } catch (error) {
//         console.error("ERROR", error)
//         throw error
//     }
// })()
