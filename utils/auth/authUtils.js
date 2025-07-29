const transport = require("../email/transport");

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

module.exports = { generateOtp, sendOtpEmail, getInitialPageFromPermissions };
