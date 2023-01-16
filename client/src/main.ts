import * as THREE from "three";
import "./style.css";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";

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
board.position.x += 3;
board.position.z += 3;

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

const camera = new THREE.OrthographicCamera(
  -sizes.width / 2 / 30,
  sizes.width / 2 / 30,
  sizes.height / 2 / 30,
  -sizes.height / 2 / 30,
  1,
  1000
);
camera.position.set(0, 10, 0);
camera.lookAt(0, 0, 0);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.setClearColor("#ff8000");
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const composer = new EffectComposer(renderer);

[
  new RenderPass(scene, camera),
  new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      opacity: { value: 1.0 },
      ratio: { value: sizes.height / sizes.width },
    },

    vertexShader: /* glsl */ `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,

    fragmentShader: /* glsl */ `
		uniform float opacity;
		uniform sampler2D tDiffuse;
		uniform float ratio;
		varying vec2 vUv;
		void main() {
      float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
      float dist = sqrt((vUv.x - 0.5) * (vUv.x - 0.5) + (vUv.y - 0.5) * (vUv.y - 0.5));
			gl_FragColor = texture2D( 
        tDiffuse, 
        vec2(
          dist * cos(angle + 0.3 / min(0.5, dist) - 3.0 / 5.0) + 0.5,
          dist * sin(angle + 0.3 / min(0.5, dist) - 3.0 / 5.0) + 0.5
        )
      );
			gl_FragColor.a *= opacity;
    }`,
  }),
].map((pass) => composer.addPass(pass));

const clock = new THREE.Clock();

const textureLoader = new THREE.TextureLoader();

const raycaster = new THREE.Raycaster();

function tick() {
  const delta = clock.getDelta();

  raycaster.setFromCamera(mousePosition, camera);

  // renderer.render(scene, camera);
  composer.render();

  window.requestAnimationFrame(tick);
}

let pressing: boolean = false;

window.addEventListener("mousedown", (event: MouseEvent) => {
  pressing = true;
});

window.addEventListener("mouseup", (event: MouseEvent) => {
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
        -(mousePosition.x - previousMousePosition.x) / 30 / camera.zoom,
        0,
        -(mousePosition.y - previousMousePosition.y) / 30 / camera.zoom
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

const svgLoader = new SVGLoader();

const king = new THREE.Group();

let i = 0;

svgLoader.load("/images/white-king.svg", (data) => {
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
      king.add(mesh);
    });
  });
  king.rotateX(Math.PI / 2);
  king.scale.multiplyScalar(1 / 45);
  for (let i = 0; i < 100; i++) {
    const kingClone = king.clone();
    kingClone.position.set((i % 10) - 0.5, 1, Math.floor(i / 10) - 0.5);
    scene.add(kingClone);
  }
});

tick();
