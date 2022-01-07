import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "lil-gui";
import { CylinderGeometry, MeshStandardMaterial } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as CANNON from "cannon";
import boardVertexShader from "./shaders/board/vertex.glsl?raw";
import boardFragmentShader from "./shaders/board/fragment.glsl?raw";

const physicsWorld = new CANNON.World();

physicsWorld.gravity.set(0, -15, 0);

const plane = new CANNON.Body({
  mass: 0,
  position: new CANNON.Vec3(0, 0, 0),
  shape: new CANNON.Plane(),
});

const bowlingBallMesh = new THREE.Mesh(
  new THREE.SphereGeometry(1, 32, 32),
  new THREE.MeshStandardMaterial({ color: "#222" })
);

const bowlingBallPhysics = new CANNON.Body({
  mass: 1500,
  position: new CANNON.Vec3(100, 2, 0.5),
  shape: new CANNON.Sphere(1),
});

bowlingBallPhysics.velocity.set(-100, 0, 0);

// bowlingBallPhysics.velocity.set(-30, 0, 0);

physicsWorld.addBody(bowlingBallPhysics);

plane.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

physicsWorld.addBody(plane);

const modelLoader = new GLTFLoader();

type Color = "WHITE" | "BLACK";

interface PieceType {
  modelFileName: string;
  model?: THREE.Object3D;
}

const PAWN: PieceType = {
  modelFileName: "pawn.gltf",
};

const BISHOP: PieceType = {
  modelFileName: "bishop.gltf",
};

const KNIGHT: PieceType = {
  modelFileName: "knight.gltf",
};

const ROOK: PieceType = {
  modelFileName: "rook.gltf",
};

const KING: PieceType = {
  modelFileName: "king.gltf",
};

const QUEEN: PieceType = {
  modelFileName: "queen.gltf",
};

const pieceTypes = [PAWN, BISHOP, KNIGHT, ROOK, KING, QUEEN];

interface Piece {
  physicsBody: CANNON.Body;
  threeObject: THREE.Mesh<any, MeshStandardMaterial>;
  type: PieceType;
  color: Color;
  position: THREE.Vector2;
}

const pieces: Piece[] = [];
// let selectedPiece: Piece | null = null;

let numLoaded = 0;

pieceTypes.forEach((type) => {
  const { modelFileName } = type;
  modelLoader.load(`/${modelFileName}`, (gltf) => {
    const model = gltf.scene;
    type.model = model;
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshNormalMaterial();
      }
    });
    numLoaded++;
    if (numLoaded >= pieceTypes.length) {
      addPieces();
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
    console.log(child);
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

  // physicsBody.angularVelocity.set(10, 10);
  physicsWorld.addBody(physicsBody);

  pieces.push({
    physicsBody,
    threeObject: threeObject as THREE.Mesh<any, MeshStandardMaterial>,
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
  addPiece(QUEEN, 3, 0, "WHITE");
  addPiece(KING, 4, 0, "WHITE");

  addPiece(ROOK, 0, 7, "BLACK");
  addPiece(ROOK, 7, 7, "BLACK");
  addPiece(KNIGHT, 1, 7, "BLACK");
  addPiece(KNIGHT, 6, 7, "BLACK");
  addPiece(BISHOP, 2, 7, "BLACK");
  addPiece(BISHOP, 5, 7, "BLACK");
  addPiece(QUEEN, 3, 7, "BLACK");
  addPiece(KING, 4, 7, "BLACK");
}

/**
 * Base
 */

const gui = new dat.GUI();

const canvas = document.querySelector("canvas")!;

const scene = new THREE.Scene();

scene.add(bowlingBallMesh);

// TODO: Credit
// "Chess Board" (https://skfb.ly/6BDGq) by Anthony Yanez is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).

/**
 * Events
 */
const mousePosition: THREE.Vector2 = new THREE.Vector2();
window.addEventListener("mousemove", (event: MouseEvent) => {
  mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
  mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
});
window.addEventListener("touchmove", (event: TouchEvent) => {
  mousePosition.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
  mousePosition.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
});

function popPiece(event: MouseEvent | TouchEvent) {
  if (event instanceof TouchEvent) {
    mousePosition.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
    mousePosition.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
  }
  hoverCheck();
  if (hoveredMeshes.length > 0) {
    const mesh = hoveredMeshes[0].object;
    const piece = pieces.filter((p) => {
      var correct = false;
      p.threeObject.traverse((child) => {
        if (child === mesh) {
          correct = true;
        }
      });
      return correct;
    })[0];
    piece.physicsBody.velocity.set(0, 10, 0);
    piece.physicsBody.angularVelocity.x += (Math.random() - 0.5) * 3;
    piece.physicsBody.angularVelocity.y += (Math.random() - 0.5) * 3;
    piece.physicsBody.angularVelocity.z += (Math.random() - 0.5) * 3;
  }
}

window.addEventListener("click", popPiece);
window.addEventListener("touchstart", popPiece);

type PieceMesh = THREE.Mesh<CylinderGeometry, THREE.MeshStandardMaterial>;

// interface Piece {
//   mesh: PieceMesh;
//   position: THREE.Vector2;
//   color: "WHITE" | "BLACK";
// }

// const pieces: Piece[] = [];

// Board
const boardGeometry = new THREE.PlaneGeometry(250, 250, 250, 250);
boardGeometry.rotateX(-Math.PI / 2);

const board = new THREE.Mesh(
  boardGeometry,
  new THREE.ShaderMaterial({
    vertexShader: boardVertexShader,
    fragmentShader: boardFragmentShader,
  })
);

scene.add(board);

scene.add(new THREE.AmbientLight("white", 0.5));
const pointLight = new THREE.PointLight("white", 0.5);

pointLight.position.set(3.5, 3, 3.5);
scene.add(pointLight);

gui.add(pointLight.position, "x", -5, 5);
gui.add(pointLight.position, "y", -5, 5);
gui.add(pointLight.position, "z", -5, 5);

/**
 * Sizes
 */
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

/**
 * Camera
 */

// const camera = new THREE.OrthographicCamera(
//   (-1 * sizes.width) / sizes.height,
//   sizes.width / sizes.height,
//   1,
//   -1,
//   0.01,
//   100
// );
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(3, 3, 12);
camera.lookAt(3.5, 0, 3.5);
scene.add(camera);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
// controls.enablePan = false;
controls.target.set(3.5, 0, 3.5);

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.setClearColor("#ff8000");
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const guiItems = {
  clearColor: "white",
};

gui.addColor(guiItems, "clearColor").onChange(renderer.setClearColor);

/**
 * Animate
 */
const clock = new THREE.Clock();

const raycaster = new THREE.Raycaster();

let hoveredMeshes: THREE.Intersection<PieceMesh>[] = [];

var fixedTimeStep = 1.0 / 60.0;
var maxSubSteps = 3;

const tick = () => {
  hoverCheck();

  // if (selected > -1) meshes[selected].material.color.set("#0f0");

  controls.update();

  pieces.forEach((piece) => {
    piece.threeObject.position.x = piece.physicsBody.position.x;
    piece.threeObject.position.y = piece.physicsBody.position.y;
    piece.threeObject.position.z = piece.physicsBody.position.z;

    piece.threeObject.quaternion.x = piece.physicsBody.quaternion.x;
    piece.threeObject.quaternion.y = piece.physicsBody.quaternion.y;
    piece.threeObject.quaternion.z = piece.physicsBody.quaternion.z;
    piece.threeObject.quaternion.w = piece.physicsBody.quaternion.w;
  });

  bowlingBallMesh.position.x = bowlingBallPhysics.position.x;
  bowlingBallMesh.position.y = bowlingBallPhysics.position.y;
  bowlingBallMesh.position.z = bowlingBallPhysics.position.z;

  physicsWorld.step(fixedTimeStep, clock.getDelta(), maxSubSteps);
  renderer.render(scene, camera);

  window.requestAnimationFrame(tick);
};

tick();

function hoverCheck() {
  const meshes = pieces.map((piece) => piece.threeObject);

  pieces.forEach((piece) => {
    piece.threeObject.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material.color.set(piece.color === "WHITE" ? "#fff" : "#222");
      }
    });
  });

  raycaster.setFromCamera(mousePosition, camera);
  const result = raycaster.intersectObjects(meshes);
  hoveredMeshes = result as THREE.Intersection<PieceMesh>[];
  if (result.length > 0) {
    const mesh = hoveredMeshes[0].object.parent!;
    console.log(mesh);
    mesh!.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material.color.set("#f00");
      }
    });
  }
}
