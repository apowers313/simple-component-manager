var DepGraph = require('dependency-graph').DepGraph;

class Component {
    constructor() {
        this.configTable = Object.create(null);
    }

    dependencies() {
        return [];
    }

    features() {
        var featureList = [];
        for (let feature in this.configTable) {
            featureList.push(feature);
        }
        return featureList;
    }

    config(feature, value) {
        var featureFn = this.configTable[feature];
        if (typeof featureFn === "undefined") {
            throw new TypeError(`${feature} not found during config`);
        }
        if (typeof featureFn !== "function") {
            throw new TypeError(`configTable misconfigured for ${feature}: expected a function, got ${typeof featureFn}`);
        }
        return featureFn.call(this, value);
    }

    init() {}

    shutdown() {}
}

class DefaultLogger extends Component {
    constructor(name) {
        super();
        this.debugLevels = [
            "silent",
            "error",
            "warn",
            "info",
            "verbose",
            "debug",
            "silly"
        ];

        this.name = name || "unknown";

        this.configTable["set-level"] = this.setLevel;
        this.configTable["get-level"] = this.getLevel;

        this.config("set-level", "debug");
        // this.debugLevel = 5; // debug
    }

    setLevel(level) {
        if (typeof level === "number" &&
            level < this.debugLevels.length &&
            level >= 0) {
            // console.log ("setting level to:", level);
            this.debugLevel = level;
            return;
        }
        let levelStr = level;
        level = this.debugLevels.indexOf(level);
        if (typeof levelStr === "string" &&
            level < this.debugLevels.length &&
            level >= 0) {
            // console.log ("setting level to:", level);
            this.debugLevel = level;
            return;
        }
        throw new TypeError("unknown level while configuring levels: " + level);
    }

    getLevel() {
        return this.debugLevels[this.debugLevel];
    }

    print(levelStr, ... msg) {
        var level = this.debugLevels.indexOf(levelStr);
        // console.log ("levelStr", levelStr);
        // console.log ("level", level);
        // console.log ("this.debugLevel", this.debugLevel);
        // console.log ("this.debugLevel < level", this.debugLevel < level);
        if (this.debugLevel < level) return;
        console.log(... msg);
    }

    error(... msg) {
        this.print("error", this.name + ":", "!!! ERROR:", ... msg);
    }

    warn(... msg) {
        this.print("warn", this.name + ":", "! WARNING:", ... msg);
    }

    info(... msg) {
        this.print("info", this.name + ":", ... msg);
    }

    verbose(... msg) {
        this.print("verbose", this.name + ":", ... msg);
    }

    debug(... msg) {
        this.print("debug", this.name + ":", ... msg);
    }

    silly(... msg) {
        this.print("silly", this.name + ":", ... msg);
    }

    create(name) {
        return new DefaultLogger(name);
    }
}

function loggerValidator(obj) {
    if (typeof obj.silly !== "function") return false;
    if (typeof obj.debug !== "function") return false;
    if (typeof obj.verbose !== "function") return false;
    if (typeof obj.info !== "function") return false;
    if (typeof obj.warn !== "function") return false;
    if (typeof obj.error !== "function") return false;
    if (typeof obj.create !== "function") return false;
    if (typeof obj.features !== "function") return false;
    if (!Array.isArray(obj.debugLevels)) return false;
    var features = obj.features();
    if (features.indexOf("set-level") < 0) return false;
    return true;
}

var componentList = new Map();
var typeList = new Map();
class ComponentManager {
    constructor() {
        this.componentList = componentList;
        this.typeList = typeList;
        this.logger = null;
    }

    registerType(typeName, validationFn) {
        if (typeof typeName !== "string") {
            throw new TypeError("expected 'typeName' to be string; got " + typeof typeName);
        }

        if (typeof validationFn !== "function") {
            throw new TypeError("expected 'validationFn' to be function; got " + typeof validationFn);
        }

        this.typeList.set(typeName, validationFn);
    }

    getType(typeName) {
        if (typeof typeName !== "string") {
            throw new TypeError("expected 'typeName' to be string; got " + typeof typeName);
        }

        return this.typeList.get(typeName);
    }

    register(name, type, objectOrFn) {
        if (typeof name !== "string") {
            throw new TypeError("expected 'name' to be string; got " + typeof name);
        }

        if (typeof type !== "string") {
            throw new TypeError("expected 'type' to be string; got " + typeof type);
        }

        if (typeof objectOrFn !== "object" &&
            typeof objectOrFn !== "function") {
            throw new TypeError("expected 'objectOrFn' to be object or function; got " + typeof objectOrFn);
        }

        var validator = this.getType(type);
        if (validator === undefined) {
            throw new Error("type not found: " + type);
        }

        if (!validator(objectOrFn)) {
            throw new Error("object not a valid type: " + type);
        }

        this.componentList.set(name, objectOrFn);
    }

    get(name) {
        if (typeof name !== "string") {
            throw new TypeError("expected 'name' to be string; got " + typeof name);
        }
        console.log ("doing get for:", name);

        return this.componentList.get(name);
    }

    config(name, feature, value) {
        if (typeof name !== "string") {
            throw new TypeError("expected 'name' to be string; got " + typeof name);
        }

        if (typeof feature !== "string") {
            throw new TypeError("expected 'feature' to be string; got " + typeof feature);
        }

        var component = this.get(name);
        if (component === undefined) {
            throw new TypeError(name + " is not a valid component name");
        }

        if (typeof component.config !== "function") {
            throw new Error("configuration of '" + name + "' not allowed");
        }

        if (typeof component.features === "function") {
            let featureList = component.features();
            if (featureList.indexOf(feature) < 0) {
                throw new TypeError ("feature not found for component: " + feature);
            }
        }

        return component.config(feature, value);
    }

    init() {
        var dg = new DepGraph();

        // make sure we have a logger
        if (!this.get("logger")) {
            this.registerType("logger", loggerValidator);
            this.register("logger", "logger", new DefaultLogger());
        }
        this.log = this.get("logger").create("ComponentManager");

        // add dependency nodes
        this.componentList.forEach((component, name) => {
            this.log.silly ("adding node:", name);
            dg.addNode(name);
        });

        // add dependencies
        this.componentList.forEach((component, name) => {
            var deps;
            if (typeof component.dependencies === "function")
                deps = component.dependencies();
            for (let dep of deps) {
                this.log.silly ("adding dependency:", name, "->", dep);
                try {
                    dg.addDependency(name, dep);
                } catch (err) {
                    // err.message = "foo";
                    var match = err.message.match(/Node does not exist: (.*)$/);
                    if (!match) throw err;
                    throw new Error(`'${name}' cannot find dependency '${dep}'`);
                }
            }
        });

        // build the ordered list of dependency loads
        var loadOrder = dg.overallOrder();

        // initialize components in the right order
        for (let i = 0; i < loadOrder.length; i++) {
            let componentName = loadOrder[i];
            let component = this.get(componentName);
            if (typeof component.init === "function") {
                this.log.debug ("initializing component:", componentName, "...");
                component.init();
            }
        }
    }

    shutdown() {
        // console.log("shutdown");
    }
}

module.exports = {
    ComponentManager: ComponentManager,
    Component: Component,
    DefaultLogger: DefaultLogger
};