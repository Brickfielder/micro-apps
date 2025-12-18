
export class AppWorkflow {
  constructor({ container }) {
    this.container = container;
    this.step = 'instructions'; // instructions, task, stats
    this.views = {
      instructions: null,
      task: null,
      stats: null,
    };
  }

  init({ instructions, task, stats }) {
    this.views.instructions = instructions;
    this.views.task = task;
    this.views.stats = stats;
    this.render();
  }

  changeStep(step) {
    this.step = step;
    this.render();
  }

  render() {
    this.container.innerHTML = '';

    // Create a wrapper for the workflow content
    const workflowWrapper = document.createElement('div');
    workflowWrapper.className = 'workflow-wrapper';

    let contentElement = null;

    if (this.step === 'instructions') {
      contentElement = this.views.instructions(this);
    } else if (this.step === 'task') {
      contentElement = this.views.task(this);
    } else if (this.step === 'stats') {
      contentElement = this.views.stats(this);
    }

    if (contentElement) {
        workflowWrapper.appendChild(contentElement);
    }

    this.container.appendChild(workflowWrapper);
  }
}
