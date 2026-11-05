var ChannelBarGraph = function() {
  this.music = null;
  this.channel = 0;

  this.adsrMesh = null;
  this.pulseWidthMesh = null;
  this.frequencyMesh = null;
  this.filterCutoffMesh = null;

  this.camera = null;
  this.scene = null;

  this.adsrColor = 0xf8a998;
  this.pulseWidthColor = 0x98c2a9;
  this.frequencyColor = 0x3495f8;
  this.filterCutoffColor = 0x68f8d7;


}

ChannelBarGraph.prototype = {
  init: function(music, args) {
    this.music = music;
    this.channel = args.channel;

    var near = 1;
    var far = 1000;
    var width = 40;
    var height = 40;
    this.camera = new THREE.OrthographicCamera( width / - 2, width / 2, height / 2, height / - 2, near, far );

    this.camera.position.z = 100;

    this.scene = new THREE.Scene();  
    this.holder = new THREE.Object3D();
    this.scene.add(this.holder);


    var geometry = new THREE.PlaneGeometry(2, 1);
    var material = new THREE.MeshBasicMaterial( { color: this.adsrColor });
    this.adsrMesh = new THREE.Mesh(geometry, material);
    this.adsrMesh.scale.y = 100;
    this.adsrMesh.position.x = 4;
//    this.adsrMesh.scale.x = 4;
    this.holder.add(this.adsrMesh);


    var geometry = new THREE.PlaneGeometry(2, 1);
    var material = new THREE.MeshBasicMaterial( { color: this.pulseWidthColor });
    this.pulseWidthMesh = new THREE.Mesh(geometry, material);
    this.pulseWidthMesh.scale.y = 100;
//    this.adsrMesh.scale.x = 4;
    this.holder.add(this.pulseWidthMesh);
    this.pulseWidthMesh.position.x = 8;


    var geometry = new THREE.PlaneGeometry(2, 1);
    var material = new THREE.MeshBasicMaterial( { color: this.frequencyColor });
    this.frequencyMesh = new THREE.Mesh(geometry, material);
    this.frequencyMesh.scale.y = 100;
    this.holder.add(this.frequencyMesh);
    this.frequencyMesh.position.x = 12;


    var geometry = new THREE.PlaneGeometry(2, 1);
    var material = new THREE.MeshBasicMaterial( { color: this.filterCutoffColor });
    this.filterCutoffMesh = new THREE.Mesh(geometry, material);
    this.filterCutoffMesh.scale.y = 100;
    this.holder.add(this.filterCutoffMesh);
    this.filterCutoffMesh.position.x = 16;


  },

  updateInfo: function(args) {
    height = this.height;
    if(args.pulseWidth == 0) {
      this.pulseWidthMesh.visible = false;
    } else {
      this.pulseWidthMesh.visible = true;
      this.pulseWidthMesh.scale.y = args.pulseWidth / 4095 * height;
      this.pulseWidthMesh.position.y = this.pulseWidthMesh.scale.y / 2 - height / 2;
    }

    if(args.adsr == 0) {
      this.adsrMesh.visible = false;
    } else {
      this.adsrMesh.visible = true;
      this.adsrMesh.scale.y = args.adsr / 256 * height;
      this.adsrMesh.position.y = this.adsrMesh.scale.y / 2 - height / 2;
    }

    if(args.frequency == 0) {
      this.frequencyMesh.visible = false;

    } else {
//      var max = 0xffff;
      var max = 8 * 12;

      this.frequencyMesh.visible = true;
      this.frequencyMesh.scale.y = args.frequency / max * height;
      this.frequencyMesh.position.y = this.frequencyMesh.scale.y / 2 - height / 2;

    }

    if(args.filterCutoff == 0) {
      this.filterCutoffMesh.visible = false;

    } else {
      this.filterCutoffMesh.visible = true;
      this.filterCutoffMesh.scale.y = args.filterCutoff / 0xfff * height;
      this.filterCutoffMesh.position.y = this.filterCutoffMesh.scale.y / 2 - height / 2;

    }


  },

  render: function(left, bottom, width, height) {
    this.height = height;
    width = 24;
    this.holder.position.x = - width / 2;
    this.scale = 1;
    this.camera.left = -width / (2 * this.scale);
    this.camera.right = width / (2 * this.scale);
    this.camera.top = height / (2 * this.scale);
    this.camera.bottom = -height / (2 * this.scale);    
    this.camera.updateProjectionMatrix();

    renderer.render( this.scene, this.camera );    
  }


}