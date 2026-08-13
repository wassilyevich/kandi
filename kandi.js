#!/usr/bin/env node

// Loading packages
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

// Define variables and important paths
const cwd = process.cwd();
const defaultFilesPath = path.join(__dirname, "default");
const dataPath = path.join(__dirname, "data");
const configPath = path.join(os.homedir(), ".kandi", "config.json");
let globalConfig = {};
if (fs.existsSync(configPath)) {
    globalConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
}
let defaultOutputPath = "/mnt/d/DefaultDownloads/";
const defaultSketchName = "sketch";
const devServerPath = path.join(__dirname, "dev.js");

// Initialize argument parsing variables
let isNew = false;
let sketchName = "";
let isDev = false;
let isJump = false;
let outputPath = "";
let isConfig = false;
let verbose = false;

// Start of argument parsing of the CLI tool
// Each argument that is passed is checked against the available commands
// If the command exists, the accompanying boolean is set to true, allowing resolving of the command later in the script
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
    if (args[i] === "new") {
        isNew = true;
        sketchName = args[i + 1].toString();
    } else if (args[i] === "dev") {
        isDev = true;
        // Safety if no sketchname is provided as a second argument for kandi dev ...
        sketchName =
            args[i + 1] && !args[i + 1].startsWith("--")
                ? path.basename(args[i + 1], ".js")
                : defaultSketchName;
        if (!args[i + 1] || args[i + 1].startsWith("--")) {
            console.warn(
                `No sketch name provided, using default: '${defaultSketchName}'`,
            );
        }
    } else if (args[i] === "jump") {
        isJump = true;
        // Safety if no sketchname is provided as a second argument for kandi jump ...
        sketchName =
            args[i + 1] && !args[i + 1].startsWith("--")
                ? path.basename(args[i + 1], ".js")
                : defaultSketchName;
        if (!args[i + 1] || args[i + 1].startsWith("--")) {
            console.warn(
                `No sketch name provided, using default: '${defaultSketchName}'`,
            );
        }
    } else if (args[i] === "--output") {
        // Manually defining output path in the CLI
        outputPath = path.resolve(args[i + 1]);
    } else if (args[i] === "--config") {
        isConfig = true;
        // Recursive creation of the directory for safety
        fs.mkdirSync(path.resolve(args[args.indexOf("--config") + 1]), {
            recursive: true,
        });
        // Setting the defaultOutputPath for the .kandi/config.json configurator
        defaultOutputPath = path.resolve(args[i + 1]);
    } else if (args[i] === "--verbose") {
        // Triggering verbose output
        verbose = true;
    }
}

// Resolve output path based on priority
// First: manually defined outputpath by the user this session
// Second:the default outputpath defined in the global configurator if it already exists
// Third: if it was only configured now, the new default outputpath
const resolvedOutputPath =
    outputPath || globalConfig.defaultOutputPath || defaultOutputPath;

// Verbose logging function
const log = verbose ? console.log : () => {};

// Execute the newSketch function if a new sketch is demanded through the CLI
if (isNew) {
    newSketch();

    // Execute the runDev function if a sketch should be started using the dev server
} else if (isDev) {
    runDev();
    // The jump command combines both the isNew and isDev commands as a shortcut
} else if (isJump) {
    newSketch();
    runDev();
    // When the new default path is defined using the --config flag, the config.json file is written in the home directory/.kandi/
} else if (isConfig) {
    const kandiDir = path.join(os.homedir(), ".kandi");
    fs.mkdirSync(kandiDir, { recursive: true });
    const newConfig = { defaultOutputPath };
    // Actually writing the config file
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
    console.log(`Default output path set to: ${defaultOutputPath}`);
} else {
    //Safety fallback if no valid command is specified
    console.error(
        "No command specified. Available commands: kandi new, kandi dev, kandi jump",
    );
    process.exit(1);
}

// newSketch function used to create a new sketch meaning:
// - making a new directory
// - copying all relevant files/directories to the new sketch directory
// - renaming the sketch.js file
// - updating the reference to the sketch.js file in the runner.js file
function newSketch() {
    const baseName = path.basename(sketchName, ".js");
    const newSketchPath = path.join(cwd, baseName);
    fs.mkdirSync(newSketchPath);
    fs.cpSync(defaultFilesPath, newSketchPath, { recursive: true });
    fs.cpSync(dataPath, newSketchPath, { recursive: true });
    fs.renameSync(
        path.join(newSketchPath, "sketch.js"),
        path.join(newSketchPath, baseName + ".js"),
    );

    const runnerPath = path.join(newSketchPath, "runner.js");
    const runnerContent = fs.readFileSync(runnerPath, "utf8");
    const updatedRunner = runnerContent.replace(
        "./sketch.js",
        `./${baseName}.js`,
    );
    fs.writeFileSync(runnerPath, updatedRunner);
    log(`Created new sketch folder at ${newSketchPath}`);
    log(`Copied default files and data files into the sketch folder.`);
}

// runDev function used to start the dev server and run a sketch project:
// - write the .kandi.json file based on the sketchname and output path
// - spawn a child node process (inheriting the console) to start dev.js
function runDev() {
    const baseName = path.basename(sketchName, ".js");
    const newSketchPath = path.join(cwd, baseName);
    const kandiConfig = {
        sketchFile: baseName + ".js",
        outputPath: resolvedOutputPath,
    };
    fs.writeFileSync(
        path.join(newSketchPath, ".kandi.json"),
        JSON.stringify(kandiConfig, null, 2),
    );
    const devProcess = spawn("node", [devServerPath], {
        cwd: newSketchPath,
        stdio: "inherit",
    });
}
