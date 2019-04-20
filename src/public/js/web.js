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
            //Start setting Tesseract options
            tessOptions = {
                tessedit_pageseg_mode: 1
            };

            //Determine OCR method by which language is selected
            const srcLang = document.getElementById('language-src-select').value;
            const ocrMethod = getOCRMethodBySourceLanguage(srcLang);


            if (srcLang == 'chinese_simplified') {
                tessOptions.lang = 'chi_sim';
            }
	    else if (srcLang == 'chinese_traditional') {
		tessOptions.lang = 'chi_tra';
	    }
	    else if (srcLang == 'arabic') {
                tessOptions.lang ='ara';
            }
	    else if (srcLang == 'russian') {
                tessOptions.lang ='rus';
            }
	    else if (srcLang == 'korean') {
                tessOptions.lang ='kor';
            }
	    else if (srcLang == 'japanese') {
                tessOptions.lang ='jpn';
            }
	    else {
                tessOptions.lang = 'eng';
            }

            if (tessOptions.lang == 'eng' || tessOptions.lang == 'fra') {
                //This probably obviates the removeJunkText() function mostly, but I guess that can still
                //get rid of stray consonants that aren't part of words.
                tessOptions.tessedit_char_whitelist = "ABCDEFGHIJKLMNOPQRSTUVWYZabcdefghijklmnopqrstuvwxyz1234567890.?!"
            }

            console.log("loaded...", "$$$$");
            Tesseract.recognize(image,tessOptions)
            .progress((progress) => {
                console.log(progress, "$$$$");
                if (progress.hasOwnProperty('progress')) {
                    $('#progress').text(progress.status + ": " + (progress.progress * 100).toFixed(0) + " %");
                } else {
                    $('#progress').text(progress.status);
                }
            }).then((result) => {
                console.log(result, "$$$$");
                $('#result').text(removeJunkText(result.text));
                handleOCRResult(result);
            });
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
    if (srcLang.toLowerCase() in latinLangs && imageTranslateApp.pdf == false) {

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
        $('#result').text(removeJunkText(result.text));
        handleOCRResult(result);
    });
}

/* How to actually make the AJAX request we need to use our Rekognition route:
 *
 */
function deleteMe() {
    ocrReq({dataUrl: image.src})
        .then(lines => {
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
            if(extension == 'pdf' ){
		var image1 = URL.createObjectURL($('.file-upload-input').get(0).files[0]);
		showPDF(image1);
		imageTranslateApp.pdf = true;
            } else if (extension == 'jpg', 'png', 'jpeg') {
		imageTranslateApp.pdf = false;
                //alert('You have inserted an image.');
                //Nothing else to do here because the image .onload function initiates OCR
            }
            reader.onload = function(e) {
                $('.image-upload-wrap').hide();
                $('#myImage').attr('src', e.target.result);
                $('.file-upload-content').show();
                $('.text-rendering-controls').hide();
                $('.image-title').html(input.files[0].name);
            };
	   
            reader.readAsDataURL(input.files[0]);
      
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

    showPage(1);
    
    }).catch(function(error){

        console.log(error.message);
        alert(error.message);
    });

}

function showPage(page_no){
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

function removeUpload() {
    $('.file-upload-input').replaceWith($('.file-upload-input').clone());
    $('.file-upload-content').hide();
    $('.image-upload-wrap').show();
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
        fill: 'black'
    });

    // create text
    var text = new fabric.Text(textInput, {
        left: X,
        top: Y,
        width: textboxWidth,
        height: textboxHeight,
        fontFamily: 'Consolas',
        fill: 'white'
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

