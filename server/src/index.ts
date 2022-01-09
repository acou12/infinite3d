import * as express from "express";
import { WebSocket } from "ws";
import * as ws from "express-ws";

const app = ws(express()).app;

app.use(express.json());

let connections: WebSocket[] = [];

app.ws("/", (ws, _req, _res) => {
  connections.push(ws);
  ws.on("message", (data) => {
    console.log(data);
    connections.forEach((c) => {
      if (c !== ws) {
        c.send(data);
      }
    });
  });
});

app.listen("4000", () => {
  console.log("Server running! :)");
});
