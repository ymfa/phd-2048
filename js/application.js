// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  window.game = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);
  var lang_pref = window.game.storageManager.storage.getItem('lang');
  if(lang_pref == 'en') play_in_english();
  else if(lang_pref == 'zh') play_in_chinese();
  else {
    var nav_langs = navigator.languages;
    var require_english = true;
    if(nav_langs){
      for(var i=0; i<nav_langs.length; i++)
        if(nav_langs[i].startsWith('zh')) require_english = false;
    }
    else{
      var nav_lang = navigator.language || navigator.userLanguage;
      require_english = (nav_lang && !nav_lang.startsWith('zh'));
    }
    if(require_english) play_in_english();
    else play_in_chinese();
  }
});
