const moment = require("moment-timezone");

function checkIfPromoCodeIsValid(userPromoCode, cartSubtotal) {
  const now = moment.tz("Asia/Dhaka");

  const expiryDate = moment.tz(
    `${userPromoCode?.expiryDate} 23:59:59`,
    "YYYY-MM-DD HH:mm:ss",
    "Asia/Dhaka"
  );

  return (
    userPromoCode?.promoStatus == true &&
    now <= expiryDate &&
    cartSubtotal >= parseFloat(userPromoCode?.minAmount)
  );
}

module.exports = checkIfPromoCodeIsValid;
