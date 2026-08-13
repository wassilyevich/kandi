// Runner.js is the file that is the bridge between the sketch file (user side) and the html/browser side

// Import dependencies (i.e. sketch file and data)
import sketch, { settings, exportSettings } from "./sketch.js";
import paperSizes from "./paper-sizes.js";
import validUnits from "./units.js";

// Start the websocket so the http server and the browser have an open line
const ws = new WebSocket("ws://localhost:3000");
// Hot reloading feature
ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "reload") location.reload();
};

// Find canvas and define it
const canvas = document.querySelector("#sketch");

// Define default values and variables
let dpi = 96; // Default
let units = "px"; // Default
const MIL2PIX = 25.4;
let dimensions = [];

// Check if dpi is defined in settings
if (settings.hasOwnProperty("dpi")) {
    if (Number.isInteger(settings.dpi)) {
        dpi = settings.dpi;
    } else {
        dpi = Math.round(settings.dpi);
        console.warn("DPI setting is not an integer value.");
    }
}
// Check if units is defined in settings
if (settings.hasOwnProperty("units")) {
    if (
        typeof settings.units === "string" ||
        settings.units instanceof String
    ) {
        if (validUnits.hasOwnProperty(settings.units)) {
            units = settings.units;
        }
    } else {
        throw new Error(
            "Defined units parameter in the settings object is not a valid units type.",
        );
    }
}

// Check if dimensions are defined in settings
let baseUnits = "";
if (settings.hasOwnProperty("dimensions")) {
    if (
        typeof settings.dimensions === "string" ||
        settings.dimensions instanceof String
    ) {
        // Should be a template
        if (paperSizes.hasOwnProperty(settings.dimensions)) {
            // Exists so find dimensions in base units
            dimensions = [
                paperSizes[settings.dimensions].width,
                paperSizes[settings.dimensions].height,
            ];
            // Find base units for later rescaling based on conversion possibly to defined units
            baseUnits = paperSizes[settings.dimensions].units;
        } else {
            throw new Error(
                "Defined dimensions parameter in the settings object is not a valid paper size.",
            );
        }
    } else if (
        // If the provided dimension setting is not a string, it should be an array of 2 numbers [x dimension, y dimension]
        Array.isArray(settings.dimensions) &&
        settings.dimensions.length === 2
    ) {
        if (
            typeof settings.dimensions[0] === "number" &&
            typeof settings.dimensions[1] === "number"
        ) {
            dimensions = settings.dimensions;
            baseUnits = units;
        } else {
            throw new Error(
                "Provided values in the dimensions array are not of type Number.",
            );
        }
    } else {
        throw new Error(
            "The provided dimensions field in the settings object has the wrong type.",
        );
    }
} else {
    throw new Error("No dimensions are provided in the settings object.");
}

// Actually resolve/rescale dimensions based on provided DPI and units
if (units === "px" && baseUnits === "px") {
    // pure pixel dimensions, no conversion needed
} else {
    // If no baseunits are defined, we should use the user defined units or the default units
    const sourceUnits = baseUnits === "" ? units : baseUnits;
    // The validUnits data is used to convert the non pixel based units to mm
    const toMM = validUnits[sourceUnits].factor;
    const eqMillimeters = [dimensions[0] * toMM, dimensions[1] * toMM];
    // The mm dimensions are converted to pixels using the dpi settings
    dimensions = [
        (eqMillimeters[0] / MIL2PIX) * dpi,
        (eqMillimeters[1] / MIL2PIX) * dpi,
    ];
}

// Actually setting up the canvas and context
const width = dimensions[0];
const height = dimensions[1];
canvas.width = width;
canvas.height = height;
const context = canvas.getContext("2d");
// Call sketch() once to run setup code, get back the render function
const render = sketch();

// Define an animation loop renderer
const loop = (timestamp) => {
    if (settings.clear) {
        context.clearRect(0, 0, width, height);
    }
    render({ context, width, height, time: timestamp });
    requestAnimationFrame(loop);
};

// Actual rendering
// - Animated
// - Static
if (settings.animate) {
    requestAnimationFrame(loop);
} else {
    render({ context, width, height });
}

// fitToViewport utility function to make sure the canvas is always nicely centered in the window
const fitToViewport = () => {
    const padding = 0.9;
    const scaleX = (window.innerWidth * padding) / canvas.width;
    const scaleY = (window.innerHeight * padding) / canvas.height;
    const scale = Math.min(scaleX, scaleY);
    canvas.style.transform = `translate(-50%, -50%) scale(${scale})`;
};

// Check for resizes and use the fitToViewport() function if so
fitToViewport();
window.addEventListener("resize", fitToViewport);

//---------------------------------------------------------------------------------------------
// Exporting an image

// Initialize required variables for export naming
let prefix = null;
let custom = null;
let seed = null;
let today = new Date();
let date =
    today.getFullYear().toString() +
    (today.getMonth() + 1).toString().padStart(2, "0") +
    today.getDate().toString().padStart(2, "0");
let suffix = null;
let ext = ".png";

// Based on input, check if it is valid
if (exportSettings.hasOwnProperty("prefix")) {
    if (typeof exportSettings.prefix === "string") {
        prefix = exportSettings.prefix;
    } else {
        throw new Error(
            "Prefix defined in export settings object has not the type of String.",
        );
    }
}

if (exportSettings.hasOwnProperty("custom")) {
    if (typeof exportSettings.custom === "string") {
        custom = exportSettings.custom;
    } else {
        throw new Error(
            "Custom input defined in export settings object has not the type of String.",
        );
    }
}

if (exportSettings.hasOwnProperty("seed")) {
    if (typeof exportSettings.seed === "string") {
        seed = exportSettings.seed;
    } else {
        throw new Error(
            "Seed input defined in export settings object has not the type of String.",
        );
    }
}

if (exportSettings.hasOwnProperty("suffix")) {
    if (typeof exportSettings.suffix === "string") {
        suffix = exportSettings.suffix;
    } else {
        throw new Error(
            "Suffix input defined in export settings object has not the type of String.",
        );
    }
}

// The keyListener function listens to keyup + keydown actions
// all keys pushed down + released are tracked in exportKeys
// is both ctrl + s are true together, the keyListener function triggers the export:
// - Constructing the name based on the provided parameters
// - Converting the canvas to a dataURL and stringifying it
// - Sending it through the Websocket to the server side (node)
window.onkeydown = keyListener;
window.onkeyup = keyListener;
let exportKeys = {};
let exportCount = 0;
let imageData = "";
function keyListener(event) {
    exportKeys[event.key] = event.type == "keydown";
    // console.log(`${event.key}`);
    // console.log(exportKeys);
    if (exportKeys["Control"] && exportKeys["s"]) {
        event.preventDefault();
        exportCount++;
        const count = exportCount.toString().padStart(3, "0");
        let exportName = "";
        if (prefix !== null) {
            exportName += prefix + "-";
        }
        if (custom !== null) {
            exportName += custom + "-";
        }
        if (seed !== null) {
            exportName += seed + "-";
        }
        exportName += date;
        if (suffix !== null) {
            exportName += "-" + suffix + "-" + count + ext;
        } else {
            exportName += count + ext;
        }
        imageData = canvas.toDataURL().split(",")[1];
        ws.send(
            JSON.stringify({
                type: "export",
                filename: exportName,
                data: imageData,
            }),
        );
    }
}
