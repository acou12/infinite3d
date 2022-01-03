import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "lil-gui";
import { CylinderGeometry } from "three";

/**
 * Base
 */

const gui = new dat.GUI();

const canvas = document.querySelector("canvas")!;

const scene = new THREE.Scene();

/**
 * Events
 */
const mousePosition: THREE.Vector2 = new THREE.Vector2();
window.addEventListener("mousemove", (event: MouseEvent) => {
  mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
  mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener("click", () => {
  if (hoveredMeshes.length > 0) {
    const mesh = hoveredMeshes[0].object;
    const meshes = pieces.map((piece) => piece.mesh);
    const index = meshes.indexOf(mesh);
    selected = index;
  }
});

/**
 * Textures
 */
const geometry = new THREE.CylinderGeometry(0.4, 0.4, 2, 32, 32);

const WHITE_COLOR = "#fff";
const BLACK_COLOR = "#222";

type PieceMesh = THREE.Mesh<CylinderGeometry, THREE.MeshStandardMaterial>;

interface Piece {
  mesh: PieceMesh;
  position: THREE.Vector2;
  color: "WHITE" | "BLACK";
}

const pieces: Piece[] = [];

for (let i = 0; i < 8 * 2; i++) {
  let row = Math.floor(i / 8);
  let col = i % 8;
  const piece = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: WHITE_COLOR,
    })
  );
  piece.castShadow = true;
  piece.receiveShadow = true;
  piece.position.set(row, 0, col);
  pieces.push({
    mesh: piece,
    position: new THREE.Vector2(row, col),
    color: "WHITE",
  });
  scene.add(piece);
}

for (let i = 0; i < 8 * 2; i++) {
  let row = Math.floor(i / 8);
  let col = i % 8;
  const piece = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: BLACK_COLOR,
    })
  );
  piece.castShadow = true;
  piece.receiveShadow = true;
  piece.position.set(7 - row, 0, col);
  pieces.push({
    mesh: piece,
    position: new THREE.Vector2(7 - row, col),
    color: "BLACK",
  });
  scene.add(piece);
}

// Board
const boardGeometry = new THREE.BoxGeometry(1, 0.1, 1);
const whiteBoardPiece = new THREE.Mesh(
  boardGeometry,
  new THREE.MeshStandardMaterial({
    color: "#f0d9b5",
  })
);
const blackBoardPiece = new THREE.Mesh(
  boardGeometry,
  new THREE.MeshStandardMaterial({
    color: "#b58863",
  })
);

whiteBoardPiece.receiveShadow = true;
blackBoardPiece.receiveShadow = true;

for (let i = -100; i < 100; i++) {
  for (let j = -100; j < 100; j++) {
    const piece =
      (i + j) % 2 === 0 ? whiteBoardPiece.clone() : blackBoardPiece.clone();
    piece.position.set(i, -1, j);
    scene.add(piece);
  }
}

scene.add(new THREE.AmbientLight("white", 0.5));
const pointLight = new THREE.DirectionalLight("white", 0.5);
pointLight.castShadow = true;
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
controls.enablePan = false;
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
renderer.shadowMap.enabled = true;

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
let selected: number = -1;

const tick = () => {
  const elapsedTime = clock.getElapsedTime();
  const meshes = pieces.map((piece) => piece.mesh);

  pieces.forEach((piece) => {
    const index = pieces.indexOf(piece);
    piece.mesh.material.color.set(
      piece.color === "WHITE" ? WHITE_COLOR : BLACK_COLOR
    );
  });

  raycaster.setFromCamera(mousePosition, camera);
  const result = raycaster.intersectObjects(meshes);
  hoveredMeshes = result as THREE.Intersection<PieceMesh>[];
  if (result.length > 0) {
    const mesh = hoveredMeshes[0].object;
    mesh.material.color.set("#f00");
  }

  if (selected > -1) meshes[selected].material.color.set("#0f0");

  controls.update();

  renderer.render(scene, camera);

  window.requestAnimationFrame(tick);
};

tick();
