import * as THREE from 'three' //'https://unpkg.com/three@0.140.0/build/three.module.js'

import Stats from 'stats.js'

const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)





import {PointerLockControls} from "three/examples/jsm/controls/PointerLockControls";

//import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";

import {MTLLoader} from "three/examples/jsm/loaders/MTLLoader";

import {VRButton} from "three/examples/jsm/webxr/VRButton";

import {OBJLoader} from "three/examples/jsm/loaders/OBJLoader";

const room_width = 15
const room_length = 15
const room_height = 3

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setPixelRatio(window.devicePixelRatio)
document.body.appendChild( renderer.domElement );

renderer.xr.enabled = true;
document.getElementById("app").appendChild(VRButton.createButton(renderer))

const ambientLight = new THREE.AmbientLight(0xf0f0f0,1)
scene.add(ambientLight)

/*const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
const cube = new THREE.Mesh( geometry, material );
cube.position.set(0,1,0)
scene.add( cube );*/

/*const OBJFile = 'models/Earth_2K.obj';
const MTLFile = 'models/Earth_2K.mtl';
const JPGFile = 'models/noir-blanc.jpg';

let planette;

new MTLLoader()
    .load(MTLFile, function (materials) {
        materials.preload();
        new OBJLoader()
            .setMaterials(materials)
            .load(OBJFile, function (object) {

                object.position.y = 5;

                let texture = new THREE.TextureLoader().load(JPGFile);

                object.traverse(function (child) {   // aka setTexture
                    if (child instanceof THREE.Mesh) {
                        child.material.map = texture;
                    }
                });
                planette = object
                scene.add(object);
            });
    });*/

const terre = new THREE.Mesh(
    new THREE.SphereGeometry(1,50,50),
    new THREE.MeshBasicMaterial({
        map: new THREE.TextureLoader().load('./img/earth4k.jpg')
        }
    )
)
terre.position.set(0,1.5,0)
scene.add(terre)


const tloader = new THREE.TextureLoader()
let texture = tloader.load('img/parquet-texture.webp')
texture.wrapS = texture.wrapT = THREE.RepeatWrapping
texture.repeat.set(room_width/2,room_length/2)
texture.anisotropy=16


const sol_material = new THREE.MeshLambertMaterial({map: texture})
const plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(room_width,room_length), sol_material)
plane.rotateX(-Math.PI / 2)
plane.position.set(0,0,0)
scene.add(plane)

texture = tloader.load('img/wall-texture.jpeg')
texture.wrapS = texture.wrapT = THREE.RepeatWrapping
texture.repeat.set(room_width/10,1)
texture.anisotropy=16

const l1 = [1,0,-1,0]
const l2 = [0,1,0,-1]
for (let i = 0; i < 4; i++) {
    const wall_material = new THREE.MeshLambertMaterial({map: texture, side: THREE.DoubleSide})
    const wall = new THREE.Mesh(new THREE.PlaneBufferGeometry((i%2)?room_width:room_length,3), wall_material)
    wall.position.set(
        l1[i]*room_width/2,
        room_height/2,
        l2[i]*room_length/2
    )
    wall.rotateY(l1[i]*Math.PI / 2)
    scene.add(wall)
}


let isNotInGame = true;

const controls = new PointerLockControls(camera, renderer.domElement );
const startButton = document.getElementById("start")
startButton.addEventListener('click', function () {
    controls.lock()
})
let keys = [];
document.addEventListener('keydown',keydown);
document.addEventListener('keyup',keyup);


function unlockedCursor() {
    isNotInGame = true
    startButton.style.display = 'block'
    document.getElementById('VRButton').style.display = 'block'
}

function lockedCursor() {
    isNotInGame = false
    startButton.style.display = 'none'
    document.getElementById('VRButton').style.display = 'none'
}
window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );

}
controls.addEventListener('unlock', unlockedCursor, false);
controls.addEventListener('lock', lockedCursor, false)


function keydown(e){
    if(isNotInGame){
        return;
    }
    keys[e.key] = true;
}
function keyup(e){
    keys[e.key] = false;
}


camera.position.z = 5;
camera.position.y = 1.5

function checkBounderies(camera) {
    if(camera.position.z > -0.3 + room_length/2){
        camera.position.z = room_length/2 - 0.3;
    }
    if(camera.position.z < 0.3+ -room_length/2){
        camera.position.z = -room_length/2 + 0.3;
    }
    if(camera.position.x > -0.3 + room_width/2){
        camera.position.x = room_width/2 - 0.3;
    }
    if(camera.position.x < 0.3 + -room_width/2){
        camera.position.x = -room_width/2 + 0.3;
    }
}

function animate() {
    stats.begin()
    requestAnimationFrame( animate );

    if(keys['z']){
        controls.moveForward(.1);
    }
    if(keys['s']){
        controls.moveForward(-.1);
    }
    if(keys['q']){
        controls.moveRight(-.1);
    }
    if(keys['d']){
        controls.moveRight(.1);
    }
    checkBounderies(camera)
    terre.rotation.y += 0.01

    renderer.render( scene, camera );
    stats.end()
}

function displayArtAt(x,z,img){

}



animate();

/*function pytha(sideA, sideB){
    return Math.sqrt(Math.pow(sideA, 2) + Math.pow(sideB, 2));
}*/