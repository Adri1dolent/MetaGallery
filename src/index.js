import * as THREE from 'three' //'https://unpkg.com/three@0.140.0/build/three.module.js'
import Stats from 'stats.js'
import {PointerLockControls} from "three/examples/jsm/controls/PointerLockControls";
import {VRButton} from "three/examples/jsm/webxr/VRButton";
import {getImgList} from "./scraper";
import {getProjectText} from "./scraper";
import {FontLoader} from "three/examples/jsm/loaders/FontLoader.js";
import {TextGeometry} from "three/examples/jsm/geometries/TextGeometry.js";
import logdepthbuf_fragmentGlsl from "three/src/renderers/shaders/ShaderChunk/logdepthbuf_fragment.glsl";

const clock = new THREE.Clock();

let cameraVector = new THREE.Vector3(); // create once and reuse it!
const prevGamePads = new Map();
let speedFactor = [0.1, 0.1, 0.1, 0.1];

const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)

const artSpacement = 5
const artSize = 2
let spots = []

let room_width
let room_length
let room_height

const imgList = getImgList()
const nbArts = imgList.length
setRoomSize(nbArts)


let isNotInGame = true;

let allowAction = false
let isInfoDisplayed = [].fill(false,0,nbArts)

let closestArtIndex

const tabData = await getProjectText()

const artPositions = getArtPositions(nbArts)
let keys = [];

let colliders = []

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 0;
camera.position.y = 1.5
camera.rotateY(Math.PI)

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio)
document.body.appendChild(renderer.domElement);

renderer.xr.enabled = true;
let controller = renderer.xr.getController(1)
let isSelecting = false
function onSelectStart(){
    console.log("clicked start")
    isSelecting = true
}
function onSelectEnd() {
    isSelecting = false
}

console.log(controller)
controller.addEventListener( 'connected', function ( event ) {
    this.add( buildController( event.data ) );
} );
controller.addEventListener( 'disconnected', function () {
    this.remove( this.children[ 0 ] );
} );
controller.addEventListener( 'selectstart', onSelectStart );
controller.addEventListener( 'selectend', onSelectEnd );
controller.addEventListener()
scene.add(controller)

/*const controllerModelFactory = new XRControllerModelFactory();
let controllerGrip1 = renderer.xr.getControllerGrip( 0 );
controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
scene.add( controllerGrip1 );*/


const vrbut = VRButton.createButton(renderer)
document.body.appendChild(vrbut)

const dolly = new THREE.Object3D()
dolly.position.z = 0
dolly.add(camera)
scene.add(dolly)
const stupCam = new THREE.Object3D()
camera.add(stupCam)



const ambientLight = new THREE.AmbientLight(0xf0f0f0, 0.8)
scene.add(ambientLight)

const terre = new THREE.Mesh(
    new THREE.SphereGeometry(1, 50, 50),
    new THREE.MeshLambertMaterial({
            map: new THREE.TextureLoader().load('./img/earth4k.jpg')
        }
    )
)
terre.position.set(0, 2, room_length / 2)
scene.add(terre)


const tloader = new THREE.TextureLoader()
let texture = tloader.load('img/parquet-texture.webp')

texture.wrapS = texture.wrapT = THREE.RepeatWrapping
texture.repeat.set(room_width / 2, room_length / 2)
texture.anisotropy = 16


const sol_material = new THREE.MeshLambertMaterial({map: texture})
const plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(room_width, room_length), sol_material)
plane.rotateX(-Math.PI / 2)
plane.position.set(0, 0, room_length / 2)
scene.add(plane)

texture = tloader.load('img/wall-texture.jpeg')
texture.wrapS = texture.wrapT = THREE.RepeatWrapping
texture.repeat.set(room_width / 10, 1)
texture.anisotropy = 16

const l1 = [1, 0, -1, 0]
const l2 = [1, 2, 1, 0]
for (let i = 0; i < 4; i++) {
    const wall_material = new THREE.MeshPhongMaterial({map: texture, side: THREE.DoubleSide})
    const wall = new THREE.Mesh(new THREE.PlaneBufferGeometry((i % 2) ? room_width : room_length, 3), wall_material)
    wall.position.set(
        l1[i] * room_width / 2,
        room_height / 2,
        l2[i] * room_length / 2
    )
    wall.rotateY(l1[i] * Math.PI / 2)
    scene.add(wall)
    colliders.push(wall)
}

const controls = new PointerLockControls(camera, renderer.domElement);
const startButton = document.getElementById("start")
startButton.addEventListener('click', function () {
    controls.lock()
})

document.addEventListener('keydown', keydown);
document.addEventListener('keyup', keyup);


function unlockedCursor() {
    isNotInGame = true
    startButton.style.display = 'block'
    //vrbut.setAttribute('style','display: block')
}

function lockedCursor() {
    isNotInGame = false
    startButton.style.display = 'none'
    //vrbut.setAttribute('style','mabite')

}

window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

}

controls.addEventListener('unlock', unlockedCursor, false);
controls.addEventListener('lock', lockedCursor, false)


let textsInRoom = []
//loadTexts()

function showInfo() {
    if (!isInfoDisplayed[closestArtIndex] && allowAction) {
        textsInRoom[closestArtIndex].visible = true
        spots[closestArtIndex].target.position.z += (closestArtIndex%2===0)?-2.5:2.5
        spots[closestArtIndex].target.updateMatrixWorld()
        isInfoDisplayed[closestArtIndex] = true
    }  else if(isInfoDisplayed[closestArtIndex] && allowAction){
        textsInRoom[closestArtIndex].visible = false
        spots[closestArtIndex].target.position.z += (closestArtIndex%2===0)?2.5:-2.5
        spots[closestArtIndex].target.updateMatrixWorld()
        isInfoDisplayed[closestArtIndex] = false
    }
}

function keydown(e) {
    if (isNotInGame) {
        return;
    }
    if (e.key === 'e') {
        showInfo()
    }
    keys[e.key] = true;
}

function keyup(e) {
    keys[e.key] = false;
}


function checkForArtInteraction(camera) {
    for (let i = 0; i < nbArts; i++) {
        if (getDistance(artPositions[i].x, artPositions[i].z, camera.position.x, camera.position.z) <= 2.5) {
            document.getElementById('actionButton').style.display = 'block'
            allowAction = true
            closestArtIndex = i
            break;
        } else {
            document.getElementById('actionButton').style.display = 'none'
        }
        allowAction = false
    }
}

function checkBounderies() {
    console.log(dolly.position)
    if (dolly.position.z > -0.3 + room_length) {
        dolly.position.z = room_length - 0.3;
    }
    if (dolly.position.z < 0.3) {
        dolly.position.z = 0.3;
    }
    if (dolly.position.x > -0.3 + room_width / 2) {
        dolly.position.x = room_width / 2 - 0.3;
    }
    if (dolly.position.x < 0.3 + -room_width / 2) {
        dolly.position.x = -room_width / 2 + 0.3;
    }
}

let vect = 0.005

function handleMovement(){
    let camVector = new THREE.Vector3()
    stupCam.getWorldDirection(camVector)
    stupCam.get
    camVector.y = 0
    //dolly.translateOnAxis(vect,0.1)
    if (keys['z']) {
        dolly.translateOnAxis(camVector,-0.1)
    }
    if (keys['s']) {
        dolly.translateOnAxis(camVector,0.1)
    }
    if (keys['q']) {
        camVector.x = camVector.z
        camVector.z = 0
        dolly.translateOnAxis(camVector,-0.1)
    }
    if (keys['d']) {
        camVector.x = camVector.z
        camVector.z = 0
        dolly.translateOnAxis(camVector,0.1)
    }
}

function animate() {
    stats.begin()
    handleMovement()
    checkBounderies(camera)
    checkForArtInteraction(camera)
    terre.rotation.y += 0.01
    terre.position.y += vect
    if (terre.position.y >= 2.5) {
        vect = -vect
    } else if (terre.position.y <= 1.8) {
        vect = -vect
    }
    const dt = clock.getDelta()
    if(controller)
        handleController(dt)
    dollyMove()
    renderer.render(scene, camera);
    stats.end()
}


function displayArtAt(x, z, imgUrl) {
    const textureProj = tloader.load(imgUrl, (tex) => {
        const imgWidth = tex.image.width
        const imgHeight = tex.image.height
        const ratio = imgHeight / imgWidth
        const toile = new THREE.BoxGeometry(artSize, ratio * artSize, 0.1)
        const material = new THREE.MeshLambertMaterial({map: textureProj})
        const art = new THREE.Mesh(toile, material)
        scene.add(art)
        art.rotateY(Math.PI / 2)
        console.log(`x: ${x}, z: ${z}`)
        art.position.set(x, 1.5, z)
    })
}


for (let i = 0; i < nbArts; i++) {
    const artPos = getArtPositions(nbArts)
    displayArtAt(artPos[i].x, artPos[i].z, imgList[i])
}

let loaded = 0

function putInvisibleTextAt(x, z, text) {
    const fontL = new FontLoader()
    fontL.load('./fonts/font.json', font => {
        const geo = new TextGeometry(text, {
            font: font,
            size: 0.05,
            height: 0.05
        })
        const textMesh = new THREE.Mesh(geo, [
            new THREE.MeshLambertMaterial({color: 0x03fc03}),//devant
            new THREE.MeshLambertMaterial({color: 0xfc03ce})//cotés
        ])
        textMesh.castShadow = false
        if(x<0){
            textMesh.rotateY(Math.PI/2)
            z = z - artSize
        }
        else{
            textMesh.rotateY(-Math.PI / 2)
        }
        textMesh.position.x = x
        textMesh.position.z = z
        textMesh.position.y = 2
        textMesh.visible = false
        scene.add(textMesh)
        textsInRoom.push(textMesh)
        loaded++
        if(loaded===6){
            document.getElementById("loader").style.display = 'none'
        }
    })
}
document.getElementById("loader").style.display = 'none'
putSpots()

renderer.setAnimationLoop( function () {
    animate();
});

function getDistance(x1, y1, x2, y2) {
    let y = x2 - x1;
    let x = y2 - y1;
    return Math.sqrt(x * x + y * y);
}

function getArtPositions(nbArts) {
    let res = []
    for (let i = 0; i < nbArts; i++) {
        res.push({
            x: ((i % 2 === 1) ? 1 : -1) * room_width / 2,
            z: 1.5 + (artSpacement / 2 + (Math.floor(i / 2)) * artSpacement)
        })
    }
    return res
}

function setRoomSize(nbArts) {
    room_length = (Math.floor((nbArts + 1) / 2)) * artSpacement+3
    room_width = 10
    room_height = 3
}

function loadTexts() {
    for (let i = 0; i < nbArts; i++) {
        putInvisibleTextAt(artPositions[i].x,artPositions[i].z+artSize/2,tabData[i])
    }
}

function putSpots(){
    artPositions.forEach(p => {
        const spotLight = new THREE.SpotLight( 0xffffff );
        spotLight.target.position.set(p.x,room_height/2,p.z)
        spotLight.target.updateMatrixWorld();
        spotLight.intensity = 0.3
        spotLight.angle = Math.PI/6
        spotLight.distance = 5
        console.log(`${p.x}  ${p.z}`)
        spotLight.position.set( p.x<0?p.x+2:p.x-2, room_height, p.z);
        spotLight.castShadow = false;
        spots.push(spotLight)
        scene.add( spotLight );
    })
}

function buildController( data ) {
    let geometry, material;
    console.log("in build")
    switch (data.targetRayMode) {

        case 'tracked-pointer':

            geometry = new THREE.BufferGeometry();
            geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( [ 0, 0, 0, 0, 0, - 1 ], 3 ) );
            geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( [ 0.5, 0.5, 0.5, 0, 0, 0 ], 3 ) );
            material = new THREE.LineBasicMaterial( { vertexColors: true, blending: THREE.AdditiveBlending } );
            return new THREE.Line( geometry, material );

        case 'gaze':

            geometry = new THREE.RingGeometry( 0.02, 0.04, 32 ).translate( 0, 0, - 1 );
            material = new THREE.MeshBasicMaterial( { opacity: 0.5, transparent: true } );
            return new THREE.Mesh( geometry, material );

    }

}

function handleController(dt) {
    if (isSelecting) {
        let vect = new THREE.Vector3()
        stupCam.getWorldDirection(vect)
        const speed = 1
        dolly.translateOnAxis(vect,-dt*speed)
        dolly.position.y = 0
        console.log(camera.position)
    }
}

function dollyMove() {
    let handedness = "unknown";

    //determine if we are in an xr session
    const session = renderer.xr.getSession();
    let i = 0;

    if (session) {
        let xrCamera = renderer.xr.getCamera(camera);
        xrCamera.getWorldDirection(cameraVector);

        //a check to prevent console errors if only one input source
        if (isIterable(session.inputSources)) {
            for (const source of session.inputSources) {
                if (source && source.handedness) {
                    handedness = source.handedness; //left or right controllers
                }
                if (!source.gamepad) continue;
                const controller = renderer.xr.getController(i++);
                const old = prevGamePads.get(source);
                const data = {
                    handedness: handedness,
                    buttons: source.gamepad.buttons.map((b) => b.value),
                    axes: source.gamepad.axes.slice(0)
                };
                if (old) {
                    data.axes.forEach((value, i) => {
                        //handlers for thumbsticks
                        //if thumbstick axis has moved beyond the minimum threshold from center, windows mixed reality seems to wander up to about .17 with no input
                        if (Math.abs(value) > 0.2) {
                            //set the speedFactor per axis, with acceleration when holding above threshold, up to a max speed
                            //speedFactor[i] > 1 ? (speedFactor[i] = 1) : (speedFactor[i] *= 1.001);
                            console.log(value, speedFactor[i], i);
                            if (i == 2) {
                                //left and right axis on thumbsticks
                                if (data.handedness == "left") {
                                    (data.axes[2] > 0) ? console.log('left on left thumbstick') : console.log('right on left thumbstick')

                                    //move our dolly
                                    //we reverse the vectors 90degrees so we can do straffing side to side movement
                                    dolly.position.x -= cameraVector.z * speedFactor[i] * data.axes[2];
                                    dolly.position.z += cameraVector.x * speedFactor[i] * data.axes[2];

                                    //provide haptic feedback if available in browser
                                    if (
                                        source.gamepad.hapticActuators &&
                                        source.gamepad.hapticActuators[0]
                                    ) {
                                        let pulseStrength = Math.abs(data.axes[2]) + Math.abs(data.axes[3]);
                                        if (pulseStrength > 0.75) {
                                            pulseStrength = 0.75;
                                        }

                                        //source.gamepad.hapticActuators[0].pulse(pulseStrength, 100);
                                    }
                                } else {
                                    //right thumstick (move left and right)
                                    (data.axes[2] > 0) ? console.log('left on right thumbstick') : console.log('right on right thumbstick')
                                    dolly.position.x -= cameraVector.z * speedFactor[i] * data.axes[2];
                                    dolly.position.z += cameraVector.x * speedFactor[i] * data.axes[2];
                                }
                            }

                            if (i == 3) {
                                //up and down axis on thumbsticks
                                if (data.handedness == "left") {
                                    console.log("LEFT Thumb UP/DOWN")
                                    dolly.position.x -= cameraVector.x * speedFactor[i] * data.axes[3];
                                    dolly.position.z -= cameraVector.z * speedFactor[i] * data.axes[3];
                                } else {
                                    console.log("RIGHT Thumb UP/DOWN")
                                    dolly.position.x -= cameraVector.x * speedFactor[i] * data.axes[3];
                                    dolly.position.z -= cameraVector.z * speedFactor[i] * data.axes[3];
                                }
                            }
                        } else {
                            //axis below threshold - reset the speedFactor if it is greater than zero  or 0.025 but below our threshold
                            if (Math.abs(value) > 0.025) {
                                speedFactor[i] = 0.025;
                            }
                        }
                    });
                }
                ///store this frames data to compate with in the next frame
                prevGamePads.set(source, data);
            }
        }
    }
}
function isIterable(obj) {  //function to check if object is iterable
    // checks for null and undefined
    if (obj == null) {
        return false;
    }
    return typeof obj[Symbol.iterator] === "function";
}

