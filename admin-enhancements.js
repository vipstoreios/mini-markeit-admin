/* Mini markeit Admin - non-breaking enhancements */
(function(){
  document.addEventListener("DOMContentLoaded",function(){
    if(!document.getElementById("adminSettingsFixScript")){
      var s=document.createElement("script");
      s.id="adminSettingsFixScript";
      s.src="admin-settings-fix.js?v=4";
      document.body.appendChild(s);
    }
  });
})();