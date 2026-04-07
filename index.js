const dotenv = require("dotenv");

// Always load only .env
dotenv.config({ path: ".env" });
console.log("Environment file loaded: .env");
console.log(process.env.FRONTEND_URL);

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const connectDB = require("./utils/connectDB");
const path = require("path");
// const { initializeWebSocket } = require("./utils/websocketUtil");
// const WebSocket = require('ws');

const { setupSocket, getIo } = require("./utils/socketConfig");
const cron = require("node-cron");
// const handlebars = require('express-handlebars');
const { engine } = require("express-handlebars");

const Notification = require("./models/Notification");

//Employee and auth
const authRoute = require("./routes/auth/auth");

//Master data routes
const productRoute = require("./routes/products/product");
const countryRoute = require("./routes/mastersData/country");
const currencyRoute = require("./routes/mastersData/currency");
const qualityCategoryRoute = require("./routes/mastersData/qualityCategory");
const timeZoneRoute = require("./routes/mastersData/timeZone");
const paymentCycleRoute = require("./routes/mastersData/paymentCycle");
const empGroupRoute = require("./routes/mastersData/employeeGroup");
const destinationRoute = require("./routes/mastersData/destination");

//Routes for Account, services and Requirements
const accountsRoute = require("./routes/account/account");
const servicesRoute = require("./routes/services/services");

//Routes for task and thread
const taskRoute = require("./routes/tasks/task");
const threadRoute = require("./routes/tasks/thread");
const reportRoute = require("./routes/reports/reports");
const mapper = require("./routes/mapper/mapper");
const requirementRoute = require("./routes/requirements/requirements");
const notificationRoutes = require("./routes/notification/notification");
const bulkUpload = require("./routes/bulkUpload/bulkupload");

const { getUserSocket } = require("./utils/socketConfig");
const { fetchAndSendReport } = require("./utils/reportEmailScheduler");

const routingtaskRoute = require("./routes/tasks/routingTask");
const routingTaskThread = require("./routes/tasks/routingTaskThread");

const app = express();
// const wss = new WebSocket.Server({ noServer: true });

app.use(cors());
// const server = http.createServer(app);

const PORT = process.env.PORT || 4000;

connectDB().then(() => {
    const server = app.listen(PORT, () => {
        console.log("Server running on port:", PORT);
    });
    setupSocket(server);
});

// Middleware to add io to request
app.use((req, res, next) => {
    req.io = getIo();
    next();
});

app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", "./views");

// const io = setupSocket(server);

//  // Middleware to add io to request
//  app.use((req, res, next) => {
//   req.io = io;
//   next();
// });

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(bodyParser.json());

// initializeWebSocket(server);
app.use("/file", express.static("uploads"));

//Employees and auth Route
app.use("/api", authRoute);

//Master Data Route
app.use("/api", productRoute);
app.use("/api", countryRoute);
app.use("/api", currencyRoute);
app.use("/api", timeZoneRoute);
app.use("/api", qualityCategoryRoute);
app.use("/api", paymentCycleRoute);
app.use("/api", empGroupRoute);
app.use("/api", destinationRoute);

//Routes related to accounts
app.use("/api", accountsRoute);
app.use("/api", servicesRoute);
app.use("/api", requirementRoute);

//task and thread
app.use("/api", taskRoute);
app.use("/api", threadRoute);
app.use("/api/report", reportRoute);
app.use("/api", mapper);
app.use("/api", notificationRoutes);
app.use("/api", bulkUpload);

app.use("/api", routingtaskRoute);
app.use("/api", routingTaskThread);

app.get("/", async (req, res) => {
    // const notification=new Notification(
    //   {
    //     message:"Task created and assigned to very new",
    //     notificationType: "TASK_CREATION",
    //     product: "VOICE",
    //     accountId: "663d926e4c577179c8416c09",
    //     emitter: "663bcb6c75d8c3f2c7208924",
    //     involvedEmp:["65e2fb07b859bbaee4e0942a","663bcb6c75d8c3f2c7208924"]
    //   });

    //   const userSocket= getUserSocket('663bcbb675d8c3f2c720892d');
    // if (userSocket) {
    //   userSocket.emit('personal', { message: 'A1 new account has been created' });
    // }
    // req.io.emit('personal', notification);
    //  req.io.emit('newAccount', { message: 'notification reloaded data'});
    res.send("TERP - Webdesys");
});

try {
    async function main() {
        try {
            await fetchAndSendReport();
        } catch (error) {
            console.error("Error in main:", error);
        }
    }

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log(`Current timezone: ${timezone}`);

    const now = new Date();
    console.log(now, now.toString(), now.toISOString(), process.env.TZ);

    cron.schedule("30 23 * * *", main);
} catch (error) {
    console.log("some error in daily task", error.message);
}