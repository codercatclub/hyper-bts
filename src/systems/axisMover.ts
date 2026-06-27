import * as THREE from 'three';

export class AxisMover {
    private camera: THREE.PerspectiveCamera;
    private targetScroll: number;

    constructor(camera: THREE.PerspectiveCamera) {
        this.targetScroll = 0;
        this.camera = camera;
        document.addEventListener("keydown", (event: KeyboardEvent) => {
            let moveDir = new THREE.Vector3()
            switch (event.key) {
                case "ArrowUp":
                    moveDir.set(0, 1, 0)
                    break;
                case "ArrowDown":
                    moveDir.set(0, -1, 0)
                    break;
                case "ArrowLeft":
                    moveDir.set(-1, 0, 0)
                    break;
                case "ArrowRight":
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
        let drag = 0.9;
        let scrollMag = .005;
        this.targetScroll *= drag;
        this.camera.position.add(new THREE.Vector3(0,0,scrollMag * this.targetScroll))
        this.camera.position.max(new THREE.Vector3(0.5*0.3,0.5*0.3,0.5*0.3))
        console.log(this.camera.position.z)
    }
}