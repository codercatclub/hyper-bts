import { AssetManager } from "./lib/assetManager";
import { AxisMover } from "./systems/axisMover";
import { VideoPlane } from "./systems/videoPlane";
import * as THREE from 'three';

(async () => {
  const assetManager = new AssetManager()
    .addAsset("assets/models/videoPlane.glb");
  await assetManager.load();
  const videoPlaneObj = assetManager.loadedAssets.objects.get("assets/models/videoPlane.glb")

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const axisMover = new AxisMover(camera);
  const videoPlane = new VideoPlane(camera);


  if (videoPlaneObj) {
    scene.add(videoPlaneObj)
    videoPlane.initVideoPlane(videoPlaneObj)
  }

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  function animate() {
    axisMover.update()
    videoPlane.update()
    renderer.render(scene, camera);
  }
})();
