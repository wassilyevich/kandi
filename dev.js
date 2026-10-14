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
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
};
// Read the .kandi.json config file if it exists
const kandiConfigPath = path.join(DIR, ".kandi.json");
let kandiConfig = {};
if (fs.existsSync(kandiConfigPath)) {
    kandiConfig = JSON.parse(fs.readFileSync(kandiConfigPath, "utf-8"));
}

// Local date as YYYY-MM-DD (not toISOString(), which is UTC)
function today() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Configured path: use it exactly as given.
// No path configured: <sketch folder>/output/<today>
function exportDir() {
    return kandiConfig.outputPath || path.join(DIR, "output", today());
}

function writeExport(filename, data) {
    const dir = exportDir();
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), data);
    return dir;
}

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
    const isBinary = [".jpg", ".jpeg", ".png", ".gif"].includes(
        path.extname(filePath),
    );
    const file = isBinary
        ? fs.readFileSync(filePath)
        : fs.readFileSync(filePath, "utf8");
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
const wss = new WebSocket.Server({ server, maxPayload: 50 * 1024 * 1024 });

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

// Handle exporting of files through the user triggered export action in the browser
wss.on("connection", (client) => {
    client.on("error", (err) => {
        console.error("Websocket client error:", err.message);
    });
    client.on("message", (message) => {
        const msg = JSON.parse(message);
        if (msg.type === "export") {
            const dir = writeExport(
                msg.filename,
                Buffer.from(msg.data, "base64"),
            );
            console.log(`Exported .png: ${msg.filename} to ${dir}`);
            console.log(`Exported .png: ${msg.filename} to ${outputPath}`);
        } else if (msg.type === "svg-export") {
            const dir = writeExport(msg.filename, msg.data);
            console.log(`Exported .svg: ${msg.filename} to ${dir}`);
        }
    });
});
