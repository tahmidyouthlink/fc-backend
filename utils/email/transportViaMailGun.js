const nodemailer = require("nodemailer");

const transportViaMailGun = nodemailer.createTransport({
  host: "smtp.mailgun.org",
  port: 587,
  auth: {
    user: process.env.SUPPORT_EMAIL,
    pass: process.env.EMAIL_PASS, // From Mailgun dashboard
  },
});

module.exports = transportViaMailGun;
