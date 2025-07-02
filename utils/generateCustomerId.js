function generateCustomerId(customerIds) {
  // Get the current year and month in the format YYYYMM (e.g., 202408)
  const now = new Date();
  const year = String(now.getFullYear()); // Full year (4 digits)
  const month = String(now.getMonth() + 1).padStart(2, "0"); // Month (2 digits)
  const currentPrefix = `FC${year}${month}`;

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
