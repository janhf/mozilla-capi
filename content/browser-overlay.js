
//Define our namespace
if(!de) var de={};
if(!de.bklosr) de.bklosr={};
if(!de.bklosr.mozillaCapi) de.bklosr.mozillaCapi={};

window.addEventListener ("load", function() {de.bklosr.mozillaCapi.main.init(); }, false);
window.addEventListener ("unload", function() {de.bklosr.mozillaCapi.main.uninit(); }, false);

de.bklosr.mozillaCapi.main = {
mozillaCapiID: "mozilla-capi@bklosr.de",
console: null,
consoleOutputFlag: false,
debugPrefix: "mozilla-capi: ",
prefs: null,
prefBranch: "extensions.mozilla-capi.",
removeCKBI: false,
removeAllOtherCAs: false,

//Initializes the addon
init: function() {
    //initilize our preferences
    this.prefs = Components.classes["@mozilla.org/preferences-service;1"]
                 .getService(Components.interfaces.nsIPrefService)
                 .getBranch(this.prefBranch);
    this.prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
    this.prefs.addObserver("", this, false);
    
    // Read initial preferences
    this.getDebugOutputFlag(); // Enable debugging information on stdout if desired
    this.getConsoleOutput(); // Enable debugging information on Browser Console if desired
    
    this.removeCKBI = this.prefs.getBoolPref("removeCKBI");
    this.removeAllOtherCAs = this.prefs.getBoolPref("removeAllOtherCAs");
    
    this.alterNSS();
},

//Deinitializes the addon
uninit: function() {

},

getDebugOutputFlag: function() {
    this.debugOutput = this.prefs.getBoolPref("debugoutput");
    this.logMsg("Setting debugoutput to " + this.debugOutput);
},
  
getConsoleOutput: function() {
    this.consoleOutputFlag = this.prefs.getBoolPref("consoleoutput");
    this.logMsg("Setting consoleOutputFlag to " + this.consoleOutputFlag);
    if(this.consoleOutputFlag){
        this.consoleOutput = (Cu.import("resource://gre/modules/devtools/Console.jsm", {})).console;
    }
},

/*
 * If debugout is enabled, log the message to console
 * set extensions.extval.debugoutput to true in about:config
 * and set this in .mozilla/firefox/<profile>/user.js
 * user_pref("browser.dom.window.dump.enabled", true);
 * According to: https://developer.mozilla.org/en-US/docs/DOM/window.dump?redirectlocale=en-US&redirectslug=window.dump
 */
logMsg: function(msg) {
  	if(this.debugOutput) {
  		dump(this.debugPrefix + msg + "\n");
  	}
  	if(this.consoleOutputFlag && this.consoleOutput != null) {
        this.consoleOutput.log(this.debugPrefix + msg + "\n");
  	}
},

findResource: function(dllURI) {
    var addonObj = null;
    AddonManager.getAddonByID("mozilla-capi@bklosr.de",function(addon) {
        addonObj = addon;
    });
    var thread = Cc["@mozilla.org/thread-manager;1"].getService().currentThread;
    while (addonObj == null)
        thread.processNextEvent(true);
        
    if(addonObj.getResourceURI) {
        return addonObj.getResourceURI(dllURI);
    }
    else {
        return null;
    }
},

//Finds a specifc library in the NSS configuration
searchLibByLibraryName: function (name) {
	var moduleDB = Components.classes["@mozilla.org/security/pkcs11moduledb;1"].getService(Components.interfaces.nsIPKCS11ModuleDB);
	var modules = moduleDB.listModules();  
    var done = false;
    var libRemove = null;
  
    try {
        modules.isDone();
    } catch (e) { done = true; }
    while (!done) {
        var module = modules.currentItem().QueryInterface(Components.interfaces.nsIPKCS11Module);
        if (module && module.libName != null && module.libName.contains(name)) {
            libRemove = module.name;
            done = true;
        }
        try {
            modules.next();
        } catch (e) { done = true; }
    }
    return libRemove;
},

findCorrectSharedLibrary: function () {
    var os = Components.classes["@mozilla.org/xre/app-info;1"]
                        .getService(Components.interfaces.nsIXULRuntime)
                        .OS;
    //navigator.platform
	if(os.match("WINNT")) {
		return this.findResource("components/p11capi_w32.dll").path.substring(1);
	}
	else {
        throw "No Library available";
	}
},

//Adds or removes PKCS11 Modules to NSS
alterNSS: function () {
	var P11 = Components.classes["@mozilla.org/security/pkcs11;1"].getService(Components.interfaces.nsIPKCS11);

    //Add p11 capi
    try {
        //Construct path to the included PKCS11 Library.
        var sharedLibraryPath = this.findCorrectSharedLibrary();
        
        if(this.searchLibByLibraryName("p11capi") == null && sharedLibraryPath != null){
            this.logMsg("Adding CAPI Module: "+sharedLibraryPath);
            P11.addModule("Microsoft CAPI", [sharedLibraryPath], 0x1 << 28, 0);
        }
        else if(sharedLibraryPath == null){
            this.logMsg("P11 Capi DLL not available for this architecture.");
            return;
        }
    }
    catch(e) {
        this.logMsg("Failed to add P11 CAPI Module. "+e);
        return;
    }
    
    //Remove CKBI
    try {
        if(this.removeCKBI) {
            var removeLib = this.searchLibByLibraryName("nssckbi");
            if(removeLib != null){
                this.logMsg("Removing CKBI: "+removeLib);
                P11.deleteModule(removeLib);
            }
        }
    }
    catch(e) {
        this.logMsg("Failed to remove CKBI: "+e);
    }
    
    //Remove all other certificates
    try {
        if(this.removeAllOtherCAs) {
			var tokenNames = ["das Software-Sicherheitsmodul"];
            var certDB = Cc["@mozilla.org/security/x509certdb;1"]
                                        .getService(Components.interfaces.nsIX509CertDB);
            var enumerator = certDB.getCerts().getEnumerator();
            while (enumerator.hasMoreElements()) {
                var cert = enumerator.getNext().QueryInterface(Components.interfaces.nsIX509Cert);

                if (cert.certType & Components.interfaces.nsIX509Cert.CA_CERT != 0) {  
                    if(tokenNames.indexOf(cert.tokenName) != -1) {
                        this.logMsg("Found a CA: "+cert.nickname+", in "+cert.tokenName);
                        certDB.deleteCertificate(cert);
					}
                }
            }
        }
    }
    catch(e) {
        this.logMsg("Removing All Other CAs failed: "+e);
    }
}

}


