/* Copyright 2015 Mozilla Foundation
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
/* eslint no-var: error */

import {
  assert, CMapCompressionType, removeNullCharacters, stringToBytes,
  unreachable, URL, Util, warn
} from '../shared/util';

const DEFAULT_LINK_REL = 'noopener noreferrer nofollow';
const SVG_NS = 'http://www.w3.org/2000/svg';

class DOMCanvasFactory {
  create(width, height) {
    if (width <= 0 || height <= 0) {
      throw new Error('Invalid canvas size');
    }
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    return {
      canvas,
      context,
    };
  }

  reset(canvasAndContext, width, height) {
    if (!canvasAndContext.canvas) {
      throw new Error('Canvas is not specified');
    }
    if (width <= 0 || height <= 0) {
      throw new Error('Invalid canvas size');
    }
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext) {
    if (!canvasAndContext.canvas) {
      throw new Error('Canvas is not specified');
    }
    // Zeroing the width and height cause Firefox to release graphics
    // resources immediately, which can greatly reduce memory consumption.
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

class DOMCMapReaderFactory {
  constructor({ baseUrl = null, isCompressed = false, }) {
    this.baseUrl = baseUrl;
    this.isCompressed = isCompressed;
  }

  async fetch({ name, }) {
    if (!this.baseUrl) {
      throw new Error(
        'The CMap "baseUrl" parameter must be specified, ensure that ' +
        'the "cMapUrl" and "cMapPacked" API parameters are provided.');
    }
    if (!name) {
      throw new Error('CMap name must be specified.');
    }
    const url = this.baseUrl + name + (this.isCompressed ? '.bcmap' : '');
    const compressionType = (this.isCompressed ? CMapCompressionType.BINARY :
                                                 CMapCompressionType.NONE);

    if ((typeof PDFJSDev !== 'undefined' && PDFJSDev.test('MOZCENTRAL')) ||
        (isFetchSupported() && isValidFetchUrl(url, document.baseURI))) {
      return fetch(url).then(async (response) => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        let cMapData;
        if (this.isCompressed) {
          cMapData = new Uint8Array(await response.arrayBuffer());
        } else {
          cMapData = stringToBytes(await response.text());
        }
        return { cMapData, compressionType, };
      }).catch((reason) => {
        throw new Error(`Unable to load ${this.isCompressed ? 'binary ' : ''}` +
                        `CMap at: ${url}`);
      });
    }

    // The Fetch API is not supported.
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('GET', url, true);

      if (this.isCompressed) {
        request.responseType = 'arraybuffer';
      }
      request.onreadystatechange = () => {
        if (request.readyState !== XMLHttpRequest.DONE) {
          return;
        }
        if (request.status === 200 || request.status === 0) {
          let cMapData;
          if (this.isCompressed && request.response) {
            cMapData = new Uint8Array(request.response);
          } else if (!this.isCompressed && request.responseText) {
            cMapData = stringToBytes(request.responseText);
          }
          if (cMapData) {
            resolve({ cMapData, compressionType, });
            return;
          }
        }
        reject(new Error(request.statusText));
      };

      request.send(null);
    }).catch((reason) => {
      throw new Error(`Unable to load ${this.isCompressed ? 'binary ' : ''}` +
                      `CMap at: ${url}`);
    });
  }
}

class DOMSVGFactory {
  create(width, height) {
    assert(width > 0 && height > 0, 'Invalid SVG dimensions');

    const svg = document.createElementNS(SVG_NS, 'svg:svg');
    svg.setAttribute('version', '1.1');
    svg.setAttribute('width', width + 'px');
    svg.setAttribute('height', height + 'px');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);

    return svg;
  }

  createElement(type) {
    assert(typeof type === 'string', 'Invalid SVG element type');

    return document.createElementNS(SVG_NS, type);
  }
}

/**
 * @typedef {Object} PageViewportParameters
 * @property {Array} viewBox - The xMin, yMin, xMax and yMax coordinates.
 * @property {number} scale - The scale of the viewport.
 * @property {number} rotation - The rotation, in degrees, of the viewport.
 * @property {number} offsetX - (optional) The horizontal, i.e. x-axis, offset.
 *   The default value is `0`.
 * @property {number} offsetY - (optional) The vertical, i.e. y-axis, offset.
 *   The default value is `0`.
 * @property {boolean} dontFlip - (optional) If true, the y-axis will not be
 *   flipped. The default value is `false`.
 */

/**
 * @typedef {Object} PageViewportCloneParameters
 * @property {number} scale - (optional) The scale, overriding the one in the
 *   cloned viewport. The default value is `this.scale`.
 * @property {number} rotation - (optional) The rotation, in degrees, overriding
 *   the one in the cloned viewport. The default value is `this.rotation`.
 * @property {boolean} dontFlip - (optional) If true, the x-axis will not be
 *   flipped. The default value is `false`.
 */

/**
 * PDF page viewport created based on scale, rotation and offset.
 */
class PageViewport {
  /**
   * @param {PageViewportParameters}
   */
  constructor({ viewBox, scale, rotation, offsetX = 0, offsetY = 0,
                dontFlip = false, }) {
    this.viewBox = viewBox;
    this.scale = scale;
    this.rotation = rotation;
    this.offsetX = offsetX;
    this.offsetY = offsetY;

    // creating transform to convert pdf coordinate system to the normal
    // canvas like coordinates taking in account scale and rotation
    const centerX = (viewBox[2] + viewBox[0]) / 2;
    const centerY = (viewBox[3] + viewBox[1]) / 2;
    let rotateA, rotateB, rotateC, rotateD;
    rotation = rotation % 360;
    rotation = rotation < 0 ? rotation + 360 : rotation;
    switch (rotation) {
      case 180:
        rotateA = -1; rotateB = 0; rotateC = 0; rotateD = 1;
        break;
      case 90:
        rotateA = 0; rotateB = 1; rotateC = 1; rotateD = 0;
        break;
      case 270:
        rotateA = 0; rotateB = -1; rotateC = -1; rotateD = 0;
        break;
      // case 0:
      default:
        rotateA = 1; rotateB = 0; rotateC = 0; rotateD = -1;
        break;
    }

    if (dontFlip) {
      rotateC = -rotateC; rotateD = -rotateD;
    }

    let offsetCanvasX, offsetCanvasY;
    let width, height;
    if (rotateA === 0) {
      offsetCanvasX = Math.abs(centerY - viewBox[1]) * scale + offsetX;
      offsetCanvasY = Math.abs(centerX - viewBox[0]) * scale + offsetY;
      width = Math.abs(viewBox[3] - viewBox[1]) * scale;
      height = Math.abs(viewBox[2] - viewBox[0]) * scale;
    } else {
      offsetCanvasX = Math.abs(centerX - viewBox[0]) * scale + offsetX;
      offsetCanvasY = Math.abs(centerY - viewBox[1]) * scale + offsetY;
      width = Math.abs(viewBox[2] - viewBox[0]) * scale;
      height = Math.abs(viewBox[3] - viewBox[1]) * scale;
    }
    // creating transform for the following operations:
    // translate(-centerX, -centerY), rotate and flip vertically,
    // scale, and translate(offsetCanvasX, offsetCanvasY)
    this.transform = [
      rotateA * scale,
      rotateB * scale,
      rotateC * scale,
      rotateD * scale,
      offsetCanvasX - rotateA * scale * centerX - rotateC * scale * centerY,
      offsetCanvasY - rotateB * scale * centerX - rotateD * scale * centerY
    ];

    this.width = width;
    this.height = height;
  }

  /**
   * Clones viewport, with optional additional properties.
   * @param {PageViewportCloneParameters} - (optional)
   * @return {PageViewport} Cloned viewport.
   */
  clone({ scale = this.scale, rotation = this.rotation,
          dontFlip = false, } = {}) {
    return new PageViewport({
      viewBox: this.viewBox.slice(),
      scale,
      rotation,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      dontFlip,
    });
  }

  /**
   * Converts PDF point to the viewport coordinates. For examples, useful for
   * converting PDF location into canvas pixel coordinates.
   * @param {number} x - The x-coordinate.
   * @param {number} y - The y-coordinate.
   * @return {Object} Object containing `x` and `y` properties of the
   *   point in the viewport coordinate space.
   * @see {@link convertToPdfPoint}
   * @see {@link convertToViewportRectangle}
   */
  convertToViewportPoint(x, y) {
    return Util.applyTransform([x, y], this.transform);
  }

  /**
   * Converts PDF rectangle to the viewport coordinates.
   * @param {Array} rect - The xMin, yMin, xMax and yMax coordinates.
   * @return {Array} Array containing corresponding coordinates of the rectangle
   *   in the viewport coordinate space.
   * @see {@link convertToViewportPoint}
   */
  convertToViewportRectangle(rect) {
    const topLeft = Util.applyTransform([rect[0], rect[1]], this.transform);
    const bottomRight = Util.applyTransform([rect[2], rect[3]], this.transform);
    return [topLeft[0], topLeft[1], bottomRight[0], bottomRight[1]];
  }

  /**
   * Converts viewport coordinates to the PDF location. For examples, useful
   * for converting canvas pixel location into PDF one.
   * @param {number} x - The x-coordinate.
   * @param {number} y - The y-coordinate.
   * @return {Object} Object containing `x` and `y` properties of the
   *   point in the PDF coordinate space.
   * @see {@link convertToViewportPoint}
   */
  convertToPdfPoint(x, y) {
    return Util.applyInverseTransform([x, y], this.transform);
  }
}

const RenderingCancelledException = (function RenderingCancelledException() {
  function RenderingCancelledException(msg, type) {
    this.message = msg;
    this.type = type;
  }

  RenderingCancelledException.prototype = new Error();
  RenderingCancelledException.prototype.name = 'RenderingCancelledException';
  RenderingCancelledException.constructor = RenderingCancelledException;

  return RenderingCancelledException;
})();

const LinkTarget = {
  NONE: 0, // Default value.
  SELF: 1,
  BLANK: 2,
  PARENT: 3,
  TOP: 4,
};

const LinkTargetStringMap = [
  '',
  '_self',
  '_blank',
  '_parent',
  '_top',
];

/**
 * @typedef ExternalLinkParameters
 * @typedef {Object} ExternalLinkParameters
 * @property {string} url - An absolute URL.
 * @property {LinkTarget} target - (optional) The link target.
 *   The default value is `LinkTarget.NONE`.
 * @property {string} rel - (optional) The link relationship.
 *   The default value is `DEFAULT_LINK_REL`.
 */

/**
 * Adds various attributes (href, title, target, rel) to hyperlinks.
 * @param {HTMLLinkElement} link - The link element.
 * @param {ExternalLinkParameters} params
 */
function addLinkAttributes(link, { url, target, rel, } = {}) {
  link.href = link.title = (url ? removeNullCharacters(url) : '');

  if (url) {
    const LinkTargetValues = Object.values(LinkTarget);
    const targetIndex =
      LinkTargetValues.includes(target) ? target : LinkTarget.NONE;
    link.target = LinkTargetStringMap[targetIndex];

    link.rel = (typeof rel === 'string' ? rel : DEFAULT_LINK_REL);
  }
}

// Gets the file name from a given URL.
function getFilenameFromUrl(url) {
  const anchor = url.indexOf('#');
  const query = url.indexOf('?');
  const end = Math.min(anchor > 0 ? anchor : url.length,
                       query > 0 ? query : url.length);
  return url.substring(url.lastIndexOf('/', end) + 1, end);
}

class StatTimer {
  constructor(enable = true) {
    this.enabled = !!enable;
    this.started = Object.create(null);
    this.times = [];
  }

  time(name) {
    if (!this.enabled) {
      return;
    }
    if (name in this.started) {
      warn('Timer is already running for ' + name);
    }
    this.started[name] = Date.now();
  }

  timeEnd(name) {
    if (!this.enabled) {
      return;
    }
    if (!(name in this.started)) {
      warn('Timer has not been started for ' + name);
    }
    this.times.push({
      'name': name,
      'start': this.started[name],
      'end': Date.now(),
    });
    // Remove timer from started so it can be called again.
    delete this.started[name];
  }

  toString() {
    // Find the longest name for padding purposes.
    let out = '', longest = 0;
    for (const time of this.times) {
      const name = time.name;
      if (name.length > longest) {
        longest = name.length;
      }
    }
    for (const time of this.times) {
      const duration = time.end - time.start;
      out += `${time.name.padEnd(longest)} ${duration}ms\n`;
    }
    return out;
  }
}

/**
 * Helps avoid having to initialize {StatTimer} instances, e.g. one for every
 * page, in cases where the collected stats are not actually being used.
 * This (dummy) class can thus, since all its methods are `static`, be directly
 * shared between multiple call-sites without the need to be initialized first.
 *
 * NOTE: This must implement the same interface as {StatTimer}.
 */
class DummyStatTimer {
  constructor() {
    unreachable('Cannot initialize DummyStatTimer.');
  }

  static time(name) {}

  static timeEnd(name) {}

  static toString() {
    return '';
  }
}

function isFetchSupported() {
  return (typeof fetch !== 'undefined' &&
          typeof Response !== 'undefined' && 'body' in Response.prototype &&
          // eslint-disable-next-line no-restricted-globals
          typeof ReadableStream !== 'undefined');
}

function isValidFetchUrl(url, baseUrl) {
  try {
    const { protocol, } = baseUrl ? new URL(url, baseUrl) : new URL(url);
    // The Fetch API only supports the http/https protocols, and not file/ftp.
    return (protocol === 'http:' || protocol === 'https:');
  } catch (ex) {
    return false; // `new URL()` will throw on incorrect data.
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;

    script.onload = resolve;
    script.onerror = function() {
      reject(new Error(`Cannot load script at: ${script.src}`));
    };
    (document.head || document.documentElement).appendChild(script);
  });
}

// Deprecated API function -- display regardless of the `verbosity` setting.
function deprecated(details) {
  console.log('Deprecated API usage: ' + details);
}

function releaseImageResources(img) {
  assert(img instanceof Image, 'Invalid `img` parameter.');

  const url = img.src;
  if (typeof url === 'string' && url.startsWith('blob:') &&
      URL.revokeObjectURL) {
    URL.revokeObjectURL(url);
  }
  img.removeAttribute('src');
}

export {
  PageViewport,
  RenderingCancelledException,
  addLinkAttributes,
  getFilenameFromUrl,
  LinkTarget,
  DEFAULT_LINK_REL,
  DOMCanvasFactory,
  DOMCMapReaderFactory,
  DOMSVGFactory,
  StatTimer,
  DummyStatTimer,
  isFetchSupported,
  isValidFetchUrl,
  loadScript,
  deprecated,
  releaseImageResources,
};
