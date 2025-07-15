function generateOrderId(orderIds, fullName, phoneNumber) {
  // Get today's date in the format YYMMDD (e.g., 240804)
  const today = new Date();
  today.setHours(today.getHours() + 6); // Adjust to UTC+6
  const year = String(today.getFullYear()).slice(2); // Last 2 digits of the year
  const month = String(today.getMonth() + 1).padStart(2, "0"); // Month (2 digits)
  const day = String(today.getDate()).padStart(2, "0"); // Day (2 digits)
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
