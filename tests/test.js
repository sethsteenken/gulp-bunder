var bunder = require("../index.js");

bunder({
    basePath: "./wwwroot/",
    appSettingsJsonPath: "./appsettings.json",
    cleanOutput: false,
    newerOnly: true,
    logEnabled: true
});

/*
bunder({
    basePath: "./wwwroot/",
    bunderSettings: {
        "UseBundledOutput": true,
        "UseVersioning": true,
        "BundlesConfigFilePath": "bundles.json",
        "OutputDirectories": {
          "js": "/output/js",
          "css": "/output/css"
        }
      }
});
*/