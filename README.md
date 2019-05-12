# Remote #

## Description ##

A simple web client for [aria2](http://aria2.sourceforge.net/).

## Requirements ##

* aria2 (`>=1.34.0`).
* A web browser (e.g. Microsoft Edge, Mozilla Firefox, etc.).

## Installation ##

0. Deploy Remote to a web server.
1. Open a web browser and navigate to where Remote is deployed.

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

In Remote, enter the host, port (`rpc-listen-port` value), and RPC secret authorization token (`rpc-secret` value), then click Save button. Remote will try to connect to aria2 and list all download tasks.

To add a download task by URL, click on Add by URL button. To add a download task by torrent file, click on Add by torrent file button. To alter the connection settings, click on Settings button.

Remote does not update the statistics automatically, click Refresh button for the latest statistics.

To pause or stop a download, click on the corresponding button next to the download task.

To download some of the files from a multi-file torrent download, first pause the active download task, select the files to be downloaded, click Save, and click Start button to resume the download task. Note that at least 1 file has to be selected.

## Examples ##

Assume the following setup:

* The computer running aria2 is located at `192.168.1.200`.
* The RPC interface of aria2 has been enabeld.
* The RPC interface of aria2 is listening on port `8080`.
* The RPC interface of aria2 is seucred with authentication token `secret`.

Click Settings button, then enter the following information:

* Enter `192.168.1.200` into the Host field.
* Enter `8080` into the Port field.
* Enter `secret` into the Token field.
* Click Save button.

The version number of aria2, global upload speed, global download speed, and download tasks are listed on the page.

## License ##

[The BSD 3-Clause License](http://opensource.org/licenses/BSD-3-Clause)
