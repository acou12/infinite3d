import { Vector2 } from "three";

/**
 * A class used for interfacing the the websocket server.
 */
export class ServerInterface {
  ws: WebSocket;

  constructor() {
    this.ws = new WebSocket("ws://localhost:4000");
    console.log(this.onmove);
    this.ws.onmessage = (event) => {
      this.handleMessage(event);
    };
  }

  onmove: (from: Vector2, to: Vector2) => void = () => {};

  handleMessage(event: MessageEvent<any>) {
    const json = JSON.parse(event.data);
    if (!json.type) throw new Error("The server sent an invalid json message.");
    switch (json.type) {
      case "MOVE": {
        const from = new Vector2(json.from.x, json.from.y);
        const to = new Vector2(json.to.x, json.to.y);
        this.onmove(from, to);
        break;
      }
    }
  }

  move(from: Vector2, to: Vector2) {
    const { x: fromX, y: fromY } = from;
    const { x: toX, y: toY } = to;
    this.ws.send(
      JSON.stringify({
        type: "MOVE",
        from: {
          x: fromX,
          y: fromY,
        },
        to: {
          x: toX,
          y: toY,
        },
      })
    );
  }
}
