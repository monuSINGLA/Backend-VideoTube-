import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors"



const app = express()
    
// cors config
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

// express properties config 
app.use(express.json({limit : "16kb"}))
app.use(express.urlencoded({extended : true,limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())


//routes
import UserRouter from "./routes/user.routes.js";


//routes declareations
app.use("/api/v1/users", UserRouter)

export { app }