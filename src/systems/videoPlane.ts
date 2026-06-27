import * as THREE from 'three';

const X_MAX = 5;
const Y_MAX = 5;
const Z_MAX = 10;

export class VideoPlane {
    private camera: THREE.PerspectiveCamera;
    private videoPlaneObj: THREE.Object3D;
    private videoMaterial: THREE.ShaderMaterial;
    private spatialArray: Array<THREE.Texture>;

    constructor(camera: THREE.PerspectiveCamera) {
        this.camera = camera;
        this.videoPlaneObj = new THREE.Object3D()
        this.spatialArray = new Array(X_MAX * Y_MAX * Z_MAX);
        this.videoMaterial = new THREE.ShaderMaterial();
    }

    initVideoPlane(videoPlaneObj: THREE.Object3D) {
        let imgList = ["00/0.jpg", "00/1.jpg", "00/2.mp4", "01/0.jpg", "01/1.jpg", "10/0.jpg", "10/1.jpg", "11/0.jpg", "11/1.jpg"];

        imgList.forEach((imgPath, idx) => {
            let x = parseInt(imgPath[0]);
            let y = parseInt(imgPath[1]);
            let z = parseInt(imgPath[3]);
            let fullPath = "assets/textures/" + imgPath;

            if (imgPath[5] == "m") {
                const video = document.createElement('video');
                video.src = fullPath;
                video.autoplay = true;
                video.loop = true;
                video.muted = true;
                video.play()

                const videoTex = new THREE.VideoTexture(video);
                videoTex.needsUpdate = true; 
                this.setTexAt(x, y, z, videoTex);
            } else {
                new THREE.TextureLoader().load(fullPath, (tex) => {
                    this.setTexAt(x, y, z, tex);
                });
            }

        });

        const uniforms = {
            camPos: { value: new THREE.Vector3() },
            camPosNext: { value: new THREE.Vector3() },
            blendX: { value: 0 },
            blendY: { value: 0 },
            blendZ: { value: 0 },
            // 2 Z-slices, each with 3 spatial textures (main, X neighbor, Y neighbor)
            map1a: { value: new THREE.Texture() }, // main,       z floor
            map2a: { value: new THREE.Texture() }, // X neighbor, z floor
            map3a: { value: new THREE.Texture() }, // Y neighbor, z floor
            map1b: { value: new THREE.Texture() }, // main,       z ceil
            map2b: { value: new THREE.Texture() }, // X neighbor, z ceil
            map3b: { value: new THREE.Texture() }, // Y neighbor, z ceil
        };

        const vertexShader = `
        varying vec2 vUv;
        varying vec3 vColor;
        varying vec3 vLerp;

        uniform vec3 camPos;
        uniform vec3 camPosNext;
        uniform float blendX;
        uniform float blendY;
        uniform float blendZ;

        void main() {
            vUv = uv;
            vColor = color;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);

            float lerpX = step(blendX,color.r)*color.g;
            float lerpY = step(blendY,color.r)*color.g;
            float lerpZ = step(blendZ,color.r)*color.g;

            vLerp = vec3(lerpX, lerpY, lerpZ);

            worldPos.x += camPos.x + lerpX*blendX;
            worldPos.y += camPos.y + lerpY*blendY;
            worldPos.z += camPos.z - lerpZ*blendZ-0.6;

            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
        `;

        const fragmentShader = `
        varying vec2 vUv;
        varying vec3 vColor;
        varying vec3 vLerp;

        uniform sampler2D map1a;
        uniform sampler2D map2a;
        uniform sampler2D map3a;
        uniform sampler2D map1b;
        uniform sampler2D map2b;
        uniform sampler2D map3b;
        uniform float blendX;
        uniform float blendY;
        uniform float blendZ;

        vec3 blendXY(sampler2D m1, sampler2D m2, sampler2D m3) {
            vec3 c1 = texture2D(m1, vUv).rgb;
            vec3 c2 = texture2D(m2, vUv).rgb;
            vec3 c3 = texture2D(m3, vUv).rgb;
            c1 = mix(c1, vColor, 2.0*blendX*vLerp.x);
            c2 = mix(c2, vColor, 2.0*blendY*vLerp.y);
            c3 = mix(c3, vColor, 2.0*blendZ*vLerp.z);

            float wx = 1.0 - blendX;
            float wy = 1.0 - blendY;
            float w1 = wx * wy;
            float w2 = blendX * wy;
            float w3 = wx * blendY;
            float total = w1 + w2 + w3;

            return (c1*w1 + c2*w2 + c3*w3) / total;
        }

        void main() {
            // Blend XY at z floor and z ceil separately, then blend between them
            vec3 colorA = blendXY(map1a, map2a, map3a);
            vec3 colorB = blendXY(map1b, map2b, map3b);

            vec3 colorZ = mix(mix(colorA,vColor,2.0*blendZ*vLerp.z), mix(colorB,vColor,2.0*blendZ*vLerp.z), blendZ);

            gl_FragColor = vec4(colorZ, 1.0);
        }
        `;

        this.videoMaterial = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms,
            vertexColors: true,
            side: THREE.DoubleSide,
        });

        this.videoPlaneObj = videoPlaneObj;
        this.videoPlaneObj.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material = this.videoMaterial;
                child.frustumCulled = false;
            }
        });
    }

    getTexAt(x: number, y: number, z: number): THREE.Texture {
        x = Math.min(Math.max(x, 0), X_MAX - 1);
        y = Math.min(Math.max(y, 0), Y_MAX - 1);
        z = Math.min(Math.max(z, 0), Z_MAX - 1);
        let idx = x * Z_MAX + y * X_MAX * Z_MAX + z;
        return this.spatialArray[idx];
    }

    setTexAt(x: number, y: number, z: number, tex: THREE.Texture) {
        let idx = x * Z_MAX + y * X_MAX * Z_MAX + z;
        this.spatialArray[idx] = tex;
    }

    getAxisBlend(frac: number): { dir: number, blend: number } {
        const dir = frac < 0.5 ? -1 : 1;
        const dist = frac < 0.5 ? 0.5 - frac : frac - 0.5;
        const blend = dist < 0.2 ? 0.0 : (0.5 / 0.3) * (dist - 0.2);
        return { dir, blend };
    }

    update(deltaTime: number = 0.016): void {
        let gridScale = .3;
        let gridPos = this.camera.position.clone().multiplyScalar(gridScale);
        gridPos.max(new THREE.Vector3(0.5, 0.5, 0.5));

        const xIdx = Math.floor(gridPos.x);
        const yIdx = Math.floor(gridPos.y);
        const zIdx = Math.floor(gridPos.z);

        const ax = this.getAxisBlend(gridPos.x - xIdx);
        const ay = this.getAxisBlend(gridPos.y - yIdx);
        const az = this.getAxisBlend(gridPos.z - zIdx);

        const u = this.videoMaterial.uniforms;

        // Z floor slice
        u.map1a.value = this.getTexAt(xIdx, yIdx, zIdx);
        u.map2a.value = this.getTexAt(xIdx + ax.dir, yIdx, zIdx);
        u.map3a.value = this.getTexAt(xIdx, yIdx + ay.dir, zIdx);

        // Z ceil slice
        u.map1b.value = this.getTexAt(xIdx, yIdx, zIdx + az.dir);
        u.map2b.value = this.getTexAt(xIdx + ax.dir, yIdx, zIdx + az.dir);
        u.map3b.value = this.getTexAt(xIdx, yIdx + ay.dir, zIdx + az.dir);

        u.blendX.value = ax.blend;
        u.blendY.value = ay.blend;
        u.blendZ.value = az.blend;

        u.camPos.value.copy(
            this.camera.position.clone().add(new THREE.Vector3(0, 0, 0))
        );
        u.camPosNext.value.copy(
            this.camera.position.clone().add(new THREE.Vector3(0, 0, -az.dir * gridScale))
        );

        console.log(u.blendZ.value)
    }
}