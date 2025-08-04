const transport = require("../email/transport"); // or wherever your nodemailer transport is defined

const sendEmailToCustomer = async (order, status) => {
  const customerEmail = order.customerInfo?.email;
  const customerName = order.customerInfo?.customerName;
  const {
    trackingNumber,
    selectedShipmentHandlerName,
    trackingUrl,
    estimatedDeliveryDate,
  } = order.shipmentInfo || {};

  if (!customerEmail) return;

  // ✅ Only proceed if status is one of the valid ones
  if (
    ![
      "Processing",
      "Shipped",
      "Delivered",
      "Request Accepted",
      "Request Declined",
      "Refunded",
    ].includes(status)
  )
    return;

  let subject = "";
  let html = "";

  if (status === "Processing") {
    subject = `[${process.env.WEBSITE_NAME}] Thank You for Your Order!`;
    html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Hi ${customerName},</h2>
        <p>Thanks for shopping with us! 🛍️</p>
        <p>Here is a quick summary of your order:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
          <tr>
            <td><strong>Order Number:</strong></td><td>${order.orderNumber}</td>
          </tr>
          <tr>
            <td><strong>Order Date:</strong></td><td>${
              order.dateTime || "N/A"
            }</td>
          </tr>
          <tr>
            <td><strong>Shipping To:</strong></td>
            <td>${order.customerInfo?.address1 || "N/A"}, ${
      order.customerInfo?.city || ""
    }</td>
          </tr>
        </table>
        <p>We will notify you as soon as your items are shipped! 🚚</p>
        <p>If you have any questions, reply to this email or reach us at <a href="mailto:support@poshax.com">support@poshax.com</a></p>
        <p>Thanks again for choosing ${process.env.WEBSITE_NAME}!</p>
        <p>— ${process.env.WEBSITE_NAME} Team</p>
      </div>`;
  } else if (status === "Shipped") {
    subject = `[${process.env.WEBSITE_NAME}] Your Order is on the Way!`;
    html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Hi ${customerName},</h2>
        <p>Great news! 🎉 Your order <strong>#${
          order.orderNumber
        }</strong> has been shipped via <strong>${
      selectedShipmentHandlerName || "our delivery partner"
    }</strong>.</p>
        ${
          estimatedDeliveryDate
            ? `<p><strong>Expected delivery:</strong> ${estimatedDeliveryDate}</p>`
            : ""
        }
        ${
          trackingNumber
            ? `<p><strong>Tracking Number:</strong> ${trackingNumber}</p>`
            : ""
        }
        ${
          trackingUrl
            ? `<p>Track your package here: <a href="${trackingUrl}">${trackingUrl}</a></p>`
            : ""
        }
        <p>We hope you love your new items 💖</p>
        <p>Questions? Contact us anytime at <a href="mailto:support@poshax.com">support@poshax.com</a></p>
        <p>— ${process.env.WEBSITE_NAME} Team</p>
      </div>`;
  } else if (status === "Delivered") {
    subject = `Your Package has Arrived! Enjoy Your New Look! 💅`;
    html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Hi ${customerName},</h2>
        <p>We’re excited to let you know your order <strong>#${order.orderNumber}</strong> has been successfully delivered! 📦</p>
        <p>We hope you love your ordered items. If anything is not quite right, we’re here to help.</p>
        <p>You can reply to this email or reach out to our support team at <a href="mailto:support@poshax.com">support@poshax.com</a></p>
        <p>We would also love your feedback! Let us know how we did!</p>
        <p>Thank you for shopping with ${process.env.WEBSITE_NAME}!</p>
        <p>Stay Posh,<br/>— ${process.env.WEBSITE_NAME} Team</p>
      </div>`;
  } else if (status === "Request Accepted") {
    subject = `[${process.env.WEBSITE_NAME}] Your Return Request Has Been Accepted`;
    html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Hi ${customerName},</h2>
        <p>Good news! Your return request for order <strong>#${order.orderNumber}</strong> has been accepted.</p>
        <p>Please follow the instructions provided to return your items. Once we receive them, we’ll process your request promptly.</p>
        <p>If you have any questions, reply to this email or contact us at <a href="mailto:support@poshax.com">support@poshax.com</a>.</p>
        <p>Thank you for shopping with ${process.env.WEBSITE_NAME}!</p>
        <p>— ${process.env.WEBSITE_NAME} Team</p>
      </div>`;
  } else if (status === "Request Declined") {
    subject = `[${process.env.WEBSITE_NAME}] Update on Your Return Request`;
    html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Hi ${customerName},</h2>
        <p>We’re sorry, but your return request for order <strong>#${
          order.orderNumber
        }</strong> has been declined.</p>
        <p>Reason: ${order.declinedReason || "No reason provided."}</p>
        <p>If you have any questions or need further assistance, please reply to this email or contact us at <a href="mailto:support@poshax.com">support@poshax.com</a>.</p>
        <p>Thank you for shopping with ${process.env.WEBSITE_NAME}!</p>
        <p>— ${process.env.WEBSITE_NAME} Team</p>
      </div>`;
  } else if (status === "Refunded") {
    subject = `[${process.env.WEBSITE_NAME}] Your Refund Has Been Processed`;
    html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Hi ${customerName},</h2>
        <p>We’ve processed a refund for your order <strong>#${order.orderNumber}</strong>.</p>
        <p>The amount should be credited to your original payment method within a few business days, depending on your bank or payment provider.</p>
        <p>If you have any questions, please reply to this email or contact us at <a href="mailto:support@poshax.com">support@poshax.com</a>.</p>
        <p>Thank you for shopping with ${process.env.WEBSITE_NAME}!</p>
        <p>— ${process.env.WEBSITE_NAME} Team</p>
      </div>`;
  }

  try {
    await transport.sendMail({
      from: `${process.env.WEBSITE_NAME} <${process.env.EMAIL_USER}>`,
      to: customerEmail,
      subject,
      html,
    });
  } catch (error) {
    console.error("Email sending failed:", error);
  }
};

module.exports = sendEmailToCustomer;
