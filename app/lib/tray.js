const { app, Menu, Tray } = require('electron');
const { EventEmitter } = require('events');
const debug = require('debug')('airplane:tray');
const path = require('path');

class AppTray extends EventEmitter {

  /**
   * Creates a new AppTray instance.
   *
   * @constructor
   */
  constructor(parent) {
    super();

    /**
     * A reference to the App instance.
     *
     * @type {App}
     * @private
     */
    this._app = parent;

    /**
     * A reference to the app's Tray instance.
     *
     * @type {Tray}
     * @private
     */
    this._tray = null;

    this._buildTray();
  }

  /**
   * Builds the app's Tray's menu.
   *
   * @returns {Menu}
   * @private
   */
  _buildMenu() {
    debug('building menu...');

    return Menu.buildFromTemplate([
      {
        label: this._app.airplaneModeActivated ?
          'Deactivate Airplane Mode' :
          'Activate Airplane Mode',
        click: () => {
          this.emit(AppTray.Events.AIRPLANE_MODE_TOGGLED);
        }
      },
      {
        label: 'Status: ' + (this._app.airplaneModeActivated ? 'On' : 'Off'),
        enabled: false
      },
      {
        type: 'separator'
      },
      {
        label: 'Open at Login',
        type: 'checkbox',
        checked: app.getLoginItemSettings().openAtLogin,
        click: menuItem => {
          app.setLoginItemSettings({
            openAtLogin: menuItem.checked
          });
        }
      },
      {
        label: 'Quit',
        click: () => {
          this._app.quit();
        }
      }
    ]);
  }

  /**
   * Builds the app's Tray.
   *
   * @private
   */
  _buildTray() {
    debug('building tray...');

    this._tray = new Tray(AppTray.Icons.DISABLED);

    this._updateTray();
  }

  /**
   * Updates the app's Tray.
   *
   * @private
   */
  _updateTray() {
    debug('updating tray...');

    const menu = this._buildMenu();

    if (this._app.airplaneModeActivated) {
      this._tray.setImage(AppTray.Icons.ENABLED);
      this._tray.setPressedImage(AppTray.Icons.ENABLED_PRESSED);
    } else {
      this._tray.setImage(AppTray.Icons.DISABLED);
      this._tray.setPressedImage(AppTray.Icons.DISABLED_PRESSED);
    }

    this._tray.setContextMenu(menu);
    this._tray.setToolTip(`Airplane v${app.getVersion()}\nBy Nathan Buchar`);
  }

  /**
   *
   *
   * @public
   */
  update() {
    this._updateTray();
  }
}

/**
 * AppTray icon paths.
 *
 * @enum {string}
 * @static
 */
AppTray.Icons = {
  DISABLED:
    path.join(
      __dirname, '../resources/osx/Airplane-Mode-Disabled-Template.png'),
  DISABLED_PRESSED:
    path.join(
      __dirname, '../resources/osx/Airplane-Mode-Disabled-Pressed-Template.png'),
  ENABLED:
    path.join(
      __dirname, '../resources/osx/Airplane-Mode-Enabled-Template.png'),
  ENABLED_PRESSED:
    path.join(
      __dirname, '../resources/osx/Airplane-Mode-Enabled-Pressed-Template.png')
};

/**
 * AppTray event names.
 *
 * @enum {string}
 * @static
 */
AppTray.Events = {
  AIRPLANE_MODE_TOGGLED: 'airplaneModeToggled'
};

module.exports = AppTray;
