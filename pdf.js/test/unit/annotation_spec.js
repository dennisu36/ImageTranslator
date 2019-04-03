/* Copyright 2017 Mozilla Foundation
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
  Annotation, AnnotationBorderStyle, AnnotationFactory
} from '../../src/core/annotation';
import {
  AnnotationBorderStyleType, AnnotationFieldFlag, AnnotationFlag,
  AnnotationType, stringToBytes, stringToUTF8String
} from '../../src/shared/util';
import { Dict, Name, Ref } from '../../src/core/primitives';
import { Lexer, Parser } from '../../src/core/parser';
import { StringStream } from '../../src/core/stream';
import { XRefMock } from './test_utils';

describe('annotation', function() {
  class PDFManagerMock {
    constructor(params) {
      this.docBaseUrl = params.docBaseUrl || null;
    }

    ensure(obj, prop, args) {
      return new Promise(function(resolve) {
        const value = obj[prop];
        if (typeof value === 'function') {
          resolve(value.apply(obj, args));
        } else {
          resolve(value);
        }
      });
    }
  }

  class IdFactoryMock {
    constructor(params) {
      this.uniquePrefix = params.prefix || 'p0_';
      this.idCounters = {
        obj: params.startObjId || 0,
      };
    }

    createObjId() {
      return this.uniquePrefix + (++this.idCounters.obj);
    }
  }

  let pdfManagerMock, idFactoryMock;

  beforeAll(function(done) {
    pdfManagerMock = new PDFManagerMock({
      docBaseUrl: null,
    });
    idFactoryMock = new IdFactoryMock({ });
    done();
  });

  afterAll(function() {
    pdfManagerMock = null;
    idFactoryMock = null;
  });

  describe('AnnotationFactory', function() {
    it('should get id for annotation', function(done) {
      const annotationDict = new Dict();
      annotationDict.set('Type', Name.get('Annot'));
      annotationDict.set('Subtype', Name.get('Link'));

      const annotationRef = new Ref(10, 0);
      const xref = new XRefMock([
        { ref: annotationRef, data: annotationDict, }
      ]);

      AnnotationFactory.create(xref, annotationRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.LINK);
        expect(data.id).toEqual('10R');
        done();
      }, done.fail);
    });

    it('should handle, and get fallback IDs for, annotations that are not ' +
       'indirect objects (issue 7569)', function(done) {
      const annotationDict = new Dict();
      annotationDict.set('Type', Name.get('Annot'));
      annotationDict.set('Subtype', Name.get('Link'));

      const xref = new XRefMock();
      const idFactory = new IdFactoryMock({
        prefix: 'p0_',
        startObjId: 0,
      });

      const annotation1 = AnnotationFactory.create(xref, annotationDict,
          pdfManagerMock, idFactory).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.LINK);
        expect(data.id).toEqual('annot_p0_1');
      });

      const annotation2 = AnnotationFactory.create(xref, annotationDict,
          pdfManagerMock, idFactory).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.LINK);
        expect(data.id).toEqual('annot_p0_2');
      });

      Promise.all([annotation1, annotation2]).then(done, done.fail);
    });

    it('should handle missing /Subtype', function(done) {
      const annotationDict = new Dict();
      annotationDict.set('Type', Name.get('Annot'));

      const annotationRef = new Ref(1, 0);
      const xref = new XRefMock([
        { ref: annotationRef, data: annotationDict, }
      ]);

      AnnotationFactory.create(xref, annotationRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toBeUndefined();
        done();
      }, done.fail);
    });
  });

  describe('Annotation', function() {
    let dict, ref;

    beforeAll(function(done) {
      dict = new Dict();
      ref = new Ref(1, 0);
      done();
    });

    afterAll(function() {
      dict = ref = null;
    });

    it('should set and get flags', function() {
      const annotation = new Annotation({ dict, ref, });
      annotation.setFlags(13);

      expect(annotation.hasFlag(AnnotationFlag.INVISIBLE)).toEqual(true);
      expect(annotation.hasFlag(AnnotationFlag.NOZOOM)).toEqual(true);
      expect(annotation.hasFlag(AnnotationFlag.PRINT)).toEqual(true);
      expect(annotation.hasFlag(AnnotationFlag.READONLY)).toEqual(false);
    });

    it('should be viewable and not printable by default', function() {
      const annotation = new Annotation({ dict, ref, });

      expect(annotation.viewable).toEqual(true);
      expect(annotation.printable).toEqual(false);
    });

    it('should set and get a valid rectangle', function() {
      const annotation = new Annotation({ dict, ref, });
      annotation.setRectangle([117, 694, 164.298, 720]);

      expect(annotation.rectangle).toEqual([117, 694, 164.298, 720]);
    });

    it('should not set and get an invalid rectangle', function() {
      const annotation = new Annotation({ dict, ref, });
      annotation.setRectangle([117, 694, 164.298]);

      expect(annotation.rectangle).toEqual([0, 0, 0, 0]);
    });

    it('should reject a color if it is not an array', function() {
      const annotation = new Annotation({ dict, ref, });
      annotation.setColor('red');

      expect(annotation.color).toEqual(new Uint8ClampedArray([0, 0, 0]));
    });

    it('should set and get a transparent color', function() {
      const annotation = new Annotation({ dict, ref, });
      annotation.setColor([]);

      expect(annotation.color).toEqual(null);
    });

    it('should set and get a grayscale color', function() {
      const annotation = new Annotation({ dict, ref, });
      annotation.setColor([0.4]);

      expect(annotation.color).toEqual(new Uint8ClampedArray([102, 102, 102]));
    });

    it('should set and get an RGB color', function() {
      const annotation = new Annotation({ dict, ref, });
      annotation.setColor([0, 0, 1]);

      expect(annotation.color).toEqual(new Uint8ClampedArray([0, 0, 255]));
    });

    it('should set and get a CMYK color', function() {
      const annotation = new Annotation({ dict, ref, });
      annotation.setColor([0.1, 0.92, 0.84, 0.02]);

      expect(annotation.color).toEqual(new Uint8ClampedArray([234, 59, 48]));
    });

    it('should not set and get an invalid color', function() {
      const annotation = new Annotation({ dict, ref, });
      annotation.setColor([0.4, 0.6]);

      expect(annotation.color).toEqual(new Uint8ClampedArray([0, 0, 0]));
    });
  });

  describe('AnnotationBorderStyle', function() {
    it('should set and get a valid width', function() {
      const borderStyle = new AnnotationBorderStyle();
      borderStyle.setWidth(3);

      expect(borderStyle.width).toEqual(3);
    });

    it('should not set and get an invalid width', function() {
      const borderStyle = new AnnotationBorderStyle();
      borderStyle.setWidth('three');

      expect(borderStyle.width).toEqual(1);
    });

    it('should set the width to zero, when the input is a `Name` (issue 10385)',
        function() {
      const borderStyleZero = new AnnotationBorderStyle();
      borderStyleZero.setWidth(Name.get('0'));
      const borderStyleFive = new AnnotationBorderStyle();
      borderStyleFive.setWidth(Name.get('5'));

      expect(borderStyleZero.width).toEqual(0);
      expect(borderStyleFive.width).toEqual(0);
    });

    it('should set and get a valid style', function() {
      const borderStyle = new AnnotationBorderStyle();
      borderStyle.setStyle(Name.get('D'));

      expect(borderStyle.style).toEqual(AnnotationBorderStyleType.DASHED);
    });

    it('should not set and get an invalid style', function() {
      const borderStyle = new AnnotationBorderStyle();
      borderStyle.setStyle('Dashed');

      expect(borderStyle.style).toEqual(AnnotationBorderStyleType.SOLID);
    });

    it('should set and get a valid dash array', function() {
      const borderStyle = new AnnotationBorderStyle();
      borderStyle.setDashArray([1, 2, 3]);

      expect(borderStyle.dashArray).toEqual([1, 2, 3]);
    });

    it('should not set and get an invalid dash array', function() {
      const borderStyle = new AnnotationBorderStyle();
      borderStyle.setDashArray([0, 0]);

      expect(borderStyle.dashArray).toEqual([3]);
    });

    it('should set and get a valid horizontal corner radius', function() {
      const borderStyle = new AnnotationBorderStyle();
      borderStyle.setHorizontalCornerRadius(3);

      expect(borderStyle.horizontalCornerRadius).toEqual(3);
    });

    it('should not set and get an invalid horizontal corner radius',
        function() {
      const borderStyle = new AnnotationBorderStyle();
      borderStyle.setHorizontalCornerRadius('three');

      expect(borderStyle.horizontalCornerRadius).toEqual(0);
    });

    it('should set and get a valid vertical corner radius', function() {
      const borderStyle = new AnnotationBorderStyle();
      borderStyle.setVerticalCornerRadius(3);

      expect(borderStyle.verticalCornerRadius).toEqual(3);
    });

    it('should not set and get an invalid vertical corner radius', function() {
      const borderStyle = new AnnotationBorderStyle();
      borderStyle.setVerticalCornerRadius('three');

      expect(borderStyle.verticalCornerRadius).toEqual(0);
    });
  });

  describe('LinkAnnotation', function() {
    it('should correctly parse a URI action', function(done) {
      const actionDict = new Dict();
      actionDict.set('Type', Name.get('Action'));
      actionDict.set('S', Name.get('URI'));
      actionDict.set('URI', 'http://www.ctan.org/tex-archive/info/lshort');

      const annotationDict = new Dict();
      annotationDict.set('Type', Name.get('Annot'));
      annotationDict.set('Subtype', Name.get('Link'));
      annotationDict.set('A', actionDict);

      const annotationRef = new Ref(820, 0);
      const xref = new XRefMock([
        { ref: annotationRef, data: annotationDict, }
      ]);

      AnnotationFactory.create(xref, annotationRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.LINK);
        expect(data.url).toEqual('http://www.ctan.org/tex-archive/info/lshort');
        expect(data.unsafeUrl).toEqual(
          'http://www.ctan.org/tex-archive/info/lshort');
        expect(data.dest).toBeUndefined();
        done();
      }, done.fail);
    });

    it('should correctly parse a URI action, where the URI entry ' +
       'is missing a protocol', function(done) {
      const actionDict = new Dict();
      actionDict.set('Type', Name.get('Action'));
      actionDict.set('S', Name.get('URI'));
      actionDict.set('URI', 'www.hmrc.gov.uk');

      const annotationDict = new Dict();
      annotationDict.set('Type', Name.get('Annot'));
      annotationDict.set('Subtype', Name.get('Link'));
      annotationDict.set('A', actionDict);

      const annotationRef = new Ref(353, 0);
      const xref = new XRefMock([
        { ref: annotationRef, data: annotationDict, }
      ]);

      AnnotationFactory.create(xref, annotationRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.LINK);
        expect(data.url).toEqual('http://www.hmrc.gov.uk/');
        expect(data.unsafeUrl).toEqual('http://www.hmrc.gov.uk');
        expect(data.dest).toBeUndefined();
        done();
      }, done.fail);
    });

    it('should correctly parse a URI action, where the URI entry ' +
       'has an incorrect encoding (bug 1122280)', function(done) {
      const actionStream = new StringStream(
        '<<\n' +
        '/Type /Action\n' +
        '/S /URI\n' +
        '/URI (http://www.example.com/\\303\\274\\303\\266\\303\\244)\n' +
        '>>\n'
      );
      const lexer = new Lexer(actionStream);
      const parser = new Parser(lexer);
      const actionDict = parser.getObj();

      const annotationDict = new Dict();
      annotationDict.set('Type', Name.get('Annot'));
      annotationDict.set('Subtype', Name.get('Link'));
      annotationDict.set('A', actionDict);

      const annotationRef = new Ref(8, 0);
      const xref = new XRefMock([
        { ref: annotationRef, data: annotationDict, }
      ]);

      AnnotationFactory.create(xref, annotationRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.LINK);
        expect(data.url).toEqual(
          new URL(stringToUTF8String(
            'http://www.example.com/\xC3\xBC\xC3\xB6\xC3\xA4')).href);
        expect(data.unsafeUrl).toEqual(
          stringToUTF8String(
            'http://www.example.com/\xC3\xBC\xC3\xB6\xC3\xA4'));
        expect(data.dest).toBeUndefined();
        done();
      }, done.fail);
    });

    it('should correctly parse a GoTo action', function(done) {
      const actionDict = new Dict();
      actionDict.set('Type', Name.get('Action'));
      actionDict.set('S', Name.get('GoTo'));
      actionDict.set('D', 'page.157');

      const annotationDict = new Dict();
      annotationDict.set('Type', Name.get('Annot'));
      annotationDict.set('Subtype', Name.get('Link'));
      annotationDict.set('A', actionDict);

      const annotationRef = new Ref(798, 0);
      const xref = new XRefMock([
        { ref: annotationRef, data: annotationDict, }
      ]);

      AnnotationFactory.create(xref, annotationRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.LINK);
        expect(data.url).toBeUndefined();
        expect(data.unsafeUrl).toBeUndefined();
        expect(data.dest).toEqual('page.157');
        done();
      }, done.fail);
    });

    it('should correctly parse a GoToR action, where the FileSpec entry ' +
       'is a string containing a relative URL', function(done) {
      const actionDict = new Dict();
      actionDict.set('Type', Name.get('Action'));
      actionDict.set('S', Name.get('GoToR'));
      actionDict.set('F', '../../0013/001346/134685E.pdf');
      actionDict.set('D', '4.3');
      actionDict.set('NewWindow', true);

      const annotationDict = new Dict();
      annotationDict.set('Type', Name.get('Annot'));
      annotationDict.set('Subtype', Name.get('Link'));
      annotationDict.set('A', actionDict);

      const annotationRef = new Ref(489, 0);
      const xref = new XRefMock([
        { ref: annotationRef, data: annotationDict, }
      ]);

      AnnotationFactory.create(xref, annotationRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.LINK);
        expect(data.url).toBeUndefined();
        expect(data.unsafeUrl).toEqual('../../0013/001346/134685E.pdf#4.3');
        expect(data.dest).toBeUndefined();
        expect(data.newWindow).toEqual(true);
        done();
      }, done.fail);
    });

    it('should correctly parse a GoToR action, containing a relative URL, ' +
       'with the "docBaseUrl" parameter specified', function(done) {
      const actionDict = new Dict();
      actionDict.set('Type', Name.get('Action'));
      actionDict.set('S', Name.get('GoToR'));
      actionDict.set('F', '../../0013/001346/134685E.pdf');
      actionDict.set('D', '4.3');

      const annotationDict = new Dict();
      annotationDict.set('Type', Name.get('Annot'));
      annotationDict.set('Subtype', Name.get('Link'));
      annotationDict.set('A', actionDict);

      const annotationRef = new Ref(489, 0);
      const xref = new XRefMock([
        { ref: annotationRef, data: annotationDict, }
      ]);
      const pdfManager = new PDFManagerMock({
        docBaseUrl: 'http://www.example.com/test/pdfs/qwerty.pdf',
      });

      AnnotationFactory.create(xref, annotationRef, pdfManager,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.LINK);
        expect(data.url).toEqual(
          'http://www.example.com/0013/001346/134685E.pdf#4.3');
        expect(data.unsafeUrl).toEqual('../../0013/001346/134685E.pdf#4.3');
        expect(data.dest).toBeUndefined();
        done();
      }, done.fail);
    });

    it('should correctly parse a GoToR action, with named destination',
        function(done) {
      const actionDict = new Dict();
      actionDict.set('Type', Name.get('Action'));
      actionDict.set('S', Name.get('GoToR'));
      actionDict.set('F', 'http://www.example.com/test.pdf');
      actionDict.set('D', '15');

      const annotationDict = new Dict();
      annotationDict.set('Type', Name.get('Annot'));
      annotationDict.set('Subtype', Name.get('Link'));
      annotationDict.set('A', actionDict);

      const annotationRef = new Ref(495, 0);
      const xref = new XRefMock([
        { ref: annotationRef, data: annotationDict, }
      ]);

      AnnotationFactory.create(xref, annotationRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.LINK);
        expect(data.url).toEqual('http://www.example.com/test.pdf#15');
        expect(data.unsafeUrl).toEqual('http://www.example.com/test.pdf#15');
        expect(data.dest).toBeUndefined();
        expect(data.newWindow).toBeFalsy();
        done();
      }, done.fail);
    });

    it('should correctly parse a GoToR action, with explicit destination array',
        function(done) {
      const actionDict = new Dict();
      actionDict.set('Type', Name.get('Action'));
      actionDict.set('S', Name.get('GoToR'));
      actionDict.set('F', 'http://www.example.com/test.pdf');
      actionDict.set('D', [14, Name.get('XYZ'), null, 298.043, null]);

      const annotationDict = new Dict();
      annotationDict.set('Type', Name.get('Annot'));
      annotationDict.set('Subtype', Name.get('Link'));
      annotationDict.set('A', actionDict);

      const annotationRef = new Ref(489, 0);
      const xref = new XRefMock([
        { ref: annotationRef, data: annotationDict, }
      ]);

      AnnotationFactory.create(xref, annotationRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.LINK);
        expect(data.url).toEqual(new URL('http://www.example.com/test.pdf#' +
                                 '[14,{"name":"XYZ"},null,298.043,null]').href);
        expect(data.unsafeUrl).toEqual('http://www.example.com/test.pdf#' +
                                       '[14,{"name":"XYZ"},null,298.043,null]');
        expect(data.dest).toBeUndefined();
        expect(data.newWindow).toBeFalsy();
        done();
      }, done.fail);
    });

    it('should correctly parse a Launch action, where the FileSpec dict ' +
       'contains a relative URL, with the "docBaseUrl" parameter specified',
        function(done) {
      const fileSpecDict = new Dict();
      fileSpecDict.set('Type', Name.get('FileSpec'));
      fileSpecDict.set('F', 'Part II/Part II.pdf');
      fileSpecDict.set('UF', 'Part II/Part II.pdf');

      const actionDict = new Dict();
      actionDict.set('Type', Name.get('Action'));
      actionDict.set('S', Name.get('Launch'));
      actionDict.set('F', fileSpecDict);
      actionDict.set('NewWindow', true);

      const annotationDict = new Dict();
      annotationDict.set('Type', Name.get('Annot'));
      annotationDict.set('Subtype', Name.get('Link'));
      annotationDict.set('A', actionDict);

      const annotationRef = new Ref(88, 0);
      const xref = new XRefMock([
        { ref: annotationRef, data: annotationDict, }
      ]);
      const pdfManager = new PDFManagerMock({
        docBaseUrl: 'http://www.example.com/test/pdfs/qwerty.pdf',
      });

      AnnotationFactory.create(xref, annotationRef, pdfManager,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.LINK);
        expect(data.url).toEqual(
          new URL('http://www.example.com/test/pdfs/Part II/Part II.pdf').href);
        expect(data.unsafeUrl).toEqual('Part II/Part II.pdf');
        expect(data.dest).toBeUndefined();
        expect(data.newWindow).toEqual(true);
        done();
      }, done.fail);
    });

    it('should recover valid URLs from JavaScript actions having certain ' +
       'white-listed formats', function(done) {
      function checkJsAction(params) {
        const jsEntry = params.jsEntry;
        const expectedUrl = params.expectedUrl;
        const expectedUnsafeUrl = params.expectedUnsafeUrl;
        const expectedNewWindow = params.expectedNewWindow;

        const actionDict = new Dict();
        actionDict.set('Type', Name.get('Action'));
        actionDict.set('S', Name.get('JavaScript'));
        actionDict.set('JS', jsEntry);

        const annotationDict = new Dict();
        annotationDict.set('Type', Name.get('Annot'));
        annotationDict.set('Subtype', Name.get('Link'));
        annotationDict.set('A', actionDict);

        const annotationRef = new Ref(46, 0);
        const xref = new XRefMock([
          { ref: annotationRef, data: annotationDict, }
        ]);

        return AnnotationFactory.create(xref, annotationRef, pdfManagerMock,
            idFactoryMock).then(({ data, }) => {
          expect(data.annotationType).toEqual(AnnotationType.LINK);
          expect(data.url).toEqual(expectedUrl);
          expect(data.unsafeUrl).toEqual(expectedUnsafeUrl);
          expect(data.dest).toBeUndefined();
          expect(data.newWindow).toEqual(expectedNewWindow);
        });
      }

      // Check that we reject a 'JS' entry containing arbitrary JavaScript.
      const annotation1 = checkJsAction({
        jsEntry: 'function someFun() { return "qwerty"; } someFun();',
        expectedUrl: undefined,
        expectedUnsafeUrl: undefined,
        expectedNewWindow: undefined,
      });

      // Check that we accept a white-listed {string} 'JS' entry.
      const annotation2 = checkJsAction({
        jsEntry: 'window.open(\'http://www.example.com/test.pdf\')',
        expectedUrl: new URL('http://www.example.com/test.pdf').href,
        expectedUnsafeUrl: 'http://www.example.com/test.pdf',
        expectedNewWindow: undefined,
      });

      // Check that we accept a white-listed {Stream} 'JS' entry.
      const annotation3 = checkJsAction({
        jsEntry: new StringStream(
                   'app.launchURL("http://www.example.com/test.pdf", true)'),
        expectedUrl: new URL('http://www.example.com/test.pdf').href,
        expectedUnsafeUrl: 'http://www.example.com/test.pdf',
        expectedNewWindow: true,
      });

      Promise.all([annotation1, annotation2, annotation3]).then(done,
                                                                done.fail);
    });

    it('should correctly parse a Named action', function(done) {
      const actionDict = new Dict();
      actionDict.set('Type', Name.get('Action'));
      actionDict.set('S', Name.get('Named'));
      actionDict.set('N', Name.get('GoToPage'));

      const annotationDict = new Dict();
      annotationDict.set('Type', Name.get('Annot'));
      annotationDict.set('Subtype', Name.get('Link'));
      annotationDict.set('A', actionDict);

      const annotationRef = new Ref(12, 0);
      const xref = new XRefMock([
        { ref: annotationRef, data: annotationDict, }
      ]);

      AnnotationFactory.create(xref, annotationRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.LINK);
        expect(data.url).toBeUndefined();
        expect(data.unsafeUrl).toBeUndefined();
        expect(data.action).toEqual('GoToPage');
        done();
      }, done.fail);
    });

    it('should correctly parse a simple Dest', function(done) {
      const annotationDict = new Dict();
      annotationDict.set('Type', Name.get('Annot'));
      annotationDict.set('Subtype', Name.get('Link'));
      annotationDict.set('Dest', Name.get('LI0'));

      const annotationRef = new Ref(583, 0);
      const xref = new XRefMock([
        { ref: annotationRef, data: annotationDict, }
      ]);

      AnnotationFactory.create(xref, annotationRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.LINK);
        expect(data.url).toBeUndefined();
        expect(data.unsafeUrl).toBeUndefined();
        expect(data.dest).toEqual('LI0');
        done();
      }, done.fail);
    });

    it('should correctly parse a simple Dest, with explicit destination array',
        function(done) {
      const annotationDict = new Dict();
      annotationDict.set('Type', Name.get('Annot'));
      annotationDict.set('Subtype', Name.get('Link'));
      annotationDict.set('Dest', [new Ref(17, 0), Name.get('XYZ'),
                                  0, 841.89, null]);

      const annotationRef = new Ref(10, 0);
      const xref = new XRefMock([
        { ref: annotationRef, data: annotationDict, }
      ]);

      AnnotationFactory.create(xref, annotationRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.LINK);
        expect(data.url).toBeUndefined();
        expect(data.unsafeUrl).toBeUndefined();
        expect(data.dest).toEqual([{ num: 17, gen: 0, }, { name: 'XYZ', },
                                   0, 841.89, null]);
        done();
      }, done.fail);
    });

    it('should correctly parse a Dest, which violates the specification ' +
       'by containing a dictionary', function(done) {
      let destDict = new Dict();
      destDict.set('Type', Name.get('Action'));
      destDict.set('S', Name.get('GoTo'));
      destDict.set('D', 'page.157');

      let annotationDict = new Dict();
      annotationDict.set('Type', Name.get('Annot'));
      annotationDict.set('Subtype', Name.get('Link'));
      // The /Dest must be a Name or an Array, refer to ISO 32000-1:2008
      // section 12.3.3, but there are PDF files where it's a dictionary.
      annotationDict.set('Dest', destDict);

      let annotationRef = new Ref(798, 0);
      let xref = new XRefMock([
        { ref: annotationRef, data: annotationDict, }
      ]);

      AnnotationFactory.create(xref, annotationRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.LINK);
        expect(data.url).toBeUndefined();
        expect(data.unsafeUrl).toBeUndefined();
        expect(data.dest).toEqual('page.157');
        done();
      }, done.fail);
    });
  });

  describe('WidgetAnnotation', function() {
    let widgetDict;

    beforeEach(function(done) {
      widgetDict = new Dict();
      widgetDict.set('Type', Name.get('Annot'));
      widgetDict.set('Subtype', Name.get('Widget'));
      done();
    });

    afterEach(function() {
      widgetDict = null;
    });

    it('should handle unknown field names', function(done) {
      const widgetRef = new Ref(20, 0);
      const xref = new XRefMock([
        { ref: widgetRef, data: widgetDict, }
      ]);

      AnnotationFactory.create(xref, widgetRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.WIDGET);
        expect(data.fieldName).toEqual('');
        done();
      }, done.fail);
    });

    it('should construct the field name when there are no ancestors',
        function(done) {
      widgetDict.set('T', 'foo');

      const widgetRef = new Ref(21, 0);
      const xref = new XRefMock([
        { ref: widgetRef, data: widgetDict, }
      ]);

      AnnotationFactory.create(xref, widgetRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.WIDGET);
        expect(data.fieldName).toEqual('foo');
        done();
      }, done.fail);
    });

    it('should construct the field name when there are ancestors',
        function(done) {
      const firstParent = new Dict();
      firstParent.set('T', 'foo');

      const secondParent = new Dict();
      secondParent.set('Parent', firstParent);
      secondParent.set('T', 'bar');

      widgetDict.set('Parent', secondParent);
      widgetDict.set('T', 'baz');

      const widgetRef = new Ref(22, 0);
      const xref = new XRefMock([
        { ref: widgetRef, data: widgetDict, }
      ]);

      AnnotationFactory.create(xref, widgetRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.WIDGET);
        expect(data.fieldName).toEqual('foo.bar.baz');
        done();
      }, done.fail);
    });

    it('should construct the field name if a parent is not a dictionary ' +
       '(issue 8143)', function(done) {
      const parentDict = new Dict();
      parentDict.set('Parent', null);
      parentDict.set('T', 'foo');

      widgetDict.set('Parent', parentDict);
      widgetDict.set('T', 'bar');

      const widgetRef = new Ref(22, 0);
      const xref = new XRefMock([
        { ref: widgetRef, data: widgetDict, }
      ]);

      AnnotationFactory.create(xref, widgetRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.WIDGET);
        expect(data.fieldName).toEqual('foo.bar');
        done();
      }, done.fail);
    });
  });

  describe('TextWidgetAnnotation', function() {
    let textWidgetDict;

    beforeEach(function(done) {
      textWidgetDict = new Dict();
      textWidgetDict.set('Type', Name.get('Annot'));
      textWidgetDict.set('Subtype', Name.get('Widget'));
      textWidgetDict.set('FT', Name.get('Tx'));
      done();
    });

    afterEach(function() {
      textWidgetDict = null;
    });

    it('should handle unknown text alignment, maximum length and flags',
        function(done) {
      const textWidgetRef = new Ref(124, 0);
      const xref = new XRefMock([
        { ref: textWidgetRef, data: textWidgetDict, }
      ]);

      AnnotationFactory.create(xref, textWidgetRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.WIDGET);
        expect(data.textAlignment).toEqual(null);
        expect(data.maxLen).toEqual(null);
        expect(data.readOnly).toEqual(false);
        expect(data.multiLine).toEqual(false);
        expect(data.comb).toEqual(false);
        done();
      }, done.fail);
    });

    it('should not set invalid text alignment, maximum length and flags',
        function(done) {
      textWidgetDict.set('Q', 'center');
      textWidgetDict.set('MaxLen', 'five');
      textWidgetDict.set('Ff', 'readonly');

      const textWidgetRef = new Ref(43, 0);
      const xref = new XRefMock([
        { ref: textWidgetRef, data: textWidgetDict, }
      ]);

      AnnotationFactory.create(xref, textWidgetRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.WIDGET);
        expect(data.textAlignment).toEqual(null);
        expect(data.maxLen).toEqual(null);
        expect(data.readOnly).toEqual(false);
        expect(data.multiLine).toEqual(false);
        expect(data.comb).toEqual(false);
        done();
      }, done.fail);
    });

    it('should set valid text alignment, maximum length and flags',
        function(done) {
      textWidgetDict.set('Q', 1);
      textWidgetDict.set('MaxLen', 20);
      textWidgetDict.set('Ff', AnnotationFieldFlag.READONLY +
                               AnnotationFieldFlag.MULTILINE);

      const textWidgetRef = new Ref(84, 0);
      const xref = new XRefMock([
        { ref: textWidgetRef, data: textWidgetDict, }
      ]);

      AnnotationFactory.create(xref, textWidgetRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.WIDGET);
        expect(data.textAlignment).toEqual(1);
        expect(data.maxLen).toEqual(20);
        expect(data.readOnly).toEqual(true);
        expect(data.multiLine).toEqual(true);
        done();
      }, done.fail);
    });

    it('should reject comb fields without a maximum length', function(done) {
      textWidgetDict.set('Ff', AnnotationFieldFlag.COMB);

      const textWidgetRef = new Ref(46, 0);
      const xref = new XRefMock([
        { ref: textWidgetRef, data: textWidgetDict, }
      ]);

      AnnotationFactory.create(xref, textWidgetRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.WIDGET);
        expect(data.comb).toEqual(false);
        done();
      }, done.fail);
    });

    it('should accept comb fields with a maximum length', function(done) {
      textWidgetDict.set('MaxLen', 20);
      textWidgetDict.set('Ff', AnnotationFieldFlag.COMB);

      const textWidgetRef = new Ref(46, 0);
      const xref = new XRefMock([
        { ref: textWidgetRef, data: textWidgetDict, }
      ]);

      AnnotationFactory.create(xref, textWidgetRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.WIDGET);
        expect(data.comb).toEqual(true);
        done();
      }, done.fail);
    });

    it('should only accept comb fields when the flags are valid',
        function(done) {
      let invalidFieldFlags = [
        AnnotationFieldFlag.MULTILINE,
        AnnotationFieldFlag.PASSWORD,
        AnnotationFieldFlag.FILESELECT,
      ];

      // Start with all invalid flags set and remove them one by one.
      // The field may only use combs when all invalid flags are unset.
      let flags = AnnotationFieldFlag.COMB + AnnotationFieldFlag.MULTILINE +
                  AnnotationFieldFlag.PASSWORD + AnnotationFieldFlag.FILESELECT;

      let promise = Promise.resolve();
      for (let i = 0, ii = invalidFieldFlags.length; i <= ii; i++) {
        promise = promise.then(() => {
          textWidgetDict.set('MaxLen', 20);
          textWidgetDict.set('Ff', flags);

          const textWidgetRef = new Ref(93, 0);
          const xref = new XRefMock([
            { ref: textWidgetRef, data: textWidgetDict, }
          ]);

          return AnnotationFactory.create(xref, textWidgetRef, pdfManagerMock,
                                          idFactoryMock).then(({ data, }) => {
            expect(data.annotationType).toEqual(AnnotationType.WIDGET);

            const valid = (invalidFieldFlags.length === 0);
            expect(data.comb).toEqual(valid);

            // Remove the last invalid flag for the next iteration.
            if (!valid) {
              flags -= invalidFieldFlags.pop();
            }
          });
        });
      }
      promise.then(done, done.fail);
    });
  });

  describe('ButtonWidgetAnnotation', function() {
    let buttonWidgetDict;

    beforeEach(function(done) {
      buttonWidgetDict = new Dict();
      buttonWidgetDict.set('Type', Name.get('Annot'));
      buttonWidgetDict.set('Subtype', Name.get('Widget'));
      buttonWidgetDict.set('FT', Name.get('Btn'));
      done();
    });

    afterEach(function() {
      buttonWidgetDict = null;
    });

    it('should handle checkboxes with export value', function(done) {
      buttonWidgetDict.set('V', Name.get('1'));

      const appearanceStatesDict = new Dict();
      const exportValueOptionsDict = new Dict();

      exportValueOptionsDict.set('Off', 0);
      exportValueOptionsDict.set('Checked', 1);
      appearanceStatesDict.set('D', exportValueOptionsDict);
      buttonWidgetDict.set('AP', appearanceStatesDict);

      const buttonWidgetRef = new Ref(124, 0);
      const xref = new XRefMock([
        { ref: buttonWidgetRef, data: buttonWidgetDict, }
      ]);

      AnnotationFactory.create(xref, buttonWidgetRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.WIDGET);
        expect(data.checkBox).toEqual(true);
        expect(data.fieldValue).toEqual('1');
        expect(data.radioButton).toEqual(false);
        expect(data.exportValue).toEqual('Checked');
        done();
      }, done.fail);
    });

    it('should handle checkboxes without export value', function(done) {
      buttonWidgetDict.set('V', Name.get('1'));

      const buttonWidgetRef = new Ref(124, 0);
      const xref = new XRefMock([
        { ref: buttonWidgetRef, data: buttonWidgetDict, }
      ]);

      AnnotationFactory.create(xref, buttonWidgetRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.WIDGET);
        expect(data.checkBox).toEqual(true);
        expect(data.fieldValue).toEqual('1');
        expect(data.radioButton).toEqual(false);
        done();
      }, done.fail);
    });

    it('should handle radio buttons with a field value', function(done) {
      const parentDict = new Dict();
      parentDict.set('V', Name.get('1'));

      const normalAppearanceStateDict = new Dict();
      normalAppearanceStateDict.set('2', null);

      const appearanceStatesDict = new Dict();
      appearanceStatesDict.set('N', normalAppearanceStateDict);

      buttonWidgetDict.set('Ff', AnnotationFieldFlag.RADIO);
      buttonWidgetDict.set('Parent', parentDict);
      buttonWidgetDict.set('AP', appearanceStatesDict);

      const buttonWidgetRef = new Ref(124, 0);
      const xref = new XRefMock([
        { ref: buttonWidgetRef, data: buttonWidgetDict, }
      ]);

      AnnotationFactory.create(xref, buttonWidgetRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.WIDGET);
        expect(data.checkBox).toEqual(false);
        expect(data.radioButton).toEqual(true);
        expect(data.fieldValue).toEqual('1');
        expect(data.buttonValue).toEqual('2');
        done();
      }, done.fail);
    });

    it('should handle radio buttons without a field value', function(done) {
      const normalAppearanceStateDict = new Dict();
      normalAppearanceStateDict.set('2', null);

      const appearanceStatesDict = new Dict();
      appearanceStatesDict.set('N', normalAppearanceStateDict);

      buttonWidgetDict.set('Ff', AnnotationFieldFlag.RADIO);
      buttonWidgetDict.set('AP', appearanceStatesDict);

      const buttonWidgetRef = new Ref(124, 0);
      const xref = new XRefMock([
        { ref: buttonWidgetRef, data: buttonWidgetDict, }
      ]);

      AnnotationFactory.create(xref, buttonWidgetRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.WIDGET);
        expect(data.checkBox).toEqual(false);
        expect(data.radioButton).toEqual(true);
        expect(data.fieldValue).toEqual(null);
        expect(data.buttonValue).toEqual('2');
        done();
      }, done.fail);
    });
  });

  describe('ChoiceWidgetAnnotation', function() {
    let choiceWidgetDict;

    beforeEach(function(done) {
      choiceWidgetDict = new Dict();
      choiceWidgetDict.set('Type', Name.get('Annot'));
      choiceWidgetDict.set('Subtype', Name.get('Widget'));
      choiceWidgetDict.set('FT', Name.get('Ch'));
      done();
    });

    afterEach(function() {
      choiceWidgetDict = null;
    });

    it('should handle missing option arrays', function(done) {
      const choiceWidgetRef = new Ref(122, 0);
      const xref = new XRefMock([
        { ref: choiceWidgetRef, data: choiceWidgetDict, }
      ]);

      AnnotationFactory.create(xref, choiceWidgetRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.WIDGET);
        expect(data.options).toEqual([]);
        done();
      }, done.fail);
    });

    it('should handle option arrays with array elements', function(done) {
      const optionBarRef = new Ref(20, 0);
      const optionBarStr = 'Bar';
      const optionOneRef = new Ref(10, 0);
      const optionOneArr = ['bar_export', optionBarRef];

      const options = [['foo_export', 'Foo'], optionOneRef];
      const expected = [
        { exportValue: 'foo_export', displayValue: 'Foo', },
        { exportValue: 'bar_export', displayValue: 'Bar', },
      ];

      choiceWidgetDict.set('Opt', options);

      const choiceWidgetRef = new Ref(123, 0);
      const xref = new XRefMock([
        { ref: choiceWidgetRef, data: choiceWidgetDict, },
        { ref: optionBarRef, data: optionBarStr, },
        { ref: optionOneRef, data: optionOneArr, },
      ]);

      AnnotationFactory.create(xref, choiceWidgetRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.WIDGET);
        expect(data.options).toEqual(expected);
        done();
      }, done.fail);
    });

    it('should handle option arrays with string elements', function(done) {
      const optionBarRef = new Ref(10, 0);
      const optionBarStr = 'Bar';

      const options = ['Foo', optionBarRef];
      const expected = [
        { exportValue: 'Foo', displayValue: 'Foo', },
        { exportValue: 'Bar', displayValue: 'Bar', },
      ];

      choiceWidgetDict.set('Opt', options);

      const choiceWidgetRef = new Ref(981, 0);
      const xref = new XRefMock([
        { ref: choiceWidgetRef, data: choiceWidgetDict, },
        { ref: optionBarRef, data: optionBarStr, }
      ]);

      AnnotationFactory.create(xref, choiceWidgetRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.WIDGET);
        expect(data.options).toEqual(expected);
        done();
      }, done.fail);
    });

    it('should handle inherited option arrays (issue 8094)', function(done) {
      const options = [
        ['Value1', 'Description1'],
        ['Value2', 'Description2'],
      ];
      const expected = [
        { exportValue: 'Value1', displayValue: 'Description1', },
        { exportValue: 'Value2', displayValue: 'Description2', },
      ];

      const parentDict = new Dict();
      parentDict.set('Opt', options);

      choiceWidgetDict.set('Parent', parentDict);

      const choiceWidgetRef = new Ref(123, 0);
      const xref = new XRefMock([
        { ref: choiceWidgetRef, data: choiceWidgetDict, },
      ]);

      AnnotationFactory.create(xref, choiceWidgetRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.WIDGET);
        expect(data.options).toEqual(expected);
        done();
      }, done.fail);
    });

    it('should sanitize display values in option arrays (issue 8947)',
        function(done) {
      // The option value is a UTF-16BE string. The display value should be
      // sanitized, but the export value should remain the same since that
      // may be used as a unique identifier when exporting form values.
      const options = ['\xFE\xFF\x00F\x00o\x00o'];
      const expected = [
        { exportValue: '\xFE\xFF\x00F\x00o\x00o', displayValue: 'Foo', },
      ];

      choiceWidgetDict.set('Opt', options);

      const choiceWidgetRef = new Ref(984, 0);
      const xref = new XRefMock([
        { ref: choiceWidgetRef, data: choiceWidgetDict, },
      ]);

      AnnotationFactory.create(xref, choiceWidgetRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.WIDGET);
        expect(data.options).toEqual(expected);
        done();
      }, done.fail);
    });

    it('should handle array field values', function(done) {
      const fieldValue = ['Foo', 'Bar'];

      choiceWidgetDict.set('V', fieldValue);

      const choiceWidgetRef = new Ref(968, 0);
      const xref = new XRefMock([
        { ref: choiceWidgetRef, data: choiceWidgetDict, }
      ]);

      AnnotationFactory.create(xref, choiceWidgetRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.WIDGET);
        expect(data.fieldValue).toEqual(fieldValue);
        done();
      }, done.fail);
    });

    it('should handle string field values', function(done) {
      const fieldValue = 'Foo';

      choiceWidgetDict.set('V', fieldValue);

      const choiceWidgetRef = new Ref(978, 0);
      const xref = new XRefMock([
        { ref: choiceWidgetRef, data: choiceWidgetDict, }
      ]);

      AnnotationFactory.create(xref, choiceWidgetRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.WIDGET);
        expect(data.fieldValue).toEqual([fieldValue]);
        done();
      }, done.fail);
    });

    it('should handle unknown flags', function(done) {
      const choiceWidgetRef = new Ref(166, 0);
      const xref = new XRefMock([
        { ref: choiceWidgetRef, data: choiceWidgetDict, }
      ]);

      AnnotationFactory.create(xref, choiceWidgetRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.WIDGET);
        expect(data.readOnly).toEqual(false);
        expect(data.combo).toEqual(false);
        expect(data.multiSelect).toEqual(false);
        done();
      }, done.fail);
    });

    it('should not set invalid flags', function(done) {
      choiceWidgetDict.set('Ff', 'readonly');

      const choiceWidgetRef = new Ref(165, 0);
      const xref = new XRefMock([
        { ref: choiceWidgetRef, data: choiceWidgetDict, }
      ]);

      AnnotationFactory.create(xref, choiceWidgetRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.WIDGET);
        expect(data.readOnly).toEqual(false);
        expect(data.combo).toEqual(false);
        expect(data.multiSelect).toEqual(false);
        done();
      }, done.fail);
    });

    it('should set valid flags', function(done) {
      choiceWidgetDict.set('Ff', AnnotationFieldFlag.READONLY +
                                 AnnotationFieldFlag.COMBO +
                                 AnnotationFieldFlag.MULTISELECT);

      const choiceWidgetRef = new Ref(512, 0);
      const xref = new XRefMock([
        { ref: choiceWidgetRef, data: choiceWidgetDict, }
      ]);

      AnnotationFactory.create(xref, choiceWidgetRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.WIDGET);
        expect(data.readOnly).toEqual(true);
        expect(data.combo).toEqual(true);
        expect(data.multiSelect).toEqual(true);
        done();
      }, done.fail);
    });
  });

  describe('LineAnnotation', function() {
    it('should set the line coordinates', function(done) {
      const lineDict = new Dict();
      lineDict.set('Type', Name.get('Annot'));
      lineDict.set('Subtype', Name.get('Line'));
      lineDict.set('L', [1, 2, 3, 4]);

      const lineRef = new Ref(122, 0);
      const xref = new XRefMock([
        { ref: lineRef, data: lineDict, }
      ]);

      AnnotationFactory.create(xref, lineRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.LINE);
        expect(data.lineCoordinates).toEqual([1, 2, 3, 4]);
        done();
      }, done.fail);
    });
  });

  describe('FileAttachmentAnnotation', function() {
    it('should correctly parse a file attachment', function(done) {
      const fileStream = new StringStream(
        '<<\n' +
        '/Type /EmbeddedFile\n' +
        '/Subtype /text#2Fplain\n' +
        '>>\n' +
        'stream\n' +
        'Test attachment' +
        'endstream\n'
      );
      const lexer = new Lexer(fileStream);
      const parser = new Parser(lexer, /* allowStreams = */ true);

      const fileStreamRef = new Ref(18, 0);
      const fileStreamDict = parser.getObj();

      const embeddedFileDict = new Dict();
      embeddedFileDict.set('F', fileStreamRef);

      const fileSpecRef = new Ref(19, 0);
      const fileSpecDict = new Dict();
      fileSpecDict.set('Type', Name.get('Filespec'));
      fileSpecDict.set('Desc', '');
      fileSpecDict.set('EF', embeddedFileDict);
      fileSpecDict.set('UF', 'Test.txt');

      const fileAttachmentRef = new Ref(20, 0);
      const fileAttachmentDict = new Dict();
      fileAttachmentDict.set('Type', Name.get('Annot'));
      fileAttachmentDict.set('Subtype', Name.get('FileAttachment'));
      fileAttachmentDict.set('FS', fileSpecRef);
      fileAttachmentDict.set('T', 'Topic');
      fileAttachmentDict.set('Contents', 'Test.txt');

      const xref = new XRefMock([
        { ref: fileStreamRef, data: fileStreamDict, },
        { ref: fileSpecRef, data: fileSpecDict, },
        { ref: fileAttachmentRef, data: fileAttachmentDict, }
      ]);
      embeddedFileDict.assignXref(xref);
      fileSpecDict.assignXref(xref);
      fileAttachmentDict.assignXref(xref);

      AnnotationFactory.create(xref, fileAttachmentRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.FILEATTACHMENT);
        expect(data.file.filename).toEqual('Test.txt');
        expect(data.file.content).toEqual(stringToBytes('Test attachment'));
        done();
      }, done.fail);
    });
  });

  describe('PopupAnnotation', function() {
    it('should inherit the parent flags when the Popup is not viewable, ' +
       'but the parent is (PR 7352)', function(done) {
      const parentDict = new Dict();
      parentDict.set('Type', Name.get('Annot'));
      parentDict.set('Subtype', Name.get('Text'));
      parentDict.set('F', 28); // viewable

      const popupDict = new Dict();
      popupDict.set('Type', Name.get('Annot'));
      popupDict.set('Subtype', Name.get('Popup'));
      popupDict.set('F', 25); // not viewable
      popupDict.set('Parent', parentDict);

      const popupRef = new Ref(13, 0);
      const xref = new XRefMock([
        { ref: popupRef, data: popupDict, }
      ]);

      AnnotationFactory.create(xref, popupRef, pdfManagerMock,
          idFactoryMock).then(({ data, viewable, }) => {
        expect(data.annotationType).toEqual(AnnotationType.POPUP);
        // We should not modify the `annotationFlags` returned through
        // e.g., the API.
        expect(data.annotationFlags).toEqual(25);
        // The popup should inherit the `viewable` property of the parent.
        expect(viewable).toEqual(true);
        done();
      }, done.fail);
    });
  });

  describe('InkAnnotation', function() {
    it('should handle a single ink list', function(done) {
      const inkDict = new Dict();
      inkDict.set('Type', Name.get('Annot'));
      inkDict.set('Subtype', Name.get('Ink'));
      inkDict.set('InkList', [[1, 1, 1, 2, 2, 2, 3, 3]]);

      const inkRef = new Ref(142, 0);
      const xref = new XRefMock([
        { ref: inkRef, data: inkDict, }
      ]);

      AnnotationFactory.create(xref, inkRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.INK);
        expect(data.inkLists.length).toEqual(1);
        expect(data.inkLists[0]).toEqual([
          { x: 1, y: 1, },
          { x: 1, y: 2, },
          { x: 2, y: 2, },
          { x: 3, y: 3, },
        ]);
        done();
      }, done.fail);
    });

    it('should handle multiple ink lists', function(done) {
      const inkDict = new Dict();
      inkDict.set('Type', Name.get('Annot'));
      inkDict.set('Subtype', Name.get('Ink'));
      inkDict.set('InkList', [
        [1, 1, 1, 2],
        [3, 3, 4, 5],
      ]);

      const inkRef = new Ref(143, 0);
      const xref = new XRefMock([
        { ref: inkRef, data: inkDict, }
      ]);

      AnnotationFactory.create(xref, inkRef, pdfManagerMock,
          idFactoryMock).then(({ data, }) => {
        expect(data.annotationType).toEqual(AnnotationType.INK);
        expect(data.inkLists.length).toEqual(2);
        expect(data.inkLists[0]).toEqual([
          { x: 1, y: 1, }, { x: 1, y: 2, }
        ]);
        expect(data.inkLists[1]).toEqual([
          { x: 3, y: 3, }, { x: 4, y: 5, }
        ]);
        done();
      }, done.fail);
    });
  });
});
