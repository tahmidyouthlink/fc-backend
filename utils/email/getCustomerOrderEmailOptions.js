const confirmationEmail = require("./customer-order/confirmationEmail");
const refundedEmail = require("./customer-order/refundedEmail");
const requestDeclinedEmail = require("./customer-order/requestDeclinedEmail");
const returnApprovalEmail = require("./customer-order/returnApprovalEmail");

const getCustomerOrderEmailOptions = (order, status) => {
  const emailGenerators = {
    Processing: confirmationEmail,
    // Shipped: shippedEmail,
    // Delivered: deliveredEmail,
    "Request Accepted": returnApprovalEmail,
    "Request Declined": requestDeclinedEmail,
    Refunded: refundedEmail,
  };

  const generator = emailGenerators[status];

  if (!generator || !order.customerInfo?.email) return null;

  return generator(order);
};

module.exports = getCustomerOrderEmailOptions;
