function checkIfPromoCodeIsValid(userPromoCode, cartSubtotal) {
  return (
    userPromoCode?.promoStatus == true &&
    new Date() <= new Date(userPromoCode?.expiryDate) &&
    cartSubtotal >= parseFloat(userPromoCode?.minAmount)
  );
}

module.exports = checkIfPromoCodeIsValid;
