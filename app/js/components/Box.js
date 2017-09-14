import props from 'js/core/props';

class Box extends THREE.Object3D {
  constructor(color, width, height, depth) {
    super();
    // ##
    // INIT
    const boxMaterial = new THREE.MeshLambertMaterial({
      color: color,
      shading: THREE.FlatShading,
    });
    // - object
    const boxGeometry = new THREE.BoxGeometry(width, height, depth);
    // - CREATE MESH
    this.boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
    // ##
    // ADD TO EXAMPLE OBJECT
    this.add(this.boxMesh);

    // ##
    // SAVE BINDING
    // this.onUpdate = this.onUpdate.bind(this);
  }

  onUpdate() {
    // this.rotation.x += props.rotation;
    // this.rotation.y += props.rotation;
  }
}

module.exports = Box;
