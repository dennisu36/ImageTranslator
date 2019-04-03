/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  arrayByteLength, arraysToBytes, assert, createPromiseCapability,
  getVerbosityLevel, info, InvalidPDFException, MissingPDFException,
  PasswordException, setVerbosityLevel, UnexpectedResponseException,
  UnknownErrorException, UNSUPPORTED_FEATURES, VerbosityLevel, warn
} from '../shared/util';
import { LocalPdfManager, NetworkPdfManager } from './pdf_manager';
import isNodeJS from '../shared/is_node';
import { MessageHandler } from '../shared/message_handler';
import { Ref } from './primitives';
import { XRefParseException } from './core_utils';

var WorkerTask = (function WorkerTaskClosure() {
  function WorkerTask(name) {
    this.name = name;
    this.terminated = false;
    this._capability = createPromiseCapability();
  }

  WorkerTask.prototype = {
    get finished() {
      return this._capability.promise;
    },

    finish() {
      this._capability.resolve();
    },

    terminate() {
      this.terminated = true;
    },

    ensureNotTerminated() {
      if (this.terminated) {
        throw new Error('Worker task was terminated');
      }
    },
  };

  return WorkerTask;
})();

/** @implements {IPDFStream} */
var PDFWorkerStream = (function PDFWorkerStreamClosure() {
  function PDFWorkerStream(msgHandler) {
    this._msgHandler = msgHandler;
    this._contentLength = null;
    this._fullRequestReader = null;
    this._rangeRequestReaders = [];
  }
  PDFWorkerStream.prototype = {
    getFullReader() {
      assert(!this._fullRequestReader);
      this._fullRequestReader = new PDFWorkerStreamReader(this._msgHandler);
      return this._fullRequestReader;
    },

    getRangeReader(begin, end) {
      let reader = new PDFWorkerStreamRangeReader(begin, end, this._msgHandler);
      this._rangeRequestReaders.push(reader);
      return reader;
    },

    cancelAllRequests(reason) {
      if (this._fullRequestReader) {
        this._fullRequestReader.cancel(reason);
      }
      let readers = this._rangeRequestReaders.slice(0);
      readers.forEach(function (reader) {
        reader.cancel(reason);
      });
    },
  };

  /** @implements {IPDFStreamReader} */
  function PDFWorkerStreamReader(msgHandler) {
    this._msgHandler = msgHandler;

    this._contentLength = null;
    this._isRangeSupported = false;
    this._isStreamingSupported = false;

    let readableStream = this._msgHandler.sendWithStream('GetReader');

    this._reader = readableStream.getReader();

    this._headersReady = this._msgHandler.sendWithPromise('ReaderHeadersReady').
        then((data) => {
      this._isStreamingSupported = data.isStreamingSupported;
      this._isRangeSupported = data.isRangeSupported;
      this._contentLength = data.contentLength;
    });
  }
  PDFWorkerStreamReader.prototype = {
    get headersReady() {
      return this._headersReady;
    },

    get contentLength() {
      return this._contentLength;
    },

    get isStreamingSupported() {
      return this._isStreamingSupported;
    },

    get isRangeSupported() {
      return this._isRangeSupported;
    },

    read() {
      return this._reader.read().then(function({ value, done, }) {
        if (done) {
          return { value: undefined, done: true, };
        }
        // `value` is wrapped into Uint8Array, we need to
        // unwrap it to ArrayBuffer for further processing.
        return { value: value.buffer, done: false, };
      });
    },

    cancel(reason) {
      this._reader.cancel(reason);
    },
  };

  /** @implements {IPDFStreamRangeReader} */
  function PDFWorkerStreamRangeReader(begin, end, msgHandler) {
    this._msgHandler = msgHandler;
    this.onProgress = null;

    let readableStream = this._msgHandler.sendWithStream('GetRangeReader',
                                                         { begin, end, });

    this._reader = readableStream.getReader();
  }
  PDFWorkerStreamRangeReader.prototype = {
    get isStreamingSupported() {
      return false;
    },

    read() {
      return this._reader.read().then(function({ value, done, }) {
        if (done) {
          return { value: undefined, done: true, };
        }
        return { value: value.buffer, done: false, };
      });
    },

    cancel(reason) {
      this._reader.cancel(reason);
    },
  };

  return PDFWorkerStream;
})();

var WorkerMessageHandler = {
  setup(handler, port) {
    var testMessageProcessed = false;
    handler.on('test', function wphSetupTest(data) {
      if (testMessageProcessed) {
        return; // we already processed 'test' message once
      }
      testMessageProcessed = true;

      // check if Uint8Array can be sent to worker
      if (!(data instanceof Uint8Array)) {
        handler.send('test', false);
        return;
      }
      // making sure postMessage transfers are working
      var supportTransfers = data[0] === 255;
      handler.postMessageTransfers = supportTransfers;
      // check if the response property is supported by xhr
      var xhr = new XMLHttpRequest();
      var responseExists = 'response' in xhr;
      // check if the property is actually implemented
      try {
        xhr.responseType; // eslint-disable-line no-unused-expressions
      } catch (e) {
        responseExists = false;
      }
      if (!responseExists) {
        handler.send('test', false);
        return;
      }
      handler.send('test', {
        supportTypedArray: true,
        supportTransfers,
      });
    });

    handler.on('configure', function wphConfigure(data) {
      setVerbosityLevel(data.verbosity);
    });

    handler.on('GetDocRequest', function wphSetupDoc(data) {
      return WorkerMessageHandler.createDocumentHandler(data, port);
    });
  },
  createDocumentHandler(docParams, port) {
    // This context is actually holds references on pdfManager and handler,
    // until the latter is destroyed.
    var pdfManager;
    var terminated = false;
    var cancelXHRs = null;
    var WorkerTasks = [];
    const verbosity = getVerbosityLevel();

    let apiVersion = docParams.apiVersion;
    let workerVersion =
      typeof PDFJSDev !== 'undefined' ? PDFJSDev.eval('BUNDLE_VERSION') : null;
    if ((typeof PDFJSDev !== 'undefined' && PDFJSDev.test('TESTING')) &&
        apiVersion === null) {
      warn('Ignoring apiVersion/workerVersion check in TESTING builds.');
    } else if (apiVersion !== workerVersion) {
      throw new Error(`The API version "${apiVersion}" does not match ` +
                      `the Worker version "${workerVersion}".`);
    }

    var docId = docParams.docId;
    var docBaseUrl = docParams.docBaseUrl;
    var workerHandlerName = docParams.docId + '_worker';
    var handler = new MessageHandler(workerHandlerName, docId, port);

    // Ensure that postMessage transfers are always correctly enabled/disabled,
    // to prevent "DataCloneError" in browsers without transfers support.
    handler.postMessageTransfers = docParams.postMessageTransfers;

    function ensureNotTerminated() {
      if (terminated) {
        throw new Error('Worker was terminated');
      }
    }

    function startWorkerTask(task) {
      WorkerTasks.push(task);
    }

    function finishWorkerTask(task) {
      task.finish();
      var i = WorkerTasks.indexOf(task);
      WorkerTasks.splice(i, 1);
    }

    async function loadDocument(recoveryMode) {
      await pdfManager.ensureDoc('checkHeader');
      await pdfManager.ensureDoc('parseStartXRef');
      await pdfManager.ensureDoc('parse', [recoveryMode]);

      if (!recoveryMode) {
        // Check that at least the first page can be successfully loaded,
        // since otherwise the XRef table is definitely not valid.
        await pdfManager.ensureDoc('checkFirstPage');
      }

      const [numPages, fingerprint] = await Promise.all([
        pdfManager.ensureDoc('numPages'),
        pdfManager.ensureDoc('fingerprint'),
      ]);
      return { numPages, fingerprint, };
    }

    function getPdfManager(data, evaluatorOptions) {
      var pdfManagerCapability = createPromiseCapability();
      var pdfManager;

      var source = data.source;
      if (source.data) {
        try {
          pdfManager = new LocalPdfManager(docId, source.data, source.password,
                                           evaluatorOptions, docBaseUrl);
          pdfManagerCapability.resolve(pdfManager);
        } catch (ex) {
          pdfManagerCapability.reject(ex);
        }
        return pdfManagerCapability.promise;
      }

      var pdfStream, cachedChunks = [];
      try {
        pdfStream = new PDFWorkerStream(handler);
      } catch (ex) {
        pdfManagerCapability.reject(ex);
        return pdfManagerCapability.promise;
      }

      var fullRequest = pdfStream.getFullReader();
      fullRequest.headersReady.then(function () {
        if (!fullRequest.isRangeSupported) {
          return;
        }

        // We don't need auto-fetch when streaming is enabled.
        var disableAutoFetch = source.disableAutoFetch ||
                               fullRequest.isStreamingSupported;
        pdfManager = new NetworkPdfManager(docId, pdfStream, {
          msgHandler: handler,
          password: source.password,
          length: fullRequest.contentLength,
          disableAutoFetch,
          rangeChunkSize: source.rangeChunkSize,
        }, evaluatorOptions, docBaseUrl);
        // There may be a chance that `pdfManager` is not initialized
        // for first few runs of `readchunk` block of code. Be sure
        // to send all cached chunks, if any, to chunked_stream via
        // pdf_manager.
        for (let i = 0; i < cachedChunks.length; i++) {
          pdfManager.sendProgressiveData(cachedChunks[i]);
        }

        cachedChunks = [];
        pdfManagerCapability.resolve(pdfManager);
        cancelXHRs = null;
      }).catch(function (reason) {
        pdfManagerCapability.reject(reason);
        cancelXHRs = null;
      });

      var loaded = 0;
      var flushChunks = function () {
        var pdfFile = arraysToBytes(cachedChunks);
        if (source.length && pdfFile.length !== source.length) {
          warn('reported HTTP length is different from actual');
        }
        // the data is array, instantiating directly from it
        try {
          pdfManager = new LocalPdfManager(docId, pdfFile, source.password,
                                           evaluatorOptions, docBaseUrl);
          pdfManagerCapability.resolve(pdfManager);
        } catch (ex) {
          pdfManagerCapability.reject(ex);
        }
        cachedChunks = [];
      };
      var readPromise = new Promise(function (resolve, reject) {
        var readChunk = function (chunk) {
          try {
            ensureNotTerminated();
            if (chunk.done) {
              if (!pdfManager) {
                flushChunks();
              }
              cancelXHRs = null;
              return;
            }

            var data = chunk.value;
            loaded += arrayByteLength(data);
            if (!fullRequest.isStreamingSupported) {
              handler.send('DocProgress', {
                loaded,
                total: Math.max(loaded, fullRequest.contentLength || 0),
              });
            }

            if (pdfManager) {
              pdfManager.sendProgressiveData(data);
            } else {
              cachedChunks.push(data);
            }

            fullRequest.read().then(readChunk, reject);
          } catch (e) {
            reject(e);
          }
        };
        fullRequest.read().then(readChunk, reject);
      });
      readPromise.catch(function (e) {
        pdfManagerCapability.reject(e);
        cancelXHRs = null;
      });

      cancelXHRs = function () {
        pdfStream.cancelAllRequests('abort');
      };

      return pdfManagerCapability.promise;
    }

    function setupDoc(data) {
      function onSuccess(doc) {
        ensureNotTerminated();
        handler.send('GetDoc', { pdfInfo: doc, });
      }

      function onFailure(e) {
        ensureNotTerminated();

        if (e instanceof PasswordException) {
          var task = new WorkerTask('PasswordException: response ' + e.code);
          startWorkerTask(task);

          handler.sendWithPromise('PasswordRequest', e).then(function (data) {
            finishWorkerTask(task);
            pdfManager.updatePassword(data.password);
            pdfManagerReady();
          }).catch(function (boundException) {
            finishWorkerTask(task);
            handler.send('PasswordException', boundException);
          }.bind(null, e));
        } else if (e instanceof InvalidPDFException) {
          handler.send('InvalidPDF', e);
        } else if (e instanceof MissingPDFException) {
          handler.send('MissingPDF', e);
        } else if (e instanceof UnexpectedResponseException) {
          handler.send('UnexpectedResponse', e);
        } else {
          handler.send('UnknownError',
                       new UnknownErrorException(e.message, e.toString()));
        }
      }

      function pdfManagerReady() {
        ensureNotTerminated();

        loadDocument(false).then(onSuccess, function loadFailure(ex) {
          ensureNotTerminated();

          // Try again with recoveryMode == true
          if (!(ex instanceof XRefParseException)) {
            onFailure(ex);
            return;
          }
          pdfManager.requestLoadedStream();
          pdfManager.onLoadedStream().then(function() {
            ensureNotTerminated();

            loadDocument(true).then(onSuccess, onFailure);
          });
        }, onFailure);
      }

      ensureNotTerminated();

      var evaluatorOptions = {
        forceDataSchema: data.disableCreateObjectURL,
        maxImageSize: data.maxImageSize,
        disableFontFace: data.disableFontFace,
        nativeImageDecoderSupport: data.nativeImageDecoderSupport,
        ignoreErrors: data.ignoreErrors,
        isEvalSupported: data.isEvalSupported,
      };

      getPdfManager(data, evaluatorOptions).then(function (newPdfManager) {
        if (terminated) {
          // We were in a process of setting up the manager, but it got
          // terminated in the middle.
          newPdfManager.terminate();
          throw new Error('Worker was terminated');
        }
        pdfManager = newPdfManager;

        pdfManager.onLoadedStream().then(function(stream) {
          handler.send('DataLoaded', { length: stream.bytes.byteLength, });
        });
      }).then(pdfManagerReady, onFailure);
    }

    handler.on('GetPage', function wphSetupGetPage(data) {
      return pdfManager.getPage(data.pageIndex).then(function(page) {
        return Promise.all([
          pdfManager.ensure(page, 'rotate'),
          pdfManager.ensure(page, 'ref'),
          pdfManager.ensure(page, 'userUnit'),
          pdfManager.ensure(page, 'view'),
        ]).then(function([rotate, ref, userUnit, view]) {
          return {
            rotate,
            ref,
            userUnit,
            view,
          };
        });
      });
    });

    handler.on('GetPageIndex', function wphSetupGetPageIndex(data) {
      var ref = new Ref(data.ref.num, data.ref.gen);
      var catalog = pdfManager.pdfDocument.catalog;
      return catalog.getPageIndex(ref);
    });

    handler.on('GetDestinations',
      function wphSetupGetDestinations(data) {
        return pdfManager.ensureCatalog('destinations');
      }
    );

    handler.on('GetDestination',
      function wphSetupGetDestination(data) {
        return pdfManager.ensureCatalog('getDestination', [data.id]);
      }
    );

    handler.on('GetPageLabels',
      function wphSetupGetPageLabels(data) {
        return pdfManager.ensureCatalog('pageLabels');
      }
    );

    handler.on('GetPageMode', function wphSetupGetPageMode(data) {
      return pdfManager.ensureCatalog('pageMode');
    });

    handler.on('getOpenActionDestination', function(data) {
      return pdfManager.ensureCatalog('openActionDestination');
    });

    handler.on('GetAttachments',
      function wphSetupGetAttachments(data) {
        return pdfManager.ensureCatalog('attachments');
      }
    );

    handler.on('GetJavaScript',
      function wphSetupGetJavaScript(data) {
        return pdfManager.ensureCatalog('javaScript');
      }
    );

    handler.on('GetOutline',
      function wphSetupGetOutline(data) {
        return pdfManager.ensureCatalog('documentOutline');
      }
    );

    handler.on('GetPermissions', function(data) {
      return pdfManager.ensureCatalog('permissions');
    });

    handler.on('GetMetadata',
      function wphSetupGetMetadata(data) {
        return Promise.all([pdfManager.ensureDoc('documentInfo'),
                            pdfManager.ensureCatalog('metadata')]);
      }
    );

    handler.on('GetData', function wphSetupGetData(data) {
      pdfManager.requestLoadedStream();
      return pdfManager.onLoadedStream().then(function(stream) {
        return stream.bytes;
      });
    });

    handler.on('GetStats',
      function wphSetupGetStats(data) {
        return pdfManager.pdfDocument.xref.stats;
      }
    );

    handler.on('GetAnnotations', function({ pageIndex, intent, }) {
      return pdfManager.getPage(pageIndex).then(function(page) {
        return page.getAnnotationsData(intent);
      });
    });

    handler.on('RenderPageRequest', function wphSetupRenderPage(data) {
      var pageIndex = data.pageIndex;
      pdfManager.getPage(pageIndex).then(function(page) {
        var task = new WorkerTask('RenderPageRequest: page ' + pageIndex);
        startWorkerTask(task);

        // NOTE: Keep this condition in sync with the `info` helper function.
        const start = (verbosity >= VerbosityLevel.INFOS ? Date.now() : 0);

        // Pre compile the pdf page and fetch the fonts/images.
        page.getOperatorList({
          handler,
          task,
          intent: data.intent,
          renderInteractiveForms: data.renderInteractiveForms,
        }).then(function(operatorList) {
          finishWorkerTask(task);

          if (start) {
            info(`page=${pageIndex + 1} - getOperatorList: time=` +
                 `${Date.now() - start}ms, len=${operatorList.totalLength}`);
          }
        }, function(e) {
          finishWorkerTask(task);
          if (task.terminated) {
            return; // ignoring errors from the terminated thread
          }

          // For compatibility with older behavior, generating unknown
          // unsupported feature notification on errors.
          handler.send('UnsupportedFeature',
                       { featureId: UNSUPPORTED_FEATURES.unknown, });

          var minimumStackMessage =
            'worker.js: while trying to getPage() and getOperatorList()';

          var wrappedException;

          // Turn the error into an obj that can be serialized
          if (typeof e === 'string') {
            wrappedException = {
              message: e,
              stack: minimumStackMessage,
            };
          } else if (typeof e === 'object') {
            wrappedException = {
              message: e.message || e.toString(),
              stack: e.stack || minimumStackMessage,
            };
          } else {
            wrappedException = {
              message: 'Unknown exception type: ' + (typeof e),
              stack: minimumStackMessage,
            };
          }

          handler.send('PageError', {
            pageIndex,
            error: wrappedException,
            intent: data.intent,
          });
        });
      });
    }, this);

    handler.on('GetTextContent', function wphExtractText(data, sink) {
      var pageIndex = data.pageIndex;
      sink.onPull = function (desiredSize) { };
      sink.onCancel = function (reason) { };

      pdfManager.getPage(pageIndex).then(function(page) {
        var task = new WorkerTask('GetTextContent: page ' + pageIndex);
        startWorkerTask(task);

        // NOTE: Keep this condition in sync with the `info` helper function.
        const start = (verbosity >= VerbosityLevel.INFOS ? Date.now() : 0);

        page.extractTextContent({
          handler,
          task,
          sink,
          normalizeWhitespace: data.normalizeWhitespace,
          combineTextItems: data.combineTextItems,
        }).then(function() {
          finishWorkerTask(task);

          if (start) {
            info(`page=${pageIndex + 1} - getTextContent: time=` +
                 `${Date.now() - start}ms`);
          }
          sink.close();
        }, function (reason) {
          finishWorkerTask(task);
          if (task.terminated) {
            return; // ignoring errors from the terminated thread
          }
          sink.error(reason);
          throw reason;
        });
      });
    });

    handler.on('FontFallback', function(data) {
      return pdfManager.fontFallback(data.id, handler);
    });

    handler.on('Cleanup', function wphCleanup(data) {
      return pdfManager.cleanup();
    });

    handler.on('Terminate', function wphTerminate(data) {
      terminated = true;
      if (pdfManager) {
        pdfManager.terminate();
        pdfManager = null;
      }
      if (cancelXHRs) {
        cancelXHRs();
      }

      var waitOn = [];
      WorkerTasks.forEach(function (task) {
        waitOn.push(task.finished);
        task.terminate();
      });

      return Promise.all(waitOn).then(function () {
        // Notice that even if we destroying handler, resolved response promise
        // must be sent back.
        handler.destroy();
        handler = null;
      });
    });

    handler.on('Ready', function wphReady(data) {
      setupDoc(docParams);
      docParams = null; // we don't need docParams anymore -- saving memory.
    });
    return workerHandlerName;
  },
  initializeFromPort(port) {
    var handler = new MessageHandler('worker', 'main', port);
    WorkerMessageHandler.setup(handler, port);
    handler.send('ready', null);
  },
};

function isMessagePort(maybePort) {
  return typeof maybePort.postMessage === 'function' &&
         ('onmessage' in maybePort);
}

// Worker thread (and not node.js)?
if (typeof window === 'undefined' && !isNodeJS() &&
    typeof self !== 'undefined' && isMessagePort(self)) {
  WorkerMessageHandler.initializeFromPort(self);
}

export {
  WorkerTask,
  WorkerMessageHandler,
};
