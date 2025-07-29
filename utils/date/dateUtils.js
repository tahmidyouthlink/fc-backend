const moment = require("moment-timezone");

function isValidDate(date) {
  return date && !isNaN(new Date(date).getTime());
}

function isWithinLast3Days(dateString) {
  if (!isValidDate(dateString)) return false;
  const date = moment.tz(dateString, "Asia/Dhaka");
  const now = moment.tz("Asia/Dhaka");
  const diffDays = now.diff(date, "days", true); // Use moment for precise day difference
  return diffDays <= 3;
}

module.exports = { isValidDate, isWithinLast3Days };
