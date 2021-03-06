async function fetchTimeout(url, args = {}, timeout = 5000){
  let controller = new AbortController();
  let timeoutId = setTimeout(() => controller.abort(), timeout);
  return await fetch(url, Object.assign({ signal: controller.signal }, args));
}
async function track(event, props) {
  try {
    // Token ID
    let token = 'a17adb469eb6c2dd0e78217022de6e9d';
    // Generate random strings
    function genID(){
      let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let str = '';
      for (;str.length < 24;) str += characters.charAt(Math.random() * characters.length);
      return str;
    }
    // Generate user IDF
    let sync_data = await chrome.storage.sync.get(null);
    let user_id = sync_data.user_id;
    if (!user_id) {
      user_id = genID();
      await chrome.storage.sync.set({ user_id });
    }
    // Generate properties object
    let properties = Object.assign(Object.assign({}, props), {
      'time': Date.now() / 1000 | 0,
      'distinct_id': user_id,
      '$insert_id': genID(),
      'token': token
    });
    // Get if analytics are enabled
    let do_analytics = sync_data.options && sync_data.options.analytics;
    if (!do_analytics) {
      return;
    }
    // Send event
    return await fetchTimeout('https://api.mixpanel.com/track', {
      'method': 'POST',
      'headers': {
        'Accept': 'text/plain',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      'body': new URLSearchParams({
        'data': JSON.stringify({ event, properties }),
        'verbose': 1
      }, 2000)
    }).then(response => response.json());
  } catch { }
}

chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason == 'install') {
    var uninstallUrlLink = 'https://forms.gle/h2djLMjEC88oK1vq9';
    if (chrome.runtime.setUninstallURL) {
      chrome.runtime.setUninstallURL(uninstallUrlLink);
    }
    chrome.tabs.create({url: 'https://accentpress.pandapip1.com/html/howto.html'}, () => {});
  }
});

chrome.runtime.onMessageExternal.addListener(async (request, sender, sendResponse) => {
  try {
    if (request.type == 'GET_DATA') {
      // Fetch data
      let storage_data_local = await chrome.storage.local.get(null);
      let storage_data_sync = await chrome.storage.sync.get(null);
      // Make data
      let defaults = (storage_data_local && storage_data_local.cache && 'defaults' in storage_data_local.cache) ? storage_data_local.cache.defaults : await fetchTimeout('https://accentpress.pandapip1.com/config/defaults.json').then(res => res.json());
      let speed = (storage_data_sync && storage_data_sync.options && 'speed' in storage_data_sync.options && !Number.isNaN(parseInt(storage_data_sync.options.speed))) ? parseInt(storage_data_sync.options.speed) : defaults.options.speed;
      let langs = (storage_data_sync && 'langs' in storage_data_sync) ? storage_data_sync.langs : defaults.langs;
      // Send tracking event
      track('settings_open', {}).catch(() => {});
      // Send response
      sendResponse({
        success: true,
        storage_data: {
          langs: langs,
          options: {
            speed: speed
          }
        }
      });
    }
    if (request.type == 'SET_DATA') {
      // Fetch data
      let storage_data_local = await chrome.storage.local.get(null);
      let storage_data_old = await chrome.storage.sync.get(null);
      let storage_data_new = request.storage_data;
      // Make data
      let defaults = (storage_data_local && storage_data_local.cache && 'defaults' in storage_data_local.cache) ? storage_data_local.cache.defaults : await fetchTimeout('https://accentpress.pandapip1.com/config/defaults.json').then(res => res.json());
      let speed_old = (storage_data_old && storage_data_old.options && storage_data_old.options.speed && !Number.isNaN(parseInt(storage_data_old.options.speed))) ? parseInt(storage_data_old.options.speed) : defaults.options.speed;
      let langs_old = (storage_data_old && 'langs' in storage_data_old) ? storage_data_old.langs : defaults.langs;
      let analytics_old = (storage_data_old && storage_data_old.options && 'analytics' in storage_data_old.options) ? storage_data_old.options.analytics : defaults.options.analytics;
      let speed_new = (storage_data_new && storage_data_new.options && storage_data_new.options.speed && !Number.isNaN(parseInt(storage_data_new.options.speed))) ? parseInt(storage_data_new.options.speed) : speed_old;
      let langs_new = (storage_data_new && 'langs' in storage_data_new) ? storage_data_new.langs : langs_old;
      let analytics_new = (storage_data_new && storage_data_new.options && 'analytics' in storage_data_new.options) ? storage_data_new.options.analytics : analytics_old;
      // Set new data
      await chrome.storage.sync.set({
        langs: langs_new,
        options: {
          speed: speed_new,
          analytics: analytics_new
        }
      });
      // Send tracking event
      track('settings_change', {
        local_storage: storage_data_local,
        sync_storage: storage_data_new,
        sync_storage_old: storage_data_old,
        speed_old: speed_old,
        speed_new: speed_old,
        chg_speed: speed_new-speed_old,
        langs_old: langs_old,
        langs_new: langs_new,
        langs_add: langs_new.filter(x => langs_old.indexOf(x) < 0),
        langs_rem: langs_old.filter(x => langs_new.indexOf(x) < 0)
      }).catch(() => {});
      // Send response
      sendResponse({
        success: true
      });
    }
    if (request.type == 'RESET_DATA') {
      // Fetch data
      let storage_data_local = await chrome.storage.local.get(null);
      let storage_data_sync = await chrome.storage.sync.get(null);
      // Clear storage
      await chrome.storage.local.clear();
      await chrome.storage.sync.clear();
      // Send tracking event
      track('settings_clear', {
        local_storage: storage_data_local,
        sync_storage: storage_data_sync
      }).catch(() => {});
      // Send response
      sendResponse({
        success: true
      });
    }
  } catch (e) {
    // Automatic error reporting
    track('error_detected', {
      location: 'js.background.js-chrome.runtime.onMessageExternal',
      error_msg: e.toString(),
      error_stack: e.stack
    }).catch(() => {});
  }
});

// Google docs inline JS support
function gdocsProcessCSP(details) {
  var headers = details.responseHeaders;
  for (var j = 0, jLen = headers.length; j !== jLen; ++j) {
    var header = headers[j];
    var name = header.name.toLowerCase();
    if (name !== "content-security-policy" &&
      name !== "content-security-policy-report-only" &&
      name !== "x-webkit-csp") {
      continue;
    }
    header.value = header.value + ' \'sha256-a989iW+/YeEih4W54FJTnSzB6Ekxtdib5RoUJKtHezU=\''
  }
  return {responseHeaders: headers};
}

chrome.webRequest.onHeadersReceived.addListener(gdocsProcessCSP, {
    urls: ["https://docs.google.com/*"],
    types: ["main_frame", "sub_frame"]
}, ["blocking", "responseHeaders"]);
