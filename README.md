# Remote #

## Description ##

A simple web UI of [aria2](http://aria2.sourceforge.net/).

## Requirements ##

* aria2 (`>=1.18.5`).
* A web browser (Microsoft Edge, Internet Explorer 11, Firefox, etc.).

## Installation ##

0. Deploy the project to the web server.
1. Open a web browser and visit where Remote is deployed.

## Usage ##

RPC interface of aria2 must first be enabled. For example, in the configuration file aria2:

```
# RPC interface options.
enable-rpc=true
rpc-allow-origin-all=true
rpc-listen-all=true
rpc-listen-port=8080
rpc-secret=your-own-secret
```

In Remote, enter the host, port (`rpc-listen-port` value) and RPC secret authorization token (`rpc-secret` value), then click Save button. Remote will now try to connect to aria2 and list all download tasks.

To add download task by URL, click on Add by URL button. To add download task by torrent file, click on Add by torrent file button. To alter the connection settings, click on Settings button.

Remote does not update the statistics automatically, click Refresh button to check the latest statistics shown on screen.

To pause or stop a download, click on the corresponding button next to the download task.

To download some of the files from a multi-file torrent file, first pause the active download task, select the files to be downloaded, click Save, and click Start button to resume the download task.

## Examples ##

Assuming RPC interface of aria2 is enabled, the computer running aria2 is at `192.168.1.200`, listening for incoming connection on port `8080` and secured with authentication token `secret`:

* Enter `192.168.1.200` into the Host field.
* Enter `8080` into the Port field.
* Enter `secret` into the Token field.
* Click Save button.

The version number of aria2, global upload speed, global download speed and download tasks are listed on the page.

## Known issues ##

* (None)

## TODO ##

* Separate controller from view.
* Better UI.

## License ##

[The BSD 3-Clause License](http://opensource.org/licenses/BSD-3-Clause)
