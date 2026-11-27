import * as THREE from 'three';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import * as Tone from 'tone';
import SoundSelector from './SoundSelector';
import OctaveWheel, { MIN_OCTAVE, MAX_OCTAVE } from './OctaveWheel';
import { DEFAULT_SOUND, getSynth, getVoicing } from '../core/sounds';
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
        flatShading: true,
        transparent: true, 
        // opacity: 0.5
    });
    // - rectangle body
    const bodyBrush = new Brush(new THREE.BoxGeometry(9, 1, 5));
    bodyBrush.updateMatrixWorld();
    // - extrude body
    // Same cavity as before (y -0.2 to 0.5, z -1 to 2.5), extended past the
    // top and front faces so the CSG doesn't deal with coplanar faces
    const extrudeBrush = new Brush(new THREE.BoxGeometry(7, 1, 4));
    extrudeBrush.position.y = 0.3;
    extrudeBrush.position.z = 1;
    extrudeBrush.updateMatrixWorld();
    // - extrude it
    const evaluator = new Evaluator();
    evaluator.attributes = ['position', 'normal'];
    this.bodyMesh = evaluator.evaluate(bodyBrush, extrudeBrush, SUBTRACTION);
    // - add material
    this.bodyMesh.material = bodyMaterial;
    this.add(this.bodyMesh);

    // ## 
    // WHITE KEYS
    // - material
    const keyMaterial = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        flatShading: true,
        transparent: true, 
        // opacity: 0.5
    });
    const keyLightMaterial = new THREE.MeshLambertMaterial({
        color: 0x90d7ff,
        flatShading: true,
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
        flatShading: true,
        transparent: true, 
        // opacity: 0.5
    });
    const blackKeyLightMaterial = new THREE.MeshLambertMaterial({
        color: 0x153345,
        flatShading: true,
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

    this.materials = {
        white: keyMaterial,
        whiteLight: keyLightMaterial,
        black: blackKeyMaterial,
        blackLight: blackKeyLightMaterial,
    };

    // ##
    // ADD TO EXAMPLE OBJECT
    this.position.y = 0.5;
    
    // ##
    // CONTROLS on the sides of the keys (the strip behind them stays free):
    // sound buttons on the left, octave wheel on the right
    this.selector = new SoundSelector();
    this.selector.position.set(-4, 0.5, 0.75);
    this.add(this.selector);

    this.wheel = new OctaveWheel();
    this.wheel.position.set(3.85, 0.5, 0.75);
    this.add(this.wheel);

    this.sound = null;
    this.octave = 0;
    this.setSound(DEFAULT_SOUND);

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
    // Mesh of each key -> keyboard code, so the mouse can play the keys too
    this.meshCodes = new Map();
    Object.keys(this.keys).forEach((code) => {
        this.meshCodes.set(this.keyMesh(this.keys[code].key), Number(code));
    });

    // - keyboard
    window.onkeydown = function (e) {
        var code = e.keyCode ? e.keyCode : e.which;
        // Browsers start audio suspended until a user gesture
        if (Tone.getContext().state !== 'running') {
            Tone.start();
        }
        _this.pressKey(code);
    };
    window.onkeyup = function (e) {
        var code = e.keyCode ? e.keyCode : e.which;
        _this.releaseKey(code);
    };

  }

  // Key index 0-6: white keys, 7-11: black keys
  keyMesh(key) {
    return key <= 6 ? this.keyMeshes[key] : this.blackKeyMeshes[key - 7];
  }

  pressKey(code) {
    // ignore unknown keys and keys already down
    if (!this.keys[code] || this.keyDown.indexOf(code) !== -1) return;
    this.keyDown.push(code);
    this.synth.triggerAttack(this.notes(code));
    // mouvement touche
    const key = this.keys[code].key;
    const mesh = this.keyMesh(key);
    mesh.rotation.x = (2 * Math.PI) / 180;
    if (key <= 6) {
      mesh.position.y = 0.09;
      mesh.material = this.materials.whiteLight;
    } else {
      mesh.position.y = 0.36;
      mesh.material = this.materials.blackLight;
    }
  }

  releaseKey(code) {
    if (!this.keys[code] || this.keyDown.indexOf(code) === -1) return;
    this.keyDown.splice(this.keyDown.indexOf(code), 1);
    this.synth.triggerRelease(this.notes(code));
    // mouvement touche
    const key = this.keys[code].key;
    const mesh = this.keyMesh(key);
    mesh.rotation.x = 0;
    if (key <= 6) {
      mesh.position.y = 0.15;
      mesh.material = this.materials.white;
    } else {
      mesh.position.y = 0.4;
      mesh.material = this.materials.black;
    }
  }

  // Keyboard code of the key under the raycaster, or null
  pickKey(raycaster) {
    const hit = raycaster.intersectObjects([...this.keyMeshes, ...this.blackKeyMeshes], false)[0];
    return hit ? this.meshCodes.get(hit.object) : null;
  }

  // Notes played by a keyboard key with the current sound and octave
  notes(code) {
    return getVoicing(this.sound, this.keys[code].tone)
      .map((note) => Tone.Frequency(note).transpose(12 * this.octave).toNote());
  }

  // Applies a sound or octave change; held keys keep playing with it
  _retune(change) {
    const held = this.keyDown || [];
    if (this.synth) {
      held.forEach((code) => this.synth.triggerRelease(this.notes(code)));
    }
    change();
    this.synth = getSynth(this.sound);
    held.forEach((code) => this.synth.triggerAttack(this.notes(code)));
  }

  setSound(id) {
    if (id === this.sound) return;
    this._retune(() => { this.sound = id; });
    this.selector.select(id);
  }

  setOctave(octave) {
    const clamped = Math.max(MIN_OCTAVE, Math.min(MAX_OCTAVE, octave));
    if (clamped === this.octave) return;
    this._retune(() => { this.octave = clamped; });
    this.wheel.setOctave(clamped);
  }

}

export default Piano;
