
const _clickToPlay = "Click to PLAY";
const _clickToStop = "Click to STOP";
const _playGridStyles = `
  .playgrid_wrapper {
    cursor: pointer;
  }

  .playgrid_message {
    position: absolute;
    visibility: hidden;
    z-index: 10;
    padding: 12px 0;
    width: 120px;
    text-align: center;
    background-color: white;
    border: 2px solid black;
    border-radius: 8px;
    opacity: 0.7;
  }

  .playgrid_wrapper table:hover .playgrid_message {
    visibility: visible;
  }
`;

class PlayGrid extends Grid {

  // haltable: Haltable;
  // runnable: Runnable;

  constructor(containerID, config, runnable) {
    super(containerID, config);
    this.haltable = new Haltable(config.alertOnError);
    this.runnable = runnable;
    this.haltable._validateRunnable(runnable);

    this._addStyles(_playGridStyles);
    const container = document.getElementById(this.containerID);
    const message = this._createElementFromHTML(
      `<div class="playgrid_message">${_clickToPlay}</div>`);
    container.append(message);

    container.addEventListener("mousemove", (e) => {
      message.style.left = (e.clientX - 68) + 'px';
      message.style.top = (e.clientY - 44) + 'px';
    });

    container.addEventListener("click", async () => {
      if (this.haltable.running) {
        message.textContent = _clickToPlay;
        this.haltable.stop();
      } else {
        message.textContent = _clickToStop;
        await this.haltable.loop(this.runnable, this);
      }
    });
  }
}
