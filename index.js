const { connectDatabase } = require("./config/database");

connectDatabase();
const app = require("./app");

app.listen(process.env.PORT, () => {
  console.log(`Server is runing on port ${process.env.PORT}`);
});
