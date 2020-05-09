'use strict';

/**
 * @typedef {import('./type-def').GlobalStat} GlobalStat
 * @typedef {import('./type-def').Task} Task
 */

const RADIX_DECIMAL = 10;

export default class Aria2Client {
  constructor() {
    this.endpoint = null;
    this.token = null;
  }

  /**
   * Sets client configurations.
   *
   * @param {object} config Client configurations.
   * @param {string} config.protocol Aria2 API protocol.
   * @param {string} config.host Aria2 API hostname.
   * @param {number} config.port Aria2 API port.
   * @param {string|null} config.token Aria2 API authentication token.
   */
  setConfig(config) {
    const { protocol, host, port, token } = config;
    this.endpoint = `${protocol}//${host}:${port}/jsonrpc`;
    if (token !== null) {
      this.token = `token:${token}`;
    } else {
      this.token = null;
    }
  }

  /**
   * Converts speed from bytes per second to megabits per second.
   *
   * @param {number} speed Speed in bytes per second.
   *
   * @returns {number} Speed in Megabits per second.
   */
  toMbps(speed) {
    // 1 Mbps = 125000 Bps.
    return (speed / 125000).toFixed(2);
  }

  /**
   * Sends a request to the aria2 API.
   *
   * @async
   *
   * @param {object} options Request options.
   * @param {string} options.method The RPC method.
   * @param {any[]} options.parameters The array of parameters.
   *
   * @returns {object} Result object.
   *
   * @throws When unable to complete the request.
   */
  async send(options) {
    if (this.endpoint === null) {
      throw new Error('Endpoint is not configured.');
    }
    const body = {
      jsonrpc: '2.0',
      method: options.method,
      params: [],
      id: Date.now()
    };
    // If the authentication token is provided, place it in front of other
    // parameters.
    if (this.token !== null) {
      const params = [this.token, ...options.parameters];
      body.params = params;
    } else {
      body.params = options.parameters;
    }
    const response = await fetch(
      this.endpoint,
      {
        method: 'POST',
        body: JSON.stringify(body)
      }
    );
    const responseJson = await response.json();
    if (responseJson.hasOwnProperty('error')) {
      throw new Error(responseJson.error.message);
    }
    return responseJson.result;
  }

  /**
   * Adds a download task by an URL.
   *
   * @async
   *
   * @param {string} url URL of the file.
   *
   * @throws When unable to add the task.
   */
  async addDownloadByURL(url) {
    await this.send({
      method: 'aria2.addUri',
      parameters: [
        // Each URL has to be put in an array.
        [url]
      ]
    });
  }

  /**
   * Adds a download task by a Torrent file.
   *
   * @async
   *
   * @param {string} file Torrent file in Base64 encoding.
   *
   * @throws When unable to add the task.
   */
  async addDownloadByTorrent(file) {
    await this.send({
      method: 'aria2.addTorrent',
      parameters: [file]
    });
  }

  /**
   * Gets aria2 version.
   *
   * @async
   *
   * @returns {string} Version string.
   *
   * @throws When unable to get the version.
   */
  async getVersion() {
    const result = await this.send({
      method: 'aria2.getVersion',
      parameters: []
    });
    return result.version;
  }

  /**
   * Gets global statistics.
   *
   * @async
   *
   * @returns {GlobalStat} Global statistics.
   *
   * @throws When unable to get the global statistics.
   */
  async getGlobalStat() {
    const result = await this.send({
      method: 'aria2.getGlobalStat',
      parameters: []
    });
    return {
      uploadSpeed: this.toMbps(parseInt(result.uploadSpeed, RADIX_DECIMAL)),
      downloadSpeed: this.toMbps(parseInt(result.downloadSpeed, RADIX_DECIMAL))
    };
  }

  /**
   * Forces a download task to pause.
   *
   * @async
   *
   * @param {string} gid Download task ID.
   *
   * @throws When unable to pause the download task.
   */
  async forcePause(gid) {
    await this.send({
      method: 'aria2.forcePause',
      parameters: [gid]
    });
  }

  /**
   * Resumes a download task.
   *
   * @async
   *
   * @param {string} gid Download task ID.
   *
   * @throws When unable to resume the download task.
   */
  async resumeDownload(gid) {
    await this.send({
      method: 'aria2.unpause',
      parameters: [gid]
    });
  }

  /**
   * Forces a download task to stop.
   *
   * @async
   *
   * @param {string} gid Download task ID.
   *
   * @throws When unable to stop the download task.
   */
  async forceStop(gid) {
    await this.send({
      method: 'aria2.forceRemove',
      parameters: [gid]
    });
  }

  /**
   * Removes a download task.
   *
   * @async
   *
   * @param {string} gid Download task ID.
   *
   * @throws When unable to remove the download task.
   */
  async removeDownload(gid) {
    await this.send({
      method: 'aria2.removeDownloadResult',
      parameters: [gid]
    });
  }

  /**
   * Updates a download task by selecting which file(s) to download.
   *
   * @async
   *
   * @param {string} gid Download task ID.
   * @param {number[]} indices Indices (1-based) of files to download.
   *
   * @throws When unable to update the download task.
   */
  async updateDownload(gid, indices) {
    await this.send({
      method: 'aria2.changeOption',
      parameters: [
        gid,
        {
          'select-file': indices.join(',')
        }
      ]
    });
  }

  /**
   * Parses download tasks.
   *
   * @param {object} results Raw results from aria2 API.
   *
   * @returns {Task[]} Download tasks.
   */
  parseDownloadTasks(results) {
    const tasks = results.map((result) => {
      const taskFiles = result.files.map((file) => {
        const isSelected = (file.selected === 'true');
        return {
          path: file.path,
          isSelected
        };
      });
      const uploadSpeed =
        this.toMbps(parseInt(result.uploadSpeed, RADIX_DECIMAL));
      const downloadSpeed =
        this.toMbps(parseInt(result.downloadSpeed, RADIX_DECIMAL));
      const completedLength = parseInt(result.completedLength, RADIX_DECIMAL);
      const totalLength = parseInt(result.totalLength, RADIX_DECIMAL);
      const progress = ((completedLength / totalLength) * 100).toFixed(2);
      return {
        gid: result.gid,
        uploadSpeed,
        downloadSpeed,
        progress,
        files: taskFiles,
        status: result.status
      };
    });
    return tasks;
  }

  /**
   * Gets active download tasks.
   *
   * @async
   *
   * @returns {Task[]} Download tasks.
   *
   * @throws When unable to get active download tasks.
   */
  async getActiveDownloads() {
    const results = await this.send({
      method: 'aria2.tellActive',
      parameters: []
    });
    return this.parseDownloadTasks(results);
  }

  /**
   * Gets waiting download tasks.
   *
   * @async
   *
   * @param {number} max Maximum number of waiting download tasks to get.
   *
   * @returns {Task[]} Download tasks.
   *
   * @throws When unable to get waiting download tasks.
   */
  async getWaitingDownloads(max) {
    const results = await this.send({
      method: 'aria2.tellWaiting',
      parameters: [0, max]
    });
    return this.parseDownloadTasks(results);
  }

  /**
   * Gets stopped download tasks.
   *
   * @async
   *
   * @param {number} max Maximum number of stopped download tasks to get.
   *
   * @returns {Task[]} Download tasks.
   *
   * @throws When unable to get stopped download tasks.
   */
  async getStoppeddownloads(max) {
    const results = await this.send({
      method: 'aria2.tellStopped',
      parameters: [0, max]
    });
    return this.parseDownloadTasks(results);
  }
}
