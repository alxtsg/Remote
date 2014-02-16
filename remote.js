(function(){
  "use strict";
  
  // Reference to external libraries (base64-min.js).
  var Base64 = window.Base64,
  
    // Reference to external libraries (mustache.js).
    Mustache = window.Mustache,
    
    // Endpoint of RPC interface of aria2.
    rpcEndpoint = null,
  
    // Credentials for authentication with aria2 RPC interface.
    credentials = null,
    
    // Pre-compiled download task template.
    downloadTaskTemplate = 
      document.getElementById("download-task-template").innerHTML,
      
    // Declaration of function to get download tasks.
    getDownloads = null,

    /*
      Utilities.
    */
    
    // Clear children nodes.
    clearChildren = function(node){
      while(node.hasChildNodes()){
        node.removeChild(node.firstChild);
      }
    },
    
    // Show error message.
    showErrorMessage = function(errorMessage){
      var errorMessageBox = document.getElementById("error-message");
      clearChildren(errorMessageBox);
      errorMessageBox.appendChild(document.createTextNode(errorMessage));
      errorMessageBox.style.display = "block";
    },
    
    // Hide error message.
    hideErrorMessage = function(){
      document.getElementById("error-message").style.display = "none";
    },
    
    // Send request to aria2 RPC interface.
    xhrHelper = function(requestBody, successCallback, errorCallback){
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function(){
        if(xhr.readyState === 4){
          if(xhr.status === 200){
            successCallback(JSON.parse(xhr.responseText));
          }else{
            errorCallback();
          }
        }
      };
      xhr.open("POST", rpcEndpoint);
      if(credentials.length > 0){
        xhr.setRequestHeader("Authorization", "Basic " + credentials);
      }
      xhr.withCredentials = true;
      xhr.send(JSON.stringify(requestBody));
    },
    
    // Hide all command panels.
    hideCommandPanels = function(){
      var panels = document.querySelectorAll(".command-panel"),
        i = 0;
      while(i < panels.length){
        panels[i].style.display = "none";
        i += 1;
      }
    },
    
    // Clear active downloads.
    clearActiveDownloads = function(){
      clearChildren(document.getElementById("active-downloads"));
    },
    
    // Clear inactive downloads.
    clearInactiveDownloads = function(){
      clearChildren(document.getElementById("inactive-downloads"));
    },
    
    // Show download details of a download specified with GID.
    showDownloadDetails = function(gid){
      var details = document.querySelectorAll("section.download-details"),
        index = 0,
        detailsId = null;
      while(index < details.length){
        detailsId = "download-details-" + gid;
        if(details[index].id === detailsId){
          details[index].style.display = "block";
        }else{
          details[index].style.display = "none";
        }
        index += 1;
      }
    },
    
    // Check the checkboxes in download details which the corresponding files 
    // has been selected.
    checkSelectedFiles = function(docFragment, gid, files){
      var downloadFiles = docFragment.querySelectorAll(
        "#download-files-" + gid + " input[type='checkbox']");
      files.forEach(function(file, index){
        if(file.selected === "true"){
          downloadFiles[index].checked = true;
        }else{
          downloadFiles[index].checked = false;
        }
      });
    },
    
    // Select all files in a download task specified by GID.
    selectAllFiles = function(gid){
      var files = document.querySelectorAll(
        "#download-files-" + gid + " input[type='checkbox']"),
        index = 0;
      while(index < files.length){
        files[index].checked = true;
        index += 1;
      }
    },
    
    // Unselected all files in a download task specified by GID.
    unselectAllFiles = function(gid){
      var files = document.querySelectorAll(
        "#download-files-" + gid + " input[type='checkbox']"),
        index = 0;
      while(index < files.length){
        files[index].checked = false;
        index += 1;
      }
    },
    
    /*
      Core.
    */
    
    // Add download task by URL.
    addDownloadByUrl = function(url){
      var requestBody = {
        id: Date.now(),
        jsonrpc: "2.0",
        method: "aria2.addUri",
        params: [[url]]
        },
        successCallback = function(){
          getDownloads();
        },
        errorCallback = function(){
          showErrorMessage("Unable to add download task by URL.");
        };
      xhrHelper(requestBody, successCallback, errorCallback);
    },
    
    // Add download task by BitTorrent file.
    addDownloadByTorrent = function(fileInBase64){
      var requestBody = {
        id: Date.now(),
        jsonrpc: "2.0",
        method: "aria2.addTorrent",
        params: [fileInBase64]
        },
        successCallback = function(){
          getDownloads();
        },
        errorCallback = function(){
          showErrorMessage("Unable to add download task by BitTorrent file.");
        };
      xhrHelper(requestBody, successCallback, errorCallback);
    },
    
    // Get statistics.
    getStatistics = function(){
      // Get version.
      (function(){
        var requestBody = {
          id: Date.now(),
          jsonrpc: "2.0",
          method: "aria2.getVersion"
          },
          successCallback = function(response){
            var version = document.getElementById("aria2-version");
            clearChildren(version);
            version.appendChild(
              document.createTextNode(response.result.version));
          },
          errorCallback = function(){
            showErrorMessage("Unable to get aria2 version.");
          };
        xhrHelper(requestBody, successCallback, errorCallback);
      }());
      // Get global traffic.
      (function(){
        var requestBody = {
          id: Date.now(),
          jsonrpc: "2.0",
          method: "aria2.getGlobalStat"
          },
          successCallback = function(response){
            var uploadSpeed = document.getElementById("global-upload-speed"),
              downloadSpeed = document.getElementById("global-download-speed"),
              uploadSpeedInKbps = null,
              downloadSpeedInKbps = null;
            clearChildren(uploadSpeed);
            clearChildren(downloadSpeed);
            uploadSpeedInKbps = 
              (Number(response.result.uploadSpeed) / 1000 * 8).toFixed(2);
            downloadSpeedInKbps = 
              (Number(response.result.downloadSpeed) / 1000 * 8).toFixed(2);
            uploadSpeed.appendChild(
              document.createTextNode(uploadSpeedInKbps + " kb/s"));
            downloadSpeed.appendChild(
              document.createTextNode(downloadSpeedInKbps + " kb/s"));
          },
          errorCallback = function(){
            showErrorMessage("Unable to get global traffic statistics.");
          };
        xhrHelper(requestBody, successCallback, errorCallback);
      }());
    },
    
    // Force pause download task specified by GID.
    forcePauseDownload = function(gid){
      var requestBody = {
        id: Date.now(),
        jsonrpc: "2.0",
        method: "aria2.forcePause",
        params: [gid]
        },
        successCallback = function(){
          getDownloads();
        },
        errorCallback = function(){
          showErrorMessage("Unable to pause download.");
        };
      xhrHelper(requestBody, successCallback, errorCallback);
    },
    
    // Resume paused download task specified by GID.
    resumeDownload = function(gid){
      var requestBody = {
        id: Date.now(),
        jsonrpc: "2.0",
        method: "aria2.unpause",
        params: [gid]
        },
        successCallback = function(){
          getDownloads();
        },
        errorCallback = function(){
          showErrorMessage("Unable to resume download.");
        };
      xhrHelper(requestBody, successCallback, errorCallback);
    },
    
    // Stop download task specified by GID.
    stopDownload = function(gid){
      var requestBody = {
        id: Date.now(),
        jsonrpc: "2.0",
        method: "aria2.forceRemove",
        params: [gid]
        },
        successCallback = function(){
          getDownloads();
        },
        errorCallback = function(){
          showErrorMessage("Unable to stop download.");
        };
      xhrHelper(requestBody, successCallback, errorCallback);
    },
    
    // Remove download task specified by GID.
    removeDownload = function(gid){
      var requestBody = {
        id: Date.now(),
        jsonrpc: "2.0",
        method: "aria2.removeDownloadResult",
        params: [gid]
        },
        successCallback = function(){
          getDownloads();
        },
        errorCallback = function(){
          showErrorMessage("Unable to remove download.");
        };
      xhrHelper(requestBody, successCallback, errorCallback);
    },

    // Update download task specified by GID.
    updateDownload = function(gid){
      var files,
        selectedFileIndices = [],
        selectedFileIndicesString = null,
        requestBody = null,
        successCallBack = function(){
          getDownloads();
        },
        errorCallback = function(){
          showErrorMessage("Unable to update download.");
        };
      // Get indices of selected files.
      files = Array.prototype.slice.call(
        document.getElementById("download-files-" + gid).querySelectorAll(
          "input[type='checkbox']"));
      files.forEach(function(file, index){
        if(file.checked){
          // Note that the file index used in aria2 begins from 1, not 0.
          selectedFileIndices.push(index + 1);
        }
      });
      selectedFileIndicesString = JSON.stringify(selectedFileIndices);
      selectedFileIndicesString = selectedFileIndicesString.slice(
        1, selectedFileIndicesString.length - 1);
      requestBody = {
        jsonrpc: "2.0",
        method: "aria2.changeOption",
        id: Date.now(),
        params: [gid, {"select-file": selectedFileIndicesString}]
      };
      xhrHelper(requestBody, successCallBack, errorCallback);
    },
    
    // Get active download tasks.
    getActiveDownloads = function(){
      var requestBody = {
        id: Date.now(),
        jsonrpc: "2.0",
        method: "aria2.tellActive"
        },
        successCallback = function(response){
          var activeDownloads = document.getElementById("active-downloads");
          response.result.forEach(function(download){
            var fileInfos = [],
              downloadDetails = null,
              downloadTask = null,
              docFragment = document.createDocumentFragment(),
              container = document.createElement("div"),
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
                " kb/s",
              downloadSpeed: ((download.downloadSpeed / 1000 * 8).toFixed(2)) +
                " kb/s",
              completePercentage: 
                (((download.completedLength / download.totalLength) 
                  * 100).toFixed(2)) + " %",
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
            container.id = "download-" + download.gid;
            // Append container to document fragment before updating download 
            // details and binding functions.
            docFragment.appendChild(container);
            // Update download details, check the checkbox if it has been 
            // selected.
            checkSelectedFiles(docFragment, download.gid, download.files);
            // Bind function to show download details.
            docFragment.querySelector("#" + container.id).onclick = function(){
              showDownloadDetails(download.gid);
            };
            // Bind functions to start/ pause button and stop button.
            startOrPauseButton = docFragment.querySelector(
              "#download-startOrPause-" + download.gid);
            startOrPauseButton.onclick = function(){
              forcePauseDownload(download.gid);
            };
            stopButton = docFragment.querySelector(
              "#download-stop-" + download.gid);
            stopButton.onclick = function(){
              stopDownload(download.gid);
            };
            // Append document fragment to active downloads list.
            activeDownloads.appendChild(docFragment);
          });
        },
        errorCallback = function(){
          showErrorMessage("Unable to get active downloads.");
        };
      xhrHelper(requestBody, successCallback, errorCallback);
    },
    
    // Get waiting download tasks.
    getWaitingDownloads = function(){
      var requestBody = {
        id: Date.now(),
        jsonrpc: "2.0",
        method: "aria2.tellWaiting",
        params: [0, 1000]
        },
        successCallback = function(response){
          var inactiveDownloads = document.getElementById("inactive-downloads");
          response.result.forEach(function(download){
            var fileInfos = [],
              downloadDetails = null,
              downloadTask = null,
              docFragment = document.createDocumentFragment(),
              container = document.createElement("div"),
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
                " kb/s",
              downloadSpeed: ((download.downloadSpeed / 1000 * 8).toFixed(2)) +
                " kb/s",
              completePercentage: 
                (((download.completedLength / download.totalLength) 
                  * 100).toFixed(2)) + " %",
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
            container.id = "download-" + download.gid;
            // Append container to document fragment before updating download 
            // details and binding functions.
            docFragment.appendChild(container);
            // Update download details, check the checkbox if it has been 
            // selected.
            checkSelectedFiles(docFragment, download.gid, download.files);
            // Bind function to show download details.
            docFragment.querySelector("#" + container.id).onclick = function(){
              showDownloadDetails(download.gid);
            };
            // Bind functions to start/ pause button and stop button.
            startOrPauseButton = docFragment.querySelector(
              "#download-startOrPause-" + download.gid);
            // If download task is being paused, the button will resume 
            // download process, otherwise show error message.
            startOrPauseButton.onclick = function(){
              if(download.status === "paused"){
                resumeDownload(download.gid);
              }else{
                showErrorMessage("Cannot start non-paused download task.");
              }
            };
            stopButton = 
              docFragment.querySelector("#download-stop-" + download.gid);
            stopButton.onclick = function(){
              stopDownload(download.gid);
            };
            // Bind functions to buttons for select or unselect all files, and 
            // button for updating download task.
            selectAllButton = docFragment.querySelector(
              "#download-" + download.gid + "-select-all-button");
            selectAllButton.onclick = function(){
              selectAllFiles(download.gid);
            };
            unselectAllButton = docFragment.querySelector(
              "#download-" + download.gid + "-unselect-all-button");
            unselectAllButton.onclick = function(){
              unselectAllFiles(download.gid);
            };
            saveButton = docFragment.querySelector(
              "#download-" + download.gid + "-save-button");
            saveButton.onclick = function(){
              updateDownload(download.gid);
            };
            // Append document fragment to inactive downloads list.
            inactiveDownloads.appendChild(docFragment);
          });
        },
        errorCallback = function(){
          showErrorMessage("Unable to get waiting downloads.");
        };
      xhrHelper(requestBody, successCallback, errorCallback);
    },
    
    // Get stopped download tasks.
    getStoppedDownloads = function(){
      var requestBody = {
        id: Date.now(),
        jsonrpc: "2.0",
        method: "aria2.tellStopped",
        params: [0, 1000]
        },
        successCallback = function(response){
          var inactiveDownloads = document.getElementById("inactive-downloads");
          response.result.forEach(function(download){
            var fileInfos = [],
              downloadDetails = null,
              downloadTask = null,
              docFragment = document.createDocumentFragment(),
              container = document.createElement("div"),
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
                " kb/s",
              downloadSpeed: ((download.downloadSpeed / 1000 * 8).toFixed(2)) +
                " kb/s",
              completePercentage: 
                (((download.completedLength / download.totalLength) 
                  * 100).toFixed(2)) + " %",
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
            container.id = "download-" + download.gid;
            // Append container to document fragment before updating download 
            // details and binding functions.
            docFragment.appendChild(container);
            // Update download details, check the checkbox if it has been 
            // selected.
            checkSelectedFiles(docFragment, download.gid, download.files);
            // Bind function to show download details.
            docFragment.querySelector("#" + container.id).onclick = function(){
              showDownloadDetails(download.gid);
            };
            // Bind functions to stop button.
            stopButton = 
              docFragment.querySelector("#download-stop-" + download.gid);
            stopButton.onclick = function(){
              removeDownload(download.gid);
            };
            // Append document fragment to inactive downloads list.
            inactiveDownloads.appendChild(container);
          });
        },
        errorCallback = function(){
          showErrorMessage("Unable to get stopped downloads.");
        };
      xhrHelper(requestBody, successCallback, errorCallback);
    };
    
  // Get download tasks.
  getDownloads = function(){
    clearActiveDownloads();
    getActiveDownloads();
    clearInactiveDownloads();
    getWaitingDownloads();
    getStoppedDownloads();
  };
  
  /*
    Binding user interface events to functions.
  */
  
  // Show command panel for user to add download task by URL.
  document.getElementById("add-by-url-button").onclick = function(){
    hideErrorMessage();
    hideCommandPanels();
    document.getElementById("add-by-url-panel").style.display = "block";
  };
  
  // Handles submission of adding download task by URL.
  document.getElementById("add-by-url-panel").onsubmit = function(){
    var url = document.getElementById("new-download-url").value;
    hideErrorMessage();
    // If RPC interface endpoint has not been configured, show error message and
    // stop.
    if(rpcEndpoint === null){
      showErrorMessage("Host and port of aria2 are not configured.");
      return false;
    }
    // If URL is empty, show error message and stop.
    if(url === ""){
      showErrorMessage("Missing URL.");
      return false;
    }
    addDownloadByUrl(url);
    // Clear URL in the input box.
    document.getElementById("new-download-url").value = "";
    return false;
  };
  
  // Show command panel for user to add download task by BitTorrent file.
  document.getElementById("add-by-torrent-button").onclick = function(){
    hideErrorMessage();
    hideCommandPanels();
    document.getElementById("add-by-torrent-panel").style.display = "block";
  };
  
  // Handles submission of adding download task by BitTorrent file.
  document.getElementById("add-by-torrent-panel").onsubmit = function(){
    var torrentFiles = document.getElementById("new-download-torrent").files,
      torrentFile = null,
      fileReader = null;
    hideErrorMessage();
    // If RPC interface endpoint has not been configured, show error message and
    // stop.
    if(rpcEndpoint === null){
      showErrorMessage("Host and port of aria2 are not configured.");
      return false;
    }
    // If no files has been selected, show error message and stop.
    if(torrentFiles.length === 0){
      showErrorMessage("Missing BitTorrent file.");
      return false;
    }
    torrentFile = torrentFiles[0];
    fileReader = new window.FileReader();
    fileReader.onload = function(event){
      var fileInBase64 = event.target.result;
      fileInBase64 = 
        fileInBase64.substring(fileInBase64.indexOf("base64,") + 7);
      addDownloadByTorrent(fileInBase64);
    };
    fileReader.readAsDataURL(torrentFile);
    return false;
  };
  
  // Show command panel for user to configure the settings.
  document.getElementById("settings-button").onclick = function(){
    hideErrorMessage();
    hideCommandPanels();
    document.getElementById("settings-panel").style.display = "block";
  };
  
  // Handles saving of new configurations.
  document.getElementById("settings-panel").onsubmit = function(){
    var protocol = window.location.protocol,
      host = document.getElementById("aria2-host").value,
      port = document.getElementById("aria2-port").value,
      user = document.getElementById("aria2-username").value,
      password = document.getElementById("aria2-password").value;
    hideErrorMessage();
    if(host === "" || port === ""){
      showErrorMessage("Missing host or port of aria2.");
      return false;
    }
    rpcEndpoint = protocol + "//" + host + ":" + port + "/jsonrpc";
    if(user.length > 0 && password.length > 0){
      credentials = Base64.encode(user + ":" + password);
    }
    hideCommandPanels();
    // Show statistics after configuring settings.
    document.getElementById("statistics-panel").style.display = "block";
    getStatistics();
    // Get download tasks.
    getDownloads();
    return false;
  };
  
  // Show command panel for displaying statistics.
  document.getElementById("statistics-button").onclick = function(){
    hideErrorMessage();
    // If RPC interface endpoint has not been configured, show error message and
    // stop.
    if(rpcEndpoint === null){
      showErrorMessage("Host and port of aria2 are not configured.");
      return;
    }
    hideCommandPanels();
    document.getElementById("statistics-panel").style.display = "block";
    getStatistics();
  };
  
  // Refresh statistics and list of download tasks.
  document.getElementById("refresh-button").onclick = function(){
    hideErrorMessage();
    // If RPC interface endpoint has not been configured, show error message and
    // stop.
    if(rpcEndpoint === null){
      showErrorMessage("Host and port of aria2 are not configured.");
      return;
    }
    getStatistics();
    getDownloads();
  };
  
  // Pre-compile download task template.
  Mustache.parse(downloadTaskTemplate);
}());