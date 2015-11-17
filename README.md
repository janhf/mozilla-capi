# Mozilla PKCS#11 to MS-CAPI Addon
This addon adds the PKCS#11 Module from http://risacher.org/p11-capi/ to the NSS framework of mozilla firefox and thunderbird. It enables trust to all CA's inside the Microsoft Certificate Store and allows Mozilla Apps to use personal certificates from the Microsoft Store.

You should know what you are doing when you add this module. Trusting or removing Certificates from the trust store may have unpredictable results.

This addon is meant to be used by system administrators to ease the certificate distribution. It allows them to use the distribution systems which come with Active Directory.

Unfortunately the extended validation thing is not working with this addon.

There are a few hidden options for this module, which can be altered by rebuilding this extension or through preloading the preferences store:


extensions.mozilla-capi.removeAllOtherCAs (default: false)
boolean value which makes the module remove _all_ certificates from the internal mozilla store. If you enable this you cannot uninstall this addon. Uninstalling this addon will destroy your whole security system. You have been warned.

extensions.mozilla-capi.removeCKBI (default: true)
Removes the CKBI trust store, which contains all Mozilla CA's.
