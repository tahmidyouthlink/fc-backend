function checkIfPromoCodeIsValid(userPromoCode, cartSubtotal) {
  const now = new Date();
  now.setHours(now.getHours() + 6); // Shift to Bangladesh time (UTC+6)

  const expiryDate = new Date(userPromoCode?.expiryDate + "T23:59:59"); // Make it expire at the end of the day

  return (
    userPromoCode?.promoStatus == true &&
    now <= expiryDate &&
    cartSubtotal >= parseFloat(userPromoCode?.minAmount)
  );
}

module.exports = checkIfPromoCodeIsValid;
