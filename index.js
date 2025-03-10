const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT | 5000;
require("dotenv").config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const cors = require("cors");
const { permission } = require("process");

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.n9or6wr.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const productInformationCollection = client.db("fashion-commerce").collection("all-product-information");
    const orderListCollection = client.db("fashion-commerce").collection("orderList");
    const customerListCollection = client.db("fashion-commerce").collection("customerList");
    const seasonCollection = client.db("fashion-commerce").collection("seasons");
    const categoryCollection = client.db("fashion-commerce").collection("category");
    const colorCollection = client.db("fashion-commerce").collection("colors");
    const vendorCollection = client.db("fashion-commerce").collection("vendors");
    const tagCollection = client.db("fashion-commerce").collection("tags");
    const promoCollection = client.db("fashion-commerce").collection("promo-code");
    const offerCollection = client.db("fashion-commerce").collection("offers");
    const shippingZoneCollection = client.db("fashion-commerce").collection("shipping-zone");
    const shipmentHandlerCollection = client.db("fashion-commerce").collection("shipment-handler");
    const paymentMethodCollection = client.db("fashion-commerce").collection("payment-methods");
    const locationCollection = client.db("fashion-commerce").collection("locations");
    const purchaseOrderCollection = client.db("fashion-commerce").collection("purchase-order");
    const transferOrderCollection = client.db("fashion-commerce").collection("transfer-order");
    const marketingBannerCollection = client.db("fashion-commerce").collection("marketing-banner");
    const loginRegisterSlideCollection = client.db("fashion-commerce").collection("login-register-slide");
    const heroBannerCollection = client.db("fashion-commerce").collection("hero-banner");
    const newsletterCollection = client.db("fashion-commerce").collection("news-letter");
    const enrollmentCollection = client.db("fashion-commerce").collection("enrollment-admin-staff");

    // Send Email with the Magic Link
    const transport = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT, // Use 587 for TLS
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Generate a 6-digit OTP as a string
    function generateOtp() {
      return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async function sendOtpEmail(email, otp, name) {
      try {
        await transport.sendMail({
          from: `"Fashion Commerce" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "OTP for Fashion Commerce Login",
          text: `Your One-Time Password  
  
          Dear ${name},  
  
          Here is your One-Time Password (OTP) to securely log in to your Fashion Commerce account:  
  
          ${otp}  
  
          Note: This OTP is valid for 5 minutes.  
  
          If you did not request this OTP, please ignore this email or contact our support team.  
  
          Thank you for choosing Fashion Commerce!  
  
          Best regards,  
          Team Fashion Commerce`,
          html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="text-align: center; color: #333;">🔑 <b>Your One-Time Password</b></h2>
          <p>Dear <b>${name}</b>,</p>
          <p>Here is your One-Time Password (OTP) to securely log in to your <b>Fashion Commerce</b> account:</p>
          <p style="text-align: center; font-size: 24px; font-weight: bold; color: #ff6600; margin: 20px 0;">${otp}</p>
          <p><b>Note:</b> This OTP is valid for <b>5 minutes</b>.</p>
          <p>If you did not request this OTP, please ignore this email or contact our support team.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="text-align: center; color: #555;">Thank you for choosing <b>Fashion Commerce</b>! 🛍️</p>
          <p style="text-align: center; font-size: 14px; color: #888;">Best regards,<br>Team Fashion Commerce</p>
        </div>
      `
        });
      } catch (emailError) {
        console.error("Error sending OTP email:", emailError);
        throw new Error("Error sending OTP email");
      }
    }

    // Define route to handle file upload to cloudinary
    app.post('/uploadFile', upload.single('attachment'), (req, res) => {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Determine file type for Cloudinary storage type
      const fileType = req.file.mimetype.split('/')[0];

      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: fileType === 'image' ? 'image' : 'raw' },
        (error, result) => {
          if (error) {
            console.error('Error uploading file to Cloudinary:', error);
            return res.status(500).json({ message: 'Cloudinary upload failed', error: error.message });
          }
          res.json({ fileUrl: result.secure_url });
        }
      );

      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    // Invite API (Super Admin creates an account)
    app.post("/invite", async (req, res) => {

      try {
        const { email, role, fullName, permissions } = req.body;

        if (!email || !role || !fullName || !permissions) {
          return res.status(400).json({ success: false, message: "All fields are required!" });
        }

        // Check if the email already exists
        const existingEntry = await enrollmentCollection.findOne({ email });

        if (existingEntry) {

          const isExpired = (!existingEntry.hashedToken && !existingEntry.expiresAt) || new Date(existingEntry.expiresAt) < new Date();

          // Check if the existing invitation is expired
          if (isExpired) {
            // If expired, allow re-invitation by generating a new token
            const token = crypto.randomBytes(32).toString("hex");
            const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
            const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // New expiry

            const magicLink = `${process.env.FRONTEND_URL}/auth/setup?token=${token}`;

            try {
              const mailResult = await transport.sendMail({
                from: `"Fashion Commerce" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: "You're Invited to Join Fashion Commerce",
                text: `Hello ${fullName},
    
                You have been invited to join Fashion Commerce as a ${role}. Please use the link below to complete your setup:
    
    
    
                🔗 Magic Link: ${magicLink}
    
    
    
                This link is valid for **72 hours** and will expire on **${new Date(Date.now() + 72 * 60 * 60 * 1000).toLocaleString('en-GB', {
                  timeZone: 'Asia/Dhaka',
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: 'numeric',
                  second: 'numeric',
                  hour12: true
                })}**.
    
                If you did not expect this invitation, you can safely ignore this email.
    
                Best Regards,  
                Fashion Commerce Team`,
                html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invitation - Fashion Commerce</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f7f7f7;
              }
              .container {
                width: 100%;
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                padding: 20px;
                border-radius: 10px;
                border: 1px solid #dcdcdc; /* Added border */
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
              }
              .header {
                text-align: center;
                padding-bottom: 20px;
                border-bottom: 1px solid #ddd;
              }
              .header h1 {
                margin: 0;
                color: #007bff;
              }
              .content {
                padding: 20px;
              }
              .content p {
                font-size: 16px;
                line-height: 1.6;
              }
              .cta-button {
                display: inline-block;
                font-size: 16px;
                font-weight: bold;
                color: #4B5563;
                background-color: #d4ffce; /* Updated button background */
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                margin-top: 20px;
                border: 1px solid #d4ffce; /* Button border */
              }
              .cta-button:hover {
                background-color: #a3f0a3; /* Hover effect */
                border: 1px solid #a3f0a3;
              }
              .footer {
                text-align: center;
                padding-top: 20px;
                font-size: 14px;
                color: #888;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Fashion Commerce!</h1>
              </div>
              <div class="content">
                <p>Hello <strong>${fullName}</strong>,</p>
                <p>You are invited to join <strong>Fashion Commerce</strong> as <strong>${role === "admin" ? "an Admin" : "a Staff member"}</strong>. To accept this invitation, create <strong>${role === "admin" ? "an Admin" : "a Staff"}</strong> account:</p>
                 <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                 <tr>
                  <td align="center">
                     <a href="${magicLink}" class="cta-button">Create account</a>
                  </td>
                 </tr>
                </table>
    
                <p>If you weren't expecting this invitation, you can ignore this email.</p>
                <p><strong>Note:</strong> This link will expire in <strong>72 hours</strong>.</p>
                
              </div>
              <div class="footer">
                <p>Best Regards, <br><strong>Fashion Commerce Team</strong></p>
              </div>
            </div>
            </body>
            </html>`
              });

              if (mailResult && mailResult.accepted && mailResult.accepted.length > 0) {
                // Update the existing document with new token and expiry
                await enrollmentCollection.updateOne(
                  { email },
                  { $set: { hashedToken, expiresAt } }
                );

                return res.status(200).json({
                  success: true,
                  message: "Invitation resent successfully!",
                  emailStatus: mailResult,
                });
              } else {
                return res.status(500).json({ success: false, message: "Failed to resend invitation email." });
              }
            } catch (emailError) {
              return res.status(500).json({
                success: false,
                message: "Failed to resend invitation email.",
                emailError: emailError.message,
              });
            }
          }
          else {
            return res.status(400).json({ error: "Email already invited and still valid." });
          }
        }

        const token = crypto.randomBytes(32).toString("hex"); // Generate secure random token
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex"); // Hash token

        // Set expiration time (72 hours)
        const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

        // Magic Link
        const magicLink = `${process.env.FRONTEND_URL}/auth/setup?token=${token}`;

        try {
          const mailResult = await transport.sendMail({
            from: `"Fashion Commerce" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "You're Invited to Join Fashion Commerce",
            text: `Hello ${fullName},

            You have been invited to join Fashion Commerce as a ${role}. Please use the link below to complete your setup:



            🔗 Magic Link: ${magicLink}



            This link is valid for **72 hours** and will expire on **${new Date(Date.now() + 72 * 60 * 60 * 1000).toLocaleString('en-GB', {
              timeZone: 'Asia/Dhaka',
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: 'numeric',
              minute: 'numeric',
              second: 'numeric',
              hour12: true
            })}**.

            If you did not expect this invitation, you can safely ignore this email.

            Best Regards,  
            Fashion Commerce Team`,
            html: `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation - Fashion Commerce</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f7f7f7;
          }
          .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 10px;
            border: 1px solid #dcdcdc; /* Added border */
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 1px solid #ddd;
          }
          .header h1 {
            margin: 0;
            color: #007bff;
          }
          .content {
            padding: 20px;
          }
          .content p {
            font-size: 16px;
            line-height: 1.6;
          }
          .cta-button {
            display: inline-block;
            font-size: 16px;
            font-weight: bold;
            color: #4B5563;
            background-color: #d4ffce; /* Updated button background */
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
            border: 1px solid #d4ffce; /* Button border */
          }
          .cta-button:hover {
            background-color: #a3f0a3; /* Hover effect */
            border: 1px solid #a3f0a3;
          }
          .footer {
            text-align: center;
            padding-top: 20px;
            font-size: 14px;
            color: #888;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Fashion Commerce!</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${fullName}</strong>,</p>
            <p>You are invited to join <strong>Fashion Commerce</strong> as <strong>${role === "admin" ? "an Admin" : "a Staff member"}</strong>. To accept this invitation, create <strong>${role === "admin" ? "an Admin" : "a Staff"}</strong> account:</p>
             <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
             <tr>
              <td align="center">
                 <a href="${magicLink}" class="cta-button">Create account</a>
              </td>
             </tr>
            </table>

            <p>If you weren't expecting this invitation, you can ignore this email.</p>
            <p><strong>Note:</strong> This link will expire in <strong>72 hours</strong>.</p>
            
          </div>
          <div class="footer">
            <p>Best Regards, <br><strong>Fashion Commerce Team</strong></p>
          </div>
        </div>
        </body>
        </html>`
          });

          // Check if email was sent successfully (you can use mailResult.accepted to confirm if the email was delivered)
          if (mailResult && mailResult.accepted && mailResult.accepted.length > 0) {
            // If email was sent successfully, insert data into MongoDB
            const result = await enrollmentCollection.insertOne({
              email,
              fullName,
              role,
              permissions,
              hashedToken,
              expiresAt,
            });

            return res.status(200).json({
              success: true,
              message: "Invitation sent successfully!",
              userData: result,
              emailStatus: mailResult,
            });
          } else {
            // If mailResult is not as expected, handle the failure case
            return res.status(500).json({
              success: false,
              message: "Failed to send invitation email.",
            });
          }

        } catch (emailError) {
          return res.status(500).json({
            success: false,
            message: "Failed to send invitation email.",
            emailError: emailError.message,
          });
        }

      }
      catch (error) {
        res.status(500).json({
          success: false,
          message: "Something went wrong!",
          error: error.message,
        });
      }
    });

    // checking token is valid or not
    app.post("/validate-token", async (req, res) => {

      const { token } = req.body; // Assuming the token comes in the body of the request.

      if (!token) {
        return res.status(400).json({ message: "Token is required. Please provide a valid token." });
      }

      try {

        // Hash the received raw token
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        // Check if the email exists in the database (optional, if you want extra verification)
        const enrollment = await enrollmentCollection.findOne({
          hashedToken,
        });

        if (!enrollment) {
          return res.status(400).json({ message: "We could not find your request. Please try again." });
        };

        // ✅ Check if the user has already set up their account
        if (enrollment.isSetupComplete) {
          return res.status(403).json({ message: "You have already set up your account." });
        }

        // Check if the token has expired
        if (new Date(enrollment.expiresAt) < new Date()) {
          // Token has expired, so remove the expired fields
          await enrollmentCollection.updateOne(
            { hashedToken },
            {
              $unset: { hashedToken: "", expiresAt: "" }, // Remove expired fields
            }
          );
          return res.status(400).json({ message: "This request has expired." });
        }

        // Get user email from the found record
        const { email } = enrollment;

        // Token is valid and not expired
        res.status(200).json({ message: "Access verified successfully.", email });

      } catch (error) {

        // Generic error message
        return res.status(500).json({ message: "Something went wrong. Please try again later.", error: error.message });

      }
    });

    app.get("/all-existing-users", async (req, res) => {
      try {
        // Retrieve only specific fields from the collection
        const users = await enrollmentCollection.find({}, { projection: { email: 1, fullName: 1, hashedToken: 1, expiresAt: 1, isSetupComplete: 1, role: 1, permissions: 1 } }).toArray();

        // Return the list of specific fields (email, fullName, hashedToken, expiresAt)
        res.status(200).json(users);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
      }
    });

    // after completed setup, put the information
    app.patch("/complete-setup/:email", async (req, res) => {
      try {
        const { email } = req.params; // Get email from URL parameter
        const { username, dob, password } = req.body; // Get username, dob, and password from request body

        // Validate if all required fields are provided
        if (!username || !dob || !password) {
          return res.status(400).json({ error: "Username, date of birth, and password are required." });
        }

        // Hash the password before storing it in the database
        const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

        // Check if the user with this email already exists
        const existingUser = await enrollmentCollection.findOne({ email });

        if (!existingUser) {
          return res.status(404).json({ error: "User not found." });
        }

        // Check if the username already exists in the database
        const usernameExists = await enrollmentCollection.findOne({ username });

        if (usernameExists) {
          return res.status(400).json({ error: "Username already exists." });
        }

        // Update the existing user's data with the new information
        const updatedUser = await enrollmentCollection.updateOne(
          { email },
          {
            $set: {
              username,
              dob,
              password: hashedPassword,
              isSetupComplete: true
            },
          }
        );

        if (updatedUser.modifiedCount === 0) {
          return res.status(500).json({ error: "Failed to update user information." });
        }

        // Send response after the user information is updated
        res.status(200).json({
          success: true,
          message: "Account setup completed successfully!",
        });

      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Something went wrong!",
          error: error.message,
        });
      }
    });

    // backend dashboard log in via nextAuth
    app.post("/loginForDashboard", async (req, res) => {
      const { emailOrUsername, password, otp } = req.body;

      try {
        // Find user by email OR username
        const user = await enrollmentCollection.findOne({
          $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
        });

        if (!user) {
          return res.status(401).json({ message: "No account found with this email or username." });
        }
        if (!user.password) {
          return res.status(403).json({ message: "Your account setup is incomplete. Please set up your password before logging in." });
        }

        // Verify the password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({ message: "Incorrect password. Please try again." });
        }

        // If OTP is not provided, generate OTP and send email.
        if (otp === "") {
          const generatedOtp = generateOtp(); // e.g., "123456"
          const otpExpiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes from now

          // Update the user document with otp and otpExpiresAt.
          // Use user._id directly (assuming it's already an ObjectId)
          await enrollmentCollection.updateOne(
            { _id: user._id },
            { $set: { otp: generatedOtp, otpExpiresAt: otpExpiresAt } }
          );

          try {
            // Send OTP email
            await sendOtpEmail(user.email, generatedOtp, user.fullName);
            return res.status(401).json({
              message: "OTP has been sent to your email. Please enter the OTP to complete login."
            });
          } catch (emailError) {
            console.error("Error sending OTP email:", emailError);
            return res.status(500).json({ message: "Error sending OTP email. Please try again later." });
          }
        } else {
          // OTP is provided; re-fetch the user document to ensure you have the latest OTP fields.
          const updatedUser = await enrollmentCollection.findOne({ _id: user._id });

          // Verify OTP fields exist
          if (!updatedUser.otp || !updatedUser.otpExpiresAt) {
            return res.status(400).json({ message: "OTP expired or not found. Please try logging in again." });
          }

          // Check if OTP is expired
          if (Date.now() > updatedUser.otpExpiresAt) {
            // Remove the expired OTP fields
            await enrollmentCollection.updateOne(
              { _id: user._id },
              { $unset: { otp: "", otpExpiresAt: "" } }
            );
            return res.status(400).json({ message: "OTP has expired. Please try logging in again." });
          }

          // Check if the provided OTP matches
          if (otp !== updatedUser.otp) {
            return res.status(400).json({ message: "Invalid OTP. Please try again." });
          }

          // OTP is valid—remove the OTP fields and return user data
          await enrollmentCollection.updateOne(
            { _id: user._id },
            { $unset: { otp: "", otpExpiresAt: "" } }
          );

          return res.json({
            _id: user._id.toString(),
            email: user.email,
            username: user.username,
            role: user.role,
            dob: user.dob,
            fullName: user.fullName
          });
        }
      } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: "Something went wrong. Please try again later." });
      }
    });

    // after completed setup, put the information
    app.post("/customer-signup", async (req, res) => {
      try {

        const { email, password, userInfo, cartItems, wishlistItems } = req.body; // Get username, dob, and password from request body

        // Validate if all required fields are provided
        if (!email || !password) {
          return res.status(400).json({ error: "Email, and password are required." });
        }

        // Hash the password before storing it in the database
        const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

        // Check if the user with this email already exists
        const existingUser = await customerListCollection.findOne({ email });

        if (existingUser) {
          return res.status(401).json({ error: "Account already exists!" });
        }

        const result = await customerListCollection.insertOne({
          email,
          password: hashedPassword,
          userInfo,
          cartItems,
          wishlistItems
        });

        // Send response after the user information is updated
        res.status(200).send(result);

      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Something went wrong!",
          error: error.message,
        });
      }
    });

    // frontend log in via nextAuth
    app.post("/customer-login", async (req, res) => {

      const { email, password } = req.body;

      try {
        // Find user by email OR username
        const user = await customerListCollection.findOne({ email });

        if (!user) {
          return res.status(404).json({ message: "No account found with this email." });
        };

        // Verify the password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({ message: "Incorrect password. Please try again." });
        }

        return res.json({
          email: user.email,
          userInfo: user.userInfo,
          cartItems: user.cartItems,
          wishlistItems: user.wishlistItems
        });

      } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: "Something went wrong. Please try again later." });
      }
    });

    // Change Password Endpoint
    app.put("/change-password", async (req, res) => {
      try {
        const { email, currentPassword, newPassword } = req.body;

        // Check if email is provided
        if (!email || !currentPassword || !newPassword) {
          return res.status(400).json({ message: "All fields are required" });
        }

        if (currentPassword === newPassword) return res.status(401).json({ message: "New Password should not matched with current password" });

        // Find user by email in the enrollmentCollection
        const user = await enrollmentCollection.findOne({ email });

        if (!user) return res.status(404).json({ message: "User not found" });

        if (!user.password) return res.status(403).json({ message: "Your account setup is incomplete. Please set up your password before logging in." });

        // Check if current password matches the stored hashed password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: "Your current password is incorrect. Please double-check and try again." });

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update the password in MongoDB
        const result = await enrollmentCollection.updateOne(
          { email },
          { $set: { password: hashedPassword } }
        );

        if (result.modifiedCount > 0) {
          return res.json({ success: true, message: "Password changed successfully." });
        } else {
          return res.status(400).json({ message: "No changes detected. Your password remains the same." });
        }
      } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({ message: "Something went wrong on our end. Please try again later." });
      }
    });

    // post a product
    app.post("/addProduct", async (req, res) => {
      try {
        const productData = req.body;
        const result = await productInformationCollection.insertOne(productData);
        res.send(result);
      } catch (error) {
        console.error("Error adding product:", error);
        res.status(500).send({ message: "Failed to add product", error: error.message });
      }
    });

    // get all products
    app.get("/allProducts", async (req, res) => {
      try {
        const result = await productInformationCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send({ message: "Failed to fetch products", error: error.message });
      }
    });

    app.get("/allSpecificProducts", async (req, res) => {
      try {
        // Define the projection to include only the specified fields
        const projection = {
          productTitle: 1,
          restOfOutfit: 1,
          sizeGuideImageUrl: 1,
          productVariants: 1,
          salesThisMonth: 1,
          status: 1,
          productId: 1,
          category: 1,
          regularPrice: 1,
          discountValue: 1,
          batchCode: 1,
          weight: 1,
          productDetails: 1,
          availableColors: 1,
          newArrival: 1,
          materialCare: 1,
          sizeFit: 1,
          groupOfSizes: 1,
          allSizes: 1,
          discountType: 1,
          publishDate: 1
        };

        // Fetch all products with the specified fields
        const result = await productInformationCollection
          .find({}, { projection }) // Apply projection here
          .toArray();

        res.send(result);
      } catch (error) {
        console.error("Error fetching product details:", error);
        res.status(500).send({ message: "Failed to fetch product details", error: error.message });
      }
    });

    // Get all unique sizes
    app.get("/allSizes", async (req, res) => {
      try {
        // Fetch all products
        const products = await productInformationCollection.find().toArray();

        // Extract all sizes from the products
        const allSizes = products.flatMap(product => product.allSizes || []);

        // Create a unique set of sizes
        const uniqueSizes = [...new Set(allSizes)];

        // Respond with both arrays
        res.send(uniqueSizes);
      } catch (error) {
        console.error("Error fetching sizes:", error);
        res.status(500).send({ message: "Failed to fetch sizes", error: error.message });
      }
    });

    // Get all unique color names
    app.get("/allUniqueColors", async (req, res) => {
      try {
        // Fetch all products
        const products = await productInformationCollection.find().toArray();

        // Extract all color names from the availableColors array
        const allColors = products.flatMap(product =>
          product.availableColors?.map(color => color.value) || []
        );

        // Create a unique set of color names
        const uniqueColors = [...new Set(allColors)];

        // Respond with the unique color names
        res.send(uniqueColors);
      } catch (error) {
        console.error("Error fetching colors:", error);
        res.status(500).send({ message: "Failed to fetch colors", error: error.message });
      }
    });

    // get single product info
    app.get("/singleProduct/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await productInformationCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Product not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching Product Details:", error);
        res.status(500).send({ message: "Failed to fetch Product Details", error: error.message });
      }
    });

    // get single product info
    app.get("/productFromCategory/:categoryName", async (req, res) => {
      try {
        const categoryName = req.params.categoryName;
        const query = { category: categoryName };
        const result = await productInformationCollection.find(query).toArray();

        if (!result) {
          return res.status(404).send({ message: "Product not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching Product Details:", error);
        res.status(500).send({ message: "Failed to fetch Product Details", error: error.message });
      }
    });

    //update a single product details
    app.put("/editProductDetails/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const productDetails = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateProductDetails = {
          $set: { ...productDetails }
        };

        const result = await productInformationCollection.updateOne(filter, updateProductDetails);
        res.send(result);
      } catch (error) {
        console.error("Error updating product details:", error);
        res.status(500).send({ message: "Failed to update product details", error: error.message });
      }
    });

    app.put("/editProductDetailsInventory/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { _id, ...productDetails } = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateProductDetails = {
          $set: { ...productDetails }
        };

        const result = await productInformationCollection.updateOne(filter, updateProductDetails);
        res.send(result);
      } catch (error) {
        console.error("Error updating product details:", error);
        res.status(500).send({ message: "Failed to update product details", error: error.message });
      }
    });

    // post vendors
    app.post("/addVendor", async (req, res) => {
      try {
        const vendors = req.body; // Should be an array
        const result = await vendorCollection.insertOne(vendors);
        res.send(result); // Send 201 status on success
      } catch (error) {
        console.error('Error adding vendors:', error);
        res.status(500).send({ error: 'Failed to add vendors' }); // Send 500 status on error
      }
    });

    // delete single vendor
    app.delete("/deleteVendor/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await vendorCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Vendor not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting vendor:", error);
        res.status(500).send({ message: "Failed to delete vendor", error: error.message });
      }
    });

    // get all vendors
    app.get("/allVendors", async (req, res) => {
      try {
        const result = await vendorCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching vendors:", error);
        res.status(500).send({ message: "Failed to fetch vendors", error: error.message });
      }
    });

    // get single vendor info
    app.get("/getSingleVendorDetails/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await vendorCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Vendor not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching Vendor:", error);
        res.status(500).send({ message: "Failed to fetch Vendor", error: error.message });
      }
    });

    //update a single vendor info
    app.put("/editVendor/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const vendorData = req.body;
        const filter = { _id: new ObjectId(id) };
        const updatedVendorDetails = {
          $set: { ...vendorData }
        };

        const result = await vendorCollection.updateOne(filter, updatedVendorDetails);

        res.send(result);
      } catch (error) {
        console.error("Error updating this vendor:", error);
        res.status(500).send({ message: "Failed to update this vendor", error: error.message });
      }
    });

    // post tags
    app.post("/addTag", async (req, res) => {
      try {
        const tags = req.body; // Should be an array
        if (!Array.isArray(tags)) {
          return res.status(400).send({ error: 'Expected an array of tags' });
        }
        const result = await tagCollection.insertMany(tags);
        res.status(201).send(result); // Send 201 status on success
      } catch (error) {
        console.error('Error adding tags:', error);
        res.status(500).send({ error: 'Failed to add tags' }); // Send 500 status on error
      }
    });

    // delete single tag
    app.delete("/deleteTag/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await tagCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Tag not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting tag:", error);
        res.status(500).send({ message: "Failed to delete tag", error: error.message });
      }
    });

    // get all tags
    app.get("/allTags", async (req, res) => {
      try {
        const result = await tagCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching tags:", error);
        res.status(500).send({ message: "Failed to fetch tags", error: error.message });
      }
    });

    // post colors
    app.post("/addColor", async (req, res) => {
      try {
        const colors = req.body; // Should be an array
        if (!Array.isArray(colors)) {
          return res.status(400).send({ error: 'Expected an array of colors' });
        }
        const result = await colorCollection.insertMany(colors);
        res.status(201).send(result); // Send 201 status on success
      } catch (error) {
        console.error('Error adding colors:', error);
        res.status(500).send({ error: 'Failed to add colors' }); // Send 500 status on error
      }
    });

    // delete single color
    app.delete("/deleteColor/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await colorCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Color not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting color:", error);
        res.status(500).send({ message: "Failed to delete color", error: error.message });
      }
    });

    // get all colors
    app.get("/allColors", async (req, res) => {
      try {
        const result = await colorCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching colors:", error);
        res.status(500).send({ message: "Failed to fetch colors", error: error.message });
      }
    });

    // Add a season
    app.post('/addSeason', async (req, res) => {
      const seasonData = req.body;
      try {
        const result = await seasonCollection.insertOne(seasonData);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error adding season:", error);
        res.status(500).send({ message: "Failed to add season", error: error.message });
      }
    });

    // Get All Seasons
    app.get('/allSeasons', async (req, res) => {
      try {
        const seasons = await seasonCollection.find().toArray();
        res.status(200).send(seasons);
      } catch (error) {
        res.status(500).send(error.message);
      }
    });

    // get single season info
    app.get("/allSeasons/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await seasonCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Season not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching season:", error);
        res.status(500).send({ message: "Failed to fetch season", error: error.message });
      }
    });

    // delete single season
    app.delete("/deleteSeason/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await seasonCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Season not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting season:", error);
        res.status(500).send({ message: "Failed to delete season", error: error.message });
      }
    });

    //update a single season
    app.put("/editSeason/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const season = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateSeason = {
          $set: { ...season }
        };

        const result = await seasonCollection.updateOne(filter, updateSeason);

        res.send(result);
      } catch (error) {
        console.error("Error updating season:", error);
        res.status(500).send({ message: "Failed to update season", error: error.message });
      }
    });

    // get product info via season name
    app.get("/productFromSeason/:seasonName", async (req, res) => {
      try {
        const seasonName = req.params.seasonName;
        const query = { season: seasonName };
        const result = await productInformationCollection.find(query).toArray();

        if (!result) {
          return res.status(404).send({ message: "Product not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching Product Details:", error);
        res.status(500).send({ message: "Failed to fetch Product Details", error: error.message });
      }
    });

    // Add a Category
    app.post('/addCategory', async (req, res) => {
      const categoryData = req.body;
      try {
        const result = await categoryCollection.insertOne(categoryData);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error adding category:", error);
        res.status(500).send({ message: "Failed to add category", error: error.message });
      }
    });

    // Get All Categories
    app.get('/allCategories', async (req, res) => {
      try {
        const categories = await categoryCollection.find().toArray();
        res.status(200).send(categories);
      } catch (error) {
        res.status(500).send(error.message);
      }
    });

    // get single category info
    app.get("/allCategories/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await categoryCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Category not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching category:", error);
        res.status(500).send({ message: "Failed to fetch category", error: error.message });
      }
    });

    // delete single category
    app.delete("/deleteCategory/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await categoryCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Category not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).send({ message: "Failed to delete category", error: error.message });
      }
    });

    //update a single category
    app.put("/editCategory/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const category = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateCategory = {
          $set: { ...category }
        };

        const result = await categoryCollection.updateOne(filter, updateCategory);

        res.send(result);
      } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).send({ message: "Failed to update category", error: error.message });
      }
    });

    app.patch("/updateFeaturedCategories", async (req, res) => {
      const categoriesToUpdate = req.body; // Array of category objects with label and isFeatured fields
      let modifiedCount = 0;

      try {
        // Loop through each category and update its isFeatured status
        for (const category of categoriesToUpdate) {
          const result = await categoryCollection.updateOne(
            { label: category.label }, // Find category by label
            { $set: { isFeatured: category.isFeatured } } // Set the isFeatured field
          );

          // Increment the modifiedCount if a document was modified
          if (result.modifiedCount > 0) {
            modifiedCount += result.modifiedCount;
          }
        }

        console.log(modifiedCount);


        // Respond with the modifiedCount
        res.status(200).send({ modifiedCount });
      } catch (error) {
        console.error("Error updating featured category:", error);
        res.status(500).send({ message: "Failed to update featured categories", error: error.message });
      }
    });

    // Get All Sizes
    app.get('/allSizeRanges', async (req, res) => {
      try {
        const categories = await categoryCollection.find().toArray();
        const sizeOptions = categories.reduce((acc, category) => {
          acc[category.key] = category.sizes || []; // Ensure sizes exist
          return acc;
        }, {});
        res.status(200).send(sizeOptions);
      } catch (error) {
        res.status(500).send(error.message);
      }
    });

    // Get All Sub-Categories
    app.get('/allSubCategories', async (req, res) => {
      try {
        const categories = await categoryCollection.find().toArray();
        const subCategoryOptions = categories.reduce((acc, category) => {
          acc[category.key] = category.subCategories || [];  // Ensure subCategories exist
          return acc;
        }, {});
        res.status(200).send(subCategoryOptions);
      } catch (error) {
        res.status(500).send(error.message);
      }
    });

    // post a order
    app.post("/addOrder", async (req, res) => {
      try {
        const orderData = req.body;
        const result = await orderListCollection.insertOne(orderData);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error adding order:", error);
        res.status(500).send({ message: "Failed to add order", error: error.message });
      }
    });

    // Get All Orders
    app.get('/allOrders', async (req, res) => {
      try {
        // Sort by a field in descending order (e.g., by '_id' or 'dateTime' if you have a date field)
        const orders = await orderListCollection.find().sort({ _id: -1 }).toArray();
        res.status(200).send(orders);
      } catch (error) {
        res.status(500).send(error.message);
      }
    });

    // applying pagination in orderList
    app.get("/orderList", async (req, res) => {
      try {
        const pageStr = req.query?.page;
        const itemsPerPageStr = req.query?.itemsPerPage;
        const pageNumber = parseInt(pageStr) || 0;
        const itemsPerPage = parseInt(itemsPerPageStr) || 25; // Default to 25 if not provided
        const skip = pageNumber * itemsPerPage;

        // Fetching the total number of orders
        const totalOrderList = await orderListCollection.estimatedDocumentCount();

        // Fetching the reversed data for the specific page
        const result = await orderListCollection.find()
          .sort({ _id: -1 })
          .skip(skip)
          .limit(itemsPerPage)
          .toArray();

        // Sending the result and total count to the frontend
        res.send({ result, totalOrderList });
      } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).send({ message: "Failed to fetch orders", error: error.message });
      }
    });

    app.put("/addReturnSkuToProduct", async (req, res) => {
      const returnDataToSend = req.body;

      // Validate input
      if (!Array.isArray(returnDataToSend) || returnDataToSend.length === 0) {
        return res.status(400).json({ error: "Invalid or empty return data" });
      }

      try {
        // Fetch the primary location
        const primaryLocation = await locationCollection.findOne({ isPrimaryLocation: true });
        if (!primaryLocation) {
          return res.status(400).json({ error: "Primary location not found" });
        }

        const { locationName } = primaryLocation;
        const updateResults = [];

        for (const productDetails of returnDataToSend) {
          const { productId, sku, size, color } = productDetails;

          if (!productId || !sku || !size || !color) {
            updateResults.push({ productId, error: "Missing details in return data" });
            continue;
          }

          // Find the product in the database
          const product = await productInformationCollection.findOne({ productId });
          if (!product) {
            updateResults.push({ productId, error: "Product not found" });
            continue;
          }

          // Find the matching variant in productVariants
          const matchingVariant = product?.productVariants?.find(
            (variant) =>
              variant.size === size &&
              variant.color._id === color._id &&
              variant.location === locationName
          );

          if (!matchingVariant) {
            updateResults.push({ productId, error: "Matching product variant not found" });
            continue;
          }

          // If returnSku exists, increment it; otherwise, initialize it
          const updateResult = await productInformationCollection.updateOne(
            {
              productId,
              productVariants: {
                $elemMatch: {
                  size: size,
                  color: color,
                  location: locationName, // Ensure this matches exactly
                }
              }
            },
            {
              $inc: { "productVariants.$.returnSku": sku }  // This will now correctly increment `returnSku`
            }
          );

          if (updateResult.modifiedCount === 0) {
            updateResults.push({ productId, error: "Failed to update returnSku" });
          } else {
            updateResults.push({
              productId,
              updatedVariant: {
                size,
                color,
                location: locationName,
                returnSku: (matchingVariant.returnSku || 0) + sku,
              },
            });
          }
        }

        return res.status(200).json({ message: "Return SKU update completed", results: updateResults });

      } catch (error) {
        console.error("Error updating return SKU:", error.message);
        return res.status(500).json({ error: "Internal server error" });
      }
    });

    app.put("/decreaseSkuFromProduct", async (req, res) => {

      const productDetailsArray = req.body;

      // Validate the input array
      if (!Array.isArray(productDetailsArray) || productDetailsArray.length === 0) {
        return res.status(400).json({ error: "No product details provided or invalid format" });
      }

      try {

        const primaryLocation = await locationCollection.findOne({ isPrimaryLocation: true });
        if (!primaryLocation) {
          return res.status(400).json({ error: "Primary location not found" });
        }

        const { locationName } = primaryLocation;

        const updateResults = [];
        for (const productDetails of productDetailsArray) {

          const { productId, sku, size, color } = productDetails;

          if (!productId || !sku || !size || !color) {
            return res.status(400).json({ error: "Missing details in request body" });
          };

          // Step 3: Find the product and match variants
          const product = await productInformationCollection.findOne({ productId });
          if (!product) {
            updateResults.push({ productId, error: "Product not found" });
            continue;
          }

          const matchingVariant = product?.productVariants?.find(
            (variant) =>
              variant.size === size &&
              variant.color._id === color._id &&
              variant.location === locationName
          );

          if (!matchingVariant) {
            updateResults.push({ productId, error: "Matching product variant not found" });
            continue;
          }

          // Step 4: Check if SKU can be subtracted
          if (matchingVariant.sku < sku) {
            updateResults.push({ productId, error: "SKU to subtract exceeds current SKU" });
            continue;
          }

          // Step 5: Subtract SKU and update the product
          matchingVariant.sku -= sku;

          const updateResult = await productInformationCollection.updateOne(
            {
              productId,
              productVariants: {
                $elemMatch: {
                  size: size,
                  color: color,
                  location: locationName,
                  sku: { $gte: sku }, // Ensure enough SKU to subtract
                },
              },
            },
            {
              $inc: { "productVariants.$.sku": -sku }, // Decrement the SKU
            }
          );


          if (updateResult.modifiedCount === 0) {
            updateResults.push({ productId, error: "Failed to update SKU" });
          } else {
            updateResults.push({
              productId,
              updatedVariant: { size, color, location: locationName, sku: matchingVariant.sku },
            });
          }
        }

        // Return response with results of all products
        return res.status(200).json({ message: "SKU update process completed", results: updateResults });

      } catch (error) {
        console.error("Error updating SKU:", error.message);
        return res.status(500).json({ error: "Internal server error" });
      }


    })

    app.put("/decreaseOnHandSkuFromProduct", async (req, res) => {

      const productDetailsArray = req.body;

      // Validate the input array
      if (!Array.isArray(productDetailsArray) || productDetailsArray.length === 0) {
        return res.status(400).json({ error: "No product details provided or invalid format" });
      }

      try {

        const primaryLocation = await locationCollection.findOne({ isPrimaryLocation: true });
        if (!primaryLocation) {
          return res.status(400).json({ error: "Primary location not found" });
        }

        const { locationName } = primaryLocation;

        const updateResults = [];
        for (const productDetails of productDetailsArray) {

          const { productId, sku, size, color, onHandSku } = productDetails;

          if (!productId || !sku || !size || !color || !onHandSku) {
            return res.status(400).json({ error: "Missing details in request body" });
          };

          // Step 3: Find the product and match variants
          const product = await productInformationCollection.findOne({ productId });
          if (!product) {
            updateResults.push({ productId, error: "Product not found" });
            continue;
          }

          const matchingVariant = product?.productVariants?.find(
            (variant) =>
              variant.size === size &&
              variant.color._id === color._id &&
              variant.location === locationName
          );

          if (!matchingVariant) {
            updateResults.push({ productId, error: "Matching product variant not found" });
            continue;
          }

          // Step 4: Check if SKU can be subtracted
          if (matchingVariant.onHandSku < onHandSku) {
            updateResults.push({ productId, error: "SKU to subtract exceeds current SKU" });
            continue;
          }

          // Step 5: Subtract SKU and update the product
          matchingVariant.onHandSku -= onHandSku;

          const updateResult = await productInformationCollection.updateOne(
            {
              productId,
              productVariants: {
                $elemMatch: {
                  size: size,
                  color: color,
                  location: locationName,
                  onHandSku: { $gte: onHandSku }, // Ensure enough SKU to subtract
                },
              },
            },
            {
              $inc: { "productVariants.$.onHandSku": -onHandSku }, // Decrement the SKU
            }
          );


          if (updateResult.modifiedCount === 0) {
            updateResults.push({ productId, error: "Failed to update SKU" });
          } else {
            updateResults.push({
              productId,
              updatedVariant: { size, color, location: locationName, onHandSku: matchingVariant.onHandSku },
            });
          }
        }

        // Return response with results of all products
        return res.status(200).json({ message: "SKU update process completed", results: updateResults });

      } catch (error) {
        console.error("Error updating SKU:", error.message);
        return res.status(500).json({ error: "Internal server error" });
      }

    });

    const decrementReturnSkuInProduct = async (returnDataToSend) => {
      const updateResults = [];

      for (const productDetails of returnDataToSend) {
        const { productId, sku, size, color } = productDetails;

        if (!productId || !sku || !size || !color) {
          updateResults.push({ productId, error: "Missing details in returnDataToSend" });
          continue;
        }

        const primaryLocation = await locationCollection.findOne({ isPrimaryLocation: true });
        if (!primaryLocation) {
          return { error: "Primary location not found" };
        }

        const { locationName } = primaryLocation;

        const updateResult = await productInformationCollection.updateOne(
          {
            productId,
            productVariants: {
              $elemMatch: {
                size: size,
                color: color,
                location: locationName,
                returnSku: { $gte: sku }, // Ensure enough returnSku to subtract
              },
            },
          },
          {
            $inc: { "productVariants.$.returnSku": -sku }, // Decrement the SKU
          }
        );

        if (updateResult.modifiedCount === 0) {
          updateResults.push({ productId, error: "Failed to decrement SKU. Either no match found or not enough returnSku." });
        } else {
          updateResults.push({
            productId,
            updatedVariant: { size, color, location: locationName, returnSku: `-${sku}` },
          });
        }
      }

      return updateResults;
    };

    const incrementSkuInProduct = async (dataToSend) => {
      const updateResults = [];

      for (const productDetails of dataToSend) {
        const { productId, sku, size, color } = productDetails;

        if (!productId || !sku || !size || !color) {
          updateResults.push({ productId, error: "Missing details in dataToSend" });
          continue;
        }

        const primaryLocation = await locationCollection.findOne({ isPrimaryLocation: true });
        if (!primaryLocation) {
          return { error: "Primary location not found" };
        }

        const { locationName } = primaryLocation;

        const updateResult = await productInformationCollection.updateOne(
          {
            productId,
            productVariants: {
              $elemMatch: {
                size: size,
                color: color,
                location: locationName,
              },
            },
          },
          {
            $inc: { "productVariants.$.sku": sku }, // Increment the SKU
          }
        );

        if (updateResult.modifiedCount === 0) {
          updateResults.push({ productId, error: "Failed to increment SKU" });
        } else {
          updateResults.push({
            productId,
            updatedVariant: { size, color, location: locationName, sku: `+${sku}` },
          });
        }
      }

      return updateResults;
    };

    const incrementOnHandSkuInProduct = async (dataToSend) => {
      const updateResults = [];

      for (const productDetails of dataToSend) {
        const { productId, onHandSku, size, color } = productDetails;

        if (!productId || !onHandSku || !size || !color) {
          updateResults.push({ productId, error: "Missing details in dataToSend" });
          continue;
        }

        const primaryLocation = await locationCollection.findOne({ isPrimaryLocation: true });
        if (!primaryLocation) {
          return { error: "Primary location not found" };
        }

        const { locationName } = primaryLocation;

        const updateResult = await productInformationCollection.updateOne(
          {
            productId,
            productVariants: {
              $elemMatch: {
                size: size,
                color: color,
                location: locationName,
              },
            },
          },
          {
            $inc: { "productVariants.$.onHandSku": onHandSku }, // Increment the onHandSku
          }
        );

        if (updateResult.modifiedCount === 0) {
          updateResults.push({ productId, error: "Failed to increment onHandSku" });
        } else {
          updateResults.push({
            productId,
            updatedVariant: { size, color, location: locationName, onHandSku: `+${onHandSku}` },
          });
        }
      }

      return updateResults;
    };

    // Update order status
    app.patch("/changeOrderStatus/:id", async (req, res) => {
      const id = req.params.id;
      const { orderStatus, trackingNumber, selectedShipmentHandlerName, shippedAt, deliveredAt, trackingUrl, imageUrl, isUndo, onHoldReason, declinedReason, returnInfo, dataToSend, returnDataToSend } = req.body; // Extract status from request body

      // Define valid statuses
      const validStatuses = [
        "Pending",
        "Processing",
        "Shipped",
        "On Hold",
        "Delivered",
        "Return Requested",
        "Request Accepted",
        "Request Declined",
        "Return Initiated",
        "Refunded"
      ];

      // Validate the provided status
      if (!validStatuses.includes(orderStatus)) {
        return res.status(400).send({ error: "Invalid order status" });
      }

      const filter = { _id: new ObjectId(id) };

      try {
        // Find the current order to get its current status
        const order = await orderListCollection.findOne(filter);

        if (!order) {
          return res.status(404).send({ error: "Order not found" });
        };

        const updateDoc = {};
        const currentTime = new Date();
        const undoAvailableUntil = new Date(currentTime.getTime() + 6 * 60 * 60 * 1000); // 6 hours later

        if (isUndo) {
          if (order.orderStatus === "Processing" && orderStatus === "Pending") {
            // Validate dataToSend before calling the function
            if (Array.isArray(dataToSend) && dataToSend.length > 0) {
              // Increment the SKU
              await incrementSkuInProduct(dataToSend);
            } else {
              console.error("Invalid dataToSend: must be a non-empty array for SKU increment.");
              throw new Error("Invalid dataToSend: must be a non-empty array for SKU increment.");
            }
          }

          else if (order.orderStatus === "Shipped" && orderStatus === "Processing") {

            // Validate dataToSend before calling the function
            if (Array.isArray(dataToSend) && dataToSend.length > 0) {
              updateDoc.$unset = { shipmentInfo: null }; // Remove shipmentInfo
              // Increment the onHandSku
              await incrementOnHandSkuInProduct(dataToSend);
            } else {
              console.error("Invalid dataToSend: must be a non-empty array for onHandSku increment.");
              throw new Error("Invalid dataToSend: must be a non-empty array for onHandSku increment.");
            }

          }

          else if (order.orderStatus === "On Hold" && orderStatus === "Shipped") {
            updateDoc.$unset = { onHoldReason: "" }; // Remove onHoldReason
          }

          else if (order.orderStatus === "Delivered" && (orderStatus === "On Hold" || orderStatus === "Shipped")) {
            updateDoc.$set = {
              "deliveryInfo.deliveredAt": null, // Set deliveredAt to null
            };
          }

          else if (order.orderStatus === "Request Declined" && orderStatus === "Return Requested") {
            updateDoc.$unset = { declinedReason: "" }; // Remove declinedReason
          }

          else if (order.orderStatus === "Refunded" && orderStatus === "Return Initiated") {
            // Validate returnDataToSend before calling the function
            if (Array.isArray(returnDataToSend) && returnDataToSend.length > 0) {
              // Decrease the returnSku
              await decrementReturnSkuInProduct(returnDataToSend);
            } else {
              console.error("Invalid returnDataToSend: must be a non-empty array for SKU decrement.");
              throw new Error("Invalid returnDataToSend: must be a non-empty array for SKU decrement.");
            }
          }

          // Undo logic: Revert to the previous status
          updateDoc.$set = {
            ...updateDoc.$set, // Retain any $set operations defined earlier
            orderStatus: orderStatus,
            previousStatus: order.orderStatus, // Store the current status as the previous status
            lastStatusChange: currentTime, // Update the timestamp for undo
            undoAvailableUntil: null, // Set undo availability for 6 hours
          };
        }
        else {
          updateDoc.$set = {
            orderStatus: orderStatus,
            previousStatus: order.orderStatus, // Save the current status as the previous status
            lastStatusChange: currentTime,      // Record the timestamp of the status change
            undoAvailableUntil: undoAvailableUntil, // Set undo availability for 6 hours
          };

          // Add shipping-related fields if `orderStatus` is `Shipped`
          if (orderStatus === "Shipped") {
            if (!trackingNumber || !selectedShipmentHandlerName) {
              return res.status(400).json({ error: "Tracking data is required for 'Shipped' status" });
            }

            // Store all shipping-related fields inside `shipmentInfo` object
            updateDoc.$set.shipmentInfo = {
              trackingNumber,
              selectedShipmentHandlerName,
              trackingUrl,
              imageUrl,
              shippedAt: new Date(shippedAt || Date.now()),
            };
          }

          // Add delivery-related fields if `orderStatus` is `Delivered`
          if (orderStatus === "Delivered") {
            updateDoc.$set.deliveryInfo = {
              ...(order.deliveryInfo || {}), // Retain existing shipmentInfo fields if present
              deliveredAt: new Date(deliveredAt || Date.now()), // Add or update `deliveredAt` field
            };
          }

          // Add delivery-related fields if `orderStatus` is `On Hold`
          if (orderStatus === "On Hold") {

            if (!onHoldReason) {
              return res.status(400).json({ error: "On hold reason is required for 'On Hold' status" });
            }

            // Store all shipping-related fields inside `shipmentInfo` object
            updateDoc.$set.onHoldReason = onHoldReason;

          }

          // Add delivery-related fields if `orderStatus` is `On Hold`
          if (orderStatus === "Return Requested") {

            if (!returnInfo) {
              return res.status(400).json({ error: "Return Requested is required for 'Return Requested' status" });
            }

            // Store all shipping-related fields inside `shipmentInfo` object
            updateDoc.$set.returnInfo = returnInfo;

          }

          // Add delivery-related fields if `orderStatus` is `On Hold`
          if (orderStatus === "Request Declined") {

            if (!declinedReason) {
              return res.status(400).json({ error: "Declined reason is required for 'Request Declined' status" });
            }

            // Store all shipping-related fields inside `shipmentInfo` object
            updateDoc.$set.declinedReason = declinedReason;

          }

        }

        const result = await orderListCollection.updateOne(filter, updateDoc);

        if (result.modifiedCount > 0) {
          res.send(result);
        } else {
          res.status(404).send({ error: "Order not found" });
        }
      } catch (err) {
        res.status(500).send({ error: "Internal server error" });
      }
    });

    // for barcode
    // app.get("/getOrderDetails", async (req, res) => {
    //   const orderNumber = req.query.orderNumber;

    //   if (!orderNumber) {
    //     return res.status(400).send({ error: "Order number is required" });
    //   }

    //   try {
    //     const order = await orderListCollection.findOne({ orderNumber });

    //     if (order) {
    //       res.send(order);
    //     } else {
    //       res.status(404).send({ error: "Order not found" });
    //     }
    //   } catch (error) {
    //     res.status(500).send({ error: "Internal server error" });
    //   }
    // });

    // post a customer details while login
    app.post("/addCustomerDetails", async (req, res) => {
      try {
        const customerData = req.body;
        const result = await customerListCollection.insertOne(customerData);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error adding customer details:", error);
        res.status(500).send({ message: "Failed to add customer details", error: error.message });
      }
    });

    // Get All Customer Information
    app.get('/allCustomerDetails', async (req, res) => {
      try {
        const customers = await customerListCollection.find().toArray();
        res.status(200).send(customers);
      } catch (error) {
        res.status(500).send(error.message);
      }
    });

    // Get Customer Details by Email
    app.get('/customerDetailsViaEmail/:email', async (req, res) => {
      const email = req.params.email; // Retrieve email from query parameters

      if (!email) {
        return res.status(400).send('Email is required'); // Validate input
      };

      try {
        const customer = await customerListCollection.findOne({ email }); // Query the database
        if (!customer) {
          return res.status(404).send('Customer not found'); // Handle case where no customer is found
        }
        res.status(200).send(customer); // Send customer details
      } catch (error) {
        res.status(500).send(error.message); // Handle server errors
      }
    });

    // Update user details by _id
    app.put("/updateUserInformation/:id", async (req, res) => {
      const id = req.params.id; // Retrieve _id from the request parameters
      let updatedData = req.body; // New data from the request body

      try {
        // Remove the _id field if it exists in the updatedData
        if (updatedData._id) {
          delete updatedData._id;
        }

        const result = await customerListCollection.updateOne(
          { _id: new ObjectId(id) }, // Match the document by its _id
          { $set: { ...updatedData } } // Set the new data for specific user information
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "No data found with this ID" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating data:", error);
        res.status(500).send({ message: "Failed to update data", error: error.message });
      }
    });

    // applying pagination in customer list
    app.get("/customerList", async (req, res) => {
      try {
        const pageStr = req.query?.page;
        const itemsPerPageStr = req.query?.itemsPerPage;
        const pageNumber = parseInt(pageStr) || 0;
        const itemsPerPage = parseInt(itemsPerPageStr) || 25; // Default to 25 if not provided
        const skip = pageNumber * itemsPerPage;

        // Fetching the total number of orders
        const totalCustomerList = await customerListCollection.estimatedDocumentCount();

        // Fetching the reversed data for the specific page
        const result = await customerListCollection.find()
          .skip(skip)
          .limit(itemsPerPage)
          .toArray();

        // Sending the result and total count to the frontend
        res.send({ result, totalCustomerList });
      } catch (error) {
        console.error("Error fetching customer list:", error);
        res.status(500).send({ message: "Failed to fetch customer list", error: error.message });
      }
    });

    // post a promo code
    app.post("/addPromoCode", async (req, res) => {
      try {
        const discountData = req.body;
        const result = await promoCollection.insertOne(discountData);
        res.send(result);
      } catch (error) {
        console.error("Error adding promo code:", error);
        res.status(500).send({ message: "Failed to add promo code", error: error.message });
      }
    });

    // Get All Promo Codes
    app.get('/allPromoCodes', async (req, res) => {
      try {
        const promos = await promoCollection.find().sort({ _id: -1 }).toArray();
        res.status(200).send(promos);
      } catch (error) {
        res.status(500).send(error.message);
      }
    });

    // get single promo info
    app.get("/getSinglePromo/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await promoCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Promo not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching promo:", error);
        res.status(500).send({ message: "Failed to fetch promo", error: error.message });
      }
    });

    // delete single promo
    app.delete("/deletePromo/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await promoCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Promo not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting promo:", error);
        res.status(500).send({ message: "Failed to delete promo", error: error.message });
      }
    });

    //update a single promo
    app.put("/updatePromo/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const promo = req.body;
        const filter = { _id: new ObjectId(id) };
        const updatePromo = {
          $set: { ...promo }
        };

        const result = await promoCollection.updateOne(filter, updatePromo);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Promo not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating promo:", error);
        res.status(500).send({ message: "Failed to update promo", error: error.message });
      }
    });

    // post a offer
    app.post("/addOffer", async (req, res) => {
      try {
        const offerData = req.body;
        const result = await offerCollection.insertOne(offerData);
        res.send(result);
      } catch (error) {
        console.error("Error adding offer:", error);
        res.status(500).send({ message: "Failed to add offer", error: error.message });
      }
    });

    // Get All Offer
    app.get('/allOffers', async (req, res) => {
      try {
        const offers = await offerCollection.find().sort({ _id: -1 }).toArray();
        res.status(200).send(offers);
      } catch (error) {
        res.status(500).send(error.message);
      }
    });

    // get single offer
    app.get("/getSingleOffer/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await offerCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Offer not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching promo:", error);
        res.status(500).send({ message: "Failed to fetch promo", error: error.message });
      }
    });

    //update a single offer
    app.put("/updateOffer/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const promo = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateOffer = {
          $set: { ...promo }
        };

        const result = await offerCollection.updateOne(filter, updateOffer);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Offer not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating offer:", error);
        res.status(500).send({ message: "Failed to update offer", error: error.message });
      }
    });

    // delete single offer
    app.delete("/deleteOffer/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await offerCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Offer not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting offer:", error);
        res.status(500).send({ message: "Failed to delete offer", error: error.message });
      }
    });

    // post a shipping zone
    app.post("/addShippingZone", async (req, res) => {
      try {
        const shippingData = req.body;
        const result = await shippingZoneCollection.insertOne(shippingData);
        res.send(result);
      } catch (error) {
        console.error("Error adding shipping details:", error);
        res.status(500).send({ message: "Failed to add shipping details", error: error.message });
      }
    });

    // get all shipping zones
    app.get("/allShippingZones", async (req, res) => {
      try {
        const result = await shippingZoneCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching shipping zones:", error);
        res.status(500).send({ message: "Failed to fetch shipping zones", error: error.message });
      }
    });

    // delete single shipping zone
    app.delete("/deleteShippingZone/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await shippingZoneCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "shipping not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting shipping:", error);
        res.status(500).send({ message: "Failed to delete shipping", error: error.message });
      }
    });

    // get single shipping zone
    app.get("/getSingleShippingZone/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await shippingZoneCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "shipping not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching shipping zone:", error);
        res.status(500).send({ message: "Failed to fetch shipping zone", error: error.message });
      }
    });

    //update a single shipping zone
    app.put("/editShippingZone/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const zone = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateShippingZone = {
          $set: { ...zone }
        };

        const result = await shippingZoneCollection.updateOne(filter, updateShippingZone);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Shipping Zone not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating shipping zone:", error);
        res.status(500).send({ message: "Failed to update shipping zone", error: error.message });
      }
    });

    // post a shipment handler
    app.post("/addShipmentHandler", async (req, res) => {
      try {
        const shipmentData = req.body;
        const result = await shipmentHandlerCollection.insertOne(shipmentData);
        res.send(result);
      } catch (error) {
        console.error("Error adding shipment details:", error);
        res.status(500).send({ message: "Failed to add shipment details", error: error.message });
      }
    });

    // get all shipment handler
    app.get("/allShipmentHandlers", async (req, res) => {
      try {
        const result = await shipmentHandlerCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching shipment handlers:", error);
        res.status(500).send({ message: "Failed to fetch shipment handlers", error: error.message });
      }
    });

    // delete single shipment handler
    app.delete("/deleteShipmentHandler/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await shipmentHandlerCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Shipment Handler not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting Shipment Handler:", error);
        res.status(500).send({ message: "Failed to delete Shipment Handler", error: error.message });
      }
    });

    // get single shipment handler
    app.get("/getSingleShipmentHandler/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await shipmentHandlerCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "shipment handler not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching shipment handler:", error);
        res.status(500).send({ message: "Failed to fetch shipment handler", error: error.message });
      }
    });

    //update a single shipment handler
    app.put("/editShipmentHandler/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const shipmentDetails = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateShipmentHandler = {
          $set: { ...shipmentDetails }
        };

        const result = await shipmentHandlerCollection.updateOne(filter, updateShipmentHandler);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Shipment handler not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating shipment handler:", error);
        res.status(500).send({ message: "Failed to update shipment handler", error: error.message });
      }
    });

    // post a payment method
    app.post("/addPaymentMethod", async (req, res) => {
      try {
        const paymentData = req.body;
        const result = await paymentMethodCollection.insertOne(paymentData);
        res.send(result);
      } catch (error) {
        console.error("Error adding payment method:", error);
        res.status(500).send({ message: "Failed to add payment method", error: error.message });
      }
    });

    // get all payment methods
    app.get("/allPaymentMethods", async (req, res) => {
      try {
        const result = await paymentMethodCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching payment method:", error);
        res.status(500).send({ message: "Failed to fetch payment method", error: error.message });
      }
    });

    // delete single Payment Method
    app.delete("/deletePaymentMethod/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await paymentMethodCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Payment Method not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting Payment Method:", error);
        res.status(500).send({ message: "Failed to delete Payment Method", error: error.message });
      }
    });

    // get single Payment Method
    app.get("/getSinglePaymentMethod/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await paymentMethodCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Payment Method not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching Payment Method:", error);
        res.status(500).send({ message: "Failed to fetch Payment Method", error: error.message });
      }
    });

    //update a single payment method
    app.put("/editPaymentMethod/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const method = req.body;
        const filter = { _id: new ObjectId(id) };
        const updatePaymentMethod = {
          $set: { ...method }
        };

        const result = await paymentMethodCollection.updateOne(filter, updatePaymentMethod);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Payment method not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating Payment method:", error);
        res.status(500).send({ message: "Failed to update Payment method", error: error.message });
      }
    });

    // post a location
    app.post("/addLocation", async (req, res) => {
      try {
        const locationData = req.body;

        // If the location is set as primary, update all other locations to set `isPrimaryLocation` to false
        if (locationData.isPrimaryLocation) {
          await locationCollection.updateMany({ isPrimaryLocation: true }, { $set: { isPrimaryLocation: false } });
        }

        // Insert the new location
        const result = await locationCollection.insertOne(locationData);

        res.send(result);
      } catch (error) {
        console.error("Error adding location:", error);
        res.status(500).send({ message: "Failed to add location", error: error.message });
      }
    });

    // get all locations
    app.get("/allLocations", async (req, res) => {
      try {
        const result = await locationCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching locations:", error);
        res.status(500).send({ message: "Failed to fetch locations", error: error.message });
      }
    });

    // delete single location
    app.delete("/deleteLocation/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await locationCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Location not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting Location:", error);
        res.status(500).send({ message: "Failed to delete Location", error: error.message });
      }
    });

    // Update a single location
    app.put("/updateLocation/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const locationData = req.body;

        // If the updated location is set as primary, update all other locations to set `isPrimaryLocation` to false
        if (locationData.isPrimaryLocation) {
          await locationCollection.updateMany({ isPrimaryLocation: true }, { $set: { isPrimaryLocation: false } });
        }

        // Update the specific location
        const filter = { _id: new ObjectId(id) };
        const updateLocation = {
          $set: { ...locationData }
        };

        const result = await locationCollection.updateOne(filter, updateLocation);

        // Handle case where no location was found
        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Location not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating location:", error);
        res.status(500).send({ message: "Failed to update location", error: error.message });
      }
    });

    // get single location info
    app.get("/getSingleLocationDetails/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await locationCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Location not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching Location:", error);
        res.status(500).send({ message: "Failed to fetch Location", error: error.message });
      }
    });

    // post a purchase order
    app.post("/addPurchaseOrder", async (req, res) => {
      try {
        const purchaseOrderData = req.body;
        const result = await purchaseOrderCollection.insertOne(purchaseOrderData);
        res.send(result);
      } catch (error) {
        console.error("Error adding purchase order:", error);
        res.status(500).send({ message: "Failed to add purchase order", error: error.message });
      }
    });

    // get all purchase orders
    app.get("/allPurchaseOrders", async (req, res) => {
      try {
        const result = await purchaseOrderCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching purchase order:", error);
        res.status(500).send({ message: "Failed to fetch purchase order", error: error.message });
      }
    });

    // delete single purchase order
    app.delete("/deletePurchaseOrder/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await purchaseOrderCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Purchase order not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting purchase order:", error);
        res.status(500).send({ message: "Failed to delete purchase order", error: error.message });
      }
    });

    // get single purchase order
    app.get("/getSinglePurchaseOrder/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await purchaseOrderCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Purchase order not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching Purchase order:", error);
        res.status(500).send({ message: "Failed to fetch Purchase order", error: error.message });
      }
    });

    //update a single purchase order
    app.put("/editPurchaseOrder/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const order = req.body;
        const filter = { _id: new ObjectId(id) };
        const updatePurchaseOrder = {
          $set: { ...order }
        };

        const result = await purchaseOrderCollection.updateOne(filter, updatePurchaseOrder);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Purchase order not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating purchase order:", error);
        res.status(500).send({ message: "Failed to update purchase order", error: error.message });
      }
    });

    // post a transfer order
    app.post("/addTransferOrder", async (req, res) => {
      try {
        const transferOrderData = req.body;
        const result = await transferOrderCollection.insertOne(transferOrderData);
        res.send(result);
      } catch (error) {
        console.error("Error adding transfer order:", error);
        res.status(500).send({ message: "Failed to add transfer order", error: error.message });
      }
    });

    // get all transfer orders
    app.get("/allTransferOrders", async (req, res) => {
      try {
        const result = await transferOrderCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching transfer orders:", error);
        res.status(500).send({ message: "Failed to fetch transfer orders", error: error.message });
      }
    });

    // get single transfer order
    app.get("/getSingleTransferOrder/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await transferOrderCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Transfer order not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching Transfer order:", error);
        res.status(500).send({ message: "Failed to fetch Transfer order", error: error.message });
      }
    });

    //update a single transfer order
    app.put("/editTransferOrder/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const order = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateTransferOrder = {
          $set: { ...order }
        };

        const result = await transferOrderCollection.updateOne(filter, updateTransferOrder);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Transfer order not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating transfer order:", error);
        res.status(500).send({ message: "Failed to update transfer order", error: error.message });
      }
    });

    // delete single transfer order
    app.delete("/deleteTransferOrder/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await transferOrderCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Transfer order not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting transfer order:", error);
        res.status(500).send({ message: "Failed to delete transfer order", error: error.message });
      }
    });

    // post a marketing banner
    app.post("/addMarketingBanner", async (req, res) => {
      try {
        const marketingBannerData = req.body;
        const result = await marketingBannerCollection.insertOne(marketingBannerData);
        res.send(result);
      } catch (error) {
        console.error("Error adding marketing banner:", error);
        res.status(500).send({ message: "Failed to add marketing banner", error: error.message });
      }
    });

    //update a single login register image urls
    app.put("/editMarketingBanner/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const urls = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateUrlOrder = {
          $set: { ...urls }
        };

        const result = await marketingBannerCollection.updateOne(filter, updateUrlOrder);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Login register image urls not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating login register image urls:", error);
        res.status(500).send({ message: "Failed to update login register image urls", error: error.message });
      }
    });

    // get all marketing banner
    app.get("/allMarketingBanners", async (req, res) => {
      try {
        const result = await marketingBannerCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching marketing banner:", error);
        res.status(500).send({ message: "Failed to fetch marketing banner", error: error.message });
      }
    });

    // post a login register slides
    app.post("/addLoginRegisterImageUrls", async (req, res) => {
      try {
        const loginRegisterImageUrlsData = req.body;
        const result = await loginRegisterSlideCollection.insertOne(loginRegisterImageUrlsData);
        res.send(result);
      } catch (error) {
        console.error("Error adding login register slides:", error);
        res.status(500).send({ message: "Failed to add login register slides", error: error.message });
      }
    });

    // get all login register slides
    app.get("/allLoginRegisterImageUrls", async (req, res) => {
      try {
        const result = await loginRegisterSlideCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching login register slides:", error);
        res.status(500).send({ message: "Failed to fetch login register slides", error: error.message });
      }
    });

    //update a single login register image urls
    app.put("/editLoginRegisterImageUrls/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const urls = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateUrlOrder = {
          $set: { ...urls }
        };

        const result = await loginRegisterSlideCollection.updateOne(filter, updateUrlOrder);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Login register image urls not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating login register image urls:", error);
        res.status(500).send({ message: "Failed to update login register image urls", error: error.message });
      }
    });

    // post a hero banner slides
    app.post("/addHeroBannerImageUrls", async (req, res) => {
      try {
        const heroBannerImageUrlsData = req.body;
        const result = await heroBannerCollection.insertOne(heroBannerImageUrlsData);
        res.send(result);
      } catch (error) {
        console.error("Error adding hero banner slides:", error);
        res.status(500).send({ message: "Failed to add hero banner slides", error: error.message });
      }
    });

    // get all hero banner slides
    app.get("/allHeroBannerImageUrls", async (req, res) => {
      try {
        const result = await heroBannerCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching hero banner slides:", error);
        res.status(500).send({ message: "Failed to fetch hero banner slides", error: error.message });
      }
    });

    //update a single hero banner image urls
    app.put("/editHeroBannerImageUrls/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const urls = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateUrlOrder = {
          $set: { ...urls }
        };

        const result = await heroBannerCollection.updateOne(filter, updateUrlOrder);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "hero banner image urls not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating hero banner image urls:", error);
        res.status(500).send({ message: "Failed to update hero banner image urls", error: error.message });
      }
    });

    // post a newsletter
    app.post("/addNewsletter", async (req, res) => {
      try {
        const newsletterData = req.body;
        const result = await newsletterCollection.insertOne(newsletterData);
        res.send(result);
      } catch (error) {
        console.error("Error adding newsletter:", error);
        res.status(500).send({ message: "Failed to add newsletter", error: error.message });
      }
    });

    // get all newsletters
    app.get("/allNewsletters", async (req, res) => {
      try {
        const result = await newsletterCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching newsletters:", error);
        res.status(500).send({ message: "Failed to fetch newsletters", error: error.message });
      }
    });

    // get single newsletter via email
    app.get("/getSingleNewsletter/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const result = await newsletterCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "newsletter not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching newsletter:", error);
        res.status(500).send({ message: "Failed to fetch newsletter", error: error.message });
      }
    });

    // delete single newsletter
    app.delete("/deleteNewsletter/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await newsletterCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "newsletter not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting newsletter:", error);
        res.status(500).send({ message: "Failed to delete newsletter", error: error.message });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

  }
}
run().catch(console.dir);


app.get("/", (req, res) => {
  res.send("Fashion-Commerce server is running");
})

app.listen(port, () => {
  console.log(`Fashion-Commerce server is running on port ${port}`);
})