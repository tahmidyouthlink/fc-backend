const moment = require("moment-timezone");

function generateCustomerId(customerIds) {
  const now = moment.tz("Asia/Dhaka");
  const year = now.format("YYYY");
  const month = now.format("MM");
  const currentPrefix = `PXC${year}${month}`;

  // Filter customer IDs for the current month
  const currentMonthCustomers = customerIds.filter((customerId) =>
    customerId.startsWith(currentPrefix)
  );

  // Get the last user number for this month
  const lastUserNumber = Math.max(
    0, // Include 0 to handle cases where no matching customers exist
    ...currentMonthCustomers.map((customerId) =>
      parseInt(customerId.slice(-4), 10)
    )
  );

  // Increment the user number to get the new user number
  const newUserNumber = String(lastUserNumber + 1).padStart(4, "0"); // Ensure 4 digits

  // Combine all parts to create the customer ID
  const customerId = `${currentPrefix}${newUserNumber}`;

  return customerId;
}

module.exports = generateCustomerId;
