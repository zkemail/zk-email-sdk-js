// polyfillWorker.js
let WorkerPolyfill;

if (typeof window !== "undefined" && window.Worker) {
  // In the browser, use the native Worker
  WorkerPolyfill = window.Worker;
} else {
  try {
    // In Node, try to use worker_threads (Node 12+)
    WorkerPolyfill = require("worker_threads").Worker;
  } catch (e) {
    // If even that is unavailable, provide a dummy that throws an error.
    WorkerPolyfill = class {
      constructor() {
        throw new Error("Worker is not available in this environment.");
      }
    };
  }
}

export default WorkerPolyfill;
