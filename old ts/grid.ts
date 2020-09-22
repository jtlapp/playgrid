
const styles = `
  .playgrid_wrapper {
    position: relative;
  }

  table.playgrid_grid,
  table.playgrid_grid tr,
  table.playgrid_grid td {
    border: none;
    border-spacing: 0;
    padding: 0;
    margin: 0;
  }

  table.playgrid_grid {
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }

  .playgrid_hide {
    display: none;
  }
`;

export type GridConfig = {
  width: number,
  height: number,
  enforceBoundaries: boolean,
  alertOnError: boolean
};

export default class Grid {

  //// CONFIGURATION

  readonly containerID: string;
  readonly width: number;
  readonly height: number;
  readonly enforceBoundaries: boolean;
  readonly alertOnError: boolean;

  //// CLASS STATE

  static initializedPage = false; // whether page has been initialized

  //// INSTANCE STATE

  // TBD: I don't think I need initializedGrid
  initializedGrid = false; // whether grid has been initialized
  useGrid1 = true; // whether plotting on frame 1

  //// CACHED VALUES

  grid1?: HTMLElement; // ref to grid1 for pingponging rendering
  grid2?: HTMLElement; // ref to grid2 for pingponging rendering
  table1?: HTMLElement; // ref to <table> DOM node in grid1
  table2?: HTMLElement; // ref to <table> DOM node in grid2
  rows1?: HTMLCollection; // ref to array of <tr> DOM nodes in grid1
  rows2?: HTMLCollection; // ref to array of <tr> DOM nodes in grid2

  //// CONSTRUCTION

  constructor(containerID: string, config: GridConfig) {

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

    this.containerID = containerID;
    this.width = config.width;
    this.height = config.height;
    this.enforceBoundaries = config.enforceBoundaries ?? true;
    this.alertOnError = config.alertOnError ?? true;

    window.addEventListener("DOMContentLoaded", () => {
      this._init();
      Grid.initializedPage = true; // outside of _init so _init can be overloaded
    });
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
      this.grid1!.classList.add("playgrid_hide");
      this.grid2!.classList.remove("playgrid_hide");
    } else {
      this.grid2!.classList.add("playgrid_hide");
      this.grid1!.classList.remove("playgrid_hide");
    }
    this.useGrid1 = !this.useGrid1;
  }

  //// PRIVATE METHODS

  _addStyles(styles: string) {
    const stylesheet = document.createElement("style");
    stylesheet.type = "text/css";
    stylesheet.innerText = styles;
    document.head.appendChild(stylesheet);
  }
  
  _init() {
    if (!Grid.initializedPage) { // only do this on first grid of page
      this._addStyles(styles);
    }
    this.initializedGrid = true;
    const container = document.getElementById(this.containerID);
    if (container == null) {
      this._error(`cannot find container element with ID "${this.containerID}"`);
    }
    container.classList.add("playgrid_wrapper");
    this.grid1 = this._createGridElement();
    this.table1 = this.grid1.firstElementChild as HTMLElement;
    this.rows1 = this.table1.children[0].children;
    container.append(this.grid1);
    this.grid2 = this._createGridElement();
    this.table2 = this.grid2.firstElementChild as HTMLElement;
    this.rows2 = this.table2.children[0].children;
    this.grid2.classList.add("playgrid_hide");
    container.append(this.grid2);
    this._setGridAspectRatio();
    window.addEventListener("resize", () => this._setGridAspectRatio());
  }

  _createElementFromHTML(html: string): HTMLElement {
    let template = document.createElement('template');
    template.innerHTML = html;
    return template.content.firstElementChild as HTMLElement;
  }

  _createGridElement(): HTMLElement {
    let html = "<table class='playgrid_grid'>\n";
    for (let r = 0; r < this.height; ++r) {
      html += "<tr>";
      for (let c = 0; c < this.width; ++c) {
        html += "<td></td>";
      }
      html += "</tr>\n";
    }
    html += "</table>\n";
    return this._createElementFromHTML(html);
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
    if (!this.initializedGrid) {
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
