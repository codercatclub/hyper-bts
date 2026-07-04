import * as THREE from 'three';
import { VideoPlane } from "../systems/videoPlane";

export class NavObj {
    private camera: THREE.PerspectiveCamera;
    private navObj: THREE.Object3D;
    private navMaterials: Array<THREE.ShaderMaterial>;
    private videoPlane: VideoPlane;
    private hoveredMesh: THREE.Mesh | null;
    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2;
    private isHolding: boolean;

    constructor(camera: THREE.PerspectiveCamera, videoPlane: VideoPlane) {
        this.camera = camera;
        this.navObj = new THREE.Object3D()
        this.navMaterials = [];
        this.videoPlane = videoPlane;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredMesh = null
        this.isHolding = false;
    }

    initVideoNav(navObj: THREE.Object3D) {
        const uniforms = {
            selected: { value: 0 },
            xAxis: { value: new THREE.Vector3() },
            yAxis: { value: new THREE.Vector3() },
            zAxis: { value: new THREE.Vector3() },
        };

        const vertexShader = `
        varying vec2 vUv;
        varying vec3 vColor;

        void main() {
            vUv = uv;
            vColor = color;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
        `;

        const fragmentShader = `
        varying vec2 vUv;
        varying vec3 vColor;
        varying vec3 vLerp;
        uniform vec3 xAxis;
        uniform vec3 yAxis;
        uniform vec3 zAxis;
        uniform float selected;

        void main() {
            vec3 c;
            vec3 cColor = 2.0 * vColor - 1.0;

            if(cColor.z < -0.5 && xAxis.x > 0.5) {
                c = vec3(1.0,1.0,1.0);
            }
            if(cColor.z > 0.5 && xAxis.z > 0.5) {
                c = vec3(1.0,1.0,1.0);
            }
            if(cColor.y < -0.5 && yAxis.x > 0.5) {
                c = vec3(1.0,1.0,1.0);
            }
            if(cColor.y > 0.5 && yAxis.z > 0.5) {
                c = vec3(1.0,1.0,1.0);
            }
            if(cColor.x > 0.5 && zAxis.x > 0.5) {
                c = vec3(1.0,1.0,1.0);
            }
            if(cColor.x < -0.5 && zAxis.z > 0.5) {
                c = vec3(1.0,1.0,1.0);
            }

            vec3 highlightColor = 1.1*vec3(1.0,0.5,1.0);
            vec3 lightColor = vec3(1.0,1.0,1.0);
            vec3 baseColor = 0.6*vec3(0.5,0.8,0.85);
            vec3 centerColor = 1.1*vec3(0.5,0.03,0.1);
            vec3 selectedColor = 0.9*vec3(1.0,1.0,0.0);

            vec3 finalColor = mix(baseColor, highlightColor, c);
            finalColor = mix(finalColor, selectedColor, c*selected);
            finalColor = mix(centerColor, finalColor, vUv.g); 

            gl_FragColor = vec4(finalColor + 0.2*vUv.r*lightColor, 1.0);
        }
        `;

        let mat = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms,
            vertexColors: true,
            side: THREE.DoubleSide,
            transparent: true
        });

        this.navObj = navObj;
        this.navObj.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material = mat.clone();
                this.navMaterials.push(child.material)
                child.frustumCulled = false;
                child.material.depthTest = false;
                child.renderOrder = 999;
            }
        });

        window.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            this.isHolding = true;
        });

        window.addEventListener('pointerup', (event ) => {
            event.preventDefault();
            this.isHolding = false;
        });

        window.addEventListener('mousemove', (event) => {
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);

            const intersects = this.raycaster.intersectObjects(this.navObj.children, true);
            if (intersects.length > 0) {
                const hit = intersects[0].object;
                if (this.hoveredMesh !== hit) {
                    if (this.hoveredMesh) {
                        (this.hoveredMesh.material as THREE.ShaderMaterial).uniforms.selected.value = 0.0;
                    }
                    if (hit instanceof THREE.Mesh) {
                        this.hoveredMesh = hit;
                        (this.hoveredMesh.material as THREE.ShaderMaterial).uniforms.selected.value = 1.0;
                        document.body.style.cursor = 'pointer';
                    }
                }
            } else {
                if (this.hoveredMesh) {
                    (this.hoveredMesh.material as THREE.ShaderMaterial).uniforms.selected.value = 0.0;
                    this.hoveredMesh = null;
                    document.body.style.cursor = 'default';
                }
            }
        });

    }

    update(deltaTime: number = 0.016): void {

        const height = -3;
        const width = height * this.camera.aspect;
        const x = -width / 2 - 0.32;
        const y = -height / 2 - 0.4;

        let gridPos = this.camera.position.clone().multiplyScalar(0.3);
        const xIdx = Math.floor(gridPos.x);
        const yIdx = Math.floor(gridPos.y);
        const zIdx = Math.floor(gridPos.z);

        let xAxis = new THREE.Vector3();
        //check available textures xAxis. 
        if (this.videoPlane.getTexAt(xIdx - 1, yIdx, zIdx) && xIdx - 1 >= 0) {
            xAxis.setX(1)
        }
        if (this.videoPlane.getTexAt(xIdx + 1, yIdx, zIdx)) {
            xAxis.setZ(1)
        }

        let yAxis = new THREE.Vector3();
        //check available textures xAxis. 
        if (this.videoPlane.getTexAt(xIdx, yIdx - 1, zIdx) && yIdx - 1 >= 0) {
            yAxis.setX(1)
        }
        if (this.videoPlane.getTexAt(xIdx, yIdx + 1, zIdx)) {
            yAxis.setZ(1)
        }

        let zAxis = new THREE.Vector3();
        //check available textures xAxis. 
        if (this.videoPlane.getTexAt(xIdx, yIdx, zIdx - 1) && zIdx - 1 >= 0) {
            zAxis.setZ(1)
        }
        if (this.videoPlane.getTexAt(xIdx, yIdx, zIdx + 1)) {
            zAxis.setX(1)
        }

        this.navMaterials.forEach((mat) => {
            mat.uniforms.xAxis.value.copy(xAxis)
            mat.uniforms.yAxis.value.copy(yAxis)
            mat.uniforms.zAxis.value.copy(zAxis)
        })

        if (this.isHolding && this.hoveredMesh) {
            let moveDir = new THREE.Vector3()
            switch (this.hoveredMesh.name) {
                case "pack2_3":
                    moveDir.set(0, 1, 0)
                    break;
                case "pack2_2":
                    moveDir.set(0, -1, 0)
                    break;
                case "pack2_1":
                    moveDir.set(-1, 0, 0)
                    break;
                case "pack2":
                    moveDir.set(1, 0, 0)
                    break;
                case "pack2_4":
                    moveDir.set(0, 0, -1)
                    break;
                case "pack2_5":
                    moveDir.set(0, 0, 1)
                    break;
            }
            this.camera.position.add(moveDir.multiplyScalar(0.05))
        }

        this.navObj.position.copy(this.camera.position.clone().add(new THREE.Vector3(-x, -y, -2)));

    }
}