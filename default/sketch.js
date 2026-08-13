// Standard sketch settings:
export const settings = {
    dimensions: [500, 500], //in units; can also be "A4" for example.
    dpi: 300, // e.g. for print
    units: "px", // pixels; can also be mm, cm, dm, m
    animate: false,
    clear: false, // clear every frame in animation loop
};

// Standard export settings for the sketch
// File will be called prefix-custom-seed-date-count.png
// I.e. if nothing is provided, the file will be called date-count.png
export const exportSettings = {
    prefix: "prefix",
    custom: "custom",
    suffix: "suffix",
};

// Sketch function called by the runner to be rendered onto the canvas
// Returned function takes in values based on the settings
const sketch = () => {
    // "Constructor" for single setup calculations and maximum reproducibility
    // ^^^^^^^^^^^^^^

    // vvvvvvvvvvvvvv
    // Actual rendering function i.e. which is called in the runner based on the provided settings (and precalculated values in the "constructor")
    return ({ context, width, height, time }) => {
        context.fillRect(
            width / 2 - width / 10,
            height / 2 - height / 10,
            width / 5,
            height / 5,
        );
    };
};

export default sketch;
