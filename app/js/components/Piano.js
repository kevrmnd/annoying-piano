import props from 'js/core/props';
const ThreeBSP = require('three-js-csg')(THREE);
const Tone = require('tone');
var playingKey = false;
var playedKey = false;

class Piano extends THREE.Object3D {
  constructor() {
    super();
    const _this = this;

    // ##
    // BODY
    // - material body
    const bodyMaterial = new THREE.MeshLambertMaterial({
        color: 0x444444,
        shading: THREE.FlatShading,
        transparent: true, 
        // opacity: 0.5
    });
    // - rectangle body
    const bodyGeometry = new THREE.BoxGeometry(9, 1, 5);
    const bodyMesh = new THREE.Mesh(bodyGeometry);
    const bodyBSP = new ThreeBSP(bodyMesh);
    // - extrude body
    const extrudeGeometry = new THREE.BoxGeometry(7, 0.7, 3.5);
    const extrudeMesh = new THREE.Mesh(extrudeGeometry);
    extrudeMesh.position.y = 0.15;
    extrudeMesh.position.z = 0.75;
    const extrudeBSP = new ThreeBSP(extrudeMesh);
    // - extrude it
    const bodySubMesh = bodyBSP.subtract(extrudeBSP);
    this.bodyMesh = bodySubMesh.toMesh();
    // - add material
    this.bodyMesh.material = bodyMaterial;
    this.add(this.bodyMesh);

    // ## 
    // WHITE KEYS
    // - material
    const keyMaterial = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        shading: THREE.FlatShading,
        transparent: true, 
        // opacity: 0.5
    });
    const keyLightMaterial = new THREE.MeshLambertMaterial({
        color: 0x90d7ff,
        shading: THREE.FlatShading,
        transparent: true, 
        // opacity: 0.5
    });
    // - geometry
    const keyGeometry = new THREE.BoxGeometry(0.9, 0.4, 3.5);
    // - meshes
    this.keyMeshes = [];
    for (var i = 0; i < 7; i++) {
        this.keyMeshes.push(new THREE.Mesh(keyGeometry, keyMaterial));
        this.keyMeshes[i].position.x = i - 3;
        this.keyMeshes[i].position.z = 0.75;
        this.keyMeshes[i].position.y = 0.15;
        _this.add(this.keyMeshes[i]);
    }

    // ## 
    // BLACK KEYS
    // - material
    const blackKeyMaterial = new THREE.MeshLambertMaterial({
        color: 0x111111,
        shading: THREE.FlatShading,
        transparent: true, 
        // opacity: 0.5
    });
    const blackKeyLightMaterial = new THREE.MeshLambertMaterial({
        color: 0x153345,
        shading: THREE.FlatShading,
        transparent: true, 
        // opacity: 0.5
    });
    // - geometry
    const blackKeyGeometry = new THREE.BoxGeometry(0.6, 0.2, 2.5);
    // - meshes
    this.blackKeyMeshes = [];
    for (var i = 0; i < 5; i++) {
        var pos_x = i - 2.5;
        if(i >= 2){
            pos_x = pos_x + 1;
        }
        this.blackKeyMeshes.push(new THREE.Mesh(blackKeyGeometry, blackKeyMaterial));
        this.blackKeyMeshes[i].position.x = pos_x;
        this.blackKeyMeshes[i].position.z = 0.25;
        this.blackKeyMeshes[i].position.y = 0.4;
        _this.add(this.blackKeyMeshes[i]);
    }

    // ##
    // ADD TO EXAMPLE OBJECT
    this.position.y = 0.5;
    
    // ##
    // SYNTH  
    this.activated = false;
    this.synth = new Tone.PolySynth().toMaster();
    this.synth.set({
        oscillator:{
            type:'sawtooth'
        },
        volume: -10,
    });

    // ##
    // KEYS
    this.keyDown = [];
    this.keys = {
        87: {
            key: 0,
            tone: ['C3','C4']
        },
        83: {
            key: 7,
            tone: ['C#3','C#4']
        },
        88: {
            key: 1,
            tone: ['D3','D4']
        },
        68: {
            key: 8,
            tone: ['D#3','D#4']
        },
        67: {
            key: 2,
            tone: ['E3','E4']
        },
        86: {
            key: 3,
            tone: ['F3','F4']
        },
        71: {
            key: 9,
            tone: ['F#3','F#4']
        },
        66: {
            key: 4,
            tone: ['G3','G4']
        },
        72: {
            key: 10,
            tone: ['G#3','G#4']
        },
        78: {
            key: 5,
            tone: ['A3','A4']
        },
        74: {
            key: 11,
            tone: ['A#3','A#4']
        },
        188: {
            key: 6,
            tone: ['B3','B4']
        }
    };
    // - key down
    window.onkeydown = function (e) {
        var code = e.keyCode ? e.keyCode : e.which;
        if(_this.keys[code] && _this.keyDown.indexOf(code) == -1){
            // si la touche correspond au clavier && que la touche n'est pas dans this.keyDown
            _this.keyDown.push(code);
            _this.synth.triggerAttack(_this.keys[code].tone);
            // mouvement touche
            var key = _this.keys[code].key;
            if(key <= 6){
                _this.keyMeshes[key].rotation.x = (2 * Math.PI) / 180;
                _this.keyMeshes[key].position.y = 0.09;
                _this.keyMeshes[key].material = keyLightMaterial;
            }else{
                key = key - 7;
                _this.blackKeyMeshes[key].rotation.x = (2 * Math.PI) / 180;
                _this.blackKeyMeshes[key].position.y = 0.36;
                _this.blackKeyMeshes[key].material = blackKeyLightMaterial;
            }
            
        }
    };
    // - key up
    window.onkeyup = function (e) {
        var code = e.keyCode ? e.keyCode : e.which;
        if(_this.keys[code] && _this.keyDown.indexOf(code) != -1){
            // si la touche correspond au clavier && que la touche est dans this.keyDown
            _this.keyDown.splice(_this.keyDown.indexOf(code), 1);
            _this.synth.triggerRelease(_this.keys[code].tone);
            // mouvement touche
            var key = _this.keys[code].key;
            if(key <= 6){
                _this.keyMeshes[key].rotation.x = (0 * Math.PI) / 180;
                _this.keyMeshes[key].position.y = 0.15;
                _this.keyMeshes[key].material = keyMaterial;
            }else{
                key = key - 7;
                _this.blackKeyMeshes[key].rotation.x = (0 * Math.PI) / 180;
                _this.blackKeyMeshes[key].position.y = 0.4;
                _this.blackKeyMeshes[key].material = blackKeyMaterial;
            }
        }
    };

  }

}

module.exports = Piano;
