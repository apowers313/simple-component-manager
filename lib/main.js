var DepGraph = require('dependency-graph').DepGraph;

class Component {
    features() {}
    dependencies() {
        return [];
    }
    config() {}
    init() {}
    shutdown() {}
}

class ComponentManager {
    constructor() {
        this.componentList = new Map();
        this.typeList = new Map();
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

        return this.componentList.get(name);
    }

    configure(name, feature, value) {
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

        component.config(feature, value);
    }

    init() {
        var dg = new DepGraph();

        // add dependency nodes
        this.componentList.forEach(function(component, name) {
            // console.log ("adding node:", name);
            dg.addNode(name);
        });

        // add dependencies
        this.componentList.forEach(function(component, name) {
            var deps = component.dependencies();
            for (let dep of deps) {
                // console.log ("adding dependency:", name, "->", dep);
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
                console.log ("initializing component:", componentName, "...");
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
    Component: Component
};