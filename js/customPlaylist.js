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
  var liveVisible = false;
  // The title belongs to the playlist currently loaded, not the text being edited.
  var loadedPlaylistTitle = '';

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
    renderLivePlaylist();
  };

  function renderLivePlaylist() {
    var holder = $('#ricoLivePlaylistItems').empty();
    var list = player.sidList || [];
    $('#ricoLiveCount').text('(' + list.length + ')');
    $('#ricoLivePlaylistTitle').text(customActive ? (loadedPlaylistTitle || 'CUSTOM PLAYLIST') : 'PLAYLIST');
    if (!list.length) {
      $('<div>').addClass('rico-live-empty').text('No SID loaded. Use Choose A SID to add music.').appendTo(holder);
      return;
    }
    list.forEach(function (item, index) {
      var row = $('<button type="button">').addClass('rico-live-row');
      var active = index === player.sidListIndex;
      if (active) row.addClass('rico-live-active').attr('aria-current', 'true');
      $('<span>').addClass('rico-live-number').text(index + 1).appendTo(row);
      $('<span>').addClass('rico-live-title').text(item.name || item.file || 'SID ' + (index + 1)).appendTo(row);
      if (active) $('<span>').addClass('rico-live-current').text('▶').appendTo(row);
      row.on('click', function () {
        if (customActive) loadCustomIndex(index);
        else {
          player.sidListIndex = index;
          player.loadSID('sids/' + originalList[index].file);
          player.setPath(originalList[index].id);
        }
        renderLivePlaylist();
      });
      row.appendTo(holder);
    });
    var currentRow = holder.find('.rico-live-active');
    if (currentRow.length && liveVisible) currentRow[0].scrollIntoView({block:'nearest'});
  }

  function showLivePlaylist(visible) {
    liveVisible = !!visible;
    // A flex column keeps the playlist scrolling inside a shorter panel.
    $('#ricoLivePlaylist').css('display', liveVisible ? 'flex' : 'none');
    $('#ricoPlaylistToggle').attr('aria-pressed', liveVisible ? 'true' : 'false')
      .toggleClass('rico-playlist-on', liveVisible);
    if (liveVisible) renderLivePlaylist();
  }

  // TEST08: Drag by the title bar; resize vertically by the bottom handle.
  // Only the playlist panel is touched; audio and SID routines are unchanged.
  (function initMovablePlaylist() {
    var panel = document.getElementById('ricoLivePlaylist');
    var header = document.getElementById('ricoLivePlaylistHeader');
    var grip = document.getElementById('ricoLiveResizeGrip');
    if (!panel || !header || !grip) return;
    var movement = null;
    function clamp(value, minimum, maximum) {
      return Math.max(minimum, Math.min(maximum, value));
    }
    function start(event, mode) {
      if (event.button !== 0 || (event.target && event.target.closest && event.target.closest('button'))) return;
      event.preventDefault();
      event.stopPropagation();
      var rect = panel.getBoundingClientRect();
      movement = { id:event.pointerId, mode:mode, x:event.clientX, y:event.clientY,
        left:rect.left, top:rect.top, width:rect.width, height:rect.height };
      // Resolve right/bottom anchoring to explicit positions for free dragging.
      panel.style.left = rect.left + 'px';
      panel.style.top = rect.top + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.style.width = rect.width + 'px';
      panel.style.height = rect.height + 'px';
    }
    header.addEventListener('pointerdown', function(event) { start(event, 'move'); });
    grip.addEventListener('pointerdown', function(event) { start(event, 'resize'); });
    window.addEventListener('pointermove', function(event) {
      if (!movement || event.pointerId !== movement.id) return;
      event.preventDefault();
      var maxTop = Math.max(0, window.innerHeight - 110 - 30);
      if (movement.mode === 'move') {
        var x = clamp(movement.left + event.clientX - movement.x, 0,
          Math.max(0, window.innerWidth - movement.width));
        var y = clamp(movement.top + event.clientY - movement.y, 0, maxTop);
        panel.style.left = x + 'px';
        panel.style.top = y + 'px';
        // Keep the panel fully visible if dragged near the bottom edge.
        panel.style.height = Math.min(movement.height, Math.max(110, window.innerHeight - y - 30)) + 'px';
      } else {
        var h = clamp(movement.height + event.clientY - movement.y, 110,
          Math.max(110, window.innerHeight - movement.top - 30));
        panel.style.height = h + 'px';
      }
    }, {passive:false});
    function finish(event) {
      if (movement && event.pointerId === movement.id) movement = null;
    }
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    // Avoid passing drag events into the existing oscilloscope mouse handlers.
    $('#ricoLivePlaylist').on('mousedown', function(event) { event.stopPropagation(); });
  })();
  $('#ricoPlaylistToggle').on('click', function () {
    showLivePlaylist(!liveVisible);
  });
  $('#ricoLiveClose').on('click', function () { showLivePlaylist(false); });

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
    if (!wantCustom) loadedPlaylistTitle = '';
    player.sidList = wantCustom ? custom : originalList;
    player.sidListIndex = false;
    player.songInfo = {};
    player.setPath('');
    player.showSIDInfo(false);
    player.initFileSelection();
    renderLivePlaylist();
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
      var loaded = player.loadSIDData(item.localBytes);
      if (loaded === false) {
        player.initFileSelection();
        renderLivePlaylist();
        $('#ricoPlaylistStatus').text('Unsupported by SID engine: ' + item.file + ' (' + item.sidFormat + '). Select another SID.');
        $('#ricoLiveStatus').text('Cannot play: ' + item.file + ' — unsupported by current SID engine.');
        return;
      }
      $('#ricoLiveStatus').text('');
      // Engine determines actual initial subtune from the SID header.
      player.initFileSelection();
      renderLivePlaylist();
    } catch (error) {
      player.autoLoading = false;
      player.isPlaying = false;
      console.error('Local SID load failed', item.file, error);
      $('#ricoPlaylistStatus').text('Could not play ' + item.file);
      $('#ricoLiveStatus').text('Could not play ' + item.file);
    }
  }
  player.nextSid = function () {
    if (customActive) {
      if (!custom.length) return;
      loadCustomIndex(player.sidListIndex === false ? 0 : (player.sidListIndex + 1) % custom.length);
    } else {
      defaultNextSid.apply(player, arguments);
      renderLivePlaylist();
    }
  };
  player.popPath = function () {
    if (!customActive) defaultPopPath.apply(player, arguments);
  };
  player.initFileSelection = function () {
    if (!customActive) {
      defaultRenderList.call(player);
      renderLivePlaylist();
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
    renderLivePlaylist();
    refreshTabs();
  };

  // Browser file handles are kept in memory. Upload is never sent to GitHub.
  async function importFiles(inputFiles) {
    if (importing) return;
    var files = Array.from(inputFiles || []).filter(function (file) {
      return file && file.size >= 118; // Validate actual PSID/RSID header, not extension.
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
        if (!parsed) { rejected++; console.warn('Not a supported PSID/RSID header:', files[i].name); continue; }
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
      loadedPlaylistTitle = '';
      if (!customActive) activate('custom');
      else player.initFileSelection();
      if (player.sidListIndex === false) loadCustomIndex(0);
      renderLivePlaylist();
      showLivePlaylist(true);
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
    loadedPlaylistTitle = '';
    if (customActive) {
      player.isPlaying = false;
      player.sidListIndex = false;
      $('#playButton').text('Play');
      player.initFileSelection();
      renderLivePlaylist();
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


  // TEST09: self-contained JSON playlists, local IndexedDB storage.
  // No server upload, changes to the SID emulation engine, or automatic disclosure.
  (function playlistPersistence() {
    var MAX_BYTES = 64 * 1024 * 1024;
    var nameEl = document.getElementById('ricoSavedName');
    var listEl = document.getElementById('ricoSavedSelect');
    var fileEl = document.getElementById('ricoJsonImport');
    var stateEl = document.getElementById('ricoSavedStatus');
    var currentId = '';
    if (!nameEl || !listEl || !fileEl || !stateEl) return;
    // Original player calls preventDefault on window mousedown, blocking text-field focus.
    // Isolate this editable field from that legacy mouse handler without changing SID playback.
    ['mousedown','mouseup','pointerdown','pointerup','click','dblclick'].forEach(function(type) {
      nameEl.addEventListener(type,function(event){event.stopPropagation();});
    });
    ['keyup','keydown','keypress'].forEach(function(type) {
      nameEl.addEventListener(type,function(event){event.stopPropagation();});
    });
    var libraryEl = document.getElementById('ricoSavedLibrary');

    function say(text) { stateEl.textContent = text; }
    function openDatabase() {
      return new Promise(function(resolve, reject) {
        if (!window.indexedDB) return reject(Error('Local database unavailable'));
        var request = indexedDB.open('ricos-sid-playlists', 1);
        request.onupgradeneeded = function() {
          if (!request.result.objectStoreNames.contains('playlists'))
            request.result.createObjectStore('playlists', {keyPath:'id'});
        };
        request.onsuccess = function(){resolve(request.result);};
        request.onerror = function(){reject(request.error || Error('Database error'));};
      });
    }
    async function dbCall(mode, operation) {
      var db = await openDatabase();
      return new Promise(function(resolve, reject) {
        var tx = db.transaction('playlists', mode);
        var request = operation(tx.objectStore('playlists'));
        var result;
        request.onsuccess = function(){result = request.result;};
        request.onerror = function(){reject(request.error || Error('Database request failed'));};
        tx.oncomplete = function(){db.close();resolve(result);};
        tx.onabort = function(){db.close();reject(tx.error || Error('Database transaction failed'));};
      });
    }
    function encode(bytes) {
      var chunks=[];
      for (var i=0; i<bytes.length; i+=8192)
        chunks.push(String.fromCharCode.apply(null,bytes.subarray(i,i+8192)));
      return btoa(chunks.join(''));
    }
    function decode(encoded) {
      if (typeof encoded !== 'string' || encoded.length > MAX_BYTES*2 ||
          !encoded.length || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))
        throw Error('Invalid SID data.');
      var binary = atob(encoded), out = new Uint8Array(binary.length);
      for (var i=0; i<binary.length; i++) out[i]=binary.charCodeAt(i);
      return out;
    }
    function makePlaylist() {
      var name = nameEl.value.trim();
      if (!name) throw Error('Enter a playlist name.');
      if (!custom.length) throw Error('CUSTOM playlist is empty.');
      return {
        format:'ricos-sid-playlist', version:1, name:name,
        createdAt:new Date().toISOString(), tracks:custom.map(function(item) {
          return {file:item.file || 'track.sid', sidBase64:encode(item.localBytes)};
        })
      };
    }
    function validatedEntries(data) {
      if (!data || data.format !== 'ricos-sid-playlist' || data.version !== 1 ||
          typeof data.name !== 'string' || !data.name.trim() ||
          !Array.isArray(data.tracks) || !data.tracks.length || data.tracks.length > 2000)
        throw Error('Unsupported playlist JSON.');
      var entries=[], total=0;
      data.tracks.forEach(function(track, index){
        if (!track || typeof track.file !== 'string' || !track.file ||
            track.file.length > 255) throw Error('Invalid track filename.');
        var bytes=decode(track.sidBase64);
        total+=bytes.length;
        if (total>MAX_BYTES) throw Error('Playlist exceeds 64 MB.');
        var entry=parseSID(bytes,{name:track.file,size:bytes.length});
        if (!entry) throw Error('Invalid SID in track ' + (index+1));
        entry.id='local-'+index;
        entries.push(entry);
      });
      return entries;
    }
    function loadPlaylist(data) {
      // Validate everything before changing the currently loaded playlist.
      var entries=validatedEntries(data);
      player.isPlaying=false;
      player.isPaused=false;
      custom.length=0;
      Array.prototype.push.apply(custom,entries);
      nameEl.value=data.name.slice(0,100);
      loadedPlaylistTitle=data.name.trim().slice(0,100);
      if (!customActive) activate('custom');
      else player.initFileSelection();
      loadCustomIndex(0);
      showLivePlaylist(true);
    }
    async function refreshSaved() {
      var rows=await dbCall('readonly',function(store){return store.getAll();});
      rows.sort(function(a,b){return (b.updatedAt||'').localeCompare(a.updatedAt||'');});
      listEl.textContent='';
      var blank=document.createElement('option');
      blank.value='';blank.textContent='Saved playlists ('+rows.length+')';
      listEl.appendChild(blank);
      rows.forEach(function(item){
        var option=document.createElement('option');
        option.value=item.id;
        option.textContent=item.name+' ('+item.tracks.length+' SID)';
        listEl.appendChild(option);
      });
      listEl.value=rows.some(function(row){return row.id===currentId;}) ? currentId : '';
      if (libraryEl) {
        libraryEl.textContent='';
        if (!rows.length) {
          var empty=document.createElement('div');
          empty.textContent='No saved playlists yet. Load SID files and click SAVE LIST.';
          empty.style.padding='6px'; libraryEl.appendChild(empty);
        }
        rows.forEach(function(item){
          var btn=document.createElement('button');
          btn.type='button';
          btn.style.cssText='display:flex;flex:1;min-width:0;align-items:center;justify-content:space-between;text-align:left;background:#f2f5f6;color:#222;border:1px solid #bdc7cd;margin:0;padding:5px 7px;cursor:pointer;font-size:11px;';
          var title=document.createElement('span');
          title.textContent=item.name;
          var tracks=document.createElement('span');
          tracks.textContent=item.tracks.length+' SID  ·  LOAD';
          tracks.style.cssText='font-size:10px;color:#285d45;margin-left:8px;white-space:nowrap;';
          btn.appendChild(title);btn.appendChild(tracks);
          btn.addEventListener('click',async function(){
            try {
              currentId=item.id;
              listEl.value=item.id;
              var stored=await dbCall('readonly',function(store){return store.get(item.id);});
              if (!stored) throw Error('Playlist not found.');
              loadPlaylist(stored);
              say('Loaded: '+stored.name+' ('+stored.tracks.length+' SID).');
            } catch(error){say(error.message || 'Failed to load playlist.');}
          });
          var row=document.createElement('div');
          row.style.cssText='display:flex;align-items:stretch;gap:5px;margin:3px 0;';
          var del=document.createElement('button');
          del.type='button';
          del.textContent='DELETE';
          del.title='Delete saved playlist: '+item.name;
          del.setAttribute('aria-label','Delete saved playlist '+item.name);
          del.style.cssText='flex:none;margin:0;padding:4px 8px;background:#702828;color:white;border:1px solid #b56a6a;cursor:pointer;font-size:10px;';
          del.addEventListener('click',async function(event){
            event.stopPropagation();
            if (!window.confirm('Delete saved playlist "'+item.name+'"? This cannot be undone.')) return;
            try {
              await dbCall('readwrite',function(store){return store.delete(item.id);});
              if (currentId===item.id) currentId='';
              await refreshSaved();
              say('Deleted saved playlist: '+item.name+'. Current playback was not changed.');
            } catch(error) {
              say(error.message || 'Could not delete playlist.');
              console.error('Playlist deletion failed',error);
            }
          });
          row.appendChild(btn);
          row.appendChild(del);
          libraryEl.appendChild(row);
        });
      }
    }
    function run(id,action) {
      document.getElementById(id).addEventListener('click',function(){
        Promise.resolve().then(action).catch(function(error){
          say(error.message || 'Playlist operation failed');
          console.error('Playlist operation failed',error);
        });
      });
    }
    listEl.addEventListener('change',function(){currentId=this.value;});
    run('ricoSaveList',async function(){
      var data=makePlaylist();
      var prior=await dbCall('readonly',function(store){return store.getAll();});
      var match=prior.find(function(item){return item.name===data.name;});
      data.id=match ? match.id : 'list-'+Date.now()+'-'+Math.random().toString(36).slice(2,9);
      data.updatedAt=new Date().toISOString();
      await dbCall('readwrite',function(store){return store.put(data);});
      currentId=data.id;
      loadedPlaylistTitle=data.name;
      renderLivePlaylist();
      await refreshSaved();
      say('Saved locally: '+data.name+' ('+data.tracks.length+' SID).');
    });
    run('ricoLoadList',async function(){
      if (!listEl.value) throw Error('Select a saved playlist.');
      var data=await dbCall('readonly',function(store){return store.get(listEl.value);});
      if (!data) throw Error('Playlist not found.');
      loadPlaylist(data);
      say('Loaded: '+data.name+'.');
    });
    run('ricoDownloadList',function(){
      var data=makePlaylist();
      var filename=data.name.toLowerCase().replace(/[^a-z0-9_-]+/g,'-').slice(0,70) || 'playlist';
      var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
      var url=URL.createObjectURL(blob);
      var a=document.createElement('a');
      a.href=url;a.download=filename+'.json';
      document.body.appendChild(a);
      a.click();a.remove();
      setTimeout(function(){URL.revokeObjectURL(url);},1000);
      say('JSON downloaded: '+data.name+'.');
    });
    run('ricoImportList',function(){fileEl.click();});
    fileEl.addEventListener('change',async function(){
      var file=this.files && this.files[0];
      this.value='';
      if (!file) return;
      try {
        if (file.size > MAX_BYTES*2) throw Error('JSON file is too large.');
        var data=JSON.parse(await file.text());
        loadPlaylist(data);
        say('Imported '+data.name+' ('+data.tracks.length+' SID). Use SAVE LIST to keep it locally.');
      } catch(error) {
        say(error.message || 'Invalid JSON playlist.');
        console.error('JSON import failed',error);
      }
    });
    // Closed beta community catalog: read-only and hosted on the same Pages origin.
    var communityTab=document.getElementById('ricoCommunityTab');
    var communityPanel=document.getElementById('ricoCommunityPanel');
    var communityItems=document.getElementById('ricoCommunityItems');
    var localPanel=document.getElementById('ricoLocalPanel');
    var communityActive=false;
    function showCommunity(visible) {
      communityActive=visible;
      if (communityPanel) communityPanel.style.display=visible?'block':'none';
      if (localPanel) localPanel.style.display=visible?'none':'block';
      if (communityTab) communityTab.classList.toggle('rico-selected-tab',visible);
      if (visible) loadCommunityCatalog();
    }
    async function loadCommunityCatalog() {
      if (!communityItems) return;
      communityItems.textContent='Loading community playlists...';
      try {
        var response=await fetch('community/playlists.json',{cache:'no-store'});
        if(!response.ok) throw Error('Catalog unavailable ('+response.status+').');
        var catalog=await response.json();
        if (!catalog || catalog.format!=='ricos-community-catalog' || catalog.version!==1 ||
            !Array.isArray(catalog.playlists)) throw Error('Unsupported community catalog.');
        communityItems.textContent='';
        if(!catalog.playlists.length) {
          communityItems.textContent='No shared playlists published yet. Closed beta: Rico and invited testers only.';
          return;
        }
        catalog.playlists.forEach(function(item){
          if(!item || typeof item.title!=='string' || typeof item.file!=='string' ||
             !/^community\/playlists\/[a-zA-Z0-9_-]+\.json$/.test(item.file)) return;
          var row=document.createElement('div');
          row.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px;border-bottom:1px solid #aaa;';
          var label=document.createElement('span');
          label.textContent=item.title+' — '+(item.author||'Unknown')+' · '+(Number(item.tracks)||0)+' SID';
          var button=document.createElement('button');
          button.type='button';button.textContent='LOAD';
          button.addEventListener('click',async function(){
            button.disabled=true;
            try {
              var result=await fetch(item.file,{cache:'no-store'});
              if(!result.ok) throw Error('Playlist unavailable.');
              var body=await result.text();
              if(body.length>90*1024*1024) throw Error('Playlist too large.');
              var data=JSON.parse(body);
              loadPlaylist(data);
              showCommunity(false);
              say('Community playlist loaded: '+data.name);
            }catch(error){communityItems.setAttribute('data-error',error.message);say(error.message);}
            finally{button.disabled=false;}
          });
          row.appendChild(label);row.appendChild(button);communityItems.appendChild(row);
        });
      } catch(error){communityItems.textContent='Could not load USER PLAYLISTS: '+error.message;}
    }
    if(communityTab) communityTab.addEventListener('click',function(){showCommunity(!communityActive);});
    refreshSaved().catch(function(error){say('Local saving unavailable: '+error.message);});
  })();

  refreshTabs();
  player.initFileSelection();
  renderLivePlaylist();
})();
