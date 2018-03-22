"use strict";

const Component = require("component-class");

module.exports = class DefaultLogger extends Component {
    constructor(cm, name) {
        super(cm);
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

    print(levelStr, ...msg) {
        var level = this.debugLevels.indexOf(levelStr);
        if (this.debugLevel < level) return;
        console.log(this.name + ":", ...msg);
    }

    error(...msg) {
        this.print("error", "!!! ERROR:", ...msg);
    }

    warn(...msg) {
        this.print("warn", "! WARNING:", ...msg);
    }

    info(...msg) {
        this.print("info", ...msg);
    }

    verbose(...msg) {
        this.print("verbose", ...msg);
    }

    debug(...msg) {
        this.print("debug", ...msg);
    }

    silly(...msg) {
        this.print("silly", ...msg);
    }

    create(name) {
        return new DefaultLogger(this.cm, name);
    }
}