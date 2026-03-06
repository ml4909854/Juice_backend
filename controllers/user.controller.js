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


let transporter;

const getTransporter = () => {
  if (transporter) return transporter;
  
  console.log("📧 Creating email transporter...");
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    pool: true,
    maxConnections: 5,
    rateDelta: 20000,
    rateLimit: 5,
    tls: { rejectUnauthorized: false }
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

// ==================== FORGOT PASSWORD - OPTIMIZED FOR VERCEL ====================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email is required" 
      });
    }

    console.log(`📨 Forgot password request for: ${email}`);

    // ⭐ RESPOND IMMEDIATELY - Don't wait for anything
    res.status(200).json({ 
      success: true,
      message: "If an account exists with this email, you will receive a reset link shortly." 
    });

    // ⭐ PROCESS EVERYTHING IN BACKGROUND (after response is sent)
    setTimeout(async () => {
      try {
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
          console.log(`❌ No user found with email: ${email}`);
          return;
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto
          .createHash('sha256')
          .update(resetToken)
          .digest('hex');

        // Save to database
        user.resetToken = hashedToken;
        user.resetTokenExpire = Date.now() + 15 * 60 * 1000;
        await user.save();

        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        // Send email
        const mailOptions = {
          from: `"JuiceShop" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: "🔐 Password Reset Request - JuiceShop",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px;">
              <div style="background: white; padding: 30px; border-radius: 10px;">
                <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
                <p>Hi <strong>${user.username}</strong>,</p>
                <p>Click the button below to reset your password:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
                </div>
                <p style="color: #666; font-size: 14px;">This link will expire in 15 minutes.</p>
                <hr>
                <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
              </div>
            </div>
          `
        };

        const transporter = getTransporter();
        await transporter.sendMail(mailOptions);
        console.log(`✅ Password reset email sent to: ${email}`);

      } catch (error) {
        console.error(`❌ Background email error for ${email}:`, error.message);
      }
    }, 100); // Small delay to ensure response is sent

  } catch (err) {
    console.error("❌ Forgot password error:", err);
    // If error occurs before response, send error
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false,
        message: "Something went wrong. Please try again." 
      });
    }
  }
});

// ==================== RESET PASSWORD ====================
router.post("/reset-password/:token", async(req, res) => {
  try {
    const { password } = req.body;
    const resetToken = req.params.token;

    if (!password || password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: "Password must be at least 6 characters" 
      });
    }

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
        success: false,
        message: "Invalid or expired token" 
      });
    }

    const saltRounds = Number(process.env.SALTROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpire = null;
    await user.save();

    // Send confirmation in background
    setTimeout(async () => {
      try {
        const transporter = getTransporter();
        await transporter.sendMail({
          from: `"JuiceShop" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: "✅ Password Reset Successful",
          html: `<p>Your password has been reset successfully.</p>`
        });
      } catch (err) {
        console.error("Confirmation email failed:", err.message);
      }
    }, 100);

    res.json({ 
      success: true,
      message: "Password reset successful!" 
    });

  } catch (err) {
    console.error("❌ Reset password error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

module.exports = router;