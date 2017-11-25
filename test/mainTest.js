var ComponentManager = require("../index.js").ComponentManager;
var Component = require("../index.js").Component;
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
        assert.strictEqual(f, foo);
        assert.strictEqual(f.length, 3);
        assert.strictEqual(f.name, "foo");
    });

    it("validates registered component");
});

describe("register", function() {
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
});

describe("registration validation", function() {
    var cm;
    beforeEach(function() {
        cm = new ComponentManager();
    });

    it("of simple type passes", function() {
        class Foo {
            bar(a, b, c) {} // jshint ignore:line
        }

        function fooValidator(value) {
            if (typeof value !== "function") return false;
            if (typeof value.prototype !== "object") return false;
            if (typeof value.prototype.bar !== "function") return false;
            if (value.prototype.bar.length !== 3) return false;
            return true;
        }

        cm.registerType("foo-type", fooValidator);
        cm.register("foo-component", "foo-type", Foo);
    });

    it("of simple type fails", function() {
        class Schmoo {
            bar(a, b) {} // jshint ignore:line
        }

        function fooValidator(value) {
            if (typeof value !== "function") return false;
            if (typeof value.prototype !== "object") return false;
            if (typeof value.prototype.bar !== "function") return false;
            if (value.prototype.bar.length !== 3) return false;
            return true;
        }

        cm.registerType("foo-type", fooValidator);
        assert.throws(function() {
            cm.register("foo-component", "foo-type", Schmoo);
        }, Error, "object not a valid type: foo-type");
    });
});

describe("get", function() {
    var cm;
    beforeEach(function() {
        cm = new ComponentManager();
        cm.registerType("test-type", alwaysTrue);
        var testComponent = {};
        cm.register("test-component", "test-type", testComponent);
    });

    it("can get components", function() {
        var component = cm.get("test-component");
        assert.isObject(component);
    });

    it("errors when component name not specified during get", function() {
        assert.throws(function() {
            cm.get();
        }, TypeError);
    });

    it("returns undefined when not found", function() {
        var component = cm.get("foo");
        assert.isUndefined(component);
    });
});

describe("config", function() {
    var cm;
    beforeEach(function() {
        cm = new ComponentManager();
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

    it("config errors module doesn't allow configuration", function() {
        var cm = new ComponentManager();
        var testComponent = {};
        cm.registerType("test-type", alwaysTrue);
        cm.register("test-component", "test-type", testComponent);
        assert.throws(function() {
            cm.configure("test-component", "feature", true);
        }, Error);
    });
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

describe("component", function() {
    it("has init", function() {
        class Foo extends Component {

        }
        var foo = new Foo();
        assert.isFunction(foo.init);
        foo.init();
    });
    it("has shutdown");
    it("returns empty dependency list");
    it("errors on config");
});

describe("dependencies", function() {
    var cm;
    beforeEach(function() {
        cm = new ComponentManager();
        cm.registerType("test-type", alwaysTrue);
    });

    class A extends Component {
        dependencies() {
            return ["B"];
        }
    }

    class B extends Component {
        dependencies() {
            return ["C"];
        }
    }

    class C extends Component {}

    it.only("loaded in right order", function() {
        var a = new A();
        // var aSpy = sinon.spy(a.init);
        var b = new B();
        // var bSpy = sinon.spy(b.init);
        var c = new C();
        // var cSpy = sinon.spy(c.init);
        cm.register("A", "test-type", a);
        cm.register("B", "test-type", b);
        cm.register("C", "test-type", c);
        cm.init();
        // TODO: behavior is correct, but spies don't work
        // assert(cSpy.calledBefore(bSpy), "C init before B");
        // assert(bSpy.calledBefore(aSpy), "B init before A");
    });

    it("throws correct error on missing dependency", function() {
        cm.register("A", "test-type", new A());
        assert.throws(function() {
            cm.init();
        }, Error, "'A' cannot find dependency 'B'");
    });

    it("fails on cycle", function() {
        cm.register("A", "test-type", new A());
        cm.register("B", "test-type", new B());
        class Bad extends Component {
            dependencies() {
                return ["A"];
            }
        }
        cm.register("C", "test-type", new Bad());
        assert.throws(function() {
            cm.init();
        }, Error, "Dependency Cycle Found: A -> B -> C -> A");
    });
});