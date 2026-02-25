const mongoose= require("mongoose")
const ROLES = require("../constants/roles")

const UserSchema = new mongoose.Schema({
    username:{type:String , required:true},
    email:{type:String , required:true , lowercase:true , unique:true},
    password:{type:String , required:true},
    role:{type:String, enum:[ROLES.ADMIN , ROLES.USER] , default:ROLES.USER}
},{
    versionKey:false,
    timestamps:true
})

module.exports = mongoose.model("User" , UserSchema)