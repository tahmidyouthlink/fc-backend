const transport = require("../email/transport");
const getCustomerOrderEmailOptions = require("./getCustomerOrderEmailOptions");

const sendEmailToCustomer = async (order, status) => {
  const options = getCustomerOrderEmailOptions(order, status);
  if (!options) return;

  try {
    await transport.sendMail(options);
    console.log("Customer email sent:", status);
  } catch (error) {
    console.error("Error sending customer email:", error);
  }
};

module.exports = sendEmailToCustomer;
