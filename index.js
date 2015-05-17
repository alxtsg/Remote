(function(){

  'use strict';

  var Mustache = window.Mustache,

    // aria2 RPC endpoint.
    rpcEndpoint = null,

    // aria2 RPC interface authentication token.
    rpcAuthenticationToken = null,

    // Download task template.
    downloadTaskTemplate =
      document.getElementById('download-task-template').innerHTML,

    // Placeholder of function which gets download tasks.
    getDownloads = null,

   /**
    * Utility functions.
    */

    /**
     * Clears children nodes of a given node.
     *
     * @param {Node} node The node whose children node wll be removed.
     */
    clearChildren = function(node){
      while(node.hasChildNodes()){
        node.removeChild(node.firstChild);
      }
    },

    /**
     * Shows error message.
     *
     * @param {String} errorMessage Error message.
     */
    showErrorMessage = function(errorMessage){
      var errorMessageBox = document.getElementById('error-message');
      clearChildren(errorMessageBox);
      errorMessageBox.appendChild(document.createTextNode(errorMessage));
      errorMessageBox.style.display = 'block';
    },

    /**
     * Hides error message.
     */
    hideErrorMessage = function(){
      document.getElementById('error-message').style.display = 'none';
    },

    /**
     * XMLHttpRequest helper function, helps sending request to aria2 RPC
     * interface.
     *
     * @param {String} method RPC method.
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
    xhrHelper = function(method, parameters, successCallback, errorCallback){
      var xhr = new XMLHttpRequest(),
        requestBody = {
          jsonrpc: '2.0',
          method: method,
          params: parameters,
          id: Date.now()
        };
      // If RPC authentication token is specified, add it to the head of array
      // of parameters.
      if(rpcAuthenticationToken !== null){
        requestBody.params =
          [rpcAuthenticationToken].concat(requestBody.params);
      }
      xhr.onreadystatechange = function(){
        if(xhr.readyState === 4){
          if(xhr.status === 200){
            successCallback(JSON.parse(xhr.responseText));
          }else{
            errorCallback(JSON.parse(xhr.responseText));
          }
        }
      };
      xhr.open('POST', rpcEndpoint);
      xhr.send(JSON.stringify(requestBody));
    },

    /**
     * Hides all command panels.
     */
    hideCommandPanels = function(){
      var panels = document.querySelectorAll('.command-panel'),
        i = 0;
      while(i < panels.length){
        panels[i].style.display = 'none';
        i += 1;
      }
    },

    /**
     * Clears the list of active downloads from screen.
     */
    clearActiveDownloads = function(){
      clearChildren(document.getElementById('active-downloads'));
    },

    /**
     * Clears the list of inactive downloads from screen.
     */
    clearInactiveDownloads = function(){
      clearChildren(document.getElementById('inactive-downloads'));
    },

    /**
     * Shows download details of a download task.
     *
     * @param {String} gid GID of the download task.
     */
    showDownloadDetails = function(gid){
      var details = document.querySelectorAll('div.download-details'),
        index = 0,
        detailsId = null;
      while(index < details.length){
        detailsId = 'download-details-' + gid;
        if(details[index].id === detailsId){
          details[index].style.display = 'block';
        }else{
          details[index].style.display = 'none';
        }
        index += 1;
      }
    },

    /**
     * Checks the checkboxes of files which are selected to be downloaded.
     *
     * @param {DocumentFragment} docFragment The DocumentFragment holding
     *                                       download details DOM tree.
     * @param {String} gid GID of the download task.
     * @param {Array} files Objects representing files in the download task.
     */
    checkSelectedFiles = function(docFragment, gid, files){
      var downloadFiles = docFragment.querySelectorAll(
        '#download-files-' + gid + ' input[type="checkbox"]');
      files.forEach(function(file, index){
        if(file.selected === 'true'){
          downloadFiles[index].checked = true;
        }else{
          downloadFiles[index].checked = false;
        }
      });
    },

    /**
     * Selects (checks) all files in a download task.
     *
     * @param {String} gid GID of the download task.
     */
    selectAllFiles = function(gid){
      var files = document.querySelectorAll(
        '#download-files-' + gid + ' input[type="checkbox"]'),
        index = 0;
      while(index < files.length){
        files[index].checked = true;
        index += 1;
      }
    },

    /**
     * Unselects (unchecks) all files in a download task.
     *
     * @param {String} gid GID of the download task.
     */
    unselectAllFiles = function(gid){
      var files = document.querySelectorAll(
        '#download-files-' + gid + ' input[type="checkbox"]'),
        index = 0;
      while(index < files.length){
        files[index].checked = false;
        index += 1;
      }
    },

   /**
    * Core functions.
    */

    /**
     * Adds a download task by URL.
     *
     * @param {String} url File URL.
     */
    addDownloadByUrl = function(url){
      var parameters = [
          // As stated in the API document, the second parameter must be an
          // array, not a string, even if we have only one URL pointing to the
          // same resource.
          [url]
        ],
        successCallback = function(){
          getDownloads();
        },
        errorCallback = function(){
          showErrorMessage('Unable to add download task by URL.');
        };
      xhrHelper('aria2.addUri', parameters, successCallback, errorCallback);
    },

    /**
     * Adds a download task by BitTorrent file.
     *
     * @param {String} fileInBase64 The BitTorrent file encoded in Base64
     *                              representation.
     */
    addDownloadByTorrent = function(fileInBase64){
      var parameters = [
          fileInBase64
        ],
        successCallback = function(){
          getDownloads();
        },
        errorCallback = function(){
          showErrorMessage('Unable to add download task by BitTorrent file.');
        };
      xhrHelper('aria2.addTorrent', parameters, successCallback, errorCallback);
    },

    /**
     * Gets statistics.
     */
    getStatistics = function(){
      // Get version.
      (function(){
        var parameters = [],
          successCallback = function(response){
            var version = document.getElementById('aria2-version');
            clearChildren(version);
            version.appendChild(
              document.createTextNode(response.result.version));
          },
          errorCallback = function(){
            showErrorMessage('Unable to get aria2 version.');
          };
        xhrHelper(
          'aria2.getVersion', parameters, successCallback, errorCallback);
      }());
      // Get global traffic.
      (function(){
        var parameters = [],
          successCallback = function(response){
            var uploadSpeed = document.getElementById('global-upload-speed'),
              downloadSpeed = document.getElementById('global-download-speed'),
              uploadSpeedInKbps = null,
              downloadSpeedInKbps = null;
            clearChildren(uploadSpeed);
            clearChildren(downloadSpeed);
            uploadSpeedInKbps =
              (Number(response.result.uploadSpeed) / 1000 * 8).toFixed(2);
            downloadSpeedInKbps =
              (Number(response.result.downloadSpeed) / 1000 * 8).toFixed(2);
            uploadSpeed.appendChild(
              document.createTextNode(uploadSpeedInKbps + ' kb/s'));
            downloadSpeed.appendChild(
              document.createTextNode(downloadSpeedInKbps + ' kb/s'));
          },
          errorCallback = function(){
            showErrorMessage('Unable to get global traffic statistics.');
          };
        xhrHelper(
          'aria2.getGlobalStat', parameters, successCallback, errorCallback);
      }());
    },

    /**
     * Forces a download task to be paused.
     *
     * @param {String} gid GID of the download task.
     */
    forcePauseDownload = function(gid){
      var parameters = [
          gid
        ],
        successCallback = function(){
          getDownloads();
        },
        errorCallback = function(){
          showErrorMessage('Unable to pause download.');
        };
      xhrHelper('aria2.forcePause', parameters, successCallback, errorCallback);
    },

    /**
     * Resumes a download task.
     *
     * @param {String} gid GID of the download task.
     */
    resumeDownload = function(gid){
      var parameters = [
          gid
        ],
        successCallback = function(){
          getDownloads();
        },
        errorCallback = function(){
          showErrorMessage('Unable to resume download.');
        };
      xhrHelper('aria2.unpause', parameters, successCallback, errorCallback);
    },

    /**
     * Stops a download task.
     *
     * @param {String} gid GID of the download task.
     */
    stopDownload = function(gid){
      var parameters = [
          gid
        ],
        successCallback = function(){
          getDownloads();
        },
        errorCallback = function(){
          showErrorMessage('Unable to stop download.');
        };
      xhrHelper(
        'aria2.forceRemove', parameters, successCallback, errorCallback);
    },

    /**
     * Removes a download task.
     *
     * @param {String} gid GID of the download task.
     */
    removeDownload = function(gid){
      var parameters = [
          gid
        ],
        successCallback = function(){
          getDownloads();
        },
        errorCallback = function(){
          showErrorMessage('Unable to remove download.');
        };
      xhrHelper('aria2.removeDownloadResult', parameters, successCallback,
        errorCallback);
    },

    /**
     * Updates a download task.
     *
     * @param {String} gid GID of the download task.
     */
    updateDownload = function(gid){
      var files = null,
        selectedFileIndices = [],
        selectedFileIndicesString = null,
        parameters = null,
        successCallBack = function(){
          getDownloads();
        },
        errorCallback = function(){
          showErrorMessage('Unable to update download.');
        };
      // Get indices of selected files.
      files = Array.prototype.slice.call(
        document.getElementById('download-files-' + gid).querySelectorAll(
          'input[type="checkbox"]'));
      files.forEach(function(file, index){
        if(file.checked){
          // Note that the file index used in aria2 begins from 1, not 0.
          selectedFileIndices.push(index + 1);
        }
      });
      selectedFileIndicesString = JSON.stringify(selectedFileIndices);
      selectedFileIndicesString = selectedFileIndicesString.slice(
        1, selectedFileIndicesString.length - 1);
      parameters = [gid, {'select-file': selectedFileIndicesString}];
      xhrHelper(
        'aria2.changeOption', parameters, successCallBack, errorCallback);
    },

    /**
     * Gets active download tasks.
     */
    getActiveDownloads = function(){
      var parameters = [],
        successCallback = function(response){
          var activeDownloads = document.getElementById('active-downloads');
          response.result.forEach(function(download){
            var fileInfos = [],
              downloadDetails = null,
              downloadTask = null,
              docFragment = document.createDocumentFragment(),
              container = document.createElement('div'),
              startOrPauseButton = null,
              stopButton = null;
            // Extract paths of files.
            download.files.forEach(function(file){
              fileInfos.push({
                fileName: file.path
              });
            });
            // Define download task details for rendering.
            downloadDetails = {
              gid: download.gid,
              uploadSpeed: ((download.uploadSpeed / 1000 * 8).toFixed(2)) +
                ' kb/s',
              downloadSpeed: ((download.downloadSpeed / 1000 * 8).toFixed(2)) +
                ' kb/s',
              completePercentage:
                ((
                  (download.completedLength / download.totalLength) * 100
                ).toFixed(2)) + ' %',
              status: download.status,
              downloadFiles: fileInfos,
              canBePaused: true,
              canBeUpdated: false
            };
            // Render download task, embed the rendered string (in HTML) in a
            // container.
            downloadTask =
              Mustache.render(downloadTaskTemplate, downloadDetails);
            container.innerHTML = downloadTask;
            container.id = 'download-' + download.gid;
            // Append container to document fragment before updating download
            // details and binding functions.
            docFragment.appendChild(container);
            // Update download details, check the checkbox if it has been
            // selected.
            checkSelectedFiles(docFragment, download.gid, download.files);
            // Bind function to show download details.
            docFragment.querySelector('#' + container.id).onclick = function(){
              showDownloadDetails(download.gid);
            };
            // Bind functions to start/ pause button and stop button.
            startOrPauseButton = docFragment.querySelector(
              '#download-startOrPause-' + download.gid);
            startOrPauseButton.onclick = function(){
              forcePauseDownload(download.gid);
            };
            stopButton = docFragment.querySelector(
              '#download-stop-' + download.gid);
            stopButton.onclick = function(){
              stopDownload(download.gid);
            };
            // Append document fragment to active downloads list.
            activeDownloads.appendChild(docFragment);
          });
        },
        errorCallback = function(){
          showErrorMessage('Unable to get active downloads.');
        };
      xhrHelper('aria2.tellActive', parameters, successCallback, errorCallback);
    },

    /**
     * Gets waiting download tasks. This function assumes no more than 1000
     * download tasks are waiting.
     */
    getWaitingDownloads = function(){
      var parameters = [
          // Start from beginning, offset is zero.
          0,
          // Get at most 1000 waiting download tasks.
          1000
        ],
        successCallback = function(response){
          var inactiveDownloads = document.getElementById('inactive-downloads');
          response.result.forEach(function(download){
            var fileInfos = [],
              downloadDetails = null,
              downloadTask = null,
              docFragment = document.createDocumentFragment(),
              container = document.createElement('div'),
              startOrPauseButton = null,
              stopButton = null,
              selectAllButton = null,
              unselectAllButton = null,
              saveButton = null;
            // Extract paths of files.
            download.files.forEach(function(file){
              fileInfos.push({
                fileName: file.path
              });
            });
            // Define download task details for rendering.
            downloadDetails = {
              gid: download.gid,
              uploadSpeed: ((download.uploadSpeed / 1000 * 8).toFixed(2)) +
                ' kb/s',
              downloadSpeed: ((download.downloadSpeed / 1000 * 8).toFixed(2)) +
                ' kb/s',
              completePercentage:
                ((
                  (download.completedLength / download.totalLength) * 100
                ).toFixed(2)) + ' %',
              status: download.status,
              downloadFiles: fileInfos,
              canBePaused: true,
              canBeUpdated: true
            };
            // Render download task, embed the rendered string (in HTML) in a
            // container.
            downloadTask =
              Mustache.render(downloadTaskTemplate, downloadDetails);
            container.innerHTML = downloadTask;
            container.id = 'download-' + download.gid;
            // Append container to document fragment before updating download
            // details and binding functions.
            docFragment.appendChild(container);
            // Update download details, check the checkbox if it has been
            // selected.
            checkSelectedFiles(docFragment, download.gid, download.files);
            // Bind function to show download details.
            docFragment.querySelector('#' + container.id).onclick = function(){
              showDownloadDetails(download.gid);
            };
            // Bind functions to start/ pause button and stop button.
            startOrPauseButton = docFragment.querySelector(
              '#download-startOrPause-' + download.gid);
            // If download task is being paused, the button will resume
            // download process, otherwise show error message.
            startOrPauseButton.onclick = function(){
              if(download.status === 'paused'){
                resumeDownload(download.gid);
              }else{
                showErrorMessage('Cannot start non-paused download task.');
              }
            };
            stopButton =
              docFragment.querySelector('#download-stop-' + download.gid);
            stopButton.onclick = function(){
              stopDownload(download.gid);
            };
            // Bind functions to buttons for select or unselect all files, and
            // button for updating download task.
            selectAllButton = docFragment.querySelector(
              '#download-' + download.gid + '-select-all-button');
            selectAllButton.onclick = function(){
              selectAllFiles(download.gid);
            };
            unselectAllButton = docFragment.querySelector(
              '#download-' + download.gid + '-unselect-all-button');
            unselectAllButton.onclick = function(){
              unselectAllFiles(download.gid);
            };
            saveButton = docFragment.querySelector(
              '#download-' + download.gid + '-save-button');
            saveButton.onclick = function(){
              updateDownload(download.gid);
            };
            // Append document fragment to inactive downloads list.
            inactiveDownloads.appendChild(docFragment);
          });
        },
        errorCallback = function(){
          showErrorMessage('Unable to get waiting downloads.');
        };
      xhrHelper(
        'aria2.tellWaiting', parameters, successCallback, errorCallback);
    },

    /**
     * Gets stopped download tasks. This function assumes no more than 1000
     * download tasks have been stopped.
     */
    getStoppedDownloads = function(){
      var parameters = [
          // Starts from beginning, offset is zero.
          0,
          // Get at most 1000 stopped download tasks.
          1000
        ],
        successCallback = function(response){
          var inactiveDownloads = document.getElementById('inactive-downloads');
          response.result.forEach(function(download){
            var fileInfos = [],
              downloadDetails = null,
              downloadTask = null,
              docFragment = document.createDocumentFragment(),
              container = document.createElement('div'),
              stopButton = null;
            // Extract paths of files.
            download.files.forEach(function(file){
              fileInfos.push({
                fileName: file.path
              });
            });
            // Define download task details for rendering.
            downloadDetails = {
              gid: download.gid,
              uploadSpeed: ((download.uploadSpeed / 1000 * 8).toFixed(2)) +
                ' kb/s',
              downloadSpeed: ((download.downloadSpeed / 1000 * 8).toFixed(2)) +
                ' kb/s',
              completePercentage:
                ((
                  (download.completedLength / download.totalLength) * 100
                ).toFixed(2)) + ' %',
              status: download.status,
              downloadFiles: fileInfos,
              canBePaused: false,
              canBeUpdated: false
            };
            // Render download task, embed the rendered string (in HTML) in a
            // container.
            downloadTask =
              Mustache.render(downloadTaskTemplate, downloadDetails);
            container.innerHTML = downloadTask;
            container.id = 'download-' + download.gid;
            // Append container to document fragment before updating download
            // details and binding functions.
            docFragment.appendChild(container);
            // Update download details, check the checkbox if it has been
            // selected.
            checkSelectedFiles(docFragment, download.gid, download.files);
            // Bind function to show download details.
            docFragment.querySelector('#' + container.id).onclick = function(){
              showDownloadDetails(download.gid);
            };
            // Bind functions to stop button.
            stopButton =
              docFragment.querySelector('#download-stop-' + download.gid);
            stopButton.onclick = function(){
              removeDownload(download.gid);
            };
            // Append document fragment to inactive downloads list.
            inactiveDownloads.appendChild(container);
          });
        },
        errorCallback = function(){
          showErrorMessage('Unable to get stopped downloads.');
        };
      xhrHelper(
        'aria2.tellStopped', parameters, successCallback, errorCallback);
    };

  /**
   * Gets download tasks.
   */
  getDownloads = function(){
    clearActiveDownloads();
    getActiveDownloads();
    clearInactiveDownloads();
    getWaitingDownloads();
    getStoppedDownloads();
  };

 /**
  * Bind functions to UI components events.
  */

  /**
   * Shows command panel for user to add a download task by URL.
   */
  document.getElementById('add-by-url-button').onclick = function(){
    hideErrorMessage();
    hideCommandPanels();
    document.getElementById('add-by-url-panel').style.display = 'block';
  };

  /**
   * Handles submission of adding download task by URL.
   */
  document.getElementById('add-by-url-panel').onsubmit = function(){
    var url = document.getElementById('new-download-url').value;
    hideErrorMessage();
    // If RPC interface endpoint has not been configured, show error message and
    // cancel the submission.
    if(rpcEndpoint === null){
      showErrorMessage('Host and port of aria2 are not configured.');
      return false;
    }
    // If URL is empty, show error message and cancel the submission.
    if(url === ''){
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
  document.getElementById('add-by-torrent-button').onclick = function(){
    hideErrorMessage();
    hideCommandPanels();
    document.getElementById('add-by-torrent-panel').style.display = 'block';
  };

  /**
   * Handles submission of adding download task by BitTorrent file.
   */
  document.getElementById('add-by-torrent-panel').onsubmit = function(){
    var torrentFiles = document.getElementById('new-download-torrent').files,
      torrentFile = null,
      fileReader = null;
    hideErrorMessage();
    // If RPC interface endpoint has not been configured, show error message and
    // cancel the submission.
    if(rpcEndpoint === null){
      showErrorMessage('Host and port of aria2 are not configured.');
      return false;
    }
    // If no files has been selected, show error message and cancel the
    // submission.
    if(torrentFiles.length === 0){
      showErrorMessage('Missing BitTorrent file.');
      return false;
    }
    torrentFile = torrentFiles[0];
    fileReader = new window.FileReader();
    fileReader.onload = function(event){
      var fileInBase64 = event.target.result;
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
  document.getElementById('settings-button').onclick = function(){
    hideErrorMessage();
    hideCommandPanels();
    document.getElementById('settings-panel').style.display = 'block';
  };

  /**
   * Handles submission of new configurations.
   */
  document.getElementById('settings-panel').onsubmit = function(){
    var protocol = window.location.protocol,
      host = document.getElementById('aria2-host').value,
      port = document.getElementById('aria2-port').value,
      token = document.getElementById('aria2-token').value;
    hideErrorMessage();
    if(host === '' || port === ''){
      showErrorMessage('Missing host or port of aria2.');
      return false;
    }
    rpcEndpoint = protocol + '//' + host + ':' + port + '/jsonrpc';
    if(token.length > 0){
      rpcAuthenticationToken = 'token:' + token;
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
  document.getElementById('refresh-button').onclick = function(){
    hideErrorMessage();
    // If RPC interface endpoint has not been configured, show error message and
    // stop.
    if(rpcEndpoint === null){
      showErrorMessage('Host and port of aria2 are not configured.');
      return;
    }
    hideCommandPanels();
    getStatistics();
    getDownloads();
  };

  // Pre-compile the download task template.
  Mustache.parse(downloadTaskTemplate);
}());
