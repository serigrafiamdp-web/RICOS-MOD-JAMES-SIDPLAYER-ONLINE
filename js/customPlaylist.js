/* RICOS MOD - JAMES SIDPLAYER ONLINE / TEST04
 * Local custom SID playlist. No upload, no persistent storage, no SID engine changes.
 * Original default playlist and engine remain in sidPlayer.js.
 */
(function () {
  'use strict';
  if (!window.sidPlayer || !window.SID) return;

  var player = window.sidPlayer;
  var originalList = player.sidList;
  var defaultRenderList = player.initFileSelection;
  var defaultNextSid = player.nextSid;
  var defaultPopPath = player.popPath;
  var originalDisplayInfo = player.displaySongInfo;
  var custom = [];
  var customActive = false;
  var importing = false;

  function escapeFilename(name) {
    return (name || '').replace(/\.[sS][iI][dD]$/, '')
      .replace(/^\s*\d+[\s._-]+/, '').replace(/[_]+/g, ' ').trim();
  }
  function field(bytes, start) {
    var end = Math.min(start + 32, bytes.length), value = '';
    for (var i = start; i < end && bytes[i]; i++) {
      var code = bytes[i];
      value += (code >= 32 && code < 127) ? String.fromCharCode(code) : (code >= 160 ? String.fromCharCode(code) : ' ');
    }
    return value.replace(/\s+/g, ' ').trim();
  }
  function u16(b, n) { return (b[n] << 8) | b[n + 1]; }
  function parseSID(bytes, file) {
    if (bytes.length < 0x76) return null;
    var magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    if (magic !== 'PSID' && magic !== 'RSID') return null;
    var version = u16(bytes, 4), songs = u16(bytes, 0x0e), start = u16(bytes, 0x10);
    if (version < 1 || version > 4 || songs < 1 || songs > 256) return null;
    var title = field(bytes, 0x16) || escapeFilename(file.name) || file.name;
    var author = field(bytes, 0x36) || 'Unknown artist';
    var released = field(bytes, 0x56) || '';
    return {
      id: 'local-' + custom.length,
      name: title, author: author, released: released,
      file: file.name, size: file.size, image: '',
      numSubtunes: songs, startSubtune: Math.max(1, Math.min(songs, start || 1)),
      sidFormat: magic + ' v' + version,
      localBytes: bytes
    };
  }
  function customInfo() {
    if (!customActive) return;
    var entry = player.sidList[player.sidListIndex];
    if (!entry || !entry.localBytes) return;
    var info = $('<div>').css({padding:'5px', color:'#222', fontSize:'11px'});
    $('<strong>').text(entry.name).appendTo(info);
    $('<p>').text('Author: ' + entry.author).appendTo(info);
    $('<p>').text('Released: ' + (entry.released || 'Not provided')).appendTo(info);
    $('<p>').text('Format: ' + entry.sidFormat).appendTo(info);
    $('<p>').text('Subtunes: ' + entry.numSubtunes + ' / default: ' + entry.startSubtune).appendTo(info);
    $('<p>').text('Duration: not included in PSID/RSID metadata. AUTO uses the configured fallback.').appendTo(info);
    $('#sidInfoContent').empty().append(info);
  }
  player.displaySongInfo = function () {
    originalDisplayInfo.apply(this, arguments);
    customInfo();
  };

  function refreshTabs() {
    $('#ricoDefaultTab').toggleClass('rico-selected-tab', !customActive);
    $('#ricoCustomTab').toggleClass('rico-selected-tab', customActive);
    $('#ricoCustomCount').text(custom.length + ' SID');
    $('#ricoFallback').val(Math.round(player.autoFallbackSeconds));
    $('#ricoPlaylistStatus').text(customActive
      ? (custom.length ? custom.length + ' local SID files ready (session only).' : 'Select SID files or a folder to create your custom list.')
      : 'Original 22 SID playlist. Your local files remain available in CUSTOM.');
  }
  function activate(mode) {
    var wantCustom = mode === 'custom';
    if (wantCustom === customActive) {
      refreshTabs();
      return;
    }
    player.isPlaying = false;
    player.isPaused = false;
    player.autoElapsedSamples = 0;
    $('#playButton').text('Play');
    customActive = wantCustom;
    player.sidList = wantCustom ? custom : originalList;
    player.sidListIndex = false;
    player.songInfo = {};
    player.setPath('');
    player.showSIDInfo(false);
    player.initFileSelection();
    refreshTabs();
  }
  function loadCustomIndex(index) {
    if (!customActive) activate('custom');
    if (index < 0 || index >= custom.length) return;
    var item = custom[index];
    player.initWebAudio();
    player.sidListIndex = index;
    player.setPath('');
    player.autoLoading = true;
    try {
      player.loadSIDData(item.localBytes);
      // Engine determines actual initial subtune from the SID header.
      player.initFileSelection();
    } catch (error) {
      player.autoLoading = false;
      player.isPlaying = false;
      console.error('Local SID load failed', item.file, error);
      $('#ricoPlaylistStatus').text('Could not play ' + item.file);
    }
  }
  player.nextSid = function () {
    if (customActive) {
      if (!custom.length) return;
      loadCustomIndex(player.sidListIndex === false ? 0 : (player.sidListIndex + 1) % custom.length);
    } else {
      defaultNextSid.apply(player, arguments);
    }
  };
  player.popPath = function () {
    if (!customActive) defaultPopPath.apply(player, arguments);
  };
  player.initFileSelection = function () {
    if (!customActive) {
      defaultRenderList.call(player);
      refreshTabs();
      return;
    }
    var holder = $('#sidList').empty();
    if (!custom.length) {
      $('<div>').addClass('rico-empty').text('No local SID files loaded. Use ADD SID FILES, ADD FOLDER or drop them here.').appendTo(holder);
    }
    custom.forEach(function (item, index) {
      var row = $('<div>').addClass('rico-local-row').attr('title', item.file);
      if (index === player.sidListIndex) row.addClass('rico-active-row');
      $('<span>').addClass('rico-row-index').text(('0' + (index + 1)).slice(-2)).appendTo(row);
      $('<span>').addClass('rico-row-title').text(item.name).appendTo(row);
      $('<span>').addClass('rico-row-author').text(item.author).appendTo(row);
      $('<span>').addClass('rico-row-subs').text(item.numSubtunes + (item.numSubtunes === 1 ? ' sub' : ' subs')).appendTo(row);
      row.on('click', function () { loadCustomIndex(index); });
      row.appendTo(holder);
    });
    refreshTabs();
  };

  // Browser file handles are kept in memory. Upload is never sent to GitHub.
  async function importFiles(inputFiles) {
    if (importing) return;
    var files = Array.from(inputFiles || []).filter(function (file) {
      return file && (file.name.toLowerCase().endsWith('.sid') || !file.name.includes('.'));
    });
    if (!files.length) {
      $('#ricoPlaylistStatus').text('No SID files found.');
      return;
    }
    importing = true;
    $('#ricoPlaylistStatus').text('Reading ' + files.length + ' files...');
    var accepted = 0, rejected = 0;
    for (var i = 0; i < files.length; i++) {
      try {
        var buf = new Uint8Array(await files[i].arrayBuffer());
        var parsed = parseSID(buf, files[i]);
        if (!parsed) { rejected++; continue; }
        parsed.id = 'local-' + (custom.length + accepted);
        custom.push(parsed);
        accepted++;
      } catch (error) {
        rejected++;
        console.warn('SID import failed', files[i].name, error);
      }
    }
    importing = false;
    if (accepted) {
      if (!customActive) activate('custom');
      else player.initFileSelection();
      if (player.sidListIndex === false) loadCustomIndex(0);
    }
    $('#ricoPlaylistStatus').text(accepted + ' SID imported' + (rejected ? ' · ' + rejected + ' skipped' : '') + '. Session only.');
  }

  function getEntryFiles(entry) {
    return new Promise(function (resolve) {
      if (!entry) return resolve([]);
      if (entry.isFile) {
        entry.file(function (file) { resolve([file]); }, function () { resolve([]); });
      } else if (entry.isDirectory) {
        var reader = entry.createReader(), all = [];
        function step() {
          reader.readEntries(function (batch) {
            if (!batch.length) {
              Promise.all(all.map(getEntryFiles)).then(function (nested) {
                resolve([].concat.apply([], nested));
              });
              return;
            }
            all.push.apply(all, batch);
            step();
          }, function () { resolve([]); });
        }
        step();
      } else resolve([]);
    });
  }
  async function droppedFiles(dataTransfer) {
    var items = Array.from(dataTransfer.items || []);
    var entries = items.map(function (it) {
      return it.webkitGetAsEntry ? it.webkitGetAsEntry() : null;
    }).filter(Boolean);
    if (entries.length) {
      var nested = await Promise.all(entries.map(getEntryFiles));
      return [].concat.apply([], nested);
    }
    return Array.from(dataTransfer.files || []);
  }

  $('#sidfile').attr('multiple', 'multiple').off('change').on('change', function () {
    importFiles(this.files);
    this.value = '';
  });
  $('#ricoFolderPicker').on('change', function () {
    importFiles(this.files);
    this.value = '';
  });
  $('#sidFileOpen').off('click').on('click', function () {
    document.getElementById('sidfile').click();
  });
  $('#ricoAddFiles').on('click', function () { document.getElementById('sidfile').click(); });
  $('#ricoAddFolder').on('click', function () { document.getElementById('ricoFolderPicker').click(); });
  $('#ricoDefaultTab').on('click', function () { activate('default'); });
  $('#ricoCustomTab').on('click', function () { activate('custom'); });
  $('#ricoClearList').on('click', function () {
    custom.length = 0;
    if (customActive) {
      player.isPlaying = false;
      player.sidListIndex = false;
      $('#playButton').text('Play');
      player.initFileSelection();
    }
    refreshTabs();
  });
  $('#ricoFallback').on('change', function () {
    var seconds = Math.round(Number(this.value));
    player.autoFallbackSeconds = Number.isFinite(seconds) ? Math.max(5, Math.min(3600, seconds)) : 180;
    this.value = player.autoFallbackSeconds;
  });
  $('body').off('drop').on('drop.ricoPlaylist', async function (event) {
    event.preventDefault();
    event.stopPropagation();
    var transfer = event.originalEvent && event.originalEvent.dataTransfer;
    if (transfer) await importFiles(await droppedFiles(transfer));
    $('#ricoDropZone').removeClass('rico-dragging');
  });
  $('#ricoDropZone').on('dragenter dragover', function (event) {
    event.preventDefault();
    $(this).addClass('rico-dragging');
  }).on('dragleave', function () { $(this).removeClass('rico-dragging'); });

  refreshTabs();
  player.initFileSelection();
})();
