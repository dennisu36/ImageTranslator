var validTypes = ['jpg', 'jpeg', 'png', 'pdf'];
function readURL(input) {
    if (input.files && input.files[0]) {
        var extension = input.files[0].name.split('.').pop().toLowerCase(),
        isSuccess = validTypes.indexOf(extension) > -1;
        if (isSuccess) {
            var reader = new FileReader();
            if(extension == 'pdf'){
                alert("TODO convert the PDF to an image and load it into the image container.");
            } else if (extension == 'jpg', 'png', 'jpeg') {
                //alert('You have inserted an image.');
                //Nothing else to do here because the image .onload function initiates OCR
            }
            reader.onload = function(e) {
                $('.image-upload-wrap').hide();
                $('#myImage').attr('src', e.target.result);
                $('.file-upload-content').show();
                $('.image-title').html(input.files[0].name);
            };
            reader.readAsDataURL(input.files[0]);
        } else {
            alert('Invalid File Type. Please insert JPG, JPEG, PNG, or PDF files.');
            removeUpload();
        }
    }
}

function removeUpload() {
  $('.file-upload-input').replaceWith($('.file-upload-input').clone());
  $('.file-upload-content').hide();
  $('.image-upload-wrap').show();
}

$('.image-upload-wrap').bind('dragover', function () {
    $('.image-upload-wrap').addClass('image-dropping');
});

$('.image-upload-wrap').bind('dragleave', function () {
    $('.image-upload-wrap').removeClass('image-dropping');
});

    
//[Task 4]: for Stephen.
//TODO pass the OCR result here and process the detected segments appropriately.
function handleOCRResult(result) {
    //This is boilerplate that sets up a translation request for the server
    
    //TODO populate the request with data according to what was found in the OCR result (passed as parameter)

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
      obj.text = line.text;
      obj.source_language = srcLang;
      obj.destination_langauge = destLang;
      return obj;
    });

    console.log(boundingBoxes);
    console.log(json);

    translateReq(json)
      .then(translatedText => {
        console.log(translatedText);
        window.alert(translatedText.text);

        //[Task 6]: for Binh
        //TODO render the text back on the Canvas corresponding to where it came from
        //-> related, should correspond to ID number which is associated with
        //-> blocks of text detected by tesseract.js.

        handleServerResponse([
          {
            id: 1,
            source_language: 'latin',
            destination_language: 'english',
            translated_text: 'War is bad'
          }
        ], result);
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

async function handleServerResponse(textList, OCRResult) {
  var i;
  for (i = 0; i < textList.length; i++) {
    var text = textList[i];
    console.log(text.translated_text);
    var bbox = OCRResult.lines[text.id].bbox;
    console.log(bbox);
    // renderText() doesn't exist yet.
    // renderText(text.translated_text, bbox.x0, bbox.x1, bbox.y0, bbox.y1);
  }
}