
class Haltable {

  //// CONSTANTS

  static checkMillis = 200;

  //// CONFIGURATION

  // alertOnError: boolean;

  //// INSTANCE STATE

  running = false; // whether currently running

  //// CONSTRUCTION

  constructor(alertOnError = false) {
    this.alertOnError = alertOnError;
  }

  //// PUBLIC METHODS

  async delay(milliseconds) {
    if (milliseconds === undefined) {
      milliseconds = 500;
    }
    if (isNaN(milliseconds) || milliseconds < 0) {
      this._error("milliseconds must be a number >= 0");
    }
    return new Promise((resolve) => {
      this._nextInterval(milliseconds, resolve);
    });
  }

  async loop(runnable, resource) {
    this._validateRunnable(runnable);
    this.running = true;
    while(await runnable(resource) == true)
      ;
    this.running = false;
  }

  async run(runnable, resource) {
    this._validateRunnable(runnable);
    this.running = true;
    await runnable(resource);
    this.running = false;
  }

  stop() {
    this.running = false;
  }

  //// PRIVATE METHODS

  _nextInterval(remainingMillis, resolve) {
    const intervalMillis = Math.min(remainingMillis, Haltable.checkMillis);
    setTimeout(() => {
      if (!this.running) {
        throw new HaltException();
      }
      remainingMillis -= intervalMillis;
      if (remainingMillis == 0) {
        resolve();
      } else {
        this._nextInterval(remainingMillis, resolve);
      }
    }, intervalMillis);
  }

  _validateRunnable(runnable) {
    if (typeof runnable != "function" ||
        runnable.constructor.name != "AsyncFunction") {
      this._error("the runnable must be an async function");
    }
  }
  
  _error(message) {
    if (this.alertOnError) {
      alert("ERROR: " + message);
    }
    throw Error(message);
  }
}

class HaltException extends Error {
  constructor() {
    super("halted a running haltable");
  }
}
