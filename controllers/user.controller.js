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

// ==================== CREATE REUSABLE TRANSPORTER WITH CONNECTION POOL ====================
// This is created once and reused for all emails - MUCH FASTER
let transporter;

const createTransporter = () => {
  if (transporter) return transporter; // Reuse existing transporter
  
  console.log("📧 Creating new email transporter...");
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS // Your 16-char Gmail App Password
    },
    pool: true, // Enable connection pooling
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 20000,
    rateLimit: 5,
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000
  });
  
  return transporter;
};

// ==================== HEALTH CHECK (for keep-alive) ====================
router.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    time: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

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

// ==================== FORGOT PASSWORD - INSTANT RESPONSE ====================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    // Don't wait for user lookup - respond immediately even if user not found
    // This is for security (prevents email enumeration)
    
    // Generate reset token (do this in background)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Find user and update in background
    User.findOne({ email }).then(async (user) => {
      if (!user) {
        console.log(`❌ Forgot password attempt for non-existent email: ${email}`);
        return; // Silently fail for security
      }

      // Save token to user
      user.resetToken = hashedToken;
      user.resetTokenExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
      await user.save();

      const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

      // Create email content
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
                <p style="color: #666; line-height: 1.6;">We received a request to reset your password. Click the button below to create a new password:</p>
                
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
                
                <p style="color: #999; font-size: 13px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                  If the button doesn't work, copy and paste this link into your browser:<br>
                  <span style="color: #f97316; word-break: break-all;">${resetLink}</span>
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f8f8f8; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                <p style="color: #999; margin: 0; font-size: 12px;">
                  © 2024 JuiceShop. All rights reserved.<br>
                  Fresh juices, made just for you.
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      // Send email in background (don't await)
      const transporter = createTransporter();
      transporter.sendMail(mailOptions)
        .then(info => console.log(`✅ Password reset email sent to ${user.email}:`, info.response))
        .catch(err => console.error(`❌ Failed to send email to ${user.email}:`, err.message));

    }).catch(err => {
      console.error("❌ Error in background email processing:", err);
    });

    // ⭐ RESPOND IMMEDIATELY - Don't make user wait
    res.status(200).json({ 
      success: true,
      message: "If an account exists with this email, you will receive a reset link within a few minutes. Please check your inbox and spam folder." 
    });

  } catch (err) {
    console.error("❌ Forgot password error:", err);
    res.status(500).json({ 
      success: false,
      message: "Something went wrong. Please try again." 
    });
  }
});

// ==================== RESET PASSWORD ====================
router.post("/reset-password/:token", async(req, res) => {
  try {
    const { password } = req.body;
    const resetToken = req.params.token;

    // Validate password
    if (!password || password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: "Password must be at least 6 characters long" 
      });
    }

    // Hash the token from URL to compare with database
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid or expired token. Please request a new password reset." 
      });
    }

    // Hash new password
    const saltRounds = Number(process.env.SALTROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update user
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpire = null;
    await user.save();

    // Send confirmation email in background (optional)
    const transporter = createTransporter();
    transporter.sendMail({
      from: `"JuiceShop" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "✅ Password Reset Successful - JuiceShop",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #22c55e;">Password Reset Successful!</h2>
          <p>Hi <strong>${user.username}</strong>,</p>
          <p>Your password has been successfully reset. You can now login with your new password.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/login" style="background-color: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Login Now</a>
          </div>
          <p style="color: #666; font-size: 12px;">If you didn't make this change, please contact support immediately.</p>
        </div>
      `
    }).catch(err => console.error("Failed to send confirmation email:", err));

    res.json({ 
      success: true,
      message: "Password reset successful! You can now login with your new password." 
    });

  } catch (err) {
    console.error("❌ Reset password error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

module.exports = router