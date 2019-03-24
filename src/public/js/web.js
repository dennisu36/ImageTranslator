function readURL(input) {
    if (input.files && input.files[0]) {
        
        //TODO add error checking for file type. Don't want to insert non-images and call OCR on them.
        //->the above just checks the presence of "some file", doesn't care what type
        var reader = new FileReader();
        reader.onload = function(e) {
            $('.image-upload-wrap').hide();
            $('#myImage').attr('src', e.target.result);
            $('.file-upload-content').show();
            $('.image-title').html(input.files[0].name);
        };
        reader.readAsDataURL(input.files[0]);
        
    } else {
        removeUpload();
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
    translateReq([
    {
        id: 1,
        source_language: 'latin',
        destination_language: 'english',
        text: 'Bellum est malo'
    }
    ])
    .then(translatedText => {
        console.log(translatedText);
        window.alert(translatedText.text);
        // Do something with text..

        //[Task 6]: for Binh
        //TODO render the text back on the Canvas corresponding to where it came from
        //-> related, should correspond to ID number which is associated with
        //-> blocks of text detected by tesseract.js.

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
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(response => response.json()).catch(error => {
        console.error(error);
    });
    return res;
}

renderText(ocrInput, X, Y, textboxWidth, textboxHeight){
	
	var canvas = new fabric.Canvas('canvas');

        // load image
	var imgElement = document.getElementById("myImage");
	var imgInstance = new fabric.Image(imgElement,{
		left: 0,
		top: 0
            });
    
        // create text
        var text = new fabric.Textbox(ocrInput, {
            left: X,
            top: Y,
            textboxWidth = width,
            textboxHeight = height,
            fontSize: 15,
            fontFamily: 'Verdana',
            fill: 'white'
        });

        // add image and text to a group
        var group = new fabric.Group([imgInstance, text], {
            left: 0,
            top: 0
        });
    
    // add the group to canvas
    canvas.add(group);
}

