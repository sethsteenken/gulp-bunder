var bunder = require("../index.js");

bunder({
    basePath: "./wwwroot/",
    appSettingsJsonPath: "./tests/appsettings.json"
});

/*
bunder({
    basePath: "./wwwroot/",
    bunderSettings: {
        "UseBundledOutput": true,
        "UseVersioning": true,
        "BundlesConfigFilePath": "./tests/bundles.json",
        "OutputDirectories": {
          "js": "/output/js",
          "css": "/output/css"
        }
      }
});
*/