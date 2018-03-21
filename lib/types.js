"use strict";

module.exports = function(cm) {
    loadTypes("./types/logger.js");
    loadTypes("./types/generic.js");

    function loadTypes(typeFile) {
        var typeList = require(typeFile); // eslint-disable-line global-require
        for (let typeObj of typeList) {
            for (let key of Object.keys(typeObj)) {
                cm.registerType(key, typeObj[key]);
            }
        }
    }
};