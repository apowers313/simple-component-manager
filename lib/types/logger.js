"use strict";

module.exports = [{
    logger: function(obj) {
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
        if (features.filter((f) => f.name === "set-level").length !== 1) return false;
        return true;
    }
}];
