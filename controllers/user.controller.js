require("dotenv").config()
const express = require("express")
const User = require("../models/user.model.js")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const auth = require("../middlewares/auth.middleware.js")
const blackList = require("../utils/blackList.js")
const crypto = require("crypto")
const nodemailer = require("nodemailer")
const router = express.Router()

// ==================== REGISTER ====================
router.post("/register" , async(req , res)=>{
    try {
        const UserData = req.body
        let user = await User.findOne({email:UserData.email})
        if(user){
            return res.status(400).json({message:"User already exits.Try different username"})
        }
        const SALTROUNDS = process.env.SALTROUNDS
        const hashPassword = await bcrypt.hash(UserData.password , Number(SALTROUNDS))
        
        user = new User({...UserData  , password:hashPassword})
        let savedUser = await user.save()
        res.status(201).json({message:`${UserData.username} registered successfully!` , user:savedUser})
    } catch (error) {
        res.status(500).json({message:"Registering error...." , error:error})
    }
})

// ==================== LOGIN ====================
router.post("/login" , async(req , res)=>{
    try {
        const {email , password} = req.body
        const user = await User.findOne({email:email})
        if(!user){
            return res.status(404).json({message:"User not found! Register first"})
        }
        
        const comparePassword = await bcrypt.compare(password , user.password)
        if(!comparePassword){
            return res.status(400).json({message:"password wrong!"})
        }
        const ACCESS_KEY = process.env.ACCESS_KEY 
        const token = jwt.sign({ _id:user._id} , ACCESS_KEY , {expiresIn:"1d"})
        
        res.status(200).json({
            message: `${user.username} logged successfully !`,
            token,
            userId: user._id,
            user: {
                username: user.username,
                email: user.email,
                role: user.role
            }
        })

    } catch (error) {
        res.status(500).json({message:"logging error...." , error:error})
    }
})

// ==================== LOGOUT ====================
router.post("/logout", auth , async(req,res)=>{
    const token = req.headers.authorization.split(" ")[1]
    blackList.add(token)
    res.json({message:"Logged out successfully"})
})

// ==================== FORGOT PASSWORD - FIXED VERSION ====================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    console.log("📨 Forgot password request for:", email);

    // ⭐ IMMEDIATE RESPONSE - User ko turant reply do
    res.status(200).json({ 
      success: true,
      message: "If an account exists with this email, you will receive a reset link shortly." 
    });

    // ⭐ BACKGROUND ME EMAIL SEND KARO
    setTimeout(async () => {
      try {
        // User find karo
        const user = await User.findOne({ email });
        if (!user) {
          console.log("❌ User not found in database:", email);
          return;
        }

        console.log("✅ User found:", user.username);

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto
          .createHash('sha256')
          .update(resetToken)
          .digest('hex');

        // Save token to database
        user.resetToken = hashedToken;
        user.resetTokenExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
        await user.save();

        console.log("✅ Token saved for:", email);

        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        // ⭐⭐⭐ FIXED TRANSPORTER FOR RENDER ⭐⭐⭐
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          },
          // Render ke liye special settings
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          pool: true,
          maxConnections: 1,
          connectionTimeout: 30000,
          greetingTimeout: 30000,
          socketTimeout: 30000,
          tls: {
            rejectUnauthorized: false,
            ciphers: 'SSLv3'
          }
        });

        // Email content
        const mailOptions = {
          from: `"JuiceShop" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: "🔐 Password Reset Request - JuiceShop",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
              <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #f97316, #fb923c); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">🍹 JuiceShop</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0;">Fresh juices delivered in 30 minutes</p>
                </div>
                
                <!-- Content -->
                <div style="padding: 40px 30px;">
                  <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
                  <p style="color: #666; line-height: 1.6;">Hi <strong style="color: #f97316;">${user.username}</strong>,</p>
                  <p style="color: #666; line-height: 1.6;">Click the button below to reset your password:</p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #f97316, #fb923c); color: white; padding: 14px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 5px 15px rgba(249, 115, 22, 0.3);">Reset Password</a>
                  </div>
                  
                  <div style="background-color: #fff3e0; padding: 15px; border-radius: 10px; margin: 20px 0;">
                    <p style="margin: 0; color: #f97316; font-size: 14px;">
                      <strong>⏰ This link will expire in 15 minutes</strong>
                    </p>
                    <p style="margin: 5px 0 0; color: #666; font-size: 13px;">
                      If you didn't request this, please ignore this email.
                    </p>
                  </div>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f8f8f8; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                  <p style="color: #999; margin: 0; font-size: 12px;">
                    © 2024 JuiceShop. All rights reserved.
                  </p>
                </div>
              </div>
            </body>
            </html>
          `
        };

        // Email send karo
        console.log("📧 Attempting to send email to:", email);
        const info = await transporter.sendMail(mailOptions);
        console.log("✅✅✅ EMAIL SENT SUCCESSFULLY TO:", email, info.response);

      } catch (err) {
        console.error("❌❌❌ BACKGROUND EMAIL ERROR:");
        console.error("Error message:", err.message);
        console.error("Full error:", err);
      }
    }, 100); // 100ms delay

  } catch (err) {
    console.error("❌ Forgot password main error:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Error sending reset email", error: err.message });
    }
  }
});

// ==================== RESET PASSWORD ====================
router.post("/reset-password/:token", async(req, res) => {
  try {
    const { password } = req.body;
    const resetToken = req.params.token;

    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: "Invalid or expired token. Please request a new password reset." 
      });
    }

    const saltRounds = Number(process.env.SALTROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpire = null;
    await user.save();

    res.json({ message: "Password reset successful! You can now login with your new password." });

  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router