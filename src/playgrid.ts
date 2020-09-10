
const styles = `
  .pixel_grids {
    position: relative;
  }

  table.pixel_grid,
  table.pixel_grid tr,
  table.pixel_grid td {
    border: none;
    border-spacing: 0;
    padding: 0;
    margin: 0;
  }

  table.pixel_grid {
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }

  .hide_grid {
    display: none;
  }
`;

export type GridConfig = {
  width: number,
  height: number,
  enforceBoundaries: boolean,
  alertOnError: boolean
};

export class Grid {

  //// CONFIGURATION

  readonly containerID: string;
  readonly width: number;
  readonly height: number;
  readonly enforceBoundaries: boolean;
  readonly alertOnError: boolean;

  //// CLASS STATE

  static initialized = false;

  //// INSTANCE STATE

  initialized = false; // whether grid has been initialized
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
    if (isNaN(config.width) || isNaN(config.height)) {
      this._error("width and height must be numbers");
    }
    if (config.width < 1 || config.height < 1) {
      this._error("width and height must be >= 1");
    }
    if (["undefined", "boolean"].indexOf(typeof config.enforceBoundaries) == -1) {
      this._error("enforceBoundaries must be a boolean");
    }
    if (["undefined", "boolean"].indexOf(typeof config.alertOnError) == -1) {
      this._error("errorAlerts must be a boolean");
    }
    if (typeof animate != "function") {
      this._error("the animate parameter must be a function");
    }

    this.containerID = containerID;
    this.width = config.width;
    this.height = config.height;
    this.enforceBoundaries = config.enforceBoundaries ?? true;
    this.alertOnError = config.alertOnError ?? true;

    window.addEventListener("DOMContentLoaded", () => this._init());
  }

  //// PUBLIC METHODS

  clear() {
    this._confirmReady();
    const rows = this.useGrid1 ? this.rows1 : this.rows2;
    for (let r = 0; r < this.height; ++r) {
      const targetCells = rows![r].children;
      for (let c = 0; c < this.width; ++c) {
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
    if (this.useGrid1) {
      this.grid1!.classList.add("hide_grid");
      this.grid2!.classList.remove("hide_grid");
    } else {
      this.grid2!.classList.add("hide_grid");
      this.grid1!.classList.remove("hide_grid");
    }
    this.useGrid1 = !this.useGrid1;
  }

  //// PRIVATE METHODS
  
  _init() {
    if (!this.initialized) { // only do this on first grid of page
      const stylesheet = document.createElement("style");
      stylesheet.type = "text/css";
      stylesheet.innerText = styles;
      document.head.appendChild(stylesheet);
      this.initialized = true;
    }
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
    this.grid2.classList.add("hide_grid");
    container.append(this.grid2);
    this._setGridAspectRatio();
    window.addEventListener("resize", () => this._setGridAspectRatio());
    this.initialized = true;
  }

  _createGridElement(): HTMLElement {
    let html = "<div class='pixel_grids'><table class='pixel_grid'>\n";
    for (let r = 0; r < this.height; ++r) {
      html += "<tr>";
      for (let c = 0; c < this.width; ++c) {
        html += "<td></td>";
      }
      html += "</tr>\n";
    }
    html + "</table></div>\n";

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
    const aspectRatio = this.width / this.height;
    let adjustedWidth = window.innerWidth;
    let adjustedHeight = adjustedWidth / aspectRatio;
    if (adjustedHeight + topOffset > window.innerHeight) {
      adjustedHeight = window.innerHeight - topOffset;
      adjustedWidth = adjustedHeight * aspectRatio;
    }
    child.style.width = adjustedWidth + "px";
    child.style.height = adjustedHeight + "px";
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
        (x < 0 || x >= this.width || y < 0 || y >= this.height);
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
    if (this.alertOnError) {
      alert("ERROR: " + message);
    }
    throw Error(message);
  }
}
