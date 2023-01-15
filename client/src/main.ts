import * as THREE from "three";
import * as CANNON from "cannon";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import "./style.css";
import boardVertexShader from "./shaders/board/vertex.glsl?raw";
import boardFragmentShader from "./shaders/board/fragment.glsl?raw";
import { AnimationDispatcher } from "./animation";
import { ServerInterface } from "./server";
import { MeshStandardMaterial, Vector3 } from "three";

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

const floorPhysics = new CANNON.Body({
  mass: 0,
  position: new CANNON.Vec3(0, 0, 0),
  shape: new CANNON.Plane(),
});

floorPhysics.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

// const bowlingBallMesh = new THREE.Mesh(
//   new THREE.SphereGeometry(4, 32, 32),
//   new THREE.MeshStandardMaterial({ color: "#222" })
// );

// const bowlingBallPhysics = new CANNON.Body({
//   mass: 15000,
//   position: new CANNON.Vec3(1000, 2, 0.5),
//   shape: new CANNON.Sphere(bowlingBallMesh.geometry.parameters.radius),
// });

// plane.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

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
}

const canvas = document.querySelector("canvas")!;

const scene = new THREE.Scene();

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

function handleClick(_event: MouseEvent | TouchEvent) {
  if (hoveredCard !== undefined) selectedCard = hoveredCard;
  else if (selectedCard !== undefined && hoveredPoint !== undefined) {
    hand.remove(selectedCard);
    cards.splice(cards.indexOf(selectedCard), 1);
    selectedCard = undefined;
    pieces.forEach((piece) => {
      const delta = piece.threeObject.position.clone().sub(hoveredPoint!);
      const launch = 30 / Math.pow(delta.length(), 2);
      delta.normalize();
      delta.multiplyScalar(launch);
      piece.physicsBody.velocity.set(delta.x, delta.y, delta.z);
    });
  }
}

window.addEventListener("click", handleClick);
window.addEventListener("touchstart", handleClick);

// type PieceMesh = THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;

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
board.position.x += 3;
board.position.z += 3;

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

const keyPressed: Record<string, boolean> = {};

const cards: THREE.Mesh[] = [];

const hand = new THREE.Group();

const textureLoader = new THREE.TextureLoader();

textureLoader.loadAsync("/grenade.jpg").then((texture) => {
  const createCard = () => {
    const card = new THREE.Mesh(
      new THREE.BoxGeometry(1, 2, 0.1),
      new THREE.MeshStandardMaterial({
        map: texture,
      })
    );
    // card.position.set(0, 0, 0);
    hand.add(card);
    cards.push(card);
    return card;
  };

  for (let i = 0; i < 10; i++) createCard();

  let i = -cards.length / 2 + 0.5;
  for (const card of cards) {
    // card.rotateY(-(i * Math.PI) / 6);
    // card.rotateX((-i * Math.PI) / 7);
    card.position.x = i * 1.1;
    card.position.y -= 2.5;
    // card.position.z += (i * i) / 10;
    // card.lookAt(camera.position);
    i++;
  }
});

scene.add(hand);

document.addEventListener("keydown", (event) => {
  keyPressed[event.key.toLowerCase()] = true;
});

document.addEventListener("keyup", (event) => {
  keyPressed[event.key.toLowerCase()] = false;
});

const raycaster = new THREE.Raycaster();

let selectedCard: THREE.Mesh | undefined;
let hoveredCard: THREE.Mesh | undefined;

let hoveredPoint: THREE.Vector3 | undefined;

function tick() {
  const delta = clock.getDelta();

  controls.update();
  animationDispatcher.update(delta);

  raycaster.setFromCamera(mousePosition, camera);

  cards.forEach(
    (card) =>
      ((card.material as MeshStandardMaterial).color =
        card === selectedCard
          ? new THREE.Color("blue")
          : new THREE.Color("white"))
  );

  hoveredCard = undefined;

  const cardIntersections = raycaster.intersectObjects(cards);
  cardIntersections.forEach((intersection) => {
    (
      (intersection.object as THREE.Mesh).material as MeshStandardMaterial
    ).color = new THREE.Color("red");
    hoveredCard = intersection.object as THREE.Mesh;
  });

  hoveredPoint = undefined;

  const boardIntersections = raycaster.intersectObject(board);
  boardIntersections.forEach((intersection) => {
    hoveredPoint = intersection.point;
  });

  const v = new Vector3(0, 0, -5);
  v.applyQuaternion(camera.quaternion);
  hand.setRotationFromQuaternion(camera.quaternion);
  const newPos = camera.position.clone().add(v);
  hand.position.set(newPos.x, newPos.y, newPos.z);

  pieces.forEach((piece) => {
    piece.threeObject.position.x = piece.physicsBody.position.x;
    piece.threeObject.position.y = piece.physicsBody.position.y;
    piece.threeObject.position.z = piece.physicsBody.position.z;

    piece.threeObject.quaternion.x = piece.physicsBody.quaternion.x;
    piece.threeObject.quaternion.y = piece.physicsBody.quaternion.y;
    piece.threeObject.quaternion.z = piece.physicsBody.quaternion.z;
    piece.threeObject.quaternion.w = piece.physicsBody.quaternion.w;
  });

  physicsWorld.step(1 / 60, delta, 1);

  renderer.render(scene, camera);

  window.requestAnimationFrame(tick);
}

tick();
