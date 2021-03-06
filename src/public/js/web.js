function initializeImageTranslateApp() {
    const image = document.getElementById('myImage');
    const canvas = new fabric.StaticCanvas('myCanvas');
    canvas.setHeight(600);
    canvas.setWidth(600);

    image.onload = function() {

        var fImage = new fabric.Image(image);
        if (fImage.width >= fImage.height) {
            fImage.scaleToWidth(canvas.getWidth());
            canvas.setHeight(fImage.getScaledHeight());
        } else {
            fImage.scaleToHeight(canvas.getHeight());
            canvas.setWidth(fImage.getScaledWidth());
        }
        canvas.add(fImage);


        document.getElementById('translateButton').onclick = () => {

            canvas.forEachObject((obj, index) => {
                if (index != 0)
                    canvas.remove(obj);
            })

            //Start setting Tesseract options
            tessOptions = {
                tessedit_pageseg_mode: 1
            };

            //Determine OCR method by which language is selected
            const srcLang = document.getElementById('language-src-select').value;
            console.log("srcLang: " + srcLang);
            const ocrMethod = getOCRMethodBySourceLanguage(srcLang);

            console.log("Using OCR method: " + ocrMethod);
            if (ocrMethod === "rekognize") {
                console.log("Using backend for OCR. Image dimensions: (" + image.width + "," + image.height + ")");
                backendOCR(image.src.split(',')[1], image.width, image.height); //split off the base64 header from img.src because Amazon doesn't like it
            } else { //use tesseract
                const tessLangMapping = [
                    ['arabic', 'ara'],
                    ['chinese_simplified', 'chi_sim'],
                    ['chinese_traditional', 'chi_tra'],
                    ['czech', 'ces'],
                    ['danish', 'dan'],
                    ['dutch', 'nld'],
                    ['english', 'eng'],
                    ['finnish', 'fin'],
                    ['french', 'fra'],
                    ['german', 'deu'],
                    ['hebrew', 'heb'],
                    ['indonesian', 'ind'],
                    ['italian', 'ita'],
                    ['japanese', 'jpn'],
                    ['korean', 'kor'],
                    ['polish', 'pol'],
                    ['portuguese', 'por'],
                    ['russian', 'rus'],
                    ['spanish', 'spa'],
                    ['swedish', 'swe'],
                    ['turkish', 'tur']
                ]; //I'm sure there's a more succinct way to represent this mapping, but I don't spend much time writing JS
                tessOptions.lang = 'eng'; //default to english in case no pair matches
                tessLangMapping.forEach(function(pair) {
                    if (pair[0] == srcLang) {
                        tessOptions.lang = pair[1];
                    } 
                });

                if (tessOptions.lang == 'eng') {
                    //This probably obviates the removeJunkText() function mostly, but I guess that can still
                    //get rid of stray consonants that aren't part of words.
                    tessOptions.tessedit_char_whitelist = "ABCDEFGHIJKLMNOPQRSTUVWYZabcdefghijklmnopqrstuvwxyz1234567890.?!"
                }

                tesseractRecognize(image, tessOptions);
            }
        }
    }
    return {image: image, canvas: canvas};
}

/* Returns the OCR method to be used for a particular language. All latin-text
 * lanuages return "rekognize", everything else returns "tesseract".
 * 
 * @param string srcLang the name of the language to check OCR method for
 * @returns string either "rekognize" or "tesseract"
 */
function getOCRMethodBySourceLanguage(srcLang) {
    const latinLangs = ['auto', 'czech', 'danish', 'dutch', 'english', 'finnish', 'french', 'german', 'indonesian', 'italian', 'polish', 'portugese', 'spanish', 'swedish', 'turkish'];

    if (latinLangs.includes(srcLang.toLowerCase()) && imageTranslateApp.pdf == false) {
        return "rekognize";
    }
    return "tesseract";
}

function tesseractRecognize(imageInput, options) {
    Tesseract.recognize(imageInput,options)
    .progress((progress) => {
        console.log(progress, "$$$$");
        if (progress.hasOwnProperty('progress')) {
            $('#progress').text(progress.status + ": " + (progress.progress * 100).toFixed(0) + " %");
        } else {
            $('#progress').text(progress.status);
        }
    }).then((result) => {
        console.log(result, "$$$$");

        //TODO FIXME this deletes the #progress span inside so progress doesn't get shown the next time around.
        $('#result > h6').append('<br>' + removeJunkText(result.text));
        handleOCRResult(result);
    });
}

/* Make an OCR request to the backend which uses some 3rd party API.
 * In particular the backend uses Amazon Rekognition for now, but the frontend
 * shouldn't need to know those details. */
function backendOCR(base64Image, imageWidth, imageHeight) {
    ocrReq({image: base64Image})
        .then(lines => {
            lines.lines = lines;
            for (var idx = 0; idx < lines.lines.length; idx++) {
                lines.lines[idx].bbox.x0 = Math.round(lines.lines[idx].bbox.x0 * imageWidth);
                lines.lines[idx].bbox.x1 = Math.round(lines.lines[idx].bbox.x1 * imageWidth);
                lines.lines[idx].bbox.y0 = Math.round(lines.lines[idx].bbox.y0 * imageHeight);
                lines.lines[idx].bbox.y1 = Math.round(lines.lines[idx].bbox.y1 * imageHeight);
            }
            console.log(lines);
            handleOCRResult(lines);
        })
        .catch(error => {
            console.error(error);
        });
}

async function ocrReq(data) {
    const res = await fetch('/ocr', { 
        method: 'POST', 
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(response => response.json()).catch(error => {
        console.error(error);
    });
    return res;
}

var validTypes = ['jpg', 'jpeg', 'png', 'pdf'];
function readURL(input) {
    if (input.files && input.files[0]) {
        var extension = input.files[0].name.split('.').pop().toLowerCase(),
        isSuccess = validTypes.indexOf(extension) > -1;
        if (isSuccess) {
            var reader = new FileReader();
            if(extension == 'pdf' ) {
                var image1 = URL.createObjectURL($('.file-upload-input').get(0).files[0]);
                showPDF(image1);
                reader.onload = function(e) {
                    $('.image-upload-wrap').hide();
                    $('#myImage').attr('src', e.target.result);
                    $('.file-upload-content').show();
                    $('.pdf-buttons').show();
                    $('.text-rendering-controls').hide();
                    $('.image-title').html(input.files[0].name);
                    input.value = null;
                };
                reader.readAsDataURL(input.files[0]);
                imageTranslateApp.pdf = true;
                
            } else if (extension == 'jpg', 'png', 'jpeg') {
		imageTranslateApp.pdf = false;

                //alert('You have inserted an image.');
                //Nothing else to do here because the image .onload function initiates OCR
                reader.onload = function(e) {
                    $('.image-upload-wrap').hide();
                    $('#myImage').attr('src', e.target.result);
                    $('.file-upload-content').show();
                    $('.pdf-buttons').hide();
                    $('.text-rendering-controls').hide();
                    $('.image-title').html(input.files[0].name);
                    input.value = null;
                };
                reader.readAsDataURL(input.files[0]);
            }
        } else {
            alert('Invalid File Type. Please insert JPG, JPEG, PNG, or PDF files.');
            removeUpload();
        }
    }

}

//read pdf file
var __PDF_DOC,
__CURRENT_PAGE,
__TOTAL_PAGES,
__PAGE_RENDERING_IN_PROGRESS = 0,
__CANVAS = document.createElement('canvas'),
__CANVAS_CTX = __CANVAS.getContext('2d');

//invisible canvas is huge so PDF renders at a nice resolution
__CANVAS.width = 2000;
__CANVAS.height = 2000;

function showPDF(pdf_url) {
    console.log("In showPDF()");
    
    PDFJS.getDocument({ url: pdf_url }).then(function(pdf_doc) {
        __PDF_DOC = pdf_doc;
	__TOTAL_PAGES = __PDF_DOC.numPages;
    
	    $("#pdf-buttons").show();
	    
	    
	    showPage(1);
    
    }).catch(function(error){

        console.log(error.message);
        alert(error.message);
    });
}

function showPage(page_no) {
    console.log("In showPage()");
    __PAGE_RENDERING_IN_PROGRESS =1;
    __CURRENT_PAGE = page_no;

    __PDF_DOC.getPage(page_no).then(function(page) {

        var scale_required = __CANVAS.width / page.getViewport(1).width;

        var viewport = page.getViewport(scale_required);

        __CANVAS.height = viewport.height;

        var renderContext = {
            canvasContext: __CANVAS_CTX,
            viewport: viewport
        };
        page.render(renderContext).then(function() {
            __PAGE_RENDERING_IN_PROGRESS = 0;
            console.log("Attempting to put canvas contents into img.");
            imageTranslateApp.image.src = __CANVAS.toDataURL();
        });
    });
}

$("#pdf-prev").on('click', function() {
    if(__CURRENT_PAGE != 1)
        showPage(--__CURRENT_PAGE);
});

$("#pdf-next").on('click', function() {
    if(__CURRENT_PAGE != __TOTAL_PAGES)
        showPage(++__CURRENT_PAGE);
});

function removeUpload() {
    $('.file-upload-input').replaceWith($('.file-upload-input').clone());
    $('.file-upload-content').hide();
    $('.image-upload-wrap').show();
    $('#result > h6').text('OCR Result:');
    $('#progress').text('');
    console.log(imageTranslateApp.canvas.getObjects());
    imageTranslateApp.canvas.remove(...imageTranslateApp.canvas.getObjects());
    $('.toggle-text').html("Hide Rendered Text");
    imageTranslateApp.canvas.setWidth(600);
    imageTranslateApp.canvas.setHeight(600);
    console.log("Removed image");
    imageTranslateApp.canvas.isDrawingMode = true;
}

$('.image-upload-wrap').bind('dragover', function () {
    $('.image-upload-wrap').addClass('image-dropping');
});

$('.image-upload-wrap').bind('dragleave', function () {
    $('.image-upload-wrap').removeClass('image-dropping');
});

//Pass the OCR result here and process the detected segments appropriately.
function handleOCRResult(result) {
    const destLang = document.getElementById('language-dest-select').value;
    const srcLang = document.getElementById('language-src-select').value;

    console.log('Destination langauge: ' + destLang);
    console.log('Source language: ' + srcLang);

    const boundingBoxes = {}; // Object containing bounding boxes, indexed by line ID.

    // Array.prototype.map function, return new array from lines array to be sent via Ajax.
    const json = result.lines.map((line, index) => {
        boundingBoxes[index] = line.bbox;

        const obj = {};
        obj.id = index;
        obj.text = removeJunkText(line.text);
        obj.source_language = srcLang;
        obj.destination_language = destLang;
        return obj;
    });

    console.log(boundingBoxes);
    console.log(json);
    jsonRequestData = {translate: json}; //Need top-level translate key

    translateReq(jsonRequestData)
        .then(translatedText => {
            console.log(translatedText);
            handleServerResponse(translatedText, boundingBoxes);
    })
    .catch(error => {
        console.error(error);
    });
}

async function translateReq(textList) {
    /*
     @desc
     Performs an AJAX request to the /translate url using http POST method.
     @param object textList
     This is a javascript object that contains a list of objects containing text as well as meta data describing translating preferences. For example:
     const textList = [
         {
             id: 1,
             source_language: 'latin',
             destination_language: 'english',
             text: 'Bellum est malo'
         }
     ];
     @return
     A javascript object that contains a list of objects containing the translated text as well as meta data describing the translation. This data is received from the server over AJAX. For example:
     const textList = [
         {
             id: 1,
             source_language: 'latin',
             destination_language: 'english',
             translated_text: 'War is bad'
         }
     ];
     @throws Exception on unsuccessful network connection to the server.
     */

    const res = await fetch('/translate', { 
        method: 'POST', 
        body: JSON.stringify(textList),
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(response => response.json()).catch(error => {
        console.error(error);
    });
    return res;
}

async function handleServerResponse(textList, boundingBoxes) {
    var i;
    for (i = 0; i < textList.length; i++) {
        var text = textList[i];
        var bbox = boundingBoxes[text.id];
        console.log(text.translated_text);
        console.log(bbox);
        var width = bbox.x1 - bbox.x0;
        var height = bbox.y1 - bbox.y0;
        if (!("error" in text)) { //if the response has "error" key, don't bother rendering this line
            renderText(text.translated_text, text.destination_language,
                bbox.x0, bbox.y0, width, height);
        }
    }
    $('.text-rendering-controls').show();
}


function renderText(textInput, destLang, X, Y, textboxWidth, textboxHeight) {
    console.log(textInput + " in " + destLang + " at " + X + "," + Y +
            " width: " + textboxWidth + " height: " + textboxHeight);
    
    var fImage = imageTranslateApp.canvas.item(0);
    var scaleX = fImage.scaleX;
    var scaleY = fImage.scaleY;
    X *= scaleX;
    Y *= scaleY;
    textboxWidth *= scaleX;
    textboxHeight *= scaleY;

    //render a background rect in black
    var rect = new fabric.Rect({
        left: X,
        top: Y,
        width: textboxWidth,
        height: textboxHeight,
        fill: 'black',
        evented: false
    });

    // create text
    var text = new fabric.Text(textInput, {
        left: X,
        top: Y,
        width: textboxWidth,
        height: textboxHeight,
        fontFamily: 'Consolas',
        fill: 'white',
        evented: false
    });
    
    var fontSizeVertical = textboxHeight;
    var fontSizeHorizontal = textboxWidth / textInput.length;
    if (destLang === "zh") {
        fontSizeHorizontal /= 0.9;
    } else {
        fontSizeHorizontal /= 0.55;
    }
    text.fontSize = fontSizeVertical > fontSizeHorizontal ? fontSizeHorizontal : fontSizeVertical;

    imageTranslateApp.canvas.add(rect);
    imageTranslateApp.canvas.add(text);
}

function toggleRenderedText(button) {
    var numObjects = imageTranslateApp.canvas.getObjects().length;
    var i;
    for (i = 1; i < numObjects; i++) {
        var item = imageTranslateApp.canvas.item(i);
        item.visible = !item.visible;
    }
    imageTranslateApp.canvas.renderAll();
    if (button.innerHTML.startsWith("Hide")) {
        button.innerHTML = "Show Rendered Text";
        console.log("Hid rendered text");
    } else {
        button.innerHTML = "Hide Rendered Text";
        console.log("Showed rendered text");
    }
}

function removeJunkText(inString) {
  /*
     @desc
     Removes stray/junk characters from the input string and returns the cleaned string.
     This does make some assumptions about the intended content of the original text, so might not
     be appropriate for all inputs.
     @param string inString
     A string to clean up.
     @return string
    */

    let punctuation = ",./;'[]-=`";
    let consonants = "qwrtyupsdfghjklzxcvbnm";
    punctuation = punctuation.split('');
    consonants = consonants.split(''); 
    punctuation.forEach(function(element){
        inString = inString.replace(" " + element + " ", " ");
        inString = inString.replace(element + " ", " ");
        inString = inString.replace(" " + element.toUpperCase() + " ", " ");
        inString = inString.replace(element.toUpperCase() + " ", " ");
    });
    consonants.forEach(function(element){
        inString = inString.replace(" " + element + " ", " ");
        inString = inString.replace(" " + element.toUpperCase() + " ", " ");
    });
    return inString;
}

