(function(){
  "use strict";
  
  // Endpoint of RPC interface of aria2.
  var rpcEndpoint = null,
  
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
      window.console.log("To be implemented - show download details.");
    },
    
    /*
      Core.
    */
    
    // Add download task by URL.
    addDownloadByUrl = function(url){
      window.console.log(url);
      window.console.log("To be implemented.");
    },
    
    // Add download task by BitTorrent file.
    addDownloadByTorrent = function(fileInBase64){
      window.console.log(fileInBase64);
      window.console.log("To be implemented.");
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
    
    stopDownload = function(){
      window.console.log("To be implemented - stop download.");
    },
    
    removeDownload = function(){
      window.console.log("To be implemented - remove download.");
    },
    
    updateDownload = function(){
      window.console.log("To be implemented - update download.");
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
            // Append container to active downloads list.
            activeDownloads.appendChild(container);
            // Bind functions to start/ pause button and stop button.
            startOrPauseButton = 
              document.getElementById("download-startOrPause-" + download.gid);
            startOrPauseButton.onclick = function(){
              forcePauseDownload(download.gid);
            };
            stopButton = 
              document.getElementById("download-stop-" + download.gid);
            stopButton.onclick = function(){
              stopDownload(download.gid);
            };
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
              canBeUpdated: true
            };
            // Render download task, embed the rendered string (in HTML) in a 
            // container.
            downloadTask = 
              Mustache.render(downloadTaskTemplate, downloadDetails);
            container.innerHTML = downloadTask;
            container.id = "download-" + download.gid;
            // Append container to inactive downloads list.
            inactiveDownloads.appendChild(container);
            // Bind functions to start/ pause button and stop button.
            startOrPauseButton = 
              document.getElementById("download-startOrPause-" + download.gid);
            // If download task is being paused, the button will resume 
            // download process, otherwise show error message.
            startOrPauseButton.onclick = function(){
              if(download.status === "paused"){
                resumeDownload(download.gid);
                getDownloads();
              }else{
                showErrorMessage("Cannot start non-paused download task.");
              }
            };
            stopButton = 
              document.getElementById("download-stop-" + download.gid);
            stopButton.onclick = function(){
              stopDownload(download.gid);
              getDownloads();
            };
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
              canBePaused: false,
              canBeUpdated: false
            };
            // Render download task, embed the rendered string (in HTML) in a 
            // container.
            downloadTask = 
              Mustache.render(downloadTaskTemplate, downloadDetails);
            container.innerHTML = downloadTask;
            container.id = "download-" + download.gid;
            // Append container to inactive downloads list.
            inactiveDownloads.appendChild(container);
            // Bind functions to stop button.
            stopButton = 
              document.getElementById("download-stop-" + download.gid);
            stopButton.onclick = function(){
              removeDownload(download.gid);
              getDownloads();
            };
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
  };
  
  // Refresh list of download tasks.
  document.getElementById("refresh-button").onclick = function(){
    hideErrorMessage();
    // If RPC interface endpoint has not been configured, show error message and
    // stop.
    if(rpcEndpoint === null){
      showErrorMessage("Host and port of aria2 are not configured.");
      return;
    }
    getDownloads();
  };
  
  // Pre-compile download task template.
  Mustache.parse(downloadTaskTemplate);
}());