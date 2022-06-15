const geoip = require("geoip-country");

exports.getCountry = async (ip) => {
  // ip = ip || "223.238.101.187";
  const country = await geoip.lookup(ip);
  return country;
};
