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
const cron = require("node-cron");
const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const generateCustomerId = require("./utils/generateCustomerId");
const generateOrderId = require("./utils/generateOrderId");
const getImageSetsBasedOnColors = require("./utils/getImageSetsBasedOnColors");
const {
  checkIfSpecialOfferIsAvailable,
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
const getResetPasswordEmailOptions = require("./utils/email/getResetPasswordEmailOptions");
const getContactEmailOptions = require("./utils/email/getContactEmailOptions");
const getWelcomeEmailOptions = require("./utils/email/getWelcomeEmailOptions");
const getNotifyRequestEmailOptions = require("./utils/email/getNotifyRequestEmailOptions");
const getAbandonedCartEmailOptions = require("./utils/email/getAbandonedCartEmailOptions");
const getReturnRequestEmailOptions = require("./utils/email/getReturnRequestEmailOptions");
const {
  generateOtp,
  sendOtpEmail,
  getInitialPageFromPermissions,
} = require("./utils/auth/authUtils");
const { isValidDate, isWithinLast3Days } = require("./utils/date/dateUtils");
const getInvitationEmailOptions = require("./utils/email/getInvitationEmailOptions");
const getStockUpdateEmailOptions = require("./utils/email/getStockUpdateEmailOptions");

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

const bucket = storage.bucket("media.poshax.shop"); // Make sure this bucket exists

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
      // };

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

    if (process.env.NODE_ENV === "production") {
      try {
        const marketingStatsCollection = client
          .db("fashion-commerce")
          .collection("marketing-stats");

        const endDate = new Date();
        endDate.setDate(endDate.getDate() - 1);
        const startDateStr = endDate.toISOString().slice(0, 10);
        const endDateStr = startDateStr;

        const property = `properties/${process.env.GA4_PROPERTY_ID}`;

        const analyticsClient = new BetaAnalyticsDataClient({
          projectId: process.env.GA_PROJECT_ID,
          credentials: {
            client_email: process.env.GA_CLIENT_EMAIL,
            private_key: process.env.GA_PRIVATE_KEY.replace(/\\n/g, "\n"),
          },
        });

        const request = {
          property,
          dateRanges: [{ startDate: startDateStr, endDate: endDateStr }],
          dimensions: [
            { name: "date" },
            { name: "sessionDefaultChannelGroup" }, // channel like "Organic Search", "Social"
            { name: "sessionSource" }, // e.g. facebook.com
            { name: "sessionMedium" }, // e.g. cpc, organic
          ],
          metrics: [
            { name: "sessions" },
            { name: "activeUsers" },
            { name: "totalUsers" },
            { name: "engagedSessions" },
          ],
        };

        // schedule every 6 hours: minute 0 past every 6th hour
        cron.schedule(
          "0 */6 * * *",
          async () => {
            console.log("Starting ETL", new Date());

            const [response] = await analyticsClient.runReport(request);
            if (!response.rows) {
              return console.error(
                "No rows returned for",
                startDateStr,
                endDateStr
              );
            }

            // map response -> documents
            const docs = response.rows.map((row) => {
              const dimVals = row.dimensionValues.map((d) => d.value);
              const metVals = row.metricValues.map((m) => Number(m.value));
              return {
                date: dimVals[0],
                channel: dimVals[1] || "(not set)",
                source: dimVals[2] || "(not set)",
                medium: dimVals[3] || "(not set)",
                sessions: metVals[0] || 0,
                activeUsers: metVals[1] || 0,
                totalUsers: metVals[2] || 0,
                engagedSessions: metVals[3] || 0,
                fetchedAt: new Date(),
              };
            });

            // upsert per unique key (date + channel + source + medium) to avoid duplicates
            const ops = docs.map((doc) => ({
              updateOne: {
                filter: {
                  date: doc.date,
                  channel: doc.channel,
                  source: doc.source,
                  medium: doc.medium,
                },
                update: { $set: doc },
                upsert: true,
              },
            }));

            if (ops.length) {
              const res = await marketingStatsCollection.bulkWrite(ops);
              console.log("Upserted docs:", res);
            }
          },
          { timezone: "Asia/Dhaka" }
        );
      } catch (error) {
        console.error("Google Analytics:", error);
      }
    }

    if (process.env.NODE_ENV === "production") {
      cron.schedule("*/30 * * * *", async () => {
        try {
          const cronLocksCollection = client
            .db("fashion-commerce")
            .collection("cron-locks");

          const now = new Date();
          const lockExpiration = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes TTL

          // Try to insert a lock
          const result = await cronLocksCollection.insertOne({
            _id: "abandoned-cart-cron-lock",
            createdAt: now,
            expiresAt: lockExpiration,
          });

          if (!result.insertedId) {
            return console.error(
              "Cron lock error: Another instance is already running the cron."
            );
          }

          // Create a TTL index if it doesn’t already exist
          await cronLocksCollection.createIndex(
            { expiresAt: 1 },
            { expireAfterSeconds: 0 }
          );

          const twelveHoursAgo = new Date(now - 12 * 60 * 60 * 1000);
          const thirtySixHoursAgo = new Date(now - 36 * 60 * 60 * 1000);
          // const fiveMinutesAgo = new Date(now - 5 * 60 * 1000); // Quick time for testing only
          // const fifteenMinutesAgo = new Date(now - 15 * 60 * 1000); // Quick time for testing only

          const products = await productInformationCollection.find().toArray();
          const specialOffers = await offerCollection.find().toArray();

          // Send first email after 12h
          const firstStageUsers = await customerListCollection
            .find({
              cartLastModifiedAt: {
                $lte: twelveHoursAgo,
                $gt: thirtySixHoursAgo,
                // $lte: fiveMinutesAgo, // Quick time for testing only
                // $gt: fifteenMinutesAgo, // Quick time for testing only
              },
              abandonedEmailStage: { $lt: 1 },
              cartItems: { $exists: true, $ne: [] },
            })
            .toArray();

          for (const user of firstStageUsers) {
            const cartItems = user.cartItems.map((cartItem) => {
              const product = products.find(
                (product) => product._id.toString() == cartItem._id
              );

              const title = product.productTitle;
              const pageUrl = `${
                process.env.MAIN_DOMAIN_URL
              }/product/${product.productTitle
                .split(" ")
                .join("-")
                .toLowerCase()}`;
              const imageUrl = product.productVariants[0].imageUrls[0];
              const isOnlyRegularDiscountAvailable =
                checkIfOnlyRegularDiscountIsAvailable(product, specialOffers);
              const price = calculateFinalPrice(product, specialOffers);
              const originalPrice = isOnlyRegularDiscountAvailable
                ? Number(product.regularPrice)
                : null;
              const quantity = cartItem.selectedQuantity;
              const size = cartItem.selectedSize;
              const color = {
                name: cartItem.selectedColor.label,
                code: cartItem.selectedColor.color,
              };

              return {
                title,
                pageUrl,
                imageUrl,
                price,
                originalPrice,
                quantity,
                size,
                color,
              };
            });

            const mailResult = await transport.sendMail(
              getAbandonedCartEmailOptions(
                user.email,
                user.userInfo.personalInfo.customerName,
                cartItems
              )
            );

            if (!mailResult?.accepted?.length)
              return console.error(
                "Failed to send the first abandoned cart email."
              );

            await customerListCollection.updateOne(
              { email: user.email },
              { $set: { abandonedEmailStage: 1 } }
            );
          }

          // Send second email after 36h
          const secondStageUsers = await customerListCollection
            .find({
              cartLastModifiedAt: {
                $lte: thirtySixHoursAgo,
                // $lte: fifteenMinutesAgo, // Quick time for testing only
              },
              abandonedEmailStage: { $lt: 2 },
              cartItems: { $exists: true, $ne: [] },
            })
            .toArray();

          for (const user of secondStageUsers) {
            const cartItems = user.cartItems.map((cartItem) => {
              const product = products.find(
                (product) => product._id.toString() == cartItem._id
              );

              const title = product.productTitle;
              const pageUrl = `${
                process.env.MAIN_DOMAIN_URL
              }/product/${product.productTitle
                .split(" ")
                .join("-")
                .toLowerCase()}`;
              const imageUrl = product.productVariants[0].imageUrls[0];
              const isOnlyRegularDiscountAvailable =
                checkIfOnlyRegularDiscountIsAvailable(product, specialOffers);
              const price = calculateFinalPrice(product, specialOffers);
              const originalPrice = isOnlyRegularDiscountAvailable
                ? Number(product.regularPrice)
                : null;
              const quantity = cartItem.selectedQuantity;
              const size = cartItem.selectedSize;
              const color = {
                name: cartItem.selectedColor.label,
                code: cartItem.selectedColor.color,
              };

              return {
                title,
                pageUrl,
                imageUrl,
                price,
                originalPrice,
                quantity,
                size,
                color,
              };
            });

            const mailResult = await transport.sendMail(
              getAbandonedCartEmailOptions(
                user.email,
                user.userInfo.personalInfo.customerName,
                cartItems
              )
            );

            if (!mailResult?.accepted?.length)
              return console.error(
                "Failed to send the second abandoned cart email."
              );

            await customerListCollection.updateOne(
              { email: user.email },
              { $set: { abandonedEmailStage: 2 } }
            );
          }

          // Delete the lock early
          // await cronLocksCollection.deleteOne({
          //   _id: "abandoned-cart-cron-lock",
          // });
        } catch (error) {
          if (error.code === 11000) {
            console.error(
              "Cron lock already acquired by another instance. Skipping."
            );
          } else {
            console.error("Abandoned cart cron job error:", error);
          }
        }
      });
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
            publicUrl: `https://${bucket.name}/${file.name}`,
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

            const publicUrl = `https://${bucket.name}/${blob.name}`;
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

                const publicUrl = `https://${bucket.name}/${blob.name}`;
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
                const mailResult = await transport.sendMail(
                  getInvitationEmailOptions(email, magicLink)
                );

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
            const mailResult = await transport.sendMail(
              getInvitationEmailOptions(email, magicLink)
            );

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

            const promoInfo = await promoCollection.findOne({
              isWelcomeEmailPromoCode: true,
              promoStatus: true,
              $expr: {
                $gt: [
                  {
                    $dateAdd: {
                      startDate: { $toDate: "$expiryDate" }, // convert string to date
                      unit: "day",
                      amount: 1, // add 1 day so it expires end of the date
                    },
                  },
                  new Date(),
                ],
              },
            });

            const promo = !promoInfo
              ? null
              : {
                  code: promoInfo?.promoCode,
                  amount:
                    promoInfo?.promoDiscountType === "Percentage"
                      ? promoInfo?.promoDiscountValue + "%"
                      : "৳ " + promoInfo?.promoDiscountValue,
                };

            const productList = await productInformationCollection
              .find()
              .toArray();
            const specialOffers = await offerCollection.find().toArray();
            const primaryLocation = await locationCollection.findOne({
              isPrimaryLocation: true,
            });

            const filteredProducts = productList
              .filter((product) => {
                const isInStock =
                  product.productVariants
                    ?.filter(
                      (variant) =>
                        variant?.location === primaryLocation.locationName
                    )
                    .reduce((acc, variant) => acc + Number(variant?.sku), 0) >
                  0;

                return (
                  product.status === "active" &&
                  !checkIfSpecialOfferIsAvailable(product, specialOffers) &&
                  isInStock
                );
              })
              .slice(0, 3);

            const truncateTitle = (title, maxChars = 16) => {
              return title.length > maxChars
                ? title.slice(0, maxChars).trim() + "..."
                : title;
            };

            const products = filteredProducts.map((product) => {
              const title = truncateTitle(product.productTitle);
              const pageUrl = `${
                process.env.MAIN_DOMAIN_URL
              }/product/${product.productTitle
                .split(" ")
                .join("-")
                .toLowerCase()}`;
              const imageUrl = product.productVariants[0].imageUrls[0];
              const isOnlyRegularDiscountAvailable =
                checkIfOnlyRegularDiscountIsAvailable(product, specialOffers);
              const price = calculateFinalPrice(product, specialOffers);
              const originalPrice = isOnlyRegularDiscountAvailable
                ? Number(product.regularPrice)
                : null;

              return {
                title,
                pageUrl,
                imageUrl,
                price,
                originalPrice,
              };
            });

            const mailResult = await transport.sendMail(
              getWelcomeEmailOptions(name, email, promo, products)
            );

            // Check if email was sent successfully
            if (!mailResult?.accepted?.length) {
              return res.status(500).json({
                success: false,
                message: "Failed to send the welcome email.",
              });
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

        const promoInfo = await promoCollection.findOne({
          isWelcomeEmailPromoCode: true,
          promoStatus: true,
          $expr: {
            $gt: [
              {
                $dateAdd: {
                  startDate: { $toDate: "$expiryDate" }, // convert string to date
                  unit: "day",
                  amount: 1, // add 1 day so it expires end of the date
                },
              },
              new Date(),
            ],
          },
        });

        const promo = !promoInfo
          ? null
          : {
              code: promoInfo?.promoCode,
              amount:
                promoInfo?.promoDiscountType === "Percentage"
                  ? promoInfo?.promoDiscountValue + "%"
                  : "৳ " + promoInfo?.promoDiscountValue,
            };

        const productList = await productInformationCollection.find().toArray();
        const specialOffers = await offerCollection.find().toArray();
        const primaryLocation = await locationCollection.findOne({
          isPrimaryLocation: true,
        });

        const filteredProducts = productList
          .filter((product) => {
            const isInStock =
              product.productVariants
                ?.filter(
                  (variant) =>
                    variant?.location === primaryLocation.locationName
                )
                .reduce((acc, variant) => acc + Number(variant?.sku), 0) > 0;

            return (
              product.status === "active" &&
              !checkIfSpecialOfferIsAvailable(product, specialOffers) &&
              isInStock
            );
          })
          .slice(0, 3);

        const truncateTitle = (title, maxChars = 16) => {
          return title.length > maxChars
            ? title.slice(0, maxChars).trim() + "..."
            : title;
        };

        const products = filteredProducts.map((product) => {
          const title = truncateTitle(product.productTitle);
          const pageUrl = `${
            process.env.MAIN_DOMAIN_URL
          }/product/${product.productTitle.split(" ").join("-").toLowerCase()}`;
          const imageUrl = product.productVariants[0].imageUrls[0];
          const isOnlyRegularDiscountAvailable =
            checkIfOnlyRegularDiscountIsAvailable(product, specialOffers);
          const price = calculateFinalPrice(product, specialOffers);
          const originalPrice = isOnlyRegularDiscountAvailable
            ? Number(product.regularPrice)
            : null;

          return {
            title,
            pageUrl,
            imageUrl,
            price,
            originalPrice,
          };
        });

        const mailResult = await transport.sendMail(
          getWelcomeEmailOptions(data.name, data.email, promo, products)
        );

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
        supportId: { $regex: `^PXT-${dateStr}-` },
      });

      // Step 2: Format counter (001, 002, etc.)
      const paddedCounter = String(countToday + 1).padStart(3, "0");

      // Step 3: Generate supportId
      const supportId = `PXT-${dateStr}-${paddedCounter}`;

      const customerInput = {
        supportId,
        name,
        email,
        phone,
        topic,
        message: {
          html: message,
          attachments: [],
        },
        isRead,
        replies: [],
        dateTime: date.toISOString(),
      };

      if (!name || !email || !phone || !topic || !message) {
        return res.status(400).json({
          success: false,
          message: "Required fields are not filled up.",
        });
      }

      try {
        const result = await transport.sendMail(
          getContactEmailOptions(name, email)
        );

        // Check if the email was sent successfully
        if (result?.accepted?.length > 0) {
          // ✅ Now save to DB only if email was sent
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
          from: `"PoshaX Support Team" <${process.env.EMAIL_USER}>`,
          to: message.email,
          subject: `Re: ${message.topic} [${message.supportId}] `,
          html: fullHtml,
        };

        const mailResult = await transport.sendMail(mailOptions);

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

          const mailResult = await transport.sendMail(
            getResetPasswordEmailOptions(fullName, email, resetLink)
          );

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
          const {
            productTitle,
            regularPrice,
            weight,
            batchCode,
            thumbnailImageUrl,
            discountType,
            discountValue,
            productDetails,
            materialCare,
            sizeFit,
            category,
            subCategories,
            groupOfSizes,
            allSizes,
            availableColors,
            newArrival,
            trending,
            vendors,
            tags,
            productVariants,
            selectedShippingZoneIds,
            status,
            season,
            sizeGuideImageUrl,
            restOfOutfit,
            isInventoryShown,
          } = req.body;

          // Validate product ID
          if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid product ID" });
          }

          const filter = { _id: new ObjectId(id) };

          // 1. Fetch the current product (before update)
          const existingProduct = await productInformationCollection.findOne(
            filter,
            { readPreference: "primary" }
          );

          if (!existingProduct) {
            return res.status(404).send({ message: "Product not found" });
          }

          // Fetch primary and active locations
          const primaryLocationDoc = await locationCollection.findOne(
            { isPrimaryLocation: true, status: true },
            { readPreference: "primary" }
          );
          if (!primaryLocationDoc) {
            return res
              .status(500)
              .json({ message: "Primary location not found or not active" });
          }

          const activeLocations = await locationCollection
            .find({ status: true }, { readPreference: "primary" })
            .toArray();
          const activeLocationNames = activeLocations.map(
            (loc) => loc.locationName
          );

          // Validate required fields (matching client-side checks)
          const errors = [];
          if (!productTitle?.trim()) errors.push("Title is required.");
          if (!regularPrice || !Number.isFinite(Number(regularPrice)))
            errors.push(
              "Regular price is required and must be a valid number."
            );
          if (!batchCode?.trim()) errors.push("Batch code is required.");
          if (!thumbnailImageUrl?.trim())
            errors.push("Thumbnail image is required.");
          if (!productDetails?.trim())
            errors.push("Product details are required.");
          if (productDetails?.trim().length < 10)
            errors.push("Product details must be at least 10 characters.");
          if (!Array.isArray(groupOfSizes) || groupOfSizes.length === 0)
            errors.push("At least one size range is required.");
          if (!Array.isArray(allSizes) || allSizes.length === 0)
            errors.push("At least one size is required.");
          if (!Array.isArray(availableColors) || availableColors.length === 0)
            errors.push("At least one color is required.");
          if (!Array.isArray(tags) || tags.length === 0)
            errors.push("At least one tag is required.");
          if (newArrival === undefined || newArrival === "")
            errors.push("New Arrival selection is required.");
          if (trending === undefined || trending === "")
            errors.push("Trending selection is required.");
          if (!Array.isArray(season) || season.length === 0)
            errors.push("At least one season is required.");
          if (
            productVariants?.some(
              (v) => !Array.isArray(v.imageUrls) || v.imageUrls.length < 2
            )
          ) {
            errors.push("Each variant must have at least 2 images.");
          }

          // Validate that productVariants covers all active locations (including primary)
          // if (Array.isArray(productVariants)) {
          //   const expectedVariants = availableColors.flatMap((color) =>
          //     allSizes.flatMap((size) =>
          //       activeLocationNames.map((locationName) => ({
          //         color: color.value,
          //         size: String(size),
          //         locationName,
          //       }))
          //     )
          //   );
          //   const actualVariants = productVariants.map((v) => ({
          //     color: v.color.color,
          //     size: String(v.size),
          //     locationName: v.location,
          //   }));
          //   const missingVariants = expectedVariants.filter(
          //     (exp) =>
          //       !actualVariants.some(
          //         (act) =>
          //           act.color === exp.color &&
          //           act.size === exp.size &&
          //           act.locationName === exp.locationName
          //       )
          //   );

          //   if (missingVariants.length > 0) {
          //     errors.push(
          //       "Product variants must include all active locations (including primary) for each color and size."
          //     );
          //   }
          // } else {
          //   errors.push("Product variants are required.");
          // }

          if (errors.length > 0) {
            return res
              .status(400)
              .json({ message: "Validation failed", errors });
          }

          // Prepare update object, preserving existing sku and onHandSku in productVariants
          const updateFields = {
            productTitle,
            regularPrice: Number(regularPrice),
            weight: weight ? Number(weight) : undefined,
            batchCode,
            thumbnailImageUrl,
            discountType,
            discountValue: discountValue ? Number(discountValue) : 0,
            productDetails,
            materialCare,
            sizeFit,
            category,
            subCategories: subCategories || [],
            groupOfSizes,
            allSizes,
            availableColors,
            newArrival,
            trending,
            vendors: vendors || [],
            tags,
            selectedShippingZoneIds: selectedShippingZoneIds || [],
            status,
            season,
            sizeGuideImageUrl,
            restOfOutfit: restOfOutfit || [],
            isInventoryShown,
            productVariants: productVariants.map((variant) => ({
              color: variant.color,
              size: variant.size,
              location: variant.location,
              imageUrls: variant.imageUrls,
              sku:
                existingProduct.productVariants.find(
                  (ev) =>
                    ev.color.color === variant.color.color &&
                    ev.size === variant.size &&
                    ev.location === variant.location
                )?.sku || 0,
              onHandSku:
                existingProduct.productVariants.find(
                  (ev) =>
                    ev.color.color === variant.color.color &&
                    ev.size === variant.size &&
                    ev.location === variant.location
                )?.onHandSku || 0,
              returnSku:
                existingProduct.productVariants.find(
                  (ev) =>
                    ev.color.color === variant.color.color &&
                    ev.size === variant.size &&
                    ev.location === variant.location
                )?.returnSku || 0,
              forfeitedSku:
                existingProduct.productVariants.find(
                  (ev) =>
                    ev.color.color === variant.color.color &&
                    ev.size === variant.size &&
                    ev.location === variant.location
                )?.forfeitedSku || 0,
            })),
          };

          // Update the product
          const result = await productInformationCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateFields },
            { writeConcern: { w: "majority" } }
          );

          // Respond based on update result
          if (result.modifiedCount > 0) {
            res.json({
              success: true,
              message: "Product updated successfully",
              modifiedCount: result.modifiedCount,
            });
          } else {
            res.json({
              success: false,
              message: "No changes made",
              modifiedCount: result.modifiedCount,
            });
          }
        } catch (error) {
          console.error("Error updating product details:", error);
          res.status(500).json({
            message: "Failed to update product details",
            error: error.message,
          });
        }
      }
    );

    // Helper function to compute SKU in primary location for a specific product/color/size
    async function computePrimarySku(
      productId,
      colorCode,
      size,
      primaryLocation
    ) {
      // Normalize inputs
      const normalizedProductId = productId?.trim();
      const normalizedColorCode = colorCode?.trim().toUpperCase();
      const normalizedSize = String(size).trim(); // Convert to string for consistency
      const normalizedPrimaryLocation = primaryLocation?.trim();

      const product = await productInformationCollection.findOne(
        { productId: normalizedProductId },
        { projection: { productVariants: 1 }, readPreference: "primary" } // Read from primary node
      );

      if (!product) {
        console.log(`No product found for productId: ${normalizedProductId}`);
        return 0;
      }

      const variants = product.productVariants || [];
      // console.log(
      //   `Found ${variants.length} variants for productId: ${normalizedProductId}`
      // );

      for (const variant of variants) {
        const variantColor = variant.color?.color?.trim().toUpperCase();
        const variantSize = String(variant.size).trim(); // Convert to string for comparison
        const variantLocation = variant.location?.trim();

        // console.log(
        //   `Checking variant: color=${variantColor}, size=${variantSize} (type=${typeof variant.size}), location=${variantLocation} ` +
        //     `against input: color=${normalizedColorCode}, size=${normalizedSize} (type=${typeof size}), location=${normalizedPrimaryLocation}`
        // );

        // Compare size as both string and number to handle database inconsistencies
        const sizeMatches =
          variantSize === normalizedSize ||
          Number(variantSize) === Number(normalizedSize);

        if (
          variantColor === normalizedColorCode &&
          sizeMatches &&
          variantLocation === normalizedPrimaryLocation
        ) {
          const sku = Number(variant.sku) || 0;
          // console.log(
          //   `Found SKU: ${sku} for productId: ${normalizedProductId}, colorCode: ${colorCode}, size: ${size}, location: ${normalizedPrimaryLocation}`
          // );
          return sku;
        }
      }

      // console.log(
      //   `No variant found for productId: ${normalizedProductId}, colorCode: ${colorCode}, size: ${size}, location: ${normalizedPrimaryLocation}`
      // );
      return 0;
    }

    // Purchase stock in an location
    app.patch(
      "/receiveStock",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const { variants } = req.body;
          if (!Array.isArray(variants) || variants.length === 0) {
            return res
              .status(400)
              .json({ error: "Variants array is required" });
          }

          // De-dupe incoming rows on (productId,colorCode,size,location) and sum accept
          const bucket = new Map();
          for (const v of variants) {
            const key = `${v.productId}||${v.colorCode}||${v.size}||${v.location}`;
            const a = Number(v.accept);
            if (!bucket.has(key)) {
              bucket.set(key, {
                productId: v.productId,
                colorCode: v.colorCode,
                size: v.size,
                location: v.location,
                accept: isNaN(a) ? 0 : a,
              });
            } else {
              bucket.get(key).accept += isNaN(a) ? 0 : a;
            }
          }

          const items = Array.from(bucket.values());

          const primaryLocationDetails = await locationCollection.findOne(
            {
              isPrimaryLocation: true,
            },
            { readPreference: "primary" }
          );
          const primaryLocation = primaryLocationDetails?.locationName;
          // console.log(primaryLocation, "primaryLocation");

          // Collect unique {productId, colorCode, size} combos that are being updated
          const uniqueCombos = new Set();
          for (const item of items) {
            const key = `${item.productId}||${item.colorCode}||${item.size}`;
            uniqueCombos.add(key);
          }

          // Use moment-timezone to format dateTime
          const dateTime = moment().tz("Asia/Dhaka").format("DD-MM-YY | HH:mm");

          // Compute before primary SKU for each unique combo
          const beforePrimarySkus = new Map();
          for (const key of uniqueCombos) {
            const [productId, colorCode, size] = key.split("||");
            const sku = await computePrimarySku(
              productId,
              colorCode,
              size,
              primaryLocation
            );
            beforePrimarySkus.set(key, sku);
            // console.log(`Before SKU for ${key}: ${sku}`);
          }

          const results = [];

          for (const item of items) {
            const { productId, colorCode, size, location } = item;
            const accept = Number(item.accept);

            // Basic validation
            if (!productId || !colorCode || size == null || !location) {
              results.push({
                productId,
                colorCode,
                size,
                location,
                success: false,
                error: "Missing required fields",
              });
              continue;
            }
            if (!Number.isFinite(accept) || accept <= 0) {
              results.push({
                productId,
                colorCode,
                size,
                location,
                success: false,
                error: "Accept must be a positive number",
              });
              continue;
            }

            // 1) Try to increment existing (productId,colorCode,size,location)
            const incRes = await productInformationCollection.updateOne(
              { productId },
              {
                $inc: {
                  "productVariants.$[v].sku": accept,
                  "productVariants.$[v].onHandSku": accept,
                },
              },
              {
                arrayFilters: [
                  {
                    "v.color.color": colorCode,
                    "v.size": size,
                    "v.location": location,
                  },
                ],
                writeConcern: { w: "majority" }, // Ensure update is committed
              }
            );

            if (incRes.modifiedCount > 0) {
              results.push({
                productId,
                colorCode,
                size,
                location,
                success: true,
                updated: true,
                message: "Stock received, variant updated",
              });
            } else {
              results.push({
                productId,
                colorCode,
                size,
                location,
                success: false,
                error:
                  "Variant not found for the specified product, color, size, and location",
              });
            }
          }

          // Check if any updates failed
          const failedUpdates = results.filter((update) => !update.success);
          if (failedUpdates.length > 0) {
            return res.status(400).json({
              results,
              message: `Failed to update ${failedUpdates.length} variant(s)`,
            });
          }

          // After successful updates, check which combos had primary SKU go from 0 to >0
          const updatedCombos = [];
          for (const key of uniqueCombos) {
            const [productId, colorCode, size] = key.split("||");
            const afterSku = await computePrimarySku(
              productId,
              colorCode,
              size,
              primaryLocation
            );
            // console.log(`After SKU for ${key}: ${afterSku}`);

            if (beforePrimarySkus.get(key) === 0 && afterSku > 0) {
              updatedCombos.push({ productId, colorCode, size });
            }
          }

          // console.log(`Updated combos: ${JSON.stringify(updatedCombos)}`);

          // Send notifications for updated combos
          if (updatedCombos.length > 0) {
            for (const combo of updatedCombos) {
              const { productId, colorCode, size } = combo;

              const product = await productInformationCollection.findOne(
                {
                  productId,
                },
                { readPreference: "primary" }
              );
              const mongoId = product._id.toHexString().trim();
              // console.log(mongoId, "mongoId");

              // Normalize size for notification query
              const normalizedSize = String(size).trim();

              const notificationDoc = await availabilityNotifications.findOne(
                {
                  productId: mongoId,
                  colorCode: colorCode,
                  $or: [
                    { size: normalizedSize },
                    { size: Number(normalizedSize) },
                  ],
                },
                { readPreference: "primary" }
              );

              if (notificationDoc) {
                const emailsToNotify = notificationDoc.emails.filter(
                  (emailObj) => emailObj.notified === false
                );

                for (const emailObj of emailsToNotify) {
                  const { email, notified } = emailObj;

                  // Skip already notified emails
                  if (notified) continue;

                  const user = await customerListCollection.findOne({ email });

                  if (!user) {
                    console.error(`No user found for email: ${email}`);
                    continue;
                  }

                  const selectedProduct =
                    await productInformationCollection.findOne(
                      {
                        productId,
                      },
                      { readPreference: "primary" }
                    );
                  const specialOffers = await offerCollection.find().toArray();

                  const isOnlyRegularDiscountAvailable =
                    checkIfOnlyRegularDiscountIsAvailable(
                      selectedProduct,
                      specialOffers
                    );

                  const selectedVariant = selectedProduct.productVariants.find(
                    (variant) =>
                      variant.color.color == colorCode &&
                      (String(variant.size) === normalizedSize ||
                        Number(variant.size) === Number(normalizedSize))
                  );

                  if (!selectedVariant) {
                    console.error(
                      `No variant found for productId: ${productId}, colorCode: ${colorCode}, size: ${size}`
                    );
                    continue;
                  }

                  const colorName = selectedVariant.color.label;
                  const imageUrl = selectedVariant.imageUrls[0];

                  const notifiedProduct = {
                    pageUrl: `${
                      process.env.MAIN_DOMAIN_URL
                    }/product/${selectedProduct.productTitle
                      .split(" ")
                      .join("-")
                      .toLowerCase()}?productId=${mongoId}&colorCode=${encodeURIComponent(
                      colorCode
                    )}&size=${encodeURIComponent(size)}`,
                    imageUrl,
                    title: selectedProduct.productTitle,
                    price: calculateFinalPrice(selectedProduct, specialOffers),
                    originalPrice: isOnlyRegularDiscountAvailable
                      ? Number(selectedProduct.regularPrice)
                      : null,
                    size,
                    color: {
                      code: colorCode,
                      name: colorName,
                    },
                    customerName: user.userInfo.personalInfo.customerName,
                  };

                  // console.log(
                  //   `Notified product for ${email}: ${JSON.stringify(
                  //     notifiedProduct
                  //   )}`
                  // );

                  try {
                    const mailResult = await transport.sendMail(
                      getStockUpdateEmailOptions(email, notifiedProduct)
                    );

                    // Check if email was sent successfully
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
                            "emails.$.updatedDateTime": dateTime,
                          },
                        }
                      );
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

          return res.json({
            results,
            message: "All variants updated successfully",
          });
        } catch (err) {
          console.error("Error in receiveStock patch route:", err);
          res.status(500).json({ error: "Internal server error" });
        }
      }
    );

    // Transfer stock between locations
    app.patch(
      "/transferStock",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const { variants } = req.body;
          if (!Array.isArray(variants) || variants.length === 0) {
            return res
              .status(400)
              .json({ error: "Variants array is required" });
          }

          // De-dupe incoming rows on (productId, colorCode, size, originName, destinationName)
          const bucket = new Map();
          for (const v of variants) {
            const key = `${v.productId}||${v.colorCode}||${v.size}||${v.originName}||${v.destinationName}`;
            const a = Number(v.accept);
            if (!bucket.has(key)) {
              bucket.set(key, {
                productId: v.productId,
                colorCode: v.colorCode,
                size: v.size,
                originName: v.originName,
                destinationName: v.destinationName,
                accept: isNaN(a) ? 0 : a,
              });
            } else {
              bucket.get(key).accept += isNaN(a) ? 0 : a;
            }
          }

          const items = Array.from(bucket.values());

          const primaryLocationDetails = await locationCollection.findOne(
            { isPrimaryLocation: true },
            { readPreference: "primary" }
          );
          const primaryLocation = primaryLocationDetails?.locationName;

          // Collect unique {productId, colorCode, size} combos for transfers to primary location
          const uniqueCombos = new Set();
          for (const item of items) {
            if (item.destinationName === primaryLocation) {
              const key = `${item.productId}||${item.colorCode}||${item.size}`;
              uniqueCombos.add(key);
            }
          }

          // Use moment-timezone to format dateTime
          const dateTime = moment().tz("Asia/Dhaka").format("DD-MM-YY | HH:mm");

          // Compute before primary SKU for each unique combo
          const beforePrimarySkus = new Map();
          for (const key of uniqueCombos) {
            const [productId, colorCode, size] = key.split("||");
            const sku = await computePrimarySku(
              productId,
              colorCode,
              size,
              primaryLocation
            );
            beforePrimarySkus.set(key, sku);
            console.log(`Before SKU for ${key}: ${sku}`);
          }

          const results = [];

          for (const item of items) {
            const {
              productId,
              colorCode,
              size,
              originName,
              destinationName,
              accept,
            } = item;

            // Basic validation
            if (
              !productId ||
              !colorCode ||
              size == null ||
              !originName ||
              !destinationName
            ) {
              results.push({
                productId,
                colorCode,
                size,
                originName,
                destinationName,
                success: false,
                error: "Missing required fields",
              });
              continue;
            }
            if (!Number.isFinite(accept) || accept <= 0) {
              results.push({
                productId,
                colorCode,
                size,
                originName,
                destinationName,
                success: false,
                error: "Accept must be a positive number",
              });
              continue;
            }
            if (originName === destinationName) {
              results.push({
                productId,
                colorCode,
                size,
                originName,
                destinationName,
                success: false,
                error: "Origin and destination locations must be different",
              });
              continue;
            }

            // Check if origin variant has sufficient stock
            const product = await productInformationCollection.findOne(
              { productId },
              {
                projection: {
                  productVariants: {
                    $elemMatch: {
                      "color.color": colorCode,
                      size,
                      location: originName,
                    },
                  },
                },
                readPreference: "primary",
              }
            );

            const originVariant = product?.productVariants?.[0];
            if (!originVariant || originVariant.sku < accept) {
              results.push({
                productId,
                colorCode,
                size,
                originName,
                destinationName,
                success: false,
                error: `Insufficient stock in origin location (${originName}). Available: ${
                  originVariant?.sku || 0
                }, Requested: ${accept}`,
              });
              continue;
            }

            // Update both origin and destination variants atomically
            const updateRes = await productInformationCollection.updateOne(
              { productId },
              {
                $inc: {
                  "productVariants.$[origin].sku": -accept,
                  "productVariants.$[origin].onHandSku": -accept,
                  "productVariants.$[destination].sku": accept,
                  "productVariants.$[destination].onHandSku": accept,
                },
              },
              {
                arrayFilters: [
                  {
                    "origin.color.color": colorCode,
                    "origin.size": size,
                    "origin.location": originName,
                  },
                  {
                    "destination.color.color": colorCode,
                    "destination.size": size,
                    "destination.location": destinationName,
                  },
                ],
                writeConcern: { w: "majority" },
              }
            );

            if (updateRes.modifiedCount > 0) {
              results.push({
                productId,
                colorCode,
                size,
                originName,
                destinationName,
                success: true,
                updated: true,
                message: `Transferred ${accept} units from ${originName} to ${destinationName}`,
              });
            } else {
              results.push({
                productId,
                colorCode,
                size,
                originName,
                destinationName,
                success: false,
                error:
                  "Failed to transfer stock. Variant not found for origin or destination location",
              });
            }
          }

          // Check if any updates failed
          const failedUpdates = results.filter((update) => !update.success);
          if (failedUpdates.length > 0) {
            return res.status(400).json({
              results,
              message: `Failed to transfer ${failedUpdates.length} variant(s)`,
            });
          }

          // After successful updates, check which combos had primary SKU go from 0 to >0
          const updatedCombos = [];
          for (const key of uniqueCombos) {
            const [productId, colorCode, size] = key.split("||");
            const afterSku = await computePrimarySku(
              productId,
              colorCode,
              size,
              primaryLocation
            );
            console.log(`After SKU for ${key}: ${afterSku}`);
            if (beforePrimarySkus.get(key) === 0 && afterSku > 0) {
              updatedCombos.push({ productId, colorCode, size });
            }
          }

          console.log(`Updated combos: ${JSON.stringify(updatedCombos)}`);

          // Send notifications for updated combos
          if (updatedCombos.length > 0) {
            for (const combo of updatedCombos) {
              const { productId, colorCode, size } = combo;

              // Map custom productId to MongoDB _id (as string)
              const product = await productInformationCollection.findOne(
                { productId },
                { readPreference: "primary" }
              );
              if (!product) {
                console.error(`No product found for productId: ${productId}`);
                continue;
              }
              const mongoId = product._id.toHexString().trim();
              console.log(
                `Mapped productId: ${productId} to MongoDB _id: ${mongoId}`
              );

              // Normalize size for notification query
              const normalizedSize = String(size).trim();

              // Query availabilityNotifications with productId as string
              const notificationDoc = await availabilityNotifications.findOne(
                {
                  productId: mongoId,
                  colorCode: colorCode,
                  $or: [
                    { size: normalizedSize },
                    { size: Number(normalizedSize) },
                  ],
                },
                { readPreference: "primary" }
              );

              if (notificationDoc) {
                console.log(
                  `Found notification document for productId: ${mongoId}, colorCode: ${colorCode}, size: ${size}`
                );
                const emailsToNotify = notificationDoc.emails.filter(
                  (emailObj) => emailObj.notified === false
                );
                console.log(
                  `Emails to notify for productId: ${mongoId}, colorCode: ${colorCode}, size: ${size}: ${emailsToNotify.length}`
                );

                for (const emailObj of emailsToNotify) {
                  const { email, notified } = emailObj;

                  // Skip already notified emails
                  if (notified) continue;

                  const user = await customerListCollection.findOne({ email });

                  if (!user) {
                    console.error(`No user found for email: ${email}`);
                    continue;
                  }

                  const selectedProduct =
                    await productInformationCollection.findOne(
                      { productId },
                      { readPreference: "primary" }
                    );
                  if (!selectedProduct) {
                    console.error(
                      `No product found for productId: ${productId}`
                    );
                    continue;
                  }

                  const specialOffers = await offerCollection.find().toArray();

                  const isOnlyRegularDiscountAvailable =
                    checkIfOnlyRegularDiscountIsAvailable(
                      selectedProduct,
                      specialOffers
                    );
                  const selectedVariant = selectedProduct.productVariants.find(
                    (variant) =>
                      variant.color.color == colorCode &&
                      (String(variant.size) === normalizedSize ||
                        Number(variant.size) === Number(normalizedSize))
                  );

                  if (!selectedVariant) {
                    console.error(
                      `No variant found for productId: ${productId}, colorCode: ${colorCode}, size: ${size}`
                    );
                    continue;
                  }

                  const colorName = selectedVariant.color.label;
                  const imageUrl = selectedVariant.imageUrls[0];

                  const notifiedProduct = {
                    pageUrl: `${
                      process.env.MAIN_DOMAIN_URL
                    }/product/${selectedProduct.productTitle
                      .split(" ")
                      .join("-")
                      .toLowerCase()}?productId=${encodeURIComponent(
                      mongoId
                    )}&colorCode=${encodeURIComponent(
                      colorCode
                    )}&size=${encodeURIComponent(normalizedSize)}`,
                    imageUrl,
                    title: selectedProduct.productTitle,
                    price: calculateFinalPrice(selectedProduct, specialOffers),
                    originalPrice: isOnlyRegularDiscountAvailable
                      ? Number(selectedProduct.regularPrice)
                      : null,
                    size: normalizedSize,
                    color: {
                      code: colorCode,
                      name: colorName,
                    },
                    customerName: user.userInfo.personalInfo.customerName,
                  };

                  console.log(
                    `Notified product for ${email}: ${JSON.stringify(
                      notifiedProduct
                    )}`
                  );

                  try {
                    const mailResult = await transport.sendMail(
                      getStockUpdateEmailOptions(email, notifiedProduct)
                    );

                    // Check if email was sent successfully
                    if (
                      mailResult &&
                      mailResult.accepted &&
                      mailResult.accepted.length > 0
                    ) {
                      console.log(`Email sent successfully to ${email}`);
                      await availabilityNotifications.updateOne(
                        {
                          _id: new ObjectId(notificationDoc._id),
                          "emails.email": email,
                        },
                        {
                          $set: {
                            "emails.$.notified": true,
                            "emails.$.updatedDateTime": dateTime,
                          },
                        }
                      );
                    } else {
                      console.error(
                        `Email sending failed for ${email}: No recipients accepted`
                      );
                    }
                  } catch (emailError) {
                    console.error(
                      `Failed to send email to ${email}:`,
                      emailError.message
                    );
                  }
                }
              } else {
                console.log(
                  `No notification document found for productId: ${mongoId}, colorCode: ${colorCode}, size: ${size}`
                );
                // Debug: Check if any notification exists for this productId
                const debugNotifications = await availabilityNotifications
                  .find({ productId: mongoId })
                  .toArray();
                console.log(
                  `Debug: All notifications for productId ${mongoId}: ${JSON.stringify(
                    debugNotifications
                  )}`
                );
              }
            }
          } else {
            console.log(
              "No combos updated from 0 to >0 in primary location, no notifications sent"
            );
          }

          return res.json({
            results,
            message: "All stock transfers completed successfully",
          });
        } catch (err) {
          console.error("Error in transferStock patch route:", err);
          res.status(500).json({ error: "Internal server error" });
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

    // Function to format and convert the date (24-hour system)
    const convertToDateTime = (dateTimeString) => {
      if (!dateTimeString) {
        console.error("Empty dateTimeString in convertToDateTime");
        return null;
      }
      // Parse strictly in Asia/Dhaka timezone
      const parsed = moment.tz(
        dateTimeString,
        "DD-MM-YY | HH:mm",
        true,
        "Asia/Dhaka"
      );
      if (!parsed.isValid()) {
        console.error(
          `Invalid date format in convertToDateTime: ${dateTimeString}`
        );
        return null;
      }
      // Fix two-digit year (e.g., 25 -> 2025)
      if (parsed.year() < 2000) {
        parsed.year(parsed.year() + 100);
      }
      // Prevent future dates
      const now = moment.tz("Asia/Dhaka");
      if (parsed.isAfter(now)) {
        console.warn(
          `Future date detected in convertToDateTime: ${dateTimeString}, using current time`
        );
        return now.toISOString();
      }
      return parsed.toISOString();
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
          const dateTime = moment().tz("Asia/Dhaka").format("DD-MM-YY | HH:mm");

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
              return res
                .status(409)
                .send({ message: "You're already subscribed." });
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
          }

          const productList = await productInformationCollection
            .find()
            .toArray();
          const selectedProduct = await productInformationCollection.findOne({
            _id: new ObjectId(productId),
          });
          const specialOffers = await offerCollection.find().toArray();
          const primaryLocation = await locationCollection.findOne({
            isPrimaryLocation: true,
          });

          const isOnlyRegularDiscountAvailable =
            checkIfOnlyRegularDiscountIsAvailable(
              selectedProduct,
              specialOffers
            );
          const selectedVariant = selectedProduct.productVariants.find(
            (variant) =>
              variant.color.color == colorCode && variant.size == size
          );
          const colorName = selectedVariant.color.label;
          const imageUrl = selectedVariant.imageUrls[0];

          const notifyProduct = {
            pageUrl: `${
              process.env.MAIN_DOMAIN_URL
            }/product/${selectedProduct.productTitle
              .split(" ")
              .join("-")
              .toLowerCase()}`,
            imageUrl,
            title: selectedProduct.productTitle,
            price: calculateFinalPrice(selectedProduct, specialOffers),
            originalPrice: isOnlyRegularDiscountAvailable
              ? Number(selectedProduct.regularPrice)
              : null,
            size,
            color: {
              code: colorCode,
              name: colorName,
            },
          };

          const filteredProducts = productList
            .filter((product) => {
              const isInStock =
                product.productVariants
                  ?.filter(
                    (variant) =>
                      variant?.location === primaryLocation.locationName
                  )
                  .reduce((acc, variant) => acc + Number(variant?.sku), 0) > 0;

              return (
                product.status === "active" &&
                product.category == selectedProduct.category &&
                product._id.toString() != productId &&
                isInStock
              );
            })
            .slice(0, 3);

          const truncateTitle = (title, maxChars = 16) => {
            return title.length > maxChars
              ? title.slice(0, maxChars).trim() + "..."
              : title;
          };

          const similarProducts = filteredProducts.map((product) => {
            const title = truncateTitle(product.productTitle);
            const pageUrl = `${
              process.env.MAIN_DOMAIN_URL
            }/product/${product.productTitle
              .split(" ")
              .join("-")
              .toLowerCase()}`;
            const imageUrl = product.productVariants[0].imageUrls[0];
            const isOnlyRegularDiscountAvailable =
              checkIfOnlyRegularDiscountIsAvailable(product, specialOffers);
            const price = calculateFinalPrice(product, specialOffers);
            const originalPrice = isOnlyRegularDiscountAvailable
              ? Number(product.regularPrice)
              : null;

            return {
              title,
              pageUrl,
              imageUrl,
              price,
              originalPrice,
            };
          });

          const mailResult = await transport.sendMail(
            getNotifyRequestEmailOptions(email, notifyProduct, similarProducts)
          );

          // Check if email was sent successfully
          if (!mailResult?.accepted?.length) {
            return res.status(500).json({
              success: false,
              message: "Failed to send the notify request email.",
            });
          }

          return res
            .status(existingDoc ? 200 : 201)
            .json({ message: "Request submitted successfully." });
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

          const now = moment.tz("Asia/Dhaka");
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
                (emailObj) =>
                  // Show notifications if:
                  // 1. Email has not been notified (notified: false) OR
                  // 2. Email has been notified but updatedDateTime is within the last 3 days
                  !emailObj.notified ||
                  (emailObj.updatedDateTime &&
                    isWithinLast3Days(
                      convertToDateTime(emailObj.updatedDateTime)
                    ))
              )
              .map((email) => {
                const dateTime = convertToDateTime(email.dateTime) || null;
                const updatedDateTime = isValidDate(email?.updatedDateTime)
                  ? convertToDateTime(email.updatedDateTime)
                  : null;
                return {
                  type: "Notified",
                  email: email?.email,
                  dateTime,
                  updatedDateTime,
                  productId: doc.productId,
                  size: doc.size,
                  colorCode: doc.colorCode,
                  notified: email.notified,
                  isRead: email.isRead,
                  orderNumber: null,
                  orderStatus: null,
                };
              })
          );

          const orderEntries = orders.map((order) => {
            const dateTime =
              order.orderStatus === "Return Requested"
                ? convertToDateTime(order.returnInfo.dateTime)
                : convertToDateTime(order.dateTime);
            return {
              type: "Ordered",
              email: order?.customerInfo?.email,
              dateTime: dateTime || null,
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
            };
          });

          // Filter out invalid or future dates
          const mergedNotifications = [
            ...notificationEntries,
            ...orderEntries,
          ].filter((notification) => {
            if (!notification.dateTime || !isValidDate(notification.dateTime)) {
              console.warn(
                `Invalid dateTime filtered: ${JSON.stringify(notification)}`
              );
              return false;
            }
            const date = moment.tz(notification.dateTime, "Asia/Dhaka");
            if (date.isAfter(now)) {
              console.warn(
                `Future dateTime filtered: ${notification.dateTime}`
              );
              return false;
            }
            return true;
          });

          // Sort by dateTime (newest first)
          mergedNotifications.sort((a, b) => {
            const dateA = new Date(a.dateTime);
            const dateB = new Date(b.dateTime);
            return dateB - dateA; // Newest first
          });

          // Filter based on permissions
          const filteredNotifications = mergedNotifications.filter(
            (notification) => {
              if (notification.type === "Notified") {
                return hasModuleAccess(user.permissions, "Product Hub");
              } else if (notification.type === "Ordered") {
                return hasModuleAccess(user.permissions, "Orders");
              }
              return false;
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
        const {
          type,
          orderNumber,
          productId,
          email,
          orderStatus,
          colorCode,
          size,
        } = req.body;

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
                colorCode,
                size,
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
          let {
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

          if (!deliveryType) deliveryType = "STANDARD";

          const [
            products,
            offers,
            shippingZones,
            primaryLocation,
            orders,
            customer,
            promoInfo,
          ] = await Promise.all([
            productInformationCollection.find().toArray(),
            offerCollection.find().toArray(),
            shippingZoneCollection.find().toArray(),
            locationCollection.findOne({
              isPrimaryLocation: true,
            }),
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

          const hasFaultyItems = cartItems.some((storedItem) => {
            const product = products?.find(
              (p) => p?._id.toString() === storedItem?._id
            );

            if (!product) return true;

            const productVariant = product.productVariants.find(
              (variant) =>
                variant.location === primaryLocation.locationName &&
                variant.size === storedItem.selectedSize &&
                variant.color._id.toString() === storedItem.selectedColor._id
            );

            if (!productVariant) return true;

            if (
              product.status !== "active" ||
              productVariant.sku < 1 ||
              storedItem.selectedQuantity > productVariant.sku
            ) {
              return true; // inactive, out of stock, or not enough stock
            }

            return false; // everything fine
          });

          if (hasFaultyItems)
            return res.status(400).send({
              hasFaultyItems,
            });

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
              expectedDeliveryDate: null,
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

          try {
            for (const cartItem of cartItems) {
              const productResult =
                await productInformationCollection.updateOne(
                  {
                    _id: new ObjectId(cartItem._id),
                    productVariants: {
                      $elemMatch: {
                        size: cartItem.selectedSize,
                        color: cartItem.selectedColor,
                        location: primaryLocation.locationName,
                        sku: { $gte: cartItem.selectedQuantity }, // Ensure enough SKU to subtract
                      },
                    },
                  },
                  {
                    $inc: {
                      "productVariants.$.sku": -cartItem.selectedQuantity,
                    }, // Decrement the SKU
                  }
                );

              if (productResult.modifiedCount === 0) {
                return res.status(500).send({
                  message: "Failed to update product SKU.",
                });
              }
            }
          } catch (error) {
            console.error("Error updating product SKU:", error);
            return res.status(500).send({
              message: "Failed to update product SKU.",
              error: error.message,
            });
          }

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

    // dashboard overview
    app.get(
      "/dashboard/get-todays-orders",
      verifyJWT,
      authorizeAccess([], "Dashboard"),
      originChecker,
      async (req, res) => {
        try {
          // ✅ Use Bangladesh timezone
          const today = moment.tz("Asia/Dhaka");
          const todayStr = today.format("DD-MM-YY"); // e.g. "12-09-25"

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

    // analytics - get method of {totalCOGS, grossProfit, grossMarginPercent}
    app.get(
      "/analytics/profitability",
      verifyJWT,
      authorizeAccess([], "Analytics"),
      originChecker,
      async (req, res) => {
        try {
          const { range, startDate, endDate } = req.query;

          const orders = await orderListCollection.find().toArray();
          const purchaseOrders = await purchaseOrderCollection.find().toArray();

          // Step 1: Calculate average unit cost per variant
          const avgUnitCostMap = {}; // key: productId|colorCode|colorName|size => avg cost

          for (const po of purchaseOrders) {
            for (const variant of po.purchaseOrderVariants) {
              const key = `${variant.productId}|${variant.colorCode}|${
                variant.colorName
              }|${String(variant.size)}`;

              const acceptedUnits = Number(variant.accept || 0);
              const variantCost = Number(variant.cost || 0) * acceptedUnits;

              const totalCost =
                (avgUnitCostMap[key]?.totalCost || 0) + variantCost;
              const totalUnits =
                (avgUnitCostMap[key]?.totalUnits || 0) + acceptedUnits;

              const avgCost = totalUnits > 0 ? totalCost / totalUnits : 0;

              avgUnitCostMap[key] = { totalCost, totalUnits, avgCost };
            }
          }

          // Step 2: Parse filter dates
          const start = startDate
            ? moment.tz(startDate, "YYYY-MM-DD", "Asia/Dhaka").startOf("day")
            : null;
          const end = endDate
            ? moment.tz(endDate, "YYYY-MM-DD", "Asia/Dhaka").endOf("day")
            : null;

          // If custom range provided, ignore "range"
          let activeRange = range;
          if (startDate && endDate) {
            activeRange = ""; // force custom range mode
          }

          // Step 3: Filter orders by date range
          const filteredOrders = orders.filter((order) => {
            if (!order.dateTime) return false;

            const orderDate = moment.tz(
              order.dateTime,
              "DD-MM-YY | HH:mm",
              "Asia/Dhaka"
            );

            if (start && end && !orderDate.isBetween(start, end, null, "[]")) {
              return false;
            }

            // Predefined ranges
            if (!startDate && !endDate) {
              if (activeRange === "daily") {
                return orderDate.isSame(moment.tz("Asia/Dhaka"), "day"); // ✅ only today
              } else if (activeRange === "weekly") {
                return orderDate.isSameOrAfter(
                  moment.tz("Asia/Dhaka").subtract(6, "days").startOf("day")
                );
              } else if (activeRange === "monthly") {
                return orderDate.isSameOrAfter(
                  moment.tz("Asia/Dhaka").subtract(30, "days").startOf("day")
                );
              }
            }

            return true;
          });

          // Step 4: Calculate totals
          let totalCOGS = 0;
          let totalRevenue = 0;
          for (const order of filteredOrders) {
            // Revenue (exclude shipping)
            totalRevenue += (order.total || 0) - (order.shippingCharge || 0);

            // COGS (based on avgUnitCostMap)
            for (const product of order.productInformation) {
              const key = `${product.productId}|${product.color.color}|${
                product.color.value
              }|${String(product.size)}`;
              const avgCost = avgUnitCostMap[key]?.avgCost || 0;
              totalCOGS += avgCost * Number(product.sku || 0);
            }
          }

          const totalOrders = filteredOrders.length;

          // Calculate AOV
          const averageOrderValue =
            totalOrders > 0 ? totalRevenue / totalOrders : 0;

          const grossProfit = totalRevenue - totalCOGS;
          const grossMarginPercent =
            totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

          res.json({
            totalCOGS: Number(totalCOGS.toFixed(2)),
            grossProfit: Number(grossProfit.toFixed(2)),
            grossMarginPercent: Number(grossMarginPercent.toFixed(2)),
            totalRevenue: Number(totalRevenue.toFixed(2)),
            totalOrders,
            averageOrderValue: Number(averageOrderValue.toFixed(2)),
          });
        } catch (error) {
          console.error("Error calculating profitability:", error);
          res.status(500).json({
            message: "Failed to fetch analytics profitability",
            error: "Failed to calculate profitability",
          });
        }
      }
    );

    // analytics - get method of sales trend
    app.get(
      "/analytics/sales-trend",
      verifyJWT,
      authorizeAccess([], "Analytics"),
      originChecker,
      async (req, res) => {
        try {
          const { range, startDate, endDate } = req.query;

          const orders = await orderListCollection.find().toArray();

          // Parse filter dates
          const start = startDate
            ? moment.tz(startDate, "YYYY-MM-DD", "Asia/Dhaka").startOf("day")
            : null;
          const end = endDate
            ? moment.tz(endDate, "YYYY-MM-DD", "Asia/Dhaka").endOf("day")
            : null;

          const revenueMap = {};

          // If custom range provided, ignore "range"
          let activeRange = range;
          if (startDate && endDate) {
            activeRange = ""; // force custom range mode
          }

          for (const order of orders) {
            if (!order.dateTime) continue;

            const orderDate = moment.tz(
              order.dateTime,
              "DD-MM-YY | HH:mm",
              "Asia/Dhaka"
            );
            if (start && end && !orderDate.isBetween(start, end, null, "[]"))
              continue;

            // Exclude shipping
            const revenue = (order.total || 0) - (order.shippingCharge || 0);

            let key;
            if (activeRange === "daily" && !startDate && !endDate) {
              // Group by HOUR for today
              key = orderDate.format("YYYY-MM-DD HH:00");
            } else if (activeRange === "weekly") {
              // Group by DATE for last 7 days
              key = orderDate.format("YYYY-MM-DD");
            } else if (activeRange === "monthly") {
              // Group by DATE for last 30/31/28 days
              key = orderDate.format("YYYY-MM-DD");
            } else {
              key = orderDate.format("YYYY-MM-DD"); // date grouping
            }
            revenueMap[key] = (revenueMap[key] || 0) + revenue;
          }

          // Build continuous timeline (fill missing days/hours with 0)
          const trendData = [];
          if (activeRange === "daily") {
            const s = start || moment.tz("Asia/Dhaka").startOf("day");
            const e = end || moment.tz("Asia/Dhaka").endOf("day");

            const cursor = s.clone();
            while (cursor.isSameOrBefore(e)) {
              for (let i = 0; i < 24; i++) {
                const slot = cursor.clone().hour(i).format("YYYY-MM-DD HH:00");
                trendData.push({
                  period: slot,
                  revenue: revenueMap[slot] || 0,
                });
              }
              cursor.add(1, "day");
            }
          } else {
            // For weekly/monthly/custom range
            const s =
              start ||
              (activeRange === "weekly"
                ? moment.tz("Asia/Dhaka").subtract(6, "days").startOf("day")
                : moment.tz("Asia/Dhaka").subtract(30, "days").startOf("day"));
            const e = end || moment.tz("Asia/Dhaka").endOf("day");

            const cursor = s.clone();
            while (cursor.isSameOrBefore(e)) {
              const slot = cursor.format("YYYY-MM-DD");
              trendData.push({
                period: slot,
                revenue: revenueMap[slot] || 0,
              });
              cursor.add(1, "days");
            }
          }

          res.json({ trendData });
        } catch (error) {
          console.error("Error calculating sales trend:", error);
          res.status(500).json({ message: "Failed to fetch sales trend" });
        }
      }
    );

    // analytics - get method of top products
    app.get(
      "/analytics/top-products",
      verifyJWT,
      authorizeAccess([], "Analytics"),
      originChecker,
      async (req, res) => {
        try {
          const limit = parseInt(req.query.limit) || 10;

          const orders = await orderListCollection.find().toArray();
          const purchaseOrders = await purchaseOrderCollection.find().toArray();

          // Step 1: Calculate average unit cost per variant
          const avgUnitCostMap = {}; // key: productId|colorCode|colorName|size => avg cost

          for (const po of purchaseOrders) {
            for (const variant of po.purchaseOrderVariants) {
              const key = `${variant.productId}|${variant.colorCode}|${
                variant.colorName
              }|${String(variant.size)}`;

              const acceptedUnits = Number(variant.accept || 0);
              const variantCost = Number(variant.cost || 0) * acceptedUnits;

              const totalCost =
                (avgUnitCostMap[key]?.totalCost || 0) + variantCost;
              const totalUnits =
                (avgUnitCostMap[key]?.totalUnits || 0) + acceptedUnits;
              const avgCost = totalUnits > 0 ? totalCost / totalUnits : 0;

              avgUnitCostMap[key] = { totalCost, totalUnits, avgCost };
            }
          }

          // Step 2: Aggregate revenue, profit, margin per product
          const productMap = {}; // key: productId => { productName, revenue, cogs, profit }

          for (const order of orders) {
            for (const product of order.productInformation) {
              const key = `${product.productId}|${product.color.color}|${
                product.color.value
              }|${String(product.size)}`;
              const avgCost = avgUnitCostMap[key]?.avgCost || 0;

              const qty = Number(product.sku || 0);
              const regularPrice = Number(product.regularPrice || 0);

              let unitPrice = regularPrice; // default price
              let discountPerUnit = 0; // discount given

              if (product.discountInfo) {
                unitPrice = Number(
                  product.discountInfo.finalPriceAfterDiscount || regularPrice
                );
                discountPerUnit = regularPrice - unitPrice;
              } else if (
                product.offerInfo &&
                product.offerInfo.appliedOfferDiscount != null
              ) {
                const appliedOfferTotal = Number(
                  product.offerInfo.appliedOfferDiscount || 0
                );

                // guard: if qty is zero, avoid division by zero — treat as no per-unit discount
                const perUnitOffer = qty > 0 ? appliedOfferTotal / qty : 0;

                unitPrice = regularPrice - perUnitOffer;
                discountPerUnit = perUnitOffer;
              }

              const revenue = unitPrice * qty;
              const cost = avgCost * qty;
              const discount = discountPerUnit * qty; // ✅ total discount given

              if (!productMap[product.productId]) {
                productMap[product.productId] = {
                  productId: product.productId,
                  productName: product.productTitle,
                  revenue: 0,
                  cogs: 0,
                  discount: 0,
                };
              }

              productMap[product.productId].revenue += revenue;
              productMap[product.productId].cogs += cost;
              productMap[product.productId].discount += discount;
            }
          }

          // Step 3: Calculate profit & margin
          const productArray = Object.values(productMap).map((p) => {
            const profit = p.revenue - p.cogs;
            const marginPercent =
              p.revenue > 0 ? (profit / p.revenue) * 100 : 0;
            return {
              productId: p.productId,
              productName: p.productName,
              revenue: Number(p.revenue.toFixed(2)),
              discount: Number(p.discount.toFixed(2)), // ✅ include discount
              profit: Number(profit.toFixed(2)),
              marginPercent: Number(marginPercent.toFixed(2)),
            };
          });

          // Step 4: Sort by revenue descending & limit
          productArray.sort((a, b) => b.revenue - a.revenue);
          const topProducts = productArray.slice(0, limit);

          res.json(topProducts);
        } catch (error) {
          console.error("Error fetching top products:", error);
          res.status(500).json({ message: "Failed to fetch top products" });
        }
      }
    );

    // analytics - get method of {lowStockVariants grouped by product}
    app.get(
      "/analytics/low-stock",
      verifyJWT,
      authorizeAccess([], "Analytics"),
      originChecker,
      async (req, res) => {
        try {
          const threshold = Number(req.query.threshold) || 10;

          // 1) find primary location
          const primaryLocation = await locationCollection.findOne({
            isPrimaryLocation: true,
          });
          if (!primaryLocation) {
            return res
              .status(400)
              .json({ message: "Primary location not found" });
          }
          const primaryLocationName = primaryLocation.locationName;

          // 2) fetch all products
          const products = await productInformationCollection.find().toArray();

          // 3) build low-stock structure grouped by product
          const productMap = new Map();

          for (const product of products) {
            const productId =
              product.productId ?? product._id?.toString?.() ?? null;
            const productTitle = product.productTitle || "Untitled Product";

            for (const variant of product.productVariants || []) {
              if (variant.location !== primaryLocationName) continue;

              const stock = Number(variant.sku ?? 0);
              if (stock < threshold) {
                const colorLabel =
                  variant.color?.label ??
                  variant.color?.value ??
                  "Unknown Color";
                const sizeLabel = String(variant.size ?? "");
                const variantTitle = `${colorLabel} ${sizeLabel}`.trim();

                const lowVariant = {
                  productId,
                  productTitle,
                  color: colorLabel,
                  size: sizeLabel,
                  sku: stock,
                  _variantTitle: variantTitle,
                };

                if (!productMap.has(productId)) {
                  productMap.set(productId, {
                    productId,
                    productTitle,
                    lowVariants: [],
                  });
                }
                productMap.get(productId).lowVariants.push(lowVariant);
              }
            }
          }

          // 4) convert map to array
          let groupedProducts = Array.from(productMap.values());

          // 5) sort products by number of lowVariants (desc), then productTitle
          groupedProducts.sort((a, b) => {
            if (b.lowVariants.length !== a.lowVariants.length) {
              return b.lowVariants.length - a.lowVariants.length;
            }
            return a.productTitle.localeCompare(b.productTitle);
          });

          // 6) sort variants inside each product by sku, then variantTitle
          for (const group of groupedProducts) {
            group.lowVariants.sort((a, b) => {
              if (a.sku !== b.sku) return a.sku - b.sku;
              // return (a._variantTitle || "").localeCompare(
              //   b._variantTitle || ""
              // );
            });

            // strip internal _variantTitle
            group.lowVariants = group.lowVariants.map(
              ({ _variantTitle, ...rest }) => rest
            );
          }

          res.json({
            lowStockProducts: groupedProducts,
          });
        } catch (error) {
          console.error("Error fetching low stock:", error);
          res.status(500).json({
            message: "Failed to fetch low stock analytics",
            error: String(error.message || error),
          });
        }
      }
    );

    // analytics - get method of marketing
    app.get(
      "/analytics/marketing",
      verifyJWT,
      authorizeAccess([], "Analytics"),
      originChecker,
      async (req, res) => {
        try {
          const { range, startDate, endDate } = req.query;

          // Validate inputs
          if (!range && (!startDate || !endDate)) {
            return res.status(400).json({
              message: "Either range or startDate/endDate must be provided",
            });
          }

          // Parse filter dates
          const start = startDate
            ? moment.tz(startDate, "YYYY-MM-DD", "Asia/Dhaka").startOf("day")
            : null;
          const end = endDate
            ? moment.tz(endDate, "YYYY-MM-DD", "Asia/Dhaka").endOf("day")
            : null;

          // If custom range provided, ignore "range"
          let activeRange = range;
          if (startDate && endDate) {
            activeRange = ""; // force custom range mode
          }

          // Fetch orders from DB with date filtering
          const query =
            start && end
              ? {
                  dateTime: {
                    $gte: start.format("DD-MM-YY | HH:mm"),
                    $lte: end.format("DD-MM-YY | HH:mm"),
                  },
                }
              : activeRange === "daily"
              ? {
                  dateTime: {
                    $regex: `^${moment.tz("Asia/Dhaka").format("DD-MM-YY")}`,
                  },
                }
              : activeRange === "weekly"
              ? {
                  dateTime: {
                    $gte: moment
                      .tz("Asia/Dhaka")
                      .subtract(6, "days")
                      .format("DD-MM-YY | HH:mm"),
                  },
                }
              : activeRange === "monthly"
              ? {
                  dateTime: {
                    $gte: moment
                      .tz("Asia/Dhaka")
                      .subtract(30, "days")
                      .format("DD-MM-YY | HH:mm"),
                  },
                }
              : {};

          // 2. Fetch orders from DB
          const orders = await orderListCollection.find(query).toArray();

          const orderCount = orders.length;

          // 4. Get visitors from GA4
          const gaStart = start
            ? start.format("YYYY-MM-DD")
            : activeRange === "daily"
            ? moment.tz("Asia/Dhaka").format("YYYY-MM-DD")
            : activeRange === "weekly"
            ? moment.tz("Asia/Dhaka").subtract(6, "days").format("YYYY-MM-DD")
            : activeRange === "monthly"
            ? moment.tz("Asia/Dhaka").subtract(30, "days").format("YYYY-MM-DD")
            : "7daysAgo"; // fallback

          const gaEnd = end
            ? end.format("YYYY-MM-DD")
            : moment.tz("Asia/Dhaka").format("YYYY-MM-DD");

          const property = `properties/${process.env.GA4_PROPERTY_ID}`;

          const analyticsClient = new BetaAnalyticsDataClient({
            projectId: process.env.GA_PROJECT_ID,
            credentials: {
              client_email: process.env.GA_CLIENT_EMAIL,
              private_key: process.env.GA_PRIVATE_KEY.replace(/\\n/g, "\n"),
            },
          });

          const [response] = await analyticsClient.runReport({
            property: property,
            dateRanges: [{ startDate: gaStart, endDate: gaEnd }],
            metrics: [{ name: "activeUsers" }],
          });

          const visitors = response.rows?.[0]?.metricValues?.[0]?.value
            ? parseInt(response.rows[0].metricValues[0].value)
            : 0;

          // 5. Conversion Rate
          const conversionRate =
            visitors > 0 ? ((orderCount / visitors) * 100).toFixed(2) : 0;

          // 6. Response
          res.json({
            range: activeRange || "custom",
            startDate: gaStart,
            endDate: gaEnd,
            orders: orderCount,
            visitors,
            conversionRate,
          });
        } catch (error) {
          console.error("Error fetching marketing:", error);
          res.status(500).json({
            message: "Failed to fetch marketing analytics",
            error: String(error.message || error),
          });
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

    app.post(
      "/transferReturnSkuToAvailable",
      verifyJWT,
      authorizeAccess(["Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const { productId, transferSku, color, size, orderNumber } = req.body;

          if (!productId) {
            return res.status(400).json({ message: "ProductId is required" });
          }
          if (!transferSku) {
            return res
              .status(400)
              .json({ message: "Transfer Sku is required" });
          }
          if (!color) {
            return res.status(400).json({ message: "Color is required" });
          }
          if (!size) {
            return res.status(400).json({ message: "Size is required" });
          }
          if (!orderNumber) {
            return res
              .status(400)
              .json({ message: "Order Number is required" });
          }

          // Find the product
          const product = await productInformationCollection.findOne({
            productId: productId,
          });
          if (!product) {
            return res.status(404).json({ message: "Product not found" });
          }

          // Find the primary location
          const primaryLocation = await locationCollection.findOne({
            isPrimaryLocation: true,
          });
          if (!primaryLocation) {
            return res
              .status(404)
              .json({ message: "Primary location not found" });
          }

          // Find the matching variant with the given SKU & primary location
          const variant = product.productVariants.find(
            (v) =>
              v.location === primaryLocation.locationName &&
              v.color.color === color.color &&
              v.color.value === color.value &&
              v.color.label === color.label &&
              v.size === size
          );

          if (!variant) {
            return res
              .status(404)
              .json({ message: "Variant not found in primary location" });
          }

          // Determine how much we can decrement
          const currentReturnSku = variant.returnSku || 0;
          const decrementSku = Math.min(transferSku, currentReturnSku); // cannot subtract more than available

          // Increment SKU (add the returned sku back to available stock)
          const updatedProduct =
            await productInformationCollection.findOneAndUpdate(
              { productId },
              {
                $inc: {
                  "productVariants.$[variant].sku": decrementSku,
                  "productVariants.$[variant].onHandSku": decrementSku,
                  "productVariants.$[variant].returnSku": -decrementSku,
                },
              },
              {
                returnDocument: "after", // gives updated doc
                arrayFilters: [
                  {
                    "variant.location": primaryLocation.locationName,
                    "variant.color.color": color.color,
                    "variant.color.value": color.value,
                    "variant.color.label": color.label,
                    "variant.size": size,
                  },
                ],
              }
            );

          const updatedOrder = await orderListCollection.updateOne(
            {
              orderNumber,
              "returnInfo.products.productId": productId,
              "returnInfo.products.color.color": color.color,
              "returnInfo.products.color.value": color.value,
              "returnInfo.products.color.label": color.label,
              "returnInfo.products.size": size,
            },
            {
              $set: {
                "returnInfo.products.$[prod].transferStatus": "Transferred",
              },
            },
            {
              arrayFilters: [
                {
                  "prod.productId": productId,
                  "prod.color.color": color.color,
                  "prod.color.value": color.value,
                  "prod.color.label": color.label,
                  "prod.size": size,
                },
              ],
            }
          );

          res.json({
            message: "SKU transferred successfully",
            updatedVariant: updatedProduct.value,
            updatedOrder: updatedOrder.value,
          });
        } catch (error) {
          console.error("Error in transfer-to-available:", error);
          res.status(500).json({ message: "Internal server error" });
        }
      }
    );

    app.post(
      "/transferReturnSkuToForfeited",
      verifyJWT,
      authorizeAccess(["Owner"], "Product Hub"),
      originChecker,
      async (req, res) => {
        try {
          const { productId, transferSku, color, size, orderNumber } = req.body;

          if (!productId) {
            return res.status(400).json({ message: "ProductId is required" });
          }
          if (!transferSku) {
            return res
              .status(400)
              .json({ message: "Transfer Sku is required" });
          }
          if (!color) {
            return res.status(400).json({ message: "Color is required" });
          }
          if (!size) {
            return res.status(400).json({ message: "Size is required" });
          }
          if (!orderNumber) {
            return res
              .status(400)
              .json({ message: "Order Number is required" });
          }

          // Find the product
          const product = await productInformationCollection.findOne({
            productId: productId,
          });
          if (!product) {
            return res.status(404).json({ message: "Product not found" });
          }

          // Find the primary location
          const primaryLocation = await locationCollection.findOne({
            isPrimaryLocation: true,
          });
          if (!primaryLocation) {
            return res
              .status(404)
              .json({ message: "Primary location not found" });
          }

          // Find the matching variant with the given SKU & primary location
          const variant = product.productVariants.find(
            (v) =>
              v.location === primaryLocation.locationName &&
              v.color.color === color.color &&
              v.color.value === color.value &&
              v.color.label === color.label &&
              v.size === size
          );

          if (!variant) {
            return res
              .status(404)
              .json({ message: "Variant not found in primary location" });
          }

          // Determine how much we can decrement
          const currentReturnSku = variant.returnSku || 0;
          const decrementSku = Math.min(transferSku, currentReturnSku); // cannot subtract more than available

          // Increment SKU (add the returned sku back to available stock)
          const updatedProduct =
            await productInformationCollection.findOneAndUpdate(
              { productId },
              {
                $inc: {
                  "productVariants.$[variant].forfeitedSku": decrementSku,
                  "productVariants.$[variant].returnSku": -decrementSku,
                },
              },
              {
                returnDocument: "after", // gives updated doc
                arrayFilters: [
                  {
                    "variant.location": primaryLocation.locationName,
                    "variant.color.color": color.color,
                    "variant.color.value": color.value,
                    "variant.color.label": color.label,
                    "variant.size": size,
                  },
                ],
              }
            );

          const updatedOrder = await orderListCollection.updateOne(
            {
              orderNumber,
              "returnInfo.products.productId": productId,
              "returnInfo.products.color.color": color.color,
              "returnInfo.products.color.value": color.value,
              "returnInfo.products.color.label": color.label,
              "returnInfo.products.size": size,
            },
            {
              $set: {
                "returnInfo.products.$[prod].transferStatus": "Forfeited",
              },
            },
            {
              arrayFilters: [
                {
                  "prod.productId": productId,
                  "prod.color.color": color.color,
                  "prod.color.value": color.value,
                  "prod.color.label": color.label,
                  "prod.size": size,
                },
              ],
            }
          );

          res.json({
            message: "SKU forfeited successfully",
            updatedVariant: updatedProduct.value,
            updatedOrder: updatedOrder.value,
          });
        } catch (error) {
          console.error("Error in transfer-to-available:", error);
          res.status(500).json({ message: "Internal server error" });
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
            const { productId, sku, size, color, status } = productDetails;

            if (!productId || !sku || !size || !color || !status) {
              updateResults.push({
                productId,
                error: "Missing details in return data",
              });
              continue;
            }

            // If status is "Rejected", skip incrementing
            if (status === "Rejected") {
              updateResults.push({
                productId,
                message: "Return request rejected, no update made",
              });
              continue;
            }

            if (status === "Accepted") {
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
                  $inc: { "productVariants.$.returnSku": sku },
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

    const decrementReturnSkuInProduct = async (products) => {
      try {
        const primaryLocation = await locationCollection.findOne({
          isPrimaryLocation: true,
        });
        if (!primaryLocation) {
          throw new Error("Primary location not found");
        }

        const { locationName } = primaryLocation;

        for (const productDetails of products) {
          const { productId, sku, size, color, status } = productDetails;

          // ✅ Only decrement if the product was Accepted
          if (status !== "Accepted") continue;

          await productInformationCollection.updateOne(
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
              $inc: { "productVariants.$.returnSku": -sku }, // decrement
            }
          );
        }
      } catch (err) {
        console.error("Error decrementing returnSku:", err.message);
        throw err;
      }
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
          returnInfo,
          dataToSend,
        } = req.body; // Extract status from request body

        // Define valid statuses
        const validStatuses = [
          "Pending",
          "Processing",
          "Shipped",
          "On Hold",
          "Delivered",
          "Return Requested",
          "Processed",
          "Declined",
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

          const shippingZones = await shippingZoneCollection.find().toArray();
          const city = order.deliveryInfo.city;
          const deliveryType = order.deliveryInfo.deliveryMethod;

          const estimatedTime = getEstimatedDeliveryTime(
            city,
            deliveryType,
            shippingZones
          );

          const updateDoc = {};
          const currentTime = new Date();
          const refundProcessedDate = moment()
            .tz("Asia/Dhaka")
            .format("DD-MM-YY");

          const undoAvailableUntil = new Date(
            currentTime.getTime() + 2 * 60 * 60 * 1000
          ); // 2 hours later

          // Initialize emailSentStatuses if it doesn't exist
          const emailSentStatuses = order.emailSentStatuses || [];

          if (isUndo) {
            if (
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
              (order.orderStatus === "Declined" ||
                order.orderStatus === "Processed") &&
              orderStatus === "Return Requested"
            ) {
              // Reset all return products back to pending with empty declineReason
              const resetProducts = order.returnInfo.products.map((p) => ({
                ...p,
                status: "pending",
                declineReason: "",
              }));

              updateDoc.$set = {
                "returnInfo.products": resetProducts,
              };
            } else if (
              order.orderStatus === "Return Initiated" &&
              orderStatus === "Processed"
            ) {
              // ✅ NEW: decrement returnSku for Accepted products
              const acceptedProducts = order.returnInfo.products.filter(
                (p) => p.status === "Accepted"
              );

              if (acceptedProducts.length > 0) {
                await decrementReturnSkuInProduct(acceptedProducts);
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

              const shipDate = new Date(shippedAt || Date.now());
              const expectedDeliveryDate = getExpectedDeliveryDate(
                shipDate,
                deliveryType,
                estimatedTime
              );

              // Store all shipping-related fields inside `shipmentInfo` object
              updateDoc.$set.shipmentInfo = {
                trackingNumber,
                selectedShipmentHandlerName,
                trackingUrl,
                imageUrl,
                shippedAt: shipDate,
              };

              updateDoc.$set.deliveryInfo = {
                ...(order.deliveryInfo || {}),
                expectedDeliveryDate: expectedDeliveryDate,
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

              const returnItems = returnInfo.products.map((item) => ({
                title: item.productTitle,
                pageUrl: `${
                  process.env.MAIN_DOMAIN_URL
                }/product/${item.productTitle
                  .split(" ")
                  .join("-")
                  .toLowerCase()}`,
                imageUrl: item.thumbnailImgUrl,
                price: item.finalUnitPrice,
                quantity: item.sku,
                size: item.size,
                color: {
                  name: item.color.label,
                  code: item.color.color,
                },
                issues: item.issues,
              }));

              const mailResult = await transport.sendMail(
                getReturnRequestEmailOptions(
                  order.customerInfo.email,
                  order.customerInfo.customerName,
                  returnItems,
                  returnInfo.description
                )
              );

              if (!mailResult?.accepted?.length)
                return console.error(
                  "Failed to send the return request email."
                );
            }
            if (orderStatus === "Processed" || orderStatus === "Declined") {
              if (!returnInfo) {
                return res.status(400).json({
                  error:
                    "Return Requested is required for 'Return Requested' status",
                });
              }

              // Store all shipping-related fields inside `shipmentInfo` object
              updateDoc.$set.returnInfo = returnInfo;
            }

            if (orderStatus === "Refunded") {
              // Dot notation for nested field update
              updateDoc.$set["returnInfo.refundProcessedDate"] =
                refundProcessedDate;
            }

            // Add the new status to emailSentStatuses if email will be sent
            if (!emailSentStatuses.includes(orderStatus)) {
              updateDoc.$set.emailSentStatuses = [
                ...emailSentStatuses,
                orderStatus,
              ];
            }
          }

          const result = await orderListCollection.updateOne(filter, updateDoc);

          if (result.modifiedCount > 0) {
            const updatedOrder = await orderListCollection.findOne(filter); // Fetch updated order with tracking info if needed

            // Only send email if the status hasn't been emailed before and it's not an undo
            if (!isUndo && !emailSentStatuses.includes(orderStatus)) {
              await sendEmailToCustomer(updatedOrder, orderStatus);
            }

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

          // See if cart is modified
          if (updatedData.isCartLastModified === true) {
            if (!updatedData.cartItems.length) {
              // If cart is empty, remove cartLastModifiedAt and abandonedEmailStage
              delete updatedData.cartLastModifiedAt;
              delete updatedData.abandonedEmailStage;
            } else {
              // If some items are added to cart, set cartLastModifiedAt to current date
              updatedData.cartLastModifiedAt = new Date();
              updatedData.abandonedEmailStage = 0;
            }
          }

          // Remove isCartLastModified from the data before updating DB
          delete updatedData.isCartLastModified;

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
          const promoInfo = req.body;

          // ✅ Check if promoCode already exists
          if (promoInfo?.promoCode) {
            const existingPromo = await promoCollection.findOne({
              promoCode: promoInfo.promoCode,
            });

            if (existingPromo) {
              return res.status(400).send({
                success: false,
                message:
                  "Promo code already exists. Please use a different one.",
              });
            }
          }

          // If the promo is set for welcome email, update all other promoCollections to set `isWelcomeEmailPromoCode` to false
          if (promoInfo.isWelcomeEmailPromoCode) {
            await promoCollection.updateMany(
              { isWelcomeEmailPromoCode: true },
              { $set: { isWelcomeEmailPromoCode: false } }
            );
          }

          const result = await promoCollection.insertOne(promoInfo);
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

    //update a single promo
    app.put(
      "/updatePromo/:id",
      verifyJWT,
      authorizeAccess(["Editor", "Owner"], "Marketing"),
      originChecker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const promoInfo = req.body;
          const filter = { _id: new ObjectId(id) };

          // ✅ Check duplicate promoCode (excluding current promo)
          if (promoInfo?.promoCode) {
            const existingPromo = await promoCollection.findOne({
              promoCode: promoInfo.promoCode,
              _id: { $ne: new ObjectId(id) }, // exclude current document
            });

            if (existingPromo) {
              return res.status(400).send({
                success: false,
                message:
                  "Promo code already exists. Please use a different one.",
              });
            }
          }

          // If the promo is set for welcome email, update all other promoCollections to set `isWelcomeEmailPromoCode` to false
          if (promoInfo.isWelcomeEmailPromoCode) {
            await promoCollection.updateMany(
              { isWelcomeEmailPromoCode: true },
              { $set: { isWelcomeEmailPromoCode: false } }
            );
          }

          const updatePromo = {
            $set: { ...promoInfo },
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

          // Check if offerTitle already exists
          const existingOffer = await offerCollection.findOne({
            offerTitle: offerData.offerTitle,
          });
          if (existingOffer) {
            return res
              .status(400)
              .send({ message: "Offer title already exists!" });
          }

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
          const offerData = req.body;
          const filter = { _id: new ObjectId(id) };

          // Check if offerTitle already exists on another document
          const existingOffer = await offerCollection.findOne({
            offerTitle: offerData.offerTitle,
            _id: { $ne: new ObjectId(id) }, // ignore the current document
          });
          if (existingOffer) {
            return res
              .status(400)
              .send({ message: "Offer title already exists!" });
          }

          const updateOffer = {
            $set: { ...offerData },
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

          // Check if a location with the same locationName already exists
          const existingLocation = await locationCollection.findOne({
            locationName: locationData.locationName,
          });
          if (existingLocation) {
            return res.status(400).send({
              message: `A location with the name "${locationData.locationName}" already exists.`,
            });
          }

          // If the location is set as primary, update all other locations to set `isPrimaryLocation` to false
          if (locationData.isPrimaryLocation) {
            await locationCollection.updateMany(
              { isPrimaryLocation: true },
              { $set: { isPrimaryLocation: false } }
            );
          }

          // Insert the new location
          const result = await locationCollection.insertOne(locationData);

          // Update all products to add variants for the new location
          const newLocationName = locationData.locationName;

          const products = await productInformationCollection
            .find({})
            .toArray();

          for (const product of products) {
            const variants = product.productVariants || [];

            // Use a Map to track unique color-size combinations and an example variant for each
            const variantMap = new Map();

            for (const v of variants) {
              const key = `${v.color._id}|${v.size}`;
              if (!variantMap.has(key)) {
                variantMap.set(key, v);
              }
            }

            // Create new variants for the new location
            const newVariants = [];
            for (const [key, example] of variantMap) {
              newVariants.push({
                color: example.color,
                size: example.size,
                sku: 0,
                onHandSku: 0,
                returnSku: 0,
                forfeitedSku: 0,
                imageUrls: example.imageUrls,
                location: newLocationName,
              });
            }

            // If there are new variants to add, update the product
            if (newVariants.length > 0) {
              await productInformationCollection.updateOne(
                { _id: product._id },
                { $push: { productVariants: { $each: newVariants } } }
              );
            }
          }

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

          // Find the location to check if it's primary
          const location = await locationCollection.findOne(query);
          if (!location) {
            return res.status(404).send({ message: "Location not found" });
          }

          // Check if the location is primary
          if (location.isPrimaryLocation) {
            return res.status(400).send({
              message:
                "Cannot delete primary location. Please assign a new one first.",
            });
          }

          // Count total variants for this location using aggregation
          const variantCountResult = await productInformationCollection
            .aggregate([
              { $unwind: "$productVariants" },
              { $match: { "productVariants.location": location.locationName } },
              { $count: "totalVariants" },
            ])
            .toArray();

          const totalVariants =
            variantCountResult.length > 0
              ? variantCountResult[0].totalVariants
              : 0;

          // Remove variants associated with this location from all products
          const updateResult = await productInformationCollection.updateMany(
            { "productVariants.location": location.locationName },
            { $pull: { productVariants: { location: location.locationName } } }
          );

          // Verify no variants remain for this location
          const remainingVariants = await productInformationCollection
            .aggregate([
              { $unwind: "$productVariants" },
              { $match: { "productVariants.location": location.locationName } },
              { $count: "remainingVariants" },
            ])
            .toArray();

          const remainingVariantCount =
            remainingVariants.length > 0
              ? remainingVariants[0].remainingVariants
              : 0;

          // If any variants remain, abort deletion
          if (remainingVariantCount > 0) {
            return res.status(400).send({
              message: `Failed to delete all product variants for location: ${location.locationName}. ${remainingVariantCount} variants remain.`,
            });
          }

          // Log the successful removal of variants
          if (totalVariants > 0) {
            // console.log(
            //   `Removed ${totalVariants} product variants across ${updateResult.modifiedCount} products for location: ${location.locationName}`
            // );
          } else {
            // console.log(
            //   `No product variants found for location: ${location.locationName}`
            // );
          }

          // Delete the location only after all variants are confirmed removed
          const deleteResult = await locationCollection.deleteOne(query);

          if (deleteResult.deletedCount === 0) {
            return res.status(404).send({ message: "Location not found" });
          }

          res.send({
            message:
              "Location and associated product variants deleted successfully",
            deleteResult,
            variantsRemoved: totalVariants,
            productsModified: updateResult.modifiedCount,
          });
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
          const { url, position } = req.body;
          const filter = { _id: new ObjectId(id) };

          const updateDoc = {
            $set: { url, position },
            $addToSet: { previousUrls: url }, // store all unique uploaded URLs
          };

          const result = await marketingBannerCollection.updateOne(
            filter,
            updateDoc
          );

          if (result.matchedCount === 0) {
            return res
              .status(404)
              .send({ message: "Marketing banner not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error updating banner:", error);
          res.status(500).send({
            message: "Failed to update marketing banner",
            error: error.message,
          });
        }
      }
    );

    app.delete(
      "/deleteMarketingBannerImage",
      verifyJWT,
      authorizeAccess(["Owner"], "Marketing"),
      originChecker,
      async (req, res) => {
        try {
          const { imageUrl } = req.body;

          if (!imageUrl) {
            return res.status(400).send({ message: "Image URL is required" });
          }

          // Find the banner document that contains the image URL in `previousUrls`
          const banner = await marketingBannerCollection.findOne({
            previousUrls: imageUrl,
          });

          if (!banner) {
            return res
              .status(404)
              .send({ message: "Image not found in previous uploads" });
          }

          // Prevent deletion if it's currently the active banner
          if (banner.url === imageUrl) {
            return res
              .status(400)
              .send({ message: "Cannot delete currently active image." });
          }

          // Remove just the imageUrl from previousUrls array
          const result = await marketingBannerCollection.updateOne(
            { _id: banner._id },
            { $pull: { previousUrls: imageUrl } }
          );

          res.send({
            success: true,
            message: "Image removed from previous uploads",
            result,
          });
        } catch (error) {
          console.error("Error deleting banner image:", error);
          res.status(500).send({
            message: "Server error while deleting image",
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

    app.post(
      "/email-receive",
      [express.urlencoded({ extended: true }), upload.any()],
      async (req, res) => {
        let supportId;
        try {
          // Mailgun sends email fields in req.body
          const {
            recipient,
            sender,
            From: fromHeader,
            subject,
            "body-html": bodyHtml,
            "body-plain": bodyPlain,
            "stripped-text": strippedText,
            timestamp,
            "Message-Id": messageId,
            "attachment-count": attachmentCount,
          } = req.body;

          // Validate recipient
          if (
            !recipient ||
            recipient.toLowerCase() !== process.env.EMAIL_USER
          ) {
            console.warn("Invalid or missing recipient:", recipient);
            return res.status(200).send("Invalid recipient");
          }

          let tempSupportId = null;
          // Example: parse supportId from subject or email body (adjust regex to your needs)
          let supportIdMatch = subject?.match(/\[(PXT-\d{8}-\d+)\]/);
          supportId = supportIdMatch?.[1];
          // console.log("🆔 Extracted supportId from subject:", supportId);

          if (!supportId && bodyHtml) {
            const footerMatch = bodyHtml.match(
              /Support ID:\s*<strong>(PXT-\d{8}-\d+)<\/strong>/i
            );
            supportId = footerMatch?.[1];
            // console.log("🆔 Extracted supportId from footer:", supportId);
          }

          // Use temporary ID if supportId not found yet
          tempSupportId = supportId || `temp-${Date.now()}`;

          // Parse and upload attachments to GCS
          const attachments = [];
          const expectedAttachmentCount = parseInt(attachmentCount) || 0;
          if (
            req.files &&
            req.files.length > 0 &&
            expectedAttachmentCount > 0
          ) {
            // Limit to expectedAttachmentCount to avoid processing embedded attachments
            const filesToProcess = req.files.slice(0, expectedAttachmentCount);

            const uploadPromises = filesToProcess.map((file) => {
              return new Promise((resolve, reject) => {
                const gcsFileName = `support-attachments/${tempSupportId}_${Date.now()}_${
                  file.originalname
                }`;
                const blob = bucket.file(gcsFileName);
                const blobStream = blob.createWriteStream({
                  resumable: false,
                  contentType: file.mimetype,
                  metadata: { contentType: file.mimetype },
                });

                blobStream.on("error", (err) => {
                  console.warn(`Failed to upload attachment to GCS:`, {
                    error: err.message,
                    file: file.originalname,
                    sender,
                  });
                  reject(err);
                });

                blobStream.on("finish", async () => {
                  try {
                    await blob.acl.add({
                      entity: "allUsers",
                      role: "READER",
                    });
                    const publicUrl = `https://${bucket.name}/${blob.name}`;
                    console.log(`Uploaded attachment to GCS:`, {
                      gcsFileName,
                      publicUrl,
                    });
                    resolve({
                      url: publicUrl,
                      name:
                        file.originalname ||
                        `attachment-${attachments.length + 1}`,
                      size: file.size || 0,
                      contentType: file.mimetype || "application/octet-stream",
                    });
                  } catch (err) {
                    reject(err);
                  }
                });

                blobStream.end(file.buffer);
              });
            });

            const uploadedAttachments = await Promise.all(uploadPromises);
            attachments.push(...uploadedAttachments);
          }
          // console.log("Parsed attachments:", { attachments, sender });

          // Parse name from From header
          let name = null;
          if (fromHeader) {
            const nameMatch =
              fromHeader.match(/^([^<]+)\s*</) || fromHeader.match(/^([^@]+)@/);
            if (nameMatch) {
              name = nameMatch[1].trim();
            }
          }
          // console.log("Parsed name from From header:", {
          //   fromHeader,
          //   name,
          //   sender,
          // });

          // Validate timestamp
          const dateTime =
            timestamp && !isNaN(parseInt(timestamp))
              ? new Date(parseInt(timestamp) * 1000).toISOString()
              : new Date().toISOString();
          // console.log('Generated dateTime:', { dateTime, sender });

          // Find existing thread
          let thread;
          let isNewThread = false;
          if (supportId) {
            // Look for thread by supportId (replies)
            thread = await customerSupportCollection.findOne({ supportId });
          } else {
            // For direct emails, check if a thread exists for the sender without a reply containing a supportId
            thread = await customerSupportCollection.findOne({
              email: sender,
              topic: subject ? subject.trim() : "Direct Email Inquiry",
            });
          }

          // Rename GCS files with final supportId
          if (attachments.length > 0) {
            const updatePromises = attachments.map(async (attachment) => {
              const oldFileName = attachment.url.split("/").pop();
              const newFileName = oldFileName.replace(
                /^[^_]+_/,
                `${supportId || tempSupportId}_`
              );
              if (oldFileName !== newFileName) {
                const oldFile = bucket.file(
                  `support-attachments/${oldFileName}`
                );
                const newFile = bucket.file(
                  `support-attachments/${newFileName}`
                );
                try {
                  await oldFile.move(newFile);
                  await newFile.acl.add({
                    entity: "allUsers",
                    role: "READER",
                  });
                  const publicUrl = `https://${bucket.name}/${newFile.name}`;
                  // console.log(`Renamed GCS file:`, {
                  //   oldFileName,
                  //   newFileName,
                  //   publicUrl,
                  // });
                  attachment.url = publicUrl;
                } catch (err) {
                  console.warn(`Failed to rename GCS file:`, {
                    error: err.message,
                    oldFileName,
                    newFileName,
                    sender,
                  });
                }
              }
            });
            await Promise.all(updatePromises);
          }

          // Generate new supportId and create thread if none exists
          if (!thread) {
            // Generate new supportId if none found
            const dateStr = moment().tz("Asia/Dhaka").format("YYYYMMDD");
            // Step 1: Count how many requests today already exist
            const countToday = await customerSupportCollection.countDocuments({
              supportId: { $regex: `^PXT-${dateStr}-` },
            });

            // Step 2: Format counter (001, 002, etc.)
            const paddedCounter = String(countToday + 1).padStart(3, "0");

            // Step 3: Generate supportId
            supportId = `PXT-${dateStr}-${paddedCounter}`;
            // console.log("Generated new supportId:", supportId);

            thread = {
              supportId,
              email: sender,
              name,
              phone: null,
              topic: subject || "Direct Email Inquiry",
              message: {
                html:
                  bodyHtml ||
                  bodyPlain ||
                  strippedText ||
                  "Attachment-only email",
                attachments,
              },
              replies: [],
              isRead: false,
              dateTime,
            };
            const insertResult = await customerSupportCollection.insertOne(
              thread
            );
            isNewThread = !!insertResult.insertedId; // Mark as new thread if inserted
            // console.log("Created new thread for supportId:", supportId);
          } else {
            // Check for duplicate messageId
            if (messageId) {
              const existingReply = await customerSupportCollection.findOne({
                "replies.messageId": messageId,
              });
              if (existingReply) {
                // console.log("Duplicate messageId detected:", messageId);
                return res.status(200).send("Duplicate message");
              }
            }

            // Create reply entry for follow-up emails
            const replyEntry = {
              from: "customer",
              html:
                bodyHtml ||
                bodyPlain ||
                strippedText ||
                "Attachment-only email",
              attachments,
              dateTime,
              messageId,
            };
            // console.log("Created reply entry:", { replyEntry, sender });

            // Update existing thread with new reply
            // console.log("Updating thread with supportId:", {
            //   supportId,
            //   sender,
            // });
            const updateResult = await customerSupportCollection.updateOne(
              { supportId: thread.supportId },
              {
                $push: { replies: replyEntry },
                $set: { isRead: false },
              }
            );
            // console.log("Update result:", { updateResult, sender });

            if (updateResult.modifiedCount !== 1) {
              console.error(
                "Failed to update database: No document modified for supportId:",
                {
                  supportId,
                  sender,
                }
              );
              return res.status(500).send("Failed to update database");
            }
          }

          // Send confirmation email only for new threads
          if (isNewThread) {
            await transport.sendMail(getContactEmailOptions(name, sender));
          }
          res.status(200).send("OK");
        } catch (err) {
          console.error("Error processing inbound email:", {
            message: err.message,
            stack: err.stack,
            sender,
            supportId,
            timestamp: new Date().toISOString(),
          });
          res.status(500).send("Internal Server Error");
        }
      }
    );

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
