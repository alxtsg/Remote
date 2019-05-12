'use strict';

(() => {
  const Mustache = window.Mustache;

  const RADIX_DECIMAL = 10;

  const errorMessageElement = document.getElementById('error-message');
  const addByUrlPanel = document.getElementById('add-by-url-panel');
  const addByTorrentPanel = document.getElementById('add-by-torrent-panel');
  const activeDownloadsElement = document.getElementById('active-downloads');
  const inactiveDownloadsElement =
    document.getElementById('inactive-downloads');
  const downloadTaskTemplate =
    document.getElementById('download-task-template').innerHTML;

  // The aria2 RPC endpoint.
  let rpcEndpoint = null;

  // The aria2 RPC interface authentication token.
  let rpcAuthToken = null;

  /**
   * Utility functions.
   */

  /**
   * Clears children nodes of a given node.
   *
   * @param {Node} node The node which it children nodes will be removed.
   */
  const clearChildren = (node) => {
    while (node.hasChildNodes()) {
      node.removeChild(node.firstChild);
    }
  };

  /**
   * Shows error message.
   *
   * @param {string} errorMessage Error message.
   */
  const showErrorMessage = (errorMessage) => {
    errorMessageElement.textContent = errorMessage;
    errorMessageElement.style.display = 'block';
  };

  /**
   * Hides error message.
   */
  const hideErrorMessage = () => {
    errorMessageElement.style.display = 'none';
  };

  /**
   * Converts speed to megabit per second.
   *
   * @param {number} speed Speed in the unit bytes per second.
   *
   * @returns {number} Speed in the unit megabit per second, round to 2 digits
   *                   after the decimal point.
   */
  const speedInMbps = (speed) => {
    return Number((speed / 1000000) * 8).toFixed(2);
  };

  /**
   * Sends request to aria2.
   *
   * @async
   *
   * @param {object} requestOptions Request options.
   * @param {string} requestOptions.rpcEndpoint The RPC endpoint.
   * @param {object} requestOptions.authToken Authentication token. Set to null
   *                                          if no authentication token has to
   *                                          be sent.
   * @param {string} requestOptions.method The RPC method.
   * @param {Array} requestOptions.parameters The array of parameters Set to
   *                                          empty array if no parameters has
   *                                          to be sent.
   *
   * @returns {Promise} Resolves with the result object, or rejects with an
   *                    Error.
   */
  const aria2Client = async (requestOptions) => {
    const requestBody = {
      jsonrpc: '2.0',
      method: requestOptions.method,
      params: [],
      id: Date.now()
    };
    // If the authentication token is provided, place it at the front of the
    // parameters.
    if (requestOptions.authToken !== null) {
      const params = [requestOptions.authToken];
      params.push(...requestOptions.parameters);
      requestBody.params = params;
    } else {
      requestBody.params = requestOptions.parameters;
    }
    try {
      const response = await fetch(
        requestOptions.rpcEndpoint,
        {
          method: 'POST',
          body: JSON.stringify(requestBody)
        }
      );
      const responseJson = await response.json();
      if (responseJson.hasOwnProperty('error')) {
        return Promise.reject(responseJson.error.message);
      }
      return Promise.resolve(responseJson.result);
    } catch (error) {
      return Promise.reject(error);
    }
  };

  /**
   * Hides all command panels.
   */
  const hideCommandPanels = () => {
    const panels = document.getElementsByClassName('command-panel');
    Array.from(panels).forEach((panel) => {
      panel.style.display = 'none';
    });
  };

  /**
   * Shows download details of a download task.
   *
   * @param {String} gid GID of the download task.
   */
  const showDownloadDetails = (gid) => {
    const details = document.querySelectorAll('div.download-details');
    const detailsId = `download-details-${gid}`;
    Array.from(details).forEach((detail) => {
      if (detail.id === detailsId) {
        detail.style.display = 'block';
      } else {
        detail.style.display = 'none';
      }
    });
  };

  /**
   * Checks the checkboxes of files which are selected to be downloaded.
   *
   * @param {DocumentFragment} docFragment The DocumentFragment holding
   *                                       download details DOM tree.
   * @param {string} gid GID of the download task.
   * @param {Array} files Objects representing files in the download task.
   */
  const checkSelectedFiles = (docFragment, gid, files) => {
    const downloadFiles = docFragment.querySelectorAll(
      `#download-files-${gid} input[type="checkbox"]`);
    files.forEach((file, index) => {
      if (file.selected === 'true') {
        downloadFiles[index].checked = true;
      } else {
        downloadFiles[index].checked = false;
      }
    });
  };

  /**
   * Selects (checks) all files in a download task.
   *
   * @param {string} gid GID of the download task.
   */
  const selectAllFiles = (gid) => {
    const files = document.querySelectorAll(
      `#download-files-${gid} input[type="checkbox"]`);
    Array.from(files).forEach((file) => {
      file.checked = true;
    });
  };

  /**
   * Unselects (unchecks) all files in a download task.
   *
   * @param {string} gid GID of the download task.
   */
  const unselectAllFiles = (gid) => {
    const files = document.querySelectorAll(
      `#download-files-${gid} input[type="checkbox"]`);
    Array.from(files).forEach((file) => {
      file.checked = false;
    });
  };

  /**
   * Core functions.
   */

  /**
   * Adds a download task by URL.
   *
   * @async
   *
   * @param {string} url File URL or magnet link.
   */
  const addDownloadByUrl = async (url) => {
    try {
      await aria2Client({
        rpcEndpoint,
        authToken: rpcAuthToken,
        method: 'aria2.addUri',
        parameters: [
          // Each URL has to be put in an array.
          [url]
        ]
      });
      getDownloads();
    } catch (error) {
      showErrorMessage('Unable to add download task by URL.');
    }
  };

  /**
   * Adds a download task by BitTorrent file.
   *
   * @async
   *
   * @param {string} fileInBase64 The BitTorrent file encoded in Base64
   *                              representation.
   */
  const addDownloadByTorrent = async (fileInBase64) => {
    try {
      await aria2Client({
        rpcEndpoint,
        authToken: rpcAuthToken,
        method: 'aria2.addTorrent',
        parameters: [fileInBase64]
      });
      getDownloads();
    } catch (error) {
      showErrorMessage('Unable to add download task by BitTorrent file.');
    }
  };

  /**
   * Gets statistics, including aria2 version and global traffic.
   *
   * @async
   */
  const getStatistics = async () => {
    // Get version.
    try {
      const result = await aria2Client({
        rpcEndpoint,
        authToken: rpcAuthToken,
        method: 'aria2.getVersion',
        parameters: []
      });
      document.getElementById('aria2-version').textContent = result.version;
    } catch (error) {
      showErrorMessage('Unable to get aria2 version.');
    }
    // Get global traffic.
    try {
      const result = await aria2Client({
        rpcEndpoint,
        authToken: rpcAuthToken,
        method: 'aria2.getGlobalStat',
        parameters: []
      });
      const uploadSpeed =
        speedInMbps(parseInt(result.uploadSpeed, RADIX_DECIMAL));
      const downloadSpeed =
        speedInMbps(parseInt(result.downloadSpeed, RADIX_DECIMAL));
      document.getElementById('global-upload-speed').textContent =
        `${uploadSpeed} Mb/s`;
      document.getElementById('global-download-speed').textContent =
        `${downloadSpeed} Mb/s`;
    } catch (error) {
      showErrorMessage('Unable to get global traffic statistics.');
    }
  };

  /**
   * Forces a download task to be paused.
   *
   * @async
   *
   * @param {string} gid GID of the download task.
   */
  const forcePauseDownload = async (gid) => {
    try {
      await aria2Client({
        rpcEndpoint,
        authToken: rpcAuthToken,
        method: 'aria2.forcePause',
        parameters: [gid]
      });
      getDownloads();
    } catch (error) {
      showErrorMessage('Unable to pause download.');
    }
  };

  /**
   * Resumes a download task.
   *
   * @async
   *
   * @param {string} gid GID of the download task.
   */
  const resumeDownload = async (gid) => {
    try {
      await aria2Client({
        rpcEndpoint,
        authToken: rpcAuthToken,
        method: 'aria2.unpause',
        parameters: [gid]
      });
      getDownloads();
    } catch (error) {
      showErrorMessage('Unable to resume download.');
    }
  };

  /**
   * Stops a download task.
   *
   * @async
   *
   * @param {string} gid GID of the download task.
   */
  const stopDownload = async (gid) => {
    try {
      await aria2Client({
        rpcEndpoint,
        authToken: rpcAuthToken,
        method: 'aria2.forceRemove',
        parameters: [gid]
      });
      getDownloads();
    } catch (error) {
      showErrorMessage('Unable to stop download.');
    }
  };

  /**
   * Removes a download task.
   *
   * @async
   *
   * @param {string} gid GID of the download task.
   */
  const removeDownload = async (gid) => {
    try {
      await aria2Client({
        rpcEndpoint,
        authToken: rpcAuthToken,
        method: 'aria2.removeDownloadResult',
        parameters: [gid]
      });
      getDownloads();
    } catch (error) {
      showErrorMessage('Unable to remove download.');
    }
  };

  /**
   * Updates a download task.
   *
   * @async
   *
   * @param {string} gid GID of the download task.
   */
  const updateDownload = async (gid) => {
    // Get indices of selected files.
    const container = document.getElementById(`download-files-${gid}`);
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    const files = Array.from(checkboxes);
    const selectedFileIndices = [];
    files.forEach((file, index) => {
      if (file.checked) {
        // Note that the file index used in aria2 begins from 1, not 0.
        selectedFileIndices.push(index + 1);
      }
    });
    try {
      await aria2Client({
        rpcEndpoint,
        authToken: rpcAuthToken,
        method: 'aria2.changeOption',
        parameters: [
          gid,
          {
            'select-file': selectedFileIndices.join(',')
          }
        ]
      });
      getDownloads();
    } catch (error) {
      showErrorMessage('Unable to update download.');
    }
  };

  /**
   * Gets active download tasks.
   *
   * @async
   */
  const getActiveDownloads = async () => {
    try {
      const result = await aria2Client({
        rpcEndpoint,
        authToken: rpcAuthToken,
        method: 'aria2.tellActive',
        parameters: []
      });
      result.forEach((download) => {
        // Extract paths of files.
        const fileInfos = [];
        download.files.forEach((file) => {
          fileInfos.push({
            fileName: file.path
          });
        });
        // Define download task details for rendering.
        const uploadSpeed =
          speedInMbps(parseInt(download.uploadSpeed, RADIX_DECIMAL));
        const downloadSpeed =
          speedInMbps(parseInt(download.downloadSpeed, RADIX_DECIMAL));
        const progressPercentage =
          Number((download.completedLength / download.totalLength) * 100)
            .toFixed(2);
        const downloadDetails = {
          gid: download.gid,
          uploadSpeed: `${uploadSpeed} Mb/s`,
          downloadSpeed: `${downloadSpeed} Mb/s`,
          completePercentage: `${progressPercentage} %`,
          status: download.status,
          downloadFiles: fileInfos,
          canBePaused: true,
          canBeUpdated: false
        };
        // Render download task, embed the rendered HTML fragment in a <div>
        // element.
        const container = document.createElement('div');
        container.innerHTML =
          Mustache.render(downloadTaskTemplate, downloadDetails);
        container.id = `download-${download.gid}`;
        // Append container to document fragment before updating download
        // details and binding functions.
        const docFragment = document.createDocumentFragment();
        docFragment.appendChild(container);
        // Update download details, check the checkbox if it has been
        // selected.
        checkSelectedFiles(docFragment, download.gid, download.files);
        // Bind function to show download details.
        docFragment.querySelector(`#${container.id}`).onclick = () => {
          showDownloadDetails(download.gid);
        };
        // Bind functions to start/ pause button and stop button.
        const startOrPauseButton =
          docFragment.querySelector(`#download-startOrPause-${download.gid}`);
        startOrPauseButton.onclick = () => {
          forcePauseDownload(download.gid);
        };
        const stopButton =
          docFragment.querySelector(`#download-stop-${download.gid}`);
        stopButton.onclick = () => {
          stopDownload(download.gid);
        };
        // Append document fragment to active downloads list.
        activeDownloadsElement.appendChild(docFragment);
      });
    } catch (error) {
      showErrorMessage('Unable to get active downloads.');
    }
  };

  /**
   * Gets waiting download tasks. At most 1000 waiting downloads will be
   * retrieved.
   *
   * @async
   */
  const getWaitingDownloads = async () => {
    try {
      const result = await aria2Client({
        rpcEndpoint,
        authToken: rpcAuthToken,
        method: 'aria2.tellWaiting',
        parameters: [
          // Start from beginning, offset is zero.
          0,
          // Get at most 1000 waiting download tasks.
          1000
        ]
      });
      result.forEach((download) => {
        // Extract paths of files.
        const fileInfos = [];
        download.files.forEach((file) => {
          fileInfos.push({
            fileName: file.path
          });
        });
        // Define download task details for rendering.
        const uploadSpeed =
          speedInMbps(parseInt(download.uploadSpeed, RADIX_DECIMAL));
        const downloadSpeed =
          speedInMbps(parseInt(download.downloadSpeed, RADIX_DECIMAL));
        const progressPercentage =
          Number((download.completedLength / download.totalLength) * 100)
            .toFixed(2);
        const downloadDetails = {
          gid: download.gid,
          uploadSpeed: `${uploadSpeed} Mb/s`,
          downloadSpeed: `${downloadSpeed} Mb/s`,
          completePercentage: `${progressPercentage} %`,
          status: download.status,
          downloadFiles: fileInfos,
          canBePaused: true,
          canBeUpdated: true
        };
        // Render download task, embed the rendered HTML fragment in a <div>
        // element.
        const container = document.createElement('div');
        container.innerHTML =
          Mustache.render(downloadTaskTemplate, downloadDetails);
        container.id = `download-${download.gid}`;
        // Append container to document fragment before updating download
        // details and binding functions.
        const docFragment = document.createDocumentFragment();
        docFragment.appendChild(container);
        // Update download details, check the checkbox if it has been
        // selected.
        checkSelectedFiles(docFragment, download.gid, download.files);
        // Bind function to show download details.
        docFragment.querySelector(`#${container.id}`).onclick = () => {
          showDownloadDetails(download.gid);
        };
        // Bind functions to start/ pause button and stop button.
        const startOrPauseButton =
          docFragment.querySelector(`#download-startOrPause-${download.gid}`);
        // If download task is being paused, the button will resume
        // download process, otherwise show error message.
        startOrPauseButton.onclick = () => {
          if (download.status === 'paused') {
            resumeDownload(download.gid);
          } else {
            showErrorMessage('Cannot start non-paused download task.');
          }
        };
        const stopButton =
          docFragment.querySelector(`#download-stop-${download.gid}`);
        stopButton.onclick = () => {
          stopDownload(download.gid);
        };
        // Bind functions to buttons for select or unselect all files, and
        // button for updating download task.
        const selectAllButton = docFragment.querySelector(
          `#download-${download.gid}-select-all-button`);
        selectAllButton.onclick = () => {
          selectAllFiles(download.gid);
        };
        const unselectAllButton = docFragment.querySelector(
          `#download-${download.gid}-unselect-all-button`);
        unselectAllButton.onclick = () => {
          unselectAllFiles(download.gid);
        };
        const saveButton = docFragment.querySelector(
          `#download-${download.gid}-save-button`);
        saveButton.onclick = () => {
          updateDownload(download.gid);
        };
        // Append document fragment to inactive downloads list.
        inactiveDownloadsElement.appendChild(docFragment);
      });
    } catch (error) {
      showErrorMessage('Unable to get waiting downloads.');
    }
  };

  /**
   * Gets stopped download tasks. At most 1000 stopped download tasks will be
   * retrieved.
   *
   * @async
   */
  const getStoppedDownloads = async () => {
    try {
      const result = await aria2Client({
        rpcEndpoint,
        authToken: rpcAuthToken,
        method: 'aria2.tellStopped',
        parameters: [
          // Starts from beginning, offset is zero.
          0,
          // Get at most 1000 stopped download tasks.
          1000
        ]
      });
      result.forEach((download) => {
        // Extract paths of files.
        const fileInfos = [];
        download.files.forEach((file) => {
          fileInfos.push({
            fileName: file.path
          });
        });
        // Define download task details for rendering.
        const uploadSpeed =
          speedInMbps(parseInt(download.uploadSpeed, RADIX_DECIMAL));
        const downloadSpeed =
          speedInMbps(parseInt(download.downloadSpeed, RADIX_DECIMAL));
        const progressPercentage =
          Number((download.completedLength / download.totalLength) * 100)
            .toFixed(2);
        const downloadDetails = {
          gid: download.gid,
          uploadSpeed: `${uploadSpeed} Mb/s`,
          downloadSpeed: `${downloadSpeed} Mb/s`,
          completePercentage: `${progressPercentage} %`,
          status: download.status,
          downloadFiles: fileInfos,
          canBePaused: false,
          canBeUpdated: false
        };
        // Render download task, embed the rendered HTML fragment in a <div>
        // element
        const container = document.createElement('div');
        container.innerHTML =
          Mustache.render(downloadTaskTemplate, downloadDetails);
        container.id = `download-${download.gid}`;
        // Append container to document fragment before updating download
        // details and binding functions.
        const docFragment = document.createDocumentFragment();
        docFragment.appendChild(container);
        // Update download details, check the checkbox if it has been
        // selected.
        checkSelectedFiles(docFragment, download.gid, download.files);
        // Bind function to show download details.
        docFragment.querySelector(`#${container.id}`).onclick = () => {
          showDownloadDetails(download.gid);
        };
        // Bind functions to stop button.
        const stopButton =
          docFragment.querySelector(`#download-stop-${download.gid}`);
        stopButton.onclick = () => {
          removeDownload(download.gid);
        };
        // Append document fragment to inactive downloads list.
        inactiveDownloadsElement.appendChild(container);
      });
    } catch (error) {
      showErrorMessage('Unable to get stopped downloads.');
    }
  };

  /**
   * Gets download tasks.
   */
  const getDownloads = () => {
    clearChildren(activeDownloadsElement);
    clearChildren(inactiveDownloadsElement);
    // Getting active, waiting, and stopped download tasks can be done in
    // parallel, so await is not needed.
    getActiveDownloads();
    getWaitingDownloads();
    getStoppedDownloads();
  };

  /**
   * Bind functions to UI components events.
   */

  /**
   * Shows command panel for user to add a download task by URL.
   */
  document.getElementById('add-by-url-button').onclick = () => {
    hideErrorMessage();
    hideCommandPanels();
    addByUrlPanel.style.display = 'block';
  };

  /**
   * Handles submission of adding download task by URL.
   */
  addByUrlPanel.onsubmit = () => {
    const url = document.getElementById('new-download-url').value;
    hideErrorMessage();
    // If RPC interface endpoint has not been configured, show error message and
    // cancel the submission.
    if (rpcEndpoint === null) {
      showErrorMessage('Host and port of aria2 are not configured.');
      return false;
    }
    // If URL is empty, show error message and cancel the submission.
    if (url === '') {
      showErrorMessage('Missing URL.');
      return false;
    }
    addDownloadByUrl(url);
    // Reset the form.
    addByUrlPanel.reset();
    return false;
  };

  /**
   * Shows command panel for user to add a download task by BitTorrent file.
   */
  document.getElementById('add-by-torrent-button').onclick = () => {
    hideErrorMessage();
    hideCommandPanels();
    addByTorrentPanel.style.display = 'block';
  };

  /**
   * Handles submission of adding download task by BitTorrent file.
   */
  addByTorrentPanel.onsubmit = () => {
    const torrentFiles = document.getElementById('new-download-torrent').files;
    hideErrorMessage();
    // If RPC interface endpoint has not been configured, show error message and
    // cancel the submission.
    if (rpcEndpoint === null) {
      showErrorMessage('Host and port of aria2 are not configured.');
      return false;
    }
    // If no files has been selected, show error message and cancel the
    // submission.
    if (torrentFiles.length === 0) {
      showErrorMessage('Missing BitTorrent file.');
      return false;
    }
    const torrentFile = torrentFiles[0];
    const fileReader = new window.FileReader();
    fileReader.onload = (event) => {
      let fileInBase64 = event.target.result;
      // Only the file content in Base64 encoding is needed.
      fileInBase64 =
        fileInBase64.substring(fileInBase64.indexOf('base64,') + 7);
      addDownloadByTorrent(fileInBase64);
      // Reset the form.
      addByTorrentPanel.reset();
    };
    fileReader.readAsDataURL(torrentFile);
    return false;
  };

  /**
   * Shows command panel for user to configure the settings.
   */
  document.getElementById('settings-button').onclick = () => {
    hideErrorMessage();
    hideCommandPanels();
    document.getElementById('settings-panel').style.display = 'block';
  };

  /**
   * Handles submission of new configurations.
   */
  document.getElementById('settings-panel').onsubmit = () => {
    const protocol = window.location.protocol;
    const host = document.getElementById('aria2-host').value;
    const port = document.getElementById('aria2-port').value;
    const token = document.getElementById('aria2-token').value;
    hideErrorMessage();
    if ((host === '') || (port === '')) {
      showErrorMessage('Missing host or port of aria2.');
      return false;
    }
    rpcEndpoint = `${protocol}//${host}:${port}/jsonrpc`;
    if (token.length > 0) {
      rpcAuthToken = `token:${token}`;
    }
    hideCommandPanels();
    // Show statistics after configuring settings.
    getStatistics();
    // Get download tasks.
    getDownloads();
    return false;
  };

  /**
   * Refreshes statistics and the list of download tasks.
   */
  document.getElementById('refresh-button').onclick = () => {
    hideErrorMessage();
    // If RPC interface endpoint has not been configured, show error message and
    // stop.
    if (rpcEndpoint === null) {
      showErrorMessage('Host and port of aria2 are not configured.');
      return;
    }
    hideCommandPanels();
    getStatistics();
    getDownloads();
  };

  // Pre-compile the download task template.
  Mustache.parse(downloadTaskTemplate);
})();
