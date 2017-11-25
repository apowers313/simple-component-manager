var ComponentManager = require("../index.js").ComponentManager;
var assert = require("chai").assert;
var sinon = require("sinon");

function alwaysTrue() {
    return true;
}

describe("types", function() {
    var cm;
    beforeEach(function() {
        cm = new ComponentManager();
    });

    it("can be registered", function() {
        cm.registerType("test-type", function() {});
    });

    it("can be found", function() {
        function foo(a, b, c) {}; // jshint ignore:line
        cm.registerType("test-type", foo);
        var f = cm.getType("test-type");
        assert.strictEqual (f, foo);
        assert.strictEqual (f.length, 3);
        assert.strictEqual (f.name, "foo");
    });

    it("validates registered component");
});

describe("components", function() {
    var cm;
    beforeEach(function() {
        cm = new ComponentManager();
    });

    it("can register", function() {
        var testComponent = {};
        cm.registerType("test-type", alwaysTrue);
        cm.register("test-component", "test-type", testComponent);
    });

    it("errors when registering component that doesn't inherit from Component class");

    it("errors when registering with bad type", function() {
        assert.throws(function() {
            cm.register("test-component", 3, {});
        }, TypeError);
    });

    it("errors when registering without module", function() {
        assert.throws(function() {
            cm.register("test-component");
        }, TypeError);
    });

    it("errors when registering without module name", function() {
        var testComponent = {};
        assert.throws(function() {
            cm.register(3, testComponent);
        }, TypeError);
    });

    it("can get components", function() {
        var testComponent = {};
        cm.registerType("test-type", alwaysTrue);
        cm.register("test-component", "test-type", testComponent);
        var component = cm.get("test-component");
        assert.isObject(component);
    });

    it("errors when component name not specified during get", function() {
        var testComponent = {};
        cm.registerType("test-type", alwaysTrue);
        cm.register("test-component", "test-type", testComponent);
        assert.throws(function() {
            cm.get();
        }, TypeError);
    });

    it("returns undefined when not found", function() {
        var component = cm.get("foo");
        assert.isUndefined(component);
    });

    it("can configure component", function() {
        var spy = sinon.spy();
        var testComponent = {
            config: spy
        };
        cm.registerType("test-type", alwaysTrue);
        cm.register("test-component", "test-type", testComponent);
        cm.configure("test-component", "feature", true);
        assert(spy.called);
        assert.strictEqual(spy.getCall(0).args[0], "feature");
        assert.strictEqual(spy.getCall(0).args[1], true);
    });

    it("config errors when missing feature", function() {
        var testComponent = {
            config: function() {}
        };
        cm.registerType("test-type", alwaysTrue);
        cm.register("test-component", "test-type", testComponent);
        assert.throws(function() {
            cm.configure("test-component");
        }, TypeError);
    });

    it("config errors when missing component name", function() {
        var testComponent = {
            config: function() {}
        };
        cm.registerType("test-type", alwaysTrue);
        cm.register("test-component", "test-type", testComponent);
        assert.throws(function() {
            cm.configure(3, "feature", true);
        }, TypeError);
    });

    it("config errors when configuring missing component", function() {
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
    var cm;
    beforeEach(function() {
        cm = new ComponentManager();
    });

    it("can init", function() {
        cm.init();
    });

    it("can shutdown", function() {
        cm.shutdown();
    });

    it("loads dependencies in the right order");
});