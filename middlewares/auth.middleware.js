const jwt = require("jsonwebtoken")
const User = require("../models/user.model.js")
const blackList = require("../utils/blackList.js")

const auth  = async(req , res , next)=>{
    try {
        const token = req.headers.authorization?.split(" ")[1]

        if(blackList.has(token)){
            return res.status(401).json({message:"user logged out. Please login again!"})
        }

        const decoded = jwt.verify(token , process.env.ACCESS_KEY)

        req.user = await User.findById(decoded._id)

        next()

    } catch (error) {
        res.status(401).json({message:"Invalid or expired token"})
    }
}

module.exports = auth