# PhD 2048
A fork of [2048](https://github.com/gabrielecirulli/2048) for PhD students. (Yes, you can create a professor's 2048 in which two students become a garbage tile.)

Made just for procrastination. [Play it here!](https://ymfa.github.io/phd-2048/)

### Forking
Feel free to fork and create your own version of 2048. A few suggestions on what to fiddle with:

- Change tile names in `html_actuator.js`;
- Change game description in `index.html`;
- Change the detection of user's preferred language in `application.js` (if not required, remove the detection code and `i18n.js`);
- Update `i18n.js` with your changes (`i18n.js` is a later addition that implements a language switch - the game should be able to run without it);
- Change screenshots and icons in `meta/`;
- Change the `appID` and choose when to prompt a mobile user to add this web app to their home screen, near `addToHomescreen` in `index.html`.

As with [the original 2048](https://github.com/gabrielecirulli/2048/blob/master/CONTRIBUTING.md), the `master` branch contains the complete game except for sharing features, analytics, etc., which are not transferrable to a fork.
Therefore you should use the `master` branch rather than `gh-pages`, and add your own sharing and tracking code as appropriate.

### Known issues
- I have to make changes directly to `main.css` instead of `main.scss`, because compiling the original `main.scss` does not reproduce the original `main.css`.

### License
PhD 2048 is licensed under the [GNU General Public License](https://github.com/ymfa/phd-2048/blob/master/LICENSE.txt).
