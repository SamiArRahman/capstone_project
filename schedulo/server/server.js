const dotenv = require("dotenv");
const path = require("path");
const app = require("./src/app");

dotenv.config({ path: path.resolve(__dirname, ".env"), quiet: true });

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, function onListen() {
  console.log(`Schedulo server running on port ${PORT}`);
});
