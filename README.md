# Remote #

## Description ##

A simple web client for [aria2](http://aria2.sourceforge.net/).

Remote is not built with any fancy framework or libraries. Remote is built with
basic HTML5 features and simple CSS rules, for example:

* [HTMLTemplateElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLTemplateElement)
* [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
* [FileReader](https://developer.mozilla.org/en-US/docs/Web/API/FileReader)

## Requirements ##

* aria2 (`>=1.34.0`).
* A web browser (e.g. Microsoft Edge, Mozilla Firefox, etc.).

## Installation ##

0. Deploy Remote to a web server.
1. Open a web browser and navigate to where Remote is deployed.

## Usage ##

The RPC interface of aria2 must be enabled. For details, refer to the
[aria2c(1)](https://aria2.github.io/manual/en/html/aria2c.html#rpc-options). For
example:

```
enable-rpc=true
rpc-allow-origin-all=true
rpc-listen-all=true
rpc-listen-port=8080
rpc-secret=the-rpc-secret
```

In Remote, enter the host, port (`rpc-listen-port` value, or usually the port
listened by the reverse proxy which will forward the requests to aria2), and RPC
authorization secret token (`rpc-secret` value), then click Submit button.
Remote will connect to aria2 and list all download tasks.

To add a download task by an URL, click on Add by URL button. To add a download
task by a torrent file, click on Add by torrent file button. To alter the
connection settings, click on Settings button.

Remote does not update the page automatically, click Refresh button for
the latest global statistics and download task(s).

To show the details of a download task, click on Details button.

To pause or stop a download, click on the corresponding button next to the
download task.

If a download task in in paused state, the file list can be updated so that
only the selected (i.e. the files withe the checkbox checked) are downloaded.
At least 1 file has to be selected.

## License ##

[The BSD 3-Clause License](http://opensource.org/licenses/BSD-3-Clause)
