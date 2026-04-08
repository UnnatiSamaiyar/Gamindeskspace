const dotenv = require("dotenv");

// Always load only .env
dotenv.config({ path: ".env" });

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const connectDB = require("./utils/connectDB");
const path = require("path");
const { setupSocket, getIo } = require("./utils/socketConfig");
const cron = require("node-cron");
const { engine } = require("express-handlebars");

const Notification = require("./models/Notification");

// Employee and auth
const authRoute = require("./routes/auth/auth");

// Master data routes
const productRoute = require("./routes/products/product");
const countryRoute = require("./routes/mastersData/country");
const currencyRoute = require("./routes/mastersData/currency");
const qualityCategoryRoute = require("./routes/mastersData/qualityCategory");
const timeZoneRoute = require("./routes/mastersData/timeZone");
const paymentCycleRoute = require("./routes/mastersData/paymentCycle");
const empGroupRoute = require("./routes/mastersData/employeeGroup");
const destinationRoute = require("./routes/mastersData/destination");

// Routes for Account, services and Requirements
const accountsRoute = require("./routes/account/account");
const servicesRoute = require("./routes/services/services");

// Routes for task and thread
const taskRoute = require("./routes/tasks/task");
const threadRoute = require("./routes/tasks/thread");
const reportRoute = require("./routes/reports/reports");
const mapper = require("./routes/mapper/mapper");
const requirementRoute = require("./routes/requirements/requirements");
const notificationRoutes = require("./routes/notification/notification");
const bulkUpload = require("./routes/bulkUpload/bulkupload");

const { fetchAndSendReport } = require("./utils/reportEmailScheduler");

const routingtaskRoute = require("./routes/tasks/routingTask");
const routingTaskThread = require("./routes/tasks/routingTaskThread");

const app = express();
const PORT = Number(process.env.PORT) || 4000;

const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:4000",
    "http://localhost:4001",
    "https://gamingdesk.space",
    "https://www.gamingdesk.space",
    "https://api.gamingdesk.space",
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
    ...(process.env.SOCKET_ALLOWED_ORIGIN
        ? process.env.SOCKET_ALLOWED_ORIGIN.split(",").map((item) => item.trim()).filter(Boolean)
        : []),
];

const uniqueAllowedOrigins = [...new Set(allowedOrigins)];

console.log("Environment file loaded: .env");
console.log("FRONTEND_URL:", process.env.FRONTEND_URL);
console.log("PORT:", PORT);
console.log("Allowed Origins:", uniqueAllowedOrigins);

app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin) {
                return callback(null, true);
            }

            if (uniqueAllowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error(`CORS blocked for origin: ${origin}`));
        },
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    })
);

app.options("*", cors());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(bodyParser.json());

app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", "./views");

app.use("/file", express.static("uploads"));

// Safe middleware to add io to request
app.use((req, res, next) => {
    try {
        req.io = getIo();
    } catch (error) {
        req.io = null;
    }
    next();
});

// Health checks
app.get("/", async (req, res) => {
    res.status(200).send("TERP - Webdesys");
});

app.get("/api/health", async (req, res) => {
    res.status(200).json({
        success: true,
        message: "Server is running",
        port: PORT,
        time: new Date().toISOString(),
    });
});

// Employees and auth Route
app.use("/api", authRoute);

// Master Data Route
app.use("/api", productRoute);
app.use("/api", countryRoute);
app.use("/api", currencyRoute);
app.use("/api", timeZoneRoute);
app.use("/api", qualityCategoryRoute);
app.use("/api", paymentCycleRoute);
app.use("/api", empGroupRoute);
app.use("/api", destinationRoute);

// Routes related to accounts
app.use("/api", accountsRoute);
app.use("/api", servicesRoute);
app.use("/api", requirementRoute);

// task and thread
app.use("/api", taskRoute);
app.use("/api", threadRoute);
app.use("/api/report", reportRoute);
app.use("/api", mapper);
app.use("/api", notificationRoutes);
app.use("/api", bulkUpload);
app.use("/api", routingtaskRoute);
app.use("/api", routingTaskThread);

// Global error handler
app.use((err, req, res, next) => {
    console.error("Global Error:", err);

    if (res.headersSent) {
        return next(err);
    }

    return res.status(500).json({
        message: err.message || "Internal Server Error",
    });
});

// Cron setup
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

// Server startup
async function startServer() {
    try {
        await connectDB();

        const server = app.listen(PORT, () => {
            console.log("Server running on port:", PORT);
        });

        setupSocket(server);
    } catch (error) {
        console.error("Server startup failed:", error);
        process.exit(1);
    }
}

startServer();