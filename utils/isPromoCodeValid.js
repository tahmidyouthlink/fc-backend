function checkIfPromoCodeIsValid(userPromoCode, cartSubtotal) {
  const now = new Date(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Dhaka",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date())
  );

  const expiryDate = new Date(`${userPromoCode?.expiryDate}T23:59:59+06:00`);

  return (
    userPromoCode?.promoStatus == true &&
    now <= expiryDate &&
    cartSubtotal >= parseFloat(userPromoCode?.minAmount)
  );
}

module.exports = checkIfPromoCodeIsValid;
