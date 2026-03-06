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

// ==================== FORGOT PASSWORD - FINAL WORKING VERSION ====================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    console.log("📨 Forgot password request for:", email);

    // IMMEDIATE RESPONSE
    res.status(200).json({ 
      success: true,
      message: "Password reset link bheja ja raha hai. 2 minute mein email check karo." 
    });

    // BACKGROUND PROCESS
    setTimeout(async () => {
      try {
        // User find
        const user = await User.findOne({ email });
        if (!user) {
          console.log("❌ User not found:", email);
          return;
        }

        // Token generate
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto
          .createHash('sha256')
          .update(resetToken)
          .digest('hex');

        user.resetToken = hashedToken;
        user.resetTokenExpire = Date.now() + 15 * 60 * 1000;
        await user.save();

        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        // ⭐⭐⭐ RENDER KE LIYE SPECIAL TRANSPORTER ⭐⭐⭐
        console.log("📧 Creating transporter for Render...");
        
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          },
          // Render ke liye extra options
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          pool: true,
          maxConnections: 1,
          maxMessages: 5,
          rateDelta: 20000,
          rateLimit: 5,
          connectionTimeout: 60000, // 60 seconds
          greetingTimeout: 30000,
          socketTimeout: 60000,
          tls: {
            rejectUnauthorized: false,
            ciphers: 'SSLv3'
          }
        });

        // Email content
        const mailOptions = {
          from: `"JuiceShop" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: "🔐 Password Reset Link - JuiceShop",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f97316; border-radius: 10px;">
              <div style="background: white; padding: 30px; border-radius: 10px;">
                <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
                <p>Hi <strong>${user.username}</strong>,</p>
                <p>Click the button below to reset your password:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetLink}" style="background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
                </div>
                <p><strong>⏰ This link will expire in 15 minutes.</strong></p>
                <hr>
                <p style="color: #666;">If you didn't request this, please ignore this email.</p>
              </div>
            </div>
          `
        };

        console.log("📧 Attempting to send email to:", email);
        const info = await transporter.sendMail(mailOptions);
        console.log("✅✅✅ EMAIL SENT SUCCESSFULLY TO:", email, info.response);

      } catch (err) {
        console.error("❌❌❌ BACKGROUND EMAIL ERROR:");
        console.error("Error code:", err.code);
        console.error("Error message:", err.message);
        console.error("Full error:", err);
        
        // Extra debugging
        if (err.code === 'ETIMEDOUT') {
          console.log("⚠️ Render server Gmail se connect nahi ho pa raha. Alternative email service try karo.");
        }
      }
    }, 500); // 500ms delay

  } catch (err) {
    console.error("❌ Forgot password error:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Error sending reset email" });
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

    res.json({ message: "Password reset successful! You can now login." });

  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router