const morgan = require("morgan");
const fs = require("fs");
const path = require("path");

/**
 * logger — returns the appropriate morgan logger for the environment.
 *  - development : colourised "dev" format to stdout
 *  - production  : combined Apache format appended to logs/access.log
 */
const createLogger = () => {
  const env = process.env.NODE_ENV || "development";

  if (env === "production") {
    const logDir = path.join(__dirname, "../logs");
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const accessStream = fs.createWriteStream(path.join(logDir, "access.log"), {
      flags: "a",
    });
    return morgan("combined", { stream: accessStream });
  }

  return morgan("dev");
};

module.exports = createLogger;
