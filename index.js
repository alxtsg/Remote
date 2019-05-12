'use strict';

(() => {
  const Mustache = window.Mustache;

  const RADIX_DECIMAL = 10;

  const errorMessageElement = document.getElementById('error-message');
  const activeDownloadsElement = document.getElementById('active-downloads');
  const inactiveDownloadsElement =
    document.getElementById('inactive-downloads');
  const downloadTaskTemplate =
    document.getElementById('download-task-template').innerHTML;

  // The aria2 RPC endpoint.
  let rpcEndpoint = null;

  // The aria2 RPC interface authentication token.
  let rpcAuthenticationToken = null;

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
   * XMLHttpRequest helper function, helps sending request to aria2 RPC
   * interface.
   *
   * @param {string} method RPC method.
   * @param {Array} parameters RPC method parameters. Do not include RPC
   *                           authentication token as it is being added
   *                           automatically.
   * @param {Function} successCallback Callback function to be invoked when
   *                                   request has succeed. Expects first
   *                                   parameter to be a JSON object which is
   *                                   the response.
   * @param {Function} errorCallback Callback function to be invoked when
   *                                 request failed. Expects first parameter
   *                                 to be a JSON object which is the
   *                                 response.
   */
  const xhrHelper = (method, parameters, successCallback, errorCallback) => {
    const xhr = new XMLHttpRequest();
    const requestBody = {
      jsonrpc: '2.0',
      method: method,
      params: parameters,
      id: Date.now()
    };
    // If RPC authentication token is specified, add it to the head of array
    // of parameters.
    if (rpcAuthenticationToken !== null) {
      requestBody.params =
        [rpcAuthenticationToken].concat(requestBody.params);
    }
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          successCallback(JSON.parse(xhr.responseText));
        } else {
          errorCallback(JSON.parse(xhr.responseText));
        }
      }
    };
    xhr.open('POST', rpcEndpoint);
    xhr.send(JSON.stringify(requestBody));
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
   * @param {string} url File URL.
   */
  const addDownloadByUrl = (url) => {
    const parameters = [
      // As shown in the API document, the URL must be presented as an array,
      // instead of a string, even if there is only one URL.
      [url]
    ];
    xhrHelper(
      'aria2.addUri',
      parameters,
      () => {
        getDownloads();
      },
      () => {
        showErrorMessage('Unable to add download task by URL.');
      }
    );
  };

  /**
   * Adds a download task by BitTorrent file.
   *
   * @param {string} fileInBase64 The BitTorrent file encoded in Base64
   *                              representation.
   */
  const addDownloadByTorrent = (fileInBase64) => {
    const parameters = [
      fileInBase64
    ];
    xhrHelper(
      'aria2.addTorrent',
      parameters,
      () => {
        getDownloads();
      },
      () => {
        showErrorMessage('Unable to add download task by BitTorrent file.');
      }
    );
  };

  /**
   * Gets statistics.
   */
  const getStatistics = () => {
    // Get version.
    const getVersionParameters = [];
    xhrHelper(
      'aria2.getVersion',
      getVersionParameters,
      (response) => {
        document.getElementById('aria2-version').textContent =
          response.result.version;
      },
      () => {
        showErrorMessage('Unable to get aria2 version.');
      }
    );
    // Get global traffic.
    const getGlobalTrafficParameters = [];
    xhrHelper(
      'aria2.getGlobalStat',
      getGlobalTrafficParameters,
      (response) => {
        const uploadSpeed =
          speedInMbps(parseInt(response.result.uploadSpeed, RADIX_DECIMAL));
        const downloadSpeed =
          speedInMbps(parseInt(response.result.downloadSpeed, RADIX_DECIMAL));
        document.getElementById('global-upload-speed').textContent =
          `${uploadSpeed} Mb/s`;
        document.getElementById('global-download-speed').textContent =
          `${downloadSpeed} Mb/s`;
      },
      () => {
        showErrorMessage('Unable to get global traffic statistics.');
      }
    );
  };

  /**
   * Forces a download task to be paused.
   *
   * @param {string} gid GID of the download task.
   */
  const forcePauseDownload = (gid) => {
    const parameters = [
      gid
    ];
    xhrHelper(
      'aria2.forcePause',
      parameters,
      () => {
        getDownloads();
      },
      () => {
        showErrorMessage('Unable to pause download.');
      }
    );
  };

  /**
   * Resumes a download task.
   *
   * @param {string} gid GID of the download task.
   */
  const resumeDownload = (gid) => {
    const parameters = [
      gid
    ];
    xhrHelper(
      'aria2.unpause',
      parameters,
      () => {
        getDownloads();
      },
      () => {
        showErrorMessage('Unable to resume download.');
      }
    );
  };

  /**
   * Stops a download task.
   *
   * @param {string} gid GID of the download task.
   */
  const stopDownload = (gid) => {
    const parameters = [
      gid
    ];
    xhrHelper(
      'aria2.forceRemove',
      parameters,
      () => {
        getDownloads();
      },
      () => {
        showErrorMessage('Unable to stop download.');
      }
    );
  };

  /**
   * Removes a download task.
   *
   * @param {string} gid GID of the download task.
   */
  const removeDownload = (gid) => {
    const parameters = [
      gid
    ];
    xhrHelper(
      'aria2.removeDownloadResult',
      parameters,
      () => {
        getDownloads();
      },
      () => {
        showErrorMessage('Unable to remove download.');
      }
    );
  };

  /**
   * Updates a download task.
   *
   * @param {string} gid GID of the download task.
   */
  const updateDownload = (gid) => {
    // Get indices of selected files.
    const files = Array.prototype.slice.call(
      document.getElementById(`download-files-${gid}`)
        .querySelectorAll('input[type="checkbox"]'));
    const selectedFileIndices = [];
    files.forEach((file, index) => {
      if (file.checked) {
        // Note that the file index used in aria2 begins from 1, not 0.
        selectedFileIndices.push(index + 1);
      }
    });
    const parameters = [
      gid,
      {
        'select-file': selectedFileIndices.join(',')
      }
    ];
    xhrHelper(
      'aria2.changeOption',
      parameters,
      () => {
        getDownloads();
      },
      () => {
        showErrorMessage('Unable to update download.');
      }
    );
  };

  /**
   * Gets active download tasks.
   */
  const getActiveDownloads = () => {
    const parameters = [];
    xhrHelper(
      'aria2.tellActive',
      parameters,
      (response) => {
        response.result.forEach((download) => {
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
      },
      () => {
        showErrorMessage('Unable to get active downloads.');
      }
    );
  };

  /**
   * Gets waiting download tasks. This function assumes no more than 1000
   * download tasks are waiting.
   */
  const getWaitingDownloads = () => {
    const parameters = [
      // Start from beginning, offset is zero.
      0,
      // Get at most 1000 waiting download tasks.
      1000
    ];
    xhrHelper(
      'aria2.tellWaiting',
      parameters,
      (response) => {
        response.result.forEach((download) => {
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
      },
      () => {
        showErrorMessage('Unable to get waiting downloads.');
      }
    );
  };

  /**
   * Gets stopped download tasks. This function assumes no more than 1000
   * download tasks have been stopped.
   */
  const getStoppedDownloads = () => {
    const parameters = [
      // Starts from beginning, offset is zero.
      0,
      // Get at most 1000 stopped download tasks.
      1000
    ];
    xhrHelper(
      'aria2.tellStopped',
      parameters,
      (response) => {
        response.result.forEach((download) => {
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
      },
      () => {
        showErrorMessage('Unable to get stopped downloads.');
      }
    );
  };

  /**
   * Gets download tasks.
   */
  const getDownloads = () => {
    clearChildren(activeDownloadsElement);
    getActiveDownloads();
    clearChildren(inactiveDownloadsElement);
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
    document.getElementById('add-by-url-panel').style.display = 'block';
  };

  /**
   * Handles submission of adding download task by URL.
   */
  document.getElementById('add-by-url-panel').onsubmit = () => {
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
    // Clear URL in the input box.
    document.getElementById('new-download-url').value = '';
    return false;
  };

  /**
   * Shows command panel for user to add a download task by BitTorrent file.
   */
  document.getElementById('add-by-torrent-button').onclick = () => {
    hideErrorMessage();
    hideCommandPanels();
    document.getElementById('add-by-torrent-panel').style.display = 'block';
  };

  /**
   * Handles submission of adding download task by BitTorrent file.
   */
  document.getElementById('add-by-torrent-panel').onsubmit = () => {
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
      rpcAuthenticationToken = `token:${token}`;
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
