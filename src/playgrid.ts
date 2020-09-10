
export type GridConfig = {
  gridWidth: number,
  gridHeight: number,
  enforceBoundaries: boolean,
  errorAlerts: boolean
};

export class Grid {

  //// CONFIGURATION

  readonly containerID: string;
  readonly gridWidth: number;
  readonly gridHeight: number;
  readonly enforceBoundaries: boolean;
  readonly errorAlerts: boolean;
  readonly animate: () => Promise<void>;

  //// INSTANCE STATE

  initialized = false; // whether grid has been initialized
  running = false; // whether currently running animation
  useGrid1 = true; // whether plotting on frame 1

  //// CACHED VALUES

  grid1?: HTMLElement; // ref to grid1 for pingponging rendering
  grid2?: HTMLElement; // ref to grid2 for pingponging rendering
  table1?: HTMLElement; // ref to <table> DOM node in grid1
  table2?: HTMLElement; // ref to <table> DOM node in grid2
  rows1?: HTMLCollection; // ref to array of <tr> DOM nodes in grid1
  rows2?: HTMLCollection; // ref to array of <tr> DOM nodes in grid2

  //// CONSTRUCTION

  constructor(containerID: string, config: GridConfig, animate: () => Promise<void>) {

    // Helpfully guard calls that students make from JavaScript.

    if (typeof containerID != "string" || containerID.length == 0) {
      this._error("containerID must be the value of an HTML 'id' attribute");
    }
    if (isNaN(config.gridWidth) || isNaN(config.gridHeight)) {
      this._error("gridWidth and gridHeight must be numbers");
    }
    if (config.gridWidth < 1 || config.gridHeight < 1) {
      this._error("gridWidth and gridHeight must be >= 1");
    }
    if (["undefined", "boolean"].indexOf(typeof config.enforceBoundaries) == -1) {
      this._error("enforceBoundaries must be a boolean");
    }
    if (["undefined", "boolean"].indexOf(typeof config.errorAlerts) == -1) {
      this._error("errorAlerts must be a boolean");
    }
    if (typeof animate != "function") {
      this._error("the animate parameter must be a function");
    }

    this.containerID = containerID;
    this.gridWidth = config.gridWidth;
    this.gridHeight = config.gridHeight;
    this.enforceBoundaries = config.enforceBoundaries ?? true;
    this.errorAlerts = config.errorAlerts ?? true;
    this.animate = animate;

    window.addEventListener("DOMContentLoaded", () => this._init());
  }

  //// PUBLIC METHODS

  clear() {
    this._confirmReady();
    const rows = this.useGrid1 ? this.rows1 : this.rows2;
    for (let r = 0; r < this.gridHeight; ++r) {
      const targetCells = rows![r].children;
      for (let c = 0; c < this.gridWidth; ++c) {
        targetCells[c].className = "";
      }
    }
  }
  
  plot(x: number, y: number, color: string) {
    // Helpfully guard calls that students make from JavaScript.

    this._confirmReady();
    const withinBoundaries = this._validatePoint(x, y);
    this._validateColor(color);

    if (withinBoundaries) {
      const rows = this.useGrid1 ? this.rows1 : this.rows2;
      rows![Math.floor(y)].children[Math.floor(x)].className = color;
    }
  }
    
  swap() {
    this._confirmReady();
    const elem = document.getElementById("foo");
    if (this.useGrid1) {
      this.grid1!.classList.add("hide");
      this.grid2!.classList.remove("hide");
    } else {
      this.grid2!.classList.add("hide");
      this.grid1!.classList.remove("hide");
    }
    this.useGrid1 = !this.useGrid1;
  }

  async delay(milliseconds: number) {
    this._confirmReady();
    if (isNaN(milliseconds) || milliseconds < 0) {
      this._error("milliseconds must be a number >= 0");
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        if (!this.running) {
          console.log("STOPPED ANIMATION");
          throw Error("STOPPED ANIMATION");
        }
        resolve();
      }, milliseconds);
    });
  }

  //// PRIVATE METHODS
  
  _init() {
    const container = document.getElementById(this.containerID);
    if (container == null) {
      this._error(`cannot find container element with ID "${this.containerID}"`);
    }
    this.grid1 = this._createGridElement();
    this.table1 = this.grid1.firstElementChild as HTMLElement;
    this.rows1 = this.table1.children[0].children;
    container.append(this.grid1);
    this.grid2 = this._createGridElement();
    this.table2 = this.grid2.firstElementChild as HTMLElement;
    this.rows2 = this.table2.children[0].children;
    this.grid2.classList.add("hide");
    container.append(this.grid2);
    this._setGridAspectRatio();
    window.addEventListener("resize", () => this._setGridAspectRatio());
    this.initialized = true;
  }

  _createGridElement(): HTMLElement {
    let html = "<table class='grid'>\n";
    for (let r = 0; r < this.gridHeight; ++r) {
      html += "<tr>";
      for (let c = 0; c < this.gridWidth; ++c) {
        html += "<td></td>";
      }
      html += "</tr>\n";
    }
    html + "</table>\n";

    let template = document.createElement('template');
    template.innerHTML = html;
    return template.content.firstElementChild as HTMLElement;
  }
  
  _setGridAspectRatio() {
    this._confirmReady();
    const topOffset = Math.max(this.table1!.getBoundingClientRect().top,
        this.table2!.getBoundingClientRect().top);
    this._setAspectRatio(this.table1!, topOffset);
    this._setAspectRatio(this.table2!, topOffset);
  }
  
  _setAspectRatio(child: HTMLElement, topOffset: number) {
    // CSS solutions were too hard to make behave as expected
    const aspectRatio = this.gridWidth / this.gridHeight;
    let adjustedWidth = window.innerWidth;
    let adjustedHeight = adjustedWidth / aspectRatio;
    if (adjustedHeight + topOffset > window.innerHeight) {
      adjustedHeight = window.innerHeight - topOffset;
      adjustedWidth = adjustedHeight * aspectRatio;
    }
    child.style.width = adjustedWidth + "px";
    child.style.height = adjustedHeight + "px";
  }
  
  async _start() {
    // TBD: Who calls this? From where? And stop too?
    this.clear();
    this.swap();
    this.clear();
    this.running = true;
    await this.animate();
    this.running = false;
  }

  _stop() {
    if (!this.running) {
      this._error("can't stop animation because it isn't running");
    }
    this.running = false;
  }
  
  _validateColor(color: string) {
    if (color != null && (typeof color != "string" || color.length == 0)) {
      this._error("color must either be null or a CSS class name");
    }
  }

  _validatePoint(x: number, y: number): boolean {
    if (isNaN(x) || isNaN(y)) {
      this._error("x and y must be numbers");
    }
    const withinBoundaries = 
        (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight);
    if (this.enforceBoundaries && !withinBoundaries) {
      this._error(`location (${x}, ${y}) is not on the grid`);
    }
    return withinBoundaries;
  }

  _confirmReady() {
    if (!this.initialized) {
      this._error("grid has not been initialized");
    }
  }

  _error(message: string): never {
    if (this.errorAlerts) {
      alert("ERROR: " + message);
    }
    throw Error(message);
  }
}
