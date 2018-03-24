#!/usr/bin/env node

"use strict";

var path = require("path");

var {
    ComponentDirector
} = require("../index");

var cd = new ComponentDirector();

var globalConfig = "/etc/scm/config.json";
var userConfig = path.join(process.env.HOME, ".scm/config.json"); // eslint-disable-line no-process-env
var localConfig = path.join(path.resolve("."), "scm-config.json");

console.log("Loading", globalConfig, "...");
cd.loadConfig(globalConfig);
console.log("Loading", userConfig, "...");
cd.loadConfig(userConfig);
console.log("Loading", localConfig, "...");
cd.loadConfig(localConfig);
cd.start()
    .then(() => {
        console.log("Running...");
    });
