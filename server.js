const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const morgan = require("morgan");
const colors = require("colors");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/error");
const fileUpload = require("express-fileupload");
const mongoSanitize = require("express-mongo-sanitize");
const helmet = require("helmet");
const xss = require("xss-clean");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");







//Load env vars
dotenv.config({ path: "./config/config.env" });


//Database connections
connectDB();
//Routes files
const auth = require("./routes/auth");
const users = require("./routes/users");

const retailers = require("./routes/retailers");
const cors = require("cors");
const { options } = require("./routes/auth");
const app = express();


//Use for Socket.io
const server = http.createServer(app);
const io = socketio(server);
//file upload middleware allways add first
app.use(fileUpload());

//Body parser
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

// To handle SQL injection
app.use(mongoSanitize());

//set security headers(It will add bunch of value at header so Help to secure cross site attacks)
app.use(helmet());

//Prevent xss(Cross site Scripting) attacks
app.use(xss());

//Rate limiting
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

//Prevent http param pollution (brute-forcing)
app.use(hpp());

//Enable cors (diffrent domain frontend can access api)
app.use(cors());

//Set Static folder
app.use(express.static(path.join(__dirname, "public")));


//Dev logging middleware
if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
}

//Mount routers
app.use("/api/auth", auth);
app.use("/api/users", users);

app.use("/api/retailers", retailers);


//custome error handling from express error handler (Always write below the Mount Routes)
app.use(errorHandler);

const Port = 7000;
const serverException = server.listen(
    Port,
    console.log(
        `Server running in ${process.env.NODE_ENV} mode on port  ${Port}`.yellow
        .bold
    )
);

//Handle unhandled promise rejection
process.on("unhandledRejection", (err, promise) => {
    console.log(`Error:${err.message}`.red);
    //Close server and exit process
    serverException.close(() => process.exit(1));
});

module.exports = { io };
require("./socket/index");