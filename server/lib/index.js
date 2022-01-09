"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var ws = require("express-ws");
var app = ws(express()).app;
app.use(express.json());
var connections = [];
app.ws("/", function (ws, _req, _res) {
    connections.push(ws);
    ws.on("message", function (data) {
        console.log(data);
        connections.forEach(function (c) {
            if (c !== ws) {
                c.send(data);
            }
        });
    });
});
app.listen("4000", function () {
    console.log("Server running! :)");
});
