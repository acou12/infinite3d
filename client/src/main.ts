import * as THREE from "three";
import * as CANNON from "cannon";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import "./style.css";
import boardVertexShader from "./shaders/board/vertex.glsl?raw";
import boardFragmentShader from "./shaders/board/fragment.glsl?raw";
import { AnimationDispatcher } from "./animation";
import { ServerInterface } from "./server";

const serverInterface = new ServerInterface();
serverInterface.onmove = (from, to) => {
  const matchingPieces = pieces.filter(
    (piece) => piece.position.x === from.x && piece.position.y === from.y
  );
  console.log(from, to);
  if (!(matchingPieces.length > 0)) throw new Error("uh oh, desync!!");
  const newTurn = turn === "WHITE" ? "BLACK" : "WHITE";
  turn = null;
  movePiece(matchingPieces[0], to, () => {
    turn = newTurn;
  });
};

const physicsWorld = new CANNON.World();

physicsWorld.gravity.set(0, -15, 0);

const boardPhysics = new CANNON.Body({
  mass: 3000,
  position: new CANNON.Vec3(3.5, 0.1, 3.5),
  shape: new CANNON.Box(new CANNON.Vec3(4, 0.05, 4)),
});

const tablePhysics = new CANNON.Body({
  mass: 5000,
  position: new CANNON.Vec3(3.5, -5, 3.5),
  shape: new CANNON.Box(new CANNON.Vec3(6, 9.7 / 2, 6)),
});

const floorPhysics = new CANNON.Body({
  mass: 0,
  position: new CANNON.Vec3(0, -10, 0),
  shape: new CANNON.Plane(),
});

floorPhysics.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

const bowlingBallMesh = new THREE.Mesh(
  new THREE.SphereGeometry(4, 32, 32),
  new THREE.MeshStandardMaterial({ color: "#222" })
);

const bowlingBallPhysics = new CANNON.Body({
  mass: 15000,
  position: new CANNON.Vec3(1000, 2, 0.5),
  shape: new CANNON.Sphere(bowlingBallMesh.geometry.parameters.radius),
});

physicsWorld.addBody(bowlingBallPhysics);

bowlingBallPhysics.velocity.x = -300;

// plane.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

physicsWorld.addBody(boardPhysics);
physicsWorld.addBody(tablePhysics);
physicsWorld.addBody(floorPhysics);

const modelLoader = new GLTFLoader();

type Color = "WHITE" | "BLACK";

interface PieceType {
  modelFileName: string;
  model?: THREE.Object3D;
}

const PAWN: PieceType = { modelFileName: "pawn.gltf" };
const BISHOP: PieceType = { modelFileName: "bishop.gltf" };
const KNIGHT: PieceType = { modelFileName: "knight.gltf" };
const ROOK: PieceType = { modelFileName: "rook.gltf" };
const KING: PieceType = { modelFileName: "king.gltf" };
const QUEEN: PieceType = { modelFileName: "queen.gltf" };

const pieceTypes = [PAWN, BISHOP, KNIGHT, ROOK, KING, QUEEN];

interface Piece {
  physicsBody: CANNON.Body;
  threeObject: THREE.Mesh<any, THREE.MeshStandardMaterial>;
  type: PieceType;
  color: Color;
  position: THREE.Vector2;
}

const pieces: Piece[] = [];

let numLoaded = 0;

pieceTypes.forEach((type) => {
  const { modelFileName } = type;
  modelLoader.load(`/models/${modelFileName}`, (gltf) => {
    const model = gltf.scene;
    type.model = model;
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshNormalMaterial();
      }
    });
    numLoaded++;
    if (numLoaded >= pieceTypes.length) {
      afterTexturesLoaded();
    }
  });
});

function addPiece(
  pieceType: PieceType,
  x: number,
  y: number,
  color: Color
): void {
  const { model } = pieceType;

  const box = new THREE.Box3().setFromObject(model!);
  const threeObject = model!.clone();

  threeObject.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.material = new THREE.MeshStandardMaterial(
        color === "WHITE" ? { color: "#fff" } : { color: "#222" }
      );
    }
  });

  threeObject.position.set(x, -box.min.y, y);
  scene.add(threeObject);

  const physicsBody = new CANNON.Body({
    mass: 5,
    position: new CANNON.Vec3(x, 3, y),
    shape: new CANNON.Box(
      new CANNON.Vec3(
        (box.max.x - box.min.x) / 2,
        (box.max.y - box.min.y) / 2,
        (box.max.z - box.min.z) / 2
      )
    ),
  });

  physicsWorld.addBody(physicsBody);

  pieces.push({
    physicsBody,
    threeObject: threeObject as THREE.Mesh<any, THREE.MeshStandardMaterial>,
    type: pieceType,
    color,
    position: new THREE.Vector2(x, y),
  });
}

function addPieces() {
  for (let i = 0; i < 8; i++) {
    addPiece(PAWN, i, 1, "WHITE");
    addPiece(PAWN, i, 6, "BLACK");
  }

  addPiece(ROOK, 0, 0, "WHITE");
  addPiece(ROOK, 7, 0, "WHITE");
  addPiece(KNIGHT, 1, 0, "WHITE");
  addPiece(KNIGHT, 6, 0, "WHITE");
  addPiece(BISHOP, 2, 0, "WHITE");
  addPiece(BISHOP, 5, 0, "WHITE");
  addPiece(QUEEN, 4, 0, "WHITE");
  addPiece(KING, 3, 0, "WHITE");
  addPiece(ROOK, 0, 7, "BLACK");
  addPiece(ROOK, 7, 7, "BLACK");
  addPiece(KNIGHT, 1, 7, "BLACK");
  addPiece(KNIGHT, 6, 7, "BLACK");
  addPiece(BISHOP, 2, 7, "BLACK");
  addPiece(BISHOP, 5, 7, "BLACK");
  addPiece(QUEEN, 4, 7, "BLACK");
  addPiece(KING, 3, 7, "BLACK");
  //   for (let x = -8; x < 8; x++)
  //     for (let y = -8; y < 8; y++) addPiece(PAWN, x, y, "WHITE");
}

const canvas = document.querySelector("canvas")!;

const scene = new THREE.Scene();

const upperArm = new THREE.Mesh(
  new THREE.CylinderGeometry(0.5, 0.5, 6, 10),
  new THREE.MeshStandardMaterial({ color: "purple" })
);
upperArm.rotateX(Math.PI / 2);
const upperArmPivot = new THREE.Group();
upperArmPivot.add(upperArm);
upperArm.position.z += 3;

const forearm = new THREE.Mesh(
  new THREE.CylinderGeometry(0.5, 0.5, 6, 10),
  new THREE.MeshStandardMaterial({ color: "purple" })
);
const forearmPivot = new THREE.Group();
forearmPivot.add(forearm);
forearm.rotateX(Math.PI / 2);
forearm.position.z += 3;
forearmPivot.position.z += 6;
forearmPivot.rotation.order = "YXZ";

const hand = new THREE.Mesh(
  new THREE.SphereGeometry(0.7, 10, 10),
  new THREE.MeshStandardMaterial({ color: "purple" })
);
forearmPivot.add(hand);
hand.position.z += 6;

const createFinger = (length: number, angle: number) => {
  const finger = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, length, 10),
    new THREE.MeshStandardMaterial({ color: "purple" })
  );
  finger.rotation.x = Math.PI / 2;
  finger.position.z += length / 2;
  const fingerWrapper = new THREE.Group();
  fingerWrapper.add(finger);
  fingerWrapper.rotation.y = angle;
  hand.add(fingerWrapper);
};

createFinger(2, 0.3);
createFinger(2, -0);
createFinger(2, -0.3);
createFinger(2, -0.6);
createFinger(1.5, 1);

const arm = new THREE.Group();
arm.rotation.order = "YXZ";
arm.add(upperArmPivot, forearmPivot);

scene.add(arm);

// scene.add(bowlingBallMesh);

// "Chess Board" (https://skfb.ly/6BDGq) by Anthony Yanez is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).

const mousePosition: THREE.Vector2 = new THREE.Vector2();

window.addEventListener("mousemove", (event: MouseEvent) => {
  mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
  mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
});
window.addEventListener("touchmove", (event: TouchEvent) => {
  mousePosition.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
  mousePosition.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
});

function handleClick(_event: MouseEvent | TouchEvent) {}

window.addEventListener("click", handleClick);
window.addEventListener("touchstart", handleClick);

// type PieceMesh = THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;

const boardGeometry = new THREE.PlaneGeometry(8, 8, 8, 8);

const boardTop = new THREE.Mesh(
  boardGeometry,
  new THREE.ShaderMaterial({
    vertexShader: boardVertexShader,
    fragmentShader: boardFragmentShader,
  })
);

const boardBottom = new THREE.Mesh(
  new THREE.BoxGeometry(8, 8, 0.2, 1, 1, 1),
  new THREE.MeshStandardMaterial({
    color: "#111",
  })
);

const board = new THREE.Group();

board.add(boardTop, boardBottom);

scene.add(board);

boardBottom.position.z -= 0.11;
boardBottom.position.x += 0.5;
boardBottom.position.y -= 0.5;

board.rotateX(-Math.PI / 2);
board.position.x += 3;
board.position.z += 3;

const table = new THREE.Mesh(
  new THREE.BoxGeometry(12, 9.7, 12),
  new THREE.MeshStandardMaterial({ color: "brown" })
);

scene.add(table);
scene.add(bowlingBallMesh);

scene.add(new THREE.AmbientLight("white", 0.5));
const pointLight = new THREE.PointLight("white", 0.5);

pointLight.position.set(3.5, 3, 3.5);
scene.add(pointLight);

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  1000
);
camera.position.set(10, 5, 10);
camera.lookAt(3.5, 0, 3.5);
scene.add(camera);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.target.set(3.5, 0, 3.5);
controls.autoRotate = false;
controls.autoRotateSpeed = 0.1;
let lastCameraPosition = new THREE.Vector3();
controls.addEventListener("change", () => {
  const cameraPosition = camera.position.clone();
  if (
    cameraPosition
      .clone()
      .sub(lastCameraPosition)
      .clone()
      .cross(lastCameraPosition.clone().sub(controls.target)).y > 0
  ) {
    controls.autoRotateSpeed = 0.1;
  } else {
    controls.autoRotateSpeed = -0.1;
  }
  lastCameraPosition = cameraPosition;
});

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.setClearColor("#ff8000");
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const clock = new THREE.Clock();

const animationDispatcher = new AnimationDispatcher();

function afterTexturesLoaded() {
  addPieces();
}

let turn: Color | null = "WHITE";

function movePiece(piece: Piece, to: THREE.Vector2, doneCallback?: () => void) {
  const pieceAt = pieces.filter((p) => p.position.equals(to))[0];
  if (pieceAt) {
    animationDispatcher.slide({
      position: pieceAt.threeObject.position,
      to: pieceAt.threeObject.position.clone().setY(20),
      duration: 1.5,
      type: "SLIDE",
      doneCallback: () => {
        scene.remove(pieceAt.threeObject);
        pieceAt.threeObject.material?.dispose();
        pieceAt.threeObject.geometry?.dispose();
      },
    });
  }
  piece.position = to;
  animationDispatcher.slide({
    position: piece.threeObject.position,
    to: new THREE.Vector3(to.x, 0, to.y).setY(piece.threeObject.position.y),
    duration: 1.5,
    type: piece.type === KNIGHT ? "JUMP" : "SLIDE",
    doneCallback,
  });
}

const stepSize = () => (keyPressed["shift"] ? 0.08 : 0.02);

const keyboardActions: Record<string, () => void> = {
  w: () => {
    arm.position.z += stepSize() * 3;
  },
  a: () => {
    arm.position.x += stepSize() * 3;
  },
  s: () => {
    arm.position.z -= stepSize() * 3;
  },
  d: () => {
    arm.position.x -= stepSize() * 3;
  },
  q: () => {
    arm.position.y -= stepSize() * 3;
  },
  e: () => {
    arm.position.y += stepSize() * 3;
  },
  t: () => {
    arm.rotation.x -= stepSize();
  },
  f: () => {
    arm.rotation.y += stepSize();
  },
  g: () => {
    arm.rotation.x += stepSize();
  },
  h: () => {
    arm.rotation.y -= stepSize();
  },
  i: () => {
    forearmPivot.rotation.x -= stepSize();
  },
  j: () => {
    forearmPivot.rotation.y += stepSize();
  },
  k: () => {
    forearmPivot.rotation.x += stepSize();
  },
  l: () => {
    forearmPivot.rotation.y -= stepSize();
  },
  "[": () => {},
  "]": () => {},
  ";": () => {},
  "'": () => {},
  ".": () => {},
  "/": () => {},
};

const keyPressed: Record<string, boolean> = {};

document.addEventListener("keydown", (event) => {
  keyPressed[event.key.toLowerCase()] = true;
});

document.addEventListener("keyup", (event) => {
  keyPressed[event.key.toLowerCase()] = false;
});

function tick() {
  const delta = clock.getDelta();

  controls.update();
  animationDispatcher.update(delta);

  // arm.rotation.x += 1 * 0.02;
  // arm.rotation.y += 2 * 0.02;
  // arm.rotation.z += 3 * 0.02;

  // forearmPivot.rotation.x += 1 * 0.02;
  // forearmPivot.rotation.y += 2 * 0.02;
  // forearmPivot.rotation.z += 3 * 0.02;

  // forearm.rotation.x += 1 * 0.02;
  // forearm.rotation.y += 2 * 0.02;
  // forearm.rotation.z += 3 * 0.02;

  pieces.forEach((piece) => {
    piece.threeObject.position.x = piece.physicsBody.position.x;
    piece.threeObject.position.y = piece.physicsBody.position.y;
    piece.threeObject.position.z = piece.physicsBody.position.z;

    piece.threeObject.quaternion.x = piece.physicsBody.quaternion.x;
    piece.threeObject.quaternion.y = piece.physicsBody.quaternion.y;
    piece.threeObject.quaternion.z = piece.physicsBody.quaternion.z;
    piece.threeObject.quaternion.w = piece.physicsBody.quaternion.w;
  });

  board.quaternion.x = boardPhysics.quaternion.x;
  board.quaternion.y = boardPhysics.quaternion.y;
  board.quaternion.z = boardPhysics.quaternion.z;
  board.quaternion.w = boardPhysics.quaternion.w;

  board.rotateX(-Math.PI / 2);

  board.position.x = boardPhysics.position.x - 0.5;
  board.position.y = boardPhysics.position.y;
  board.position.z = boardPhysics.position.z - 0.5;

  table.quaternion.x = tablePhysics.quaternion.x;
  table.quaternion.y = tablePhysics.quaternion.y;
  table.quaternion.z = tablePhysics.quaternion.z;
  table.quaternion.w = tablePhysics.quaternion.w;

  table.position.x = tablePhysics.position.x;
  table.position.y = tablePhysics.position.y;
  table.position.z = tablePhysics.position.z;

  bowlingBallMesh.position.x = bowlingBallPhysics.position.x;
  bowlingBallMesh.position.y = bowlingBallPhysics.position.y;
  bowlingBallMesh.position.z = bowlingBallPhysics.position.z;

  physicsWorld.step(1 / 60, 1 / 144, 1);

  Object.entries(keyboardActions).forEach(([key, action]) => {
    if (keyPressed[key]) action();
  });

  renderer.render(scene, camera);

  window.requestAnimationFrame(tick);
}

tick();
