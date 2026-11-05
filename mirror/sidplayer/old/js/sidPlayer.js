    jsSID_audioCtx = null;
 jsSID_scriptNode = null;


var SidPlayer = function() {
  this.oscilloscopes = null;
  this.adsrGraphs = null;

  this.barGraphs = null;
  this.channelInfo = null;
  this.views = [];

  this.playingSid = false;
  this.pausedSid = false;

  this.subtuneCount = 0;
  this.subtune = 0;

  this.sidTitle = "";
  this.sidAuthor = "";
  this.sidInfo = "";
  this.sidFrameperiod = 0;
  this.sidSpeed = "";

  this.texture = null;

  this.showBarGraphs = true;
  this.showADSREnvelope = true;
  this.showWaveform = true;
  this.showChannelInfo = true;


  this.lastGate = false;
  this.lastSync = false;
  this.lastRing = false;
  this.lastTest = false;
  this.lastTriangle = false;
  this.lastSawtooth = false;
  this.lastPulse = false;
  this.lastNoise = false;
  this.lastNote = false;


  this.doRecord = false;
}

SidPlayer.prototype = {


  sidRecordStart: function() {
    this.doRecord = true;
    console.log('sid record start..');
    this.recordData = '';
  },

  sidRecordStop: function() {
    this.doRecord = false;
    console.log('sid record stop...');
    console.log(this.recordData);
  },

  init: function() {

    this.channelInfoTexture = new THREE.TextureLoader().load( "../images/channelinfo.png" );

/*
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
*/
    this.oscilloscopes = [];
    this.channelInfo = [];
    this.barGraphs = [];
    this.adsrGraphs = [];
    for(var i = 0; i < 3; i++) {
      var channel = i + 1;
      this.oscilloscopes[i] = new Oscilloscope();
      this.oscilloscopes[i].init(this);

      this.oscilloscopes[i].coordinates = {left: 0, right: 0, top: 0, bottom: 0};
      this.oscilloscopes[i].background = 0x000000;

      this.views.push(this.oscilloscopes[i]);

      this.channelInfo[i] = new ChannelInfo();
      this.channelInfo[i].init(this, { channel: channel });

      this.barGraphs[i] = new ChannelBarGraph();
      this.barGraphs[i].init(this, { channel: channel });
      this.barGraphs[i].coordinates = {left: 0, right: 0, top: 0, bottom: 0};
      this.barGraphs[i].background = 0x000000;

      this.views.push(this.barGraphs[i]);

      this.adsrGraphs[i] = new HistoryGraph();
      this.adsrGraphs[i].init(this, { max: 0xff, segments: 256 });
      this.adsrGraphs[i].coordinates = {left: 0, right: 0, top: 0, bottom: 0};
      this.adsrGraphs.background = 0x000000;

      this.views.push(this.adsrGraphs[i]);

    }

    this.setupAudioContext();

    var sidurl = "Airwolf.sid";
    
    sidurl = "Robotvoice.sid";


 //   sidurl = "Automatas.sid";
 //   sidurl = "Ulthar_2004.sid";
 //   sidurl = "Milk_and_Honey.sid";
//    sidurl = "LMan - 808 Love.sid";

sidurl = "Spy_Hunter.sid";   
sidurl = 'Moon_Patrol.sid'; 
//sidurl = "Crazy_Comets_Remix.sid";
//    sidurl = "Rock_Sid_long_version_8580.sid";
sidurl = "Last_Aproach.sid";
sidurl = "Orivesi.sid";
sidurl = "Last_Ninja_2.sid";
//sidurl = "Airwolf.sid";
//    sidurl = "HVSC.sid";
//sidurl = "Rock_Sid_long_version_8580.sid";

    console.log('loading ' + sidurl);
    var request = new XMLHttpRequest(); request.open('GET',sidurl,true); 
    request.responseType = 'arraybuffer';

    var thisPlayer = this;

    request.onload = function() {  

      console.log('loaded');

      thisPlayer.subtune = 0;
      thisPlayer.subtuneCount = SIDplayer.getsubtunes();
      var filedata = new Uint8Array(request.response);    
      thisPlayer.initSid(filedata);

      thisPlayer.initEvents();
    }
    request.send(null); 
  },

  initEvents: function() {
    var thisPlayer = this;
    $('#sidPlayButton').on('click', function() {
      thisPlayer.playSid();
    });


    $('#sidStopButton').on('click', function() {
      thisPlayer.stopSid();
    });

    $('#sidNextSubtune').on('click', function() {
      thisPlayer.setSubtune(thisPlayer.subtune + 1);
    });
    $('#sidPreviousSubtune').on('click', function() {
      thisPlayer.setSubtune(thisPlayer.subtune - 1);
    });

    $('input[name=sidChannelOn]').on('click', function() {
      var ch1 = $('#sidChannel1On').is(':checked');
      var ch2 = $('#sidChannel2On').is(':checked');
      var ch3 = $('#sidChannel3On').is(':checked');

      SIDplayer.setChannelOn(ch1, ch2, ch3);
    });

    $('input[name=playbackSpeed]').on('click', function() {
      var speed = $('input[name=playbackSpeed]:checked').val();
      if(speed == 'original') {
        SIDplayer.setSamplePeriod(1);

      } else if(speed == 'half') {
        SIDplayer.setSamplePeriod(0.5);

      } else if(speed == 'quarter') {
        SIDplayer.setSamplePeriod(0.25);

      } else if(speed == 'eighth') {
        SIDplayer.setSamplePeriod(1/8);
      } else if(speed == 'sixteenth') {

        SIDplayer.setSamplePeriod(1/16);

      }
    });

    $('input[name=sidModel]').on('click', function() {
      var model = $('input[name=sidModel]:checked').val();
      SIDplayer.setmodel(model);
    });

    $('#loadSIDButton').on('click', function() {
      document.getElementById('loadSID').click();

    });

    $('#showBarGraphs').on('click', function() {
      thisPlayer.showBarGraphs = $(this).is(':checked');
    });

    $('#showADSREnvelope').on('click', function() {
      thisPlayer.showADSREnvelope = $(this).is(':checked');
    });

    $('#showWaveform').on('click', function() {
      thisPlayer.showWaveform = $(this).is(':checked');
    });

    $('#showChannelInfo').on('click', function() {
      thisPlayer.showChannelInfo = $(this).is(':checked');
      if(thisPlayer.showChannelInfo) {
        $('#sidCh1Info').show();
        $('#sidCh2Info').show();
        $('#sidCh3Info').show();

      } else {
        $('#sidCh1Info').hide();
        $('#sidCh2Info').hide();
        $('#sidCh3Info').hide();

      }
    });

    $('#sidRecord').on('click', function() {
      thisPlayer.sidRecordStart();
    });


    $('#sidRecordStop').on('click', function() {
      thisPlayer.sidRecordStop();
    });


    document.getElementById('loadSID').addEventListener("change", function(e) {
      var file = document.getElementById('loadSID').files[0];


      var fileReader = new FileReader();
      fileReader.onload = function(e) {
var data = new Uint8Array(e.target.result);
thisPlayer.initSid(data);
//        console.log(e);
//        menu.editor.file.load(e.target.result);
        document.getElementById('loadSIDForm').reset();  

      }
      fileReader.readAsArrayBuffer(file);
      


      //var src = url.createObjectURL(file);

    }, false);


  },


  setSubtune: function(subtune) {

    if(subtune >= this.subtuneCount) {
      return;
    }
    this.subtune = subtune;
//    SIDplayer.start(this.subtune);
    var st = subtune + 1;
    var html = 'Song ' + st + ' of ' + this.subtuneCount;
    $('#sidCurrentSubtune').html(html);

    this.sidFrameperiod = SIDplayer.getframeperiod(this.subtune);
    this.sidSpeed = SIDplayer.getspeed();

    $('#sidInfo').html(this.sidTitle + ', ' + this.sidAuthor + ', ' + this.sidInfo + ', Timing: ' + this.sidSpeed);
    this.pausedSid = false;

    if(this.playingSid) {
      SIDplayer.start(this.subtune);
    }
  },
  initSid: function(data) {
    console.log('init sid');
    SIDplayer.initFromData(data);

    this.subtuneCount = SIDplayer.getsubtunes();
    this.sidTitle = SIDplayer.gettitle();
    this.sidAuthor = SIDplayer.getauthor();
    this.sidInfo = SIDplayer.getinfo();
    this.setSubtune(0);

    $('#sidInfo').html(this.sidTitle + ', ' + this.sidAuthor + ', ' + this.sidInfo + ', Timing: ' + this.sidSpeed);

//    SIDplayer.playcont();
//    this.playingSid = true;
  },

  stopSid: function() {
    this.playingSid = false;
    this.pausedSid = false;
    $('#sidPlayButton').html('Play');

  },

  playSid: function() {
    this.setupAudioContext();
    console.log('play sid');
    if(this.playingSid) {
      this.pausedSid = true;
      this.playingSid = false;
      $('#sidPlayButton').html('Play');
    } else {
      if(!this.pausedSid) {
        SIDplayer.start(this.subtune);
      }
      this.playingSid = true;
      this.pausedSid = false;
      $('#sidPlayButton').html('Pause');
    }
  },

  setupAudioContext: function() {
   //create Web Audio context and scriptNode at jsSID object initialization (at the moment only mono output)

    var thisPlayer = this;


    if(jsSID_audioCtx && jsSID_audioCtx.state != 'running') {
      jsSID_audioCtx.resume();
    }


    if( jsSID_scriptNode ) {
      return;
    }

try {
    if ( typeof AudioContext !== 'undefined') { 
      jsSID_audioCtx = new AudioContext(); 
    } else { 
      jsSID_audioCtx = new webkitAudioContext(); 
    }

    var samplerate = jsSID_audioCtx.sampleRate; 

    var bufferLength = 4096;//2048;
    SIDplayer = new jsSID(bufferLength, 0.0005, samplerate);   
    InstrumentPlayer = new jsSID(bufferLength, 0.0005, samplerate);   

//    jsSID_scriptNode = null;
    if (typeof jsSID_audioCtx.createJavaScriptNode === 'function') { 
      jsSID_scriptNode = jsSID_audioCtx.createJavaScriptNode(bufferLength,0,1); 
    } else { 
      jsSID_scriptNode = jsSID_audioCtx.createScriptProcessor(bufferLength,0,1); 
    }

    jsSID_scriptNode.onaudioprocess = function(e) { 
      //scriptNode will be replaced by AudioWorker in new browsers sooner or later
      SIDplayer.resetChannelDataPos();

      var outBuffer = e.outputBuffer; 
      var outData = outBuffer.getChannelData(0); 

      if(thisPlayer.playingSid) {
        for (var sample = 0; sample < outBuffer.length; sample++) { 
          outData[sample]=SIDplayer.play(); 
        } 

      } else {
        for (var sample = 0; sample < outBuffer.length; sample++) { 
          outData[sample]=0;
        }         
      }

      var memory = SIDplayer.getMemory();      
    }
  
    jsSID_scriptNode.connect(jsSID_audioCtx.destination);    
} catch(e) {
}

  },

  layoutViews: function() {
    var viewsHeight = SCREEN_HEIGHT - 90;
    var viewsWidth = SCREEN_WIDTH;

    var oscilloscopeWidth = (viewsWidth ) / 3;
    var oscilloscopeHeight = (viewsHeight) / 3 ;

    var barGraphWidth = 24;
    if(this.showBarGraphs) {
      barGraphWidth = 24;
    } else {
      barGraphWidth = 0;
    }


    var adsrGraphLeft = barGraphWidth;
    var adsrGraphWidth = 100;
    if(this.showADSREnvelope) {
      adsrGraphWidth = 100;
    } else {
      adsrGraphWidth = 0;
    }

    var oscilloscopeLeft = barGraphWidth + adsrGraphWidth;
    oscilloscopeWidth = SCREEN_WIDTH - oscilloscopeLeft;

  //    console.log(oscilloscopeWidth);

    if(!this.showWaveform) {
      if(this.showADSREnvelope) {
        adsrGraphWidth = SCREEN_WIDTH - adsrGraphLeft;
      } else if(this.showBarGraphs) {
        barGraphWidth = SCREEN_WIDTH - 0;
//        console.log(barGraphWidth);
      }

      oscilloscopeWidth = 0;
    }

    var sidInfoHeight = 0;
    if(this.showChannelInfo) {
      sidInfoHeight = 20;
    }


    for(var i = 0; i < 3; i++) {

      this.oscilloscopes[i].coordinates.left = oscilloscopeLeft;//oscilloscopeWidth * i;
      this.oscilloscopes[i].coordinates.right = oscilloscopeLeft + oscilloscopeWidth;//oscilloscopeWidth * i + oscilloscopeWidth;
      this.oscilloscopes[i].coordinates.bottom = SCREEN_HEIGHT - oscilloscopeHeight * i - oscilloscopeHeight + sidInfoHeight;
      this.oscilloscopes[i].coordinates.top = SCREEN_HEIGHT - oscilloscopeHeight * i;


      this.barGraphs[i].coordinates.left = 0;
      this.barGraphs[i].coordinates.right = barGraphWidth;
      this.barGraphs[i].coordinates.bottom = this.oscilloscopes[i].coordinates.bottom;
      this.barGraphs[i].coordinates.top = this.oscilloscopes[i].coordinates.top;

      this.adsrGraphs[i].coordinates.left = adsrGraphLeft;
      this.adsrGraphs[i].coordinates.right = adsrGraphLeft + adsrGraphWidth;
      this.adsrGraphs[i].coordinates.bottom =  this.oscilloscopes[i].coordinates.bottom;
      this.adsrGraphs[i].coordinates.top = this.oscilloscopes[i].coordinates.top;

      var channel = i + 1;
      var top = oscilloscopeHeight * (i + 1) - 20;
      $('#sidCh' + channel + 'Info').css('top', top + 'px');

    }


  },

  resize: function() {
    SCREEN_WIDTH = window.innerWidth;
    SCREEN_HEIGHT = window.innerHeight;

    if(SCREEN_WIDTH % 2) {
      SCREEN_WIDTH -= 1;
    }
    if(SCREEN_HEIGHT % 2) {
      SCREEN_HEIGHT -= 1;
    }

    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);    
  },

/*

  findClosestNote: function (freq) {
    var notes = SidPlayer.notes["440"];
    // Use binary search to find the closest note
    var low = -1;
    var high = notes.length;
    while (high - low > 1) {
      var pivot = Math.round((low + high) / 2);
      if (notes[pivot].frequency <= freq) {
        low = pivot;
      } else {
        high = pivot;
      }
    }

    if(low < 0 || high < 0 || low > notes.length - 1 || high > notes.length - 1) {
      return { "note": "-" };
    }
//    console.log("low = " + low + "high = " + high);

    if (Math.abs(notes[high].frequency - freq) <= Math.abs(notes[low].frequency - freq)) {
      // notes[high] is closer to the frequency we found
      this.currentNote = high;
      return notes[high];
    }

    this.currentNote = low;
    return notes[low];
  },

*/


  recordInfo: function(args) {
    if(this.doRecord) {
      var changed = false;

      if(args.waveform & 0x01) {
        if(!this.lastGate) {
          changed = true;
        }
      } else {
        if(this.lastGate) {
          changed = true;
        }
      }
      this.lastGate = (args.waveform & 0x01) != 0;

      if(args.waveform & 0x02) {
        if(!this.lastSync) {
           changed = true;
        }
      } else {
        if(this.lastSync) {
          changed = true;
        }
      }
      this.lastSync = (args.waveform & 0x02) != 0;

      if(args.waveform & 0x04) { 
        if(!this.lastRing) {
          changed = true;
        }
      } else {
        if(this.lastSync) {
          changed = true;
        }
      }
      this.lastRing = (args.waveform & 0x04) != 0;

      if(args.waveform & 0x8) {
        if(!this.lastTest) {
          changed = true;
        }
      } else {
        if(this.lastTest) {
          changed = true;
        }
      }
      this.lastTest = (args.waveform & 0x8) != 0;

      if(args.waveform & 0x10) { 
        if(!this.lastTriangle) {
          changed = true;
        }
      } else {
        if(this.lastTriangle) {
          changed = true;
        }
      }
      this.lastTriangle = (args.waveform & 0x10) != 0;

      if(args.waveform & 0x20) {
        if(!this.lastSawtooth) {
          changed = true;
        }
      } else {
        if(this.lastSawtooth) {
          changed = true;
        }
      }
      this.lastSawtooth = (args.waveform & 0x20) != 0;

      if(args.waveform & 0x40) {
        if(!this.lastPulse) {
          changed = true;
        }
      } else {
        if(this.lastPulse) {
          changed = true;
        }
      }
      this.lastPulse = (args.waveform & 0x40) != 0;

      if(args.waveform & 0x80) {
        if(!this.lastNoise) {
          changed = true;
        }
      } else {
        if(this.lastNoise) {
          changed = true;
        }
      }
      this.lastNoise = (args.waveform & 0x80) != 0;

      if(this.lastNote != args.note) {
        changed = true;
        this.lastNote = args.note;
      }


      if(changed) {
        var line = ''; 

        if(this.lastGate) {
          line += 'g';
        } else {
          line += '-';
        }

        if(this.lastSync) {
          line += 's';
        } else {
          line += '-';
        }

        if(this.lastRing) {
          line += 'r';
        } else {
          line += '-';
        }

        if(this.lastTest) {
          line += 't';           
        } else {
          line += '-';
        }

        line += ' : ';
        if(this.lastTriangle) {
          line += 't';
        } else {
          line += '-';
        }

        if(this.lastSawtooth) {
          line += 's';
        } else {
          line += '-';
        }

        if(this.lastPulse) {
          line += 'p';
        } else {
          line += '-';
        }

        if(this.lastNoise) {
          line += 'n';
        } else {
          line += '-';
        }

        line += ' : ';
        line += this.lastNote;

        this.recordData += line + '\n';
      }

    }
  },

  updatePlaybackInfo: function() {

    var recordch1 = $('#sidChannel1On').is(':checked');
    var recordch2 = $('#sidChannel2On').is(':checked');
    var recordch3 = $('#sidChannel3On').is(':checked');


    if(recordch1) {
      recordch2 = false;
      recordch3 = false;
    }

    if(recordch2) {
      recordch3 = false;
    }

    var memory = null;

    memory = SIDplayer.getMemory();
    var envelopes = SIDplayer.getEnvCnt();

    var filterCutoff = (memory[54294] << 3) + (memory[54293]);
    var ch1FilterCutoff = filterCutoff;
    var ch2FilterCutoff = filterCutoff;
    var ch3FilterCutoff = filterCutoff;
    filterCutoff = '$' + ("0000" + filterCutoff.toString(16) ).substr(-4);

//    filterCutoff = memory[54294];
    
    var resonance = (memory[54295] & 0xf0) >> 4;
    resonance = '$' + ("00" + resonance.toString(16) ).substr(-2);

    var ch1Filter = memory[54295] & 0x01;
    var ch2Filter = memory[54295] & 0x02;
    var ch3Filter = memory[54295] & 0x04;
    var filter = memory[54296];
    var lowpass = (memory[54296] & 0x10) >> 4;
    var bandpass = (memory[54296] & 0x20) >> 4;
    var highpass = (memory[54296] & 0x40) >> 4;

    if(!ch1Filter) {
      ch1FilterCutoff = 0;
    }
    if(!ch2Filter) {
      ch2FilterCutoff = 0;
    }
    if(!ch3Filter) {
      ch3FilterCutoff = 0;
    }
//PAL:  x = f * (18*2^24)/17734475   (0 - 3848 Hz)
//NTSC: x = f * (14*2^24)/14318182   (0 - 3995 Hz)
// http://sta.c64.org/cbm64sndfreq.html


    

    var PAL_PHI = 985248;
    var NTSC_PHI = 1022727; //This is for machines with 6567R8 VIC. 6567R56A is slightly different.

    var CONSTANT = Math.pow(256, 3) / PAL_PHI;//256^(3) / PAL_PHI;

    var ch1Freq = memory[0xd400] + (memory[0xd401] << 8);
    var ch1FreqHex = ch1Freq;

    var ch1FreqHz = ch1Freq / CONSTANT;
    ch1Freq = ch1FreqHz.toFixed(2) + ' Hz';
    var ch1Note = Notes.findClosestNote(ch1FreqHz);
    var ch1Cents = Notes.centsOffFromPitch(ch1FreqHz, ch1Note.frequency);
    var ch1Voice = memory[0xd404];
    var ch1PulseWidth = memory[0xd402] + ((memory[0xd403] & 0xf) << 8);
    var ch1ADSR = (memory[0xd405] << 8) + (memory[0xd406]);
    var ch1ADSRState = envelopes[0];


    var ch1PulseWidthText = ch1PulseWidth / 40.95;
    ch1PulseWidthText = ch1PulseWidthText.toFixed(2) + '%';

    var ch2Freq = memory[0xd407] + (memory[0xd408] << 8);
    var ch2FreqHex = ch2Freq;
    var ch2FreqHz = ch2Freq / CONSTANT;
    ch2Freq = ch2FreqHz.toFixed(2) + ' Hz';
    var ch2Note = Notes.findClosestNote(ch2FreqHz);
    var ch2Cents = Notes.centsOffFromPitch(ch2FreqHz, ch2Note.frequency);

    var ch2Voice = memory[0xd40b];
    var ch2PulseWidth = memory[0xd409] + ((memory[0xd40a] & 0xf) << 8);
    var ch2ADSR = (memory[0xd40c] << 8) + (memory[0xd40d]);
    var ch2ADSRState = envelopes[1];


    var ch2PulseWidthText = ch2PulseWidth / 40.95;
    ch2PulseWidthText = ch2PulseWidthText.toFixed(2) + '%';


    var ch3Freq = memory[0xd40e] + (memory[0xd40f] << 8);
    var ch3FreqHex = ch3Freq;

    var ch3FreqHz = ch3Freq / CONSTANT;
    ch3Freq = ch3FreqHz.toFixed(2) + ' Hz';
    var ch3Note = Notes.findClosestNote(ch3FreqHz);
    var ch3Cents = Notes.centsOffFromPitch(ch3FreqHz, ch3Note.frequency);

    var ch3Voice = memory[0xd412];
    var ch3PulseWidth = memory[0xd410] + ((memory[0xd411] & 0xf) << 8);

    var ch3ADSR = (memory[0xd413] << 8) + (memory[0xd414]);
    var ch3ADSRState = envelopes[2];

    var ch3PulseWidthText = ch3PulseWidth / 40.95;
    ch3PulseWidthText = ch3PulseWidthText.toFixed(2) + '%';



    this.channelInfo[0].updateInfo({ waveform: ch1Voice, 
      filter: filter, filterActive: ch1Filter, 
      cutoff: filterCutoff, res: resonance,
      freq: ch1Freq, note: ch1Note.note,  
      adsr: ch1ADSR, pulsewidth: ch1PulseWidthText });

    if(recordch1) {
      this.recordInfo({ waveform: ch1Voice,
      filter: filter, filterActive: ch1Filter,
      cutoff: filterCutoff, res: resonance,
      freq: ch1Freq, note: ch1Note.note,
      adsr: ch1ADSR, pulsewidth: ch1PulseWidthText });
    }

    this.channelInfo[1].updateInfo({ waveform: ch2Voice, 
      filter: filter, filterActive: ch2Filter, 
      cutoff: filterCutoff, res: resonance, 
      freq: ch2Freq, note: ch2Note.note, 
      adsr: ch2ADSR, pulsewidth: ch2PulseWidthText });


    if(recordch2) {
      this.recordInfo({ waveform: ch2Voice,
      filter: filter, filterActive: ch2Filter,
      cutoff: filterCutoff, res: resonance,
      freq: ch2Freq, note: ch2Note.note,
      adsr: ch2ADSR, pulsewidth: ch2PulseWidthText });
    }

    this.channelInfo[2].updateInfo({ waveform: ch3Voice, 
      filter: filter, filterActive: ch3Filter, 
      cutoff: filterCutoff, res: resonance, 
      freq: ch3Freq, note: ch3Note.note, 
      adsr: ch3ADSR, pulsewidth: ch3PulseWidthText });


    if(recordch3) {
      this.recordInfo({ waveform: ch3Voice,
      filter: filter, filterActive: ch3Filter,
      cutoff: filterCutoff, res: resonance,
      freq: ch3Freq, note: ch3Note.note,
      adsr: ch3ADSR, pulsewidth: ch3PulseWidthText });
    }

    this.barGraphs[0].updateInfo({
      adsr: ch1ADSRState,
      pulseWidth: ch1PulseWidth,
//      frequency: ch1FreqHex,
      frequency: ch1Note.index + ch1Cents / 100,
      filterCutoff: ch1FilterCutoff

      });
    this.barGraphs[1].updateInfo({
      adsr: ch2ADSRState,
      pulseWidth: ch2PulseWidth,
//      frequency: ch2FreqHex,
      frequency: ch2Note.index + ch2Cents / 100,

      filterCutoff: ch2FilterCutoff

      });
    this.barGraphs[2].updateInfo({
      adsr: ch3ADSRState,
      pulseWidth: ch3PulseWidth,
//      frequency: ch3FreqHex,
      frequency: ch3Note.index + ch3Cents / 100,

      filterCutoff: ch3FilterCutoff

      });


    this.adsrGraphs[0].addValue(ch1ADSRState);
    this.adsrGraphs[0].outputData();
    this.adsrGraphs[1].addValue(ch2ADSRState);
    this.adsrGraphs[1].outputData();
    this.adsrGraphs[2].addValue(ch3ADSRState);
    this.adsrGraphs[2].outputData();

  },



  render: function() {
    this.resize();
    this.layoutViews();

    this.updatePlaybackInfo();

    var channelData = null;
    if(this.playingSid) {
      channelData = SIDplayer.getData();

      for(var i = 0; i < 3; i++) {
        if(channelData) {
          this.oscilloscopes[i].outputData(channelData[i]);
        }
      }
    }

    for(var i = 0; i < this.views.length; i++) {
      var view = this.views[i];
      
      var left = view.coordinates.left;
      var bottom = view.coordinates.bottom;
      var width = view.coordinates.right - view.coordinates.left;
      var height = view.coordinates.top - view.coordinates.bottom;

      if(width > 0 && height > 0) {
        renderer.setViewport( left, bottom, width, height );
        renderer.setScissor( left, bottom, width, height );
        renderer.setScissorTest( true );

        renderer.setClearColor( view.background );

        view.render(left, bottom, width, height);
      }
    }



  } 
}


