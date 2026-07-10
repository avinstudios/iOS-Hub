(function () {
  // --- Detect standalone / home-screen mode ---
  var isStandalone = (window.navigator.standalone === true) ||
                      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);

  var siteContent = document.getElementById('site-content');
  var appMode = document.getElementById('app-mode');
  var footer = document.getElementById('site-footer');
  var siteHeader = document.querySelector('header');

  if (isStandalone) {
    siteContent.style.display = 'none';
    footer.style.display = 'none';
    if (siteHeader) siteHeader.style.display = 'none';
    appMode.style.display = 'block';
  }

  // --- Haptic feedback helper (native app feel) ---
  function haptic() {
    if (navigator.vibrate) navigator.vibrate(8);
  }
  document.querySelectorAll('.am-tab, .am-sub-tab, .btn, .calc-btn, .am-row').forEach(function (el) {
    el.addEventListener('click', haptic);
  });

  // --- Tabs ---
  var tabs = document.querySelectorAll('.am-tab');
  var panels = { apps: document.getElementById('panel-apps'), utilities: document.getElementById('panel-utilities'), device: document.getElementById('panel-device'), notes: document.getElementById('panel-notes'), info: document.getElementById('panel-info') };
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      Object.keys(panels).forEach(function (k) { panels[k].classList.remove('active'); });
      panels[tab.dataset.tab].classList.add('active');
    });
  });

  // --- Sub-tabs (generic handler for both Apps and Utilities groups) ---
  document.querySelectorAll('.am-sub-tab').forEach(function (sub) {
    sub.addEventListener('click', function () {
      var group = sub.dataset.group;
      document.querySelectorAll('.am-sub-tab[data-group="' + group + '"]').forEach(function (s) { s.classList.remove('active'); });
      sub.classList.add('active');
      var contentClass = group === 'apps' ? '.am-group-apps' : '.am-group-util';
      document.querySelectorAll(contentClass).forEach(function (c) { c.style.display = 'none'; });
      var target = document.querySelector(contentClass + '[data-group-content="' + sub.dataset.sub + '"]');
      if (target) target.style.display = group === 'apps' ? 'flex' : 'block';
    });
  });

  // --- Calculator ---
  var calcDisplay = document.getElementById('calcDisplay');
  var calcExpr = '';
  document.querySelectorAll('.calc-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var c = btn.dataset.c;
      if (c === 'clear') {
        calcExpr = '';
      } else if (c === '=') {
        try {
          if (/^[0-9+\-*/().\s]+$/.test(calcExpr)) {
            var result = Function('"use strict"; return (' + calcExpr + ')')();
            calcExpr = String(result);
          } else {
            calcExpr = 'Error';
          }
        } catch (e) {
          calcExpr = 'Error';
        }
      } else {
        calcExpr += c;
      }
      calcDisplay.textContent = calcExpr === '' ? '0' : calcExpr;
    });
  });

  // --- PIN Generator ---
  var pinLength = document.getElementById('pinLength');
  var pinLenVal = document.getElementById('pinLenVal');
  var pinDisplay = document.getElementById('pinDisplay');
  var pinGenBtn = document.getElementById('pinGenBtn');
  pinLength.addEventListener('input', function () { pinLenVal.textContent = pinLength.value; });
  pinGenBtn.addEventListener('click', function () {
    var len = parseInt(pinLength.value, 10);
    var min = Math.pow(10, len - 1);
    var max = Math.pow(10, len) - 1;
    var pin = Math.floor(Math.random() * (max - min + 1)) + min;
    pinDisplay.textContent = String(pin);
    if (navigator.clipboard) navigator.clipboard.writeText(String(pin)).catch(function () {});
  });

  // --- Dice / Coin ---
  var diceResult = document.getElementById('diceResult');
  var diceSub = document.getElementById('diceSub');
  document.getElementById('btnCoin').addEventListener('click', function () {
    var flip = Math.random() < 0.5 ? 'Heads' : 'Tails';
    diceResult.textContent = flip === 'Heads' ? '🙂 Heads' : '🪙 Tails';
    diceSub.textContent = 'Coin flip result';
  });
  document.getElementById('btnDie1').addEventListener('click', function () {
    var d = Math.floor(Math.random() * 6) + 1;
    diceResult.textContent = '🎲 ' + d;
    diceSub.textContent = 'You rolled a ' + d;
  });
  document.getElementById('btnDie2').addEventListener('click', function () {
    var d1 = Math.floor(Math.random() * 6) + 1;
    var d2 = Math.floor(Math.random() * 6) + 1;
    diceResult.textContent = '🎲 ' + d1 + '  🎲 ' + d2;
    diceSub.textContent = 'Total: ' + (d1 + d2);
  });

  // --- QR Scanner ---
  var qrVideo = document.getElementById('qrVideo');
  var qrResult = document.getElementById('qrResult');
  var qrStartBtn = document.getElementById('qrStartBtn');
  var qrOpenBtn = document.getElementById('qrOpenBtn');
  var qrCanvas = document.createElement('canvas');
  var qrCtx = qrCanvas.getContext('2d');
  var qrStream = null;
  var qrScanning = false;
  var qrLastValue = '';

  qrStartBtn.addEventListener('click', function () {
    if (qrScanning) return;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(function (stream) {
        qrStream = stream;
        qrVideo.srcObject = stream;
        qrVideo.play();
        qrScanning = true;
        qrStartBtn.textContent = 'Scanning…';
        requestAnimationFrame(qrTick);
      })
      .catch(function () {
        qrResult.textContent = 'Camera access denied or unavailable.';
      });
  });

  function qrTick() {
    if (!qrScanning) return;
    if (qrVideo.readyState === qrVideo.HAVE_ENOUGH_DATA) {
      qrCanvas.width = qrVideo.videoWidth;
      qrCanvas.height = qrVideo.videoHeight;
      qrCtx.drawImage(qrVideo, 0, 0, qrCanvas.width, qrCanvas.height);
      var imageData = qrCtx.getImageData(0, 0, qrCanvas.width, qrCanvas.height);
      if (window.jsQR) {
        var code = window.jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data && code.data !== qrLastValue) {
          qrLastValue = code.data;
          qrResult.textContent = code.data;
          qrResult.classList.add('has-result');
          if (/^https?:\/\//.test(code.data)) {
            qrOpenBtn.style.display = 'flex';
            qrOpenBtn.onclick = function () { window.open(code.data, '_blank'); };
          } else {
            qrOpenBtn.style.display = 'none';
          }
        }
      }
    }
    requestAnimationFrame(qrTick);
  }

  // --- Info tab: time ---
  var infoTime = document.getElementById('infoTime');

  function updateTime() {
    infoTime.textContent = new Date().toLocaleTimeString();
  }
  updateTime();
  setInterval(updateTime, 1000);

  // --- Notes (App Mode exclusive) ---
  var notesArea = document.getElementById('notesArea');
  var notesClearBtn = document.getElementById('notesClearBtn');
  var NOTES_KEY = 'iosHubAppModeNotes';

  try {
    var savedNotes = localStorage.getItem(NOTES_KEY);
    if (savedNotes) notesArea.value = savedNotes;
  } catch (e) {}

  var notesSaveTimer;
  notesArea.addEventListener('input', function () {
    clearTimeout(notesSaveTimer);
    notesSaveTimer = setTimeout(function () {
      try { localStorage.setItem(NOTES_KEY, notesArea.value); } catch (e) {}
    }, 300);
  });
  notesClearBtn.addEventListener('click', function () {
    notesArea.value = '';
    try { localStorage.removeItem(NOTES_KEY); } catch (e) {}
  });

  // --- Device tab (App Mode exclusive) ---
  var devConnection = document.getElementById('devConnection');
  var devNetType = document.getElementById('devNetType');
  var devScreen = document.getElementById('devScreen');
  var devOrientation = document.getElementById('devOrientation');
  var devStorage = document.getElementById('devStorage');

  function renderConnection() {
    devConnection.textContent = navigator.onLine ? 'Online ✅' : 'Offline ⚠️';
  }
  renderConnection();
  window.addEventListener('online', renderConnection);
  window.addEventListener('offline', renderConnection);

  var conn = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
  if (conn && conn.effectiveType) {
    devNetType.textContent = conn.effectiveType.toUpperCase();
    conn.addEventListener && conn.addEventListener('change', function () {
      devNetType.textContent = conn.effectiveType.toUpperCase();
    });
  } else {
    devNetType.textContent = 'Not available in this browser';
  }

  function renderScreen() {
    devScreen.textContent = window.screen.width + ' × ' + window.screen.height + ' @' + window.devicePixelRatio + 'x';
    devOrientation.textContent = window.screen.width > window.screen.height ? 'Landscape' : 'Portrait';
  }
  renderScreen();
  window.addEventListener('resize', renderScreen);

  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate().then(function (est) {
      var usedMB = (est.usage / (1024 * 1024)).toFixed(1);
      var quotaMB = (est.quota / (1024 * 1024)).toFixed(0);
      devStorage.textContent = usedMB + ' MB / ' + quotaMB + ' MB';
    }).catch(function () {
      devStorage.textContent = 'Unavailable';
    });
  } else {
    devStorage.textContent = 'Not available in this browser';
  }

  // Clipboard
  var clipboardResult = document.getElementById('clipboardResult');
  var clipboardReadBtn = document.getElementById('clipboardReadBtn');
  var clipboardClearBtn = document.getElementById('clipboardClearBtn');

  clipboardReadBtn.addEventListener('click', function () {
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(function (text) {
        clipboardResult.textContent = text ? text : '(Clipboard is empty)';
        clipboardResult.classList.add('has-result');
      }).catch(function () {
        clipboardResult.textContent = 'Permission denied or unavailable.';
      });
    } else {
      clipboardResult.textContent = 'Clipboard reading not supported in this browser.';
    }
  });

  clipboardClearBtn.addEventListener('click', function () {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText('').then(function () {
        clipboardResult.textContent = 'Clipboard cleared.';
      }).catch(function () {
        clipboardResult.textContent = 'Could not clear clipboard.';
      });
    }
  });

  // --- Screen Wake Lock ---
  var wakeLockBtn = document.getElementById('wakeLockBtn');
  var wakeLock = null;

  wakeLockBtn.addEventListener('click', function () {
    if (wakeLock) {
      wakeLock.release();
      wakeLock = null;
      wakeLockBtn.textContent = '🔆 Keep Screen Awake: Off';
      wakeLockBtn.className = 'btn btn-ghost';
    } else if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(function (lock) {
        wakeLock = lock;
        wakeLockBtn.textContent = '🔆 Keep Screen Awake: On';
        wakeLockBtn.className = 'btn btn-primary';
        wakeLock.addEventListener('release', function () {
          wakeLockBtn.textContent = '🔆 Keep Screen Awake: Off';
          wakeLockBtn.className = 'btn btn-ghost';
          wakeLock = null;
        });
      }).catch(function () {
        wakeLockBtn.textContent = 'Not supported here';
      });
    } else {
      wakeLockBtn.textContent = 'Not supported in this browser';
    }
  });

  // --- Fullscreen ---
  var fullscreenBtn = document.getElementById('fullscreenBtn');
  fullscreenBtn.addEventListener('click', function () {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(function () {
        fullscreenBtn.textContent = '⛶ Exit Full Screen';
      }).catch(function () {
        fullscreenBtn.textContent = 'Not supported here';
      });
    } else {
      document.exitFullscreen();
      fullscreenBtn.textContent = '⛶ Enter Full Screen';
    }
  });
  document.addEventListener('fullscreenchange', function () {
    fullscreenBtn.textContent = document.fullscreenElement ? '⛶ Exit Full Screen' : '⛶ Enter Full Screen';
  });

  // --- Motion sensor test (works on iOS Safari with permission) ---
  var motionBtn = document.getElementById('motionBtn');
  var motionReadout = document.getElementById('motionReadout');
  var motionX = document.getElementById('motionX');
  var motionY = document.getElementById('motionY');
  var motionZ = document.getElementById('motionZ');
  var motionActive = false;

  function handleOrientation(e) {
    motionX.textContent = (e.beta || 0).toFixed(1) + '°';
    motionY.textContent = (e.gamma || 0).toFixed(1) + '°';
    motionZ.textContent = (e.alpha || 0).toFixed(1) + '°';
  }

  function startMotion() {
    window.addEventListener('deviceorientation', handleOrientation);
    motionReadout.style.display = 'flex';
    motionActive = true;
    motionBtn.textContent = '🧭 Stop Motion Test';
    motionBtn.className = 'btn btn-primary';
  }

  function stopMotion() {
    window.removeEventListener('deviceorientation', handleOrientation);
    motionReadout.style.display = 'none';
    motionActive = false;
    motionBtn.textContent = '🧭 Test Motion Sensor';
    motionBtn.className = 'btn btn-ghost';
  }

  motionBtn.addEventListener('click', function () {
    if (motionActive) {
      stopMotion();
      return;
    }
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS 13+ requires an explicit permission request from a user gesture
      DeviceOrientationEvent.requestPermission().then(function (result) {
        if (result === 'granted') {
          startMotion();
        } else {
          motionBtn.textContent = 'Permission denied';
          setTimeout(function () { motionBtn.textContent = '🧭 Test Motion Sensor'; }, 1500);
        }
      }).catch(function () {
        motionBtn.textContent = 'Not supported here';
        setTimeout(function () { motionBtn.textContent = '🧭 Test Motion Sensor'; }, 1500);
      });
    } else if ('DeviceOrientationEvent' in window) {
      // Android / other browsers — no permission prompt needed
      startMotion();
    } else {
      motionBtn.textContent = 'Not supported on this device';
      setTimeout(function () { motionBtn.textContent = '🧭 Test Motion Sensor'; }, 1500);
    }
  });

  // --- Clear App Data ---
  // --- Storage breakdown ---
  var storageAppSize = document.getElementById('storageAppSize');
  var storageCacheSize = document.getElementById('storageCacheSize');

  function refreshStorageBreakdown() {
    try {
      var bytes = 0;
      for (var key in localStorage) {
        if (localStorage.hasOwnProperty(key) && key.indexOf('iosHub') === 0) {
          bytes += (localStorage[key].length + key.length) * 2;
        }
      }
      storageAppSize.textContent = bytes < 1024 ? bytes + ' B' : (bytes / 1024).toFixed(1) + ' KB';
    } catch (e) {
      storageAppSize.textContent = 'Unavailable';
    }

    if ('caches' in window) {
      caches.open(CACHE_NAME_FOR_DISPLAY).then(function (cache) {
        return cache.keys();
      }).then(function (keys) {
        storageCacheSize.textContent = keys.length + ' file' + (keys.length === 1 ? '' : 's') + ' cached';
      }).catch(function () {
        storageCacheSize.textContent = 'Not cached yet';
      });
    } else {
      storageCacheSize.textContent = 'Not supported';
    }
  }
  var CACHE_NAME_FOR_DISPLAY = 'ios-hub-cache-v1';
  refreshStorageBreakdown();

  var clearDataBtn = document.getElementById('clearDataBtn');
  clearDataBtn.addEventListener('click', function () {
    if (confirm('Clear all saved app data (notes, theme) and the offline cache from this device?')) {
      try {
        localStorage.removeItem(NOTES_KEY);
        localStorage.removeItem(THEME_KEY);
      } catch (e) {}
      if ('caches' in window) {
        caches.delete(CACHE_NAME_FOR_DISPLAY);
      }
      notesArea.value = '';
      applyTheme('dark');
      clearDataBtn.textContent = '✅ Cleared';
      refreshStorageBreakdown();
      setTimeout(function () { clearDataBtn.textContent = '🗑 Clear App Data'; }, 1500);
    }
  });

  // --- Permissions audit ---
  var permCamera = document.getElementById('permCamera');
  var permMic = document.getElementById('permMic');
  var permLocation = document.getElementById('permLocation');
  var permNotifications = document.getElementById('permNotifications');
  var permClipboard = document.getElementById('permClipboard');
  var refreshPermsBtn = document.getElementById('refreshPermsBtn');

  function labelForState(state) {
    if (state === 'granted') return '✅ Allowed';
    if (state === 'denied') return '⛔ Blocked';
    if (state === 'prompt') return '❔ Not asked yet';
    return 'Unknown';
  }

  function checkPermission(name, el) {
    if (!navigator.permissions || !navigator.permissions.query) {
      el.textContent = 'Not supported';
      return;
    }
    navigator.permissions.query({ name: name }).then(function (status) {
      el.textContent = labelForState(status.state);
      status.onchange = function () { el.textContent = labelForState(status.state); };
    }).catch(function () {
      el.textContent = 'Not supported';
    });
  }

  function refreshPermissions() {
    checkPermission('camera', permCamera);
    checkPermission('microphone', permMic);
    checkPermission('geolocation', permLocation);
    checkPermission('clipboard-read', permClipboard);

    if ('Notification' in window) {
      permNotifications.textContent = labelForState(Notification.permission === 'default' ? 'prompt' : Notification.permission);
    } else {
      permNotifications.textContent = 'Not supported';
    }
  }
  refreshPermissions();
  refreshPermsBtn.addEventListener('click', refreshPermissions);

  // --- Real network speed test ---
  var speedTestBtn = document.getElementById('speedTestBtn');
  var speedResult = document.getElementById('speedResult');
  var latencyResult = document.getElementById('latencyResult');

  speedTestBtn.addEventListener('click', function () {
    speedTestBtn.textContent = 'Testing…';
    speedResult.textContent = 'Testing…';
    latencyResult.textContent = 'Testing…';

    var latencyStart = performance.now();
    // Latency: tiny request, cache-busted
    fetch('assets/favicon.png?cb=' + Date.now(), { cache: 'no-store' })
      .then(function () {
        var latency = Math.round(performance.now() - latencyStart);
        latencyResult.textContent = latency + ' ms';

        // Speed: download a known ~90KB JS file from a CDN, cache-busted
        var testUrl = 'https://cdnjs.cloudflare.com/ajax/libs/jsqr/1.4.0/jsQR.js?cb=' + Date.now();
        var speedStart = performance.now();
        return fetch(testUrl, { cache: 'no-store' }).then(function (res) {
          return res.blob().then(function (blob) {
            var seconds = (performance.now() - speedStart) / 1000;
            var bits = blob.size * 8;
            var mbps = (bits / seconds / 1000000).toFixed(2);
            speedResult.textContent = mbps + ' Mbps';
          });
        });
      })
      .catch(function () {
        speedResult.textContent = 'Test failed';
        latencyResult.textContent = 'Test failed';
      })
      .finally(function () {
        speedTestBtn.textContent = '📶 Run Speed Test';
      });
  });

  // --- Location ---
  var locationBtn = document.getElementById('locationBtn');
  var locationResult = document.getElementById('locationResult');
  locationBtn.addEventListener('click', function () {
    if (!navigator.geolocation) {
      locationResult.textContent = 'Geolocation not supported in this browser.';
      return;
    }
    locationResult.textContent = 'Locating…';
    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = pos.coords.latitude.toFixed(5);
      var lon = pos.coords.longitude.toFixed(5);
      var acc = Math.round(pos.coords.accuracy);
      locationResult.innerHTML = 'Lat: ' + lat + '<br>Lon: ' + lon + '<br>Accuracy: ±' + acc + 'm';
      locationResult.classList.add('has-result');
    }, function (err) {
      locationResult.textContent = 'Could not get location: ' + err.message;
    }, { enableHighAccuracy: true, timeout: 10000 });
  });

  // --- Speaker/Sound Test (Web Audio API — works everywhere including iOS) ---
  var soundTestBtn = document.getElementById('soundTestBtn');
  soundTestBtn.addEventListener('click', function () {
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      var ctx = new AudioCtx();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 440;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
      soundTestBtn.textContent = '🔊 Playing…';
      setTimeout(function () { soundTestBtn.textContent = '🔊 Play Test Tone'; }, 700);
    } catch (e) {
      soundTestBtn.textContent = 'Not supported here';
      setTimeout(function () { soundTestBtn.textContent = '🔊 Play Test Tone'; }, 1500);
    }
  });

  // --- Real notifications via the service worker ---
  function notify(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      navigator.serviceWorker.getRegistration().then(function (reg) {
        if (reg) reg.active.postMessage({ type: 'SHOW_NOTIFICATION', title: title, body: body });
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(function (perm) {
        if (perm === 'granted') notify(title, body);
      });
    }
  }

  // --- Focus Timer ---
  var focusDisplay = document.getElementById('focusDisplay');
  var focusStartBtn = document.getElementById('focusStartBtn');
  var focusMinutes = 5;
  var focusInterval = null;
  var focusSecondsLeft = focusMinutes * 60;

  function renderFocus() {
    var m = Math.floor(focusSecondsLeft / 60);
    var s = focusSecondsLeft % 60;
    focusDisplay.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function setFocusMinutes(mins) {
    if (focusInterval) return; // don't change while running
    focusMinutes = mins;
    focusSecondsLeft = mins * 60;
    renderFocus();
  }
  document.getElementById('focus5Btn').addEventListener('click', function () { setFocusMinutes(5); });
  document.getElementById('focus15Btn').addEventListener('click', function () { setFocusMinutes(15); });
  document.getElementById('focus25Btn').addEventListener('click', function () { setFocusMinutes(25); });

  focusStartBtn.addEventListener('click', function () {
    if (focusInterval) {
      clearInterval(focusInterval);
      focusInterval = null;
      focusStartBtn.textContent = 'Start Focus Timer';
      focusSecondsLeft = focusMinutes * 60;
      renderFocus();
      return;
    }
    focusStartBtn.textContent = 'Cancel';
    focusInterval = setInterval(function () {
      focusSecondsLeft--;
      renderFocus();
      if (focusSecondsLeft <= 0) {
        clearInterval(focusInterval);
        focusInterval = null;
        focusStartBtn.textContent = 'Start Focus Timer';
        focusDisplay.textContent = "Time's up!";
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        notify('Focus Timer Complete', 'Your ' + focusMinutes + '-minute focus session has ended.');
        setTimeout(function () {
          focusSecondsLeft = focusMinutes * 60;
          renderFocus();
        }, 3000);
      }
    }, 1000);
  });
  renderFocus();

  // --- Session timer ("Time in App") ---
  var sessionTimeEl = document.getElementById('sessionTime');
  var sessionStart = Date.now();
  setInterval(function () {
    var elapsed = Math.floor((Date.now() - sessionStart) / 1000);
    var m = Math.floor(elapsed / 60);
    var s = elapsed % 60;
    sessionTimeEl.textContent = m + ':' + (s < 10 ? '0' : '') + s;
  }, 1000);

  // --- Theme switcher (App Mode exclusive) ---
  var themeDarkBtn = document.getElementById('themeDarkBtn');
  var themeLightBtn = document.getElementById('themeLightBtn');
  var THEME_KEY = 'iosHubAppModeTheme';

  function applyTheme(theme) {
    if (theme === 'light') {
      appMode.classList.add('am-light');
      themeLightBtn.className = 'btn btn-primary';
      themeDarkBtn.className = 'btn btn-ghost';
    } else {
      appMode.classList.remove('am-light');
      themeDarkBtn.className = 'btn btn-primary';
      themeLightBtn.className = 'btn btn-ghost';
    }
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  }

  themeDarkBtn.addEventListener('click', function () { applyTheme('dark'); });
  themeLightBtn.addEventListener('click', function () { applyTheme('light'); });

  try {
    var savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) applyTheme(savedTheme);
  } catch (e) {}
})();
