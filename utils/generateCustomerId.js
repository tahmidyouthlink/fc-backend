function generateCustomerId(customerIds) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find((p) => p.type === "year").value;
  const month = parts.find((p) => p.type === "month").value;
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
