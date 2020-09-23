
const _clickToPlay = "Click to PLAY";
const _clickToStop = "Click to STOP";
const _playgridPlayGridStyles = `
  .playgrid_message {
    position: absolute;
    z-index: 10;
    padding: 12px 0;
    width: 120px;
    text-align: center;
    background-color: white;
    border: 2px solid black;
    border-radius: 8px;
    opacity: 0.7;
    cursor: pointer;
  }
`;

class PlayGrid extends Grid {

  // haltable: Haltable;
  // runnable: Runnable;
  // hoverMessage: element;

  constructor(containerID, config, runnable) {
    super(containerID, config);
    this.haltable = new Haltable(config.alertOnError);
    this.runnable = runnable;
    this.haltable._validateRunnable(runnable);

    this._addStyles(_playgridPlayGridStyles);
    this.hoverMessage = this._createElementFromHTML(
      `<div class="playgrid_message playgrid_hide">${_clickToPlay}</div>`);
    this.container.append(this.hoverMessage);

    this.container.addEventListener("mousemove", (e) => {
      this.hoverMessage.style.left = (e.clientX - 80) + 'px';
      this.hoverMessage.style.top = (e.clientY - 58) + 'px';
    });

    // It appears that hovering the cursor over a boundary
    // between cells moves the cursor off of the table.
    this.container.addEventListener("mouseover", () => this._onEnter());
    this.container.addEventListener("mouseout", () => this._onLeave());
    this.container.addEventListener("click", () => this._onClick());
  }

  async delay(milliseconds) {
    await this.haltable.delay(milliseconds);
  }

  async _onClick() {
    if (this.haltable.running) {
      this.haltable.stop();
      this.hoverMessage.textContent = _clickToPlay;
    } else {
      this.hoverMessage.textContent = _clickToStop;
      await this.haltable.loop(this.runnable, this);
      this.hoverMessage.textContent = _clickToPlay;
    }
  }

  _onEnter() {
    this.hoverMessage.classList.remove("playgrid_hide");
  }
 
  _onLeave() {
    this.hoverMessage.classList.add("playgrid_hide");
  }
}
