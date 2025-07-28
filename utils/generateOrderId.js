function generateOrderId(orderIds, fullName, phoneNumber) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find((p) => p.type === "year").value;
  const month = parts.find((p) => p.type === "month").value;
  const day = parts.find((p) => p.type === "day").value;
  const todayPrefix = `${year}${month}${day}`;

  // Filter order IDs for today's orders
  const todaysOrders = orderIds.filter((orderId) =>
    orderId.startsWith(todayPrefix)
  );

  // Get today's last order number
  const lastOrderNumber = Math.max(
    0, // Include 0 to handle cases where no matching orders exist
    ...todaysOrders.map((orderId) => parseInt(orderId.slice(6, 8), 10))
  );

  // Increment the order number to get the new order number
  const newOrderNumber = String(lastOrderNumber + 1).padStart(2, "0"); // Ensure 2 digits

  // Extract initials from the full name
  const nameParts = fullName.trim().split(/\s+/); // Split by whitespace
  const firstInitial = nameParts[0][0].toUpperCase(); // First letter of the first name
  const lastInitial =
    nameParts.length > 1
      ? nameParts[nameParts.length - 1][0].toUpperCase()
      : "X"; // Last letter or "X"

  // Extract last 3 digits of the phone number
  const phoneLastThree = phoneNumber.slice(-3);

  // Combine all parts to create the order ID
  const orderId = `${todayPrefix}${newOrderNumber}${firstInitial}${lastInitial}${phoneLastThree}`;

  return orderId;
}

module.exports = generateOrderId;
