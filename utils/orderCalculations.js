const moment = require("moment-timezone");

const checkIfPromoCodeIsValid = require("./isPromoCodeValid");

const checkIfAnyDiscountIsAvailable = (product, specialOffers) => {
  const now = moment.tz("Asia/Dhaka");

  return (
    !!Number(product?.discountValue) ||
    specialOffers?.some((offer) => {
      const expiryDate = moment.tz(
        `${offer?.expiryDate} 23:59:59`,
        "YYYY-MM-DD HH:mm:ss",
        "Asia/Dhaka"
      );

      return (
        offer.offerStatus === true &&
        (offer.selectedProductIds?.includes(product?.productId) ||
          offer.selectedCategories?.includes(product?.category)) &&
        now <= expiryDate
      );
    })
  );
};

const checkIfOnlyRegularDiscountIsAvailable = (product, specialOffers) => {
  return (
    !!Number(product?.discountValue) &&
    !checkIfSpecialOfferIsAvailable(product, specialOffers)
  );
};

const checkIfSpecialOfferIsAvailable = (product, specialOffers) => {
  const now = moment.tz("Asia/Dhaka");

  return specialOffers?.some((offer) => {
    const expiryDate = moment.tz(
      `${offer?.expiryDate} 23:59:59`,
      "YYYY-MM-DD HH:mm:ss",
      "Asia/Dhaka"
    );

    return (
      offer.offerStatus === true &&
      now <= expiryDate &&
      (offer.selectedProductIds?.includes(product?.productId) ||
        offer.selectedCategories?.includes(product?.category))
    );
  });
};

const getProductSpecialOffer = (product, specialOffers, cartSubtotal) => {
  const now = moment.tz("Asia/Dhaka");

  return specialOffers?.find((offer) => {
    const expiryDate = moment.tz(
      `${offer?.expiryDate} 23:59:59`,
      "YYYY-MM-DD HH:mm:ss",
      "Asia/Dhaka"
    );

    return (
      offer.offerStatus === true &&
      (offer.selectedProductIds?.includes(product?.productId) ||
        offer.selectedCategories?.includes(product?.category)) &&
      now <= expiryDate &&
      (cartSubtotal === "NA" || cartSubtotal >= parseFloat(offer.minAmount))
    );
  });
};

const calculateFinalPrice = (product, specialOffers) => {
  const regularPrice = parseFloat(product?.regularPrice);
  const isSpecialOfferAvailable = checkIfSpecialOfferIsAvailable(
    product,
    specialOffers
  );
  const discountValue = parseFloat(product?.discountValue);

  if (isSpecialOfferAvailable || isNaN(discountValue) || discountValue === 0) {
    return regularPrice;
  }

  if (product?.discountType === "Percentage") {
    return regularPrice - (regularPrice * discountValue) / 100;
  } else if (product?.discountType === "Flat") {
    return regularPrice - discountValue;
  } else {
    return regularPrice;
  }
};

const calculateSubtotal = (productList, cartItems, specialOffers) => {
  if (!cartItems?.length) return 0;

  return cartItems.reduce((accumulator, cartItem) => {
    const product = productList?.find(
      (product) => product._id.toString() === cartItem?._id
    );

    return (
      calculateFinalPrice(product, specialOffers) *
        Number(cartItem?.selectedQuantity) +
      accumulator
    );
  }, 0);
};

const calculatePromoDiscount = (
  productList,
  cartItems,
  userPromoCode,
  specialOffers
) => {
  if (
    !cartItems?.length ||
    !checkIfPromoCodeIsValid(
      userPromoCode,
      calculateSubtotal(productList, cartItems, specialOffers)
    )
  )
    return 0;

  let promoDiscount;

  if (userPromoCode?.promoDiscountType === "Amount") {
    promoDiscount = userPromoCode?.promoDiscountValue;
  } else {
    promoDiscount =
      (userPromoCode?.promoDiscountValue / 100) *
      calculateSubtotal(productList, cartItems);
  }

  const promoMaxAmount = Number(userPromoCode.maxAmount);

  if (promoMaxAmount > 0 && promoDiscount > promoMaxAmount) {
    promoDiscount = promoMaxAmount;
  }

  return promoDiscount;
};

const calculateProductSpecialOfferDiscount = (
  product,
  cartItem,
  specialOffer
) => {
  const totalProductPrice =
    Number(product?.regularPrice) * Number(cartItem?.selectedQuantity);
  const offerDiscountValue = parseFloat(specialOffer?.offerDiscountValue);

  if (!offerDiscountValue) return 0;

  let specialDiscount = 0;

  if (specialOffer.offerDiscountType === "Percentage") {
    specialDiscount = (totalProductPrice * offerDiscountValue) / 100;
  } else if (specialOffer.offerDiscountType === "Amount") {
    specialDiscount = offerDiscountValue;
  }

  const offerMaxAmount = Number(specialOffer.maxAmount);

  if (offerMaxAmount > 0 && specialDiscount > offerMaxAmount) {
    specialDiscount = offerMaxAmount;
  }

  return Number(specialDiscount);
};

const calculateTotalSpecialOfferDiscount = (
  productList,
  cartItems,
  specialOffers
) => {
  if (!cartItems?.length) return 0;

  return cartItems.reduce((accumulator, cartItem) => {
    const product = productList?.find(
      (product) => product._id.toString() === cartItem?._id
    );
    const specialOffer = getProductSpecialOffer(
      product,
      specialOffers,
      calculateSubtotal(productList, cartItems, specialOffers)
    );
    const discount = !specialOffer
      ? 0
      : calculateProductSpecialOfferDiscount(product, cartItem, specialOffer);

    return discount + accumulator;
  }, 0);
};

const calculateShippingCharge = (
  selectedCity,
  selectedDeliveryType,
  shippingZones
) => {
  if (!selectedCity || (selectedCity === "Dhaka" && !selectedDeliveryType)) {
    return 0;
  } else {
    const shippingZone = shippingZones?.find((shippingZone) =>
      shippingZone?.selectedCity.includes(selectedCity)
    );

    return Number(
      shippingZone?.shippingCharges[selectedDeliveryType || "STANDARD"] || 0
    );
  }
};

const getTotalItemCount = (cartItems) => {
  if (!cartItems?.length) return 0;

  return cartItems.reduce(
    (accumulator, item) => Number(item.selectedQuantity) + accumulator,
    0
  );
};

const getEstimatedDeliveryTime = (
  selectedCity,
  selectedDeliveryType,
  shippingZones
) => {
  if (!selectedCity || (selectedCity === "Dhaka" && !selectedDeliveryType)) {
    return null;
  } else {
    const shippingZone = shippingZones?.find((shippingZone) =>
      shippingZone?.selectedCity.includes(selectedCity)
    );

    return (
      shippingZone?.shippingDurations[selectedDeliveryType || "STANDARD"] ||
      null
    );
  }
};

const getExpectedDeliveryDate = (dateInput, deliveryMethod, estimatedTime) => {
  let orderDate;

  if (typeof dateInput === "string" && dateInput.includes(" | ")) {
    // Old format "DD-MM-YY | HH:mm"
    const [datePart, timePart] = dateInput.split(" | ");
    const [day, month, year] = datePart.split("-").map(Number);
    const [hour, minute] = timePart.split(":").map(Number);
    orderDate = moment.tz(
      `${year + 2000}-${month}-${day} ${hour}:${minute}`,
      "YYYY-M-D HH:mm",
      "Asia/Dhaka"
    );
  } else {
    // Accept Date object or ISO string
    orderDate = moment(dateInput).tz("Asia/Dhaka");
  }

  // Parse the estimated duration
  let maxTime; // Maximum time in the duration range
  if (estimatedTime.includes("-")) {
    // If duration is a range (e.g., "2-3"), pick the maximum value
    maxTime = Math.max(...estimatedTime.split("-").map(Number));
  } else {
    // Otherwise, it's a single value
    maxTime = Number(estimatedTime);
  }

  // Calculate the delivery time based on the delivery method
  if (deliveryMethod === "EXPRESS") {
    // For EXPRESS, add maxTime hours to the order date
    orderDate.add(maxTime, "hours");
  } else {
    // For STANDARD, add maxTime days to the order date
    orderDate.add(maxTime, "days");
  }

  // Format the result to "MMMM DD, YYYY"
  return orderDate.format("MMMM DD, YYYY");
};

module.exports = {
  checkIfAnyDiscountIsAvailable,
  checkIfOnlyRegularDiscountIsAvailable,
  checkIfSpecialOfferIsAvailable,
  getProductSpecialOffer,
  calculateFinalPrice,
  calculateSubtotal,
  calculatePromoDiscount,
  calculateProductSpecialOfferDiscount,
  calculateTotalSpecialOfferDiscount,
  calculateShippingCharge,
  getTotalItemCount,
  getEstimatedDeliveryTime,
  getExpectedDeliveryDate,
};
