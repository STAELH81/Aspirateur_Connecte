require("dotenv").config({ quiet: true });
const { syncDashboard } = require("../lib/dashboardSnapshot");

syncDashboard({ pushGitHub: false })
  .then((r) => {
    console.log("OK —", r.files.snapshotPath);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
