var npm = require("npm");
var path = require("path");
var fs = require("fs");
const ComponentManager = require("./component-manager");
var dataDir = fs.realpathSync(__dirname);
var componentDirectorSingleton;
var log;

module.exports = class ComponentDirector {
    constructor(opts) {
        if (componentDirectorSingleton) return componentDirectorSingleton;

        // I'm the singleton
        componentDirectorSingleton = this;

        // create a component manager
        this.cm = new ComponentManager();

        // load configuration
        opts = opts || {};
        this.origConfig = opts;
    }

    static start(opts) {
        console.log ("starting...");
        var cd = new ComponentDirector(opts);

        return cd.processConfig()
            .then(() => {
                // `npm install` all the packages specified by the components
                return cd.installComponents(cd.componentList);
            })
            .then(() => {
                // require each component and add each to the ComponentManager
                return cd.loadComponents(cd.componentList);
            })
            .then(() => {
                // initialize all the components that were loaded
                console.log ("doing init");
                return cd.cm.init();
            })
            .then(() => {
                console.log ("start done");

                var logger = cd.cm.get("logger");
                if (logger === undefined) {
                    throw new Error("logger component not found");
                }
                log = cd.log = logger.create("ComponentDirector");

                log.debug ("Started ComponentDirector.");

                return cd;
            })
            .catch((err) => {
                console.log("ERROR:", err);
                throw err;
            });
    }

    static stop() {
        if (this.cm) this.cm.shutdown();
        componentDirectorSingleton = null;
    }

    static readConfig(filename) {
        var fs = require("fs");
        var stripJsonComments = require("strip-json-comments");
        var json = fs.readFileSync(filename, "utf8");
        return JSON.parse(stripJsonComments(json));
    }

    loadConfig(conf) {
        var confList = [];
        confList.push(conf);

        // load any included files
        if (Array.isArray(conf.includeFiles)) {
            conf.includeFiles.forEach((file) => {
                console.log("Loading config from", file, "...");
                let c = null;
                try {
                    c = ComponentDirector.readConfig(file);
                } catch (e) {
                    console.log("WARNING: couldn't load config file:", file);
                }
                if (c) {
                    if (!c.configDir) c.configDir = path.dirname(path.resolve(file));
                    confList = confList.concat(this.loadConfig(c));
                }
            });
        }

        return confList;
    }

    processConfig() {
        return new Promise((resolve, reject) => {
            // create a list of all the configuration files
            var confList = this.loadConfig(this.origConfig);
            var componentList = [];

            // aggregate a complete list of components from the config files
            for (let config of confList) {
                // set main configDir & dataDir if they're not already set
                if (config.configDir && !this.cm.settings.configDir) this.cm.settings.configDir = config.configDir;
                if (config.dataDir) this.cm.settings.dataDir = config.dataDir;

                // save component list
                if (Array.isArray(config.components))
                    componentList = componentList.concat(config.components);
            }

            // if dataDir was never set, use the configDir
            if (!this.cm.settings.dataDir) this.cm.settings.dataDir = this.cm.settings.configDir;

            componentList.forEach((component) => this.cleanComponent(component));

            this.componentList = componentList;
            resolve(confList);
        });
    }

    installComponents(componentList) {
        console.log ("installing...");
        return new Promise((resolve, reject) => {
            var packageList = componentList.map((c) => {
                return c.package;
            });
            // console.log("packageList", packageList);
            if (packageList.length === 0) return resolve();

            // console.log("Installing packages:\n\t" + packageList.join("\n\t") + "\n");
            // const { exec } = require('child_process');
            // var cmd = "npm install --no-save --prefix " + dataDir + " " + packageList.join(" ");
            // exec (cmd, (err, stdout, stderr) => {
            //     if (err) reject (err);
            //     resolve();
            // });
            npm.load({prefix: dataDir}, function(err) {
                if (err) reject(err);
                console.log("Installing packages:\n\t" + packageList.join("\n\t") + "\n");
                npm.config.set("save", false);

                npm.commands.install(packageList, function(err, data) {
                    if (err) reject(err);
                    console.log ("data:", data);
                    resolve(data);
                });
            });
        });
    }

    loadComponents(componentList) {
        console.log ("loading...");
        return promiseSequence(componentList, (component) => {
            var newPath = path.resolve(dataDir, "node_modules", component.packageName);

            var obj = require(newPath);
            if (typeof obj === "function") {
                component.loadedClass = obj;
                component.loaded = new component.loadedClass(this.cm);
            } else {
                component.loaded = obj;
            }

            this.cm.register(component.name, component.type, component.loaded);
        });
    }

    cleanComponent(component) {
        if (typeof component.name !== "string") {
            throw new TypeError("component missing name:\n" + component);
        }

        if (typeof component.name !== "string") {
            throw new TypeError(`component "${component.name}" missing type:\n` + component);
        }

        if (typeof component.type !== "string") {
            throw new TypeError(`component "${component.name}" missing type:\n` + component);
        }

        if (component["pre-config"] && !Array.isArray(component["pre-config"])) {
            throw new TypeError(`component "${component.name}" has malformed "pre-config":\n` + component);
        }

        if (component["pre-config"]) component["pre-config"].forEach((config) => {
            if (typeof config !== "object") {
                throw new TypeError(`component "${component.name}" has malformed "pre-config" entry:\n` + config);
            }
        });

        if (component["post-config"] && !Array.isArray(component["pre-config"])) {
            throw new TypeError(`component "${component.name}" has malformed "pre-config":\n` + component);
        }

        if (component["post-config"]) component["post-config"].forEach((config) => {
            if (typeof config !== "object") {
                throw new TypeError(`component "${component.name}" has malformed "pre-config" entry:\n` + config);
            }
        });

        component.packageName = component.packageName || this.componentResolvePackageName(component);
    }

    componentResolvePackageName(component) {
        var packageName = component.package;
        // console.log ("package name before:", packageName);

        // TODO: should probably unpack the .tgz and parse the package.json rather than assuming that the package is named right
        // if package is .tgz url
        if (packageName.match(/https?:\/\/.*\.tgz$/))
            packageName = path.basename(packageName.split("://")[1], ".tgz");
        // if package is .tgz
        else if (packageName.match(/\.tgz$/))
            packageName = path.basename(packageName, ".tgz");
        // if package is folder
        else try {
            if (packageName === "") packageName = "."; // if package is empty string use local dir
            var basepath = component.configDir || process.cwd(); // TODO XXX: should be the path where the config file was loaded from
            var packageJson = path.resolve(basepath, packageName, "package.json");
            packageName = require(packageJson).name;
        } catch (e) {
            // console.log (e);
        }

        // console.log ("package name after:", packageName);
        return packageName;
    }
}

function promiseSequence(list, fn) {
    var pacc = Promise.resolve();
    for (let item of list) {
        pacc = pacc.then(() => {
            return fn(item);
        });
    }
    return pacc;
}