const { DateTime } = require("luxon");

const currentTime = () => {
  const now = DateTime.now();
  const formattedTime = now.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);
  return formattedTime;
};

module.exports = { currentTime };
