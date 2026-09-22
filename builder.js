function buildIndex(flags) {
    const defaultHeader =
        "<!doctype html><html> <head> <style> body { background-color: #f6f6f6;overflow: hidden; margin: 0;} canvas { position: fixed;top: 50%; left: 50%; box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.3); background-color: white; transform-origin: center-center; } </style> </head>";
    const defaultBodyStart = '<body><canvas id="sketch"></canvas>';
    let body = "";
    body += defaultHeader + defaultBodyStart;
    const imports = {};
    if (flags.isGui) {
        imports["tweakpane"] = "./tweakpane/tweakpane.min.js";
    }
    if (flags.isTools) {
        imports["kandi-tools/geometry"] = "./kandi-tools/geometry/index.js";
        imports["kandi-tools/analysis"] = "./kandi-tools/analysis/index.js";
        imports["kandi-tools/math"] = "./kandi-tools/math/index.js";
        imports["kandi-tools/svg"] = "./kandi-tools/svg/index.js";
        imports["kandi-tools/random"] = "./kandi-tools/random/index.js";
        imports["kandi-tools/images"] = "./kandi-tools/images/index.js";
        imports["kandi-tools/color"] = "./kandi-tools/color/index.js";
    }
    body += `<script type="importmap">${JSON.stringify({ imports })}</script>`;
    body += '<script type="module"src="runner.js"></script></body></html>';
    return body;
}

function buildSketch(flags) {
    return `
${flags.isGui ? `// Import tweakpane` : ""}
${flags.isGui ? `import { Pane } from 'tweakpane';` : ""}
${flags.isTools ? `// Import kandi-tools` : ""}
${flags.isTools ? `import * as geometry from 'kandi-tools/geometry';` : ""}
${flags.isTools ? `import * as analysis from 'kandi-tools/analysis';` : ""}
${flags.isTools ? `import * as math from 'kandi-tools/math';` : ""}
${flags.isTools ? `import * as svg from 'kandi-tools/svg';` : ""}
${flags.isTools ? `import * as random from 'kandi-tools/random';` : ""}
${flags.isTools ? `import * as images from 'kandi-tools/images';` : ""}
${flags.isTools ? `import * as color from 'kandi-tools/color';` : ""}

const PARAMS = ${flags.isGui ? `{ radiusFactor: 0.2 }` : `{}`};

// Standard sketch settings:
export const settings = {
    dimensions: [500, 500], //in units; can also be "A4" for example.
    dpi: 300, // e.g. for print
    units: "px", // pixels; can also be mm, cm, dm, m
    animate: ${flags.isGui ? `true` : `false`},
    clear: ${flags.isGui ? `true` : `false`},
};

// Standard export settings for the sketch
// File will be called prefix-custom-seed-date-count.png
// I.e. if nothing is provided, the file will be called date-count.png
export const exportSettings = {
    prefix: "prefix",
    custom: "custom",
    suffix: "suffix",
};
const sketch = ({ width, height }) => {
${
    flags.isGui
        ? `
    const pane = new Pane();
    pane.addBinding(PARAMS, 'radiusFactor', { min: 0.01, max: 0.5, step: 0.01 });
`
        : ""
}
    return ({ context, width, height }) => {
        context.beginPath();
        context.arc(width/2, height/2, ${flags.isGui ? `PARAMS.radiusFactor` : `0.2`} * width, 0, Math.PI * 2);
        context.fill();
    };
};

export default sketch;
`;
}

module.exports = {
    buildIndex,
    buildSketch,
};
