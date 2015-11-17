
var pkcsLoader = {
test: "blub",
dllPath: null,

//FIXME: Does not work on first load...
findDLL: function(dllURI) {
  AddonManager.getAddonByID("mozilla-capi@bklosr.de", function(addon) {
    if (addon && addon.getResourceURI) {
      pkcsLoader.dllPath = addon.getResourceURI(dllURI);
    }
    else {
      pkcsLoader.dllPath = null;
    }
  });
},
searchLib: function (name) {
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
windowLoad: function (e) {
	var os = Components.classes["@mozilla.org/xre/app-info;1"]
                        .getService(Components.interfaces.nsIXULRuntime)
                        .OS;
  //navigator.platform
	if(os.match("WINNT")) {
	  pkcsLoader.findDLL("components/p11capi_w32.dll");
		var modName = pkcsLoader.dllPath.path.substring(1);
	}
	
	var P11 = Components.classes["@mozilla.org/security/pkcs11;1"].getService(Components.interfaces.nsIPKCS11);
  

	if(modName != null || modName != ""){
	  try {
	    if(pkcsLoader.searchLib("p11capi") == null){
        console.log("Trying to load: "+modName);
        P11.addModule("Microsoft CAPI", [modName], 0x1 << 28, 0);
      }
      
      var removeLib = pkcsLoader.searchLib("nssckbi");
      if(removeLib != null){
        P11.deleteModule(removeLib);
      }
    }
    catch(e) {
      console.log("Failed: "+e);
    }
  }
}
}
window.addEventListener ("load", pkcsLoader.windowLoad, false);


