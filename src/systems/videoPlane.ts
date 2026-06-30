import * as THREE from 'three';
import { depth } from 'three/examples/jsm/nodes/Nodes.js';

const X_MAX = 5;
const Y_MAX = 5;
const Z_MAX = 11;
const BATCH_SIZE = 3;

const X_CAM_MAX = 3;
const Y_CAM_MAX = 4;

export class VideoPlane {
    private camera: THREE.PerspectiveCamera;
    private videoPlaneObj: THREE.Object3D;
    private navObj: THREE.Object3D;
    private videoMaterial: THREE.ShaderMaterial;
    private navMaterial: THREE.ShaderMaterial;
    private spatialArray: Array<THREE.Texture>;
    private depthMax: Array<number>;

    constructor(camera: THREE.PerspectiveCamera) {
        this.camera = camera;
        this.videoPlaneObj = new THREE.Object3D()
        this.navObj = new THREE.Object3D()
        this.spatialArray = new Array(X_MAX * Y_MAX * Z_MAX);
        this.depthMax = new Array(X_MAX * Y_MAX).fill(0);
        this.videoMaterial = new THREE.ShaderMaterial();
        this.navMaterial = new THREE.ShaderMaterial();
    }

    initVideoNav(navObj: THREE.Object3D) {
        const uniforms = {
            camPos: { value: new THREE.Vector3() },
            xAxis: { value: new THREE.Vector3() },
            yAxis: { value: new THREE.Vector3() },
            zAxis: { value: new THREE.Vector3() },
        };

        const vertexShader = `
        varying vec2 vUv;
        varying vec3 vColor;
        uniform vec3 camPos;


        void main() {
            vUv = uv;
            vColor = color;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            worldPos.xyz += camPos;
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

            vec3 highlightColor = vec3(1.0,0.0,1.0);
            vec3 lightColor = vec3(1.0,1.0,1.0);
            vec3 baseColor = 0.5*vec3(1.0,1.0,1.0);
            gl_FragColor = vec4(c*highlightColor + 0.2*vUv.r*lightColor + baseColor, 1.0);
        }
        `;

        this.navMaterial = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms,
            vertexColors: true,
            side: THREE.DoubleSide,
        });

        this.navObj = navObj;
        this.navObj.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material = this.navMaterial;
                child.frustumCulled = false;
                child.material.depthTest = false;
            }
        });
    }

    initVideoPlane(videoPlaneObj: THREE.Object3D) {
        const imgList = [
            "00/0.mp4", "00/1.mp4", "00/2.mp4", "00/3.mp4",
            "01/0.mp4", "01/1.mp4", "01/2.mp4",
            "02/0.mp4", "02/1.mp4", "02/2.mp4", "02/3.mp4", "02/4.mp4",
            "03/0.mp4", "03/1.mp4", "03/2.mp4", "03/3.mp4", "03/4.mp4", "03/5.mp4",
            "10/0.mp4", "10/1.mp4", "10/2.mp4", "10/3.mp4", "10/4.mp4",
            "11/0.mp4", "11/1.mp4", "11/2.mp4", "11/3.mp4", "11/4.mp4", "11/5.mp4",
            "12/0.mp4", "12/1.mp4", "12/2.mp4", "12/3.mp4", "12/4.mp4", "12/5.mp4", "12/6.mp4",
            "13/0.mp4", "13/1.mp4", "13/2.mp4", "13/3.mp4", "13/4.mp4", "13/5.mp4", "13/6.mp4",
            "20/0.mp4", "20/1.mp4", "20/2.mp4",
            "21/0.mp4", "21/1.mp4", "21/2.mp4", "21/3.mp4", "21/4.mp4", "21/5.mp4",
            "22/0.mp4", "22/1.mp4", "22/2.mp4", "22/3.mp4", "22/4.mp4", "22/5.mp4", "22/6.mp4",
            "23/0.mp4", "23/1.mp4", "23/2.mp4", "23/3.mp4", "23/4.mp4", "23/5.mp4", "23/6.mp4", "23/7.mp4", "23/8.mp4", "23/9.mp4",
        ];

        const loadAsset = (imgPath: string): Promise<void> => {
            return new Promise((resolve, reject) => {
                const x = parseInt(imgPath[0]);
                const y = parseInt(imgPath[1]);
                const z = parseInt(imgPath[3]);
                const fullPath = "assets/textures/" + imgPath;

                if (imgPath[5] === "m") {
                    const video = document.createElement('video');
                    video.loop = true;
                    video.muted = true;
                    video.autoplay = true;
                    video.playsInline = true;
                    video.src = fullPath;
                    const videoTex = new THREE.VideoTexture(video);
                    this.setTexAt(x, y, z, videoTex);
                    this.updateDepthMaxAt(x,y,z);
                    video.addEventListener('canplaythrough', () => {
                        videoTex.needsUpdate = true;
                        video.play()
                        resolve();
                    }, { once: true });

                    video.addEventListener('error', reject, { once: true });
                } else {
                    new THREE.TextureLoader().load(fullPath, (tex) => {
                        this.setTexAt(x, y, z, tex);
                        resolve();
                    }, undefined, reject);
                }
            });
        };

        const loadAllInBatches = async () => {
            for (let i = 0; i < imgList.length; i += BATCH_SIZE) {
                await Promise.all(imgList.slice(i, i + BATCH_SIZE).map(loadAsset));
            }
        };

        loadAllInBatches()

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
            vColor = round(color);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);

            float lerpX = step(blendX,color.r)*color.g;
            float lerpY = step(blendY,color.r)*color.g;
            float lerpZ = step(blendZ,color.r)*color.g;

            vLerp = vec3(lerpX, lerpY, lerpZ);
            worldPos.xyz *= 3.5;

            worldPos.x += mix(camPos.x, camPosNext.x, 2.0*lerpX*blendX)+.5/0.3;
            worldPos.y += mix(camPos.y, camPosNext.y, 2.0*lerpY*blendY)+.5/0.3;
            worldPos.z += mix(camPos.z, camPosNext.z, 2.0*lerpZ*blendZ)-0.6;

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
            //c1 = mix(c1, vColor, 2.0*blendX*vLerp.x);
            //c2 = mix(c2, vColor, 2.0*blendY*vLerp.y);
            //c3 = mix(c3, vColor, 2.0*blendZ*vLerp.z);

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

            //vec3 colorZ = mix(mix(colorA,vColor,2.0*blendZ*vLerp.z), mix(colorB,vColor,2.0*blendZ*vLerp.z), blendZ);
            vec3 colorZ = mix(colorA, colorB, blendZ);
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
        let idx = x * Z_MAX + y * X_MAX * Z_MAX + z;
        return this.spatialArray[idx];
    }

    setTexAt(x: number, y: number, z: number, tex: THREE.Texture) {
        let idx = x * Z_MAX + y * X_MAX * Z_MAX + z;
        this.spatialArray[idx] = tex;
    }

    updateDepthMaxAt(x: number, y: number, z: number) {
        let idx = x + y * X_MAX;
        this.depthMax[idx] = Math.max(z, this.depthMax[idx]);
    }

    getDepthMaxAt(x: number, y: number): number {
        let idx = x + y * X_MAX;
        return this.depthMax[idx];
    }

    getAxisBlend(frac: number): { dir: number, blend: number } {
        const dir = frac < 0.5 ? -1 : 1;
        const dist = frac < 0.5 ? 0.5 - frac : frac - 0.5;
        const blend = dist < 0.2 ? 0.0 : (0.5 / 0.3) * (dist - 0.2);
        return { dir, blend };
    }

    update(deltaTime: number = 0.016): void {
        let gridScale = .3;
        this.camera.position.max(new THREE.Vector3(0.5,0.5,0.5).multiplyScalar(1.0/gridScale))
        
        let gridPos = this.camera.position.clone().multiplyScalar(gridScale);
        const xIdx = Math.floor(gridPos.x);
        const yIdx = Math.floor(gridPos.y);
        const zIdx = Math.floor(gridPos.z);
        
        let depthMax = this.getDepthMaxAt(xIdx, yIdx);
        this.camera.position.min(new THREE.Vector3(X_CAM_MAX-0.5, Y_CAM_MAX-0.5, depthMax+0.5).multiplyScalar(1.0 / gridScale))


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
            new THREE.Vector3(xIdx, yIdx, zIdx).multiplyScalar(1 / gridScale)
        );
        u.camPosNext.value.copy(
            new THREE.Vector3(xIdx + ax.dir, yIdx + ay.dir, zIdx + az.dir).multiplyScalar(1 / gridScale)
        );

        const nU = this.navMaterial.uniforms;
        nU.camPos.value.copy(this.camera.position.clone().add(new THREE.Vector3(-2.3, -1.1, -2)));

        let xAxis = new THREE.Vector3();
        //check available textures xAxis. 
        if (this.getTexAt(xIdx - 1, yIdx, zIdx) && xIdx - 1 >= 0) {
            xAxis.setX(1)
        }
        if (this.getTexAt(xIdx + 1, yIdx, zIdx)) {
            xAxis.setZ(1)
        }
        nU.xAxis.value.copy(xAxis)

        let yAxis = new THREE.Vector3();
        //check available textures xAxis. 
        if (this.getTexAt(xIdx, yIdx - 1, zIdx) && yIdx - 1 >= 0) {
            yAxis.setX(1)
        }
        if (this.getTexAt(xIdx, yIdx + 1, zIdx)) {
            yAxis.setZ(1)
        }
        nU.yAxis.value.copy(yAxis)

        let zAxis = new THREE.Vector3();
        //check available textures xAxis. 
        if (this.getTexAt(xIdx, yIdx, zIdx - 1) && zIdx - 1 >= 0) {
            zAxis.setZ(1)
        }
        if (this.getTexAt(xIdx, yIdx, zIdx + 1)) {
            zAxis.setX(1)
        }
        nU.zAxis.value.copy(zAxis)

        // Pause all videos, then play only active ones
        const activeTextures = new Set([
            u.map1a.value, u.map2a.value, u.map3a.value,
            u.map1b.value, u.map2b.value, u.map3b.value,
        ]);

        this.spatialArray.forEach(tex => {
            if (tex instanceof THREE.VideoTexture) {
                const video = tex.image as HTMLVideoElement;
                if (activeTextures.has(tex)) {
                    if (video.paused) video.play();
                } else {
                    if (!video.paused) video.pause();
                }
            }
        });
    }
}