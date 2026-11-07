var SAMPLES_PER_BUFFER = 8192;//8192;// allowed: buffer sizes: 256, 512, 1024, 2048, 4096, 8192, 16384


var SidPlayer = function() {
  this.isPlaying = false;
  this.isPaused = false;
  this.audioBackend = null;
  this.canvas = null;
  this.context = null;
  this.sidHasSamples = false;
  this.oscilloscopeMode = 'line';
  this.colorModeIndex = 0;
  this.colorModes = [
    { name: 'Original', line: '#ffffff', fill: 'rgba(255,255,255,0.56)', background: '#000000' },
    { name: 'Green Phosphor', line: '#78ff69', fill: 'rgba(65,255,88,0.55)', background: '#031208' },
    { name: 'Amber', line: '#ffcb60', fill: 'rgba(255,173,40,0.55)', background: '#160b00' },
    { name: 'Orange', line: '#ff7a28', fill: 'rgba(255,102,18,0.56)', background: '#130600' },
    { name: 'P1 Phosphor', line: '#b3ff83', fill: 'rgba(165,255,105,0.52)', background: '#06170a' },
    { name: 'C64 BASIC', line: '#a6a6ff', fill: 'rgba(166,166,255,0.52)', background: '#3836a6' },
    { name: 'C64 Cyan', line: '#70d7c7', fill: 'rgba(112,215,199,0.55)', background: '#24244f' },
    { name: 'Retro Magenta', line: '#ff88d0', fill: 'rgba(255,95,183,0.5)', background: '#16091d' }
  ];
  // TEST03: Automatic playlist based on documented subtune times.
  this.autoAdvance = false;
  this.autoElapsedSamples = 0;
  this.autoFallbackSeconds = 180; // Some subtunes do not specify a duration.
  this.autoLoading = false;
  this.autoCheckQueued = false;
  this.songInfo = {};
  this.currentSubsong = 0;
  this.dialogManager = null;

  this.sidInfoVisible = false;

  this.audioContext = null;
  this.scriptNode = null;

  this.sidListIndex = false;
  this.sidList = [
  ];
}

SidPlayer.prototype = {


  popPath: function(event) {
    if(typeof event != 'undefined') {
      event.preventDefault();
    }

    if(window.location.hash) {
      var id = window.location.hash;
      if(id.length > 0 && id[0] == '#') {
        id = id.substring(1);
      }
      for(var i = 0; i < this.sidList.length; i++) {
        if(this.sidList[i].id == id) {
          this.sidListIndex = i;
          var filename = this.sidList[i].file;
          this.loadSID('sids/' + filename);

          return;
        }
      }
      this.isPlaying = false;
      this.isPaused = false;
    } else {
      this.isPlaying = false;
      this.isPaused = false;

    }
  },

  setPath: function(id) {
    if(id != window.location.hash) {
      var path = window.location.pathname;
      if(id != '') {
        path += '#' + id;
      }
      window.history.pushState(null, null, path);    
    }
    
  },

  init: function() {


    this.sidList = [
      {
        id: "arkanoid",
        name: "Arkanoid",
        file: "Arkanoid.sid",
        author: "Martin Galway",
        released: "1987 Imagine",
        image: "arkanoid.gif",
        url: "http://www.lemon64.com/games/details.php?ID=145",
        c64url: "http://www.c64.com/games/53",
        size: 22910,
        links: [
          {
            name: "Martin Galway Wikipedia Entry",
            url: "https://en.wikipedia.org/wiki/Martin_Galway"
          },
          {
            name: "Arkanoid Arcade Full Soundtrack",
            url: "https://www.youtube.com/watch?v=WJhA-EIHS1o"
          },
          {
            name: "Cobra Spectrum Title Music",
            url: "https://www.youtube.com/watch?v=2lacCH2h70w"
          }
        ],
        review: 'Sound: 96%<br>"Brilliant title tune and superb sound effects"',
        reviewURL: 'http://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=24&page=39',
        info: '<p>This is the very first published tune on the C64 that used samples.</p>'
            + '<p>"Q: How did you get involved with using sampled sounds? MG: I figured out how samples were played by hacking into someone else\'s code... OK, I admit it... It was a drum synthesizer package called Digidrums, actually, so you could still say I was the first to include samples in a piece of music. [...] Never would I claim to have invented that technique, I just got it published first. In fact, I couldn\'t really figure out where they got the sample data, just that they were wiggling the volume register, so I tried to make up my own drum sample sounds in realtime - which is the flatulence stuff that shipped in \'Arkanoid\'. [...] After the project was in the shops I gained access to some real drum samples, and I slid those into my own custom version of the tune. The one that\'s in the shops is kind of a collage of farts & burps, don\'t you think? [...] Later I was able to acquire some proper drum samples and by \'Game Over\' it got quite sophisticated." (MG)</p>',    
        subsongInfo: [
          {
            "duration": "2:17",
            "name": "Title Music",
            "comment": '"I\'m glad you spotted \'Cobra\' on the Spectrum, whose tune I was in love with and HAD to use somewhere else...! I figured no-one would complain if I used it a year later [for Arkanoid] on the C64." (MG)'
          },
          {
            "duration": "1:17",
            "name": 'Hiscore Music',
            "original": 'Hiscore [from the arcade game Arkanoid]',
            "originalArtist": 'Hisayoshi Ogura (OGR/Zuntata)',
          },
          {
            "duration": "0:07",
            "name": 'Intro',
            "original": 'Intro [from the arcade game Arkanoid]',
            "originalArtist": 'Hisayoshi Ogura (OGR/Zuntata)',
          },
          {
            "duration": "0:04",
            "name": 'Level Start',
            "original": 'Level Start [from the arcade game Arkanoid]',
            "originalArtist": 'Hisayoshi Ogura (OGR/Zuntata)',
          },
          {
            "duration": "0:06",
            "name": 'Boss Level Start',
            "original": 'Boss Level Start [from the arcade game Arkanoid]',
            "originalArtist": 'Hisayoshi Ogura (OGR/Zuntata)',
          },
          {
            "duration": "0:03",
            "name": 'Game Over',
            "original": 'Game Over [from the arcade game Arkanoid]',
            "originalArtist": 'Hisayoshi Ogura (OGR/Zuntata)',
          },

          {
            "duration": "0:02",
          },
          {
            "duration": "0:05",
          },
          {
            "duration": "0:02",
            "name": "FX"
          },
          {
            "duration": "0:02",
            "name": "FX"
          },
          {
            "duration": "0:01",
            "name": "FX"
          },
          {
            "duration": "0:01",
            "name": "FX"
          },
          {
            "duration": "0:02",
            "name": "FX"
          },
          {
            "duration": "0:01",
            "name": "FX"
          },
          {
            "duration": "0:03",
            "name": "FX"
          },
          {
            "duration": "0:01",
            "name": "FX"
          },
          {
            "duration": "0:02",
            "name": "FX"
          },
          {
            "duration": "0:02",
            "name": "FX"
          },
          {
            "duration": "0:01",
            "name": "FX"
          },
          {
            "duration": "0:06",
            "name": "FX"
          }

        ]
      },
      {
        id: "bioniccommando",
        name: "Bionic Commando",
        file: "Bionic_Commando.sid",
        author: "Tim Follin",
        released: "1988 GO!/Capcom",
        image: "bionic_commando.gif",
        url: "http://www.lemon64.com/games/details.php?ID=275",
        c64url: "http://www.c64.com/games/68",
        size: 18558,
        links: [
          {
            name: "Bionic Commando Arcade Soundtrack",
            url: "https://www.youtube.com/watch?v=IZ8GyH6ZyLk&list=PLU7NOYXOjyljrxXRaaZbExdhlkDAUnbzH"
          },
          {
            name: "Binary Sunset - John Williams",
            url: "https://www.youtube.com/watch?v=u2W5YPQJqUs"
          }
        ],
        review: 'Sound: 97%<p>"Five superbly psychadelic in-game themes, a brilliantly funky title tune but no spot effects"',
        reviewURL: "http://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=039&page=012&magazine=zzap",
        info: '<p>"[...] It\'s an arcade conversion... or lets say it started like an arcade conversion! What happened was, I started converting the titletune, and it just developed, slipped out of my grip and became something, what was very different from what I had in mind, at the beginning. Quite messy!" (TF)</p>'
        + '<p>Covers the arcade version by Fujita Harumi, except tune #1 and #10.</p>',
        subsongInfo: [
          {
            duration: "0:51",
            name: "Title Music"
          },
          {
            duration: "0:08",
            name: "End of Stage"
          },
          {
            duration: "0:03",
            name: "Game Over"
          },
          {
            duration: "0:33",
            name: "Hi Score"
          },
          {
            duration: "1:44",
            name: "The Forest",
            comment: "Covers the arcade version, with Follin's own turn from 0:38."
          },
          {
            duration: "1:17",
            name: "Bionic Commando Theme",
            comment: "0:49-0:56 inspired by Binary Sunset  [from the movie Star Wars Episode IV]"
          },
          {
            duration: "1:10",
            name: "Infiltration"
          },
          {
            duration: "1:35",
            name: "Power Plant"
          },
          {
            duration: "1:10",
            name: "Stop the Missle"
          },
          {
            duration: "0:55"
          }
        ]
      },
      {
        id: "commando",
        name: "Commando",
        file: "Commando.sid",
        author: "Rob Hubbard",
        released: "1985 Elite",
        image: "commando.gif",
        url: "http://www.lemon64.com/games/details.php?ID=525",
        c64url: "http://www.c64.com/games/108",
        size: 4126,
        links: [
          {
            name: "Commando Arcade Main Theme",
            url: "https://www.youtube.com/watch?v=qX0rW4bKp3U"
          },
          {
            name: "Rob Hubbard on Commando (From Bedrooms to Billions)",
            url: "https://www.youtube.com/watch?v=ZtmUvVuWjwo"
          },
          {
            name: "Rob Hubbard performing Commando High Score",
            url: "https://www.youtube.com/watch?v=3QDWGt9WwUs"
          }
        ],
        review: 'Sound: 91%<br>"Rob Hubbard\s superb remixes of the arcade tunes"',
        reviewURL: 'http://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=10&page=26',
        info: '"There is an interesting story behind Commando. I went down to their office and started working on it late at night, and worked on it through the night. I took one listen to the original arcade version and started working on the c64 version. I think they wanted some resemblance to the arcade version, but I just did what I wanted to do. By the time everyone arrived at 8.00am in the morning, I had loaded the main tune on every C64 in the building! I got my cheque and was on a train home by 10.00 am..." (RH)',
        subsongInfo: [
          {
            "duration": "3:57",
            "name": "BGM1",
            "original": 'BGM1 [from the arcade game Commando]',
            "originalArtist": 'Tamayo Kawamoto'
          },
          {

            "duration": "1:02",
            "name": "Game Over"
          },
          { 
            "duration": "0:06",
            "name": "BGM1",
            "original": 'BGM1 [from the arcade game Commando]',
            "originalArtist": 'Tamayo Kawamoto'
          }
        ]

      },
      {
        id: "cybernoidii",
        name: "Cybernoid II",
        file: "Cybernoid_II.sid",
        author: "Jeroen Tel / Maniacs of Noise",
        released: "1988 Hewson",
        image: "cybernoid_ii.gif",
        links: [
          {
            name: "Remake of Cybernoid II by Jeroen Tel",
            url: "https://soundcloud.com/maniacs-of-noise/jeroen-tel-cybernoid-ii-master"
          },
          {
            name: "Jeroen Tel Wikipedia page",
            url: "https://en.wikipedia.org/wiki/Jeroen_Tel"
          },
          {
            name: "Maniacs of Noise website",
            url: "https://www.maniacsofnoise.com/"
          }

        ],
        url: "http://www.lemon64.com/games/details.php?ID=596",
        c64url: "http://www.c64.com/games/111",
        size: 4502,
        review: 'Sound: 88%<br>"A brilliant soundtrack (though not as punchy as the first one, we thought) and some pretty neat spot effects - just the right atmosphere"',
        reviewURL: 'http://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=43&page=16',
        subsongInfo: [
          {
            "duration": "5:46"
          },
          {
            "duration": "0:08"
          }
        ]
      },
      {
        id: "delta",
        name: "Delta",
        file: "Delta.sid",
        author: "Rob Hubbard",
        released: "1987 Thalamus",
        image: "delta.gif",
        url: "http://www.lemon64.com/games/details.php?ID=667",
        c64url: "http://www.c64.com/games/460",
        info: '<p>"[...] The Delta music loader and ingame music was Gary Liddon\'s idea. [...] He was the producer at Thalamus at the time. He told Rob Hubbard to make the ingame music like the 2nd track from Dark Side of the Moon by Pink Floyd." (Info from Matt Furniss.)</p>'
        +'<p>"The small jingles are all small clips from Sanxion and Romeo/Juliet music. They were all supposed to be for short stingers such as end of level, extra life etc..."</p>'
        + '<p>"Delta was based on this minimalist composition technique inspired by Glass and a bit of Pink Floyd. It was quite hard to do and required some custom code to the driver to do it. The music was tedious to debug. The other Delta stuff was more conventional - I quite liked the other tunes. Delta was spread over a 2 week period....." (RH)</p>'
        +'<p>According to Hubbard, Kentilla and Delta were the most complicated one to compose, they took the longest time to do and they both drove him insane.</p>',
        size: 5246,
        links: [
          {
            name: 'On the Run - Pink Floyd',
            url: 'https://www.youtube.com/watch?v=VouHPeO4Gls'
          },
          {
            name: 'Pruit Igoe - Philip Glass',
            url: 'https://www.youtube.com/watch?v=nq_SpRBXRmE'
          },
          {
            name: 'Resource - Philip Glass',
            url: 'https://www.youtube.com/watch?v=btWYiCZSvUE'
          }
        ],
        review: 'Sound: 97%<br>"Excellent Rob Hubbard soundtrack and some good spot effects."',
        reviewURL: 'http://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=24&page=102',
        subsongInfo: [
          {
            "duration": "11:22",
            "name": "In Game Music",
            "comment": "<p>0:00 Inspired by On the Run [from the Dark Side of the Moon], artist: Pink Floyd</p>"
            + "<p>4:00 Inspired by Pruit Igoe [from the movie Koyaanisqatsi], artist: Philip Glass</p>"
            + "<p>5:26 - 9:07 Inspired by Resource [from the movie Koyaanisqatsi], artist Philip Glass</p>"
          },
          {
            "duration": "0:05",
            "comment": ""
          },
          {
            "duration": "0:05",
            "comment": "Cover of Thalamusik [from Sanxion], artist Rob Hubbard"
          },
          {
            "duration": "0:11",
            "comment": "Cover of Thalamusik [from Sanxion], artist Rob Hubbard"
          },
          {
            "duration": "0:11",
            "comment": "Cover of Thalamusik [from Sanxion], artist Rob Hubbard"
          },
          {
            "duration": "0:08",
            "comment": "Cover of Thalamusik [from Sanxion], artist Rob Hubbard"
          },
          {
            "duration": "0:07",
            "comment": "The Montagues and Capulets [from Romeo and Juliet] [from Sanxion], artist Sergey Prokofiev"
          },
          {
            "duration": "0:09",
            "comment": "The Montagues and Capulets [from Romeo and Juliet] [from Sanxion], artist Sergey Prokofiev"
          },
          {
            "duration": "0:11",
            "comment": "The Montagues and Capulets [from Romeo and Juliet] [from Sanxion], artist Sergey Prokofiev"
          },
          {
            "duration": "0:13",
            "comment": "The Montagues and Capulets [from Romeo and Juliet] [from Sanxion], artist Sergey Prokofiev"
          },
          {
            "duration": "0:16",
            "comment": "The Montagues and Capulets [from Romeo and Juliet] [from Sanxion], artist Sergey Prokofiev"
          },
          {
            "duration": "1:17",
            "name": "Title Music",
            "comment": "0:00 - 0:51 Inspired by Koyaanisqatsi, artist Philip Glass"
          },
          {
            "duration": "1:17",
          }

        ]        
      },
      {
        id: "driller",
        name: "Driller",
        file: "Driller.sid",
        author: "Matt Gray",
        released: "1988 Incentive",
        image: "driller.gif",
        url: "http://www.lemon64.com/games/details.php?ID=783",
        c64url: "http://www.c64.com/games/934",
        size: 3483,
        links: [
          {
            name: "Halloween Theme - John Carpenter",
            url: "https://www.youtube.com/watch?v=Bt5rCgHN1Gc"
          }
        ],
        review: 'Sound: 92%<br>"A haunting 15 minute soundtrack helps to boost an already enthralling atmosphere"',
        reviewURL: 'http://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=33&page=12',
        info: '<p>0:35-2:10 A fast playing cover of the Halloween theme on voice 3.</p>'
              + '<p>6:40-7:40 Phantom of the Opera [from the musical]</p>',
        subsongInfo: [
          {
            "duration": "8:41"
          }
        ]
      },
      {
        id: "ghoulsnghosts",
        name: "Ghouls 'n Ghosts",
        file: "Ghouls_n_Ghosts.sid",
        author: "Tim Follin",
        released: "1989 US Gold/Capcom",
        image: "ghouls_n_ghosts.gif",
        url: "http://www.lemon64.com/games/details.php?ID=1053",
        c64url: "http://www.c64.com/games/430",
        size: 50410,
        links: [
          {
            name: "Tim Follin Wikipedia entry",
            url: "https://en.wikipedia.org/wiki/Tim_Follin"
          },
          {
            name: "Tim Follin interview on video game music",
            url: "https://www.youtube.com/watch?v=bQkicZOG-Z4"
          },
          {
            name: "Ghouls 'n Ghosts Arcade Soundtrack",
            url: "https://www.youtube.com/watch?v=axuPneWXm84"
          }

        ],
        review: 'Sound: 98%<br>"A completely amazing title tune, medieval high score tunelet, a wonderful variety of spot FX, and great in-game tune"',
        reviewURL: 'http://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=57&page=16',
        subsongInfo: [
          {
            "duration": "3:57"
          },
          {
            "duration": "1:40"
          },
          {
            "duration": "0:13"
          },
          {
            "duration": "0:10"
          },
          {
            "duration": "0:04"
          },
          {
            "duration": "2:08"
          },
          {
            "duration": "2:52"
          },
          {
            "duration": "2:28"
          },
          {
            "duration": "2:19"
          },
          {
            "duration": "1:54"
          },
          {
            "duration": "3:14"
          }
        ]
      },
      {
        id: "idplus",
        name: "IK+",
        file: "IK_plus.sid",
        author: "Rob Hubbard",
        released: "1987 System 3",
        image: "ik_plus.gif",
        url: "http://www.lemon64.com/games/details.php?ID=1271",
        c64url: "http://www.c64.com/games/249",
        review: 'Sound: 89%<br>"Crunching sound effects and great Hubbard remix"',
        reviewURL: 'http://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=31&page=12',
        info: '"I can remember IK very well, but not IK+ so that must tell me something." (RH)',
        size: 4613,
        subsongInfo: [
          {
            duration: "7:42"
          },
          {
            duration: "0:03"
          },
          {
            duration: "0:02"
          }
        ]
      },
      {
        id: "kentilla",
        name: "Kentilla",
        file: "Kentilla.sid",
        author: "Rob Hubbard",
        released: "1986 Mastertronic",
        image: "kentilla.gif",
        url: "http://www.lemon64.com/games/details.php?ID=1423",
        c64url: "http://www.c64.com/games/200",
        size: 4474,
        review: '"The game features 12 minutes of pure, unadulterated Rob Hubbard"',
        reviewURL: 'http://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=14&page=73',
        info: '<p>"The whole thing was originally intended to be \'interactive music\', responding to the different scenes in the game. I originally wrote it to work in this fashion, but as per usual in the software business, time ran out and they couldn\'t wait the extra three weeks to finish off the music and implement it the way I wanted. So I hacked and linked all the different bits together into one long piece." (RH)</p>'
        +'<p>According to Hubbard, Kentilla and Delta were the most complicated one to compose, they took the longest time to do and they both drove him insane.</p>',
        subsongInfo: [
          {
            duration: "12:59"
          }
        ]

      },
      {
        id: "montyontherun",
        name: "Monty on the Run",
        file: "Monty_on_the_Run.sid",
        author: "Rob Hubbard",
        released: "1985 Gremlin Graphics",
        image: "monty_on_the_run.gif",
        url: "http://www.lemon64.com/games/details.php?ID=1705",
        c64url: "http://www.c64.com/games/570",
        size: 5758,
        links: [
          {
            name: 'Devil\'s Gallop - Charles Williams',
            url: 'https://www.youtube.com/watch?v=e7bsL00aCGg'
          }
        ],
        review: 'Sound: 99%<br>"Aurally am-m-m-mazing, technically perfect"',
        reviewURL: 'http://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=6&page=16',
        subsongInfo: [
          {
            "duration": "5:51",
            "comment": 
//              'Inspired by The Devil\'s Gallop [from the Dick Barton radio show] by Charles Williams<br/><br/>'
              '<p>Inspired by the song Devil\'s Gallop (by Charles Williams), which was the title theme for the 1940\'s American detective radio show "Dick Barton".</p>'
              +'<p>"Monty [...] started out as the theme from the old radio detective show, Dick Barton" (RH, in the UK magazine "Popular Computing")</p>'
              + '<p>"MOTR was supposed to be this run around like a madman type music and has lots of energy. The middle section was an excuse to use the new pitch bend code that I wrote for this project." (RH)</p>'
              
          },
          {
            "duration": "0:12"
          },
          {
            "duration": "2:44"
          }
        ]
      },
      {
        id: "mutants",
        name: "Mutants",
        file: "Mutants.sid",
        author: "Fred Grey",
        released: "1987 Ocean",
        c64url: "http://www.c64.com/games/1063",
        image: "mutants.gif",
        url: "http://www.lemon64.com/games/details.php?ID=1757",
        links: [
          {
            name: "Fred Gray performing Mutants Live",
            url: "https://www.youtube.com/watch?v=9D5JeGplnB8"
          },
          {
            name: "Fred Gray on Composing Mutants (From Bedrooms to Billions)",
            url: "https://www.youtube.com/watch?v=UN8lvOKWH6A"
          }
        ],
        size: 3892,
        info: 'I spent more time programming than composing, trying ideas. The bass line eventually ended up as the lead line. haha... I love the second Mutants tune, it\'s very hypnotic." (FG)',
        review: 'Sound: 86%<br>"Two excellent tunes and sound effects"',
        reviewURL: 'http://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=23&page=34',
        subsongInfo: [
          {
            duration: "4:10"
          },
          {
            duration: "2:20"
          }
        ]

        
      },
      {
        id: "parallax",
        name: "Parallax", 
        file: "Parallax.sid",
        author: "Martin Galway",
        released: "1986 Ocean",
        image: "parallax.gif",
        url: "http://www.lemon64.com/games/details.php?ID=1889",
        c64url: "http://www.c64.com/games/1089",
        size: 7294,
        links: [
          {
            name: "Rendez-vous - Jean Michel Jarre",
            url: "https://www.youtube.com/watch?v=URaWRK7vqDE"
          }
        ],
        review: 'Sound: 93%<br>"Good FX and jingles, and a weird but wonderful piece of music on the title screen."',
        reviewURL: 'http://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=18&page=28',
        info: '<p>Before starting on this game Galway bought Rendez-vous (by Jean Michel Jarre). He listened to it daily. His CD player broke 2 weeks later and didn\'t get repaired for 2 months, during which time Martin worked on Parallax, without realizing that Rendez-vous was unconsciously creeping into the music. He realized it only after he played the album again after the game was already shipped.</p>'
         +'<p>"[Parallax] was 11 minutes long, certainly my longest at the time. I took my development gear home to work on it for a week or two. I just said to myself \'OK, it\'s going to be this mega-tune, so the intro has to be mega\'. The intro took up two-thirds of the tune! I actually got bored with it, and stuck that silly melody on the end which doesn\'t really match. Going back I would have made it less melodic. I wanted to reflect the gigantic visual proportions represented by the parallax effect in the game so that\'s why it has an \'epic\' feel."(MG)</p>',
        subsongInfo: [
          {
            "duration": "11:24",
            "name": "Title Music",
            "comment": 'Inspired by Rendez-vous [from Rendez-vous] by Jean Michel Jarre'
          },
          {
            "duration": "6:58",
            "name": "High Score Music"
          },
          {
            "duration": "0:25",
            "name": "Game Over Music"
          },
          {
            "duration": "1:48",
            "name": "Outside Ship Music"
          },
          {
            "duration": "0:06",
            "name": "Game Start Music"
          }

        ]
      },
      {
        id: "rtype",
        name: "R-Type",
        file: "R-Type.sid",
        author: "Chris Hülsbeck & Ramiro Vaca",
        released: "1988 Activision",
        image: "r-type.gif",
        url: "http://www.lemon64.com/games/details.php?ID=2184",
        c64url: "http://www.c64.com/games/279",
        size: 40666,
        links: [
          {
            name: "R-Type Arcade",
            url: "https://www.youtube.com/watch?v=9IQXtVNGtHM"
          }
        ],
        review: 'Sound: 52%<br/>"Annoying tune (which can\'t be turned off) and crass spot effects"',
        reviewURL: 'http://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=47&page=73',
        info: 'Very interesting story here. Katakis was released in September 1988 by Rainbow Arts, however it never got a release in the UK as Activision had it cancelled because of similarities to R-type, to which Activision had bought the conversion rights. Activision were getting nowhere with their conversion of R-Type and they liked what they saw of Katakis, so they hired the same programming team (Manfred Trenz and others) to do the C64 conversion. They only got 6 weeks to write the conversion, and sadly, it shows. Katakis was eventually altered and released as Denaris in 1989. Tunes #2 to #14 all cover of the arcade game.',
        subsongInfo: [
          {
            "duration": "2:11",
            "name": "Title Music",
            "author": "Chris Hülsbeck"
          },
          {
            "duration": "0:36",
            "author": "Chris Hülsbeck",
            "name": "Scoring",
            "original": "Scoring (High Score display) [from the arcade game R-type]",
            "originalArtist": "Irem Sound Team"
          },
          {
            "duration": "0:26",
            "author": "Chris Hülsbeck",
            "name": "Like a Hero (Game Complete)",
            "original": "Like a Hero (Game Complete) [from the arcade game R-type]",
            "originalArtist": "Irem Sound Team"
          },
          {
            "duration": "0:54",
            "name": "Battle Theme (Stage 1)",
            "author": "Ramiro Vaca",
            "original": "Battle Theme (Stage 1) [from the arcade game R-type]",
            "originalArtist": "Irem Sound Team"
          },
          {
            "duration": "0:36",
            "name": "Monster Beat (Stage 2)",
            "author": "Ramiro Vaca",
            "original": "Monster Beat (Stage 2) [from the arcade game R-type]",
            "originalArtist": "Irem Sound Team"
          },
          {
            "duration": "1:02",
            "name": "Battle Pressure (Stage 3)",
            "author": "Ramiro Vaca",
            "original": "Battle Pressure (Stage 3) [from the arcade game R-type]",
            "originalArtist": "Irem Sound Team"
          },
          {
            "duration": "0:31",
            "name": "Butsu Butsuc (Stage 4)",
            "author": "Ramiro Vaca",
            "original": "Butsu Butsuc (Stage 4) [from the arcade game R-type]",
            "originalArtist": "Irem Sound Team"
          },
          {
            "duration": "0:20",
            "name": "Stage 5",
            "author": "Ramiro Vaca",
            "original": "Stage 5 [from the arcade game R-type]",
            "originalArtist": "Irem Sound Team"
          },
          {
            "duration": "0:41",
            "author": "Chris Hülsbeck", 
            "name": "Scrambled Crossroad (Stage 6)",
            "original": "Scrambled Crossroad (Stage 6) [from the arcade game R-type]",
            "originalArtist": "Irem Sound Team"
          },
          {
            "duration": "0:31",
            "author": "Ramiro Vaca",
            "name": "Ogorerumono wa Hisasikarasu (Stage 7)",
            "original": "Ogorerumono wa Hisasikarasu (Stage 7) [from the arcade game R-type]",
            "originalArtist": "Irem Sound Team"
          },
          {
            "duration": "0:36",
            "name": "Stage 8",
            "author": "Chris Hülsbeck",            
            "original": "Stage 8 [from the arcade game R-type]",
            "originalArtist": "Irem Sound Team"
          },
          {
            "duration": "0:19",
            "name": "Boss Theme",
            "author": "Ramiro Vaca",            
            "original": "Boss Theme (End of Level Boss BGM) [from the arcade game R-type]",
            "originalArtist": "Irem Sound Team"
          },
          {
            "duration": "0:06",
            "name": "The End of a War (Game Over)",
            "author": "Ramiro Vaca",            
            "original": "The End of a War (Game Over) [from the arcade game R-type]",
            "originalArtist": "Irem Sound Team"
          },
          {
            "duration": "0:08",
            "name": "Return in Triumph (Stage Clear)",
            "author": "Ramiro Vaca",            
            "original": "Return in Triumph (Stage Clear) [from the arcade game R-type]",
            "originalArtist": "Irem Sound Team"
          }

        ]
      },
      {
        id: "robocop3",
        name: "Robocop 3",
        file: "RoboCop_3.sid",
        author: "Jeroen Tel / Maniacs of Noise",
        released: "1992 Ocean",
        image: "robocop_3.gif",
        url: "http://www.lemon64.com/games/details.php?ID=2159",
        c64url: "http://www.c64.com/games/659",

        size: 10559,
        links: [
          {
            name: "Jeroen Tel performing Robocop 3",
            url: "https://www.youtube.com/watch?v=HiQrUDIah4E"
          },
          {
            name: "Jeroen Tel Wikipedia page",
            url: "https://en.wikipedia.org/wiki/Jeroen_Tel"
          },
          {
            name: "Maniacs of Noise website",
            url: "https://www.maniacsofnoise.com/"
          }
        ],
        info: '"A FUN note about song #4 & #5: they\'re both 1 channel only!" (JT)"',
        review: 'Sound: 90%<br/>"Classic Jeroen Tel music accompanies all levels"',
        reviewURL: 'http://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=82&page=16',
        subsongInfo: [
          {
            "duration": "3:56"
          },
          {
            "duration": "0:09"
          },
          {
            "duration": "0:16"
          },
          {
            "duration": "0:24"
          },
          {
            "duration": "0:12"
          },
          {
            "duration": "0:01"
          },
          {
            "duration": "0:01"
          },
          {
            "duration": "0:01"
          },
          {
            "duration": "0:02"
          },
          {
            "duration": "0:01"
          },
          {
            "duration": "0:01"
          },
          {
            "duration": "0:01"
          },
          {
            "duration": "0:05"
          },
          {
            "duration": "0:01"
          },
          {
            "duration": "0:01"
          },
          {
            "duration": "0:03"
          },
          {
            "duration": "0:02"
          }
        ]
      },      
      {
        id: "sanxion",
        name: "Sanxion",
        file: "Sanxion.sid",
        author: "Rob Hubbard",
        released: "1986 Thalamus",
        image: "sanxion.gif",
        url: "http://www.lemon64.com/games/details.php?ID=2217",
        c64url: "http://www.c64.com/games/281",
        size: 123213,
        links: [
          {
            name: "Zoolook - Jean Michel Jarre",
            url: 'https://www.youtube.com/watch?v=-F36bJ57TmM'
          },
          {
            name: "The Montagues and Capulets - Sergey Prokofiev",
            url: 'https://www.youtube.com/watch?v=ljOMXgfflRI'
          }
        ],
        review: 'Sound 97%<br/>"The Rob Hubbard loading music is one of his best compositions; the title screen music and spot FX are also superb"',
        reviewURL: 'http://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=019&page=122&magazine=zzap',
        info: '"I think this has a bit of character about it. [...] Sanxion was a lot of fun, inspired by Zoolook by Jarre. Also Romeo and Juliet was used (not my idea but Gary Liddon\'s idea). I think most people remember the main theme. I think the solo is very melodic and is the best part of the tune...." (RH)',
        subsongInfo: [
          {
            duration: "5:34",
            name: 'Thalamusik',
            comment: '"As I recall, the inspiration may have been about the time I bought Zoolook. There was only 2 tracks that I liked on that album. I think the synth solo in Sanxion is actually pretty melodic, even after all these years! I did do a much slower version on the Amiga once, but have no idea what ever happened to it."'
          },
          {
            duration: "3:06",
            comment: 'Inspired by The Montagues and Capulets [from Romeo and Juliet], Artist: Sergey Prokofiev'
          }
        ]
      },

      {
        id: "stormlord",
        name: "Stormlord",
        file: "Stormlord.sid",
        author: "Johannes Bjerregaard, Jeroen Tel",
        released: "1989 Hewson/Maniacs of Noise",
        image: "stormlord.gif",
        url: "http://www.lemon64.com/games/details.php?ID=2490",
        c64url: "http://www.c64.com/games/2052",

        size: 36318,
        links: [
          {
            name: "Jeroen Tel Wikipedia page",
            url: "https://en.wikipedia.org/wiki/Jeroen_Tel"
          },
          {
            name: "Maniacs of Noise website",
            url: "https://www.maniacsofnoise.com/"
          }        
        ],
        review: 'Sound: 82%<br>"Plenty of jingles throughout and a good title tune"',
        reviewURL: 'http://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=51&page=15',
        subsongInfo: [
          {
            duration: "6:09",
            author: "Jeroen Tel"
          },
          {
            duration: "6:28",
            author: "Johannes Bjerregaard"
          },
          {
            duration: "8:58",
            author: "Johannes Bjerregaard"
          },
          {
            duration: "0:03",
            author: "Johannes Bjerregaard"
          },
          {
            duration: "0:07",
            author: "Johannes Bjerregaard"
          },
        ]
      },
      {
        id: "tetris",
        name: "Tetris",
        file: "Tetris.sid",
        author: "Wally Beben",
        released: "1988 Mirrorsoft",
        image: "tetris.gif",
        url: "http://www.lemon64.com/games/details.php?ID=2627",
        c64url: "http://www.c64.com/games/233",
        size: 13665,
        info: '',
        review: 'Sound: 98%<br>"An exquisite 25-minute soundtrack runs throughout"',
        reviewURL: 'http://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=033&page=030&magazine=zzap',
        subsongInfo: [
          {
            "duration": "25:54",
            "comment": "Does not cover the arcade version."
          }
        ]
      },
      {
        id: "thelastninja",
        name: "The Last Ninja",
        file: "Last_Ninja.sid",
        author: "Ben Daglish & Anthony Lees",
        released: "1987 System 3",
        image: "last_ninja.gif",
        url: "http://www.lemon64.com/games/details.php?ID=1488",
        c64url: "http://www.c64.com/games/259",
        info: '<p>"I got the phone call from Mark [Cale] asking me to write some level tunes - I wrote the music, went down there [to System 3] to meet Archer Maclean (? I think it was Arch that put the driver in.....), got offered Mark Cale\'s slightly-dodgy-import-status left-hand-drive BMW, said "no thanks, I\'ll have the cash please" and that was that." (BD)</p>'
              + '<p> Q: How was Anthony Lees to work with? A: "Only met the guy once - on that one day - he said \'hi\' - I said \'hi\' - that was about it." (BD)</p>'
              + '<p> The titles of the individual tunes found below are based on as they appear in the game.</p>',        
        size: 35617,
        links: [
          {
            name: "Ben Daglish Wikipedia page",
            url: "https://en.wikipedia.org/wiki/Ben_Daglish"
          },
          {
            name: "Ben Daglish Interview",
            url: "https://www.youtube.com/watch?v=qhv6U8Wm0GY"
          }
        ],
        review: 'Sound: 88%<br>"Twelve pleasant and suitably Oriental tunes, adding greatly to the tension and atmosphere"',
        reviewURL: 'http://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=28&page=104',
        subsongInfo: [
          {
            duration: "4:52",
            name: "The Wilderness (loader)",
            author: "Anthony Lees"
          },
          {
            duration: "4:37",
            name: "Palace Gardens (loader)",
            author: "Anthony Lees",
            comment: '"I did six tunes for LN, the first of which was the one involving the creepy jungle music (....which was and still is my favourite) - the inspiration is hard to nail down, but it was probably the film \'Apocalypse Now\' - very dense, troubled and scary moods were evoked." (Comment from Anthony Lees)'
          },
          {
            duration: "4:22",
            name: "The Wastelands (loader)",
            author: "Ben Daglish"
          },
          {
            duration: "4:06",
            name: "The Palace (loader)",
            author: "Anthony Lees"
          },
          {
            duration: "4:37",
            name: "The Inner Sanctum (loader)",
            author: "Anthony Lees",
            comment: 'Interesting comment in this binary: "DONE BY ANTHONY LEES FOR SYSTEM 3 ON 5/4/87...EAT YER HEART OUT GALWAY!".'
          },
          {
            duration: "3:59",
            name: "The Wastelands",
            author: "Ben Daglish"
          },
          {
            duration: "4:00",
            name: "The Wilderness",
            author: "Ben Daglish"
          },
          {
            duration: "4:20",
            name: "Palace Gardens",
            author: "Ben Daglish"
          },
          {
            duration: "5:31",
            name: "The Dungeons",
            author: "Anthony Lees"
          },
          {
            duration: "4:10",
            name: "The Palace",
            author: "Anthony Lees"
          },
          {
            duration: "3:41",
            name: "The Dungeons (loader)",
            author: "Ben Daglish",
            comment: 'This is also the tune for "The Inner Sanctum".'
          }

        ]
      },
      {
        id: "thelastninja2",
        name: "The Last Ninja 2",
        file: "Last_Ninja_2.sid",
        author: "Matt Gray",
        released: "1988 System 3",
        image: "last_ninja_2.gif",
        url: "http://www.lemon64.com/games/details.php?ID=1489",
        c64url: "http://www.c64.com/games/258",
        size: 39643,
        links: [
          {
            name: "Preview of remake of Central Park by Matt Gray",
            url: "https://soundcloud.com/mattgrayc64/matt-gray-last-ninja-2-central-park-in-game-new-preview"
          },
          {
            name: "Reformation C64 Track Remakes by Matt Gray (Last Ninja 2) Pre-order page",
            url: "http://files.c64audio.com/reformation.html"
          },
          {
            name: "Beat Dis - Bomb the Bass",
            url: "https://www.youtube.com/watch?v=W6CJmJ5p3Ow"
          },
          {
            name: "Midnight in Tula - Tangerine Dream",
            url: "https://www.youtube.com/watch?v=oF9fkw99k7s"
          }

        ],
        review: 'Sound: 92%<br>No sound effects, but 12 quality varied tunes',
        reviewURL: 'http://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=41&page=16',
        subsongInfo: [
          {
            duration: "4:28",
            name: "Central Park (loader)"
          },
          {
            duration: "5:39",
            name: "Central Park (in-game)"
          },
          {
            duration: "5:04",
            name: "The Street (loader)"
          },
          {
            duration: "5:33",
            name: "The Street (in-game)"
          },
          {
            duration: "3:58",
            name: "The Sewers (loader)"
          },
          {
            duration: "6:09",
            name: "The Sewers (in-game)",
            comment: "3:31 - 8:36 Possibly inspired by Kentilla, artist Rob Hubbard. Only the part from 6:10-8:36 in Kentilla is covered here, mostly the bassline of it. It is quite possible that both Kentilla and this tune is a cover of a third one, though."
          },
          {
            duration: "3:47",
            name: "The Basement (loader)"
          },
          {
            duration: "5:04",
            name: "The Basement (in-game)"
          },
          {
            duration: "3:48",
            name: "The Office (loader)",
            comment: "Possibly inspired by Beat Dis [from Into The Dragon], artist Bomb the Bass. Bits and pieces, not the whole music. The bassline mimics the original pretty well."
          },
          {
            duration: "4:37",
            name: "The Office (in-game)",
            comment: "Inspired by Midnight In Tula [from White Eagle], artist Tangerine Dream. It's not a complete one-to-one implementation, 'cause Matt added some of his own flavor to the muse, but it's quite obvious where he got the idea from in the first minute or so. ;)"
          },
          {
            duration: "2:06",
            name: "The Mansion (loader)",
          },
          {
            duration: "7:54",
            name: "The Mansion (in-game)/The Final Battle (in-game)",
            comment: "0:00-1:35, 2:37-2:52 Possibly inspired by Midnight In Tula [from White Eagle], artist Tangerine Dream. 4:10-4:25 The Last Ninja - The Wastelands, artist Ben Danglish"
          },
          {
            duration: "3:32",
            name: "The Final Battle (loader)"
          }

        ]
      },
      {
        id: "turbooutrun",
        name: "Turbo Outrun",
        file: "Turbo_Outrun.sid",
        author: "Jeroen Tel / Maniacs of Noise",
        released: "1989 US Gold/Probe",
        image: "turbo_outrun.gif",
        url: "http://www.lemon64.com/games/details.php?ID=2726",
        c64url: "http://www.c64.com/games/304",
        size: 56430,
        links: [
          {
            name: "Turbo OutRun Arcade Music",
            url: "https://www.youtube.com/watch?v=hFDXSZ1xCbY&list=PLJM0SPPa6CBLQp2pi4vGeR3DE3HTEa53u"
          },
          {
            name: "Jeroen Tel Wikipedia page",
            url: "https://en.wikipedia.org/wiki/Jeroen_Tel"
          },
          {
            name: "Maniacs of Noise website",
            url: "https://www.maniacsofnoise.com/"
          }        

        ],

        info: '<p>Most of the tunes are heavily inspired by the music in the arcade game.</p>'
        +'<p>"Turbo Outrun took about a month all together. It was a lot of fun, but I recomposed every tune about three times to get it perfect. I still think it is one of the best audio tracks I ever did on the C64."</p>'
        +'<p>"One nice, very nice note: \'Turbo Outrun\' (the music) has won the: \'Best music on 8bit computer 1989\' award (at the PCW show (now ECTS) in London. :D Too bad I had to find out later. US Gold received the actual award. Bastards! I wasn\'t even at the scene when it was presented. :( " (JT)</p>',
        review: 'Sound: 96%<br/>"Incredible in-game tunes from the Maniacs of Noise and great FX"',
        reviewURL: 'http://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=56&page=8',
        subsongInfo: [
          {
            duration: "7:55",
            name: "Intro",
            original: "Magical Sound Shower [from the arcade game Out Run]",
            originalArtist: "Hiroshi Miyauchi (Hiro/SEGA Sound Team)",
            comment: 'Featuring the sampled voice of Jeroen Tel himself. "I\'m actually saying: \'one two TREE\', \'cause sampling THREE would make it sound like \'one two FREE\' and that\'s not what I wanted. ;P" (JT)'
          },
          {
            duration: "3:38",
            name: "Title"
          },
          {
            duration: "0:39",
            name: "Opening",
            original: "Vivacious [from the arcade game Turbo OutRun]",
            originalArtist: "Yasuhiro Takagi (YAS/SEGA Sound Team)"
          },
          {
            duration: "0:04",
            name: "Start"
          },
          {
            duration: "1:24",
            name: "Level 1",
            original: "Shake The Street [from the arcade game Turbo OutRun]",
            originalArtist: "Yasuhiro Takagi (YAS/SEGA Sound Team)"
          },
          {
            duration: "1:17",
            name: "Level 2",
            original: "Who Are You? [from the arcade game Turbo OutRun]",
            originalArtist: "Yasuhiro Takagi (YAS/SEGA Sound Team)"
          },
          {
            duration: "1:44",
            name: "Level 3",
            original: "Rush a Difficulty [from the arcade game Turbo OutRun]",
            originalArtist: "Yasuhiro Takagi (YAS/SEGA Sound Team)"
          },
          {
            duration: "0:47",
            name: "Level 4",
            original: "Keep Your Heart [from the arcade game Turbo OutRun]",
            originalArtist: "Yasuhiro Takagi (YAS/SEGA Sound Team)"            
          },
          {
            duration: "0:14",
            name: "Tune Up",
            original: "Shopping [from the arcade game Fantasy Zone]",
            originalArtist: "SEGA Sound Team",
            comment: 'Also used in "Hotrod" as tune #8. This is based on a version of the tune found in Turbo OutRun, called "A Huge Pile Of Parts".'
          },
          {
            duration: "0:06",
            name: "End"
          },
          {
            duration: "0:31",
            name: "Ending",
            original: "Easy Going [from the arcade game Turbo OutRun]",
            originalArtist: "Yasuhiro Takagi (YAS/SEGA Sound Team)"
          },
          {
            duration: "0:39",
            name: "You Did It",
            original: "Checker Flag [from the arcade game Turbo OutRun]",
            originalArtist: "Yasuhiro Takagi (YAS/SEGA Sound Team)"
          },
        ]

      },

      {
        id: "wizball",
        name: "Wizball",
        file: "Wizball.sid",
        author: "Martin Galway",
        released: "1987 Ocean",
        image: "wizball.gif",
        url: "http://www.lemon64.com/games/details.php?ID=2881",
        c64url: "http://www.c64.com/games/2035",
        size: 8448,
        review: 'Sound: 96<br/>"Fabulous title tune and jingles, and good spot effects"',
        reviewURL: "http://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=27&page=14",
        subsongInfo: 
          [
            {
              "subsong": 1,
              "name": "Filth Raid",
              "duration": "0:06" 
            },


            {
              "subsong": 2,
              "duration": "1:39" 
            },
            {
              "subsong": 3,
              "name": "Transition to",
              "duration": "0.03" 
            },
            {
              "subsong": 4,
              "duration": "3:34", 
              "name": "Title Music",
              "comment": '<p>"I was working at the Sensible Software office at the time of the major music creation, but the title screen music never got finished. When I returned to Ocean I got on with some other things, all the time worrying about this unfinished tune. Finally I slapped something on the end of it. I knew I could never top the first part, that\'s what the problem was. In my mind the second part of the tune is pretty lame compared with the first part. But for some people it represents the mysterious, magical, unconventional aspect of \'Wizball\' so it fits in some ways. But you can tell it\'s not really like the other music in the game, which was primarily developed when I was with the Sensi boys, basking in that Sensi VIBE." (MG)</p>'
              +'<p>"I really worked on the sound design of the voices a lot. The music seems to "flow" and "breathe" unlike anything before it." (MG)</p>'
            },
            {
              "subsong": 5,
              "duration": "2:59", 
              "name": "Bonus Screen Music",
              "comment": '"Tune 5, the bonus screen tune, consists of several short riffs, and John Hare came up with the most musical ones on his bass guitar. I remember he would come up with the riffs, playing them over and over at full volume on his band\'s P.A. in their rented terraced house in Southend (not caring about what the neighbours thought!!!) - and while they went out to get me a "blow-out" burger at 3am, I would be transcribing it and enhancing it (a little)." (MG)'             
            },
            {
              "subsong": 6,
              "name": "Get Ready Music",
              "duration": "0:06"
            },
            {
              "subsong": 7,
              "duration": "2:14",
              "name": "High Score Music",
              "comment": '"I composed the high-score music at Ocean after returning from Southend. Played it on the synth keyboard there. It\'s one of the few compositions of mine that I can actually play a decent rendition of on the piano." (MG)'
            },
            {
              "subsong": 8,
              "duration": "0:06",
              "name": "Game Over",
              "comment": '"Chris Yates wrote the game over riff on his electric guitar. They were pretty impressed by the translation when they came back with my blow-out." (MG)'
            },
            {
              "subsong": 9,
              "duration": "1:06"
            }

          ]
               
      },

      {
        id: "zoids",
        name: "Zoids",
        file: "Zoids.sid",
        author: "Rob Hubbard",
        released: "1986 Martech",
        image: "zoids.gif",
        url: "http://www.lemon64.com/games/details.php?ID=2947",
        c64url: "http://www.c64.com/games/2056",
        size: 2814,        
        links: [
          {
            name: "Ancestors - Synergy",
            artist: "Synergy",
            url: "https://www.youtube.com/watch?v=iepAlfoPNaY"
          }
        ],
        info: '"Inspired by a Synergy tune." (RH)',
        review: 'Sound: 91%<br>"An atmospheric Rob Hubbard piece which suits the game perfectly."',
        reviewURL: 'http://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=12&page=20',
        subsongInfo: [
          {
            "duration": "5:04",
            "comment": "Inspired by Ancestors by Synergy"
          },
          {
            "duration": "0:08",
            "comment": "Inspired by Ancestors by Synergy"
          },
          {
            "duration": "0:16",
            "comment": "Inspired by Ancestors by Synergy"            
          },
        ]
      }

    ];

    this.initFileSelection();

    this.dialogManager = new DialogManager();
    this.dialogManager.init();

    var sidPlayer = this;
//    this.audioBackend = new SIDBackendAdapter()
    $('#oscilloscopeColorButton').on('click', function() {
      sidPlayer.colorModeIndex = (sidPlayer.colorModeIndex + 1) % sidPlayer.colorModes.length;
      sidPlayer.applyOscilloscopeColors();
      sidPlayer.render();
    });

    $('#oscilloscopeModeButton').on('click', function() {
      sidPlayer.oscilloscopeMode = sidPlayer.oscilloscopeMode === 'line' ? 'filled' : 'line';
      $(this).text(sidPlayer.oscilloscopeMode === 'filled' ? 'Wave: Filled' : 'Wave: Line');
      $(this).attr('aria-pressed', sidPlayer.oscilloscopeMode === 'filled' ? 'true' : 'false');
      sidPlayer.render();
    });

    $('#playButton').on('click', function() {
      sidPlayer.play();
    });

    $('#stopButton').on('click', function() {
      sidPlayer.stop();
    });

    $('#nextButton').on('click', function() {
      sidPlayer.nextSubsong();
    });
    $('#prevButton').on('click', function() {
      sidPlayer.prevSubsong();
    });

    $('#chooseSid').on('click', function() {
      sidPlayer.showChooseSid();
    });

    $('#autoAdvanceButton').on('click', function() {
      sidPlayer.autoAdvance = !sidPlayer.autoAdvance;
      sidPlayer.updateAutoButton();
      // Turning AUTO on starts from the currently playing subtune's elapsed time.
      sidPlayer.checkAutoAdvance();
    });

    $('#nextSid').on('click', function() {
      sidPlayer.nextSid();
    });

    $('#chooseSidClose').on('click', function() {
      sidPlayer.dialogManager.hideDialog();
    });

    $('#aboutButton').on('click', function() {
      sidPlayer.dialogManager.showDialog('aboutDialog');
    });

    $('#aboutSIDButton').on('click', function() {
      sidPlayer.dialogManager.showDialog('aboutSIDDialog');
    });
    $('#aboutClose').on('click', function() {
      sidPlayer.dialogManager.hideDialog();
    });

    $('.voiceCheckbox').on('click', function() {
      sidPlayer.setVoices();
    });


    $('body').on('drag dragstart dragend dragover dragenter dragleave drop', function(e) {
      e.preventDefault();
      e.stopPropagation();
    });

    $('body').on('drop', function(e) {
      var droppedFiles = e.originalEvent.dataTransfer.files;
      if(droppedFiles.length > 0) {
        sidPlayer.loadSIDFile(droppedFiles[0]);
      }
    }); 

    $('#closeSidInfo').on('click', function() {
      sidPlayer.showSIDInfo(false);
    });

    $('#sidFileOpen').on('click', function() {
      document.getElementById('sidfile').click();      
    });

    document.getElementById('sidfile').addEventListener("change", function(e) {
      var file = document.getElementById('sidfile').files[0];
      sidPlayer.loadSIDFile(file);
    });


    window.addEventListener('resize', function(event) { sidPlayer.resize(event) }, false);
    window.addEventListener('popstate', function(event) { sidPlayer.popPath(event) }, false);    


    window.addEventListener('mousedown', function(event) {
      sidPlayer.mouseDown(event);
    }, false); 
    window.addEventListener('mousemove', function(event) {
      sidPlayer.mouseMove(event); 
    }, false); 
    window.addEventListener('mouseup', function(event) {
      sidPlayer.mouseUp(event);
    }, false); 

    window.addEventListener('keyup', function(event) {
      if(event.keyCode == 32) {
        sidPlayer.play();
        event.preventDefault();
      }
    }, false);


    this.canvas = document.getElementById('sidDisplay');
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.context = this.canvas.getContext("2d");

    this.showChooseSid();

  },


  mouseDown: function(event) {
    this.dialogManager.mouseDown(event);
    event.preventDefault();
  },

  mouseMove: function(event) {
    this.dialogManager.mouseMove(event);
    event.preventDefault();
  },
  mouseUp: function(event) {
    this.dialogManager.mouseUp(event);
    event.preventDefault();
  },


  showChooseSid: function() {
    this.dialogManager.showDialog('chooseSidDialog');
  },

  setVoices: function() {
    var mask = 0;
    if($('#voice1').is(':checked')) {
      mask = mask | 1;
    }
    if($('#voice2').is(':checked')) {
      mask = mask | 2;
    }
    if($('#voice3').is(':checked')) {
      mask = mask | 4;
    }
    if($('#voice4').is(':checked')) {
      mask = mask | 8;
    }
    SID.enableVoices(mask);

    SID.setFilterEnabled($('#filterEnabled').is(':checked'));

  },
  initFileSelection: function() {
    var html = '';
    for(var i = 0; i < this.sidList.length; i++) {
      html += '<div class="sidListEntry" value="' + i + '">';

      html += '<div class="thumbnail" style="display: inline-block">';
      html += '<img src="images/' + this.sidList[i].image + '" width="64" height="40"/>'
      html += '</div>';

      html += '<div class="sidListEntryInfo" style="display: inline-block">';
      html += '<div class="sidTitle">' + this.sidList[i].name + '</div>';
      html += '<div class="sidAuthor">' + this.sidList[i].author + '</div>';
      html += '<div class="sidReleased">' + this.sidList[i].released + '</div>';
      html += '</div>';

      html += '</div>';
    }

    $('#sidList').html(html);

    var sidPlayer = this;
    $('.sidListEntry').on('click', function() {
      var index = parseInt($(this).attr('value'), 10);
      var filename = sidPlayer.sidList[index].file;
      var id = sidPlayer.sidList[index].id;

      sidPlayer.sidListIndex = index;
      sidPlayer.loadSID('sids/' + filename);
      sidPlayer.setPath(id);

    });
  },


  resize: function(event) {

    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.context = this.canvas.getContext("2d");

  },

  play: function() {
    this.initWebAudio();
    this.isPaused = this.isPlaying;

    this.isPlaying = !this.isPlaying;

    if(this.isPaused) {
      $('#playButton').html('Play');
    } else {
      $('#playButton').html('Pause');
    }
  },


  loadSIDData: function(data) {
    this.dialogManager.hideDialog();

    var loadResult = SID.loadMusicData(this.sampleRate, '', '', data);
    if(loadResult !== 0) {
      this.autoLoading = false;
      this.isPlaying = false;
      this.isPaused = false;
      $('#playButton').html('Play');
      console.warn('SID engine rejected file; error code:', loadResult);
      return false;
    }

    var result = {};
    SID.updateSongInfo('', result); 

    var actualSubsong = 0;
    if(typeof actualSubsong != 'undefined') {
      actualSubsong = result.actualSubsong;
    }

    this.playSong(actualSubsong);
    this.setSongInfo(result);
    return true;

  },

  loadSIDFile: function(file) {
    this.autoLoading = true;
    this.initWebAudio();
    var sidPlayer = this;
    var fileReader = new FileReader();
    fileReader.onload = function(e) {
      sidPlayer.sidListIndex = false;
      sidPlayer.setPath('');
      var data = new Uint8Array(e.target.result);
      sidPlayer.loadSIDData(data);

    }
    fileReader.readAsArrayBuffer(file);

  },
  loadSID: function(filename) {
    this.autoLoading = true;
    this.initWebAudio();

    var xhr = new XMLHttpRequest();
    xhr.open('GET', filename, true);
    xhr.responseType = 'arraybuffer';
     
    var sidPlayer = this;
    xhr.onload = function(e) {
      // response is unsigned 8 bit integer
      var data = new Uint8Array(this.response); 
      if(this.status >= 200 && this.status < 300 && this.response && this.response.byteLength > 0) {
        sidPlayer.loadSIDData(data);
      } else {
        sidPlayer.autoLoading = false;
        console.warn('Unable to load SID:', filename, this.status);
      }

    };
    xhr.onerror = function() { sidPlayer.autoLoading = false; };
     
    xhr.send();
  },

  stop: function() {
    this.autoElapsedSamples = 0;
    this.isPaused = false;
    this.sidHasSamples = false;    
    SID.evalTrackOptions({ track: this.currentSubsong });      
    sidPlayer._numberOfSamplesToRender = 0;
    sidPlayer.isPlaying = false;
    $('#playButton').html('Play');

    this.displaySongInfo();
  },

  playSong: function(subSongIndex) {
    this.autoElapsedSamples = 0;
    this.autoLoading = false;
    this.sidHasSamples = false;   
    $('#voice4Control').hide();

    this.currentSubsong = subSongIndex;
    SID.evalTrackOptions({ track: this.currentSubsong });      
    sidPlayer._numberOfSamplesToRender = 0;
    sidPlayer.isPlaying = true;
    $('#playButton').html('Pause');

    this.displaySongInfo();
    this.setVoices();
  },

  prevSubsong: function() {
    if(this.currentSubsong > 0) {
      this.playSong(this.currentSubsong - 1);
    }
  },

  nextSubsong: function() {
    if(this.currentSubsong + 1 <= this.songInfo.maxSubsong) {
      this.playSong(this.currentSubsong + 1);
    }
  },

  nextSid: function() {
    if(this.sidListIndex !== false) {
      this.sidListIndex++;
      if(this.sidListIndex >= this.sidList.length) {
        this.sidListIndex = 0;
      }
    } else {
      this.sidListIndex = 0;
    }

    var filename = this.sidList[this.sidListIndex].file;
    var id = this.sidList[this.sidListIndex].id;
    this.loadSID('sids/' + filename);
    sidPlayer.setPath(id);



  },

  setSongInfo: function(songInfo) {
    console.log(songInfo);
    if(typeof songInfo == 'undefined') {
      return;
    }
    this.songInfo = songInfo;
    this.displaySongInfo();
  },


  showSIDInfo: function(show) {
    if(show) {
      $('#sidInfo').show();
      this.sidInfoVisible = true;
      $('#showSIDInfoLink').html('Hide');
    } else {
      $('#sidInfo').hide();  
      this.sidInfoVisible = false;
      $('#showSIDInfoLink').html('Show');
    }
  },

  displaySongInfo: function() {
    var sidPlayer = this;

    var html = '';
    html += '<span class="songInfoLabel">Name:</span>&nbsp;<span class="songInfoValue">' + this.songInfo.songName + '</span>';
    html += ', ';
    html += '<span class="songInfoLabel">Author:</span>&nbsp;<span class="songInfoValue">' + this.songInfo.songAuthor + '</span>';
    html += ', ';
    html += '<span class="songInfoLabel">Released:</span>&nbsp;<span class="songInfoValue">' + this.songInfo.songReleased + '</span>';

    if(this.sidListIndex !== false) {
      html += ', ';
      html += '<span class="songInfoLabel">SID Info:</span>&nbsp;<span class="songInfoValue"><span style="color: white; text-decoration: underline; cursor: pointer" id="showSIDInfoLink">';
      if(this.sidInfoVisible) {
        html += 'Hide';

      } else {
        html += 'Show';
      }

      html += '</span></span>';

    } else {
      if(this.sidInfoVisible) {
        sidPlayer.showSIDInfo(false);
      }
    }
    $('#songInfo').html(html);
    $('#showSIDInfoLink').on('click', function() {
      sidPlayer.showSIDInfo(!sidPlayer.sidInfoVisible);

    });

    var subsong = this.currentSubsong + 1;
    var subsongs = this.songInfo.maxSubsong + 1;
    var html = '';
    html += 'Subsong: ' + subsong + ' of ' + subsongs;
    $('#subsongInfo').html(html);

    if(this.songInfo.maxSubsong == 0) {
      $('#subsongControls').hide();
    } else {
      $('#subsongControls').show();      
    }

    if(this.sidListIndex !== false) {
      var sidInfo = this.sidList[this.sidListIndex];
      var html = '';

      html += '<div class="sidInfoSection">';
      html += '<img width="160" height="100" src="images/' + sidInfo.image + '">';
      html += '</div>';

      html += '<div class="sidInfoSection">';
      html += '  <div><div class="sidInfoLabel">Author:</div>' + sidInfo.author + '</div>';
      html += '  <div><div class="sidInfoLabel">Released: </div>' + sidInfo.released + '</div>';
      html += '  <div><div class="sidInfoLabel">File Size: </div>' + sidInfo.size + ' bytes</div>';
      html += '</div>';

      html += '<div class="sidInfoSection">';
      html += '  <div class="sidInfoSectionHeading">Game Info</div>';
      html += '  <div class="sidInfoLink"><div class="sidInfoLabel">Lemon64:</div><a href="' + sidInfo.url + '" target="_blank">' + sidInfo.name + '</a></div>';
      html += '  <div class="sidInfoLink"><div class="sidInfoLabel">C64.com:</div><a href="' + sidInfo.c64url + '" target="_blank">' + sidInfo.name + '</a></div>';
      html += '</div>';

      if(typeof sidInfo.review != 'undefined') {
        html += '<div class="sidInfoSection">';
        html += '  <div><span class="sidInfoSectionHeading">Zzap!64 Review</span> (<a target="_blank" href="' + sidInfo.reviewURL + '">link</a>)</div><div>' + sidInfo.review + '</div>'; 
        html += '</div>';
      }

      if(typeof sidInfo.links != 'undefined') {
        html += '<div class="sidInfoSection">';
        html += '  <div class="sidInfoSectionHeading">Links</div>';
        for(var i = 0; i < sidInfo.links.length; i++) {
          html += '  <div class="sidInfoLink"><a target="_blank" href="' + sidInfo.links[i].url + '">' + sidInfo.links[i].name + '</a></div>';
        }
        html += '</div>';
      }

      if(typeof sidInfo.info != 'undefined' && sidInfo.info != '') {
        html += '<div class="sidInfoSection">';
        html += '  <div class="sidInfoSectionHeading">Comments</div>';
        html += sidInfo.info;
        html += '</div>';
      }

      if(typeof sidInfo.subsongInfo != 'undefined') {
        for(var i = 0; i < sidInfo.subsongInfo.length; i++) {

          html += '<div class="sidInfoSection">';
          var songNumber = i + 1;
          html += '<div class="subsongLink" subsong="' + i + '"><strong>Song ' + songNumber + '</strong>';
          if(typeof sidInfo.subsongInfo[i].name != 'undefined') {
            html += ': ' + sidInfo.subsongInfo[i].name;
          }
          html += ' (' + sidInfo.subsongInfo[i].duration + ')';
          html += '</div>';
//          html += '<div>Duration: ' + sidInfo.subsongInfo[i].duration + '</div>';
          if(typeof sidInfo.subsongInfo[i].author != 'undefined') {
            html += '<div>Author: ' + sidInfo.subsongInfo[i].author + '</div>';
          }

          if(typeof sidInfo.subsongInfo[i].original != 'undefined') {
            html += '<div>Original: ' + sidInfo.subsongInfo[i].original + '</div>';
          }
          if(typeof sidInfo.subsongInfo[i].originalArtist != 'undefined') {
            html += '<div>Original Artist: ' + sidInfo.subsongInfo[i].originalArtist + '</div>';
          }

          if(typeof sidInfo.subsongInfo[i].comment != 'undefined') {
            html += '<div>' + sidInfo.subsongInfo[i].comment + '</div>';
          }

          html += '</div>';
        }
      }
      $('#sidInfoContent').html(html);

      html = '';
      html += sidInfo.name;
      $('#sidInfoTitle').html(html);

      $('.subsongLink').on('click', function() {
        var index = parseInt($(this).attr('subsong'), 10);
//        alert(index);
        sidPlayer.playSong(index);
      });
    }

  },

  copySamples: function(resampleBuffer, output1, outSize) {
    var i;
    if (this._numberOfSamplesRendered + this._numberOfSamplesToRender > outSize) {
      var availableSpace = outSize-this._numberOfSamplesRendered;
      
      for (i= 0; i<availableSpace; i++) {
        output1[i+this._numberOfSamplesRendered]= resampleBuffer[this._sourceBufferIdx++];
      }       
      this._numberOfSamplesToRender -= availableSpace;
      this._numberOfSamplesRendered = outSize;
    } else {
      for (i= 0; i<this._numberOfSamplesToRender; i++) {
        output1[i+this._numberOfSamplesRendered]= resampleBuffer[this._sourceBufferIdx++];
      }           
      this._numberOfSamplesRendered += this._numberOfSamplesToRender;
      this._numberOfSamplesToRender = 0;
    }   
  },  

  fillEmpty: function(outSize, output1) {
    var availableSpace = outSize-this._numberOfSamplesRendered;
    
    for (i= 0; i<availableSpace; i++) {
      output1[i+this._numberOfSamplesRendered]= 0;
    }       
    this._numberOfSamplesToRender = 0;
    this._numberOfSamplesRendered = outSize;      
  },


  initWebAudio: function() {
    var thisPlayer = this;

//    this.audioContext = null;
/*
    if ( typeof AudioContext !== 'undefined') { 
      this.audioContext = new AudioContext(); 
    } else { 
      this.audioContext = new webkitAudioContext(); 
    }
*/

    var AudioContext = window.AudioContext 
                    || window.webkitAudioContext 
                    || false;
    if(!AudioContext) {
      return;
    }

    if(this.audioContext && this.audioContext != 'running') {
      this.audioContext.resume();
    }

    if(this.scriptNode) {
      return;
    }
    


    try {
      if(!this.audioContext) {
        this.audioContext = new AudioContext();
      }


      this.sampleRate = this.audioContext.sampleRate; 

      var bufferLength = 4096;//2048;

//    this.scriptNode = null;
      if (typeof this.audioContext.createJavaScriptNode === 'function') { 
        this.scriptNode = this.audioContext.createJavaScriptNode(bufferLength,0,1); 
      } else { 
        this.scriptNode = this.audioContext.createScriptProcessor(bufferLength,0,1); 
      }


      this.scriptNode.onaudioprocess = function(event) { 
        var output1 = event.outputBuffer.getChannelData(0);
      

        if(!thisPlayer.isPlaying) {
          var i;
          for (i= 0; i<output1.length; i++) {
            output1[i]= 0;
          }   

        } else {
          var outSize= output1.length;
          
          thisPlayer._numberOfSamplesRendered = 0;    

          while (thisPlayer._numberOfSamplesRendered < outSize)
          {
            if (thisPlayer._numberOfSamplesToRender === 0) {
              var status;   
              status = SID.computeAudioSamples();
                    
              if (status !== 0) {
              // no frame left
                thisPlayer.fillEmpty(outSize, output1);
                thisPlayer.isPlaying = false;
                return;
              }

              thisPlayer._sourceBuffer = SID.getAudioBuffer();
              thisPlayer._sourceBufferLen = SID.getAudioBufferLength();
              thisPlayer._numberOfSamplesToRender =  SID.getResampledAudio(thisPlayer._sourceBuffer, thisPlayer._sourceBufferLen);
              thisPlayer._sourceBufferIdx = 0;      
            }
                    
            var resampleBuffer= SID.getResampleBuffer();

            thisPlayer.copySamples(resampleBuffer, output1, outSize);
          }
        
          thisPlayer._currentPlaytime += outSize;  // keep track how long we are playing
          thisPlayer.autoElapsedSamples += outSize;
          // TEST19: trigger AUTO from the audio stream, not animation frames.
          // Defer to a microtask: never replace SID data during sample rendering.
          if(thisPlayer.autoAdvance && !thisPlayer.autoLoading && !thisPlayer.autoCheckQueued &&
             thisPlayer.sampleRate && thisPlayer.autoElapsedSamples / thisPlayer.sampleRate >= thisPlayer.getAutoDurationSeconds()) {
            thisPlayer.autoCheckQueued = true;
            Promise.resolve().then(function() {
              thisPlayer.autoCheckQueued = false;
              thisPlayer.checkAutoAdvance();
            });
          }
       
        
        }
                
      }

      this.scriptNode.connect(this.audioContext.destination);        
    } catch(err) {
    }

  },

  updateVoiceInfo: function() {
    /*
    var voiceInfo = '';
    for(var voice = 0; voice < 3; voice++) {
      var envelope = SID.getEnvelope(voice);
      var wave = SID.getWave(voice);
      var frequency = SID.getFrequency(voice);
      var ad = SID.getAD(voice);
      var sr = SID.getSR(voice);
      voiceInfo += 'envelope: ' + envelope;
      voiceInfo += ', wave: ' + wave;
      voiceInfo += ', frequency: ' + frequency;
      voiceInfo += ', ad: ' + ad;
      voiceInfo += ', sr: ' + sr;

      voiceInfo += '   \  ';
    }

    $('#voiceInfo').html(voiceInfo);
*/
  },

  applyOscilloscopeColors: function() {
    var palette = this.colorModes[this.colorModeIndex];
    if(this.canvas) this.canvas.style.backgroundColor = palette.background;
    // TEST20: synchronize interface colors with the selected oscilloscope palette.
    var root = document.documentElement;
    root.style.setProperty('--rico-theme-bg', palette.background);
    root.style.setProperty('--rico-theme-fg', palette.line);
    root.style.setProperty('--rico-theme-border', palette.line);
    root.style.setProperty('--rico-theme-panel', 'color-mix(in srgb, ' + palette.background + ' 80%, ' + palette.line + ' 20%)');
    root.style.setProperty('--rico-theme-hover', 'color-mix(in srgb, ' + palette.background + ' 65%, ' + palette.line + ' 35%)');
    $('#oscilloscopeColorButton').text('Color: ' + palette.name)
      .attr('title', 'Change oscilloscope palette (next: ' +
        this.colorModes[(this.colorModeIndex + 1) % this.colorModes.length].name + ')');
  },

  drawLines: function() {
    var SCREEN_WIDTH = window.innerWidth;
    var SCREEN_HEIGHT = window.innerHeight;
    var channelCount = 3;
    if(this.sidHasSamples) {
      channelCount++;
    }

    var channelHeight = (SCREEN_HEIGHT - 40) / channelCount;
    var channelWidth = SCREEN_WIDTH ;
    var xOffset = 0;

    if(this.sidInfoVisible) {
      xOffset = 220;
    }
    channelWidth -= xOffset;


    var buffer = SID.getResampleBuffer();
    //console.log(buffer.length);
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);    
    this.context.beginPath();


    var bufferSize = 882 * 2;
    var displaySize = bufferSize / 2.8;

    var threshold = 0.004;
    var lowerthreshold = 0.002990;
    var halfDisplaySize = Math.floor(displaySize / 2);

/*
    this.context.moveTo(0, 100 + 1 * 180 + threshold * 2000);
    this.context.lineTo(500, 100 + 1 * 180 + threshold * 2000);


    this.context.moveTo(0, 100 + 1 * 180 + lowerthreshold * 2000);
    this.context.lineTo(500, 100 + 1 * 180 + lowerthreshold * 2000);
*/


    for(var channel = 0; channel < 3; channel++) {
      var buffer = SID.getChannelBuffer(channel + 1);

      var triggerOffset = 0;



      if(channel < 3) {
        triggerOffset = halfDisplaySize;
        var sample = SID.readFloatSample(buffer, triggerOffset);
        while(sample < threshold && triggerOffset < (bufferSize  - displaySize) ) {
          triggerOffset++;
          sample = SID.readFloatSample(buffer, triggerOffset);
        }

        while(sample > lowerthreshold && triggerOffset < (bufferSize - displaySize) ) {
          triggerOffset++;
          sample = SID.readFloatSample(buffer, triggerOffset);
        }

        if(triggerOffset > halfDisplaySize) {
          triggerOffset -= halfDisplaySize;
        }
      }

      for(var i = 0; i < displaySize; i++) {
        var pos = (i + triggerOffset);

        if(pos < bufferSize) {
          var sample = SID.readFloatSample(buffer, pos);
          if(!this.isPlaying && !this.isPaused) {
            sample = 0;
          }
          if(channel == 3 && sample > 0) {
            if(!this.sidHasSamples) {
              $('#voice4Control').show();
            }
            this.sidHasSamples = true;
          }

          if(channel < 3) {
            if(i == 0) {
              this.context.moveTo(xOffset + i * channelWidth / displaySize, 20 + channelHeight / 2 + channel * channelHeight + sample * channelHeight * 10 );
            } else {
              this.context.lineTo(xOffset + i * channelWidth / displaySize, 20 +  channelHeight / 2 + channel * channelHeight + sample * channelHeight * 10 );
            }
          } else {
            if(i == 0) {
              this.context.moveTo(xOffset + i * channelWidth / displaySize, 20 + channelHeight / 2 + channel * channelHeight + sample * channelHeight * 0.5 );
            } else {
              this.context.lineTo(xOffset + i * channelWidth / displaySize, 20 + channelHeight / 2 + channel * channelHeight + sample * channelHeight * 0.5 );              
            }

          }
        }

      }
    }



    channel = 3;
    var buffer = SID.getChannelBuffer(channel + 1);

    for(var i = 0; i < bufferSize; i++) {
      var pos = i;

      if(pos < bufferSize) {
        var sample = SID.readFloatSample(buffer, pos);
        if(!this.isPlaying && !this.isPaused) {
          sample = 0;
        }
        if(channel == 3 && sample > 0) {
          if(!this.sidHasSamples) {
            $('#voice4Control').show();
          }
          this.sidHasSamples = true;
        }

        if(i == 0) {
          this.context.moveTo(xOffset + i * channelWidth / bufferSize, 20 + channelHeight / 2 + channel * channelHeight + sample * channelHeight * 0.8 );
        } else {
          this.context.lineTo(xOffset + i * channelWidth / bufferSize, 20 + channelHeight / 2 + channel * channelHeight + sample * channelHeight * 0.8 );              
        }


      }
    }


    this.context.strokeStyle = this.colorModes[this.colorModeIndex].line;
    this.context.lineWidth = 2;

    this.context.stroke();

  },

  // TEST01: independent filled visualization. Original drawLines() is retained unchanged.
  drawFilledWaves: function() {
    var width = window.innerWidth;
    var height = window.innerHeight;
    var channelCount = this.sidHasSamples ? 4 : 3;
    var channelHeight = (height - 40) / channelCount;
    var xOffset = this.sidInfoVisible ? 220 : 0;
    var channelWidth = width - xOffset;
    var bufferSize = 882 * 2;
    var displaySize = Math.floor(bufferSize / 2.8);
    var halfDisplaySize = Math.floor(displaySize / 2);
    var ctx = this.context;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for(var channel = 0; channel < 4; channel++) {
      if(channel === 3 && !this.sidHasSamples) {
        // Preserve the original detection of sampled fourth-voice audio.
        var probe = SID.getChannelBuffer(4);
        for(var p = 0; p < bufferSize; p++) {
          if(SID.readFloatSample(probe, p) > 0) {
            this.sidHasSamples = true;
            $('#voice4Control').show();
            break;
          }
        }
        if(!this.sidHasSamples) continue;
      }
      var buffer = SID.getChannelBuffer(channel + 1);
      var count = channel === 3 ? bufferSize : displaySize;
      var triggerOffset = 0;
      if(channel < 3) {
        triggerOffset = halfDisplaySize;
        var triggerSample = SID.readFloatSample(buffer, triggerOffset);
        while(triggerSample < 0.004 && triggerOffset < bufferSize - displaySize) {
          triggerOffset++;
          triggerSample = SID.readFloatSample(buffer, triggerOffset);
        }
        while(triggerSample > 0.002990 && triggerOffset < bufferSize - displaySize) {
          triggerOffset++;
          triggerSample = SID.readFloatSample(buffer, triggerOffset);
        }
        if(triggerOffset > halfDisplaySize) triggerOffset -= halfDisplaySize;
      }
      var centerY = 20 + channelHeight / 2 + channel * channelHeight;
      var amplitude = channelHeight * (channel === 3 ? 0.8 : 10);
      var points = [];
      for(var i = 0; i < count; i++) {
        var sample = SID.readFloatSample(buffer, i + triggerOffset);
        if(!this.isPlaying && !this.isPaused) sample = 0;
        points.push([xOffset + i * channelWidth / count, centerY + sample * amplitude]);
      }
      if(!points.length) continue;
      ctx.beginPath();
      ctx.moveTo(points[0][0], centerY);
      for(var j = 0; j < points.length; j++) ctx.lineTo(points[j][0], points[j][1]);
      ctx.lineTo(points[points.length - 1][0], centerY);
      ctx.closePath();
      ctx.fillStyle = this.colorModes[this.colorModeIndex].fill;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for(var k = 1; k < points.length; k++) ctx.lineTo(points[k][0], points[k][1]);
      ctx.strokeStyle = this.colorModes[this.colorModeIndex].line;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  },

  updateAutoButton: function() {
    $('#autoAdvanceButton').text(this.autoAdvance ? 'AUTO: ON' : 'AUTO: OFF')
      .attr('aria-pressed', this.autoAdvance ? 'true' : 'false');
  },

  getAutoDurationSeconds: function() {
    if(this.sidListIndex === false || !this.sidList[this.sidListIndex]) return this.autoFallbackSeconds;
    var song = this.sidList[this.sidListIndex];
    var info = song.subsongInfo && song.subsongInfo[this.currentSubsong];
    var duration = info && info.duration;
    if(typeof duration !== 'string') return this.autoFallbackSeconds;
    var parts = duration.trim().split(':');
    if(parts.length !== 2 && parts.length !== 3) return this.autoFallbackSeconds;
    var seconds = 0;
    for(var i = 0; i < parts.length; i++) {
      var n = Number(parts[i]);
      if(!isFinite(n) || n < 0 || Math.floor(n) !== n) return this.autoFallbackSeconds;
      seconds = seconds * 60 + n;
    }
    return seconds > 0 ? seconds : this.autoFallbackSeconds;
  },

  checkAutoAdvance: function() {
    if(!this.autoAdvance || !this.isPlaying || this.autoLoading || !this.sampleRate) return;
    if(this.autoElapsedSamples / this.sampleRate < this.getAutoDurationSeconds()) return;
    this.autoElapsedSamples = 0;
    if(this.sidListIndex === false) {
      // A local SID has no catalog duration; do not unexpectedly replace it.
      this.autoAdvance = false;
      this.updateAutoButton();
      return;
    }
    // TEST18: AUTO always advances to the next SID file.
    // Subtune navigation remains available only through manual controls.
    this.nextSid();
  },

  render: function() {
    // AUTO timing now runs from audio callbacks; redraws may be throttled when hidden.
    if(this.oscilloscopeMode === 'filled') this.drawFilledWaves();
    else this.drawLines();
    this.updateVoiceInfo();

  }
}

var sidPlayer = new SidPlayer();
sidPlayer.init();
sidPlayer.initWebAudio();
sidPlayer.applyOscilloscopeColors(); // TEST20: initialize UI palette, including the default.
sidPlayer.popPath();


/*
var stats = new Stats();
stats.setMode(0);
stats.domElement.style.position = 'absolute';
stats.domElement.style.right = '0px';
stats.domElement.style.top = '0px';
$('#Stats-output').append(stats.domElement);
*/


function render() {
//  stats.update();

  requestAnimationFrame( render );

  sidPlayer.render();
}

render();        
