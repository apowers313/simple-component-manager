class Component {
    constructor() {}
    features() {}
    dependencies() {}
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

    register(name, type, object) {
        if (typeof name !== "string") {
            throw new TypeError("expected 'name' to be string; got " + typeof name);
        }

        if (typeof type !== "string") {
            throw new TypeError("expected 'type' to be string; got " + typeof type);
        }

        if (typeof object !== "object") {
            throw new TypeError("expected 'object' to be object; got " + typeof object);
        }

        var validator = this.getType(type);
        if (validator === undefined) {
            throw new Error ("type not found: " + type);
        }

        if(!validator(object)) {
            throw new Error ("object not a valid type; " + type);
        }

        this.componentList.set(name, object);
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
            throw new TypeError(name + " is not a valid comm name");
        }

        if (typeof component.config !== "function") {
            throw new Error("configuration of '" + name + "' not allowed");
        }

        component.config(feature, value);
    }

    init() {
        // console.log("init");
    }

    shutdown() {
        // console.log("shutdown");
    }
}

module.exports = {
    ComponentManager: ComponentManager,
    Component: Component
};