const { app } = require('electron');
const { execSync } = require('child_process');
const debug = require('debug')('airplane:app');
const path = require('path');

const AppTray = require('./tray');

/**
 * The path to the blueutil binary.
 *
 * @type {string}
 * @see http://www.frederikseiffert.de/blueutil/
 */
const blueutil = path.join(__dirname, '../bin/blueutil');

class App {

  /**
   * Creates a new App instance.
   *
   * @constructor
   */
  constructor() {

    /**
     * A reference to the app's AppTray instance.
     *
     * @type {AppTray}
     * @private
     */
    this._appTray = null;

    /**
     * A boolean indicating whether airplane mode is activated.
     *
     * @type {boolean}
     * @default false
     * @private
     */
    this._airplaneModeActivated = false;

    /**
     * A boolean indicating whether wifi was running when this was set.
     *
     * @type {boolean}
     * @private
     */
    this._wifiWasRunning = null;

    /**
     * A boolean indicating whether bluetooth was running when this was set.
     *
     * @type {boolean}
     * @private
     */
    this._bluetoothWasRunning = null;

    /**
     *
     */
    this._poll = null;

    this._init();
  }

  /**
   *
   *
   * @private
   */
  _init() {
    debug('initializing...');

    this._initDock();
    this._initAppTray();
  }

  /**
   * Initializes the dock.
   *
   * @private
   */
  _initDock() {
    debug('initializing dock...');

    app.dock.hide();
  }

  /**
   * Initializes the AppTray instance.
   *
   * @private
   */
  _initAppTray() {
    debug('initializing AppTray...');

    this._appTray = new AppTray(this);

    this._appTray.on('airplaneModeToggled', () => {
      this._toggleAirplaneMode();
    });
  }

  /**
   * Turns the wifi service on.
   *
   * @private
   */
  _turnOnWifi() {
    debug('turning on wifi...');

    try {
      execSync('networksetup -setairportpower en1 on');
    } catch (err) {
      debug(`Error: ${err}`);
    }
  }

  /**
   * Turns the wifi service off.
   *
   * @private
   */
  _turnOffWifi() {
    debug('turning off wifi...');

    try {
      execSync('networksetup -setairportpower en1 off');
    } catch (err) {
      debug(`Error: ${err}`);
    }
  }

  /**
   * Turns the bluetooth service on.
   *
   * @private
   */
  _turnOnBluetooth() {
    debug('turning on bluetooth...');

    try {
      execSync(`${blueutil} on`);
    } catch (err) {
      debug(`Error: ${err}`);
    }
  }

  /**
   * Turns the bluetooth service off.
   *
   * @private
   */
  _turnOffBluetooth() {
    debug('turning off bluetooth...');

    try {
      execSync(`${blueutil} off`);
    } catch (err) {
      debug(`Error: ${err}`);
    }
  }

  /**
   * Returns a boolean indicating whether the wifi service is running.
   *
   * @returns {boolean}
   * @private
   */
  _checkIfWifiIsRunning() {
    try {
      const airportStatus = execSync('networksetup -getairportpower en0', { encoding: 'utf-8' });
      const wifiIsRunning = airportStatus.match(/on/i);

      return wifiIsRunning;
    } catch (err) {
      debug(`Error: ${err}`);

      return false;
    }
  }

  /**
   * Returns a boolean indicating whether the bluetooth service is running.
   *
   * @returns {boolean}
   * @private
   */
  _checkIfBluetoothIsRunning() {
    try {
      const bluetoothStatus = execSync(`${blueutil} status`, { encoding: 'utf-8' });
      const bluetoothIsRunning = bluetoothStatus.match(/on/i);

      return bluetoothIsRunning;
    } catch (err) {
      debug(`Error: ${err}`);

      return false;
    }
  }

  /**
   * Enables a polling interval that checks if Airplane mode needs to be
   * deactivated.
   *
   * @private
   */
  _enablePoll() {
    debug('enabling poll...');

    const pollingFrequencyMs = 2500;

    this._poll = setInterval(() => {
      if (this._airplaneModeActivated) {
        const wifiIsRunning = this._checkIfWifiIsRunning();
        const bluetoothIsRunning = this._checkIfBluetoothIsRunning();

        if (wifiIsRunning || bluetoothIsRunning) {
          this._wifiWasRunning = wifiIsRunning;
          this._bluetoothWasRunning = bluetoothIsRunning;

          this._deactivateAirplaneMode();
        }
      }
    }, pollingFrequencyMs);
  }

  /**
   * Disables the polling interval.
   *
   * @private
   */
  _disablePoll() {
    debug('disabling poll...');

    if (this._poll) {
      clearInterval(this._poll);
      this._poll = null;
    }
  }

  /**
   * Toggles airplane mode.
   *
   * @private
   */
  _toggleAirplaneMode() {
    if (this._airplaneModeActivated) {
      this._deactivateAirplaneMode();
    } else {
      this._activateAirplaneMode();
    }
  }

  /**
   * Deactivates airplane mode.
   *
   * @private
   */
  _deactivateAirplaneMode() {
    debug('deactivating airplane mode...');

    this._airplaneModeActivated = false;

    // If wifi was running previously, turn it back on.
    if (this._wifiWasRunning) {
      this._turnOnWifi();
    }

    // If bluetooth was running previously, turn it back on.
    if (this._bluetoothWasRunning) {
      this._turnOnBluetooth();
    }

    // Update the app's tray.
    this._appTray.update();

    this._disablePoll();
  }

  /**
   * Activates airplane mode.
   *
   * @private
   */
  _activateAirplaneMode() {
    debug('activating airplane mode...');

    this._airplaneModeActivated = true;

    // Store the current states of the wifi and bluetooth services befire
    // disablng them, so that they may be restored later.
    this._wifiWasRunning = this._checkIfWifiIsRunning();
    this._bluetoothWasRunning = this._checkIfBluetoothIsRunning();

    // Turn off wifi if it was running.
    if (this._wifiWasRunning) {
      this._turnOffWifi();
    }

    // Turn off bluetooth if it was running.
    if (this._bluetoothWasRunning) {
      this._turnOffBluetooth();
    }

    // Update the app's tray.
    this._enablePoll();
    this._appTray.update();
  }

  /**
   * Quits the app.
   *
   * @public
   */
  quit() {
    debug('quitting app...');

    app.quit();
  }

  /**
   * Returns a boolean indicating whether airplane mode is currently acticated.
   *
   * @returns {boolean}
   * @public
   */
  get airplaneModeActivated() {
    return this._airplaneModeActivated;
  }
}

module.exports = new App();
