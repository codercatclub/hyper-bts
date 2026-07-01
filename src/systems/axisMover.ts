import * as THREE from 'three';

export class AxisMover {
    private camera: THREE.PerspectiveCamera;
    private targetScroll: number;
    private totalTime: number;

    constructor(camera: THREE.PerspectiveCamera) {
        this.totalTime = 0.0;
        this.targetScroll = 0;
        this.camera = camera;
        document.addEventListener("keydown", (event: KeyboardEvent) => {
            let moveDir = new THREE.Vector3()
            switch (event.key) {
                case "ArrowUp":
                case "w":
                    moveDir.set(0, 1, 0)
                    break;
                case "ArrowDown":
                case "s":
                    moveDir.set(0, -1, 0)
                    break;
                case "ArrowLeft":
                case "a":
                    moveDir.set(-1, 0, 0)
                    break;
                case "ArrowRight":
                case "d":
                    moveDir.set(1, 0, 0)
                    break;
            }
            this.camera.position.add(moveDir.multiplyScalar(0.16))
        })
        document.addEventListener('wheel', (event) => {
            event.preventDefault();
            let maxScroll = 10.0;
            this.targetScroll += event.deltaY;
            this.targetScroll = Math.max(-maxScroll, Math.min(this.targetScroll, maxScroll));
        }, { passive: false });
    }

    update(deltaTime: number = 0.016): void {
        this.totalTime += deltaTime;
        let drag = 0.9;
        let scrollMag = -.005;
        this.targetScroll *= drag;
        this.camera.position.add(new THREE.Vector3(0,0,scrollMag * this.targetScroll))
    }
}