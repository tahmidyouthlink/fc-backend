const connectDB = require("./mongodb");

let cachedCollections = null;

async function getCollections() {

  if (cachedCollections) return cachedCollections;

  const db = await connectDB();

  cachedCollections = {
    productInformationCollection: db.collection("all-product-information"),
    orderListCollection: db.collection("orderList"),
    customerListCollection: db.collection("customerList"),
    seasonCollection: db.collection("seasons"),
    categoryCollection: db.collection("category"),
    colorCollection: db.collection("colors"),
    vendorCollection: db.collection("vendors"),
    tagCollection: db.collection("tags"),
    promoCollection: db.collection("promo-code"),
    offerCollection: db.collection("offers"),
    shippingZoneCollection: db.collection("shipping-zone"),
    shipmentHandlerCollection: db.collection("shipment-handler"),
    paymentMethodCollection: db.collection("payment-methods"),
    locationCollection: db.collection("locations"),
    purchaseOrderCollection: db.collection("purchase-order"),
    transferOrderCollection: db.collection("transfer-order"),
    marketingBannerCollection: db.collection("marketing-banner"),
    loginRegisterSlideCollection: db.collection("login-register-slide"),
    heroBannerCollection: db.collection("hero-banner"),
    newsletterCollection: db.collection("news-letter"),
    enrollmentCollection: db.collection("enrollment-admin-staff"),
    termsNConditionCollection: db.collection("terms-and-conditions"),
    privacyPolicyCollection: db.collection("privacy-policy"),
    refundPolicyCollection: db.collection("refund-policy"),
    shippingPolicyCollection: db.collection("shipping-policy"),
    returnPolicyCollection: db.collection("return-policy"),
    policyPagesCollection: db.collection("policy-pages"),
    faqCollection: db.collection("faqs"),
    ourStoryCollection: db.collection("our-story"),
    topHeaderCollection: db.collection("top-header"),
    availabilityNotifications: db.collection("availability-notifications"),
  };

  return cachedCollections;
}

module.exports = getCollections;