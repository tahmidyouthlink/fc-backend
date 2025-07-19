const express = require("express");
const app = express();
app.set("trust proxy", true);
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const { Storage } = require("@google-cloud/storage");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
require("dotenv").config();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const path = require("path");
const os = require("os");
const moment = require("moment-timezone");
const compression = require("compression");
const helmet = require("helmet");
const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");
const nodemailer = require("nodemailer");
const generateCustomerId = require("./utils/generateCustomerId");
const generateOrderId = require("./utils/generateOrderId");
const getImageSetsBasedOnColors = require("./utils/getImageSetsBasedOnColors");
const {
  calculateFinalPrice,
  calculateProductSpecialOfferDiscount,
  calculatePromoDiscount,
  calculateShippingCharge,
  calculateSubtotal,
  calculateTotalSpecialOfferDiscount,
  checkIfOnlyRegularDiscountIsAvailable,
  getEstimatedDeliveryTime,
  getExpectedDeliveryDate,
  getProductSpecialOffer,
} = require("./utils/orderCalculations");
const sendEmailToCustomer = require("./utils/email/sendEmailToCustomer");
const transport = require("./utils/email/transport");

const base64Key = process.env.GCP_SERVICE_ACCOUNT_BASE64;

if (!base64Key) {
  throw new Error("Missing GCP_SERVICE_ACCOUNT_BASE64 env variable");
}

// Convert the base64 string to JSON and store it in a temporary file
const keyFilePath = path.join(os.tmpdir(), "gcs-key.json");
fs.writeFileSync(
  keyFilePath,
  Buffer.from(base64Key, "base64").toString("utf-8")
);

// You can also load from a JSON key file if you're not using env vars
const storage = new Storage({
  projectId: process.env.PROJECT_ID,
  keyFilename: keyFilePath,
});

const bucket = storage.bucket(process.env.BUCKET_NAME); // Make sure this bucket exists

const upload = multer({ storage: multer.memoryStorage() });

let limiter = (req, res, next) => next(); // No-op middleware by default

if (process.env.NODE_ENV === "production") {
  limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message:
      "Too many requests from this IP, please try again after 15 minutes",
    keyGenerator: function (req) {
      const forwarded = req.headers["x-forwarded-for"];
      const ip = forwarded ? forwarded.split(",")[0].trim() : req.ip;
      return ip;
    },
  });
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.n9or6wr.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://poshax.shop",
      "https://px-portal-025.poshax.shop",
    ],
    credentials: true, // if using cookies or auth
  })
);
app.use(compression());
app.use(helmet());
// app.use(express.urlencoded({ extended: true }));

const verifyJWT = (req, res, next) => {
  if (!req?.headers?.authorization) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Forbidden: Invalid token" });
    }

    // Attach decoded user info to request
    req.user = decoded;
    next();
  });
};

const authorizeAccess = (requiredRoles = [], ...moduleNames) => {
  return async (req, res, next) => {
    try {
      const userId = req.user._id;
      const enrollmentCollection = client
        .db("fashion-commerce")
        .collection("enrollment-admin-staff");

      const user = await enrollmentCollection.findOne({
        _id: new ObjectId(userId),
      });

      if (!user?.permissions?.length || !user || !user.permissions) {
        return res
          .status(403)
          .json({ message: "No permissions found for user" });
      }

      // Loop through all roles the user has
      const hasAccess = user.permissions.some((roleEntry) => {
        const roleName = roleEntry.role;
        const modules = roleEntry.modules || {};

        return moduleNames.some((moduleName) => {
          const module = modules[moduleName];
          if (!module?.access) return false;

          // If no role filtering required, access granted
          if (requiredRoles.length === 0) return true;

          // Check if this role matches required ones
          return requiredRoles.includes(roleName);
        });
      });

      if (!hasAccess) {
        return res.status(403).json({
          message: `Access denied. You need roles: ${requiredRoles.join(
            " or "
          )} with access to ${moduleNames.join(", ")}`,
        });
      }

      next();
    } catch (err) {
      console.error("Authorization error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};

const allowedOrigins = [
  "http://localhost:3000",
  "https://poshax.shop",
  "https://px-portal-025.poshax.shop",
];

const originChecker = (req, res, next) => {
  const origin = req.headers.origin || req.headers["x-client-origin"];

  if (!origin || allowedOrigins.includes(origin)) {
    return next();
  }

  res.status(403).json({ message: "Forbidden: Invalid origin" });
};

const multiClientAccess = (
  backendAccessMiddleware,
  frontendAccessMiddleware
) => {
  return async (req, res, next) => {
    const origin = req.headers.origin || req.headers["x-client-origin"];

    try {
      if (origin === "https://px-portal-025.poshax.shop") {
        return backendAccessMiddleware(req, res, next);
      }

      // if (origin === "http://localhost:3000") {
      //   return backendAccessMiddleware(req, res, next);
      // }

      if (origin === "https://poshax.shop") {
        return frontendAccessMiddleware(req, res, next);
      }

      // if (origin === "http://localhost:3000") {
      //   return frontendAccessMiddleware(req, res, next);
      // }

      return res
        .status(403)
        .json({ message: "Forbidden: Unrecognized origin" });
    } catch (error) {
      console.error("MultiClientAccess error:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };
};

async function run() {
  try {
    // await client.connect();
    const productInformationCollection = client
      .db("fashion-commerce")
      .collection("all-product-information");
    const orderListCollection = client
      .db("fashion-commerce")
      .collection("orderList");
    const customerListCollection = client
      .db("fashion-commerce")
      .collection("customerList");
    const seasonCollection = client
      .db("fashion-commerce")
      .collection("seasons");
    const categoryCollection = client
      .db("fashion-commerce")
      .collection("category");
    const colorCollection = client.db("fashion-commerce").collection("colors");
    const vendorCollection = client
      .db("fashion-commerce")
      .collection("vendors");
    const tagCollection = client.db("fashion-commerce").collection("tags");
    const promoCollection = client
      .db("fashion-commerce")
      .collection("promo-code");
    const offerCollection = client.db("fashion-commerce").collection("offers");
    const shippingZoneCollection = client
      .db("fashion-commerce")
      .collection("shipping-zone");
    const shipmentHandlerCollection = client
      .db("fashion-commerce")
      .collection("shipment-handler");
    const paymentMethodCollection = client
      .db("fashion-commerce")
      .collection("payment-methods");
    const locationCollection = client
      .db("fashion-commerce")
      .collection("locations");
    const purchaseOrderCollection = client
      .db("fashion-commerce")
      .collection("purchase-order");
    const transferOrderCollection = client
      .db("fashion-commerce")
      .collection("transfer-order");
    const marketingBannerCollection = client
      .db("fashion-commerce")
      .collection("marketing-banner");
    const loginRegisterSlideCollection = client
      .db("fashion-commerce")
      .collection("login-register-slide");
    const heroBannerCollection = client
      .db("fashion-commerce")
      .collection("hero-banner");
    const newsletterCollection = client
      .db("fashion-commerce")
      .collection("news-letter");
    const enrollmentCollection = client
      .db("fashion-commerce")
      .collection("enrollment-admin-staff");
    const policyPagesCollection = client
      .db("fashion-commerce")
      .collection("policy-pages");
    const faqCollection = client.db("fashion-commerce").collection("faqs");
    const ourStoryCollection = client
      .db("fashion-commerce")
      .collection("our-story");
    const topHeaderCollection = client
      .db("fashion-commerce")
      .collection("top-header");
    const availabilityNotifications = client
      .db("fashion-commerce")
      .collection("availability-notifications");
    const logoCollection = client.db("fashion-commerce").collection("logo");
    const customerSupportCollection = client
      .db("fashion-commerce")
      .collection("customer-support");
    const imapCollection = client.db("fashion-commerce").collection("imapMeta");

    // Generate a 6-digit OTP as a string
    function generateOtp() {
      return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async function sendOtpEmail(email, otp, name) {
      try {
        await transport.sendMail({
          from: `${process.env.WEBSITE_NAME} <${process.env.EMAIL_USER}>`,
          to: email,
          subject: `OTP for ${process.env.WEBSITE_NAME} Login`,
          text: `Your One-Time Password  
  
          Dear ${name},  
  
          Here is your One-Time Password (OTP) to securely log in to your ${process.env.WEBSITE_NAME} account:  
  
          ${otp}  
  
          Note: This OTP is valid for 5 minutes.  
  
          If you did not request this OTP, please ignore this email or contact our support team.  
  
          Thank you for choosing ${process.env.WEBSITE_NAME}!  
  
          Best regards,  
          Team ${process.env.WEBSITE_NAME}`,
          html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="text-align: center; color: #333;">🔑 <b>Your One-Time Password</b></h2>
          <p>Dear <b>${name}</b>,</p>
          <p>Here is your One-Time Password (OTP) to securely log in to your <b>${process.env.WEBSITE_NAME}</b> account:</p>
          <p style="text-align: center; font-size: 24px; font-weight: bold; color: #ff6600; margin: 20px 0;">${otp}</p>
          <p><b>Note:</b> This OTP is valid for <b>5 minutes</b>.</p>
          <p>If you did not request this OTP, please ignore this email or contact our support team.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="text-align: center; color: #555;">Thank you for choosing <b>${process.env.WEBSITE_NAME}</b>! 🛍️</p>
          <p style="text-align: center; font-size: 14px; color: #888;">Best regards,<br>Team ${process.env.WEBSITE_NAME}</p>
        </div>
      `,
        });
      } catch (emailError) {
        console.error("Error sending OTP email:", emailError);
        throw new Error("Error sending OTP email");
      }
    }

    // Route to generate signed URL for uploading a single file
    app.post(
      "/generate-upload-url",
      verifyJWT,
      limiter,
      originChecker,
      async (req, res) => {
        try {
          const { fileName, contentType } = req.body;

          if (!fileName || !contentType) {
            return res
              .status(400)
              .json({ error: "Missing fileName or contentType" });
          }

          const file = bucket.file(`${Date.now()}_${fileName}`);

          const options = {
            version: "v4",
            action: "write", // For upload
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
            contentType: contentType,
          };

          // Get a v4 signed URL for uploading file
          const [url] = await file.getSignedUrl(options);

          return res.status(200).json({
            uploadUrl: url,
            publicUrl: `https://storage.googleapis.com/${bucket.name}/${file.name}`,
          });
        } catch (error) {
          console.error("Error generating signed URL:", error);
          return res.status(500).json({ error: "Internal server error" });
        }
      }
    );

    // Route to upload single file
    app.post(
      "/upload-single-file",
      verifyJWT,
      limiter,
      originChecker,
      upload.single("attachment"),
      async (req, res) => {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        try {
          const file = req.file;
          const blob = bucket.file(`${Date.now()}_${file.originalname}`);
          const blobStream = blob.createWriteStream({
            resumable: false,
            contentType: file.mimetype,
            metadata: {
              contentType: file.mimetype,
            },
          });

          blobStream.on("error", (err) => {
            console.error("Upload error:", err);
            res.status(500).json({ error: "Failed to upload file" });
          });

          blobStream.on("finish", async () => {
            // Make file public
            await blob.acl.add({
              entity: "allUsers",
              role: "READER",
            });

            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
            res.status(200).json({ fileUrl: publicUrl });
          });

          blobStream.end(file.buffer);
        } catch (error) {
          console.error("Upload error:", error);
          res.status(500).json({ error: "Failed to upload file" });
        }
      }
    );

    // Route to upload multiple files
    app.post(
      "/upload-multiple-files",
      verifyJWT,
      limiter,
      originChecker,
      upload.any(),
      async (req, res) => {
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({ error: "No files uploaded" });
        }

        try {
          const uploadPromises = req.files.map((file) => {
            return new Promise((resolve, reject) => {
              const blob = bucket.file(`${Date.now()}_${file.originalname}`);
              const blobStream = blob.createWriteStream({
                resumable: false,
                contentType: file.mimetype,
                metadata: {
                  contentType: file.mimetype,
                },
              });

              blobStream.on("error", reject);

              blobStream.on("finish", async () => {
                // Set the file to be publicly accessible by default
                await blob.acl.add({
                  entity: "allUsers",
                  role: "READER",
                });

                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
                resolve(publicUrl);
              });

              blobStream.end(file.buffer);
            });
          });

          const urls = await Promise.all(uploadPromises);
          res.status(200).json({ urls });
        } catch (error) {
          console.error("Upload error:", error);
          res.status(500).json({ error: "Failed to upload files" });
        }
      }
    );

    // Invite API (Super Admin creates an account)
    app.post(
      "/invite",
      verifyJWT,
      authorizeAccess(["Owner"], "Settings"),
      limiter,
      originChecker,
      async (req, res) => {
        try {
          const { email, permissions } = req.body;

          if (!email) {
            return res
              .status(400)
              .json({ success: false, message: "Email is required!" });
          } else if (!permissions) {
            return res
              .status(400)
              .json({ success: false, message: "Permissions are required!" });
          }

          // Check if the email already exists
          const existingEntry = await enrollmentCollection.findOne({ email });

          if (existingEntry) {
            const isExpired =
              (!existingEntry.hashedToken && !existingEntry.expiresAt) ||
              new Date(existingEntry.expiresAt) < new Date();

            // Check if the existing invitation is expired
            if (isExpired) {
              // If expired, allow re-invitation by generating a new token
              const token = crypto.randomBytes(32).toString("hex");
              const hashedToken = crypto
                .createHash("sha256")
                .update(token)
                .digest("hex");
              const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // New expiry

              const magicLink = `${process.env.SUB_DOMAIN_URL}/auth/setup?token=${token}`;

              try {
                const mailResult = await transport.sendMail({
                  from: `${process.env.WEBSITE_NAME} <${process.env.EMAIL_USER}>`,
                  to: email,
                  subject: `You're Invited to Join ${process.env.WEBSITE_NAME}`,
                  text: `Hello ${email},
    
                You have been invited to join ${
                  process.env.WEBSITE_NAME
                }. Please use the link below to complete your setup:
    
    
    
                🔗 Magic Link: ${magicLink}
    
    
    
                This link is valid for **72 hours** and will expire on **${new Date(
                  Date.now() + 72 * 60 * 60 * 1000
                ).toLocaleString("en-GB", {
                  timeZone: "Asia/Dhaka",
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                  second: "numeric",
                  hour12: true,
                })}**.
    
                If you did not expect this invitation, you can safely ignore this email.
    
                Best Regards,  
                ${process.env.WEBSITE_NAME} Team`,
                  html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invitation - ${process.env.WEBSITE_NAME}</title>
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
                <h1>Welcome to ${process.env.WEBSITE_NAME}!</h1>
              </div>
              <div class="content">
                <p>Hello <strong>${email}</strong>,</p>
                <p>You are invited to join <strong>${process.env.WEBSITE_NAME}</strong>. To accept this invitation, create account:</p>
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
                <p>Best Regards, <br><strong>${process.env.WEBSITE_NAME} Team</strong></p>
              </div>
            </div>
            </body>
            </html>`,
                });

                if (
                  mailResult &&
                  mailResult.accepted &&
                  mailResult.accepted.length > 0
                ) {
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
                  return res.status(500).json({
                    success: false,
                    message: "Failed to resend invitation email.",
                  });
                }
              } catch (emailError) {
                return res.status(500).json({
                  success: false,
                  message: "Failed to resend invitation email.",
                  emailError: emailError.message,
                });
              }
            } else {
              return res
                .status(400)
                .json({ error: "Email already invited and still valid." });
            }
          }

          const token = crypto.randomBytes(32).toString("hex"); // Generate secure random token
          const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex"); // Hash token

          // Set expiration time (72 hours)
          const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

          // Magic Link
          const magicLink = `${process.env.SUB_DOMAIN_URL}/auth/setup?token=${token}`;

          try {
            const mailResult = await transport.sendMail({
              from: `${process.env.WEBSITE_NAME} <${process.env.EMAIL_USER}>`,
              to: email,
              subject: `You're Invited to Join ${process.env.WEBSITE_NAME}`,
              text: `Hello ${email},

            You have been invited to join ${
              process.env.WEBSITE_NAME
            }. Please use the link below to complete your setup:



            🔗 Magic Link: ${magicLink}



            This link is valid for **72 hours** and will expire on **${new Date(
              Date.now() + 72 * 60 * 60 * 1000
            ).toLocaleString("en-GB", {
              timeZone: "Asia/Dhaka",
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "numeric",
              minute: "numeric",
              second: "numeric",
              hour12: true,
            })}**.

            If you did not expect this invitation, you can safely ignore this email.

            Best Regards,  
            ${process.env.WEBSITE_NAME} Team`,
              html: `<!DOCTYPE html>
                  <html lang="en">
                  <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Invitation - ${process.env.WEBSITE_NAME}</title>
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
                  <h1>Welcome to ${process.env.WEBSITE_NAME}!</h1>
              </div>
                <div class="content">
                  <p>Hello <strong>${email}</strong>,</p>
                  <p>You are invited to join <strong>${process.env.WEBSITE_NAME}</strong>. To accept this invitation, create account:</p>
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
                  <p>Best Regards, <br><strong>${process.env.WEBSITE_NAME} Team</strong></p>
                </div>
              </div>
              </body>
              </html>`,
            });

            // Check if email was sent successfully (you can use mailResult.accepted to confirm if the email was delivered)
            if (
              mailResult &&
              mailResult.accepted &&
              mailResult.accepted.length > 0
            ) {
              // If email was sent successfully, insert data into MongoDB
              const result = await enrollmentCollection.insertOne({
                email,
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
        } catch (error) {
          res.status(500).json({
            success: false,
            message: "Something went wrong!",
            error: error.message,
          });
        }
      }
    );

    // checking token is valid or not
    app.post("/validate-token", limiter, originChecker, async (req, res) => {
      const { token } = req.body; // Assuming the token comes in the body of the request.

      if (!token) {
        return res.status(400).json({
          message: "Token is required. Please provide a valid token.",
        });
      }

      try {
        // Hash the received raw token
        const hashedToken = crypto
          .createHash("sha256")
          .update(token)
          .digest("hex");

        // Check if the email exists in the database (optional, if you want extra verification)
        const enrollment = await enrollmentCollection.findOne({
          hashedToken,
        });

        if (!enrollment) {
          return res.status(400).json({
            message: "We could not find your request. Please try again.",
          });
        }

        // ✅ Check if the user has already set up their account
        if (enrollment.isSetupComplete) {
          return res
            .status(403)
            .json({ message: "You have already set up your account." });
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
        res
          .status(200)
          .json({ message: "Access verified successfully.", email });
      } catch (error) {
        // Generic error message
        return res.status(500).json({
          message: "Something went wrong. Please try again later.",
          error: error.message,
        });
      }
    });

    app.get(
      "/all-existing-users",
      verifyJWT,
      authorizeAccess(["Owner"], "Settings"),
      originChecker,
      async (req, res) => {
        try {
          // Retrieve only specific fields from the collection
          const users = await enrollmentCollection
            .find(
              {},
              {
                projection: {
                  email: 1,
                  fullName: 1,
                  hashedToken: 1,
                  expiresAt: 1,
                  isSetupComplete: 1,
                  role: 1,
                  permissions: 1,
                },
              }
            )
            .toArray();

          // Return the list of specific fields (email, fullName, hashedToken, expiresAt)
          res.status(200).json(users);
        } catch (error) {
          console.error(error);
          res
            .status(500)
            .json({ message: "Something went wrong. Please try again later." });
        }
      }
    );

    app.get("/assignable-users", verifyJWT, originChecker, async (req, res) => {
      try {
        const result = await enrollmentCollection
          .find(
            {
              isSetupComplete: true,
            },
            {
              projection: {
                _id: 1,
                fullName: 1,
              },
            }
          )
          .toArray();

        res.send(result);
      } catch (error) {
        console.error("Error fetching assignable users:", error);
        res.status(500).send({
          success: false,
          message: "Failed to fetch assignable users",
          error: error.message,
        });
      }
    });

    // GET /assigned-users/:messageId
    app.get(
      "/assigned-users/:messageId",
      verifyJWT,
      originChecker,
      async (req, res) => {
        try {
          const messageId = req.params.messageId;
          const message = await customerSupportCollection.findOne({
            _id: new ObjectId(messageId),
          });

          if (!message)
            return res
              .status(404)
              .json({ success: false, message: "Message not found" });

          const assignedUsers = message.assignedUsers || [];

          // Optionally join with user collection to get full name
          const userIds = assignedUsers.map((a) => new ObjectId(a.userId));
          const users = await enrollmentCollection
            .find({ _id: { $in: userIds } })
            .toArray();

          // Map details back
          const detailedAssignedUsers = assignedUsers.map((assignment) => {
            const user = users.find(
              (u) => u._id.toString() === assignment.userId
            );
            return {
              ...assignment,
              fullName: user?.fullName || "Unknown",
            };
          });

          res.json({ success: true, assignedUsers: detailedAssignedUsers });
        } catch (error) {
          console.error("Error fetching assigned users:", error);
          res.status(500).json({
            success: false,
            message: "Failed to fetch assigned users",
          });
        }
      }
    );

    // GET - /assigned-notifications-customer-support/:userId
    app.get(
      "/assigned-notifications-customer-support/:userId",
      verifyJWT,
      originChecker,
      async (req, res) => {
        try {
          const { userId } = req.params;

          const rawNotifications = await customerSupportCollection
            .find(
              { "assignedUsers.userId": userId },
              {
                projection: {
                  assignedUsers: { $elemMatch: { userId } },
                  name: 1,
                  email: 1,
                  topic: 1,
                },
              }
            )
            .toArray();

          // Transform the structure to be flat and frontend-friendly
          const transformed = rawNotifications
            .map((doc) => ({
              _id: doc._id,
              name: doc.name,
              email: doc.email,
              topic: doc.topic,
              dateTime: doc.assignedUsers?.[0]?.assignedAt || null,
              isRead: doc.assignedUsers?.[0]?.isRead ?? false,
              type: "Inbox",
            }))
            .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

          res.send(transformed);
        } catch (error) {
          console.error(
            "Error fetching customer support notifications:",
            error
          );
          res.status(500).json({
            success: false,
            message: "Failed to fetch customer support notifications",
            error: error.message,
          });
        }
      }
    );

    app.patch(
      "/mark-support-notification-read/:messageId",
      verifyJWT,
      originChecker,
      async (req, res) => {
        try {
          const messageId = req.params.messageId;
          const { userId } = req.body;

          const result = await customerSupportCollection.updateOne(
            { _id: new ObjectId(messageId), "assignedUsers.userId": userId },
            { $set: { "assignedUsers.$.isRead": true } }
          );

          if (result.modifiedCount === 1) {
            return res.json({ success: true });
          } else {
            return res.json({ success: false });
          }
        } catch (error) {
          console.error("Error marking as read:", error);
          res
            .status(500)
            .json({ success: false, message: "Internal server error" });
        }
      }
    );

    app.patch(
      "/assign-customer-support-user/:messageId",
      verifyJWT,
      originChecker,
      async (req, res) => {
        try {
          const { messageId } = req.params;
          const { userId, assignedAt, isRead } = req.body;

          if (!userId || !assignedAt) {
            return res
              .status(400)
              .json({ success: false, message: "Missing required fields" });
          }

          // Prevent duplicate assignment
          const existing = await customerSupportCollection.findOne({
            _id: new ObjectId(messageId),
            "assignedUsers.userId": userId,
          });

          if (existing) {
            return res
              .status(400)
              .json({ success: false, message: "User already assigned" });
          }

          const updateResult = await customerSupportCollection.updateOne(
            { _id: new ObjectId(messageId) },
            {
              $push: {
                assignedUsers: {
                  userId,
                  assignedAt,
                  isRead: isRead ?? false,
                },
              },
            }
          );

          if (updateResult.modifiedCount === 1) {
            res.json({ success: true, message: "User assigned successfully" });
          } else {
            res
              .status(500)
              .json({ success: false, message: "Failed to assign user" });
          }
        } catch (err) {
          console.error("Error assigning user:", err);
          res
            .status(500)
            .json({ success: false, message: "Internal server error" });
        }
      }
    );

    app.patch(
      "/unassign-customer-support-user/:messageId",
      verifyJWT,
      originChecker,
      async (req, res) => {
        try {
          const messageId = req.params.messageId;
          const { userId } = req.body;

          const result = await customerSupportCollection.updateOne(
            { _id: new ObjectId(messageId) },
            { $pull: { assignedUsers: { userId: userId } } }
          );

          if (result.modifiedCount > 0) {
            return res.json({
              success: true,
              message: "User unassigned successfully",
            });
          }

          return res
            .status(404)
            .json({ success: false, message: "Message or user not found" });
        } catch (error) {
          console.error("Error unassigning user:", error);
          res.status(500).json({
            success: false,
            message: "Unassign failed",
            error: error.message,
          });
        }
      }
    );

    // Get single existing user info
    app.get(
      "/single-existing-user/:id",
      verifyJWT,
      originChecker,
      async (req, res) => {
        try {
          const { id } = req.params;

          // Validate if the id is a valid ObjectId
          if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: "Invalid user ID format" });
          }

          const query = { _id: new ObjectId(id) };
          const result = await enrollmentCollection.findOne(query, {
            projection: {
              email: 1,
              fullName: 1,
              role: 1,
              permissions: 1,
            },
          });

          if (!result) {
            return res.status(404).send({ message: "User not found" });
          }

          res.send(result);
        } catch (error) {
          console.error(
            "Error fetching Single Existing User Information:",
            error
          );
          res.status(500).send({
            message: "Failed to fetch Single Existing User Information",
            error: error.message,
          });
        }
      }
    );

    // after completed setup, put the information
    app.patch(
      "/complete-setup/:email",
      limiter,
      originChecker,
      async (req, res) => {
        try {
          const { email } = req.params; // Get email from URL parameter
          const { username, dob, password, fullName } = req.body; // Get username, dob, and password from request body

          // Validate if all required fields are provided
          if (!username) {
            return res.status(400).json({ error: "Username is required." });
          } else if (!dob) {
            return res
              .status(400)
              .json({ error: "Date of Birth is required." });
          } else if (!password) {
            return res.status(400).json({ error: "Password is required." });
          } else if (!fullName) {
            return res.status(400).json({ error: "Full Name is required." });
          }

          // Hash the password before storing it in the database
          const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

          // Check if the user with this email already exists
          const existingUser = await enrollmentCollection.findOne({ email });

          if (!existingUser) {
            return res.status(404).json({ error: "User not found." });
          }

          // Check if the username already exists in the database
          const usernameExists = await enrollmentCollection.findOne({
            username,
          });

          if (usernameExists) {
            return res.status(400).json({ error: "Username already exists." });
          }

          // Update the existing user's data with the new information
          const updatedUser = await enrollmentCollection.updateOne(
            { email },
            {
              $set: {
                username,
                fullName,
                dob,
                password: hashedPassword,
                isSetupComplete: true,
              },
            }
          );

          if (updatedUser.modifiedCount === 0) {
            return res
              .status(500)
              .json({ error: "Failed to update user information." });
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
      }
    );

    app.put(
      "/update-user-permissions/:id",
      verifyJWT,
      authorizeAccess(["Owner"], "Settings"),
      originChecker,
      async (req, res) => {
        try {
          const { id } = req.params;
          const query = { _id: new ObjectId(id) };
          const { permissions } = req.body;

          const updatedUserPermissions = {
            $set: {
              permissions,
            },
          };

          const result = await enrollmentCollection.updateOne(
            query,
            updatedUserPermissions
          );

          if (result.modifiedCount > 0) {
            res.send({
              success: true,
              message: "User permissions updated successfully",
            });
          } else {
            res.send({
              success: false,
              message: "No changes were made to user permissions",
            });
          }
        } catch (error) {
          console.error("Error updating user permission:", error);
          res.status(500).send({
            message: "Failed to update user permission",
            error: error.message,
          });
        }
      }
    );

    function getInitialPageFromPermissions(permissions) {
      const moduleToPathMap = {
        Dashboard: "/dashboard",
        Orders: "/orders",
        "Product Hub": "/product-hub/products/existing-products",
        Customers: "/customers",
        Finances: "/finances",
        Analytics: "/analytics",
        Marketing: "/marketing",
        "Supply Chain": "/supply-chain/zone/existing-zones",
        Settings: "/settings/enrollment",
      };

      for (const roleObj of permissions) {
        for (const [module, config] of Object.entries(roleObj.modules)) {
          if (config.access && moduleToPathMap[module]) {
            return moduleToPathMap[module];
          }
        }
      }

      // Fallback route
      return "/auth/restricted-access";
    }

    // backend dashboard log in via nextAuth
    app.post("/loginForDashboard", limiter, originChecker, async (req, res) => {
      const { emailOrUsername, password, otp } = req.body;

      try {
        // Find user by email OR username
        const user = await enrollmentCollection.findOne({
          $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
        });

        if (!user) {
          return res
            .status(401)
            .json({ message: "No account found with this email or username." });
        }
        if (!user.password) {
          return res.status(403).json({
            message:
              "Your account setup is incomplete. Please set up your password before logging in.",
          });
        }

        // Verify the password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res
            .status(401)
            .json({ message: "Incorrect password. Please try again." });
        }

        // ✅ If OTP should not be sent (trusted device), log in directly
        // if (isOtpShouldNotSend === "true" && otp === "") {
        //   return res.json({
        //     _id: user._id.toString(),
        //   });
        // }

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
            return res
              .clearCookie("refreshToken", {
                httpOnly: true,
                secure: true, // false for localhost
                sameSite: "None",
              })
              .status(401)
              .json({
                message:
                  "OTP has been sent to your email. Please enter the OTP to complete login.",
              });
          } catch (emailError) {
            console.error("Error sending OTP email:", emailError);
            return res.status(500).json({
              message: "Error sending OTP email. Please try again later.",
            });
          }
        } else {
          // OTP is provided; re-fetch the user document to ensure you have the latest OTP fields.
          const updatedUser = await enrollmentCollection.findOne({
            _id: user._id,
          });

          // Verify OTP fields exist
          if (!updatedUser.otp || !updatedUser.otpExpiresAt) {
            return res.status(400).json({
              message: "OTP expired or not found. Please try logging in again.",
            });
          }

          // Check if OTP is expired
          if (Date.now() > updatedUser.otpExpiresAt) {
            // Remove the expired OTP fields
            await enrollmentCollection.updateOne(
              { _id: user._id },
              { $unset: { otp: "", otpExpiresAt: "" } }
            );
            return res.status(400).json({
              message: "OTP has expired. Please try logging in again.",
            });
          }

          // Check if the provided OTP matches
          if (otp !== updatedUser.otp) {
            return res
              .status(400)
              .json({ message: "Invalid OTP. Please try again." });
          }

          // OTP is valid—remove the OTP fields and return user data
          await enrollmentCollection.updateOne(
            { _id: user._id },
            { $unset: { otp: "", otpExpiresAt: "" } }
          );

          const accessToken = jwt.sign(
            {
              _id: user._id,
            },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "5m" } // short-lived
          );

          const refreshToken = jwt.sign(
            { _id: user._id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: "7d" } // long-lived
          );

          const options = {
            httpOnly: true,
            secure: true, // ✅ MUST be false on localhost
            sameSite: "None", // ✅ Lax is safe for localhost
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          };

          const initialPage = getInitialPageFromPermissions(user.permissions);

          res.status(200).cookie("refreshToken", refreshToken, options).json({
            _id: user._id.toString(),
            accessToken,
            initialPage,
          });
        }
      } catch (error) {
        console.error("Login error:", error);
        return res
          .status(500)
          .json({ message: "Something went wrong. Please try again later." });
      }
    });

    app.post("/refresh-token-backend", originChecker, async (req, res) => {
      const refreshToken =
        req.cookies?.refreshToken ||
        req.header("Authorization")?.replace("Bearer ", "");

      if (!refreshToken) {
        return res.status(401).json({ message: "No refresh token" });
      }

      try {
        const decoded = await new Promise((resolve, reject) => {
          jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET,
            (err, decoded) => {
              if (err) return reject(err);
              resolve(decoded);
            }
          );
        });

        const user = await enrollmentCollection.findOne({
          _id: new ObjectId(decoded._id),
        });
        if (!user) return res.status(404).json({ message: "User not found" });

        const newAccessToken = jwt.sign(
          { _id: decoded._id },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "5m" }
        );

        return res.status(200).json({ accessToken: newAccessToken });
      } catch (err) {
        console.log("❌ Refresh failed:", err);
        return res
          .status(401)
          .json({ message: "Invalid or expired refresh token" });
      }
    });

    app.post("/refresh-token", originChecker, (req, res) => {
      // console.log("hit refresh");

      const refreshToken =
        req?.cookies?.refreshToken ||
        req.header("Authorization")?.replace("Bearer ", "");
      if (!refreshToken) {
        console.log("No refresh token sent!");
        return res.status(401).json({ message: "No refresh token" });
      }

      jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        (err, decoded) => {
          if (err) {
            console.log("❌ Invalid refresh token", err);
            return res.status(401).json({ message: "Invalid refresh token" });
          }

          const newAccessToken = jwt.sign(
            { _id: decoded._id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "5m" }
          );

          // console.log("refresh token generated");

          return res.json({ accessToken: newAccessToken });
        }
      );
    });

    app.post("/logout", originChecker, (req, res) => {
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: true, // false if on localhost
        sameSite: "None", // or "Lax" on localhost
      });

      res.status(200).json({ message: "Logged out" });
    });

    // Generate access token and refresh token for customer
    app.post(
      "/generate-customer-tokens",
      limiter,
      originChecker,
      async (req, res) => {
        const { email } = req.body;

        try {
          const user = await customerListCollection.findOne({ email });

          if (!user) {
            return res
              .status(404)
              .json({ message: "TokenError: No account found." });
          }

          const userPayload = { _id: user._id };

          const accessToken = jwt.sign(
            userPayload,
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "5m" }
          );

          const refreshToken = jwt.sign(
            userPayload,
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: "7d" }
          );

          return res.status(200).json({
            _id: user._id.toString(),
            email: user.email,
            name: user.userInfo?.personalInfo?.customerName,
            isLinkedWithCredentials: user.isLinkedWithCredentials,
            isLinkedWithGoogle: user.isLinkedWithGoogle,
            score: user.userInfo?.score,
            accessToken,
            refreshToken,
          });
        } catch (error) {
          console.error("Login error:", error);
          return res
            .status(500)
            .json({ message: "Something went wrong. Please try again later." });
        }
      }
    );

    // Verify customer login credentials
    app.post(
      "/verify-credentials-login",
      limiter,
      originChecker,
      async (req, res) => {
        const { email, password } = req.body;

        try {
          const user = await customerListCollection.findOne({ email });

          if (!user) {
            return res
              .status(404)
              .json({ message: "No account found with this email." });
          }

          const isPasswordValid = await bcrypt.compare(password, user.password);
          if (!isPasswordValid) {
            return res
              .status(401)
              .json({ message: "Incorrect password. Please try again." });
          }

          return res.status(200).json({ message: "Signed in successfully." });
        } catch (error) {
          console.error("Credentials login error:", error.message);
          return res
            .status(500)
            .json({ message: "Something went wrong. Please try again later." });
        }
      }
    );

    // Verify customer Google credentials
    app.post(
      "/verify-google-login",
      limiter,
      originChecker,
      async (req, res) => {
        const { email, name } = req.body;

        try {
          const user = await customerListCollection.findOne({ email });

          if (user) {
            return res.status(200).json({ message: "Signed in successfully." });
          } else {
            const customers = await customerListCollection
              .find({}, { projection: { "userInfo.customerId": 1, _id: 0 } })
              .toArray();

            const allCustomerIds = customers.map(
              (doc) => doc.userInfo?.customerId
            );

            const newUserData = {
              email,
              password: null,
              isLinkedWithCredentials: false,
              isLinkedWithGoogle: true,
              userInfo: {
                customerId: generateCustomerId(allCustomerIds),
                personalInfo: {
                  customerName: name,
                  email,
                  phoneNumber: "",
                  phoneNumber2: "",
                  hometown: "",
                },
                deliveryAddresses: [],
                savedDeliveryAddress: null,
                score: 0,
              },
              wishlistItems: [],
              cartItems: [],
            };

            const result = await customerListCollection.insertOne(newUserData);

            if (!result.acknowledged) {
              return res
                .status(500)
                .json({ message: "Failed to create an account." });
            }

            return res
              .status(201)
              .json({ message: "Account created successfully." });
          }
        } catch (error) {
          console.error("Google login error:", error.message);
          return res.status(500).json({ message: "Internal Server Error" });
        }
      }
    );

    // after completed setup, put the information
    app.post("/customer-signup", limiter, originChecker, async (req, res) => {
      try {
        const data = req.body;

        // Validate if all required fields are provided
        if (!data.email || !data.password) {
          return res
            .status(400)
            .json({ error: "Email and password are required." });
        }

        // Hash the password before storing it in the database
        const hashedPassword = await bcrypt.hash(data.password, 10); // 10 is the salt rounds

        // Check if the user with this email already exists
        const existingUser = await customerListCollection.findOne({
          email: data.email,
        });

        if (existingUser) {
          return res
            .status(401)
            .json({ error: "This account already exists." });
        }

        const customers = await customerListCollection
          .find({}, { projection: { "userInfo.customerId": 1, _id: 0 } })
          .toArray();

        const allCustomerIds = customers.map((doc) => doc.userInfo?.customerId);

        const newUserData = {
          email: data.email,
          password: hashedPassword,
          isLinkedWithCredentials: true,
          isLinkedWithGoogle: false,
          userInfo: {
            customerId: generateCustomerId(allCustomerIds),
            personalInfo: {
              customerName: data.name,
              email: data.email,
              phoneNumber: "",
              phoneNumber2: "",
              hometown: "",
            },
            deliveryAddresses: [],
            savedDeliveryAddress: null,
            score: 0,
          },
          wishlistItems: [],
          cartItems: [],
        };

        await customerListCollection.insertOne(newUserData);

        if (data.isNewsletterCheckboxSelected) {
          const isAlreadySubscribed = await newsletterCollection.findOne({
            email: data.email,
          });

          if (!isAlreadySubscribed)
            await newsletterCollection.insertOne({ email: data.email });
        }

        const name = data.name;
        const promoCode = "POSHAX10";
        const promoAmount = "10%";

        const mailResult = await transport.sendMail({
          from: `${process.env.WEBSITE_NAME} <${process.env.EMAIL_USER}>`,
          to: data.email,
          subject: `Welcome to ${process.env.WEBSITE_NAME}! Let's Get Posh!`,
          text: `
            Hi ${name},

            We are thrilled to have you join our fashion-forward platform, ${process.env.WEBSITE_NAME}!

            Expect exclusive drops, early access to new collections, and more!

            Use the code ${promoCode} at checkout to get ${promoAmount} off your first order.
          
            Start shopping now!

            Shop Now: ${process.env.MAIN_DOMAIN_URL}/shop
          
            Stay Posh
            ${process.env.WEBSITE_NAME} Team
          `,
          html: `
            <!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <link
                  href="https://fonts.googleapis.com/css2?family=Oxygen:wght@300;400;700&display=swap"
                  rel="stylesheet"
                />
              </head>
              <body style="font-family: 'Oxygen', sans-serif; margin: 0; padding: 0">
                <div
                  style="
                    width: 100%;
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    border-radius: 14px;
                    border: 1px solid #dfdfdf;
                    padding: 32px;
                  "
                >
                  <div
                    style="
                      text-align: center;
                      border-bottom: 1px solid #dfdfdf;
                      height: fit-content;
                    "
                  >
                    <h2
                      style="
                        color: #404040;
                        font-size: 1.5rem;
                        margin: 0;
                        padding-bottom: 10px;
                      "
                    >
                      Welcome to ${process.env.WEBSITE_NAME}! Let's Get Posh!
                    </h2>
                  </div>
                  <div>
                    <p
                      style="
                        color: #525252;
                        font-size: 1rem;
                        line-height: 1.6;
                        padding-top: 10px;
                      "
                    >
                      Hi ${name},
                    </p>
                    <p style="color: #525252; font-size: 1rem; line-height: 1.6">
                      We are thrilled to have you join our fashion-forward platform,
                      <strong>${process.env.WEBSITE_NAME}</strong>!
                    </p>
                    <p style="color: #525252; font-size: 1rem; line-height: 1.6">
                      Expect exclusive drops, early access to new collections, and more!
                    </p>
                    <p style="color: #525252; font-size: 1rem; line-height: 1.6">
                      Use the code <strong>${promoCode}</strong> at checkout to get ${promoAmount} off your first order.
                    </p>
                    <p style="color: #525252; font-size: 1rem; line-height: 1.6">
                      Start shopping now!
                    </p>
                    <table
                      role="presentation"
                      width="100%"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                    >
                      <tr>
                        <td align="center">
                          <a
                            href="${process.env.MAIN_DOMAIN_URL}/shop"
                            style="
                              display: inline-block;
                              font-size: 0.825rem;
                              font-weight: 700;
                              color: #404040;
                              background-color: #d4ffce;
                              padding: 12px 30px;
                              text-decoration: none;
                              border-radius: 8px;
                              margin-top: 12px;
                              margin-bottom: 24px;
                            "
                            >Shop Now</a
                          >
                        </td>
                      </tr>
                    </table>
                  </div>
                  <div
                    style="
                      text-align: center;
                      padding-top: 10px;
                      font-size: 0.825rem;
                      color: #737373;
                    "
                  >
                    <p>
                      Stay Posh
                      <span style="display: block; margin-top: 2px">${process.env.WEBSITE_NAME} Team</span>
                    </p>
                  </div>
                </div>
              </body>
            </html>
          `,
        });

        // Check if email was sent successfully
        if (!mailResult?.accepted?.length) {
          return res.status(500).json({
            success: false,
            message: "Failed to send the welcome email.",
          });
        }

        // Send response after the user information is updated
        res.status(200).json({ message: "Account created successfully." });
      } catch (error) {
        console.error("Customer Sign-up error:", error.message);
        res.status(500).json({
          message: error.message || "Something went wrong!",
        });
      }
    });

    // Send contact email
    app.post("/contact", limiter, originChecker, async (req, res) => {
      const { name, email, phone, topic, message } = req.body;

      const isRead = false;
      const date = new Date();
      const dateStr = moment().tz("Asia/Dhaka").format("YYYYMMDD"); // "20250713"

      const customerSupportCollection = client
        .db("fashion-commerce")
        .collection("customer-support");

      // Step 1: Count how many requests today already exist
      const countToday = await customerSupportCollection.countDocuments({
        supportId: { $regex: `^SUP-${dateStr}-` },
      });

      // Step 2: Format counter (001, 002, etc.)
      const paddedCounter = String(countToday + 1).padStart(3, "0");

      // Step 3: Generate supportId
      const supportId = `SUP-${dateStr}-${paddedCounter}`;

      const customerInput = {
        supportId,
        name,
        email,
        phone,
        topic,
        message,
        isRead,
        dateTime: date.toISOString(),
      };

      if (!name || !email || !phone || !topic || !message) {
        return res.status(400).json({
          success: false,
          message: "Required fields are not filled up.",
        });
      }

      try {
        const staffMailResult = await transport.sendMail({
          from: `${process.env.WEBSITE_NAME} <${process.env.EMAIL_USER}>`,
          to: "rahilbinmushfiq@gmail.com", // Need to change it to admin email(s)
          subject: `Contact Request from ${name.split(" ")[0]} — "${topic}"`,
          text: `Contact Request for ${process.env.WEBSITE_NAME}


          Name: ${name}
          Email: ${email}
          Mobile Number: ${phone}
          Topic: ${topic}
          Message:
          ${message}


          This message was sent via the ${process.env.WEBSITE_NAME} contact form. Please respond to it at your earliest convenience.


          — ${process.env.WEBSITE_NAME} Contact System`,
          html: `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <link
                href="https://fonts.googleapis.com/css2?family=Oxygen:wght@300;400;700&display=swap"
                rel="stylesheet"
              />
            </head>
            <body style="font-family: 'Oxygen', sans-serif; margin: 0; padding: 0">
              <div
                style="
                  width: 100%;
                  max-width: 600px;
                  margin: 0 auto;
                  background-color: #ffffff;
                  border-radius: 14px;
                  border: 1px solid #dfdfdf;
                  padding: 32px;
                "
              >
                <div style="text-align: center; border-bottom: 1px solid #dfdfdf">
                  <h2
                    style="
                      color: #404040;
                      font-size: 1.5rem;
                      margin: 0;
                      padding-bottom: 10px;
                    "
                  >
                    Contact Request for ${process.env.WEBSITE_NAME}
                  </h2>
                </div>
                <div style="padding-top: 20px">
                  <p style="color: #525252; font-size: 1rem; margin: 0 0 8px">
                    <strong>Name:</strong> ${name}
                  </p>
                  <p style="color: #525252; font-size: 1rem; margin: 0 0 8px">
                    <strong>Email:</strong>
                    <a href="mailto:${email}" style="color: #4d8944"
                      >${email}</a
                    >
                  </p>
                  <p style="color: #525252; font-size: 1rem; margin: 0 0 8px">
                    <strong>Mobile Number:</strong> ${phone}
                  </p>
                  <p style="color: #525252; font-size: 1rem; margin: 0 0 8px">
                    <strong>Topic:</strong> ${topic}
                  </p>
                  <div>
                    <p style="color: #525252; font-size: 1rem; margin: 0">
                      <strong>Message:</strong>
                    </p>
                    <p
                      style="
                        color: #404040;
                        background-color: #f8f8f8;
                        padding: 24px;
                        border-radius: 8px;
                        font-size: 1rem;
                      "
                    >
                      ${message}
                    </p>
                  </div>
                </div>
                <p style="margin-top: 36px; font-size: 0.825rem; color: #737373">
                  This message was sent via the ${process.env.WEBSITE_NAME} contact form. Please
                  respond to it at your earliest convenience.
                </p>
                <p style="font-size: 0.825rem; color: #737373">
                  — ${process.env.WEBSITE_NAME} Contact System
                </p>
              </div>
            </body>
          </html>
          `,
        });

        const userMailResult = await transport.sendMail({
          from: `${process.env.WEBSITE_NAME} <${process.env.EMAIL_USER}>`,
          to: email,
          subject: `${process.env.WEBSITE_NAME} Will Get Back to Your Soon`,
          text: `
            Hello ${name},
          
            You have reached out to us with your ${email} account regarding "${topic}". Someone will get back to you within 24-48 hours.
          
            If you didn't contact us, you can safely ignore this email.
          
            Best Regards,
            ${process.env.WEBSITE_NAME}
          `,
          html: `
            <!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <link
                  href="https://fonts.googleapis.com/css2?family=Oxygen:wght@300;400;700&display=swap"
                  rel="stylesheet"
                />
              </head>
              <body style="font-family: 'Oxygen', sans-serif; margin: 0; padding: 0">
                <div
                  style="
                    width: 100%;
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    border-radius: 14px;
                    border: 1px solid #dfdfdf;
                    padding: 32px;
                  "
                >
                  <div
                    style="
                      text-align: center;
                      border-bottom: 1px solid #dfdfdf;
                      height: fit-content;
                    "
                  >
                    <h2
                      style="
                        color: #404040;
                        font-size: 1.5rem;
                        margin: 0;
                        padding-bottom: 10px;
                      "
                    >
                      ${process.env.WEBSITE_NAME} Will Get Back to Your Soon
                    </h2>
                  </div>
                  <div>
                    <p
                      style="
                        color: #525252;
                        font-size: 1rem;
                        line-height: 1.6;
                        padding-top: 10px;
                      "
                    >
                      Hello ${name},
                    </p>
                    <p style="color: #525252; font-size: 1rem; line-height: 1.6">
                      You have reached out to us with your
                      <a href="mailto:${email}" style="color: #4d8944"
                        >${email}</a
                      >
                      account regarding "${topic}". Someone will get back to you
                      within 24-48 hours.
                    </p>
                    <p style="color: #525252; font-size: 1rem; line-height: 1.6">
                      If you didn't contact us, you can safely ignore this email.
                    </p>
                  </div>
                  <div
                    style="
                      text-align: center;
                      padding-top: 10px;
                      font-size: 0.825rem;
                      color: #737373;
                    "
                  >
                    <p>
                      Best Regards,
                      <span style="display: block; margin-top: 2px">${process.env.WEBSITE_NAME}</span>
                    </p>
                  </div>
                </div>
              </body>
            </html>
          `,
        });

        const isStaffMailSent =
          staffMailResult &&
          staffMailResult.accepted &&
          staffMailResult.accepted.length > 0;

        const isUserMailSent =
          userMailResult &&
          userMailResult.accepted &&
          userMailResult.accepted.length > 0;

        // Check if both staff and user emails were sent successfully
        if (isStaffMailSent && isUserMailSent) {
          // ✅ Now save to DB only if both emails were sent
          await customerSupportCollection.insertOne(customerInput);

          return res.status(200).json({
            success: true,
            message: "Submitted successfully. We'll contact you soon.",
          });
        } else {
          return res.status(500).json({
            success: false,
            message: "Failed to submit. Please try again.",
          });
        }
      } catch (error) {
        console.error("Error while sending contact form email:", error);
        res.status(500).json({
          success: false,
          message: "Something went wrong. Please try again.",
          error: error.message,
        });
      }
    });

    // Get All Customer Support Information's
    app.get(
      "/all-customer-support-information",
      verifyJWT,
      originChecker,
      async (req, res) => {
        try {
          const messages = await customerSupportCollection.find().toArray();

          messages.sort((a, b) => {
            const getLastActivity = (msg) => {
              if (Array.isArray(msg.replies) && msg.replies.length > 0) {
                const lastReply = msg.replies[msg.replies.length - 1];
                return new Date(lastReply.dateTime).getTime();
              }
              return new Date(msg.dateTime).getTime(); // fallback to message time
            };

            return getLastActivity(b) - getLastActivity(a); // Descending order
          });

          res.send(messages);
        } catch (error) {
          console.error(
            "Error fetching Customer Support Information's:",
            error
          );
          res.status(500).send({
            message: "Failed to fetch Customer Support Information's",
            error: error.message,
          });
        }
      }
    );

    app.post("/send-reply", verifyJWT, originChecker, async (req, res) => {
      const { messageId, supportReplyHtml } = req.body;

      if (!messageId) {
        return res.status(400).json({ error: "Missing messageId" });
      }
      if (!supportReplyHtml) {
        return res.status(400).json({ error: "Missing reply" });
      }

      try {
        const message = await customerSupportCollection.findOne({
          _id: new ObjectId(messageId),
        });

        if (!message) {
          return res.status(404).json({ error: "Support message not found" });
        }

        if (!message.supportId) {
          return res
            .status(400)
            .json({ error: "Missing supportId in original message" });
        }

        // Inject Support ID footer into the reply HTML
        const supportIdFooter = `
  <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
  <div style="font-family: Arial, sans-serif; font-size: 13px; color: #555; line-height: 1.6;">
    <p style="margin: 0 0 6px;">
      If you need further assistance, please reply to this message.
    </p>
    <p style="margin: 0; font-size: 12px; color: #888;">
      Support ID: <strong>${message.supportId}</strong><br />
      Please include this ID in any future communication for faster service.
    </p>
  </div>
`;

        // Combine original reply HTML + footer
        const fullHtml = `${supportReplyHtml}${supportIdFooter}`;

        // === 1. Save the reply in the database ===
        const replyEntry = {
          from: "support",
          html: fullHtml,
          dateTime: new Date().toISOString(),
        };

        const mailOptions = {
          from: `"PoshaX Support Team" <${process.env.SUPPORT_EMAIL}>`,
          to: message.email,
          subject: `Re: [${message.supportId}] ${message.topic}`,
          html: fullHtml,
        };

        const transport2 = nodemailer.createTransport({
          host: "smtp.mailgun.org",
          port: 587,
          auth: {
            user: "support@mg.poshax.shop",
            pass: process.env.EMAIL_PASS, // From Mailgun dashboard
          },
        });

        const mailResult = await transport2.sendMail(mailOptions);

        if (
          mailResult &&
          mailResult.accepted &&
          mailResult.accepted.length > 0
        ) {
          await customerSupportCollection.updateOne(
            { _id: new ObjectId(messageId) },
            { $push: { replies: replyEntry } }
          );
        }

        res.json({
          success: true,
          message: "Reply sent and saved successfully",
        });
      } catch (error) {
        console.error("Error sending reply:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.patch(
      "/mark-as-read-customer-support/:id",
      verifyJWT,
      originChecker,
      async (req, res) => {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid ID" });
        }

        try {
          const result = await customerSupportCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { isRead: true } }
          );

          if (result.modifiedCount === 0) {
            return res.status(404).json({
              success: false,
              message: "Message not found or already read.",
            });
          }

          res
            .status(200)
            .json({ success: true, message: "Marked as read successfully." });
        } catch (error) {
          console.error("Error marking message as read:", error);
          res.status(500).json({
            success: false,
            message: "Failed to mark as read",
            error: error.message,
          });
        }
      }
    );

    app.patch(
      "/mark-as-unread-customer-support",
      verifyJWT,
      originChecker,
      async (req, res) => {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
          return res
            .status(400)
            .json({ success: false, message: "No IDs provided." });
        }

        const invalidId = ids.find((id) => !ObjectId.isValid(id));
        if (invalidId) {
          return res
            .status(400)
            .json({ success: false, message: `Invalid ID: ${invalidId}` });
        }

        const objectIds = ids.map((id) => new ObjectId(id));

        try {
          const result = await customerSupportCollection.updateMany(
            { _id: { $in: objectIds } },
            { $set: { isRead: false } }
          );

          res.status(200).json({
            success: true,
            message: `${result.modifiedCount} message(s) marked as unread.`,
          });
        } catch (error) {
          console.error("Error marking messages as unread:", error);
          res.status(500).json({
            success: false,
            message: "Failed to mark as unread",
            error: error.message,
          });
        }
      }
    );

    // Set a user password in frontend
    app.put(
      "/user-set-password",
      verifyJWT,
      limiter,
      originChecker,
      async (req, res) => {
        try {
          const { email, newPassword } = req.body;

          // Find user by email from customer collection
          const user = await customerListCollection.findOne({ email });

          if (!user)
            return res.status(404).json({ message: "User not found." });

          // Check if the user already set a password
          if (user.password) {
            return res.status(400).json({
              message: "You already have a password set.",
            });
          }

          // Hash the new password
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(newPassword, salt);

          // Update the password and credentials link status in MongoDB
          const result = await customerListCollection.updateOne(
            { email },
            {
              $set: { password: hashedPassword, isLinkedWithCredentials: true },
            }
          );

          if (result.modifiedCount > 0) {
            return res.json({
              success: true,
              message: "Password set successfully.",
            });
          } else {
            return res.status(400).json({
              message: "Failed to set password. Please try again.",
            });
          }
        } catch (error) {
          console.error("Error changing password:", error);
          res.status(500).json({
            message: "Something went wrong. Please try again.",
          });
        }
      }
    );

    // Update user password in frontend
    app.put(
      "/user-update-password",
      verifyJWT,
      limiter,
      originChecker,
      async (req, res) => {
        try {
          const { email, oldPassword, newPassword } = req.body;

          // Find user by email from customer collection
          const user = await customerListCollection.findOne({ email });

          if (!user)
            return res.status(404).json({ message: "User not found." });

          // Check if the user is linked with Google only (no password set)
          if (!user.password && user.isLinkedWithGoogle) {
            return res.status(400).json({
              message:
                "Your account is linked with Google only. Please set a password first.",
            });
          }

          // Check if old password matches the stored hashed password
          const doesOldPasswordMatch = await bcrypt.compare(
            oldPassword,
            user.password
          );
          if (!doesOldPasswordMatch)
            return res.status(400).json({
              message: "Your current password is incorrect.",
            });

          // Check if new password matches the stored hashed password
          const doesNewPasswordMatch = await bcrypt.compare(
            newPassword,
            user.password
          );
          if (doesNewPasswordMatch)
            return res.status(401).json({
              message: "Your current and new passwords cannot be same.",
            });

          // Hash the new password
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(newPassword, salt);

          // Update the password in MongoDB
          const result = await customerListCollection.updateOne(
            { email },
            { $set: { password: hashedPassword } }
          );

          if (result.modifiedCount > 0) {
            return res.json({
              success: true,
              message: "Password updated successfully.",
            });
          } else {
            return res.status(400).json({
              message: "Failed to update password. Please try again.",
            });
          }
        } catch (error) {
          console.error("Error changing password:", error);
          res.status(500).json({
            message: "Something went wrong. Please try again.",
          });
        }
      }
    );

    // Send password reset email
    app.put(
      "/request-password-reset",
      limiter,
      originChecker,
      async (req, res) => {
        const { email } = req.body;

        if (!email) {
          return res
            .status(400)
            .json({ success: false, message: "Email is required." });
        }

        try {
          const userData = await customerListCollection.findOne({ email });

          if (!userData) {
            return res
              .status(404)
              .json({ success: false, message: "User not found." });
          }

          // Generate token and expiry time
          const token = crypto.randomBytes(32).toString("hex");
          const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");
          const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // Expires in 30 mins

          const result = await customerListCollection.updateOne(
            { email },
            {
              $set: {
                passwordReset: {
                  token: hashedToken,
                  expiresAt: expiresAt,
                },
              },
            }
          );

          if (!result.modifiedCount)
            return res.status(500).json({
              success: false,
              message: "Failed to create a token for password reset.",
            });

          const resetLink = `${process.env.MAIN_DOMAIN_URL}/reset-password?token=${token}`;
          const fullName = userData?.userInfo?.personalInfo?.customerName;

          const mailResult = await transport.sendMail({
            from: `${process.env.WEBSITE_NAME} <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Reset Password for ${process.env.WEBSITE_NAME}`,
            text: `Hello ${fullName},
            
              You have requested to reset your ${process.env.WEBSITE_NAME} password for your ${email} account. Please use the button below to reset your password:
            
              Reset Link: ${resetLink}
            
              Please note that this is valid for **30 minutes**. If you didn't ask to reset your password, you can safely ignore this email.
            
              Thanks,  
              ${process.env.WEBSITE_NAME} Team`,
            html: `
              <!DOCTYPE html>
              <html lang="en">
                <head>
                  <meta charset="UTF-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                  <link
                    href="https://fonts.googleapis.com/css2?family=Oxygen:wght@300;400;700&display=swap"
                    rel="stylesheet"
                  />
                </head>
                <body style="font-family: 'Oxygen', sans-serif; margin: 0; padding: 0">
                  <div
                    style="
                      width: 100%;
                      max-width: 600px;
                      margin: 0 auto;
                      background-color: #ffffff;
                      border-radius: 14px;
                      border: 1px solid #dfdfdf;
                      padding: 32px;
                    "
                  >
                    <div
                      style="
                        text-align: center;
                        border-bottom: 1px solid #dfdfdf;
                        height: fit-content;
                      "
                    >
                      <h2
                        style="
                          color: #404040;
                          font-size: 1.5rem;
                          margin: 0;
                          padding-bottom: 10px;
                        "
                      >
                        Reset Password for ${process.env.WEBSITE_NAME}
                      </h2>
                    </div>
                    <div>
                      <p
                        style="
                          color: #525252;
                          font-size: 1rem;
                          line-height: 1.6;
                          padding-top: 10px;
                        "
                      >
                        Hello ${fullName},
                      </p>
                      <p style="color: #525252; font-size: 1rem; line-height: 1.6">
                        You have requested to reset your ${process.env.WEBSITE_NAME} password for your
                        <a href="mailto:${email}" style="color: #4d8944"
                          >${email}</a
                        >
                        account. Please use the button below to reset your password:
                      </p>
                      <table
                        role="presentation"
                        width="100%"
                        cellspacing="0"
                        cellpadding="0"
                        border="0"
                      >
                        <tr>
                          <td align="center">
                            <a
                              href="${resetLink}"
                              style="
                                display: inline-block;
                                font-size: 0.825rem;
                                font-weight: 700;
                                color: #404040;
                                background-color: #d4ffce;
                                padding: 12px 30px;
                                text-decoration: none;
                                border-radius: 8px;
                                margin-top: 12px;
                                margin-bottom: 24px;
                              "
                              >Reset Password</a
                            >
                          </td>
                        </tr>
                      </table>
                      <p style="color: #525252; font-size: 1rem; line-height: 1.6">
                        Please note that this is valid for <strong>30 minutes</strong>. If you
                        didn't ask to reset your password, you can safely ignore this email.
                      </p>
                    </div>
                    <div
                      style="
                        text-align: center;
                        padding-top: 10px;
                        font-size: 0.825rem;
                        color: #737373;
                      "
                    >
                      <p>
                        Best Regards,<span style="display: block; margin-top: 2px"
                          >${process.env.WEBSITE_NAME} Team</span
                        >
                      </p>
                    </div>
                  </div>
                </body>
              </html>`,
          });

          // Check if email was sent successfully
          if (
            mailResult &&
            mailResult.accepted &&
            mailResult.accepted.length > 0
          ) {
            return res.status(200).json({
              success: true,
              message: "Password reset email sent successfully.",
            });
          } else {
            return res.status(500).json({
              success: false,
              message: "Failed to send password reset email.",
            });
          }
        } catch (error) {
          console.error("Error while requesting for password reset:", error);
          res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again.",
            error: error.message,
          });
        }
      }
    );

    // Validate token for password reset
    app.put(
      "/validate-reset-token",
      limiter,
      originChecker,
      async (req, res) => {
        const { token } = req.body;

        if (!token) {
          return res
            .status(400)
            .json({ success: false, message: "Your token is invalid token." });
        }

        try {
          const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

          const user = await customerListCollection.findOne({
            "passwordReset.token": hashedToken,
            "passwordReset.expiresAt": { $gt: new Date() },
          });

          if (!user) {
            await customerListCollection.updateOne(
              { "passwordReset.token": hashedToken },
              { $unset: { passwordReset: "" } }
            );

            return res.status(400).json({
              success: false,
              message: "Your token is either invalid or it has been expired.",
            });
          }

          return res.status(200).json({
            success: true,
            message: "Token is valid.",
            email: user.email,
          });
        } catch (error) {
          console.error("Error validating reset token:", error);
          res.status(500).json({
            success: false,
            message: "Something went wrong.",
            error: error.message,
          });
        }
      }
    );

    // Reset user password
    app.put("/reset-password", limiter, originChecker, async (req, res) => {
      const { token, newPassword } = req.body;

      if (!token)
        return res
          .status(400)
          .json({ success: false, message: "Invalid token." });

      if (!newPassword) {
        return res
          .status(400)
          .json({ success: false, message: "New password are required." });
      }

      try {
        const hashedToken = crypto
          .createHash("sha256")
          .update(token)
          .digest("hex");

        const user = await customerListCollection.findOne({
          "passwordReset.token": hashedToken,
          "passwordReset.expiresAt": { $gt: new Date() },
        });

        if (!user) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid or expired token." });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Reset password and remove token
        const result = await customerListCollection.updateOne(
          { email: user.email },
          {
            $set: { password: hashedPassword },
            $unset: { passwordReset: "" },
          }
        );

        if (result.modifiedCount > 0) {
          return res.status(200).json({
            success: true,
            message: "Password reset successfully.",
          });
        } else {
          return res.status(400).json({
            success: false,
            message: "Failed to reset password. Please try again.",
          });
        }
      } catch (error) {
        console.error("Error resetting password:", error);
        res.status(500).json({
          success: false,
          message: "Something went wrong.",
          error: error.message,
        });
      }
    });

    // Change Password Endpoint
    app.put(
      "/change-password",
      verifyJWT,
      limiter,
      originChecker,
      async (req, res) => {
        try {
          const { userId, currentPassword, newPassword } = req.body;

          // Check if email is provided
          if (!userId) {
            return res
              .status(400)
              .json({ message: "Some fields are required" });
          }
          if (!currentPassword) {
            return res
              .status(400)
              .json({ message: "Current password is required" });
          }
          if (!newPassword) {
            return res
              .status(400)
              .json({ message: "New password is required" });
          }

          if (currentPassword === newPassword)
            return res.status(400).json({
              message: "New Password should not matched with current password",
            });

          // Find user by email in the enrollmentCollection
          const objectId = new ObjectId(userId);
          const user = await enrollmentCollection.findOne({ _id: objectId });

          if (!user) return res.status(404).json({ message: "User not found" });

          if (!user.password)
            return res.status(403).json({
              message:
                "Your account setup is incomplete. Please set up your password before logging in.",
            });

          // Check if current password matches the stored hashed password
          const isMatch = await bcrypt.compare(currentPassword, user.password);
          if (!isMatch)
            return res.status(400).json({
              message:
                "Your current password is incorrect. Please double-check and try again.",
            });

          // Hash the new password
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(newPassword, salt);

          // Update the password in MongoDB
          const result = await enrollmentCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { password: hashedPassword } }
          );

          if (result.modifiedCount > 0) {
            return res.json({
              success: true,
              message: "Password changed successfully.",
            });
          } else {
            return res.status(400).json({
              message: "No changes detected. Your password remains the same.",
            });
          }
        } catch (error) {
          console.error("Error changing password:", error);
          res.status(500).json({
            message: "Something went wrong on our end. Please try again later.",
          });
        }
      }
    );

    // delete single user
    app.delete(
      "/delete-existing-user/:id",
      verifyJWT,
      authorizeAccess(["Owner"], "Settings"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const query = { _id: new ObjectId(id) };
          const result = await enrollmentCollection.deleteOne(query);

          if (result.deletedCount === 0) {
            return res.status(404).send({ message: "User not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error deleting user:", error);
          res
            .status(500)
            .send({ message: "Failed to delete user", error: error.message });
        }
      }
    );

    // post a product
    app.post(
      "/addProduct",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const productData = req.body;
          const result = await productInformationCollection.insertOne(
            productData
          );
          res.send(result);
        } catch (error) {
          console.error("Error adding product:", error);
          res
            .status(500)
            .send({ message: "Failed to add product", error: error.message });
        }
      }
    );

    // get all products
    app.get("/allProducts", originChecker, async (req, res) => {
      try {
        const result = await productInformationCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching products:", error);
        res
          .status(500)
          .send({ message: "Failed to fetch products", error: error.message });
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
          publishDate: 1,
        };

        // Fetch all products with the specified fields
        const result = await productInformationCollection
          .find({}, { projection }) // Apply projection here
          .toArray();

        res.send(result);
      } catch (error) {
        console.error("Error fetching product details:", error);
        res.status(500).send({
          message: "Failed to fetch product details",
          error: error.message,
        });
      }
    });

    // Get all unique sizes
    app.get("/allSizes", async (req, res) => {
      try {
        // Fetch all products
        const products = await productInformationCollection.find().toArray();

        // Extract all sizes from the products
        const allSizes = products.flatMap((product) => product.allSizes || []);

        // Create a unique set of sizes
        const uniqueSizes = [...new Set(allSizes)];

        // Respond with both arrays
        res.send(uniqueSizes);
      } catch (error) {
        console.error("Error fetching sizes:", error);
        res
          .status(500)
          .send({ message: "Failed to fetch sizes", error: error.message });
      }
    });

    // Get all unique color names
    app.get("/allUniqueColors", async (req, res) => {
      try {
        // Fetch all products
        const products = await productInformationCollection.find().toArray();

        // Extract all color names from the availableColors array
        const allColors = products.flatMap(
          (product) =>
            product.availableColors?.map((color) => color.value) || []
        );

        // Create a unique set of color names
        const uniqueColors = [...new Set(allColors)];

        // Respond with the unique color names
        res.send(uniqueColors);
      } catch (error) {
        console.error("Error fetching colors:", error);
        res
          .status(500)
          .send({ message: "Failed to fetch colors", error: error.message });
      }
    });

    // get single product info
    app.get("/singleProduct/:id", originChecker, async (req, res) => {
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
        res.status(500).send({
          message: "Failed to fetch Product Details",
          error: error.message,
        });
      }
    });

    // get single product info
    app.get(
      "/productFromCategory/:categoryName",
      verifyJWT,
      authorizeAccess([], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const categoryName = req.params.categoryName;
          const query = { category: categoryName };
          const result = await productInformationCollection
            .find(query)
            .toArray();

          if (!result) {
            return res.status(404).send({ message: "Product not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error fetching Product Details:", error);
          res.status(500).send({
            message: "Failed to fetch Product Details",
            error: error.message,
          });
        }
      }
    );

    // update a single product details
    app.put(
      "/editProductDetails/:id",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const { _id, ...productDetails } = req.body;
          const filter = { _id: new ObjectId(id) };

          // Use moment-timezone to format dateTime
          const now = moment().tz("Asia/Dhaka");
          const dateTimeFormat = now.format("MMM D, YYYY | h:mm A");
          const dateTime = parseDate(dateTimeFormat); // This gives you a Date object

          // 1. Fetch the current product (before update)
          const existingProduct = await productInformationCollection.findOne(
            filter
          );

          if (!existingProduct) {
            return res.status(404).send({ message: "Product not found" });
          }

          // 2. Update the product
          const result = await productInformationCollection.updateOne(filter, {
            $set: { ...productDetails },
          });

          // 3. Find product variants whose sku updated from 0 ➔ > 0
          const oldVariants = existingProduct.productVariants || [];
          const newVariants = productDetails.productVariants || [];

          const updatedVariants = [];

          oldVariants.forEach((oldVariant) => {
            const matchingNewVariant = newVariants.find(
              (newVariant) =>
                oldVariant.color.color === newVariant.color.color &&
                oldVariant.size === newVariant.size &&
                oldVariant.location === newVariant.location
            );

            // console.log(matchingNewVariant, "matchingNewVariant");

            if (matchingNewVariant) {
              if (oldVariant.sku === 0 && matchingNewVariant.sku > 0) {
                updatedVariants.push({
                  colorCode: oldVariant.color.color, // e.g., "#3B7A57"
                  size: oldVariant.size,
                  productId: id,
                });
              }
            }
          });

          // console.log(updatedVariants, "updatedVariants");

          if (updatedVariants.length > 0) {
            // 4. For each updated variant, find matching availabilityNotifications
            for (const variant of updatedVariants) {
              const { colorCode, size, productId } = variant;

              const notificationDoc = await availabilityNotifications.findOne({
                productId: productId,
                colorCode: colorCode,
                size: size,
              });

              // console.log(notificationDoc, "notificationDoc");

              if (notificationDoc) {
                const emailsToNotify = notificationDoc.emails.filter(
                  (emailObj) => emailObj.notified === false
                );

                // console.log(emailsToNotify, "emailsToNotify");

                for (const emailObj of emailsToNotify) {
                  const { email, notified } = emailObj;

                  // Skip already notified emails
                  if (notified) continue;

                  // Create a cart URL with the product info
                  const cartLink = `${
                    process.env.MAIN_DOMAIN_URL
                  }/shop?productId=${productId}&colorCode=${encodeURIComponent(
                    colorCode
                  )}&size=${encodeURIComponent(size)}`;

                  try {
                    const mailResult = await transport.sendMail({
                      from: `${process.env.WEBSITE_NAME} <${process.env.EMAIL_USER}>`,
                      to: email,
                      subject:
                        "Good news! The product you wanted is back in stock!",
                      text: `Hello ${email},
        
                    The product you requested is now available!
    
                    🔗 Add to cart: ${cartLink}
        
                    If you did not expect this email, you can safely ignore this email.
        
                    Best Regards,  
                    ${process.env.WEBSITE_NAME} Team`,
                      html: `<!DOCTYPE html>
                          <html lang="en">
                          <head>
                          <meta charset="UTF-8">
                          <meta name="viewport" content="width=device-width, initial-scale=1.0">
                          <title>Invitation - ${process.env.WEBSITE_NAME}</title>
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
                          <h1>Welcome to ${process.env.WEBSITE_NAME}!</h1>
                      </div>
                        <div class="content">
                          <p>Hello <strong>${email}</strong>,</p>
                          <p>The product you requested is now available! You can now add to cart that item :</p>
                           <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                           <tr>
                            <td align="center">
                               <a href="${cartLink}" class="cta-button">Add to cart</a>
                            </td>
                           </tr>
                          </table>
        
                          <p>If you weren't expecting this email, you can ignore this email.</p>
                    
                        </div>
                        <div class="footer">
                          <p>Best Regards, <br><strong>${process.env.WEBSITE_NAME} Team</strong></p>
                        </div>
                      </div>
                      </body>
                      </html>`,
                    });

                    // Check if email was sent successfully (you can use mailResult.accepted to confirm if the email was delivered)
                    if (
                      mailResult &&
                      mailResult.accepted &&
                      mailResult.accepted.length > 0
                    ) {
                      // Update notified:true inside emails array
                      await availabilityNotifications.updateOne(
                        {
                          _id: new ObjectId(notificationDoc._id),
                          "emails.email": email,
                        },
                        {
                          $set: {
                            "emails.$.notified": true,
                            updatedDateTime: dateTime,
                          },
                        }
                      );

                      // return res.status(200).json({
                      //   success: true,
                      //   message: "Invitation sent successfully!",
                      //   userData: result,
                      //   emailStatus: mailResult,
                      // });
                    }
                  } catch (emailError) {
                    console.error(
                      `Failed to send email to ${email}:`,
                      emailError.message
                    );
                  }
                }
              }
            }
          }

          // After update
          if (result.modifiedCount > 0) {
            res.send({
              success: true,
              message: "Product updated successfully",
              modifiedCount: result.modifiedCount,
            });
          } else {
            res.send({
              success: false,
              message: "No changes made",
              modifiedCount: result.modifiedCount,
            });
          }
        } catch (error) {
          console.error("Error updating product details:", error);
          res.status(500).send({
            message: "Failed to update product details",
            error: error.message,
          });
        }
      }
    );

    // POST /getProductNames
    app.post(
      "/getProductIds",
      verifyJWT,
      authorizeAccess([], "Orders", "Product Hub"),
      originChecker,
      async (req, res) => {
        const { ids } = req.body; // array of productIds

        if (!Array.isArray(ids)) {
          return res
            .status(400)
            .send({ message: "Invalid request. 'ids' should be an array." });
        }

        try {
          const objectIds = ids.map((id) => new ObjectId(String(id)));
          const products = await productInformationCollection
            .find({ _id: { $in: objectIds } })
            .project({ _id: 1, productId: 1 }) // or use 'name' based on your schema
            .toArray();

          res.send(products);
        } catch (error) {
          console.error("Error fetching product names:", error);
          res.status(500).send({
            message: "Failed to fetch product names",
            error: error.message,
          });
        }
      }
    );

    // for availability info, sorting
    const parseDate = (dateTimeString) => {
      const [date, time] = dateTimeString.split(" | ");
      return moment(date + " " + time, "MMM D, YYYY h:mm A").toDate();
    };

    // Function to format and convert the date (24-hour system)
    const convertToDateTime = (dateTimeString) => {
      // Correct format: DD-MM-YY | HH:mm
      const parsedDate = moment.tz(
        dateTimeString,
        "DD-MM-YY | HH:mm",
        true,
        "Asia/Dhaka"
      );

      if (!parsedDate.isValid()) {
        console.error("Invalid date format:");
        return null;
      }

      const isoDate = parsedDate.toISOString();
      return isoDate;
    };

    // get all availability info
    app.get(
      "/get-all-availability-notifications",
      originChecker,
      async (req, res) => {
        try {
          const notifications = await availabilityNotifications
            .find()
            .toArray();
          res.send(notifications);
        } catch (error) {
          console.error("Error fetching availability info:", error);
          res.status(500).send({
            message: "Failed to fetch availability info",
            error: error.message,
          });
        }
      }
    );

    // POST: Add customer to product's notification list
    app.post(
      "/add-availability-notifications",
      limiter,
      originChecker,
      async (req, res) => {
        try {
          const { productId, size, colorCode, email } = req.body;

          if (!productId || !size || !colorCode || !email) {
            return res.status(400).send({ error: "Missing required fields" });
          }

          // Use moment-timezone to format dateTime
          const now = moment().tz("Asia/Dhaka");
          const dateTimeFormat = now.format("MMM D, YYYY | h:mm A");
          const dateTime = parseDate(dateTimeFormat); // This gives you a Date object

          const existingDoc = await availabilityNotifications.findOne({
            productId,
            size,
            colorCode,
          });

          if (existingDoc) {
            const alreadyExists = existingDoc.emails.some(
              (entry) => entry.email === email
            );

            if (alreadyExists) {
              return res.status(409).send({ message: "Already subscribed" });
            }

            const result = await availabilityNotifications.updateOne(
              { productId, size, colorCode },
              {
                $push: {
                  emails: {
                    email,
                    notified: false,
                    isRead: false,
                    dateTime,
                  },
                },
              }
            );

            return res.status(200).send(result);
          } else {
            const newEntry = {
              productId,
              size,
              colorCode,
              emails: [
                {
                  email,
                  notified: false,
                  isRead: false,
                  dateTime,
                },
              ],
            };

            const result = await availabilityNotifications.insertOne(newEntry);
            return res.status(201).send(result);
          }
        } catch (error) {
          console.error("Error adding availability notification:", error);
          res.status(500).send({ error: "Failed to add notification request" });
        }
      }
    );

    const hasModuleAccess = (permissionsArray, moduleName) => {
      return permissionsArray.some(
        (role) => role.modules?.[moduleName]?.access === true
      );
    };

    function isValidDate(date) {
      return date && !isNaN(new Date(date).getTime());
    }

    function isWithinLast3Days(dateString) {
      const date = new Date(dateString);
      if (isNaN(date)) return false; // this alone is enough
      const now = new Date();
      const diffTime = now - date;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays <= 3;
    }

    // get all notifications e,g. (products, orders)
    app.get(
      "/get-merged-notifications",
      verifyJWT,
      authorizeAccess([], "Orders", "Product Hub"),
      originChecker,
      async (req, res) => {
        const { email } = req.query;

        if (!email) return res.status(400).json({ error: "Email is required" });

        try {
          const user = await enrollmentCollection.findOne({ email });

          if (!user) return res.status(404).json({ error: "User not found" });

          const notifications = await availabilityNotifications
            .find({})
            .toArray();
          const orders = await orderListCollection
            .find({
              orderStatus: { $in: ["Pending", "Return Requested"] },
            })
            .toArray();

          const notificationEntries = notifications.flatMap((doc) =>
            doc.emails
              .filter(
                (email) =>
                  !doc.updatedDateTime || isWithinLast3Days(doc.updatedDateTime)
              )
              .map((email) => ({
                type: "Notified",
                email: email?.email,
                dateTime: isValidDate(email.dateTime)
                  ? new Date(email.dateTime).toISOString()
                  : null,
                updatedDateTime: isValidDate(doc?.updatedDateTime)
                  ? new Date(doc.updatedDateTime).toISOString()
                  : null,
                productId: doc.productId,
                size: doc.size,
                colorCode: doc.colorCode,
                notified: email.notified,
                isRead: email.isRead,
                orderNumber: null,
                orderStatus: null,
              }))
          );

          const orderEntries = orders.map((order) => ({
            type: "Ordered",
            email: order?.customerInfo?.email,
            dateTime:
              order.orderStatus === "Return Requested"
                ? convertToDateTime(order.returnInfo.dateTime)
                : convertToDateTime(order.dateTime),
            updatedDateTime: null,
            productId: "",
            size: null,
            colorCode: null,
            notified: null,
            isRead:
              order.orderStatus === "Return Requested"
                ? order.returnInfo.isRead || null
                : order.isRead || null,
            orderNumber: order.orderNumber,
            orderStatus: order.orderStatus,
          }));

          const mergedNotifications = [...notificationEntries, ...orderEntries];

          // Sort by dateTime (newest first)
          mergedNotifications.sort((a, b) => {
            const dateA = new Date(a.dateTime);
            const dateB = new Date(b.dateTime);
            return dateB - dateA; // For newest first. Use dateA - dateB for oldest first
          });

          // Filter based on permissions
          const filteredNotifications = mergedNotifications.filter(
            (notification) => {
              if (notification.type === "Notified") {
                // Requires access to "Product Hub"
                return hasModuleAccess(user.permissions, "Product Hub");
              } else if (notification.type === "Ordered") {
                // Requires access to "Orders"
                return hasModuleAccess(user.permissions, "Orders");
              }
              return false; // Block unknown types
            }
          );

          res.json(filteredNotifications);
        } catch (error) {
          console.error("Error merging notifications:", error);
          res
            .status(500)
            .json({ message: "Server error merging notifications." });
        }
      }
    );

    app.post(
      "/mark-notification-read",
      verifyJWT,
      authorizeAccess([], "Orders", "Product Hub"),
      originChecker,
      async (req, res) => {
        const { type, orderNumber, productId, dateTime, email, orderStatus } =
          req.body;

        try {
          if (type === "Ordered" && orderStatus === "Pending") {
            await orderListCollection.updateOne(
              { orderNumber },
              { $set: { isRead: true } }
            );
          } else if (type === "Ordered" && orderStatus === "Return Requested") {
            await orderListCollection.updateOne(
              { orderNumber },
              { $set: { "returnInfo.isRead": true } }
            );
          } else if (type === "Notified") {
            await availabilityNotifications.updateOne(
              {
                productId,
                "emails.email": email,
              },
              {
                $set: { "emails.$.isRead": true },
              }
            );
          }

          res.status(200).json({ message: "Notification marked as read" });
        } catch (error) {
          console.error("Error updating isRead:", error);
          res.status(500).json({ message: "Failed to update notification" });
        }
      }
    );

    // post vendors
    app.post(
      "/addVendor",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const vendors = req.body; // Should be an array
          const result = await vendorCollection.insertOne(vendors);
          res.send(result); // Send 201 status on success
        } catch (error) {
          console.error("Error adding vendors:", error);
          res.status(500).send({ error: "Failed to add vendors" }); // Send 500 status on error
        }
      }
    );

    // post policy pages pdfs
    app.post(
      "/add-policy-pdfs",
      verifyJWT,
      authorizeAccess(["Owner"], "Settings"),
      originChecker,
      async (req, res) => {
        try {
          const pdfs = req.body; // Should be an array
          const result = await policyPagesCollection.insertOne(pdfs);
          res.send(result); // Send 201 status on success
        } catch (error) {
          console.error("Error adding pdfs:", error);
          res.status(500).send({ error: "Failed to add pdfs" }); // Send 500 status on error
        }
      }
    );

    // get single policy pages pdfs
    app.get("/get-single-policy-pdfs/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await policyPagesCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Policy pdfs not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching Policy pdfs:", error);
        res.status(500).send({
          message: "Failed to fetch Policy pdfs",
          error: error.message,
        });
      }
    });

    // Get All Policy Pages Pdfs
    app.get("/get-all-policy-pdfs", originChecker, async (req, res) => {
      try {
        const result = await policyPagesCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching Policy pdfs:", error);
        res.status(500).send({
          message: "Failed to fetch Policy pdfs",
          error: error.message,
        });
      }
    });

    // edit policy pages pdf
    app.put(
      "/edit-policy-pdfs/:id",
      verifyJWT,
      authorizeAccess(["Owner"], "Settings"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const policiesData = req.body;
          const filter = { _id: new ObjectId(id) };
          const updatedPoliciesPdfs = {
            $set: { ...policiesData },
          };

          const result = await policyPagesCollection.updateOne(
            filter,
            updatedPoliciesPdfs
          );

          res.send(result);
        } catch (error) {
          console.error("Error updating policy pages pdfs:", error);
          res.status(500).send({
            message: "Failed to update policy pages pdfs",
            error: error.message,
          });
        }
      }
    );

    // delete single vendor
    app.delete(
      "/deleteVendor/:id",
      verifyJWT,
      authorizeAccess(["Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
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
          res
            .status(500)
            .send({ message: "Failed to delete vendor", error: error.message });
        }
      }
    );

    // get all vendors
    app.get(
      "/allVendors",
      verifyJWT,
      authorizeAccess([], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const result = await vendorCollection.find().toArray();
          res.send(result);
        } catch (error) {
          console.error("Error fetching vendors:", error);
          res
            .status(500)
            .send({ message: "Failed to fetch vendors", error: error.message });
        }
      }
    );

    // get single vendor info
    app.get(
      "/getSingleVendorDetails/:id",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
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
          res
            .status(500)
            .send({ message: "Failed to fetch Vendor", error: error.message });
        }
      }
    );

    //update a single vendor info
    app.put(
      "/editVendor/:id",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const vendorData = req.body;
          const filter = { _id: new ObjectId(id) };
          const updatedVendorDetails = {
            $set: { ...vendorData },
          };

          const result = await vendorCollection.updateOne(
            filter,
            updatedVendorDetails
          );

          res.send(result);
        } catch (error) {
          console.error("Error updating this vendor:", error);
          res.status(500).send({
            message: "Failed to update this vendor",
            error: error.message,
          });
        }
      }
    );

    // post tags
    app.post(
      "/addTag",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const tags = req.body; // Should be an array
          if (!Array.isArray(tags)) {
            return res.status(400).send({ error: "Expected an array of tags" });
          }
          const result = await tagCollection.insertMany(tags);
          res.status(201).send(result); // Send 201 status on success
        } catch (error) {
          console.error("Error adding tags:", error);
          res.status(500).send({ error: "Failed to add tags" }); // Send 500 status on error
        }
      }
    );

    // delete single tag
    app.delete(
      "/deleteTag/:id",
      verifyJWT,
      authorizeAccess(["Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
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
          res
            .status(500)
            .send({ message: "Failed to delete tag", error: error.message });
        }
      }
    );

    // get all tags
    app.get(
      "/allTags",
      verifyJWT,
      authorizeAccess([], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const result = await tagCollection.find().toArray();
          res.send(result);
        } catch (error) {
          console.error("Error fetching tags:", error);
          res
            .status(500)
            .send({ message: "Failed to fetch tags", error: error.message });
        }
      }
    );

    // post colors
    app.post(
      "/addColor",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const colors = req.body; // Should be an array
          if (!Array.isArray(colors)) {
            return res
              .status(400)
              .send({ error: "Expected an array of colors" });
          }
          const result = await colorCollection.insertMany(colors);
          res.status(201).send(result); // Send 201 status on success
        } catch (error) {
          console.error("Error adding colors:", error);
          res.status(500).send({ error: "Failed to add colors" }); // Send 500 status on error
        }
      }
    );

    // delete single color
    app.delete(
      "/deleteColor/:id",
      verifyJWT,
      authorizeAccess(["Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
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
          res
            .status(500)
            .send({ message: "Failed to delete color", error: error.message });
        }
      }
    );

    // get all colors
    app.get(
      "/allColors",
      verifyJWT,
      authorizeAccess([], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const result = await colorCollection.find().toArray();
          res.send(result);
        } catch (error) {
          console.error("Error fetching colors:", error);
          res
            .status(500)
            .send({ message: "Failed to fetch colors", error: error.message });
        }
      }
    );

    // Add a season
    app.post(
      "/addSeason",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
        const seasonData = req.body;
        try {
          const result = await seasonCollection.insertOne(seasonData);
          res.status(201).send(result);
        } catch (error) {
          console.error("Error adding season:", error);
          res
            .status(500)
            .send({ message: "Failed to add season", error: error.message });
        }
      }
    );

    // Get All Seasons
    app.get(
      "/allSeasons",
      verifyJWT,
      authorizeAccess([], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const seasons = await seasonCollection.find().toArray();
          res.status(200).send(seasons);
        } catch (error) {
          res.status(500).send(error.message);
        }
      }
    );

    // get single season info
    app.get(
      "/allSeasons/:id",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
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
          res
            .status(500)
            .send({ message: "Failed to fetch season", error: error.message });
        }
      }
    );

    // delete single season
    app.delete(
      "/deleteSeason/:id",
      verifyJWT,
      authorizeAccess(["Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
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
          res
            .status(500)
            .send({ message: "Failed to delete season", error: error.message });
        }
      }
    );

    //update a single season
    app.put(
      "/editSeason/:id",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const season = req.body;
          const filter = { _id: new ObjectId(id) };
          const updateSeason = {
            $set: { ...season },
          };

          const result = await seasonCollection.updateOne(filter, updateSeason);

          res.send(result);
        } catch (error) {
          console.error("Error updating season:", error);
          res
            .status(500)
            .send({ message: "Failed to update season", error: error.message });
        }
      }
    );

    // get product info via season name
    app.get(
      "/productFromSeason/:seasonName",
      verifyJWT,
      authorizeAccess([], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const seasonName = req.params.seasonName;
          const query = { season: seasonName };
          const result = await productInformationCollection
            .find(query)
            .toArray();

          if (!result) {
            return res.status(404).send({ message: "Product not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error fetching Product Details:", error);
          res.status(500).send({
            message: "Failed to fetch Product Details",
            error: error.message,
          });
        }
      }
    );

    // Add a Category
    app.post(
      "/addCategory",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
        const categoryData = req.body;
        try {
          const result = await categoryCollection.insertOne(categoryData);
          res.status(201).send(result);
        } catch (error) {
          console.error("Error adding category:", error);
          res
            .status(500)
            .send({ message: "Failed to add category", error: error.message });
        }
      }
    );

    // Get All Categories
    app.get("/allCategories", originChecker, async (req, res) => {
      try {
        const categories = await categoryCollection.find().toArray();
        res.status(200).send(categories);
      } catch (error) {
        res.status(500).send(error.message);
      }
    });

    // get single category info
    app.get(
      "/allCategories/:id",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
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
          res.status(500).send({
            message: "Failed to fetch category",
            error: error.message,
          });
        }
      }
    );

    // delete single category
    app.delete(
      "/deleteCategory/:id",
      verifyJWT,
      authorizeAccess(["Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
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
          res.status(500).send({
            message: "Failed to delete category",
            error: error.message,
          });
        }
      }
    );

    //update a single category
    app.put(
      "/editCategory/:id",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const category = req.body;
          const filter = { _id: new ObjectId(id) };
          const updateCategory = {
            $set: { ...category },
          };

          const result = await categoryCollection.updateOne(
            filter,
            updateCategory
          );

          res.send(result);
        } catch (error) {
          console.error("Error updating category:", error);
          res.status(500).send({
            message: "Failed to update category",
            error: error.message,
          });
        }
      }
    );

    app.patch(
      "/updateFeaturedCategories",
      verifyJWT,
      authorizeAccess(["Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
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

          // Respond with the modifiedCount
          res.status(200).send({ modifiedCount });
        } catch (error) {
          console.error("Error updating featured category:", error);
          res.status(500).send({
            message: "Failed to update featured categories",
            error: error.message,
          });
        }
      }
    );

    // Get All Sizes
    app.get(
      "/allSizeRanges",
      verifyJWT,
      authorizeAccess([], "Product Hub"),
      originChecker,
      async (req, res) => {
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
      }
    );

    // Get All Sub-Categories
    app.get(
      "/allSubCategories",
      verifyJWT,
      authorizeAccess([], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const categories = await categoryCollection.find().toArray();
          const subCategoryOptions = categories.reduce((acc, category) => {
            acc[category.key] = category.subCategories || []; // Ensure subCategories exist
            return acc;
          }, {});
          res.status(200).send(subCategoryOptions);
        } catch (error) {
          res.status(500).send(error.message);
        }
      }
    );

    // post an order
    app.post(
      "/addOrder",
      verifyJWT,
      limiter,
      originChecker,
      async (req, res) => {
        try {
          const {
            name,
            email,
            phoneNumber,
            altPhoneNumber,
            hometown,
            addressLineOne,
            addressLineTwo,
            city,
            postalCode,
            note,
            deliveryType,
            paymentMethod,
            promoCode,
            cartItems,
            userDevice,
          } = req.body;

          const [products, offers, shippingZones, orders, customer, promoInfo] =
            await Promise.all([
              productInformationCollection.find().toArray(),
              offerCollection.find().toArray(),
              shippingZoneCollection.find().toArray(),
              orderListCollection
                .find({}, { projection: { orderNumber: 1 } })
                .toArray(),
              customerListCollection.findOne(
                { email },
                { projection: { "userInfo.customerId": 1, _id: 0 } }
              ),
              promoCode
                ? promoCollection.findOne({
                    promoCode: { $regex: `^${promoCode}$`, $options: "i" },
                  })
                : Promise.resolve(null),
            ]);

          const subtotal = calculateSubtotal(products, cartItems, offers);
          const totalSpecialOfferDiscount = calculateTotalSpecialOfferDiscount(
            products,
            cartItems,
            offers
          );
          const promoDiscount = calculatePromoDiscount(
            products,
            cartItems,
            promoInfo,
            offers
          );
          const shippingCharge =
            city === "Dhaka" && deliveryType === "STANDARD"
              ? 0
              : calculateShippingCharge(city, deliveryType, shippingZones);
          const total =
            subtotal -
            totalSpecialOfferDiscount -
            promoDiscount +
            shippingCharge;

          const selectedProducts = cartItems?.map((cartItem) => {
            const correspondingProduct = products?.find(
              (product) => product._id.toString() === cartItem._id
            );
            const specialOffer = getProductSpecialOffer(
              correspondingProduct,
              offers,
              subtotal
            );

            return {
              _id: cartItem._id,
              productTitle: correspondingProduct?.productTitle,
              productId: correspondingProduct?.productId,
              batchCode: correspondingProduct?.batchCode,
              size: /^\d+$/.test(cartItem.selectedSize)
                ? Number(cartItem.selectedSize)
                : cartItem.selectedSize,
              color: cartItem.selectedColor,
              sku: cartItem.selectedQuantity,
              vendors: correspondingProduct?.vendors?.map(
                (vendor) => vendor.label
              ),
              thumbnailImgUrl: getImageSetsBasedOnColors(
                correspondingProduct?.productVariants
              )?.find(
                (imgSet) =>
                  imgSet.color._id.toString() === cartItem.selectedColor._id
              )?.images[0],
              regularPrice: Number(correspondingProduct?.regularPrice),
              discountInfo: checkIfOnlyRegularDiscountIsAvailable(
                correspondingProduct,
                offers
              )
                ? {
                    discountType: correspondingProduct?.discountType,
                    discountValue: correspondingProduct?.discountValue,
                    finalPriceAfterDiscount: calculateFinalPrice(
                      correspondingProduct,
                      offers
                    ),
                  }
                : null,
              offerInfo: !specialOffer
                ? null
                : {
                    offerTitle: specialOffer?.offerTitle,
                    offerDiscountType: specialOffer?.offerDiscountType,
                    offerDiscountValue: specialOffer?.offerDiscountValue,
                    appliedOfferDiscount: calculateProductSpecialOfferDiscount(
                      correspondingProduct,
                      cartItem,
                      specialOffer
                    ),
                  },
            };
          });

          const dateTime = moment().tz("Asia/Dhaka").format("DD-MM-YY | HH:mm");
          const estimatedTime = getEstimatedDeliveryTime(
            city,
            deliveryType,
            shippingZones
          );
          const expectedDeliveryDate = getExpectedDeliveryDate(
            dateTime,
            deliveryType,
            estimatedTime
          );

          const orderNumber = generateOrderId(
            orders.map((order) => order.orderNumber),
            name,
            phoneNumber
          );

          const customerId = customer?.userInfo?.customerId;

          const orderData = {
            orderNumber,
            dateTime,
            customerInfo: {
              customerName: name,
              customerId,
              email,
              phoneNumber,
              phoneNumber2: altPhoneNumber,
              hometown,
            },
            deliveryInfo: {
              address1: addressLineOne,
              address2: addressLineTwo,
              city,
              postalCode,
              noteToSeller: note,
              deliveryMethod: deliveryType,
              estimatedTime,
              expectedDeliveryDate,
            },
            productInformation: selectedProducts,
            subtotal,
            promoInfo: !promoInfo
              ? null
              : {
                  _id: promoInfo?._id.toString(),
                  promoCode: promoInfo?.promoCode,
                  promoDiscountType: promoInfo?.promoDiscountType,
                  promoDiscountValue: promoInfo?.promoDiscountValue,
                  appliedPromoDiscount: promoDiscount,
                },
            totalSpecialOfferDiscount,
            shippingCharge,
            total,
            paymentInfo: {
              paymentMethod: paymentMethod === "bkash" ? "bKash" : "SSL",
              paymentStatus: "Paid",
              transactionId: `TXN${Math.random().toString().slice(2, 12)}`,
            },
            orderStatus: "Pending",
            userDevice,
          };

          const result = await orderListCollection.insertOne(orderData);

          return res.status(201).send({
            orderNumber,
            totalAmount: total,
          });
        } catch (error) {
          console.error("Error adding order:", error);
          return res.status(500).send({
            message: "Failed to add order.",
            error: error.message,
          });
        }
      }
    );

    // Get All Orders
    app.get(
      "/allOrders",
      verifyJWT,
      authorizeAccess(
        [],
        "Orders",
        "Finances",
        "Product Hub",
        "Marketing",
        "Customers"
      ),
      originChecker,
      async (req, res) => {
        try {
          // Sort by a field in descending order (e.g., by '_id' or 'dateTime' if you have a date field)
          const orders = await orderListCollection
            .find()
            .sort({ _id: -1 })
            .toArray();
          res.status(200).send(orders);
        } catch (error) {
          res.status(500).send(error.message);
        }
      }
    );

    // Get orders for a specific user by email
    app.get("/customer-orders", verifyJWT, originChecker, async (req, res) => {
      const customerEmail = req.query.email;

      if (!customerEmail) {
        return res
          .status(400)
          .send({ message: "Unauthorized: Please log in." });
      }

      try {
        const userOrders = await orderListCollection
          .find({ "customerInfo.email": customerEmail })
          .sort({ _id: -1 })
          .toArray();

        res.status(200).send(userOrders);
      } catch (error) {
        console.error("Error fetching user orders:", error);
        res.status(500).send({
          message: "Failed to fetch user orders.",
          error: error.message,
        });
      }
    });

    // Get a specific order by order number and customer email
    app.get(
      "/customer-orders/:orderNumber",
      verifyJWT,
      originChecker,
      async (req, res) => {
        const { orderNumber } = req.params;
        const customerEmail = req.query.email;

        if (!customerEmail) {
          return res
            .status(400)
            .send({ message: "Unauthorized: Please log in." });
        }

        try {
          const order = await orderListCollection.findOne({
            orderNumber: orderNumber.toUpperCase(),
            "customerInfo.email": customerEmail,
          });

          if (!order) {
            return res.status(404).send({ message: "Order not found." });
          }

          res.status(200).send(order);
        } catch (error) {
          console.error("Error fetching order:", error);
          res.status(500).send({
            message: "Failed to fetch order.",
            error: error.message,
          });
        }
      }
    );

    app.get(
      "/get-todays-orders",
      verifyJWT,
      authorizeAccess([], "Dashboard"),
      originChecker,
      async (req, res) => {
        try {
          const today = new Date();
          const dd = String(today.getDate()).padStart(2, "0");
          const mm = String(today.getMonth() + 1).padStart(2, "0");
          const yy = String(today.getFullYear()).slice(2); // '25'

          const todayStr = `${dd}-${mm}-${yy}`; // '03-05-25'

          const allOrders = await orderListCollection.find().toArray();

          const todayOrders = allOrders.filter((order) => {
            if (!order.dateTime) return false;
            return order.dateTime.startsWith(todayStr);
          });

          const pendingOrders = todayOrders.filter(
            (order) => order.orderStatus === "Pending"
          );
          const processingOrders = todayOrders.filter(
            (order) => order.orderStatus === "Processing"
          );
          const completedOrders = todayOrders.filter(
            (order) => order.orderStatus === "Delivered"
          );

          const calculateSummary = (orders) => {
            return {
              totalOrders: orders.length,
              totalAmount: orders.reduce(
                (sum, order) => sum + (order.total || 0),
                0
              ),
            };
          };

          const allSummary = calculateSummary(todayOrders);
          const pendingSummary = calculateSummary(pendingOrders);
          const processingSummary = calculateSummary(processingOrders);
          const completedSummary = calculateSummary(completedOrders);

          res.status(200).json({
            all: allSummary,
            pending: pendingSummary,
            processing: processingSummary,
            delivered: completedSummary,
          });
        } catch (error) {
          res.status(500).send(error.message);
        }
      }
    );

    // applying pagination in orderList
    app.get(
      "/orderList",
      verifyJWT,
      authorizeAccess([], "Orders"),
      originChecker,
      async (req, res) => {
        try {
          const pageStr = req.query?.page;
          const itemsPerPageStr = req.query?.itemsPerPage;
          const pageNumber = parseInt(pageStr) || 0;
          const itemsPerPage = parseInt(itemsPerPageStr) || 25; // Default to 25 if not provided
          const skip = pageNumber * itemsPerPage;

          // Fetching the total number of orders
          const totalOrderList =
            await orderListCollection.estimatedDocumentCount();

          // Fetching the reversed data for the specific page
          const result = await orderListCollection
            .find()
            .sort({ _id: -1 })
            .skip(skip)
            .limit(itemsPerPage)
            .toArray();

          // Sending the result and total count to the frontend
          res.send({ result, totalOrderList });
        } catch (error) {
          console.error("Error fetching orders:", error);
          res
            .status(500)
            .send({ message: "Failed to fetch orders", error: error.message });
        }
      }
    );

    app.put(
      "/addReturnSkuToProduct",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Orders"),
      originChecker,
      async (req, res) => {
        const returnDataToSend = req.body;

        // Validate input
        if (!Array.isArray(returnDataToSend) || returnDataToSend.length === 0) {
          return res
            .status(400)
            .json({ error: "Invalid or empty return data" });
        }

        try {
          // Fetch the primary location
          const primaryLocation = await locationCollection.findOne({
            isPrimaryLocation: true,
          });
          if (!primaryLocation) {
            return res
              .status(400)
              .json({ error: "Primary location not found" });
          }

          const { locationName } = primaryLocation;
          const updateResults = [];

          for (const productDetails of returnDataToSend) {
            const { productId, sku, size, color } = productDetails;

            if (!productId || !sku || !size || !color) {
              updateResults.push({
                productId,
                error: "Missing details in return data",
              });
              continue;
            }

            // Find the product in the database
            const product = await productInformationCollection.findOne({
              productId,
            });
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
              updateResults.push({
                productId,
                error: "Matching product variant not found",
              });
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
                  },
                },
              },
              {
                $inc: { "productVariants.$.returnSku": sku }, // This will now correctly increment `returnSku`
              }
            );

            if (updateResult.modifiedCount === 0) {
              updateResults.push({
                productId,
                error: "Failed to update returnSku",
              });
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

          return res.status(200).json({
            message: "Return SKU update completed",
            results: updateResults,
          });
        } catch (error) {
          console.error("Error updating return SKU:", error.message);
          return res.status(500).json({ error: "Internal server error" });
        }
      }
    );

    app.put(
      "/decreaseSkuFromProduct",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Orders"),
      originChecker,
      async (req, res) => {
        const productDetailsArray = req.body;

        // Validate the input array
        if (
          !Array.isArray(productDetailsArray) ||
          productDetailsArray.length === 0
        ) {
          return res
            .status(400)
            .json({ error: "No product details provided or invalid format" });
        }

        try {
          const primaryLocation = await locationCollection.findOne({
            isPrimaryLocation: true,
          });
          if (!primaryLocation) {
            return res
              .status(400)
              .json({ error: "Primary location not found" });
          }

          const { locationName } = primaryLocation;

          const updateResults = [];
          for (const productDetails of productDetailsArray) {
            const { productId, sku, size, color } = productDetails;

            if (!productId || !sku || !size || !color) {
              return res
                .status(400)
                .json({ error: "Missing details in request body" });
            }

            // Step 3: Find the product and match variants
            const product = await productInformationCollection.findOne({
              productId,
            });
            if (!product) {
              updateResults.push({ productId, error: "Product not found" });
              continue;
            }

            const matchingVariant = product?.productVariants?.find(
              (variant) => {
                return (
                  variant.size === size &&
                  variant.color._id === color._id &&
                  variant.location === locationName
                );
              }
            );

            if (!matchingVariant) {
              updateResults.push({
                productId,
                error: "Matching product variant not found",
              });
              continue;
            }

            // Step 4: Check if SKU can be subtracted
            if (matchingVariant.sku < sku) {
              updateResults.push({
                productId,
                error: "SKU to subtract exceeds current SKU",
              });
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
                updatedVariant: {
                  size,
                  color,
                  location: locationName,
                  sku: matchingVariant.sku,
                },
              });
            }
          }

          // Return response with results of all products
          return res.status(200).json({
            message: "SKU update process completed",
            results: updateResults,
          });
        } catch (error) {
          console.error("Error updating SKU:", error.message);
          return res.status(500).json({ error: "Internal server error" });
        }
      }
    );

    app.put(
      "/decreaseOnHandSkuFromProduct",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Orders"),
      originChecker,
      async (req, res) => {
        const productDetailsArray = req.body;

        // Validate the input array
        if (
          !Array.isArray(productDetailsArray) ||
          productDetailsArray.length === 0
        ) {
          return res
            .status(400)
            .json({ error: "No product details provided or invalid format" });
        }

        try {
          const primaryLocation = await locationCollection.findOne({
            isPrimaryLocation: true,
          });
          if (!primaryLocation) {
            return res
              .status(400)
              .json({ error: "Primary location not found" });
          }

          const { locationName } = primaryLocation;

          const updateResults = [];
          for (const productDetails of productDetailsArray) {
            const { productId, sku, size, color, onHandSku } = productDetails;

            if (!productId || !sku || !size || !color || !onHandSku) {
              return res
                .status(400)
                .json({ error: "Missing details in request body" });
            }

            // Step 3: Find the product and match variants
            const product = await productInformationCollection.findOne({
              productId,
            });
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
              updateResults.push({
                productId,
                error: "Matching product variant not found",
              });
              continue;
            }

            // Step 4: Check if SKU can be subtracted
            if (matchingVariant.onHandSku < onHandSku) {
              updateResults.push({
                productId,
                error: "SKU to subtract exceeds current SKU",
              });
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
                updatedVariant: {
                  size,
                  color,
                  location: locationName,
                  onHandSku: matchingVariant.onHandSku,
                },
              });
            }
          }

          // Return response with results of all products
          return res.status(200).json({
            message: "SKU update process completed",
            results: updateResults,
          });
        } catch (error) {
          console.error("Error updating SKU:", error.message);
          return res.status(500).json({ error: "Internal server error" });
        }
      }
    );

    const decrementReturnSkuInProduct = async (returnDataToSend) => {
      const updateResults = [];

      for (const productDetails of returnDataToSend) {
        const { productId, sku, size, color } = productDetails;

        if (!productId || !sku || !size || !color) {
          updateResults.push({
            productId,
            error: "Missing details in returnDataToSend",
          });
          continue;
        }

        const primaryLocation = await locationCollection.findOne({
          isPrimaryLocation: true,
        });
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
          updateResults.push({
            productId,
            error:
              "Failed to decrement SKU. Either no match found or not enough returnSku.",
          });
        } else {
          updateResults.push({
            productId,
            updatedVariant: {
              size,
              color,
              location: locationName,
              returnSku: `-${sku}`,
            },
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
          updateResults.push({
            productId,
            error: "Missing details in dataToSend",
          });
          continue;
        }

        const primaryLocation = await locationCollection.findOne({
          isPrimaryLocation: true,
        });
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
            updatedVariant: {
              size,
              color,
              location: locationName,
              sku: `+${sku}`,
            },
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
          updateResults.push({
            productId,
            error: "Missing details in dataToSend",
          });
          continue;
        }

        const primaryLocation = await locationCollection.findOne({
          isPrimaryLocation: true,
        });
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
          updateResults.push({
            productId,
            error: "Failed to increment onHandSku",
          });
        } else {
          updateResults.push({
            productId,
            updatedVariant: {
              size,
              color,
              location: locationName,
              onHandSku: `+${onHandSku}`,
            },
          });
        }
      }

      return updateResults;
    };

    // Update order status
    app.patch(
      "/changeOrderStatus/:id",
      multiClientAccess(
        // Backend middleware chain
        (req, res, next) =>
          verifyJWT(req, res, () =>
            authorizeAccess(["Editor", "Owner"], "Orders")(req, res, next)
          ),
        // Frontend middleware
        verifyJWT
      ),
      limiter,
      originChecker,
      async (req, res) => {
        const id = req.params.id;
        const {
          orderStatus,
          trackingNumber,
          selectedShipmentHandlerName,
          shippedAt,
          deliveredAt,
          trackingUrl,
          imageUrl,
          isUndo,
          onHoldReason,
          declinedReason,
          returnInfo,
          dataToSend,
          returnDataToSend,
        } = req.body; // Extract status from request body

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
          "Refunded",
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
          }

          const updateDoc = {};
          const currentTime = new Date();
          const undoAvailableUntil = new Date(
            currentTime.getTime() + 6 * 60 * 60 * 1000
          ); // 6 hours later

          if (isUndo) {
            if (
              order.orderStatus === "Processing" &&
              orderStatus === "Pending"
            ) {
              // Validate dataToSend before calling the function
              if (Array.isArray(dataToSend) && dataToSend.length > 0) {
                // Increment the SKU
                await incrementSkuInProduct(dataToSend);
              } else {
                console.error(
                  "Invalid dataToSend: must be a non-empty array for SKU increment."
                );
                throw new Error(
                  "Invalid dataToSend: must be a non-empty array for SKU increment."
                );
              }
            } else if (
              order.orderStatus === "Shipped" &&
              orderStatus === "Processing"
            ) {
              // Validate dataToSend before calling the function
              if (Array.isArray(dataToSend) && dataToSend.length > 0) {
                updateDoc.$unset = { shipmentInfo: null }; // Remove shipmentInfo
                // Increment the onHandSku
                await incrementOnHandSkuInProduct(dataToSend);
              } else {
                console.error(
                  "Invalid dataToSend: must be a non-empty array for onHandSku increment."
                );
                throw new Error(
                  "Invalid dataToSend: must be a non-empty array for onHandSku increment."
                );
              }
            } else if (
              order.orderStatus === "On Hold" &&
              orderStatus === "Shipped"
            ) {
              updateDoc.$unset = { onHoldReason: "" }; // Remove onHoldReason
            } else if (
              order.orderStatus === "Delivered" &&
              (orderStatus === "On Hold" || orderStatus === "Shipped")
            ) {
              updateDoc.$set = {
                "deliveryInfo.deliveredAt": null, // Set deliveredAt to null
              };
            } else if (
              order.orderStatus === "Request Declined" &&
              orderStatus === "Return Requested"
            ) {
              updateDoc.$unset = { declinedReason: "" }; // Remove declinedReason
            } else if (
              order.orderStatus === "Refunded" &&
              orderStatus === "Return Initiated"
            ) {
              // Validate returnDataToSend before calling the function
              if (
                Array.isArray(returnDataToSend) &&
                returnDataToSend.length > 0
              ) {
                // Decrease the returnSku
                await decrementReturnSkuInProduct(returnDataToSend);
              } else {
                console.error(
                  "Invalid returnDataToSend: must be a non-empty array for SKU decrement."
                );
                throw new Error(
                  "Invalid returnDataToSend: must be a non-empty array for SKU decrement."
                );
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
          } else {
            updateDoc.$set = {
              orderStatus: orderStatus,
              previousStatus: order.orderStatus, // Save the current status as the previous status
              lastStatusChange: currentTime, // Record the timestamp of the status change
              undoAvailableUntil: undoAvailableUntil, // Set undo availability for 6 hours
            };

            // Add shipping-related fields if `orderStatus` is `Shipped`
            if (orderStatus === "Shipped") {
              if (!trackingNumber || !selectedShipmentHandlerName) {
                return res.status(400).json({
                  error: "Tracking data is required for 'Shipped' status",
                });
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
                return res.status(400).json({
                  error: "On hold reason is required for 'On Hold' status",
                });
              }

              // Store all shipping-related fields inside `shipmentInfo` object
              updateDoc.$set.onHoldReason = onHoldReason;
            }

            // Add delivery-related fields if `orderStatus` is `On Hold`
            if (orderStatus === "Return Requested") {
              if (!returnInfo) {
                return res.status(400).json({
                  error:
                    "Return Requested is required for 'Return Requested' status",
                });
              }

              // Store all shipping-related fields inside `shipmentInfo` object
              updateDoc.$set.returnInfo = returnInfo;
              updateDoc.$set.returnInfo.isRead = false;
            }

            // Add delivery-related fields if `orderStatus` is `On Hold`
            if (orderStatus === "Request Declined") {
              if (!declinedReason) {
                return res.status(400).json({
                  error:
                    "Declined reason is required for 'Request Declined' status",
                });
              }

              // Store all shipping-related fields inside `shipmentInfo` object
              updateDoc.$set.declinedReason = declinedReason;
            }
          }

          const result = await orderListCollection.updateOne(filter, updateDoc);

          if (result.modifiedCount > 0) {
            const updatedOrder = await orderListCollection.findOne(filter); // Fetch updated order with tracking info if needed
            await sendEmailToCustomer(updatedOrder, orderStatus); // send email based on new status
            res.send(result);
          } else {
            res.status(404).send({ error: "Order not found" });
          }
        } catch (err) {
          res.status(500).send({ error: "Internal server error" });
        }
      }
    );

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

    // Get All Customer Information
    app.get(
      "/allCustomerDetails",
      verifyJWT,
      authorizeAccess([], "Customers"),
      originChecker,
      async (req, res) => {
        try {
          const customers = await customerListCollection.find().toArray();
          res.status(200).send(customers);
        } catch (error) {
          res.status(500).send(error.message);
        }
      }
    );

    // Get Customer Details by Email
    app.get(
      "/customerDetailsViaEmail/:email",
      verifyJWT,
      originChecker,
      async (req, res) => {
        const email = req.params.email; // Retrieve email from query parameters

        if (!email) {
          return res.status(400).send("Email is required"); // Validate input
        }

        try {
          const customer = await customerListCollection.findOne(
            { email },
            { projection: { password: 0 } }
          );
          if (!customer) {
            return res.status(404).send("Customer not found"); // Handle case where no customer is found
          }
          res.status(200).send(customer); // Send customer details
        } catch (error) {
          res.status(500).send(error.message); // Handle server errors
        }
      }
    );

    // Update user details by _id
    app.put(
      "/updateUserInformation/:id",
      verifyJWT,
      originChecker,
      async (req, res) => {
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
            return res
              .status(404)
              .send({ message: "No data found with this ID" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error updating data:", error);
          res
            .status(500)
            .send({ message: "Failed to update data", error: error.message });
        }
      }
    );

    // applying pagination in customer list
    app.get(
      "/customerList",
      verifyJWT,
      authorizeAccess([], "Customers"),
      originChecker,
      async (req, res) => {
        try {
          const pageStr = req.query?.page;
          const itemsPerPageStr = req.query?.itemsPerPage;
          const pageNumber = parseInt(pageStr) || 0;
          const itemsPerPage = parseInt(itemsPerPageStr) || 25; // Default to 25 if not provided
          const skip = pageNumber * itemsPerPage;

          // Fetching the total number of orders
          const totalCustomerList =
            await customerListCollection.estimatedDocumentCount();

          // Fetching the reversed data for the specific page
          const result = await customerListCollection
            .find()
            .skip(skip)
            .limit(itemsPerPage)
            .toArray();

          // Sending the result and total count to the frontend
          res.send({ result, totalCustomerList });
        } catch (error) {
          console.error("Error fetching customer list:", error);
          res.status(500).send({
            message: "Failed to fetch customer list",
            error: error.message,
          });
        }
      }
    );

    // post a promo code
    app.post(
      "/addPromoCode",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Marketing"),
      originChecker,
      async (req, res) => {
        try {
          const discountData = req.body;
          const result = await promoCollection.insertOne(discountData);
          res.send(result);
        } catch (error) {
          console.error("Error adding promo code:", error);
          res.status(500).send({
            message: "Failed to add promo code",
            error: error.message,
          });
        }
      }
    );

    // Get All Promo Codes
    app.get(
      "/allPromoCodes",
      verifyJWT,
      authorizeAccess([], "Marketing"),
      originChecker,
      async (req, res) => {
        try {
          const promos = await promoCollection
            .find()
            .sort({ _id: -1 })
            .toArray();
          res.status(200).send(promos);
        } catch (error) {
          res.status(500).send(error.message);
        }
      }
    );

    // get single promo info
    app.get(
      "/getSinglePromo/:id",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Marketing"),
      originChecker,
      async (req, res) => {
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
          res
            .status(500)
            .send({ message: "Failed to fetch promo", error: error.message });
        }
      }
    );

    // get a promo info by code
    app.get("/promo-by-code/:code", originChecker, async (req, res) => {
      try {
        const codeParam = req.params.code;

        if (!codeParam) {
          return res.status(400).send({ message: "Promo code is required." });
        }

        const query = {
          promoCode: { $regex: `^${codeParam}$`, $options: "i" },
        };

        const promo = await promoCollection.findOne(query);

        if (!promo) {
          return res.status(404).send({ message: "Promo code not found." });
        }

        res.send(promo);
      } catch (error) {
        console.error("Error fetching promo by code:", error);
        res.status(500).send({
          message: "Failed to fetch promo by code",
          error: error.message,
        });
      }
    });

    // delete single promo
    app.delete(
      "/deletePromo/:id",
      verifyJWT,
      authorizeAccess(["Owner"], "Marketing"),
      originChecker,
      async (req, res) => {
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
          res
            .status(500)
            .send({ message: "Failed to delete promo", error: error.message });
        }
      }
    );

    //update a single promo
    app.put(
      "/updatePromo/:id",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Marketing"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const promo = req.body;
          const filter = { _id: new ObjectId(id) };
          const updatePromo = {
            $set: { ...promo },
          };

          const result = await promoCollection.updateOne(filter, updatePromo);

          if (result.matchedCount === 0) {
            return res.status(404).send({ message: "Promo not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error updating promo:", error);
          res
            .status(500)
            .send({ message: "Failed to update promo", error: error.message });
        }
      }
    );

    // post a offer
    app.post(
      "/addOffer",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Marketing"),
      originChecker,
      async (req, res) => {
        try {
          const offerData = req.body;
          const result = await offerCollection.insertOne(offerData);
          res.send(result);
        } catch (error) {
          console.error("Error adding offer:", error);
          res
            .status(500)
            .send({ message: "Failed to add offer", error: error.message });
        }
      }
    );

    // Get All Offer
    app.get("/allOffers", originChecker, async (req, res) => {
      try {
        const offers = await offerCollection.find().sort({ _id: -1 }).toArray();
        res.status(200).send(offers);
      } catch (error) {
        res.status(500).send(error.message);
      }
    });

    // get single offer
    app.get(
      "/getSingleOffer/:id",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Marketing"),
      originChecker,
      async (req, res) => {
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
          res
            .status(500)
            .send({ message: "Failed to fetch promo", error: error.message });
        }
      }
    );

    //update a single offer
    app.put(
      "/updateOffer/:id",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Marketing"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const promo = req.body;
          const filter = { _id: new ObjectId(id) };
          const updateOffer = {
            $set: { ...promo },
          };

          const result = await offerCollection.updateOne(filter, updateOffer);

          if (result.matchedCount === 0) {
            return res.status(404).send({ message: "Offer not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error updating offer:", error);
          res
            .status(500)
            .send({ message: "Failed to update offer", error: error.message });
        }
      }
    );

    // delete single offer
    app.delete(
      "/deleteOffer/:id",
      verifyJWT,
      authorizeAccess(["Owner"], "Marketing"),
      originChecker,
      async (req, res) => {
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
          res
            .status(500)
            .send({ message: "Failed to delete offer", error: error.message });
        }
      }
    );

    // post a shipping zone
    app.post(
      "/addShippingZone",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Supply Chain"),
      originChecker,
      async (req, res) => {
        try {
          const shippingData = req.body;
          const result = await shippingZoneCollection.insertOne(shippingData);
          res.send(result);
        } catch (error) {
          console.error("Error adding shipping details:", error);
          res.status(500).send({
            message: "Failed to add shipping details",
            error: error.message,
          });
        }
      }
    );

    // get all shipping zones
    app.get(
      "/allShippingZones",
      multiClientAccess(
        // Backend middleware chain
        (req, res, next) =>
          verifyJWT(req, res, () =>
            authorizeAccess(
              [],
              "Supply Chain",
              "Product Hub",
              "Orders"
            )(req, res, next)
          ),
        // Frontend middleware
        (req, res, next) => next()
      ),
      originChecker,
      async (req, res) => {
        try {
          const result = await shippingZoneCollection.find().toArray();
          res.send(result);
        } catch (error) {
          console.error("Error fetching shipping zones:", error);
          res.status(500).send({
            message: "Failed to fetch shipping zones",
            error: error.message,
          });
        }
      }
    );

    // delete single shipping zone
    app.delete(
      "/deleteShippingZone/:id",
      verifyJWT,
      authorizeAccess(["Owner"], "Supply Chain"),
      originChecker,
      async (req, res) => {
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
          res.status(500).send({
            message: "Failed to delete shipping",
            error: error.message,
          });
        }
      }
    );

    // get single shipping zone
    app.get(
      "/getSingleShippingZone/:id",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Supply Chain"),
      originChecker,
      async (req, res) => {
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
          res.status(500).send({
            message: "Failed to fetch shipping zone",
            error: error.message,
          });
        }
      }
    );

    //update a single shipping zone
    app.put(
      "/editShippingZone/:id",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Supply Chain"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const zone = req.body;
          const filter = { _id: new ObjectId(id) };
          const updateShippingZone = {
            $set: { ...zone },
          };

          const result = await shippingZoneCollection.updateOne(
            filter,
            updateShippingZone
          );

          if (result.matchedCount === 0) {
            return res.status(404).send({ message: "Shipping Zone not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error updating shipping zone:", error);
          res.status(500).send({
            message: "Failed to update shipping zone",
            error: error.message,
          });
        }
      }
    );

    // post a shipment handler
    app.post(
      "/addShipmentHandler",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Supply Chain"),
      originChecker,
      async (req, res) => {
        try {
          const shipmentData = req.body;
          const result = await shipmentHandlerCollection.insertOne(
            shipmentData
          );
          res.send(result);
        } catch (error) {
          console.error("Error adding shipment details:", error);
          res.status(500).send({
            message: "Failed to add shipment details",
            error: error.message,
          });
        }
      }
    );

    // get all shipment handler
    app.get(
      "/allShipmentHandlers",
      verifyJWT,
      authorizeAccess([], "Supply Chain", "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const result = await shipmentHandlerCollection.find().toArray();
          res.send(result);
        } catch (error) {
          console.error("Error fetching shipment handlers:", error);
          res.status(500).send({
            message: "Failed to fetch shipment handlers",
            error: error.message,
          });
        }
      }
    );

    // delete single shipment handler
    app.delete(
      "/deleteShipmentHandler/:id",
      verifyJWT,
      authorizeAccess(["Owner"], "Supply Chain"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const query = { _id: new ObjectId(id) };
          const result = await shipmentHandlerCollection.deleteOne(query);

          if (result.deletedCount === 0) {
            return res
              .status(404)
              .send({ message: "Shipment Handler not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error deleting Shipment Handler:", error);
          res.status(500).send({
            message: "Failed to delete Shipment Handler",
            error: error.message,
          });
        }
      }
    );

    // get single shipment handler
    app.get(
      "/getSingleShipmentHandler/:id",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Supply Chain"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const query = { _id: new ObjectId(id) };
          const result = await shipmentHandlerCollection.findOne(query);

          if (!result) {
            return res
              .status(404)
              .send({ message: "shipment handler not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error fetching shipment handler:", error);
          res.status(500).send({
            message: "Failed to fetch shipment handler",
            error: error.message,
          });
        }
      }
    );

    //update a single shipment handler
    app.put(
      "/editShipmentHandler/:id",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Supply Chain"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const shipmentDetails = req.body;
          const filter = { _id: new ObjectId(id) };
          const updateShipmentHandler = {
            $set: { ...shipmentDetails },
          };

          const result = await shipmentHandlerCollection.updateOne(
            filter,
            updateShipmentHandler
          );

          if (result.matchedCount === 0) {
            return res
              .status(404)
              .send({ message: "Shipment handler not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error updating shipment handler:", error);
          res.status(500).send({
            message: "Failed to update shipment handler",
            error: error.message,
          });
        }
      }
    );

    // post a payment method
    app.post(
      "/addPaymentMethod",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Finances"),
      originChecker,
      async (req, res) => {
        try {
          const paymentData = req.body;
          const result = await paymentMethodCollection.insertOne(paymentData);
          res.send(result);
        } catch (error) {
          console.error("Error adding payment method:", error);
          res.status(500).send({
            message: "Failed to add payment method",
            error: error.message,
          });
        }
      }
    );

    // get all payment methods
    app.get(
      "/allPaymentMethods",
      verifyJWT,
      authorizeAccess([], "Finances"),
      originChecker,
      async (req, res) => {
        try {
          const result = await paymentMethodCollection.find().toArray();
          res.send(result);
        } catch (error) {
          console.error("Error fetching payment method:", error);
          res.status(500).send({
            message: "Failed to fetch payment method",
            error: error.message,
          });
        }
      }
    );

    // delete single Payment Method
    app.delete(
      "/deletePaymentMethod/:id",
      verifyJWT,
      authorizeAccess(["Owner"], "Finances"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const query = { _id: new ObjectId(id) };
          const result = await paymentMethodCollection.deleteOne(query);

          if (result.deletedCount === 0) {
            return res
              .status(404)
              .send({ message: "Payment Method not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error deleting Payment Method:", error);
          res.status(500).send({
            message: "Failed to delete Payment Method",
            error: error.message,
          });
        }
      }
    );

    // get single Payment Method
    app.get(
      "/getSinglePaymentMethod/:id",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Finances"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const query = { _id: new ObjectId(id) };
          const result = await paymentMethodCollection.findOne(query);

          if (!result) {
            return res
              .status(404)
              .send({ message: "Payment Method not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error fetching Payment Method:", error);
          res.status(500).send({
            message: "Failed to fetch Payment Method",
            error: error.message,
          });
        }
      }
    );

    //update a single payment method
    app.put(
      "/editPaymentMethod/:id",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Finances"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const method = req.body;
          const filter = { _id: new ObjectId(id) };
          const updatePaymentMethod = {
            $set: { ...method },
          };

          const result = await paymentMethodCollection.updateOne(
            filter,
            updatePaymentMethod
          );

          if (result.matchedCount === 0) {
            return res
              .status(404)
              .send({ message: "Payment method not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error updating Payment method:", error);
          res.status(500).send({
            message: "Failed to update Payment method",
            error: error.message,
          });
        }
      }
    );

    // post a location
    app.post(
      "/addLocation",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Supply Chain"),
      originChecker,
      async (req, res) => {
        try {
          const locationData = req.body;

          // If the location is set as primary, update all other locations to set `isPrimaryLocation` to false
          if (locationData.isPrimaryLocation) {
            await locationCollection.updateMany(
              { isPrimaryLocation: true },
              { $set: { isPrimaryLocation: false } }
            );
          }

          // Insert the new location
          const result = await locationCollection.insertOne(locationData);

          res.send(result);
        } catch (error) {
          console.error("Error adding location:", error);
          res
            .status(500)
            .send({ message: "Failed to add location", error: error.message });
        }
      }
    );

    // get all locations
    app.get(
      "/allLocations",
      verifyJWT,
      authorizeAccess([], "Supply Chain", "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const result = await locationCollection.find().toArray();
          res.send(result);
        } catch (error) {
          console.error("Error fetching locations:", error);
          res.status(500).send({
            message: "Failed to fetch locations",
            error: error.message,
          });
        }
      }
    );

    // get the primary location's name
    app.get("/primary-location", originChecker, async (req, res) => {
      try {
        const primaryLocation = await locationCollection.findOne(
          { isPrimaryLocation: true },
          { projection: { locationName: 1, _id: 0 } }
        );

        if (!primaryLocation) {
          return res.status(404).send({
            message: "Primary location not found.",
          });
        }

        res.send({ primaryLocation: primaryLocation.locationName });
      } catch (error) {
        console.error("Error fetching primary location:", error);
        res.status(500).send({
          message: "Failed to fetch primary location.",
          error: error.message,
        });
      }
    });

    // delete single location
    app.delete(
      "/deleteLocation/:id",
      verifyJWT,
      authorizeAccess(["Owner"], "Supply Chain"),
      originChecker,
      async (req, res) => {
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
          res.status(500).send({
            message: "Failed to delete Location",
            error: error.message,
          });
        }
      }
    );

    // Update a single location
    app.put(
      "/updateLocation/:id",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Supply Chain"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const locationData = req.body;

          // ✅ Validate main location id
          if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: "Invalid location ID." });
          }

          // ✅ Validate new primary ID if provided
          if (
            locationData.newPrimaryId &&
            !ObjectId.isValid(locationData.newPrimaryId)
          ) {
            return res
              .status(400)
              .send({ message: "Invalid new primary location ID." });
          }

          // ✅ Fetch existing location
          const existingLocation = await locationCollection.findOne({
            _id: new ObjectId(id),
          });

          if (!existingLocation) {
            return res.status(404).send({ message: "Location not found" });
          }

          // ✅ Block turning OFF a primary location
          if (
            existingLocation.isPrimaryLocation &&
            locationData.status === false
          ) {
            return res.status(400).send({
              message:
                "Cannot disable a primary location. Please assign a new one first.",
            });
          }

          // If the updated location is set as primary, update all other locations to set `isPrimaryLocation` to false
          if (locationData.isPrimaryLocation) {
            await locationCollection.updateMany(
              { isPrimaryLocation: true },
              { $set: { isPrimaryLocation: false } }
            );
          }

          // If current location is being UNSET as primary AND a new one is provided
          if (!locationData.isPrimaryLocation && locationData.newPrimaryId) {
            await locationCollection.updateOne(
              { _id: new ObjectId(locationData.newPrimaryId) },
              { $set: { isPrimaryLocation: true } }
            );
          }

          // Update the specific location
          const filter = { _id: new ObjectId(id) };
          const updateLocation = {
            $set: { ...locationData },
          };

          const result = await locationCollection.updateOne(
            filter,
            updateLocation
          );

          // Handle case where no location was found
          if (result.matchedCount === 0) {
            return res.status(404).send({ message: "Location not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error updating location:", error);
          res.status(500).send({
            message: "Failed to update location",
            error: error.message,
          });
        }
      }
    );

    // get single location info
    app.get(
      "/getSingleLocationDetails/:id",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Supply Chain"),
      originChecker,
      async (req, res) => {
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
          res.status(500).send({
            message: "Failed to fetch Location",
            error: error.message,
          });
        }
      }
    );

    app.get(
      "/getAllOtherLocations/:id",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Supply Chain"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;

          const otherLocations = await locationCollection
            .find({ _id: { $ne: new ObjectId(id) } })
            .project({ locationName: 1 }) // Return only needed fields
            .toArray();

          res.send(otherLocations);
        } catch (error) {
          console.error("Error fetching other locations:", error);
          res.status(500).send({
            message: "Failed to fetch other locations",
            error: error.message,
          });
        }
      }
    );

    // post a purchase order
    app.post(
      "/addPurchaseOrder",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const purchaseOrderData = req.body;
          const result = await purchaseOrderCollection.insertOne(
            purchaseOrderData
          );
          res.send(result);
        } catch (error) {
          console.error("Error adding purchase order:", error);
          res.status(500).send({
            message: "Failed to add purchase order",
            error: error.message,
          });
        }
      }
    );

    // get all purchase orders
    app.get(
      "/allPurchaseOrders",
      verifyJWT,
      authorizeAccess([], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const result = await purchaseOrderCollection.find().toArray();
          res.send(result);
        } catch (error) {
          console.error("Error fetching purchase order:", error);
          res.status(500).send({
            message: "Failed to fetch purchase order",
            error: error.message,
          });
        }
      }
    );

    // delete single purchase order
    app.delete(
      "/deletePurchaseOrder/:id",
      verifyJWT,
      authorizeAccess(["Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const query = { _id: new ObjectId(id) };
          const result = await purchaseOrderCollection.deleteOne(query);

          if (result.deletedCount === 0) {
            return res
              .status(404)
              .send({ message: "Purchase order not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error deleting purchase order:", error);
          res.status(500).send({
            message: "Failed to delete purchase order",
            error: error.message,
          });
        }
      }
    );

    // get single purchase order
    app.get(
      "/getSinglePurchaseOrder/:id",
      verifyJWT,
      authorizeAccess([], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const query = { _id: new ObjectId(id) };
          const result = await purchaseOrderCollection.findOne(query);

          if (!result) {
            return res
              .status(404)
              .send({ message: "Purchase order not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error fetching Purchase order:", error);
          res.status(500).send({
            message: "Failed to fetch Purchase order",
            error: error.message,
          });
        }
      }
    );

    //update a single purchase order
    app.put(
      "/editPurchaseOrder/:id",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const order = req.body;
          const filter = { _id: new ObjectId(id) };
          const updatePurchaseOrder = {
            $set: { ...order },
          };

          const result = await purchaseOrderCollection.updateOne(
            filter,
            updatePurchaseOrder
          );

          if (result.matchedCount === 0) {
            return res
              .status(404)
              .send({ message: "Purchase order not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error updating purchase order:", error);
          res.status(500).send({
            message: "Failed to update purchase order",
            error: error.message,
          });
        }
      }
    );

    // post a transfer order
    app.post(
      "/addTransferOrder",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const transferOrderData = req.body;
          const result = await transferOrderCollection.insertOne(
            transferOrderData
          );
          res.send(result);
        } catch (error) {
          console.error("Error adding transfer order:", error);
          res.status(500).send({
            message: "Failed to add transfer order",
            error: error.message,
          });
        }
      }
    );

    // get all transfer orders
    app.get(
      "/allTransferOrders",
      verifyJWT,
      authorizeAccess([], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const result = await transferOrderCollection.find().toArray();
          res.send(result);
        } catch (error) {
          console.error("Error fetching transfer orders:", error);
          res.status(500).send({
            message: "Failed to fetch transfer orders",
            error: error.message,
          });
        }
      }
    );

    // get single transfer order
    app.get(
      "/getSingleTransferOrder/:id",
      verifyJWT,
      authorizeAccess([], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const query = { _id: new ObjectId(id) };
          const result = await transferOrderCollection.findOne(query);

          if (!result) {
            return res
              .status(404)
              .send({ message: "Transfer order not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error fetching Transfer order:", error);
          res.status(500).send({
            message: "Failed to fetch Transfer order",
            error: error.message,
          });
        }
      }
    );

    //update a single transfer order
    app.put(
      "/editTransferOrder/:id",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const order = req.body;
          const filter = { _id: new ObjectId(id) };
          const updateTransferOrder = {
            $set: { ...order },
          };

          const result = await transferOrderCollection.updateOne(
            filter,
            updateTransferOrder
          );

          if (result.matchedCount === 0) {
            return res
              .status(404)
              .send({ message: "Transfer order not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error updating transfer order:", error);
          res.status(500).send({
            message: "Failed to update transfer order",
            error: error.message,
          });
        }
      }
    );

    // delete single transfer order
    app.delete(
      "/deleteTransferOrder/:id",
      verifyJWT,
      authorizeAccess(["Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const query = { _id: new ObjectId(id) };
          const result = await transferOrderCollection.deleteOne(query);

          if (result.deletedCount === 0) {
            return res
              .status(404)
              .send({ message: "Transfer order not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error deleting transfer order:", error);
          res.status(500).send({
            message: "Failed to delete transfer order",
            error: error.message,
          });
        }
      }
    );

    // post a marketing banner
    app.post(
      "/addMarketingBanner",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Marketing"),
      originChecker,
      async (req, res) => {
        try {
          const marketingBannerData = req.body;
          const result = await marketingBannerCollection.insertOne(
            marketingBannerData
          );
          res.send(result);
        } catch (error) {
          console.error("Error adding marketing banner:", error);
          res.status(500).send({
            message: "Failed to add marketing banner",
            error: error.message,
          });
        }
      }
    );

    //update a single login register image urls
    app.put(
      "/editMarketingBanner/:id",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Marketing"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const urls = req.body;
          const filter = { _id: new ObjectId(id) };
          const updateUrlOrder = {
            $set: { ...urls },
          };

          const result = await marketingBannerCollection.updateOne(
            filter,
            updateUrlOrder
          );

          if (result.matchedCount === 0) {
            return res
              .status(404)
              .send({ message: "Login register image urls not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error updating login register image urls:", error);
          res.status(500).send({
            message: "Failed to update login register image urls",
            error: error.message,
          });
        }
      }
    );

    // get all marketing banner
    app.get("/allMarketingBanners", originChecker, async (req, res) => {
      try {
        const result = await marketingBannerCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching marketing banner:", error);
        res.status(500).send({
          message: "Failed to fetch marketing banner",
          error: error.message,
        });
      }
    });

    // post a login register slides
    app.post(
      "/addLoginRegisterImageUrls",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Marketing"),
      originChecker,
      async (req, res) => {
        try {
          const loginRegisterImageUrlsData = req.body;
          const result = await loginRegisterSlideCollection.insertOne(
            loginRegisterImageUrlsData
          );
          res.send(result);
        } catch (error) {
          console.error("Error adding login register slides:", error);
          res.status(500).send({
            message: "Failed to add login register slides",
            error: error.message,
          });
        }
      }
    );

    // get all login register slides
    app.get("/allLoginRegisterImageUrls", async (req, res) => {
      try {
        const result = await loginRegisterSlideCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching login register slides:", error);
        res.status(500).send({
          message: "Failed to fetch login register slides",
          error: error.message,
        });
      }
    });

    //update a single login register image urls
    app.put(
      "/editLoginRegisterImageUrls/:id",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Marketing"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const urls = req.body;
          const filter = { _id: new ObjectId(id) };
          const updateUrlOrder = {
            $set: { ...urls },
          };

          const result = await loginRegisterSlideCollection.updateOne(
            filter,
            updateUrlOrder
          );

          if (result.matchedCount === 0) {
            return res
              .status(404)
              .send({ message: "Login register image urls not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error updating login register image urls:", error);
          res.status(500).send({
            message: "Failed to update login register image urls",
            error: error.message,
          });
        }
      }
    );

    // post a hero banner slides
    app.post(
      "/addHeroBannerImageUrls",
      verifyJWT,
      authorizeAccess(["Owner"], "Settings"),
      originChecker,
      async (req, res) => {
        try {
          const heroBannerImageUrlsData = req.body;
          const result = await heroBannerCollection.insertOne(
            heroBannerImageUrlsData
          );
          res.send(result);
        } catch (error) {
          console.error("Error adding hero banner slides:", error);
          res.status(500).send({
            message: "Failed to add hero banner slides",
            error: error.message,
          });
        }
      }
    );

    // get all hero banner slides
    app.get("/allHeroBannerImageUrls", originChecker, async (req, res) => {
      try {
        const result = await heroBannerCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching hero banner slides:", error);
        res.status(500).send({
          message: "Failed to fetch hero banner slides",
          error: error.message,
        });
      }
    });

    //update a single hero banner image urls
    app.put(
      "/editHeroBannerImageUrls/:id",
      verifyJWT,
      authorizeAccess(["Owner"], "Settings"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const urls = req.body;
          const filter = { _id: new ObjectId(id) };
          const updateUrlOrder = {
            $set: { ...urls },
          };

          const result = await heroBannerCollection.updateOne(
            filter,
            updateUrlOrder
          );

          if (result.matchedCount === 0) {
            return res
              .status(404)
              .send({ message: "hero banner image urls not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error updating hero banner image urls:", error);
          res.status(500).send({
            message: "Failed to update hero banner image urls",
            error: error.message,
          });
        }
      }
    );

    // post a newsletter
    app.post("/addNewsletter", limiter, originChecker, async (req, res) => {
      try {
        const newsletterData = req.body;
        const result = await newsletterCollection.insertOne(newsletterData);
        res.send(result);
      } catch (error) {
        console.error("Error adding newsletter:", error);
        res
          .status(500)
          .send({ message: "Failed to add newsletter", error: error.message });
      }
    });

    // get all newsletters
    app.get("/allNewsletters", originChecker, async (req, res) => {
      try {
        const result = await newsletterCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching newsletters:", error);
        res.status(500).send({
          message: "Failed to fetch newsletters",
          error: error.message,
        });
      }
    });

    // get single newsletter via email
    app.get(
      "/getSingleNewsletter/:email",
      verifyJWT,
      originChecker,
      async (req, res) => {
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
          res.status(500).send({
            message: "Failed to fetch newsletter",
            error: error.message,
          });
        }
      }
    );

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
        res.status(500).send({
          message: "Failed to delete newsletter",
          error: error.message,
        });
      }
    });

    // add faq
    app.post(
      "/add-faq",
      verifyJWT,
      authorizeAccess(["Owner"], "Settings"),
      originChecker,
      async (req, res) => {
        try {
          const faqData = req.body; // Should be an array
          const result = await faqCollection.insertOne(faqData);
          res.send(result); // Send 201 status on success
        } catch (error) {
          console.error("Error adding faq:", error);
          res.status(500).send({ error: "Failed to add faq" }); // Send 500 status on error
        }
      }
    );

    // get all faq
    app.get("/all-faqs", originChecker, async (req, res) => {
      try {
        const result = await faqCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching faq:", error);
        res
          .status(500)
          .send({ message: "Failed to fetch faq", error: error.message });
      }
    });

    //update a single faq
    app.put(
      "/update-faqs/:id",
      verifyJWT,
      authorizeAccess(["Owner"], "Settings"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const faqData = req.body;
          const filter = { _id: new ObjectId(id) };
          const updatedFAQSData = {
            $set: {
              ...faqData,
            },
          };

          const result = await faqCollection.updateOne(filter, updatedFAQSData);

          if (result.matchedCount === 0) {
            return res.status(404).send({ message: "faq not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error updating faq:", error);
          res
            .status(500)
            .send({ message: "Failed to update faq", error: error.message });
        }
      }
    );

    // get single faq
    app.get(
      "/get-single-faq/:id",
      verifyJWT,
      authorizeAccess(["Owner"], "Settings"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const query = { _id: new ObjectId(id) };
          const result = await faqCollection.findOne(query);

          if (!result) {
            return res.status(404).send({ message: "faq not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error fetching faq:", error);
          res
            .status(500)
            .send({ message: "Failed to fetch faq", error: error.message });
        }
      }
    );

    // add top header
    app.post(
      "/add-top-header",
      verifyJWT,
      authorizeAccess(["Owner"], "Settings"),
      originChecker,
      async (req, res) => {
        try {
          const headerData = req.body; // Should be an array
          const result = await topHeaderCollection.insertOne(headerData);
          res.send(result); // Send 201 status on success
        } catch (error) {
          console.error("Error adding top header:", error);
          res.status(500).send({ error: "Failed to add top header" }); // Send 500 status on error
        }
      }
    );

    // all header collection
    app.get("/get-all-header-collection", originChecker, async (req, res) => {
      try {
        const result = await topHeaderCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching header collection:", error);
        res.status(500).send({
          message: "Failed to fetch header collection",
          error: error.message,
        });
      }
    });

    //update a TOP HEADER Collection
    app.put(
      "/update-top-header/:id",
      verifyJWT,
      authorizeAccess(["Owner"], "Settings"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const topHeaderData = req.body;
          const filter = { _id: new ObjectId(id) };
          const updatedTopHeaderData = {
            $set: {
              ...topHeaderData,
            },
          };

          const result = await topHeaderCollection.updateOne(
            filter,
            updatedTopHeaderData
          );

          if (result.matchedCount === 0) {
            return res.status(404).send({ message: "top header not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error updating top header:", error);
          res.status(500).send({
            message: "Failed to update top header",
            error: error.message,
          });
        }
      }
    );

    // add our story information
    app.post(
      "/add-our-story-information",
      verifyJWT,
      authorizeAccess(["Owner"], "Settings"),
      originChecker,
      async (req, res) => {
        try {
          const storyData = req.body; // Should be an array
          const result = await ourStoryCollection.insertOne(storyData);
          res.send(result); // Send 201 status on success
        } catch (error) {
          console.error("Error adding our story information:", error);
          res
            .status(500)
            .send({ error: "Failed to add our story information" }); // Send 500 status on error
        }
      }
    );

    // all story collection frontend
    app.get(
      "/get-all-story-collection-frontend",
      originChecker,
      async (req, res) => {
        try {
          const today = new Date();
          const todayStr = today.toISOString().split("T")[0];

          const result = await ourStoryCollection
            .find({
              status: true,
              storyPublishDate: { $lte: todayStr }, // Compare as YYYY-MM-DD
            })
            .toArray();
          res.send(result);
        } catch (error) {
          console.error("Error fetching story collection:", error);
          res.status(500).send({
            message: "Failed to fetch story collection",
            error: error.message,
          });
        }
      }
    );

    // all story collection for backend
    app.get(
      "/get-all-story-collection-backend",
      verifyJWT,
      authorizeAccess(["Owner"], "Settings"),
      originChecker,
      async (req, res) => {
        try {
          const result = await ourStoryCollection.find().toArray();
          res.send(result);
        } catch (error) {
          console.error("Error fetching story collection:", error);
          res.status(500).send({
            message: "Failed to fetch story collection",
            error: error.message,
          });
        }
      }
    );

    // get single story
    app.get(
      "/get-single-story/:id",
      verifyJWT,
      authorizeAccess(["Owner"], "Settings"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;

          // Validate ObjectId format
          if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: "Invalid story ID format" });
          }

          const query = { _id: new ObjectId(id) };
          const result = await ourStoryCollection.findOne(query);

          if (!result) {
            return res.status(404).send({ message: "story not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error fetching story:", error);
          res
            .status(500)
            .send({ message: "Failed to fetch story", error: error.message });
        }
      }
    );

    //update a story Collection
    app.put(
      "/update-our-story/:id",
      verifyJWT,
      authorizeAccess(["Owner"], "Settings"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const storyData = req.body;
          const filter = { _id: new ObjectId(id) };
          const updatedStoryData = {
            $set: {
              ...storyData,
            },
          };

          const result = await ourStoryCollection.updateOne(
            filter,
            updatedStoryData
          );

          if (result.matchedCount === 0) {
            return res.status(404).send({ message: "story not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error updating story:", error);
          res
            .status(500)
            .send({ message: "Failed to update story", error: error.message });
        }
      }
    );

    // delete single story
    app.delete(
      "/delete-story/:id",
      verifyJWT,
      authorizeAccess(["Owner"], "Settings"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const query = { _id: new ObjectId(id) };
          const result = await ourStoryCollection.deleteOne(query);

          if (result.deletedCount === 0) {
            return res.status(404).send({ message: "story not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error deleting story:", error);
          res
            .status(500)
            .send({ message: "Failed to delete story", error: error.message });
        }
      }
    );

    // add logo
    app.post(
      "/add-logo",
      verifyJWT,
      authorizeAccess(["Owner"], "Settings"),
      originChecker,
      async (req, res) => {
        try {
          const logoData = req.body; // Should be an array
          const result = await logoCollection.insertOne(logoData);
          res.send(result); // Send 201 status on success
        } catch (error) {
          console.error("Error adding logo:", error);
          res.status(500).send({ error: "Failed to add logo" }); // Send 500 status on error
        }
      }
    );

    // all logo collection
    app.get("/get-all-logo", originChecker, async (req, res) => {
      try {
        const result = await logoCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching logo:", error);
        res.status(500).send({
          message: "Failed to fetch logo",
          error: error.message,
        });
      }
    });

    //update a logo Collection
    app.put(
      "/update-logo/:id",
      verifyJWT,
      authorizeAccess(["Owner"], "Settings"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const logoData = req.body;
          const filter = { _id: new ObjectId(id) };
          const updatedLogoData = {
            $set: {
              ...logoData,
            },
          };

          const result = await logoCollection.updateOne(
            filter,
            updatedLogoData
          );

          if (result.matchedCount === 0) {
            return res.status(404).send({ message: "logo not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error updating logo:", error);
          res
            .status(500)
            .send({ message: "Failed to update logo", error: error.message });
        }
      }
    );

    app.post("/inbound-email", async (req, res) => {
      try {
        const {
          recipient,
          subject,
          "stripped-html": strippedHtml,
          "stripped-text": strippedText,
        } = req.body;
        if (recipient !== "support@mg.poshax.shop") {
          return res.status(200).send("Invalid recipient");
        }
        const supportIdMatch = subject.match(/\[(\d+)\]/);
        if (!supportIdMatch) return res.status(200).send("No Support ID found");
        const supportId = supportIdMatch[1];

        const message = await customerSupportCollection.findOne({ supportId });
        if (!message) return res.status(200).send("Support ID not found");

        const replyEntry = {
          from: "customer",
          html: strippedHtml || strippedText,
          dateTime: new Date().toISOString(),
        };

        await customerSupportCollection.updateOne(
          { _id: message._id },
          { $push: { replies: replyEntry } }
        );
        res.status(200).send("Reply stored successfully");
      } catch (error) {
        console.error("Error processing inbound email:", error);
        res.status(500).send("Internal server error");
      }
    });

    // app.post(
    //   "/email-receive",
    //   express.urlencoded({ extended: true }),
    //   async (req, res) => {
    //     try {
    //       // Mailgun sends email fields in req.body
    //       const {
    //         recipient,
    //         sender,
    //         subject,
    //         "body-html": bodyHtml,
    //         "body-plain": bodyPlain,
    //         "stripped-text": strippedText,
    //         timestamp: timestamp,
    //         "Message-Id": messageId,
    //       } = req.body;

    //       console.log("📌 Parsed fields:", {
    //         recipient,
    //         sender,
    //         subject,
    //         bodyHtml,
    //         bodyPlain,
    //         strippedText,
    //         timestamp,
    //         messageId,
    //       });

    //       // Example: parse supportId from subject or email body (adjust regex to your needs)
    //       let supportIdMatch = subject?.match(/\[(SUP-\d{8}-\d+)\]/);
    //       let supportId = supportIdMatch?.[1];
    //       console.log("🆔 Extracted supportId from subject:", supportId);

    //       if (!supportId && bodyHtml) {
    //         const footerMatch = bodyHtml.match(
    //           /Support ID:\s*<strong>(SUP-\d{8}-\d+)<\/strong>/i
    //         );
    //         supportId = footerMatch?.[1];
    //         console.log("🆔 Extracted supportId from footer:", supportId);
    //       }

    //       const dateTime = timestamp
    //         ? new Date(parseInt(timestamp) * 1000)
    //         : new Date();

    //       if (supportId) {
    //         // Find existing thread by supportId
    //         const thread = await customerSupportCollection.findOne({
    //           supportId,
    //         });

    //         if (thread) {
    //           // Update thread with new reply
    //           await customerSupportCollection.updateOne(
    //             { _id: thread._id },
    //             {
    //               $push: {
    //                 replies: {
    //                   from: "customer",
    //                   html: bodyHtml || bodyPlain || strippedText || "",
    //                   dateTime,
    //                   messageId,
    //                 },
    //               },
    //               $set: { isRead: false },
    //             }
    //           );
    //           console.log(`Added reply to supportId ${supportId}`);
    //         } else {
    //           // If no thread found, optionally create new one or log
    //           console.warn(`Support ID ${supportId} not found in DB.`);
    //         }
    //       } else {
    //         console.warn(
    //           "No support ID found in subject or footer. Cannot link message."
    //         );
    //       }

    //       // Respond to Mailgun quickly
    //       res.status(200).send("OK");
    //     } catch (err) {
    //       console.error("Error processing inbound email:", err);
    //       res.status(500).send("Internal Server Error");
    //     }
    //   }
    // );

    // const getLastProcessedUID = async () => {
    //   const meta = await imapCollection.findOne({ _id: "imap-tracking" });
    //   return meta?.lastProcessedUID || 0;
    // };

    // const setLastProcessedUID = async (uid) => {
    //   await imapCollection.updateOne(
    //     { _id: "imap-tracking" },
    //     { $set: { lastProcessedUID: uid } },
    //     { upsert: true }
    //   );
    // };

    // const runImapListener = async () => {
    //   const imapClient = new ImapFlow({
    //     host: process.env.IMAP_HOST,
    //     port: process.env.IMAP_PORT,
    //     secure: true,
    //     auth: {
    //       user: process.env.EMAIL_USER,
    //       pass: process.env.EMAIL_PASS,
    //     },
    //     logger: false,
    //   });

    //   await imapClient.connect();

    //   let lock;
    //   try {
    //     lock = await imapClient.getMailboxLock("INBOX");

    //     let isFetching = false;

    //     imapClient.on("exists", async () => {
    //       if (isFetching) return; // Prevent overlapping fetches
    //       isFetching = true;

    //       try {
    //         const startUID = await getLastProcessedUID();
    //         const status = await imapClient.status("INBOX", { uidNext: true });
    //         const uidNext = status.uidNext;
    //         const adjustedStartUID = Math.max(startUID, uidNext - 1);

    //         // 💥 Defensive skip if UID looks outdated
    //         if (startUID < uidNext - 10) {
    //           console.warn(
    //             `[IMAP] Skipping fetch. startUID=${startUID}, uidNext=${uidNext}`
    //           );
    //           await setLastProcessedUID(uidNext - 1);
    //           isFetching = false;
    //           return;
    //         }

    //         // Fetch new emails from last processed UID + 1
    //         for await (let message of imapClient.fetch(
    //           `${adjustedStartUID + 1}:*`,
    //           {
    //             uid: true,
    //             envelope: true,
    //             source: true,
    //           }
    //         )) {
    //           if (message.uid <= startUID) continue; // ✅ Prevent duplicate processing

    //           const parsed = await simpleParser(message.source);
    //           const fromEmail = parsed.from?.value?.[0]?.address;
    //           const html = parsed.html || parsed.textAsHtml || parsed.text;
    //           const dateTime = parsed.date || new Date().toISOString();
    //           const subject = parsed.subject || "";

    //           // Skip self-sent support emails
    //           if (fromEmail === process.env.EMAIL_USER) continue;

    //           // === Extract supportId from subject if present ===
    //           let supportIdMatch = subject.match(/\[(SUP-\d{8}-\d+)\]/);
    //           let supportId = supportIdMatch?.[1];

    //           // === If not found in subject, try extracting from footer in HTML ===
    //           if (!supportId && html) {
    //             const footerMatch = html.match(
    //               /Support ID:\s*<strong>(SUP-\d{8}-\d+)<\/strong>/i
    //             );
    //             supportId = footerMatch?.[1];
    //           }

    //           if (supportId) {
    //             const thread = await customerSupportCollection.findOne({
    //               supportId,
    //             });

    //             if (thread) {
    //               await customerSupportCollection.updateOne(
    //                 { _id: thread._id },
    //                 {
    //                   $push: {
    //                     replies: {
    //                       from: "customer",
    //                       html,
    //                       dateTime,
    //                     },
    //                   },
    //                   $set: {
    //                     isRead: false,
    //                   },
    //                 }
    //               );
    //             } else {
    //               console.warn(
    //                 "Support ID found but no matching thread in DB:",
    //                 supportId
    //               );
    //             }
    //           } else {
    //             // await customerSupportCollection.insertOne({

    //             //   email: fromEmail,
    //             //   name: parsed.from?.text,
    //             //   topic: parsed.subject,
    //             //   message: html,
    //             //   dateTime,
    //             //   replies: [],
    //             //   isRead: false,
    //             //   supportId: null,
    //             //   status: "untracked", // or "unlinked"
    //             //   source: "direct-email",
    //             // });
    //             console.warn(
    //               "No support ID found in subject or footer. Cannot link message."
    //             );
    //           }

    //           // Save processed UID after handling each message
    //           await setLastProcessedUID(message.uid);
    //         }
    //       } catch (err) {
    //         console.error("Error processing new messages:", err);
    //       } finally {
    //         isFetching = false;
    //       }
    //     });
    //   } catch (err) {
    //     console.error("Error during IMAP listener setup:", err);
    //   } finally {
    //     if (lock) {
    //       try {
    //         await lock.release();
    //       } catch (releaseErr) {
    //         console.error("Failed to release mailbox lock:", releaseErr);
    //       }
    //     }
    //   }
    // };

    // runImapListener().catch(console.dir);

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Fashion-Commerce server is running");
});

const server = app.listen(port, () => {
  console.log(`Fashion-Commerce server is running on port ${port}`);
});

const shutdown = async (server = null, exitCode = 0) => {
  try {
    console.log("Shutting down gracefully...");

    // Close server if it exists (useful on VPS/GCP)
    if (server && server.close) {
      await new Promise((resolve) => server.close(resolve));
    }

    // Close DB connection
    if (client && client.topology?.isConnected?.()) {
      await client.close();
    }

    console.log("All resources closed. Exiting.");
    process.exit(exitCode);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
};

//Pass the server instance
process.once("SIGTERM", () => shutdown(server, 0));
process.once("SIGINT", () => shutdown(server, 0));

// Error Handling
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  shutdown(server, 1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  shutdown(server, 1);
});
