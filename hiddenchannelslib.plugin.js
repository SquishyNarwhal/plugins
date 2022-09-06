/**
 * @name hiddenchannelslib
 * @author DevilBro
 * @authorId 278543574059057154
 * @version 2.5.8
 * @description Required Library for DevilBro's Plugins
 * @invite Jx3TjNS
 * @source https://raw.githubusercontent.com/SquishyNarwhal/plugins/main/
 * @updateUrl https://raw.githubusercontent.com/SquishyNarwhal/plugins/main/hiddenchannelslib.plugin.js
 */

 module.exports = (_ => {
	if (window.hiddenchannelslib_Global && window.hiddenchannelslib_Global.PluginUtils && typeof window.hiddenchannelslib_Global.PluginUtils.cleanUp == "function") window.hiddenchannelslib_Global.PluginUtils.cleanUp(window.hiddenchannelslib_Global);
	
	var hiddenchannelslib, Internal, LibraryConstants, LibraryModules, LibraryRequires, DiscordObjects, PluginStores;
	
	hiddenchannelslib = {
		started: true
	};
	
	return class hiddenchannelslib_Frame {
		constructor (meta) {for (let key in meta) {
			if (!this[key]) this[key] = meta[key];
			if (!hiddenchannelslib[key]) hiddenchannelslib[key] = meta[key];
		}}
		getName () {return this.name;}
		getAuthor () {return this.author;}
		getVersion () {return this.version;}
		getDescription () {return this.description;}
		
		load () {
			const BdApi = window.BdApi;
			
			const Cache = {data: {}, modules: {}};
			
			var changeLogs = {};
			
			Internal = Object.assign({}, hiddenchannelslib, {
				patchPriority: 0,
				forceSyncData: true,
				settings: {},
				defaults: {
					general: {
						shareData: {
							value: true,
							onChange: _ => Cache.data = {}
						},
						showToasts: {
							value: true,
							isDisabled: data => data.nativeValue,
							hasNote: data => data.disabled && data.value
						},
						showSupportBadges: {
							value: false
						},
						useChromium: {
							value: false,
							isHidden: data => !Internal.LibraryRequires.electron || !Internal.LibraryRequires.electron.remote,
							getValue: data => !data.disabled
						}
					},
					choices: {
						toastPosition: {
							value: "right",
							items: "ToastPositions"
						}
					}
				},
			});
			for (let key in Internal.defaults) Internal.settings[key] = {};
			
			LibraryConstants = {
				ToastIcons: {
					info: "INFO",
					danger: "CLOSE_CIRCLE",
					success: "CHECKMARK_CIRCLE",
					warning: "WARNING"
				},
				ToastPositions: {
					center: "toastscenter",
					left: "toastsleft",
					right: "toastsright"
				}
			};
			
			PluginStores = {
				loaded: {},
				delayed: {
					loads: [],
					starts: []
				},
				updateData: {
					plugins: {},
					timeouts: [],
					downloaded: [],
					interval: null
				},
				patchQueues: {},
				chunkObserver: {},
				contextChunkObserver: {}
			};
			
			const Plugin = function (changeLog) {
				return class Plugin {
					constructor (meta) {for (let key in meta) if (!this[key]) this[key] = meta[key];}
					getName () {return this.name;}
					getAuthor () {return this.author;}
					getVersion () {return this.version;}
					getDescription () {return this.description;}
					load () {
						this.changeLog = changeLog;
						this.loaded = true;
						this.defaults = {};
						this.labels = {};
						if (window.hiddenchannelslib_Global.loading) {
							if (!PluginStores.delayed.loads.includes(this)) PluginStores.delayed.loads.push(this);
						}
						else hiddenchannelslib.TimeUtils.suppress(_ => {
							PluginStores.loaded[this.name] = this;
							hiddenchannelslib.PluginUtils.load(this);
							if (typeof this.onLoad == "function") this.onLoad();
						}, "Failed to load Plugin!", this)();
					}
					start () {
						if (!this.loaded) this.load();
						if (window.hiddenchannelslib_Global.loading) {
							if (!PluginStores.delayed.starts.includes(this)) PluginStores.delayed.starts.push(this);
						}
						else {
							if (this.started) return;
							this.started = true;
							hiddenchannelslib.TimeUtils.suppress(_ => {
								hiddenchannelslib.PluginUtils.init(this);
								if (typeof this.onStart == "function") this.onStart();
							}, "Failed to start Plugin!", this)();
							delete this.stopping;
						}
					}
					stop () {
						if (window.hiddenchannelslib_Global.loading) {
							if (PluginStores.delayed.starts.includes(this)) PluginStores.delayed.starts.splice(PluginStores.delayed.starts.indexOf(this), 1);
						}
						else {
							if (this.stopping) return;
							this.stopping = true;
							hiddenchannelslib.TimeUtils.timeout(_ => {delete this.stopping;});
							
							hiddenchannelslib.TimeUtils.suppress(_ => {
								if (typeof this.onStop == "function") this.onStop();
								hiddenchannelslib.PluginUtils.clear(this);
							}, "Failed to stop Plugin!", this)();

							delete this.started;
						}
					}
				};
			};

			hiddenchannelslib.LogUtils = {};
			Internal.console = function (type, config = {}) {
				if (!console[type]) return;
				let name, version;
				if (typeof config.name == "string" && config.name) {
					name = config.name;
					version = typeof config.version == "string" ? config.version : "";
				}
				else {
					name = hiddenchannelslib.name;
					version = hiddenchannelslib.version;
				}
				console[type](...[[name && `%c[${name}]`, version && `%c(v${version})`].filter(n => n).join(" "), name && "color: #3a71c1; font-weight: 700;", version && "color: #666; font-weight: 600; font-size: 11px;", [config.strings].flat(10).filter(n => n).join(" ").trim()].filter(n => n));
			};
			hiddenchannelslib.LogUtils.log = function (strings, config = {}) {
				Internal.console("log", Object.assign({}, config, {name: typeof config == "string" ? config : config.name, strings}));
			};
			hiddenchannelslib.LogUtils.warn = function (strings, config = {}) {
				Internal.console("warn", Object.assign({}, config, {name: typeof config == "string" ? config : config.name, strings}));
			};
			hiddenchannelslib.LogUtils.error = function (strings, config = {}) {
				Internal.console("error", Object.assign({}, config, {name: typeof config == "string" ? config : config.name, strings: ["Fatal Error:", strings]}));
			};

			hiddenchannelslib.TimeUtils = {};
			hiddenchannelslib.TimeUtils.interval = function (callback, delay, ...args) {
				if (typeof callback != "function" || typeof delay != "number" || delay < 1) return;
				else {
					let count = 0, interval = setInterval(_ => hiddenchannelslib.TimeUtils.suppress(callback, "Interval")(...[interval, count++, args].flat()), delay);
					return interval;
				}
			};
			hiddenchannelslib.TimeUtils.timeout = function (callback, delay, ...args) {
				delay = parseFloat(delay);
				if (typeof callback != "function") return;
				if (isNaN(delay) || typeof delay != "number" || delay < 1) {
					let immediate = setImmediate(_ => hiddenchannelslib.TimeUtils.suppress(callback, "Immediate")(...[immediate, args].flat()));
					return immediate;
				}
				else {
					let start, paused = true, timeout = {
						pause: _ => {
							if (paused) return;
							paused = true;
							hiddenchannelslib.TimeUtils.clear(timeout.timer);
							delay -= performance.now() - start;
						},
						resume: _ => {
							if (!paused) return;
							paused = false;
							start = performance.now();
							timeout.timer = setTimeout(_ => hiddenchannelslib.TimeUtils.suppress(callback, "Timeout")(...[timeout, args].flat()), delay)
						}
					};
					timeout.resume();
					return timeout;
				}
			};
			hiddenchannelslib.TimeUtils.clear = function (...timeObjects) {
				for (let t of timeObjects.flat(10).filter(n => n)) {
					t = t.timer != undefined ? t.timer : t;
					if (typeof t == "number") {
						clearInterval(t);
						clearTimeout(t);
					}
					else if (typeof t == "object") clearImmediate(t);
				}
			};
			hiddenchannelslib.TimeUtils.suppress = function (callback, strings, config) {return function (...args) {
				try {return callback(...args);}
				catch (err) {hiddenchannelslib.LogUtils.error([strings, err], config);}
			}};

			hiddenchannelslib.LogUtils.log("Loading Library");

			hiddenchannelslib.sameProto = function (a, b) {
				if (a != null && typeof a == "object") return a.constructor && a.constructor.prototype && typeof a.constructor.prototype.isPrototypeOf == "function" && a.constructor.prototype.isPrototypeOf(b);
				else return typeof a == typeof b;
			};
			hiddenchannelslib.equals = function (mainA, mainB, sorted) {
				let i = -1;
				if (sorted === undefined || typeof sorted !== "boolean") sorted = false;
				return equal(mainA, mainB);
				function equal(a, b) {
					i++;
					let result = true;
					if (i > 1000) result = null;
					else {
						if (typeof a !== typeof b) result = false;
						else if (typeof a == "function") result = a.toString() == b.toString();
						else if (typeof a === "undefined") result = true;
						else if (typeof a === "symbol") result = true;
						else if (typeof a === "boolean") result = a == b;
						else if (typeof a === "string") result = a == b;
						else if (typeof a === "number") {
							if (isNaN(a) || isNaN(b)) result = isNaN(a) == isNaN(b);
							else result = a == b;
						}
						else if (!a && !b) result = true;
						else if (!a || !b) result = false;
						else if (typeof a === "object") {
							let keysA = Object.getOwnPropertyNames(a);
							let keysB = Object.getOwnPropertyNames(b);
							if (keysA.length !== keysB.length) result = false;
							else for (let j = 0; result === true && j < keysA.length; j++) {
								if (sorted) result = equal(a[keysA[j]], b[keysB[j]]);
								else result = equal(a[keysA[j]], b[keysA[j]]);
							}
						}
					}
					i--;
					return result;
				}
			};

			hiddenchannelslib.ObjectUtils = {};
			hiddenchannelslib.ObjectUtils.is = function (obj) {
				return obj && !Array.isArray(obj) && !Set.prototype.isPrototypeOf(obj) && (typeof obj == "function" || typeof obj == "object");
			};
			hiddenchannelslib.ObjectUtils.get = function (nodeOrObj, valuePath) {
				if (!nodeOrObj || !valuePath) return null;
				let obj = Node.prototype.isPrototypeOf(nodeOrObj) ? hiddenchannelslib.ReactUtils.getInstance(nodeOrObj) : nodeOrObj;
				if (!hiddenchannelslib.ObjectUtils.is(obj)) return null;
				let found = obj;
				for (const value of valuePath.split(".").filter(n => n)) {
					if (!found) return null;
					found = found[value];
				}
				return found;
			};
			hiddenchannelslib.ObjectUtils.extract = function (obj, ...keys) {
				let newObj = {};
				if (hiddenchannelslib.ObjectUtils.is(obj)) for (let key of keys.flat(10).filter(n => n)) if (obj[key] != null) newObj[key] = obj[key];
				return newObj;
			};
			hiddenchannelslib.ObjectUtils.exclude = function (obj, ...keys) {
				let newObj = Object.assign({}, obj);
				hiddenchannelslib.ObjectUtils.delete(newObj, ...keys)
				return newObj;
			};
			hiddenchannelslib.ObjectUtils.delete = function (obj, ...keys) {
				if (hiddenchannelslib.ObjectUtils.is(obj)) for (let key of keys.flat(10).filter(n => n)) delete obj[key];
			};
			hiddenchannelslib.ObjectUtils.sort = function (obj, sort, except) {
				if (!hiddenchannelslib.ObjectUtils.is(obj)) return {};
				let newObj = {};
				if (sort === undefined || !sort) for (let key of Object.keys(obj).sort()) newObj[key] = obj[key];
				else {
					let values = [];
					for (let key in obj) values.push(obj[key]);
					values = hiddenchannelslib.ArrayUtils.keySort(values, sort, except);
					for (let value of values) for (let key in obj) if (hiddenchannelslib.equals(value, obj[key])) {
						newObj[key] = value;
						break;
					}
				}
				return newObj;
			};
			hiddenchannelslib.ObjectUtils.group = function (obj, key) {
				if (!hiddenchannelslib.ObjectUtils.is(obj)) return {};
				if (typeof key != "string") return obj;
				return Object.entries(obj).reduce((newObj, objPair) => {
					if (!newObj[objPair[1][key]]) newObj[objPair[1][key]] = {};
					newObj[objPair[1][key]][objPair[0]] = objPair[1];
					return newObj;
				}, {});
			};
			hiddenchannelslib.ObjectUtils.reverse = function (obj, sort) {
				if (!hiddenchannelslib.ObjectUtils.is(obj)) return {};
				let newObj = {};
				for (let key of (sort === undefined || !sort) ? Object.keys(obj).reverse() : Object.keys(obj).sort().reverse()) newObj[key] = obj[key];
				return newObj;
			};
			hiddenchannelslib.ObjectUtils.filter = function (obj, filter, byKey = false) {
				if (!hiddenchannelslib.ObjectUtils.is(obj)) return {};
				if (typeof filter != "function") return obj;
				return Object.keys(obj).filter(key => filter(byKey ? key : obj[key])).reduce((newObj, key) => (newObj[key] = obj[key], newObj), {});
			};
			hiddenchannelslib.ObjectUtils.push = function (obj, value) {
				if (hiddenchannelslib.ObjectUtils.is(obj)) obj[Object.keys(obj).length] = value;
			};
			hiddenchannelslib.ObjectUtils.pop = function (obj, value) {
				if (hiddenchannelslib.ObjectUtils.is(obj)) {
					let keys = Object.keys(obj);
					if (!keys.length) return;
					let value = obj[keys[keys.length-1]];
					delete obj[keys[keys.length-1]];
					return value;
				}
			};
			hiddenchannelslib.ObjectUtils.map = function (obj, mapFunc) {
				if (!hiddenchannelslib.ObjectUtils.is(obj)) return {};
				if (typeof mapFunc != "string" && typeof mapFunc != "function") return obj;
				let newObj = {};
				for (let key in obj) if (hiddenchannelslib.ObjectUtils.is(obj[key])) newObj[key] = typeof mapFunc == "string" ? obj[key][mapFunc] : mapFunc(obj[key], key);
				return newObj;
			};
			hiddenchannelslib.ObjectUtils.toArray = function (obj) {
				if (!hiddenchannelslib.ObjectUtils.is(obj)) return [];
				return Object.entries(obj).map(n => n[1]);
			};
			hiddenchannelslib.ObjectUtils.deepAssign = function (obj, ...objs) {
				if (!objs.length) return obj;
				let nextObj = objs.shift();
				if (hiddenchannelslib.ObjectUtils.is(obj) && hiddenchannelslib.ObjectUtils.is(nextObj)) {
					for (let key in nextObj) {
						if (hiddenchannelslib.ObjectUtils.is(nextObj[key])) {
							if (!obj[key]) Object.assign(obj, {[key]:{}});
							hiddenchannelslib.ObjectUtils.deepAssign(obj[key], nextObj[key]);
						}
						else Object.assign(obj, {[key]:nextObj[key]});
					}
				}
				return hiddenchannelslib.ObjectUtils.deepAssign(obj, ...objs);
			};
			hiddenchannelslib.ObjectUtils.isEmpty = function (obj) {
				return !hiddenchannelslib.ObjectUtils.is(obj) || Object.getOwnPropertyNames(obj).length == 0;
			};
			hiddenchannelslib.ObjectUtils.mirror = function (obj) {
				if (!hiddenchannelslib.ObjectUtils.is(obj)) return {};
				let newObj = Object.assign({}, obj);
				for (let key in newObj) if (newObj[newObj[key]] == undefined && (typeof key == "number" || typeof key == "string")) newObj[newObj[key]] = key;
				return newObj;
			};

			hiddenchannelslib.ArrayUtils = {};
			hiddenchannelslib.ArrayUtils.is = function (array) {
				return array && Array.isArray(array);
			};
			hiddenchannelslib.ArrayUtils.sum = function (array) {
				return Array.isArray(array) ? array.reduce((total, num) => total + Math.round(num), 0) : 0;
			};
			hiddenchannelslib.ArrayUtils.keySort = function (array, key, except) {
				if (!hiddenchannelslib.ArrayUtils.is(array)) return [];
				if (key == null) return array;
				if (except === undefined) except = null;
				return array.sort((x, y) => {
					let xValue = x[key], yValue = y[key];
					if (xValue !== except) return xValue < yValue ? -1 : xValue > yValue ? 1 : 0;
				});
			};
			hiddenchannelslib.ArrayUtils.numSort = function (array) {
				return array.sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
			};
			hiddenchannelslib.ArrayUtils.includes = function (array, ...values) {
				if (!hiddenchannelslib.ArrayUtils.is(array)) return null;
				if (!array.length) return false;
				let all = values.pop();
				if (typeof all != "boolean") {
					values.push(all);
					all = true;
				}
				if (!values.length) return false;
				let contained = undefined;
				for (let v of values) {
					if (contained === undefined) contained = all;
					if (all && !array.includes(v)) contained = false;
					if (!all && array.includes(v)) contained = true;
				}
				return contained;
			};
			hiddenchannelslib.ArrayUtils.remove = function (array, value, all = false) {
				if (!hiddenchannelslib.ArrayUtils.is(array)) return [];
				if (!array.includes(value)) return array;
				if (!all) array.splice(array.indexOf(value), 1);
				else while (array.indexOf(value) > -1) array.splice(array.indexOf(value), 1);
				return array;
			};
			hiddenchannelslib.ArrayUtils.getAllIndexes = function (array, value) {
				if (!hiddenchannelslib.ArrayUtils.is(array) && typeof array != "string") return [];
				var indexes = [], index = -1;
				while ((index = array.indexOf(value, index + 1)) !== -1) indexes.push(index);
				return indexes;
			};
			hiddenchannelslib.ArrayUtils.removeCopies = function (array) {
				if (!hiddenchannelslib.ArrayUtils.is(array)) return [];
				return [...new Set(array)];
			};

			hiddenchannelslib.BDUtils = {};
			hiddenchannelslib.BDUtils.getPluginsFolder = function () {
				if (BdApi && BdApi.Plugins && BdApi.Plugins.folder && typeof BdApi.Plugins.folder == "string") return BdApi.Plugins.folder;
				else if (Internal.LibraryRequires.process.env.BETTERDISCORD_DATA_PATH) return Internal.LibraryRequires.path.resolve(Internal.LibraryRequires.process.env.BETTERDISCORD_DATA_PATH, "plugins/");
				else if (Internal.LibraryRequires.process.env.injDir) return Internal.LibraryRequires.path.resolve(Internal.LibraryRequires.process.env.injDir, "plugins/");
				else switch (Internal.LibraryRequires.process.platform) {
					case "win32":
						return Internal.LibraryRequires.path.resolve(Internal.LibraryRequires.process.env.appdata, "BetterDiscord/plugins/");
					case "darwin":
						return Internal.LibraryRequires.path.resolve(Internal.LibraryRequires.process.env.HOME, "Library/Preferences/BetterDiscord/plugins/");
					default:
						if (Internal.LibraryRequires.process.env.XDG_CONFIG_HOME) return Internal.LibraryRequires.path.resolve(Internal.LibraryRequires.process.env.XDG_CONFIG_HOME, "BetterDiscord/plugins/");
						else if (Internal.LibraryRequires.process.env.HOME) return Internal.LibraryRequires.path.resolve(Internal.LibraryRequires.process.env.HOME, ".config/BetterDiscord/plugins/");
						else return "";
					}
			};
			hiddenchannelslib.BDUtils.getThemesFolder = function () {
				if (BdApi && BdApi.Themes && BdApi.Themes.folder && typeof BdApi.Themes.folder == "string") return BdApi.Themes.folder;
				else if (Internal.LibraryRequires.process.env.BETTERDISCORD_DATA_PATH) return Internal.LibraryRequires.path.resolve(Internal.LibraryRequires.process.env.BETTERDISCORD_DATA_PATH, "themes/");
				else if (Internal.LibraryRequires.process.env.injDir) return Internal.LibraryRequires.path.resolve(Internal.LibraryRequires.process.env.injDir, "plugins/");
				else switch (Internal.LibraryRequires.process.platform) {
					case "win32": 
						return Internal.LibraryRequires.path.resolve(Internal.LibraryRequires.process.env.appdata, "BetterDiscord/themes/");
					case "darwin": 
						return Internal.LibraryRequires.path.resolve(Internal.LibraryRequires.process.env.HOME, "Library/Preferences/BetterDiscord/themes/");
					default:
						if (Internal.LibraryRequires.process.env.XDG_CONFIG_HOME) return Internal.LibraryRequires.path.resolve(Internal.LibraryRequires.process.env.XDG_CONFIG_HOME, "BetterDiscord/themes/");
						else if (Internal.LibraryRequires.process.env.HOME) return Internal.LibraryRequires.path.resolve(Internal.LibraryRequires.process.env.HOME, ".config/BetterDiscord/themes/");
						else return "";
					}
			};
			hiddenchannelslib.BDUtils.isPluginEnabled = function (pluginName) {
				if (!BdApi) return null;
				else if (BdApi.Plugins && typeof BdApi.Plugins.isEnabled == "function") return BdApi.Plugins.isEnabled(pluginName);
				else if (typeof BdApi.isPluginEnabled == "function") return BdApi.isPluginEnabled(pluginName);
			};
			hiddenchannelslib.BDUtils.reloadPlugin = function (pluginName) {
				if (!BdApi) return;
				else if (BdApi.Plugins && typeof BdApi.Plugins.reload == "function") BdApi.Plugins.reload(pluginName);
				else if (window.pluginModule) window.pluginModule.reloadPlugin(pluginName);
			};
			hiddenchannelslib.BDUtils.enablePlugin = function (pluginName) {
				if (!BdApi) return;
				else if (BdApi.Plugins && typeof BdApi.Plugins.enable == "function") BdApi.Plugins.enable(pluginName);
				else if (window.pluginModule) window.pluginModule.startPlugin(pluginName);
			};
			hiddenchannelslib.BDUtils.disablePlugin = function (pluginName) {
				if (!BdApi) return;
				else if (BdApi.Plugins && typeof BdApi.Plugins.disable == "function") BdApi.Plugins.disable(pluginName);
				else if (window.pluginModule) window.pluginModule.stopPlugin(pluginName);
			};
			hiddenchannelslib.BDUtils.getPlugin = function (pluginName, hasToBeEnabled = false, overHead = false) {
				if (BdApi && !hasToBeEnabled || hiddenchannelslib.BDUtils.isPluginEnabled(pluginName)) {	
					if (BdApi.Plugins && typeof BdApi.Plugins.get == "function") {
						let plugin = BdApi.Plugins.get(pluginName);
						if (!plugin) return null;
						if (overHead) return plugin.filename && plugin.exports && plugin.instance ? plugin : {filename: Internal.LibraryRequires.fs.existsSync(Internal.LibraryRequires.path.join(hiddenchannelslib.BDUtils.getPluginsFolder(), `${pluginName}.plugin.js`)) ? `${pluginName}.plugin.js` : null, id: pluginName, name: pluginName, plugin: plugin};
						else return plugin.filename && plugin.exports && plugin.instance ? plugin.instance : plugin;
					}
					else if (window.bdplugins) overHead ? window.bdplugins[pluginName] : (window.bdplugins[pluginName] || {}).plugin;
				}
				return null;
			};
			hiddenchannelslib.BDUtils.isThemeEnabled = function (themeName) {
				if (!BdApi) return null;
				else if (BdApi.Themes && typeof BdApi.Themes.isEnabled == "function") return BdApi.Themes.isEnabled(themeName);
				else if (typeof BdApi.isThemeEnabled == "function") return BdApi.isThemeEnabled(themeName);
			};
			hiddenchannelslib.BDUtils.enableTheme = function (themeName) {
				if (!BdApi) return;
				else if (BdApi.Themes && typeof BdApi.Themes.enable == "function") BdApi.Themes.enable(themeName);
				else if (window.themeModule) window.themeModule.enableTheme(themeName);
			};
			hiddenchannelslib.BDUtils.disableTheme = function (themeName) {
				if (!BdApi) return;
				else if (BdApi.Themes && typeof BdApi.Themes.disable == "function") BdApi.Themes.disable(themeName);
				else if (window.themeModule) window.themeModule.disableTheme(themeName);
			};
			hiddenchannelslib.BDUtils.getTheme = function (themeName, hasToBeEnabled = false) {
				if (BdApi && !hasToBeEnabled || hiddenchannelslib.BDUtils.isThemeEnabled(themeName)) {
					if (BdApi.Themes && typeof BdApi.Themes.get == "function") return BdApi.Themes.get(themeName);
					else if (window.bdthemes) window.bdthemes[themeName];
				}
				return null;
			};
			hiddenchannelslib.BDUtils.settingsIds = {
				automaticLoading: "settings.addons.autoReload",
				coloredText: "settings.appearance.coloredText",
				normalizedClasses: "settings.general.classNormalizer",
				showToasts: "settings.general.showToasts"
			};
			hiddenchannelslib.BDUtils.toggleSettings = function (key, state) {
				if (BdApi && typeof key == "string") {
					let path = key.split(".");
					let currentState = hiddenchannelslib.BDUtils.getSettings(key);
					if (state === true) {
						if (currentState === false && typeof BdApi.enableSetting == "function") BdApi.enableSetting(...path);
					}
					else if (state === false) {
						if (currentState === true && typeof BdApi.disableSetting == "function") BdApi.disableSetting(...path);
					}
					else if (currentState === true || currentState === false) hiddenchannelslib.BDUtils.toggleSettings(key, !currentState);
				}
			};
			hiddenchannelslib.BDUtils.getSettings = function (key) {
				if (!BdApi) return {};
				if (typeof key == "string") return typeof BdApi.isSettingEnabled == "function" && BdApi.isSettingEnabled(...key.split("."));
				else return hiddenchannelslib.ArrayUtils.is(BdApi.settings) ? BdApi.settings.map(n => n.settings.map(m => m.settings.map(l => ({id: [n.id, m.id, l.id].join("."), value: l.value})))).flat(10).reduce((newObj, setting) => (newObj[setting.id] = setting.value, newObj), {}) : {};
			};
			hiddenchannelslib.BDUtils.getSettingsProperty = function (property, key) {
				if (!BdApi || !hiddenchannelslib.ArrayUtils.is(BdApi.settings)) return key ? "" : {};
				else {
					let settingsMap = BdApi.settings.map(n => n.settings.map(m => m.settings.map(l => ({id: [n.id, m.id, l.id].join("."), value: l[property]})))).flat(10).reduce((newObj, setting) => (newObj[setting.id] = setting.value, newObj), {});
					return key ? (settingsMap[key] != null ? settingsMap[key] : "") : "";
				}
			};
			
			
			hiddenchannelslib.PluginUtils = {};
			hiddenchannelslib.PluginUtils.buildPlugin = function (changeLog) {
				return [Plugin(changeLog), hiddenchannelslib];
			};
			hiddenchannelslib.PluginUtils.load = function (plugin) {
				if (!PluginStores.updateData.timeouts.includes(plugin.name)) {
					PluginStores.updateData.timeouts.push(plugin.name);
					const url = Internal.getPluginURL(plugin);

					PluginStores.updateData.plugins[url] = {name: plugin.name, raw: url, version: plugin.version};
					
					hiddenchannelslib.PluginUtils.checkUpdate(plugin.name, url);
					
					if (plugin.changeLog && typeof plugin.getSettingsPanel != "function") plugin.getSettingsPanel = _ => hiddenchannelslib.PluginUtils.createSettingsPanel(plugin, {
						children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.MessagesPopoutComponents.EmptyStateBottom, {
							msg: "No Settings available for this Plugin",
							image: hiddenchannelslib.DiscordUtils.getTheme() == hiddenchannelslib.disCN.themelight ? "/assets/9b0d90147f7fab54f00dd193fe7f85cd.svg" : "/assets/308e587f3a68412f137f7317206e92c2.svg"
						})
					});
					
					if (!PluginStores.updateData.interval) PluginStores.updateData.interval = hiddenchannelslib.TimeUtils.interval(_ => {
						hiddenchannelslib.PluginUtils.checkAllUpdates();
					}, 1000*60*60*4);
					
					hiddenchannelslib.TimeUtils.timeout(_ => hiddenchannelslib.ArrayUtils.remove(PluginStores.updateData.timeouts, plugin.name, true), 30000);
				}
			};
			hiddenchannelslib.PluginUtils.init = function (plugin) {
				hiddenchannelslib.PluginUtils.load(plugin);
				
				plugin.settings = hiddenchannelslib.DataUtils.get(plugin);
				
				hiddenchannelslib.LogUtils.log(hiddenchannelslib.LanguageUtils.LibraryStringsFormat("toast_plugin_started", ""), plugin);
				if (Internal.settings.general.showToasts && !hiddenchannelslib.BDUtils.getSettings(hiddenchannelslib.BDUtils.settingsIds.showToasts)) hiddenchannelslib.NotificationUtils.toast(hiddenchannelslib.LanguageUtils.LibraryStringsFormat("toast_plugin_started", `${plugin.name} v${plugin.version}`), {
					disableInteractions: true,
					barColor: hiddenchannelslib.DiscordConstants.Colors.STATUS_GREEN
				});
				
				if (plugin.css) hiddenchannelslib.DOMUtils.appendLocalStyle(plugin.name, plugin.css);
				
				Internal.patchPlugin(plugin);
				Internal.addQueuePatches(plugin);
				Internal.addContextChunkObservers(plugin);

				hiddenchannelslib.PluginUtils.translate(plugin);

				hiddenchannelslib.PluginUtils.checkChangeLog(plugin);
			};
			hiddenchannelslib.PluginUtils.clear = function (plugin) {
				hiddenchannelslib.LogUtils.log(hiddenchannelslib.LanguageUtils.LibraryStringsFormat("toast_plugin_stopped", ""), plugin);
				if (Internal.settings.general.showToasts && !hiddenchannelslib.BDUtils.getSettings(hiddenchannelslib.BDUtils.settingsIds.showToasts)) hiddenchannelslib.NotificationUtils.toast(hiddenchannelslib.LanguageUtils.LibraryStringsFormat("toast_plugin_stopped", `${plugin.name} v${plugin.version}`), {
					disableInteractions: true,
					barColor: hiddenchannelslib.DiscordConstants.Colors.STATUS_RED
				});
				
				const url = Internal.getPluginURL(plugin);

				hiddenchannelslib.PluginUtils.cleanUp(plugin);
				
				for (const type in PluginStores.patchQueues) hiddenchannelslib.ArrayUtils.remove(PluginStores.patchQueues[type].query, plugin, true);
				for (const type in PluginStores.chunkObserver) hiddenchannelslib.ArrayUtils.remove(PluginStores.chunkObserver[type].query, plugin, true);
				for (const type in PluginStores.contextChunkObserver) hiddenchannelslib.ArrayUtils.remove(PluginStores.contextChunkObserver[type].query, plugin, true);
				
				for (const modal of document.querySelectorAll(`.${plugin.name}-modal, .${plugin.name.toLowerCase()}-modal, .${plugin.name}-settingsmodal, .${plugin.name.toLowerCase()}-settingsmodal`)) {
					const closeButton = modal.querySelector(hiddenchannelslib.dotCN.modalclose);
					if (closeButton) closeButton.click();
				}
				
				delete Cache.data[plugin.name]
				delete PluginStores.updateData.plugins[url];
			};
			hiddenchannelslib.PluginUtils.translate = function (plugin) {
				if (typeof plugin.setLabelsByLanguage == "function" || typeof plugin.changeLanguageStrings == "function") {
					const translate = _ => {
						if (typeof plugin.setLabelsByLanguage == "function") plugin.labels = plugin.setLabelsByLanguage();
						if (typeof plugin.changeLanguageStrings == "function") plugin.changeLanguageStrings();
					};
					if (Internal.LibraryModules.LanguageStore.chosenLocale || Internal.LibraryModules.LanguageStore._chosenLocale || hiddenchannelslib.DicordUtils.getSettings("locale")) translate();
					else hiddenchannelslib.TimeUtils.interval(interval => {
						if (Internal.LibraryModules.LanguageStore.chosenLocale || Internal.LibraryModules.LanguageStore._chosenLocale || hiddenchannelslib.DicordUtils.getSettings("locale")) {
							hiddenchannelslib.TimeUtils.clear(interval);
							translate();
						}
					}, 100);
				}
			};
			hiddenchannelslib.PluginUtils.cleanUp = function (plugin) {
				hiddenchannelslib.TimeUtils.suppress(_ => {
					if (!hiddenchannelslib.ObjectUtils.is(plugin)) return;
					if (plugin == window.hiddenchannelslib_Global) {
						if (Internal.removeChunkObserver) Internal.removeChunkObserver();
						let updateNotice = hiddenchannelslib.dotCN && document.querySelector(hiddenchannelslib.dotCN.noticeupdate);
						if (updateNotice) updateNotice.close();
						hiddenchannelslib.TimeUtils.clear(PluginStores && PluginStores.updateData && PluginStores.updateData.interval);
						delete window.hiddenchannelslib_Global.loaded;
						if (PluginStores) hiddenchannelslib.TimeUtils.interval((interval, count) => {
							if (count > 60 || window.hiddenchannelslib_Global.loaded) hiddenchannelslib.TimeUtils.clear(interval);
							if (window.hiddenchannelslib_Global.loaded) for (let pluginName in hiddenchannelslib.ObjectUtils.sort(PluginStores.loaded)) hiddenchannelslib.TimeUtils.timeout(_ => {
								if (PluginStores.loaded[pluginName].started) hiddenchannelslib.BDUtils.reloadPlugin(pluginName);
							});
						}, 1000);
					}
					if (hiddenchannelslib.DOMUtils && hiddenchannelslib.DOMUtils.removeLocalStyle) hiddenchannelslib.DOMUtils.removeLocalStyle(plugin.name);
					if (hiddenchannelslib.ListenerUtils && hiddenchannelslib.ListenerUtils.remove) hiddenchannelslib.ListenerUtils.remove(plugin);
					if (hiddenchannelslib.ListenerUtils && hiddenchannelslib.ListenerUtils.removeGlobal) hiddenchannelslib.ListenerUtils.removeGlobal(plugin);
					if (hiddenchannelslib.StoreChangeUtils && hiddenchannelslib.StoreChangeUtils.remove) hiddenchannelslib.StoreChangeUtils.remove(plugin);
					if (hiddenchannelslib.ObserverUtils && hiddenchannelslib.ObserverUtils.disconnect) hiddenchannelslib.ObserverUtils.disconnect(plugin);
					if (hiddenchannelslib.PatchUtils && hiddenchannelslib.PatchUtils.unpatch) hiddenchannelslib.PatchUtils.unpatch(plugin);
					if (hiddenchannelslib.WindowUtils && hiddenchannelslib.WindowUtils.closeAll) hiddenchannelslib.WindowUtils.closeAll(plugin);
					if (hiddenchannelslib.WindowUtils && hiddenchannelslib.WindowUtils.removeListener) hiddenchannelslib.WindowUtils.removeListener(plugin);
				}, "Failed to clean up Plugin!", plugin)();
			};
			hiddenchannelslib.PluginUtils.checkUpdate = function (pluginName, url) {
				if (pluginName && url && PluginStores.updateData.plugins[url]) return new Promise(callback => {
					Internal.LibraryRequires.request(url, (error, response, body) => {
						if (error || !PluginStores.updateData.plugins[url]) return callback(null);
						let newName = (body.match(/"name"\s*:\s*"([^"]+)"/) || [])[1] || pluginName;
						let newVersion = (body.match(/@version ([0-9]+\.[0-9]+\.[0-9]+)|['"]([0-9]+\.[0-9]+\.[0-9]+)['"]/i) || []).filter(n => n)[1];
						if (!newVersion) return callback(null);
						if (pluginName == newName && hiddenchannelslib.NumberUtils.getVersionDifference(newVersion, PluginStores.updateData.plugins[url].version) > 0.2) {
							hiddenchannelslib.NotificationUtils.toast(hiddenchannelslib.LanguageUtils.LibraryStringsFormat("toast_plugin_force_updated", pluginName), {
								type: "warning",
								disableInteractions: true
							});
							hiddenchannelslib.PluginUtils.downloadUpdate(pluginName, url);
							return callback(2);
						}
						else if (hiddenchannelslib.NumberUtils.compareVersions(newVersion, PluginStores.updateData.plugins[url].version)) {
							if (PluginStores.updateData.plugins[url]) PluginStores.updateData.plugins[url].outdated = true;
							hiddenchannelslib.PluginUtils.showUpdateNotice(pluginName, url);
							return callback(1);
						}
						else {
							hiddenchannelslib.PluginUtils.removeUpdateNotice(pluginName);
							return callback(0);
						}
					});
				});
				return new Promise(callback => callback(null));
			};
			hiddenchannelslib.PluginUtils.checkAllUpdates = function () {
				return new Promise(callback => {
					let finished = 0, amount = 0;
					for (let url in PluginStores.updateData.plugins) {
						let plugin = PluginStores.updateData.plugins[url];
						if (plugin) hiddenchannelslib.PluginUtils.checkUpdate(plugin.name, plugin.raw).then(state => {
							finished++;
							if (state == 1) amount++;
							if (finished >= Object.keys(PluginStores.updateData.plugins).length) callback(amount);
						});
					}
				});
			};
			hiddenchannelslib.PluginUtils.hasUpdateCheck = function (url) {
				if (!url || typeof url != "string") return false;
				let updateStore = Object.assign({}, window.PluginUpdates && window.PluginUpdates.plugins, PluginStores.updateData.plugins);
				if (updateStore[url]) return true;
				else {
					let temp = url.replace("//raw.githubusercontent.com", "//").split("/");
					let gitName = temp.splice(3, 1);
					temp.splice(4, 1);
					temp.splice(2, 1, gitName + ".github.io");
					let pagesUrl = temp.join("/");
					return !!updateStore[pagesUrl];
				}
			};
			hiddenchannelslib.PluginUtils.showUpdateNotice = function (pluginName, url) {
				if (!pluginName || !url) return;
				let updateNotice = document.querySelector(hiddenchannelslib.dotCN.noticeupdate);
				if (!updateNotice) {
					let vanishObserver = new MutationObserver(changes => {
						if (!document.contains(updateNotice)) {
							if (updateNotice.querySelector(hiddenchannelslib.dotCN.noticeupdateentry)) {
								let layers = document.querySelector(hiddenchannelslib.dotCN.layers) || document.querySelector(hiddenchannelslib.dotCN.appmount);
								if (layers) layers.parentElement.insertBefore(updateNotice, layers);
							}
							else vanishObserver.disconnect();
						}
						else if (document.contains(updateNotice) && !updateNotice.querySelector(hiddenchannelslib.dotCNC.noticeupdateentry + hiddenchannelslib.dotCN.noticebutton)) vanishObserver.disconnect();
					});
					vanishObserver.observe(document.body, {childList: true, subtree: true});
					updateNotice = hiddenchannelslib.NotificationUtils.notice(`${hiddenchannelslib.LanguageUtils.LibraryStrings.update_notice_update}&nbsp;&nbsp;&nbsp;&nbsp;<div class="${hiddenchannelslib.disCN.noticeupdateentries}"></div>`, {
						type: "info",
						className: hiddenchannelslib.disCN.noticeupdate,
						html: true,
						forceStyle: true,
						customIcon: `<svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M 15.46875 0.859375 C 15.772992 1.030675 16.059675 1.2229406 16.326172 1.4316406 C 17.134815 2.0640406 17.768634 2.8677594 18.208984 3.8183594 C 18.665347 4.8050594 18.913286 5.9512625 18.945312 7.2265625 L 18.945312 7.2421875 L 18.945312 7.2597656 L 18.945312 16.753906 L 18.945312 16.769531 L 18.945312 16.785156 C 18.914433 18.060356 18.666491 19.206759 18.208984 20.193359 C 17.768634 21.144059 17.135961 21.947578 16.326172 22.580078 C 16.06768 22.782278 15.790044 22.967366 15.496094 23.134766 L 16.326172 23.134766 C 20.285895 23.158766 24 20.930212 24 15.820312 L 24 8.3535156 C 24.021728 3.1431156 20.305428 0.86132812 16.345703 0.86132812 L 15.46875 0.859375 z M 0 0.8671875 L 0 10.064453 L 4.4492188 15.191406 L 4.4492188 5.4394531 L 8.4394531 5.4394531 C 11.753741 5.4394531 11.753741 9.8828125 8.4394531 9.8828125 L 7.0234375 9.8828125 L 7.0234375 14.126953 L 8.4394531 14.126953 C 11.753741 14.126953 11.753741 18.568359 8.4394531 18.568359 L 0 18.568359 L 0 23.138672 L 8.3457031 23.138672 C 12.647637 23.138672 15.987145 21.3021 16.105469 16.75 C 16.105469 14.6555 15.567688 13.090453 14.621094 12.001953 C 15.567688 10.914853 16.105469 9.3502594 16.105469 7.2558594 C 15.988351 2.7036594 12.648845 0.8671875 8.3457031 0.8671875 L 0 0.8671875 z"/></svg>`,
						buttons: !hiddenchannelslib.BDUtils.getSettings(hiddenchannelslib.BDUtils.settingsIds.automaticLoading) && [{
							className: hiddenchannelslib.disCN.noticeupdatebuttonreload,
							contents: hiddenchannelslib.LanguageUtils.LanguageStrings.ERRORS_RELOAD,
							onClick: _ => location.reload(),
							onMouseEnter: _ => {
								if (PluginStores.updateData.downloaded) hiddenchannelslib.TooltipUtils.create(reloadButton, PluginStores.updateData.downloaded.join(", "), {
									type: "bottom",
									style: "max-width: 420px"
								});
							}
						}],
						buttons: [{
							className: hiddenchannelslib.disCN.noticeupdatebuttonall,
							contents: hiddenchannelslib.LanguageUtils.LanguageStrings.FORM_LABEL_ALL,
							onClick: _ => {for (let notice of updateNotice.querySelectorAll(hiddenchannelslib.dotCN.noticeupdateentry)) notice.click();}
						}],
						onClose: _ => vanishObserver.disconnect()
					});
					updateNotice.style.setProperty("position", "relative", "important");
					updateNotice.style.setProperty("visibility", "visible", "important");
					updateNotice.style.setProperty("opacity", "1", "important");
					updateNotice.style.setProperty("z-index", "100000", "important");
					let reloadButton = updateNotice.querySelector(hiddenchannelslib.dotCN.noticeupdatebuttonreload);
					if (reloadButton) hiddenchannelslib.DOMUtils.hide(reloadButton);
				}
				if (updateNotice) {
					let updateNoticeList = updateNotice.querySelector(hiddenchannelslib.dotCN.noticeupdateentries);
					if (updateNoticeList && !updateNoticeList.querySelector(`#${pluginName}-notice`)) {
						if (updateNoticeList.childElementCount) updateNoticeList.appendChild(hiddenchannelslib.DOMUtils.create(`<div class="${hiddenchannelslib.disCN.noticeupdateseparator}">, </div>`));
						let updateEntry = hiddenchannelslib.DOMUtils.create(`<div class="${hiddenchannelslib.disCN.noticeupdateentry}" id="${pluginName}-notice">${pluginName}</div>`);
						updateEntry.addEventListener("click", _ => {
							if (!updateEntry.wasClicked) {
								updateEntry.wasClicked = true;
								hiddenchannelslib.PluginUtils.downloadUpdate(pluginName, url);
							}
						});
						updateNoticeList.appendChild(updateEntry);
						if (!updateNoticeList.hasTooltip) {
							updateNoticeList.hasTooltip = true;
							updateNotice.tooltip = hiddenchannelslib.TooltipUtils.create(updateNoticeList, hiddenchannelslib.LanguageUtils.LibraryStrings.update_notice_click, {
								type: "bottom",
								zIndex: 100001,
								delay: 500,
								onHide: _ => {updateNoticeList.hasTooltip = false;}
							});
						}
					}
				}
			};
			hiddenchannelslib.PluginUtils.removeUpdateNotice = function (pluginName, updateNotice = document.querySelector(hiddenchannelslib.dotCN.noticeupdate)) {
				if (!pluginName || !updateNotice) return;
				let updateNoticeList = updateNotice.querySelector(hiddenchannelslib.dotCN.noticeupdateentries);
				if (updateNoticeList) {
					let noticeEntry = updateNoticeList.querySelector(`#${pluginName}-notice`);
					if (noticeEntry) {
						let nextSibling = noticeEntry.nextSibling;
						let prevSibling = noticeEntry.prevSibling;
						if (nextSibling && hiddenchannelslib.DOMUtils.containsClass(nextSibling, hiddenchannelslib.disCN.noticeupdateseparator)) nextSibling.remove();
						else if (prevSibling && hiddenchannelslib.DOMUtils.containsClass(prevSibling, hiddenchannelslib.disCN.noticeupdateseparator)) prevSibling.remove();
						noticeEntry.remove();
					}
					if (!updateNoticeList.childElementCount) {
						let reloadButton = updateNotice.querySelector(hiddenchannelslib.dotCN.noticeupdatebuttonreload);
						if (reloadButton) {
							updateNotice.querySelector(hiddenchannelslib.dotCN.noticetext).innerText = hiddenchannelslib.LanguageUtils.LibraryStrings.update_notice_reload;
							hiddenchannelslib.DOMUtils.show(reloadButton);
						}
						else updateNotice.querySelector(hiddenchannelslib.dotCN.noticedismiss).click();
					}
				}
			};
			hiddenchannelslib.PluginUtils.downloadUpdate = function (pluginName, url) {
				if (pluginName && url) Internal.LibraryRequires.request(url, (error, response, body) => {
					if (error) {
						hiddenchannelslib.PluginUtils.removeUpdateNotice(pluginName);
						hiddenchannelslib.NotificationUtils.toast(hiddenchannelslib.LanguageUtils.LibraryStringsFormat("toast_plugin_update_failed", pluginName), {
							type: "danger",
							disableInteractions: true
						});
					}
					else {
						let wasEnabled = hiddenchannelslib.BDUtils.isPluginEnabled(pluginName);
						let newName = (body.match(/"name"\s*:\s*"([^"]+)"/) || [])[1] || pluginName;
						let newVersion = (body.match(/@version ([0-9]+\.[0-9]+\.[0-9]+)|['"]([0-9]+\.[0-9]+\.[0-9]+)['"]/i) || []).filter(n => n)[1];
						let oldVersion = PluginStores.updateData.plugins[url].version;
						let fileName = pluginName == "hiddenchannelslib" ? "0hiddenchannelslib" : pluginName;
						let newFileName = newName == "hiddenchannelslib" ? "0hiddenchannelslib" : newName;
						Internal.LibraryRequires.fs.writeFile(Internal.LibraryRequires.path.join(hiddenchannelslib.BDUtils.getPluginsFolder(), newFileName + ".plugin.js"), body, _ => {
							if (PluginStores.updateData.plugins[url]) PluginStores.updateData.plugins[url].version = newVersion;
							if (fileName != newFileName) {
								Internal.LibraryRequires.fs.unlink(Internal.LibraryRequires.path.join(hiddenchannelslib.BDUtils.getPluginsFolder(), fileName + ".plugin.js"), _ => {});
								let configPath = Internal.LibraryRequires.path.join(hiddenchannelslib.BDUtils.getPluginsFolder(), fileName + ".config.json");
								Internal.LibraryRequires.fs.exists(configPath, exists => {
									if (exists) Internal.LibraryRequires.fs.rename(configPath, Internal.LibraryRequires.path.join(hiddenchannelslib.BDUtils.getPluginsFolder(), newFileName + ".config.json"), _ => {});
								});
								hiddenchannelslib.TimeUtils.timeout(_ => {if (wasEnabled && !hiddenchannelslib.BDUtils.isPluginEnabled(newName)) hiddenchannelslib.BDUtils.enablePlugin(newName);}, 3000);
							}
							hiddenchannelslib.NotificationUtils.toast(hiddenchannelslib.LanguageUtils.LibraryStringsFormat("toast_plugin_updated", pluginName, "v" + oldVersion, newName, "v" + newVersion), {
								disableInteractions: true
							});
							let updateNotice = document.querySelector(hiddenchannelslib.dotCN.noticeupdate);
							if (updateNotice) {
								if (updateNotice.querySelector(hiddenchannelslib.dotCN.noticebutton) && !PluginStores.updateData.downloaded.includes(pluginName)) {
									PluginStores.updateData.downloaded.push(pluginName);
								}
								hiddenchannelslib.PluginUtils.removeUpdateNotice(pluginName, updateNotice);
							}
						});
					}
				});
			};
			hiddenchannelslib.PluginUtils.checkChangeLog = function (plugin) {
				if (!hiddenchannelslib.ObjectUtils.is(plugin) || !hiddenchannelslib.ObjectUtils.is(plugin.changeLog) || plugin.changeLog.info) return;
				if (!changeLogs[plugin.name] || hiddenchannelslib.NumberUtils.compareVersions(plugin.version, changeLogs[plugin.name])) {
					changeLogs[plugin.name] = plugin.version;
					hiddenchannelslib.DataUtils.save(changeLogs, hiddenchannelslib, "changeLogs");
					hiddenchannelslib.PluginUtils.openChangeLog(plugin);
				}
			};
			hiddenchannelslib.PluginUtils.openChangeLog = function (plugin) {
				if (!hiddenchannelslib.ObjectUtils.is(plugin) || !hiddenchannelslib.ObjectUtils.is(plugin.changeLog)) return;
				let changeLogHTML = "", headers = {
					added: "New Features",
					fixed: "Bug Fixes",
					improved: "Improvements",
					progress: "Progress"
				};
				for (let type in plugin.changeLog) {
					type = type.toLowerCase();
					let className = hiddenchannelslib.disCN["changelog" + type];
					if (className) {
						changeLogHTML += `<h1 class="${className} ${hiddenchannelslib.disCN.margintop20}"${changeLogHTML.indexOf("<h1") == -1 ? `style="margin-top: 0px !important;"` : ""}>${hiddenchannelslib.LanguageUtils && hiddenchannelslib.LanguageUtils.LibraryStrings ? hiddenchannelslib.LanguageUtils.LibraryStrings["changelog_" + type]  : headers[type]}</h1><ul>`;
						for (let key in plugin.changeLog[type]) changeLogHTML += `<li><strong>${key}</strong>${plugin.changeLog[type][key] ? (": " + plugin.changeLog[type][key] + ".") : ""}</li>`;
						changeLogHTML += `</ul>`
					}
				}
				if (changeLogHTML) hiddenchannelslib.ModalUtils.open(plugin, {
					header: `${plugin.name} ${hiddenchannelslib.LanguageUtils.LanguageStrings.CHANGE_LOG}`,
					subHeader: `Version ${plugin.version}`,
					className: hiddenchannelslib.disCN.modalchangelogmodal,
					contentClassName: hiddenchannelslib.disCNS.changelogcontainer + hiddenchannelslib.disCN.modalminicontent,
					footerDirection: Internal.LibraryComponents.Flex.Direction.HORIZONTAL,
					children: hiddenchannelslib.ReactUtils.elementToReact(hiddenchannelslib.DOMUtils.create(changeLogHTML)),
					footerChildren: (plugin == hiddenchannelslib || plugin == this || PluginStores.loaded[plugin.name] && PluginStores.loaded[plugin.name] == plugin && plugin.author == "DevilBro") && hiddenchannelslib.ReactUtils.createElement("div", {
						className: hiddenchannelslib.disCN.changelogfooter,
						children: [{
							href: "https://www.paypal.me/MircoWittrien",
							name: "PayPal",
							icon: "PAYPAL"
						}, {
							href: "https://www.patreon.com/MircoWittrien",
							name: "Patreon",
							icon: "PATREON"
						}, {
							name: hiddenchannelslib.LanguageUtils.LibraryStringsFormat("send", "Solana"),
							icon: "PHANTOM",
							onClick: _ => {
								hiddenchannelslib.LibraryRequires.electron.clipboard.write({text: InternalData.mySolana});
								hiddenchannelslib.NotificationUtils.toast(hiddenchannelslib.LanguageUtils.LibraryStringsFormat("clipboard_success", "Phantom Wallet Key"), {
									type: "success"
								});
							}
						}, {
							name: hiddenchannelslib.LanguageUtils.LibraryStringsFormat("send", "Ethereum"),
							icon: "METAMASK",
							onClick: _ => {
								hiddenchannelslib.LibraryRequires.electron.clipboard.write({text: InternalData.myEthereum});
								hiddenchannelslib.NotificationUtils.toast(hiddenchannelslib.LanguageUtils.LibraryStringsFormat("clipboard_success", "MetaMask Wallet Key"), {
									type: "success"
								});
							}
						}].map(data => hiddenchannelslib.ReactUtils.createElement(data.href ? Internal.LibraryComponents.Anchor : Internal.LibraryComponents.Clickable, {
							className: hiddenchannelslib.disCN.changelogsociallink,
							href: data.href || "",
							onClick: !data.onClick ? (_ => {}) : data.onClick,
							children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TooltipContainer, {
								text: data.name,
								children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SvgIcon, {
									name: Internal.LibraryComponents.SvgIcon.Names[data.icon],
									width: 16,
									height: 16
								})
							})
						})).concat(hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TextElement, {
							size: Internal.LibraryComponents.TextElement.Sizes.SIZE_12,
							children: hiddenchannelslib.LanguageUtils.LibraryStrings.donate_message
						}))
					})
				});
			};
			hiddenchannelslib.PluginUtils.addLoadingIcon = function (icon) {
				if (!Node.prototype.isPrototypeOf(icon)) return;
				let app = document.querySelector(hiddenchannelslib.dotCN.app);
				if (!app) return;
				hiddenchannelslib.DOMUtils.addClass(icon, hiddenchannelslib.disCN.loadingicon);
				let loadingIconWrapper = document.querySelector(hiddenchannelslib.dotCN.app + ">" + hiddenchannelslib.dotCN.loadingiconwrapper);
				if (!loadingIconWrapper) {
					loadingIconWrapper = hiddenchannelslib.DOMUtils.create(`<div class="${hiddenchannelslib.disCN.loadingiconwrapper}"></div>`);
					app.appendChild(loadingIconWrapper);
					let killObserver = new MutationObserver(changes => {if (!loadingIconWrapper.firstElementChild) hiddenchannelslib.DOMUtils.remove(loadingIconWrapper);});
					killObserver.observe(loadingIconWrapper, {childList: true});
				}
				loadingIconWrapper.appendChild(icon);
			};
			hiddenchannelslib.PluginUtils.createSettingsPanel = function (addon, props) {
				if (!window.hiddenchannelslib_Global.loaded) return "Could not initiate hiddenchannelslib Library Plugin! Can not create Settings Panel!";
				addon = addon == hiddenchannelslib && Internal || addon;
				if (!hiddenchannelslib.ObjectUtils.is(addon)) return;
				let settingsProps = props;
				if (settingsProps && !hiddenchannelslib.ObjectUtils.is(settingsProps) && (hiddenchannelslib.ReactUtils.isValidElement(settingsProps) || hiddenchannelslib.ArrayUtils.is(settingsProps))) settingsProps = {
					children: settingsProps
				};
				return hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SettingsPanel, Object.assign({
					addon: addon,
					collapseStates: settingsProps && settingsProps.collapseStates
				}, settingsProps));
			};
			hiddenchannelslib.PluginUtils.refreshSettingsPanel = function (plugin, settingsPanel, ...args) {
				if (hiddenchannelslib.ObjectUtils.is(plugin)) {
					if (settingsPanel && settingsPanel.props && hiddenchannelslib.ObjectUtils.is(settingsPanel.props._instance)) {
						settingsPanel.props._instance.props = Object.assign({}, settingsPanel.props._instance.props, ...args);
						hiddenchannelslib.ReactUtils.forceUpdate(settingsPanel.props._instance);
					}
					else if (typeof plugin.getSettingsPanel == "function" && Node.prototype.isPrototypeOf(settingsPanel) && settingsPanel.parentElement) {
						settingsPanel.parentElement.appendChild(plugin.getSettingsPanel(...args));
						settingsPanel.remove();
					}
				}
			};

			window.hiddenchannelslib_Global = Object.assign({
				started: true,
				loading: true,
				PluginUtils: {
					buildPlugin: hiddenchannelslib.PluginUtils.buildPlugin,
					cleanUp: hiddenchannelslib.PluginUtils.cleanUp
				}
			}, window.hiddenchannelslib_Global);
			
			const request = require("request"), fs = require("fs"), path = require("path");
			
			Internal.writeConfig = function (plugin, path, config) {
				let allData = {};
				try {allData = JSON.parse(fs.readFileSync(path));}
				catch (err) {allData = {};}
				try {fs.writeFileSync(path, JSON.stringify(Object.assign({}, allData, {[Internal.shouldSyncConfig(plugin) ? "all" : hiddenchannelslib.UserUtils.me.id]: config}), null, "	"));}
				catch (err) {}
			};
			Internal.readConfig = function (plugin, path) {
				let sync = Internal.shouldSyncConfig(plugin);
				try {
					let config = JSON.parse(fs.readFileSync(path));
					if (config && Object.keys(config).some(n => !(n == "all" || parseInt(n)))) {
						config = {[Internal.shouldSyncConfig(plugin) ? "all" : hiddenchannelslib.UserUtils.me.id]: config};
						try {fs.writeFileSync(path, JSON.stringify(config, null, "	"));}
						catch (err) {}
					}
					return config && config[sync ? "all" : hiddenchannelslib.UserUtils.me.id] || {};
				}
				catch (err) {return {};}
			};
			Internal.shouldSyncConfig = function (plugin) {
				return plugin.neverSyncData !== undefined ? !plugin.neverSyncData : (plugin.forceSyncData || Internal.settings.general.shareData);
			};
			
			hiddenchannelslib.DataUtils = {};
			hiddenchannelslib.DataUtils.save = function (data, plugin, key, id) {
				plugin = plugin == hiddenchannelslib && Internal || plugin;
				let pluginName = typeof plugin === "string" ? plugin : plugin.name;
				let fileName = pluginName == "hiddenchannelslib" ? "0hiddenchannelslib" : pluginName;
				let configPath = path.join(hiddenchannelslib.BDUtils.getPluginsFolder(), fileName + ".config.json");
				
				let config = Cache.data[pluginName] !== undefined ? Cache.data[pluginName] : (Internal.readConfig(plugin, configPath) || {});
				
				if (key === undefined) config = hiddenchannelslib.ObjectUtils.is(data) ? hiddenchannelslib.ObjectUtils.sort(data) : data;
				else {
					if (id === undefined) config[key] = hiddenchannelslib.ObjectUtils.is(data) ? hiddenchannelslib.ObjectUtils.sort(data) : data;
					else {
						if (!hiddenchannelslib.ObjectUtils.is(config[key])) config[key] = {};
						config[key][id] = hiddenchannelslib.ObjectUtils.is(data) ? hiddenchannelslib.ObjectUtils.sort(data) : data;
					}
				}
				
				let configIsObject = hiddenchannelslib.ObjectUtils.is(config);
				if (key !== undefined && configIsObject && hiddenchannelslib.ObjectUtils.is(config[key]) && hiddenchannelslib.ObjectUtils.isEmpty(config[key])) delete config[key];
				if (hiddenchannelslib.ObjectUtils.isEmpty(config)) {
					delete Cache.data[pluginName];
					if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
				}
				else {
					if (configIsObject) config = hiddenchannelslib.ObjectUtils.sort(config);
					Cache.data[pluginName] = configIsObject ? hiddenchannelslib.ObjectUtils.deepAssign({}, config) : config;
					Internal.writeConfig(plugin, configPath, config);
				}
			};

			hiddenchannelslib.DataUtils.load = function (plugin, key, id) {
				plugin = plugin == hiddenchannelslib && Internal || plugin;
				let pluginName = typeof plugin === "string" ? plugin : plugin.name;
				let fileName = pluginName == "hiddenchannelslib" ? "0hiddenchannelslib" : pluginName;
				let configPath = path.join(hiddenchannelslib.BDUtils.getPluginsFolder(), fileName + ".config.json");
				
				let config = Cache.data[pluginName] !== undefined ? Cache.data[pluginName] : (Internal.readConfig(plugin, configPath) || {});
				let configIsObject = hiddenchannelslib.ObjectUtils.is(config);
				Cache.data[pluginName] = configIsObject ? hiddenchannelslib.ObjectUtils.deepAssign({}, config) : config;
				
				if (key === undefined) return config;
				else {
					let keyData = configIsObject ? (hiddenchannelslib.ObjectUtils.is(config[key]) || config[key] === undefined ? hiddenchannelslib.ObjectUtils.deepAssign({}, config[key]) : config[key]) : null;
					if (id === undefined) return keyData;
					else return !hiddenchannelslib.ObjectUtils.is(keyData) || keyData[id] === undefined ? null : keyData[id];
				}
			};
			hiddenchannelslib.DataUtils.remove = function (plugin, key, id) {
				plugin = plugin == hiddenchannelslib && Internal || plugin;
				let pluginName = typeof plugin === "string" ? plugin : plugin.name;
				let fileName = pluginName == "hiddenchannelslib" ? "0hiddenchannelslib" : pluginName;
				let configPath = path.join(hiddenchannelslib.BDUtils.getPluginsFolder(), fileName + ".config.json");
				
				let config = Cache.data[pluginName] !== undefined ? Cache.data[pluginName] : (Internal.readConfig(plugin, configPath) || {});
				let configIsObject = hiddenchannelslib.ObjectUtils.is(config);
				
				if (key === undefined || !configIsObject) config = {};
				else {
					if (id === undefined) delete config[key];
					else if (hiddenchannelslib.ObjectUtils.is(config[key])) delete config[key][id];
				}
				
				if (hiddenchannelslib.ObjectUtils.is(config[key]) && hiddenchannelslib.ObjectUtils.isEmpty(config[key])) delete config[key];
				if (hiddenchannelslib.ObjectUtils.isEmpty(config)) {
					delete Cache.data[pluginName];
					if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
				}
				else {
					if (configIsObject) config = hiddenchannelslib.ObjectUtils.sort(config);
					Cache.data[pluginName] = configIsObject ? hiddenchannelslib.ObjectUtils.deepAssign({}, config) : config;
					Internal.writeConfig(plugin, configPath, config);
				}
			};
			hiddenchannelslib.DataUtils.get = function (plugin, key, id) {
				plugin = plugin == hiddenchannelslib && Internal || plugin;
				plugin = typeof plugin == "string" ? hiddenchannelslib.BDUtils.getPlugin(plugin) : plugin;
				const defaults = plugin && plugin.defaults;
				if (!hiddenchannelslib.ObjectUtils.is(defaults) || key && !hiddenchannelslib.ObjectUtils.is(defaults[key])) return id === undefined ? {} : null;
				let oldC = hiddenchannelslib.DataUtils.load(plugin), newC = {}, update = false;
				const checkLayer = (i, j) => {
					let isObj = hiddenchannelslib.ObjectUtils.is(defaults[i][j].value);
					if (!newC[i]) newC[i] = {};
					if (oldC[i] == null || oldC[i][j] == null || isObj && (!hiddenchannelslib.ObjectUtils.is(oldC[i][j]) || Object.keys(defaults[i][j].value).some(n => defaults[i][j].value[n] != null && !hiddenchannelslib.sameProto(defaults[i][j].value[n], oldC[i][j][n])))) {
						newC[i][j] = isObj ? hiddenchannelslib.ObjectUtils.deepAssign({}, defaults[i][j].value) : defaults[i][j].value;
						update = true;
					}
					else newC[i][j] = oldC[i][j];
				};
				if (key) {for (let j in defaults[key]) checkLayer(key, j);}
				else {for (let i in defaults) if (hiddenchannelslib.ObjectUtils.is(defaults[i])) for (let j in defaults[i]) checkLayer(i, j);}
				if (update) hiddenchannelslib.DataUtils.save(Object.assign({}, oldC, newC), plugin);
				
				if (key === undefined) return newC;
				else if (id === undefined) return newC[key] === undefined ? {} : newC[key];
				else return newC[key] === undefined || newC[key][id] === undefined ? null : newC[key][id];
			};
			
			const cssFileName = "hiddenchannelslib.raw.css";
			const dataFileName = "hiddenchannelslib.data.json";
			const cssFilePath = path.join(hiddenchannelslib.BDUtils.getPluginsFolder(), cssFileName);
			const dataFilePath = path.join(hiddenchannelslib.BDUtils.getPluginsFolder(), dataFileName);
			let InternalData, libHashes = {}, oldLibHashes = hiddenchannelslib.DataUtils.load(hiddenchannelslib, "hashes"), libraryCSS;
			
			const getBackup = (fileName, path) => {
				return libHashes[fileName] && oldLibHashes[fileName] && libHashes[fileName] == oldLibHashes[fileName] && fs.existsSync(path) && (fs.readFileSync(path) || "").toString();
			};
			const requestLibraryHashes = tryAgain => {
				request("https://api.github.com/repos/SquishyNarwhal/plugins/contents/_res/", {headers: {"user-agent": "node.js"}}, (e, r, b) => {
					if ((e || !b || r.statusCode != 200) && tryAgain) return hiddenchannelslib.TimeUtils.timeout(_ => requestLibraryHashes(), 10000);
					try {
						b = JSON.parse(b);
						libHashes[cssFileName] = (b.find(n => n && n.name == cssFileName) || {}).sha;
						libHashes[dataFileName] = (b.find(n => n && n.name == dataFileName) || {}).sha;
						hiddenchannelslib.DataUtils.save(libHashes, hiddenchannelslib, "hashes")
						requestLibraryData(true);
					}
					catch (err) {requestLibraryData(true);}
				});
			};
			const requestLibraryData = tryAgain => {
				const parseCSS = css => {
					libraryCSS = css;
				
					const backupData = getBackup(dataFileName, dataFilePath);
					if (backupData) parseData(backupData);
					else request.get(`https://raw.githubusercontent.com/SquishyNarwhal/plugins/main/_res/${dataFileName}`, (e, r, b) => {
						if ((e || !b || r.statusCode != 200) && tryAgain) return hiddenchannelslib.TimeUtils.timeout(_ => requestLibraryData(), 10000);
						if (!e && b && r.statusCode == 200) parseData(b, true);
						else parseData(fs.existsSync(dataFilePath) && (fs.readFileSync(dataFilePath) || "").toString());
					});
				};
				const parseData = (dataString, fetched) => {
					try {InternalData = JSON.parse(dataString);}
					catch (err) {
						if (fetched) {
							try {
								dataString = fs.existsSync(dataFilePath) && (fs.readFileSync(dataFilePath) || "").toString();
								InternalData = JSON.parse(dataString);
							}
							catch (err2) {hiddenchannelslib.LogUtils.error(["Failed to initiate Library!", "Failed Fetch!", dataString ? "Corrupt Backup." : "No Backup.", , err2]);}
						}
						else hiddenchannelslib.LogUtils.error(["Failed to initiate Library!", dataString ? "Corrupt Backup." : "No Backup.", err]);
					}
					if (fetched && dataString) fs.writeFile(dataFilePath, dataString, _ => {});
					
					Internal.getWebModuleReq = function () {
						if (!Internal.getWebModuleReq.req) {
							const id = "hiddenchannelslib-WebModules";
							const req = window.webpackJsonp.push([[], {[id]: (module, exports, req) => module.exports = req}, [[id]]]);
							delete req.m[id];
							delete req.c[id];
							Internal.getWebModuleReq.req = req;
						}
						return Internal.getWebModuleReq.req;
					};
					
					if (InternalData) loadLibrary();
					else BdApi.alert("Error", "Could not initiate hiddenchannelslib Library Plugin. Check your Internet Connection and make sure GitHub isn't blocked by your Network or try disabling your VPN/Proxy.");
				};
				
				const backupCSS = getBackup(cssFileName, cssFilePath);
				if (backupCSS) parseCSS(backupCSS);
				else request.get(`https://raw.githubusercontent.com/SquishyNarwhal/plugins/main/_res/${cssFileName}`, (e, r, b) => {
					if ((e || !b || r.statusCode != 200) && tryAgain) return hiddenchannelslib.TimeUtils.timeout(_ => requestLibraryData(), 10000);
					if (!e && b && r.statusCode == 200) {
						fs.writeFile(cssFilePath, b, _ => {});
						parseCSS(b);
					}
					else parseCSS(fs.existsSync(cssFilePath) && (fs.readFileSync(cssFilePath) || "").toString());
				});
			};
			const loadLibrary = _ => {
				Internal.getPluginURL = function (plugin) {
					plugin = plugin == hiddenchannelslib && Internal || plugin;
					if (hiddenchannelslib.ObjectUtils.is(plugin)) {
						if (InternalData.PluginUrlMap && InternalData.PluginUrlMap[plugin.name]) return InternalData.PluginUrlMap[plugin.name];
						else if (plugin.updateUrl) return plugin.updateUrl;
						else {
							let name = InternalData.PluginNameMap && InternalData.PluginNameMap[plugin.name] || plugin.name;
							return `https://raw.githubusercontent.com/SquishyNarwhal/plugins/main/${name}/${name}.plugin.js`;
						}
					}
					else return "";
				};
				
				Internal.findModule = function (type, cacheString, filter, useExport, noWarnings = false) {
					if (!hiddenchannelslib.ObjectUtils.is(Cache.modules[type])) Cache.modules[type] = {module: {}, export: {}};
					if (useExport && Cache.modules[type].export[cacheString]) return Cache.modules[type].export[cacheString];
					else if (!useExport && Cache.modules[type].module[cacheString]) return Cache.modules[type].module[cacheString];
					else {
						let m = hiddenchannelslib.ModuleUtils.find(filter, {useExport: useExport});
						if (m) {
							if (useExport) Cache.modules[type].export[cacheString] = m;
							else Cache.modules[type].module[cacheString] = m;
							return m;
						}
						else if (!noWarnings) hiddenchannelslib.LogUtils.warn(`${cacheString} [${type}] not found in WebModules`);
					}
				};
				
				Internal.hasModuleStrings = function (module, strings, ignoreCase) {
					const toString = n => ignoreCase ? n.toString().toLowerCase() : n.toString();
					return [strings].flat(10).filter(n => typeof n == "string").map(ignoreCase ? (n => n.toLowerCase()) : (n => n)).every(string => typeof module == "function" && (toString(module).indexOf(string) > -1 || typeof module.__originalMethod == "function" && toString(module.__originalMethod).indexOf(string) > -1 || typeof module.__originalFunction == "function" && toString(module.__originalFunction).indexOf(string) > -1) || hiddenchannelslib.ObjectUtils.is(module) && typeof module.type == "function" && toString(module.type).indexOf(string) > -1);
				};
				
				Internal.getModuleString = function (module) {
					const id = (hiddenchannelslib.ModuleUtils.find(m => m == module && m, {useExport: false}) || {}).id;
					if (!id) return "";
					const req = Internal.getWebModuleReq();
					return (req.m[id] || "").toString();
				};
				
				Internal.lazyLoadModuleImports = function (moduleString) {
					return new Promise(callback => {
						if (typeof moduleString !== "string") moduleString = Internal.getModuleString(moduleString);
						if (!moduleString || typeof moduleString !== "string") {
							hiddenchannelslib.LogUtils.error("Trying to lazy load Imports but Module is not a String");
							return callback(null);
						}
						let run = true, imports = [], menuIndexes = [];
						while (run) {
							const [matchString, promiseMatch, menuRequest] = moduleString.match(/return (Promise\.all\(.+?\))\.then\((.+?)\)\)/) ?? [];
							if (!promiseMatch) run = false;
							else {
								imports = imports.concat(promiseMatch.match(/\d+/g)?.map(e => Number(e)));
								menuIndexes.push(menuRequest.match(/\d+/)?.[0]);
								moduleString = moduleString.replace(matchString, "");
							}
						}
						if (!imports.length || !menuIndexes.length) {
							hiddenchannelslib.LogUtils.error("Trying to lazy load Imports but could not find Indexes");
							return callback(null);
						}
						const req = Internal.getWebModuleReq();
						Promise.all(hiddenchannelslib.ArrayUtils.removeCopies(imports).map(i => req.e(i))).then(_ => Promise.all(hiddenchannelslib.ArrayUtils.removeCopies(menuIndexes).map(i => req(i)))).then(callback);
					});
				};
				
				hiddenchannelslib.ModuleUtils = {};
				hiddenchannelslib.ModuleUtils.find = function (filter, config = {}) {
					let useExport = typeof config.useExport != "boolean" ? true : config.useExport;
					let onlySearchUnloaded = typeof config.onlySearchUnloaded != "boolean" ? false : config.onlySearchUnloaded;
					let all = typeof config.all != "boolean" ? false : config.all;
					const req = Internal.getWebModuleReq();
					const found = [];
					if (!onlySearchUnloaded) for (let i in req.c) if (req.c.hasOwnProperty(i)) {
						let m = req.c[i].exports, r = null;
						if (m && (typeof m == "object" || typeof m == "function") && !!(r = filter(m))) {
							if (all) found.push(useExport ? r : req.c[i]);
							else return useExport ? r : req.c[i];
						}
						if (m && m.__esModule && m.default && (typeof m.default == "object" || typeof m.default == "function")) {
							if (!!(r = filter(m.default))) {
								if (all) found.push(useExport ? r : req.c[i]);
								else return useExport ? r : req.c[i];
							}
							else if (m.default.type && (typeof m.default.type == "object" || typeof m.default.type == "function") && !!(r = filter(m.default.type))) {
								if (all) found.push(useExport ? r : req.c[i]);
								else return useExport ? r : req.c[i];
							}
						}
					}
					for (let i in req.m) if (req.m.hasOwnProperty(i)) {
						let m = req.m[i];
						if (m && typeof m == "function") {
							if (req.c[i] && !onlySearchUnloaded && filter(m)) {
								if (all) found.push(useExport ? req.c[i].exports : req.c[i]);
								else return useExport ? req.c[i].exports : req.c[i];
							}
							if (!req.c[i] && onlySearchUnloaded && filter(m)) {
								const resolved = {}, resolved2 = {};
								m(resolved, resolved2, req);
								const trueResolved = resolved2 && hiddenchannelslib.ObjectUtils.isEmpty(resolved2) ? resolved : resolved2;
								if (all) found.push(useExport ? trueResolved.exports : trueResolved);
								else return useExport ? trueResolved.exports : trueResolved;
							}
						}
					}
					if (all) return found;
				};
				hiddenchannelslib.ModuleUtils.findByProperties = function (...properties) {
					properties = properties.flat(10);
					let arg2 = properties.pop();
					let arg1 = properties.pop();
					let useExport = true, noWarnings = false;
					if (typeof arg2 != "boolean") properties.push(...[arg1, arg2].filter(n => n));
					else {
						if (typeof arg1 != "boolean") {
							if (arg1) properties.push(arg1);
							useExport = arg2;
						}
						else {
							useExport = arg1;
							noWarnings = arg2;
						}
					}
					return Internal.findModule("prop", JSON.stringify(properties), m => properties.every(prop => {
						const value = m[prop];
						return value !== undefined && !(typeof value == "string" && !value);
					}) && m, useExport, noWarnings);
				};
				hiddenchannelslib.ModuleUtils.findByName = function (name, useExport, noWarnings = false) {
					return Internal.findModule("name", JSON.stringify(name), m => m.displayName === name && m || m.render && m.render.displayName === name && m || m.constructor && m.constructor.displayName === name && m || m[name] && m[name].displayName === name && m[name], typeof useExport != "boolean" ? true : useExport, noWarnings);
				};
				hiddenchannelslib.ModuleUtils.findByString = function (...strings) {
					strings = strings.flat(10);
					let arg2 = strings.pop();
					let arg1 = strings.pop();
					let useExport = true, noWarnings = false;
					if (typeof arg2 != "boolean") strings.push(...[arg1, arg2].filter(n => n));
					else {
						if (typeof arg1 != "boolean") {
							if (arg1) strings.push(arg1);
							useExport = arg2;
						}
						else {
							useExport = arg1;
							noWarnings = arg2;
						}
					}
					return Internal.findModule("string", JSON.stringify(strings), m => Internal.hasModuleStrings(m, strings) && m, useExport, noWarnings);
				};
				hiddenchannelslib.ModuleUtils.findByPrototypes = function (...protoProps) {
					protoProps = protoProps.flat(10);
					let arg2 = protoProps.pop();
					let arg1 = protoProps.pop();
					let useExport = true, noWarnings = false;
					if (typeof arg2 != "boolean") protoProps.push(...[arg1, arg2].filter(n => n));
					else {
						if (typeof arg1 != "boolean") {
							if (arg1) protoProps.push(arg1);
							useExport = arg2;
						}
						else {
							useExport = arg1;
							noWarnings = arg2;
						}
					}
					return Internal.findModule("proto", JSON.stringify(protoProps), m => m.prototype && protoProps.every(prop => {
						const value = m.prototype[prop];
						return value !== undefined && !(typeof value == "string" && !value);
					}) && m, useExport, noWarnings);
				};
				hiddenchannelslib.ModuleUtils.findStringObject = function (props, config = {}) {
					return hiddenchannelslib.ModuleUtils.find(m => {
						let amount = Object.keys(m).length;
						return (!config.length || (config.smaller ? amount < config.length : amount == config.length)) && [props].flat(10).every(prop => typeof m[prop] == "string") && m;
					}) || hiddenchannelslib.ModuleUtils.find(m => {
						if (typeof m != "function") return false;
						let stringified = m.toString().replace(/\s/g, "");
						if (stringified.indexOf("e=>{e.exports={") != 0) return false;
						let amount = stringified.split(":\"").length - 1;
						return (!config.length || (config.smaller ? amount < config.length : amount == config.length)) && [props].flat(10).every(string => stringified.indexOf(`${string}:`) > -1) && m;
					}, {onlySearchUnloaded: true});
				};
			
				hiddenchannelslib.ObserverUtils = {};
				hiddenchannelslib.ObserverUtils.connect = function (plugin, eleOrSelec, observer, config = {childList: true}) {
					plugin = plugin == hiddenchannelslib && Internal || plugin;
					if (!hiddenchannelslib.ObjectUtils.is(plugin) || !eleOrSelec || !observer) return;
					if (hiddenchannelslib.ObjectUtils.isEmpty(plugin.observers)) plugin.observers = {};
					if (!hiddenchannelslib.ArrayUtils.is(plugin.observers[observer.name])) plugin.observers[observer.name] = [];
					if (!observer.multi) for (let subinstance of plugin.observers[observer.name]) subinstance.disconnect();
					if (observer.instance) plugin.observers[observer.name].push(observer.instance);
					let instance = plugin.observers[observer.name][plugin.observers[observer.name].length - 1];
					if (instance) {
						let node = Node.prototype.isPrototypeOf(eleOrSelec) ? eleOrSelec : typeof eleOrSelec === "string" ? document.querySelector(eleOrSelec) : null;
						if (node) instance.observe(node, config);
					}
				};
				hiddenchannelslib.ObserverUtils.disconnect = function (plugin, observer) {
					plugin = plugin == hiddenchannelslib && Internal || plugin;
					if (hiddenchannelslib.ObjectUtils.is(plugin) && !hiddenchannelslib.ObjectUtils.isEmpty(plugin.observers)) {
						let observername = typeof observer == "string" ? observer : (hiddenchannelslib.ObjectUtils.is(observer) ? observer.name : null);
						if (!observername) {
							for (let observer in plugin.observers) for (let instance of plugin.observers[observer]) instance.disconnect();
							delete plugin.observers;
						}
						else if (!hiddenchannelslib.ArrayUtils.is(plugin.observers[observername])) {
							for (let instance of plugin.observers[observername]) instance.disconnect();
							delete plugin.observers[observername];
						}
					}
				};

				hiddenchannelslib.StoreChangeUtils = {};
				hiddenchannelslib.StoreChangeUtils.add = function (plugin, store, callback) {
					plugin = plugin == hiddenchannelslib && Internal || plugin;
					if (!hiddenchannelslib.ObjectUtils.is(plugin) || !hiddenchannelslib.ObjectUtils.is(store) || typeof store.addChangeListener != "function" ||  typeof callback != "function") return;
					hiddenchannelslib.StoreChangeUtils.remove(plugin, store, callback);
					if (!hiddenchannelslib.ArrayUtils.is(plugin.changeListeners)) plugin.changeListeners = [];
					plugin.changeListeners.push({store, callback});
					store.addChangeListener(callback);
				};
				hiddenchannelslib.StoreChangeUtils.remove = function (plugin, store, callback) {
					plugin = plugin == hiddenchannelslib && Internal || plugin;
					if (!hiddenchannelslib.ObjectUtils.is(plugin) || !hiddenchannelslib.ArrayUtils.is(plugin.changeListeners)) return;
					if (!store) {
						while (plugin.changeListeners.length) {
							let listener = plugin.changeListeners.pop();
							listener.store.removeChangeListener(listener.callback);
						}
					}
					else if (hiddenchannelslib.ObjectUtils.is(store) && typeof store.addChangeListener == "function") {
						if (!callback) {
							for (let listener of plugin.changeListeners) {
								let removedListeners = [];
								if (listener.store == store) {
									listener.store.removeChangeListener(listener.callback);
									removedListeners.push(listener);
								}
								if (removedListeners.length) plugin.changeListeners = plugin.changeListeners.filter(listener => !removedListeners.includes(listener));
							}
						}
						else if (typeof callback == "function") {
							store.removeChangeListener(callback);
							plugin.changeListeners = plugin.changeListeners.filter(listener => listener.store == store && listener.callback == callback);
						}
					}
				};

				var pressedKeys = [], mousePosition;
				hiddenchannelslib.ListenerUtils = {};
				hiddenchannelslib.ListenerUtils.isPressed = function (key) {
					return pressedKeys.includes(key);
				};
				hiddenchannelslib.ListenerUtils.getPosition = function (key) {
					return mousePosition;
				};
				hiddenchannelslib.ListenerUtils.add = function (plugin, ele, actions, selectorOrCallback, callbackOrNothing) {
					plugin = plugin == hiddenchannelslib && Internal || plugin;
					if (!hiddenchannelslib.ObjectUtils.is(plugin) || (!Node.prototype.isPrototypeOf(ele) && ele !== window) || !actions) return;
					let callbackIs4th = typeof selectorOrCallback == "function";
					let selector = callbackIs4th ? undefined : selectorOrCallback;
					let callback = callbackIs4th ? selectorOrCallback : callbackOrNothing;
					if (typeof callback != "function") return;
					hiddenchannelslib.ListenerUtils.remove(plugin, ele, actions, selector);
					for (let action of actions.split(" ")) {
						action = action.split(".");
						let eventName = action.shift().toLowerCase();
						if (!eventName) return;
						let origEventName = eventName;
						eventName = eventName == "mouseenter" || eventName == "mouseleave" ? "mouseover" : eventName;
						let namespace = (action.join(".") || "") + plugin.name;
						if (!hiddenchannelslib.ArrayUtils.is(plugin.eventListeners)) plugin.eventListeners = [];
						let eventCallback = null;
						if (selector) {
							if (origEventName == "mouseenter" || origEventName == "mouseleave") eventCallback = e => {
								for (let child of e.path) if (typeof child.matches == "function" && child.matches(selector) && !child[namespace + "hiddenchannelslib" + origEventName]) {
									child[namespace + "hiddenchannelslib" + origEventName] = true;
									if (origEventName == "mouseenter") callback(hiddenchannelslib.ListenerUtils.copyEvent(e, child));
									let mouseOut = e2 => {
										if (e2.target.contains(child) || e2.target == child || !child.contains(e2.target)) {
											if (origEventName == "mouseleave") callback(hiddenchannelslib.ListenerUtils.copyEvent(e, child));
											delete child[namespace + "hiddenchannelslib" + origEventName];
											document.removeEventListener("mouseout", mouseOut);
										}
									};
									document.addEventListener("mouseout", mouseOut);
									break;
								}
							};
							else eventCallback = e => {
								for (let child of e.path) if (typeof child.matches == "function" && child.matches(selector)) {
									callback(hiddenchannelslib.ListenerUtils.copyEvent(e, child));
									break;
								}
							};
						}
						else eventCallback = e => callback(hiddenchannelslib.ListenerUtils.copyEvent(e, ele));
						
						let observer;
						if (Node.prototype.isPrototypeOf(ele)) {
							observer = new MutationObserver(changes => changes.forEach(change => {
								const nodes = Array.from(change.removedNodes);
								if (nodes.indexOf(ele) > -1 || nodes.some(n =>  n.contains(ele))) hiddenchannelslib.ListenerUtils.remove(plugin, ele, actions, selector);
							}));
							observer.observe(document.body, {subtree: true, childList: true});
						}

						plugin.eventListeners.push({ele, eventName, origEventName, namespace, selector, eventCallback, observer});
						ele.addEventListener(eventName, eventCallback, true);
					}
				};
				hiddenchannelslib.ListenerUtils.remove = function (plugin, ele, actions = "", selector) {
					plugin = plugin == hiddenchannelslib && Internal || plugin;
					if (!hiddenchannelslib.ObjectUtils.is(plugin) || !hiddenchannelslib.ArrayUtils.is(plugin.eventListeners)) return;
					if (!ele) {
						while (plugin.eventListeners.length) {
							let listener = plugin.eventListeners.pop();
							listener.ele.removeEventListener(listener.eventName, listener.eventCallback, true);
							if (listener.observer) listener.observer.disconnect();
						}
					}
					else if (Node.prototype.isPrototypeOf(ele) || ele === window) {
						for (let action of actions.split(" ")) {
							action = action.split(".");
							let eventName = action.shift().toLowerCase();
							let namespace = (action.join(".") || "") + plugin.name;
							for (let listener of plugin.eventListeners) {
								let removedListeners = [];
								if (listener.ele == ele && (!eventName || listener.origEventName == eventName) && listener.namespace == namespace && (selector === undefined || listener.selector == selector)) {
									listener.ele.removeEventListener(listener.eventName, listener.eventCallback, true);
									if (listener.observer) listener.observer.disconnect();
									removedListeners.push(listener);
								}
								if (removedListeners.length) plugin.eventListeners = plugin.eventListeners.filter(listener => !removedListeners.includes(listener));
							}
						}
					}
				};
				hiddenchannelslib.ListenerUtils.addGlobal = function (plugin, id, keybind, action) {
					plugin = plugin == hiddenchannelslib && Internal || plugin;
					if (!hiddenchannelslib.ObjectUtils.is(plugin) || !id || !hiddenchannelslib.ArrayUtils.is(keybind) || typeof action != "function") return;
					if (!hiddenchannelslib.ObjectUtils.is(plugin.globalKeybinds)) plugin.globalKeybinds = {};
					hiddenchannelslib.ListenerUtils.removeGlobal(plugin, id);
					plugin.globalKeybinds[id] = hiddenchannelslib.NumberUtils.generateId(Object.entries(plugin.globalKeybinds).map(n => n[1]));
					hiddenchannelslib.LibraryModules.WindowUtils.inputEventRegister(plugin.globalKeybinds[id], keybind.map(n => [0, n]), action, {blurred: true, focused: true, keydown: false, keyup: true});
					return (_ => hiddenchannelslib.ListenerUtils.removeGlobal(plugin, id));
				};
				hiddenchannelslib.ListenerUtils.removeGlobal = function (plugin, id) {
					if (!hiddenchannelslib.ObjectUtils.is(plugin) || !plugin.globalKeybinds) return;
					if (!id) {
						for (let cachedId in plugin.globalKeybinds) hiddenchannelslib.LibraryModules.WindowUtils.inputEventUnregister(plugin.globalKeybinds[cachedId]);
						plugin.globalKeybinds = {};
					}
					else {
						hiddenchannelslib.LibraryModules.WindowUtils.inputEventUnregister(plugin.globalKeybinds[id]);
						delete plugin.globalKeybinds[id];
					}
				};
				hiddenchannelslib.ListenerUtils.multiAdd = function (node, actions, callback) {
					if (!Node.prototype.isPrototypeOf(node) || !actions || typeof callback != "function") return;
					for (let action of actions.trim().split(" ").filter(n => n)) node.addEventListener(action, callback, true);
				};
				hiddenchannelslib.ListenerUtils.multiRemove = function (node, actions, callback) {
					if (!Node.prototype.isPrototypeOf(node) || !actions || typeof callback != "function") return;
					for (let action of actions.trim().split(" ").filter(n => n)) node.removeEventListener(action, callback, true);
				};
				hiddenchannelslib.ListenerUtils.addToChildren = function (node, actions, selector, callback) {
					if (!Node.prototype.isPrototypeOf(node) || !actions || !selector || !selector.trim() || typeof callback != "function") return;
					for (let action of actions.trim().split(" ").filter(n => n)) {
						let eventCallback = callback;
						if (action == "mouseenter" || action == "mouseleave") eventCallback = e => {if (e.target.matches(selector)) callback(e);};
						node.querySelectorAll(selector.trim()).forEach(child => {child.addEventListener(action, eventCallback, true);});
					}
				};
				hiddenchannelslib.ListenerUtils.copyEvent = function (e, ele) {
					if (!e || !e.constructor || !e.type) return e;
					let eCopy = new e.constructor(e.type, e);
					Object.defineProperty(eCopy, "originalEvent", {value: e});
					Object.defineProperty(eCopy, "which", {value: e.which});
					Object.defineProperty(eCopy, "keyCode", {value: e.keyCode});
					Object.defineProperty(eCopy, "path", {value: e.path});
					Object.defineProperty(eCopy, "relatedTarget", {value: e.relatedTarget});
					Object.defineProperty(eCopy, "srcElement", {value: e.srcElement});
					Object.defineProperty(eCopy, "target", {value: e.target});
					Object.defineProperty(eCopy, "toElement", {value: e.toElement});
					if (ele) Object.defineProperty(eCopy, "currentTarget", {value: ele});
					return eCopy;
				};
				hiddenchannelslib.ListenerUtils.stopEvent = function (e) {
					if (hiddenchannelslib.ObjectUtils.is(e)) {
						if (typeof e.preventDefault == "function") e.preventDefault();
						if (typeof e.stopPropagation == "function") e.stopPropagation();
						if (typeof e.stopImmediatePropagation == "function") e.stopImmediatePropagation();
						if (hiddenchannelslib.ObjectUtils.is(e.originalEvent)) {
							if (typeof e.originalEvent.preventDefault == "function") e.originalEvent.preventDefault();
							if (typeof e.originalEvent.stopPropagation == "function") e.originalEvent.stopPropagation();
							if (typeof e.originalEvent.stopImmediatePropagation == "function") e.originalEvent.stopImmediatePropagation();
						}
					}
				};
				
				var Toasts = [], NotificationBars = [];
				var ToastQueues = {}, DesktopNotificationQueue = {queue: [], running: false};
				for (let key in LibraryConstants.ToastPositions) ToastQueues[LibraryConstants.ToastPositions[key]] = {queue: [], full: false};
				
				hiddenchannelslib.NotificationUtils = {};
				hiddenchannelslib.NotificationUtils.toast = function (children, config = {}) {
					if (!children) return;
					let app = document.querySelector(hiddenchannelslib.dotCN.appmount) || document.body;
					if (!app) return;
					let position = config.position && LibraryConstants.ToastPositions[config.position] || Internal.settings.choices.toastPosition && LibraryConstants.ToastPositions[Internal.settings.choices.toastPosition] || LibraryConstants.ToastPositions.right;
					
					const runQueue = _ => {
						if (ToastQueues[position].full) return;
						let data = ToastQueues[position].queue.shift();
						if (!data) return;
						
						let id = hiddenchannelslib.NumberUtils.generateId(Toasts);
						let toasts = document.querySelector(hiddenchannelslib.dotCN.toasts + hiddenchannelslib.dotCN[position]);
						if (!toasts) {
							toasts = hiddenchannelslib.DOMUtils.create(`<div class="${hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.toasts, hiddenchannelslib.disCN[position])}"></div>`);
							app.appendChild(toasts);
						}
						
						if (data.config.id) data.toast.id = data.config.id.split(" ").join("");
						if (data.config.className) hiddenchannelslib.DOMUtils.addClass(data.toast, data.config.className);
						if (data.config.css) hiddenchannelslib.DOMUtils.appendLocalStyle("hiddenchannelslibcustomToast" + id, data.config.css);
						if (data.config.style) data.toast.style = Object.assign({}, data.toast.style, data.config.style);
						
						let backgroundColor, fontColor, barColor;
						
						let type = data.config.type && hiddenchannelslib.disCN["toast" + data.config.type];
						if (!type) {
							barColor = hiddenchannelslib.ColorUtils.getType(data.config.barColor) ? hiddenchannelslib.ColorUtils.convert(data.config.barColor, "HEX") : data.config.barColor;
							let comp = hiddenchannelslib.ColorUtils.convert(data.config.color, "RGBCOMP");
							if (comp) {
								backgroundColor = hiddenchannelslib.ColorUtils.convert(comp, "HEX");
								fontColor = comp[0] > 180 && comp[1] > 180 && comp[2] > 180 ? "#000" : "#FFF";
								hiddenchannelslib.DOMUtils.addClass(data.toast, hiddenchannelslib.disCN.toastcustom);
							}
							else hiddenchannelslib.DOMUtils.addClass(data.toast, hiddenchannelslib.disCN.toastdefault);
						}
						else hiddenchannelslib.DOMUtils.addClass(data.toast, type);
						
						let loadingInterval;
						let disableInteractions = data.config.disableInteractions && typeof data.config.onClick != "function";
						let timeout = typeof data.config.timeout == "number" && !disableInteractions ? data.config.timeout : 3000;
						timeout = (timeout > 0 ? timeout : 600000) + 300;
						if (data.config.ellipsis && typeof data.children == "string") loadingInterval = hiddenchannelslib.TimeUtils.interval(_ => data.toast.update(data.children.endsWith(".....") ? data.children.slice(0, -5) : data.children + "."), 500);
						
						let closeTimeout = hiddenchannelslib.TimeUtils.timeout(_ => data.toast.close(), timeout);
						data.toast.close = _ => {
							hiddenchannelslib.TimeUtils.clear(closeTimeout);
							if (document.contains(data.toast)) {
								hiddenchannelslib.DOMUtils.addClass(data.toast, hiddenchannelslib.disCN.toastclosing);
								data.toast.style.setProperty("pointer-events", "none", "important");
								hiddenchannelslib.TimeUtils.timeout(_ => {
									if (typeof data.config.onClose == "function") data.config.onClose();
									hiddenchannelslib.TimeUtils.clear(loadingInterval);
									hiddenchannelslib.ArrayUtils.remove(Toasts, id);
									hiddenchannelslib.DOMUtils.removeLocalStyle("hiddenchannelslibcustomToast" + id);
									data.toast.remove();
									if (!toasts.querySelectorAll(hiddenchannelslib.dotCN.toast).length) toasts.remove();
								}, 300);
							}
							ToastQueues[position].full = false;
							runQueue();
						};
						
						if (disableInteractions) data.toast.style.setProperty("pointer-events", "none", "important");
						else {
							hiddenchannelslib.DOMUtils.addClass(data.toast, hiddenchannelslib.disCN.toastclosable);
							data.toast.addEventListener("click", event => {
								if (typeof data.config.onClick == "function" && !hiddenchannelslib.DOMUtils.getParent(hiddenchannelslib.dotCN.toastcloseicon, event.target)) data.config.onClick();
								data.toast.close();
							});
							if (typeof closeTimeout.pause == "function") {
								let paused = false;
								data.toast.addEventListener("mouseenter", _ => {
									if (paused) return;
									paused = true;
									closeTimeout.pause();
								});
								data.toast.addEventListener("mouseleave", _ => {
									if (!paused) return;
									paused = false;
									closeTimeout.resume();
								});
							}
						}
						
						toasts.appendChild(data.toast);
						hiddenchannelslib.TimeUtils.timeout(_ => hiddenchannelslib.DOMUtils.removeClass(data.toast, hiddenchannelslib.disCN.toastopening));
						
						let icon = data.config.avatar ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.AvatarComponents.default, {
							src: data.config.avatar,
							size: Internal.LibraryComponents.AvatarComponents.Sizes.SIZE_24
						}) : ((data.config.icon || data.config.type && LibraryConstants.ToastIcons[data.config.type]) ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SvgIcon, {
							name: data.config.type && LibraryConstants.ToastIcons[data.config.type] && Internal.LibraryComponents.SvgIcon.Names[LibraryConstants.ToastIcons[data.config.type]],
							iconSVG: data.config.icon,
							width: 18,
							height: 18,
							nativeClass: true
						}) : null);
						
						hiddenchannelslib.ReactUtils.render(hiddenchannelslib.ReactUtils.createElement(class hiddenchannelslib_Toast extends Internal.LibraryModules.React.Component {
							componentDidMount() {
								data.toast.update = newChildren => {
									if (!newChildren) return;
									data.children = newChildren;
									hiddenchannelslib.ReactUtils.forceUpdate(this);
								};
							}
							render() {
								return hiddenchannelslib.ReactUtils.createElement(Internal.LibraryModules.React.Fragment, {
									children: [
										hiddenchannelslib.ReactUtils.createElement("div", {
											className: hiddenchannelslib.disCN.toastbg,
											style: {backgroundColor: backgroundColor}
										}),
										hiddenchannelslib.ReactUtils.createElement("div", {
											className: hiddenchannelslib.disCN.toastinner,
											style: {color: fontColor},
											children: [
												icon && hiddenchannelslib.ReactUtils.createElement("div", {
													className: hiddenchannelslib.DOMUtils.formatClassName(data.config.avatar && hiddenchannelslib.disCN.toastavatar, hiddenchannelslib.disCN.toasticon, data.config.iconClassName),
													children: icon
												}),
												hiddenchannelslib.ReactUtils.createElement("div", {
													className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.toasttext, data.config.textClassName),
													children: data.children
												}),
												!disableInteractions && hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SvgIcon, {
													className: hiddenchannelslib.disCN.toastcloseicon,
													name: Internal.LibraryComponents.SvgIcon.Names.CLOSE,
													width: 16,
													height: 16
												})
											].filter(n => n)
										}),
										hiddenchannelslib.ReactUtils.createElement("div", {
											className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.toastbar, barColor && hiddenchannelslib.disCN.toastcustombar),
											style: {
												backgroundColor: barColor,
												animation: `toast-bar ${timeout}ms normal linear`
											}
										})
									]
								});
							}
						}, {}), data.toast);
						
						ToastQueues[position].full = (hiddenchannelslib.ArrayUtils.sum(Array.from(toasts.childNodes).map(c => {
							let height = hiddenchannelslib.DOMUtils.getRects(c).height;
							return height > 50 ? height : 50;
						})) - 100) > hiddenchannelslib.DOMUtils.getRects(app).height;
						
						if (typeof data.config.onShow == "function") data.config.onShow();
					};
					
					let toast = hiddenchannelslib.DOMUtils.create(`<div class="${hiddenchannelslib.disCNS.toast + hiddenchannelslib.disCN.toastopening}"></div>`);
					toast.update = _ => {};
					ToastQueues[position].queue.push({children, config, toast});
					runQueue();
					return toast;
				};
				hiddenchannelslib.NotificationUtils.desktop = function (content, config = {}) {
					if (!content) return;
					
					const queue = _ => {
						DesktopNotificationQueue.queue.push({content, config});
						runQueue();
					};
					const runQueue = _ => {
						if (DesktopNotificationQueue.running) return;
						let data = DesktopNotificationQueue.queue.shift();
						if (!data) return;
						
						DesktopNotificationQueue.running = true;
						let muted = data.config.silent;
						data.config.silent = data.config.silent || data.config.sound ? true : false;
						let audio = new Audio();
						if (!muted && data.config.sound) {
							audio.src = data.config.sound;
							audio.play();
						}
						let notification = new Notification(data.content, data.config);
						
						let disableInteractions = data.config.disableInteractions && typeof data.config.onClick != "function";
						if (disableInteractions) notification.onclick = _ => {};
						else notification.onclick = _ => {
							if (typeof data.config.onClick == "function") data.config.onClick();
							notification.close();
						};
						
						notification.onclose = _ => {
							audio.pause();
							DesktopNotificationQueue.running = false;
							hiddenchannelslib.TimeUtils.timeout(runQueue, 1000);
						}
					};
					
					if (!("Notification" in window)) {}
					else if (Notification.permission === "granted") queue();
					else if (Notification.permission !== "denied") Notification.requestPermission(function (response) {if (response === "granted") queue();});
				};
				hiddenchannelslib.NotificationUtils.notice = function (text, config = {}) {
					if (!text) return;
					let layers = document.querySelector(hiddenchannelslib.dotCN.layers) || document.querySelector(hiddenchannelslib.dotCN.appmount);
					if (!layers) return;
					let id = hiddenchannelslib.NumberUtils.generateId(NotificationBars);
					let notice = hiddenchannelslib.DOMUtils.create(`<div class="${hiddenchannelslib.disCNS.notice + hiddenchannelslib.disCN.noticewrapper}" notice-id="${id}"><div class="${hiddenchannelslib.disCN.noticedismiss}"${config.forceStyle ? ` style="width: 36px !important; height: 36px !important; position: absolute !important; top: 0 !important; right: 0 !important; left: unset !important;"` : ""}><svg class="${hiddenchannelslib.disCN.noticedismissicon}" aria-hidden="false" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M18.4 4L12 10.4L5.6 4L4 5.6L10.4 12L4 18.4L5.6 20L12 13.6L18.4 20L20 18.4L13.6 12L20 5.6L18.4 4Z"></path></svg></div><div class="${hiddenchannelslib.disCN.noticetext}"></div></div>`);
					layers.parentElement.insertBefore(notice, layers);
					let noticeText = notice.querySelector(hiddenchannelslib.dotCN.noticetext);
					if (config.platform) for (let platform of config.platform.split(" ")) if (DiscordClasses["noticeicon" + platform]) {
						let icon = hiddenchannelslib.DOMUtils.create(`<i class="${hiddenchannelslib.disCN["noticeicon" + platform]}"></i>`);
						hiddenchannelslib.DOMUtils.addClass(icon, hiddenchannelslib.disCN.noticeplatformicon);
						hiddenchannelslib.DOMUtils.removeClass(icon, hiddenchannelslib.disCN.noticeicon);
						notice.insertBefore(icon, noticeText);
					}
					if (config.customIcon) {
						let icon = document.createElement("i"), iconInner = hiddenchannelslib.DOMUtils.create(config.customIcon);
						if (iconInner.nodeType == Node.TEXT_NODE) icon.style.setProperty("background", `url(${config.customIcon}) center/cover no-repeat`);
						else {
							icon = iconInner;
							if ((icon.tagName || "").toUpperCase() == "SVG") {
								icon.removeAttribute("width");
								icon.setAttribute("height", "100%");
							}
						}
						hiddenchannelslib.DOMUtils.addClass(icon, hiddenchannelslib.disCN.noticeplatformicon);
						hiddenchannelslib.DOMUtils.removeClass(icon, hiddenchannelslib.disCN.noticeicon);
						notice.insertBefore(icon, noticeText);
					}
					if (hiddenchannelslib.ArrayUtils.is(config.buttons)) for (let data of config.buttons) {
						let contents = typeof data.contents == "string" && data.contents;
						if (contents) {
							let button = hiddenchannelslib.DOMUtils.create(`<button class="${hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.noticebutton, data.className)}">${contents}</button>`);
							button.addEventListener("click", event => {
								if (data.close) notice.close();
								if (typeof data.onClick == "function") data.onClick(event, notice);
							});
							if (typeof data.onMouseEnter == "function") button.addEventListener("mouseenter", event => data.onMouseEnter(event, notice));
							if (typeof data.onMouseLeave == "function") button.addEventListener("mouseleave", event => data.onMouseLeave(event, notice));
							notice.appendChild(button);
						}
					}
					if (config.id) notice.id = config.id.split(" ").join("");
					if (config.className) hiddenchannelslib.DOMUtils.addClass(notice, config.className);
					if (config.textClassName) hiddenchannelslib.DOMUtils.addClass(noticeText, config.textClassName);
					if (config.css) hiddenchannelslib.DOMUtils.appendLocalStyle("hiddenchannelslibcustomNotificationBar" + id, config.css);
					if (config.style) notice.style = config.style;
					if (config.html) noticeText.innerHTML = text;
					else {
						let link = document.createElement("a");
						let newText = [];
						for (let word of text.split(" ")) {
							let encodedWord = hiddenchannelslib.StringUtils.htmlEscape(word);
							link.href = word;
							newText.push(link.host && link.host !== window.location.host ? `<label class="${hiddenchannelslib.disCN.noticetextlink}">${encodedWord}</label>` : encodedWord);
						}
						noticeText.innerHTML = newText.join(" ");
					}
					let type = null;
					if (config.type && !document.querySelector(hiddenchannelslib.dotCNS.chatbase + hiddenchannelslib.dotCN.noticestreamer)) {
						if (type = hiddenchannelslib.disCN["notice" + config.type]) hiddenchannelslib.DOMUtils.addClass(notice, type);
						if (config.type == "premium") {
							let noticeButton = notice.querySelector(hiddenchannelslib.dotCN.noticebutton);
							if (noticeButton) hiddenchannelslib.DOMUtils.addClass(noticeButton, hiddenchannelslib.disCN.noticepremiumaction);
							hiddenchannelslib.DOMUtils.addClass(noticeText, hiddenchannelslib.disCN.noticepremiumtext);
							notice.insertBefore(hiddenchannelslib.DOMUtils.create(`<i class="${hiddenchannelslib.disCN.noticepremiumlogo}"></i>`), noticeText);
						}
					}
					if (!type) {
						let comp = hiddenchannelslib.ColorUtils.convert(config.color, "RGBCOMP");
						if (comp) {
							let fontColor = comp[0] > 180 && comp[1] > 180 && comp[2] > 180 ? "#000" : "#FFF";
							let backgroundColor = hiddenchannelslib.ColorUtils.convert(comp, "HEX");
							hiddenchannelslib.DOMUtils.appendLocalStyle("hiddenchannelslibcustomNotificationBarColorCorrection" + id, `${hiddenchannelslib.dotCN.noticewrapper}[notice-id="${id}"]{background-color: ${backgroundColor} !important;}${hiddenchannelslib.dotCN.noticewrapper}[notice-id="${id}"] ${hiddenchannelslib.dotCN.noticetext} {color: ${fontColor} !important;}${hiddenchannelslib.dotCN.noticewrapper}[notice-id="${id}"] ${hiddenchannelslib.dotCN.noticebutton} {color: ${fontColor} !important;border-color: ${hiddenchannelslib.ColorUtils.setAlpha(fontColor, 0.25, "RGBA")} !important;}${hiddenchannelslib.dotCN.noticewrapper}[notice-id="${id}"] ${hiddenchannelslib.dotCN.noticebutton}:hover {color: ${backgroundColor} !important;background-color: ${fontColor} !important;}${hiddenchannelslib.dotCN.noticewrapper}[notice-id="${id}"] ${hiddenchannelslib.dotCN.noticedismissicon} path {fill: ${fontColor} !important;}`);
							hiddenchannelslib.DOMUtils.addClass(notice, hiddenchannelslib.disCN.noticecustom);
						}
						else hiddenchannelslib.DOMUtils.addClass(notice, hiddenchannelslib.disCN.noticedefault);
					}
					if (config.forceStyle) {
						notice.style.setProperty("display", "flex", "important");
						notice.style.setProperty("height", "36px", "important");
						notice.style.setProperty("min-width", "70vw", "important");
						notice.style.setProperty("left", "unset", "important");
						notice.style.setProperty("right", "unset", "important");
						let sideMargin = ((hiddenchannelslib.DOMUtils.getWidth(document.body.firstElementChild) - hiddenchannelslib.DOMUtils.getWidth(notice))/2);
						notice.style.setProperty("left", `${sideMargin}px`, "important");
						notice.style.setProperty("right", `${sideMargin}px`, "important");
						notice.style.setProperty("min-width", "unset", "important");
						notice.style.setProperty("width", "unset", "important");
						notice.style.setProperty("max-width", `calc(100vw - ${sideMargin*2}px)`, "important");
					}
					notice.close = _ => {
						hiddenchannelslib.DOMUtils.addClass(notice, hiddenchannelslib.disCN.noticeclosing);
						if (config.forceStyle) {
							notice.style.setProperty("overflow", "hidden", "important");
							notice.style.setProperty("height", "0px", "important");
						}
						if (notice.tooltip && typeof notice.tooltip.removeTooltip == "function") notice.tooltip.removeTooltip();
						hiddenchannelslib.TimeUtils.timeout(_ => {
							if (typeof config.onClose == "function") config.onClose();
							hiddenchannelslib.ArrayUtils.remove(NotificationBars, id);
							hiddenchannelslib.DOMUtils.removeLocalStyle("hiddenchannelslibcustomNotificationBar" + id);
							hiddenchannelslib.DOMUtils.removeLocalStyle("hiddenchannelslibcustomNotificationBarColorCorrection" + id);
							hiddenchannelslib.DOMUtils.remove(notice);
						}, 500);
					};
					notice.querySelector(hiddenchannelslib.dotCN.noticedismiss).addEventListener("click", notice.close);
					return notice;
				};
				hiddenchannelslib.NotificationUtils.alert = function (header, body) {
					if (typeof header == "string" && typeof header == "string" && BdApi && typeof BdApi.alert == "function") BdApi.alert(header, body);
				};

				var Tooltips = [];
				hiddenchannelslib.TooltipUtils = {};
				hiddenchannelslib.TooltipUtils.create = function (anker, text, config = {}) {
					if (!text && !config.guild) return null;
					const itemLayerContainer = document.querySelector(hiddenchannelslib.dotCN.app + " ~ " + hiddenchannelslib.dotCN.itemlayercontainer) || document.querySelector(hiddenchannelslib.dotCN.itemlayercontainer);
					if (!itemLayerContainer || !Node.prototype.isPrototypeOf(anker) || !document.contains(anker)) return null;
					const id = hiddenchannelslib.NumberUtils.generateId(Tooltips);
					const itemLayer = hiddenchannelslib.DOMUtils.create(`<div class="${hiddenchannelslib.disCNS.itemlayer + hiddenchannelslib.disCN.itemlayerdisabledpointerevents}"><div class="${hiddenchannelslib.disCN.tooltip}" tooltip-id="${id}"><div class="${hiddenchannelslib.disCN.tooltipcontent}"></div><div class="${hiddenchannelslib.disCN.tooltippointer}"></div></div></div>`);
					itemLayerContainer.appendChild(itemLayer);
					
					const tooltip = itemLayer.firstElementChild;
					const tooltipContent = itemLayer.querySelector(hiddenchannelslib.dotCN.tooltipcontent);
					const tooltipPointer = itemLayer.querySelector(hiddenchannelslib.dotCN.tooltippointer);
					
					if (config.id) tooltip.id = config.id.split(" ").join("");
					
					if (typeof config.type != "string" || !hiddenchannelslib.disCN["tooltip" + config.type.toLowerCase()]) config.type = "top";
					let type = config.type.toLowerCase();
					hiddenchannelslib.DOMUtils.addClass(tooltip, hiddenchannelslib.disCN["tooltip" + type], config.className);
					
					let fontColorIsGradient = false, customBackgroundColor = false, style = "";
					if (config.style) style += config.style;
					if (config.fontColor) {
						fontColorIsGradient = hiddenchannelslib.ObjectUtils.is(config.fontColor);
						if (!fontColorIsGradient) style = (style ? (style + " ") : "") + `color: ${hiddenchannelslib.ColorUtils.convert(config.fontColor, "RGBA")} !important;`
					}
					if (config.backgroundColor) {
						customBackgroundColor = true;
						let backgroundColorIsGradient = hiddenchannelslib.ObjectUtils.is(config.backgroundColor);
						let backgroundColor = !backgroundColorIsGradient ? hiddenchannelslib.ColorUtils.convert(config.backgroundColor, "RGBA") : hiddenchannelslib.ColorUtils.createGradient(config.backgroundColor);
						style = (style ? (style + " ") : "") + `background: ${backgroundColor} !important; border-color: ${backgroundColorIsGradient ? hiddenchannelslib.ColorUtils.convert(config.backgroundColor[type == "left" ? 100 : 0], "RGBA") : backgroundColor} !important;`;
					}
					if (style) tooltip.style = style;
					const zIndexed = config.zIndex && typeof config.zIndex == "number";
					if (zIndexed) {
						itemLayer.style.setProperty("z-index", config.zIndex, "important");
						tooltip.style.setProperty("z-index", config.zIndex, "important");
						tooltipContent.style.setProperty("z-index", config.zIndex, "important");
						hiddenchannelslib.DOMUtils.addClass(itemLayerContainer, hiddenchannelslib.disCN.itemlayercontainerzindexdisabled);
					}
					if (typeof config.width == "number" && config.width > 196) {
						tooltip.style.setProperty("width", `${config.width}px`, "important");
						tooltip.style.setProperty("max-width", `${config.width}px`, "important");
					}
					if (typeof config.maxWidth == "number" && config.maxWidth > 196) {
						tooltip.style.setProperty("max-width", `${config.maxWidth}px`, "important");
					}
					if (customBackgroundColor) hiddenchannelslib.DOMUtils.addClass(tooltip, hiddenchannelslib.disCN.tooltipcustom);
					else if (config.color && hiddenchannelslib.disCN["tooltip" + config.color.toLowerCase()]) hiddenchannelslib.DOMUtils.addClass(tooltip, hiddenchannelslib.disCN["tooltip" + config.color.toLowerCase()]);
					else hiddenchannelslib.DOMUtils.addClass(tooltip, hiddenchannelslib.disCN.tooltipprimary);
					
					if (config.list || hiddenchannelslib.ObjectUtils.is(config.guild)) hiddenchannelslib.DOMUtils.addClass(tooltip, hiddenchannelslib.disCN.tooltiplistitem);
					
					const removeTooltip = _ => {
						document.removeEventListener("wheel", wheel);
						document.removeEventListener("mousemove", mouseMove);
						document.removeEventListener("mouseleave", mouseLeave);
						hiddenchannelslib.DOMUtils.remove(itemLayer);
						hiddenchannelslib.ArrayUtils.remove(Tooltips, id);
						observer.disconnect();
						if (zIndexed) hiddenchannelslib.DOMUtils.removeClass(itemLayerContainer, hiddenchannelslib.disCN.itemlayercontainerzindexdisabled);
						if (typeof config.onHide == "function") config.onHide(itemLayer, anker);
					};
					const setText = newText => {
						if (hiddenchannelslib.ObjectUtils.is(config.guild)) {
							let isMuted = Internal.LibraryModules.MutedUtils.isMuted(config.guild.id);
							let muteConfig = Internal.LibraryModules.MutedUtils.getMuteConfig(config.guild.id);
							
							let children = [typeof newText == "function" ? newText() : newText].flat(10).filter(n => typeof n == "string" || hiddenchannelslib.ReactUtils.isValidElement(n));
							
							hiddenchannelslib.ReactUtils.render(hiddenchannelslib.ReactUtils.createElement(Internal.LibraryModules.React.Fragment, {
								children: [
									hiddenchannelslib.ReactUtils.createElement("div", {
										className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.tooltiprow, hiddenchannelslib.disCN.tooltiprowguildname),
										children: [
											hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.GuildComponents.Badge, {
												guild: config.guild,
												size: Internal.LibraryModules.StringUtils.cssValueToNumber(Internal.DiscordClassModules.TooltipGuild.iconSize),
												className: hiddenchannelslib.disCN.tooltiprowicon
											}),
											hiddenchannelslib.ReactUtils.createElement("span", {
												className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.tooltipguildnametext),
												children: fontColorIsGradient ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TextGradientElement, {
													gradient: hiddenchannelslib.ColorUtils.createGradient(config.fontColor),
													children: config.guild.toString()
												}) : config.guild.toString()
											}),
										]
									}),
									children.length && hiddenchannelslib.ReactUtils.createElement("div", {
										className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.tooltiprow, hiddenchannelslib.disCN.tooltiprowextra),
										children: children
									}),
									config.note && hiddenchannelslib.ReactUtils.createElement("div", {
										className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.tooltiprow, hiddenchannelslib.disCN.tooltiprowextra, hiddenchannelslib.disCN.tooltipnote),
										children: config.note
									}),
									hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.GuildVoiceList, {guild: config.guild}),
									isMuted && muteConfig && (muteConfig.end_time == null ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TextElement, {
										className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.tooltipmutetext),
										size: Internal.LibraryComponents.TextElement.Sizes.SIZE_12,
										color: Internal.LibraryComponents.TextElement.Colors.MUTED,
										children: hiddenchannelslib.LanguageUtils.LanguageStrings.VOICE_CHANNEL_MUTED
									}) : hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.GuildComponents.MutedText, {
										className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.tooltipmutetext),
										muteConfig: muteConfig
									}))
								].filter(n => n)
							}), tooltipContent);
						}
						else {
							let children = [typeof newText == "function" ? newText() : newText].flat(10).filter(n => typeof n == "string" || hiddenchannelslib.ReactUtils.isValidElement(n));
							children.length && hiddenchannelslib.ReactUtils.render(hiddenchannelslib.ReactUtils.createElement(Internal.LibraryModules.React.Fragment, {
								children: [
									fontColorIsGradient ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TextGradientElement, {
										gradient: hiddenchannelslib.ColorUtils.createGradient(config.fontColor),
										children: children
									}) : children,
									config.note && hiddenchannelslib.ReactUtils.createElement("div", {
										className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.tooltiprow, hiddenchannelslib.disCN.tooltiprowextra, hiddenchannelslib.disCN.tooltipnote),
										children: config.note
									})
								]
							}), tooltipContent);
						}
					};
					const update = newText => {
						if (newText) setText(newText);
						let left, top;
						const tRects = hiddenchannelslib.DOMUtils.getRects(anker);
						const iRects = hiddenchannelslib.DOMUtils.getRects(itemLayer);
						const aRects = hiddenchannelslib.DOMUtils.getRects(document.querySelector(hiddenchannelslib.dotCN.appmount));
						const positionOffsets = {height: 10, width: 10};
						const offset = typeof config.offset == "number" ? config.offset : 0;
						switch (type) {
							case "top":
								top = tRects.top - iRects.height - positionOffsets.height + 2 - offset;
								left = tRects.left + (tRects.width - iRects.width) / 2;
								break;
							case "bottom":
								top = tRects.top + tRects.height + positionOffsets.height - 2 + offset;
								left = tRects.left + (tRects.width - iRects.width) / 2;
								break;
							case "left":
								top = tRects.top + (tRects.height - iRects.height) / 2;
								left = tRects.left - iRects.width - positionOffsets.width + 2 - offset;
								break;
							case "right":
								top = tRects.top + (tRects.height - iRects.height) / 2;
								left = tRects.left + tRects.width + positionOffsets.width - 2 + offset;
								break;
							}
							
						itemLayer.style.setProperty("top", `${top}px`, "important");
						itemLayer.style.setProperty("left", `${left}px`, "important");
						
						tooltipPointer.style.removeProperty("margin-left");
						tooltipPointer.style.removeProperty("margin-top");
						if (type == "top" || type == "bottom") {
							if (left < 0) {
								itemLayer.style.setProperty("left", "5px", "important");
								tooltipPointer.style.setProperty("margin-left", `${left - 10}px`, "important");
							}
							else {
								const rightMargin = aRects.width - (left + iRects.width);
								if (rightMargin < 0) {
									itemLayer.style.setProperty("left", `${aRects.width - iRects.width - 5}px`, "important");
									tooltipPointer.style.setProperty("margin-left", `${-1*rightMargin}px`, "important");
								}
							}
						}
						else if (type == "left" || type == "right") {
							if (top < 0) {
								const bRects = hiddenchannelslib.DOMUtils.getRects(document.querySelector(hiddenchannelslib.dotCN.titlebar));
								const barCorrection = (bRects.width || 0) >= Math.round(75 * window.outerWidth / aRects.width) ? (bRects.height + 5) : 0;
								itemLayer.style.setProperty("top", `${5 + barCorrection}px`, "important");
								tooltipPointer.style.setProperty("margin-top", `${top - 10 - barCorrection}px`, "important");
							}
							else {
								const bottomMargin = aRects.height - (top + iRects.height);
								if (bottomMargin < 0) {
									itemLayer.style.setProperty("top", `${aRects.height - iRects.height - 5}px`, "important");
									tooltipPointer.style.setProperty("margin-top", `${-1*bottomMargin}px`, "important");
								}
							}
						}
					};

					const wheel = e => {
						const tRects1 = hiddenchannelslib.DOMUtils.getRects(anker);
						hiddenchannelslib.TimeUtils.clear(wheel.timeout);
						wheel.timeout = hiddenchannelslib.TimeUtils.timeout(_ => {
							const tRects2 = hiddenchannelslib.DOMUtils.getRects(anker);
							if (tRects1.x != tRects2.x || tRects1.y != tRects2.y) removeTooltip();
						}, 500);
					};
					const mouseMove = e => {
						const parent = e.target.parentElement.querySelector(":hover");
						if (parent && anker != parent && !anker.contains(parent)) removeTooltip();
					};
					const mouseLeave = e => removeTooltip();
					if (!config.perssist) {
						document.addEventListener("wheel", wheel);
						document.addEventListener("mousemove", mouseMove);
						document.addEventListener("mouseleave", mouseLeave);
					}
					
					const observer = new MutationObserver(changes => changes.forEach(change => {
						const nodes = Array.from(change.removedNodes);
						if (nodes.indexOf(itemLayer) > -1 || nodes.indexOf(anker) > -1 || nodes.some(n =>  n.contains(anker))) removeTooltip();
					}));
					observer.observe(document.body, {subtree: true, childList: true});
					
					tooltip.removeTooltip = itemLayer.removeTooltip = removeTooltip;
					tooltip.setText = itemLayer.setText = setText;
					tooltip.update = itemLayer.update = update;
					setText(text);
					update();
					
					if (config.delay) {
						hiddenchannelslib.DOMUtils.toggle(itemLayer);
						hiddenchannelslib.TimeUtils.timeout(_ => {
							hiddenchannelslib.DOMUtils.toggle(itemLayer);
							if (typeof config.onShow == "function") config.onShow(itemLayer, anker);
						}, config.delay);
					}
					else {
						if (typeof config.onShow == "function") config.onShow(itemLayer, anker);
					}
					return itemLayer;
				};
				
				Internal.forceInitiateProcess = function (pluginDataObjs, instance, type) {
					pluginDataObjs = [pluginDataObjs].flat(10).filter(n => n);
					if (pluginDataObjs.length && instance && type) {
						let forceRender = false;
						for (let pluginData of pluginDataObjs) {
							let plugin = pluginData.plugin == hiddenchannelslib && Internal || pluginData.plugin, methodNames = [];
							for (let patchType in plugin.patchedModules) {
								if (plugin.patchedModules[patchType][type]) methodNames.push(plugin.patchedModules[patchType][type]);
							}
							methodNames = hiddenchannelslib.ArrayUtils.removeCopies(methodNames).flat(10).filter(n => n);
							if (methodNames.includes("componentDidMount")) Internal.initiateProcess(plugin, type, {
								arguments: [],
								instance: instance,
								returnvalue: undefined,
								component: undefined,
								methodname: "componentDidMount",
								patchtypes: pluginData.patchTypes[type]
							});
							if (methodNames.includes("render")) forceRender = true;
							else if (!forceRender && methodNames.includes("componentDidUpdate")) Internal.initiateProcess(plugin, type, {
								arguments: [],
								instance: instance,
								returnvalue: undefined,
								component: undefined,
								methodname: "componentDidUpdate",
								patchtypes: pluginData.patchTypes[type]
							});
						}
						if (forceRender) hiddenchannelslib.ReactUtils.forceUpdate(instance);
					}
				};
				Internal.initiateProcess = function (plugin, type, e) {
					plugin = plugin == hiddenchannelslib && Internal || plugin;
					if (hiddenchannelslib.ObjectUtils.is(plugin) && !plugin.stopping && e.instance) {
						type = Internal.LibraryModules.StringUtils.upperCaseFirstChar(type.split(" _ _ ")[1] || type).replace(/[^A-z0-9]|_/g, "");
						if (typeof plugin[`process${type}`] == "function") {
							if (typeof e.methodname == "string" && (e.methodname.indexOf("componentDid") == 0 || e.methodname.indexOf("componentWill") == 0)) {
								e.node = hiddenchannelslib.ReactUtils.findDOMNode(e.instance);
								if (e.node) {
									let tempReturn = plugin[`process${type}`](e);
									return tempReturn !== undefined ? tempReturn : e.returnvalue;
								}
								else hiddenchannelslib.TimeUtils.timeout(_ => {
									e.node = hiddenchannelslib.ReactUtils.findDOMNode(e.instance);
									if (e.node) plugin[`process${type}`](e);
								});
							}
							else if (e.returnvalue !== undefined || e.patchtypes.includes("before")) {
								let tempReturn = plugin[`process${type}`](e);
								return tempReturn !== undefined ? tempReturn : e.returnvalue;
							}
						}
					}
				};
				Internal.patchObserverData = {observer: null, data: {}};
				Internal.patchPlugin = function (plugin) {
					plugin = plugin == hiddenchannelslib && Internal || plugin;
					if (!hiddenchannelslib.ObjectUtils.is(plugin) || !hiddenchannelslib.ObjectUtils.is(plugin.patchedModules)) return;
					hiddenchannelslib.PatchUtils.unpatch(plugin);
					let patchedModules = {};
					for (let patchType in plugin.patchedModules) for (let type in plugin.patchedModules[patchType]) {
						if (!patchedModules[type]) patchedModules[type] = {};
						patchedModules[type][patchType] = plugin.patchedModules[patchType][type];
					}
					for (let type in patchedModules) {
						let pluginData = {plugin: plugin, patchTypes: patchedModules[type]};
						let unmappedType = type.split(" _ _ ")[1] || type;
						
						let finderData = InternalData.ModuleUtilsConfig.Finder[unmappedType];
						let config = {
							classNames: [finderData && finderData.class].flat(10).filter(n => DiscordClasses[n]),
							lazyLoaded: finderData && finderData.lazyLoaded,
							stringFind: finderData && finderData.strings,
							propertyFind: finderData && finderData.props,
							prototypeFind: finderData && finderData.protos,
							specialFilter: finderData && finderData.special && Internal.createFilter(finderData.special),
							subComponent: finderData && finderData.subComponent,
							forceObserve: finderData && finderData.forceObserve,
							exported: finderData && finderData.exported || false,
							path: finderData && finderData.path,
							mapped: InternalData.ModuleUtilsConfig.PatchMap[type]
						};
						config.nonRender = config.specialFilter || hiddenchannelslib.ObjectUtils.toArray(pluginData.patchTypes).flat(10).filter(n => n && !InternalData.ModuleUtilsConfig.InstanceFunctions.includes(n)).length > 0;
						config.nonPrototype = !!(config.subComponent && config.subComponent.strings || config.stringFind || config.subComponent && config.subComponent.props || config.propertyFind || config.subComponent && config.subComponent.protos || config.prototypeFind || config.nonRender);
						
						config.mappedType = config.mapped ? config.mapped + " _ _ " + type : type;
						config.name = config.subComponent && config.subComponent.name || config.mappedType.split(" _ _ ")[0];
						
						let component = InternalData.ModuleUtilsConfig.LoadedInComponents[type] && hiddenchannelslib.ObjectUtils.get(Internal, InternalData.ModuleUtilsConfig.LoadedInComponents[type]);
						if (component) Internal.patchComponent(pluginData, config.nonRender ? (hiddenchannelslib.ModuleUtils.find(m => m == component && m, {useExport: config.exported}) || {}).exports : component, config);
						else {
							if (config.mapped) for (let patchType in plugin.patchedModules) if (plugin.patchedModules[patchType][type]) {
								plugin.patchedModules[patchType][config.mappedType] = plugin.patchedModules[patchType][type];
								delete plugin.patchedModules[patchType][type];
							}
							
							let patchSpecial = (func, argument) => {
								let module = hiddenchannelslib.ModuleUtils[func](argument, config.exported);
								let exports = module && !config.exported && module.exports || module;
								exports = config.path && hiddenchannelslib.ObjectUtils.get(exports, config.path) || exports;
								exports && Internal.patchComponent(pluginData, Internal.isMemoOrForwardRef(exports) ? exports.default : exports, config);
								return exports ? true : false;
							};
							let found = true;
							if (config.lazyLoaded) Internal.addChunkObserver(pluginData, config);
							else if (config.classNames.length) Internal.searchComponent(pluginData, config);
							else if (config.subComponent && config.subComponent.strings || config.stringFind) found = patchSpecial("findByString", config.subComponent && config.subComponent.strings || config.stringFind);
							else if (config.subComponent && config.subComponent.props || config.propertyFind) found = patchSpecial("findByProperties", config.subComponent && config.subComponent.props || config.propertyFind);
							else if (config.subComponent && config.subComponent.protos || config.prototypeFind) found = patchSpecial("findByPrototypes", config.subComponent && config.subComponent.protos || config.prototypeFind);
							else if (config.nonRender) found = patchSpecial("findByName", config.name);
							else {
								let module = hiddenchannelslib.ModuleUtils.findByName(config.name);
								if (module) Internal.patchComponent(pluginData, module, config);
								else found = false;
							}
							if (!found) Internal.addChunkObserver(pluginData, config);
						}
					}
				};
				Internal.patchComponent = function (pluginDataObjs, instance, config) {
					pluginDataObjs = [pluginDataObjs].flat(10).filter(n => n);
					if (pluginDataObjs.length && instance) {
						instance = instance[hiddenchannelslib.ReactUtils.instanceKey] && instance[hiddenchannelslib.ReactUtils.instanceKey].type ? instance[hiddenchannelslib.ReactUtils.instanceKey].type : instance;
						if (instance) {
							let toBePatched = config.nonPrototype || !instance.prototype ? instance : instance.prototype;
							toBePatched = toBePatched && toBePatched.type && typeof toBePatched.type.render == "function" ? toBePatched.type : toBePatched;
							if (config.subComponent) {
								for (let pluginData of pluginDataObjs) hiddenchannelslib.PatchUtils.patch(pluginData.plugin, toBePatched, config.subComponent.type || "default", {after: e => {
									for (let patchType in pluginData.patchTypes) hiddenchannelslib.PatchUtils.patch(pluginData.plugin, config.subComponent.children && e.returnValue.props && e.returnValue.props.children ? e.returnValue.props.children[0] || e.returnValue.props.children : e.returnValue , "type", {
										[patchType]: e2 => Internal.initiateProcess(pluginData.plugin, config.mappedType, {
											arguments: e2.methodArguments,
											instance: e2.thisObject,
											returnvalue: e2.returnValue,
											component: toBePatched,
											methodname: e.originalMethodName,
											patchtypes: [patchType]
										})
									}, {name, noCache: true});
								}}, {name: config.name});
							}
							else {
								for (let pluginData of pluginDataObjs) for (let patchType in pluginData.patchTypes) {
									hiddenchannelslib.PatchUtils.patch(pluginData.plugin, toBePatched, pluginData.patchTypes[patchType], {
										[patchType]: e => Internal.initiateProcess(pluginData.plugin, config.mappedType, {
											arguments: e.methodArguments,
											instance: e.thisObject,
											returnvalue: e.returnValue,
											component: toBePatched,
											methodname: e.originalMethodName,
											patchtypes: [patchType]
										})
									}, {name: config.name});
								}
							}
						}
					}
				};
				Internal.createFilter = function (config) {
					return ins => ins && config.every(prop => {
						let value = hiddenchannelslib.ObjectUtils.get(ins, prop.path);
						return value && (!prop.value || [prop.value].flat(10).filter(n => typeof n == "string").some(n => value.toUpperCase().indexOf(n.toUpperCase()) == 0));
					}) && ins.return.type;
				};
				Internal.isMemoOrForwardRef = function (exports) {
					return exports && exports.default && typeof exports.default.$$typeof == "symbol" && ((exports.default.$$typeof.toString() || "").indexOf("memo") > -1 || (exports.default.$$typeof.toString() || "").indexOf("forward_ref") > -1);
				};
				Internal.checkElementForComponent = function (pluginDataObjs, ele, config) {
					pluginDataObjs = [pluginDataObjs].flat(10).filter(n => n);
					let ins = hiddenchannelslib.ReactUtils.getInstance(ele);
					if (typeof config.specialFilter == "function") {
						let component = config.specialFilter(ins);
						if (component) {
							if (config.nonRender) {
								let exports = (hiddenchannelslib.ModuleUtils.find(m => m == component && m, {useExport: false}) || {}).exports;
								Internal.patchComponent(pluginDataObjs, Internal.isMemoOrForwardRef(exports) ? exports.default : exports, config);
							}
							else Internal.patchComponent(pluginDataObjs, component, config);
							hiddenchannelslib.PatchUtils.forceAllUpdates(pluginDataObjs.map(n => n.plugin), config.mappedType);
							return true;
						}
					}
					else {
						let unmappedType = config.mappedType.split(" _ _ ")[1] || config.mappedType;
						let constructor = hiddenchannelslib.ReactUtils.findConstructor(ins, unmappedType) || hiddenchannelslib.ReactUtils.findConstructor(ins, unmappedType, {up: true});
						if (constructor) {
							Internal.patchComponent(pluginDataObjs, constructor, config);
							hiddenchannelslib.PatchUtils.forceAllUpdates(pluginDataObjs.map(n => n.plugin), config.mappedType);
							return true;
						}
					}
					return false;
				};
				Internal.searchComponent = function (pluginData, config) {
					let instanceFound = false;
					if (!config.forceObserve) {
						const app = document.querySelector(hiddenchannelslib.dotCN.app);
						if (app) {
							let appIns = hiddenchannelslib.ReactUtils.findConstructor(app, config.mappedType, {unlimited: true}) || hiddenchannelslib.ReactUtils.findConstructor(app, config.mappedType, {unlimited: true, up: true});
							if (appIns && (instanceFound = true)) Internal.patchComponent(pluginData, appIns, config);
						}
					}
					if (!instanceFound) {
						let elementFound = false, classes = config.classNames.map(n => hiddenchannelslib.disCN[n]), selector = config.classNames.map(n => hiddenchannelslib.dotCN[n]).join(", ");
						for (let ele of document.querySelectorAll(selector)) {
							elementFound = Internal.checkElementForComponent(pluginData, ele, config);
							if (elementFound) break;
						}
						if (!elementFound) {
							if (!Internal.patchObserverData.observer) {
								let appMount = document.querySelector(hiddenchannelslib.dotCN.appmount);
								if (appMount) {
									Internal.patchObserverData.observer = new MutationObserver(cs => cs.forEach(c => c.addedNodes.forEach(n => {
										if (!n || !n.tagName) return;
										for (let type in Internal.patchObserverData.data) {
											if (!Internal.patchObserverData.data[type] || Internal.patchObserverData.data[type].found) return;
											for (let ele of [hiddenchannelslib.DOMUtils.containsClass(n, ...Internal.patchObserverData.data[type].classes) && n].concat([...n.querySelectorAll(Internal.patchObserverData.data[type].selector)]).filter(n => n)) {
												if (!Internal.patchObserverData.data[type] || Internal.patchObserverData.data[type].found) return;
												Internal.patchObserverData.data[type].found = Internal.checkElementForComponent(Internal.patchObserverData.data[type].plugins, ele, Internal.patchObserverData.data[type].config);
												if (Internal.patchObserverData.data[type].found) {
													delete Internal.patchObserverData.data[type];
													if (hiddenchannelslib.ObjectUtils.isEmpty(Internal.patchObserverData.data)) {
														Internal.patchObserverData.observer.disconnect();
														Internal.patchObserverData.observer = null;
													}
												}
											}
										}
									})));
									Internal.patchObserverData.observer.observe(appMount, {childList: true, subtree: true});
								}
							}
							if (!Internal.patchObserverData.data[config.mappedType]) Internal.patchObserverData.data[config.mappedType] = {selector, classes, found: false, config, plugins: []};
							Internal.patchObserverData.data[config.mappedType].plugins.push(pluginData);
						}
					}
				};
				
				hiddenchannelslib.PatchUtils = {};
				hiddenchannelslib.PatchUtils.isPatched = function (plugin, module, methodName) {
					plugin = plugin == hiddenchannelslib && Internal || plugin;
					if (!plugin || (!hiddenchannelslib.ObjectUtils.is(module) && !hiddenchannelslib.ArrayUtils.is(module)) || !module.hiddenchannelslib_patches || !methodName) return false;
					const pluginId = (typeof plugin === "string" ? plugin : plugin.name).toLowerCase();
					return pluginId && module[methodName] && module[methodName].__is_hiddenchannelslib_patched && module.hiddenchannelslib_patches[methodName] && hiddenchannelslib.ObjectUtils.toArray(module.hiddenchannelslib_patches[methodName]).some(patchObj => hiddenchannelslib.ObjectUtils.toArray(patchObj).some(priorityObj => Object.keys(priorityObj).includes(pluginId)));
				};
				hiddenchannelslib.PatchUtils.patch = function (plugin, module, methodNames, patchMethods, config = {}) {
					plugin = plugin == hiddenchannelslib && Internal || plugin;
					if (!plugin || (!hiddenchannelslib.ObjectUtils.is(module) && !hiddenchannelslib.ArrayUtils.is(module)) || !methodNames || !hiddenchannelslib.ObjectUtils.is(patchMethods)) return null;
					patchMethods = hiddenchannelslib.ObjectUtils.filter(patchMethods, type => InternalData.ModuleUtilsConfig.PatchTypes.includes(type), true);
					if (hiddenchannelslib.ObjectUtils.isEmpty(patchMethods)) return null;
					const pluginName = (typeof plugin === "string" ? plugin : plugin.name) || "";
					const pluginVersion = typeof plugin === "string" ? "" : plugin.version;
					const pluginId = pluginName.toLowerCase();
					let patchPriority = !isNaN(config.priority) ? config.priority : (hiddenchannelslib.ObjectUtils.is(plugin) && !isNaN(plugin.patchPriority) ? plugin.patchPriority : 5);
					patchPriority = patchPriority < 1 ? (plugin == Internal ? 0 : 1) : (patchPriority > 9 ? (plugin == Internal ? 10 : 9) : Math.round(patchPriority));
					if (!hiddenchannelslib.ObjectUtils.is(module.hiddenchannelslib_patches)) module.hiddenchannelslib_patches = {};
					methodNames = [methodNames].flat(10).filter(n => n);
					let cancel = _ => {hiddenchannelslib.PatchUtils.unpatch(plugin, module, methodNames);};
					for (let methodName of methodNames) if (module[methodName] == null || typeof module[methodName] == "function") {
						if (!module.hiddenchannelslib_patches[methodName] || config.force && (!module[methodName] || !module[methodName].__is_hiddenchannelslib_patched)) {
							if (!module.hiddenchannelslib_patches[methodName]) {
								module.hiddenchannelslib_patches[methodName] = {};
								for (let type of InternalData.ModuleUtilsConfig.PatchTypes) module.hiddenchannelslib_patches[methodName][type] = {};
							}
							if (!module[methodName]) module[methodName] = (_ => {});
							const name = config.name || (module.constructor ? (module.constructor.displayName || module.constructor.name) : "module");
							const originalMethod = module[methodName];
							module.hiddenchannelslib_patches[methodName].originalMethod = originalMethod;
							module[methodName] = function () {
								let callInstead = false, stopCall = false;
								const data = {
									thisObject: this && this !== window ? this : {props: arguments[0]},
									methodArguments: arguments,
									originalMethod: originalMethod,
									originalMethodName: methodName,
									callOriginalMethod: _ => data.returnValue = data.originalMethod.apply(data.thisObject, data.methodArguments),
									callOriginalMethodAfterwards: _ => (callInstead = true, data.returnValue),
									stopOriginalMethodCall: _ => stopCall = true
								};
								if (module.hiddenchannelslib_patches && module.hiddenchannelslib_patches[methodName]) {
									for (let priority in module.hiddenchannelslib_patches[methodName].before) for (let id in hiddenchannelslib.ObjectUtils.sort(module.hiddenchannelslib_patches[methodName].before[priority])) {
										hiddenchannelslib.TimeUtils.suppress(module.hiddenchannelslib_patches[methodName].before[priority][id], `"before" callback of ${methodName} in ${name}`, {name: module.hiddenchannelslib_patches[methodName].before[priority][id].pluginName, version: module.hiddenchannelslib_patches[methodName].before[priority][id].pluginVersion})(data);
									}
									
									if (!module.hiddenchannelslib_patches || !module.hiddenchannelslib_patches[methodName]) return (methodName == "render" || methodName == "default") && data.returnValue === undefined ? null : data.returnValue;
									let hasInsteadPatches = hiddenchannelslib.ObjectUtils.toArray(module.hiddenchannelslib_patches[methodName].instead).some(priorityObj => !hiddenchannelslib.ObjectUtils.isEmpty(priorityObj));
									if (hasInsteadPatches) for (let priority in module.hiddenchannelslib_patches[methodName].instead) for (let id in hiddenchannelslib.ObjectUtils.sort(module.hiddenchannelslib_patches[methodName].instead[priority])) if (module.hiddenchannelslib_patches) {
										let tempReturn = hiddenchannelslib.TimeUtils.suppress(module.hiddenchannelslib_patches[methodName].instead[priority][id], `"instead" callback of ${methodName} in ${name}`, {name: module.hiddenchannelslib_patches[methodName].instead[priority][id].pluginName, version: module.hiddenchannelslib_patches[methodName].instead[priority][id].pluginVersion})(data);
										if (tempReturn !== undefined) data.returnValue = tempReturn;
									}
									if ((!hasInsteadPatches || callInstead) && !stopCall) hiddenchannelslib.TimeUtils.suppress(data.callOriginalMethod, `originalMethod of ${methodName} in ${name}`, {name: "Discord"})();
									
									if (!module.hiddenchannelslib_patches || !module.hiddenchannelslib_patches[methodName]) return methodName == "render" && data.returnValue === undefined ? null : data.returnValue;
									for (let priority in module.hiddenchannelslib_patches[methodName].after) for (let id in hiddenchannelslib.ObjectUtils.sort(module.hiddenchannelslib_patches[methodName].after[priority])) if (module.hiddenchannelslib_patches) {
										let tempReturn = hiddenchannelslib.TimeUtils.suppress(module.hiddenchannelslib_patches[methodName].after[priority][id], `"after" callback of ${methodName} in ${name}`, {name: module.hiddenchannelslib_patches[methodName].after[priority][id].pluginName, version: module.hiddenchannelslib_patches[methodName].after[priority][id].pluginVersion})(data);
										if (tempReturn !== undefined) data.returnValue = tempReturn;
									}
								}
								else hiddenchannelslib.TimeUtils.suppress(data.callOriginalMethod, `originalMethod of ${methodName} in ${name}`)();
								callInstead = false, stopCall = false;
								return (methodName == "render" || methodName == "default") && data.returnValue === undefined ? null : data.returnValue;
							};
							for (let key of Object.keys(originalMethod)) module[methodName][key] = originalMethod[key];
							if (!module[methodName].__originalFunction) {
								let realOriginalMethod = originalMethod.__originalMethod || originalMethod.__originalFunction || originalMethod;
								if (typeof realOriginalMethod == "function") {
									module[methodName].__originalFunction = realOriginalMethod;
									module[methodName].toString = _ => realOriginalMethod.toString();
								}
							}
							module[methodName].__is_hiddenchannelslib_patched = true;
						}
						for (let type in patchMethods) if (typeof patchMethods[type] == "function") {
							if (!hiddenchannelslib.ObjectUtils.is(module.hiddenchannelslib_patches[methodName][type][patchPriority])) module.hiddenchannelslib_patches[methodName][type][patchPriority] = {};
							module.hiddenchannelslib_patches[methodName][type][patchPriority][pluginId] = (...args) => {
								if (config.once || !plugin.started) cancel();
								return patchMethods[type](...args);
							};
							module.hiddenchannelslib_patches[methodName][type][patchPriority][pluginId].pluginName = pluginName;
							module.hiddenchannelslib_patches[methodName][type][patchPriority][pluginId].pluginVersion = pluginVersion;
						}
					}
					if (hiddenchannelslib.ObjectUtils.is(plugin) && !config.once && !config.noCache) {
						if (!hiddenchannelslib.ArrayUtils.is(plugin.patchCancels)) plugin.patchCancels = [];
						plugin.patchCancels.push(cancel);
					}
					return cancel;
				};
				hiddenchannelslib.PatchUtils.unpatch = function (plugin, module, methodNames) {
					plugin = plugin == hiddenchannelslib && Internal || plugin;
					if (!module && !methodNames) {
						if (hiddenchannelslib.ObjectUtils.is(plugin) && hiddenchannelslib.ArrayUtils.is(plugin.patchCancels)) while (plugin.patchCancels.length) (plugin.patchCancels.pop())();
					}
					else {
						if ((!hiddenchannelslib.ObjectUtils.is(module) && !hiddenchannelslib.ArrayUtils.is(module)) || !module.hiddenchannelslib_patches) return;
						const pluginId = !plugin ? null : (typeof plugin === "string" ? plugin : plugin.name).toLowerCase();
						if (methodNames) {
							for (let methodName of [methodNames].flat(10).filter(n => n)) if (module[methodName] && module.hiddenchannelslib_patches[methodName]) unpatch(methodName, pluginId);
						}
						else for (let patchedMethod of module.hiddenchannelslib_patches) unpatch(patchedMethod, pluginId);
					}
					function unpatch (funcName, pluginId) {
						for (let type of InternalData.ModuleUtilsConfig.PatchTypes) {
							if (pluginId) for (let priority in module.hiddenchannelslib_patches[funcName][type]) {
								delete module.hiddenchannelslib_patches[funcName][type][priority][pluginId];
								if (hiddenchannelslib.ObjectUtils.isEmpty(module.hiddenchannelslib_patches[funcName][type][priority])) delete module.hiddenchannelslib_patches[funcName][type][priority];
							}
							else delete module.hiddenchannelslib_patches[funcName][type];
						}
						if (hiddenchannelslib.ObjectUtils.isEmpty(hiddenchannelslib.ObjectUtils.filter(module.hiddenchannelslib_patches[funcName], key => InternalData.ModuleUtilsConfig.PatchTypes.includes(key) && !hiddenchannelslib.ObjectUtils.isEmpty(module.hiddenchannelslib_patches[funcName][key]), true))) {
							module[funcName] = module.hiddenchannelslib_patches[funcName].originalMethod;
							delete module.hiddenchannelslib_patches[funcName];
							if (hiddenchannelslib.ObjectUtils.isEmpty(module.hiddenchannelslib_patches)) delete module.hiddenchannelslib_patches;
						}
					}
				};
				hiddenchannelslib.PatchUtils.forceAllUpdates = function (plugins, selectedTypes) {
					plugins = [plugins].flat(10).map(n => n == hiddenchannelslib && Internal || n).filter(n => hiddenchannelslib.ObjectUtils.is(n.patchedModules));
					if (plugins.length) {
						const app = document.querySelector(hiddenchannelslib.dotCN.app);
						const bdSettings = document.querySelector("#bd-settingspane-container > *");
						if (app) {
							selectedTypes = [selectedTypes].flat(10).filter(n => n).map(type => type && InternalData.ModuleUtilsConfig.PatchMap[type] ? InternalData.ModuleUtilsConfig.PatchMap[type] + " _ _ " + type : type);
							let updateData = {};
							for (let plugin of plugins) {
								updateData[plugin.name] = {
									filteredModules: [],
									specialModules: [],
									specialModuleTypes: [],
									patchTypes: {}
								};
								for (let patchType in plugin.patchedModules) for (let type in plugin.patchedModules[patchType]) {
									let methodNames = [plugin.patchedModules[patchType][type]].flat(10).filter(n => n);
									if (hiddenchannelslib.ArrayUtils.includes(methodNames, "componentDidMount", "componentDidUpdate", "render", false) && (!selectedTypes.length || selectedTypes.includes(type))) {
										let unmappedType = type.split(" _ _ ")[1] || type;
										let selector = [InternalData.ModuleUtilsConfig.Finder[unmappedType]].flat(10).filter(n => DiscordClasses[n]).map(n => hiddenchannelslib.dotCN[n]).join(", ");
										let specialFilter = InternalData.ModuleUtilsConfig.Finder[unmappedType] && InternalData.ModuleUtilsConfig.Finder[unmappedType].special && Internal.createFilter(InternalData.ModuleUtilsConfig.Finder[unmappedType].special);
										if (selector && typeof specialFilter == "function") {
											for (let ele of document.querySelectorAll(selector)) {
												let constro = specialFilter(hiddenchannelslib.ReactUtils.getInstance(ele));
												if (constro) {
													updateData[plugin.name].specialModules.push([type, constro]);
													updateData[plugin.name].specialModuleTypes.push(type);
													break;
												}
											}
										}
										else updateData[plugin.name].filteredModules.push(type);
										let name = type.split(" _ _ ")[0];
										if (!updateData[plugin.name].patchTypes[name]) updateData[plugin.name].patchTypes[name] = [];
										updateData[plugin.name].patchTypes[name].push(patchType);
									}
								}
							}
							let updateDataArray = hiddenchannelslib.ObjectUtils.toArray(updateData);
							if (hiddenchannelslib.ArrayUtils.sum(updateDataArray.map(n => n.filteredModules.length + n.specialModules.length))) {
								try {
									let filteredModules = hiddenchannelslib.ArrayUtils.removeCopies(updateDataArray.map(n => n.filteredModules).flat(10));
									let specialModules = hiddenchannelslib.ArrayUtils.removeCopies(updateDataArray.map(n => n.specialModules).flat(10));
									const appInsDown = hiddenchannelslib.ReactUtils.findOwner(app, {name: filteredModules, type: specialModules, all: true, unlimited: true, group: true});
									const appInsUp = hiddenchannelslib.ReactUtils.findOwner(app, {name: filteredModules, type: specialModules, all: true, unlimited: true, group: true, up: true});
									for (let type in appInsDown) {
										let filteredPlugins = plugins.filter(n => updateData[n.name].filteredModules.includes(type) || updateData[n.name].specialModuleTypes.includes(type)).map(n => ({plugin: n, patchTypes: updateData[n.name].patchTypes}));
										for (let ins of appInsDown[type]) Internal.forceInitiateProcess(filteredPlugins, ins, type);
									}
									for (let type in appInsUp) {
										let filteredPlugins = plugins.filter(n => updateData[n.name].filteredModules.includes(type) || updateData[n.name].specialModuleTypes.includes(type)).map(n => ({plugin: n, patchTypes: updateData[n.name].patchTypes}));
										for (let ins of appInsUp[type]) Internal.forceInitiateProcess(filteredPlugins, ins, type);
									}
									if (bdSettings) {
										const bdSettingsIns = hiddenchannelslib.ReactUtils.findOwner(bdSettings, {name: filteredModules, type: specialModules, all: true, unlimited: true});
										if (bdSettingsIns.length) {
											const bdSettingsWrap = hiddenchannelslib.ReactUtils.findOwner(hiddenchannelslib.ReactUtils.getInstance(document.querySelector("#bd-settingspane-container > *")), {props: "onChange", up: true});
											if (bdSettingsWrap && bdSettingsWrap.props && typeof bdSettingsWrap.props.onChange == "function") bdSettingsWrap.props.onChange(bdSettingsWrap.props.type);
										}
									}
								}
								catch (err) {for (let plugin of plugins) hiddenchannelslib.LogUtils.error(["Could not force update Components!", err], plugin);}
							}
						}
					}
				};

				hiddenchannelslib.DiscordConstants = hiddenchannelslib.ModuleUtils.findByProperties("Permissions", "ActivityTypes");
				
				DiscordObjects = {};
				Internal.DiscordObjects = new Proxy(DiscordObjects, {
					get: function (_, item) {
						if (DiscordObjects[item]) return DiscordObjects[item];
						if (!InternalData.DiscordObjects[item]) return (function () {});
						if (InternalData.DiscordObjects[item].props) DiscordObjects[item] = hiddenchannelslib.ModuleUtils.findByPrototypes(InternalData.DiscordObjects[item].props);
						else if (InternalData.DiscordObjects[item].strings) DiscordObjects[item] = hiddenchannelslib.ModuleUtils.findByString(InternalData.DiscordObjects[item].strings);
						if (InternalData.DiscordObjects[item].value) DiscordObjects[item] = (DiscordObjects[item] || {})[InternalData.DiscordObjects[item].value];
						return DiscordObjects[item] ? DiscordObjects[item] : (function () {});
					}
				});
				hiddenchannelslib.DiscordObjects = Internal.DiscordObjects;
				
				LibraryRequires = {};
				Internal.LibraryRequires = new Proxy(LibraryRequires, {
					get: function (_, item) {
						if (LibraryRequires[item]) return LibraryRequires[item];
						if (InternalData.LibraryRequires.indexOf(item) == -1) return (function () {});
						try {LibraryRequires[item] = require(item);}
						catch (err) {}
						return LibraryRequires[item] ? LibraryRequires[item] : (function () {});
					}
				});
				hiddenchannelslib.LibraryRequires = Internal.LibraryRequires;
				
				LibraryModules = {};
				LibraryModules.LanguageStore = hiddenchannelslib.ModuleUtils.find(m => m.Messages && m.Messages.IMAGE && m);
				LibraryModules.React = hiddenchannelslib.ModuleUtils.findByProperties("createElement", "cloneElement");
				LibraryModules.ReactDOM = hiddenchannelslib.ModuleUtils.findByProperties("render", "findDOMNode");
				Internal.LibraryModules = new Proxy(LibraryModules, {
					get: function (_, item) {
						if (LibraryModules[item]) return LibraryModules[item];
						if (!InternalData.LibraryModules[item]) return null;
						if (InternalData.LibraryModules[item].props) {
							if (InternalData.LibraryModules[item].nonProps) {
								LibraryModules[item] = hiddenchannelslib.ModuleUtils.find(m => InternalData.LibraryModules[item].props.every(prop => {
									const value = m[prop];
									return value !== undefined && !(typeof value == "string" && !value);
								}) && InternalData.LibraryModules[item].nonProps.every(prop => m[prop] === undefined) && m);
								if (!LibraryModules[item]) hiddenchannelslib.LogUtils.warn(`${JSON.stringify([InternalData.LibraryModules[item].props, InternalData.LibraryModules[item].nonProps].flat(10))} [props + nonProps] not found in WebModules`);
							}
							else LibraryModules[item] = hiddenchannelslib.ModuleUtils.findByProperties(InternalData.LibraryModules[item].props);
						}
						else if (InternalData.LibraryModules[item].name) LibraryModules[item] = hiddenchannelslib.ModuleUtils.findByName(InternalData.LibraryModules[item].name);
						else if (InternalData.LibraryModules[item].strings) LibraryModules[item] = hiddenchannelslib.ModuleUtils.findByString(InternalData.LibraryModules[item].strings);
						if (InternalData.LibraryModules[item].value) LibraryModules[item] = (LibraryModules[item] || {})[InternalData.LibraryModules[item].value];
						return LibraryModules[item] ? LibraryModules[item] : null;
					}
				});
				
				hiddenchannelslib.LibraryModules = Internal.LibraryModules;
				
				if (Internal.LibraryModules.KeyCodeUtils) Internal.LibraryModules.KeyCodeUtils.getString = function (keyArray) {
					return Internal.LibraryModules.KeyCodeUtils.toString([keyArray].flat(10).filter(n => n).map(keyCode => [hiddenchannelslib.DiscordConstants.KeyboardDeviceTypes.KEYBOARD_KEY, Internal.LibraryModules.KeyCodeUtils.keyToCode((Object.entries(Internal.LibraryModules.KeyEvents.codes).find(n => n[1] == keyCode && Internal.LibraryModules.KeyCodeUtils.keyToCode(n[0], null)) || [])[0], null) || keyCode]), true);
				};
				
				hiddenchannelslib.ReactUtils = Object.assign({}, Internal.LibraryModules.React, Internal.LibraryModules.ReactDOM);
				hiddenchannelslib.ReactUtils.childrenToArray = function (parent) {
					if (parent && parent.props && parent.props.children && !hiddenchannelslib.ArrayUtils.is(parent.props.children)) {
						const child = parent.props.children;
						parent.props.children = [];
						parent.props.children.push(child);
					}
					return parent.props.children;
				}
				hiddenchannelslib.ReactUtils.createElement = function (component, props = {}, errorWrap = false) {
					if (component && component.defaultProps) for (let key in component.defaultProps) if (props[key] == null) props[key] = component.defaultProps[key];
					try {
						let child = Internal.LibraryModules.React.createElement(component || "div", props) || null;
						if (errorWrap) return Internal.LibraryModules.React.createElement(Internal.ErrorBoundary, {key: child && child.key || ""}, child) || null;
						else return child;
					}
					catch (err) {hiddenchannelslib.LogUtils.error(["Could not create React Element!", err]);}
					return null;
				};
				hiddenchannelslib.ReactUtils.objectToReact = function (obj) {
					if (!obj) return null;
					else if (typeof obj == "string") return obj;
					else if (hiddenchannelslib.ObjectUtils.is(obj)) return hiddenchannelslib.ReactUtils.createElement(obj.type || obj.props && obj.props.href && "a" || "div", !obj.props ?  {} : Object.assign({}, obj.props, {
						children: obj.props.children ? hiddenchannelslib.ReactUtils.objectToReact(obj.props.children) : null
					}));
					else if (hiddenchannelslib.ArrayUtils.is(obj)) return obj.map(n => hiddenchannelslib.ReactUtils.objectToReact(n));
					else return null;
				};
				hiddenchannelslib.ReactUtils.markdownParse = function (str) {
					if (!hiddenchannelslib.ReactUtils.markdownParse.parser || !hiddenchannelslib.ReactUtils.markdownParse.render) {
						hiddenchannelslib.ReactUtils.markdownParse.parser = Internal.LibraryModules.SimpleMarkdownParser.parserFor(Internal.LibraryModules.SimpleMarkdownParser.defaultRules);
						hiddenchannelslib.ReactUtils.markdownParse.render = Internal.LibraryModules.SimpleMarkdownParser.reactFor(Internal.LibraryModules.SimpleMarkdownParser.ruleOutput(Internal.LibraryModules.SimpleMarkdownParser.defaultRules, "react"));
					}
					return hiddenchannelslib.ReactUtils.markdownParse.render(hiddenchannelslib.ReactUtils.markdownParse.parser(str, {inline: true}));
				};
				hiddenchannelslib.ReactUtils.elementToReact = function (node, ref) {
					if (hiddenchannelslib.ReactUtils.isValidElement(node)) return node;
					else if (!Node.prototype.isPrototypeOf(node)) return null;
					else if (node.nodeType == Node.TEXT_NODE) return node.nodeValue;
					let attributes = {}, importantStyles = [];
					if (typeof ref == "function") attributes.ref = ref;
					if (node.attributes) {
						for (let attr of node.attributes) attributes[attr.name] = attr.value;
						if (node.attributes.style) attributes.style = hiddenchannelslib.ObjectUtils.filter(node.style, n => node.style[n] && isNaN(parseInt(n)), true);
					}
					attributes.children = [];
					if (node.style && node.style.cssText) for (let propStr of node.style.cssText.split(";")) if (propStr.endsWith("!important")) {
						let key = propStr.split(":")[0];
						let camelprop = key.replace(/-([a-z]?)/g, (m, g) => g.toUpperCase());
						if (attributes.style[camelprop] != null) importantStyles.push(key);
					}
					for (let child of node.childNodes) attributes.children.push(hiddenchannelslib.ReactUtils.elementToReact(child));
					attributes.className = hiddenchannelslib.DOMUtils.formatClassName(attributes.className, attributes.class);
					delete attributes.class;
					return hiddenchannelslib.ReactUtils.forceStyle(hiddenchannelslib.ReactUtils.createElement(node.tagName, attributes), importantStyles);
				};
				hiddenchannelslib.ReactUtils.forceStyle = function (reactEle, styles) {
					if (!hiddenchannelslib.ReactUtils.isValidElement(reactEle)) return null;
					if (!hiddenchannelslib.ObjectUtils.is(reactEle.props.style) || !hiddenchannelslib.ArrayUtils.is(styles) || !styles.length) return reactEle;
					let ref = reactEle.ref;
					reactEle.ref = instance => {
						if (typeof ref == "function") ref(instance);
						let node = hiddenchannelslib.ReactUtils.findDOMNode(instance);
						if (Node.prototype.isPrototypeOf(node)) for (let key of styles) {
							let propValue = reactEle.props.style[key.replace(/-([a-z]?)/g, (m, g) => g.toUpperCase())];
							if (propValue != null) node.style.setProperty(key, propValue, "important");
						}
					};
					return reactEle;
				};
				hiddenchannelslib.ReactUtils.findChild = function (nodeOrInstance, config) {
					if (!nodeOrInstance || !hiddenchannelslib.ObjectUtils.is(config) || !config.name && !config.key && !config.props && !config.filter) return config.all ? [] : null;
					let instance = Node.prototype.isPrototypeOf(nodeOrInstance) ? hiddenchannelslib.ReactUtils.getInstance(nodeOrInstance) : nodeOrInstance;
					if (!hiddenchannelslib.ObjectUtils.is(instance) && !hiddenchannelslib.ArrayUtils.is(instance)) return null;
					config.name = config.name && [config.name].flat().filter(n => n);
					config.key = config.key && [config.key].flat().filter(n => n);
					config.props = config.props && [config.props].flat().filter(n => n);
					config.filter = typeof config.filter == "function" && config.filter;
					let depth = -1;
					let start = performance.now();
					let maxDepth = config.unlimited ? 999999999 : (config.depth === undefined ? 30 : config.depth);
					let maxTime = config.unlimited ? 999999999 : (config.time === undefined ? 150 : config.time);
					
					let foundChildren = [];
					let singleChild = getChild(instance);
					if (config.all) {
						for (let i in foundChildren) delete foundChildren[i].hiddenchannelslibreactSearch;
						return foundChildren;
					}
					else return singleChild;
					
					function getChild (children) {
						let result = null;
						if (!children || depth >= maxDepth || performance.now() - start >= maxTime) return result;
						if (!hiddenchannelslib.ArrayUtils.is(children)) {
							if (check(children)) {
								if (config.all === undefined || !config.all) result = children;
								else if (config.all) {
									if (!children.hiddenchannelslibreactSearch) {
										children.hiddenchannelslibreactSearch = true;
										foundChildren.push(children);
									}
								}
							}
							else {
								if (children.props && children.props.children) {
									depth++;
									result = getChild(children.props.children);
									depth--;
								}
								if (!result && children.props && children.props.child) {
									depth++;
									result = getChild(children.props.child);
									depth--;
								}
							}
						}
						else {
							for (let child of children) if (child) {
								if (hiddenchannelslib.ArrayUtils.is(child)) result = getChild(child);
								else if (check(child)) {
									if (config.all === undefined || !config.all) result = child;
									else if (config.all) {
										if (!child.hiddenchannelslibreactSearch) {
											child.hiddenchannelslibreactSearch = true;
											foundChildren.push(child);
										}
									}
								}
								else {
									if (child.props && child.props.children) {
										depth++;
										result = getChild(child.props.children);
										depth--;
									}
									if (!result && child.props && child.props.child) {
										depth++;
										result = getChild(child.props.child);
										depth--;
									}
								}
								if (result) break;
							}
						}
						return result;
					}
					function check (instance) {
						if (!instance) return false;
						let props = instance.stateNode ? instance.stateNode.props : instance.props;
						return instance.type && config.name && config.name.some(name => hiddenchannelslib.ReactUtils.isCorrectInstance(instance, name)) || config.key && config.key.some(key => instance.key == key) || props && config.props && config.props[config.someProps ? "some" : "every"](prop => hiddenchannelslib.ArrayUtils.is(prop) ? (hiddenchannelslib.ArrayUtils.is(prop[1]) ? prop[1].some(checkValue => propCheck(props, prop[0], checkValue)) : propCheck(props, prop[0], prop[1])) : props[prop] !== undefined) || config.filter && config.filter(instance);
					}
					function propCheck (props, key, value) {
						return key != null && props[key] != null && value != null && (key == "className" ? (" " + props[key] + " ").indexOf(" " + value + " ") > -1 : hiddenchannelslib.equals(props[key], value));
					}
				};
				hiddenchannelslib.ReactUtils.setChild = function (parent, stringOrChild) {
					if (!hiddenchannelslib.ReactUtils.isValidElement(parent) || (!hiddenchannelslib.ReactUtils.isValidElement(stringOrChild) && typeof stringOrChild != "string" && !hiddenchannelslib.ArrayUtils.is(stringOrChild))) return;
					let set = false;
					checkParent(parent);
					function checkParent(child) {
						if (set) return;
						if (!hiddenchannelslib.ArrayUtils.is(child)) checkChild(child);
						else for (let subChild of child) checkChild(subChild);
					}
					function checkChild(child) {
						if (!hiddenchannelslib.ReactUtils.isValidElement(child)) return;
						if (hiddenchannelslib.ReactUtils.isValidElement(child.props.children)) checkParent(child.props.children);
						else if (hiddenchannelslib.ArrayUtils.is(child.props.children)) {
							if (child.props.children.every(c => !c || typeof c == "string")) {
								set = true;
								child.props.children = [stringOrChild].flat(10);
							}
							else checkParent(child.props.children);
						}
						else {
							set = true;
							child.props.children = stringOrChild;
						}
					}
				};
				hiddenchannelslib.ReactUtils.findConstructor = function (nodeOrInstance, types, config = {}) {
					if (!hiddenchannelslib.ObjectUtils.is(config)) return null;
					if (!nodeOrInstance || !types) return config.all ? (config.group ? {} : []) : null;
					let instance = Node.prototype.isPrototypeOf(nodeOrInstance) ? hiddenchannelslib.ReactUtils.getInstance(nodeOrInstance) : nodeOrInstance;
					if (!hiddenchannelslib.ObjectUtils.is(instance)) return config.all ? (config.group ? {} : []) : null;
					types = types && [types].flat(10).filter(n => typeof n == "string");
					if (!types.length) return config.all ? (config.group ? {} : []) : null;;
					let depth = -1;
					let start = performance.now();
					let maxDepth = config.unlimited ? 999999999 : (config.depth === undefined ? 30 : config.depth);
					let maxTime = config.unlimited ? 999999999 : (config.time === undefined ? 150 : config.time);
					let whitelist = config.up ? {
						return: true,
						sibling: true,
						default: true
					} : {
						child: true,
						sibling: true,
						default: true
					};
					whitelist[hiddenchannelslib.ReactUtils.instanceKey] = true;
					
					let foundConstructors = config.group ? {} : [];
					let singleConstructor = getConstructor(instance);
					if (config.all) {
						for (let i in foundConstructors) {
							if (config.group) for (let j in foundConstructors[i]) delete foundConstructors[i][j].hiddenchannelslibreactSearch;
							else delete foundConstructors[i].hiddenchannelslibreactSearch;
						}
						return foundConstructors;
					}
					else return singleConstructor;

					function getConstructor (instance) {
						depth++;
						let result = undefined;
						if (instance && !Node.prototype.isPrototypeOf(instance) && !hiddenchannelslib.ReactUtils.getInstance(instance) && depth < maxDepth && performance.now() - start < maxTime) {
							if (instance.type && types.some(name => hiddenchannelslib.ReactUtils.isCorrectInstance(instance, name.split(" _ _ ")[0]))) {
								if (config.all === undefined || !config.all) result = instance.type;
								else if (config.all) {
									if (!instance.type.hiddenchannelslibreactSearch) {
										instance.type.hiddenchannelslibreactSearch = true;
										if (config.group) {
											if (instance.type && (instance.type.render && instance.type.render.displayName || instance.type.displayName || instance.type.name)) {
												let group = config.name.find(name => (instance.type.render && instance.type.render.displayName || instance.type.displayName || instance.type.name || instance.type) == name.split(" _ _ ")[0]) || "Default";
												if (!hiddenchannelslib.ArrayUtils.is(foundConstructors[group])) foundConstructors[group] = [];
												foundConstructors[group].push(instance.stateNode);
											}
										}
										else foundConstructors.push(instance.type);
									}
								}
							}
							if (result === undefined) {
								let keys = Object.getOwnPropertyNames(instance);
								for (let i = 0; result === undefined && i < keys.length; i++) {
									let key = keys[i];
									if (key && whitelist[key] && (typeof instance[key] === "object" || typeof instance[key] == "function")) result = getConstructor(instance[key]);
								}
							}
						}
						depth--;
						return result;
					}
				};
				hiddenchannelslib.ReactUtils.findDOMNode = function (instance) {
					if (Node.prototype.isPrototypeOf(instance)) return instance;
					if (!instance || !instance.updater || typeof instance.updater.isMounted !== "function" || !instance.updater.isMounted(instance)) return null;
					let node = Internal.LibraryModules.ReactDOM.findDOMNode(instance) || hiddenchannelslib.ObjectUtils.get(instance, "child.stateNode");
					return Node.prototype.isPrototypeOf(node) ? node : null;
				};
				hiddenchannelslib.ReactUtils.findOwner = function (nodeOrInstance, config) {
					if (!hiddenchannelslib.ObjectUtils.is(config)) return null;
					if (!nodeOrInstance || !config.name && !config.type && !config.key && !config.props && !config.filter) return config.all ? (config.group ? {} : []) : null;
					let instance = Node.prototype.isPrototypeOf(nodeOrInstance) ? hiddenchannelslib.ReactUtils.getInstance(nodeOrInstance) : nodeOrInstance;
					if (!hiddenchannelslib.ObjectUtils.is(instance)) return config.all ? (config.group ? {} : []) : null;
					config.name = config.name && [config.name].flat().filter(n => n);
					config.type = config.type && [config.type].flat().filter(n => n);
					config.key = config.key && [config.key].flat().filter(n => n);
					config.props = config.props && [config.props].flat().filter(n => n);
					config.filter = typeof config.filter == "function" && config.filter;
					let depth = -1;
					let start = performance.now();
					let maxDepth = config.unlimited ? 999999999 : (config.depth === undefined ? 30 : config.depth);
					let maxTime = config.unlimited ? 999999999 : (config.time === undefined ? 150 : config.time);
					let whitelist = config.up ? {
						return: true,
						sibling: true,
						default: true
					} : {
						child: true,
						sibling: true,
						default: true
					};
					whitelist[hiddenchannelslib.ReactUtils.instanceKey] = true;
					
					let foundInstances = config.group ? {} : [];
					let singleInstance = getOwner(instance);
					if (config.all) {
						for (let i in foundInstances) {
							if (config.group) for (let j in foundInstances[i]) delete foundInstances[i][j].hiddenchannelslibreactSearch;
							else delete foundInstances[i].hiddenchannelslibreactSearch;
						}
						return foundInstances;
					}
					else return singleInstance;

					function getOwner (instance) {
						depth++;
						let result = undefined;
						if (instance && !Node.prototype.isPrototypeOf(instance) && !hiddenchannelslib.ReactUtils.getInstance(instance) && depth < maxDepth && performance.now() - start < maxTime) {
							let props = instance.stateNode ? instance.stateNode.props : instance.props;
							if (instance.stateNode && !Node.prototype.isPrototypeOf(instance.stateNode) && (instance.type && config.name && config.name.some(name => hiddenchannelslib.ReactUtils.isCorrectInstance(instance, name.split(" _ _ ")[0])) || instance.type && config.type && config.type.some(type => hiddenchannelslib.ArrayUtils.is(type) ? instance.type === type[1] : instance.type === type) || instance.key && config.key && config.key.some(key => instance.key == key) || props && config.props && config.props.every(prop => hiddenchannelslib.ArrayUtils.is(prop) ? (hiddenchannelslib.ArrayUtils.is(prop[1]) ? prop[1].some(checkValue => hiddenchannelslib.equals(props[prop[0]], checkValue)) : hiddenchannelslib.equals(props[prop[0]], prop[1])) : props[prop] !== undefined)) || config.filter && config.filter(instance)) {
								if (config.all === undefined || !config.all) result = instance.stateNode;
								else if (config.all) {
									if (!instance.stateNode.hiddenchannelslibreactSearch) {
										instance.stateNode.hiddenchannelslibreactSearch = true;
										if (config.group) {
											if (config.name && instance.type && (instance.type.render && instance.type.render.displayName || instance.type.displayName || instance.type.name || instance.type)) {
												let group = config.name.find(name => (instance.type.render && instance.type.render.displayName || instance.type.displayName || instance.type.name || instance.type) == name.split(" _ _ ")[0]) || "Default";
												if (!hiddenchannelslib.ArrayUtils.is(foundInstances[group])) foundInstances[group] = [];
												foundInstances[group].push(instance.stateNode);
											}
											else if (config.type && instance.type) {
												let group = [config.type.find(t => hiddenchannelslib.ArrayUtils.is(t) && instance.type === t[1])].flat(10)[0] || "Default";
												if (!hiddenchannelslib.ArrayUtils.is(foundInstances[group])) foundInstances[group] = [];
												foundInstances[group].push(instance.stateNode);
											}
										}
										else foundInstances.push(instance.stateNode);
									}
								}
							}
							if (result === undefined) {
								let keys = Object.getOwnPropertyNames(instance);
								for (let i = 0; result === undefined && i < keys.length; i++) {
									let key = keys[i];
									if (key && whitelist[key] && (typeof instance[key] === "object" || typeof instance[key] == "function")) result = getOwner(instance[key]);
								}
							}
						}
						depth--;
						return result;
					}
				};
				hiddenchannelslib.ReactUtils.findParent = function (nodeOrInstance, config) {
					if (!nodeOrInstance || !hiddenchannelslib.ObjectUtils.is(config) || !config.name && !config.key && !config.props && !config.filter) return [null, -1];
					let instance = Node.prototype.isPrototypeOf(nodeOrInstance) ? hiddenchannelslib.ReactUtils.getInstance(nodeOrInstance) : nodeOrInstance;
					if (!hiddenchannelslib.ObjectUtils.is(instance) && !hiddenchannelslib.ArrayUtils.is(instance) || instance.props && typeof instance.props.children == "function") return [null, -1];
					config.name = config.name && [config.name].flat().filter(n => n);
					config.key = config.key && [config.key].flat().filter(n => n);
					config.props = config.props && [config.props].flat().filter(n => n);
					config.filter = typeof config.filter == "function" && config.filter;
					let parent, firstArray;
					parent = firstArray = instance;
					while (!hiddenchannelslib.ArrayUtils.is(firstArray) && firstArray.props && firstArray.props.children) firstArray = firstArray.props.children;
					if (!hiddenchannelslib.ArrayUtils.is(firstArray)) {
						if (parent && parent.props) {
							parent.props.children = [parent.props.children];
							firstArray = parent.props.children;
						}
						else firstArray = [];
					}
					return getParent(instance);
					function getParent (children) {
						let result = [firstArray, -1];
						if (!children) return result;
						if (!hiddenchannelslib.ArrayUtils.is(children)) {
							if (check(children)) result = found(children);
							else {
								if (children.props && children.props.children) {
									parent = children;
									result = getParent(children.props.children);
								}
								if (!(result && result[1] > -1) && children.props && children.props.child) {
									parent = children;
									result = getParent(children.props.child);
								}
							}
						}
						else {
							for (let i = 0; result[1] == -1 && i < children.length; i++) if (children[i]) {
								if (hiddenchannelslib.ArrayUtils.is(children[i])) {
									parent = children;
									result = getParent(children[i]);
								}
								else if (check(children[i])) {
									parent = children;
									result = found(children[i]);
								}
								else {
									if (children[i].props && children[i].props.children) {
										parent = children[i];
										result = getParent(children[i].props.children);
									}
									if (!(result && result[1] > -1) && children[i].props && children[i].props.child) {
										parent = children[i];
										result = getParent(children[i].props.child);
									}
								}
							}
						}
						return result;
					}
					function found (child) {
						if (hiddenchannelslib.ArrayUtils.is(parent)) return [parent, parent.indexOf(child)];
						else {
							parent.props.children = [];
							parent.props.children.push(child);
							return [parent.props.children, 0];
						}
					}
					function check (instance) {
						if (!instance || instance == parent) return false;
						let props = instance.stateNode ? instance.stateNode.props : instance.props;
						return instance.type && config.name && config.name.some(name => hiddenchannelslib.ReactUtils.isCorrectInstance(instance, name)) || config.key && config.key.some(key => instance.key == key) || props && config.props && config.props[config.someProps ? "some" : "every"](prop => hiddenchannelslib.ArrayUtils.is(prop) ? (hiddenchannelslib.ArrayUtils.is(prop[1]) ? prop[1].some(checkValue => propCheck(props, prop[0], checkValue)) : propCheck(props, prop[0], prop[1])) : props[prop] !== undefined) || config.filter && config.filter(instance);
					}
					function propCheck (props, key, value) {
						return key != null && props[key] != null && value != null && (key == "className" ? (" " + props[key] + " ").indexOf(" " + value + " ") > -1 : hiddenchannelslib.equals(props[key], value));
					}
				};
				hiddenchannelslib.ReactUtils.findProps = function (nodeOrInstance, config) {
					if (!hiddenchannelslib.ObjectUtils.is(config)) return null;
					if (!nodeOrInstance || !config.name && !config.key) return null;
					let instance = Node.prototype.isPrototypeOf(nodeOrInstance) ? hiddenchannelslib.ReactUtils.getInstance(nodeOrInstance) : nodeOrInstance;
					if (!hiddenchannelslib.ObjectUtils.is(instance)) return null;
					config.name = config.name && [config.name].flat().filter(n => n);
					config.key = config.key && [config.key].flat().filter(n => n);
					let depth = -1;
					let start = performance.now();
					let maxDepth = config.unlimited ? 999999999 : (config.depth === undefined ? 30 : config.depth);
					let maxTime = config.unlimited ? 999999999 : (config.time === undefined ? 150 : config.time);
					let whitelist = config.up ? {
						return: true,
						sibling: true,
						default: true
					} : {
						child: true,
						sibling: true,
						default: true
					};
					whitelist[hiddenchannelslib.ReactUtils.instanceKey] = true;
					return findProps(instance);

					function findProps (instance) {
						depth++;
						let result = undefined;
						if (instance && !Node.prototype.isPrototypeOf(instance) && !hiddenchannelslib.ReactUtils.getInstance(instance) && depth < maxDepth && performance.now() - start < maxTime) {
							if (instance.memoizedProps && (instance.type && config.name && config.name.some(name => hiddenchannelslib.ReactUtils.isCorrectInstance(instance, name.split(" _ _ ")[0])) || config.key && config.key.some(key => instance.key == key))) result = instance.memoizedProps;
							if (result === undefined) {
								let keys = Object.getOwnPropertyNames(instance);
								for (let i = 0; result === undefined && i < keys.length; i++) {
									let key = keys[i];
									if (key && whitelist[key] && (typeof instance[key] === "object" || typeof instance[key] == "function")) result = findProps(instance[key]);
								}
							}
						}
						depth--;
						return result;
					}
				};
				hiddenchannelslib.ReactUtils.findValue = function (nodeOrInstance, searchKey, config = {}) {
					if (!hiddenchannelslib.ObjectUtils.is(config)) return null;
					if (!nodeOrInstance || typeof searchKey != "string") return config.all ? [] : null;
					let instance = Node.prototype.isPrototypeOf(nodeOrInstance) ? hiddenchannelslib.ReactUtils.getInstance(nodeOrInstance) : nodeOrInstance;
					if (!hiddenchannelslib.ObjectUtils.is(instance)) return config.all ? [] : null;
					instance = instance[hiddenchannelslib.ReactUtils.instanceKey] || instance;
					let depth = -1;
					let start = performance.now();
					let maxDepth = config.unlimited ? 999999999 : (config.depth === undefined ? 30 : config.depth);
					let maxTime = config.unlimited ? 999999999 : (config.time === undefined ? 150 : config.time);
					let whitelist = {
						props: true,
						state: true,
						stateNode: true,
						updater: true,
						prototype: true,
						type: true,
						children: config.up ? false : true,
						memoizedProps: true,
						memoizedState: true,
						child: config.up ? false : true,
						return: config.up ? true : false,
						sibling: config.up ? false : true
					};
					let blacklist = {
						contextSection: true
					};
					if (hiddenchannelslib.ObjectUtils.is(config.whitelist)) Object.assign(whitelist, config.whiteList);
					if (hiddenchannelslib.ObjectUtils.is(config.blacklist)) Object.assign(blacklist, config.blacklist);
					let foundKeys = [];
					let singleKey = getKey(instance);
					if (config.all) return foundKeys;
					else return singleKey;
					function getKey(instance) {
						depth++;
						let result = undefined;
						if (instance && !Node.prototype.isPrototypeOf(instance) && !hiddenchannelslib.ReactUtils.getInstance(instance) && depth < maxDepth && performance.now() - start < maxTime) {
							let keys = Object.getOwnPropertyNames(instance);
							for (let i = 0; result === undefined && i < keys.length; i++) {
								let key = keys[i];
								if (key && !blacklist[key]) {
									let value = instance[key];
									if (searchKey === key && (config.value === undefined || hiddenchannelslib.equals(config.value, value))) {
										if (config.all === undefined || !config.all) result = value;
										else if (config.all) {
											if (config.noCopies === undefined || !config.noCopies) foundKeys.push(value);
											else if (config.noCopies) {
												let copy = false;
												for (let foundKey of foundKeys) if (hiddenchannelslib.equals(value, foundKey)) {
													copy = true;
													break;
												}
												if (!copy) foundKeys.push(value);
											}
										}
									}
									else if ((typeof value === "object" || typeof value == "function") && (whitelist[key] || key[0] == "." || !isNaN(key[0]))) result = getKey(value);
								}
							}
						}
						depth--;
						return result;
					}
				};
				hiddenchannelslib.ReactUtils.forceUpdate = function (...instances) {
					for (let ins of instances.flat(10).filter(n => n)) if (ins.updater && typeof ins.updater.isMounted == "function" && ins.updater.isMounted(ins)) ins.forceUpdate();
				};
				hiddenchannelslib.ReactUtils.getInstance = function (node) {
					if (!hiddenchannelslib.ObjectUtils.is(node)) return null;
					return node[Object.keys(node).find(key => key.startsWith("__reactInternalInstance") || key.startsWith("__reactFiber"))];
				};
				hiddenchannelslib.ReactUtils.isCorrectInstance = function (instance, name) {
					return instance && ((instance.type && (instance.type.render && instance.type.render.displayName === name || instance.type.displayName === name || instance.type.name === name || instance.type === name)) || instance.render && (instance.render.displayName === name || instance.render.name === name) || instance.displayName == name || instance.name === name);
				};
				hiddenchannelslib.ReactUtils.render = function (component, node) {
					if (!hiddenchannelslib.ReactUtils.isValidElement(component) || !Node.prototype.isPrototypeOf(node)) return;
					try {
						Internal.LibraryModules.ReactDOM.render(component, node);
						let observer = new MutationObserver(changes => changes.forEach(change => {
							let nodes = Array.from(change.removedNodes);
							if (nodes.indexOf(node) > -1 || nodes.some(n =>  n.contains(node))) {
								observer.disconnect();
								hiddenchannelslib.ReactUtils.unmountComponentAtNode(node);
							}
						}));
						observer.observe(document.body, {subtree: true, childList: true});
					}
					catch (err) {hiddenchannelslib.LogUtils.error(["Could not render React Element!", err]);}
				};
				hiddenchannelslib.ReactUtils.hookCall = function (callback, args) {
					if (typeof callback != "function") return null;
					let returnValue = null, tempNode = document.createElement("div");
					hiddenchannelslib.ReactUtils.render(hiddenchannelslib.ReactUtils.createElement(_ => {
						returnValue = callback(args);
						return null;
					}), tempNode);
					hiddenchannelslib.ReactUtils.unmountComponentAtNode(tempNode);
					return returnValue;
				};

				hiddenchannelslib.MessageUtils = {};
				hiddenchannelslib.MessageUtils.isSystemMessage = function (message) {
					return message && !hiddenchannelslib.DiscordConstants.USER_MESSAGE_TYPES.has(message.type) && (message.type !== hiddenchannelslib.DiscordConstants.MessageTypes.APPLICATION_COMMAND || message.interaction == null);
				};
				hiddenchannelslib.MessageUtils.rerenderAll = function (instant) {
					hiddenchannelslib.TimeUtils.clear(hiddenchannelslib.MessageUtils.rerenderAll.timeout);
					hiddenchannelslib.MessageUtils.rerenderAll.timeout = hiddenchannelslib.TimeUtils.timeout(_ => {
						let channelId = Internal.LibraryModules.LastChannelStore.getChannelId();
						if (channelId) {
							if (hiddenchannelslib.DMUtils.isDMChannel(channelId)) hiddenchannelslib.DMUtils.markAsRead(channelId);
							else hiddenchannelslib.ChannelUtils.markAsRead(channelId);
						}
						let LayerProviderIns = hiddenchannelslib.ReactUtils.findOwner(document.querySelector(hiddenchannelslib.dotCN.messageswrapper), {name: "LayerProvider", unlimited: true, up: true});
						let LayerProviderPrototype = hiddenchannelslib.ObjectUtils.get(LayerProviderIns, `${hiddenchannelslib.ReactUtils.instanceKey}.type.prototype`);
						if (LayerProviderIns && LayerProviderPrototype) {
							hiddenchannelslib.PatchUtils.patch({name: "hiddenchannelslib MessageUtils"}, LayerProviderPrototype, "render", {after: e => {
								e.returnValue.props.children = typeof e.returnValue.props.children == "function" ? (_ => {return null;}) : [];
								hiddenchannelslib.ReactUtils.forceUpdate(LayerProviderIns);
							}}, {once: true});
							hiddenchannelslib.ReactUtils.forceUpdate(LayerProviderIns);
						}
					}, instant ? 0 : 1000);
				};
				hiddenchannelslib.MessageUtils.openMenu = function (message, e = mousePosition, slim = false) {
					if (!message) return;
					let channel = Internal.LibraryModules.ChannelStore.getChannel(message.channel_id);
					if (!channel) return;
					e = hiddenchannelslib.ListenerUtils.copyEvent(e.nativeEvent || e, (e.nativeEvent || e).currentTarget);
					let menu = hiddenchannelslib.ModuleUtils.findByName(slim ? "MessageSearchResultContextMenu" : "MessageContextMenu", false, true);
					if (menu) Internal.LibraryModules.ContextMenuUtils.openContextMenu(e, e2 => hiddenchannelslib.ReactUtils.createElement(menu.exports.default, Object.assign({}, e2, {message, channel})));
					else Internal.lazyLoadModuleImports(hiddenchannelslib.ModuleUtils.findByString(slim ? ["SearchResult", "message:", "openContextMenu"] : ["useHoveredMessage", "useContextMenuUser", "openContextMenu"])).then(_ => {
						menu = hiddenchannelslib.ModuleUtils.findByName(slim ? "MessageSearchResultContextMenu" : "MessageContextMenu", false);
						if (menu) Internal.LibraryModules.ContextMenuUtils.openContextMenu(e, e2 => hiddenchannelslib.ReactUtils.createElement(menu.exports.default, Object.assign({}, e2, {message, channel})));
					});
				};
					
				hiddenchannelslib.UserUtils = {};
				hiddenchannelslib.UserUtils.is = function (user) {
					return user && user instanceof Internal.DiscordObjects.User;
				};
				const myDataUser = Internal.LibraryModules.UserStore && Internal.LibraryModules.UserStore.getCurrentUser && Internal.LibraryModules.UserStore.getCurrentUser();
				if (myDataUser && hiddenchannelslib.UserUtils._id != myDataUser.id) hiddenchannelslib.UserUtils._id = myDataUser.id;
				hiddenchannelslib.UserUtils.me = new Proxy(myDataUser || {}, {
					get: function (list, item) {
						const user = Internal.LibraryModules.UserStore && Internal.LibraryModules.UserStore.getCurrentUser && Internal.LibraryModules.UserStore.getCurrentUser();
						if (user && hiddenchannelslib.UserUtils._id != user.id) {
							Cache.data = {};
							hiddenchannelslib.UserUtils._id = user.id;
						}
						return user ? user[item] : null;
					}
				});
				hiddenchannelslib.UserUtils.getStatus = function (id = hiddenchannelslib.UserUtils.me.id) {
					id = typeof id == "number" ? id.toFixed() : id;
					let activity = hiddenchannelslib.UserUtils.getActivity(id);
					return activity && activity.type == hiddenchannelslib.DiscordConstants.ActivityTypes.STREAMING ? "streaming" : Internal.LibraryModules.StatusMetaUtils.getStatus(id);
				};
				hiddenchannelslib.UserUtils.getStatusColor = function (status, useColor) {
					status = typeof status == "string" ? status.toLowerCase() : null;
					switch (status) {
						case "online": return useColor ? hiddenchannelslib.DiscordConstants.Colors.STATUS_GREEN_600 : "var(--hiddenchannelslib-green)";
						case "idle": return useColor ? hiddenchannelslib.DiscordConstants.Colors.STATUS_YELLOW : "var(--hiddenchannelslib-yellow)";
						case "dnd": return useColor ? hiddenchannelslib.DiscordConstants.Colors.STATUS_RED : "var(--hiddenchannelslib-red)";
						case "playing": return useColor ? hiddenchannelslib.DiscordConstants.Colors.BRAND : "var(--hiddenchannelslib-blurple)";
						case "listening": return hiddenchannelslib.DiscordConstants.Colors.SPOTIFY;
						case "streaming": return hiddenchannelslib.DiscordConstants.Colors.TWITCH;
						default: return hiddenchannelslib.DiscordConstants.Colors.STATUS_GREY;
					}
				};
				hiddenchannelslib.UserUtils.getActivity = function (id = hiddenchannelslib.UserUtils.me.id) {
					for (let activity of Internal.LibraryModules.StatusMetaUtils.getActivities(id)) if (activity.type != hiddenchannelslib.DiscordConstants.ActivityTypes.CUSTOM_STATUS) return activity;
					return null;
				};
				hiddenchannelslib.UserUtils.getCustomStatus = function (id = hiddenchannelslib.UserUtils.me.id) {
					for (let activity of Internal.LibraryModules.StatusMetaUtils.getActivities(id)) if (activity.type == hiddenchannelslib.DiscordConstants.ActivityTypes.CUSTOM_STATUS) return activity;
					return null;
				};
				hiddenchannelslib.UserUtils.getAvatar = function (id = hiddenchannelslib.UserUtils.me.id) {
					let user = Internal.LibraryModules.UserStore.getUser(id);
					if (!user) return window.location.origin + "/assets/1f0bfc0865d324c2587920a7d80c609b.png";
					else return ((user.avatar ? "" : window.location.origin) + Internal.LibraryModules.IconUtils.getUserAvatarURL(user)).split("?")[0];
				};
				hiddenchannelslib.UserUtils.getBanner = function (id = hiddenchannelslib.UserUtils.me.id, guildId = Internal.LibraryModules.LastGuildStore.getGuildId(), canAnimate = false) {
					let displayProfile = Internal.LibraryModules.MemberDisplayUtils.getDisplayProfile(id, guildId);
					return (Internal.LibraryModules.IconUtils.getUserBannerURL(Object.assign({banner: displayProfile && displayProfile.banner, id: id}, {canAnimate})) || "").split("?")[0];
				};
				hiddenchannelslib.UserUtils.can = function (permission, id = hiddenchannelslib.UserUtils.me.id, channelId = Internal.LibraryModules.LastChannelStore.getChannelId()) {
					if (!hiddenchannelslib.DiscordConstants.Permissions[permission]) hiddenchannelslib.LogUtils.warn([permission, "not found in Permissions"]);
					else {
						let channel = Internal.LibraryModules.ChannelStore.getChannel(channelId);
						if (channel) return Internal.LibraryModules.PermissionRoleUtils.can({permission: hiddenchannelslib.DiscordConstants.Permissions[permission], user: id, context: channel});
					}
					return false;
				};
				hiddenchannelslib.UserUtils.openMenu = function (user, guildId, e = mousePosition) {
					if (!user || !guildId) return;
					e = hiddenchannelslib.ListenerUtils.copyEvent(e.nativeEvent || e, (e.nativeEvent || e).currentTarget);
					let menu = hiddenchannelslib.ModuleUtils.findByName("GuildChannelUserContextMenu", false, true);
					if (menu) Internal.LibraryModules.ContextMenuUtils.openContextMenu(e, e2 => hiddenchannelslib.ReactUtils.createElement(menu.exports.default, Object.assign({}, e2, {user, guildId})));
					else Internal.lazyLoadModuleImports(hiddenchannelslib.ModuleUtils.findByString("openUserContextMenu", "user:", "openContextMenu")).then(_ => {
						menu = hiddenchannelslib.ModuleUtils.findByName("GuildChannelUserContextMenu", false);
						if (menu) Internal.LibraryModules.ContextMenuUtils.openContextMenu(e, e2 => hiddenchannelslib.ReactUtils.createElement(menu.exports.default, Object.assign({}, e2, {user, guildId})));
					});
				};

				hiddenchannelslib.GuildUtils = {};
				hiddenchannelslib.GuildUtils.is = function (guild) {
					if (!hiddenchannelslib.ObjectUtils.is(guild)) return false;
					let keys = Object.keys(guild);
					return guild instanceof Internal.DiscordObjects.Guild || Object.keys(new Internal.DiscordObjects.Guild({})).every(key => keys.indexOf(key) > -1);
				};
				hiddenchannelslib.GuildUtils.getIcon = function (id) {
					let guild = Internal.LibraryModules.GuildStore.getGuild(id);
					if (!guild || !guild.icon) return "";
					return Internal.LibraryModules.IconUtils.getGuildIconURL(guild).split("?")[0];
				};
				hiddenchannelslib.GuildUtils.getBanner = function (id) {
					let guild = Internal.LibraryModules.GuildStore.getGuild(id);
					if (!guild || !guild.banner) return "";
					return Internal.LibraryModules.IconUtils.getGuildBannerURL(guild).split("?")[0];
				};
				hiddenchannelslib.GuildUtils.getFolder = function (id) {
					return Internal.LibraryModules.FolderStore.guildFolders.filter(n => n.folderId).find(n => n.guildIds.includes(id));
				};
				hiddenchannelslib.GuildUtils.openMenu = function (guild, e = mousePosition) {
					if (!guild) return;
					e = hiddenchannelslib.ListenerUtils.copyEvent(e.nativeEvent || e, (e.nativeEvent || e).currentTarget);
					let menu = hiddenchannelslib.ModuleUtils.findByName("GuildContextMenuWrapper", false, true);
					if (menu) Internal.LibraryModules.ContextMenuUtils.openContextMenu(e, e2 => hiddenchannelslib.ReactUtils.createElement(menu.exports.default, Object.assign({}, e2, {guild})));
					else Internal.lazyLoadModuleImports(hiddenchannelslib.ModuleUtils.findByString("renderUnavailableBadge", "guild:", "openContextMenu")).then(_ => {
						menu = hiddenchannelslib.ModuleUtils.findByName("GuildContextMenuWrapper", false);
						if (menu) Internal.LibraryModules.ContextMenuUtils.openContextMenu(e, e2 => hiddenchannelslib.ReactUtils.createElement(menu.exports.default, Object.assign({}, e2, {guild})));
					});
				};
				hiddenchannelslib.GuildUtils.markAsRead = function (guildIds) {
					guildIds = [guildIds].flat(10).filter(id => id && typeof id == "string" && Internal.LibraryModules.GuildStore.getGuild(id));
					if (!guildIds) return;
					let channels = guildIds.map(id => [hiddenchannelslib.ObjectUtils.toArray(Internal.LibraryModules.GuildChannelStore.getChannels(id)), Internal.LibraryModules.GuildEventStore.getGuildScheduledEventsForGuild(id)]).flat(10).map(n => n && (n.channel && n.channel.id || n.id)).flat().filter(n => n);
					if (channels.length) hiddenchannelslib.ChannelUtils.markAsRead(channels);
					let eventChannels = guildIds.map(id => ({
						channelId: id,
						readStateType: Internal.LibraryModules.UnreadStateTypes.GUILD_EVENT,
						messageId: Internal.LibraryModules.UnreadChannelUtils.lastMessageId(id, Internal.LibraryModules.UnreadStateTypes.GUILD_EVENT)
					})).filter(n => n.messageId);
					if (eventChannels.length) Internal.LibraryModules.AckUtils.bulkAck(eventChannels);
				};
				hiddenchannelslib.GuildUtils.rerenderAll = function (instant) {
					hiddenchannelslib.DiscordUtils.rerenderAll(instant);
				};

				hiddenchannelslib.FolderUtils = {};
				hiddenchannelslib.FolderUtils.getId = function (div) {
					if (!Node.prototype.isPrototypeOf(div) || !hiddenchannelslib.ReactUtils.getInstance(div)) return;
					div = hiddenchannelslib.DOMUtils.getParent(hiddenchannelslib.dotCN.guildfolderwrapper, div);
					if (!div) return;
					return hiddenchannelslib.ReactUtils.findValue(div, "folderId", {up: true});
				};
				hiddenchannelslib.FolderUtils.getDefaultName = function (folderId) {
					let folder = Internal.LibraryModules.FolderStore.getGuildFolderById(folderId);
					if (!folder) return "";
					let rest = 2 * hiddenchannelslib.DiscordConstants.MAX_GUILD_FOLDER_NAME_LENGTH;
					let names = [], allNames = folder.guildIds.map(guildId => (Internal.LibraryModules.GuildStore.getGuild(guildId) || {}).name).filter(n => n);
					for (let name of allNames) if (name.length < rest || names.length === 0) {
						names.push(name);
						rest -= name.length;
					}
					return names.join(", ") + (names.length < allNames.length ? ", ..." : "");
				};

				hiddenchannelslib.ChannelUtils = {};
				hiddenchannelslib.ChannelUtils.is = function (channel) {
					if (!hiddenchannelslib.ObjectUtils.is(channel)) return false;
					let keys = Object.keys(channel);
					return channel instanceof Internal.DiscordObjects.Channel || Object.keys(new Internal.DiscordObjects.Channel({})).every(key => keys.indexOf(key) > -1);
				};
				hiddenchannelslib.ChannelUtils.isTextChannel = function (channelOrId) {
					let channel = typeof channelOrId == "string" ? Internal.LibraryModules.ChannelStore.getChannel(channelOrId) : channelOrId;
					return hiddenchannelslib.ObjectUtils.is(channel) && (channel.type == hiddenchannelslib.DiscordConstants.ChannelTypes.GUILD_TEXT || channel.type == hiddenchannelslib.DiscordConstants.ChannelTypes.GUILD_STORE || channel.type == hiddenchannelslib.DiscordConstants.ChannelTypes.GUILD_ANNOUNCEMENT);
				};
				hiddenchannelslib.ChannelUtils.isThread = function (channelOrId) {
					let channel = typeof channelOrId == "string" ? Internal.LibraryModules.ChannelStore.getChannel(channelOrId) : channelOrId;
					return channel && channel.isThread();
				};
				hiddenchannelslib.ChannelUtils.isEvent = function (channelOrId) {
					let channel = typeof channelOrId == "string" ? Internal.LibraryModules.GuildEventStore.getGuildScheduledEvent(channelOrId) : channelOrId;
					return channel && Internal.LibraryModules.GuildEventStore.getGuildScheduledEvent(channel.id) && true;
				};
				hiddenchannelslib.ChannelUtils.markAsRead = function (channelIds) {
					let unreadChannels = [channelIds].flat(10).filter(id => id && typeof id == "string" && (hiddenchannelslib.LibraryModules.ChannelStore.getChannel(id) || {}).type != hiddenchannelslib.DiscordConstants.ChannelTypes.GUILD_CATEGORY && (Internal.LibraryModules.UnreadChannelUtils.hasUnread(id) || Internal.LibraryModules.UnreadChannelUtils.getMentionCount(id) > 0)).map(id => ({
						channelId: id,
						readStateType: Internal.LibraryModules.UnreadStateTypes.CHANNEL,
						messageId: Internal.LibraryModules.UnreadChannelUtils.lastMessageId(id)
					}));
					if (unreadChannels.length) Internal.LibraryModules.AckUtils.bulkAck(unreadChannels);
				};
				hiddenchannelslib.ChannelUtils.rerenderAll = function (instant) {
					hiddenchannelslib.TimeUtils.clear(hiddenchannelslib.ChannelUtils.rerenderAll.timeout);
					hiddenchannelslib.ChannelUtils.rerenderAll.timeout = hiddenchannelslib.TimeUtils.timeout(_ => {
						let ChannelsIns = hiddenchannelslib.ReactUtils.findOwner(document.querySelector(hiddenchannelslib.dotCN.guildchannels), {name: "Channels", unlimited: true});
						let ChannelsPrototype = hiddenchannelslib.ObjectUtils.get(ChannelsIns, `${hiddenchannelslib.ReactUtils.instanceKey}.type.prototype`);
						if (ChannelsIns && ChannelsPrototype) {
							hiddenchannelslib.PatchUtils.patch({name: "hiddenchannelslib ChannelUtils"}, ChannelsPrototype, "render", {after: e => {
								e.returnValue.props.children = typeof e.returnValue.props.children == "function" ? (_ => {return null;}) : [];
								hiddenchannelslib.ReactUtils.forceUpdate(ChannelsIns);
							}}, {once: true});
							hiddenchannelslib.ReactUtils.forceUpdate(ChannelsIns);
						}
					}, instant ? 0 : 1000);
				};
				
				hiddenchannelslib.DMUtils = {};
				hiddenchannelslib.DMUtils.isDMChannel = function (id) {
					let channel = Internal.LibraryModules.ChannelStore.getChannel(id);
					return hiddenchannelslib.ObjectUtils.is(channel) && (channel.isDM() || channel.isGroupDM());
				};
				hiddenchannelslib.DMUtils.getIcon = function (id) {
					let channel = Internal.LibraryModules.ChannelStore.getChannel(id);
					if (!channel) return "";
					if (!channel.icon) return channel.isDM() ? hiddenchannelslib.UserUtils.getAvatar(channel.recipients[0]) : (channel.isGroupDM() ? window.location.origin + Internal.LibraryModules.IconUtils.getChannelIconURL(channel).split("?")[0] : null);
					return Internal.LibraryModules.IconUtils.getChannelIconURL(channel).split("?")[0];
				};
				hiddenchannelslib.DMUtils.markAsRead = function (dmIds) {
					let unreadDMs = [dmIds].flat(10).filter(id => id && typeof id == "string" && hiddenchannelslib.DMUtils.isDMChannel(id) && (Internal.LibraryModules.UnreadChannelUtils.hasUnread(id) || Internal.LibraryModules.UnreadChannelUtils.getMentionCount(id) > 0));
					if (unreadDMs.length) for (let i in unreadDMs) hiddenchannelslib.TimeUtils.timeout(_ => Internal.LibraryModules.AckUtils.ack(unreadDMs[i]), i * 1000);
				};
				
				hiddenchannelslib.ColorUtils = {};
				hiddenchannelslib.ColorUtils.convert = function (color, conv, type) {
					if (hiddenchannelslib.ObjectUtils.is(color)) {
						var newColor = {};
						for (let pos in color) newColor[pos] = hiddenchannelslib.ColorUtils.convert(color[pos], conv, type);
						return newColor;
					}
					else {
						conv = conv === undefined || !conv ? conv = "RGBCOMP" : conv.toUpperCase();
						type = type === undefined || !type || !["RGB", "RGBA", "RGBCOMP", "HSL", "HSLA", "HSLCOMP", "HEX", "HEXA", "INT"].includes(type.toUpperCase()) ? hiddenchannelslib.ColorUtils.getType(color) : type.toUpperCase();
						if (conv == "RGBCOMP") {
							switch (type) {
								case "RGBCOMP":
									var rgbComp = [].concat(color);
									if (rgbComp.length == 3) return processRGB(rgbComp);
									else if (rgbComp.length == 4) {
										let a = processA(rgbComp.pop());
										return processRGB(rgbComp).concat(a);
									}
									break;
								case "RGB":
									return processRGB(color.replace(/\s/g, "").slice(4, -1).split(","));
								case "RGBA":
									var rgbComp = color.replace(/\s/g, "").slice(5, -1).split(",");
									var a = processA(rgbComp.pop());
									return processRGB(rgbComp).concat(a);
								case "HSLCOMP":
									var hslComp = [].concat(color);
									if (hslComp.length == 3) return hiddenchannelslib.ColorUtils.convert(`hsl(${processHSL(hslComp).join(",")})`, "RGBCOMP");
									else if (hslComp.length == 4) {
										let a = processA(hslComp.pop());
										return hiddenchannelslib.ColorUtils.convert(`hsl(${processHSL(hslComp).join(",")})`, "RGBCOMP").concat(a);
									}
									break;
								case "HSL":
									var hslComp = processHSL(color.replace(/\s/g, "").slice(4, -1).split(","));
									var r, g, b, m, c, x, p, q;
									var h = hslComp[0] / 360, l = parseInt(hslComp[1]) / 100, s = parseInt(hslComp[2]) / 100; m = Math.floor(h * 6); c = h * 6 - m; x = s * (1 - l); p = s * (1 - c * l); q = s * (1 - (1 - c) * l);
									switch (m % 6) {
										case 0: r = s, g = q, b = x; break;
										case 1: r = p, g = s, b = x; break;
										case 2: r = x, g = s, b = q; break;
										case 3: r = x, g = p, b = s; break;
										case 4: r = q, g = x, b = s; break;
										case 5: r = s, g = x, b = p; break;
									}
									return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
								case "HSLA":
									var hslComp = color.replace(/\s/g, "").slice(5, -1).split(",");
									return hiddenchannelslib.ColorUtils.convert(`hsl(${hslComp.slice(0, 3).join(",")})`, "RGBCOMP").concat(processA(hslComp.pop()));
								case "HEX":
									var hex = /^#([a-f\d]{1})([a-f\d]{1})([a-f\d]{1})$|^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
									return [parseInt(hex[1] + hex[1] || hex[4], 16), parseInt(hex[2] + hex[2] || hex[5], 16), parseInt(hex[3] + hex[3] || hex[6], 16)];
								case "HEXA":
									var hex = /^#([a-f\d]{1})([a-f\d]{1})([a-f\d]{1})([a-f\d]{1})$|^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
									return [parseInt(hex[1] + hex[1] || hex[5], 16), parseInt(hex[2] + hex[2] || hex[6], 16), parseInt(hex[3] + hex[3] || hex[7], 16), Math.floor(hiddenchannelslib.NumberUtils.mapRange([0, 255], [0, 100], parseInt(hex[4] + hex[4] || hex[8], 16)))/100];
								case "INT":
									color = processINT(color);
									return [parseInt(color >> 16 & 255), parseInt(color >> 8 & 255), parseInt(color & 255)];
								default:
									return null;
							}
						}
						else {
							if (conv && type && conv.indexOf("HSL") == 0 && type.indexOf("HSL") == 0) {
								if (type == "HSLCOMP") {
									let hslComp = [].concat(color);
									switch (conv) {
										case "HSLCOMP":
											if (hslComp.length == 3) return processHSL(hslComp);
											else if (hslComp.length == 4) {
												var a = processA(hslComp.pop());
												return processHSL(hslComp).concat(a);
											}
											break;
										case "HSL":
											return `hsl(${processHSL(hslComp.slice(0, 3)).join(",")})`;
										case "HSLA":
											hslComp = hslComp.slice(0, 4);
											var a = hslComp.length == 4 ? processA(hslComp.pop()) : 1;
											return `hsla(${processHSL(hslComp).concat(a).join(",")})`;
									}
								}
								return hiddenchannelslib.ColorUtils.convert(color.replace(/\s/g, "").slice(color.toUpperCase().indexOf("HSLA") == 0 ? 5 : 4, -1).split(","), conv, "HSLCOMP");
							}
							else {
								let rgbComp = type == "RGBCOMP" ? [].concat(color) : hiddenchannelslib.ColorUtils.convert(color, "RGBCOMP", type);
								if (rgbComp) switch (conv) {
									case "RGB":
										return `rgb(${processRGB(rgbComp.slice(0, 3)).join(",")})`;
									case "RGBA":
										rgbComp = rgbComp.slice(0, 4);
										var a = rgbComp.length == 4 ? processA(rgbComp.pop()) : 1;
										return `rgba(${processRGB(rgbComp).concat(a).join(",")})`;
									case "HSLCOMP":
										var a = rgbComp.length == 4 ? processA(rgbComp.pop()) : null;
										var hslComp = processHSL(hiddenchannelslib.ColorUtils.convert(rgbComp, "HSL").replace(/\s/g, "").split(","));
										return a != null ? hslComp.concat(a) : hslComp;
									case "HSL":
										var r = processC(rgbComp[0]), g = processC(rgbComp[1]), b = processC(rgbComp[2]);
										var max = Math.max(r, g, b), min = Math.min(r, g, b), dif = max - min, h, l = max === 0 ? 0 : dif / max, s = max / 255;
										switch (max) {
											case min: h = 0; break;
											case r: h = g - b + dif * (g < b ? 6 : 0); h /= 6 * dif; break;
											case g: h = b - r + dif * 2; h /= 6 * dif; break;
											case b: h = r - g + dif * 4; h /= 6 * dif; break;
										}
										return `hsl(${processHSL([Math.round(h * 360), l * 100, s * 100]).join(",")})`;
									case "HSLA":
										var a = rgbComp.length == 4 ? processA(rgbComp.pop()) : 1;
										return `hsla(${hiddenchannelslib.ColorUtils.convert(rgbComp, "HSL").slice(4, -1).split(",").concat(a).join(",")})`;
									case "HEX":
										return ("#" + (0x1000000 + (rgbComp[2] | rgbComp[1] << 8 | rgbComp[0] << 16)).toString(16).slice(1)).toUpperCase();
									case "HEXA":
										return ("#" + (0x1000000 + (rgbComp[2] | rgbComp[1] << 8 | rgbComp[0] << 16)).toString(16).slice(1) + (0x100 + Math.round(hiddenchannelslib.NumberUtils.mapRange([0, 100], [0, 255], processA(rgbComp[3]) * 100))).toString(16).slice(1)).toUpperCase();
									case "INT":
										return processINT(rgbComp[2] | rgbComp[1] << 8 | rgbComp[0] << 16);
									default:
										return null;
								}
							}
						}
					}
					return null;
					function processC(c) {if (c == null) {return 255;} else {c = parseInt(c.toString().replace(/[^0-9\-]/g, ""));return isNaN(c) || c > 255 ? 255 : c < 0 ? 0 : c;}};
					function processRGB(comp) {return [].concat(comp).map(c => {return processC(c);});};
					function processA(a) {if (a == null) {return 1;} else {a = a.toString();a = (a.indexOf("%") > -1 ? 0.01 : 1) * parseFloat(a.replace(/[^0-9\.\-]/g, ""));return isNaN(a) || a > 1 ? 1 : a < 0 ? 0 : a;}};
					function processSL(sl) {if (sl == null) {return "100%";} else {sl = parseFloat(sl.toString().replace(/[^0-9\.\-]/g, ""));return (isNaN(sl) || sl > 100 ? 100 : sl < 0 ? 0 : sl) + "%";}};
					function processHSL(comp) {comp = [].concat(comp);let h = parseFloat(comp.shift().toString().replace(/[^0-9\.\-]/g, ""));h = isNaN(h) || h > 360 ? 360 : h < 0 ? 0 : h;return [h].concat(comp.map(sl => {return processSL(sl);}));};
					function processINT(c) {if (c == null) {return 16777215;} else {c = parseInt(c.toString().replace(/[^0-9]/g, ""));return isNaN(c) || c > 16777215 ? 16777215 : c < 0 ? 0 : c;}};
				};
				hiddenchannelslib.ColorUtils.setAlpha = function (color, a, conv) {
					if (hiddenchannelslib.ObjectUtils.is(color)) {
						let newcolor = {};
						for (let pos in color) newcolor[pos] = hiddenchannelslib.ColorUtils.setAlpha(color[pos], a, conv);
						return newcolor;
					}
					else {
						let rgbComp = hiddenchannelslib.ColorUtils.convert(color, "RGBCOMP");
						if (rgbComp) {
							a = a.toString();
							a = (a.indexOf("%") > -1 ? 0.01 : 1) * parseFloat(a.replace(/[^0-9\.\-]/g, ""));
							a = isNaN(a) || a > 1 ? 1 : a < 0 ? 0 : a;
							rgbComp[3] = a;
							conv = (conv || hiddenchannelslib.ColorUtils.getType(color)).toUpperCase();
							conv = conv == "RGB" || conv == "HSL" || conv == "HEX" ? conv + "A" : conv;
							return hiddenchannelslib.ColorUtils.convert(rgbComp, conv);
						}
					}
					return null;
				};
				hiddenchannelslib.ColorUtils.getAlpha = function (color) {
					let rgbComp = hiddenchannelslib.ColorUtils.convert(color, "RGBCOMP");
					if (rgbComp) {
						if (rgbComp.length == 3) return 1;
						else if (rgbComp.length == 4) {
							let a = rgbComp[3].toString();
							a = (a.indexOf("%") > -1 ? 0.01 : 1) * parseFloat(a.replace(/[^0-9\.\-]/g, ""));
							return isNaN(a) || a > 1 ? 1 : a < 0 ? 0 : a;
						}
					}
					return null;
				};
				hiddenchannelslib.ColorUtils.change = function (color, value, conv) {
					value = parseFloat(value);
					if (color != null && typeof value == "number" && !isNaN(value)) {
						if (hiddenchannelslib.ObjectUtils.is(color)) {
							let newColor = {};
							for (let pos in color) newColor[pos] = hiddenchannelslib.ColorUtils.change(color[pos], value, conv);
							return newColor;
						}
						else {
							let rgbComp = hiddenchannelslib.ColorUtils.convert(color, "RGBCOMP");
							if (rgbComp) {
								let a = hiddenchannelslib.ColorUtils.getAlpha(rgbComp);
								if (parseInt(value) !== value) {
									value = value.toString();
									value = (value.indexOf("%") > -1 ? 0.01 : 1) * parseFloat(value.replace(/[^0-9\.\-]/g, ""));
									value = isNaN(value) ? 0 : value;
									return hiddenchannelslib.ColorUtils.convert([].concat(rgbComp).slice(0, 3).map(c => {
										c = Math.round(c * (1 + value));
										return c > 255 ? 255 : c < 0 ? 0 : c;
									}).concat(a), conv || hiddenchannelslib.ColorUtils.getType(color));
								}
								else return hiddenchannelslib.ColorUtils.convert([].concat(rgbComp).slice(0, 3).map(c => {
									c = Math.round(c + value);
									return c > 255 ? 255 : c < 0 ? 0 : c;
								}).concat(a), conv || hiddenchannelslib.ColorUtils.getType(color));
							}
						}
					}
					return null;
				};
				hiddenchannelslib.ColorUtils.invert = function (color, conv) {
					if (hiddenchannelslib.ObjectUtils.is(color)) {
						let newColor = {};
						for (let pos in color) newColor[pos] = hiddenchannelslib.ColorUtils.invert(color[pos], conv);
						return newColor;
					}
					else {
						let comp = hiddenchannelslib.ColorUtils.convert(color, "RGBCOMP");
						if (comp) return hiddenchannelslib.ColorUtils.convert([255 - comp[0], 255 - comp[1], 255 - comp[2]], conv || hiddenchannelslib.ColorUtils.getType(color));
					}
					return null;
				};
				hiddenchannelslib.ColorUtils.compare = function (color1, color2) {
					if (color1 && color2) {
						color1 = hiddenchannelslib.ColorUtils.convert(color1, "RGBA");
						color2 = hiddenchannelslib.ColorUtils.convert(color2, "RGBA");
						if (color1 && color2) return hiddenchannelslib.equals(color1, color2);
					}
					return null;
				};
				hiddenchannelslib.ColorUtils.isBright = function (color, compare = 160) {
					if (!hiddenchannelslib.ColorUtils.getType(color)) return false;
					color = hiddenchannelslib.ColorUtils.convert(color, "RGBCOMP");
					if (!color) return false;
					return parseInt(compare) < Math.sqrt(0.299 * color[0]**2 + 0.587 * color[1]**2 + 0.144 * color[2]**2);
				};
				hiddenchannelslib.ColorUtils.getType = function (color) {
					if (color != null) {
						if (typeof color === "object" && (color.length == 3 || color.length == 4)) {
							if (isRGB(color)) return "RGBCOMP";
							else if (isHSL(color)) return "HSLCOMP";
						}
						else if (typeof color === "string") {
							if (/^#[a-f\d]{3}$|^#[a-f\d]{6}$/i.test(color)) return "HEX";
							else if (/^#[a-f\d]{4}$|^#[a-f\d]{8}$/i.test(color)) return "HEXA";
							else {
								color = color.toUpperCase();
								let comp = color.replace(/[^0-9\.\-\,\%]/g, "").split(",");
								if (color.indexOf("RGB(") == 0 && comp.length == 3 && isRGB(comp)) return "RGB";
								else if (color.indexOf("RGBA(") == 0 && comp.length == 4 && isRGB(comp)) return "RGBA";
								else if (color.indexOf("HSL(") == 0 && comp.length == 3 && isHSL(comp)) return "HSL";
								else if (color.indexOf("HSLA(") == 0 && comp.length == 4 && isHSL(comp)) return "HSLA";
							}
						}
						else if (typeof color === "number" && parseInt(color) == color && color > -1 && color < 16777216) return "INT";
					}
					return null;
					function isRGB(comp) {return comp.slice(0, 3).every(rgb => rgb.toString().indexOf("%") == -1 && parseFloat(rgb) == parseInt(rgb));};
					function isHSL(comp) {return comp.slice(1, 3).every(hsl => hsl.toString().indexOf("%") == hsl.length - 1);};
				};
				hiddenchannelslib.ColorUtils.createGradient = function (colorObj, direction = "to right") {
					let gradientString = "linear-gradient(" + direction;
					for (let pos of Object.keys(colorObj).sort()) {
						let color = hiddenchannelslib.ColorUtils.convert(colorObj[pos], "RGBA");
						gradientString += color ? `, ${color} ${pos*100}%` : ''
					}
					return gradientString += ")";
				};

				hiddenchannelslib.DOMUtils = {};
				hiddenchannelslib.DOMUtils.getSelection = function () {
					let selection = document.getSelection();
					return selection && selection.anchorNode ? selection.getRangeAt(0).toString() : "";
				};
				hiddenchannelslib.DOMUtils.addClass = function (eles, ...classes) {
					if (!eles || !classes) return;
					for (let ele of [eles].map(n => NodeList.prototype.isPrototypeOf(n) ? Array.from(n) : n).flat(10).filter(n => n)) {
						if (Node.prototype.isPrototypeOf(ele)) add(ele);
						else if (NodeList.prototype.isPrototypeOf(ele)) for (let e of ele) add(e);
						else if (typeof ele == "string") for (let e of ele.split(",")) if (e && (e = e.trim())) for (let n of document.querySelectorAll(e)) add(n);
					}
					function add(node) {
						if (node && node.classList) for (let cla of classes) for (let cl of [cla].flat(10).filter(n => n)) if (typeof cl == "string") for (let c of cl.split(" ")) if (c) node.classList.add(c);
					}
				};
				hiddenchannelslib.DOMUtils.removeClass = function (eles, ...classes) {
					if (!eles || !classes) return;
					for (let ele of [eles].map(n => NodeList.prototype.isPrototypeOf(n) ? Array.from(n) : n).flat(10).filter(n => n)) {
						if (Node.prototype.isPrototypeOf(ele)) remove(ele);
						else if (NodeList.prototype.isPrototypeOf(ele)) for (let e of ele) remove(e);
						else if (typeof ele == "string") for (let e of ele.split(",")) if (e && (e = e.trim())) for (let n of document.querySelectorAll(e)) remove(n);
					}
					function remove(node) {
						if (node && node.classList) for (let cla of classes) for (let cl of [cla].flat(10).filter(n => n)) if (typeof cl == "string") for (let c of cl.split(" ")) if (c) node.classList.remove(c);
					}
				};
				hiddenchannelslib.DOMUtils.toggleClass = function (eles, ...classes) {
					if (!eles || !classes) return;
					var force = classes.pop();
					if (typeof force != "boolean") {
						classes.push(force);
						force = undefined;
					}
					if (!classes.length) return;
					for (let ele of [eles].map(n => NodeList.prototype.isPrototypeOf(n) ? Array.from(n) : n).flat(10).filter(n => n)) {
						if (Node.prototype.isPrototypeOf(ele)) toggle(ele);
						else if (NodeList.prototype.isPrototypeOf(ele)) for (let e of ele) toggle(e);
						else if (typeof ele == "string") for (let e of ele.split(",")) if (e && (e = e.trim())) for (let n of document.querySelectorAll(e)) toggle(n);
					}
					function toggle(node) {
						if (node && node.classList) for (let cla of classes) for (let cl of [cla].flat(10).filter(n => n)) if (typeof cl == "string") for (let c of cl.split(" ")) if (c) node.classList.toggle(c, force);
					}
				};
				hiddenchannelslib.DOMUtils.containsClass = function (eles, ...classes) {
					if (!eles || !classes) return;
					let all = classes.pop();
					if (typeof all != "boolean") {
						classes.push(all);
						all = true;
					}
					if (!classes.length) return;
					let contained = undefined;
					for (let ele of [eles].map(n => NodeList.prototype.isPrototypeOf(n) ? Array.from(n) : n).flat(10).filter(n => n)) {
						if (Node.prototype.isPrototypeOf(ele)) contains(ele);
						else if (NodeList.prototype.isPrototypeOf(ele)) for (let e of ele) contains(e);
						else if (typeof ele == "string") for (let c of ele.split(",")) if (c && (c = c.trim())) for (let n of document.querySelectorAll(c)) contains(n);
					}
					return contained;
					function contains(node) {
						if (node && node.classList) for (let cla of classes) if (typeof cla == "string") for (let c of cla.split(" ")) if (c) {
							if (contained === undefined) contained = all;
							if (all && !node.classList.contains(c)) contained = false;
							if (!all && node.classList.contains(c)) contained = true;
						}
					}
				};
				hiddenchannelslib.DOMUtils.replaceClass = function (eles, oldclass, newclass) {
					if (!eles || typeof oldclass != "string" || typeof newclass != "string") return;
					for (let ele of [eles].map(n => NodeList.prototype.isPrototypeOf(n) ? Array.from(n) : n).flat(10).filter(n => n)) {
						if (Node.prototype.isPrototypeOf(ele)) replace(ele);
						else if (NodeList.prototype.isPrototypeOf(ele)) for (let e of ele) replace(e);
						else if (typeof ele == "string") for (let e of ele.split(",")) if (e && (e = e.trim())) for (let n of document.querySelectorAll(e)) replace(n);
					}
					function replace(node) {
						if (node && node.tagName && node.className) node.className = node.className.replace(new RegExp(oldclass, "g"), newclass).trim();
					}
				};
				hiddenchannelslib.DOMUtils.formatClassName = function (...classes) {
					return hiddenchannelslib.ArrayUtils.removeCopies(classes.flat(10).filter(n => n).join(" ").split(" ")).join(" ").trim();
				};
				hiddenchannelslib.DOMUtils.removeClassFromDOM = function (...classes) {
					for (let c of classes.flat(10).filter(n => n)) if (typeof c == "string") for (let a of c.split(",")) if (a && (a = a.replace(/\.|\s/g, ""))) hiddenchannelslib.DOMUtils.removeClass(document.querySelectorAll("." + a), a);
				};
				hiddenchannelslib.DOMUtils.show = function (...eles) {
					hiddenchannelslib.DOMUtils.toggle(...eles, true);
				};
				hiddenchannelslib.DOMUtils.hide = function (...eles) {
					hiddenchannelslib.DOMUtils.toggle(...eles, false);
				};
				hiddenchannelslib.DOMUtils.toggle = function (...eles) {
					if (!eles) return;
					let force = eles.pop();
					if (typeof force != "boolean") {
						eles.push(force);
						force = undefined;
					}
					if (!eles.length) return;
					for (let ele of eles.flat(10).filter(n => n)) {
						if (Node.prototype.isPrototypeOf(ele)) toggle(ele);
						else if (NodeList.prototype.isPrototypeOf(ele)) for (let node of ele) toggle(node);
						else if (typeof ele == "string") for (let c of ele.split(",")) if (c && (c = c.trim())) for (let node of document.querySelectorAll(c)) toggle(node);
					}
					function toggle(node) {
						if (!node || !Node.prototype.isPrototypeOf(node)) return;
						let hide = force === undefined ? !hiddenchannelslib.DOMUtils.isHidden(node) : !force;
						if (hide) {
							let display = node.style.getPropertyValue("display");
							if (display && display != "none") node.hiddenchannelslibhideDisplayState = {
								display: display,
								important: (` ${node.style.cssText} `.split(` display: ${display}`)[1] || "").trim().indexOf("!important") == 0
							};
							node.style.setProperty("display", "none", "important");
						}
						else {
							if (node.hiddenchannelslibhideDisplayState) {
								node.style.setProperty("display", node.hiddenchannelslibhideDisplayState.display, node.hiddenchannelslibhideDisplayState.important ? "important" : "");
								delete node.hiddenchannelslibhideDisplayState;
							}
							else node.style.removeProperty("display");
						}
					}
				};
				hiddenchannelslib.DOMUtils.isHidden = function (node) {
					if (Node.prototype.isPrototypeOf(node) && node.nodeType != Node.TEXT_NODE) return getComputedStyle(node, null).getPropertyValue("display") == "none";
				};
				hiddenchannelslib.DOMUtils.remove = function (...eles) {
					for (let ele of eles.flat(10).filter(n => n)) {
						if (Node.prototype.isPrototypeOf(ele)) ele.remove();
						else if (NodeList.prototype.isPrototypeOf(ele)) {
							let nodes = Array.from(ele);
							while (nodes.length) nodes.shift().remove();
						}
						else if (typeof ele == "string") for (let c of ele.split(",")) if (c && (c = c.trim())) {
							let nodes = Array.from(document.querySelectorAll(c));
							while (nodes.length) nodes.shift().remove();
						}
					}
				};
				hiddenchannelslib.DOMUtils.create = function (html) {
					if (typeof html != "string" || !html.trim()) return null;
					let template = document.createElement("template");
					try {template.innerHTML = html.replace(/(?<!pre)>[\t\r\n]+<(?!pre)/g, "><");}
					catch (err) {template.innerHTML = html.replace(/>[\t\r\n]+<(?!pre)/g, "><");}
					if (template.content.childNodes.length == 1) return template.content.firstElementChild || template.content.firstChild;
					else {
						let wrapper = document.createElement("span");
						let nodes = Array.from(template.content.childNodes);
						while (nodes.length) wrapper.appendChild(nodes.shift());
						return wrapper;
					}
				};
				hiddenchannelslib.DOMUtils.getParent = function (listOrSelector, node) {
					let parent = null;
					if (Node.prototype.isPrototypeOf(node) && listOrSelector) {
						let list = NodeList.prototype.isPrototypeOf(listOrSelector) ? listOrSelector : typeof listOrSelector == "string" ? document.querySelectorAll(listOrSelector) : null;
						if (list) for (let listNode of list) if (listNode.contains(node)) {
							parent = listNode;
							break;
						}
					}
					return parent;
				};
				hiddenchannelslib.DOMUtils.setText = function (node, stringOrNode) {
					if (!node || !Node.prototype.isPrototypeOf(node)) return;
					let textnode = node.nodeType == Node.TEXT_NODE ? node : null;
					if (!textnode) for (let child of node.childNodes) if (child.nodeType == Node.TEXT_NODE || hiddenchannelslib.DOMUtils.containsClass(child, "hiddenchannelslib-textnode")) {
						textnode = child;
						break;
					}
					if (textnode) {
						if (Node.prototype.isPrototypeOf(stringOrNode) && stringOrNode.nodeType != Node.TEXT_NODE) {
							hiddenchannelslib.DOMUtils.addClass(stringOrNode, "hiddenchannelslib-textnode");
							node.replaceChild(stringOrNode, textnode);
						}
						else if (Node.prototype.isPrototypeOf(textnode) && textnode.nodeType != Node.TEXT_NODE) node.replaceChild(document.createTextNode(stringOrNode), textnode);
						else textnode.textContent = stringOrNode;
					}
					else node.appendChild(Node.prototype.isPrototypeOf(stringOrNode) ? stringOrNode : document.createTextNode(stringOrNode));
				};
				hiddenchannelslib.DOMUtils.getText = function (node) {
					if (!node || !Node.prototype.isPrototypeOf(node)) return;
					for (let child of node.childNodes) if (child.nodeType == Node.TEXT_NODE) return child.textContent;
				};
				hiddenchannelslib.DOMUtils.getRects = function (node) {
					let rects = {};
					if (Node.prototype.isPrototypeOf(node) && node.nodeType != Node.TEXT_NODE) {
						let hideNode = node;
						while (hideNode) {
							let hidden = hiddenchannelslib.DOMUtils.isHidden(hideNode);
							if (hidden) {
								hiddenchannelslib.DOMUtils.toggle(hideNode, true);
								hideNode.hiddenchannelslibgetRectsHidden = true;
							}
							hideNode = hideNode.parentElement;
						}
						rects = node.getBoundingClientRect();
						hideNode = node;
						while (hideNode) {
							if (hideNode.hiddenchannelslibgetRectsHidden) {
								hiddenchannelslib.DOMUtils.toggle(hideNode, false);
								delete hideNode.hiddenchannelslibgetRectsHidden;
							}
							hideNode = hideNode.parentElement;
						}
					}
					return rects;
				};
				hiddenchannelslib.DOMUtils.getHeight = function (node) {
					if (Node.prototype.isPrototypeOf(node) && node.nodeType != Node.TEXT_NODE) {
						let rects = hiddenchannelslib.DOMUtils.getRects(node);
						let style = getComputedStyle(node);
						return rects.height + parseInt(style.marginTop) + parseInt(style.marginBottom);
					}
					return 0;
				};
				hiddenchannelslib.DOMUtils.getInnerHeight = function (node) {
					if (Node.prototype.isPrototypeOf(node) && node.nodeType != Node.TEXT_NODE) {
						let rects = hiddenchannelslib.DOMUtils.getRects(node);
						let style = getComputedStyle(node);
						return rects.height - parseInt(style.paddingTop) - parseInt(style.paddingBottom);
					}
					return 0;
				};
				hiddenchannelslib.DOMUtils.getWidth = function (node) {
					if (Node.prototype.isPrototypeOf(node) && node.nodeType != Node.TEXT_NODE) {
						let rects = hiddenchannelslib.DOMUtils.getRects(node);
						let style = getComputedStyle(node);
						return rects.width + parseInt(style.marginLeft) + parseInt(style.marginRight);
					}
					return 0;
				};
				hiddenchannelslib.DOMUtils.getInnerWidth = function (node) {
					if (Node.prototype.isPrototypeOf(node) && node.nodeType != Node.TEXT_NODE) {
						let rects = hiddenchannelslib.DOMUtils.getRects(node);
						let style = getComputedStyle(node);
						return rects.width - parseInt(style.paddingLeft) - parseInt(style.paddingRight);
					}
					return 0;
				};
				hiddenchannelslib.DOMUtils.appendWebScript = function (url, container) {
					if (typeof url != "string") return;
					if (!container && !document.head.querySelector("bd-head bd-scripts")) document.head.appendChild(hiddenchannelslib.DOMUtils.create(`<bd-head><bd-scripts></bd-scripts></bd-head>`));
					container = container || document.head.querySelector("bd-head bd-scripts") || document.head;
					container = Node.prototype.isPrototypeOf(container) ? container : document.head;
					hiddenchannelslib.DOMUtils.removeWebScript(url, container);
					let script = document.createElement("script");
					script.src = url;
					container.appendChild(script);
				};
				hiddenchannelslib.DOMUtils.removeWebScript = function (url, container) {
					if (typeof url != "string") return;
					container = container || document.head.querySelector("bd-head bd-scripts") || document.head;
					container = Node.prototype.isPrototypeOf(container) ? container : document.head;
					hiddenchannelslib.DOMUtils.remove(container.querySelectorAll(`script[src="${url}"]`));
				};
				hiddenchannelslib.DOMUtils.appendWebStyle = function (url, container) {
					if (typeof url != "string") return;
					if (!container && !document.head.querySelector("bd-head bd-styles")) document.head.appendChild(hiddenchannelslib.DOMUtils.create(`<bd-head><bd-styles></bd-styles></bd-head>`));
					container = container || document.head.querySelector("bd-head bd-styles") || document.head;
					container = Node.prototype.isPrototypeOf(container) ? container : document.head;
					hiddenchannelslib.DOMUtils.removeWebStyle(url, container);
					container.appendChild(hiddenchannelslib.DOMUtils.create(`<link type="text/css" rel="stylesheet" href="${url}"></link>`));
				};
				hiddenchannelslib.DOMUtils.removeWebStyle = function (url, container) {
					if (typeof url != "string") return;
					container = container || document.head.querySelector("bd-head bd-styles") || document.head;
					container = Node.prototype.isPrototypeOf(container) ? container : document.head;
					hiddenchannelslib.DOMUtils.remove(container.querySelectorAll(`link[href="${url}"]`));
				};
				hiddenchannelslib.DOMUtils.appendLocalStyle = function (id, css, container) {
					if (typeof id != "string" || typeof css != "string") return;
					if (!container && !document.head.querySelector("bd-head bd-styles")) document.head.appendChild(hiddenchannelslib.DOMUtils.create(`<bd-head><bd-styles></bd-styles></bd-head>`));
					container = container || document.head.querySelector("bd-head bd-styles") || document.head;
					container = Node.prototype.isPrototypeOf(container) ? container : document.head;
					hiddenchannelslib.DOMUtils.removeLocalStyle(id, container);
					container.appendChild(hiddenchannelslib.DOMUtils.create(`<style id="${id}CSS">${css.replace(/\t|\r|\n/g,"")}</style>`));
				};
				hiddenchannelslib.DOMUtils.removeLocalStyle = function (id, container) {
					if (typeof id != "string") return;
					container = container || document.head.querySelector("bd-head bd-styles") || document.head;
					container = Node.prototype.isPrototypeOf(container) ? container : document.head;
					hiddenchannelslib.DOMUtils.remove(container.querySelectorAll(`style[id="${id}CSS"]`));
				};
				
				hiddenchannelslib.ModalUtils = {};
				hiddenchannelslib.ModalUtils.open = function (plugin, config) {
					if (!hiddenchannelslib.ObjectUtils.is(plugin) || !hiddenchannelslib.ObjectUtils.is(config)) return;
					let modalInstance, modalProps, cancels = [], closeModal = _ => {
						if (hiddenchannelslib.ObjectUtils.is(modalProps) && typeof modalProps.onClose == "function") modalProps.onClose();
					};
					
					let titleChildren = [], headerChildren = [], contentChildren = [], footerChildren = [];
					
					if (typeof config.text == "string") {
						config.contentClassName = hiddenchannelslib.DOMUtils.formatClassName(config.contentClassName, hiddenchannelslib.disCN.modaltextcontent);
						contentChildren.push(hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TextElement, {
							children: config.text
						}));
					}
					
					if (config.children) {
						let tabBarItems = [], tabIns = {};
						for (let child of [config.children].flat(10).filter(n => n)) if (Internal.LibraryModules.React.isValidElement(child)) {
							if (child.type == Internal.LibraryComponents.ModalComponents.ModalTabContent) {
								if (!tabBarItems.length) child.props.open = true;
								else delete child.props.open;
								let ref = typeof child.ref == "function" ? child.ref : (_ => {});
								child.ref = instance => {
									ref(instance);
									if (instance) tabIns[child.props.tab] = instance;
								};
								tabBarItems.push({value: child.props.tab});
							}
							contentChildren.push(child);
						}
						if (tabBarItems.length) headerChildren.push(hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Flex, {
							className: hiddenchannelslib.disCN.tabbarcontainer,
							align: Internal.LibraryComponents.Flex.Align.CENTER,
							children: [
								hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TabBar, {
									className: hiddenchannelslib.disCN.tabbar,
									itemClassName: hiddenchannelslib.disCN.tabbaritem,
									type: Internal.LibraryComponents.TabBar.Types.TOP,
									items: tabBarItems,
									onItemSelect: value => {
										for (let key in tabIns) {
											if (key == value) tabIns[key].props.open = true;
											else delete tabIns[key].props.open;
										}
										hiddenchannelslib.ReactUtils.forceUpdate(hiddenchannelslib.ObjectUtils.toArray(tabIns));
									}
								}),
								config.tabBarChildren
							].flat(10).filter(n => n)
						}));
					}
					
					if (hiddenchannelslib.ArrayUtils.is(config.buttons)) for (let button of config.buttons) {
						let contents = typeof button.contents == "string" && button.contents;
						if (contents) {
							let color = typeof button.color == "string" && Internal.LibraryComponents.Button.Colors[button.color.toUpperCase()];
							let look = typeof button.look == "string" && Internal.LibraryComponents.Button.Looks[button.look.toUpperCase()];
							let click = typeof button.click == "function" ? button.click : (typeof button.onClick == "function" ? button.onClick : _ => {});
							
							if (button.cancel) cancels.push(click);
							
							footerChildren.push(hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Button, hiddenchannelslib.ObjectUtils.exclude(Object.assign({}, button, {
								look: look || (color ? Internal.LibraryComponents.Button.Looks.FILLED : Internal.LibraryComponents.Button.Looks.LINK),
								color: color || Internal.LibraryComponents.Button.Colors.PRIMARY,
								onClick: _ => {
									if (button.close) closeModal();
									if (!(button.close && button.cancel)) click(modalInstance);
								},
								children: contents
							}), "click", "close", "cancel", "contents")));
						}
					}
					
					contentChildren = contentChildren.concat(config.contentChildren).filter(n => n && (typeof n == "string" || hiddenchannelslib.ReactUtils.isValidElement(n)));
					titleChildren = titleChildren.concat(config.titleChildren).filter(n => n && (typeof n == "string" || hiddenchannelslib.ReactUtils.isValidElement(n)));
					headerChildren = headerChildren.concat(config.headerChildren).filter(n => n && (typeof n == "string" || hiddenchannelslib.ReactUtils.isValidElement(n)));
					footerChildren = footerChildren.concat(config.footerChildren).filter(n => n && (typeof n == "string" || hiddenchannelslib.ReactUtils.isValidElement(n)));
					
					if (contentChildren.length) {
						if (typeof config.onOpen != "function") config.onOpen = _ => {};
						if (typeof config.onClose != "function") config.onClose = _ => {};
						
						let name = plugin.name || (typeof plugin.getName == "function" ? plugin.getName() : null);
						name = typeof name == "string" ? name : null;
						let oldTransitionState = 0;
						Internal.LibraryModules.ModalUtils.openModal(props => {
							modalProps = props;
							return hiddenchannelslib.ReactUtils.createElement(class hiddenchannelslib_Modal extends Internal.LibraryModules.React.Component {
								render() {
									return hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.ModalComponents.ModalRoot, {
										className: hiddenchannelslib.DOMUtils.formatClassName(name && `${name}-modal`, hiddenchannelslib.disCN.modalwrapper, config.className),
										size: typeof config.size == "string" && Internal.LibraryComponents.ModalComponents.ModalSize[config.size.toUpperCase()] || Internal.LibraryComponents.ModalComponents.ModalSize.SMALL,
										transitionState: props.transitionState,
										children: [
											hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.ModalComponents.ModalHeader, {
												className: hiddenchannelslib.DOMUtils.formatClassName(config.headerClassName, config.shade && hiddenchannelslib.disCN.modalheadershade, headerChildren.length && hiddenchannelslib.disCN.modalheaderhassibling),
												separator: config.headerSeparator || false,
												children: [
													hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Flex.Child, {
														children: [
															hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.FormComponents.FormTitle, {
																tag: Internal.LibraryComponents.FormComponents.FormTitle.Tags.H4,
																children: config.header
															}),
															hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TextElement, {
																size: Internal.LibraryComponents.TextElement.Sizes.SIZE_12,
																children: typeof config.subHeader == "string" || hiddenchannelslib.ReactUtils.isValidElement(config.subHeader) ? config.subHeader : (name || "")
															})
														]
													}),
													titleChildren,
													hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.ModalComponents.ModalCloseButton, {
														onClick: closeModal
													})
												].flat(10).filter(n => n)
											}),
											headerChildren.length ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Flex, {
												grow: 0,
												shrink: 0,
												children: headerChildren
											}) : null,
											hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.ModalComponents.ModalContent, {
												className: config.contentClassName,
												scroller: config.scroller,
												direction: config.direction,
												content: config.content,
												children: contentChildren
											}),
											footerChildren.length ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.ModalComponents.ModalFooter, {
												className: config.footerClassName,
												direction: config.footerDirection,
												children: footerChildren
											}) : null
										]
									});
								}
								componentDidMount() {
									modalInstance = this;
									if (props.transitionState == 1 && props.transitionState > oldTransitionState) config.onOpen(modalInstance);
									oldTransitionState = props.transitionState;
								}
								componentWillUnmount() {
									if (props.transitionState == 3) {
										for (let cancel of cancels) cancel(modalInstance);
										config.onClose(modalInstance);
									}
								}
							}, props, true);
						}, {
							onCloseRequest: closeModal
						});
					}
				};
				hiddenchannelslib.ModalUtils.confirm = function (plugin, text, callback) {
					if (!hiddenchannelslib.ObjectUtils.is(plugin) || typeof text != "string") return;
					hiddenchannelslib.ModalUtils.open(plugin, {
						text: text,
						header: hiddenchannelslib.LanguageUtils.LibraryStrings.confirm,
						className: hiddenchannelslib.disCN.modalconfirmmodal,
						scroller: false,
						buttons: [
							{contents: hiddenchannelslib.LanguageUtils.LanguageStrings.OKAY, close: true, color: "RED", onClick: callback},
							{contents: hiddenchannelslib.LanguageUtils.LanguageStrings.CANCEL, close: true}
						]
					});
				};
			
				const RealMenuItems = hiddenchannelslib.ModuleUtils.findByProperties("MenuItem", "MenuGroup");
				hiddenchannelslib.ContextMenuUtils = {};
				hiddenchannelslib.ContextMenuUtils.open = function (plugin, e, children) {
					Internal.LibraryModules.ContextMenuUtils.openContextMenu(e, _ => hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Menu, {
						navId: "hiddenchannelslib-context",
						onClose: Internal.LibraryModules.ContextMenuUtils.closeContextMenu,
						children: children
					}, true));
				};
				hiddenchannelslib.ContextMenuUtils.close = function (nodeOrInstance) {
					if (!hiddenchannelslib.ObjectUtils.is(nodeOrInstance)) return;
					let instance = hiddenchannelslib.ReactUtils.findOwner(nodeOrInstance, {props: "closeContextMenu", up: true});
					if (hiddenchannelslib.ObjectUtils.is(instance) && instance.props && typeof instance.props.closeContextMenu == "function") instance.props.closeContextMenu();
					else Internal.LibraryModules.ContextMenuUtils.closeContextMenu();
				};
				hiddenchannelslib.ContextMenuUtils.createItem = function (component, props = {}) {
					if (!component) return null;
					else {
						if (props.render || props.persisting || hiddenchannelslib.ObjectUtils.is(props.popoutProps) || (typeof props.color == "string" && !DiscordClasses[`menu${props.color.toLowerCase()}`])) component = Internal.MenuItem;
						if (hiddenchannelslib.ObjectUtils.toArray(RealMenuItems).some(c => c == component)) return hiddenchannelslib.ReactUtils.createElement(component, props);
						else return hiddenchannelslib.ReactUtils.createElement(RealMenuItems.MenuItem, {
							id: props.id,
							disabled: props.disabled,
							customItem: true,
							render: menuItemProps => {
								if (!props.state) props.state = hiddenchannelslib.ObjectUtils.extract(props, "checked", "value");
								return hiddenchannelslib.ReactUtils.createElement(Internal.CustomMenuItemWrapper, {
									disabled: props.disabled,
									childProps: Object.assign({}, props, menuItemProps, {color: props.color}),
									children: component
								}, true);
							}
						});
					}
				};
				hiddenchannelslib.ContextMenuUtils.createItemId = function (...strings) {
					return strings.map(s => typeof s == "number" ? s.toString() : s).filter(s => typeof s == "string").map(s => s.toLowerCase().replace(/\s/, "-")).join("-");
				};
				hiddenchannelslib.ContextMenuUtils.findItem = function (returnvalue, config) {
					if (!returnvalue || !hiddenchannelslib.ObjectUtils.is(config) || !config.label && !config.id) return [null, -1];
					config.label = config.label && [config.label].flat().filter(n => n);
					config.id = config.id && [config.id].flat().filter(n => n);
					let contextMenu = hiddenchannelslib.ReactUtils.findChild(returnvalue, {props: "navId"}) || (hiddenchannelslib.ArrayUtils.is(returnvalue) ? {props: {children: returnvalue}} : null);
					if (contextMenu) {
						for (let i in contextMenu.props.children) {
							if (contextMenu.props.children[i] && contextMenu.props.children[i].type == RealMenuItems.MenuGroup) {
								if (hiddenchannelslib.ArrayUtils.is(contextMenu.props.children[i].props.children)) {
									for (let j in contextMenu.props.children[i].props.children) if (check(contextMenu.props.children[i].props.children[j])) {
										if (config.group) return [contextMenu.props.children, parseInt(i)];
										else return [contextMenu.props.children[i].props.children, parseInt(j)];
									}
								}
								else if (contextMenu.props.children[i] && contextMenu.props.children[i].props) {
									if (check(contextMenu.props.children[i].props.children)) {
										if (config.group) return [contextMenu.props.children, parseInt(i)];
										else {
											contextMenu.props.children[i].props.children = [contextMenu.props.children[i].props.children];
											return [contextMenu.props.children[i].props.children, 0];
										}
									}
									else if (contextMenu.props.children[i].props.children && contextMenu.props.children[i].props.children.props && hiddenchannelslib.ArrayUtils.is(contextMenu.props.children[i].props.children.props.children)) {
										for (let j in contextMenu.props.children[i].props.children.props.children) if (check(contextMenu.props.children[i].props.children.props.children[j])) {
											if (config.group) return [contextMenu.props.children, parseInt(i)];
											else return [contextMenu.props.children[i].props.children.props.children, parseInt(j)];
										}
									}
								}
							}
							else if (check(contextMenu.props.children[i])) return [contextMenu.props.children, parseInt(i)];
						}
						return [contextMenu.props.children, -1];
					}
					return [null, -1];
					function check (child) {
						if (!child) return false;
						let props = child.stateNode ? child.stateNode.props : child.props;
						if (!props) return false;
						return config.id && config.id.some(key => props.id == key) || config.label && config.label.some(key => props.label == key);
					}
				};

				hiddenchannelslib.StringUtils = {};
				hiddenchannelslib.StringUtils.htmlEscape = function (string) {
					let ele = document.createElement("div");
					ele.innerText = string;
					return ele.innerHTML;
				};
				hiddenchannelslib.StringUtils.regEscape = function (string) {
					return typeof string == "string" && string.replace(/([\-\/\\\^\$\*\+\?\.\(\)\|\[\]\{\}])/g, "\\$1");
				};
				hiddenchannelslib.StringUtils.insertNRST = function (string) {
					return typeof string == "string" && string.replace(/\\r/g, "\r").replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\s/g, " ");
				};
				hiddenchannelslib.StringUtils.highlight = function (string, searchstring, prefix = `<span class="${hiddenchannelslib.disCN.highlight}">`, suffix = `</span>`) {
					if (typeof string != "string" || !searchstring || searchstring.length < 1) return string;
					let offset = 0, original = string;
					hiddenchannelslib.ArrayUtils.getAllIndexes(string.toUpperCase(), searchstring.toUpperCase()).forEach(index => {
						let d1 = offset * (prefix.length + suffix.length);
						index = index + d1;
						let d2 = index + searchstring.length;
						let d3 = [-1].concat(hiddenchannelslib.ArrayUtils.getAllIndexes(string.substring(0, index), "<"));
						let d4 = [-1].concat(hiddenchannelslib.ArrayUtils.getAllIndexes(string.substring(0, index), ">"));
						if (d3[d3.length - 1] > d4[d4.length - 1]) return;
						string = string.substring(0, index) + prefix + string.substring(index, d2) + suffix + string.substring(d2);
						offset++;
					});
					return string || original;
				};
				hiddenchannelslib.StringUtils.findMatchCaseless = function (match, string, any) {
					if (typeof match != "string" || typeof string != "string" || !match || !string) return "";
					match = hiddenchannelslib.StringUtils.regEscape(match);
					let exec = (new RegExp(any ? `([\\n\\r\\s]+${match})|(^${match})` : `([\\n\\r\\s]+${match}[\\n\\r\\s]+)|([\\n\\r\\s]+${match}$)|(^${match}[\\n\\r\\s]+)|(^${match}$)`, "i")).exec(string);
					return exec && typeof exec[0] == "string" && exec[0].replace(/[\n\r\s]/g, "") || "";
				};
				hiddenchannelslib.StringUtils.equalCase = function (match, string) {
					if (typeof match != "string" || typeof string != "string") return "";
					let first = match.charAt(0);
					return first != first.toUpperCase() ? (string.charAt(0).toLowerCase() + string.slice(1)) : first != first.toLowerCase() ? (string.charAt(0).toUpperCase() + string.slice(1)) : string;
				};
				hiddenchannelslib.StringUtils.extractSelection = function (original, selection) {
					if (typeof original != "string") return "";
					if (typeof selection != "string") return original;
					let s = [], f = [], wrong = 0, canceled = false, done = false;
					for (let i of hiddenchannelslib.ArrayUtils.getAllIndexes(original, selection[0])) if (!done) {
						while (i <= original.length && !done) {
							let subSelection = selection.slice(s.filter(n => n != undefined).length);
							if (!subSelection && s.length - 20 <= selection.length) done = true;
							else for (let j in subSelection) if (!done && !canceled) {
								if (original[i] == subSelection[j]) {
									s[i] = subSelection[j];
									f[i] = subSelection[j];
									wrong = 0;
									if (i == original.length) done = true;
								}
								else {
									s[i] = null;
									f[i] = original[i];
									wrong++;
									if (wrong > 4) {
										s = [], f = [], wrong = 0, canceled = true;
										break;
									}
								}
								break;
							}
							canceled = false;
							i++;
						}
					}
					if (s.filter(n => n).length) {
						let reverseS = [].concat(s).reverse(), i = 0, j = 0;
						for (let k in s) {
							if (s[k] == null) i = parseInt(k) + 1;
							else break;
						}
						for (let k in reverseS) {
							if (reverseS[k] == null) j = parseInt(k) + 1;
							else break;
						}
						return f.slice(i, f.length - j).join("");
					}
					else return original;
				};
				
				hiddenchannelslib.SlateUtils = {};
				hiddenchannelslib.SlateUtils.isRichValue = function (richValue) {
					return richValue && typeof richValue == "object" && hiddenchannelslib.SlateUtils.toRichValue("").constructor.prototype.isPrototypeOf(richValue);
				};
				hiddenchannelslib.SlateUtils.toTextValue = function (richValue) {
					return hiddenchannelslib.SlateUtils.isRichValue(richValue) ? Internal.LibraryModules.SlateTextUtils.toTextValue(richValue) : "";
				};
				hiddenchannelslib.SlateUtils.toRichValue = function (string) {
					return typeof string == "string" ? Internal.LibraryModules.SlateRichUtils.toRichValue(string) : null;
				};
				
				hiddenchannelslib.NumberUtils = {};
				hiddenchannelslib.NumberUtils.formatBytes = function (bytes, sigDigits) {
					bytes = parseInt(bytes);
					if (isNaN(bytes) || bytes < 0) return "0 Bytes";
					if (bytes == 1) return "1 Byte";
					let size = Math.floor(Math.log(bytes) / Math.log(1024));
					return parseFloat((bytes / Math.pow(1024, size)).toFixed(sigDigits < 1 ? 0 : sigDigits > 20 ? 20 : sigDigits || 2)) + " " + ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"][size];
				};
				hiddenchannelslib.NumberUtils.mapRange = function (from, to, value) {
					if (parseFloat(value) < parseFloat(from[0])) return parseFloat(to[0]);
					else if (parseFloat(value) > parseFloat(from[1])) return parseFloat(to[1]);
					else return parseFloat(to[0]) + (parseFloat(value) - parseFloat(from[0])) * (parseFloat(to[1]) - parseFloat(to[0])) / (parseFloat(from[1]) - parseFloat(from[0]));
				};
				hiddenchannelslib.NumberUtils.generateId = function (array) {
					array = hiddenchannelslib.ArrayUtils.is(array) ? array : [];
					let id = Math.floor(Math.random() * 10000000000000000);
					if (array.includes(id)) return hiddenchannelslib.NumberUtils.generateId(array);
					else {
						array.push(id);
						return id;
					}
				};
				hiddenchannelslib.NumberUtils.compareVersions = function (newV, oldV) {
					if (!newV || !oldV) return true;
					newV = newV.toString().replace(/["'`]/g, "").split(/,|\./g).map(n => parseInt(n)).filter(n => (n || n == 0) && !isNaN(n));
					oldV = oldV.toString().replace(/["'`]/g, "").split(/,|\./g).map(n => parseInt(n)).filter(n => (n || n == 0) && !isNaN(n));
					let length = Math.max(newV.length, oldV.length);
					if (!length) return true;
					if (newV.length > oldV.length) {
						let tempArray = new Array(newV.length - oldV.length);
						for (let i = 0; i < tempArray.length; i++) tempArray[i] = 0;
						oldV = tempArray.concat(oldV);
					}
					else if (newV.length < oldV.length) {
						let tempArray = new Array(oldV.length - newV.length);
						for (let i = 0; i < tempArray.length; i++) tempArray[i] = 0;
						newV = tempArray.concat(newV);
					}
					for (let i = 0; i < length; i++) for (let iOutdated = false, j = 0; j <= i; j++) {
						if (j == i && newV[j] < oldV[j]) return false;
						if (j < i) iOutdated = newV[j] == oldV[j];
						if ((j == 0 || iOutdated) && j == i && newV[j] > oldV[j]) return true;
					}
					return false;
				};
				hiddenchannelslib.NumberUtils.getVersionDifference = function (newV, oldV) {
					if (!newV || !oldV) return false;
					newV = newV.toString().replace(/["'`]/g, "").split(/,|\./g).map(n => parseInt(n)).filter(n => (n || n == 0) && !isNaN(n));
					oldV = oldV.toString().replace(/["'`]/g, "").split(/,|\./g).map(n => parseInt(n)).filter(n => (n || n == 0) && !isNaN(n));
					let length = Math.max(newV.length, oldV.length);
					if (!length) return false;
					if (newV.length > oldV.length) {
						let tempArray = new Array(newV.length - oldV.length);
						for (let i = 0; i < tempArray.length; i++) tempArray[i] = 0;
						oldV = tempArray.concat(oldV);
					}
					else if (newV.length < oldV.length) {
						let tempArray = new Array(oldV.length - newV.length);
						for (let i = 0; i < tempArray.length; i++) tempArray[i] = 0;
						newV = tempArray.concat(newV);
					}
					let oldValue = 0, newValue = 0;
					for (let i in oldV.reverse()) oldValue += (oldV[i] * (10 ** i));
					for (let i in newV.reverse()) newValue += (newV[i] * (10 ** i));
					return (newValue - oldValue) / (10 ** (length-1));
				};

				hiddenchannelslib.DiscordUtils = {};
				hiddenchannelslib.DiscordUtils.openLink = function (url, config = {}) {
					if ((config.inBuilt || config.inBuilt === undefined && Internal.settings.general.useChromium) && Internal.LibraryRequires.electron && Internal.LibraryRequires.electron.remote) {
						let browserWindow = new Internal.LibraryRequires.electron.remote.BrowserWindow({
							frame: true,
							resizeable: true,
							show: true,
							darkTheme: hiddenchannelslib.DiscordUtils.getTheme() == hiddenchannelslib.disCN.themedark,
							webPreferences: {
								nodeIntegration: false,
								nodeIntegrationInWorker: false
							}
						});
						browserWindow.setMenu(null);
						browserWindow.loadURL(url);
						if (config.minimized) browserWindow.minimize(null);
					}
					else window.open(url, "_blank");
				};
				window.DiscordNative && window.DiscordNative.app && window.DiscordNative.app.getPath("appData").then(path => {hiddenchannelslib.DiscordUtils.getFolder.base = path;});
				hiddenchannelslib.DiscordUtils.getFolder = function () {
					if (!hiddenchannelslib.DiscordUtils.getFolder.base) return "";
					else if (hiddenchannelslib.DiscordUtils.getFolder.folder) return hiddenchannelslib.DiscordUtils.getFolder.folder;
					else {
						let folder;
						try {
							let build = hiddenchannelslib.DiscordUtils.getBuild();
							build = "discord" + (build == "stable" ? "" : build);
							folder = Internal.LibraryRequires.path.resolve(hiddenchannelslib.DiscordUtils.getFolder.base, build, hiddenchannelslib.DiscordUtils.getVersion());
						} 
						catch (err) {folder = hiddenchannelslib.DiscordUtils.getFolder.base;}
						return hiddenchannelslib.DiscordUtils.getFolder.folder = folder;
					}
				};
				hiddenchannelslib.DiscordUtils.getBuild = function () {
					if (hiddenchannelslib.DiscordUtils.getBuild.build) return hiddenchannelslib.DiscordUtils.getBuild.build;
					else {
						let build;
						try {build = window.DiscordNative.app.getReleaseChannel();}
						catch (err) {
							let version = hiddenchannelslib.DiscordUtils.getVersion();
							if (version) {
								version = version.split(".");
								if (version.length == 3 && !isNaN(version = parseInt(version[2]))) build = version > 300 ? "stable" : version > 200 ? "canary" : "ptb";
								else build = "stable";
							}
							else build = "stable";
						}
						return hiddenchannelslib.DiscordUtils.getBuild.build = build;
					}
				};
				hiddenchannelslib.DiscordUtils.getVersion = function () {
					if (hiddenchannelslib.DiscordUtils.getVersion.version) return hiddenchannelslib.DiscordUtils.getVersion.version;
					else {
						let version;
						try {version = window.DiscordNative.app.getVersion();}
						catch (err) {version = "999.999.9999";}
						return hiddenchannelslib.DiscordUtils.getVersion.version = version;
					}
				};
				hiddenchannelslib.DiscordUtils.getTheme = function () {
					return hiddenchannelslib.LibraryModules.ThemeSettingsStore.theme != "dark" ? hiddenchannelslib.disCN.themelight : hiddenchannelslib.disCN.themedark;
				};
				hiddenchannelslib.DiscordUtils.getZoomFactor = function () {
					let aRects = hiddenchannelslib.DOMUtils.getRects(document.querySelector(hiddenchannelslib.dotCN.appmount));
					let widthZoom = Math.round(100 * window.outerWidth / aRects.width);
					let heightZoom = Math.round(100 * window.outerHeight / aRects.height);
					return widthZoom < heightZoom ? widthZoom : heightZoom;
				};
				hiddenchannelslib.DiscordUtils.getFontScale = function () {
					return parseInt(document.firstElementChild.style.fontSize.replace("%", ""));
				};
				hiddenchannelslib.DiscordUtils.shake = function () {
					hiddenchannelslib.ReactUtils.findOwner(document.querySelector(hiddenchannelslib.dotCN.appcontainer), {name: "Shakeable", unlimited: true, up: true}).shake();
				};
				hiddenchannelslib.DiscordUtils.rerenderAll = function (instant) {
					hiddenchannelslib.TimeUtils.clear(hiddenchannelslib.DiscordUtils.rerenderAll.timeout);
					hiddenchannelslib.DiscordUtils.rerenderAll.timeout = hiddenchannelslib.TimeUtils.timeout(_ => {
						let ShakeableIns = hiddenchannelslib.ReactUtils.findOwner(document.querySelector(hiddenchannelslib.dotCN.appcontainer), {name: "Shakeable", unlimited: true, up: true});
						let ShakeablePrototype = hiddenchannelslib.ObjectUtils.get(ShakeableIns, `${hiddenchannelslib.ReactUtils.instanceKey}.type.prototype`);
						if (ShakeableIns && ShakeablePrototype) {
							let parentSelector = "", notices = document.querySelector("#bd-notices");
							if (notices) {
								let parentClasses = []
								for (let i = 0, parent = notices.parentElement; i < 3; i++, parent = parent.parentElement) parentClasses.push(parent.className);
								parentSelector = parentClasses.reverse().map(n => !n ? "*" : `.${n.split(" ").join(".")}`).join(" > ");
							}
							hiddenchannelslib.PatchUtils.patch({name: "hiddenchannelslib DiscordUtils"}, ShakeablePrototype, "render", {after: e => {
								e.returnValue.props.children = typeof e.returnValue.props.children == "function" ? (_ => {return null;}) : [];
								hiddenchannelslib.ReactUtils.forceUpdate(ShakeableIns);
								if (parentSelector) hiddenchannelslib.TimeUtils.timeout(_ => {
									if (!document.contains(notices)) {
										let parent = document.querySelector(parentSelector) || document.querySelector(hiddenchannelslib.dotCN.app).parentElement;
										if (parent) parent.insertBefore(notices, parent.firstElementChild);
									}
								}, 1000);
							}}, {once: true});
							hiddenchannelslib.ReactUtils.forceUpdate(ShakeableIns);
						}
					}, instant ? 0 : 1000);
				};

				hiddenchannelslib.WindowUtils = {};
				hiddenchannelslib.WindowUtils.open = function (plugin, url, config = {}) {
					plugin = plugin == hiddenchannelslib && Internal || plugin;
					if (!hiddenchannelslib.ObjectUtils.is(plugin) || !url || !Internal.LibraryRequires.electron || !Internal.LibraryRequires.electron.remote) return;
					if (!hiddenchannelslib.ArrayUtils.is(plugin.browserWindows)) plugin.browserWindows = [];
					config = Object.assign({
						show: false,
						webPreferences: {
							nodeIntegration: true,
							nodeIntegrationInWorker: true
						}
					}, config);
					let browserWindow = new Internal.LibraryRequires.electron.remote.BrowserWindow(hiddenchannelslib.ObjectUtils.exclude(config, "showOnReady", "onLoad"));
					
					if (!config.show && config.showOnReady) browserWindow.once("ready-to-show", browserWindow.show);
					if (config.devTools) browserWindow.openDevTools();
					if (typeof config.onLoad == "function") browserWindow.webContents.on("did-finish-load", (...args) => {config.onLoad(...args);});
					if (typeof config.onClose == "function") browserWindow.once("closed", (...args) => {config.onClose(...args);});
					
					if (typeof browserWindow.removeMenu == "function") browserWindow.removeMenu();
					else browserWindow.setMenu(null);
					browserWindow.loadURL(url);
					browserWindow.executeJavaScriptSafe = js => {if (!browserWindow.isDestroyed()) browserWindow.webContents.executeJavaScript(`(_ => {${js}})();`);};
					plugin.browserWindows.push(browserWindow);
					return browserWindow;
				};
				hiddenchannelslib.WindowUtils.close = function (browserWindow) {
					if (hiddenchannelslib.ObjectUtils.is(browserWindow) && !browserWindow.isDestroyed() && browserWindow.isClosable()) browserWindow.close();
				};
				hiddenchannelslib.WindowUtils.closeAll = function (plugin) {
					plugin = plugin == hiddenchannelslib && Internal || plugin;
					if (!hiddenchannelslib.ObjectUtils.is(plugin) || !hiddenchannelslib.ArrayUtils.is(plugin.browserWindows)) return;
					while (plugin.browserWindows.length) hiddenchannelslib.WindowUtils.close(plugin.browserWindows.pop());
				};
				hiddenchannelslib.WindowUtils.addListener = function (plugin, actions, callback) {
					plugin = plugin == hiddenchannelslib && Internal || plugin;
					if (!hiddenchannelslib.ObjectUtils.is(plugin) || !actions || typeof callback != "function") return;
					hiddenchannelslib.WindowUtils.removeListener(plugin, actions);
					for (let action of actions.split(" ")) {
						action = action.split(".");
						let eventName = action.shift();
						if (!eventName) return;
						let namespace = (action.join(".") || "") + plugin.name;
						if (!hiddenchannelslib.ArrayUtils.is(plugin.ipcListeners)) plugin.ipcListeners = [];

						plugin.ipcListeners.push({eventName, namespace, callback});
						Internal.LibraryRequires.electron.ipcRenderer.on(eventName, callback);
					}
				};
				hiddenchannelslib.WindowUtils.removeListener = function (plugin, actions = "") {
					plugin = plugin == hiddenchannelslib && Internal || plugin;
					if (!hiddenchannelslib.ObjectUtils.is(plugin) || !hiddenchannelslib.ArrayUtils.is(plugin.ipcListeners)) return;
					if (actions) {
						for (let action of actions.split(" ")) {
							action = action.split(".");
							let eventName = action.shift();
							let namespace = (action.join(".") || "") + plugin.name;
							for (let listener of plugin.ipcListeners) {
								let removedListeners = [];
								if (listener.eventName == eventName && listener.namespace == namespace) {
									Internal.LibraryRequires.electron.ipcRenderer.off(listener.eventName, listener.callback);
									removedListeners.push(listener);
								}
								if (removedListeners.length) plugin.ipcListeners = plugin.ipcListeners.filter(listener => {return removedListeners.indexOf(listener) < 0;});
							}
						}
					}
					else {
						for (let listener of plugin.ipcListeners) Internal.LibraryRequires.electron.ipcRenderer.off(listener.eventName, listener.callback);
						plugin.ipcListeners = [];
					}
				};
				
				const DiscordClassModules = Object.assign({}, InternalData.CustomClassModules);
				Internal.DiscordClassModules = new Proxy(DiscordClassModules, {
					get: function (_, item) {
						if (DiscordClassModules[item]) return DiscordClassModules[item];
						if (!InternalData.DiscordClassModules[item]) return;
						DiscordClassModules[item] = hiddenchannelslib.ModuleUtils.findStringObject(InternalData.DiscordClassModules[item].props, Object.assign({}, InternalData.DiscordClassModules[item]));
						return DiscordClassModules[item] ? DiscordClassModules[item] : undefined;
					}
				});
				hiddenchannelslib.DiscordClassModules = Internal.DiscordClassModules;
				for (let item in InternalData.DiscordClassModules) if (!DiscordClassModules[item]) DiscordClassModules[item] = undefined;
				
				const DiscordClasses = Object.assign({}, InternalData.DiscordClasses);
				hiddenchannelslib.DiscordClasses = Object.assign({}, DiscordClasses);
				Internal.getDiscordClass = function (item, selector) {
					let className, fallbackClassName;
					className = fallbackClassName = Internal.DiscordClassModules.hiddenchannelslib.hiddenchannelslibundefined + "-" + Internal.generateClassId();
					if (DiscordClasses[item] === undefined) {
						hiddenchannelslib.LogUtils.warn([item, "not found in DiscordClasses"]);
						return className;
					} 
					else if (!hiddenchannelslib.ArrayUtils.is(DiscordClasses[item]) || DiscordClasses[item].length != 2) {
						hiddenchannelslib.LogUtils.warn([item, "is not an Array of Length 2 in DiscordClasses"]);
						return className;
					}
					else if (Internal.DiscordClassModules[DiscordClasses[item][0]] === undefined) {
						hiddenchannelslib.LogUtils.warn([DiscordClasses[item][0], "not found in DiscordClassModules"]);
						return className;
					}
					else if ([DiscordClasses[item][1]].flat().every(prop => Internal.DiscordClassModules[DiscordClasses[item][0]][prop] === undefined)) {
						hiddenchannelslib.LogUtils.warn([DiscordClasses[item][1], "not found in", DiscordClasses[item][0], "in DiscordClassModules"]);
						return className;
					}
					else {
						for (let prop of [DiscordClasses[item][1]].flat()) {
							className = Internal.DiscordClassModules[DiscordClasses[item][0]][prop];
							if (className) break;
							else className = fallbackClassName;
						}
						if (selector) {
							className = className.split(" ").filter(n => n.indexOf("da-") != 0).join(selector ? "." : " ");
							className = className || fallbackClassName;
						}
						return hiddenchannelslib.ArrayUtils.removeCopies(className.split(" ")).join(" ") || fallbackClassName;
					}
				};
				const generationChars = "0123456789ABCDEFGHIJKMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_".split("");
				Internal.generateClassId = function () {
					let id = "";
					while (id.length < 6) id += generationChars[Math.floor(Math.random() * generationChars.length)];
					return id;
				};
				hiddenchannelslib.disCN = new Proxy({}, {
					get: function (list, item) {
						return Internal.getDiscordClass(item, false).replace("#", "");
					}
				});
				hiddenchannelslib.disCNS = new Proxy({}, {
					get: function (list, item) {
						return Internal.getDiscordClass(item, false).replace("#", "") + " ";
					}
				});
				hiddenchannelslib.disCNC = new Proxy({}, {
					get: function (list, item) {
						return Internal.getDiscordClass(item, false).replace("#", "") + ",";
					}
				});
				hiddenchannelslib.dotCN = new Proxy({}, {
					get: function (list, item) {
						let className = Internal.getDiscordClass(item, true);
						return (className.indexOf("#") == 0 ? "" : ".") + className;
					}
				});
				hiddenchannelslib.dotCNS = new Proxy({}, {
					get: function (list, item) {
						let className = Internal.getDiscordClass(item, true);
						return (className.indexOf("#") == 0 ? "" : ".") + className + " ";
					}
				});
				hiddenchannelslib.dotCNC = new Proxy({}, {
					get: function (list, item) {
						let className = Internal.getDiscordClass(item, true);
						return (className.indexOf("#") == 0 ? "" : ".") + className + ",";
					}
				});
				hiddenchannelslib.notCN = new Proxy({}, {
					get: function (list, item) {
						return `:not(.${Internal.getDiscordClass(item, true).split(".")[0]})`;
					}
				});
				hiddenchannelslib.notCNS = new Proxy({}, {
					get: function (list, item) {
						return `:not(.${Internal.getDiscordClass(item, true).split(".")[0]}) `;
					}
				});
				hiddenchannelslib.notCNC = new Proxy({}, {
					get: function (list, item) {
						return `:not(.${Internal.getDiscordClass(item, true).split(".")[0]}),`;
					}
				});
			
				const LanguageStrings = Internal.LibraryModules.LanguageStore && Internal.LibraryModules.LanguageStore._proxyContext ? Object.assign({}, Internal.LibraryModules.LanguageStore._proxyContext.defaultMessages) : {};
				const LibraryStrings = Object.assign({}, InternalData.LibraryStrings);
				hiddenchannelslib.LanguageUtils = {};
				hiddenchannelslib.LanguageUtils.languages = Object.assign({}, InternalData.Languages);
				hiddenchannelslib.LanguageUtils.getLanguage = function () {
					let lang = Internal.LibraryModules.LanguageStore.chosenLocale || Internal.LibraryModules.LanguageStore._chosenLocale || hiddenchannelslib.DiscordUtils.getSettings("locale") || "en";
					if (lang == "en-GB" || lang == "en-US") lang = "en";
					let langIds = lang.split("-");
					let langId = langIds[0];
					let langId2 = langIds[1] || "";
					lang = langId2 && langId.toUpperCase() !== langId2.toUpperCase() ? langId + "-" + langId2 : langId;
					return hiddenchannelslib.LanguageUtils.languages[lang] || hiddenchannelslib.LanguageUtils.languages[langId] || hiddenchannelslib.LanguageUtils.languages.en;
				};
				hiddenchannelslib.LanguageUtils.getName = function (language) {
					if (!language || typeof language.name != "string") return "";
					if (language.name.startsWith("Discord")) return language.name.slice(0, -1) + (language.ownlang && (hiddenchannelslib.LanguageUtils.languages[language.id] || {}).name != language.ownlang ? ` / ${language.ownlang}` : "") + ")";
					else return language.name + (language.ownlang && language.name != language.ownlang ? ` / ${language.ownlang}` : "");
				};
				hiddenchannelslib.LanguageUtils.LanguageStrings = new Proxy(LanguageStrings, {
					get: function (list, item) {
						let stringObj = Internal.LibraryModules.LanguageStore.Messages[item];
						if (!stringObj) hiddenchannelslib.LogUtils.warn([item, "not found in hiddenchannelslib.LanguageUtils.LanguageStrings"]);
						else {
							if (stringObj && typeof stringObj == "object" && typeof stringObj.format == "function") return hiddenchannelslib.LanguageUtils.LanguageStringsFormat(item);
							else return stringObj;
						}
						return "";
					}
				});
				hiddenchannelslib.LanguageUtils.LanguageStringsCheck = new Proxy(LanguageStrings, {
					get: function (list, item) {
						return !!Internal.LibraryModules.LanguageStore.Messages[item];
					}
				});
				let parseLanguageStringObj = obj => {
					let string = "";
					if (typeof obj == "string") string += obj;
					else if (hiddenchannelslib.ObjectUtils.is(obj)) {
						if (obj.content) string += parseLanguageStringObj(obj.content);
						else if (obj.children) string += parseLanguageStringObj(obj.children);
						else if (obj.props) string += parseLanguageStringObj(obj.props);
					}
					else if (hiddenchannelslib.ArrayUtils.is(obj)) for (let ele of obj) string += parseLanguageStringObj(ele);
					return string;
				};
				hiddenchannelslib.LanguageUtils.LanguageStringsFormat = function (item, ...values) {
					if (item) {
						let stringObj = Internal.LibraryModules.LanguageStore.Messages[item];
						if (stringObj && typeof stringObj == "object" && typeof stringObj.format == "function") {
							let i = 0, returnvalue, formatVars = {};
							while (!returnvalue && i < 10) {
								i++;
								try {returnvalue = stringObj.format(formatVars, false);}
								catch (err) {
									returnvalue = null;
									let value = values.shift();
									formatVars[err.toString().split("for: ")[1]] = value != null ? (value === 0 ? "0" : value) : "undefined";
									if (stringObj.intMessage) {
										try {for (let hook of stringObj.intMessage.format(formatVars).match(/\([^\(\)]+\)/gi)) formatVars[hook.replace(/[\(\)]/g, "")] = n => n;}
										catch (err2) {}
									}
								}
							}
							if (returnvalue) return parseLanguageStringObj(returnvalue);
							else {
								hiddenchannelslib.LogUtils.warn([item, "failed to format string in hiddenchannelslib.LanguageUtils.LanguageStrings"]);
								return "";
							}
						}
						else return hiddenchannelslib.LanguageUtils.LanguageStrings[item];
					}
					else hiddenchannelslib.LogUtils.warn([item, "enter a valid key to format the string in hiddenchannelslib.LanguageUtils.LanguageStrings"]);
					return "";
				};
				hiddenchannelslib.LanguageUtils.LibraryStrings = new Proxy(LibraryStrings.default || {}, {
					get: function (list, item) {
						let languageId = hiddenchannelslib.LanguageUtils.getLanguage().id;
						if (LibraryStrings[languageId] && LibraryStrings[languageId][item]) return LibraryStrings[languageId][item];
						else if (LibraryStrings.default[item]) return LibraryStrings.default[item];
						else hiddenchannelslib.LogUtils.warn([item, "not found in hiddenchannelslib.LanguageUtils.LibraryStrings"]);
						return "";
					}
				});
				hiddenchannelslib.LanguageUtils.LibraryStringsCheck = new Proxy(LanguageStrings, {
					get: function (list, item) {
						return !!LibraryStrings.default[item];
					}
				});
				hiddenchannelslib.LanguageUtils.LibraryStringsFormat = function (item, ...values) {
					if (item) {
						let languageId = hiddenchannelslib.LanguageUtils.getLanguage().id, string = null;
						if (LibraryStrings[languageId] && LibraryStrings[languageId][item]) string = LibraryStrings[languageId][item];
						else if (LibraryStrings.default[item]) string = LibraryStrings.default[item];
						if (string) {
							for (let i = 0; i < values.length; i++) if (typeof values[i] == "string" || typeof values[i] == "number") string = string.replace(new RegExp(`{{var${i}}}`, "g"), values[i]);
							return string;
						}
						else hiddenchannelslib.LogUtils.warn([item, "not found in hiddenchannelslib.LanguageUtils.LibraryStrings"]);
					}
					else hiddenchannelslib.LogUtils.warn([item, "enter a valid key to format the string in hiddenchannelslib.LanguageUtils.LibraryStrings"]);
					return "";
				};
				hiddenchannelslib.TimeUtils.interval(interval => {
					if (Internal.LibraryModules.LanguageStore.chosenLocale || Internal.LibraryModules.LanguageStore._chosenLocale || hiddenchannelslib.DiscordUtils.getSettings("locale")) {
						hiddenchannelslib.TimeUtils.clear(interval);
						let language = hiddenchannelslib.LanguageUtils.getLanguage();
						if (language) hiddenchannelslib.LanguageUtils.languages.$discord = Object.assign({}, language, {name: `Discord (${language.name})`});
					}
				}, 100);
				for (let key in hiddenchannelslib.LanguageUtils.languages) try {
					if (new Date(0).toLocaleString(key, {second: 'numeric'}) != "0") {
						hiddenchannelslib.LanguageUtils.languages[key].numberMap = {};
						for (let i = 0; i < 10; i++) hiddenchannelslib.LanguageUtils.languages[key].numberMap[i] = new Date(i*1000).toLocaleString(key, {second: 'numeric'});
					}
				}
				catch (err) {}
				
				const reactInitialized = Internal.LibraryModules.React && Internal.LibraryModules.React.Component;
				Internal.setDefaultProps = function (component, defaultProps) {
					if (hiddenchannelslib.ObjectUtils.is(component)) component.defaultProps = Object.assign({}, component.defaultProps, defaultProps);
				};
				let openedItem;
				Internal.MenuItem = reactInitialized && class hiddenchannelslib_MenuItem extends Internal.LibraryModules.React.Component {
					constructor(props) {
						super(props);
						this.state = {hovered: false};
					}
					componentWillUnmount() {
						if (openedItem == this.props.id) openedItem = null;
					}
					render() {
						let color = (typeof this.props.color == "string" ? this.props.color : Internal.LibraryComponents.MenuItems.Colors.DEFAULT).toLowerCase();
						let isCustomColor = false;
						if (color) {
							if (DiscordClasses[`menu${color}`]) color = color;
							else if (hiddenchannelslib.ColorUtils.getType(color)) {
								isCustomColor = true;
								color = hiddenchannelslib.ColorUtils.convert(color, "RGBA");
							}
							else color = (Internal.LibraryComponents.MenuItems.Colors.DEFAULT || "").toLowerCase();
						}
						let renderPopout, onClose, hasPopout = hiddenchannelslib.ObjectUtils.is(this.props.popoutProps);
						if (hasPopout) {
							renderPopout = instance => {
								openedItem = this.props.id;
								return typeof this.props.popoutProps.renderPopout == "function" && this.props.popoutProps.renderPopout(instance);
							};
							onClose = instance => {
								openedItem = null;
								typeof this.props.popoutProps.onClose == "function" && this.props.popoutProps.onClose(instance);
							};
						}
						let focused = !openedItem ? this.props.isFocused : openedItem == this.props.id;
						let themeDark = hiddenchannelslib.DiscordUtils.getTheme() == hiddenchannelslib.disCN.themedark;
						let item = hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Clickable, Object.assign({
							className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.menuitem, (this.props.label || this.props.subtext) && hiddenchannelslib.disCN.menulabelcontainer, color && (isCustomColor ? hiddenchannelslib.disCN.menucolorcustom : hiddenchannelslib.disCN[`menu${color}`]), this.props.disabled && hiddenchannelslib.disCN.menudisabled, focused && hiddenchannelslib.disCN.menufocused),
							style: {
								color: isCustomColor ? ((focused || this.state.hovered) ? (hiddenchannelslib.ColorUtils.isBright(color) ? "#000000" : "#ffffff") : color) : (this.state.hovered ? "#ffffff" : null),
								background: isCustomColor && (focused || this.state.hovered) && color
							},
							onClick: this.props.disabled ? null : e => {
								if (!this.props.action) return false;
								!this.props.persisting && !hasPopout && this.props.onClose && this.props.onClose();
								this.props.action(e, this);
							},
							onMouseEnter: this.props.disabled ? null : e => {
								if (typeof this.props.onMouseEnter == "function") this.props.onMouseEnter(e, this);
								this.setState({hovered: true});
							},
							onMouseLeave: this.props.disabled ? null : e => {
								if (typeof this.props.onMouseLeave == "function") this.props.onMouseLeave(e, this);
								this.setState({hovered: false});
							},
							"aria-disabled": this.props.disabled,
							children: [
								this.props.icon && this.props.showIconFirst && hiddenchannelslib.ReactUtils.createElement("div", {
									className: hiddenchannelslib.disCN.menuiconcontainerleft,
									children: hiddenchannelslib.ReactUtils.createElement(this.props.icon, {
										className: hiddenchannelslib.disCN.menuicon
									})
								}),
								typeof this.props.render == "function" ? this.props.render(this) : this.props.render,
								(this.props.label || this.props.subtext) && hiddenchannelslib.ReactUtils.createElement("div", {
									className: hiddenchannelslib.disCN.menulabel,
									children: [
										typeof this.props.label == "function" ? this.props.label(this) : this.props.label,
										this.props.subtext && hiddenchannelslib.ReactUtils.createElement("div", {
											className: hiddenchannelslib.disCN.menusubtext,
											children: typeof this.props.subtext == "function" ? this.props.subtext(this) : this.props.subtext
										})
									].filter(n => n)
								}),
								this.props.hint && hiddenchannelslib.ReactUtils.createElement("div", {
									className: hiddenchannelslib.disCN.menuhintcontainer,
									children: typeof this.props.hint == "function" ? this.props.hint(this) : this.props.hint
								}),
								this.props.icon && !this.props.showIconFirst && hiddenchannelslib.ReactUtils.createElement("div", {
									className: hiddenchannelslib.disCN.menuiconcontainer,
									children: hiddenchannelslib.ReactUtils.createElement(this.props.icon, {
										className: hiddenchannelslib.disCN.menuicon
									})
								}),
								this.props.input && hiddenchannelslib.ReactUtils.createElement("div", {
									className: hiddenchannelslib.disCN.menuiconcontainer,
									children: this.props.input
								}),
								this.props.imageUrl && hiddenchannelslib.ReactUtils.createElement("div", {
									className: hiddenchannelslib.disCN.menuimagecontainer,
									children: hiddenchannelslib.ReactUtils.createElement("img", {
										className: hiddenchannelslib.disCN.menuimage,
										src: typeof this.props.imageUrl == "function" ? this.props.imageUrl(this) : this.props.imageUrl,
										alt: ""
									})
								})
							].filter(n => n)
						}, this.props.menuItemProps, {isFocused: focused}));
						return hasPopout ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.PopoutContainer, Object.assign({}, this.props.popoutProps, {
							children: item,
							renderPopout: renderPopout,
							onClose: onClose
						})) : item;
					}
				};
				Internal.CustomMenuItemWrapper = reactInitialized && class hiddenchannelslib_CustomMenuItemWrapper extends Internal.LibraryModules.React.Component {
					constructor(props) {
						super(props);
						this.state = {hovered: false};
					}
					render() {
						let isItem = this.props.children == Internal.MenuItem;
						let item = hiddenchannelslib.ReactUtils.createElement(this.props.children, Object.assign({}, this.props.childProps, {
							onMouseEnter: isItem ? e => {
								if (this.props.childProps && typeof this.props.childProps.onMouseEnter == "function") this.props.childProps.onMouseEnter(e, this);
								this.setState({hovered: true});
							} : this.props.childProps && this.props.childProps.onMouseEnter,
							onMouseLeave: isItem ? e => {
								if (this.props.childProps && typeof this.props.childProps.onMouseLeave == "function") this.props.childProps.onMouseLeave(e, this);
								this.setState({hovered: false});
							} : this.props.childProps && this.props.childProps.onMouseLeave,
							isFocused: this.state.hovered && !this.props.disabled
						}));
						return isItem ? item : hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Clickable, {
							onMouseEnter: e => this.setState({hovered: true}),
							onMouseLeave: e => this.setState({hovered: false}),
							children: item
						});
					}
				};
				Internal.ErrorBoundary = reactInitialized && class hiddenchannelslib_ErrorBoundary extends Internal.LibraryModules.React.PureComponent {
					constructor(props) {
						super(props);
						this.state = {hasError: false};
					}
					static getDerivedStateFromError(err) {
						return {hasError: true};
					}
					componentDidCatch(err, info) {
						hiddenchannelslib.LogUtils.error(["Could not create React Element!", err]);
					}
					render() {
						if (this.state.hasError) return Internal.LibraryModules.React.createElement("span", {
							style: {
								background: hiddenchannelslib.DiscordConstants && hiddenchannelslib.DiscordConstants.Colors && hiddenchannelslib.DiscordConstants.Colors.PRIMARY_DARK,
								borderRadius: 5,
								color: hiddenchannelslib.DiscordConstants && hiddenchannelslib.DiscordConstants.Colors && hiddenchannelslib.DiscordConstants.Colors.STATUS_RED,
								fontSize: 12,
								fontWeight: 600,
								padding: 6,
								textAlign: "center",
								verticalAlign: "center"
							},
							children: "React Component Error"
						});
						return this.props.children;
					}
				};
				
				const loadComponents = _ => {
					const CustomComponents = {};
					
					CustomComponents.AutoFocusCatcher = reactInitialized && class hiddenchannelslib_AutoFocusCatcher extends Internal.LibraryModules.React.Component {
						render() {
							const style = {padding: 0, margin: 0, border: "none", width: 0, maxWidth: 0, height: 0, maxHeight: 0, visibility: "hidden"};
							return hiddenchannelslib.ReactUtils.forceStyle(hiddenchannelslib.ReactUtils.createElement("input", {style}), Object.keys(style));
						}
					};
					
					CustomComponents.BadgeAnimationContainer = reactInitialized && class hiddenchannelslib_BadgeAnimationContainer extends Internal.LibraryModules.React.Component {
						componentDidMount() {hiddenchannelslib.ReactUtils.forceUpdate(this);}
						componentWillAppear(e) {if (typeof e == "function") e();}
						componentWillEnter(e) {if (typeof e == "function") e();}
						componentWillLeave(e) {if (typeof e == "function") this.timeoutId = setTimeout(e, 300);}
						componentWillUnmount() {hiddenchannelslib.TimeUtils.clear(this.timeoutId)}
						render() {
							return hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Animations.animated.div, {
								className: this.props.className,
								style: this.props.animatedStyle,
								children: this.props.children
							});
						}
					};
					
					CustomComponents.Badges = {};
					CustomComponents.Badges.getBadgePaddingForValue = function (count) {
						switch (count) {
							case 1:
							case 4:
							case 6:
								return 1;
							default:
								return 0;
						}
					};
					CustomComponents.Badges.IconBadge = reactInitialized && class hiddenchannelslib_IconBadge extends Internal.LibraryModules.React.Component {
						render() {
							return hiddenchannelslib.ReactUtils.createElement("div", {
								className: hiddenchannelslib.DOMUtils.formatClassName(this.props.className, hiddenchannelslib.disCN.badgeiconbadge, this.props.shape && Internal.LibraryComponents.Badges.BadgeShapes[this.props.shape] || Internal.LibraryComponents.Badges.BadgeShapes.ROUND),
								style: Object.assign({
									backgroundColor: this.props.disableColor ? null : (this.props.color || hiddenchannelslib.DiscordConstants.Colors.STATUS_RED)
								}, this.props.style),
								children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SvgIcon, {
									className: hiddenchannelslib.disCN.badgeicon,
									name: this.props.icon
								})
							});
						}
					};
					CustomComponents.Badges.NumberBadge = reactInitialized && class hiddenchannelslib_NumberBadge extends Internal.LibraryModules.React.Component {
						handleClick(e) {if (typeof this.props.onClick == "function") this.props.onClick(e, this);}
						handleContextMenu(e) {if (typeof this.props.onContextMenu == "function") this.props.onContextMenu(e, this);}
						handleMouseEnter(e) {if (typeof this.props.onMouseEnter == "function") this.props.onMouseEnter(e, this);}
						handleMouseLeave(e) {if (typeof this.props.onMouseLeave == "function") this.props.onMouseLeave(e, this);}
						render() {
							return hiddenchannelslib.ReactUtils.createElement("div", {
								className: hiddenchannelslib.DOMUtils.formatClassName(this.props.className, hiddenchannelslib.disCN.badgenumberbadge, this.props.shape && Internal.LibraryComponents.Badges.BadgeShapes[this.props.shape] || Internal.LibraryComponents.Badges.BadgeShapes.ROUND),
								style: Object.assign({
									backgroundColor: !this.props.disableColor && (this.props.color || hiddenchannelslib.DiscordConstants.Colors.STATUS_RED),
									width: Internal.LibraryComponents.Badges.getBadgeWidthForValue(this.props.count),
									paddingRight: Internal.LibraryComponents.Badges.getBadgePaddingForValue(this.props.count)
								}, this.props.style),
								onClick: this.handleClick.bind(this),
								onContextMenu: this.handleContextMenu.bind(this),
								onMouseEnter: this.handleMouseEnter.bind(this),
								onMouseLeave: this.handleMouseLeave.bind(this),
								children: Internal.LibraryComponents.Badges.getBadgeCountString(this.props.count)
							});
						}
					};
					
					CustomComponents.BotTag = reactInitialized && class hiddenchannelslib_BotTag extends Internal.LibraryModules.React.Component {
						handleClick(e) {if (typeof this.props.onClick == "function") this.props.onClick(e, this);}
						handleContextMenu(e) {if (typeof this.props.onContextMenu == "function") this.props.onContextMenu(e, this);}
						handleMouseEnter(e) {if (typeof this.props.onMouseEnter == "function") this.props.onMouseEnter(e, this);}
						handleMouseLeave(e) {if (typeof this.props.onMouseLeave == "function") this.props.onMouseLeave(e, this);}
						render() {
							return hiddenchannelslib.ReactUtils.createElement("span", {
								className: hiddenchannelslib.DOMUtils.formatClassName(this.props.className, this.props.invertColor ? hiddenchannelslib.disCN.bottaginvert : hiddenchannelslib.disCN.bottagregular, this.props.useRemSizes ? hiddenchannelslib.disCN.bottagrem : hiddenchannelslib.disCN.bottagpx),
								style: this.props.style,
								onClick: this.handleClick.bind(this),
								onContextMenu: this.handleContextMenu.bind(this),
								onMouseEnter: this.handleMouseEnter.bind(this),
								onMouseLeave: this.handleMouseLeave.bind(this),
								children: hiddenchannelslib.ReactUtils.createElement("span", {
									className: hiddenchannelslib.disCN.bottagtext,
									children: this.props.tag || hiddenchannelslib.LanguageUtils.LanguageStrings.BOT_TAG_BOT
								})
							});
						}
					};
					
					CustomComponents.Button = reactInitialized && class hiddenchannelslib_Button extends Internal.LibraryModules.React.Component {
						handleClick(e) {if (typeof this.props.onClick == "function") this.props.onClick(e, this);}
						handleContextMenu(e) {if (typeof this.props.onContextMenu == "function") this.props.onContextMenu(e, this);}
						handleMouseDown(e) {if (typeof this.props.onMouseDown == "function") this.props.onMouseDown(e, this);}
						handleMouseUp(e) {if (typeof this.props.onMouseUp == "function") this.props.onMouseUp(e, this);}
						handleMouseEnter(e) {if (typeof this.props.onMouseEnter == "function") this.props.onMouseEnter(e, this);}
						handleMouseLeave(e) {if (typeof this.props.onMouseLeave == "function") this.props.onMouseLeave(e, this);}
						render() {
							let processingAndListening = (this.props.disabled || this.props.submitting) && (null != this.props.onMouseEnter || null != this.props.onMouseLeave);
							let props = hiddenchannelslib.ObjectUtils.exclude(this.props, "look", "color", "hover", "size", "fullWidth", "grow", "disabled", "submitting", "type", "style", "wrapperClassName", "className", "innerClassName", "onClick", "onContextMenu", "onMouseDown", "onMouseUp", "onMouseEnter", "onMouseLeave", "children", "rel");
							let button = hiddenchannelslib.ReactUtils.createElement("button", Object.assign({}, !this.props.disabled && !this.props.submitting && props, {
								className: hiddenchannelslib.DOMUtils.formatClassName(this.props.className, hiddenchannelslib.disCN.button, this.props.look != null ? this.props.look : Internal.LibraryComponents.Button.Looks.FILLED, this.props.color != null ? this.props.color : Internal.LibraryComponents.Button.Colors.BRAND, this.props.hover, this.props.size != null ? this.props.size : Internal.LibraryComponents.Button.Sizes.MEDIUM, processingAndListening && this.props.wrapperClassName, this.props.fullWidth && hiddenchannelslib.disCN.buttonfullwidth, (this.props.grow === undefined || this.props.grow) && hiddenchannelslib.disCN.buttongrow, this.props.hover && this.props.hover !== Internal.LibraryComponents.Button.Hovers.DEFAULT && hiddenchannelslib.disCN.buttonhashover, this.props.submitting && hiddenchannelslib.disCN.buttonsubmitting),
								onClick: (this.props.disabled || this.props.submitting) ? e => {return e.preventDefault();} : this.handleClick.bind(this),
								onContextMenu: (this.props.disabled || this.props.submitting) ? e => {return e.preventDefault();} : this.handleContextMenu.bind(this),
								onMouseUp: !this.props.disabled && this.handleMouseDown.bind(this),
								onMouseDown: !this.props.disabled && this.handleMouseUp.bind(this),
								onMouseEnter: this.handleMouseEnter.bind(this),
								onMouseLeave: this.handleMouseLeave.bind(this),
								type: !this.props.type ? "button" : this.props.type,
								disabled: this.props.disabled,
								style: this.props.style,
								rel: this.props.rel,
								children: [
									this.props.submitting && !this.props.disabled ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Spinner, {
										type: Internal.LibraryComponents.Spinner.Type.PULSING_ELLIPSIS,
										className: hiddenchannelslib.disCN.buttonspinner,
										itemClassName: hiddenchannelslib.disCN.buttonspinneritem
									}) : null,
									hiddenchannelslib.ReactUtils.createElement("div", {
										className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.buttoncontents, this.props.innerClassName),
										children: this.props.children
									})
								]
							}));
							return !processingAndListening ? button : hiddenchannelslib.ReactUtils.createElement("span", {
								className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.buttondisabledwrapper, this.props.wrapperClassName, this.props.size != null ? this.props.size : Internal.LibraryComponents.Button.Sizes.MEDIUM, this.props.fullWidth && hiddenchannelslib.disCN.buttonfullwidth, (this.props.grow === undefined || this.props.grow) && hiddenchannelslib.disCN.buttongrow),
								children: [
									button,
									hiddenchannelslib.ReactUtils.createElement("span", {
										onMouseEnter: this.handleMouseEnter.bind(this),
										onMouseLeave: this.handleMouseLeave.bind(this),
										className: hiddenchannelslib.disCN.buttondisabledoverlay
									})
								]
							});
						}
					};
					
					CustomComponents.Card = reactInitialized && class hiddenchannelslib_Card extends Internal.LibraryModules.React.Component {
						render() {
							return hiddenchannelslib.ReactUtils.createElement("div", hiddenchannelslib.ObjectUtils.exclude(Object.assign({}, this.props, {
								className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.hovercardwrapper, this.props.horizontal && hiddenchannelslib.disCN.hovercardhorizontal, this.props.backdrop && hiddenchannelslib.disCN.hovercard, this.props.className),
								onMouseEnter: e => {if (typeof this.props.onMouseEnter == "function") this.props.onMouseEnter(e, this);},
								onMouseLeave: e => {if (typeof this.props.onMouseLeave == "function") this.props.onMouseLeave(e, this);},
								onClick: e => {if (typeof this.props.onClick == "function") this.props.onClick(e, this);},
								onContextMenu: e => {if (typeof this.props.onContextMenu == "function") this.props.onContextMenu(e, this);},
								children: [
									!this.props.noRemove ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Clickable, {
										"aria-label": hiddenchannelslib.LanguageUtils.LanguageStrings.REMOVE,
										className: hiddenchannelslib.disCNS.hovercardremovebutton + hiddenchannelslib.disCNS.hovercardremovebuttondefault,
										onClick: e => {
											if (typeof this.props.onRemove == "function") this.props.onRemove(e, this);
											hiddenchannelslib.ListenerUtils.stopEvent(e);
										}
									}) : null,
									typeof this.props.children == "string" ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TextElement, {
										className: hiddenchannelslib.disCN.hovercardinner,
										children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TextScroller, {children: this.props.children})
									}) : this.props.children
								].flat(10).filter(n => n)
							}), "backdrop", "horizontal", "noRemove"));
						}
					};
					Internal.setDefaultProps(CustomComponents.Card, {backdrop: true, noRemove: false});
					
					CustomComponents.ChannelTextAreaButton = reactInitialized && class hiddenchannelslib_ChannelTextAreaButton extends Internal.LibraryModules.React.Component {
						render() {
							const inner = hiddenchannelslib.ReactUtils.createElement("div", {
								className: hiddenchannelslib.disCN.textareabuttonwrapper,
								children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SvgIcon, {
									name: this.props.iconName,
									iconSVG: this.props.iconSVG,
									className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.textareaicon, this.props.iconClassName, this.props.pulse && hiddenchannelslib.disCN.textareaiconpulse),
									nativeClass: this.props.nativeClass
								})
							});
							const button = hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Button, {
								look: Internal.LibraryComponents.Button.Looks.BLANK,
								size: Internal.LibraryComponents.Button.Sizes.NONE,
								"aria-label": this.props.label,
								tabIndex: this.props.tabIndex,
								className: hiddenchannelslib.DOMUtils.formatClassName(this.props.isActive && hiddenchannelslib.disCN.textareabuttonactive),
								innerClassName: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.textareabutton, this.props.className, this.props.pulse && hiddenchannelslib.disCN.textareaattachbuttonplus),
								onClick: this.props.onClick,
								onContextMenu: this.props.onContextMenu,
								onMouseEnter: this.props.onMouseEnter,
								onMouseLeave: this.props.onMouseLeave,
								children: this.props.tooltip && this.props.tooltip.text ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TooltipContainer, Object.assign({}, this.props.tooltip, {children: inner})) : inner
							});
							return (this.props.className || "").indexOf(hiddenchannelslib.disCN.textareapickerbutton) > -1 ? hiddenchannelslib.ReactUtils.createElement("div", {
								className: hiddenchannelslib.disCN.textareapickerbuttoncontainer,
								children: button
							}) : button;
						}
					};
					Internal.setDefaultProps(CustomComponents.ChannelTextAreaButton, {tabIndex: 0});
					
					CustomComponents.CharCounter = reactInitialized && class hiddenchannelslib_CharCounter extends Internal.LibraryModules.React.Component {
						getCounterString() {
							let input = this.refElement || {}, string = "";
							if (hiddenchannelslib.DOMUtils.containsClass(this.refElement, hiddenchannelslib.disCN.textarea)) {
								let instance = hiddenchannelslib.ReactUtils.findOwner(input, {name: "ChannelEditorContainer", up: true});
								if (instance) string = instance.props.textValue;
								else string = input.value || input.textContent || "";
							}
							else string = input.value || input.textContent || "";
							if (this.props.max && this.props.showPercentage && (string.length/this.props.max) * 100 < this.props.showPercentage) return "";
							let start = input.selectionStart || 0, end = input.selectionEnd || 0, selectlength = end - start, selection = hiddenchannelslib.DOMUtils.getSelection();
							let select = !selectlength && !selection ? 0 : (selectlength || selection.length);
							select = !select ? 0 : (select > string.length ? (end || start ? string.length - (string.length - end - start) : string.length) : select);
							let children = [
								typeof this.props.renderPrefix == "function" && this.props.renderPrefix(string.length),
								`${string.length}${!this.props.max ? "" : "/" + this.props.max}${!select ? "" : " (" + select + ")"}`,
								typeof this.props.renderSuffix == "function" && this.props.renderSuffix(string.length)
							].filter(n => n);
							if (typeof this.props.onChange == "function") this.props.onChange(this);
							return children.length == 1 ? children[0] : hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Flex, {
								align: Internal.LibraryComponents.Flex.Align.CENTER,
								children: children
							});
						}
						updateCounter() {
							if (!this.refElement) return;
							hiddenchannelslib.TimeUtils.clear(this.updateTimeout);
							this.updateTimeout = hiddenchannelslib.TimeUtils.timeout(this.forceUpdateCounter.bind(this), 100);
						}
						forceUpdateCounter() {
							if (!this.refElement) return;
							this.props.children = this.getCounterString();
							hiddenchannelslib.ReactUtils.forceUpdate(this);
						}
						handleSelection() {
							if (!this.refElement) return;
							let mouseMove = _ => {
								hiddenchannelslib.TimeUtils.timeout(this.forceUpdateCounter.bind(this), 10);
							};
							let mouseUp = _ => {
								document.removeEventListener("mousemove", mouseMove);
								document.removeEventListener("mouseup", mouseUp);
								if (this.refElement.selectionEnd - this.refElement.selectionStart) hiddenchannelslib.TimeUtils.timeout(_ => {
									document.addEventListener("click", click);
								});
							};
							let click = _ => {
								hiddenchannelslib.TimeUtils.timeout(this.forceUpdateCounter.bind(this), 100);
								document.removeEventListener("mousemove", mouseMove);
								document.removeEventListener("mouseup", mouseUp);
								document.removeEventListener("click", click);
							};
							document.addEventListener("mousemove", mouseMove);
							document.addEventListener("mouseup", mouseUp);
						}
						componentDidMount() {
							if (this.props.refClass) {
								let node = hiddenchannelslib.ReactUtils.findDOMNode(this);
								if (node && node.parentElement) {
									this.refElement = node.parentElement.querySelector(this.props.refClass);
									if (this.refElement) {
										if (!this._updateCounter) this._updateCounter = _ => {
											if (!document.contains(node)) hiddenchannelslib.ListenerUtils.multiRemove(this.refElement, "keydown click change", this._updateCounter);
											else this.updateCounter();
										};
										if (!this._handleSelection) this._handleSelection = _ => {
											if (!document.contains(node)) hiddenchannelslib.ListenerUtils.multiRemove(this.refElement, "mousedown", this._handleSelection);
											else this.handleSelection();
										};
										hiddenchannelslib.ListenerUtils.multiRemove(this.refElement, "mousedown", this._handleSelection);
										hiddenchannelslib.ListenerUtils.multiAdd(this.refElement, "mousedown", this._handleSelection);
										if (this.refElement.tagName == "INPUT" || this.refElement.tagName == "TEXTAREA") {
											hiddenchannelslib.ListenerUtils.multiRemove(this.refElement, "keydown click change", this._updateCounter);
											hiddenchannelslib.ListenerUtils.multiAdd(this.refElement, "keydown click change", this._updateCounter);
										}
										else {
											if (!this._mutationObserver) this._mutationObserver = new MutationObserver(changes => {
												if (!document.contains(node)) this._mutationObserver.disconnect();
												else this.updateCounter();
											});
											else this._mutationObserver.disconnect();
											this._mutationObserver.observe(this.refElement, {childList: true, subtree: true});
										}
										this.updateCounter();
									}
									else hiddenchannelslib.LogUtils.warn(["could not find referenceElement for hiddenchannelslib_CharCounter"]);
								}
							}
							else hiddenchannelslib.LogUtils.warn(["refClass can not be undefined for hiddenchannelslib_CharCounter"]);
						}
						render() {
							let string = this.getCounterString();
							hiddenchannelslib.TimeUtils.timeout(_ => string != this.getCounterString() && hiddenchannelslib.ReactUtils.forceUpdate(this));
							return hiddenchannelslib.ReactUtils.createElement("div", hiddenchannelslib.ObjectUtils.exclude(Object.assign({}, this.props, {
								className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.charcounter, this.props.className),
								children: string
							}), "parsing", "max", "refClass", "renderPrefix", "renderSuffix", "showPercentage"));
						}
					};
					
					CustomComponents.Checkbox = reactInitialized && class hiddenchannelslib_Checkbox extends Internal.LibraryModules.React.Component {
						handleMouseDown(e) {if (typeof this.props.onMouseDown == "function") this.props.onMouseDown(e, this);}
						handleMouseUp(e) {if (typeof this.props.onMouseUp == "function") this.props.onMouseUp(e, this);}
						handleMouseEnter(e) {if (typeof this.props.onMouseEnter == "function") this.props.onMouseEnter(e, this);}
						handleMouseLeave(e) {if (typeof this.props.onMouseLeave == "function") this.props.onMouseLeave(e, this);}
						getInputMode() {
							return this.props.disabled ? "disabled" : this.props.readOnly ? "readonly" : "default";
						}
						getStyle() {
							let style = this.props.style || {};
							if (!this.props.value) return style;
							style = Object.assign({}, style);
							this.props.color = typeof this.props.getColor == "function" ? this.props.getColor(this.props.value) : this.props.color;
							if (Internal.LibraryComponents.Checkbox.Types) switch (this.props.type) {
								case Internal.LibraryComponents.Checkbox.Types.DEFAULT:
									style.borderColor = this.props.color;
									break;
								case Internal.LibraryComponents.Checkbox.Types.GHOST:
									let color = hiddenchannelslib.ColorUtils.setAlpha(this.props.color, 0.15, "RGB");
									style.backgroundColor = color;
									style.borderColor = color;
									break;
								case Internal.LibraryComponents.Checkbox.Types.INVERTED:
									style.backgroundColor = this.props.color;
									style.borderColor = this.props.color;
							}
							return style;
						}
						getColor() {
							return this.props.value ? (Internal.LibraryComponents.Checkbox.Types && this.props.type === Internal.LibraryComponents.Checkbox.Types.INVERTED ? hiddenchannelslib.DiscordConstants.Colors.WHITE : this.props.color) : "transparent";
						}
						handleChange(e) {
							this.props.value = typeof this.props.getValue == "function" ? this.props.getValue(this.props.value, e, this) : !this.props.value;
							if (typeof this.props.onChange == "function") this.props.onChange(this.props.value, this);
							hiddenchannelslib.ReactUtils.forceUpdate(this);
						}
						render() {
							let label = this.props.children ? hiddenchannelslib.ReactUtils.createElement("div", {
								className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.checkboxlabel, this.props.disabled ? hiddenchannelslib.disCN.checkboxlabeldisabled : hiddenchannelslib.disCN.checkboxlabelclickable, this.props.reverse ? hiddenchannelslib.disCN.checkboxlabelreversed : hiddenchannelslib.disCN.checkboxlabelforward),
								style: {
									lineHeight: this.props.size + "px"
								},
								children: this.props.children
							}) : null;
							return hiddenchannelslib.ReactUtils.createElement("label", {
								className: hiddenchannelslib.DOMUtils.formatClassName(this.props.disabled ? hiddenchannelslib.disCN.checkboxwrapperdisabled : hiddenchannelslib.disCN.checkboxwrapper, this.props.align, this.props.className),
								children: [
									this.props.reverse && label,
									!this.props.displayOnly && hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.FocusRingScope, {
										children: hiddenchannelslib.ReactUtils.createElement("input", {
											className: hiddenchannelslib.disCN["checkboxinput" + this.getInputMode()],
											type: "checkbox",
											onClick: this.props.disabled || this.props.readOnly ? (_ => {}) : this.handleChange.bind(this),
											onContextMenu: this.props.disabled || this.props.readOnly ? (_ => {}) : this.handleChange.bind(this),
											onMouseUp: !this.props.disabled && this.handleMouseDown.bind(this),
											onMouseDown: !this.props.disabled && this.handleMouseUp.bind(this),
											onMouseEnter: !this.props.disabled && this.handleMouseEnter.bind(this),
											onMouseLeave: !this.props.disabled && this.handleMouseLeave.bind(this),
											checked: this.props.value,
											style: {
												width: this.props.size,
												height: this.props.size
											}
										})
									}),
									hiddenchannelslib.ReactUtils.createElement("div", {
										className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.checkbox, hiddenchannelslib.disCN["checkbox" + this.props.shape], this.props.value && hiddenchannelslib.disCN.checkboxchecked),
										style: Object.assign({
											width: this.props.size,
											height: this.props.size,
											borderColor: this.props.checkboxColor
										}, this.getStyle()),
										children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Checkmark, {
											width: 18,
											height: 18,
											color: this.getColor(),
											"aria-hidden": true
										})
									}),
									!this.props.reverse && label
								].filter(n => n)
							});
						}
					};
					CustomComponents.Checkbox.Types = {
						DEFAULT: "DEFAULT",
						GHOST: "GHOST",
						INVERTED: "INVERTED"
					};
					CustomComponents.Checkbox.Shapes = {
						BOX: "box",
						ROUND: "round"
					};
					Internal.setDefaultProps(CustomComponents.Checkbox, {type: CustomComponents.Checkbox.Types.INVERTED, shape: CustomComponents.Checkbox.Shapes.ROUND});
					
					CustomComponents.Clickable = reactInitialized && class hiddenchannelslib_Clickable extends Internal.LibraryModules.React.Component {
						handleClick(e) {if (typeof this.props.onClick == "function") this.props.onClick(e, this);}
						handleContextMenu(e) {if (typeof this.props.onContextMenu == "function") this.props.onContextMenu(e, this);}
						handleMouseDown(e) {if (typeof this.props.onMouseDown == "function") this.props.onMouseDown(e, this);}
						handleMouseUp(e) {if (typeof this.props.onMouseUp == "function") this.props.onMouseUp(e, this);}
						handleMouseEnter(e) {if (typeof this.props.onMouseEnter == "function") this.props.onMouseEnter(e, this);}
						handleMouseLeave(e) {if (typeof this.props.onMouseLeave == "function") this.props.onMouseLeave(e, this);}
						render() {
							return hiddenchannelslib.ReactUtils.createElement(Internal.NativeSubComponents.Clickable, Object.assign({}, this.props, {
								className: hiddenchannelslib.DOMUtils.formatClassName(this.props.className, (this.props.className || "").toLowerCase().indexOf("disabled") == -1 && hiddenchannelslib.disCN.cursorpointer),
								onClick: this.handleClick.bind(this),
								onContextMenu: this.handleContextMenu.bind(this),
								onMouseUp: this.handleMouseDown.bind(this),
								onMouseDown: !this.props.disabled && this.handleMouseUp.bind(this),
								onMouseEnter: this.handleMouseEnter.bind(this),
								onMouseLeave: this.handleMouseLeave.bind(this)
							}));
						}
					};
					
					CustomComponents.CollapseContainer = reactInitialized && class hiddenchannelslib_CollapseContainer extends Internal.LibraryModules.React.Component {
						render() {
							if (!hiddenchannelslib.ObjectUtils.is(this.props.collapseStates)) this.props.collapseStates = {};
							this.props.collapsed = this.props.collapsed && (this.props.collapseStates[this.props.title] || this.props.collapseStates[this.props.title] === undefined);
							this.props.collapseStates[this.props.title] = this.props.collapsed;
							return hiddenchannelslib.ReactUtils.createElement("div", {
								className: hiddenchannelslib.DOMUtils.formatClassName(this.props.collapsed && hiddenchannelslib.disCN.collapsecontainercollapsed, this.props.mini ? hiddenchannelslib.disCN.collapsecontainermini : hiddenchannelslib.disCN.collapsecontainer, this.props.className),
								id: this.props.id,
								children: [
									hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Flex, {
										className: hiddenchannelslib.disCN.collapsecontainerheader,
										align: Internal.LibraryComponents.Flex.Align.CENTER,
										onClick: e => {
											this.props.collapsed = !this.props.collapsed;
											this.props.collapseStates[this.props.title] = this.props.collapsed;
											if (typeof this.props.onClick == "function") this.props.onClick(this.props.collapsed, this);
											hiddenchannelslib.ReactUtils.forceUpdate(this);
										},
										children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.FormComponents.FormTitle, {
											tag: Internal.LibraryComponents.FormComponents.FormTitle.Tags.H5,
											className: hiddenchannelslib.disCN.collapsecontainertitle,
											children: this.props.title
										})
									}),
									!this.props.collapsed ? hiddenchannelslib.ReactUtils.createElement("div", {
										className: hiddenchannelslib.disCN.collapsecontainerinner,
										children: this.props.children
									}) : null
								]
							});
						}
					};
					Internal.setDefaultProps(CustomComponents.CollapseContainer, {collapsed: true, mini: true});
					
					CustomComponents.ColorPicker = reactInitialized && class hiddenchannelslib_ColorPicker extends Internal.LibraryModules.React.Component {
						constructor(props) {
							super(props);
							if (!this.state) this.state = {};
							this.state.isGradient = props.gradient && props.color && hiddenchannelslib.ObjectUtils.is(props.color);
							this.state.gradientBarEnabled = this.state.isGradient;
							this.state.draggingAlphaCursor = false;
							this.state.draggingGradientCursor = false;
							this.state.selectedGradientCursor = 0;
						}
						handleColorChange(color) {
							let changed = false;
							if (color != null) {
								changed = !hiddenchannelslib.equals(this.state.isGradient ? this.props.color[this.state.selectedGradientCursor] : this.props.color, color);
								if (this.state.isGradient) this.props.color[this.state.selectedGradientCursor] = color;
								else this.props.color = color;
							}
							else changed = true;
							if (changed) {
								if (typeof this.props.onColorChange == "function") this.props.onColorChange(hiddenchannelslib.ColorUtils.convert(this.props.color, "RGBCOMP"));
								hiddenchannelslib.ReactUtils.forceUpdate(this);
							}
						}
						render() {
							if (this.state.isGradient) this.props.color = Object.assign({}, this.props.color);
							
							let hslFormat = this.props.alpha ? "HSLA" : "HSL";
							let hexRegex = this.props.alpha ? /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i : /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
							
							let selectedColor = hiddenchannelslib.ColorUtils.convert(this.state.isGradient ? this.props.color[this.state.selectedGradientCursor] : this.props.color, hslFormat) || hiddenchannelslib.ColorUtils.convert("#000000FF", hslFormat);
							let currentGradient = (this.state.isGradient ? Object.entries(this.props.color, hslFormat) : [[0, selectedColor], [1, selectedColor]]);
							
							let [h, s, l] = hiddenchannelslib.ColorUtils.convert(selectedColor, "HSLCOMP");
							let a = hiddenchannelslib.ColorUtils.getAlpha(selectedColor);
							a = a == null ? 1 : a;
							
							let hexColor = hiddenchannelslib.ColorUtils.convert(selectedColor, this.props.alpha ? "HEXA" : "HEX");
							let hexLength = hexColor.length;
							
							return hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.PopoutFocusLock, {
								className: hiddenchannelslib.disCNS.colorpickerwrapper + hiddenchannelslib.disCN.colorpicker,
								children: [
									hiddenchannelslib.ReactUtils.createElement("div", {
										className: hiddenchannelslib.disCN.colorpickerinner,
										children: [
											hiddenchannelslib.ReactUtils.createElement("div", {
												className: hiddenchannelslib.disCN.colorpickersaturation,
												children: hiddenchannelslib.ReactUtils.createElement("div", {
													className: hiddenchannelslib.disCN.colorpickersaturationcolor,
													style: {position: "absolute", top: 0, right: 0, bottom: 0, left: 0, cursor: "crosshair", backgroundColor: hiddenchannelslib.ColorUtils.convert([h, "100%", "100%"], "RGB")},
													onClick: event => {
														let rects = hiddenchannelslib.DOMUtils.getRects(hiddenchannelslib.DOMUtils.getParent(hiddenchannelslib.dotCN.colorpickersaturationcolor, event.target));
														this.handleColorChange(hiddenchannelslib.ColorUtils.convert([h, hiddenchannelslib.NumberUtils.mapRange([rects.left, rects.left + rects.width], [0, 100], event.clientX) + "%", hiddenchannelslib.NumberUtils.mapRange([rects.top, rects.top + rects.height], [100, 0], event.clientY) + "%", a], hslFormat));
													},
													onMouseDown: event => {
														let rects = hiddenchannelslib.DOMUtils.getRects(hiddenchannelslib.DOMUtils.getParent(hiddenchannelslib.dotCN.colorpickersaturationcolor, event.target));
														let mouseUp = _ => {
															document.removeEventListener("mouseup", mouseUp);
															document.removeEventListener("mousemove", mouseMove);
														};
														let mouseMove = event2 => {
															this.handleColorChange(hiddenchannelslib.ColorUtils.convert([h, hiddenchannelslib.NumberUtils.mapRange([rects.left, rects.left + rects.width], [0, 100], event2.clientX) + "%", hiddenchannelslib.NumberUtils.mapRange([rects.top, rects.top + rects.height], [100, 0], event2.clientY) + "%", a], hslFormat));
														};
														document.addEventListener("mouseup", mouseUp);
														document.addEventListener("mousemove", mouseMove);
													},
													children: [
														hiddenchannelslib.ReactUtils.createElement("style", {
															children: `${hiddenchannelslib.dotCN.colorpickersaturationwhite} {background: -webkit-linear-gradient(to right, #fff, rgba(255,255,255,0));background: linear-gradient(to right, #fff, rgba(255,255,255,0));}${hiddenchannelslib.dotCN.colorpickersaturationblack} {background: -webkit-linear-gradient(to top, #000, rgba(0,0,0,0));background: linear-gradient(to top, #000, rgba(0,0,0,0));}`
														}),
														hiddenchannelslib.ReactUtils.createElement("div", {
															className: hiddenchannelslib.disCN.colorpickersaturationwhite,
															style: {position: "absolute", top: 0, right: 0, bottom: 0, left: 0},
															children: [
																hiddenchannelslib.ReactUtils.createElement("div", {
																	className: hiddenchannelslib.disCN.colorpickersaturationblack,
																	style: {position: "absolute", top: 0, right: 0, bottom: 0, left: 0}
																}),
																hiddenchannelslib.ReactUtils.createElement("div", {
																	className: hiddenchannelslib.disCN.colorpickersaturationcursor,
																	style: {position: "absolute", cursor: "crosshair", left: s, top: `${hiddenchannelslib.NumberUtils.mapRange([0, 100], [100, 0], parseFloat(l))}%`},
																	children: hiddenchannelslib.ReactUtils.createElement("div", {
																		style: {width: 4, height: 4, boxShadow: "rgb(255, 255, 255) 0px 0px 0px 1.5px, rgba(0, 0, 0, 0.3) 0px 0px 1px 1px inset, rgba(0, 0, 0, 0.4) 0px 0px 1px 2px", borderRadius: "50%", transform: "translate(-2px, -2px)"}
																	})
																})
															]
														})
													]
												})
											}),
											hiddenchannelslib.ReactUtils.createElement("div", {
												className: hiddenchannelslib.disCN.colorpickerhue,
												children: hiddenchannelslib.ReactUtils.createElement("div", {
													style: {position: "absolute", top: 0, right: 0, bottom: 0, left: 0},
													children: hiddenchannelslib.ReactUtils.createElement("div", {
														className: hiddenchannelslib.disCN.colorpickerhuehorizontal,
														style: {padding: "0px 2px", position: "relative", height: "100%"},
														onClick: event => {
															let rects = hiddenchannelslib.DOMUtils.getRects(hiddenchannelslib.DOMUtils.getParent(hiddenchannelslib.dotCN.colorpickerhuehorizontal, event.target));
															this.handleColorChange(hiddenchannelslib.ColorUtils.convert([hiddenchannelslib.NumberUtils.mapRange([rects.left, rects.left + rects.width], [0, 360], event.clientX), s, l, a], hslFormat));
														},
														onMouseDown: event => {
															let rects = hiddenchannelslib.DOMUtils.getRects(hiddenchannelslib.DOMUtils.getParent(hiddenchannelslib.dotCN.colorpickerhuehorizontal, event.target));
															let mouseUp = _ => {
																document.removeEventListener("mouseup", mouseUp);
																document.removeEventListener("mousemove", mouseMove);
															};
															let mouseMove = event2 => {
																this.handleColorChange(hiddenchannelslib.ColorUtils.convert([hiddenchannelslib.NumberUtils.mapRange([rects.left, rects.left + rects.width], [0, 360], event2.clientX), s, l, a], hslFormat));
															};
															document.addEventListener("mouseup", mouseUp);
															document.addEventListener("mousemove", mouseMove);
														},
														children: [
															hiddenchannelslib.ReactUtils.createElement("style", {
																children: `${hiddenchannelslib.dotCN.colorpickerhuehorizontal} {background: linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%);background: -webkit-linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%);}${hiddenchannelslib.dotCN.colorpickerhuevertical} {background: linear-gradient(to top, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%);background: -webkit-linear-gradient(to top, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%);}`
															}),
															hiddenchannelslib.ReactUtils.createElement("div", {
																className: hiddenchannelslib.disCN.colorpickerhuecursor,
																style: {position: "absolute", cursor: "ew-resize", left: `${hiddenchannelslib.NumberUtils.mapRange([0, 360], [0, 100], h)}%`},
																children: hiddenchannelslib.ReactUtils.createElement("div", {
																	style: {marginTop: 1, width: 4, borderRadius: 1, height: 8, boxShadow: "rgba(0, 0, 0, 0.6) 0px 0px 2px", background: "rgb(255, 255, 255)", transform: "translateX(-2px)"}
																})
															})
														]
													})
												})
											}),
											this.props.alpha && hiddenchannelslib.ReactUtils.createElement("div", {
												className: hiddenchannelslib.disCN.colorpickeralpha,
												children: [
													hiddenchannelslib.ReactUtils.createElement("div", {
														style: {position: "absolute", top: 0, right: 0, bottom: 0, left: 0},
														children: hiddenchannelslib.ReactUtils.createElement("div", {
															className: hiddenchannelslib.disCN.colorpickeralphacheckered,
															style: {padding: "0px 2px", position: "relative", height: "100%"}
														})
													}),
													hiddenchannelslib.ReactUtils.createElement("div", {
														style: {position: "absolute", top: 0, right: 0, bottom: 0, left: 0},
														children: hiddenchannelslib.ReactUtils.createElement("div", {
															className: hiddenchannelslib.disCN.colorpickeralphahorizontal,
															style: {padding: "0px 2px", position: "relative", height: "100%", background: `linear-gradient(to right, ${hiddenchannelslib.ColorUtils.setAlpha([h, s, l], 0, "RGBA")}, ${hiddenchannelslib.ColorUtils.setAlpha([h, s, l], 1, "RGBA")}`},
															onClick: event => {
																let rects = hiddenchannelslib.DOMUtils.getRects(hiddenchannelslib.DOMUtils.getParent(hiddenchannelslib.dotCN.colorpickeralphahorizontal, event.target));
																this.handleColorChange(hiddenchannelslib.ColorUtils.setAlpha([h, s, l], hiddenchannelslib.NumberUtils.mapRange([rects.left, rects.left + rects.width], [0, 1], event.clientX), hslFormat));
															},
															onMouseDown: event => {
																let rects = hiddenchannelslib.DOMUtils.getRects(hiddenchannelslib.DOMUtils.getParent(hiddenchannelslib.dotCN.colorpickeralphahorizontal, event.target));
																let mouseUp = _ => {
																	document.removeEventListener("mouseup", mouseUp);
																	document.removeEventListener("mousemove", mouseMove);
																	this.state.draggingAlphaCursor = false;
																	hiddenchannelslib.ReactUtils.forceUpdate(this);
																};
																let mouseMove = event2 => {
																	this.state.draggingAlphaCursor = true;
																	this.handleColorChange(hiddenchannelslib.ColorUtils.setAlpha([h, s, l], hiddenchannelslib.NumberUtils.mapRange([rects.left, rects.left + rects.width], [0, 1], event2.clientX), hslFormat));
																};
																document.addEventListener("mouseup", mouseUp);
																document.addEventListener("mousemove", mouseMove);
															},
															children: hiddenchannelslib.ReactUtils.createElement("div", {
																className: hiddenchannelslib.disCN.colorpickeralphacursor,
																style: {position: "absolute", cursor: "ew-resize", left: `${a * 100}%`},
																children: [
																	hiddenchannelslib.ReactUtils.createElement("div", {
																		style: {marginTop: 1, width: 4, borderRadius: 1, height: 8, boxShadow: "rgba(0, 0, 0, 0.6) 0px 0px 2px", background: "rgb(255, 255, 255)", transform: "translateX(-2px)"}
																	}),
																	this.state.draggingAlphaCursor && hiddenchannelslib.ReactUtils.createElement("span", {
																		className: hiddenchannelslib.disCN.sliderbubble,
																		style: {opacity: 1, visibility: "visible", left: 2},
																		children: `${Math.floor(a * 100)}%`
																	})
																].filter(n => n)
															})
														})
													})
												]
											}),
											this.state.gradientBarEnabled && hiddenchannelslib.ReactUtils.createElement("div", {
												className: hiddenchannelslib.disCN.colorpickergradient,
												children: [
													hiddenchannelslib.ReactUtils.createElement("div", {
														style: {position: "absolute", top: 0, right: 0, bottom: 0, left: 0},
														children: hiddenchannelslib.ReactUtils.createElement("div", {
															className: hiddenchannelslib.disCN.colorpickergradientcheckered,
															style: {padding: "0px 2px", position: "relative", height: "100%"}
														})
													}),
													hiddenchannelslib.ReactUtils.createElement("div", {
														style: {position: "absolute", top: 0, right: 0, bottom: 0, left: 0},
														children: hiddenchannelslib.ReactUtils.createElement("div", {
															className: hiddenchannelslib.disCN.colorpickergradienthorizontal,
															style: {padding: "0px 2px", position: "relative", cursor: "copy", height: "100%", background: hiddenchannelslib.ColorUtils.createGradient(currentGradient.reduce((colorObj, posAndColor) => (colorObj[posAndColor[0]] = posAndColor[1], colorObj), {}))},
															onClick: event => {
																let rects = hiddenchannelslib.DOMUtils.getRects(event.target);
																let pos = hiddenchannelslib.NumberUtils.mapRange([rects.left, rects.left + rects.width], [0.01, 0.99], event.clientX);
																if (Object.keys(this.props.color).indexOf(pos) == -1) {
																	this.props.color[pos] = hiddenchannelslib.ColorUtils.convert("#000000FF", hslFormat);
																	this.state.selectedGradientCursor = pos;
																	this.handleColorChange();
																}
															},
															children: currentGradient.map(posAndColor => hiddenchannelslib.ReactUtils.createElement("div", {
																className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.colorpickergradientcursor, (posAndColor[0] == 0 || posAndColor[0] == 1) && hiddenchannelslib.disCN.colorpickergradientcursoredge, this.state.selectedGradientCursor == posAndColor[0] && hiddenchannelslib.disCN.colorpickergradientcursorselected),
																style: {position: "absolute", cursor: "pointer", left: `${posAndColor[0] * 100}%`},
																onMouseDown: posAndColor[0] == 0 || posAndColor[0] == 1 ? _ => {} : event => {
																	event = event.nativeEvent || event;
																	let mouseMove = event2 => {
																		if (Math.sqrt((event.pageX - event2.pageX)**2) > 10) {
																			document.removeEventListener("mousemove", mouseMove);
																			document.removeEventListener("mouseup", mouseUp);
																			
																			this.state.draggingGradientCursor = true;
																			let cursor = hiddenchannelslib.DOMUtils.getParent(hiddenchannelslib.dotCN.colorpickergradientcursor, event.target);
																			let rects = hiddenchannelslib.DOMUtils.getRects(cursor.parentElement);
																			
																			let releasing = _ => {
																				document.removeEventListener("mousemove", dragging);
																				document.removeEventListener("mouseup", releasing);
																				hiddenchannelslib.TimeUtils.timeout(_ => {this.state.draggingGradientCursor = false;});
																			};
																			let dragging = event3 => {
																				let pos = hiddenchannelslib.NumberUtils.mapRange([rects.left, rects.left + rects.width], [0.01, 0.99], event3.clientX);
																				if (Object.keys(this.props.color).indexOf(pos) == -1) {
																					delete this.props.color[posAndColor[0]];
																					posAndColor[0] = pos;
																					this.props.color[pos] = posAndColor[1];
																					this.state.selectedGradientCursor = pos;
																					this.handleColorChange();
																				}
																			};
																			document.addEventListener("mousemove", dragging);
																			document.addEventListener("mouseup", releasing);
																		}
																	};
																	let mouseUp = _ => {
																		document.removeEventListener("mousemove", mouseMove);
																		document.removeEventListener("mouseup", mouseUp);
																	};
																	document.addEventListener("mousemove", mouseMove);
																	document.addEventListener("mouseup", mouseUp);
																},
																onClick: event => {
																	hiddenchannelslib.ListenerUtils.stopEvent(event);
																	if (!this.state.draggingGradientCursor) {
																		this.state.selectedGradientCursor = posAndColor[0];
																		hiddenchannelslib.ReactUtils.forceUpdate(this);
																	}
																},
																onContextMenu: posAndColor[0] == 0 || posAndColor[0] == 1 ? _ => {} : event => {
																	hiddenchannelslib.ListenerUtils.stopEvent(event);
																	delete this.props.color[posAndColor[0]];
																	this.state.selectedGradientCursor = 0;
																	this.handleColorChange();
																},
																children: hiddenchannelslib.ReactUtils.createElement("div", {
																	style: {background: hiddenchannelslib.ColorUtils.convert(posAndColor[1], "RGBA")}
																})
															}))
														})
													})
												]
											})
										].filter(n => n)
									}),
									hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TextInput, {
										className: hiddenchannelslib.disCNS.colorpickerhexinput + hiddenchannelslib.disCN.margintop8,
										maxLength: this.props.alpha ? 9 : 7,
										valuePrefix: "#",
										value: hexColor,
										autoFocus: true,
										onChange: value => {
											const oldLength = hexLength;
											hexLength = (value || "").length;
											if (this.props.alpha && (oldLength > 8 || oldLength < 6) && hexLength == 7) value += "FF";
											if (hexRegex.test(value)) this.handleColorChange(value);
										},
										inputChildren: this.props.gradient && hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TooltipContainer, {
											text: hiddenchannelslib.LanguageUtils.LibraryStrings.gradient,
											children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Clickable, {
												className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.colorpickergradientbutton, this.state.gradientBarEnabled && hiddenchannelslib.disCN.colorpickergradientbuttonenabled),
												children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SvgIcon, {
													nativeClass: true,
													width: 28,
													height: 28,
													name: Internal.LibraryComponents.SvgIcon.Names.GRADIENT
												}),
												onClick: _ => {
													this.state.gradientBarEnabled = !this.state.gradientBarEnabled;
													if (this.state.gradientBarEnabled && !this.state.isGradient) this.props.color = {0: selectedColor, 1: selectedColor};
													else if (!this.state.gradientBarEnabled && this.state.isGradient) this.props.color = selectedColor;
													this.state.isGradient = this.props.color && hiddenchannelslib.ObjectUtils.is(this.props.color);
													this.handleColorChange();
												}
											})
										})
									}),
									hiddenchannelslib.ReactUtils.createElement("div", {
										className: "move-corners",
										children: [{top: 0, left: 0}, {top: 0, right: 0}, {bottom: 0, right: 0}, {bottom: 0, left: 0}].map(pos => hiddenchannelslib.ReactUtils.createElement("div", {
											className: "move-corner",
											onMouseDown: e => {
												if (!this.domElementRef.current) return;
												let rects = hiddenchannelslib.DOMUtils.getRects(this.domElementRef.current);
												let left = rects.left, top = rects.top;
												let oldX = e.pageX, oldY = e.pageY;
												let mouseUp = _ => {
													document.removeEventListener("mouseup", mouseUp);
													document.removeEventListener("mousemove", mouseMove);
												};
												let mouseMove = e2 => {
													left = left - (oldX - e2.pageX), top = top - (oldY - e2.pageY);
													oldX = e2.pageX, oldY = e2.pageY;
													this.domElementRef.current.style.setProperty("left", `${left}px`, "important");
													this.domElementRef.current.style.setProperty("top", `${top}px`, "important");
												};
												document.addEventListener("mouseup", mouseUp);
												document.addEventListener("mousemove", mouseMove);
											},
											style: Object.assign({}, pos, {width: 10, height: 10, cursor: "move", position: "absolute"})
										}))
									})
								]
							});
						}
					};
					
					CustomComponents.ColorSwatches = reactInitialized && class hiddenchannelslib_ColorSwatches extends Internal.LibraryModules.React.Component {
						ColorSwatch(props) {
							const swatches = props.swatches;
							let useWhite = !hiddenchannelslib.ColorUtils.isBright(props.color);
							let swatch = hiddenchannelslib.ReactUtils.createElement("button", {
								type: "button",
								className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.colorpickerswatch, props.isSingle && hiddenchannelslib.disCN.colorpickerswatchsingle, props.isDisabled && hiddenchannelslib.disCN.colorpickerswatchdisabled, props.isSelected && hiddenchannelslib.disCN.colorpickerswatchselected, props.isCustom && hiddenchannelslib.disCN.colorpickerswatchcustom, props.color == null && hiddenchannelslib.disCN.colorpickerswatchnocolor),
								number: props.number,
								disabled: props.isDisabled,
								onClick: _ => {
									if (!props.isSelected) {
										let color = props.isCustom && props.color == null ? (swatches.props.color || swatches.props.defaultCustomColor || "rgba(0, 0, 0, 1)") : props.color;
										if (typeof swatches.props.onColorChange == "function") swatches.props.onColorChange(hiddenchannelslib.ColorUtils.convert(color, "RGBCOMP"));
										swatches.props.color = color;
										swatches.props.customColor = props.isCustom ? color : swatches.props.customColor;
										swatches.props.customSelected = props.isCustom;
										hiddenchannelslib.ReactUtils.forceUpdate(swatches);
									}
								},
								style: Object.assign({}, props.style, {
									background: hiddenchannelslib.ObjectUtils.is(props.color) ? hiddenchannelslib.ColorUtils.createGradient(props.color) : hiddenchannelslib.ColorUtils.convert(props.color, "RGBA")
								}),
								children: [
									props.isCustom || props.isSingle ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SvgIcon, {
										className: hiddenchannelslib.disCN.colorpickerswatchdropper,
										foreground: hiddenchannelslib.disCN.colorpickerswatchdropperfg,
										name: Internal.LibraryComponents.SvgIcon.Names.DROPPER,
										width: props.isCustom ? 14 : 10,
										height: props.isCustom ? 14 : 10,
										color: useWhite ? hiddenchannelslib.DiscordConstants.Colors.WHITE : hiddenchannelslib.DiscordConstants.Colors.BLACK
									}) : null,
									props.isSelected && !props.isSingle ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SvgIcon, {
										name: Internal.LibraryComponents.SvgIcon.Names.CHECKMARK,
										width: props.isCustom ? 32 : 16,
										height: props.isCustom ? 24 : 16,
										color: useWhite ? hiddenchannelslib.DiscordConstants.Colors.WHITE : hiddenchannelslib.DiscordConstants.Colors.BLACK
									}) : null
								]
							});
							if (props.isCustom || props.isSingle || props.color == null) swatch = hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TooltipContainer, {
								text: props.isCustom || props.isSingle ? hiddenchannelslib.LanguageUtils.LanguageStrings.CUSTOM_COLOR : hiddenchannelslib.LanguageUtils.LanguageStrings.DEFAULT,
								tooltipConfig: {type: props.isSingle ? "top" : "bottom"},
								children: swatch
							});
							if (props.isCustom || props.isSingle) swatch = hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.PopoutContainer, {
								children: swatch,
								wrap: false,
								popoutClassName: hiddenchannelslib.disCNS.colorpickerwrapper + hiddenchannelslib.disCN.colorpicker,
								animation: Internal.LibraryComponents.PopoutContainer.Animation.TRANSLATE,
								position: Internal.LibraryComponents.PopoutContainer.Positions.BOTTOM,
								align: Internal.LibraryComponents.PopoutContainer.Align.CENTER,
								open: swatches.props.pickerOpen,
								onClick: _ => swatches.props.pickerOpen = true,
								onOpen: _ => {
									swatches.props.pickerOpen = true;
									if (typeof swatches.props.onPickerOpen == "function") swatches.props.onPickerOpen(this);
								},
								onClose: _ => {
									delete swatches.props.pickerOpen;
									if (typeof swatches.props.onPickerClose == "function") swatches.props.onPickerClose(this);
								},
								renderPopout: _ => hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.ColorPicker, Object.assign({}, swatches.props.pickerConfig, {
									color: swatches.props.color,
									onColorChange: color => {
										if (typeof swatches.props.onColorChange == "function") swatches.props.onColorChange(color);
										props.color = color;
										swatches.props.color = color;
										swatches.props.customColor = color;
										swatches.props.customSelected = true;
										hiddenchannelslib.ReactUtils.forceUpdate(swatches);
									}
								}), true)
							});
							if (props.isCustom) swatch = hiddenchannelslib.ReactUtils.createElement("div", {
								className: hiddenchannelslib.disCN.colorpickerswatchcustomcontainer,
								children: swatch
							});
							return swatch;
						}
						render() {
							this.props.color = hiddenchannelslib.ObjectUtils.is(this.props.color) ? this.props.color : hiddenchannelslib.ColorUtils.convert(this.props.color, "RGBA");
							this.props.colors = (hiddenchannelslib.ArrayUtils.is(this.props.colors) ? this.props.colors : [null, 5433630, 3066993, 1752220, 3447003, 3429595, 8789737, 10181046, 15277667, 15286558, 15158332, 15105570, 15844367, 13094093, 7372936, 6513507, 16777215, 3910932, 2067276, 1146986, 2123412, 2111892, 7148717, 7419530, 11342935, 11345940, 10038562, 11027200, 12745742, 9936031, 6121581, 2894892]).map(c => hiddenchannelslib.ColorUtils.convert(c, "RGBA"));
							this.props.colorRows = this.props.colors.length ? [this.props.colors.slice(0, parseInt(this.props.colors.length/2)), this.props.colors.slice(parseInt(this.props.colors.length/2))] : [];
							this.props.customColor = !this.props.color || !this.props.customSelected && this.props.colors.indexOf(this.props.color) > -1 ? null : this.props.color;
							this.props.defaultCustomColor = hiddenchannelslib.ObjectUtils.is(this.props.defaultCustomColor) ? this.props.defaultCustomColor : hiddenchannelslib.ColorUtils.convert(this.props.defaultCustomColor, "RGBA");
							this.props.customSelected = !!this.props.customColor;
							this.props.pickerConfig = hiddenchannelslib.ObjectUtils.is(this.props.pickerConfig) ? this.props.pickerConfig : {gradient: true, alpha: true};
							
							const isSingle = !this.props.colors.length;
							return hiddenchannelslib.ReactUtils.createElement("div", {
								className: isSingle ? hiddenchannelslib.disCN.colorpickerswatchsinglewrapper : hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.colorpickerswatches, hiddenchannelslib.disCN.colorpickerswatchescontainer, this.props.disabled && hiddenchannelslib.disCN.colorpickerswatchesdisabled),
								children: [
									hiddenchannelslib.ReactUtils.createElement(this.ColorSwatch, {
										swatches: this,
										color: this.props.customColor,
										isSingle: isSingle,
										isCustom: !isSingle,
										isSelected: this.props.customSelected,
										isDisabled: this.props.disabled,
										pickerOpen: this.props.pickerOpen,
										style: {margin: 0}
									}),
									!isSingle && hiddenchannelslib.ReactUtils.createElement("div", {
										children: this.props.colorRows.map(row => hiddenchannelslib.ReactUtils.createElement("div", {
											className: hiddenchannelslib.disCN.colorpickerrow,
											children: row.map(color => hiddenchannelslib.ReactUtils.createElement(this.ColorSwatch, {
												swatches: this,
												color: color,
												isCustom: false,
												isSelected: !this.props.customSelected && color == this.props.color,
												isDisabled: this.props.disabled
											}))
										}))
									}) 
								]
							});
						}
					};

					CustomComponents.DateInput = class hiddenchannelslib_DateInput extends Internal.LibraryModules.React.Component {
						renderFormatButton(props) {
							const button = hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Clickable, {
								className: hiddenchannelslib.disCN.dateinputbutton,
								children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SvgIcon, {
									name: props.svgName,
									width: 20,
									height: 20
								})
							});
							return hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.PopoutContainer, {
								width: props.popoutWidth || 350,
								padding: 10,
								animation: Internal.LibraryComponents.PopoutContainer.Animation.SCALE,
								position: Internal.LibraryComponents.PopoutContainer.Positions.TOP,
								align: Internal.LibraryComponents.PopoutContainer.Align.RIGHT,
								onClose: instance => hiddenchannelslib.DOMUtils.removeClass(instance.domElementRef.current, hiddenchannelslib.disCN.dateinputbuttonselected),
								renderPopout: instance => {
									hiddenchannelslib.DOMUtils.addClass(instance.domElementRef.current, hiddenchannelslib.disCN.dateinputbuttonselected);
									return props.children || hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Flex, {
										align: Internal.LibraryComponents.Flex.Align.CENTER,
										children: [
											props.name && hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SettingsLabel, {
												label: props.name
											}),
											hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TextInput, {
												className: hiddenchannelslib.disCN.dateinputfield,
												placeholder: props.placeholder,
												value: props.getValue(),
												onChange: typeof props.onChange == "function" ? props.onChange : null
											}),
											props.tooltipText && this.renderInfoButton(props.tooltipText)
										].filter(n => n)
									})
								},
								children: props.name ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TooltipContainer, {
									text: props.name,
									children: button
								}) : button
							});
						}
						renderInfoButton(text, style) {
							return hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TooltipContainer, {
								text: [text].flat(10).filter(n => n).map(n => hiddenchannelslib.ReactUtils.createElement("div", {children: n})),
								tooltipConfig: {
									type: "bottom",
									zIndex: 1009,
									maxWidth: 560
								},
								children: hiddenchannelslib.ReactUtils.createElement("div", {
									className: hiddenchannelslib.disCN.dateinputbutton,
									style: Object.assign({}, style),
									children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SvgIcon, {
										name: Internal.LibraryComponents.SvgIcon.Names.QUESTIONMARK,
										width: 24,
										height: 24
									})
								})
							});
						}
						handleChange() {
							if (typeof this.props.onChange == "function") this.props.onChange(hiddenchannelslib.ObjectUtils.extract(this.props, "formatString", "dateString", "timeString", "timeOffset", "language"));
						}
						render() {
							let input = this, formatter, preview;
							const defaultOffset = ((new Date()).getTimezoneOffset() * (-1/60));
							return hiddenchannelslib.ReactUtils.createElement("div", hiddenchannelslib.ObjectUtils.exclude(Object.assign({}, this.props, {
								className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.dateinputwrapper, this.props.className),
								children: [
									hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SettingsLabel, {
										label: this.props.label
									}),
									hiddenchannelslib.ReactUtils.createElement("div", {
										className: hiddenchannelslib.disCN.dateinputinner,
										children: [
											hiddenchannelslib.ReactUtils.createElement("div", {
												className: hiddenchannelslib.disCN.dateinputcontrols,
												children: [
													hiddenchannelslib.ReactUtils.createElement(class DateInputPreview extends Internal.LibraryModules.React.Component {
														componentDidMount() {formatter = this;}
														render() {
															return hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TextInput, {
																className: hiddenchannelslib.disCN.dateinputfield,
																placeholder: Internal.LibraryComponents.DateInput.getDefaultString(input.props.language),
																value: input.props.formatString,
																onChange: value => {
																	input.props.formatString = value;
																	input.handleChange.apply(input, []);
																	hiddenchannelslib.ReactUtils.forceUpdate(formatter, preview);
																}
															});
														}
													}),
													this.renderInfoButton([
														"$date will be replaced with the Date",
														"$time will be replaced with the Time",
														"$time12 will be replaced with the Time (12h Form)",
														"$month will be replaced with the Month Name",
														"$monthS will be replaced with the Month Name (Short Form)",
														"$day will be replaced with the Weekday Name",
														"$dayS will be replaced with the Weekday Name (Short Form)",
														"$agoAmount will be replaced with ('Today', 'Yesterday', 'x days/weeks/months ago')",
														"$agoDays will be replaced with ('Today', 'Yesterday', 'x days ago')",
														"$agoDate will be replaced with ('Today', 'Yesterday', $date)"
													], {marginRight: 6}),
													this.renderFormatButton({
														name: hiddenchannelslib.LanguageUtils.LanguageStrings.DATE,
														svgName: Internal.LibraryComponents.SvgIcon.Names.CALENDAR,
														placeholder: this.props.dateString,
														getValue: _ => this.props.dateString,
														tooltipText: [
															"$d will be replaced with the Day",
															"$dd will be replaced with the Day (Forced Zeros)",
															"$m will be replaced with the Month",
															"$mm will be replaced with the Month (Forced Zeros)",
															"$yy will be replaced with the Year (2-Digit)",
															"$yyyy will be replaced with the Year (4-Digit)",
															"$month will be replaced with the Month Name",
															"$monthS will be replaced with the Month Name (Short Form)",
														],
														onChange: value => {
															this.props.dateString = value;
															this.handleChange.apply(this, []);
															hiddenchannelslib.ReactUtils.forceUpdate(formatter, preview);
														}
													}),
													this.renderFormatButton({
														name: hiddenchannelslib.LanguageUtils.LibraryStrings.time,
														svgName: Internal.LibraryComponents.SvgIcon.Names.CLOCK,
														placeholder: this.props.timeString,
														getValue: _ => this.props.timeString,
														tooltipText: [
															"$h will be replaced with the Hours",
															"$hh will be replaced with the Hours (Forced Zeros)",
															"$m will be replaced with the Minutes",
															"$mm will be replaced with the Minutes (Forced Zeros)",
															"$s will be replaced with the Seconds",
															"$ss will be replaced with the Seconds (Forced Zeros)",
															"$u will be replaced with the Milliseconds",
															"$uu will be replaced with the Milliseconds (Forced Zeros)"
														],
														onChange: value => {
															this.props.timeString = value;
															this.handleChange.apply(this, []);
															hiddenchannelslib.ReactUtils.forceUpdate(formatter, preview);
														}
													}),
													this.renderFormatButton({
														name: hiddenchannelslib.LanguageUtils.LibraryStrings.location,
														svgName: Internal.LibraryComponents.SvgIcon.Names.GLOBE,
														popoutWidth: 550,
														children: [
															hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.AutoFocusCatcher, {}),
															hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Flex, {
																className: hiddenchannelslib.disCN.marginbottom4,
																align: Internal.LibraryComponents.Flex.Align.CENTER,
																children: [
																	hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SettingsLabel, {
																		label: hiddenchannelslib.LanguageUtils.LanguageStrings.LANGUAGE
																	}),
																	hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Select, {
																		className: hiddenchannelslib.disCN.dateinputfield,
																		value: this.props.language != null ? this.props.language : "$discord",
																		options: Object.keys(hiddenchannelslib.LanguageUtils.languages).map(id => ({
																			value: id,
																			label: hiddenchannelslib.LanguageUtils.getName(hiddenchannelslib.LanguageUtils.languages[id])
																		})),
																		searchable: true,
																		optionRenderer: lang => lang.label,
																		onChange: value => {
																			this.props.language = value == "$discord" ? undefined : value;
																			this.handleChange.apply(this, []);
																			hiddenchannelslib.ReactUtils.forceUpdate(formatter, preview);
																		}
																	})
																]
															}),
															hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Flex, {
																align: Internal.LibraryComponents.Flex.Align.CENTER,
																children: [
																	hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SettingsLabel, {
																		label: hiddenchannelslib.LanguageUtils.LibraryStrings.timezone
																	}),
																	hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Select, {
																		className: hiddenchannelslib.disCN.dateinputfield,
																		value: this.props.timeOffset != null ? this.props.timeOffset : defaultOffset,
																		options: [-12.0, -11.0, -10.0, -9.5, -9.0, -8.0, -7.0, -6.0, -5.0, -4.0, -3.5, -3.0, -2.0, -1.0, 0.0, 1.0, 2.0, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 5.75, 6.0, 6.5, 7.0, 8.0, 8.75, 9.0, 9.5, 10.0, 10.5, 11.0, 12.0, 12.75, 13.0, 14.0].map(offset => ({label: offset< 0 ? offset : `+${offset}`, value: offset})),
																		searchable: true,
																		onChange: value => {
																			this.props.timeOffset = value == defaultOffset ? undefined : value;
																			this.handleChange.apply(this, []);
																			hiddenchannelslib.ReactUtils.forceUpdate(formatter, preview);
																		}
																	})
																]
															})
														]
													})
												]
											}),
											hiddenchannelslib.ReactUtils.createElement(class DateInputPreview extends Internal.LibraryModules.React.Component {
												componentDidMount() {preview = this;}
												render() {
													return !input.props.noPreview && hiddenchannelslib.ReactUtils.createElement("div", {
														className: hiddenchannelslib.disCN.dateinputpreview,
														children: [
															input.props.prefix && hiddenchannelslib.ReactUtils.createElement("div", {
																className: hiddenchannelslib.disCN.dateinputpreviewprefix,
																children: typeof input.props.prefix == "function" ? input.props.prefix(input) : input.props.prefix,
															}),
															hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TextScroller, {
																children: Internal.LibraryComponents.DateInput.format(input.props, new Date((new Date()) - (1000*60*60*24*2)))
															}),
															input.props.suffix && hiddenchannelslib.ReactUtils.createElement("div", {
																className: hiddenchannelslib.disCN.dateinputpreviewsuffix,
																children: typeof input.props.suffix == "function" ? input.props.suffix(input) : input.props.suffix,
															})
														].filter(n => n)
													});
												}
											})
										]
									})
								]
							}), "onChange", "label", "formatString", "dateString", "timeString", "timeOffset", "language", "noPreview", "prefix", "suffix"));
						}
					};
					CustomComponents.DateInput.getDefaultString = function (language) {
						language = language || hiddenchannelslib.LanguageUtils.getLanguage().id;
						const date = new Date();
						return date.toLocaleString(language).replace(date.toLocaleDateString(language), "$date").replace(date.toLocaleTimeString(language, {hourCycle: "h12"}), "$time12").replace(date.toLocaleTimeString(language, {hourCycle: "h11"}), "$time12").replace(date.toLocaleTimeString(language, {hourCycle: "h24"}), "$time").replace(date.toLocaleTimeString(language, {hourCycle: "h23"}), "$time");
					};
					CustomComponents.DateInput.parseDate = function (date, offset) {
						let timeObj = date;
						if (typeof timeObj == "string") {
							const language = hiddenchannelslib.LanguageUtils.getLanguage().id;
							for (let i = 0; i < 12; i++) {
								const tempDate = new Date();
								tempDate.setMonth(i);
								timeObj = timeObj.replace(tempDate.toLocaleDateString(language, {month:"long"}), tempDate.toLocaleDateString("en", {month:"short"}));
							}
							timeObj = new Date(timeObj);
						}
						else if (typeof timeObj == "number") timeObj = new Date(timeObj);
						
						if (timeObj.toString() == "Invalid Date") timeObj = new Date(parseInt(date));
						if (timeObj.toString() == "Invalid Date" || typeof timeObj.toLocaleDateString != "function") timeObj = new Date();
						offset = offset != null && parseFloat(offset);
						if ((offset || offset === 0) && !isNaN(offset)) timeObj = new Date(timeObj.getTime() + ((offset - timeObj.getTimezoneOffset() * (-1/60)) * 60*60*1000));
						return timeObj;
					};
					CustomComponents.DateInput.format = function (data, time) {
						if (typeof data == "string") data = {formatString: data};
						if (data && typeof data.formatString != "string") data.formatString = "";
						if (!data || typeof data.formatString != "string" || !time) return "";
						
						const language = data.language || hiddenchannelslib.LanguageUtils.getLanguage().id;
						const timeObj = Internal.LibraryComponents.DateInput.parseDate(time, data.timeOffset);
						const now = new Date();
						const daysAgo = Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(timeObj.getFullYear(), timeObj.getMonth(), timeObj.getDate()))/(1000*60*60*24));
						const date = data.dateString && typeof data.dateString == "string" ? Internal.LibraryComponents.DateInput.formatDate({dateString: data.dateString, language: language}, timeObj) : timeObj.toLocaleDateString(language);
						
						return (data.formatString || Internal.LibraryComponents.DateInput.getDefaultString(language))
							.replace(/\$date/g, date)
							.replace(/\$time12/g, data.timeString && typeof data.timeString == "string" ? Internal.LibraryComponents.DateInput.formatTime({timeString: data.timeString, language: language}, timeObj, true) : timeObj.toLocaleTimeString(language, {hourCycle: "h12"}))
							.replace(/\$time/g, data.timeString && typeof data.timeString == "string" ? Internal.LibraryComponents.DateInput.formatTime({timeString: data.timeString, language: language}, timeObj) : timeObj.toLocaleTimeString(language, {hourCycle: "h23"}))
							.replace(/\$monthS/g, timeObj.toLocaleDateString(language, {month: "short"}))
							.replace(/\$month/g, timeObj.toLocaleDateString(language, {month: "long"}))
							.replace(/\$dayS/g, timeObj.toLocaleDateString(language, {weekday: "short"}))
							.replace(/\$day/g, timeObj.toLocaleDateString(language, {weekday: "long"}))
							.replace(/\$agoAmount/g, daysAgo < 0 ? "" : daysAgo > 1 ? Internal.DiscordObjects.Timestamp(timeObj.getTime()).fromNow() : hiddenchannelslib.LanguageUtils.LanguageStrings[`SEARCH_SHORTCUT_${daysAgo == 1 ? "YESTERDAY" : "TODAY"}`])
							.replace(/\$agoDays/g, daysAgo < 0 ? "" : daysAgo > 1 ? hiddenchannelslib.LanguageUtils.LanguageStringsFormat(`GAME_LIBRARY_LAST_PLAYED_DAYS`, daysAgo) : hiddenchannelslib.LanguageUtils.LanguageStrings[`SEARCH_SHORTCUT_${daysAgo == 1 ? "YESTERDAY" : "TODAY"}`])
							.replace(/\$agoDate/g, daysAgo < 0 ? "" : daysAgo > 1 ? date : hiddenchannelslib.LanguageUtils.LanguageStrings[`SEARCH_SHORTCUT_${daysAgo == 1 ? "YESTERDAY" : "TODAY"}`])
							.replace(/\(\)|\[\]/g, "").replace(/,\s*$|^\s*,/g, "").replace(/ +/g, " ").trim();
					};
					CustomComponents.DateInput.formatDate = function (data, time) {
						if (typeof data == "string") data = {dateString: data};
						if (data && typeof data.dateString != "string") return "";
						if (!data || typeof data.dateString != "string" || !data.dateString || !time) return "";
						
						const language = data.language || hiddenchannelslib.LanguageUtils.getLanguage().id;
						const timeObj = Internal.LibraryComponents.DateInput.parseDate(time, data.timeOffset);
						
						return data.dateString
							.replace(/\$monthS/g, timeObj.toLocaleDateString(language, {month: "short"}))
							.replace(/\$month/g, timeObj.toLocaleDateString(language, {month: "long"}))
							.replace(/\$dd/g, timeObj.toLocaleDateString(language, {day: "2-digit"}))
							.replace(/\$d/g, timeObj.toLocaleDateString(language, {day: "numeric"}))
							.replace(/\$mm/g, timeObj.toLocaleDateString(language, {month: "2-digit"}))
							.replace(/\$m/g, timeObj.toLocaleDateString(language, {month: "numeric"}))
							.replace(/\$yyyy/g, timeObj.toLocaleDateString(language, {year: "numeric"}))
							.replace(/\$yy/g, timeObj.toLocaleDateString(language, {year: "2-digit"}))
							.trim();
					};
					CustomComponents.DateInput.formatTime = function (data, time, hour12) {
						if (typeof data == "string") data = {timeString: data};
						if (data && typeof data.timeString != "string") return "";
						if (!data || typeof data.timeString != "string" || !data.timeString || !time) return "";
						
						const language = data.language || hiddenchannelslib.LanguageUtils.getLanguage().id;
						const timeObj = Internal.LibraryComponents.DateInput.parseDate(time, data.timeOffset);
						
						let hours = timeObj.getHours();
						if (hour12) {
							hours = hours == 0 ? 12 : hours;
							if (hours > 12) hours -= 12;
						}
						const minutes = timeObj.getMinutes();
						const seconds = timeObj.getSeconds();
						const milli = timeObj.getMilliseconds();
						
						let string = data.timeString
							.replace(/\$hh/g, hours < 10 ? `0${hours}` : hours)
							.replace(/\$h/g, hours)
							.replace(/\$mm/g, minutes < 10 ? `0${minutes}` : minutes)
							.replace(/\$m/g, minutes)
							.replace(/\$ss/g, seconds < 10 ? `0${seconds}` : seconds)
							.replace(/\$s/g, seconds)
							.replace(/\$uu/g, milli < 10 ? `00${seconds}` : milli < 100 ? `0${milli}` : milli)
							.replace(/\$u/g, milli)
							.trim();

						let digits = "\\d";
						if (hiddenchannelslib.LanguageUtils.languages[language] && hiddenchannelslib.LanguageUtils.languages[language].numberMap) {
							digits = Object.entries(hiddenchannelslib.LanguageUtils.languages[language].numberMap).map(n => n[1]).join("");
							for (let number in hiddenchannelslib.LanguageUtils.languages[language].numberMap) string = string.replace(new RegExp(number, "g"), hiddenchannelslib.LanguageUtils.languages[language].numberMap[number]);
						}
						return hour12 ? timeObj.toLocaleTimeString(language, {hourCycle: "h12"}).replace(new RegExp(`[${digits}]{1,2}[^${digits}][${digits}]{1,2}[^${digits}][${digits}]{1,2}`, "g"), string) : string;
					};
					
					CustomComponents.EmojiPickerButton = reactInitialized && class hiddenchannelslib_EmojiPickerButton extends Internal.LibraryModules.React.Component {
						handleEmojiChange(emoji) {
							if (emoji != null) {
								this.props.emoji = emoji.id ? {
									id: emoji.id,
									name: emoji.name,
									animated: emoji.animated
								} : {
									id: null,
									name: emoji.optionallyDiverseSequence,
									animated: false
								};
								if (typeof this.props.onSelect == "function") this.props.onSelect(this.props.emoji, this);
								if (typeof this.close == "function" && !hiddenchannelslib.ListenerUtils.isPressed(16)) this.close();
								hiddenchannelslib.ReactUtils.forceUpdate(this);
							}
						}
						render() {
							let button = this;
							return hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.PopoutContainer, {
								children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.EmojiButton, {
									className: hiddenchannelslib.DOMUtils.formatClassName(this.props.className, hiddenchannelslib.disCN.emojiinputbutton),
									renderButtonContents: this.props.emoji ? _ => hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Emoji, {
										className: hiddenchannelslib.disCN.emoji,
										emojiId: this.props.emoji.id,
										emojiName: this.props.emoji.name
									}) : null
								}),
								wrap: false,
								animation: Internal.LibraryComponents.PopoutContainer.Animation.NONE,
								position: Internal.LibraryComponents.PopoutContainer.Positions.TOP,
								align: Internal.LibraryComponents.PopoutContainer.Align.LEFT,
								renderPopout: instance => {
									this.close = instance.close;
									return [
										hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.EmojiPicker, {
											closePopout: this.close,
											onSelectEmoji: this.handleEmojiChange.bind(this),
											allowManagedEmojis: this.props.allowManagedEmojis,
											allowManagedEmojisUsage: this.props.allowManagedEmojisUsage
										}),
										hiddenchannelslib.ReactUtils.createElement(class extends Internal.LibraryModules.React.Component {
											componentDidMount() {Internal.LibraryComponents.EmojiPickerButton.current = button;}
											componentWillUnmount() {delete Internal.LibraryComponents.EmojiPickerButton.current;}
											render() {return null;}
										})
									];
								}
							});
						}
					};
					Internal.setDefaultProps(CustomComponents.EmojiPickerButton, {allowManagedEmojis: false, allowManagedEmojisUsage: false});
					
					CustomComponents.FavButton = reactInitialized && class hiddenchannelslib_FavButton extends Internal.LibraryModules.React.Component {
						handleClick() {
							this.props.isFavorite = !this.props.isFavorite;
							if (typeof this.props.onClick == "function") this.props.onClick(this.props.isFavorite, this);
							hiddenchannelslib.ReactUtils.forceUpdate(this);
						}
						render() {
							return hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Clickable, {
								className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.favbuttoncontainer, hiddenchannelslib.disCN.favbutton, this.props.isFavorite && hiddenchannelslib.disCN.favbuttonselected, this.props.className),
								onClick: this.handleClick.bind(this),
								children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SvgIcon, {
									name: Internal.LibraryComponents.SvgIcon.Names[this.props.isFavorite ? "FAVORITE_FILLED" : "FAVORITE"],
									width: this.props.width || 24,
									height: this.props.height || 24,
									className: hiddenchannelslib.disCN.favbuttonicon
								})
							});
						}
					};
					
					CustomComponents.FileButton = reactInitialized && class hiddenchannelslib_FileButton extends Internal.LibraryModules.React.Component {
						componentDidMount() {
							if (this.props.searchFolders) {
								let node = hiddenchannelslib.ReactUtils.findDOMNode(this);
								if (node && (node = node.querySelector("input[type='file']")) != null) {
									node.setAttribute("directory", "");
									node.setAttribute("webkitdirectory", "");
								}
							}
						}
						render() {
							let filter = this.props.filter && [this.props.filter].flat(10).filter(n => typeof n == "string") || [];
							return hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Button, hiddenchannelslib.ObjectUtils.exclude(Object.assign({}, this.props, {
								onClick: e => {e.currentTarget.querySelector("input").click();},
								children: [
									hiddenchannelslib.LanguageUtils.LibraryStrings.file_navigator_text,
									hiddenchannelslib.ReactUtils.createElement("input", {
										type: "file",
										accept: filter.length && (filter.join("/*,") + "/*"),
										style: {display: "none"},
										onChange: e => {
											let file = e.currentTarget.files[0];
											if (this.refInput && file && (!filter.length || filter.some(n => file.type.indexOf(n) == 0))) {
												this.refInput.props.value = this.props.searchFolders ? file.path.split(file.name).slice(0, -1).join(file.name) : `${this.props.mode == "url" ? "url('" : ""}${(this.props.useFilePath) ? file.path : `data:${file.type};base64,${Internal.LibraryRequires.fs.readFileSync(file.path).toString("base64")}`}${this.props.mode ? "')" : ""}`;
												hiddenchannelslib.ReactUtils.forceUpdate(this.refInput);
												this.refInput.handleChange(this.refInput.props.value);
											}
										}
									})
								]
							}), "filter", "mode", "useFilePath", "searchFolders"));
						}
					};
					
					CustomComponents.FormComponents = {};
					CustomComponents.FormComponents.FormItem = reactInitialized && class hiddenchannelslib_FormItem extends Internal.LibraryModules.React.Component {
						render() {
							return hiddenchannelslib.ReactUtils.createElement("div", {
								className: this.props.className,
								style: this.props.style,
								children: [
									hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Flex, {
										align: Internal.LibraryComponents.Flex.Align.BASELINE,
										children: [
											this.props.title != null || this.props.error != null ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Flex.Child, {
												wrap: true,
												children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.FormComponents.FormTitle, {
													tag: this.props.tag || Internal.LibraryComponents.FormComponents.FormTitle.Tags.H5,
													disabled: this.props.disabled,
													required: this.props.required,
													error: this.props.error,
													className: this.props.titleClassName,
													children: this.props.title
												})
											}) : null
										].concat([this.props.titleChildren].flat(10)).filter(n => n)
									}),
								].concat(this.props.children)
							});
						}
					};
					
					CustomComponents.GuildComponents = {};
					CustomComponents.GuildComponents.Guild = reactInitialized && class hiddenchannelslib_Guild extends Internal.LibraryModules.React.Component {
						constructor(props) {
							super(props);
							this.state = {hovered: false};
						}
						handleMouseEnter(e) {
							if (!this.props.sorting) this.setState({hovered: true});
							if (typeof this.props.onMouseEnter == "function") this.props.onMouseEnter(e, this);
						}
						handleMouseLeave(e) {
							if (!this.props.sorting) this.setState({hovered: false});
							if (typeof this.props.onMouseLeave == "function") this.props.onMouseLeave(e, this);
						}
						handleMouseDown(e) {
							if (!this.props.unavailable && this.props.guild && this.props.selectedChannelId) Internal.LibraryModules.DirectMessageUtils.preload(this.props.guild.id, this.props.selectedChannelId);
							if (e.button == 0 && typeof this.props.onMouseDown == "function") this.props.onMouseDown(e, this);
						}
						handleMouseUp(e) {
							if (e.button == 0 && typeof this.props.onMouseUp == "function") this.props.onMouseUp(e, this);
						}
						handleClick(e) {
							if (typeof this.props.onClick == "function") this.props.onClick(e, this);
						}
						handleContextMenu(e) {
							if (this.props.menu) hiddenchannelslib.GuildUtils.openMenu(this.props.guild, e);
							if (typeof this.props.onContextMenu == "function") this.props.onContextMenu(e, this);
						}
						setRef(e) {
							if (typeof this.props.setRef == "function") this.props.setRef(this.props.guild.id, e)
						}
						componentDidMount() {
							let node = hiddenchannelslib.ReactUtils.findDOMNode(this);
							if (node && node.nodeType != Node.TEXT_NODE) for (let child of node.querySelectorAll("a")) child.setAttribute("draggable", false);
						}
						render() {
							if (!this.props.guild) return null;
							
							this.props.guildId = this.props.guild.id;
							this.props.selectedChannelId = Internal.LibraryModules.LastChannelStore.getChannelId(this.props.guild.id);
							
							let currentVoiceChannel = Internal.LibraryModules.ChannelStore.getChannel(Internal.LibraryModules.CurrentVoiceUtils.getChannelId());
							let hasVideo = currentVoiceChannel && Internal.LibraryModules.VoiceUtils.hasVideo(currentVoiceChannel);
							
							this.props.selected = this.props.state ? Internal.LibraryModules.LastGuildStore.getGuildId() == this.props.guild.id : false;
							this.props.unread = this.props.state ? Internal.LibraryModules.UnreadGuildUtils.hasUnread(this.props.guild.id) : false;
							this.props.badge = this.props.state ? Internal.LibraryModules.UnreadGuildUtils.getMentionCount(this.props.guild.id) : 0;
							
							this.props.mediaState = Object.assign({}, this.props.mediaState, {
								audio: this.props.state ? currentVoiceChannel && currentVoiceChannel.guild_id == this.props.guild.id && !hasVideo : false,
								video: this.props.state ? currentVoiceChannel && currentVoiceChannel.guild_id == this.props.guild.id && hasVideo : false,
								screenshare: this.props.state ? !!Internal.LibraryModules.StreamUtils.getAllApplicationStreams().filter(stream => stream.guildId == this.props.guild.id)[0] : false,
								liveStage: this.props.state ? Object.keys(Internal.LibraryModules.StageChannelStore.getStageInstancesByGuild(this.props.guild.id)).length > 0 : false,
								hasLiveVoiceChannel: this.props.state && false ? !Internal.LibraryModules.MutedUtils.isMuted(this.props.guild.id) && hiddenchannelslib.ObjectUtils.toArray(Internal.LibraryModules.VoiceUtils.getVoiceStates(this.props.guild.id)).length > 0 : false,
								participating: this.props.state ? Internal.LibraryModules.CurrentVoiceUtils.getGuildId() == this.props.guild.id : false,
								participatingInStage: this.props.state ? currentVoiceChannel && currentVoiceChannel.guild_id == this.props.guild.id && currentVoiceChannel.isGuildStageVoice() : false
							});
							
							this.props.animatable = this.props.state ? this.props.guild.icon && Internal.LibraryModules.IconUtils.isAnimatedIconHash(this.props.guild.icon) : false;
							this.props.unavailable = this.props.state ? Internal.LibraryModules.GuildUnavailableStore.unavailableGuilds.includes(this.props.guild.id) : false;
						
							let isDraggedGuild = this.props.draggingGuildId === this.props.guild.id;
							let guild = isDraggedGuild ? hiddenchannelslib.ReactUtils.createElement("div", {
								children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.GuildComponents.DragPlaceholder, {})
							}) : hiddenchannelslib.ReactUtils.createElement("div", {
								className: hiddenchannelslib.disCN.guildcontainer,
								children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.GuildComponents.BlobMask, {
									selected: this.state.isDropHovering || this.props.selected || this.state.hovered,
									upperBadge: this.props.unavailable ? Internal.LibraryModules.GuildBadgeUtils.renderUnavailableBadge() : Internal.LibraryModules.GuildBadgeUtils.renderMediaBadge(this.props.mediaState),
									lowerBadge: this.props.badge > 0 ? Internal.LibraryModules.GuildBadgeUtils.renderMentionBadge(this.props.badge) : null,
									lowerBadgeWidth: Internal.LibraryComponents.Badges.getBadgeWidthForValue(this.props.badge),
									children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.NavItem, {
										to: {
											pathname: hiddenchannelslib.DiscordConstants.Routes.CHANNEL(this.props.guild.id, this.props.selectedChannelId),
											state: {
												analyticsSource: {
													page: hiddenchannelslib.DiscordConstants.AnalyticsPages.GUILD_CHANNEL,
													section: hiddenchannelslib.DiscordConstants.AnalyticsSections.CHANNEL_LIST,
													object: hiddenchannelslib.DiscordConstants.AnalyticsObjects.CHANNEL
												}
											}
										},
										name: this.props.guild.name,
										onMouseEnter: this.handleMouseEnter.bind(this),
										onMouseLeave: this.handleMouseLeave.bind(this),
										onMouseDown: this.handleMouseDown.bind(this),
										onMouseUp: this.handleMouseUp.bind(this),
										onClick: this.handleClick.bind(this),
										onContextMenu: this.handleContextMenu.bind(this),
										icon: this.props.guild.getIconURL(this.props.iconSize || 96, this.state.hovered && this.props.animatable),
										selected: this.props.selected || this.state.hovered
									})
								})
							});
							
							let children = [
								this.props.list || this.props.pill ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.GuildComponents.Pill, {
									hovered: !isDraggedGuild && this.state.hovered,
									selected: !isDraggedGuild && this.props.selected,
									unread: !isDraggedGuild && this.props.unread,
									className: hiddenchannelslib.disCN.guildpill
								}) : null,
								!this.props.tooltip ? guild : hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TooltipContainer, {
									tooltipConfig: Object.assign({type: "right"}, this.props.tooltipConfig, {guild: this.props.list && this.props.guild}),
									children: guild
								})
							].filter(n => n);
							return this.props.list ? hiddenchannelslib.ReactUtils.createElement("div", {
								ref: null != this.props.setRef ? this.props.setRef : null,
								className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.guildouter, hiddenchannelslib.disCN._bdguild, this.props.unread && hiddenchannelslib.disCN._bdguildunread, this.props.selected && hiddenchannelslib.disCN._bdguildselected, this.props.unread && hiddenchannelslib.disCN._bdguildunread, this.props.audio && hiddenchannelslib.disCN._bdguildaudio, this.props.video && hiddenchannelslib.disCN._bdguildvideo),
								children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryModules.React.Fragment, {
									children: children
								})
							}) : hiddenchannelslib.ReactUtils.createElement("div", {
								className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.guild, this.props.className),
								children: children
							});
						}
					};
					Internal.setDefaultProps(CustomComponents.GuildComponents.Guild, {menu: true, tooltip: true, list: false, state: false, draggable: false, sorting: false});
					
					CustomComponents.GuildSummaryItem = reactInitialized && class hiddenchannelslib_GuildSummaryItem extends Internal.LibraryModules.React.Component {
						defaultRenderGuild(guild, isLast) {
							if (!guild) return hiddenchannelslib.ReactUtils.createElement("div", {
								className: hiddenchannelslib.disCN.guildsummaryemptyguild
							});
							let icon = hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.GuildComponents.Icon, {
								className: hiddenchannelslib.disCN.guildsummaryicon,
								guild: guild,
								showTooltip: this.props.showTooltip,
								tooltipPosition: "top",
								size: Internal.LibraryComponents.GuildComponents.Icon.Sizes.SMALLER
							});
							return this.props.switchOnClick ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Clickable, {
								className: hiddenchannelslib.disCN.guildsummaryclickableicon,
								onClick: _ => Internal.LibraryModules.HistoryUtils.transitionTo(hiddenchannelslib.DiscordConstants.Routes.CHANNEL(guild.id, Internal.LibraryModules.LastChannelStore.getChannelId(guild.id))),
								key: guild.id,
								tabIndex: -1,
								children: icon
							}) : icon;
						}
						renderGuilds() {
							let elements = [];
							let renderGuild = typeof this.props.renderGuild != "function" ? this.defaultRenderGuild : this.props.renderGuild;
							let loaded = 0, max = this.props.guilds.length === this.props.max ? this.props.guilds.length : this.props.max - 1;
							while (loaded < max && loaded < this.props.guilds.length) {
								let isLast = loaded === this.props.guilds.length - 1;
								let guild = renderGuild.apply(this, [this.props.guilds[loaded], isLast]);
								elements.push(hiddenchannelslib.ReactUtils.createElement("div", {
									className: isLast ? hiddenchannelslib.disCN.guildsummaryiconcontainer : hiddenchannelslib.disCN.guildsummaryiconcontainermasked,
									children: guild
								}));
								loaded++;
							}
							if (loaded < this.props.guilds.length) {
								let rest = Math.min(this.props.guilds.length - loaded, 99);
								elements.push(hiddenchannelslib.ReactUtils.createElement(Internal.LibraryModules.React.Fragment, {
									key: "more-guilds",
									children: this.props.renderMoreGuilds("+" + rest, rest, this.props.guilds.slice(loaded), this.props)
								}));
							}
							return elements;
						}
						renderIcon() {
							return this.props.renderIcon ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SvgIcon, {
								name: Internal.LibraryComponents.SvgIcon.Names.WHATISTHIS,
								className: hiddenchannelslib.disCN.guildsummarysvgicon
							}) : null;
						}
						render() {
							return hiddenchannelslib.ReactUtils.createElement("div", {
								className: hiddenchannelslib.DOMUtils.formatClassName(this.props.className, hiddenchannelslib.disCN.guildsummarycontainer),
								ref: this.props._ref,
								children: [
									this.renderIcon.apply(this),
									this.renderGuilds.apply(this)
								].flat(10).filter(n => n)
							});
						}
					};
					Internal.setDefaultProps(CustomComponents.GuildSummaryItem, {max: 10, renderMoreGuilds: (count, amount, restGuilds, props) => {
						let icon = hiddenchannelslib.ReactUtils.createElement("div", {className: hiddenchannelslib.disCN.guildsummarymoreguilds, children: count});
						return props.showTooltip ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TooltipContainer, {
							text: restGuilds.map(guild => guild.name).join(", "),
							children: icon
						}) : icon;
					}, renderIcon: false});
					
					CustomComponents.GuildVoiceList = reactInitialized && class hiddenchannelslib_GuildVoiceList extends Internal.LibraryModules.React.Component {
						render() {
							let channels = Internal.LibraryModules.GuildChannelStore.getChannels(this.props.guild.id);
							let voiceChannels = (channels[Internal.LibraryModules.GuildChannelKeys.GUILD_VOCAL_CHANNELS_KEY] || []).filter(c => c.channel.type == hiddenchannelslib.DiscordConstants.ChannelTypes.GUILD_VOICE).map(c => c.channel.id);
							let stageChannels = (channels[Internal.LibraryModules.GuildChannelKeys.GUILD_VOCAL_CHANNELS_KEY] || []).filter(c => c.channel.type == hiddenchannelslib.DiscordConstants.ChannelTypes.GUILD_STAGE_VOICE && Internal.LibraryModules.StageChannelStore.getStageInstanceByChannel(c.channel.id)).map(c => c.channel.id);
							let streamOwnerIds = Internal.LibraryModules.StreamUtils.getAllApplicationStreams().filter(app => app.guildId === this.props.guild.id).map(app => app.ownerId) || [];
							let streamOwners = streamOwnerIds.map(ownerId => Internal.LibraryModules.UserStore.getUser(ownerId)).filter(n => n);
							let connectedVoiceUsers = hiddenchannelslib.ObjectUtils.toArray(Internal.LibraryModules.VoiceUtils.getVoiceStates(this.props.guild.id)).map(state => voiceChannels.includes(state.channelId) && state.channelId != this.props.guild.afkChannelId && !streamOwnerIds.includes(state.userId) && Internal.LibraryModules.UserStore.getUser(state.userId)).filter(n => n);
							let connectedStageUsers = hiddenchannelslib.ObjectUtils.toArray(Internal.LibraryModules.VoiceUtils.getVoiceStates(this.props.guild.id)).map(state => stageChannels.includes(state.channelId) && state.channelId != this.props.guild.afkChannelId && !streamOwnerIds.includes(state.userId) && Internal.LibraryModules.UserStore.getUser(state.userId)).filter(n => n);
							let children = [
								!connectedStageUsers.length ? null : hiddenchannelslib.ReactUtils.createElement("div", {
									className: hiddenchannelslib.disCN.tooltiprow,
									children: [
										hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SvgIcon, {
											name: Internal.LibraryComponents.SvgIcon.Names.PODIUM,
											className: hiddenchannelslib.disCN.tooltipactivityicon
										}),
										hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.UserSummaryItem, {
											users: connectedStageUsers,
											max: 6
										})
									]
								}),
								!connectedVoiceUsers.length ? null : hiddenchannelslib.ReactUtils.createElement("div", {
									className: hiddenchannelslib.disCN.tooltiprow,
									children: [
										hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SvgIcon, {
											name: Internal.LibraryComponents.SvgIcon.Names.SPEAKER,
											className: hiddenchannelslib.disCN.tooltipactivityicon
										}),
										hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.UserSummaryItem, {
											users: connectedVoiceUsers,
											max: 6
										})
									]
								}),
								!streamOwners.length ? null : hiddenchannelslib.ReactUtils.createElement("div", {
									className: hiddenchannelslib.disCN.tooltiprow,
									children: [
										hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SvgIcon, {
											name: Internal.LibraryComponents.SvgIcon.Names.STREAM,
											className: hiddenchannelslib.disCN.tooltipactivityicon
										}),
										hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.UserSummaryItem, {
											users: streamOwners,
											max: 6
										})
									]
								})
							].filter(n => n);
							return !children.length ? null : hiddenchannelslib.ReactUtils.createElement("div", {
								className: hiddenchannelslib.disCN.guildvoicelist,
								children: children
							});
						}
					};
					
					CustomComponents.KeybindRecorder = reactInitialized && class hiddenchannelslib_KeybindRecorder extends Internal.LibraryModules.React.Component {
						handleChange(arrays) {
							this.props.value = arrays.map(platformKey => Internal.LibraryModules.KeyEvents.codes[Internal.LibraryModules.KeyCodeUtils.codeToKey(platformKey)] || platformKey[1]);
							if (typeof this.props.onChange == "function") this.props.onChange(this.props.value, this);
						}
						handleReset() {
							this.props.value = [];
							if (this.recorder) this.recorder.setState({codes: []});
							if (typeof this.props.onChange == "function") this.props.onChange([], this);
							if (typeof this.props.onReset == "function") this.props.onReset(this);
						}
						componentDidMount() {
							if (!this.recorder) this.recorder = hiddenchannelslib.ReactUtils.findOwner(this, {name: "KeybindRecorder"});
						}
						render() {
							return hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Flex, {
								className: hiddenchannelslib.disCN.hotkeywrapper,
								direction: Internal.LibraryComponents.Flex.Direction.HORIZONTAL,
								align: Internal.LibraryComponents.Flex.Align.CENTER,
								children: [
									hiddenchannelslib.ReactUtils.createElement(Internal.NativeSubComponents.KeybindRecorder, hiddenchannelslib.ObjectUtils.exclude(Object.assign({}, this.props, {
										defaultValue: [this.props.defaultValue || this.props.value].flat(10).filter(n => n).map(keyCode => [hiddenchannelslib.DiscordConstants.KeyboardDeviceTypes.KEYBOARD_KEY, Internal.LibraryModules.KeyCodeUtils.keyToCode((Object.entries(Internal.LibraryModules.KeyEvents.codes).find(n => n[1] == keyCode && Internal.LibraryModules.KeyCodeUtils.keyToCode(n[0], null)) || [])[0], null) || keyCode]),
										onChange: this.handleChange.bind(this)
									}), "reset", "onReset")),
									this.props.reset || this.props.onReset ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TooltipContainer, {
										text: hiddenchannelslib.LanguageUtils.LanguageStrings.REMOVE_KEYBIND,
										tooltipConfig: {type: "top"},
										children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Clickable, {
											className: hiddenchannelslib.disCN.hotkeyresetbutton,
											onClick: this.handleReset.bind(this),
											children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SvgIcon, {
												iconSVG: `<svg height="20" width="20" viewBox="0 0 20 20"><path fill="currentColor" d="M 14.348 14.849 c -0.469 0.469 -1.229 0.469 -1.697 0 l -2.651 -3.030 -2.651 3.029 c -0.469 0.469 -1.229 0.469 -1.697 0 -0.469 -0.469 -0.469 -1.229 0 -1.697l2.758 -3.15 -2.759 -3.152 c -0.469 -0.469 -0.469 -1.228 0 -1.697 s 1.228 -0.469 1.697 0 l 2.652 3.031 2.651 -3.031 c 0.469 -0.469 1.228 -0.469 1.697 0 s 0.469 1.229 0 1.697l -2.758 3.152 2.758 3.15 c 0.469 0.469 0.469 1.229 0 1.698 z"></path></svg>`,
											})
										})
									}) : null
								].filter(n => n)
							});
						}
					};
					
					CustomComponents.ListRow = reactInitialized && class hiddenchannelslib_ListRow extends Internal.LibraryModules.React.Component {
						render() {
							return hiddenchannelslib.ReactUtils.createElement("div", hiddenchannelslib.ObjectUtils.exclude(Object.assign({}, this.props, {
								className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.listrowwrapper, this.props.className, hiddenchannelslib.disCN.listrow),
								children: [
									this.props.prefix,
									hiddenchannelslib.ReactUtils.createElement("div", {
										className: hiddenchannelslib.disCN.listrowcontent,
										style: {flex: "1 1 auto"},
										children: [
											hiddenchannelslib.ReactUtils.createElement("div", {
												className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.listname, this.props.labelClassName),
												style: {flex: "1 1 auto"},
												children: this.props.label
											}),
											typeof this.props.note == "string" ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.FormComponents.FormText, {
												type: Internal.LibraryComponents.FormComponents.FormText.Types.DESCRIPTION,
												children: this.props.note
											}) : null
										].filter(n => n)
									}),
									this.props.suffix
								].filter(n => n)
							}), "label", "note", "suffix", "prefix", "labelClassName"));
						}
					};
					
					CustomComponents.MemberRole = reactInitialized && class hiddenchannelslib_MemberRole extends Internal.LibraryModules.React.Component {
						handleClick(e) {if (typeof this.props.onClick == "function") this.props.onClick(e, this);}
						handleContextMenu(e) {if (typeof this.props.onContextMenu == "function") this.props.onContextMenu(e, this);}
						render() {
							let color = hiddenchannelslib.ColorUtils.convert(this.props.role.colorString, "RGB") || hiddenchannelslib.DiscordConstants.Colors.PRIMARY_DARK_300;
							return hiddenchannelslib.ReactUtils.createElement("li", {
								className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.userpopoutrole, this.props.className),
								style: {borderColor: hiddenchannelslib.ColorUtils.setAlpha(color, 0.6)},
								onClick: this.handleClick.bind(this),
								onContextMenu: this.handleContextMenu.bind(this),
								children: [
									!this.props.noCircle ? hiddenchannelslib.ReactUtils.createElement("div", {
										className: hiddenchannelslib.disCN.userpopoutroleremovebutton,
										children: hiddenchannelslib.ReactUtils.createElement("span", {
											className: hiddenchannelslib.disCN.userpopoutrolecircle,
											style: {backgroundColor: color}
										})
									}) : null,
									hiddenchannelslib.ReactUtils.createElement("div", {
										className: hiddenchannelslib.disCN.userpopoutrolename,
										children: this.props.role.name
									})
								].filter(n => n)
							});
						}
					};
					
					CustomComponents.MenuItems = {};
					CustomComponents.MenuItems.MenuCheckboxItem = reactInitialized && class hiddenchannelslib_MenuCheckboxItem extends Internal.LibraryModules.React.Component {
						handleClick() {
							if (this.props.state) {
								this.props.state.checked = !this.props.state.checked;
								if (typeof this.props.action == "function") this.props.action(this.props.state.checked, this);
							}
							hiddenchannelslib.ReactUtils.forceUpdate(this);
						}
						render() {
							return hiddenchannelslib.ReactUtils.createElement(Internal.MenuItem, Object.assign({}, this.props, {
								input: this.props.state && this.props.state.checked ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SvgIcon, {
									className: hiddenchannelslib.disCN.menuicon,
									background: hiddenchannelslib.disCN.menucheckbox,
									foreground: hiddenchannelslib.disCN.menucheck,
									name: Internal.LibraryComponents.SvgIcon.Names.CHECKBOX
								}) : hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SvgIcon, {
									className: hiddenchannelslib.disCN.menuicon,
									name: Internal.LibraryComponents.SvgIcon.Names.CHECKBOX_EMPTY
								}),
								action: this.handleClick.bind(this)
							}));
						}
					};
					
					CustomComponents.MenuItems.MenuHint = reactInitialized && class hiddenchannelslib_MenuHint extends Internal.LibraryModules.React.Component {
						render() {
							return !this.props.hint ? null : hiddenchannelslib.ReactUtils.createElement("div", {
								className: hiddenchannelslib.disCN.menuhint,
								children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TextScroller, {
									children: this.props.hint
								})
							});
						}
					};
					
					CustomComponents.MenuItems.MenuIcon = reactInitialized && class hiddenchannelslib_MenuIcon extends Internal.LibraryModules.React.Component {
						render() {
							let isString = typeof this.props.icon == "string";
							return !this.props.icon ? null : hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SvgIcon, {
								className: hiddenchannelslib.disCN.menuicon,
								nativeClass: true,
								iconSVG: isString ? this.props.icon : null,
								name: !isString ? this.props.icon : null
							});
						}
					};
					
					CustomComponents.MenuItems.MenuSliderItem = reactInitialized && class hiddenchannelslib_MenuSliderItem extends Internal.LibraryModules.React.Component {
						handleValueChange(value) {
							if (this.props.state) {
								this.props.state.value = Math.round(hiddenchannelslib.NumberUtils.mapRange([0, 100], [this.props.minValue, this.props.maxValue], value) * Math.pow(10, this.props.digits)) / Math.pow(10, this.props.digits);
								if (typeof this.props.onValueChange == "function") this.props.onValueChange(this.props.state.value, this);
							}
							hiddenchannelslib.ReactUtils.forceUpdate(this);
						}
						handleValueRender(value) {
							let newValue = Math.round(hiddenchannelslib.NumberUtils.mapRange([0, 100], [this.props.minValue, this.props.maxValue], value) * Math.pow(10, this.props.digits)) / Math.pow(10, this.props.digits);
							if (typeof this.props.onValueRender == "function") {
								let tempReturn = this.props.onValueRender(newValue, this);
								if (tempReturn != undefined) newValue = tempReturn;
							}
							return newValue;
						}
						render() {
							let value = this.props.state && this.props.state.value || 0;
							return hiddenchannelslib.ReactUtils.createElement(Internal.NativeSubComponents.MenuControlItem, hiddenchannelslib.ObjectUtils.exclude(Object.assign({}, this.props, {
								label: typeof this.props.renderLabel == "function" ? this.props.renderLabel(Math.round(value * Math.pow(10, this.props.digits)) / Math.pow(10, this.props.digits), this) : this.props.label,
								control: (menuItemProps, ref) => {
									return hiddenchannelslib.ReactUtils.createElement("div", {
										className: hiddenchannelslib.disCN.menuslidercontainer,
										children: hiddenchannelslib.ReactUtils.createElement(Internal.NativeSubComponents.Slider, Object.assign({}, menuItemProps, {
											ref: ref,
											className: hiddenchannelslib.disCN.menuslider,
											mini: true,
											initialValue: Math.round(hiddenchannelslib.NumberUtils.mapRange([this.props.minValue, this.props.maxValue], [0, 100], value) * Math.pow(10, this.props.digits)) / Math.pow(10, this.props.digits),
											onValueChange: this.handleValueChange.bind(this),
											onValueRender: this.handleValueRender.bind(this)
										}))
									});
								}
							}), "digits", "renderLabel"));
						}
					};
					Internal.setDefaultProps(CustomComponents.MenuItems.MenuSliderItem, {minValue: 0, maxValue: 100, digits: 0});
					
					CustomComponents.ModalComponents = {};
					CustomComponents.ModalComponents.ModalContent = reactInitialized && class hiddenchannelslib_ModalContent extends Internal.LibraryModules.React.Component {
						render() {
							return this.props.scroller ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Scrollers.Thin, {
								className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.modalcontent, this.props.className),
								ref: this.props.scrollerRef,
								children: this.props.children
							}) : hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Flex, {
								className: hiddenchannelslib.DOMUtils.formatClassName(this.props.content && hiddenchannelslib.disCN.modalcontent, hiddenchannelslib.disCN.modalnoscroller, this.props.className),
								direction: this.props.direction || Internal.LibraryComponents.Flex.Direction.VERTICAL,
								align: Internal.LibraryComponents.Flex.Align.STRETCH,
								children: this.props.children
							});
						}
					};
					Internal.setDefaultProps(CustomComponents.ModalComponents.ModalContent, {scroller: true, content: true});
					
					CustomComponents.ModalComponents.ModalTabContent = reactInitialized && class hiddenchannelslib_ModalTabContent extends Internal.LibraryModules.React.Component {
						render() {
							return !this.props.open ? null : hiddenchannelslib.ReactUtils.createElement(this.props.scroller ? Internal.LibraryComponents.Scrollers.Thin : "div", Object.assign(hiddenchannelslib.ObjectUtils.exclude(this.props, "scroller", "open"), {
								className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.modaltabcontent, this.props.open && hiddenchannelslib.disCN.modaltabcontentopen, this.props.className),
								children: this.props.children
							}));
						}
					};
					Internal.setDefaultProps(CustomComponents.ModalComponents.ModalTabContent, {tab: "unnamed"});
					
					CustomComponents.ModalComponents.ModalFooter = reactInitialized && class hiddenchannelslib_ModalFooter extends Internal.LibraryModules.React.Component {
						render() {
							return hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Flex, {
								className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.modalfooter, this.props.className),
								direction: this.props.direction || Internal.LibraryComponents.Flex.Direction.HORIZONTAL_REVERSE,
								align: Internal.LibraryComponents.Flex.Align.STRETCH,
								grow: 0,
								shrink: 0,
								children: this.props.children
							});
						}
					};
					
					CustomComponents.MultiInput = reactInitialized && class hiddenchannelslib_MultiInput extends Internal.LibraryModules.React.Component {
						constructor(props) {
							super(props);
							this.state = {focused: false};
						}
						render() {
							if (this.props.children && this.props.children.props) this.props.children.props.className = hiddenchannelslib.DOMUtils.formatClassName(this.props.children.props.className, hiddenchannelslib.disCN.inputmultifield);
							return hiddenchannelslib.ReactUtils.createElement("div", {
								className: hiddenchannelslib.DOMUtils.formatClassName(this.props.className, hiddenchannelslib.disCN.inputwrapper, hiddenchannelslib.disCN.inputmultiwrapper),
								children: hiddenchannelslib.ReactUtils.createElement("div", {
									className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.input, hiddenchannelslib.disCN.inputmulti, this.state.focused && hiddenchannelslib.disCN.inputfocused),
									children: [
										hiddenchannelslib.ReactUtils.createElement("div", {
											className: hiddenchannelslib.DOMUtils.formatClassName(this.props.innerClassName, hiddenchannelslib.disCN.inputwrapper, hiddenchannelslib.disCN.inputmultifirst),
											children: this.props.children
										}),
										hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TextInput, hiddenchannelslib.ObjectUtils.exclude(Object.assign({}, this.props, {
											className: hiddenchannelslib.disCN.inputmultilast,
											inputClassName: hiddenchannelslib.disCN.inputmultifield,
											onFocus: e => this.setState({focused: true}),
											onBlur: e => this.setState({focused: false})
										}), "children", "innerClassName"))
									]
								})
							});
						}
					};
					
					CustomComponents.ListInput = reactInitialized && class hiddenchannelslib_ListInput extends Internal.LibraryModules.React.Component {
						handleChange() {
							if (typeof this.props.onChange) this.props.onChange(this.props.items, this);
						}
						render() {
							if (!hiddenchannelslib.ArrayUtils.is(this.props.items)) this.props.items = [];
							return hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.MultiInput, hiddenchannelslib.ObjectUtils.exclude(Object.assign({}, this.props, {
								className: hiddenchannelslib.disCN.inputlist,
								innerClassName: hiddenchannelslib.disCN.inputlistitems,
								onKeyDown: e => {
									if (e.which == 13 && e.target.value && e.target.value.trim()) {
										let value = e.target.value.trim();
										this.props.value = "";
										if (!this.props.items.includes(value)) {
											this.props.items.push(value);
											hiddenchannelslib.ReactUtils.forceUpdate(this);
											this.handleChange.apply(this, []);
										}
									}
								},
								children: this.props.items.map(item => hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Badges.TextBadge, {
									className: hiddenchannelslib.disCN.inputlistitem,
									color: "var(--hiddenchannelslib-blurple)",
									style: {borderRadius: "3px"},
									text: [
										item,
										hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SvgIcon, {
											className: hiddenchannelslib.disCN.inputlistdelete,
											name: Internal.LibraryComponents.SvgIcon.Names.CLOSE,
											onClick: _ => {
												hiddenchannelslib.ArrayUtils.remove(this.props.items, item);
												hiddenchannelslib.ReactUtils.forceUpdate(this);
												this.handleChange.apply(this, []);
											}
										})
									]
								}))
							}), "items"));
						}
					};
					
					CustomComponents.PaginatedList = reactInitialized && class hiddenchannelslib_PaginatedList extends Internal.LibraryModules.React.Component {
						constructor(props) {
							super(props);
							this.state = {
								offset: props.offset
							};
						}
						handleJump(offset) {
							if (offset > -1 && offset < Math.ceil(this.props.items.length/this.props.amount) && this.state.offset != offset) {
								this.state.offset = offset;
								if (typeof this.props.onJump == "function") this.props.onJump(offset, this);
								hiddenchannelslib.ReactUtils.forceUpdate(this);
							}
						}
						renderPagination(bottom) {
							let maxOffset = Math.ceil(this.props.items.length/this.props.amount) - 1;
							return this.props.items.length > this.props.amount && hiddenchannelslib.ReactUtils.createElement("nav", {
								className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.pagination, bottom ? hiddenchannelslib.disCN.paginationbottom : hiddenchannelslib.disCN.paginationtop, this.props.mini && hiddenchannelslib.disCN.paginationmini),
								children: [
									hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Paginator, {
										totalCount: this.props.items.length,
										currentPage: this.state.offset + 1,
										pageSize: this.props.amount,
										maxVisiblePages: this.props.maxVisiblePages,
										onPageChange: page => {this.handleJump(isNaN(parseInt(page)) ? -1 : page - 1);}
									}),
									this.props.jump && hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TextInput, {
										type: "number",
										size: Internal.LibraryComponents.TextInput.Sizes.MINI,
										value: this.state.offset + 1,
										min: 1,
										max: maxOffset + 1,
										onKeyDown: (event, instance) => {if (event.which == 13) this.handleJump(isNaN(parseInt(instance.props.value)) ? -1 : instance.props.value - 1);}
									}),
								].filter(n => n)
							});
						}
						render() {
							let items = [], alphabet = {};
							if (hiddenchannelslib.ArrayUtils.is(this.props.items) && this.props.items.length) {
								if (!this.props.alphabetKey) items = this.props.items;
								else {
									let unsortedItems = [].concat(this.props.items);
									for (let key of ["0-9", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"]) {
										let numbers = key == "0-9", alphaItems = [];
										for (let item of unsortedItems) if (item && item[this.props.alphabetKey] && (numbers && !isNaN(parseInt(item[this.props.alphabetKey][0])) || item[this.props.alphabetKey].toUpperCase().indexOf(key) == 0)) alphaItems.push(item);
										for (let sortedItem of alphaItems) hiddenchannelslib.ArrayUtils.remove(unsortedItems, sortedItem);
										alphabet[key] = {items: hiddenchannelslib.ArrayUtils.keySort(alphaItems, this.props.alphabetKey), disabled: !alphaItems.length};
									}
									alphabet["?!"] = {items: hiddenchannelslib.ArrayUtils.keySort(unsortedItems, this.props.alphabetKey), disabled: !unsortedItems.length};
									for (let key in alphabet) items.push(alphabet[key].items);
									items = items.flat(10);
								}
							}
							return typeof this.props.renderItem != "function" || !items.length ? null : hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Scrollers.Thin, {
								className: hiddenchannelslib.DOMUtils.formatClassName(this.props.className, hiddenchannelslib.disCN.paginationlist, this.props.mini && hiddenchannelslib.disCN.paginationlistmini),
								fade: this.props.fade,
								children: [
									this.renderPagination(),
									items.length > this.props.amount && this.props.alphabetKey && hiddenchannelslib.ReactUtils.createElement("nav", {
										className: hiddenchannelslib.disCN.paginationlistalphabet,
										children: Object.keys(alphabet).map(key => hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Clickable, {
											className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.paginationlistalphabetchar, alphabet[key].disabled &&hiddenchannelslib.disCN.paginationlistalphabetchardisabled),
											onClick: _ => {if (!alphabet[key].disabled) this.handleJump(Math.floor(items.indexOf(alphabet[key].items[0])/this.props.amount));},
											children: key
										}))
									}),
									this.props.header,
									hiddenchannelslib.ReactUtils.createElement("div", {
										className: hiddenchannelslib.disCN.paginationlistcontent,
										children: items.slice(this.state.offset * this.props.amount, (this.state.offset + 1) * this.props.amount).map((data, i) => {return this.props.renderItem(data, i);}).flat(10).filter(n => n)
									}),
									this.props.copyToBottom && this.renderPagination(true)
								].flat(10).filter(n => n)
							});
						}
					};
					Internal.setDefaultProps(CustomComponents.PaginatedList, {amount: 50, offset: 0, mini: true, jump: true, maxVisiblePages: 7, copyToBottom: false, fade: true});
					
					CustomComponents.Popout = reactInitialized && class hiddenchannelslib_Popout extends Internal.LibraryModules.React.Component {
						componentDidMount() {
							this.props.containerInstance.popout = this;
							if (typeof this.props.onOpen == "function") this.props.onOpen(this.props.containerInstance, this);
						}
						componentWillUnmount() {
							delete this.props.containerInstance.popout;
							if (typeof this.props.onClose == "function") this.props.onClose(this.props.containerInstance, this);
						}
						render() {
							if (!this.props.wrap) return this.props.children;
							let pos = typeof this.props.position == "string" ? this.props.position.toLowerCase() : null;
							return hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.PopoutFocusLock, {
								className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.popoutwrapper, this.props.className, this.props.themed && hiddenchannelslib.disCN.popoutthemedpopout, this.props.arrow  && hiddenchannelslib.disCN.popoutarrow, this.props.arrow && (pos == "top" ? hiddenchannelslib.disCN.popoutarrowtop : hiddenchannelslib.disCN.popoutarrowbottom)),
								id: this.props.id,
								onClick: e => e.stopPropagation(),
								style: hiddenchannelslib.ObjectUtils.extract(this.props, "padding", "height", "maxHeight", "minHeight", "width", "maxWidth", "minWidth"),
								children: this.props.children
							});
						}
					};
					Internal.setDefaultProps(CustomComponents.Popout, {themed: true, wrap: true});
					
					CustomComponents.PopoutContainer = reactInitialized && class hiddenchannelslib_PopoutContainer extends Internal.LibraryModules.React.Component {
						componentDidMount() {
							this.toggle = this.toggle.bind(this);
							this.onDocumentClicked = this.onDocumentClicked.bind(this);
							this.domElementRef = hiddenchannelslib.ReactUtils.createRef();
							this.domElementRef.current = hiddenchannelslib.ReactUtils.findDOMNode(this);
						}
						onDocumentClicked() {
							const node = hiddenchannelslib.ReactUtils.findDOMNode(this.popout);
							if (!node || !document.contains(node) || node != event.target && document.contains(event.target) && !node.contains(event.target)) this.toggle();
						}
						toggle() {
							this.props.open = !this.props.open;
							hiddenchannelslib.ReactUtils.forceUpdate(this);
						}
						render() {
							const child = (hiddenchannelslib.ArrayUtils.is(this.props.children) ? this.props.children[0] : this.props.children) || hiddenchannelslib.ReactUtils.createElement("div", {style: {height: "100%", width: "100%"}});
							child.props.className = hiddenchannelslib.DOMUtils.formatClassName(child.props.className, this.props.className);
							const childProps = Object.assign({}, child.props);
							child.props.onClick = (e, childThis) => {
								if ((this.props.openOnClick || this.props.openOnClick === undefined)) this.toggle();
								if (typeof this.props.onClick == "function") this.props.onClick(e, this);
								if (typeof childProps.onClick == "function") childProps.onClick(e, childThis);
								if (this.props.killEvent || childProps.killEvent) hiddenchannelslib.ListenerUtils.stopEvent(e);
							};
							child.props.onContextMenu = (e, childThis) => {
								if (this.props.openOnContextMenu) this.toggle();
								if (typeof this.props.onContextMenu == "function") this.props.onContextMenu(e, this);
								if (typeof childProps.onContextMenu == "function") childProps.onContextMenu(e, childThis);
								if (this.props.killEvent || childProps.killEvent) hiddenchannelslib.ListenerUtils.stopEvent(e);
							};
							return hiddenchannelslib.ReactUtils.createElement(Internal.LibraryModules.React.Fragment, {
								onClick: this.toggle,
								children: [
									child,
									this.props.open && hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.AppReferencePositionLayer, {
										onMount: _ => hiddenchannelslib.TimeUtils.timeout(_ => document.addEventListener("click", this.onDocumentClicked)),
										onUnmount: _ => document.removeEventListener("click", this.onDocumentClicked),
										position: this.props.position,
										align: this.props.align,
										reference: this.domElementRef,
										children: _ => {
											const popout = hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Popout, hiddenchannelslib.ObjectUtils.exclude(Object.assign({}, this.props, {
												className: this.props.popoutClassName,
												containerInstance: this,
												position: this.props.position,
												style: this.props.popoutStyle,
												onOpen: typeof this.props.onOpen == "function" ? this.props.onOpen.bind(this) : _ => {},
												onClose: typeof this.props.onClose == "function" ? this.props.onClose.bind(this) : _ => {},
												children: typeof this.props.renderPopout == "function" ? this.props.renderPopout(this) : null
											}), "popoutStyle", "popoutClassName", "shouldShow", "changing", "renderPopout", "openOnClick", "onClick", "openOnContextMenu", "onContextMenu"));
											const animation = Object.entries(Internal.LibraryComponents.PopoutContainer.Animation).find(n => n[1] == this.props.animation);
											return !animation || this.props.animation == Internal.LibraryComponents.PopoutContainer.Animation.NONE ? popout : hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.PopoutCSSAnimator, {
												position: this.props.position,
												type: Internal.LibraryComponents.PopoutCSSAnimator.Types[animation[0]],
												children: popout
											});
										}
									})
								]
							});
						}
					};
					Internal.setDefaultProps(CustomComponents.PopoutContainer, {wrap: true});
					
					CustomComponents.QuickSelect = reactInitialized && class hiddenchannelslib_QuickSelect extends Internal.LibraryModules.React.Component {
						handleChange(option) {
							this.props.value = option;
							if (typeof this.props.onChange == "function") this.props.onChange(option.value || option.key, this);
							hiddenchannelslib.ReactUtils.forceUpdate(this);
						}
						render() {
							let options = (hiddenchannelslib.ArrayUtils.is(this.props.options) ? this.props.options : [{}]).filter(n => n);
							let selectedOption = hiddenchannelslib.ObjectUtils.is(this.props.value) ? this.props.value : (options[0] || {});
							return hiddenchannelslib.ReactUtils.createElement("div", {
								className: hiddenchannelslib.DOMUtils.formatClassName(this.props.className, hiddenchannelslib.disCN.quickselectwrapper),
								children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Flex, {
									className: hiddenchannelslib.disCN.quickselect,
									align: Internal.LibraryComponents.Flex.Align.CENTER,
									children: [
										hiddenchannelslib.ReactUtils.createElement("div", {
											className: hiddenchannelslib.disCN.quickselectlabel,
											children: this.props.label
										}),
										hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Flex, {
											align: Internal.LibraryComponents.Flex.Align.CENTER,
											className: hiddenchannelslib.disCN.quickselectclick,
											onClick: event => {
												Internal.LibraryModules.ContextMenuUtils.openContextMenu(event, _ => hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Menu, {
													navId: "hiddenchannelslib-quickselect",
													onClose: Internal.LibraryModules.ContextMenuUtils.closeContextMenu,
													className: this.props.popoutClassName,
													children: hiddenchannelslib.ContextMenuUtils.createItem(Internal.LibraryComponents.MenuItems.MenuGroup, {
														children: options.map((option, i) => {
															let selected = option.value && option.value === selectedOption.value || option.key && option.key === selectedOption.key;
															return hiddenchannelslib.ContextMenuUtils.createItem(Internal.LibraryComponents.MenuItems.MenuItem, {
																label: option.label,
																id: hiddenchannelslib.ContextMenuUtils.createItemId("option", option.key || option.value || i),
																action: selected ? null : event2 => this.handleChange.bind(this)(option)
															});
														})
													})
												}));
											},
											children: [
												hiddenchannelslib.ReactUtils.createElement("div", {
													className: hiddenchannelslib.disCN.quickselectvalue,
													children: typeof this.props.renderValue == "function" ? this.props.renderValue(this.props.value) : this.props.value.label
												}),
												hiddenchannelslib.ReactUtils.createElement("div", {
													className: hiddenchannelslib.disCN.quickselectarrow
												})
											]
										})
									]
								})
							});
						}
					};
					
					CustomComponents.RadioGroup = reactInitialized && class hiddenchannelslib_RadioGroup extends Internal.LibraryModules.React.Component {
						handleChange(value) {
							this.props.value = value.value;
							if (typeof this.props.onChange == "function") this.props.onChange(value, this);
							hiddenchannelslib.ReactUtils.forceUpdate(this);
						}
						render() {
							return hiddenchannelslib.ReactUtils.createElement(Internal.NativeSubComponents.RadioGroup, Object.assign({}, this.props, {
								onChange: this.handleChange.bind(this)
							}));
						}
					};
					
					CustomComponents.SearchBar = reactInitialized && class hiddenchannelslib_SearchBar extends Internal.LibraryModules.React.Component {
						handleChange(query) {
							this.props.query = query;
							if (typeof this.props.onChange == "function") this.props.onChange(query, this);
							hiddenchannelslib.ReactUtils.forceUpdate(this);
						}
						handleClear() {
							this.props.query = "";
							if (this.props.changeOnClear && typeof this.props.onChange == "function") this.props.onChange("", this);
							if (typeof this.props.onClear == "function") this.props.onClear(this);
							hiddenchannelslib.ReactUtils.forceUpdate(this);
						}
						render() {
							let props = Object.assign({}, this.props, {
								onChange: this.handleChange.bind(this),
								onClear: this.handleClear.bind(this)
							});
							if (typeof props.query != "string") props.query = "";
							return hiddenchannelslib.ReactUtils.createElement(Internal.NativeSubComponents.SearchBar, props);
						}
					};
					
					CustomComponents.Select = reactInitialized && class hiddenchannelslib_Select extends Internal.LibraryModules.React.Component {
						handleChange(value) {
							this.props.value = value.value || value;
							if (typeof this.props.onChange == "function") this.props.onChange(value, this);
							hiddenchannelslib.ReactUtils.forceUpdate(this);
						}
						render() {
							return hiddenchannelslib.ReactUtils.createElement("div", {
								className: hiddenchannelslib.DOMUtils.formatClassName(this.props.className, hiddenchannelslib.disCN.selectwrapper),
								children: hiddenchannelslib.ReactUtils.createElement(Internal.NativeSubComponents.SearchableSelect, hiddenchannelslib.ObjectUtils.exclude(Object.assign({}, this.props, {
									className: this.props.inputClassName,
									autoFocus: this.props.autoFocus ? this.props.autoFocus : false,
									maxVisibleItems: this.props.maxVisibleItems || 7,
									renderOptionLabel: this.props.optionRenderer,
									onChange: this.handleChange.bind(this)
								}), "inputClassName", "optionRenderer"))
							});
						}
					};
					
					CustomComponents.SettingsGuildList = reactInitialized && class hiddenchannelslib_SettingsGuildList extends Internal.LibraryModules.React.Component {
						render() {
							this.props.disabled = hiddenchannelslib.ArrayUtils.is(this.props.disabled) ? this.props.disabled : [];
							return hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Flex, {
								className: this.props.className,
								wrap: Internal.LibraryComponents.Flex.Wrap.WRAP,
								children: [this.props.includeDMs && {name: hiddenchannelslib.LanguageUtils.LanguageStrings.DIRECT_MESSAGES, acronym: "DMs", id: hiddenchannelslib.DiscordConstants.ME, getIconURL: _ => {}}].concat(Internal.LibraryModules.FolderStore.getFlattenedGuilds()).filter(n => n).map(guild => hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TooltipContainer, {
									text: guild.name,
									children: hiddenchannelslib.ReactUtils.createElement("div", {
										className: hiddenchannelslib.DOMUtils.formatClassName(this.props.guildClassName, hiddenchannelslib.disCN.settingsguild, this.props.disabled.includes(guild.id) && hiddenchannelslib.disCN.settingsguilddisabled),
										children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.GuildComponents.Icon, {
											guild: guild,
											size: this.props.size || Internal.LibraryComponents.GuildComponents.Icon.Sizes.MEDIUM
										}),
										onClick: e => {
											let isDisabled = this.props.disabled.includes(guild.id);
											if (isDisabled) hiddenchannelslib.ArrayUtils.remove(this.props.disabled, guild.id, true);
											else this.props.disabled.push(guild.id);
											if (typeof this.props.onClick == "function") this.props.onClick(this.props.disabled, this);
											hiddenchannelslib.ReactUtils.forceUpdate(this);
										}
									})
								}))
							});
						}
					};
					
					CustomComponents.SettingsPanel = reactInitialized && class hiddenchannelslib_SettingsPanel extends Internal.LibraryModules.React.Component {
						componentDidMount() {
							this.props._instance = this;
							let node = hiddenchannelslib.ReactUtils.findDOMNode(this);
							if (node) this.props._node = node;
						}
						componentWillUnmount() {
							if (hiddenchannelslib.ObjectUtils.is(this.props.addon) && typeof this.props.addon.onSettingsClosed == "function") this.props.addon.onSettingsClosed();
						}
						render() {						
							let panelItems = [
								hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.AutoFocusCatcher, {}),
								typeof this.props.children == "function" ? (_ => {
									return this.props.children(this.props.collapseStates);
								})() : this.props.children
							].flat(10).filter(n => n);
							
							return hiddenchannelslib.ReactUtils.createElement("div", {
								key: this.props.addon && this.props.addon.name && `${this.props.addon.name}-settingsPanel`,
								id: this.props.addon && this.props.addon.name && `${this.props.addon.name}-settings`,
								className: hiddenchannelslib.disCN.settingspanel,
								children: [
									this.props.addon.changeLog && !hiddenchannelslib.ObjectUtils.isEmpty(this.props.addon.changeLog) && hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TooltipContainer, {
										text: hiddenchannelslib.LanguageUtils.LanguageStrings.CHANGE_LOG,
										children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Clickable, {
											className: hiddenchannelslib.disCN._repochangelogbutton,
											children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SvgIcon, {
												name: Internal.LibraryComponents.SvgIcon.Names.CHANGELOG,
												onClick: _ => hiddenchannelslib.PluginUtils.openChangeLog(this.props.addon),
												width: 24,
												height: 24
											})
										})
									}),
									panelItems
								]
							});
						}
					};
					
					CustomComponents.SettingsPanelList = reactInitialized && class hiddenchannelslib_SettingsPanelInner extends Internal.LibraryModules.React.Component {
						render() {
							return this.props.children ? hiddenchannelslib.ReactUtils.createElement("div", {
								className: hiddenchannelslib.DOMUtils.formatClassName(this.props.className, hiddenchannelslib.disCN.settingspanellistwrapper, this.props.mini && hiddenchannelslib.disCN.settingspanellistwrappermini),
								children: [
									this.props.dividerTop ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.FormComponents.FormDivider, {
										className: this.props.mini ? hiddenchannelslib.disCN.marginbottom4 : hiddenchannelslib.disCN.marginbottom8
									}) : null,
									typeof this.props.title == "string" ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.FormComponents.FormTitle, {
										className: hiddenchannelslib.disCN.marginbottom4,
										tag: Internal.LibraryComponents.FormComponents.FormTitle.Tags.H3,
										children: this.props.title
									}) : null,
									hiddenchannelslib.ReactUtils.createElement("div", {
										className: hiddenchannelslib.disCN.settingspanellist,
										children: this.props.children
									}),
									this.props.dividerBottom ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.FormComponents.FormDivider, {
										className: this.props.mini ? hiddenchannelslib.disCN.margintop4 : hiddenchannelslib.disCN.margintop8
									}) : null
								]
							}) : null;
						}
					};
					
					CustomComponents.SettingsItem = reactInitialized && class hiddenchannelslib_SettingsItem extends Internal.LibraryModules.React.Component {
						handleChange(value) {
							if (typeof this.props.onChange == "function") this.props.onChange(value, this);
						}
						render() {
							if (typeof this.props.type != "string" || !["BUTTON", "SELECT", "SLIDER", "SWITCH", "TEXTINPUT"].includes(this.props.type.toUpperCase())) return null;
							let childComponent = Internal.LibraryComponents[this.props.type];
							if (!childComponent) return null;
							if (this.props.mini && childComponent.Sizes) this.props.size = childComponent.Sizes.MINI || childComponent.Sizes.MIN;
							let label = this.props.label ? (this.props.tag ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.FormComponents.FormTitle, {
								className: hiddenchannelslib.DOMUtils.formatClassName(this.props.labelClassName, hiddenchannelslib.disCN.marginreset),
								tag: this.props.tag,
								children: this.props.label
							}) : hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SettingsLabel, {
								className: hiddenchannelslib.DOMUtils.formatClassName(this.props.labelClassName),
								mini: this.props.mini,
								label: this.props.label
							})) : null;
							let margin = this.props.margin != null ? this.props.margin : (this.props.mini ? 0 : 8);
							return hiddenchannelslib.ReactUtils.createElement("div", {
								className: hiddenchannelslib.DOMUtils.formatClassName(this.props.className, hiddenchannelslib.disCN.settingsrow, hiddenchannelslib.disCN.settingsrowcontainer, this.props.disabled && hiddenchannelslib.disCN.settingsrowdisabled, margin != null && (DiscordClasses[`marginbottom${margin}`] && hiddenchannelslib.disCN[`marginbottom${margin}`] || margin == 0 && hiddenchannelslib.disCN.marginreset)),
								id: this.props.id,
								children: [
									this.props.dividerTop ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.FormComponents.FormDivider, {
										className: this.props.mini ? hiddenchannelslib.disCN.marginbottom4 : hiddenchannelslib.disCN.marginbottom8
									}) : null,
									hiddenchannelslib.ReactUtils.createElement("div", {
										className: hiddenchannelslib.disCN.settingsrowlabel,
										children: [
											label && !this.props.basis ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Flex.Child, {
												grow: 1,
												shrink: 1,
												wrap: true,
												children: label
											}) : label,
											this.props.labelChildren,
											hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Flex.Child, {
												className: hiddenchannelslib.disCNS.settingsrowcontrol + hiddenchannelslib.disCN.flexchild,
												grow: 0,
												shrink: this.props.basis ? 0 : 1,
												basis: this.props.basis,
												wrap: true,
												children: hiddenchannelslib.ReactUtils.createElement(childComponent, hiddenchannelslib.ObjectUtils.exclude(Object.assign(hiddenchannelslib.ObjectUtils.exclude(this.props, "className", "id", "type"), this.props.childProps, {
													onChange: this.handleChange.bind(this),
													onValueChange: this.handleChange.bind(this)
												}), "basis", "margin", "dividerBottom", "dividerTop", "label", "labelClassName", "labelChildren", "tag", "mini", "note", "childProps"))
											})
										].flat(10).filter(n => n)
									}),
									typeof this.props.note == "string" ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Flex.Child, {
										className: hiddenchannelslib.disCN.settingsrownote,
										children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.FormComponents.FormText, {
											disabled: this.props.disabled,
											type: Internal.LibraryComponents.FormComponents.FormText.Types.DESCRIPTION,
											children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TextScroller, {speed: 2, children: this.props.note})
										})
									}) : null,
									this.props.dividerBottom ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.FormComponents.FormDivider, {
										className: this.props.mini ? hiddenchannelslib.disCN.margintop4 : hiddenchannelslib.disCN.margintop8
									}) : null
								]
							});
						}
					};
					
					CustomComponents.SettingsLabel = reactInitialized && class hiddenchannelslib_SettingsLabel extends Internal.LibraryModules.React.Component {
						render() {
							return hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TextScroller, {
								className: hiddenchannelslib.DOMUtils.formatClassName(this.props.className, hiddenchannelslib.disCN.settingsrowtitle, this.props.mini ? hiddenchannelslib.disCN.settingsrowtitlemini : hiddenchannelslib.disCN.settingsrowtitledefault, hiddenchannelslib.disCN.cursordefault),
								speed: 2,
								children: this.props.label
							});
						}	
					};
					
					CustomComponents.SettingsList = reactInitialized && class hiddenchannelslib_SettingsList extends Internal.LibraryModules.React.Component {
						componentDidMount() {
							this.checkList();
						}
						componentDidUpdate() {
							this.checkList();
						}
						checkList() {
							let list = hiddenchannelslib.ReactUtils.findDOMNode(this);
							if (list && !this.props.configWidth) {
								let headers = Array.from(list.querySelectorAll(hiddenchannelslib.dotCN.settingstableheader));
								headers.shift();
								if (hiddenchannelslib.DOMUtils.getRects(headers[0]).width == 0) hiddenchannelslib.TimeUtils.timeout(_ => {this.resizeList(headers);});
								else this.resizeList(headers);
							}
						}
						resizeList(headers) {
							let configWidth = 0, biggestWidth = 0;
							if (!configWidth) {
								for (let header of headers) {
									header.style = "";
									let width = hiddenchannelslib.DOMUtils.getRects(header).width;
									configWidth = width > configWidth ? width : configWidth;
								}
								configWidth += 4;
								biggestWidth = configWidth;
							}
							if (headers.length * configWidth > 300) {
								this.props.vertical = true;
								configWidth = parseInt(290 / headers.length);
							}
							else if (configWidth < 36) {
								configWidth = 36;
								biggestWidth = configWidth;
							}
							this.props.configWidth = configWidth;
							this.props.biggestWidth = biggestWidth;
							hiddenchannelslib.ReactUtils.forceUpdate(this);
						}
						renderHeaderOption(props) {
							return hiddenchannelslib.ReactUtils.createElement("div", {
								className: hiddenchannelslib.DOMUtils.formatClassName(props.className, hiddenchannelslib.disCN.colorbase, hiddenchannelslib.disCN.size10, props.clickable && hiddenchannelslib.disCN.cursorpointer),
								onClick: _ => {if (typeof this.props.onHeaderClick == "function") this.props.onHeaderClick(props.label, this);},
								onContextMenu: _ => {if (typeof this.props.onHeaderContextMenu == "function") this.props.onHeaderContextMenu(props.label, this);},
								children: hiddenchannelslib.ReactUtils.createElement("span", {
									children: props.label
								})
							});
						}
						renderItem(props) {
							return hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Card, hiddenchannelslib.ObjectUtils.exclude(Object.assign({}, this.props, {
								className: hiddenchannelslib.DOMUtils.formatClassName([this.props.cardClassName, props.className].filter(n => n).join(" ").indexOf(hiddenchannelslib.disCN.card) == -1 && hiddenchannelslib.disCN.cardprimaryoutline, hiddenchannelslib.disCN.settingstablecard, this.props.cardClassName, props.className),
								cardId: props.key,
								backdrop: false,
								horizontal: true,
								style: Object.assign({}, this.props.cardStyle, props.style),
								children: [
									hiddenchannelslib.ReactUtils.createElement("div", {
										className: hiddenchannelslib.disCN.settingstablecardlabel,
										children: this.props.renderLabel(props, this)
									}),
									hiddenchannelslib.ReactUtils.createElement("div", {
										className: hiddenchannelslib.disCN.settingstablecardconfigs,
										style: {
											width: props.wrapperWidth || null,
											minWidth: props.wrapperWidth || null,
											maxWidth: props.wrapperWidth || null
										},
										children: this.props.settings.map(setting => hiddenchannelslib.ReactUtils.createElement("div", {
											className: hiddenchannelslib.disCN.checkboxcontainer,
											children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TooltipContainer, {
												text: setting.toUpperCase(),
												children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Checkbox, {
													disabled: props.disabled,
													cardId: props.key,
													settingId: setting,
													shape: Internal.LibraryComponents.Checkbox.Shapes && Internal.LibraryComponents.Checkbox.Shapes.ROUND,
													type: Internal.LibraryComponents.Checkbox.Types && Internal.LibraryComponents.Checkbox.Types.INVERTED,
													color: this.props.checkboxColor,
													getColor: this.props.getCheckboxColor,
													value: props[setting],
													getValue: this.props.getCheckboxValue,
													onChange: this.props.onCheckboxChange
												})
											})
										})).flat(10).filter(n => n)
									})
								]
							}), "title", "data", "settings", "renderLabel", "cardClassName", "cardStyle", "checkboxColor", "getCheckboxColor",  "getCheckboxValue", "onCheckboxChange", "configWidth", "biggestWidth", "pagination"));
						}
						render() {
							this.props.settings = hiddenchannelslib.ArrayUtils.is(this.props.settings) ? this.props.settings : [];
							this.props.renderLabel = typeof this.props.renderLabel == "function" ? this.props.renderLabel : data => data.label;
							this.props.data = (hiddenchannelslib.ArrayUtils.is(this.props.data) ? this.props.data : [{}]).filter(n => n);
							
							let wrapperWidth = this.props.configWidth && this.props.configWidth * this.props.settings.length;
							let isHeaderClickable = typeof this.props.onHeaderClick == "function" || typeof this.props.onHeaderContextMenu == "function";
							let usePagination = hiddenchannelslib.ObjectUtils.is(this.props.pagination);
							
							let header = hiddenchannelslib.ReactUtils.createElement("div", {
								className: hiddenchannelslib.disCN.settingstableheaders,
								style: this.props.vertical && this.props.biggestWidth ? {
									marginTop: this.props.biggestWidth - 15 || 0
								} : {},
								children: [
									this.renderHeaderOption({
										className: hiddenchannelslib.disCN.settingstableheadername,
										clickable: this.props.title && isHeaderClickable,
										label: this.props.title || ""
									}),
									hiddenchannelslib.ReactUtils.createElement("div", {
										className: hiddenchannelslib.disCN.settingstableheaderoptions,
										style: {
											width: wrapperWidth || null,
											minWidth: wrapperWidth || null,
											maxWidth: wrapperWidth || null
										},
										children: this.props.settings.map(setting => this.renderHeaderOption({
											className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.settingstableheaderoption, this.props.vertical && hiddenchannelslib.disCN.settingstableheadervertical),
											clickable: isHeaderClickable,
											label: setting
										}))
									})
								]
							});
							return !this.props.data.length ? null : hiddenchannelslib.ReactUtils.createElement("div", {
								className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.settingstablelist, this.props.className),
								children: [
									!usePagination && header,
									!usePagination ? this.props.data.map(data => this.renderItem(Object.assign({}, data, {wrapperWidth}))) : hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.PaginatedList, Object.assign({}, this.props.pagination, {
										header: header,
										items: this.props.data,
										renderItem: data => this.renderItem(Object.assign({}, data, {wrapperWidth})),
										onJump: (offset, instance) => {
											this.props.pagination.offset = offset;
											if (typeof this.props.pagination.onJump == "function") this.props.pagination.onJump(offset, this, instance);
										}
									}))
								].filter(n => n)
							});
						}
					};
					
					CustomComponents.SettingsSaveItem = reactInitialized && class hiddenchannelslib_SettingsSaveItem extends Internal.LibraryModules.React.Component {
						saveSettings(value) {
							if (!hiddenchannelslib.ArrayUtils.is(this.props.keys) || !hiddenchannelslib.ObjectUtils.is(this.props.plugin)) return;
							let keys = this.props.keys.filter(n => n);
							let option = keys.shift();
							if (hiddenchannelslib.ObjectUtils.is(this.props.plugin) && option) {
								let data = hiddenchannelslib.DataUtils.load(this.props.plugin, option);
								let newC = "";
								for (let key of keys) newC += `{"${key}":`;
								value = value != null && value.value != null ? value.value : value;
								let isString = typeof value == "string";
								let marker = isString ? `"` : ``;
								newC += (marker + (isString ? value.replace(/\\/g, "\\\\") : value) + marker) + "}".repeat(keys.length);
								newC = JSON.parse(newC);
								newC = hiddenchannelslib.ObjectUtils.is(newC) ? hiddenchannelslib.ObjectUtils.deepAssign({}, data, newC) : newC;
								hiddenchannelslib.DataUtils.save(newC, this.props.plugin, option);
								if (!this.props.plugin.settings) this.props.plugin.settings = {};
								this.props.plugin.settings[option] = newC;
								this.props.plugin.SettingsUpdated = true;
							}
							if (typeof this.props.onChange == "function") this.props.onChange(value, this);
						}
						render() {
							if (typeof this.props.type != "string" || !["SELECT", "SLIDER", "SWITCH", "TEXTINPUT"].includes(this.props.type.toUpperCase())) return null;
							return hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SettingsItem, hiddenchannelslib.ObjectUtils.exclude(Object.assign({}, this.props, {
								onChange: this.saveSettings.bind(this)
							}), "keys", "key", "plugin"));
						}
					};
					
					CustomComponents.SidebarList = reactInitialized && class hiddenchannelslib_SidebarList extends Internal.LibraryModules.React.Component {
						handleItemSelect(item) {
							this.props.selectedItem = item;
							if (typeof this.props.onItemSelect == "function") this.props.onItemSelect(item, this);
							hiddenchannelslib.ReactUtils.forceUpdate(this);
						}
						render() {
							let items = (hiddenchannelslib.ArrayUtils.is(this.props.items) ? this.props.items : [{}]).filter(n => n);
							let selectedItem = this.props.selectedItem || (items[0] || {}).value;
							let selectedElements = (items.find(n => n.value == selectedItem) || {}).elements;
							let renderElement = typeof this.props.renderElement == "function" ? this.props.renderElement : (_ => {});
							return hiddenchannelslib.ReactUtils.createElement("div", {
								className: hiddenchannelslib.DOMUtils.formatClassName(this.props.className, hiddenchannelslib.disCN.sidebarlist),
								children: [
									hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Scrollers.Thin, {
										className: hiddenchannelslib.DOMUtils.formatClassName(this.props.sidebarClassName, hiddenchannelslib.disCN.sidebar),
										fade: true,
										children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TabBar, {
											itemClassName: this.props.itemClassName,
											type: Internal.LibraryComponents.TabBar.Types.SIDE,
											items: items,
											selectedItem: selectedItem,
											renderItem: this.props.renderItem,
											onItemSelect: this.handleItemSelect.bind(this)
										})
									}),
									hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Scrollers.Thin, {
										className: hiddenchannelslib.DOMUtils.formatClassName(this.props.contentClassName, hiddenchannelslib.disCN.sidebarcontent),
										fade: true,
										children: [selectedElements].flat(10).filter(n => n).map(data => renderElement(data))
									})
								]
							});
						}
					};
					
					CustomComponents.Slider = reactInitialized && class hiddenchannelslib_Slider extends Internal.LibraryModules.React.Component {
						handleMarkerRender(marker) {
							let newMarker = hiddenchannelslib.NumberUtils.mapRange([0, 100], this.props.edges, marker);
							if (typeof this.props.digits == "number") newMarker = Math.round(newMarker * Math.pow(10, this.props.digits)) / Math.pow(10, this.props.digits);
							return newMarker;
						}
						handleValueChange(value) {
							let newValue = hiddenchannelslib.NumberUtils.mapRange([0, 100], this.props.edges, value);
							if (typeof this.props.digits == "number") newValue = Math.round(newValue * Math.pow(10, this.props.digits)) / Math.pow(10, this.props.digits);
							this.props.defaultValue = this.props.value = newValue;
							if (typeof this.props.onValueChange == "function") this.props.onValueChange(newValue, this);
							hiddenchannelslib.ReactUtils.forceUpdate(this);
						}
						handleValueRender(value) {
							let newValue = hiddenchannelslib.NumberUtils.mapRange([0, 100], this.props.edges, value);
							if (typeof this.props.digits == "number") newValue = Math.round(newValue * Math.pow(10, this.props.digits)) / Math.pow(10, this.props.digits);
							if (typeof this.props.onValueRender == "function") {
								let tempReturn = this.props.onValueRender(newValue, this);
								if (tempReturn != undefined) newValue = tempReturn;
							}
							return newValue;
						}
						render() {
							let value = this.props.value || this.props.defaultValue || 0;
							if (!hiddenchannelslib.ArrayUtils.is(this.props.edges) || this.props.edges.length != 2) this.props.edges = [this.props.min || this.props.minValue || 0, this.props.max || this.props.maxValue || 100];
							this.props.minValue = 0;
							this.props.maxValue = 100;
							let defaultValue = hiddenchannelslib.NumberUtils.mapRange(this.props.edges, [0, 100], value);
							if (typeof this.props.digits == "number") defaultValue = Math.round(defaultValue * Math.pow(10, this.props.digits)) / Math.pow(10, this.props.digits);
							return hiddenchannelslib.ReactUtils.createElement(Internal.NativeSubComponents.Slider, hiddenchannelslib.ObjectUtils.exclude(Object.assign({}, this.props, {
								initialValue: defaultValue,
								markers: typeof this.props.markerAmount == "number" ? Array.from(Array(this.props.markerAmount).keys()).map((_, i) => i * (this.props.maxValue - this.props.minValue)/10) : undefined,
								onMarkerRender: this.handleMarkerRender.bind(this),
								onValueChange: this.handleValueChange.bind(this),
								onValueRender: this.handleValueRender.bind(this)
							}), "digits", "edges", "max", "min", "markerAmount"));
						}
					};
					Internal.setDefaultProps(CustomComponents.Slider, {hideBubble: false, digits: 3});
					
					CustomComponents.SvgIcon = reactInitialized && class hiddenchannelslib_Icon extends Internal.LibraryModules.React.Component {
						render() {
							if (hiddenchannelslib.ObjectUtils.is(this.props.name)) {
								let calcClassName = [];
								if (hiddenchannelslib.ObjectUtils.is(this.props.name.getClassName)) for (let path in this.props.name.getClassName) {
									if (!path || hiddenchannelslib.ObjectUtils.get(this, path)) calcClassName.push(hiddenchannelslib.disCN[this.props.name.getClassName[path]]);
								}
								if (calcClassName.length || this.props.className) this.props.nativeClass = true;
								this.props.iconSVG = this.props.name.icon;
								let props = Object.assign({
									width: 24,
									height: 24,
									color: "currentColor"
								}, this.props.name.defaultProps, this.props, {
									className: hiddenchannelslib.DOMUtils.formatClassName(calcClassName, this.props.className)
								});
								for (let key in props) this.props.iconSVG = this.props.iconSVG.replace(new RegExp(`%%${key}`, "g"), props[key]);
							}
							if (this.props.iconSVG) {
								let icon = hiddenchannelslib.ReactUtils.elementToReact(hiddenchannelslib.DOMUtils.create(this.props.iconSVG));
								if (hiddenchannelslib.ReactUtils.isValidElement(icon)) {
									icon.props.className = hiddenchannelslib.DOMUtils.formatClassName(!this.props.nativeClass && hiddenchannelslib.disCN.svgicon, icon.props.className, this.props.className);
									icon.props.style = Object.assign({}, icon.props.style, this.props.style);
									icon.props = Object.assign({}, hiddenchannelslib.ObjectUtils.extract(this.props, "onClick", "onContextMenu", "onMouseDown", "onMouseUp", "onMouseEnter", "onMouseLeave"), icon.props);
									return icon;
								}
							}
							return null;
						}
					};
					CustomComponents.SvgIcon.Names = InternalData.SvgIcons || {};
					
					const SwitchIconPaths = {
						a: {
							TOP: "M5.13231 6.72963L6.7233 5.13864L14.855 13.2704L13.264 14.8614L5.13231 6.72963Z",
							BOTTOM: "M13.2704 5.13864L14.8614 6.72963L6.72963 14.8614L5.13864 13.2704L13.2704 5.13864Z"
						},
						b: {
							TOP: "M6.56666 11.0013L6.56666 8.96683L13.5667 8.96683L13.5667 11.0013L6.56666 11.0013Z",
							BOTTOM: "M13.5582 8.96683L13.5582 11.0013L6.56192 11.0013L6.56192 8.96683L13.5582 8.96683Z"
						},
						c: {
							TOP: "M7.89561 14.8538L6.30462 13.2629L14.3099 5.25755L15.9009 6.84854L7.89561 14.8538Z",
							BOTTOM: "M4.08643 11.0903L5.67742 9.49929L9.4485 13.2704L7.85751 14.8614L4.08643 11.0903Z"
						}
					};
					const SwitchInner = function (props) {
						let reducedMotion = hiddenchannelslib.ReactUtils.useContext(Internal.LibraryModules.PreferencesContext.AccessibilityPreferencesContext).reducedMotion;
						let ref = hiddenchannelslib.ReactUtils.useRef(null);
						let state = hiddenchannelslib.ReactUtils.useState(false);
						let animation = Internal.LibraryComponents.Animations.useSpring({
							config: {
								mass: 1,
								tension: 250
							},
							opacity: props.disabled ? .3 : 1,
							state: state[0] ? (props.value ? .7 : .3) : (props.value ? 1 : 0)
						});
						let fill = animation.state.to({
							output: [props.uncheckedColor, props.checkedColor]
						});
						let mini = props.size == Internal.LibraryComponents.Switch.Sizes.MINI;
						
						return hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Animations.animated.div, {
							className: hiddenchannelslib.DOMUtils.formatClassName(props.className, hiddenchannelslib.disCN.switch, mini && hiddenchannelslib.disCN.switchmini),
							onMouseDown: _ => {
								return !props.disabled && state[1](true);
							},
							onMouseUp: _ => {
								return state[1](false);
							},
							onMouseLeave: _ => {
								return state[1](false);
							},
							style: {
								opacity: animation.opacity,
								backgroundColor: animation.state.to({
									output: [props.uncheckedColor, props.checkedColor]
								})
							},
							tabIndex: -1,
							children: [
								hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Animations.animated.svg, {
									className: hiddenchannelslib.disCN.switchslider,
									viewBox: "0 0 28 20",
									preserveAspectRatio: "xMinYMid meet",
									style: {
										left: animation.state.to({
											range: [0, .3, .7, 1],
											output: mini ? [-1, 2, 6, 9] : [-3, 1, 8, 12]
										})
									},
									children: [
										hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Animations.animated.rect, {
											fill: "white",
											x: animation.state.to({
												range: [0, .3, .7, 1],
												output: [4, 0, 0, 4]
											}),
											y: animation.state.to({
												range: [0, .3, .7, 1],
												output: [0, 1, 1, 0]
											}),
											height: animation.state.to({
												range: [0, .3, .7, 1],
												output: [20, 18, 18, 20]
											}),
											width: animation.state.to({
												range: [0, .3, .7, 1],
												output: [20, 28, 28, 20]
											}),
											rx: "10"
										}),
										hiddenchannelslib.ReactUtils.createElement("svg", {
											viewBox: "0 0 20 20",
											fill: "none",
											children: [
												hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Animations.animated.path, {
													fill: fill,
													d: animation.state.to({
														range: [0, .3, .7, 1],
														output: reducedMotion.enabled ? [SwitchIconPaths.a.TOP, SwitchIconPaths.a.TOP, SwitchIconPaths.c.TOP, SwitchIconPaths.c.TOP] : [SwitchIconPaths.a.TOP, SwitchIconPaths.b.TOP, SwitchIconPaths.b.TOP, SwitchIconPaths.c.TOP]
													})
												}),
												hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Animations.animated.path, {
													fill: fill,
													d: animation.state.to({
														range: [0, .3, .7, 1],
														output: reducedMotion.enabled ? [SwitchIconPaths.a.BOTTOM, SwitchIconPaths.a.BOTTOM, SwitchIconPaths.c.BOTTOM, SwitchIconPaths.c.BOTTOM] : [SwitchIconPaths.a.BOTTOM, SwitchIconPaths.b.BOTTOM, SwitchIconPaths.b.BOTTOM, SwitchIconPaths.c.BOTTOM]
													})
												})
											]
										})
									]
								}),
								hiddenchannelslib.ReactUtils.createElement("input", hiddenchannelslib.ObjectUtils.exclude(Object.assign({}, props, {
									id: props.id,
									type: "checkbox",
									ref: ref,
									className: hiddenchannelslib.DOMUtils.formatClassName(props.inputClassName, hiddenchannelslib.disCN.switchinner),
									tabIndex: props.disabled ? -1 : 0,
									onKeyDown: e => {
										if (!props.disabled && !e.repeat && (e.key == " " || e.key == "Enter")) state[1](true);
									},
									onKeyUp: e => {
										if (!props.disabled && !e.repeat) {
											state[1](false);
											if (e.key == "Enter" && ref.current) ref.current.click();
										}
									},
									onChange: e => {
										state[1](false);
										if (typeof props.onChange == "function") props.onChange(e.currentTarget.checked, e);
									},
									checked: props.value,
									disabled: props.disabled
								}), "uncheckedColor", "checkedColor", "size", "value"))
							]
						});
					};
					CustomComponents.Switch = reactInitialized && class hiddenchannelslib_Switch extends Internal.LibraryModules.React.Component {
						handleChange() {
							this.props.value = !this.props.value;
							if (typeof this.props.onChange == "function") this.props.onChange(this.props.value, this);
							hiddenchannelslib.ReactUtils.forceUpdate(this);
						}
						render() {
							return hiddenchannelslib.ReactUtils.createElement(SwitchInner, Object.assign({}, this.props, {
								onChange: this.handleChange.bind(this)
							}));
						}
					};
					CustomComponents.Switch.Sizes = {
						DEFAULT: "default",
						MINI: "mini",
					};
					Internal.setDefaultProps(CustomComponents.Switch, {
						size: CustomComponents.Switch.Sizes.DEFAULT,
						uncheckedColor: hiddenchannelslib.DiscordConstants.Colors.PRIMARY_DARK_400,
						checkedColor: hiddenchannelslib.DiscordConstants.Colors.BRAND
					});
					
					CustomComponents.TabBar = reactInitialized && class hiddenchannelslib_TabBar extends Internal.LibraryModules.React.Component {
						handleItemSelect(item) {
							this.props.selectedItem = item;
							if (typeof this.props.onItemSelect == "function") this.props.onItemSelect(item, this);
							hiddenchannelslib.ReactUtils.forceUpdate(this);
						}
						render() {
							let items = (hiddenchannelslib.ArrayUtils.is(this.props.items) ? this.props.items : [{}]).filter(n => n);
							let selectedItem = this.props.selectedItem || (items[0] || {}).value;
							let renderItem = typeof this.props.renderItem == "function" ? this.props.renderItem : (data => data.label || data.value);
							return hiddenchannelslib.ReactUtils.createElement(Internal.NativeSubComponents.TabBar, hiddenchannelslib.ObjectUtils.exclude(Object.assign({}, this.props, {
								selectedItem: selectedItem,
								onItemSelect: this.handleItemSelect.bind(this),
								children: items.map(data => hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TabBar.Item, {
									className: hiddenchannelslib.DOMUtils.formatClassName(this.props.itemClassName, selectedItem == data.value && this.props.itemSelectedClassName),
									itemType: this.props.type,
									id: data.value,
									children: renderItem(data),
									"aria-label": data.label || data.value
								}))
							}), "itemClassName", "items", "renderItem"));
						}
					};
					
					CustomComponents.Table = reactInitialized && class hiddenchannelslib_Table extends Internal.LibraryModules.React.Component {
						render() {
							return hiddenchannelslib.ReactUtils.createElement(Internal.NativeSubComponents.Table, Object.assign({}, this.props, {
								className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.table, this.props.className),
								headerCellClassName: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.tableheadercell, this.props.headerCellClassName),
								sortedHeaderCellClassName: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.tableheadercellsorted, this.props.sortedHeaderCellClassName),
								bodyCellClassName: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.tablebodycell, this.props.bodyCellClassName),
								onSort: (sortKey, sortDirection) => {
									this.props.sortDirection = this.props.sortKey != sortKey && sortDirection == Internal.LibraryComponents.Table.SortDirection.ASCENDING && this.props.columns.filter(n => n.key == sortKey)[0].reverse ? Internal.LibraryComponents.Table.SortDirection.DESCENDING : sortDirection;
									this.props.sortKey = sortKey;
									this.props.data = hiddenchannelslib.ArrayUtils.keySort(this.props.data, this.props.sortKey);
									if (this.props.sortDirection == Internal.LibraryComponents.Table.SortDirection.DESCENDING) this.props.data.reverse();
									if (typeof this.props.onSort == "function") this.props.onSort(this.props.sortKey, this.props.sortDirection);
									hiddenchannelslib.ReactUtils.forceUpdate(this);
								}
							}));
						}
					};
					
					CustomComponents.TextArea = reactInitialized && class hiddenchannelslib_TextArea extends Internal.LibraryModules.React.Component {
						handleChange(e) {
							this.props.value = e;
							if (typeof this.props.onChange == "function") this.props.onChange(e, this);
							hiddenchannelslib.ReactUtils.forceUpdate(this);
						}
						handleBlur(e) {if (typeof this.props.onBlur == "function") this.props.onBlur(e, this);}
						handleFocus(e) {if (typeof this.props.onFocus == "function") this.props.onFocus(e, this);}
						render() {
							return hiddenchannelslib.ReactUtils.createElement(Internal.NativeSubComponents.TextArea, Object.assign({}, this.props, {
								onChange: this.handleChange.bind(this),
								onBlur: this.handleBlur.bind(this),
								onFocus: this.handleFocus.bind(this)
							}));
						}
					};
					
					CustomComponents.TextGradientElement = reactInitialized && class hiddenchannelslib_TextGradientElement extends Internal.LibraryModules.React.Component {
						render() {
							if (this.props.gradient && this.props.children) return hiddenchannelslib.ReactUtils.createElement("span", {
								children: this.props.children,
								ref: instance => {
									let ele = hiddenchannelslib.ReactUtils.findDOMNode(instance);
									if (ele) {
										ele.style.setProperty("background-image", this.props.gradient, "important");
										ele.style.setProperty("color", "transparent", "important");
										ele.style.setProperty("-webkit-background-clip", "text", "important");
									}
								}
							});
							return this.props.children || null;
						}
					};
					
					CustomComponents.TextInput = reactInitialized && class hiddenchannelslib_TextInput extends Internal.LibraryModules.React.Component {
						handleChange(e) {
							let value = e = hiddenchannelslib.ObjectUtils.is(e) ? e.currentTarget.value : e;
							this.props.value = this.props.valuePrefix && !value.startsWith(this.props.valuePrefix) ? (this.props.valuePrefix + value) : value;
							if (typeof this.props.onChange == "function") this.props.onChange(this.props.value, this);
							hiddenchannelslib.ReactUtils.forceUpdate(this);
						}
						handleInput(e) {if (typeof this.props.onInput == "function") this.props.onInput(hiddenchannelslib.ObjectUtils.is(e) ? e.currentTarget.value : e, this);}
						handleKeyDown(e) {if (typeof this.props.onKeyDown == "function") this.props.onKeyDown(e, this);}
						handleBlur(e) {if (typeof this.props.onBlur == "function") this.props.onBlur(e, this);}
						handleFocus(e) {if (typeof this.props.onFocus == "function") this.props.onFocus(e, this);}
						handleMouseEnter(e) {if (typeof this.props.onMouseEnter == "function") this.props.onMouseEnter(e, this);}
						handleMouseLeave(e) {if (typeof this.props.onMouseLeave == "function") this.props.onMouseLeave(e, this);}
						handleNumberButton(ins, value) {
							hiddenchannelslib.TimeUtils.clear(this.pressedTimeout);
							this.pressedTimeout = hiddenchannelslib.TimeUtils.timeout(_ => {
								delete this.props.focused;
								hiddenchannelslib.ReactUtils.forceUpdate(this);
							}, 1000);
							this.props.focused = true;
							this.handleChange.apply(this, [value]);
							this.handleInput.apply(this, [value]);
						}
						componentDidMount() {
							if (this.props.type == "file") {
								let navigatorInstance = hiddenchannelslib.ReactUtils.findOwner(this, {name: "hiddenchannelslib_FileButton"});
								if (navigatorInstance) navigatorInstance.refInput = this;
							}
							let input = hiddenchannelslib.ReactUtils.findDOMNode(this);
							if (!input) return;
							input = input.querySelector("input") || input;
							if (input && !input.patched) {
								input.addEventListener("keydown", e => {
									this.handleKeyDown.apply(this, [e]);
									e.stopImmediatePropagation();
								});
								input.patched = true;
							}
						}
						render() {
							let inputChildren = [
								hiddenchannelslib.ReactUtils.createElement("input", hiddenchannelslib.ObjectUtils.exclude(Object.assign({}, this.props, {
									className: hiddenchannelslib.DOMUtils.formatClassName(this.props.size && Internal.LibraryComponents.TextInput.Sizes[this.props.size.toUpperCase()] && hiddenchannelslib.disCN["input" + this.props.size.toLowerCase()] || hiddenchannelslib.disCN.inputdefault, this.props.inputClassName, this.props.focused && hiddenchannelslib.disCN.inputfocused, this.props.error || this.props.errorMessage ? hiddenchannelslib.disCN.inputerror : (this.props.success && hiddenchannelslib.disCN.inputsuccess), this.props.disabled && hiddenchannelslib.disCN.inputdisabled, this.props.editable && hiddenchannelslib.disCN.inputeditable),
									type: this.props.type == "color" || this.props.type == "file" ? "text" : this.props.type,
									onChange: this.handleChange.bind(this),
									onInput: this.handleInput.bind(this),
									onKeyDown: this.handleKeyDown.bind(this),
									onBlur: this.handleBlur.bind(this),
									onFocus: this.handleFocus.bind(this),
									onMouseEnter: this.handleMouseEnter.bind(this),
									onMouseLeave: this.handleMouseLeave.bind(this),
									maxLength: this.props.type == "file" ? false : this.props.maxLength,
									style: this.props.width ? {width: `${this.props.width}px`} : {},
									ref: this.props.inputRef
								}), "errorMessage", "focused", "error", "success", "inputClassName", "inputChildren", "valuePrefix", "inputPrefix", "size", "editable", "inputRef", "style", "mode", "colorPickerOpen", "noAlpha", "filter", "useFilePath", "searchFolders")),
								this.props.inputChildren,
								this.props.type == "color" ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Flex.Child, {
									wrap: true,
									children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.ColorSwatches, {
										colors: [],
										color: this.props.value && this.props.mode == "comp" ? hiddenchannelslib.ColorUtils.convert(this.props.value.split(","), "RGB") : this.props.value,
										onColorChange: color => this.handleChange.apply(this, [!color ? "" : (this.props.mode == "comp" ? hiddenchannelslib.ColorUtils.convert(color, "RGBCOMP").slice(0, 3).join(",") : hiddenchannelslib.ColorUtils.convert(color, this.props.noAlpha ? "RGB" : "RGBA"))]),
										pickerOpen: this.props.colorPickerOpen,
										onPickerOpen: _ => this.props.colorPickerOpen = true,
										onPickerClose: _ => delete this.props.colorPickerOpen,
										ref: this.props.controlsRef,
										pickerConfig: {gradient: false, alpha: this.props.mode != "comp" && !this.props.noAlpha}
									})
								}) : null,
								this.props.type == "file" ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.FileButton, {
									filter: this.props.filter,
									mode: this.props.mode,
									useFilePath: this.props.useFilePath,
									searchFolders: this.props.searchFolders,
									ref: this.props.controlsRef
								}) : null
							].flat(10).filter(n => n);
							
							return hiddenchannelslib.ReactUtils.createElement("div", {
								className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.inputwrapper, this.props.type == "number" && (this.props.size && Internal.LibraryComponents.TextInput.Sizes[this.props.size.toUpperCase()] && hiddenchannelslib.disCN["inputnumberwrapper" + this.props.size.toLowerCase()] || hiddenchannelslib.disCN.inputnumberwrapperdefault), this.props.className),
								style: this.props.style,
								children: [
									this.props.inputPrefix ? hiddenchannelslib.ReactUtils.createElement("span", {
										className: hiddenchannelslib.disCN.inputprefix
									}) : null,
									this.props.type == "number" ? hiddenchannelslib.ReactUtils.createElement("div", {
										className: hiddenchannelslib.disCN.inputnumberbuttons,
										children: [
											hiddenchannelslib.ReactUtils.createElement("div", {
												className: hiddenchannelslib.disCN.inputnumberbuttonup,
												onClick: e => {
													let min = parseInt(this.props.min);
													let max = parseInt(this.props.max);
													let newV = parseInt(this.props.value) + 1 || min || 0;
													if (isNaN(max) || !isNaN(max) && newV <= max) this.handleNumberButton.bind(this)(e._targetInst, isNaN(min) || !isNaN(min) && newV >= min ? newV : min);
												}
											}),
											hiddenchannelslib.ReactUtils.createElement("div", {
												className: hiddenchannelslib.disCN.inputnumberbuttondown,
												onClick: e => {
													let min = parseInt(this.props.min);
													let max = parseInt(this.props.max);
													let newV = parseInt(this.props.value) - 1 || min || 0;
													if (isNaN(min) || !isNaN(min) && newV >= min) this.handleNumberButton.bind(this)(e._targetInst, isNaN(max) || !isNaN(max) && newV <= max ? newV : max);
												}
											})
										]
									}) : null,
									inputChildren.length == 1 ? inputChildren[0] : hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Flex, {
										align: Internal.LibraryComponents.Flex.Align.CENTER,
										children: inputChildren.map((child, i) => i != 0 ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Flex.Child, {
											shrink: 0,
											children: child
										}) : child)
									}),
									this.props.errorMessage ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TextElement, {
										className: hiddenchannelslib.disCN.margintop8,
										size: Internal.LibraryComponents.TextElement.Sizes.SIZE_12,
										color: Internal.LibraryComponents.TextElement.Colors.STATUS_RED,
										children: this.props.errorMessage
									}) : null
								].filter(n => n)
							});
						}
					};
					
					CustomComponents.TextScroller = reactInitialized && class hiddenchannelslib_TextScroller extends Internal.LibraryModules.React.Component {
						render() {
							let scrolling, scroll = _ => {};
							return hiddenchannelslib.ReactUtils.createElement("div", {
								className: hiddenchannelslib.DOMUtils.formatClassName(hiddenchannelslib.disCN.textscroller, this.props.className),
								style: Object.assign({}, this.props.style, {
									position: "relative",
									display: "block",
									overflow: "hidden"
								}),
								ref: instance => {
									const ele = hiddenchannelslib.ReactUtils.findDOMNode(instance);
									if (ele && ele.parentElement) {
										const maxWidth = hiddenchannelslib.DOMUtils.getInnerWidth(ele.parentElement);
										if (maxWidth > 50) ele.style.setProperty("max-width", `${maxWidth}px`);
										if (!this.props.initiated) hiddenchannelslib.TimeUtils.timeout(_ => {
											this.props.initiated = true;
											if (document.contains(ele.parentElement)) hiddenchannelslib.ReactUtils.forceUpdate(this);
										}, 3000);
										const Animation = new Internal.LibraryModules.AnimationUtils.Value(0);
										Animation.interpolate({inputRange: [0, 1], outputRange: [0, (hiddenchannelslib.DOMUtils.getRects(ele.firstElementChild).width - hiddenchannelslib.DOMUtils.getRects(ele).width) * -1]}).addListener(v => {
											ele.firstElementChild.style.setProperty("display", v.value == 0 ? "inline" : "block", "important");
											ele.firstElementChild.style.setProperty("left", `${v.value}px`, "important");
										});
										scroll = p => {
											const display = ele.firstElementChild.style.getPropertyValue("display");
											ele.firstElementChild.style.setProperty("display", "inline", "important");
											const innerWidth = hiddenchannelslib.DOMUtils.getRects(ele.firstElementChild).width;
											const outerWidth = hiddenchannelslib.DOMUtils.getRects(ele).width;
											ele.firstElementChild.style.setProperty("display", display, "important");
											
											let w = p + parseFloat(ele.firstElementChild.style.getPropertyValue("left")) / (innerWidth - outerWidth);
											w = isNaN(w) || !isFinite(w) ? p : w;
											w *= innerWidth / (outerWidth * 2);
											Internal.LibraryModules.AnimationUtils.parallel([Internal.LibraryModules.AnimationUtils.timing(Animation, {toValue: p, duration: Math.sqrt(w**2) * 4000 / (parseInt(this.props.speed) || 1)})]).start();
										};
									}
								},
								onClick: e => {
									if (typeof this.props.onClick == "function") this.props.onClick(e, this);
								},
								onMouseEnter: e => {
									if (hiddenchannelslib.DOMUtils.getRects(e.currentTarget).width < hiddenchannelslib.DOMUtils.getRects(e.currentTarget.firstElementChild).width || e.currentTarget.firstElementChild.style.getPropertyValue("display") != "inline") {
										scrolling = true;
										scroll(1);
									}
								},
								onMouseLeave: e => {
									if (scrolling) {
										scrolling = false;
										scroll(0);
									}
								},
								children: hiddenchannelslib.ReactUtils.createElement("div", {
									style: {
										left: "0",
										position: "relative",
										display: "inline",
										whiteSpace: "nowrap"
									},
									children: this.props.children
								})
							});
						}
					};
					CustomComponents.TooltipContainer = reactInitialized && class hiddenchannelslib_TooltipContainer extends Internal.LibraryModules.React.Component {
						updateTooltip(text) {
							if (this.tooltip) this.tooltip.update(text);
						}
						render() {
							let child = (typeof this.props.children == "function" ? this.props.children() : (hiddenchannelslib.ArrayUtils.is(this.props.children) ? this.props.children[0] : this.props.children)) || hiddenchannelslib.ReactUtils.createElement("div", {});
							child.props.className = hiddenchannelslib.DOMUtils.formatClassName(child.props.className, this.props.className);
							let childProps = Object.assign({}, child.props);
							let shown = false;
							child.props.onMouseEnter = (e, childThis) => {
								if (!shown && !e.currentTarget.__hiddenchannelslibtooltipShown && !(this.props.onlyShowOnShift && !e.shiftKey) && !(this.props.onlyShowOnCtrl && !e.ctrlKey)) {
									e.currentTarget.__hiddenchannelslibtooltipShown = shown = true;
									this.tooltip = hiddenchannelslib.TooltipUtils.create(e.currentTarget, typeof this.props.text == "function" ? this.props.text(this, e) : this.props.text, Object.assign({
										note: this.props.note,
										delay: this.props.delay
									}, this.props.tooltipConfig, {
										onHide: (tooltip, anker) => {
											delete anker.__hiddenchannelslibtooltipShown;
											shown = false;
											if (this.props.tooltipConfig && typeof this.props.tooltipConfig.onHide == "function") this.props.tooltipConfig.onHide(tooltip, anker);
										}
									}));
									if (typeof this.props.onMouseEnter == "function") this.props.onMouseEnter(e, this);
									if (typeof childProps.onMouseEnter == "function") childProps.onMouseEnter(e, childThis);
								}
							};
							child.props.onMouseLeave = (e, childThis) => {
								if (typeof this.props.onMouseLeave == "function") this.props.onMouseLeave(e, this);
								if (typeof childProps.onMouseLeave == "function") childProps.onMouseLeave(e, childThis);
							};
							child.props.onClick = (e, childThis) => {
								if (typeof this.props.onClick == "function") this.props.onClick(e, this);
								if (typeof childProps.onClick == "function") childProps.onClick(e, childThis);
								if (typeof this.props.text == "function") this.updateTooltip(this.props.text(this, e));
							};
							child.props.onContextMenu = (e, childThis) => {
								if (typeof this.props.onContextMenu == "function") this.props.onContextMenu(e, this);
								if (typeof childProps.onContextMenu == "function") childProps.onContextMenu(e, childThis);
								if (typeof this.props.text == "function") this.updateTooltip(this.props.text(this, e));
							};
							return hiddenchannelslib.ReactUtils.createElement(Internal.LibraryModules.React.Fragment, {
								children: child
							});
						}
					};
					
					CustomComponents.UserPopoutContainer = reactInitialized && class hiddenchannelslib_UserPopoutContainer extends Internal.LibraryModules.React.Component {
						render() {
							return hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.PopoutContainer, hiddenchannelslib.ObjectUtils.exclude(Object.assign({}, this.props, {
								wrap: false,
								renderPopout: instance => hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.UserPopout, {
									user: Internal.LibraryModules.UserStore.getUser(this.props.userId),
									userId: this.props.userId,
									channelId: this.props.channelId,
									guildId: this.props.guildId
								}),
							}), "userId", "channelId", "guildId"));
						}
					};
					
					const VideoInner = function (props) {
						let ref = hiddenchannelslib.ReactUtils.useRef(null);
						hiddenchannelslib.ReactUtils.useEffect(_ => {
							if (ref.current) props.play ? ref.current.play() : ref.current.pause();
						}, [props.play]);
						return props.naturalWidth <= hiddenchannelslib.DiscordConstants.MAX_VIDEO_WIDTH && props.naturalHeight <= hiddenchannelslib.DiscordConstants.MAX_VIDEO_HEIGHT || props.naturalWidth <= hiddenchannelslib.DiscordConstants.MAX_VIDEO_HEIGHT && props.naturalHeight <= hiddenchannelslib.DiscordConstants.MAX_VIDEO_WIDTH ? hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.VideoForwardRef, {
							ref: ref,
							className: props.className,
							poster: props.poster,
							src: props.src,
							width: props.width,
							height: props.height,
							muted: true,
							loop: true,
							autoPlay: props.play,
							playOnHover: props.playOnHover,
							preload: "none"
						}) : hiddenchannelslib.ReactUtils.createElement("img", {
							alt: "",
							src: props.poster,
							width: props.width,
							height: props.height
						});
					};
					CustomComponents.Video = reactInitialized && class hiddenchannelslib_Video extends Internal.LibraryModules.React.Component {
						render() {
							return hiddenchannelslib.ReactUtils.createElement(VideoInner, this.props);
						}
					};
					
					const NativeSubComponents = {};
					Internal.NativeSubComponents = new Proxy(NativeSubComponents, {
						get: function (_, item) {
							if (NativeSubComponents[item]) return NativeSubComponents[item];
							if (!InternalData.NativeSubComponents[item]) return "div";
							if (InternalData.NativeSubComponents[item].name) {
								if (InternalData.NativeSubComponents[item].protos) {
									NativeSubComponents[item] = hiddenchannelslib.ModuleUtils.find(m => m && m.displayName == InternalData.NativeSubComponents[item].name && m.prototype && InternalData.NativeSubComponents[item].protos.every(proto => m.prototype[proto]) && m);
									if (!NativeSubComponents[item]) hiddenchannelslib.LogUtils.warn(`${JSON.stringify([InternalData.NativeSubComponents[item].name, InternalData.NativeSubComponents[item].protos].flat(10))} [name + protos] not found in WebModules`);
								}
								else NativeSubComponents[item] = hiddenchannelslib.ModuleUtils.findByName(InternalData.NativeSubComponents[item].name);
							}
							else if (InternalData.NativeSubComponents[item].props) NativeSubComponents[item] = hiddenchannelslib.ModuleUtils.findByProperties(InternalData.NativeSubComponents[item].props);
							return NativeSubComponents[item] ? NativeSubComponents[item] : "div";
						}
					});
					
					const LibraryComponents = {};
					Internal.LibraryComponents = new Proxy(LibraryComponents, {
						get: function (_, item) {
							if (LibraryComponents[item]) return LibraryComponents[item];
							if (!InternalData.LibraryComponents[item] && !CustomComponents[item]) return "div";
							if (InternalData.LibraryComponents[item]) {
								if (InternalData.LibraryComponents[item].name) LibraryComponents[item] = hiddenchannelslib.ModuleUtils.findByName(InternalData.LibraryComponents[item].name);
								else if (InternalData.LibraryComponents[item].strings) LibraryComponents[item] = hiddenchannelslib.ModuleUtils.findByString(InternalData.LibraryComponents[item].strings);
								else if (InternalData.LibraryComponents[item].props) LibraryComponents[item] = hiddenchannelslib.ModuleUtils.findByProperties(InternalData.LibraryComponents[item].props);
								if (InternalData.LibraryComponents[item].value) LibraryComponents[item] = (LibraryComponents[item] || {})[InternalData.LibraryComponents[item].value];
								if (InternalData.LibraryComponents[item].assign) LibraryComponents[item] = Object.assign({}, LibraryComponents[item]);
							}
							if (CustomComponents[item]) LibraryComponents[item] = LibraryComponents[item] ? Object.assign({}, LibraryComponents[item], CustomComponents[item]) : CustomComponents[item];
							
							const NativeComponent = LibraryComponents[item] && Internal.NativeSubComponents[item];
							if (NativeComponent && typeof NativeComponent != "string") {
								for (let key in NativeComponent) if (key != "displayName" && key != "name" && (typeof NativeComponent[key] != "function" || key.charAt(0) == key.charAt(0).toUpperCase())) {
									if (key == "defaultProps") LibraryComponents[item][key] = Object.assign({}, LibraryComponents[item][key], NativeComponent[key]);
									else if (!LibraryComponents[item][key]) LibraryComponents[item][key] = NativeComponent[key];
								}
							}
							if (InternalData.LibraryComponents[item] && InternalData.LibraryComponents[item].children) {
								const SubComponents = LibraryComponents[item] && typeof LibraryComponents[item] == "object" ? LibraryComponents[item] : {};
								const InternalParentData = InternalData.LibraryComponents[item].children;
								LibraryComponents[item] = new Proxy(hiddenchannelslib.ObjectUtils.is(SubComponents) ? SubComponents : {}, {
									get: function (_, item2) {
										if (CustomComponents[item] && CustomComponents[item][item2]) return CustomComponents[item][item2];
										if (SubComponents[item2]) return SubComponents[item2];
										if (!InternalParentData[item2]) return "div";
										if (InternalParentData[item2].name) SubComponents[item2] = hiddenchannelslib.ModuleUtils.findByName(InternalParentData[item2].name);
										else if (InternalParentData[item2].strings) SubComponents[item2] = hiddenchannelslib.ModuleUtils.findByString(InternalParentData[item2].strings);
										else if (InternalParentData[item2].props) SubComponents[item2] = hiddenchannelslib.ModuleUtils.findByProperties(InternalParentData[item2].props); 
										
										if (InternalParentData[item2].value) SubComponents[item2] = (SubComponents[item2] || {})[InternalParentData[item2].value];
										if (InternalParentData[item2].assign) SubComponents[item] = Object.assign({}, SubComponents[item2]);
										if (CustomComponents[item2]) SubComponents[item2] = SubComponents[item2] ? Object.assign({}, SubComponents[item2], CustomComponents[item2]) : CustomComponents[item2];
										
										const NativeComponent = Internal.NativeSubComponents[item2];
										if (NativeComponent && typeof NativeComponent != "string") {
											for (let key in NativeComponent) if (key != "displayName" && key != "name" && (typeof NativeComponent[key] != "function" || key.charAt(0) == key.charAt(0).toUpperCase())) {
												if (key == "defaultProps") SubComponents[item2][key] = Object.assign({}, SubComponents[item2][key], NativeComponent[key]);
												else if (!SubComponents[item2][key]) SubComponents[item2][key] = NativeComponent[key];
											}
										}
										return SubComponents[item2] ? SubComponents[item2] : "div";
									}
								});
							}
							return LibraryComponents[item] ? LibraryComponents[item] : "div";
						}
					});
					
					hiddenchannelslib.LibraryComponents = Internal.LibraryComponents;

					const keyDownTimeouts = {};
					hiddenchannelslib.ListenerUtils.add(hiddenchannelslib, document, "keydown.hiddenchannelslibPressedKeys", e => {
						if (!pressedKeys.includes(e.which)) {
							hiddenchannelslib.TimeUtils.clear(keyDownTimeouts[e.which]);
							pressedKeys.push(e.which);
							keyDownTimeouts[e.which] = hiddenchannelslib.TimeUtils.timeout(_ => {
								hiddenchannelslib.ArrayUtils.remove(pressedKeys, e.which, true);
							}, 60000);
						}
					});
					hiddenchannelslib.ListenerUtils.add(hiddenchannelslib, document, "keyup.hiddenchannelslibPressedKeys", e => {
						hiddenchannelslib.TimeUtils.clear(keyDownTimeouts[e.which]);
						hiddenchannelslib.ArrayUtils.remove(pressedKeys, e.which, true);
					});
					hiddenchannelslib.ListenerUtils.add(hiddenchannelslib, document, "mousedown.hiddenchannelslibMousePosition", e => {
						mousePosition = e;
					});
					hiddenchannelslib.ListenerUtils.add(hiddenchannelslib, window, "focus.hiddenchannelslibPressedKeysReset", e => {
						pressedKeys = [];
					});
					
					Internal.patchedModules = {
						before: {
							SearchBar: "render",
							EmojiPickerListRow: "default"
						},
						after: {
							useCopyIdItem: "default",
							Menu: "default",
							Shakeable: "render",
							Account: ["componentDidMount", "componentDidUpdate"],
							MessageToolbar: "type",
							MessageHeader: "default",
							MemberListItem: ["componentDidMount", "componentDidUpdate"],
							PrivateChannel: ["componentDidMount", "componentDidUpdate"],
							AnalyticsContext: ["componentDidMount", "componentDidUpdate"],
							UserPopoutAvatar: "UserPopoutAvatar",
							DiscordTag: "default"
						}
					};
					
					Internal.processUseCopyIdItem = function (e) {
						if (!e.returnvalue) e.returnvalue = false;
					};
					
					const menuExtraPatches = {};
					Internal.processMenu = function (e) {
						if (e.instance.props.navId) switch (e.instance.props.navId) {
							case "guild-header-popout":
								if (menuExtraPatches["guild-header-popout"]) return;
								menuExtraPatches["guild-header-popout"] = true;
								hiddenchannelslib.TimeUtils.interval((interval, count) => {
									if (count > 20) return hiddenchannelslib.TimeUtils.clear(interval);
									else {
										let module = hiddenchannelslib.ModuleUtils.findByString("guild-header-popout");
										if (module) hiddenchannelslib.PatchUtils.patch(hiddenchannelslib, module, "type", {after: e2 => {
											Internal.triggerQueuePatch("GuildHeaderContextMenu", {
												arguments: e2.methodArguments,
												instance: {props: e2.methodArguments[0]},
												returnvalue: e2.returnValue,
												component: e.returnValue,
												methodname: "type",
												type: "GuildHeaderContextMenu"
											});
										}});
									}
								}, 500);
								return;
						}
						if (!e.instance.props.children || hiddenchannelslib.ArrayUtils.is(e.instance.props.children) && !e.instance.props.children.length) Internal.LibraryModules.ContextMenuUtils.closeContextMenu();
					};
					
					Internal.processSearchBar = function (e) {
						if (typeof e.instance.props.query != "string") e.instance.props.query = "";
					};
					
					let AppViewExport = InternalData.ModuleUtilsConfig.Finder.AppView && hiddenchannelslib.ModuleUtils.findByString(InternalData.ModuleUtilsConfig.Finder.AppView.strings, false);
					if (AppViewExport) Internal.processShakeable = function (e) {
						let [children, index] = hiddenchannelslib.ReactUtils.findParent(e.returnvalue, {filter: n => {
							if (!n || typeof n.type != "function") return;
							let typeString = n.type.toString();
							return [InternalData.ModuleUtilsConfig.Finder.AppView.strings].flat(10).filter(n => typeof n == "string").every(string => typeString.indexOf(string) > -1);
						}});
						if (index > -1) children[index] = hiddenchannelslib.ReactUtils.createElement(AppViewExport.exports.default, children[index].props);
					};
					
					Internal.processMessageToolbar = function (e) {
						if (document.querySelector(hiddenchannelslib.dotCN.emojipicker) || !hiddenchannelslib.ObjectUtils.toArray(PluginStores.loaded).filter(p => p.started).some(p => p.onSystemMessageOptionContextMenu || p.onSystemMessageOptionToolbar || p.onMessageOptionContextMenu || p.onMessageOptionToolbar)) return;
						let toolbar = hiddenchannelslib.ReactUtils.findChild(e.returnvalue, {filter: c => c && c.props && c.props.showMoreUtilities != undefined && c.props.showEmojiPicker != undefined && c.props.setPopout != undefined});
						if (toolbar) hiddenchannelslib.PatchUtils.patch(hiddenchannelslib, toolbar, "type", {after: e2 => {
							let menu = hiddenchannelslib.ReactUtils.findChild(e2.returnValue, {filter: c => c && c.props && typeof c.props.onRequestClose == "function" && c.props.onRequestClose.toString().indexOf("moreUtilities") > -1});
							let isSystem = hiddenchannelslib.MessageUtils.isSystemMessage(e2.methodArguments[0] && e2.methodArguments[0].message);
							Internal.triggerQueuePatch(isSystem ? "SystemMessageOptionToolbar" : "MessageOptionToolbar", {
								arguments: e2.methodArguments,
								instance: {props: e2.methodArguments[0]},
								returnvalue: e2.returnValue,
								methodname: "default",
								type: isSystem ? "SystemMessageOptionToolbar" : "MessageOptionToolbar"
							});
							if (menu && typeof menu.props.renderPopout == "function") {
								let renderPopout = menu.props.renderPopout;
								menu.props.renderPopout = hiddenchannelslib.TimeUtils.suppress((...args) => {
									let renderedPopout = renderPopout(...args);
									renderedPopout.props.updatePosition = _ => {};
									hiddenchannelslib.PatchUtils.patch(hiddenchannelslib, renderedPopout, "type", {after: e3 => {
										let isSystem = hiddenchannelslib.MessageUtils.isSystemMessage(e3.methodArguments[0] && e3.methodArguments[0].message);
										Internal.triggerQueuePatch(isSystem ? "SystemMessageOptionContextMenu" : "MessageOptionContextMenu", {
											arguments: e3.methodArguments,
											instance: {props: e3.methodArguments[0]},
											returnvalue: e3.returnValue,
											methodname: "default",
											type: isSystem ? "SystemMessageOptionContextMenu" : "MessageOptionContextMenu"
										});
									}}, {noCache: true});
									return renderedPopout;
								}, "Error in Popout Render of MessageOptionToolbar!");
							}
						}}, {once: true});
					};

					const hiddenchannelslib_Patrons = Object.assign({}, InternalData.hiddenchannelslib_Patrons), hiddenchannelslib_Patron_Tiers = Object.assign({}, InternalData.hiddenchannelslib_Patron_Tiers);
					Internal._processAvatarRender = function (user, avatar, wrapper, className) {
						if (hiddenchannelslib.ReactUtils.isValidElement(avatar) && hiddenchannelslib.ObjectUtils.is(user) && (avatar.props.className || "").indexOf(hiddenchannelslib.disCN.hiddenchannelslibbadgeavatar) == -1) {
							let role = "", note = "", color, link, addBadge = Internal.settings.general.showSupportBadges;
							if (hiddenchannelslib_Patrons[user.id] && hiddenchannelslib_Patrons[user.id].active) {
								link = "https://www.patreon.com/MircoWittrien";
								role = hiddenchannelslib_Patrons[user.id].text || (hiddenchannelslib_Patron_Tiers[hiddenchannelslib_Patrons[user.id].tier] || {}).text;
								note = hiddenchannelslib_Patrons[user.id].text && (hiddenchannelslib_Patron_Tiers[hiddenchannelslib_Patrons[user.id].tier] || {}).text;
								color = hiddenchannelslib_Patrons[user.id].color;
								className = hiddenchannelslib.DOMUtils.formatClassName(avatar.props.className, className, addBadge && hiddenchannelslib.disCN.hiddenchannelslibhasbadge, hiddenchannelslib.disCN.hiddenchannelslibbadgeavatar, hiddenchannelslib.disCN.hiddenchannelslibsupporter, hiddenchannelslib.disCN[`hiddenchannelslibsupporter${hiddenchannelslib_Patrons[user.id].tier}`]);
							}
							else if (user.id == InternalData.myId) {
								addBadge = true;
								role = `Theme ${hiddenchannelslib.LanguageUtils.LibraryStrings.developer}`;
								className = hiddenchannelslib.DOMUtils.formatClassName(avatar.props.className, className, hiddenchannelslib.disCN.hiddenchannelslibhasbadge, hiddenchannelslib.disCN.hiddenchannelslibbadgeavatar, hiddenchannelslib.disCN.hiddenchannelslibdev);
							}
							if (role) {
								if (avatar.type == "img") avatar = hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.AvatarComponents.default, Object.assign({}, avatar.props, {
									size: Internal.LibraryComponents.AvatarComponents.Sizes.SIZE_40
								}));
								delete avatar.props.className;
								let newProps = {
									className: className,
									children: [avatar]
								};
								avatar = hiddenchannelslib.ReactUtils.createElement("div", newProps);
								if (addBadge) avatar.props.children.push(hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.TooltipContainer, {
									text: role,
									note: note,
									tooltipConfig: {backgroundColor: color || ""},
									onClick: link ? (_ => hiddenchannelslib.DiscordUtils.openLink(link)) : (_ => {}),
									children: hiddenchannelslib.ReactUtils.createElement("div", {
										className: hiddenchannelslib.disCN.hiddenchannelslibbadge,
										"user-id": user.id
									})
								}));
								return avatar;
							}
						}
					};
					Internal._processAvatarMount = function (user, avatar, wrapper) {
						if (!user) return;
						if (Node.prototype.isPrototypeOf(avatar) && (avatar.className || "").indexOf(hiddenchannelslib.disCN.hiddenchannelslibbadgeavatar) == -1) {
							let role = "", note = "", color, link, addBadge = Internal.settings.general.showSupportBadges;
							if (hiddenchannelslib_Patrons[user.id] && hiddenchannelslib_Patrons[user.id].active) {
								link = "https://www.patreon.com/MircoWittrien";
								role = hiddenchannelslib_Patrons[user.id].text || (hiddenchannelslib_Patron_Tiers[hiddenchannelslib_Patrons[user.id].tier] || {}).text;
								note = hiddenchannelslib_Patrons[user.id].text && (hiddenchannelslib_Patron_Tiers[hiddenchannelslib_Patrons[user.id].tier] || {}).text;
								color = hiddenchannelslib_Patrons[user.id].color;
								avatar.className = hiddenchannelslib.DOMUtils.formatClassName(avatar.className, addBadge && hiddenchannelslib.disCN.hiddenchannelslibhasbadge, hiddenchannelslib.disCN.hiddenchannelslibbadgeavatar, hiddenchannelslib.disCN.hiddenchannelslibsupporter, hiddenchannelslib.disCN[`hiddenchannelslibsupporter${hiddenchannelslib_Patrons[user.id].tier}`]);
							}
							else if (user.id == InternalData.myId) {
								addBadge = true;
								role = `Theme ${hiddenchannelslib.LanguageUtils.LibraryStrings.developer}`;
								avatar.className = hiddenchannelslib.DOMUtils.formatClassName(avatar.className, addBadge && hiddenchannelslib.disCN.hiddenchannelslibhasbadge, hiddenchannelslib.disCN.hiddenchannelslibbadgeavatar, hiddenchannelslib.disCN.hiddenchannelslibdev);
							}
							if (addBadge && role && !avatar.querySelector(hiddenchannelslib.dotCN.hiddenchannelslibbadge)) {
								let badge = document.createElement("div");
								badge.className = hiddenchannelslib.disCN.hiddenchannelslibbadge;
								badge.setAttribute("user-id", user.id);
								if (link) badge.addEventListener("click", _ => hiddenchannelslib.DiscordUtils.openLink(link));
								badge.addEventListener("mouseenter", _ => hiddenchannelslib.TooltipUtils.create(badge, role, {position: "top", note: note, backgroundColor: color || ""}));
								avatar.appendChild(badge);
							}
						}
					};
					Internal.processAccount = function (e) {
						Internal._processAvatarMount(e.instance.props.currentUser, e.node.querySelector(hiddenchannelslib.dotCN.avatarwrapper), e.node);
					};
					Internal.processMessageHeader = function (e) {
						if (e.instance.props.message && e.instance.props.message.author) {
							let avatarWrapper = e.returnvalue.props.avatar || hiddenchannelslib.ObjectUtils.get(e, "returnvalue.props.children.0");
							if (avatarWrapper && avatarWrapper.props && typeof avatarWrapper.props.children == "function") {
								let renderChildren = avatarWrapper.props.children;
								avatarWrapper.props.children = hiddenchannelslib.TimeUtils.suppress((...args) => {
									let renderedChildren = renderChildren(...args);
									return Internal._processAvatarRender(e.instance.props.message.author, renderedChildren, null, hiddenchannelslib.disCN.messageavatar) || renderedChildren;
								}, "Error in Avatar Render of MessageHeader!");
							}
							else if (avatarWrapper && avatarWrapper.type == "img") e.returnvalue.props.children[0] = Internal._processAvatarRender(e.instance.props.message.author, avatarWrapper) || avatarWrapper;
						}
					};
					Internal.processMemberListItem = function (e) {
						Internal._processAvatarMount(e.instance.props.user, e.node.querySelector(hiddenchannelslib.dotCN.avatarwrapper), e.node);
					};
					Internal.processPrivateChannel = function (e) {
						Internal._processAvatarMount(e.instance.props.user, e.node.querySelector(hiddenchannelslib.dotCN.avatarwrapper), e.node);
					};
					Internal.processAnalyticsContext = function (e) {
						if (e.instance.props.section != hiddenchannelslib.DiscordConstants.AnalyticsSections.PROFILE_MODAL && e.instance.props.section != hiddenchannelslib.DiscordConstants.AnalyticsSections.PROFILE_POPOUT) return;
						const user = hiddenchannelslib.ReactUtils.findValue(e.instance, "user");
						if (!user) return;
						const avatar = e.instance.props.section != hiddenchannelslib.DiscordConstants.AnalyticsSections.PROFILE_POPOUT && e.node.querySelector(hiddenchannelslib.dotCN.avatarwrapper);
						const wrapper = e.node.querySelector(hiddenchannelslib.dotCNC.userpopout + hiddenchannelslib.dotCN.userprofile) || e.node;
						if (avatar) Internal._processAvatarMount(user, avatar, wrapper);
					};
					Internal.processUserPopoutAvatar = function (e) {
						if (!e.instance.props.user) return;
						let [children, index] = hiddenchannelslib.ReactUtils.findParent(e.returnvalue, {props: [["className", hiddenchannelslib.disCN.userpopoutavatarwrapper]]});
						if (index > -1) children[index] = Internal._processAvatarRender(e.instance.props.user, children[index], null, e.instance) || children[index];
					};
					Internal.processDiscordTag = function (e) {
						if (e.instance && e.instance.props && e.returnvalue && e.instance.props.user) e.returnvalue.props.user = e.instance.props.user;
					};
					Internal.processEmojiPickerListRow = function (e) {
						if (e.instance.props.emojiDescriptors && Internal.LibraryComponents.EmojiPickerButton.current && Internal.LibraryComponents.EmojiPickerButton.current.props && Internal.LibraryComponents.EmojiPickerButton.current.props.allowManagedEmojisUsage) for (let i in e.instance.props.emojiDescriptors) e.instance.props.emojiDescriptors[i] = Object.assign({}, e.instance.props.emojiDescriptors[i], {isDisabled: false});
					};
					
					Internal.addChunkObserver = function (pluginData, config) {
						let module;
						if (config.stringFind) module = hiddenchannelslib.ModuleUtils.findByString(config.stringFind, config.exported, true);
						else if (config.propertyFind) module = hiddenchannelslib.ModuleUtils.findByProperties(config.propertyFind, config.exported, true);
						else if (config.prototypeFind) module = hiddenchannelslib.ModuleUtils.findByPrototypes(config.prototypeFind, config.exported, true);
						else module = hiddenchannelslib.ModuleUtils.findByName(config.name, config.exported, true);
						if (module) {
							let exports = !config.exported && module.exports || module;
							exports = config.path && hiddenchannelslib.ObjectUtils.get(exports, config.path) || exports;
							exports && Internal.patchComponent(pluginData, Internal.isMemoOrForwardRef(exports) ? exports.default : exports, config);
						}
						else {
							if (!PluginStores.chunkObserver[config.mappedType]) {
								PluginStores.chunkObserver[config.mappedType] = {query: [], config};
								let filter;
								if (config.stringFind) filter = m => m && Internal.hasModuleStrings(m, config.stringFind) && m;
								else if (config.propertyFind) filter = m => [config.propertyFind].flat(10).filter(n => n).every(prop => {
									const value = m[prop];
									return value !== undefined && !(typeof value == "string" && !value);
								}) && m;
								else if (config.prototypeFind) filter = m =>  m.prototype && [config.prototypeFind].flat(10).filter(n => n).every(prop => {
									const value = m.prototype[prop];
									return value !== undefined && !(typeof value == "string" && !value);
								}) && m;
								else filter = m => m.displayName === config.name && m || m.render && m.render.displayName === config.name && m || m[config.name] && m[config.name].displayName === name && m[config.name];
								PluginStores.chunkObserver[config.mappedType].filter = filter;
							}
							PluginStores.chunkObserver[config.mappedType].query.push(pluginData);
						}
					};
					Internal.addQueuePatches = function (plugin) {
						if (!InternalData.ModuleUtilsConfig.QueuedComponents) return;
						plugin = plugin == hiddenchannelslib && Internal || plugin;
						for (let type of InternalData.ModuleUtilsConfig.QueuedComponents) if (typeof plugin[`on${type}`] == "function") {
							if (PluginStores.patchQueues[type].query.indexOf(plugin) == -1) {
								PluginStores.patchQueues[type].query.push(plugin);
								PluginStores.patchQueues[type].query.sort((x, y) => x.name < y.name ? -1 : x.name > y.name ? 1 : 0);
							}
						}
					};
					Internal.triggerQueuePatch = function (type, e) {
						if (e.returnvalue && hiddenchannelslib.ObjectUtils.is(PluginStores.patchQueues[type]) && hiddenchannelslib.ArrayUtils.is(PluginStores.patchQueues[type].query)) {
							for (let plugin of PluginStores.patchQueues[type].query) if(typeof plugin[`on${type}`] == "function") plugin[`on${type}`](e);
						}
					};
					Internal.addContextChunkObservers = function (plugin) {
						if (!InternalData.ModuleUtilsConfig.ContextMenuTypes) return;
						plugin = plugin == hiddenchannelslib && Internal || plugin;
						for (let type of InternalData.ModuleUtilsConfig.ContextMenuTypes) {
							type = `${type}ContextMenu`;
							if (typeof plugin[`on${InternalData.ModuleUtilsConfig.ContextMenuTypesMap[type] || type}`] == "function") {
								for (let module of PluginStores.contextChunkObserver[type].modules) Internal.patchContextMenu(plugin, type, module);
								if (PluginStores.contextChunkObserver[type].query.indexOf(plugin) == -1) {
									PluginStores.contextChunkObserver[type].query.push(plugin);
									PluginStores.contextChunkObserver[type].query.sort((x, y) => x.name < y.name ? -1 : x.name > y.name ? 1 : 0);
								}
							}
						}
					};
					Internal.patchContextMenu = function (plugin, type, module) {
						if (!module || !module.default) return;
						plugin = plugin == hiddenchannelslib && Internal || plugin;
						const mappedType = InternalData.ModuleUtilsConfig.ContextMenuTypesMap[type] || type;
						if (!InternalData.ModuleUtilsConfig.ContextMenuSubItemsMap[mappedType]) {
							const call = (args, props, returnValue, name) => {
								if (!returnValue || !returnValue.props || !returnValue.props.children || returnValue.props.children.__hiddenchannelslibPatchesCalled && returnValue.props.children.__hiddenchannelslibPatchesCalled[plugin.name]) return;
								returnValue.props.children.__hiddenchannelslibPatchesCalled = Object.assign({}, returnValue.props.children.__hiddenchannelslibPatchesCalled, {[plugin.name]: true});
								return plugin[`on${mappedType}`]({
									arguments: args,
									instance: {props: props},
									returnvalue: returnValue,
									component: module,
									methodname: "default",
									type: name
								});
							};
							hiddenchannelslib.PatchUtils.patch(plugin, module, "default", {after: e => {
								if (typeof plugin[`on${mappedType}`] != "function") return;
								else if (e.returnValue && e.returnValue.props.children !== undefined) {
									if (e.returnValue.props.navId) {
										e.returnValue.props.children = [e.returnValue.props.children].flat(10);
										call(e.methodArguments, e.methodArguments[0], e.returnValue, module.default.displayName);
									}
									if (e.returnValue.props.children && e.returnValue.props.children.type && e.returnValue.props.children.type.displayName) {
										const name = e.returnValue.props.children.type.displayName;
										const originalReturn = e.returnValue.props.children.type(e.returnValue.props.children.props);
										if (!originalReturn || !originalReturn.type) return;
										let newType = (...args) => {
											const returnValue = hiddenchannelslib.ReactUtils.createElement(originalReturn.type, originalReturn.props);
											if (returnValue.props.children) call(args, args[0], returnValue, name);
											else hiddenchannelslib.PatchUtils.patch(plugin, returnValue, "type", {after: e2 => {
												if (e2.returnValue && typeof plugin[`on${type}`] == "function") call(e2.methodArguments, e2.methodArguments[0], e2.returnValue, name);
											}}, {noCache: true});
											return returnValue;
										};
										newType.displayName = name;
										e.returnValue.props.children = hiddenchannelslib.ReactUtils.createElement(newType, e.returnValue.props.children.props);
									}
								}
								else hiddenchannelslib.PatchUtils.patch(plugin, e.returnValue, "type", {after: e2 => {
									if (e2.returnValue && typeof plugin[`on${mappedType}`] == "function") call(e2.methodArguments, e2.methodArguments[0], e2.returnValue, module.default.displayName);
								}}, {noCache: true});
							}}, {name: type});
						}
						else {
							const getProps = (props, keys) => {
								let newProps = Object.assign({}, hiddenchannelslib.ObjectUtils.is(props) ? props : typeof props == "string" ? {id: props} : {});
								for (const key of [keys].flat(10).filter(n => n)) {
									const store = `${Internal.LibraryModules.StringUtils.upperCaseFirstChar(key)}Store`;
									const getter = `get${Internal.LibraryModules.StringUtils.upperCaseFirstChar(key)}`;
									const value = props && props[key] || Internal.LibraryModules[store] && typeof Internal.LibraryModules[store][getter] == "function" && Internal.LibraryModules[store][getter](props && props.id || props);
									if (value) {
										newProps = Object.assign(newProps, {[key]: value});
										break;
									}
								}
								return newProps;
							};
							hiddenchannelslib.PatchUtils.patch(plugin, module, "default", {after: e => {
								if (typeof plugin[`on${mappedType}`] != "function") return;
								e.returnValue = [e.returnValue].flat(10).filter(n => n);
								return plugin[`on${mappedType}`]({
									arguments: e.methodArguments,
									instance: {props: InternalData.ModuleUtilsConfig.ContextMenuSubItemsMap[mappedType].keys && getProps(e.methodArguments[0], InternalData.ModuleUtilsConfig.ContextMenuSubItemsMap[mappedType].keys) || e.methodArguments[0]},
									returnvalue: e.returnValue,
									component: module,
									methodname: "default",
									type: type,
									subType: module.__hiddenchannelslib_ContextMenu_Patch_Name
								});
							}}, {name: type});
						}
					};
					
					hiddenchannelslib.ReactUtils.instanceKey = Object.keys(document.querySelector(hiddenchannelslib.dotCN.app) || {}).some(n => n.startsWith("__reactInternalInstance")) ? "_reactInternalFiber" : "_reactInternals";

					hiddenchannelslib.PluginUtils.load(hiddenchannelslib);
					Internal.settings = hiddenchannelslib.DataUtils.get(Internal);
					changeLogs = hiddenchannelslib.DataUtils.load(hiddenchannelslib, "changeLogs");
					hiddenchannelslib.PluginUtils.checkChangeLog(hiddenchannelslib);
					
					(_ => {
						const chunkName = "webpackChunkdiscord_app";
						const originalPush = window[chunkName].push;
						const patches = {};
						const handlePush = chunk => {
							for (const id in chunk[1]) {
								const origModule = chunk[1][id];
								chunk[1][id] = (module, exports, require) => {
									Reflect.apply(origModule, null, [module, exports, require]);
									const removedTypes = [];
									for (const type in PluginStores.chunkObserver) {
										const foundModule = PluginStores.chunkObserver[type].filter(exports) || exports.default && PluginStores.chunkObserver[type].filter(exports.default);
										if (foundModule) {
											Internal.patchComponent(PluginStores.chunkObserver[type].query, PluginStores.chunkObserver[type].config.exported ? foundModule : exports, PluginStores.chunkObserver[type].config);
											removedTypes.push(type);
											break;
										}
									}
									while (removedTypes.length) delete PluginStores.chunkObserver[removedTypes.pop()];
									let found = false, funcString = exports && exports.default && typeof exports.default == "function" && exports.default.toString();
									if (funcString && funcString.indexOf(".page") > -1 && funcString.indexOf(".section") > -1 && funcString.indexOf(".objectType") > -1) {
										const returnValue = exports.default({});
										if (returnValue && returnValue.props && returnValue.props.object == hiddenchannelslib.DiscordConstants.AnalyticsObjects.CONTEXT_MENU) {
											for (const type in PluginStores.contextChunkObserver) if (PluginStores.contextChunkObserver[type].filter(returnValue.props.children)) {
												exports.__hiddenchannelslib_ContextMenuWrapper_Patch_Name = exports.__hiddenchannelslib_ContextMenu_Patch_Name;
												found = true;
												if (PluginStores.contextChunkObserver[type].modules.indexOf(exports) == -1) PluginStores.contextChunkObserver[type].modules.push(exports);
												for (const plugin of PluginStores.contextChunkObserver[type].query) Internal.patchContextMenu(plugin, type, exports);
												break;
											}
										}
									}
									if (!found) for (const type in PluginStores.contextChunkObserver) {
										if (PluginStores.contextChunkObserver[type].filter(exports)) {
											found = true;
											if (PluginStores.contextChunkObserver[type].modules.indexOf(exports) == -1) PluginStores.contextChunkObserver[type].modules.push(exports);
											for (const plugin of PluginStores.contextChunkObserver[type].query) Internal.patchContextMenu(plugin, type, exports);
											break;
										}
									}
									if (!found) {
										let moduleString = require.m[id] && typeof require.m[id].toString == "function" && require.m[id].toString();
										if (moduleString) for (const type in PluginStores.contextChunkObserver) if (moduleString.indexOf(`="${type}`) > -1) {
											found = true;
											if (PluginStores.contextChunkObserver[type].modules.indexOf(exports) == -1) PluginStores.contextChunkObserver[type].modules.push(exports);
											for (const plugin of PluginStores.contextChunkObserver[type].query) Internal.patchContextMenu(plugin, type, exports);
											break;
										}
									}
								};
								Object.assign(chunk[1][id], origModule, {toString: _ => origModule.toString()});
								patches[id] = [chunk, origModule];
							}
							return Reflect.apply(originalPush, window[chunkName], [chunk]);
						};
						
						Object.defineProperty(window[chunkName], "push", {
							configurable: true,
							get: _ => handlePush,
							set: newPush => {
								originalPush = newPush;
								Object.defineProperty(window[chunkName], "push", {
									value: handlePush,
									configurable: true,
									writable: true
								});
							}
						});
						Internal.removeChunkObserver = _ => {
							for (let id in patches) {
								patches[id][0] = patches[id][1];
								patches[id] = null;
							}
							Object.defineProperty(window[chunkName], "push", {
								configurable: true,
								get: _ => (chunk => Reflect.apply(originalPush, window[chunkName], [chunk]))
							});
						};
					})();
					
					if (InternalData.ModuleUtilsConfig.ContextMenuTypes) for (let type of InternalData.ModuleUtilsConfig.ContextMenuTypes) {
						type = `${type}ContextMenu`;
						if (!PluginStores.contextChunkObserver[type]) {
							const mappedType = InternalData.ModuleUtilsConfig.ContextMenuTypesMap[type] || type;
							PluginStores.contextChunkObserver[type] = {query: [], modules: []};
							if (!InternalData.ModuleUtilsConfig.ContextMenuSubItemsMap[mappedType]) PluginStores.contextChunkObserver[type].filter = m => {
								if (!m || !(m.default || m.type)) return;
								const d = m.default || m.type;
								if (d.displayName && (d.displayName.endsWith("ContextMenu") || d.displayName.endsWith("ContextMenuWrapper")) && `${InternalData.ModuleUtilsConfig.ContextMenuTypes.find(t => d.displayName.indexOf(t) > -1)}ContextMenu` == type) {
									m.__hiddenchannelslib_ContextMenu_Patch_Name = type;
									return true;
								}
								else if (m.__hiddenchannelslib_ContextMenuWrapper_Patch_Name && m.__hiddenchannelslib_ContextMenuWrapper_Patch_Name.endsWith("ContextMenu") && `${InternalData.ModuleUtilsConfig.ContextMenuTypes.find(t => m.__hiddenchannelslib_ContextMenuWrapper_Patch_Name.indexOf(t) > -1)}ContextMenu` == type) {
									m.__hiddenchannelslib_ContextMenu_Patch_Name = type;
									return true;
								}
							};
							else PluginStores.contextChunkObserver[type].filter = m => {
								if (!m || !(m.default || m.type)) return;
								const d = m.default || m.type;
								if (d.displayName && InternalData.ModuleUtilsConfig.ContextMenuSubItemsMap[mappedType].items.indexOf(d.displayName) > -1) {
									m.__hiddenchannelslib_ContextMenu_Patch_Name = d.displayName;
									return true;
								}
								else {
									const subType = InternalData.ModuleUtilsConfig.ContextMenuSubItemsMap[mappedType].items.find(item => InternalData.ModuleUtilsConfig.Finder[item] && InternalData.ModuleUtilsConfig.Finder[item].strings && Internal.hasModuleStrings(d, InternalData.ModuleUtilsConfig.Finder[item].strings));
									if (subType) {
										m.__hiddenchannelslib_ContextMenu_Patch_Name = subType;
										return true;
									}
								}
							};
							PluginStores.contextChunkObserver[type].modules = hiddenchannelslib.ModuleUtils.find(PluginStores.contextChunkObserver[type].filter, {useExport: false, all: true}).map(m => m.exports).filter(n => n);
						}
					}
					
					Internal.patchPlugin(hiddenchannelslib);
					Internal.addQueuePatches(hiddenchannelslib);
					Internal.addContextChunkObservers(hiddenchannelslib);
					
					if (InternalData.ModuleUtilsConfig.QueuedComponents) for (let type of InternalData.ModuleUtilsConfig.QueuedComponents) if (!PluginStores.patchQueues[type]) PluginStores.patchQueues[type] = {query: [], modules: []};
					
					let languageChangeTimeout;
					hiddenchannelslib.PatchUtils.patch(hiddenchannelslib, Internal.LibraryModules.AppearanceSettingsUtils, "updateLocale", {after: e => {
						hiddenchannelslib.TimeUtils.clear(languageChangeTimeout);
						languageChangeTimeout = hiddenchannelslib.TimeUtils.timeout(_ => {
							for (let pluginName in PluginStores.loaded) if (PluginStores.loaded[pluginName].started) hiddenchannelslib.PluginUtils.translate(PluginStores.loaded[pluginName]);
						}, 10000);
					}});
					
					Internal.onSettingsClosed = function () {
						if (Internal.SettingsUpdated) {
							delete Internal.SettingsUpdated;
							Internal.forceUpdateAll();
						}
					};
					
					Internal.forceUpdateAll = function () {					
						hiddenchannelslib.MessageUtils.rerenderAll();
						hiddenchannelslib.PatchUtils.forceAllUpdates(hiddenchannelslib);
					};
					
					if (Internal.LibraryComponents.GuildComponents.BlobMask) {
						let newBadges = ["lowerLeftBadge", "upperLeftBadge"];
						hiddenchannelslib.PatchUtils.patch(hiddenchannelslib, Internal.LibraryComponents.GuildComponents.BlobMask.prototype, "render", {
							before: e => {
								e.thisObject.props = Object.assign({}, Internal.LibraryComponents.GuildComponents.BlobMask.defaultProps, e.thisObject.props);
								for (let type of newBadges) if (!e.thisObject.state[`${type}Mask`]) e.thisObject.state[`${type}Mask`] = new Internal.LibraryComponents.Animations.Controller({spring: 0});
							},
							after: e => {
								let [children, index] = hiddenchannelslib.ReactUtils.findParent(e.returnValue, {name: "TransitionGroup"});
								if (index > -1) {
									children[index].props.children.push(!e.thisObject.props.lowerLeftBadge ? null : hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.BadgeAnimationContainer, {
										className: hiddenchannelslib.disCN.guildlowerleftbadge,
										key: "lower-left-badge",
										animatedStyle: e.thisObject.getLowerLeftBadgeStyles(),
										children: e.thisObject.props.lowerLeftBadge
									}));
									children[index].props.children.push(!e.thisObject.props.upperLeftBadge ? null : hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.BadgeAnimationContainer, {
										className: hiddenchannelslib.disCN.guildupperleftbadge,
										key: "upper-left-badge",
										animatedStyle: e.thisObject.getUpperLeftBadgeStyles(),
										children: e.thisObject.props.upperLeftBadge
									}));
								}
								[children, index] = hiddenchannelslib.ReactUtils.findParent(e.returnValue, {name: "mask"});
								if (index > -1) {
									children[index].props.children.push(hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Animations.animated.rect, {
										x: -4,
										y: -4,
										width: e.thisObject.props.upperLeftBadgeWidth + 8,
										height: 24,
										rx: 12,
										ry: 12,
										transform: e.thisObject.getLeftBadgePositionInterpolation(e.thisObject.state.upperLeftBadgeMask, -1),
										fill: "black"
									}));
									children[index].props.children.push(hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Animations.animated.rect, {
										x: -4,
										y: 28,
										width: e.thisObject.props.lowerLeftBadgeWidth + 8,
										height: 24,
										rx: 12,
										ry: 12,
										transform: e.thisObject.getLeftBadgePositionInterpolation(e.thisObject.state.lowerLeftBadgeMask),
										fill: "black"
									}));
								}
							}
						});
						hiddenchannelslib.PatchUtils.patch(hiddenchannelslib, Internal.LibraryComponents.GuildComponents.BlobMask.prototype, "componentDidMount", {
							after: e => {
								for (let type of newBadges) e.thisObject.state[`${type}Mask`].update({
									spring: e.thisObject.props[type] != null ? 1 : 0,
									immediate: true
								}).start();
							}
						});
						hiddenchannelslib.PatchUtils.patch(hiddenchannelslib, Internal.LibraryComponents.GuildComponents.BlobMask.prototype, "componentWillUnmount", {
							after: e => {
								for (let type of newBadges) if (e.thisObject.state[`${type}Mask`]) e.thisObject.state[`${type}Mask`].dispose();
							}
						});
						hiddenchannelslib.PatchUtils.patch(hiddenchannelslib, Internal.LibraryComponents.GuildComponents.BlobMask.prototype, "componentDidUpdate", {
							after: e => {
								for (let type of newBadges) if (e.thisObject.props[type] != null && e.methodArguments[0][type] == null) {
									e.thisObject.state[`${type}Mask`].update({
										spring: 1,
										immediate: !document.hasFocus(),
										config: {friction: 30, tension: 900, mass: 1}
									}).start();
								}
								else if (e.thisObject.props[type] == null && e.methodArguments[0][type] != null) {
									e.thisObject.state[`${type}Mask`].update({
										spring: 0,
										immediate: !document.hasFocus(),
										config: {duration: 150, friction: 10, tension: 100, mass: 1}
									}).start();
								}
							}
						});
						Internal.LibraryComponents.GuildComponents.BlobMask.prototype.getLeftBadgePositionInterpolation = function (e, t) {
							return void 0 === t && (t = 1), e.springs.spring.to([0, 1], [20, 0]).to(function (e) {
								return "translate(" + e * -1 + " " + e * t + ")";
							});
						};
						Internal.LibraryComponents.GuildComponents.BlobMask.prototype.getLowerLeftBadgeStyles = function () {
							var e = this.state.lowerLeftBadgeMask.springs.spring;
							return {
								opacity: e.to([0, .5, 1], [0, 0, 1]),
								transform: e.to(function (e) {
									return "translate(" + -1 * (16 - 16 * e) + "px, " + (16 - 16 * e) + "px)";
								})
							};
						};
						Internal.LibraryComponents.GuildComponents.BlobMask.prototype.getUpperLeftBadgeStyles = function () {
							var e = this.state.upperLeftBadgeMask.springs.spring;
							return {
								opacity: e.to([0, .5, 1], [0, 0, 1]),
								transform: e.to(function (e) {
									return "translate(" + -1 * (16 - 16 * e) + "px, " + -1 * (16 - 16 * e) + "px)";
								})
							};
						};
						let extraDefaultProps = {};
						for (let type of newBadges) extraDefaultProps[`${type}Width`] = 16;
						Internal.setDefaultProps(Internal.LibraryComponents.GuildComponents.BlobMask, extraDefaultProps);
					}
					
					hiddenchannelslib.PatchUtils.patch(hiddenchannelslib, Internal.LibraryModules.EmojiStateUtils, "getEmojiUnavailableReason", {after: e => {
						if (Internal.LibraryComponents.EmojiPickerButton.current && Internal.LibraryComponents.EmojiPickerButton.current.props && Internal.LibraryComponents.EmojiPickerButton.current.props.allowManagedEmojisUsage) return null;
					}});
					
					Internal.forceUpdateAll();
				
					const pluginQueue = window.hiddenchannelslib_Global && hiddenchannelslib.ArrayUtils.is(window.hiddenchannelslib_Global.pluginQueue) ? window.hiddenchannelslib_Global.pluginQueue : [];

					if (hiddenchannelslib.UserUtils.me.id == InternalData.myId || hiddenchannelslib.UserUtils.me.id == "350635509275557888") {
						hiddenchannelslib.DevUtils = {};
						hiddenchannelslib.DevUtils.generateClassId = Internal.generateClassId;
						hiddenchannelslib.DevUtils.findByIndex = function (index) {
							return hiddenchannelslib.DevUtils.req.c[index];
						};
						hiddenchannelslib.DevUtils.findPropAny = function (...strings) {
							window.t = {"$filter":(prop => [...strings].flat(10).filter(n => typeof n == "string").every(string => prop.toLowerCase().indexOf(string.toLowerCase()) > -1))};
							for (let i in hiddenchannelslib.DevUtils.req.c) if (hiddenchannelslib.DevUtils.req.c.hasOwnProperty(i)) {
								let m = hiddenchannelslib.DevUtils.req.c[i].exports;
								if (m && typeof m == "object") for (let j in m) if (window.t.$filter(j)) window.t[j + "_" + i] = m;
								if (m && typeof m == "object" && typeof m.default == "object") for (let j in m.default) if (window.t.$filter(j)) window.t[j + "_default_" + i] = m.default;
							}
							console.clear();
							console.log(window.t);
						};
						hiddenchannelslib.DevUtils.findPropFunc = function (...strings) {
							window.t = {"$filter":(prop => [...strings].flat(10).filter(n => typeof n == "string").every(string => prop.toLowerCase().indexOf(string.toLowerCase()) > -1))};
							for (let i in hiddenchannelslib.DevUtils.req.c) if (hiddenchannelslib.DevUtils.req.c.hasOwnProperty(i)) {
								let m = hiddenchannelslib.DevUtils.req.c[i].exports;
								if (m && typeof m == "object") for (let j in m) if (window.t.$filter(j) && typeof m[j] != "string") window.t[j + "_" + i] = m;
								if (m && typeof m == "object" && typeof m.default == "object") for (let j in m.default) if (window.t.$filter(j) && typeof m.default[j] != "string") window.t[j + "_default_" + i] = m.default;
							}
							console.clear();
							console.log(window.t);
						};
						hiddenchannelslib.DevUtils.findPropStringLib = function (...strings) {
							window.t = {"$filter":(prop => [...strings].flat(10).filter(n => typeof n == "string").every(string => prop.toLowerCase().indexOf(string.toLowerCase()) > -1))};
							for (let i in hiddenchannelslib.DevUtils.req.c) if (hiddenchannelslib.DevUtils.req.c.hasOwnProperty(i)) {
								let m = hiddenchannelslib.DevUtils.req.c[i].exports;
								if (m && typeof m == "object") for (let j in m) if (window.t.$filter(j) && typeof m[j] == "string" && /^[A-z0-9]+\-[A-z0-9_-]{6}$/.test(m[j])) window.t[j + "_" + i] = m;
								if (m && typeof m == "object" && typeof m.default == "object") for (let j in m.default) if (window.t.$filter(j) && typeof m.default[j] == "string" && /^[A-z0-9]+\-[A-z0-9_-]{6}$/.test(m.default[j])) window.t[j + "_default_" + i] = m.default;
							}
							console.clear();
							console.log(window.t);
						};
						hiddenchannelslib.DevUtils.findNameAny = function (...strings) {
							window.t = {"$filter":(m => [...strings].flat(10).filter(n => typeof n == "string").some(string => typeof m.displayName == "string" && m.displayName.toLowerCase().indexOf(string.toLowerCase()) > -1 || m.name == "string" && m.name.toLowerCase().indexOf(string.toLowerCase()) > -1))};
							for (let i in hiddenchannelslib.DevUtils.req.c) if (hiddenchannelslib.DevUtils.req.c.hasOwnProperty(i)) {
								let m = hiddenchannelslib.DevUtils.req.c[i].exports;
								if (m && (typeof m == "object" || typeof m == "function") && window.t.$filter(m)) window.t[(m.displayName || m.name) + "_" + i] = m;
								if (m && (typeof m == "object" || typeof m == "function") && m.default && (typeof m.default == "object" || typeof m.default == "function") && window.t.$filter(m.default)) window.t[(m.default.displayName || m.default.name) + "_" + i] = m.default;
							}
							console.clear();
							console.log(window.t);
						};
						hiddenchannelslib.DevUtils.findCodeAny = function (...strings) {
							window.t = {"$filter":(m => Internal.hasModuleStrings(m, strings, true))};
							for (let i in hiddenchannelslib.DevUtils.req.c) if (hiddenchannelslib.DevUtils.req.c.hasOwnProperty(i)) {
								let m = hiddenchannelslib.DevUtils.req.c[i].exports;
								if (m && typeof m == "function" && window.t.$filter(m)) window.t["module_" + i] = {string: m.toString(), func: m};
								if (m && m.__esModule) {
									for (let j in m) if (m[j] && typeof m[j] == "function" && window.t.$filter(m[j])) window.t[j + "_module_" + i] = {string: m[j].toString(), func: m[j], module: m};
									if (m.default && (typeof m.default == "object" || typeof m.default == "function")) for (let j in m.default) if (m.default[j] && typeof m.default[j] == "function" && window.t.$filter(m.default[j])) window.t[j + "_module_" + i + "_default"] = {string: m.default[j].toString(), func: m.default[j], module: m};
								}
							}
							for (let i in hiddenchannelslib.DevUtils.req.m) if (typeof hiddenchannelslib.DevUtils.req.m[i] == "function" && window.t.$filter(hiddenchannelslib.DevUtils.req.m[i])) window.t["function_" + i] = {string: hiddenchannelslib.DevUtils.req.m[i].toString(), func: hiddenchannelslib.DevUtils.req.m[i]};
							console.clear();
							console.log(window.t);
						};
						hiddenchannelslib.DevUtils.getAllModules = function () {
							window.t = {};
							for (let i in hiddenchannelslib.DevUtils.req.c) if (hiddenchannelslib.DevUtils.req.c.hasOwnProperty(i)) {
								let m = hiddenchannelslib.DevUtils.req.c[i].exports;
								if (m && typeof m == "object") window.t[i] = m;
							}
							console.clear();
							console.log(window.t);
						};
						hiddenchannelslib.DevUtils.getAllStringLibs = function () {
							window.t = [];
							for (let i in hiddenchannelslib.DevUtils.req.c) if (hiddenchannelslib.DevUtils.req.c.hasOwnProperty(i)) {
								let m = hiddenchannelslib.DevUtils.req.c[i].exports;
								if (m && typeof m == "object" && !hiddenchannelslib.ArrayUtils.is(m) && Object.keys(m).length) {
									var string = true, stringlib = false;
									for (let j in m) {
										if (typeof m[j] != "string") string = false;
										if (typeof m[j] == "string" && /^[A-z0-9]+\-[A-z0-9_-]{6}$/.test(m[j])) stringlib = true;
									}
									if (string && stringlib) window.t.push(m);
								}
								if (m && typeof m == "object" && m.default && typeof m.default == "object" && !hiddenchannelslib.ArrayUtils.is(m.default) && Object.keys(m.default).length) {
									var string = true, stringlib = false;
									for (let j in m.default) {
										if (typeof m.default[j] != "string") string = false;
										if (typeof m.default[j] == "string" && /^[A-z0-9]+\-[A-z0-9_-]{6}$/.test(m.default[j])) stringlib = true;
									}
									if (string && stringlib) window.t.push(m.default);
								}
							}
							console.clear();
							console.log(window.t);
						};
						hiddenchannelslib.DevUtils.listen = function (strings) {
							strings = hiddenchannelslib.ArrayUtils.is(strings) ? strings : Array.from(arguments);
							hiddenchannelslib.DevUtils.listenStop();
							hiddenchannelslib.DevUtils.listen.p = hiddenchannelslib.PatchUtils.patch("WebpackSearch", hiddenchannelslib.ModuleUtils.findByProperties(strings), strings[0], {after: e => {
								console.log(e);
							}});
						};
						hiddenchannelslib.DevUtils.listenStop = function () {
							if (typeof hiddenchannelslib.DevUtils.listen.p == "function") hiddenchannelslib.DevUtils.listen.p();
						};
						hiddenchannelslib.DevUtils.generateLanguageStrings = function (strings, config = {}) {
							const language = config.language || "en";
							const languages = hiddenchannelslib.ArrayUtils.removeCopies(hiddenchannelslib.ArrayUtils.is(config.languages) ? config.languages : ["en"].concat((Internal.LibraryModules.LanguageStore.languages || Internal.LibraryModules.LanguageStore._languages).filter(n => n.enabled).map(n => {
								if (hiddenchannelslib.LanguageUtils.languages[n.code]) return n.code;
								else {
									const code = n.code.split("-")[0];
									if (hiddenchannelslib.LanguageUtils.languages[code]) return code;
								}
							})).filter(n => n && !n.startsWith("en-") && !n.startsWith("$") && n != language)).sort();
							let translations = {};
							strings = hiddenchannelslib.ObjectUtils.sort(strings);
							const stringKeys = Object.keys(strings);
							translations[language] = hiddenchannelslib.ObjectUtils.toArray(strings);
							let text = Object.keys(translations[language]).map(k => translations[language][k]).join("\n\n");
							
							let fails = 0, next = lang => {
								if (!lang) {
									let formatTranslation = (l, s, i) => {
										l = l == "en" ? "default" : l;
										return config.cached && config.cached[l] && config.cached[l][stringKeys[i]] || (translations[language][i][0] == translations[language][i][0].toUpperCase() ? Internal.LibraryModules.StringUtils.upperCaseFirstChar(s) : s);
									};
									let format = config.asObject ? ((l, isNotFirst) => {
										return `${isNotFirst ? "," : ""}\n\t\t"${l == "en" ? "default" : l}": {${translations[l].map((s, i) => `\n\t\t\t"${stringKeys[i]}": "${formatTranslation(l, s, i)}"`).join(",")}\n\t\t}`;
									}) : ((l, isNotFirst) => {
										return `\n\t\t\t\t\t${l == "en" ? "default" : `case "${l}"`}:${l.length > 2 ? "\t" : "\t\t"}// ${hiddenchannelslib.LanguageUtils.languages[l].name}\n\t\t\t\t\t\treturn {${translations[l].map((s, i) => `\n\t\t\t\t\t\t\t${stringKeys[i]}:${"\t".repeat(10 - ((stringKeys[i].length + 2) / 4))}"${formatTranslation(l, s, i)}"`).join(",")}\n\t\t\t\t\t\t};`;
									});
									let result = Object.keys(translations).filter(n => n != "en").sort().map((l, i) => format(l, i)).join("");
									if (translations.en) result += format("en", result ? 1 : 0);
									hiddenchannelslib.NotificationUtils.toast("Translation copied to clipboard", {
										type: "success"
									});
									Internal.LibraryRequires.electron.clipboard.write({text: result});
								}
								else {
									const callback = translation => {
										hiddenchannelslib.LogUtils.log(lang);
										if (!translation) {
											console.warn("No Translation");
											fails++;
											if (fails > 10) console.error("Skipped Language");
											else languages.unshift(lang);
										}
										else {
											fails = 0;
											translations[lang] = translation.split("\n\n");
										}
										next(languages.shift());
									};
									Internal.LibraryRequires.request(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${language}&tl=${lang}&dt=t&dj=1&source=input&q=${encodeURIComponent(text)}`, (error, response, result) => {
										if (!error && result && response.statusCode == 200) {
											try {callback(JSON.parse(result).sentences.map(n => n && n.trans).filter(n => n).join(""));}
											catch (err) {callback("");}
										}
										else {
											if (response.statusCode == 429) {
												hiddenchannelslib.NotificationUtils.toast("Too many Requests", {
													type: "danger"
												});
											}
											else {
												hiddenchannelslib.NotificationUtils.toast("Failed to translate Text", {
													type: "danger"
												});
												callback("");
											}
										}
									});
								}
							};
							if (stringKeys.length) next(languages.shift());
						};
						hiddenchannelslib.DevUtils.req = Internal.getWebModuleReq();
						
						window.hiddenchannelslib = hiddenchannelslib;
					}
					
					window.hiddenchannelslib = hiddenchannelslib;
					
					if (libraryCSS) hiddenchannelslib.DOMUtils.appendLocalStyle("hiddenchannelslib", libraryCSS.replace(/[\n\t\r]/g, "").replace(/\[REPLACE_CLASS_([A-z0-9_]+?)\]/g, (a, b) => hiddenchannelslib.dotCN[b]));
				
					hiddenchannelslib.LogUtils.log("Finished loading Library");
					
					window.hiddenchannelslib_Global = Object.assign({
						started: true,
						loaded: true,
						PluginUtils: {
							buildPlugin: hiddenchannelslib.PluginUtils.buildPlugin,
							cleanUp: hiddenchannelslib.PluginUtils.cleanUp
						}
					});
					
					while (PluginStores.delayed.loads.length) PluginStores.delayed.loads.shift().load();
					while (PluginStores.delayed.starts.length) PluginStores.delayed.starts.shift().start();
					while (pluginQueue.length) {
						let pluginName = pluginQueue.shift();
						if (pluginName) hiddenchannelslib.TimeUtils.timeout(_ => hiddenchannelslib.BDUtils.reloadPlugin(pluginName));
					}
				};
				
				const alreadyLoadedComponents = [];
				if (InternalData.ForceLoadedComponents) {
					let promises = [];
					for (let name in InternalData.ForceLoadedComponents) {
						let parentModule;
						if (InternalData.ForceLoadedComponents[name].name) {
							if (InternalData.ForceLoadedComponents[name].protos) parentModule = hiddenchannelslib.ModuleUtils.find(m => m && m.displayName == InternalData.ForceLoadedComponents[name].name && m.prototype && InternalData.ForceLoadedComponents[name].protos.every(proto => m.prototype[proto]) && m, {useExport: false});
							else parentModule = hiddenchannelslib.ModuleUtils.findByName(InternalData.ForceLoadedComponents[name].name, false, true);
						}
						else if (InternalData.ForceLoadedComponents[name].props) parentModule = hiddenchannelslib.ModuleUtils.findByProperties(InternalData.ForceLoadedComponents[name].props, false, true);
						if (parentModule && parentModule.exports && alreadyLoadedComponents.indexOf(parentModule.id) > -1) {
							alreadyLoadedComponents.push(parentModule.id);
							promises.push(Internal.lazyLoadModuleImports(parentModule.exports));
						}
					}
					Promise.all(promises).then(loadComponents);
				}
				else loadComponents();
			};
			requestLibraryHashes(true);
			
			this.loaded = true;
			if (!hiddenchannelslib.BDUtils.isPluginEnabled(this.name)) hiddenchannelslib.BDUtils.enablePlugin(this.name);
		}
		start () {
			if (!this.loaded) this.load();
		}
		stop () {
			if (!hiddenchannelslib.BDUtils.isPluginEnabled(this.name)) hiddenchannelslib.BDUtils.enablePlugin(this.name);
		}
		
		getSettingsPanel (collapseStates = {}) {
			let settingsPanel;
			let getString = (type, key, property) => {
				return hiddenchannelslib.LanguageUtils.LibraryStringsCheck[`settings_${key}_${property}`] ? hiddenchannelslib.LanguageUtils.LibraryStringsFormat(`settings_${key}_${property}`, hiddenchannelslib.BDUtils.getSettingsProperty("name", hiddenchannelslib.BDUtils.settingsIds[key]) || Internal.LibraryModules.StringUtils.upperCaseFirstChar(key.replace(/([A-Z])/g, " $1"))) : Internal.defaults[type][key][property];
			};
			return settingsPanel = hiddenchannelslib.PluginUtils.createSettingsPanel(hiddenchannelslib, {
				collapseStates: collapseStates,
				children: _ => {
					let settingsItems = [];
					
					for (let key in Internal.settings.choices) settingsItems.push(hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SettingsSaveItem, {
						type: "Select",
						plugin: Internal,
						keys: ["choices", key],
						label: getString("choices", key, "description"),
						note: getString("choices", key, "note"),
						basis: "50%",
						value: Internal.settings.choices[key],
						options: Object.keys(LibraryConstants[Internal.defaults.choices[key].items] || {}).map(p => ({
							value: p,
							label: hiddenchannelslib.LanguageUtils.LibraryStrings[p] || p
						})),
						searchable: true
					}));
					for (let key in Internal.settings.general) {
						let nativeSetting = hiddenchannelslib.BDUtils.settingsIds[key] && hiddenchannelslib.BDUtils.getSettings(hiddenchannelslib.BDUtils.settingsIds[key]);
						let disabled = typeof Internal.defaults.general[key].isDisabled == "function" && Internal.defaults.general[key].isDisabled({
							value: Internal.settings.general[key],
							nativeValue: nativeSetting
						});
						let hidden = typeof Internal.defaults.general[key].isHidden == "function" && Internal.defaults.general[key].isHidden({
							value: Internal.settings.general[key],
							nativeValue: nativeSetting
						});
						if (!hidden) settingsItems.push(hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SettingsSaveItem, {
							type: "Switch",
							plugin: Internal,
							disabled: disabled,
							keys: ["general", key],
							label: getString("general", key, "description"),
							note: (typeof Internal.defaults.general[key].hasNote == "function" ? Internal.defaults.general[key].hasNote({
								value: Internal.settings.general[key],
								nativeValue: nativeSetting,
								disabled: disabled
							}) : Internal.defaults.general[key].hasNote) && getString("general", key, "note"),
							value: (typeof Internal.defaults.general[key].getValue == "function" ? Internal.defaults.general[key].getValue({
								value: Internal.settings.general[key],
								nativeValue: nativeSetting,
								disabled: disabled
							}) : true) && (Internal.settings.general[key] || nativeSetting),
							onChange: typeof Internal.defaults.general[key].onChange == "function" ? Internal.defaults.general[key].onChange : (_ => {})
						}));
					}
					settingsItems.push(hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SettingsItem, {
						type: "Button",
						label: hiddenchannelslib.LanguageUtils.LibraryStrings.update_check_info,
						dividerTop: true,
						basis: "20%",
						children: hiddenchannelslib.LanguageUtils.LibraryStrings.check_for_updates,
						labelChildren: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.Clickable, {
							children: hiddenchannelslib.ReactUtils.createElement(Internal.LibraryComponents.SvgIcon, {
								name: Internal.LibraryComponents.SvgIcon.Names.QUESTIONMARK,
								width: 20,
								height: 20,
								onClick: _ => hiddenchannelslib.ModalUtils.open(Internal, {
									header: "Plugins",
									subHeader: "",
									contentClassName: hiddenchannelslib.disCN.marginbottom20,
									text: hiddenchannelslib.ObjectUtils.toArray(Object.assign({}, window.PluginUpdates && window.PluginUpdates.plugins, PluginStores.updateData.plugins)).map(p => p.name).filter(n => n).sort().join(", ")
								})
							})
						}),
						onClick: _ => {
							let toast = hiddenchannelslib.NotificationUtils.toast(`${hiddenchannelslib.LanguageUtils.LanguageStrings.CHECKING_FOR_UPDATES} - ${hiddenchannelslib.LanguageUtils.LibraryStrings.please_wait}`, {
								type: "info",
								timeout: 0,
								ellipsis: true
							});
							hiddenchannelslib.PluginUtils.checkAllUpdates().then(outdated => {
								toast.close();
								if (outdated > 0) hiddenchannelslib.NotificationUtils.toast(hiddenchannelslib.LanguageUtils.LibraryStringsFormat("update_check_complete_outdated", outdated), {
									type: "danger"
								});
								else hiddenchannelslib.NotificationUtils.toast(hiddenchannelslib.LanguageUtils.LibraryStrings.update_check_complete, {
									type: "success"
								});
							});
						}
					}));
					
					return settingsItems;
				}
			});
		}
	}
})();