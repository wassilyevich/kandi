// Load packages
const http = require("http");
const fs = require("fs");
const chokidar = require("chokidar");
const path = require("path");
const WebSocket = require("ws");

// Constant variables
const PORT = 3000;
const DIR = process.cwd();
const TYPES = {
    ".html": "text/html",
    ".js": "text/javascript",
};

// Read the .kandi.json config file if it exists
const kandiConfigPath = path.join(DIR, ".kandi.json");
let kandiConfig = {};
if (fs.existsSync(kandiConfigPath)) {
    kandiConfig = JSON.parse(fs.readFileSync(kandiConfigPath, "utf-8"));
}

// Define output path based on config file or fall back onto manually set path
const outputPath = kandiConfig.outputPath || "/mnt/d/DefaultDownloads/";

// Create an http server that takes in a request and a response
const server = http.createServer((req, res) => {
    // Handle request by parsing which file is being requested
    const url = req.url;
    let filePath = "";
    if (url === "/") {
        filePath = path.join(process.cwd(), "index.html");
    } else {
        filePath = path.join(process.cwd(), url);
    }

    // Based on the reconstructed file path to the requested file, read it and assign it the correct type
    if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end("Not found");
        return;
    }
    const file = fs.readFileSync(filePath);
    const type = TYPES[path.extname(filePath)];

    // Write the header and the file to send it back to the browser
    res.writeHead(200, { "content-type": type });
    res.write(file);
    res.end();
});

// Actually make the server listen to the PORT (starting it)
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

// Create a Websocket server that shares the same PORT as the server
const wss = new WebSocket.Server({ server });

// Watch for file changes and notity browser to trigger reload() (i.e. hot reloading)
chokidar
    .watch(DIR, {
        ignored: /node_modules/,
        ignoreInitial: true,
        usePolling: true,
        interval: 100,
    })
    .on("change", (filepath) => {
        if (!filepath.endsWith(".js")) return;
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: "reload" }));
            }
        });
    });

// Handle exporting of the png files through the user triggered export action (ctrl + s) in the browser
wss.on("connection", (client) => {
    client.on("message", (message) => {
        const msg = JSON.parse(message);
        if (msg.type === "export") {
            // Parse the data string to a png file using the correct protocol
            const buffer = Buffer.from(msg.data, "base64");
            fs.mkdirSync(outputPath, { recursive: true });
            fs.writeFileSync(path.join(outputPath, msg.filename), buffer);
        } else if (msg.type === "reload") {
        }
    });
});
