function initializeImageTranslateApp() {
    let App = {
        image: document.getElementById("myImage"),
        canvas: new fabric.StaticCanvas('myCanvas') //don't need interactivity that regular fabric.Canvas provides
    };
    
    App.image.onload = function() {
        var canvas = document.getElementById("myCanvas");
        var img = App.image;
        var width = img.width;
        var height = img.height;
        canvas.style.width = img.width;
        canvas.style.height = img.height;

        renderImage(App.image, 0, 0, App.image.width, App.image.height);

	//make Tesseract match with source language that is selected
	const srcLang = document.getElementById('language-src-select').value;
        var selLang ='';
	    if(srcLang == 'chinese'){
		    selLang = 'chi_sim';
	    }else if(srcLang == 'french'){
		    selLang ='fra';
	    }else{
		    selLang = 'eng';
	    }



	  console.log("loaded...", "$$$$");
          Tesseract.recognize(App.image,{
	  	lang: selLang
	  }).progress((progress) => {
          	console.log(progress, "$$$$");
                if (progress.hasOwnProperty('progress')) {
                        $('#progress').text(progress.status + ": " + (progress.progress * 100).toFixed(0) + " %");
                } else {
                        $('#progress').text(progress.status);
                }
          }).then((result) => {
                console.log(result, "$$$$");
                $('#result').text(result.text);
                handleOCRResult(result);

          });



	/* 
	if(srcLang == 'chinese'){
		console.log("loaded...","$$$$");
		Tesseract.recognize(App.image,{
			lang: 'chi_sim'
		}).progress((progress) =>{
			 console.log(progress, "$$$$");
                if (progress.hasOwnProperty('progress')) {
                        $('#progress').text(progress.status + ": " + (progress.progress * 100).toFixed(0) + " %");
                } else {
                        $('#progress').text(progress.status);
                }
                })
		.then(function(result){
			console.log(result);
			$('#result').text(result.text);
			handleOCRResult(result);
		});
	}else if(srcLang == 'french'){
                console.log("loaded...","$$$$");
		Tesseract.recognize(App.image,{
                        lang: 'fra'
                }).progress((progress) =>{
                         console.log(progress, "$$$$");
                if (progress.hasOwnProperty('progress')) {
                        $('#progress').text(progress.status + ": " + (progress.progress * 100).toFixed(0) + " %");
                } else {
                        $('#progress').text(progress.status);
                }
		})
                .then(function(result){
                        console.log(result);
                        $('#result').text(result.text);
                        handleOCRResult(result);
                });
	
	} else{
	    //performs ocr
        	console.log("loaded...", "$$$$");
        	Tesseract.recognize(App.image).progress((progress) => {
            	console.log(progress, "$$$$");
            	if (progress.hasOwnProperty('progress')) {
                	$('#progress').text(progress.status + ": " + (progress.progress * 100).toFixed(0) + " %");
            	} else {
                	$('#progress').text(progress.status);
            	}
        	}).then((result) => {
            		console.log(result, "$$$$");
            		$('#result').text(result.text);
            		handleOCRResult(result);

       	 	});
    	}*/
    }
    return App;
}

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
      obj.text = line.text;
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
    renderText(text.translated_text, bbox.x0, bbox.y0, width, height);
  }
}

function renderImage(imgElement, X, Y, width, height) {
    var imgInstance = new fabric.Image(imgElement, {
        left: 0,
        top: 0
    });
    imageTranslateApp.canvas.add(imgInstance);
}

function renderText(textInput, X, Y, textboxWidth, textboxHeight) {
    console.log(textInput + " at " + X + "," + Y + " width: " + textboxWidth + " height: " + textboxHeight);

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
        fontSize: 32,
        //fontFamily: 'Verdana',
        fill: 'white'
    });

    imageTranslateApp.canvas.add(rect);
    imageTranslateApp.canvas.add(text);
}

