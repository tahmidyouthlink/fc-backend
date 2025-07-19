const nodemailer = require("nodemailer");

const transportViaMailGun = nodemailer.createTransport({
  host: "smtp.mailgun.org",
  port: 587,
  auth: {
    user: "support@mg.poshax.shop",
    pass: process.env.EMAIL_PASS, // From Mailgun dashboard
  },
});

module.exports = transportViaMailGun;
