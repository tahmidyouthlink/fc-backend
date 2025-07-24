const nodemailer = require("nodemailer");

const transportViaMailGun = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // From Mailgun dashboard
  },
});

module.exports = transportViaMailGun;
