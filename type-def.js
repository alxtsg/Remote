'use strict';

/**
 * @typedef {object} GlobalStat Global statistics.
 * @property {number} uploadSpeed The total upload speed, in Mbps.
 * @property {number} downloadSpeed The total download speed, in Mbps.
 */
export const GlobalStat = {
  uploadSpeed: null,
  downloadSpeed: null
};

/**
 * @typedef {object} TaskFile A file in a download task.
 * @property {string} path File path.
 * @property {boolean} isSelected Whether the file is being downloaded or not.
 */
export const TaskFile = {
  path: null,
  isSelected: null
};

/**
 * @typedef {object} Task Download task.
 * @property {string} gid Download task ID.
 * @property {number} uploadSpeed Upload speed, in Mbps.
 * @property {number} downloadSpeed Download speed, in Mbps.
 * @property {number} progress Download progress, in percentage.
 * @property {TaskFile[]} files Files in the download task.
 * @property {string} status Task status.
 */
export const Task = {
  gid: null,
  uploadSpeed: null,
  downloadSpeed: null,
  progress: null,
  files: null,
  status: null
};
