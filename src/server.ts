import app from "./app.js";
import { config } from "./config/index.js";
import { initKeepAlive } from "./utils/keepAlive.js";

const server = app.listen(config.port, () => {
  console.log(`ResQPatient backend is running on port ${config.port}`);
  initKeepAlive();
});

process.on("unhandledRejection", (err) => {
  console.log(`Unhandled Rejection detected. Shutting down...`, err);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

process.on("uncaughtException", (err) => {
  console.log(`😈 Uncaught Exception detected. Shutting down...`, err);
  process.exit(1);
});
