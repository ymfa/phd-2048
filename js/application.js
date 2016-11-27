// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  window.game = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);
  create_switch_en();
  var lang_pref = window.game.storageManager.storage.getItem('lang');
  if(lang_pref == 'en') play_in_english();
  else if(lang_pref != 'zh') {
    var nav_langs = navigator.languages;
    if(nav_langs){
      var require_english = true;
      for(var i=0; i<nav_langs.length; i++)
        if(nav_langs[i].startsWith('zh')) require_english = false;
      if(require_english) play_in_english();
    }
    else{
      var nav_lang = navigator.language || navigator.userLanguage;
      if(nav_lang && !nav_lang.startsWith('zh')) play_in_english();
    }
  }
  if(window.game.storageManager.storage.getItem('lang') != 'en'){
    if(determine_zh_var() == 'hant') use_traditional();
  }
});
