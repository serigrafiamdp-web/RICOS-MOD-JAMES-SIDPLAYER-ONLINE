
var HistoryGraph = function() {

  this.camera = null;
  this.scene = null;

  this.holder = null;

  this.segments = 512;
  this.maximumValue = 0xff;
  this.data = [];
  this.waveformMeshes = [];
  this.historyLine = null;
  this.cursor = 0;
}

HistoryGraph.prototype = {

  createLines: function() {
    var geometry = new THREE.Geometry();
    for(var i = 0; i < this.segments; i++) {
      geometry.vertices.push(
        new THREE.Vector3( i, 0, 0 )
      );
    }

    var material = new THREE.LineBasicMaterial({
      color: 0xdddddd,
      transparent: false,
      opacity: 1
    });    

    this.historyLine = new THREE.Line( geometry, material );
    this.holder.add( this.historyLine );

  },

  init: function(music, args) {
    if(typeof args != 'undefined') {
      if(typeof args.max != 'undefined') {
        this.maximumValue = args.max;
      }
      if(typeof args.segments != 'undefined') {
        this.segments = args.segments;
      }

    }
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

    for(var i = 0; i < this.segments; i++) {
      this.data.push(0);
    }

  },

  addValue: function(value) {
    this.data[this.cursor++] = value;
    if(this.cursor >= this.segments) {
      this.cursor = 0;
    }

  },  

  outputData: function() {

    var drawAt = this.segments ;//Math.floor(this.segments / 2);
    var cursor = this.cursor - drawAt;
    if(cursor < 0) {
      cursor += this.segments;
    }

    for(var i = 0; i < drawAt; i++) {
      this.historyLine.geometry.vertices[i].y = this.data[cursor++] / this.maximumValue * this.height;
      if(cursor >= this.segments) {
        cursor = 0;
      }
    }

    for(var i = drawAt; i < this.segments; i++) {
      this.historyLine.geometry.vertices[i].y = 0;// this.data[cursor++] / 0xff * this.height / 2;

    }

    this.historyLine.geometry.verticesNeedUpdate = true;

  },

  render: function(left, bottom, width, height) {
    this.width = width;
    this.height = height;
    width = this.segments;//width * 4;
    this.holder.position.x = - width / 2;
//    this.holder.position.y = - height / 2;
    this.scale = 1;
    this.camera.left = -width / (2 * this.scale);
    this.camera.right = width / (2 * this.scale);
//    this.camera.top = height / (2 * this.scale);
//    this.camera.bottom = -height / (2 * this.scale);    
    this.camera.top = height;
    this.camera.bottom = 0;
    this.camera.updateProjectionMatrix();

    renderer.render( this.scene, this.camera );    
  }
}