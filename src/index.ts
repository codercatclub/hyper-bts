import { AssetManager } from "./lib/assetManager";
import { AxisMover } from "./systems/axisMover";
import { VideoPlane } from "./systems/videoPlane";
import * as THREE from 'three';

(async () => {
  const assetManager = new AssetManager()
    .addAsset("assets/models/nav.glb")
    .addAsset("assets/models/videoPlane.glb")
    .addAsset("assets/models/videoPlaneFused.glb");

  await assetManager.load();
  const videoPlaneObj = assetManager.loadedAssets.objects.get("assets/models/videoPlane.glb")
  const videoPlaneFusedObj = assetManager.loadedAssets.objects.get("assets/models/videoPlaneFused.glb")
  const nav = assetManager.loadedAssets.objects.get("assets/models/nav.glb")

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111)
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const axisMover = new AxisMover(camera);
  const videoPlane = new VideoPlane(camera);


  if (videoPlaneObj && videoPlaneFusedObj) {
    scene.add(videoPlaneObj)
    scene.add(videoPlaneFusedObj)
    videoPlane.initVideoPlane(videoPlaneObj, videoPlaneFusedObj)
  }

  if (nav) {
    scene.add(nav)
    videoPlane.initVideoNav(nav)
  }

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function animate() {
    axisMover.update()
    videoPlane.update()
    renderer.render(scene, camera);
  }
})();
