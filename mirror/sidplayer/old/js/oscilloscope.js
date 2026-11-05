function outCallback(data) {

}

var Oscilloscope = function() {

  this.camera = null;
  this.scene = null;

  this.holder = null;

  this.sampleCount = 800;
  this.track1 = null;

  this.waveformMeshes = [];
}

Oscilloscope.prototype = {

  createLines: function() {
    var geometry = new THREE.Geometry();
    for(var i = 0; i < this.sampleCount; i++) {
      geometry.vertices.push(
        new THREE.Vector3( i, 0, 0 )
      );
    }

    var material = new THREE.LineBasicMaterial({
      color: 0xdddddd,
      transparent: false,
      opacity: 1
    });    

    this.track1 = new THREE.Line( geometry, material );
    this.holder.add( this.track1 );

  },

  init: function(music) {
    this.music = music;

    var near = 1;
    var far = 1000;
    var width = 40;
    var height = 40;
    this.camera = new THREE.OrthographicCamera( width / - 2, width / 2, height / 2, height / - 2, near, far );

    this.camera.position.z = 100;



    this.scene = new THREE.Scene();  
    this.holder = new THREE.Object3D();
    this.scene.add(this.holder);

    this.createLines();


  },

  outputData: function(data) {
    var triggerOffset = 0;
    while(data[triggerOffset] < 6000 && triggerOffset < 1000) {
      triggerOffset++;
    }
    while(data[triggerOffset] >= 5990 && triggerOffset < 1000) {
      triggerOffset++;
    }

    for(var i = 0; i < data.length; i++) {
//      var pos = (i + triggerOffset + this.sampleCount / 2) % this.sampleCount;
      var pos = (i + triggerOffset) % 2048;//this.sampleCount;
      if(i < this.track1.geometry.vertices.length) {
        if(data[pos] > 0) {
//          console.log(data[pos]);
        }
        this.track1.geometry.vertices[i].y = -data[pos] * 0.001;
      }
    }
//    console.log('offset = ' + triggerOffset);

    this.track1.geometry.verticesNeedUpdate = true;

  },

  render: function(left, bottom, width, height) {
    width = this.sampleCount;//width * 4;
    this.holder.position.x = - width / 2;
//    this.holder.position.y = - height / 2;
    this.scale = 1;
    this.camera.left = -width / (2 * this.scale);
    this.camera.right = width / (2 * this.scale);
    this.camera.top = height / (2 * this.scale);
    this.camera.bottom = -height / (2 * this.scale);    
    this.camera.updateProjectionMatrix();

    renderer.render( this.scene, this.camera );    
  }
}