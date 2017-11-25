var ComponentManager = require("../index.js").ComponentManager;
var assert = require("chai").assert;
var sinon = require("sinon");

describe("components", function() {
    it("can register", function() {
        var cm = new ComponentManager();
        var testComponent = {};
        cm.register("test-component", testComponent);
    });

    it("errors when registering component that doesn't inherit from Component class");

    it("errors when registering without module", function() {
        var cm = new ComponentManager();
        assert.throws(function() {
            cm.register("test-component");
        }, TypeError);
    });

    it("errors when registering without module name", function() {
        var cm = new ComponentManager();
        var testComponent = {};
        assert.throws(function() {
            cm.register(3, testComponent);
        }, TypeError);
    });

    it("can get components", function() {
        var cm = new ComponentManager();
        var testComponent = {};
        cm.register("test-component", testComponent);
        var component = cm.get("test-component");
        assert.isObject(component);
    });

    it("errors when component name not specified during get", function() {
        var cm = new ComponentManager();
        var testComponent = {};
        cm.register("test-component", testComponent);
        assert.throws(function() {
            cm.get();
        }, TypeError);
    });

    it("returns undefined when not found", function() {
        var cm = new ComponentManager();
        var component = cm.get("foo");
        assert.isUndefined(component);
    });

    it("can configure component", function() {
        var cm = new ComponentManager();
        var spy = sinon.spy();
        var testComponent = {
            config: spy
        };
        cm.register("test-component", testComponent);
        cm.configure("test-component", "feature", true);
        assert(spy.called);
        assert.strictEqual(spy.getCall(0).args[0], "feature");
        assert.strictEqual(spy.getCall(0).args[1], true);
    });

    it("config errors when missing feature", function() {
        var cm = new ComponentManager();
        var testComponent = {
            config: function() {}
        };
        cm.register("test-component", testComponent);
        assert.throws(function() {
            cm.configure("test-component");
        }, TypeError);
    });

    it("config errors when missing component name", function() {
        var cm = new ComponentManager();
        var testComponent = {
            config: function() {}
        };
        cm.register("test-component", testComponent);
        assert.throws(function() {
            cm.configure(3, "feature", true);
        }, TypeError);
    });

    it("config errors when configuring missing component", function() {
        var cm = new ComponentManager();
        assert.throws(function() {
            cm.configure("foo", "feature", true);
        }, TypeError);
    });

    // it("config errors module doesn't allow configuration", function() {
    //     var cm = new ComponentManager();
    //     var testComponent = {};
    //     cm.register("test-component", testComponent);
    //     assert.throws(function() {
    //         cm.configure("test-component", "feature", true);
    //     }, Error);
    // });
});

describe("lifecycle", function() {
    it("can init", function() {
        var cm = new ComponentManager();
        cm.init();
    });

    it("can shutdown", function() {
        var cm = new ComponentManager();
        cm.shutdown();
    });

    it("loads dependencies in the right order");
});