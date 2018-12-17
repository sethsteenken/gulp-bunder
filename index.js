"use strict";

let gulp = require("gulp"),
    concat = require("gulp-concat"),
    cssmin = require("gulp-cssmin"),
    uglify = require("gulp-uglify"),
    newer = require("gulp-newer"),
    del = require('del'),
    PluginError = require('plugin-error');

let PLUGIN_NAME = 'gulp-bunder';

function ToBool(value) {
    if (value === undefined) {
        return false;
    } else if (typeof value === 'boolean') {
        return value;
    } else if (typeof value === 'number') {
        value = value.toString();
    } else if (typeof value !== 'string') {
        return false;
    }

    switch (value.toLowerCase()) {
        case "true":
        case "yes":
        case "1":
            return true;
        default:
            return false;
    }
}

function Bundle(config, bunderSettings, outputBasePath) {
    if (!config) {
        throw new PluginError(PLUGIN_NAME, "Bundle config paramater null.");
    }

    if (!config.Files || !config.Files.length) {
        throw new PluginError(PLUGIN_NAME, "Bundle must have at least one file under Files reference.");
    }

    let _ext;
    
    for (let i = 0; i < config.Files.length; i++) {
        _ext = /(?:\.([^.]+))?$/.exec(config.OutputFileName || config.Files[i])[1];
        if (_ext) {
            break;
        }
    }

    if (!_ext) {
        throw new PluginError(PLUGIN_NAME, "Extension not determined on bundle definition. Provide OutputFileName or at least one file in Files list with a valid file extension.");
    }

    console.log("config.OutputFileName", config.OutputFileName);
    console.log("config.Files[0]", config.Files[0]);
    console.log("_ext", _ext);

    this.Extension = _ext.toLowerCase();
    this.Name = config.Name;
    this.OutputFileName = config.OutputFileName || this.Name.replace(" ", "_") + ".min." + this.Extension;
    this.SubPath = config.SubPath || "";
    this.Files = config.Files;
    this.OutputDirectory = config.OutputDirectory || bunderSettings.OutputDirectories[this.Extension] || "";

    // build output path
    let _outputPath = (outputBasePath || "") + this.OutputDirectory + this.SubPath;
    if (_outputPath.slice(-1) != "/") {
        _outputPath += "/";
    }
    _outputPath += this.OutputFileName;

    this.OutputPath = _outputPath;

    this.Concat = function () {
        return concat(this.OutputPath);
    };

    this.Minify = function () {
        switch (this.Extension) {
            case "js":
                return uglify();
            case "css":
                return cssmin();
            default:
                throw new PluginError(PLUGIN_NAME, "No support for file extension '" + this.Extension + "' on Minify action.");
        }
    };

    // any custom properties found on in the json config for this bundle
    for (let prop in config) {
        if (!this[prop]) {
            this[prop] = config[prop];
        }
    }
}

// recursively build out list of files in a bundle
function BuildListOfFiles(bundle, bundlesList, sourceBasePath) {
    let bundleFiles = [];

    if (bundle && bundle.Files && bundle.Files.length) {
        for (let i = 0; i < bundle.Files.length; i++) {

            // if "file" is found as a bundle name, recursively get that bundle's files
            let existingBundle = bundlesList.filter(function (b) {
                return b.Name === bundle.Files[i];
            });

            if (existingBundle && existingBundle.length) {
                bundleFiles = bundleFiles.concat(BuildListOfFiles(existingBundle[0], bundlesList, sourceBasePath));
            } else {
                let file = bundle.Files[i];
                if (sourceBasePath && sourceBasePath.length)
                    file = sourceBasePath + file;
                bundleFiles.push(file);
            }
        }
    }

    return bundleFiles;
}

function BundleFiles(bundles, basePath, newerOnly) {
    if (bundles && bundles.length) {
        console.log("*** Starting bundling. Newer Only: " + newerOnly + " ***");

        let completedCount = 0,
            totalBundleCount = bundles.length;

        console.log("Bundle count: " + totalBundleCount);

        for (let i = 0; i < totalBundleCount; i++) {
            let bundle = bundles[i];
            
            console.log("bundle.Extension", bundle.Extension);

            if (ToBool(bundle.ReferenceOnly)) {
                console.log("Bundle for " + bundle.Name + " is set to only be referenced. No bundling for this bundle.");

                if (bundle.StaticOutputPath) {
                    (function (bundle) {
                        let gulpTask = gulp.src(basePath + bundle.StaticOutputPath, { base: "." })
                            .on("end", function () {
                                console.log("Bundle " + bundle.Name + " marked as have a *static output* of '" + bundle.StaticOutputPath + "'. It will have it's static output copied to destination.");
                            })
                            .pipe(bundle.Concat())
                            .pipe(gulp.dest("."))
                            .on("end", function () {
                                completedCount++;
                                console.log("Static Output '" + bundle.StaticOutputPath + "' copied to '" + bundle.OutputPath + "'.")
                            });
                    })(bundle);
                } else {
                    completedCount++;
                }

                continue;
            }

            let files = BuildListOfFiles(bundle, bundles, basePath),
                gulpTask = gulp.src(files, { base: "." });

            if (newerOnly) {
                gulpTask = gulpTask.pipe(newer(bundle.OutputPath));
            }

            (function (bundle, files) {
                gulpTask
                    .on("end", function () {
                        console.log("Bundling " + bundle.Name + " ... ");
                        for (let i = 0; i < files.length; i++) {
                            console.log(" - Includes file " + files[i] + ".");
                        }
                    })
                    .pipe(bundle.Concat())
                    .pipe(bundle.Minify())
                    .pipe(gulp.dest("."))
                    .on("end", function () {
                        completedCount++

                        if (completedCount == totalBundleCount) {
                            console.log("*** Bundling process complete. ***");
                        }
                    });
            })(bundle, files);
        }
    } else {
        console.log("No bundles found.");
    }
}

function CleanOutputDirectories() {
    if (bunderSettings && bunderSettings.OutputDirectories) {
        for (var ext in bunderSettings.OutputDirectories) {
            Clean(bunderSettings.OutputDirectories[ext]);
        }
    }
}

function Clean(dir) {
    gulp.src(dir, { read: false })
        .on("end", function () {
            console.log("* Cleaning destintation '" + dir + "'... *");
        })
        .pipe(del([ dir + "/**/*" ]))
        .on("end", function () {
            console.log("* Cleaning complete. *");
        });
}

module.exports = function(options) {
    if (!options) {
        throw new PluginError(PLUGIN_NAME, "Options object required.");
    }

    if (!options.bunderSettings && !options.appSettingsJsonPath) {
        throw new PluginError(PLUGIN_NAME, "Options values bunderSettings or appSettingsJsonPath required.");
    }

    if (!options.bunderSettings) {
        //"./appsettings.json"
        options.bunderSettings = require(options.appSettingsJsonPath).Bunder;
    }

    if (!options.basePath) {
        options.basePath = "./";
    }

    let bundleConfigs = require(options.bunderSettings.BundlesConfigFilePath),
        bundles = bundleConfigs.map(function (item) {
            return new Bundle(item, options.bunderSettings, options.basePath);
        });

    BundleFiles(bundles, options.basePath, ToBool(options.newerOnly));
}