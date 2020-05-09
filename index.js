'use strict';

/**
 * @typedef {import('./type-def').Task} Task
 * @typedef {import('./type-def').TaskFile} TaskFile
 */

import Aria2Client from './libaria2.js';

const versionPanel = document.getElementById('version');
const uploadSpeedPanel = document.getElementById('upload-speed');
const downloadSpeedPanel = document.getElementById('download-speed');
const errorPanel = document.getElementById('error');
const addByURLButton = document.getElementById('add-by-url');
const addByTorrentButton = document.getElementById('add-by-torrent');
const settingsButton = document.getElementById('settings');
const refreshButton = document.getElementById('refresh');
const urlForm = document.getElementById('url-form');
const torrentFileForm = document.getElementById('torrent-file-form');
const settingsForm = document.getElementById('settings-form');
const activeDownloads = document.getElementById('active-downloads');
const waitingDownloads = document.getElementById('waiting-downloads');
const inactiveDownloads = document.getElementById('inactive-downloads');
const taskTemplate = document.getElementById('task-template');
const detailsTemplate = document.getElementById('details-button-template');
const pauseTemplate = document.getElementById('pause-button-template');
const resumeTemplate = document.getElementById('resume-button-template');
const stopTemplate = document.getElementById('stop-button-template');
const removeTemplate = document.getElementById('remove-button-template');
const fileTemplate = document.getElementById('file-template');
const filesControlTemplate = document.getElementById('files-control-template');

const MAX_WAITING = 1000;
const MAX_STOPPED = 1000;

const client = new Aria2Client();

/**
 * Renders a p element with "(N/A)" as its child text node.
 *
 * @returns {Element} Rendered element.
 */
const renderNA = () => {
  const pElement = document.createElement('p');
  pElement.append('(N/A)');
  return pElement;
};

/**
 * Renders details button.
 *
 * @param {string} gid Task ID.
 *
 * @returns {Node} Rendered node.
 */
const renderDetailsButton = (gid) => {
  const cloned = detailsTemplate.content.cloneNode(true);
  cloned.querySelector('button').onclick = () => {
    const details = document.getElementById(`${gid}-details`);
    if (details.style.display === 'block') {
      details.style.display = 'none';
    } else {
      details.style.display = 'block';
    }
  };
  return cloned;
};

/**
 * Renders pause button.
 *
 * @param {string} gid Task ID.
 *
 * @returns {Node} Rendered node.
 */
const renderPauseButton = (gid) => {
  const cloned = pauseTemplate.content.cloneNode(true);
  cloned.querySelector('button').onclick = () => {
    pauseTask(gid);
  };
  return cloned;
};

/**
 * Renders resume button.
 *
 * @param {string} gid Task ID.
 *
 * @returns {Node} Rendered node.
 */
const renderResumeButton = (gid) => {
  const cloned = resumeTemplate.content.cloneNode(true);
  cloned.querySelector('button').onclick = () => {
    resumeTask(gid);
  };
  return cloned;
};

/**
 * Renders stop button.
 *
 * @param {string} gid Task ID.
 *
 * @returns {Node} Rendered node.
 */
const renderStopButton = (gid) => {
  const cloned = stopTemplate.content.cloneNode(true);
  cloned.querySelector('button').onclick = () => {
    stopTask(gid);
  };
  return cloned;
};

/**
 * Renders remove button.
 *
 * @param {string} gid Task ID.
 *
 * @returns {Node} Rendered node.
 */
const renderRemoveButton = (gid) => {
  const cloned = removeTemplate.content.cloneNode(true);
  cloned.querySelector('button').onclick = () => {
    removeTask(gid);
  };
  return cloned;
};

/**
 * Renders the file list of a download task.
 *
 * @param {string} gid Task ID.
 * @param {TaskFile[]} files Files to be rendered.
 * @param {boolean} isChangeable Whether the selected files are changeable.
 *
 * @returns {Node} Rendered node.
 */
const renderFileList = (gid, files, isChangeable) => files.map((file) => {
  const cloned = fileTemplate.content.cloneNode(true);
  const checkbox = cloned.querySelector('.file-checkbox');
  checkbox.dataset.gid = gid;
  if (file.isSelected) {
    checkbox.checked = true;
  }
  if (!isChangeable) {
    checkbox.disabled = true;
  }
  const label = cloned.querySelector('label');
  if (file.path.length === 0) {
    label.append('(N/A)');
  } else {
    label.append(file.path);
  }
  return cloned;
});

/**
 * Renders the files control.
 *
 * @param {string} gid Task ID.
 *
 * @returns {Node} Rendered node.
 */
const renderFilesControl = (gid) => {
  const cloned = filesControlTemplate.content.cloneNode(true);
  // The checkboxes cannot be cached here using document.querySelectorAll()
  // because they do not exist on the page at this moment. In addition, the
  // checkboxes cannot be cached here using cloned.querySelectorAll() because
  // the references are lost once the rendering is completed and appended to the
  // page.
  const selector = `input[data-gid="${gid}"]`;
  cloned.querySelector('.select-all').onclick = () => {
    document.querySelectorAll(selector).forEach((checkbox) => {
      checkbox.checked = true;
    });
  };
  cloned.querySelector('.unselect-all').onclick = () => {
    document.querySelectorAll(selector).forEach((checkbox) => {
      checkbox.checked = false;
    });
  };
  cloned.querySelector('.update').onclick = () => {
    const indices = [];
    document.querySelectorAll(selector).forEach((checkbox, index) => {
      if (checkbox.checked) {
        // The index of file starts from 1.
        indices.push(index + 1);
      }
    });
    updateTask(gid, indices);
  };
  return cloned;
};

/**
 * Renders a download task.
 *
 * @param {Task} task Download task to be rendered.
 * @param {object} options Rendering options.
 * @param {boolean} options.isPausable Whether the task can be paused.
 * @param {boolean} options.isResumable Whether the task can be resumed.
 * @param {boolean} options.isStoppable Whether the task can be stopped.
 * @param {boolean} options.isRemovable Whether the task can be removed.
 * @param {boolean} options.isUpdatable Whether the file list can be updated.
 *
 * @returns {Node} Rendered node.
 */
const renderTask = (task, options) => {
  const cloned = taskTemplate.content.cloneNode(true);
  cloned.querySelector('.gid').append(task.gid);
  cloned.querySelector('.upload-speed').append(task.uploadSpeed);
  cloned.querySelector('.download-speed').append(task.downloadSpeed);
  cloned.querySelector('.progress').append(task.progress);
  cloned.querySelector('.status').append(task.status);
  cloned.querySelector('.info').append(renderDetailsButton(task.gid));
  if (options.isPausable) {
    cloned.querySelector('.info').append(renderPauseButton(task.gid));
  }
  if (options.isResumable) {
    cloned.querySelector('.info').append(renderResumeButton(task.gid));
  }
  if (options.isStoppable) {
    cloned.querySelector('.info').append(renderStopButton(task.gid));
  }
  if (options.isRemovable) {
    cloned.querySelector('.info').append(renderRemoveButton(task.gid));
  }
  cloned.querySelector('.details').id = `${task.gid}-details`;
  cloned.querySelector('.files').append(
    ...renderFileList(task.gid, task.files, options.isUpdatable)
  );
  if (options.isUpdatable) {
    cloned.querySelector('.details').append(renderFilesControl(task.gid));
  }
  return cloned;
};

/**
 * Renders active download tasks.
 *
 * @param {Task[]} tasks Download tasks to be rendered.
 *
 * @returns {Node[]} Rendered nodes.
 */
const renderActiveDownloads = (tasks) => tasks.map((task) => {
  // While aria2 allows updating an active download task, it takes some time
  // to apply the changes. If the same task is being retrieved from the API too
  // quick after the update, the selected file(s) would remain unchanged in the
  // response. In order not to confuse the user, disable updating an active
  // download task.
  const options = {
    isPausable: true,
    isResumable: false,
    isStoppable: true,
    isRemovable: false,
    isUpdatable: false
  };
  return renderTask(task, options);
});

/**
 * Renders waiting (waiting or paused) download tasks.
 *
 * @param {Task[]} tasks Download tasks to be rendered.
 *
 * @returns {Node[]} Rendered nodes.
 */
const renderWaitingDownloads = (tasks) => tasks.map((task) => {
  const options = {
    isPausable: false,
    isResumable: false,
    isStoppable: true,
    isRemovable: false,
    isUpdatable: true
  };
  if (task.status === 'waiting') {
    options.isPausable = true;
  }
  if (task.status === 'paused') {
    options.isResumable = true;
  }
  // Updating a download task which has only 1 file has no effect and
  // meaningless.
  if (task.files.length === 1) {
    options.isUpdatable = false;
  }
  return renderTask(task, options);
});

/**
 * Renders stopped download tasks.
 *
 * @param {Task[]} tasks Download tasks to be rendered.
 *
 * @returns {Node[]} Rendered nodes.
 */
const renderStoppedDownloads = (tasks) => tasks.map((task) => {
  /**
   * @todo Simplify this.
   */
  const options = {
    isPausable: false,
    isResumable: false,
    isStoppable: false,
    isRemovable: true,
    isUpdatable: false
  };
  return renderTask(task, options);
});

/**
 * Clears children nodes from the target node.
 *
 * @param {Node} node Target node.
 */
const clearChildren = (node) => {
  while (node.hasChildNodes()) {
    node.removeChild(node.lastChild);
  }
};

/**
 * Hides error message.
 */
const hideError = () => {
  errorPanel.style.display = 'none';
};

/**
 * Shows error message.
 *
 * @param {string} message Error message.
 */
const showError = (message) => {
  clearChildren(errorPanel);
  errorPanel.append(message);
  errorPanel.style.display = 'block';
};

/**
 * Shows aria2 version.
 */
const showVersion = async () => {
  try {
    const result = await client.getVersion();
    clearChildren(versionPanel);
    versionPanel.append(result);
  } catch (error) {
    showError(`Cannot show version: ${error.message}`);
  }
};

/**
 * Shows global statistics.
 */
const showGlobalStat = async () => {
  try {
    const result = await client.getGlobalStat();
    clearChildren(uploadSpeedPanel);
    clearChildren(downloadSpeedPanel);
    uploadSpeedPanel.append(`${result.uploadSpeed} Mbps`);
    downloadSpeedPanel.append(`${result.downloadSpeed} Mbps`);
  } catch (error) {
    showError(`Cannot show statistics: ${error.message}`);
  }
};

/**
 * Shows active download tasks.
 */
const showActiveDownloads = async () => {
  let tasks = null;
  try {
    tasks = await client.getActiveDownloads();
  } catch (error) {
    showError(`Cannot show active downloads: ${error.message}`);
    return;
  }
  clearChildren(activeDownloads);
  if (tasks.length === 0) {
    activeDownloads.append(renderNA());
    return;
  }
  activeDownloads.append(...renderActiveDownloads(tasks));
};

/**
 * Shows waiting (waiting or paused) download tasks.
 */
const showWaitingDownloads = async () => {
  let tasks = null;
  try {
    tasks = await client.getWaitingDownloads(MAX_WAITING);
  } catch (error) {
    showError(`Cannot show downloads in queue: ${error.message}`);
    return;
  }
  clearChildren(waitingDownloads);
  if (tasks.length === 0) {
    waitingDownloads.append(renderNA());
    return;
  }
  waitingDownloads.append(...renderWaitingDownloads(tasks));
};

/**
 * Shows stopped download tasks.
 */
const showStoppedDownloads = async () => {
  let tasks = null;
  try {
    tasks = await client.getStoppeddownloads(MAX_STOPPED);
  } catch (error) {
    showError(`Cannot show stopped downloads: ${error.message}`);
    return;
  }
  clearChildren(inactiveDownloads);
  if (tasks.length === 0) {
    inactiveDownloads.append(renderNA());
    return;
  }
  inactiveDownloads.append(...renderStoppedDownloads(tasks));
};

/**
 * Show all download tasks.
 */
const showDownloads = () => {
  showActiveDownloads();
  showWaitingDownloads();
  showStoppedDownloads();
};

/**
 * Adds download task by the URL.
 *
 * @param {string} url URL.
 */
const addByURL = async (url) => {
  hideError();
  try {
    await client.addDownloadByURL(url);
    urlForm.reset();
    showGlobalStat();
    showDownloads();
  } catch (error) {
    showError(`Cannot add download task: ${error.message}`);
  }
};

/**
 * Adds download task by the torrent file.
 *
 * @param {string} fileBase64 Torrent file in Base64 encoding.
 */
const addByTorrent = async (fileBase64) => {
  try {
    await client.addDownloadByTorrent(fileBase64);
    torrentFileForm.reset();
    showGlobalStat();
    showDownloads();
  } catch (error) {
    showError(`Cannot add download task: ${error.message}`);
  }
};

/**
 * Updates a download task.
 *
 * @param {string} gid Task ID.
 * @param {number[]} indices Indices (1-based) of selected files to download.
 */
const updateTask = async (gid, indices) => {
  try {
    await client.updateDownload(gid, indices);
    showGlobalStat();
    showDownloads();
  } catch (error) {
    showError(`Cannot update download task: ${error.message}`);
  }
};

/**
 * Pauses a download task.
 *
 * @param {string} gid Task ID.
 */
const pauseTask = async (gid) => {
  try {
    await client.forcePause(gid);
    showGlobalStat();
    showDownloads();
  } catch (error) {
    showError(`Cannot pause download task: ${error.message}`);
  }
};

/**
 * Resumes a download task.
 *
 * @param {string} gid Task ID.
 */
const resumeTask = async (gid) => {
  try {
    await client.resumeDownload(gid);
    showGlobalStat();
    showDownloads();
  } catch (error) {
    showError(`Cannot resume download task: ${error.message}`);
  }
};

/**
 * Stops a download task.
 *
 * @param {string} gid Task ID.
 */
const stopTask = async (gid) => {
  try {
    await client.forceStop(gid);
    showGlobalStat();
    showDownloads();
  } catch (error) {
    showError(`Cannot stop download task: ${error.message}`);
  }
};

/**
 * Removes a download task.
 *
 * @param {string} gid Task ID.
 */
const removeTask = async (gid) => {
  try {
    await client.removeDownload(gid);
    showGlobalStat();
    showDownloads();
  } catch (error) {
    showError(`Cannot remove download task: ${error.message}`);
  }
};

addByURLButton.onclick = () => {
  urlForm.style.display = 'block';
  torrentFileForm.style.display = 'none';
  settingsForm.style.display = 'none';
};

addByTorrentButton.onclick = () => {
  urlForm.style.display = 'none';
  torrentFileForm.style.display = 'block';
  settingsForm.style.display = 'none';
};

settingsButton.onclick = () => {
  urlForm.style.display = 'none';
  torrentFileForm.style.display = 'none';
  settingsForm.style.display = 'block';
};

refreshButton.onclick = () => {
  hideError();
  showGlobalStat();
  showDownloads();
};

urlForm.onsubmit = () => {
  const url = document.getElementById('url').value;
  if (url === '') {
    showError('URL is missing.');
    return;
  }
  addByURL(url);
  return false;
};

torrentFileForm.onsubmit = () => {
  const fileList = document.getElementById('torrent-file').files;
  if (fileList === 0) {
    showError('Torrent file is missing.');
    return;
  }
  // Currently only one torrent file is processed per time.
  const file = fileList[0];
  const fileReader = new window.FileReader();
  fileReader.onload = (event) => {
    // Only the file content in Base64 encoding is needed.
    const needle = 'base64,';
    const content = event.target.result;
    const fileBase64 = content.slice(content.indexOf(needle) + needle.length);
    addByTorrent(fileBase64);
  };
  fileReader.onerror = () => {
    showError('Cannot read file.');
  };
  fileReader.readAsDataURL(file);
  return false;
};

settingsForm.onsubmit = () => {
  const host = document.getElementById('host').value;
  const port = document.getElementById('port').value;
  const token = document.getElementById('token').value;
  if ((host === '') || (port === '')) {
    showError('Host or port is missing.');
    return false;
  }
  let authToken = null;
  if (token.length !== 0) {
    authToken = token;
  }
  client.setConfig({
    protocol: window.location.protocol,
    host,
    port,
    token: authToken
  });
  hideError();
  showVersion();
  showGlobalStat();
  showDownloads();
  return false;
};
