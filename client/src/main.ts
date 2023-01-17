import * as THREE from "three";
import "./style.css";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";

import boardVertexShader from "./shaders/board/vertex.glsl?raw";
import boardFragmentShader from "./shaders/board/fragment.glsl?raw";

const canvas = document.querySelector("canvas")!;

const scene = new THREE.Scene();

const previousMousePosition: THREE.Vector2 = new THREE.Vector2();
const mousePosition: THREE.Vector2 = new THREE.Vector2();

const boardGeometry = new THREE.PlaneGeometry(5000, 5000, 10, 10);

const boardTop = new THREE.Mesh(
  boardGeometry,
  new THREE.ShaderMaterial({
    vertexShader: boardVertexShader,
    fragmentShader: boardFragmentShader,
  })
);

const board = new THREE.Group();

board.add(boardTop);

scene.add(board);

board.rotateX(-Math.PI / 2);

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

const DEFAULT_SCALE = 30;

const camera = new THREE.OrthographicCamera(
  -sizes.width / 2 / DEFAULT_SCALE,
  sizes.width / 2 / DEFAULT_SCALE,
  sizes.height / 2 / DEFAULT_SCALE,
  -sizes.height / 2 / DEFAULT_SCALE,
  1,
  1000
);
camera.position.set(0, 10, 0);
camera.lookAt(0, 0, 0);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.setClearColor("#ff8000");
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const composer = new EffectComposer(renderer);

[new RenderPass(scene, camera)].map((pass) => composer.addPass(pass));

const raycaster = new THREE.Raycaster();

function tick() {
  raycaster.setFromCamera(mousePosition, camera);

  composer.render();

  window.requestAnimationFrame(tick);
}

let pressing: boolean = false;

window.addEventListener("mousedown", (_event: MouseEvent) => {
  pressing = true;
});

window.addEventListener("mouseup", (_event: MouseEvent) => {
  pressing = false;
});

window.addEventListener("mousemove", (event: MouseEvent) => {
  previousMousePosition.setX(mousePosition.x);
  previousMousePosition.setY(mousePosition.y);
  mousePosition.setX(event.clientX);
  mousePosition.setY(event.clientY);

  if (pressing) {
    camera.position.add(
      new THREE.Vector3(
        -(mousePosition.x - previousMousePosition.x) /
          DEFAULT_SCALE /
          camera.zoom,
        0,
        -(mousePosition.y - previousMousePosition.y) /
          DEFAULT_SCALE /
          camera.zoom
      )
    );
  }
});

window.addEventListener("wheel", (event: WheelEvent) => {
  if (event.deltaY < 0) {
    camera.zoom *= 1.1;
  } else {
    camera.zoom /= 1.1;
  }
  camera.updateProjectionMatrix();
});

type Color = "white" | "black";

type PieceTemplate = {
  name: string;
  whiteMesh?: THREE.Group;
  blackMesh?: THREE.Group;
};

let pieceTemplates: PieceTemplate[] = [
  {
    name: "king",
  },
  {
    name: "knight",
  },
  {
    name: "pawn",
  },
  {
    name: "queen",
  },
  {
    name: "rook",
  },
  {
    name: "bishop",
  },
];

const getPieceTemplate = (s: string) => {
  return pieceTemplates.find((template) => template.name === s)!;
};

let pieces: THREE.Group[];

const svgLoader = new SVGLoader();

const setupPieces = () => {
  type PiecePosition = {
    name: string;
    position: { x: number; y: number };
    color: Color;
  };

  const piecePositions: PiecePosition[] = [
    { name: "rook", position: { x: 0, y: 0 }, color: "white" },
    { name: "knight", position: { x: 1, y: 0 }, color: "white" },
    { name: "bishop", position: { x: 2, y: 0 }, color: "white" },
    { name: "king", position: { x: 3, y: 0 }, color: "white" },
    { name: "queen", position: { x: 4, y: 0 }, color: "white" },
    { name: "bishop", position: { x: 5, y: 0 }, color: "white" },
    { name: "knight", position: { x: 6, y: 0 }, color: "white" },
    { name: "rook", position: { x: 7, y: 0 }, color: "white" },

    ...[...Array(8).keys()].map(
      (i) =>
        ({
          name: "pawn",
          position: { x: i, y: 1 },
          color: "white",
        } as PiecePosition)
    ),

    { name: "rook", position: { x: 0, y: 7 }, color: "black" },
    { name: "knight", position: { x: 1, y: 7 }, color: "black" },
    { name: "bishop", position: { x: 2, y: 7 }, color: "black" },
    { name: "king", position: { x: 3, y: 7 }, color: "black" },
    { name: "queen", position: { x: 4, y: 7 }, color: "black" },
    { name: "bishop", position: { x: 5, y: 7 }, color: "black" },
    { name: "knight", position: { x: 6, y: 7 }, color: "black" },
    { name: "rook", position: { x: 7, y: 7 }, color: "black" },

    ...[...Array(8).keys()].map(
      (i) =>
        ({
          name: "pawn",
          position: { x: i, y: 6 },
          color: "black",
        } as PiecePosition)
    ),
  ];

  piecePositions.forEach(({ name, position: { x, y }, color }) => {
    const piece = getPieceTemplate(name)[`${color}Mesh`]!.clone();
    piece.position.set(x, 1, y);
    scene.add(piece);
  });
};

Promise.all(
  pieceTemplates.flatMap((pieceTemplate) =>
    (["white", "black"] as Color[]).map(
      (color) =>
        new Promise((resolve) => {
          svgLoader.load(
            `/images/${color}-${pieceTemplate.name}.svg`,
            (data) => {
              const piece = new THREE.Group();

              data.paths.forEach((path) => {
                SVGLoader.createShapes(path).forEach((shape) => {
                  const mesh = new THREE.Mesh(
                    new THREE.ShapeGeometry(shape),
                    new THREE.MeshBasicMaterial({
                      color: path.userData!.style.fill,
                      side: THREE.DoubleSide,
                      depthWrite: false,
                    })
                  );
                  piece.add(mesh);
                });
              });

              piece.rotateX(Math.PI / 2);
              piece.scale.multiplyScalar(1 / 45);

              piece.position.y = 1;

              pieceTemplate[`${color}Mesh`] = piece;

              resolve(undefined);
            }
          );
        })
    )
  )
).then(() => {
  setupPieces();
});

tick();
