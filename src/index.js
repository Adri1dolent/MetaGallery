import * as THREE from 'three' //'https://unpkg.com/three@0.140.0/build/three.module.js'
import Stats from 'stats.js'
import {PointerLockControls} from "three/examples/jsm/controls/PointerLockControls";
import {VRButton} from "three/examples/jsm/webxr/VRButton";
import {getEquipementsImgs, getEquipmentsText, getProjectsImgs} from "./scraper";
import {getProjectText} from "./scraper";
import ThreeMeshUI from 'three-mesh-ui'
import FontJSON from '../fonts/BreadleySansRegular-MVyEB-msdf/BreadleySansRegular-MVyEB-msdf.json';
import FontImage from '../fonts/BreadleySansRegular-MVyEB-msdf/BreadleySansRegular-MVyEB.png';
import {XRControllerModelFactory} from "three/examples/jsm/webxr/XRControllerModelFactory";


let cameraVector = new THREE.Vector3(); // create once and reuse it!
const prevGamePads = new Map();
let speedFactor = [0.1, 0.1, 0.1, 0.1];

const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)

const artSpacement = 5
const artSize = 2
let spots = []

const nbRooms = 3
let currentRoom = 0


const rooms_width = 10
let room_length
const rooms_height = 3
const couloirWidth = 1.5
const couloirlenght = 3

const ProjectsImgList = getProjectsImgs()
const EquipmentsImgList = getEquipementsImgs()
const nbArts = ProjectsImgList.length + EquipmentsImgList.length
const roomsNbArts = [ProjectsImgList.length,EquipmentsImgList.length]
const roomsLengths = [getRoomLength(ProjectsImgList.length),getRoomLength(EquipmentsImgList.length)]
room_length = getRoomLength(nbArts)

console.log(getEquipementsImgs().length)


let isNotInGame = true;

let allowAction = false
let isInfoDisplayed = [].fill(false, 0, nbArts)

let closestArtIndex

const t = await getProjectText()
const ta = await getEquipmentsText()
const tabData = t.concat(ta)


const artPositions = getArtPositions()
let keys = [];

let colliders = []

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 0
camera.position.y = 1.5
camera.rotateY(Math.PI)

const dolly = new THREE.Object3D()
dolly.position.z = 5
dolly.add(camera)
scene.add(dolly)
const stupCam = new THREE.Object3D()
camera.add(stupCam)

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio)
document.body.appendChild(renderer.domElement);

renderer.xr.enabled = true;
let controller1 = renderer.xr.getController(0)
let controller2 = renderer.xr.getController(1)
let isSelecting = false

const controllerModelFactory = new XRControllerModelFactory();

let controllerGrip1 = renderer.xr.getControllerGrip(0);
controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
dolly.add(controllerGrip1);

let controllerGrip2 = renderer.xr.getControllerGrip(1);
controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
dolly.add(controllerGrip2);

function onSelectStart() {
    isSelecting = true
    showInfo()
}

function onSelectEnd() {
    isSelecting = false
}

controller1.addEventListener('connected', function (event) {
});
controller1.addEventListener('disconnected', function () {
});
controller1.addEventListener('selectstart', onSelectStart);
controller1.addEventListener('selectend', onSelectEnd);

controller2.addEventListener('connected', function (event) {
});
controller2.addEventListener('disconnected', function () {
});
controller2.addEventListener('selectstart', onSelectStart);
controller2.addEventListener('selectend', onSelectEnd);


/*const controllerModelFactory = new XRControllerModelFactory();
let controllerGrip1 = renderer.xr.getControllerGrip( 0 );
controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
scene.add( controllerGrip1 );*/


const vrbut = VRButton.createButton(renderer)
document.body.appendChild(vrbut)

const tloader = new THREE.TextureLoader()

const texciel = tloader.load('img/sky.jpg')
texciel.wrapS = texciel.wrapT = THREE.RepeatWrapping
texciel.repeat.set(rooms_width / 10, room_length / 10)
texciel.anisotropy = 16
const ciel_material = new THREE.MeshLambertMaterial({map: texciel, side: THREE.DoubleSide})
const ciel = new THREE.Mesh(new THREE.PlaneBufferGeometry(1500, 1500), ciel_material)
ciel.rotateX(-Math.PI / 2)
ciel.position.set(0, 50, (room_length / 2))
scene.add(ciel)


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


createRoom(roomsLengths[0], rooms_width, rooms_height, 0, 0, false, true)
createCouloir(0,roomsLengths[0])
createRoom(roomsLengths[1], rooms_width, rooms_height, 0, roomsLengths[0]+couloirlenght, true, true)

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
    //vrbut.setAttribute('style','display: none')

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
let loaded = 0
loadTexts()

function showInfo() {
    if (!isInfoDisplayed[closestArtIndex] && allowAction) {
        textsInRoom[closestArtIndex].visible = true
        spots[closestArtIndex].target.position.z += (closestArtIndex % 2 === 0) ? -2.5 : 2.5
        spots[closestArtIndex].target.updateMatrixWorld()
        isInfoDisplayed[closestArtIndex] = true
    } else if (isInfoDisplayed[closestArtIndex] && allowAction) {
        textsInRoom[closestArtIndex].visible = false
        spots[closestArtIndex].target.position.z += (closestArtIndex % 2 === 0) ? 2.5 : -2.5
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


function checkForArtInteraction() {
    for (let i = 0; i < nbArts; i++) {
        if (getDistance(artPositions[i].x, artPositions[i].z, dolly.position.x, dolly.position.z) <= 2.5) {
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
    if (dolly.position.z > -0.3 + room_length) {
        dolly.position.z = room_length - 0.3;
    }
    if (dolly.position.z < 0.3) {
        dolly.position.z = 0.3;
    }
    if (dolly.position.x > -0.3 + rooms_width / 2) {
        dolly.position.x = rooms_width / 2 - 0.3;
    }
    if (dolly.position.x < 0.3 + -rooms_width / 2) {
        dolly.position.x = -rooms_width / 2 + 0.3;
    }
}

let vect = 0.005

function handleMovement() {
    let camVector = new THREE.Vector3()
    stupCam.getWorldDirection(camVector)
    camVector.y = 0
    //dolly.translateOnAxis(vect,0.1)
    if (keys['z']) {
        dolly.translateOnAxis(camVector, -0.1)
    }
    if (keys['s']) {
        dolly.translateOnAxis(camVector, 0.1)
    }
    if (keys['q']) {
        dolly.position.x -= camVector.z * speedFactor[1]
        dolly.position.z += camVector.x * speedFactor[1]
    }
    if (keys['d']) {
        dolly.position.x += camVector.z * speedFactor[1]
        dolly.position.z -= camVector.x * speedFactor[1]
    }
}

function animate() {
    stats.begin()
    ThreeMeshUI.update()
    handleMovement()
    //checkBounderies(camera)
    checkForArtInteraction(camera)

    terre.rotation.y += 0.01
    terre.position.y += vect
    if (terre.position.y >= 2.5) {
        vect = -vect
    } else if (terre.position.y <= 1.8) {
        vect = -vect
    }
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
        art.position.set(x, 1.5, z)
    })
}

displayAllArts()
function displayAllArts(){
    let i = 0
    for (; i < ProjectsImgList.length; i++) {
        displayArtAt(artPositions[i].x, artPositions[i].z, ProjectsImgList[i])
    }
    const tmp = ProjectsImgList.length
    for (let j = tmp; j < EquipmentsImgList.length+tmp; j++) {
        displayArtAt(artPositions[j].x, artPositions[j].z, EquipmentsImgList[j-tmp])
    }
}



function putInvisibleTextAt(x, z, text) {
    const regex = new RegExp(/\n/g)
    text = text.replaceAll(regex, "")
    const container = new ThreeMeshUI.Block({
        width: 2,
        height: 1,
        padding: 0.05,
        justifyContent: 'start',
        textAlign: 'center',
        fontFamily: FontJSON,
        fontTexture: FontImage,
        bestFit: 'auto'
    });
    container.borderWidth = 0.01
    container.borderColor = new THREE.Color('rgb(78,125,239)')
    if (x < 0) {
        container.rotateY(Math.PI / 2)
        z = z - artSize - 1.1
        x += 0.05
    } else {
        container.rotateY(-Math.PI / 2)
        x -= 0.05
        z += 1.1
    }
    container.position.set(x, 1.5, z)
    container.visible = false
    textsInRoom.push(container)
    scene.add(container);
    container.add(
        new ThreeMeshUI.Text({
            content: text,
            fontSize: 0.5
        })
    )
    loaded++
    if (loaded === nbArts) {
        document.getElementById("loader").style.display = 'none'
    }
}

putSpots()

renderer.setAnimationLoop(function () {
    animate();
});

function getDistance(x1, y1, x2, y2) {
    let y = x2 - x1;
    let x = y2 - y1;
    return Math.sqrt(x * x + y * y);
}

function getArtPositions() {
    let res = []
    let offset = 0
    for (let i = 0; i < roomsNbArts.length; i++) {
        for (let j = 0; j < roomsNbArts[i]; j++) {
            res.push({
                x: ((j % 2 === 1) ? 1 : -1) * rooms_width / 2,
                z: offset + 1.5 + (artSpacement / 2 + (Math.floor(j / 2)) * artSpacement)
            })
        }
        offset = roomsLengths[i] + couloirlenght
    }
    return res
}

function getRoomLength(nbArts) {
    return (Math.floor((nbArts + 1) / 2)) * artSpacement + 3
}

function loadTexts() {
    let i = 0
    for (; i < nbArts; i++) {
        putInvisibleTextAt(artPositions[i].x, artPositions[i].z + artSize / 2, tabData[i])
    }
}

function putSpots() {
    artPositions.forEach(p => {
        const spotLight = new THREE.SpotLight(0xffffff);
        spotLight.target.position.set(p.x, rooms_height / 2, p.z)
        spotLight.target.updateMatrixWorld();
        spotLight.intensity = 0.3
        spotLight.angle = Math.PI / 6
        spotLight.distance = 5
        spotLight.position.set(p.x < 0 ? p.x + 2 : p.x - 2, rooms_height, p.z);
        spotLight.castShadow = false;
        spots.push(spotLight)
        scene.add(spotLight);
    })
}

function buildController(data) {
    let geometry, material;
    switch (data.targetRayMode) {
        case 'tracked-pointer':
            geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3));
            material = new THREE.LineBasicMaterial({vertexColors: true, blending: THREE.AdditiveBlending});
            return new THREE.Line(geometry, material);

        case 'gaze':
            geometry = new THREE.RingGeometry(0.02, 0.04, 32).translate(0, 0, -1);
            material = new THREE.MeshBasicMaterial({opacity: 0.5, transparent: true});
            return new THREE.Mesh(geometry, material);
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
                            //console.log(value, speedFactor[i], i);
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

function createRoom(length, width, height, x, z, isOpenedAtZstart, isOpenedAtZend) {
    let texture = tloader.load('img/parquet.jpg')

    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(width / 2, length / 2)
    texture.anisotropy = 16


    const sol_material = new THREE.MeshLambertMaterial({map: texture})
    const plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(width, length), sol_material)
    plane.rotateX(-Math.PI / 2)
    plane.position.set(x, 0, z + (length / 2))
    scene.add(plane)

    texture = tloader.load('img/wall.jpg')
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(width / 5, 1)
    texture.anisotropy = 16

    const l1 = [1, 0, -1, 0]
    const l2 = [1, 2, 1, 0]
    let i = 0

    //mur droite
    const wall_material = new THREE.MeshPhongMaterial({map: texture, side: THREE.DoubleSide})
    let wall = new THREE.Mesh(new THREE.PlaneBufferGeometry((i % 2) ? width : length, height), wall_material)
    wall.position.set(
        x + (width / 2) * l1[i],
        height / 2,
        z + (length / 2) * l2[i]
    )
    wall.rotateY(l1[i] * Math.PI / 2)
    scene.add(wall)
    colliders.push(wall)
    i++


    //mur fond
    if (isOpenedAtZend) {
        wall = new THREE.Mesh(new THREE.PlaneBufferGeometry((width / 2) - couloirWidth, height), wall_material)
        wall.position.set(
            x - couloirWidth - ((width / 2) - couloirWidth)/2,
            height / 2,
            z + length
        )
        wall.rotateY(l1[i] * Math.PI / 2)
        scene.add(wall)
        colliders.push(wall)

        wall = new THREE.Mesh(new THREE.PlaneBufferGeometry((width / 2) - couloirWidth, height), wall_material)
        wall.position.set(
            x + couloirWidth + ((width / 2) - couloirWidth)/2,
            height / 2,
            z + length
        )
        wall.rotateY(l1[i] * Math.PI / 2)
        scene.add(wall)
        colliders.push(wall)
    } else {
        wall = new THREE.Mesh(new THREE.PlaneBufferGeometry((i % 2) ? width : length, height), wall_material)
        wall.position.set(
            x + (width / 2) * l1[i],
            height / 2,
            z + (length / 2) * l2[i]
        )
        wall.rotateY(l1[i] * Math.PI / 2)
        scene.add(wall)
        colliders.push(wall)
    }
    i++

    //mur gauche
    wall = new THREE.Mesh(new THREE.PlaneBufferGeometry((i % 2) ? width : length, height), wall_material)
    wall.position.set(
        x + (width / 2) * l1[i],
        height / 2,
        z + (length / 2) * l2[i]
    )
    wall.rotateY(l1[i] * Math.PI / 2)
    scene.add(wall)
    colliders.push(wall)
    i++

    //mur derriere
    if (isOpenedAtZstart) {
        wall = new THREE.Mesh(new THREE.PlaneBufferGeometry((width / 2) - couloirWidth, height), wall_material)
        wall.position.set(
            x - couloirWidth - ((width / 2) - couloirWidth)/2,
            height / 2,
            z
        )
        wall.rotateY(l1[i] * Math.PI / 2)
        scene.add(wall)
        colliders.push(wall)

        wall = new THREE.Mesh(new THREE.PlaneBufferGeometry((width / 2) - couloirWidth, height), wall_material)
        wall.position.set(
            x + couloirWidth + ((width / 2) - couloirWidth)/2,
            height / 2,
            z
        )
        wall.rotateY(l1[i] * Math.PI / 2)
        scene.add(wall)
        colliders.push(wall)
    } else {
        wall = new THREE.Mesh(new THREE.PlaneBufferGeometry((i % 2) ? width : length, height), wall_material)
        wall.position.set(
            x + (width / 2) * l1[i],
            height / 2,
            z
        )
        wall.rotateY(l1[i] * Math.PI / 2)
        scene.add(wall)
        colliders.push(wall)
    }
}

function createCouloir(x,z){
    const coulSolText = tloader.load('img/parquet.jpg')

    coulSolText.wrapS = coulSolText.wrapT = THREE.RepeatWrapping
    coulSolText.repeat.set(couloirWidth / 2, couloirlenght / 2)
    coulSolText.anisotropy = 16


    const sol_material = new THREE.MeshLambertMaterial({map: coulSolText})
    const plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(couloirWidth*2, couloirlenght), sol_material)
    plane.rotateX(-Math.PI / 2)
    plane.position.set(x, 0, z + (couloirlenght / 2))
    scene.add(plane)

    const coultext = tloader.load('img/wall.jpg')

    const wall_material = new THREE.MeshPhongMaterial({map: coultext, side: THREE.DoubleSide})
    let wall = new THREE.Mesh(new THREE.PlaneBufferGeometry(couloirlenght, rooms_height), wall_material)
    wall.position.set(
        x + couloirWidth,
        rooms_height / 2,
        z + (couloirlenght/2)
    )
    wall.rotateY(Math.PI / 2)
    scene.add(wall)
    colliders.push(wall)

    wall = new THREE.Mesh(new THREE.PlaneBufferGeometry(couloirlenght, rooms_height), wall_material)
    wall.position.set(
        x - couloirWidth,
        rooms_height / 2,
        z + (couloirlenght/2)
    )
    wall.rotateY(-Math.PI / 2)
    scene.add(wall)
    colliders.push(wall)

}

