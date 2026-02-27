require("dotenv").config()
const express = require("express")
const helmet = require("helmet")
const cors = require("cors")
const connectDB = require("./config/db")
const userController = require("./controllers/user.controller.js")
const juiceController = require("./controllers/juice.controller.js")
const cartController = require("./controllers/cart.controller.js")
const orderController = require("./controllers/order.controller.js")
const reviewController = require("./controllers/review.controller.js")
const wishlistController = require("./controllers/wishlist.controller.js")
const adminController = require("./controllers/admin.controller.js")
const auth = require("./middlewares/auth.middleware.js")
const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(helmet())
app.use(cors())


// routes
app.use("/user" ,userController)
app.use("/juice" , juiceController)
app.use("/cart" , cartController)
app.use("/order" , orderController)
app.use("/review" , reviewController)
app.use("/wishlist" , wishlistController)
app.use("/admin" , adminController)


// privateData
app.get("/privateData" , auth , (req , res)=>{
    res.send("privateData!")
})
// health Route
app.get("/"  , (req , res)=>{
    res.status(200).json({message:"connected!"})
})


// Route not found!
app.use((req , res)=>{
       res.status(404).json({message:"Page not found!"})
})

const PORT  = process.env.PORT
app.listen(PORT , async()=>{
    await connectDB()
    console.log("server connected!")
})