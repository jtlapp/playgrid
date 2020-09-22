
import Grid, {GridConfig} from './grid';
import Haltable from './haltable';

const clickToPlay = "Click to PLAY";
const clickToStop = "Click to STOP";
const styles = `
  .playgrid_wrapper {
    cursor: pointer;
  }

  .playgrid_message {
    display: none;
    z-index: 10;
    padding: 14px 20px;
    background-color: white;
    border: 2px solid black;
    border-radius: 8px;
    opacity: 0.8;
  }

  .playgrid_message: hover {
    position: absolute;
    display: block;
  }
`;

type Runnable = (grid: Grid) => Promise<boolean | void>;

export default class PlayGrid extends Grid {

  readonly haltable: Haltable;
  readonly runnable: Runnable;

  constructor(containerID: string, config: GridConfig, runnable: Runnable) {
    super(containerID, config);
    this.haltable = new Haltable(config.alertOnError);
    this.runnable = runnable;
    this.haltable._validateRunnable(runnable);
  }

  _init() {
    super._init();
    if (!Grid.initializedPage) {
      this._addStyles(styles);
    }
    const container = document.getElementById(this.containerID);
    const message = this._createElementFromHTML(
      `<div class="playgrid_message">${clickToPlay}</div>`);
    container!.append(message);

    container!.addEventListener("mousemove", (e: MouseEvent) => {
      message.style.left = (e.clientX - 50) + 'px';
      message.style.top = (e.clientY - 25) + 'px';
    });

    container!.addEventListener("click", async () => {
      if (this.haltable.running) {
        message.textContent = clickToPlay;
        this.haltable.stop();
      } else {
        message.textContent = clickToStop;
        await this.haltable.loop(this.runnable as () => Promise<boolean>, this);
      }
    });
  }
}
