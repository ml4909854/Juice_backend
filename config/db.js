
require("dotenv").config()
const mongoose = require("mongoose")
const mongoUrl = process.env.MONGO_URL

const connectDB = ()=>{
    try {
        mongoose.connect(mongoUrl)
        console.log("DB connected!")
    } catch (error) {
        console.log("Error Db Connection" , error)
    }
}

module.exports = connectDB